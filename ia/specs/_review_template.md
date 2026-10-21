---
Feature: F-XXX
Veredicto: APROBADO_CON_OBSERVACIONES    # APROBADO | APROBADO_CON_OBSERVACIONES | RECHAZADO
Revisor: <modelo o agente>
Fecha: <YYYY-MM-DD>
---

# F-XXX — REVIEW

Revisión adversarial ([DEC-0006](../decisions/DEC-0006-revision-adversarial.md) · [`../../protocol/07-review.md`](../../protocol/07-review.md)).

> Obligatoria cuando `Riesgo: alto` o `Areas` toca `dinero`, `stock`, `fiscal` o `integraciones`.
> La ejecuta un revisor con **contexto fresco**: spec + AC + diff. No recibe el razonamiento del implementador.

## Alcance revisado

- **Diff:** `<rango de commits o rutas>`
- **Requisitos verificados:** R1, R2 … · **AC verificados:** AC1, AC2 …

## Qué se buscó

- Bugs que pasan el build pero rompen en producción.
- Casos borde sin cubrir (vacío, límite, concurrente, fallo de red).
- Desviaciones spec ↔ código.
- Efectos colaterales en otras features.
- ACs que la evidencia **no** demuestra.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Acción |
|---|-----------|----------|-----------|--------|
| 1 | bloqueante | <...> | `<comando / archivo:línea>` | <tarea nueva o DEUDA-XXX> |
| 2 | menor | <...> | <...> | <...> |

Severidad: `bloqueante` (no cierra la feature) · `mayor` · `menor` · `observación`.

## AC sin evidencia suficiente

<Si un AC no queda demostrado por la evidencia del TRACKING, dilo aquí. Un AC sin evidencia no está cumplido, por bien que esté el código.>

- —

## Veredicto

<APROBADO | APROBADO_CON_OBSERVACIONES | RECHAZADO> — <por qué, en 2-3 líneas.>

Condiciones para cerrar (si aplica):

1. <...>

## Relacionados

- Spec: [`F-XXX.spec.md`](./F-XXX.spec.md) · TRACKING: [`F-XXX-TRACKING.md`](./F-XXX-TRACKING.md)
- Contrato: [`../../agents/REVIEWER.md`](../../agents/REVIEWER.md) · Deuda: [`../../DEBT.md`](../../DEBT.md)
