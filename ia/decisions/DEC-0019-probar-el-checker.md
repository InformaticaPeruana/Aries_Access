## DEC-0019 — El checker también se prueba

Date: 2026-10-21
Status: active

Context:
`tools/check-harness.mjs` es el mecanismo del que dependen todos los invariantes del harness: el gate de commit, el de CI, la paridad de índices, los estados, los ledgers. Si un chequeo deja de detectar lo suyo, **nada se rompe visiblemente**: los commits siguen pasando y el harness parece sano mientras se degrada.

Hasta ahora esos 17 chequeos se habían verificado escribiendo pruebas negativas a mano —inyectar una falla en una copia temporal y comprobar que reaccionaba—. Fueron siete veces durante la construcción. Ninguna era repetible, y ninguna volvería a correr después de tocar el checker.

Decision:
Se añade [`qa/selftest-harness.mjs`](../qa/selftest-harness.mjs): **un caso por chequeo**. Por cada uno, copia el harness a un temporal, rompe exactamente lo que ese chequeo vigila, lo corre y afirma dos cosas:

1. **Detección:** el chequeo esperado falla.
2. **Precisión:** ninguno de los demás falla.

La segunda condición es la que da valor a la primera. Un chequeo que falla por todo es tan inútil como uno que no falla nunca, y la forma de saberlo es exigir que no haya daño colateral.

Obligación que introduce: **un chequeo sin su caso está incompleto.** Añadir un chequeo son dos ediciones. Si un caso no se puede escribir porque depende del entorno, se declara en la lista de excepciones del archivo **con su motivo**, como se hizo con `motores-qa` (depende de qué navegador haya instalado y de si está abierto).

Reason:
Se descartaron dos alternativas. **Confiar en la revisión manual**: es lo que se venía haciendo, y no sobrevive a la siguiente edición. **Probar el checker con el propio checker**: sería circular.

Se descartó también inventar un caso para `motores-qa` falseando la sonda: un caso falso comunica una cobertura que no existe, y eso es peor que una ausencia declarada.

## Consequences

- **Encontró un bug real en la primera corrida.** El chequeo `fallos-conocidos` leía la tabla de *ejemplo* de la sección `## Formato` en vez de la lista real bajo `## Fallos conocidos`: nunca podía fallar, y llevaba siéndolo decorativo desde que se escribió. Se arregló `tableRows` con un ancla de sección y ahora ignora además lo que está dentro de bloques de código.
- El checker es lo único del harness con cobertura completa de sí mismo.
- Mantener el archivo es parte de mantener el harness: cada chequeo nuevo obliga a su caso, y el paso 3 de [`../UPDATE.md`](../UPDATE.md) lo recuerda.
- Coste: 18 corridas del checker por ejecución. Sobre copias de ~310 KB, unos segundos.

## Relacionados

- Prueba: [`../qa/selftest-harness.mjs`](../qa/selftest-harness.mjs) · Mecanismo: [`../tools/check-harness.mjs`](../tools/check-harness.mjs)
- Enforcement: [DEC-0002](./DEC-0002-enforcement-mecanismo.md) · Actualización: [DEC-0018](./DEC-0018-version-actualizacion.md) · Índice: [`INDEX.md`](./INDEX.md)
