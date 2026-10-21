## DEC-0023 — Un campo nuevo obligatorio aplica desde su fecha, no hacia atrás

Date: 2026-10-21
Status: active

Context:
[DEC-0020](./DEC-0020-comprobacion-del-gate.md) hizo obligatorio el campo *"Recuperabilidad comprobada"* en `GATES.md`. El chequeo lo exigía a **todas** las entradas.

Consecuencia inmediata, y es un defecto de diseño: una copia que se actualizara habría quedado **en rojo por entradas escritas antes de que la regla existiera**. Nadie puede cumplir una condición que aún no se había inventado. Y la tentación, ante un rojo que no puedes arreglar sin reescribir tu propia historia, es silenciar el chequeo.

Además el propio `ia-harness/BACKLOG.md` lo tenía anotado como consecuencia de otra decisión: la petición era explícita —*que las actualizaciones también adopten las condiciones*— y un campo nuevo que rompe el pasado no se adopta: se desactiva.

Decision:
**Un campo nuevo obligatorio aplica desde la fecha en que se introdujo, no hacia atrás.** En el código es una constante con nombre y fecha:

```js
const FECHA_MINIMA_RECUPERABILIDAD = '2026-10-14';
```

Las entradas anteriores no se reescriben y quedan exentas. Y esto se generaliza como patrón: **cualquier requisito que se añada a un documento con historial declara su fecha de vigencia.**

Se comprueba **en los dos sentidos**, no solo uno:

- Un caso de prueba con una entrada **posterior** a la fecha y sin el campo → debe fallar (detección).
- Un caso de prueba con una entrada **anterior** y sin el campo → debe pasar (que la regla no se aplique hacia atrás).

Reason:
Se descartó exigir el campo a todas las entradas: convierte cualquier actualización en un rojo inevitable y empuja a desactivar el chequeo, que es la peor consecuencia posible.
Se descartó también la alternativa de reescribir las entradas viejas "para que cumplan": falsificaría la historia de la bitácora, que es precisamente su valor.

## Consequences

- **La actualización de una copia tiene ahora un criterio explícito:** está terminada cuando `check-harness` sale **en verde en el repositorio de ese proyecto**. Los chequeos nuevos señalan exactamente lo que hay que adoptar en los artefactos propios —nombres, enlaces, campos— y nada más. Eso es lo que hace que una actualización adopte las condiciones en vez de solo copiar archivos.
- El caso de la regla de gracia destapó que **mi propio caso de violación había quedado obsoleto**: usaba una fecha de enero, así que al introducir la exención dejó de fallar. El test lo cazó. Un requisito con fecha caduca a los tests que no la miran.
- Cada requisito con fecha añade una constante que mantener. Se acepta: una constante con nombre y fecha es más honesta que un requisito que rompe el pasado.
- Los redactores de `UPDATE.md` deben declarar, en cada versión, **qué revisar en los artefactos del proyecto**; la lista de migración es donde se lee.

## Relacionados

- Refina: [DEC-0020](./DEC-0020-comprobacion-del-gate.md) · Registro: [`../GATES.md`](../GATES.md) · Actualización: [`../UPDATE.md`](../UPDATE.md)
- Prueba: [`../qa/selftest-harness.mjs`](../qa/selftest-harness.mjs) · Índice: [`INDEX.md`](./INDEX.md)
