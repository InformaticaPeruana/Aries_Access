---
Spec: F-XXX
Modulo: <modulo>
Titulo: <título corto>
Riesgo: bajo                 # alto | medio | bajo
Areas: []                    # dinero, stock, fiscal, integraciones
Estado: pending              # pending | in_progress | completed | blocked
---

# F-XXX — <título>

> Copia este archivo a `ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>.spec.md` y rellénalo.
> El frontmatter es un **contrato**: lo leen Dataview y [`../tools/check-harness.mjs`](../tools/check-harness.mjs).

## Objetivo

<Qué queremos lograr, en 2-3 líneas. El resultado, no la tarea.>

## Contexto

<Por qué se necesita. Qué duele hoy. Qué pasa si no se hace.>

## Comportamiento actual

<Lo que hace el sistema hoy. Si es una capacidad nueva, dilo explícitamente.>

## Comportamiento esperado

<Lo que debe hacer al terminar. Concreto y observable.>

## Requerimientos

- **R1** <...>
- **R2** <...>
- **R3** <...>

## No requerimientos

<Lo que NO se hará en esta feature. Tan importante como lo anterior: evita el crecimiento silencioso de alcance.>

- <...>

## Restricciones

<Restricciones técnicas, normativas, de compatibilidad o de presupuesto.>

- <...>

## Criterios de aceptación

Cada AC debe poder comprobarse con un comando, una consulta o una pantalla real ([DEC-0014](../decisions/DEC-0014-evidencia-camino-usuario.md)).

- **AC1** Dado <contexto>, cuando <acción>, entonces <resultado observable>.
- **AC2** <...>
- **AC3** <...>

## Áreas afectadas

<Archivos, módulos o capas que se prevé tocar. Estimación, no compromiso.>

- <...>

## Validación

<Cómo se demostrará que funciona: comandos, consultas, camino de usuario.>

- <...>

## Cambios

<Si la spec cambia después de aprobada, se registra aquí: qué cambió, por qué y en qué fecha.>

- —

## Relacionados

- Plan: [`../../plans/F-XXX/PLAN.md`](../../plans/F-XXX/PLAN.md) · TRACKING: [`F-XXX-TRACKING.md`](./F-XXX-TRACKING.md)
- Protocolo: [`../../protocol/03-spec.md`](../../protocol/03-spec.md) · Índice: [`../README.md`](../README.md)
