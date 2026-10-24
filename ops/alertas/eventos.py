#!/usr/bin/env python3
# F-003 T02 - colector de eventos y alertas de Aries Access.
#
# Lee lo nuevo de:
#   - guacamole_connection_history  (accesos cerrados, con IP real)
#   - localhost_access_log.*.txt    (intentos fallidos y bloqueos)
#
# Escribe JSONL en /var/log/aries/eventos.jsonl y manda correo cuando:
#   - hay un acceso FUERA del horario laboral
#   - una misma IP acumula N fallos en una ventana corta
#
# Uso:  aries-eventos.py            (lo lanza el timer cada 5 min)
#       aries-eventos.py --test     (correo de prueba y sale)
#
# Config: /etc/aries/alertas.env (600). Estado: /var/lib/aries/state.json
#
# Decisiones que importan:
#   - La IP se resuelve como RemoteIpValve: X-Forwarded-For de DERECHA a
#     IZQUIERDA descartando saltos internos. La izquierda la pone el cliente.
#   - El timestamp del log se parsea con su offset; asumir UTC rompia la
#     ventana de fuerza bruta.
#   - El watermark de accesos es por end_date, no por history_id: las sesiones
#     pueden cerrar en orden distinto al que se abrieron.
#   - Las alertas pendientes se persisten hasta que el correo es aceptado.
#   - Sin SMTP configurado, el colector falla siempre (no solo cuando alerta).

import json
import os
import re
import ssl
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from email.utils import formataddr
import smtplib

CONF = "/etc/aries/alertas.env"
STATE = "/var/lib/aries/state.json"
LOG_DIR = "/opt/tomcat9/logs"
OUT_DIR = "/var/log/aries"
OUT = os.path.join(OUT_DIR, "eventos.jsonl")
DB_PASS_FILE = "/root/guacamole-db.pass"

LIMA = timezone(timedelta(hours=-5))
FAIL_WINDOW_MIN = 15
FAIL_THRESHOLD = 5

INTERNAL = {"127.0.0.1", "::1", "192.168.18.203"}

LOG_RE = re.compile(
    r'\[(?P<ts>[^\]]+)\]\s+"(?P<method>\S+)\s+(?P<uri>[^"]*)"\s+(?P<status>\d{3})'
    r'.*?xff=(?P<xff>.+)$'
)


