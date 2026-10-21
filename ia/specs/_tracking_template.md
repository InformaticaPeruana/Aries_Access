---
Feature: F-XXX
Estado: pending              # pending | in_progress | completed | blocked
---

# F-XXX — TRACKING

Bitácora de ejecución. **Único lugar donde vive el estado de las tareas**, junto al `Status:` de cada `T0n` ([DEC-0003](../decisions/DEC-0003-estados-cierre.md), [DEC-0009](../decisions/DEC-0009-tareas-ordenes-trabajo.md)).

`done` exige evidencia de **todos** sus AC. Si falta alguno → `partial`, con lo que falta, quién lo cierra y bajo qué condición. `blocked` es para dependencias externas.

| Tarea | Objetivo | Depende de | Estado | Evidencia |
|-------|----------|------------|--------|-----------|
| [T01](../../plans/F-XXX/T01-<nombre>.md) | <...> | - | pending | — |
| [T02](../../plans/F-XXX/T02-<nombre>.md) | <...> | T01 | pending | — |

## Notas de ejecución

<Hallazgos, desviaciones respecto al plan, decisiones tomadas durante la implementación. Breve.>

- —

## Revisión

- Veredicto: <APROBADO | APROBADO_CON_OBSERVACIONES | RECHAZADO | no requerida (riesgo bajo)>
- Archivo: [`F-XXX-REVIEW.md`](./F-XXX-REVIEW.md) o `no aplica`

## Relacionados

- Spec: [`F-XXX.spec.md`](./F-XXX.spec.md) · Plan: [`../../plans/F-XXX/PLAN.md`](../../plans/F-XXX/PLAN.md)
- Protocolo: [`../../protocol/05-tracking.md`](../../protocol/05-tracking.md) · Fallos: [`../../KNOWN-FAILURES.md`](../../KNOWN-FAILURES.md)
