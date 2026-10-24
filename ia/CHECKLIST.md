# CHECKLIST — datos externos a conseguir

Registro de los datos que hay que conseguir de **fuentes externas** (cliente, proveedor, operador) para poder escribir specs sin suposiciones. Cada ítem declara **dueño** y **condición de cierre**. Lo comprueba [`tools/check-harness.mjs`](./tools/check-harness.mjs).

> Regla: si una spec depende de un dato que no tienes, **no la inventes**: créala bloqueada por esa entrada de aquí.

## Ítems

### 1. Hipervisor de las VMs ✅
- [x] Es **ESXi / vCenter**: las VMs se alcanzan por su IP y la consola de rescate es la Web Console HTML5; el encendido es del ESXi (Autostart), no de Guacamole.
- **Dueño:** usuario
- **Condición de cierre:** el tipo de hipervisor queda escrito en `PROJECT.md` y con su decisión registrada.
- **Cerrado:** 2026-10-21 — en `PROJECT.md` §Componentes y en [`DEC-0026`](./decisions/DEC-0026-arquitectura-despliegue-server01.md).
- **Bloquea:** F-001

### 2. Edición de los Windows y número de VMs ✅
- [x] Son **Pro/Enterprise/Server**: RDP nativo en todas, sin VNC.
- [x] Primera VM identificada y medida en T01: **`DESKTOP-8T09V6F`**, Windows 10 **Pro**, `192.168.18.41` (IP manual), RDP con NLA.
- **Dueño:** usuario
- **Condición de cierre:** la lista de VMs con su edición está en la spec de F-001.
- **Cerrado:** 2026-10-21 — R7 nombra la primera VM. Agregar más es crear otra conexión en Guacamole, sin código nuevo.
- **Bloquea:** nada.

### 3. Red de las VMs y host de Guacamole ✅
- [x] Host definitivo: **`server01`** (`192.168.18.70`), Ubuntu 24.04.4 LTS, VM de VMware. `PROJECT.md` y [`DEC-0026`](./decisions/DEC-0026-arquitectura-despliegue-server01.md).
- [x] Las VMs están en el **ESXi**, con IP propia en la red (no NAT ni Host-only del PC).
- **Dueño:** usuario
- **Condición de cierre:** la topología (IPs y modo de red) está escrita en la spec de F-001.
- **Cerrado:** 2026-10-21 — que el 3389 responda **desde `server01`** se comprueba en T01, que es una verificación del agente, no un dato del usuario.
- **Bloquea:** F-001

### 4. Forma de exposición ✅
- [x] **Dominio público con certificado válido**, servido por el **nginx del host** (no Caddy: el 80 ya es de nginx). HTTPS es requisito funcional, no sólo de seguridad: sin contexto seguro el portapapeles automático no existe.
- **Dueño:** usuario
- **Condición de cierre:** la forma de exposición está decidida y registrada como decisión.
- **Cerrado:** 2026-10-21 — [`DEC-0026`](./decisions/DEC-0026-arquitectura-despliegue-server01.md). Obliga a TOTP (R6).
- **Bloquea:** F-001

### 5. Comandos exactos del stack nativo ✅
- [x] Quedan definidos en la spec de F-001 y en sus órdenes de trabajo (`ops/10-guacd.sh` … `ops/60-conexion-rdp.sh`, recarga con `systemctl` y `nginx -t`), y escritos en `PROJECT.md` §Comandos.
- **Dueño:** queda definido al escribir la spec de F-001 (no es un dato del usuario: es trabajo de especificación).
- **Condición de cierre:** `AGENTS.md` §Comandos y `PROJECT.md` dejan de decir `UNKNOWN` y traen los comandos reales.
- **Cerrado:** 2026-10-21 — por especificación. Que funcionen se comprueba ejecutándolos (T03–T08), y esa evidencia vive en el TRACKING.
- **Bloquea:** F-001

### 6. Sesiones concurrentes y quién accede
- [ ] ¿Hace falta que varias personas entren a la vez a la misma VM? Windows cliente admite **una sola sesión**; más de dos concurrentes en Server exige licencias RDS.
- [ ] ¿Quién más va a usar el sistema, además del usuario?
- **Dueño:** usuario
- **Condición de cierre:** el modelo de acceso queda escrito antes de crear los usuarios en Guacamole (T06).
- **Bloquea:** T06 (crear usuarios). No bloquea T01–T05.

