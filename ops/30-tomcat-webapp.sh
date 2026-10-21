#!/usr/bin/env bash
# F-001 T05 - Tomcat 9 (tarball oficial) + webapp de Guacamole + extension JDBC y driver.
#
# Idempotente: no vuelve a descargar ni a desplegar lo que ya esta.
# No interactivo: pensado para `sudo bash ops/30-tomcat-webapp.sh`.
#
# Por que del tarball: `tomcat9` no existe en Ubuntu 24.04 (noble) y Guacamole
# 1.6.0 usa javax.servlet, asi que Tomcat 10+ no sirve.
#
# Deja:
#   /opt/tomcat9                                   Tomcat 9 + webapps/guacamole.war
#   /etc/guacamole/guacamole.properties            640 root:guacamole
#   /etc/guacamole/extensions/                     guacamole-auth-jdbc-postgresql-1.6.0.jar
#   /etc/guacamole/lib/                            postgresql.jar (driver JDBC)
#
set -euo pipefail

GUAC_VERSION="1.6.0"
GUAC_URL="https://archive.apache.org/dist/guacamole/${GUAC_VERSION}/binary/guacamole-${GUAC_VERSION}.war"
TC_HOME="/opt/tomcat9"
TC_USER="guacamole"
GUAC_HOME="/etc/guacamole"
JDBC_DIR="/var/cache/guacamole/guacamole-auth-jdbc-${GUAC_VERSION}/postgresql"
JAVA_HOME_DIR="/usr/lib/jvm/java-17-openjdk-amd64"
PASSFILE="/root/guacamole-db.pass"
API="http://127.0.0.1:8081/guacamole/api/tokens"

export DEBIAN_FRONTEND=noninteractive
log() { echo "== $* =="; }

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: ejecutar con sudo" >&2
  exit 1
fi
if [ ! -s "${PASSFILE}" ]; then
  echo "ERROR: falta ${PASSFILE} (lo crea T04)" >&2
  exit 1
fi

# --- 1. Java y usuario de servicio -------------------------------------------
if [ ! -x "${JAVA_HOME_DIR}/bin/java" ]; then
  log "instalando openjdk-17-jdk-headless"
  apt-get update -qq
  apt-get install -y -qq --no-install-recommends openjdk-17-jdk-headless
fi

if ! id -u "${TC_USER}" >/dev/null 2>&1; then
  log "creando usuario de servicio ${TC_USER}"
  useradd --system --home-dir "${TC_HOME}" --shell /usr/sbin/nologin "${TC_USER}"
fi

# --- 2. Tomcat 9 desde el tarball -------------------------------------------
if [ ! -x "${TC_HOME}/bin/catalina.sh" ]; then
  log "descargando Tomcat 9"
  TC_BASE="https://archive.apache.org/dist/tomcat/tomcat-9"
  TC_VERSION="$(curl -fsS "${TC_BASE}/" | grep -oE 'v9\.0\.[0-9]+' | sort -V | tail -1 | tr -d 'v')"
  if [ -z "${TC_VERSION}" ]; then
    echo "ERROR: no se pudo determinar la ultima 9.0.x" >&2
    exit 1
  fi
  echo "   version: ${TC_VERSION}"
  curl -fsS -o /tmp/tomcat9.tar.gz "${TC_BASE}/v${TC_VERSION}/bin/apache-tomcat-${TC_VERSION}.tar.gz"
  mkdir -p "${TC_HOME}"
  tar -xzf /tmp/tomcat9.tar.gz -C /tmp
  cp -a "/tmp/apache-tomcat-${TC_VERSION}/." "${TC_HOME}/"
  rm -rf "/tmp/apache-tomcat-${TC_VERSION}" /tmp/tomcat9.tar.gz
  # sin aplicaciones de ejemplo ni manager
  rm -rf "${TC_HOME}/webapps/docs" "${TC_HOME}/webapps/examples" \
         "${TC_HOME}/webapps/manager" "${TC_HOME}/webapps/host-manager" "${TC_HOME}/webapps/ROOT"
  TC_VERSION_JSON="{\"version\":\"${TC_VERSION}\"}"
else
  TC_VERSION_JSON="(ya instalado)"
fi

# --- 3. conector en 127.0.0.1:8081 y RemoteIpValve --------------------------
SERVER_XML="${TC_HOME}/conf/server.xml"
if grep -q 'port="8080"' "${SERVER_XML}"; then
  log "conector a 8081 en loopback"
  sed -i 's|<Connector port="8080"|<Connector port="8081" address="127.0.0.1"|' "${SERVER_XML}"
fi
if ! grep -q 'RemoteIpValve' "${SERVER_XML}"; then
  log "RemoteIpValve (IP real detras de Apache)"
  sed -i 's|^      </Host>|        <Valve className="org.apache.catalina.valves.RemoteIpValve" internalProxies="127\\.0\\.0\\.1" />\n      </Host>|' "${SERVER_XML}"
fi
grep -n 'Connector port="8081"' "${SERVER_XML}"
grep -n 'RemoteIpValve' "${SERVER_XML}"

