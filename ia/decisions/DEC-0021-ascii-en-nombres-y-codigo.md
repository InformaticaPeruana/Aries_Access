## DEC-0021 — Nombres y código en ASCII; la prosa conserva el castellano

Date: 2026-10-21
Status: active

Context:
El harness tenía **un** nombre de archivo con carácter no ASCII: `ia/DISEÑO.md`. Y resultó ser un problema real, no estético:

- El nombre en NFC (`c3 91`) y en NFD (`4e cc 83`) son **bytes distintos**. `git` los ve como archivos diferentes. En un sistema que normaliza distinto —macOS y su NFD histórico— un `clone` produce un nombre que git interpreta como *borrado y sin seguimiento*.
- Y no se puede localizar con las herramientas habituales: buscar `DISEÑO` con `Select-String` devolvió **0 coincidencias** cuando había **26**, porque la consola leía con la codificación equivocada. El fallo fue silencioso y habría costado un rato largo de confusión.

Aparte, 9 archivos de código tenían acentos y eñes en comentarios y mensajes. Ahí el riesgo es otro pero también concreto: en Windows, un round-trip con `Set-Content` sin `-Encoding UTF8` escribe ANSI y **corrompe el archivo entero**.

Decision:
La regla es **ASCII** para todo lo que sea un identificador técnico, y **castellano correcto** para la prosa:

| Dónde | Regla |
|---|---|
| **Nombres de archivo y carpeta** | ASCII. Sin excepciones |
| **Código y configuración** (`.mjs`, `.json`, `.yml`, `.sh`, `.html`, `.gitignore`…) | ASCII puro, comentarios y mensajes incluidos |
| **Prosa** (`.md`) | Castellano correcto, con sus acentos y eñes ([DEC-0010](./DEC-0010-idioma-castellano.md)) |

Tres consecuencias de cómo se aplica:

1. `ia/DISEÑO.md` pasa a `ia/DESIGN.md`, que además cumple [DEC-0010](./DEC-0010-idioma-castellano.md): un nombre de archivo es un identificador técnico y va en inglés.
2. Un literal que **necesita** el carácter en tiempo de ejecución no se mutila: se escapa. `'Café Ñandú'` se escribe `'Caf\u00e9 \u00d1and\u00fa'`, y un patrón que detecta el símbolo `✗` usa `\u2717`. El archivo queda en ASCII y el comportamiento en runtime es idéntico — verificado: `selftest-cdp` sigue en 22/22.
3. **Un chequeo que compara contra datos de otro archivo no compara contra un carácter literal.** Se normaliza. Más abajo está el porqué.

Y se mecaniza: el chequeo `ascii` falla si un nombre tiene caracteres no ASCII o si código y configuración no son ASCII puro, con su caso en [`qa/selftest-harness.mjs`](../qa/selftest-harness.mjs).

Reason:
El nombre con ñ era un defecto real y verificable; el resto es consecuencia de aplicar bien la misma regla. Se descartó dejar la prosa en ASCII: produciría castellano mal escrito (`diseno`, `linea`), y el problema nunca estuvo en el contenido sino en las herramientas que lo leen con la codificación equivocada — lo que se corrige leyendo UTF-8, no mutilando el idioma.

## Consequences

- **La regla tiene un costo, y el propio harness lo encontró.** Al pasar el código a ASCII, un script convirtió silenciosamente cuatro comparaciones `valor === '—'` (guion largo escrito como carácter) en `=== '-'`. El chequeo `fallos-conocidos` dejó de detectar y **`selftest-harness` lo cazó al instante**.
  La lección no es "no toques el ASCII": es que **comparar contra un carácter literal concreto ya era frágil antes**. Si un proyecto usaba `-` o `–` en vez de `—`, fallaba igual. Se sustituyó por un helper `estaVacio()` que normaliza cualquier combinación de guiones, puntos y espacios. Ahora la comprobación depende del *significado* de la celda, no del carácter que alguien eligió.
- Y en la misma pasada apareció otro fallo del mismo tipo: el patrón `✗\b` de [`run-tests.mjs`](../tools/run-tests.mjs) **nunca podía coincidir**, porque entre un símbolo y un espacio no hay frontera de palabra. Esa alternativa llevaba siendo código muerto desde que se escribió. Se cambió `\b` por un lookahead de separador y se verificó contra `last-run.json` con los tres estilos de reporte (`✗`, `FAIL:`, `FALLO:`).
- Adoptar esta versión obliga a borrar `ia/DISEÑO.md`; la migración está en [`../UPDATE.md`](../UPDATE.md).
- Los 1931 acentos de la prosa se quedan. La regla no es "no usar castellano": es "no poner castellano en el nombre de un archivo ni en el código".

## Relacionados

- Mecanismo: [`../tools/check-harness.mjs`](../tools/check-harness.mjs) · Prueba: [`../qa/selftest-harness.mjs`](../qa/selftest-harness.mjs)
- Idioma: [DEC-0010](./DEC-0010-idioma-castellano.md) · Probar al que prueba: [DEC-0019](./DEC-0019-probar-el-checker.md) · Migración: [`../UPDATE.md`](../UPDATE.md) · Índice: [`INDEX.md`](./INDEX.md)
