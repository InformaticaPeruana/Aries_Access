## DEC-0009 — Tareas como órdenes de trabajo en carpetas por feature

Date: 2026-10-21
Status: active

Context:
Un plan largo se deja de leer. Un plan que no cabe en una pantalla deja de ser un índice y se convierte en documentación que nadie consulta en el momento de implementar. Además, trabajar una tarea no debería obligar a releer la spec completa.

Decision:
El PLAN es un **índice de tareas atómicas**, legible en una pantalla, con columnas `ID | Objetivo | Depende de | Requerimientos | Validación`.

Cada tarea es un archivo independiente, una **orden de trabajo**:

```
ia/plans/<FEATURE-ID>/T01-<nombre>.md
```

```
---
Feature: F-001
Task: T01
Status: pending
Depends: -
---
```

Para trabajar una tarea el agente lee el TRACKING (estado) y ese `T0n`. No relee la spec ni el plan completos.

Reason:
Reduce el contexto necesario para implementar (menos tokens, menos ruido) y hace la trazabilidad verificable: cada tarea es un nodo con estado propio. Se descartó el checklist dentro del PLAN: no permite dependencias ni evidencia por tarea.

Consequences:
- Los requerimientos se citan por ID, sin copiar texto.
- El estado se actualiza en el TRACKING y en el `Status:` del `T0n`, y en ningún otro sitio ([DEC-0003](./DEC-0003-estados-cierre.md)).
- La paridad TRACKING↔tareas la comprueba [`../tools/check-harness.mjs`](../tools/check-harness.mjs).

## Relacionados

- Protocolo: [`../protocol/04-plan.md`](../protocol/04-plan.md) · Plantilla: [`../plans/_task_template.md`](../plans/_task_template.md)
- Índice: [`INDEX.md`](./INDEX.md) · Estados: [DEC-0003](./DEC-0003-estados-cierre.md)
