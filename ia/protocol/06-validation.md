# 06 — Validación y evidencia

**Ninguna tarea se considera `done` sin validación.** Y ninguna afirmación se publica sin haberse verificado.

## Cómo validar

Según lo que corresponda: build · compilación · tests · lint · typecheck · pruebas unitarias · pruebas de integración · consulta SQL · inspección estructural · prueba de camino de usuario ([`09-qa.md`](./09-qa.md)).

Registra uno de estos tres valores, siempre:

```
PASS | FAIL | NOT_AVAILABLE
```

`NOT_AVAILABLE` es honesto y aceptable; "debería funcionar" no lo es.

## La columna `Evidencia`

Cada fila del TRACKING lleva el comando exacto y su resultado, no una descripción. Ejemplos válidos:

- `php test_f001.php → TODO OK, 11 PASS`
- `SELECT count(*) FROM movimientos WHERE tipo='X' → 0`
- `GET /api/recurso → 200 + payload esperado (ver ia/.harness/…/respuesta.json)`
- `npm run build → OK`
- `check-harness → PASS (todos los chequeos)`

## Fuente de verdad de las pruebas

El runner es la fuente de verdad, no la prosa:

```bash
node ia/tools/run-tests.mjs
```

Escribe `ia/.harness/last-run.json` con el resultado real de cada suite. La regla de reconciliación ([DEC-0012](../decisions/DEC-0012-fallos-conocidos.md)):

> El total de fallos del runner debe cuadrar con la lista de [`../KNOWN-FAILURES.md`](../KNOWN-FAILURES.md). Un fallo no listado es un fallo **nuevo** y bloquea el cierre. Una entrada listada que ya pasa es **obsoleta** y debe limpiarse.

Nunca se baja un umbral, se salta un caso ni se reetiqueta un fallo para fabricar un pase.

## Fallos conocidos

Un fallo preexistente no se esconde ni se declara "ajeno" sin evidencia. Se registra en [`../KNOWN-FAILURES.md`](../KNOWN-FAILURES.md) con **dueño** y **condición de cierre**. Mientras esté ahí, no cuenta como regresión; pero se cuenta.

## Si algo falla

```
FAIL → identificar la causa → actualizar el plan si hace falta → corrección mínima → validar de nuevo → registrar
```

Si tras varios intentos la causa no es clara: **detén la modificación**, registra `BLOCKED` con evidencia suficiente, y pasa a [`../agents/INVESTIGATOR.md`](../agents/INVESTIGATOR.md) (causa raíz antes que solución).

## Relacionados

- Camino de usuario: [`09-qa.md`](./09-qa.md)
- Fallos conocidos: [`../KNOWN-FAILURES.md`](../KNOWN-FAILURES.md)
- Revisión adversarial: [`07-review.md`](./07-review.md)