# --- 4. setenv.sh: heap acotado y GUACAMOLE_HOME ----------------------------
log "setenv.sh"
cat > "${TC_HOME}/bin/setenv.sh" <<ENVEOF
export JAVA_HOME=${JAVA_HOME_DIR}
export CATALINA_OPTS="-Xms256m -Xmx512m -DGUACAMOLE_HOME=${GUAC_HOME}"
ENVEOF
chmod 755 "${TC_HOME}/bin/setenv.sh"
chown -R "${TC_USER}:${TC_USER}" "${TC_HOME}"

# --- 5. GUACAMOLE_HOME: properties, extension y driver ----------------------
log "GUACAMOLE_HOME"
install -d -m 0755 -o root -g "${TC_USER}" "${GUAC_HOME}"
install -d -m 0755 -o root -g "${TC_USER}" "${GUAC_HOME}/extensions"
install -d -m 0755 -o root -g "${TC_USER}" "${GUAC_HOME}/lib"

DBPASS="$(cat "${PASSFILE}")"
cat > "${GUAC_HOME}/guacamole.properties" <<PROPEOF
guacd-hostname: 127.0.0.1
guacd-port: 4822

postgresql-hostname: 127.0.0.1
postgresql-port: 5434
postgresql-database: guacamole_db
postgresql-username: guacamole_user
postgresql-password: ${DBPASS}
PROPEOF
chown root:"${TC_USER}" "${GUAC_HOME}/guacamole.properties"
chmod 640 "${GUAC_HOME}/guacamole.properties"

# extension de autenticacion JDBC (viene en el tarball de T04)
if [ ! -f "${JDBC_DIR}/guacamole-auth-jdbc-postgresql-${GUAC_VERSION}.jar" ]; then
  echo "ERROR: falta ${JDBC_DIR}/guacamole-auth-jdbc-postgresql-${GUAC_VERSION}.jar (T04)" >&2
  exit 1
fi
install -m 0640 -o root -g "${TC_USER}" \
  "${JDBC_DIR}/guacamole-auth-jdbc-postgresql-${GUAC_VERSION}.jar" \
  "${GUAC_HOME}/extensions/"

# driver JDBC: NO viene en ese tarball. Se usa el paquete de Ubuntu.
if [ ! -f "${GUAC_HOME}/lib/postgresql.jar" ]; then
  log "driver JDBC"
  apt-get install -y -qq --no-install-recommends libpostgresql-jdbc-java
  install -m 0640 -o root -g "${TC_USER}" /usr/share/java/postgresql.jar "${GUAC_HOME}/lib/postgresql.jar"
fi

# --- 6. webapp ---------------------------------------------------------------
if [ ! -f "${TC_HOME}/webapps/guacamole.war" ]; then
  log "desplegando guacamole-${GUAC_VERSION}.war"
  curl -fsS -o "${TC_HOME}/webapps/guacamole.war" "${GUAC_URL}"
  chown "${TC_USER}:${TC_USER}" "${TC_HOME}/webapps/guacamole.war"
fi

# --- 7. unidad systemd -------------------------------------------------------
log "unidad guacamole-tomcat.service"
cat > /etc/systemd/system/guacamole-tomcat.service <<UNITEOF
[Unit]
Description=Tomcat 9 + webapp de Guacamole (F-001)
After=network.target guacd.service postgresql@16-guacamole.service
Requires=guacd.service

[Service]
Type=forking
User=${TC_USER}
Group=${TC_USER}
Environment=CATALINA_HOME=${TC_HOME}
Environment=CATALINA_BASE=${TC_HOME}
Environment=CATALINA_PID=${TC_HOME}/temp/tomcat.pid
Environment=JAVA_HOME=${JAVA_HOME_DIR}
PIDFile=${TC_HOME}/temp/tomcat.pid
ExecStart=${TC_HOME}/bin/catalina.sh start
ExecStop=${TC_HOME}/bin/catalina.sh stop 10 -force
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNITEOF

systemctl daemon-reload
systemctl enable guacamole-tomcat >/dev/null 2>&1
systemctl restart guacamole-tomcat

# --- 8. esperar el despliegue y verificar ------------------------------------
log "esperando el despliegue"
for i in $(seq 1 60); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:8081/guacamole/" || true)"
  if [ "${code}" = "200" ] || [ "${code}" = "302" ]; then
    echo "   webapp responde ${code} tras ${i}s"
    break
  fi
  sleep 1
done

log "verificacion"
systemctl is-enabled guacamole-tomcat
systemctl is-active guacamole-tomcat
ss -ltn | grep 8081 || { echo "ERROR: el 8081 no escucha" >&2; exit 1; }
curl -sI http://127.0.0.1:8081/guacamole/ | head -1
ls -1 "${GUAC_HOME}/extensions/" "${GUAC_HOME}/lib/"
ps -o args= -C java | grep -o -- '-Xmx[0-9]*m' || true

log "AC4: login real contra PostgreSQL"
TOKEN="$(curl -s -X POST "${API}" -d 'username=guacadmin&password=guacadmin' || true)"
echo "${TOKEN}" | head -c 300; echo
if echo "${TOKEN}" | grep -q 'authToken'; then
  echo "AC4 OK: la extension JDBC autentica contra la base"
else
  echo "ERROR: no hay authToken; revisar el log de Tomcat" >&2
  tail -40 "${TC_HOME}/logs/catalina.out" >&2 || true
  exit 1
fi
echo "== tomcat y webapp listos =="
