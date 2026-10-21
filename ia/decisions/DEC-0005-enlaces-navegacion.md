## DEC-0005 — Enlaces relativos como contrato de navegación

Date: 2026-10-21
Status: active

Context:
Con más de cuarenta documentos, un agente que no sabe dónde está cada cosa explora el repositorio o adivina. La búsqueda por contenido es potente pero cara; los enlaces son gratis si existen y son correctos.

Decision:
Todo documento de `/ia` y el `AGENTS.md` de la raíz enlazan a sus relacionados con **enlaces markdown relativos** (compatibles con Obsidian, GitHub y lectura en terminal).

- Ningún nodo aislado: cada `.md` tiene ≥ 1 enlace saliente.
- Hubs: `ia/README.md` (mapa del harness) y `ia/decisions/INDEX.md` (mapa de decisiones).
- Los documentos de una feature se enlazan entre sí: spec ↔ tracking ↔ plan ↔ tareas.
- Enlazar en vez de copiar: si una sección resume otra, se enlaza al origen.

**Enlace-primero, búsqueda-como-respaldo:** si un enlace no resuelve o el destino no tiene lo buscado, se ubica con `grep`/`glob`. El enlace es el camino rápido, no el único.

Reason:
Un grafo navegable es la única forma barata de que otra sesión encuentre contexto sin explorar. Se descartaron wikilinks `[[...]]`: no funcionan en GitHub ni en la terminal.

Consequences:
- Los nodos aislados los detecta [`../tools/check-harness.mjs`](../tools/check-harness.mjs).
- Renombrar o mover un archivo obliga a actualizar sus enlaces entrantes.

## Relacionados

- Vault: [`../OBSIDIAN.md`](../OBSIDIAN.md) · Mapa: [`../README.md`](../README.md)
- Índice: [`INDEX.md`](./INDEX.md) · Protocolo: [`../protocol/02-cycle.md`](../protocol/02-cycle.md)
