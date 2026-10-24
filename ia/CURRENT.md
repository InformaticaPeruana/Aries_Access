# Current State

> **≤ 60 líneas. Solo el ahora.** Si este archivo empieza a narrar features completadas, está mal: eso va a [`CHANGELOG.md`](./CHANGELOG.md) y a la spec. Ver [DEC-0004](./decisions/DEC-0004-memoria-diferencial.md).

## Objective

Acceso a las VMs Windows de VMware desde el navegador con Apache Guacamole: un solo punto de entrada, sin agentes en los guests. Fase actual: F-001 en ejecución.

## Current Task

F-001 · **T08** — conexión RDP a `192.168.18.41`. **Bloqueada**: faltan las credenciales de Windows.

## Status

`in_progress` — T01–T07 `done`; T09 `partial` (falta AC12, el reinicio). **T08 pendiente**: faltan las credenciales de Windows.

## Last Completed

**T06 y T07 cerradas**: Guacamole publicado en `https://remoto.informaticaperuana.com/desktop/` (con `/guacamole/` → 301) y Let's Encrypt, TOTP enrolado y exigido, contraseña de `humberto` rotada a una dictable, y la app PHP del host dejó de estar expuesta (`/maestro/` → 404).

## Next

1. **T08:** crear la conexión RDP a `192.168.18.41` y probarla en el navegador. Necesita el **usuario y la contraseña de Windows**.
2. **AC12:** reiniciar `server01` en una ventana acordada (gate: tumba Supabase, n8n y Chatwoot) y comprobar que todo vuelve solo.
3. **Revisión post-implementación** sobre `ops/` y la evidencia del TRACKING antes de cerrar F-001 (obligatoria por riesgo alto).

## Blockers

- **Credenciales del guest** (`usuario` de Windows en `192.168.18.41`): bloquean T08. Se cargan en Guacamole, no en el repo.
- **Ventana para reiniciar `server01`**: bloquea AC12.
- **Reserva de DHCP de `server01`** (ítem 7 del CHECKLIST): no bloquea, pero el vhost y el certificado interno se romperían con un cambio de IP.

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
