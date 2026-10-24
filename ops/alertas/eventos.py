#!/usr/bin/env python3
# F-003 T02 - colector de eventos y alertas de Aries Access.
#
# Lee lo nuevo de:
#   - guacamole_connection_history  (accesos a escritorios, con IP real)
#   - localhost_access_log.*.txt    (intentos fallidos y bloqueos, con xff)
#
# Escribe JSONL en /var/log/aries/eventos.jsonl y manda correo cuando:
#   - hay un acceso FUERA del horario laboral
#   - una misma IP acumula N fallos en una ventana corta
#
# Uso:  aries-eventos.py            (lo lanza el timer cada 5 min)
#       aries-eventos.py --test     (manda un correo de prueba y sale)
#
# Config: /etc/aries/alertas.env (600). Estado: /var/lib/aries/state.json

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

LOG_RE = re.compile(
    r'\[(?P<ts>[^\]]+)\]\s+"(?P<method>\S+)\s+(?P<uri>[^"]*)"\s+(?P<status>\d{3})'
    r'.*?xff=(?P<xff>[^,\s]+)'
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
            pass
    return {"history_watermark": None, "log_offsets": {}, "failures": {}}


def save_state(state):
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    with open(STATE, "w", encoding="utf-8") as fh:
        json.dump(state, fh)


def db_json(sql):
    pwd = open(DB_PASS_FILE, "r", encoding="utf-8").read().strip()
    env = dict(os.environ, PGPASSWORD=pwd)
    out = subprocess.run(
        ["psql", "-h", "127.0.0.1", "-p", "5434", "-U", "guacamole_user",
         "-d", "guacamole_db", "-tAc", sql],
        capture_output=True, text=True, env=env, timeout=30, check=True,
    ).stdout.strip()
    return json.loads(out) if out else []


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
        return False
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
    return True


def emit(events):
    if not events:
        return
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT, "a", encoding="utf-8") as fh:
        for ev in events:
            fh.write(json.dumps(ev, ensure_ascii=False) + "\n")


def new_history(state):
    wm = state.get("history_watermark")
    cond = ""
    if wm:
        cond = "where start_date > '%s'::timestamptz" % wm.replace("'", "")
    sql = (
        "select coalesce(json_agg(row_to_json(t)), '[]') from ("
        " select connection_id, connection_name, start_date, end_date, username, remote_host"
        " from guacamole_connection_history %s order by start_date) t;" % cond
    )
    return db_json(sql)


def new_failures(state):
    """Lee solo las lineas nuevas de los access logs de Tomcat."""
    events = []
    offsets = state.setdefault("log_offsets", {})
    for name in sorted(os.listdir(LOG_DIR)):
        if not name.startswith("localhost_access_log"):
            continue
        path = os.path.join(LOG_DIR, name)
        try:
            size = os.path.getsize(path)
        except OSError:
            continue
        off = offsets.get(name, 0)
        if size < off:
            off = 0  # rotado
        if size == off:
            continue
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            fh.seek(off)
            for line in fh:
                m = LOG_RE.search(line)
                if not m:
                    continue
                status = m.group("status")
                uri = m.group("uri")
                if "/api/tokens" not in uri or status not in ("401", "403", "429"):
                    continue
                try:
                    ts = datetime.strptime(m.group("ts")[:20], "%d/%b/%Y:%H:%M:%S")
                    ts = ts.replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
                events.append({
                    "ts": ts.isoformat(),
                    "tipo": "bloqueo" if status == "429" else "fallo",
                    "usuario": "-",
                    "conexion": "-",
                    "ip": m.group("xff"),
                    "fuera_horario": fuera_de_horario(ts.astimezone(LIMA)),
                    "detalle": "HTTP %s en %s" % (status, uri),
                })
            offsets[name] = fh.tell()
    return events


def main():
    conf = load_conf()
    if "--test" in sys.argv:
        ok = send_mail(conf, "[Aries Access] Correo de prueba",
                       "Si recibis esto, las alertas del portal estan funcionando.\n")
        print("correo de prueba enviado" if ok else "sin configuracion SMTP")
        return 0 if ok else 1

    state = load_state()
    events = []

    for row in new_history(state):
        try:
            start = datetime.fromisoformat(row["start_date"])
        except Exception:
            continue
        local = start.astimezone(LIMA)
        events.append({
            "ts": start.isoformat(),
            "tipo": "acceso",
            "usuario": row.get("username"),
            "conexion": row.get("connection_name"),
            "ip": row.get("remote_host"),
            "fuera_horario": fuera_de_horario(local),
            "detalle": "hasta %s" % row.get("end_date"),
        })
        state["history_watermark"] = row["start_date"]

    events.extend(new_failures(state))

    # Fallos por IP en ventana corta.
    now = datetime.now(timezone.utc)
    fails = state.setdefault("failures", {})
    for ev in events:
        if ev["tipo"] in ("fallo", "bloqueo"):
            fails.setdefault(ev["ip"], []).append(ev["ts"])

    alerts = []
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
            fails[ip] = []  # no repetir el aviso en cada corrida

    fuera = [e for e in events if e["tipo"] == "acceso" and e["fuera_horario"]]
    for e in fuera:
        alerts.append("Acceso FUERA de horario: %s desde %s a %s (%s)."
                      % (e["usuario"], e["ip"], e["conexion"],
                         datetime.fromisoformat(e["ts"]).astimezone(LIMA).strftime("%Y-%m-%d %H:%M")))

    emit(events)
    save_state(state)

    if alerts:
        body = "Eventos detectados en Aries Access Infrastructure\n\n" + "\n".join("- " + a for a in alerts)
        body += "\n\nDetalle completo: %s\n" % OUT
        try:
            send_mail(conf, "[Aries Access] Alerta de seguridad", body)
        except Exception as exc:  # no tumbar el timer por un fallo de correo
            sys.stderr.write("ERROR enviando correo: %s\n" % exc)
            return 1

    print("eventos nuevos: %d | alertas: %d" % (len(events), len(alerts)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
