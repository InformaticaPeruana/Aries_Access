# KNOWN-FAILURES — fallos conocidos

Todo fallo **preexistente** que no se arregla ahora, con dueño y condición de cierre. Ver [DEC-0012](./decisions/DEC-0012-fallos-conocidos.md) y [`protocol/06-validation.md`](./protocol/06-validation.md).

**Regla de reconciliación:** el total de fallos del runner debe cuadrar con esta lista.

- Un fallo en el runner que **no** está aquí es un fallo **nuevo** → bloquea el cierre.
- Una entrada de aquí que **ya pasa** es **obsoleta** → se limpia.

Lo comprueba [`tools/check-harness.mjs`](./tools/check-harness.mjs) cruzando esta tabla con `ia/.harness/last-run.json` (lo escribe [`tools/run-tests.mjs`](./tools/run-tests.mjs)).

## Formato

Una fila por fallo. Los campos `Dueño` y `Cierre` son **obligatorios**: sin ellos el check falla.

| Test / caso | Síntoma | Causa conocida | Dueño | Condición de cierre |
|---|---|---|---|---|
| `<test_x>` | <qué falla y cómo se ve> | <causa demostrada o `UNKNOWN`> | <quién> | <qué debe pasar para quitarlo de aquí> |

## Reglas

- **No se declara "ajeno" sin evidencia.** Si no hay causa demostrada, la columna Causa dice `UNKNOWN` y existe una tarea de investigación ([`agents/INVESTIGATOR.md`](./agents/INVESTIGATOR.md)).
- **No se sube un umbral ni se salta un caso** para que un fallo desaparezca de la lista ([`protocol/06-validation.md`](./protocol/06-validation.md)).
- Si el fallo lleva mucho tiempo aquí sin dueño real, no es un fallo conocido: es deuda reconocida → muévelo a [`DEBT.md`](./DEBT.md) o a [`BACKLOG.md`](./BACKLOG.md) con prioridad.

## Fallos conocidos

| Test / caso | Síntoma | Causa conocida | Dueño | Condición de cierre |
|---|---|---|---|---|
| — | — | — | — | — |

## Historial de cierres

- **<YYYY-MM-DD>** — `<test_x>` resuelto en `<FEATURE-ID>`.

## Relacionados

- Runner: [`tools/run-tests.mjs`](./tools/run-tests.mjs) · Validación: [`protocol/06-validation.md`](./protocol/06-validation.md)
- Deuda: [`DEBT.md`](./DEBT.md) · Decisiones: [DEC-0012](./decisions/DEC-0012-fallos-conocidos.md)
