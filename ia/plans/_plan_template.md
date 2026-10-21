# PLAN-<FEATURE-ID>

> Copia este archivo a `ia/plans/<FEATURE-ID>/PLAN.md`.
> **Un índice, no un documento.** Debe leerse completo en una pantalla. El detalle baja a las tareas ([DEC-0009](../decisions/DEC-0009-tareas-ordenes-trabajo.md)).

Spec: `ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>.spec.md`

## Tareas

| ID | Objetivo | Depende de | Requerimientos | Validación |
|----|----------|------------|----------------|------------|
| [T01](./T01-<nombre>.md) | <...> | - | R1, R2 | <comando o prueba que la cierra> |
| [T02](./T02-<nombre>.md) | <...> | T01 | R3 | <...> |

## Riesgos

- <riesgo> → <mitigación o plan B>

## Atajos previstos

<Si de antemano se sabe que habrá que aceptar una simplificación, se declara aquí y su entrada se crea en [`../../DEBT.md`](../../DEBT.md) con disparador. Si no hay, escribe `Ninguno`.>

- —

## Relacionados

- Spec: `ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>.spec.md` · TRACKING: `ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>-TRACKING.md`
- Protocolo: [`../../protocol/04-plan.md`](../../protocol/04-plan.md) · Plantilla de tarea: [`../_task_template.md`](../_task_template.md)
