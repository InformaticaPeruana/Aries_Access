#!/usr/bin/env bash
# F-003 T01 - grabacion de sesiones con retencion de 7 dias.
#
# Activa el registro de sesion por conexion (parametros de Guacamole) y deja un
# timer de systemd que borra lo que tenga mas de 7 dias.
#
# Idempotente. `sudo bash ops/90-grabacion.sh`
#
set -euo pipefail

RETENTION_DAYS=7
REC_DIR="/var/www/aries-grabaciones/files"
PASSFILE="/root/guacamole-db.pass"
PSQL="psql -h 127.0.0.1 -p 5434 -U guacamole_user -d guacamole_db"
PRUNE="/usr/local/sbin/aries-grabacion-limpieza"

log() { echo "== $* =="; }

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: ejecutar con sudo" >&2
  exit 1
fi
[ -s "${PASSFILE}" ] || { echo "ERROR: falta ${PASSFILE}" >&2; exit 1; }

log "directorio de grabaciones"
install -d -m 2750 -o daemon -g www-data "${REC_DIR}"

log "parametros de grabacion en todas las conexiones"
export PGPASSWORD="$(cat "${PASSFILE}")"
IDS="$($PSQL -tAc "select connection_id from guacamole_connection where protocol = 'rdp'")"
for id in ${IDS}; do
  for par in "recording-path:${REC_DIR}" "create-recording-path:true" "recording-name:\${HISTORY_UUID}" "recording-include-keys:true" "enable-drive:false"; do
    name="${par%%:*}"
    value="${par#*:}"
    existing="$($PSQL -tAc "select parameter_value from guacamole_connection_parameter
                           where connection_id = ${id} and parameter_name = '${name}'" | head -n1)"
    if [ -z "${existing}" ]; then
      $PSQL -q -c "insert into guacamole_connection_parameter (connection_id, parameter_name, parameter_value)
                   values (${id}, '${name}', '${value}')"
      echo "   conexion ${id}: ${name} = ${value}"
    elif [ "${existing}" != "${value}" ]; then
      $PSQL -q -c "update guacamole_connection_parameter set parameter_value = '${value}'
                   where connection_id = ${id} and parameter_name = '${name}'"
      echo "   conexion ${id}: ${name} corregido"
    else
      echo "   conexion ${id}: ${name} ya estaba"
    fi
  done
done

log "script de limpieza (${RETENTION_DAYS} dias)"
cat > "${PRUNE}" <<PRUNE_EOF
#!/usr/bin/env bash
# Borra grabaciones con mas de ${RETENTION_DAYS} dias. Lo lanza un timer diario.
set -eu
DIR="${REC_DIR}"
[ -d "\$DIR" ] || exit 0
find "\$DIR" -type f -mtime +$((RETENTION_DAYS - 1)) -print -delete
PRUNE_EOF
chmod 0755 "${PRUNE}"

log "limpieza de la ruta anterior (si quedo algo)"
if [ -d /var/lib/guacd/recordings ]; then find /var/lib/guacd/recordings -type f -print -delete 2>/dev/null || true; fi

log "timer diario"
cat > /etc/systemd/system/aries-grabacion-limpieza.service <<'SVC_EOF'
[Unit]
Description=Aries - limpieza de grabaciones de sesion

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/aries-grabacion-limpieza
SVC_EOF

cat > /etc/systemd/system/aries-grabacion-limpieza.timer <<'TMR_EOF'
[Unit]
Description=Aries - limpieza diaria de grabaciones (retencion 7 dias)

[Timer]
OnCalendar=*-*-* 04:15:00
Persistent=true

[Install]
WantedBy=timers.target
TMR_EOF

systemctl daemon-reload
systemctl enable --now aries-grabacion-limpieza.timer >/dev/null 2>&1

log "verificacion"
systemctl is-enabled aries-grabacion-limpieza.timer
systemctl list-timers aries-grabacion-limpieza.timer --no-pager | sed -n '1,3p'
$PSQL -c "select connection_id, parameter_name, parameter_value
          from guacamole_connection_parameter
          where parameter_name like 'recording%' or parameter_name = 'create-recording-path'
          order by connection_id, parameter_name"
ls -ld "${REC_DIR}"
echo "== grabacion configurada (retencion ${RETENTION_DAYS} dias) =="
