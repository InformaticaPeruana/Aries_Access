## DEC-0026 — Arquitectura de despliegue de Guacamole en `server01`

Date: 2026-10-21
Status: active

Context:
F-001 tiene que desplegarse en algún host y el usuario eligió **reutilizar `server01`** (`192.168.18.70`), la VM Linux documentada en el proyecto `Aries_ServerLinux`. Ese host **ya está en producción** y trae límites que no se pueden ignorar:

| Dato del host | Valor |
|---|---|
| SO | Ubuntu 24.04.4 LTS, VM de VMware, 1 vCPU, 7.8 GiB RAM |
| Disco | 97 GB al **99%** — 1.4 GB libres |
| Puertos ocupados | 80 (nginx), 3306 (MySQL), 5432/5433/6543/8000/8443 (Supabase), 8080 (**Evolution API**), 5678 (n8n), 3000 (Chatwoot) |
| Exposición | UFW **inactivo**; IPv4 por **DHCP** |
| Carga ajena | 21 contenedores: Supabase, n8n, Chatwoot, Evolution API |

Las VMs a publicar son Windows **Pro/Enterprise/Server** en **ESXi/vCenter**, alcanzables por RDP.

Decision:
- **Nativo sobre `server01`**, sin contenedores ([DEC-0025](./DEC-0025-despliegue-nativo-sin-docker.md)), conviviendo con los servicios existentes.
- **El reverse proxy y el TLS son del nginx del host**, no de Caddy: el puerto 80 ya lo sirve nginx. Guacamole se publica como un vhost por nombre con certificado válido en el 443.
- La webapp corre sobre **Tomcat 9**, no Tomcat 10+: Guacamole 1.6.0 se compila contra `javax.servlet` y Tomcat 10+ usa `jakarta.servlet`, así que el `.war` no arranca (JIRA GUACAMOLE-1325, sin resolver hasta 2.0.0). Ubuntu 24.04 ofrece `tomcat9` en `universe`.
- La webapp escucha en **`127.0.0.1:8081`** (el 8080 es de Evolution API) y la base en **`127.0.0.1:5434`** (el 5432 y el 5433 están ocupados por Supabase). `guacd` queda en loopback.
- **Protocolo: RDP** para todas las VMs; la consola de rescate es la **Web Console HTML5 del ESXi**, no una conexión de Guacamole.
- Los scripts de operación viven en **`ops/`** y la smoke suite en **`tests/`**: se añaden a `codeRoots` en `harness.config.json`.
- **Antes de instalar hay que liberar disco**, y borrar respaldos es una operación de una sola dirección: pasa por el gate de [`../GATES.md`](../GATES.md).

Reason:
`server01` es la elección explícita del usuario y ya está en la misma red que el ESXi, así que evita una VM nueva y el trabajo de red que la investigación daba por hecho.
Se descartó **Caddy** (lo recomendaba la investigación) porque el 80 ya está en uso por nginx: añadirlo obligaría a pelear por el mismo puerto o a un proxy delante del proxy.
Se descartó usar **MySQL del host** (que ya existe en el 3306) para la base de Guacamole: ahorraría instalar PostgreSQL, pero acopla Guacamole al MySQL de los sistemas ARIES y hace más caro cualquier cambio de esquema.
Se descartó pedir una **VM nueva**: el usuario decidió reutilizar `server01` a sabiendas de que va justo.

Consequences:
- **Obligatorio:** ningún servicio existente de `server01` se para, reinicia ni reconfigura en F-001. Si algo exige reiniciar el host, es un gate con confirmación explícita en una ventana acordada.
- **Se acepta un riesgo declarado:** 1 vCPU y ~3.9 GiB de RAM libres para un stack que pide del orden de 1 GB y concurrencia. Varias sesiones simultáneas van a degradar a los servicios vecinos; se mide en T01 y se declara.
- **Se acepta otro:** UFW inactivo y puertos de los vecinos escuchando en `0.0.0.0`. No se corrige aquí (cambiarlo afecta a todo el servidor), pero queda en [`../BACKLOG.md`](../BACKLOG.md).
- El vhost y el certificado dependen de que la IP deje de ser dinámica: reserva de DHCP en [`../CHECKLIST.md`](../CHECKLIST.md).
- `codeRoots` pasa a `["src", "public", "ops", "tests"]`.

## Relacionados

- Despliegue: [DEC-0025](./DEC-0025-despliegue-nativo-sin-docker.md) · Spec: [`../specs/infra/F-001/F-001.spec.md`](../specs/infra/F-001/F-001.spec.md)
- Índice: [`INDEX.md`](./INDEX.md) · Gates: [`../GATES.md`](../GATES.md) · Datos por cerrar: [`../CHECKLIST.md`](../CHECKLIST.md)
