# 14 — Contexto: delegación y punto de retomada

El contexto de una conversación **no se ve desde el repositorio**. No hay archivo que leer para saber cuánto llevas consumido, así que no se puede comprobar como se comprueba el resto.

Pero hay una parte que **sí** es observable: **el punto de retomada**. Si el repositorio dice sin ambigüedad dónde ibas, otra sesión puede continuar aunque la conversación se haya perdido. Eso es lo que este protocolo mecaniza, y el chequeo `punto-de-retomada` lo vigila.

Ver [DEC-0016](../decisions/DEC-0016-contexto-delegacion.md).

---

## 1. Qué nunca entra al contexto

Antes de delegar, evita traer al hilo principal lo que no necesitas:

| No traigas | En su lugar |
|---|---|
| Un archivo entero cuando basta una sección | Lee la sección, o busca primero con `grep`/`glob` |
| Logs o salidas de comandos largas | Redirige a fichero y lee **el final** |
| El diff completo | Los archivos tocados, uno por uno |
| Toda la spec + el plan para trabajar una tarea | `TRACKING` (estado) + el `T0n` activo ([protocol/04](./04-plan.md)) |
| El protocolo entero | La fase que corresponde ([`../INSTRUCTIONS.md`](../INSTRUCTIONS.md)) |
| Reconsiderar lo ya leído en la misma sesión | Notas del `TRACKING`, no una relectura |

Un comando que imprime 5.000 líneas te cuesta más que leer diez archivos pequeños.

---

## 2. Cuándo delegar (disparadores)

Un disparador es una condición **observable**, no una intuición. Si se cumple, delega; el coste de coordinación se paga solo.

| Disparador | Rol | Por qué |
|---|---|---|
| Para responder necesitas leer **más de 5 archivos** y solo vas a devolver un resumen | [`EXPLORER`](../agents/EXPLORER.md) | El mapa es útil; el recorrido no tiene por qué ensuciar tu hilo |
| Algo falla y **la causa no es evidente**, o llevas **dos intentos** de arreglo sin explicación | [`INVESTIGATOR`](../agents/INVESTIGATOR.md) | Una sesión de depuración contamina el contexto más que ninguna otra |
| La feature es `Riesgo: alto` o toca dinero/stock/fiscal/integraciones | [`REVIEWER`](../agents/REVIEWER.md) | Además de dar independencia, el diff no entra a tu contexto |
| El repo ya tiene código y toca **bootstrap** ([protocol/11](./11-bootstrap.md)) | `EXPLORER` | Inventariar un proyecto entero es el caso canónico de delegación |
| Una búsqueda amplia ("dónde se usa X en todo el repo") | `EXPLORER` | El resultado es una lista, no un recorrido |

**Cuándo NO delegar:** cuando la tarea es una edición concreta, una pregunta que contestas con un archivo, o cualquier cosa donde escribir el encargo cuesta más que hacerlo. El coste de un subagente es el encargo, la espera y la verificación de su salida.

Regla que no cambia: el subagente **no toca la memoria central** y su salida es **una afirmación a verificar**, no un hecho ([protocol/12](./12-subagents.md)).

---

## 3. El punto de retomada

Es el "guardar contexto" del harness, hecho con los archivos que ya existen. No hay mecanismo nuevo: hay un **ritual con un disparador**.

**Cuándo:** antes de una tarea larga, antes de compactar, antes de cambiar de tema, y al terminar la jornada.

**Qué se escribe:**

1. **`CHANGELOG.md`** — qué pasó (hechos, no impresiones).
2. **La tarea en curso** — su `Status` en el `T0n` **y** su fila en el `TRACKING`, con la evidencia que ya tengas.
3. **`CURRENT.md`** — el estado de ahora: `Current Task`, `Active Spec`, `Active Plan`, `Next`, `Blockers`.

**Las dos invariantes que lo hacen resumible** (y que el chequeo vigila):

- **Como máximo UNA tarea `in_progress`** en todo el harness. Si hay dos, al volver no sabes dónde estabas. Si necesitas paralelizar, deja una en `partial` o `pending` con una nota, y vuelve a activarla después.
- **Si hay trabajo en curso, `CURRENT.md` apunta a él**: `Active Spec`, `Active Plan` y `Next` con valores reales, no `Ninguna` ni un hueco.

Sin lo primero hay ambigüedad. Sin lo segundo, la ruta existe pero nadie la sigue.

---

## 4. Cómo se vuelve a entrar

La primera lectura de una sesión ya está definida en [`../INSTRUCTIONS.md`](../INSTRUCTIONS.md). Para **retomar** trabajo en curso, después de eso:

1. `CURRENT.md` → `Active Spec` y `Active Plan` (dos rutas, ya las tienes).
2. El `TRACKING` de esa feature → el estado real de cada tarea.
3. **Solo** el `T0n` que está `in_progress` → lo que hay que hacer.
4. La columna `Evidencia` de lo ya hecho → para no repetirlo ni contradecirlo.

Con eso continúas sin releer la spec ni el plan, y sin la conversación anterior.

---

## 5. Qué NO resuelve esto

Honestidad sobre el alcance, porque es fácil confundir el punto de retomada con gestión de contexto completa:

- **No mide tu consumo de contexto.** El harness tiene presupuestos de líneas para los *archivos* ([protocol/10](./10-memory-tokens.md)), no para la *conversación*. Nadie te avisa de que llevas 180 mensajes.
- **No comprime la conversación.** Si tu host sabe compactar, la compactación se apoya en el punto de retomada; si no, te toca a ti.
- **No sustituye el juicio.** Los disparadores de delegación son condiciones, no órdenes: si cumplirlas te cuesta más que hacer el trabajo, no delegues y di por qué.

Lo que sí garantiza: **si el repositorio está al día, la conversación es desechable.** Ese es el objetivo real, y es el único que se puede verificar.

---

## Relacionados

- Subagentes y contratos: [`12-subagents.md`](./12-subagents.md) · Roles: [`../agents/README.md`](../agents/README.md)
- Memoria y tokens: [`10-memory-tokens.md`](./10-memory-tokens.md) · Tareas: [`04-plan.md`](./04-plan.md) · Estados: [`05-tracking.md`](./05-tracking.md)
- Decisión: [DEC-0016](../decisions/DEC-0016-contexto-delegacion.md) · Estado: [`../CURRENT.md`](../CURRENT.md) · Mecanismo: [`../tools/check-harness.mjs`](../tools/check-harness.mjs)
