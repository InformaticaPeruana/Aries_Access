# 04 — PLAN y órdenes de trabajo

Un plan **no es un documento largo**: es un índice de tareas atómicas que se lee en una pantalla.

## Ubicación

```
ia/plans/<FEATURE-ID>/PLAN.md          # índice de tareas (≤ 1 pantalla)
ia/plans/<FEATURE-ID>/T01-<nombre>.md  # una orden de trabajo por tarea
ia/plans/<FEATURE-ID>/T02-<nombre>.md
```

Plantillas: [`_plan_template.md`](../plans/_plan_template.md) y [`_task_template.md`](../plans/_task_template.md).

## PLAN.md

Referencia la SPEC por ruta (no la copia):

```md
# PLAN-<FEATURE-ID>

Spec: `ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>.spec.md`

## Tareas

| ID  | Objetivo | Depende de | Requerimientos | Validación |
|-----|----------|------------|----------------|------------|
| T01 | ...      | -          | R1, R2         | ...        |
| T02 | ...      | T01        | R3             | ...        |

## Riesgos

* ...
```

## Órdenes de trabajo (`T0n`)

Cada tarea es un archivo pequeño (15–50 líneas) con frontmatter:

```yaml
---
Feature: F-001
Task: T01
Status: pending        # pending | in_progress | done | partial | blocked
Depends: -
---
```

Cuerpo: **Objetivo**, **Requerimientos** (IDs), **Archivos previstos**, **Validación** (el comando/consulta/prueba exacta que la cierra), **Notas**.

## Reglas

- **Tarea atómica:** una sola cosa verificable. Se implementa UNA y se valida en el acto antes de pasar a la siguiente.
- **Apuntar, no copiar:** los requerimientos se citan por ID (`R3`, `AC2`), nunca se transcriben.
- **Trazabilidad en el código:** cada archivo tocado se etiqueta en su cabecera con `// <FEATURE-ID> T0n` (comentario según el lenguaje). Esto da trazabilidad código↔spec y permite detectar código huérfano. Lo comprueba [`../tools/check-harness.mjs`](../tools/check-harness.mjs) con un ratchet.
- **Para trabajar una tarea, el agente lee:** el `TRACKING` (estado) + el `T0n` activo. **No relee** la spec completa ni el plan completo.
- **Un dueño por archivo compartido.** Si dos tareas tocan el mismo archivo, se declara el orden en `Depende de`.

## Atajos aceptados dejan rastro

Si en una tarea se acepta una simplificación deliberada (cobertura menor, camino feliz solamente, valor provisional), se registra en [`../DEBT.md`](../DEBT.md) con el **disparador** que la cierra, y se marca la línea de código con:

```
// deuda(<id>): <techo>, cerrar cuando <disparador>
```

Nunca es una decisión del agente: existe solo detrás de una elección explícita del usuario. Ver [DEC-0011](../decisions/DEC-0011-deuda-atajos.md).

## Relacionados

- Estados y cierre: [`05-tracking.md`](./05-tracking.md)
- SPEC: [`03-spec.md`](./03-spec.md) · Deuda: [`../DEBT.md`](../DEBT.md)
