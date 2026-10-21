# Current State

> **≤ 60 líneas. Solo el ahora.** Si este archivo empieza a narrar features completadas, está mal: eso va a [`CHANGELOG.md`](./CHANGELOG.md) y a la spec. Ver [DEC-0004](./decisions/DEC-0004-memoria-diferencial.md).

## Objective

Acceso a las VMs Windows de VMware desde el navegador con Apache Guacamole: un solo punto de entrada, sin agentes en los guests. Fase actual: F-001 en ejecución.

## Current Task

F-001 · **T07** — vhost de Apache y TLS público. **Bloqueada**: falta dominio y DNS.

## Status

`in_progress` — T01–T05 `done`, **T06 `partial`** (falta el enrolamiento TOTP del usuario). T07–T09 pendientes.

## Last Completed

**T06**: `guacadmin`/`guacadmin` rechazado, usuario `humberto` creado, TOTP exigido (`TOTP.INFO_ENROLL_REQUIRED`) y límite de intentos con **HTTP 429** tras 5 fallos. Contraseñas en `/root/guacadmin.pass` y `/root/humberto.pass`.

## Next

1. **Cerrar T06**: el usuario entra a `http://192.168.18.70:8081/guacamole/` (desde la LAN), enrola el TOTP con su app y se prueba el código caducado (AC5 3/3).
2. **T07**: vhost de Apache + certificado. Necesita **dominio, DNS y reenvío del 443** (y del 80 si se usa `webroot`).
3. **T08**: conexión RDP a `192.168.18.41`. Necesita el **usuario y la contraseña de Windows**.

## Blockers

- **Dominio, DNS y certificado** (ítem 8 de [`CHECKLIST.md`](./CHECKLIST.md)): bloquean T07.
- **Credenciales del guest** (`usuario` de Windows en `192.168.18.41`): se necesitan en T08 y se cargan en Guacamole, no en el repo.
- **Reserva de DHCP de `server01`** (ítem 7): no bloquea, pero el certificado se romperá el día que cambie la IP.

## Active Spec

[`specs/infra/F-001/F-001.spec.md`](./specs/infra/F-001/F-001.spec.md) — F-001, riesgo alto, `in_progress`

## Active Plan

[`plans/F-001/PLAN.md`](./plans/F-001/PLAN.md) — T01 y T02 cerradas; T03–T09 pendientes

## Entorno

- Host: `server01` (`192.168.18.70`), Ubuntu 24.04.4, 1 vCPU, 4.6 GiB disponibles. Convive con Supabase, n8n, Chatwoot y Evolution API (Docker).
- Harness: `node ia/tools/check-harness.mjs --report` · pruebas: `node ia/tools/run-tests.mjs` (sin comandos declarados: los añade T09).

## Al retomar

- **El proxy es Apache, no nginx** ([DEC-0026](./decisions/DEC-0026-arquitectura-despliegue-server01.md) §Enmienda). nginx no está instalado.
- **Tomcat 9 va del tarball** en `/opt/tomcat9` con unidad `guacamole-tomcat` (no hay `tomcat9` en apt).
- **No se para, reinicia ni reconfigura ningún servicio existente del host.** Un vhost mal escrito en Apache tumba todos los sitios.
- **Un solo gate pendiente**: reiniciar `server01` (AC12). El de borrar respaldos se canceló.

## Relacionados

- Router: [`INSTRUCTIONS.md`](./INSTRUCTIONS.md) · Memoria: [`MEMORY.md`](./MEMORY.md)
- Pendientes: [`BACKLOG.md`](./BACKLOG.md) · Deuda: [`DEBT.md`](./DEBT.md) · Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md)
