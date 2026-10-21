# ARCHITECTURE

Estado arquitectónico **actual**. Se actualiza solo cuando cambia la arquitectura ([`protocol/13-close-git.md`](./protocol/13-close-git.md)). No documentes cada método: documenta **estructura y flujos**.

> Nada está instalado todavía: esto es la arquitectura **decidida** para F-001, no la observada. Lo que no se pueda comprobar, está marcado como pendiente.

## Componentes y responsabilidades

| Componente | Responsabilidad | Depende de |
|---|---|---|
| Apache 2.4 del host | Termina TLS, publica `https://<dominio>/guacamole/` y reenvía el WebSocket a la webapp. Ya existe y sirve otros sitios | certificado válido |
| Tomcat + webapp Guacamole | Cliente HTML5: dibuja la sesión en `<canvas>` y la transporta por WebSocket. Escucha en `127.0.0.1:8081` | `guacd`, PostgreSQL, JDK |
| `guacd` | Proxy de protocolos: habla RDP con el guest. Escucha solo en loopback (4822) | la VM Windows encendida y con red |
| PostgreSQL 16 | Usuarios, conexiones, permisos y parámetros. Escucha en `127.0.0.1:5434` | — |
| ESXi/vCenter | Hipervisor: **enciende** las VMs y da Web Console HTML5. Queda **fuera** de Guacamole | — |

## Flujos principales

**Entrar a una VM (el flujo que importa).**
1. El navegador pide `https://<dominio>/guacamole/` y Apache termina el TLS.
2. Login con usuario propio y **TOTP**; Guacamole valida contra PostgreSQL.
3. El usuario elige la conexión; la webapp abre un WebSocket.
4. La webapp pide a `guacd` una sesión RDP contra la IP del guest, con NLA.
5. El guest entra con el usuario y la contraseña guardados en la conexión (cifrados con la clave de la base). **Punto irreversible:** cambiar esa clave deja ilegibles las credenciales guardadas.

**Aprovisionar el host.** `ops/10` → `ops/60`, en orden, cada uno idempotente. `ops/50` (Apache) es el **punto irreversible**: recargar Apache con un vhost mal escrito tumba todos los sitios del host. Se valida con `apache2ctl configtest` antes de recargar.

## Persistencia

Una sola base: `guacamole_db` en el PostgreSQL del host (`127.0.0.1:5434`), con las tablas de Guacamole (`guacamole_user`, `guacamole_connection`, `guacamole_connection_parameter`, `guacamole_sharing_profile`, …). **Las credenciales de los guests se guardan en Guacamole**, cifradas con la clave derivada de la contraseña del usuario de base; el `connection_id` es la identidad de una conexión y **no** es estable si se recrea (rompe deep links). Ver [`GATES.md`](./GATES.md).

## APIs

| Recurso | Propósito | Auth |
|---|---|---|
| `https://<dominio>/guacamole/` | Interfaz y API REST de Guacamole (`/api/tokens`, `/api/session/data/...`) | usuario + contraseña + TOTP |
| `http://127.0.0.1:8081/guacamole/` | El mismo servicio, solo desde el host. No se publica | — |
| `127.0.0.1:4822` | protocolo interno webapp ↔ `guacd` | — |

## Integraciones externas

- **ESXi/vCenter** — se usa solo para encender VMs y como consola de rescate; **no hay integración** en Guacamole, que solo necesita alcanzar la IP del guest por el 3389.
- **Proveedor de DNS / certificado** — el nombre público tiene que resolver al host y el certificado tiene que ser válido, o el portapapeles deja de funcionar (contexto seguro).
- **Vecinos en `server01`** (Supabase, n8n, Chatwoot, Evolution API) — si fallan, no es por Guacamole, pero comparten CPU, disco y RAM: una sesión pesada los degrada.

## Decisiones arquitectónicas activas

| Decisión | Tema |
|---|---|
| [DEC-0025](./decisions/DEC-0025-despliegue-nativo-sin-docker.md) | Despliegue nativo, sin Docker |
| [DEC-0026](./decisions/DEC-0026-arquitectura-despliegue-server01.md) | Host, **Apache** como reverse proxy, puertos 8081/5434 y RDP |

## Deuda arquitectónica

- **Sin aislamiento:** Guacamole comparte host con servicios en producción. Es una decisión consciente del usuario, no un descuido: ver los riesgos de [DEC-0026](./decisions/DEC-0026-arquitectura-despliegue-server01.md).
- **UFW inactivo** en el host con 21 contenedores escuchando: fuera de alcance de F-001 → [`BACKLOG.md`](./BACKLOG.md).
- **IP dinámica (DHCP):** el vhost y el certificado dependen de una reserva que todavía no existe → [`BACKLOG.md`](./BACKLOG.md).

## Relacionados

- Proyecto: [`PROJECT.md`](./PROJECT.md) · Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md)
- Flujos a validar: [`protocol/09-qa.md`](./protocol/09-qa.md) · Estado: [`CURRENT.md`](./CURRENT.md)
