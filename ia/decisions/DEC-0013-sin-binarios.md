## DEC-0013 — Sin binarios versionados dentro de `/ia`

Date: 2026-10-21
Status: active

Context:
El harness anterior tiene versionado, dentro del repositorio, un archivo `.rar` que duplica todo el directorio `/ia`, además de capturas y documentos ofimáticos sueltos en la raíz. Eso crea dos fuentes de verdad: la carpeta y el comprimido. Cuando divergen, nadie sabe cuál manda, y la búsqueda del agente encuentra la copia vieja.

Decision:
Dentro de `/ia` no se versionan binarios: comprimidos, ejecutables, capturas y documentos ofimáticos quedan fuera de git. Si un artefacto debe conservarse, su lugar es:

- **Capturas y evidencias de QA** → `ia/.harness/` (ignorado por git), referenciadas desde el TRACKING.
- **Documentos de fuente externa** (PDF, DOCX, XLSX) → `research/` con su transcripción en markdown, que es lo que se versiona.
- **Copias de seguridad** → fuera del repositorio.

## Reason

Git no versiona bien los binarios (no diferencia, engorda el clon) y una copia comprimida del propio directorio es una bomba de drift: garantiza que exista una versión desactualizada con aspecto autoritativo. Se descartó Git LFS: añade infraestructura para un problema que se resuelve con una transcripción.

## Consequences

- El check emite un **aviso** (no un fallo) por binarios presentes bajo `/ia`, con su ruta.
- Los documentos de `research/` se acompañan de su transcripción markdown, que es el nodo enlazable.
- `.harness/` está en [`../.gitignore`](../.gitignore).

## Relacionados

- Índice: [`INDEX.md`](./INDEX.md) · QA y artefactos: [`../protocol/09-qa.md`](../protocol/09-qa.md)
- Mecanismo: [`../tools/check-harness.mjs`](../tools/check-harness.mjs) · Diseño: [`../DESIGN.md`](../DESIGN.md)
