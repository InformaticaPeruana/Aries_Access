#!/usr/bin/env bash
# F-001 T03 - guacd 1.6.0 como servicio, escuchando solo en loopback.
#
# Idempotente: si guacd ya esta instalado, no recompila.
# No interactivo: pensado para ejecutarse con `sudo bash ops/10-guacd.sh`.
#
# Evidencia que deja:
#   /var/log/guacd-build.log   resumen de configure + salida de make
#
set -euo pipefail

VERSION="1.6.0"
PREFIX="/usr/local"
SRC="/tmp/guacamole-server-${VERSION}"
TARBALL="/tmp/guacamole-server-${VERSION}.tar.gz"
URL="https://archive.apache.org/dist/guacamole/${VERSION}/source/guacamole-server-${VERSION}.tar.gz"
UNIT="/etc/systemd/system/guacd.service"
LOG="/var/log/guacd-build.log"

export DEBIAN_FRONTEND=noninteractive

log() { echo "== $* =="; }

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: ejecutar con sudo" >&2
  exit 1
fi

# --- 1. compilacion (solo si hace falta) -------------------------------------
if [ -x "${PREFIX}/sbin/guacd" ]; then
  log "guacd ya instalado, no se recompila"
else
  log "dependencias de compilacion"
  apt-get update -qq
  apt-get install -y -qq --no-install-recommends \
    build-essential wget ca-certificates \
    libcairo2-dev libjpeg-turbo8-dev libpng-dev libtool-bin libossp-uuid-dev \
    freerdp2-dev libpango1.0-dev libssh2-1-dev libtelnet-dev libvncserver-dev \
    libpulse-dev libssl-dev libvorbis-dev libwebp-dev

  log "fuente ${VERSION}"
  if [ ! -f "${TARBALL}" ]; then
    wget -q -O "${TARBALL}" "${URL}"
  fi
  rm -rf "${SRC}"
  tar -xzf "${TARBALL}" -C /tmp

  log "configure (RDP debe quedar en yes)"
  cd "${SRC}"
  if ! ./configure --with-systemd-dir=/etc/systemd/system --disable-guacenc > "${LOG}" 2>&1; then
    echo "ERROR: configure fallo, ultimas lineas:" >&2
    tail -40 "${LOG}" >&2
    exit 1
  fi
  grep -Ei "freerdp|rdp" "${LOG}" || true

  log "make (un solo job: el host tiene 1 vCPU)"
  if ! make -j1 >> "${LOG}" 2>&1; then
    echo "ERROR: make fallo, ultimas lineas:" >&2
    tail -40 "${LOG}" >&2
    exit 1
  fi
  make install >> "${LOG}" 2>&1
  ldconfig

  rm -rf "${SRC}" "${TARBALL}"
  apt-get clean
fi

# --- 2. directorios de trabajo ----------------------------------------------
log "directorios"
install -d -o daemon -g daemon -m 0750 /var/lib/guacd
install -d -o daemon -g daemon -m 0750 /var/lib/guacd/drive
install -d -m 0755 /etc/guacamole

# --- 3. unidad propia --------------------------------------------------------
log "unidad guacd.service"
cat > "${UNIT}" <<'UNITEOF'
[Unit]
Description=Guacamole proxy daemon (guacd)
After=network.target

[Service]
Type=simple
User=daemon
Group=daemon
# FreeRDP guarda configuracion y certificados en $HOME: /usr/sbin no es
# escribible y sin esto la negociacion TLS/NLA puede fallar.
Environment=HOME=/var/lib/guacd
# Las grabaciones contienen todo lo visible: nacen en 0640, no legibles por todos.
UMask=0007
ExecStart=/usr/local/sbin/guacd -f -b 127.0.0.1
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNITEOF

systemctl daemon-reload
systemctl enable guacd >/dev/null 2>&1
systemctl restart guacd
sleep 2

# --- 4. verificacion ---------------------------------------------------------
log "verificacion"
systemctl is-enabled guacd
systemctl is-active guacd
"${PREFIX}/sbin/guacd" -v 2>&1 | head -1
ss -ltn | grep 4822 || echo "ERROR: el 4822 no escucha" >&2
echo "== guacd listo =="
