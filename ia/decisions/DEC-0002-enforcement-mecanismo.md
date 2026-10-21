## DEC-0002 — Los invariantes del harness se comprueban con mecanismo ejecutable

Date: 2026-10-21
Status: active

Context:
El harness declara invariantes —TRACKING sincronizado con las tareas, estados válidos, trazabilidad código↔spec, documentos sin nodos aislados, comandos correctos— pero las reglas escritas en prosa solo funcionan mientras alguien las recuerda. En un harness anterior el invariante central quedó **referenciado en ocho documentos y nunca implementado**, y con él apareció drift silencioso: tareas sin estado, features marcadas como completadas sin rastro de ejecución, documentos desenlazados.

Decision:
Todo invariante que este harness declare tiene un mecanismo que lo verifica, y ese mecanismo corre en el **gate de commit**.

- Implementación: [`../tools/check-harness.mjs`](../tools/check-harness.mjs) (sin dependencias, solo Node).
- Gate local: [`../tools/git-hooks/pre-commit`](../tools/git-hooks/pre-commit) activado con `git config core.hooksPath ia/tools/git-hooks`.
- Gate de integración: [`../tools/ci/harness.yml`](../tools/ci/harness.yml).

Regla de honestidad: el check en verde **no** reemplaza la evidencia. La evidencia es la columna `Evidencia` del TRACKING y las pruebas. El check solo impide la degradación silenciosa.

Reason:
La diferencia entre un proceso y un ritual es si algo falla cuando se incumple. Se descartó confiar en la disciplina y en revisiones manuales: en el harness anterior fallaron exactamente ahí.

Consequences:
- Añadir un invariante nuevo obliga a añadir su chequeo, o no es un invariante.
- `--no-verify` sigue siendo posible, pero es una decisión explícita que se justifica en la respuesta.
- Coste: mantener el script. Se acota con `--update-baseline` para no exigir perfección retroactiva.

## Relacionados

- Mecanismo: [`../tools/check-harness.mjs`](../tools/check-harness.mjs) · Config: [`../tools/harness.config.json`](../tools/harness.config.json)
- Diseño (G1): [`../DESIGN.md`](../DESIGN.md) · Índice: [`INDEX.md`](./INDEX.md)
