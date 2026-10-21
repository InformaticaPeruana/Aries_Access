## DEC-0026 — Arquitectura de despliegue de Guacamole en `server01`

Date: 2026-10-21
Status: active

Context:
F-001 tiene que desplegarse en algún host y el usuario eligió **reutilizar `server01`** (`192.168.18.70`), la VM Linux documentada en el proyecto `Aries_ServerLinux`. Ese host **ya está en producción** y trae límites que no se pueden ignorar.

Los datos de abajo son **medidos en T01** (2026-10-21 21:25, solo lectura), no heredados del inventario de partida. El inventario decía "disco al 99% con 1.4 GB libres": era **anterior** a la limpieza de respaldos que hizo el proyecto `Aries_ServerLinux` y ya no es cierto.

| Dato del host | Valor medido |
|---|---|
| SO | Ubuntu 24.04.4 LTS (noble), VM de VMware, load 0.38 |
| Disco | `/` 97 GB, **47 GB usados y 46 GB libres (51%)** |
| RAM | 7942 MB totales, **4597 MB disponibles**, swap 826/4096 |
| Proxy | **Apache/2.4.58** sirviendo el `:80` (`000-default`), sin SSL y sin módulos `proxy`/`ssl` habilitados |
| Puertos ocupados | 80 (Apache), 3306/33060 (MySQL), 5432/5433/6543/8000/8443 (Supabase y Kong), 3000 (Chatwoot), 5678 (n8n), 8080 (**Evolution API**) |
| Puertos libres | **443**, **8081**, **5434**, **4822** |
| nginx | **no instalado** (ni binario ni unidad) |
| PostgreSQL / Tomcat / Java / guacd | **no instalados** en el host (el PostgreSQL de Supabase es un contenedor) |
| Docker | activo, 3 bridges; el usuario `humberto` **no** está en el grupo `docker` |
| Acceso | SSH con clave; **`sudo` pide contraseña**; IP por **DHCP** |

Las VMs a publicar son Windows **Pro/Enterprise/Server** en **ESXi/vCenter**, alcanzables por RDP. La primera es **`DESKTOP-8T09V6F`**, Windows 10 Pro, **`192.168.18.41`** (IP manual), RDP habilitado con **NLA** y **3389 alcanzable desde `server01`** (verificado en T01).

Decision:
- **Nativo sobre `server01`**, sin contenedores ([DEC-0025](./DEC-0025-despliegue-nativo-sin-docker.md)), conviviendo con los servicios existentes.
- **El reverse proxy y el TLS son del Apache del host**, no de nginx ni de Caddy: Apache ya sirve el `:80` y el `443` está libre. Guacamole se publica como un **vhost nuevo** por nombre, con `mod_proxy_http`, `mod_proxy_wstunnel`, `mod_ssl` y `mod_headers`, sin tocar `000-default`.
- La webapp corre sobre **Tomcat 9**, no Tomcat 10+: Guacamole 1.6.0 se compila contra `javax.servlet` y Tomcat 10+ usa `jakarta.servlet`, así que el `.war` no arranca (JIRA GUACAMOLE-1325, sin resolver hasta 2.0.0). **`tomcat9` no existe en los repositorios de noble**: se instala del **tarball oficial de Apache** en `/opt/tomcat9` con **unidad de systemd propia** (`guacamole-tomcat`).
- La webapp escucha en **`127.0.0.1:8081`** (el 8080 es de Evolution API) y la base en **`127.0.0.1:5434`** (5432 y 5433 ocupados por Supabase). `guacd` queda en loopback, en el 4822.
- **Protocolo: RDP** para todas las VMs; la consola de rescate es la **Web Console HTML5 del ESXi**, no una conexión de Guacamole.
- Los scripts de operación viven en **`ops/`** y la smoke suite en **`tests/`**: se añaden a `codeRoots` en `harness.config.json`.
- **No hay gate de disco.** El espacio está medido y sobra: no se borra ningún respaldo.

