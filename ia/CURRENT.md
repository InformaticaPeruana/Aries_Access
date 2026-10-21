# Current State

> **≤ 60 líneas. Solo el ahora.** Si este archivo empieza a narrar features completadas, está mal: eso va a [`CHANGELOG.md`](./CHANGELOG.md) y a la spec. Ver [DEC-0004](./decisions/DEC-0004-memoria-diferencial.md).

## Objective

Acceso a las VMs Windows de VMware desde el navegador con Apache Guacamole: un solo punto de entrada, sin agentes en los guests. Fase actual: F-001 en ejecución.

## Current Task

F-001 · **T03** — `guacd` 1.6.0 como servicio. Bloqueada por `sudo` con contraseña.

## Status

`in_progress` — T01 `done` (host medido), T02 `done` por *no aplica* (46 GB libres). T03–T09 pendientes.

## Last Completed

T01 (2026-10-21): Ubuntu 24.04.4, **46 GB libres**, **Apache 2.4.58** en el 80 (no nginx), `443`/`8081`/`5434`/`4822` libres, sin PostgreSQL/Tomcat/Java/guacd. VM destino: **`DESKTOP-8T09V6F`** (Windows 10 Pro, `192.168.18.41`) con RDP+NLA y **3389 alcanzable desde `server01`**.

## Next

1. Entrada **NOPASSWD** acotada en `/etc/sudoers.d/aries-access` (la crea el usuario).
2. T03: compilar `guacd` 1.6.0 con RDP, unidad propia, `bind-host=127.0.0.1`.
3. T04: clúster PostgreSQL en el **5434** + esquema.

## Blockers

- **`sudo` pide contraseña** en `server01`: sin NOPASSWD, T03–T08 no se pueden ejecutar. Dueño: usuario.
- **Dominio, DNS y certificado** (ítem 8 de [`CHECKLIST.md`](./CHECKLIST.md)): bloquean T07, no lo anterior.
- **Credenciales del guest** (`usuario` de Windows): se necesitan en T08 y se cargan en Guacamole, no en el repo.

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
