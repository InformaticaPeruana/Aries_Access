#!/usr/bin/env bash
# F-001 T06 - cuentas endurecidas: contrasena nueva de guacadmin, usuario propio,
# TOTP y limite de intentos (guacamole-auth-ban).
#
# Idempotente. No interactivo. Pensado para `sudo bash ops/40-cuentas-totp.sh`.
#
# Deja (fuera del repo, 600):
#   /root/guacadmin.pass    contrasena nueva del administrador
#   /root/humberto.pass     contrasena del usuario nominal
#
# Orden a proposito: primero `ban` y las contrasenas por API, y TOTP AL FINAL.
# Con TOTP activo, un login por API sin codigo deja de servir: cualquier
# automatizacion posterior (crear la conexion de T08) se hace apartando el .jar
# de TOTP un momento y volviendolo a poner.
#
set -euo pipefail

GUAC_VERSION="1.6.0"
BASE="https://archive.apache.org/dist/guacamole/${GUAC_VERSION}/binary"
GUAC_HOME="/etc/guacamole"
TC_USER="guacamole"
DS="postgresql"
API="http://127.0.0.1:8081/guacamole/api"
ADMIN_PASS_FILE="/root/guacadmin.pass"
USER_NAME="humberto"
USER_PASS_FILE="/root/humberto.pass"

log() { echo "== $* =="; }

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: ejecutar con sudo" >&2
  exit 1
fi

gen_pass() { head -c 18 /dev/urandom | base64 | tr -d '=+/' | cut -c1-20; }

ext_install() {
  local name="$1" tarball="/tmp/${1}-${GUAC_VERSION}.tar.gz" sha expected
  if [ -f "${GUAC_HOME}/extensions/${name}-${GUAC_VERSION}.jar" ]; then
    echo "   ${name}: ya instalada"
    return 0
  fi
  curl -fsS -o "${tarball}" "${BASE}/${name}-${GUAC_VERSION}.tar.gz"
  curl -fsS -o "${tarball}.sha256" "${BASE}/${name}-${GUAC_VERSION}.tar.gz.sha256"
  sha="$(sha256sum "${tarball}" | awk '{print $1}')"
  expected="$(awk '{print $1}' "${tarball}.sha256")"
  if [ "${sha}" != "${expected}" ]; then
    echo "ERROR: sha256 no coincide para ${name}" >&2
    exit 1
  fi
  echo "   ${name}: sha256 ${sha:0:16}..."
  tar -xzf "${tarball}" -C /tmp
  install -m 0640 -o root -g "${TC_USER}" \
    "/tmp/${name}-${GUAC_VERSION}/${name}-${GUAC_VERSION}.jar" "${GUAC_HOME}/extensions/"
}

wait_webapp() {
  local i code
  for i in $(seq 1 90); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:8081/guacamole/" || true)"
    if [ "${code}" = "200" ] || [ "${code}" = "302" ]; then return 0; fi
    sleep 1
  done
  echo "ERROR: la webapp no respondio" >&2
  exit 1
}

api_token() {
  curl -s -X POST "${API}/tokens" -d "username=$1&password=$2" \
    | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("authToken",""))' 2>/dev/null || true
}

# --- 1. extension ban + limite de intentos ----------------------------------
log "extension guacamole-auth-ban"
ext_install guacamole-auth-ban

if ! grep -q '^ban-max-invalid-attempts' "${GUAC_HOME}/guacamole.properties"; then
  cat >> "${GUAC_HOME}/guacamole.properties" <<'BANEOF'

# F-001 T06 - limite de intentos de autenticacion (guacamole-auth-ban)
ban-max-invalid-attempts: 5
ban-address-duration: 300000
BANEOF
fi
systemctl restart guacamole-tomcat
wait_webapp

# --- 2. contrasena del administrador ----------------------------------------
log "contrasena del administrador"
if [ ! -s "${ADMIN_PASS_FILE}" ]; then
  umask 077
  gen_pass > "${ADMIN_PASS_FILE}"
fi
NEW_ADMIN_PASS="$(cat "${ADMIN_PASS_FILE}")"

