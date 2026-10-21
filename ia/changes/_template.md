# CHANGE-XXX

Registro para cambios importantes. Para modificaciones triviales usa solo `CHANGELOG.md` (ver [`../protocol/13-close-git.md`](../protocol/13-close-git.md)).

> Copia este archivo a `ia/changes/CHANGE-XXX.md`. Un CHANGE agrupa lo que una feature cambió **de verdad** en el sistema, más allá de la bitácora por tarea.

Spec: `ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>.spec.md`
Plan: `ia/plans/<FEATURE-ID>/PLAN.md`
Feature: <FEATURE-ID>

## Implementado

- <cambio observable, no "se tocó el archivo X">

## Archivos modificados

- `<ruta>`

## Migraciones / cambios de esquema

<Si hubo, con su id. Si no, `Ninguna`. Si alguna es irreversible, debe existir su entrada en [`../GATES.md`](../GATES.md).>

- —

## Gates ejecutados

<Operaciones de una sola dirección: enlace a su entrada en [`../GATES.md`](../GATES.md) con quién confirmó. Si no hubo, `Ninguno`.>

- —

## Validación

- PASS — `<comando o prueba>` → <resultado>
- NOT_AVAILABLE — `<AC>` → <por qué y quién lo cierra>

## Fallos conocidos nuevos

<Si esta feature dejó un fallo no resuelto, su entrada en [`../KNOWN-FAILURES.md`](../KNOWN-FAILURES.md).>

- Ninguno

## Deuda aceptada

<Entradas nuevas en [`../DEBT.md`](../DEBT.md) con su disparador.>

- Ninguna

## Resultado

completed | partial | blocked — <una línea>

## Relacionados

- Estado: [`../CURRENT.md`](../CURRENT.md) · Historial: [`../CHANGELOG.md`](../CHANGELOG.md)
- Protocolo: [`../protocol/13-close-git.md`](../protocol/13-close-git.md) · Gates: [`../GATES.md`](../GATES.md)
