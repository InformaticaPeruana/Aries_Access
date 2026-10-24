#!/usr/bin/env bash
# F-002 T01 - construye e instala la extension de branding de Aries Access.
#
# Uso (en server01, con las fuentes subidas al lado del script):
#   sudo bash ops/70-branding.sh
#
# Fuentes: <directorio del script>/branding/{guac-manifest.json,css/,translations/}
# Salida:  /etc/guacamole/extensions/aries-branding-1.0.0.jar
#
# Idempotente: reconstruye el .jar y reinicia Tomcat. Si el login se rompe,
# se borra ese .jar y se reinicia: no toca nada mas.
#
set -euo pipefail

VERSION="1.0.0"
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="${HERE}/branding"
JAR="/tmp/aries-branding-${VERSION}.jar"
DEST_DIR="/etc/guacamole/extensions"
DEST="${DEST_DIR}/aries-branding-${VERSION}.jar"
TC_USER="guacamole"
GUAC_VERSION="1.6.0"

log() { echo "== $* =="; }

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: ejecutar con sudo" >&2
  exit 1
fi
for f in guac-manifest.json css/aries.css translations/en.json translations/es.json images/icon-a-64.png images/icon-a-144.png images/logo-login.jpg; do
  [ -f "${SRC}/${f}" ] || { echo "ERROR: falta ${SRC}/${f}" >&2; exit 1; }
done

log "validando el manifest"
python3 - "${SRC}/guac-manifest.json" "${GUAC_VERSION}" <<'PY'
import json, sys
m = json.load(open(sys.argv[1]))
if m.get("guacamoleVersion") != sys.argv[2]:
    sys.exit("ERROR: guacamoleVersion debe ser %s" % sys.argv[2])
for key in ("name", "namespace"):
    if not m.get(key):
        sys.exit("ERROR: falta %s en el manifest" % key)
print("   %s (namespace %s)" % (m["name"], m["namespace"]))
PY

log "construyendo ${JAR}"
rm -f "${JAR}"
( cd "${SRC}" && jar cf "${JAR}" guac-manifest.json css translations images )
echo "   $(ls -l "${JAR}" | awk '{print $5}') bytes"

log "instalando en ${DEST_DIR}"
install -m 0640 -o root -g "${TC_USER}" "${JAR}" "${DEST}"
ls -1 "${DEST_DIR}/"

log "reiniciando la webapp"
systemctl restart guacamole-tomcat
for i in $(seq 1 90); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8081/desktop/ || true)"
  [ "${code}" = "200" ] && break
  sleep 1
done
echo "   /desktop/ -> ${code}"

log "verificacion de las traducciones servidas"
curl -s http://127.0.0.1:8081/desktop/translations/en.json -o /tmp/en-merged.json
python3 - <<'PY'
import json
d = json.load(open("/tmp/en-merged.json"))
app = d.get("APP", {})
print("   APP.NAME            =", app.get("NAME"))
print("   APP.ACTION_ACKNOWLEDGE sigue:", "ACTION_ACKNOWLEDGE" in app)
print("   claves APP totales  =", len(app))
PY

log "verificacion del css de la extension"
if curl -s http://127.0.0.1:8081/desktop/ | grep -q 'aries'; then
  echo "   el html referencia el branding"
else
  echo "   AVISO: el html no menciona 'aries'; revisar si el css se aplica" >&2
fi
echo "== branding aplicado =="
