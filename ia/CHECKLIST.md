# CHECKLIST — datos externos a conseguir

Registro de los datos que hay que conseguir de **fuentes externas** (cliente, proveedor, operador) para poder escribir specs sin suposiciones. Cada ítem declara **dueño** y **condición de cierre**. Lo comprueba [`tools/check-harness.mjs`](./tools/check-harness.mjs).

> Regla: si una spec depende de un dato que no tienes, **no la inventes**: créala bloqueada por esa entrada de aquí.

## Ítems

### 1. Hipervisor de las VMs
- [ ] ¿VMware **Workstation/Player** o **ESXi/vCenter**? Determina el encendido de las VMs (`vmrun` en Workstation, Autostart en ESXi) y si existe consola HTML5 de rescate.
- **Dueño:** usuario
- **Condición de cierre:** el tipo de hipervisor queda escrito en `PROJECT.md` y con su decisión registrada.
- **Bloquea:** F-001

### 2. Edición de los Windows y número de VMs
- [ ] ¿Son **Pro/Enterprise/Server** o hay algún **Home**? Define RDP (nativo) frente a VNC (TightVNC/UltraVNC) y el protocolo de cada conexión.
- [ ] Cuántas VMs hay que publicar y con qué nombre.
- **Dueño:** usuario
- **Condición de cierre:** la lista de VMs con su edición está en la spec de F-001.
- **Bloquea:** F-001

### 3. Red de las VMs y host de Guacamole
- [ ] Modo de red de cada guest: **Bridged** (alcanzable), NAT (requiere port forwarding) o Host-only (no alcanzable desde otro equipo).
- [ ] Host Linux definitivo: distro, IP, recursos (mínimo 2 vCPU / 2 GB) y si ya existe.
- **Dueño:** usuario
- **Condición de cierre:** la topología (IPs y modo de red) está escrita en la spec de F-001.
- **Bloquea:** F-001

### 4. Forma de exposición
- [ ] ¿Dominio público con TLS (Caddy) o solo red privada (Tailscale/LAN)? Sin HTTPS el portapapeles automático no funciona, así que no es solo una decisión de seguridad.
- **Dueño:** usuario
- **Condición de cierre:** la forma de exposición está decidida y registrada como decisión.
- **Bloquea:** F-001

### 5. Comandos exactos del stack nativo
- [ ] Comandos de instalación (`guacd`, Tomcat, PostgreSQL, Caddy) y de recarga de servicios del host.
- **Dueño:** queda definido al escribir la spec de F-001 (no es un dato del usuario: es trabajo de especificación).
- **Condición de cierre:** `AGENTS.md` §Comandos y `PROJECT.md` dejan de decir `UNKNOWN` y traen los comandos reales.
- **Bloquea:** F-001

### 6. Sesiones concurrentes y quién accede
- [ ] ¿Hace falta que varias personas entren a la vez a la misma VM? Windows cliente admite **una sola sesión**; más de dos concurrentes en Server exige licencias RDS.
- [ ] ¿Quién más va a usar el sistema, además del usuario?
- **Dueño:** usuario
- **Condición de cierre:** el modelo de acceso queda escrito antes de crear los usuarios en Guacamole.
- **Bloquea:** F-001

## Cierre de un ítem

1. Marcar el checkbox.
2. Registrar la decisión en [`decisions/`](./decisions/INDEX.md) o en el `research/` correspondiente.
3. Actualizar [`MEMORY.md`](./MEMORY.md) y [`CURRENT.md`](./CURRENT.md) si cambia el estado.
4. Commitear con `docs: resolver <tema>`.

## Historial de cierres

Sin cierres todavía.

## Relacionados

- Estado: [`CURRENT.md`](./CURRENT.md) · Bloqueos por dato: [`specs/README.md`](./specs/README.md)
- Pendientes: [`BACKLOG.md`](./BACKLOG.md) · Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md)
