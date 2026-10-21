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

### 2. Edición de los Windows y número de VMs
- [x] Son **Pro/Enterprise/Server**: RDP nativo en todas, sin VNC.
- [ ] Cuántas VMs hay que publicar y con qué nombre.
- **Dueño:** usuario
- **Condición de cierre:** la lista de VMs con su edición está en la spec de F-001.
- **Estado:** abierto por la lista. F-001 arranca con **una** conexión (R7) y cada VM se agrega sin escribir código nuevo: no bloquea la spec.
- **Bloquea:** T08 (agregar más de una VM)

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
- [ ] Reserva de **DHCP** para `server01`: hoy tiene IP dinámica y de ella dependen el vhost y el certificado.
- [ ] IP fija o reserva para cada VM Windows: la conexión RDP apunta a una IP, y si cambia, se rompe sola.
- **Dueño:** usuario
- **Condición de cierre:** reservas hechas en el DHCP del router y anotadas en la spec de F-001.
- **Bloquea:** AC6 (vhost y certificado) y T08 de forma diferida (funciona hoy; se rompe sin aviso el día que cambie la IP).

### 8. Dominio, DNS y certificado
- [ ] Cuál es el **dominio** público y quién controla su zona DNS.
- [ ] **Reenvío del 443** en el router hacia `server01`, y que el 443 esté libre también **fuera** del host.
- [ ] Si se emite con `webroot`, hace falta además el **80 entrante** desde Internet (HTTP-01). Si el 80 no puede abrirse, se usa `dns-01`.
- [ ] Método de emisión del certificado: `webroot` o `dns-01` (**nunca** `certbot --nginx`, que reescribe vhosts ajenos).
- **Dueño:** usuario
- **Condición de cierre:** dominio, zona DNS y método anotados en la spec de F-001.
- **Bloquea:** T07. **No bloquea** la spec.

### 9. Preparación del guest Windows
- [ ] RDP habilitado en cada VM (`fDenyTSConnections=0`).
- [ ] Firewall del guest con el 3389 **acotado a la IP de `server01`**, no abierto a toda la LAN.
- [ ] IP fija o reserva por VM.
- **Dueño:** usuario
- **Condición de cierre:** las tres cosas hechas en la VM y anotadas en la spec de F-001.
- **Bloquea:** T08.

## Cierre de un ítem

1. Marcar el checkbox.
2. Registrar la decisión en [`decisions/`](./decisions/INDEX.md) o en el `research/` correspondiente.
3. Actualizar [`MEMORY.md`](./MEMORY.md) y [`CURRENT.md`](./CURRENT.md) si cambia el estado.
4. Commitear con `docs: resolver <tema>`.

## Historial de cierres

- **2026-10-21** — ítems **1, 3, 4 y 5** cerrados al escribir la spec de F-001 ([`DEC-0026`](./decisions/DEC-0026-arquitectura-despliegue-server01.md)). Ítem **2** cerrado a medias: falta la lista de VMs.
- **2026-10-21** — añadidos los ítems **8** (dominio, DNS y certificado) y **9** (preparación del guest) a raíz de la revisión adversarial de la spec: eran trabajo del usuario que el plan daba por hecho sin dueño.

## Relacionados

- Estado: [`CURRENT.md`](./CURRENT.md) · Bloqueos por dato: [`specs/README.md`](./specs/README.md)
- Pendientes: [`BACKLOG.md`](./BACKLOG.md) · Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md)
