---
Feature: F-001
Estado: in_progress
---

# F-001 — TRACKING

Bitácora de ejecución. **Único lugar donde vive el estado de las tareas**, junto al `Status:` de cada `T0n` ([DEC-0003](../../../decisions/DEC-0003-estados-cierre.md), [DEC-0009](../../../decisions/DEC-0009-tareas-ordenes-trabajo.md)).

`done` exige evidencia de **todos** sus AC. Si falta alguno → `partial`, con lo que falta, quién lo cierra y bajo qué condición. `blocked` es para dependencias externas.

| Tarea | Objetivo | Depende de | Estado | Evidencia |
|-------|----------|------------|--------|-----------|
| [T01](../../../plans/F-001/T01-verificacion-previa.md) | Verificación previa de `server01` (solo lectura) | - | blocked | 2026-10-21: el 22 del host responde pero rechaza `publickey,password` en modo no interactivo, y no hay clave SSH. Dueño: usuario. Desbloqueo: clave pública en `~humberto/.ssh/authorized_keys` de `server01` |
| [T02](../../../plans/F-001/T02-liberar-disco.md) | Liberar disco (gate) | T01 | pending | — |
| [T03](../../../plans/F-001/T03-guacd.md) | `guacd` 1.6.0 como servicio | T02 | pending | — |
| [T04](../../../plans/F-001/T04-postgresql.md) | PostgreSQL, esquema y usuario de base | T02 | pending | — |
| [T05](../../../plans/F-001/T05-tomcat-webapp.md) | Tomcat 9, webapp y extensiones en `127.0.0.1:8081` | T03, T04 | pending | — |
| [T06](../../../plans/F-001/T06-cuentas-totp.md) | Cuentas endurecidas, TOTP y límite de intentos | T05 | pending | — |
| [T07](../../../plans/F-001/T07-nginx-tls.md) | vhost de nginx y TLS público | T06 | pending | — |
| [T08](../../../plans/F-001/T08-conexion-rdp.md) | Conexión RDP a la VM Windows | T07 | pending | — |
| [T09](../../../plans/F-001/T09-smoke-test.md) | Suite smoke, `tests.commands` y reinicio | T07 | pending | — |

## Estado por AC

Un AC, una tarea dueña ([`F-001.spec.md`](./F-001.spec.md) §Criterios de aceptación).

| AC | Requerimiento | Tarea | Estado | Evidencia |
|----|---------------|-------|--------|-----------|
| AC1 | R1 | T05 | pending | — |
| AC2 | R3 | T05 | pending | — |
| AC3 | R5 | T04 | pending | — |
| AC4 | R5 | T05 | pending | — |
| AC5 | R6 | T06 | pending | — |
| AC6 | R4 | T07 | pending | — |
| AC7 | R7 | T08 | pending | — |
| AC8 | R7 | T08 | pending | — |
| AC9 | R2 | T05 | pending | — |
| AC10 | R9 | T09 | pending | — |
| AC11 | R8 | T09 | pending | — |
| AC12 | R1 | T09 | pending | Gate: exige reiniciar `server01` (ver Notas) |
| AC13 | R6 | T06 | pending | — |

## Notas de ejecución

- **Spec aprobada el 2026-10-21.** Nada ejecutado todavía: **T01 está `blocked` por acceso**, no por el plan. El host contesta en el 22 y ofrece `publickey,password`; no hay clave SSH en esta máquina y el agente no escribe contraseñas. Se desbloquea dejando una clave pública en `~humberto/.ssh/authorized_keys`, o ejecutando el bloque de T01 y pegando la salida.
- **Regla de secuencia:** ninguna tarea de instalación (T03 en adelante) arranca antes de que **T02 esté `done`**. El disco está al 99% y un `apt-get install` puede tumbar Supabase o n8n.
- **Regla de secuencia:** el vhost público del 443 (T07) **no se abre** hasta que T06 (contraseña de `guacadmin` cambiada + TOTP + límite de intentos) esté `done`. El orden está invertido a propósito respecto a lo natural.
- **AC12 está condicionado:** exige reiniciar `server01`, que da servicio a Supabase, n8n y Chatwoot. Se ejecuta sólo en una ventana acordada y con confirmación explícita ([`../../../GATES.md`](../../../GATES.md)). Si no hay ventana, AC12 queda en `partial` con dueño y condición.
- **T02 es un gate** (borra respaldos). **T01 decide la viabilidad**: si el 3389 de las VMs no responde desde `server01`, o el 443 no está libre, se para y se vuelve al usuario.

## Revisión

- **Ronda 1 (2026-10-21) — `RECHAZADO`.** Un REVIEWER con contexto fresco encontró 5 bloqueantes: Tomcat 10+ es incompatible con Guacamole 1.6.0 (`javax` frente a `jakarta`), faltaban la extensión JDBC de PostgreSQL y su driver, el plan permitía instalar antes de liberar disco, el 443 se abría antes de endurecer las cuentas, y R6 no tenía criterio de aceptación. Todos resueltos en la spec, el plan y las tareas.
- **Ronda 2 (2026-10-21) — `RECHAZADO`.** Encontró 2 bloqueantes: el **driver JDBC no viaja** en el tarball de la extensión (el plan lo afirmaba) y **AC4 no era demostrable** (`curl -sI` responde 200 aunque falte la extensión). También 3 mayores: parámetros RDP inexistentes (`ignore server certificate`, `enable-clipboard`), el límite de intentos de R6 sin extensión declarada (`guacamole-auth-ban`) y FreeRDP 3 dado por hecho. Todos corregidos.
- **Ronda 3 (2026-10-21) — `APROBADO_CON_OBSERVACIONES`.** Sin bloqueantes heredados. Dejó 2 mayores de seguridad/operación y 12 menores; **todas cerradas en la misma sesión** (ver §Cierre de las observaciones del REVIEW): renumeración de scripts, `X-Forwarded-For` + `RemoteIpValve`, mensaje real del `ban`, `bind-host`, dueño de `/var/lib/guacd`, evidencia de AC10/AC11/AC13.
- **Falta la revisión post-implementación** (obligatoria por `Riesgo: alto`): se lanza sobre `ops/`, `tests/` y la evidencia real de este TRACKING antes de cerrar F-001.
