## DEC-0001 — Metodología: 1 feature = 1 SPEC + 1 PLAN + 1 TRACKING

Date: 2026-10-21
Status: active

Context:
Un mismo agente (o varios) con sesiones cortas y contexto compactado necesita poder retomar cualquier trabajo sin releer conversaciones ni explorar todo el repositorio. Sin un contrato escrito antes de codificar, el alcance crece en silencio y la validación se convierte en una afirmación.

Decision:
Toda feature funcional tiene exactamente tres documentos, en carpetas por feature:

- `ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>.spec.md` — qué y por qué.
- `ia/plans/<FEATURE-ID>/PLAN.md` + tareas `T0n-*.md` — cómo.
- `ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>-TRACKING.md` — estado y evidencia.

Ningún cambio funcional se implementa sin esos tres.

Reason:
Separa contrato (spec), ejecución (plan/tareas) y verdad de avance (tracking). Permite que otra sesión retome leyendo el estado y **una** tarea, sin releer todo. Se descartó el formato de un único documento por feature: mezcla contrato con bitácora y se degrada en cuanto la feature crece.

Consequences:
- Obligatorio: numerar requerimientos y criterios (`R1`, `AC1`) y referenciarlos por ID en las tareas, sin copiar texto.
- Obligatorio: `Non-Requirements` en la spec.
- Coste: tres archivos por feature. Se acepta a cambio de retomabilidad.

## Relacionados

- Protocolo: [`../protocol/03-spec.md`](../protocol/03-spec.md) · [`../protocol/04-plan.md`](../protocol/04-plan.md) · [`../protocol/05-tracking.md`](../protocol/05-tracking.md)
- Índice: [`INDEX.md`](./INDEX.md) · Plantillas: [`../specs/_template.md`](../specs/_template.md)