if [ -n "$(api_token guacadmin "${NEW_ADMIN_PASS}")" ]; then
  echo "   ya esta aplicada"
elif [ -n "$(api_token guacadmin guacadmin)" ]; then
  T="$(api_token guacadmin guacadmin)"
  curl -s -o /tmp/pw-resp.txt -w '   PUT password -> HTTP %{http_code}\n' -X PUT \
    "${API}/session/data/${DS}/users/guacadmin/password?token=${T}" \
    -H 'Content-Type: application/json' \
    -d "{\"oldPassword\":\"guacadmin\",\"newPassword\":\"${NEW_ADMIN_PASS}\"}"
  if [ -z "$(api_token guacadmin "${NEW_ADMIN_PASS}")" ]; then
    echo "ERROR: la contrasena no cambio; revisar /tmp/pw-resp.txt" >&2
    cat /tmp/pw-resp.txt >&2
    exit 1
  fi
else
  echo "ERROR: guacadmin no acepta ni la contrasena guardada ni la de fabrica." >&2
  echo "       Estado manual: fijar la contrasena en ${ADMIN_PASS_FILE} o rotarla a mano." >&2
  exit 1
fi

# --- 3. usuario nominal ------------------------------------------------------
log "usuario ${USER_NAME}"
if [ ! -s "${USER_PASS_FILE}" ]; then
  umask 077
  gen_pass > "${USER_PASS_FILE}"
fi
USER_PASS="$(cat "${USER_PASS_FILE}")"
T="$(api_token guacadmin "${NEW_ADMIN_PASS}")"

if curl -s "${API}/session/data/${DS}/users/${USER_NAME}?token=${T}" | grep -q '"username"'; then
  echo "   ya existe"
else
  curl -s -o /tmp/user-resp.txt -w "   POST ${USER_NAME} -> HTTP %{http_code}\n" \
    -X POST "${API}/session/data/${DS}/users?token=${T}" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"${USER_NAME}\",\"password\":\"${USER_PASS}\",\"attributes\":{\"guac-full-name\":\"Humberto Roldan\"},\"userGroups\":[]}"
fi

# --- 4. extension TOTP (al final) -------------------------------------------
log "extension guacamole-auth-totp"
ext_install guacamole-auth-totp
if ! grep -q '^totp-issuer' "${GUAC_HOME}/guacamole.properties"; then
  printf '\ntotp-issuer: Aries Access\n' >> "${GUAC_HOME}/guacamole.properties"
fi
systemctl restart guacamole-tomcat
wait_webapp

# --- 5. verificacion --------------------------------------------------------
log "AC5 (1/3): la cuenta por defecto ya no entra"
OUT="$(curl -s -X POST "${API}/tokens" -d 'username=guacadmin&password=guacadmin')"
if echo "${OUT}" | grep -q authToken; then
  echo "ERROR: guacadmin/guacadmin sigue entrando" >&2
  exit 1
fi
echo "   rechazado: $(echo "${OUT}" | head -c 140)"

log "AC5 (2/3): la contrasena nueva autentica y TOTP se exige"
OUT="$(curl -s -X POST "${API}/tokens" -d "username=${USER_NAME}&password=${USER_PASS}")"
echo "   sin codigo TOTP: $(echo "${OUT}" | head -c 220)"
if ! echo "${OUT}" | grep -qiE 'totp|verification'; then
  echo "   AVISO: la respuesta no menciona TOTP; se revisa en el navegador" >&2
fi

log "AC13: limite de intentos (6 fallos seguidos desde la misma IP)"
for i in $(seq 1 6); do
  code="$(curl -s -o /tmp/ban-resp.txt -w '%{http_code}' -X POST "${API}/tokens" -d "username=${USER_NAME}&password=mala${i}")"
  echo "   intento ${i}: HTTP ${code} $(head -c 110 /tmp/ban-resp.txt)"
done

log "estado final"
ls -1 "${GUAC_HOME}/extensions/"
grep -E '^(ban-|totp-)' "${GUAC_HOME}/guacamole.properties"
ls -l "${ADMIN_PASS_FILE}" "${USER_PASS_FILE}"
echo "== T06 aplicado =="
