# 03 — SPEC

Toda funcionalidad nueva o modificación funcional tiene una spec. Fuente de verdad: `ia/specs/` (ver [DEC-0001](../decisions/DEC-0001-metodologia-3-documentos.md)).

## Ubicación y nombre

```
ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>.spec.md
ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>-TRACKING.md
```

`<FEATURE-ID>` = `F-001`, `B-012`, `BO-003`… Un prefijo por módulo, consecutivo, sin reinventarlo.

Usa la plantilla [`_template.md`](../specs/_template.md). No copies la plantilla a mano: cópiala del archivo.

## Reglas de escritura

- **Concisión.** Una spec es un contrato, no un ensayo. Si necesita más detalle, ese detalle va a las tareas (`T0n`).
- **Requerimientos y criterios numerados** (`R1`, `AC1`). Las tareas referencian por ID, **sin copiar texto** (regla "apuntar, no copiar").
- **`Non-Requirements` es obligatorio.** Lo que NO se hará es tan importante como lo que sí: evita el crecimiento de alcance silencioso.
- **Requisitos verificables.** Si un `AC` no se puede comprobar con un comando, una consulta o una pantalla real, reescríbelo.
- **Declara el riesgo** en el frontmatter (`Riesgo: alto|medio|bajo`, `Areas: [dinero, stock, fiscal, integraciones]`). Esto activa la revisión adversarial y el gate de operaciones ([`07-review.md`](./07-review.md), [`08-gates.md`](./08-gates.md)).
- **No inventes comportamiento.** Si falta información de una fuente externa (cliente, proveedor, operador), regístralo en [`../CHECKLIST.md`](../CHECKLIST.md) con dueño y condición de cierre, y marca la spec como bloqueada por ese dato.

## Aprobación

Una spec se considera **aprobada** cuando el usuario la acepta explícitamente o la usa como base del trabajo sin objetar. Si la spec cambia después de aprobada, se registra la desviación **en la propia spec** (sección `Cambios`) y, si afecta a la arquitectura o el alcance, se crea una decisión.

## Diferencias aceptadas

Cuando el código diverge de la spec de forma deliberada, no se "arregla" la memoria: se declara en la spec como **desviación aceptada** y se añade al índice en [`../specs/README.md`](../specs/README.md), con el enlace a la decisión que lo justifica. Así no se pierde y no se cuenta dos veces como deuda.

## Relacionados

- Índice de specs: [`../specs/README.md`](../specs/README.md)
- Plan y tareas: [`04-plan.md`](./04-plan.md)
- Revisión por riesgo: [`07-review.md`](./07-review.md)
