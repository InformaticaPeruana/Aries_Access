## DEC-0003 — Vocabulario único de estados y regla de cierre (incl. `partial`)

Date: 2026-10-21
Status: active

Context:
Sin un vocabulario cerrado, cada sesión inventa estados ("casi listo", "pendiente de verificar") y el estado de una feature deja de ser comparable entre sesiones. Peor: los criterios de aceptación se marcan con checkboxes que aparentan estar pendientes cuando en realidad ya tienen evidencia, o al revés.

Decision:
Dos vocabularios y nada más.

- Feature: `pending | in_progress | completed | blocked`
- Tarea: `pending | in_progress | done | partial | blocked`

Regla de cierre:

- `done` exige evidencia de **todos** sus AC en la columna `Evidencia`.
- Si falta alguno → `partial`, con nota de qué falta, quién lo cierra y bajo qué condición.
- `blocked` se reserva para dependencias externas, con causa y condición de desbloqueo.
- Los AC **no** se marcan con checkboxes: la evidencia vive en la columna.

Reason:
`partial` es un diferimiento declarado, no un fracaso; sin él se fuerza un `done` falso o un `blocked` inflado. Los checkboxes se descartaron porque aparentan un estado que no es el real y generan dos fuentes de verdad.

Consequences:
- El vocabulario es comprobable por [`../tools/check-harness.mjs`](../tools/check-harness.mjs): un estado fuera de la lista es un fallo.
- `partial` debe poder contarse: el reporte lo lista.

## Relacionados

- Protocolo: [`../protocol/05-tracking.md`](../protocol/05-tracking.md) · Validación: [`../protocol/06-validation.md`](../protocol/06-validation.md)
- Índice: [`INDEX.md`](./INDEX.md) · Plantilla: [`../specs/_tracking_template.md`](../specs/_tracking_template.md)
