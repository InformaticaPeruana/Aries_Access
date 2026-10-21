## DEC-0012 — Fallos conocidos con dueño y condición de cierre

Date: 2026-10-21
Status: active

Context:
Los fallos preexistentes aparecían en prosa, dispersos en notas de estado: "fallo ajeno preexistente en tal test", "regresión de tal otro". Sin una lista única y sin runner, un fallo nuevo es indistinguible de uno viejo, y "todos los tests pasan" no significa nada.

Decision:
Dos piezas.

1. **Runner como fuente de verdad:** [`../tools/run-tests.mjs`](../tools/run-tests.mjs) ejecuta las suites declaradas y escribe `ia/.harness/last-run.json` con el resultado real.
2. **Lista única:** [`../KNOWN-FAILURES.md`](../KNOWN-FAILURES.md), una fila por fallo, con `Síntoma`, `Causa conocida`, **`Dueño`** y **`Condición de cierre`** obligatorios.

Regla de reconciliación: el total de fallos del runner debe cuadrar con la lista. Un fallo no listado es **nuevo** y bloquea el cierre. Una entrada que ya pasa es **obsoleta** y se limpia.

## Reason

Convierte "TODO OK" de una afirmación a un dato. Se descartó tolerar fallos "conocidos" sin dueño: un fallo sin dueño real no es conocido, es ignorado, y debe subir a [`../DEBT.md`](../DEBT.md) o a [`../BACKLOG.md`](../BACKLOG.md) con prioridad.

## Consequences

- Nunca se baja un umbral, se salta un caso ni se reetiqueta un fallo para que desaparezca de la lista ([`../protocol/06-validation.md`](../protocol/06-validation.md)).
- Si la causa no está demostrada, la columna dice `UNKNOWN` y existe tarea de investigación.
- El cruce lista↔runner lo comprueba [`../tools/check-harness.mjs`](../tools/check-harness.mjs).

## Relacionados

- Protocolo: [`../protocol/06-validation.md`](../protocol/06-validation.md) · Runner: [`../tools/run-tests.mjs`](../tools/run-tests.mjs)
- Índice: [`INDEX.md`](./INDEX.md) · Diseño (G5): [`../DESIGN.md`](../DESIGN.md)
