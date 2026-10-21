## DEC-0016 — Contexto: disparadores de delegación y punto de retomada verificado

Date: 2026-10-21
Status: active

Context:
El harness controla el crecimiento del contexto con presupuestos de archivos, un router por fases y tareas que se leen de a una. Pero no tenía **ciclo de vida del contexto**: si la conversación se llena, no existe ritual ni disparador para retomar. La regla de subagentes decía "solo cuando aporten valor claro", que es un principio y no una condición aplicable. Y nada de eso estaba comprobado: cero chequeos.

El problema tiene una parte irresoluble y una parte resoluble. Irresoluble: el consumo de contexto de una conversación **no es observable desde el repositorio**, así que no se puede comprobar como el resto. Resoluble: **el punto de retomada sí es observable**. Si el repositorio dice sin ambigüedad dónde ibas, la conversación es desechable.

Decision:
Se añade [`protocol/14-context.md`](../protocol/14-context.md) con tres piezas:

1. **Qué nunca entra al contexto** (tabla): archivos enteros, logs largos, el diff completo, el protocolo completo.
2. **Disparadores de delegación observables**: más de 5 archivos para devolver un resumen → `EXPLORER`; causa no evidente o dos intentos fallidos → `INVESTIGATOR`; feature de riesgo alto o diff amplio → `REVIEWER`; bootstrap → `EXPLORER`.
3. **Punto de retomada**: antes de una tarea larga o de compactar, se actualizan `CHANGELOG.md`, la tarea en curso y `CURRENT.md`.

Y dos invariantes comprobables, en el chequeo `punto-de-retomada`:

- **Como máximo UNA tarea `in_progress`** en todo el harness. Si hay dos, al volver no se sabe dónde se estaba.
- **Si hay trabajo en curso, `CURRENT.md` apunta a él**: `Active Spec`, `Active Plan` y `Next` con valores reales.

Para paralelizar, la tarea que se deja va a `partial` o `pending` con una nota, y se reactiva después.

Reason:
De los diez huecos detectados al comparar con el harness anterior, este era **el único que quedaba como disciplina sin mecanismo**, que es justo la crítica que originó todo el trabajo. Se descartaron dos alternativas:

- Dejarlo documentado como deuda con disparador: es barato, pero el ítem que más se olvida es precisamente el que depende de que alguien recuerde guardar el contexto.
- Inventar un mecanismo de medición del contexto: no es observable desde el repositorio, así que cualquier métrica sería inventada. Se prefiere una invariante real y estrecha a una métrica falsa y amplia.

## Consequences

- La metodología pasa a ser estrictamente secuencial en la práctica: una tarea activa a la vez. Es coherente con [`04-plan.md`](../protocol/04-plan.md) ("se implementa UNA y se valida en el acto") y con la regla de un dueño por archivo compartido.
- El chequeo sube el total a 16. Un commit con dos tareas activas queda bloqueado.
- Las tareas de delegación dejan de ser una opinión: tienen condición. Y si cumplirla cuesta más que hacer el trabajo, el protocolo manda decir por qué no se delegó.
- Sigue sin medirse el consumo de la conversación. El protocolo lo declara explícitamente en su §5 para que nadie confunda el punto de retomada con gestión de contexto completa.

## Relacionados

- Protocolo: [`../protocol/14-context.md`](../protocol/14-context.md) · Subagentes: [`../protocol/12-subagents.md`](../protocol/12-subagents.md) · Roles: [`../agents/README.md`](../agents/README.md)
- Memoria y tokens: [DEC-0004](./DEC-0004-memoria-diferencial.md) · Estados: [DEC-0003](./DEC-0003-estados-cierre.md) · Índice: [`INDEX.md`](./INDEX.md)
