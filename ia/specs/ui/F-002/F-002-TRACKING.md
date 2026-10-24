---
Feature: F-002
Estado: pending
---

# F-002 — TRACKING

Bitácora de ejecución. **Único lugar donde vive el estado de las tareas**, junto al `Status:` de cada `T0n` ([DEC-0003](../../../decisions/DEC-0003-estados-cierre.md), [DEC-0009](../../../decisions/DEC-0009-tareas-ordenes-trabajo.md)).

## Tareas

| Tarea | Objetivo | Depende de | Estado | Evidencia |
|-------|----------|------------|--------|-----------|
| [T01](../../../plans/F-002/T01-branding.md) | Extensión de branding oficial | - | pending | — |
| [T02](../../../plans/F-002/T02-portal.md) | Portada estática con las máquinas | T01 | pending | — |

## Estado por AC

| AC | Requerimiento | Tarea | Estado | Evidencia |
|----|---------------|-------|--------|-----------|
| AC1 | R1 | T01 | pending | — |
| AC2 | R2 | T01 | pending | — |
| AC3 | R3, R5 | T01 | pending | — |
| AC4 | R4 | T01 | pending | — |
| AC5 | R6 | T02 | pending | — |

## Notas de ejecución

- **Nada ejecutado.** La spec está escrita y espera aprobación explícita.
- **F-001 manda:** cualquier cambio de esta feature no puede romper el acceso ya publicado (`remoto.informaticaperuana.com`). La regresión se comprueba con la suite de F-001 antes de dar una tarea por buena.
- **Datos externos pendientes:** los hexadecimales exactos de la marca y el logo (ítem 10 del [`../../../CHECKLIST.md`](../../../CHECKLIST.md)).

## Revisión

- **No requiere revisión adversarial:** `Riesgo: medio` y `Areas: [ui]`, sin tocar autenticación ni datos. Si en T01 se descubre que hay que tocar algo de `guacamole.properties`, se vuelve a evaluar.

## Relacionados

- Spec: [`F-002.spec.md`](./F-002.spec.md) · Plan: [`../../../plans/F-002/PLAN.md`](../../../plans/F-002/PLAN.md)
- Feature base: [`../../infra/F-001/F-001-TRACKING.md`](../../infra/F-001/F-001-TRACKING.md)
