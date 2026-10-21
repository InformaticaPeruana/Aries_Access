## DEC-0020 — La comprobación que respalda el gate también se verifica

Date: 2026-10-21
Status: active

Context:
[`protocol/08-gates.md`](../protocol/08-gates.md) exige, para una operación de una sola dirección: anunciarla, decir qué se pierde, esperar confirmación explícita y registrarla. Cumplido al pie de la letra, el procedimiento es correcto... y aun así puede fallar, porque **no exige en ningún punto que la comprobación que lo respalda sea válida**.

Ocurrió el 2026-10-14, borrando un respaldo. Se presentó como prueba de que era redundante una comparación de listas de archivos que tenía un bug: comparaba rutas de Windows (`\`) contra rutas de git (`/`). Devolvió `diferencias: 138` entre dos listas de **89** elementos.

Ese número era imposible, y llevaba la firma del bug encima: `138 = 2 × 69`, exactamente el doble de los archivos que están en subcarpetas. La comprobación corría, producía un número y **no verificaba nada**. Se ejecutó el borrado en el mismo paso, así que dejó de ser repetible. No se perdió nada —el commit estaba en el remoto— pero la operación se autorizó apoyada en un instrumento roto.

Es el mismo fallo que `check-harness` tenía en `fallos-conocidos`, encontrado el mismo día por [`qa/selftest-harness.mjs`](../qa/selftest-harness.mjs): un chequeo que corre, informa `0 FAIL` y no verifica nada. Allí lo cazó el mecanismo. Aquí lo cazó notar que el número era absurdo.

Decision:
Se refina [DEC-0007](./DEC-0007-gates-una-direccion.md) con tres reglas para la comprobación que respalda un gate:

1. **Separación.** La comprobación de seguridad y la acción destructiva no se ejecutan en el mismo paso. Primero se corre y se lee; después, en un paso aparte, se ejecuta la operación.
2. **Recuperabilidad antes que unicidad.** Se prefiere probar *"puedo restaurarlo"* a probar *"no hay nada único"*. La recuperabilidad tiene un test simple y binario (`git merge-base --is-ancestor`, el respaldo que abrí, el rollback que existe); la unicidad depende de una comparación que se puede escribir mal.
3. **Un número no es evidencia hasta que sabes por qué ese número.** Si el resultado de la comprobación no es posible, el instrumento está roto.

Y se vuelve ejecutable: `GATES.md` sustituye el campo *"Reversible alternativo evaluado"* por **"Recuperabilidad comprobada"**, obligatorio, con el comando y su resultado. El chequeo `gates` falla si falta o si trae un placeholder, y `selftest-harness` tiene su caso.

Reason:
Se descartó confiar en que la comprobación es correcta porque el procedimiento se cumplió: es exactamente el supuesto que falló, con el ritual completo. Se descartó también exigir un respaldo físico antes de cada operación destructiva: duplicar 967 MB para borrar 967 MB no aporta nada, y git ya daba la garantía — el problema no era la falta de respaldo, era que la prueba estaba mal escrita.

Y se descartó, deliberadamente, exigir una comprobación *distinta* para cada tipo de operación: las tres reglas son generales y caben en un campo del ledger.

## Consequences

- La regla se vuelve comprobable: un gate sin prueba de recuperabilidad **bloquea el commit**, con un caso en `selftest-harness` que verifica que se detecta.
- Los gates pasan a tener una obligación antes, no después: separar la comprobación de la ejecución. Es más lento y es el punto.
- Las entradas anteriores de `GATES.md` **no se reescriben**: la bitácora es historia, y el campo se documenta como obligatorio desde esta fecha.
- Queda un límite honesto: el harness puede exigir *que exista* una prueba de recuperabilidad y *que no sea un placeholder*. No puede juzgar si el comando elegido demuestra lo que dice. Eso sigue siendo criterio humano, y por eso el campo pide el comando **y su resultado**.

## Relacionados

- Protocolo: [`../protocol/08-gates.md`](../protocol/08-gates.md) · Bitácora: [`../GATES.md`](../GATES.md)
- Refina: [DEC-0007](./DEC-0007-gates-una-direccion.md) · Mismo fallo, otra cara: [DEC-0019](./DEC-0019-probar-el-checker.md) · Índice: [`INDEX.md`](./INDEX.md)
