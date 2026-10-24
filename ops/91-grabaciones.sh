#!/usr/bin/env bash
# F-003 T03 - publica la pagina de grabaciones con su propio login.
#
#   /grabaciones/        la pagina (public/grabaciones)
#   /grabaciones/files/  las grabaciones (.guac) del directorio de guacd
#
# Proteccion: Basic Auth (htpasswd) + la restriccion por IP que ya tiene el vhost.
# La contrasena se genera aca y queda en /root/grabaciones.pass (600).
#
# Idempotente. `sudo bash ops/91-grabaciones.sh [ruta-a-public/grabaciones]`
#
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="${1:-${HERE}/../public/grabaciones}"
DEST="/var/www/aries-grabaciones"
REC_DIR="/var/www/aries-grabaciones/files"
HTPASSWD="/etc/apache2/aries-grabaciones.htpasswd"
PASSFILE="/root/grabaciones.pass"
INDEXER="/usr/local/sbin/aries-grabaciones-index"
WEB_USER="www-data"

log() { echo "== $* =="; }

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: ejecutar con sudo" >&2
  exit 1
fi
[ -f "${SRC}/index.html" ] || { echo "ERROR: falta ${SRC}/index.html" >&2; exit 1; }

log "pagina en ${DEST}"
install -d -m 0755 "${DEST}"
cp -a "${SRC}/." "${DEST}/"
find "${DEST}" -type d -exec chmod 0755 {} +
# Solo la pagina: files/ son grabaciones y van 0640 (contenido sensible).
find "${DEST}" -type f -not -path "${DEST}/files/*" -exec chmod 0644 {} +
find "${DEST}/files" -type f -exec chmod 0640 {} + 2>/dev/null || true
chmod 0640 "${DEST}/index.json" 2>/dev/null || true

log "acceso de ${WEB_USER} a las grabaciones"
# setgid en el directorio: los .guac nuevos nacen con grupo www-data y modo 0640,
# asi el servidor web los puede leer sin abrirlos a todo el sistema.
install -d -m 2750 -o daemon -g "${WEB_USER}" "${REC_DIR}"
:
find "${REC_DIR}" -type f -exec chgrp "${WEB_USER}" {} + 2>/dev/null || true

log "Basic Auth"
if ! command -v htpasswd >/dev/null 2>&1; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq apache2-utils >/dev/null
fi
if [ ! -s "${PASSFILE}" ]; then
  umask 077
  head -c 12 /dev/urandom | base64 | tr -d '=+/' | cut -c1-14 > "${PASSFILE}"
  chmod 600 "${PASSFILE}"
  echo "   contrasena generada en ${PASSFILE}"
fi
htpasswd -Bbc "${HTPASSWD}" humberto "$(cat "${PASSFILE}")" >/dev/null
chown root:"${WEB_USER}" "${HTPASSWD}"
chmod 640 "${HTPASSWD}"
echo "   usuario: humberto (contrasena en ${PASSFILE})"

log "generador del indice"
cat > "${INDEXER}" <<'IDX_EOF'
#!/usr/bin/env bash
# Regenera el indice JSON de grabaciones para la pagina /grabaciones/.
set -eu
REC_DIR="/var/www/aries-grabaciones/files"
OUT="/var/www/aries-grabaciones/index.json"
[ -d "$REC_DIR" ] || exit 0
python3 - "$REC_DIR" "$OUT" <<'PY'
import json, os, sys, datetime
rec_dir, out = sys.argv[1], sys.argv[2]
items = []
for name in os.listdir(rec_dir):
    path = os.path.join(rec_dir, name)
    if not os.path.isfile(path):
        continue
    st = os.stat(path)
    size = st.st_size
    humano = "%.0f KB" % (size / 1024) if size < 1024 * 1024 else "%.1f MB" % (size / 1048576)
    dt = datetime.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M")
    items.append({"name": name, "title": dt, "date": dt, "size": humano, "mtime": st.st_mtime})
items.sort(key=lambda i: i["mtime"], reverse=True)
tmp = out + ".tmp"
with open(tmp, "w", encoding="utf-8") as fh:
    json.dump(items, fh, ensure_ascii=False)
# Permisos ANTES del replace: si no, hay una ventana con 0644.
os.chown(tmp, 0, 33)
os.chmod(tmp, 0o640)
os.replace(tmp, out)
PY
IDX_EOF
chmod 0755 "${INDEXER}"
"${INDEXER}"
echo "   indice: $(ls -l "${DEST}/index.json" 2>/dev/null | awk '{print $5}') bytes"

log "timer del indice (cada 5 min)"
cat > /etc/systemd/system/aries-grabaciones-index.service <<'SVC_EOF'
[Unit]
Description=Aries - indice de grabaciones

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/aries-grabaciones-index
SVC_EOF

cat > /etc/systemd/system/aries-grabaciones-index.timer <<'TMR_EOF'
[Unit]
Description=Aries - indice de grabaciones cada 5 minutos

[Timer]
OnBootSec=3min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
TMR_EOF

systemctl daemon-reload
systemctl enable --now aries-grabaciones-index.timer >/dev/null 2>&1

log "verificacion"
systemctl is-enabled aries-grabaciones-index.timer
ls -ld "${REC_DIR}"
ls -l "${HTPASSWD}" "${PASSFILE}"
echo "== grabaciones publicadas =="
