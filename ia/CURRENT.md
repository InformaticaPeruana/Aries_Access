# Current State

> **≤ 60 líneas. Solo el ahora.** Si este archivo empieza a narrar features completadas, está mal: eso va a [`CHANGELOG.md`](./CHANGELOG.md) y a la spec. Ver [DEC-0004](./decisions/DEC-0004-memoria-diferencial.md).

## Objective

Acceso a las VMs Windows de VMware desde el navegador con Apache Guacamole: un solo punto de entrada, sin agentes en los guests. Fase actual: F-001 especificada, esperando aprobación para ejecutar.

## Current Task

F-001 · T01 — verificación previa de `server01`, **solo lectura**. Nada ejecutado todavía.

## Status

`pending` — la spec de F-001 está escrita y **espera aprobación explícita**; todavía no se tocó `server01`.

## Last Completed

Spec, plan y órdenes de trabajo (T01–T09) de F-001, con [DEC-0026](./decisions/DEC-0026-arquitectura-despliegue-server01.md) y la revisión adversarial de la spec (2026-10-21).

## Next

Aprobar la spec y ejecutar T01: puertos libres, disco y RAM reales, estado de nginx y **alcance RDP a las VMs del ESXi** desde `server01`.

## Blockers

- **Aprobación de la spec de F-001:** dueño el usuario. Sin ella no se ejecuta nada en el host.
- **Acceso SSH a `server01`:** las tareas se ejecutan por SSH; el repo no guarda credenciales.
- **Datos por cerrar:** ítem 6 de [`CHECKLIST.md`](./CHECKLIST.md) — cuántas VMs y cuántas personas entran a la vez.

## Active Spec

[`specs/infra/F-001/F-001.spec.md`](./specs/infra/F-001/F-001.spec.md) — F-001, riesgo alto, `pending`

## Active Plan

[`plans/F-001/PLAN.md`](./plans/F-001/PLAN.md) — T01–T09

## Entorno

- Host: `server01` (`192.168.18.70`), compartido con Supabase, n8n, Chatwoot y Evolution API. Nada de Guacamole instalado aún.
- Harness: `node ia/tools/check-harness.mjs --report` · pruebas: `node ia/tools/run-tests.mjs` (sin comandos declarados: los añade T09).

## Al retomar

- El despliegue es **nativo** y va en `server01` ([DEC-0025](./decisions/DEC-0025-despliegue-nativo-sin-docker.md), [DEC-0026](./decisions/DEC-0026-arquitectura-despliegue-server01.md)): TLS por el nginx del host, webapp en `127.0.0.1:8081`, base en `127.0.0.1:5434`.
- **No se para, reinicia ni reconfigura ningún servicio existente del host.** Un vhost mal escrito en nginx tumba todos los sitios.
- **Dos gates pendientes**: borrar respaldos para liberar disco (T02) y reiniciar el host (AC12). Ninguno se ejecuta sin confirmación explícita.
- `codeRoots` pasa a incluir `ops/` y `tests/`.

## Relacionados

- Router: [`INSTRUCTIONS.md`](./INSTRUCTIONS.md) · Memoria: [`MEMORY.md`](./MEMORY.md)
- Pendientes: [`BACKLOG.md`](./BACKLOG.md) · Deuda: [`DEBT.md`](./DEBT.md) · Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md)