def load_conf():
    conf = {}
    if not os.path.exists(CONF):
        return conf
    with open(CONF, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            conf[k.strip()] = v.strip().strip('"')
    return conf


def load_state():
    if os.path.exists(STATE):
        try:
            with open(STATE, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            sys.stderr.write("AVISO: state.json ilegible, se reinicia\n")
    return {"last_end": None, "log_offsets": {}, "failures": {},
            "pending_alerts": [], "primera_corrida": True}


def save_state(state):
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    tmp = STATE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(state, fh)
    os.replace(tmp, STATE)


def db_json(sql):
    pwd = open(DB_PASS_FILE, "r", encoding="utf-8").read().strip()
    env = dict(os.environ, PGPASSWORD=pwd)
    out = subprocess.run(
        ["psql", "-h", "127.0.0.1", "-p", "5434", "-U", "guacamole_user",
         "-d", "guacamole_db", "-tAc", sql],
        capture_output=True, text=True, env=env, timeout=30, check=True,
    ).stdout.strip()
    return json.loads(out) if out else []


def db_scalar(sql):
    pwd = open(DB_PASS_FILE, "r", encoding="utf-8").read().strip()
    env = dict(os.environ, PGPASSWORD=pwd)
    return subprocess.run(
        ["psql", "-h", "127.0.0.1", "-p", "5434", "-U", "guacamole_user",
         "-d", "guacamole_db", "-tAc", sql],
        capture_output=True, text=True, env=env, timeout=30, check=True,
    ).stdout.strip()


def client_ip(xff):
    partes = [p.strip() for p in xff.split(",") if p.strip()]
    for ip in reversed(partes):
        if ip not in INTERNAL:
            return ip
    return partes[0] if partes else "-"


def fuera_de_horario(dt_lima):
    """L-V 08:00-20:00; sabado 08:00-15:00; domingo cerrado."""
    wd, h = dt_lima.weekday(), dt_lima.hour
    if wd <= 4:
        return not (8 <= h < 20)
    if wd == 5:
        return not (8 <= h < 15)
    return True


def send_mail(conf, subject, body):
    if not conf.get("SMTP_HOST"):
        raise RuntimeError("sin SMTP_HOST en %s" % CONF)
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((conf.get("SMTP_FROM_NAME", "Aries"), conf.get("SMTP_FROM", "")))
    msg["To"] = conf.get("ALERT_TO") or conf.get("SMTP_FROM", "")
    msg.set_content(body)
    port = int(conf.get("SMTP_PORT", "465"))
    ctx = ssl.create_default_context()
    if conf.get("SMTP_SECURE", "ssl") == "ssl":
        server = smtplib.SMTP_SSL(conf["SMTP_HOST"], port, context=ctx, timeout=30)
    else:
        server = smtplib.SMTP(conf["SMTP_HOST"], port, timeout=30)
        server.starttls(context=ctx)
    try:
        server.login(conf["SMTP_USER"], conf["SMTP_PASS"])
        server.send_message(msg)
    finally:
        server.quit()


def emit(events):
    if not events:
        return
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT, "a", encoding="utf-8") as fh:
        for ev in events:
            fh.write(json.dumps(ev, ensure_ascii=False) + "\n")


def new_history(state, primera):
    """Sesiones cerradas, por end_date: no importa el orden de apertura."""
    if primera:
        return []
    last = state.get("last_end")
    cond = "and end_date > '%s'::timestamptz" % last.replace("'", "") if last else ""
    sql = (
        "select coalesce(json_agg(row_to_json(t)), '[]') from ("
        " select history_id, connection_name, start_date, end_date, username, remote_host"
        " from guacamole_connection_history"
        " where end_date is not null %s"
        " order by end_date) t;" % cond
    )
    return db_json(sql)


def new_failures(state, primera):
    events = []
    offsets = state.setdefault("log_offsets", {})
    vistos = set()
    leidas = 0
    casadas = 0

    for name in sorted(os.listdir(LOG_DIR)):
        if not name.startswith("localhost_access_log"):
            continue
        vistos.add(name)
        path = os.path.join(LOG_DIR, name)
        try:
            size = os.path.getsize(path)
        except OSError:
            continue

        off = offsets.get(name, size if primera else 0)
        if size < off:
            off = 0
        if size == off:
            offsets[name] = off
            continue

        consumido = off
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            fh.seek(off)
            for line in fh:
                if not line.endswith("\n"):
                    break
                consumido += len(line.encode("utf-8"))
                leidas += 1
                m = LOG_RE.search(line)
                if not m:
                    continue
                status = m.group("status")
                uri = m.group("uri")
                if "/api/tokens" not in uri or status not in ("401", "403", "429"):
                    continue
                casadas += 1
                try:
                    ts = datetime.strptime(m.group("ts").strip(), "%d/%b/%Y:%H:%M:%S %z")
                except ValueError:
                    try:
                        ts = datetime.strptime(m.group("ts").strip()[:20], "%d/%b/%Y:%H:%M:%S")
                        ts = ts.replace(tzinfo=timezone.utc)
                    except ValueError:
                        continue
                if primera:
                    continue
                events.append({
                    "ts": ts.isoformat(),
                    "tipo": "bloqueo" if status == "429" else "fallo",
                    "usuario": "-",
                    "conexion": "-",
                    "ip": client_ip(m.group("xff")),
                    "fuera_horario": fuera_de_horario(ts.astimezone(LIMA)),
                    "detalle": "HTTP %s en %s" % (status, uri),
                })
        offsets[name] = consumido

    for name in list(offsets):
        if name not in vistos:
            del offsets[name]

    if leidas and not casadas:
        sys.stderr.write("AVISO: %d lineas leidas y ninguna con /api/tokens + xff; "
                         "revisar el patron del access log\n" % leidas)
    return events


def main():
    conf = load_conf()
    if "--test" in sys.argv:
        try:
            send_mail(conf, "[Aries Access] Correo de prueba",
                      "Si recibis esto, las alertas del portal estan funcionando.\n")
            print("correo de prueba enviado")
            return 0
        except Exception as exc:
            sys.stderr.write("ERROR enviando correo de prueba: %s\n" % exc)
            return 1

    if not conf.get("SMTP_HOST"):
        sys.stderr.write("ERROR: falta SMTP_HOST en %s; no se pueden enviar alertas\n" % CONF)
        return 1

    state = load_state()
    primera = bool(state.get("primera_corrida", False))
    events = []
    alerts = []

    # Migracion / primera corrida: el watermark arranca en el ultimo cierre
    # conocido para no reenviar el historico. El filtro end_date > last_end ya
    # excluye lo anterior: NO se fuerza "primera" (eso descartaria la sesion
    # siguiente si el historico estaba vacio).
    if not state.get("last_end"):
        max_end = db_scalar("select coalesce(max(end_date)::text, '') from guacamole_connection_history")
        if max_end:
            state["last_end"] = max_end
            sys.stderr.write("INFO: watermark inicializado en %s (no se reenvia el historico)\n" % max_end)

    for row in new_history(state, primera):
        try:
            start = datetime.fromisoformat(row["start_date"])
            end = datetime.fromisoformat(row["end_date"])
        except Exception:
            continue
        dur = int((end - start).total_seconds())
        events.append({
            "ts": start.isoformat(),
            "tipo": "acceso",
            "usuario": row.get("username"),
            "conexion": row.get("connection_name"),
            "ip": row.get("remote_host"),
            "fuera_horario": fuera_de_horario(start.astimezone(LIMA)),
            "inicio": start.isoformat(),
            "fin": end.isoformat(),
            "duracion_s": dur,
            "detalle": "duracion %ds" % dur,
        })
        state["last_end"] = row["end_date"]
        if fuera_de_horario(start.astimezone(LIMA)):
            alerts.append("Acceso FUERA de horario: %s desde %s a %s (%s)."
                          % (row.get("username"), row.get("remote_host"),
                             row.get("connection_name"),
                             start.astimezone(LIMA).strftime("%Y-%m-%d %H:%M")))

    events.extend(new_failures(state, primera))

    now = datetime.now(timezone.utc)
    fails = state.setdefault("failures", {})
    for ev in events:
        if ev["tipo"] in ("fallo", "bloqueo"):
            fails.setdefault(ev["ip"], []).append(ev["ts"])

    for ip, stamps in list(fails.items()):
        keep = []
        for s in stamps:
            try:
                t = datetime.fromisoformat(s)
            except Exception:
                continue
            if now - t <= timedelta(minutes=FAIL_WINDOW_MIN):
                keep.append(s)
        fails[ip] = keep
        if len(keep) >= FAIL_THRESHOLD:
            alerts.append("Fuerza bruta probable desde %s: %d intentos fallidos en %d minutos."
                          % (ip, len(keep), FAIL_WINDOW_MIN))
            fails[ip] = []
        elif not keep:
            del fails[ip]

    state["primera_corrida"] = False

    pendientes = state.setdefault("pending_alerts", [])
    pendientes.extend(alerts)

    if pendientes:
        body = ("Eventos detectados en Aries Access Infrastructure\n\n"
                + "\n".join("- " + a for a in pendientes)
                + "\n\nDetalle completo: %s\n" % OUT)
        try:
            send_mail(conf, "[Aries Access] Alerta de seguridad", body)
            state["pending_alerts"] = []  # entregadas
        except Exception as exc:
            sys.stderr.write("ERROR enviando alerta (queda pendiente): %s\n" % exc)
            emit(events)
            save_state(state)
            return 1

    emit(events)
    save_state(state)
    print("eventos nuevos: %d | alertas: %d" % (len(events), len(alerts)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