### 7. IP estable para el host y para los guests
- [x] **Guest:** `192.168.18.41` es **manual** (estática), no DHCP. Verificado en T01.
- [ ] Reserva de **DHCP** para `server01`: hoy tiene IP dinámica y de ella dependen el vhost y el certificado.
- **Dueño:** usuario
- **Condición de cierre:** reserva hecha en el DHCP del router y anotada en la spec de F-001.
- **Estado:** el guest está resuelto; falta el host.
- **Bloquea:** AC6 (vhost y certificado) de forma diferida (funciona hoy; se rompe sin aviso el día que cambie la IP).

### 8. Dominio, DNS y certificado
- [x] **El tramo interno ya no depende del dominio**: `server01` usa un certificado propio para el salto desde nginx ([DEC-0027](./decisions/DEC-0027-nginx-externo-y-apache-backend.md)).
- [ ] **En el nginx del usuario** (`192.168.18.203`): qué dominio publica, en qué puerto y con qué TLS. Es su infraestructura; el agente no la toca.
- **Dueño:** usuario
- **Condición de cierre:** la URL pública responde con certificado válido y publica `/guacamole/` (AC6).
- **Bloquea:** AC6 (T07), no el resto.
- **Riesgo abierto:** si ese nginx publica en el **puerto 81 sin TLS**, el login viaja en claro por Internet y AC6 no se cumple.

### 9. Preparación del guest Windows ✅
- [x] RDP habilitado (`fDenyTSConnections=0`) y **NLA activo** (`UserAuthentication=1`, `SecurityLayer=2`).
- [x] El 3389 **responde a `server01`**: `192.168.18.41 3389 OK` (medido en T01). El firewall ya lo permite; no se abrió a toda la LAN, se dejó como estaba.
- [x] IP fija en el guest (`192.168.18.41`, origen Manual).
- **Dueño:** usuario
- **Condición de cierre:** las tres cosas hechas en la VM y anotadas en la spec de F-001.
- **Cerrado:** 2026-10-21 con la medición de T01. **Queda un dato para T08:** el usuario y la contraseña de la cuenta de Windows (`usuario`), que se cargan en Guacamole y no se versionan.
- **Bloquea:** nada.

### 10. Activos de marca
- [ ] **Hexadecimales exactos** de la paleta: navy institucional, amber de acción y gris frío. Hoy F-002 usa una propuesta derivada de la descripción del usuario.
- [ ] **Logo** en PNG (dos tamaños) para el icono de la aplicación y el favicon.
- **Dueño:** usuario
- **Condición de cierre:** los valores y el archivo están en `ops/branding/`.
- **Bloquea:** AC1/AC2 de F-002 sólo en parte: sin hexadecimales se usa la propuesta; sin logo no se pone icono (no se inventa).

## Cierre de un ítem

1. Marcar el checkbox.
2. Registrar la decisión en [`decisions/`](./decisions/INDEX.md) o en el `research/` correspondiente.
3. Actualizar [`MEMORY.md`](./MEMORY.md) y [`CURRENT.md`](./CURRENT.md) si cambia el estado.
4. Commitear con `docs: resolver <tema>`.

## Historial de cierres

- **2026-10-21** — ítems **1, 3, 4 y 5** cerrados al escribir la spec de F-001 ([`DEC-0026`](./decisions/DEC-0026-arquitectura-despliegue-server01.md)). Ítem **2** cerrado a medias: falta la lista de VMs.
- **2026-10-21** — añadidos los ítems **8** (dominio, DNS y certificado) y **9** (preparación del guest) a raíz de la revisión adversarial de la spec: eran trabajo del usuario que el plan daba por hecho sin dueño.
- **2026-10-21 (T01)** — cerrados los ítems **2** (la VM es `DESKTOP-8T09V6F`, Windows 10 Pro, `192.168.18.41`) y **9** (RDP con NLA y 3389 alcanzable desde `server01`). El **7** queda a medias: el guest ya tiene IP estática, falta la reserva de DHCP del host. Abierto el **8**: sin dominio no hay vhost ni certificado.

## Relacionados

- Estado: [`CURRENT.md`](./CURRENT.md) · Bloqueos por dato: [`specs/README.md`](./specs/README.md)
- Pendientes: [`BACKLOG.md`](./BACKLOG.md) · Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md)
