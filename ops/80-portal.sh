#!/usr/bin/env bash
# F-002 T02 - publica la portada estatica en /var/www/aries-portal.
#
# Uso: sudo bash ops/80-portal.sh [ruta-a-public]
# Por defecto toma ../public respecto del script (cuando corre desde el repo).
# El vhost de Apache (ops/50) es quien la sirve en /portal/.
#
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="${1:-${HERE}/../public}"
DEST="/var/www/aries-portal"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: ejecutar con sudo" >&2
  exit 1
fi
for f in index.html styles.css img/logo-aries.jpg; do
  [ -f "${SRC}/${f}" ] || { echo "ERROR: falta ${SRC}/${f}" >&2; exit 1; }
done

echo "== publicando en ${DEST} =="
install -d -m 0755 "${DEST}"
cp -a "${SRC}/." "${DEST}/"
find "${DEST}" -type d -exec chmod 0755 {} +
find "${DEST}" -type f -exec chmod 0644 {} +

echo "== contenido =="
find "${DEST}" -type f -printf '   %P (%s bytes)\n' | sort
echo "== portada publicada =="
