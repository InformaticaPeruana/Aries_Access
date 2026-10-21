#!/usr/bin/env bash
# F-001 T04 - PostgreSQL 16 dedicado en 127.0.0.1:5434, base guacamole_db y esquema.
#
# Idempotente: no reinstala, no recrea rol/base ni repite el esquema.
# No interactivo: pensado para `sudo bash ops/20-postgresql.sh`.
#
# Deja:
#   /root/guacamole-db.pass                             contrasena del rol (600)
#   /var/cache/guacamole/guacamole-auth-jdbc-1.6.0/     jar + schema/ para T05
#
set -euo pipefail

PGV=16
CLUSTER=guacamole
PORT=5434
DB=guacamole_db
DBUSER=guacamole_user
PASSFILE=/root/guacamole-db.pass
CACHE=/var/cache/guacamole
JDBC_TARBALL="${CACHE}/guacamole-auth-jdbc-1.6.0.tar.gz"
JDBC_URL="https://archive.apache.org/dist/guacamole/1.6.0/binary/guacamole-auth-jdbc-1.6.0.tar.gz"

export DEBIAN_FRONTEND=noninteractive
log() { echo "== $* =="; }

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: ejecutar con sudo" >&2
  exit 1
fi

# --- 1. paquetes, sin cluster por defecto (el 5432 es de Supabase) ------------
if ! dpkg -s "postgresql-${PGV}" >/dev/null 2>&1; then
  log "instalando postgresql-${PGV} sin cluster por defecto"
  mkdir -p /etc/postgresql-common
  if ! grep -q '^create_main_cluster' /etc/postgresql-common/createcluster.conf 2>/dev/null; then
    echo 'create_main_cluster = false' >> /etc/postgresql-common/createcluster.conf
  fi
  apt-get update -qq
  apt-get install -y -qq --no-install-recommends "postgresql-${PGV}" "postgresql-client-${PGV}"
fi

# --- 2. cluster dedicado en el 5434 ------------------------------------------
if ! pg_lsclusters -h | awk '{print $1, $2}' | grep -qx "${PGV} ${CLUSTER}"; then
  log "creando cluster ${PGV}/${CLUSTER} en el ${PORT}"
  pg_createcluster "${PGV}" "${CLUSTER}" --port "${PORT}"
fi

# pg_conftool duplica comillas segun la version: se fija la linea tal cual.
sed -i "s/^listen_addresses.*/listen_addresses = '127.0.0.1'/" "/etc/postgresql/${PGV}/${CLUSTER}/postgresql.conf"
grep -n "^listen_addresses" "/etc/postgresql/${PGV}/${CLUSTER}/postgresql.conf"
pg_ctlcluster "${PGV}" "${CLUSTER}" start 2>/dev/null || true
pg_lsclusters

if ! pg_isready -q -h 127.0.0.1 -p "${PORT}"; then
  echo "ERROR: el cluster no acepta conexiones en el ${PORT}. Ultimas lineas del log:" >&2
  tail -20 "/var/log/postgresql/postgresql-${PGV}-${CLUSTER}.log" >&2 || true
  exit 1
fi

# --- 3. rol y base -----------------------------------------------------------
if [ ! -s "${PASSFILE}" ]; then
  umask 077
  head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n' > "${PASSFILE}"
  chmod 600 "${PASSFILE}"
fi
DBPASS="$(cat "${PASSFILE}")"

if ! su - postgres -c "psql -p ${PORT} -tAc \"SELECT 1 FROM pg_roles WHERE rolname='${DBUSER}'\"" | grep -q 1; then
  log "creando rol ${DBUSER}"
  su - postgres -c "psql -p ${PORT} -c \"CREATE ROLE ${DBUSER} LOGIN PASSWORD '${DBPASS}'\""
fi

if ! su - postgres -c "psql -p ${PORT} -tAc \"SELECT 1 FROM pg_database WHERE datname='${DB}'\"" | grep -q 1; then
  log "creando base ${DB}"
  su - postgres -c "psql -p ${PORT} -c \"CREATE DATABASE ${DB} OWNER ${DBUSER}\""
fi

# --- 4. esquema de Guacamole (una sola vez) ---------------------------------
if ! PGPASSWORD="${DBPASS}" psql -h 127.0.0.1 -p "${PORT}" -U "${DBUSER}" -d "${DB}" \
     -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='guacamole_user'" | grep -q 1; then
  log "esquema de Guacamole (de guacamole-auth-jdbc-1.6.0)"
  mkdir -p "${CACHE}"
  if [ ! -f "${JDBC_TARBALL}" ]; then
    wget -q -O "${JDBC_TARBALL}" "${JDBC_URL}"
  fi
  tar -xzf "${JDBC_TARBALL}" -C "${CACHE}"
  for f in "${CACHE}"/guacamole-auth-jdbc-1.6.0/postgresql/schema/*.sql; do
    echo "  - $(basename "$f")"
    PGPASSWORD="${DBPASS}" psql -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "${PORT}" \
      -U "${DBUSER}" -d "${DB}" -f "$f"
  done
else
  log "esquema ya inicializado, no se repite"
fi

# --- 5. verificacion (AC3) ---------------------------------------------------
log "verificacion"
ss -ltn | grep ":${PORT}" || { echo "ERROR: el ${PORT} no escucha" >&2; exit 1; }
PGPASSWORD="${DBPASS}" psql -h 127.0.0.1 -p "${PORT}" -U "${DBUSER}" -d "${DB}" -c '\dt'
echo "== postgresql listo =="
