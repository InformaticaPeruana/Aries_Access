## DEC-0025 — Despliegue nativo del stack Guacamole, sin Docker

Date: 2026-10-21
Status: active

Context:
La investigación de partida ([`../research/2026-10-21-guacamole-vms-navegador.md`](../research/2026-10-21-guacamole-vms-navegador.md)) planteaba `docker compose` como ruta recomendada. Al adoptar el harness se preguntó por la forma real de instalar y levantar el proyecto, y la respuesta fue la instalación **nativa**.

Decision:
El stack de Guacamole se despliega **nativo en un host Linux**, sin contenedores:

- `guacd` compilado e instalado como servicio del sistema.
- La webapp de Guacamole (`.war`) servida por **Tomcat 10+**.
- **PostgreSQL** para usuarios, conexiones, permisos e historial.
- `GUACAMOLE_HOME` como `/etc/guacamole`, con las extensiones (`.jar`, p. ej. branding o TOTP) en `/etc/guacamole/extensions/`.
- TLS por delante con **Caddy**; Guacamole escucha solo en localhost.

No se versiona ningún `docker-compose.yml`: no forma parte del producto de este proyecto.

Reason:
Es la elección explícita del usuario al adoptar. Se descartó Docker Compose, que era la recomendación de la investigación, por preferencia de despliegue: el host es una VM Linux del mismo VMware y se prefiere el paquete del sistema a la capa de contenedores.
La consecuencia se acepta a conciencia: la instalación nativa es más frágil de reproducir que el compose, así que el aprovisionamiento tiene que quedar escrito en una spec (F-001) y no en la memoria de quien lo instaló.

Consequences:
- **Obligatorio:** la instalación se documenta como instrucciones reproducibles en la spec de F-001, no como comandos sueltos de una sesión.
- Los comandos exactos de instalación y de recarga de servicios están **`UNKNOWN`** hasta que exista el host (ver [`../CHECKLIST.md`](../CHECKLIST.md)); `AGENTS.md` §Comandos lo dice así, sin inventarlos.
- Este proyecto usa **dos versiones que deben coincidir**: `guacd` y la webapp de Guacamole. Queda como trampa conocida en [`../MEMORY.md`](../MEMORY.md).
- Los protocolos y la topología concreta (RDP frente a VNC, red de las VMs, exposición por dominio o Tailscale) **no** se deciden aquí: dependen de datos que aún no tenemos y viven en [`../CHECKLIST.md`](../CHECKLIST.md).

## Relacionados

- Adopción: [DEC-0024](./DEC-0024-adopcion-aries-access.md) · Investigación: [`../research/2026-10-21-guacamole-vms-navegador.md`](../research/2026-10-21-guacamole-vms-navegador.md)
- Índice: [`INDEX.md`](./INDEX.md) · Gates de despliegue: [`../GATES.md`](../GATES.md)
