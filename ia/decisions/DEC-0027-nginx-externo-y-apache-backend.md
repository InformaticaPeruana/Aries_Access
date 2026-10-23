## DEC-0027 — TLS público en un nginx externo y Apache como backend en `server01`

Date: 2026-10-23
Status: active

Context:
[DEC-0026](./DEC-0026-arquitectura-despliegue-server01.md) daba por hecho que el reverse proxy y el TLS eran del **Apache del propio `server01`**. Al llegar a T07 el usuario aclaro que **ya tiene un nginx en otro servidor** (`192.168.18.203`) y que va a publicar Guacamole apuntando a `192.168.18.70`.

Eso parte el problema en dos tramos con responsabilidades distintas:

| Tramo | Quien | Que hace |
|---|---|---|
| Público (Internet) | **nginx del usuario** en `192.168.18.203` | Termina el TLS del dominio, manda `X-Forwarded-For` y publica `/guacamole/` |
| Interno (LAN) | **Apache de `server01`** (lo configura el agente) | Recibe HTTPS en el 443, pasa a Tomcat por loopback |
| Aplicacion | Tomcat + `guacd` | Sigue **solo en `127.0.0.1`** |

Decision:
- **El TLS público lo termina el nginx externo** (`192.168.18.203`). El agente **no** configura ese nginx: es infraestructura del usuario.
- **Opción B:** el nginx externo habla **HTTPS** con `https://192.168.18.70/guacamole/`; Apache en `server01` termina ese TLS interno con un **certificado propio autofirmado** (SAN `IP:192.168.18.70`) y hace de proxy a `127.0.0.1:8081`.
  - Se usa certificado propio y no de Let's Encrypt porque el tramo es LAN y así **no hace falta que el dominio resuelva al host**: T07 deja de depender del DNS.
  - El nginx del usuario puede usar `proxy_ssl_verify off` o fijar nuestro certificado con `proxy_ssl_trusted_certificate`. Se le entrega la huella SHA-256.
- **El 443 de `server01` solo acepta a `192.168.18.203` y a `127.0.0.1`** (`Require ip`). No queda un segundo camino público a Guacamole: quien quiera entrar pasa por el nginx.
- **Tomcat sigue en loopback** (`127.0.0.1:8081`) y `guacd` en `127.0.0.1:4822`: no se mueve nada de R3.
- **`RemoteIpValve`** de Tomcat pasa a confiar en `127.0.0.1` **y `192.168.18.203`**. Sin esto, todos los clientes llegan como la IP del nginx, `guacamole-auth-ban` bloquearía a todo el mundo a la vez y el historial guardaria una IP falsa.

Reason:
Reutilizar el nginx que el usuario ya administra evita instalar nada nuevo y respeta la regla de no tocar los servicios que ya funcionan en `server01`.
El salto interno cifrado (en vez de HTTP en claro por la LAN, que era la opción A) protege las credenciales del gateway RDP en el tramo entre los dos servidores.
El certificado autofirmado desacopla T07 del DNS: el dominio es un requisito del tramo público, que es del usuario, no del despliegue interno.

Consequences:
- **Obligatorio en el nginx del usuario:** `Upgrade`/`Connection` para el WebSocket, `proxy_buffering off`, `X-Forwarded-For` y `X-Forwarded-Proto`. Sin `X-Forwarded-For`, el limite de intentos se convierte en un auto-DoS.
- **AC6 cambia de responsable:** se verifica contra la URL publica del nginx, no contra `server01`. El agente verifica el backend (200 por `https://127.0.0.1/guacamole/` y la cadena de IP en el log).
- **Si el nginx publica en el puerto 81 sin TLS**, el login viaja en claro por Internet y AC6 no se cumple. Se registra como riesgo abierto hasta que se confirme el esquema.
- El certificado del backend hay que renovarlo a mano o aceptar su caducidad (825 dias); no hay ACME interno. Queda en [`../BACKLOG.md`](../BACKLOG.md).

## Relacionados

- Enmienda: [DEC-0026](./DEC-0026-arquitectura-despliegue-server01.md) · Despliegue: [DEC-0025](./DEC-0025-despliegue-nativo-sin-docker.md)
- Spec: [`../specs/infra/F-001/F-001.spec.md`](../specs/infra/F-001/F-001.spec.md) · Índice: [`INDEX.md`](./INDEX.md)
