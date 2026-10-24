#!/usr/bin/env bash
# F-003 T02 - instala el colector de eventos y las alertas por correo.
#
# Uso:
#   sudo SMTP_HOST=... SMTP_PORT=... SMTP_SECURE=... SMTP_USER=... \
#        SMTP_PASS=... SMTP_FROM=... SMTP_FROM_NAME=... ALERT_TO=... \
#        bash ops/95-alertas.sh
#
# Las credenciales NO estan en el repo: se escriben en /etc/aries/alertas.env
# con permisos 600 y el script solo las lee de ahi.
#
# Idempotente.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="${HERE}/alertas/eventos.py"
DEST="/usr/local/sbin/aries-eventos.py"
CONF_DIR="/etc/aries"
CONF="${CONF_DIR}/alertas.env"
STATE_DIR="/var/lib/aries"

log() { echo "== $* =="; }

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: ejecutar con sudo" >&2
  exit 1
fi
[ -f "${SRC}" ] || { echo "ERROR: falta ${SRC}" >&2; exit 1; }

log "configuracion SMTP (${CONF}, 600)"
install -d -m 0755 "${CONF_DIR}"
if [ -n "${SMTP_HOST:-}" ]; then
  umask 077
  cat > "${CONF}" <<EOF
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT:-465}
SMTP_SECURE=${SMTP_SECURE:-ssl}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
SMTP_FROM=${SMTP_FROM:-${SMTP_USER:-}}
SMTP_FROM_NAME=${SMTP_FROM_NAME:-Aries Access}
ALERT_TO=${ALERT_TO:-${SMTP_FROM:-${SMTP_USER:-}}}
EOF
  chmod 600 "${CONF}"
  echo "   escrita"
else
  [ -f "${CONF}" ] || { echo "ERROR: no hay SMTP_HOST y no existe ${CONF}" >&2; exit 1; }
  echo "   ya existia, se conserva"
fi

log "colector"
install -m 0755 "${SRC}" "${DEST}"
install -d -m 0755 "${STATE_DIR}"
install -d -m 0750 /var/log/aries

log "timer cada 5 minutos"
cat > /etc/systemd/system/aries-eventos.service <<'SVC_EOF'
[Unit]
Description=Aries - colector de eventos y alertas

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/aries-eventos.py
SVC_EOF

cat > /etc/systemd/system/aries-eventos.timer <<'TMR_EOF'
[Unit]
Description=Aries - colector de eventos cada 5 minutos

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
AccuracySec=30s

[Install]
WantedBy=timers.target
TMR_EOF

systemctl daemon-reload
systemctl enable --now aries-eventos.timer >/dev/null 2>&1

log "prueba de correo"
if "${DEST}" --test; then
  echo "   correo de prueba aceptado por el servidor SMTP"
else
  echo "   AVISO: el correo de prueba fallo; revisar ${CONF}" >&2
fi

log "primera corrida"
"${DEST}" || true

log "verificacion"
systemctl is-enabled aries-eventos.timer
systemctl list-timers aries-eventos.timer --no-pager | sed -n '1,3p'
ls -l "${CONF}" "${DEST}" 2>/dev/null
[ -f /var/log/aries/eventos.jsonl ] && wc -l /var/log/aries/eventos.jsonl || echo "   (sin eventos todavia)"
echo "== alertas instaladas =="