Reason:
`server01` es la elección explícita del usuario y ya está en la misma red que el ESXi, así que evita una VM nueva y el trabajo de red que la investigación daba por hecho.
Se descartó **nginx** porque no está instalado y el 80 ya lo sirve Apache: instalarlo obligaría a pelear por el mismo puerto o a un proxy delante del proxy. Apache es aditivo (un `sites-available` nuevo) y no toca lo que ya funciona.
Se descartó **Caddy** por la misma razón (lo recomendaba la investigación).
Se descartó **`tomcat10`** (el único de los repositorios) por incompatibilidad `jakarta`/`javax`; el tarball oficial de Tomcat 9 es la vía soportada por Guacamole 1.6.0.
Se descartó usar **MySQL del host** (3306, ya en uso) para la base de Guacamole: ahorraría instalar PostgreSQL, pero acopla Guacamole al MySQL de los sistemas ARIES y hace más caro cualquier cambio de esquema.
Se descartó pedir una **VM nueva**: el usuario decidió reutilizar `server01` a sabiendas de que va justo.

Consequences:
- **Obligatorio:** ningún servicio existente de `server01` se para, reinicia ni reconfigura en F-001. Si algo exige reiniciar el host, es un gate con confirmación explícita en una ventana acordada.
- **Se acepta un riesgo declarado:** 1 vCPU y ~4.6 GiB de RAM disponibles para un stack que pide del orden de 1 GB y concurrencia. Varias sesiones simultáneas van a degradar a los servicios vecinos; se mide con una sesión abierta (T05).
- **Se acepta otro:** UFW inactivo y puertos de los vecinos escuchando en `0.0.0.0`. No se corrige aquí (cambiarlo afecta a todo el servidor), pero queda en [`../BACKLOG.md`](../BACKLOG.md).
- **`sudo` pide contraseña:** el despliegue necesita una vía no interactiva. Se resuelve con una entrada **NOPASSWD** en `/etc/sudoers.d/`, temporal y acotada, que el usuario retira al cerrar F-001.
- El vhost y el certificado dependen de que la IP de `server01` deje de ser dinámica: reserva de DHCP en [`../CHECKLIST.md`](../CHECKLIST.md).
- `codeRoots` pasa a `["src", "public", "ops", "tests"]`.

## Enmienda tras T01 (2026-10-21)

La verificación de solo lectura **contradijo cuatro supuestos** de la versión original de esta decisión. Cambian cuatro cosas y ninguna de alcance:

| Supuesto original | Realidad medida | Efecto |
|---|---|---|
| Disco al 99%, 1.4 GB libres | 51%, **46 GB libres** | **Se anula el gate de borrado** (T02) y la regla "nada se instala antes de liberar disco" queda cumplida por medición |
| TLS por el **nginx** del host | **Apache 2.4.58**; nginx no existe | R4 y T07 pasan a Apache; se habilitan `proxy`, `proxy_http`, `proxy_wstunnel`, `ssl`, `headers` |
| `tomcat9` en `universe` | **no hay candidato** en noble | Tomcat 9 del **tarball oficial** en `/opt/tomcat9`, con unidad `guacamole-tomcat` propia |
| Nombres de unidad "por confirmar" en T01 | los servicios no están instalados | La incógnita desaparece: las unidades de `guacd` y Tomcat las creamos nosotros |

Lo demás se confirma: los puertos ocupados son los previstos, `8081`/`5434`/`4822`/`443` están libres, el host sigue siendo el de los contenedores y el riesgo de convivencia sigue vigente.

## Relacionados

- Despliegue: [DEC-0025](./DEC-0025-despliegue-nativo-sin-docker.md) · Spec: [`../specs/infra/F-001/F-001.spec.md`](../specs/infra/F-001/F-001.spec.md)
- Índice: [`INDEX.md`](./INDEX.md) · Gates: [`../GATES.md`](../GATES.md) · Datos por cerrar: [`../CHECKLIST.md`](../CHECKLIST.md)
- Evidencia de la medición: [`../specs/infra/F-001/F-001-TRACKING.md`](../specs/infra/F-001/F-001-TRACKING.md) §T01
