# Current State

> **≤ 60 líneas. Solo el ahora.** Si este archivo empieza a narrar features completadas, está mal: eso va a [`CHANGELOG.md`](./CHANGELOG.md) y a la spec. Ver [DEC-0004](./decisions/DEC-0004-memoria-diferencial.md).

## Objective

Acceso a las VMs Windows de VMware desde el navegador con Apache Guacamole: un solo punto de entrada, sin agentes en los guests. Fase actual: arranque del proyecto.

## Current Task

Especificar la primera feature (F-001, despliegue nativo del stack Guacamole). Aún no se empezó: faltan datos externos.

## Status

`pending` — harness adoptado y en verde ([DEC-0024](./decisions/DEC-0024-adopcion-aries-access.md)); bloqueado por los ítems de [`CHECKLIST.md`](./CHECKLIST.md).

## Last Completed

Adopción del harness `/ia`, camino A (2026-10-21). Evidencia: `node ia/tools/check-harness.mjs` en verde, gate probado y baseline sellada.

## Next

Cerrar los ítems 1 a 3 de [`CHECKLIST.md`](./CHECKLIST.md) (hipervisor, edición de los Windows, host y red de las VMs) y escribir la spec de F-001.

## Blockers

- **Datos externos sin confirmar:** tipo de hipervisor, edición de los Windows, host Linux y red de las VMs, forma de exposición. Dueño: usuario. Cierre: marcar el ítem en [`CHECKLIST.md`](./CHECKLIST.md).

## Active Spec

Ninguna

## Active Plan

Ninguno

## Entorno

- No hay entorno todavía: sin host aprovisionado y sin código de producto.
- Harness: `node ia/tools/check-harness.mjs --report` · pruebas: `node ia/tools/run-tests.mjs` (sin comandos declarados).

## Al retomar

- La investigación de partida está en [`research/2026-10-21-guacamole-vms-navegador.md`](./research/2026-10-21-guacamole-vms-navegador.md); el despliegue elegido es **nativo, sin Docker** ([DEC-0025](./decisions/DEC-0025-despliegue-nativo-sin-docker.md)).
- No escribir la spec de F-001 sin cerrar antes el CHECKLIST: define RDP frente a VNC y la topología de red.
- `codeRoots` son `src/` y `public/`; todavía no existen, así que la trazabilidad de código se reporta como `SKIP`.

## Relacionados

- Router: [`INSTRUCTIONS.md`](./INSTRUCTIONS.md) · Memoria: [`MEMORY.md`](./MEMORY.md)
- Pendientes: [`BACKLOG.md`](./BACKLOG.md) · Deuda: [`DEBT.md`](./DEBT.md) · Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md)
