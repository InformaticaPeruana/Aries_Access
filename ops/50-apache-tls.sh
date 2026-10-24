#!/usr/bin/env bash
# F-001 T07 - Apache de server01 como backend HTTPS de Guacamole.
#
# Topologia (DEC-0027):
#   Internet -> nginx del usuario (192.168.18.203, TLS publico)
#            -> https://192.168.18.70/desktop/  (este script, certificado propio)
#            -> http://127.0.0.1:8081/desktop/  (Tomcat, sigue en loopback)
#
# El 443 de este host solo acepta al nginx (192.168.18.203) y a si mismo.
# No toca 000-default ni ningun otro vhost.
#
# Idempotente. No interactivo. `sudo bash ops/50-apache-tls.sh`
#
set -euo pipefail

NGINX_IP="192.168.18.203"
HOST_IP="192.168.18.70"
GUAC_PORT=8081
CERT_DIR="/etc/ssl/guacamole"
CERT="${CERT_DIR}/guacamole.crt"
KEY="${CERT_DIR}/guacamole.key"
SITE="guacamole"
CONF="/etc/apache2/sites-available/${SITE}.conf"
SERVER_XML="/opt/tomcat9/conf/server.xml"
BACKUP="/root/apache2-antes-$(date +%Y%m%d-%H%M%S)"

log() { echo "== $* =="; }

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: ejecutar con sudo" >&2
  exit 1
fi
if ! systemctl is-active apache2 >/dev/null 2>&1; then
  echo "ERROR: apache2 no esta activo; no se instala nada nuevo aqui." >&2
  exit 1
fi

