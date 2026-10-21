## DEC-0018 — Versión del harness y camino de actualización

Date: 2026-10-21
Status: active

Context:
Este harness se copia dentro de cada proyecto, y a partir de ahí cada copia es la fuente de verdad de ese proyecto. El problema aparece en cuanto hay más de uno: si el harness mejora, **las copias no se enteran**. Y nada indica cuál quedó vieja.

No es un riesgo teórico. El harness anterior del autor ya sufrió exactamente esto: un archivo comprimido de `/ia` versionado dentro del repositorio, dos copias divergiendo, y a las semanas nadie sabía cuál mandaba.

Decision:
Tres piezas:

1. **`ia/VERSION`** con `harness: X.Y.Z` y `fecha: YYYY-MM-DD`. Es lo que dice de qué versión es una copia.
2. **`ia/ADOPT.md`** clasifica cada archivo en tres grupos, y ese es el corazón del procedimiento:
   - **A, del harness**: se reemplazan sin miedo.
   - **B, del proyecto**: no se tocan nunca. `CURRENT`, `MEMORY`, `PROJECT`, `ARCHITECTURE`, `CHANGELOG`, `BACKLOG`, `CHECKLIST`, `DEUDA`, `KNOWN-FAILURES`, `GATES`, las specs y tareas, `research`, y las decisiones propias.
   - **C, mixtos**: se fusionan a mano. Los índices, la config y el baseline. Reemplazarlos borra trabajo; ignorarlos deja la estructura vieja.
3. **El chequeo `version-harness`**: lee la versión y verifica que existan los archivos del grupo A. Una actualización a medias deja de ser un misterio y pasa a ser un `FAIL` que nombra el archivo que falta.

Reason:
Se descartaron dos alternativas. **Submódulo o subtree**: elimina el copiado, pero añade una pieza de git que hay que explicar en cada proyecto, y no resuelve el problema real —distinguir lo del harness de lo del proyecto—, que sigue existiendo con o sin submódulo. **Actualización automática**: no se hace, porque sobrescribir archivos de un proyecto sin supervisión puede borrar trabajo, y eso es una operación de una sola dirección.

La comparación de versiones es **manual y local**: el chequeo no consulta la red, porque un harness que no arranca sin internet es un harness frágil.

## Consequences

- Cada proyecto debe actualizarse a mano, en una rama y con el diff revisado. Es el precio de que cada copia sea la fuente de verdad, y se acepta a cambio de que ninguna actualización pueda destruir datos en silencio.
- La clasificación en tres grupos obliga a mantenerla: un archivo nuevo en el harness entra en el grupo A o C y hay que declararlo. Los archivos del grupo A están listados en `harness.config.json` → `update.criticalFiles`, así que el chequeo cubre el olvido.
- `harness-baseline.json` es del proyecto y **no** se copia: es el ratchet de ese proyecto. Copiarlo pondría techos ajenos.
- `decisions/INDEX.md` y `specs/README.md` son los dos puntos que exigen juicio humano. Están documentados como tales en vez de disimulados.

## Relacionados

- Versión: [`../VERSION`](../VERSION) · Procedimiento: [`../UPDATE.md`](../UPDATE.md)
- Adopción: [`../ADOPT.md`](../ADOPT.md) · Mecanismo: [`../tools/check-harness.mjs`](../tools/check-harness.mjs) · Índice: [`INDEX.md`](./INDEX.md)