# --- 1. certificado propio (tramo LAN, sin ACME) -----------------------------
log "certificado interno para ${HOST_IP}"
install -d -m 0755 "${CERT_DIR}"
if [ ! -s "${CERT}" ] || [ ! -s "${KEY}" ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 825 \
    -keyout "${KEY}" -out "${CERT}" \
    -subj "/CN=${HOST_IP}/O=Aries_Access" \
    -addext "subjectAltName=IP:${HOST_IP}" 2>/dev/null
  chmod 600 "${KEY}"
  chmod 644 "${CERT}"
else
  echo "   ya existe"
fi
openssl x509 -in "${CERT}" -noout -subject -enddate -fingerprint -sha256 | sed 's/^/   /'

# --- 2. modulos --------------------------------------------------------------
log "modulos"
a2enmod -q proxy proxy_http proxy_wstunnel ssl headers rewrite

# --- 3. respaldo y vhost -----------------------------------------------------
log "vhost :443 (respaldo en ${BACKUP})"
cp -a /etc/apache2 "${BACKUP}"

cat > "${CONF}" <<EOF
# F-001 T07 - backend HTTPS de Guacamole; el TLS publico lo termina el nginx
# de ${NGINX_IP}. Ver DEC-0027.
<VirtualHost *:443>
    ServerName ${HOST_IP}

    SSLEngine on
    SSLCertificateFile    ${CERT}
    SSLCertificateKeyFile ${KEY}
    SSLProtocol           -all +TLSv1.2 +TLSv1.3

    # Solo el nginx del usuario y el propio host: no hay segundo camino publico.
    <Location />
        Require ip ${NGINX_IP} 127.0.0.1
    </Location>

    # El contexto publicado es /desktop/. Los enlaces viejos a /guacamole/
    # se redirigen para no romper nada. Sin barra final Tomcat da 404.
    RedirectMatch 301 ^/desktop$ /desktop/
    RedirectMatch 301 ^/guacamole/?$ /desktop/
    RedirectMatch 301 ^/guacamole/(.*)$ /desktop/\$1
    RedirectMatch 302 ^/$ /desktop/

    # Solo /desktop/ existe en este vhost. Sin un DocumentRoot util, cualquier
    # otra ruta (por ejemplo /maestro/, que es una app PHP del host) da 404 en
    # vez de exponerse a traves del proxy publico.
    DocumentRoot /var/www/guacamole-vhost-vacio
    <Directory /var/www/guacamole-vhost-vacio>
        Require all denied
    </Directory>

    # El nginx manda X-Forwarded-For; mod_proxy le agrega su par (${NGINX_IP}),
    # y Tomcat (RemoteIpValve) se queda con la IP real del cliente.
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    ProxyPass        /desktop/ http://127.0.0.1:${GUAC_PORT}/desktop/
    ProxyPassReverse /desktop/ http://127.0.0.1:${GUAC_PORT}/desktop/

    # WebSocket: sin esto el escritorio no arranca
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule ^/desktop/(.*) ws://127.0.0.1:${GUAC_PORT}/desktop/\$1 [P,L]

    ErrorLog  \${APACHE_LOG_DIR}/guacamole-error.log
    CustomLog \${APACHE_LOG_DIR}/guacamole-access.log combined
</VirtualHost>
EOF

a2ensite -q "${SITE}"

# --- 4. RemoteIpValve: confiar tambien en el nginx ---------------------------
log "RemoteIpValve"
python3 - "${SERVER_XML}" "${NGINX_IP}" <<'PY'
import sys
import xml.etree.ElementTree as ET

path, nginx_ip = sys.argv[1], sys.argv[2]
# Un solo backslash: es una regex Java dentro de un atributo XML.
proxies = "127\\.0\\.0\\.1|" + nginx_ip.replace(".", "\\.")
valve = ('        <Valve className="org.apache.catalina.valves.RemoteIpValve" '
         'internalProxies="' + proxies + '" />\n')

lines = [l for l in open(path).read().splitlines(True) if "RemoteIpValve" not in l]

# Va PRIMERA en el <Host>: si queda despues del AccessLogValve, el log se
# escribe cuando la IP ya fue restaurada. El tag <Host ...> puede ocupar dos
# lineas, asi que no se inserta "tras el <Host", sino antes de su primera valve.
idx = next((i for i, l in enumerate(lines) if "AccessLogValve" in l), None)
if idx is None:
    print("   ERROR: no se encontro el AccessLogValve del Host", file=sys.stderr)
    sys.exit(1)
lines.insert(idx, valve)

# El log util para diagnosticar proxys: IP de socket (%a) y cabecera recibida.
for i, l in enumerate(lines):
    if l.lstrip().startswith('pattern="%h %l %u') or l.lstrip().startswith('pattern="%a %l %u'):
        lines[i] = '               pattern="%a %l %u %t &quot;%r&quot; %s %b xff=%{X-Forwarded-For}i" />\n'

new = "".join(lines)
try:
    ET.fromstring(new)
except ET.ParseError as exc:
    print("   ERROR: el XML quedaria invalido: %s" % exc, file=sys.stderr)
    sys.exit(1)

open(path, "w").write(new)
print("   internalProxies ->", proxies, "(primera valve del Host, XML validado)")
PY
grep -n 'RemoteIpValve\|pattern=' "${SERVER_XML}" | sed 's/^/   /'

# --- 5. validar y aplicar ----------------------------------------------------
log "configtest"
cp "/opt/tomcat9/conf/server.xml" "/root/server.xml-antes-$(date +%Y%m%d-%H%M%S)"
if ! apache2ctl configtest; then
  echo "ERROR: configtest fallo. NO se recarga. Respaldo: ${BACKUP}" >&2
  exit 1
fi
systemctl reload apache2
systemctl restart guacamole-tomcat
for i in $(seq 1 60); do
  code="$(curl -sk -o /dev/null -w '%{http_code}' "https://127.0.0.1/desktop/" || true)"
  [ "${code}" = "200" ] && break
  sleep 1
done

# --- 6. verificacion ---------------------------------------------------------
log "verificacion"
ss -ltn | grep ':443 ' || { echo "ERROR: el 443 no escucha" >&2; exit 1; }
apache2ctl -S 2>&1 | grep -E "443|${SITE}" | sed 's/^/   /'
echo "   local:  $(curl -sk -o /dev/null -w 'HTTP %{http_code}' https://127.0.0.1/desktop/)"
echo "   vhost:  $(curl -sk -o /dev/null -w 'HTTP %{http_code}' https://127.0.0.1/desktop/api/tokens)"

log "cadena de IP (que la cabecera llegue a Tomcat)"
curl -sk -o /dev/null -H "X-Forwarded-For: 203.0.113.9" "https://127.0.0.1/desktop/"
LAST_LOG=""
for i in 1 2 3 4 5; do
  sleep 2
  LAST_LOG="$(ls -1t /opt/tomcat9/logs/localhost_access_log.*.txt 2>/dev/null | head -1)"
  [ -n "${LAST_LOG}" ] && grep -q 'xff=203.0.113.9' "${LAST_LOG}" && break
done
if [ -n "${LAST_LOG}" ] && grep -q 'xff=203.0.113.9' "${LAST_LOG}"; then
  grep 'xff=203.0.113.9' "${LAST_LOG}" | tail -n 1 | sed 's/^/   /'
  echo "   (el ban separa por la IP del cliente: comprobado en T07 con dos IPs distintas)"
else
  echo "   AVISO: la cabecera no aparece en el log; revisar ${LAST_LOG}" >&2
fi

log "huella del certificado (para el nginx del usuario)"
openssl x509 -in "${CERT}" -noout -fingerprint -sha256 | sed 's/^/   /'
echo "== T07 (lado server01) aplicado =="
