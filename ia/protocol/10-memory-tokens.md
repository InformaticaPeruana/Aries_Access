# 10 — Memoria y economía de tokens

## La memoria es diferencial, no acumulativa

Cada archivo tiene **una** función y no hace el trabajo de otro. Cuando información vieja deja de ser relevante, se reemplaza o se elimina; no se apila.

| Archivo | Qué contiene | Qué NO contiene |
|---|---|---|
| `CURRENT.md` | Estado operativo actual (≤ 60 líneas) | Historial de features |
| `MEMORY.md` | Conocimiento reutilizable (decisiones, convenciones, trampas) | Narrativa de sesiones |
| `CHANGELOG.md` | Historial cronológico resumido | Contexto permanente |
| `specs/` | Contratos | Estado de ejecución |
| `decisions/` | Decisiones con su razón | Detalle de implementación |
| `BACKLOG.md` | Trabajo pendiente | Justificaciones largas |
| `DEBT.md` | Atajos aceptados + disparador | Ideas futuras |

**El error más común y más caro:** `CURRENT.md` convirtiéndose en un changelog. Si `CURRENT.md` narra features completadas, ya está mal: eso pertenece a `CHANGELOG.md` y a la spec. `CURRENT.md` es *el estado de ahora*, no *lo que pasó*. Lo vigila el presupuesto de [`../tools/check-harness.mjs`](../tools/check-harness.mjs).

## Regla de escritura

- Guarda **conocimiento reusable**, no transcripciones. Bien: "el módulo de auth usa JWT HS256 con expiración de 1 h". Mal: "hoy analizamos durante 30 minutos y decidimos…".
- Bullets, no párrafos. Enlaces, no copias.
- Nunca pegues código completo en documentación: referencia el archivo y la línea.
- No repitas contexto ya conocido ni generes documentación narrativa.

## Economía de tokens

### Lectura
- No leas un archivo completo cuando basta una sección.
- **Busca primero, abre después** (grep/glob antes que lectura completa).
- No releas lo ya leído en la misma ejecución.
- Carga el protocolo **por fase** ([`../INSTRUCTIONS.md`](../INSTRUCTIONS.md)), no entero.

### Escritura
- No repitas contexto conocido. No copies texto entre documentos: enlaza.

### Presupuestos

Los archivos que se leen en **cada** sesión tienen presupuesto de tamaño, y el presupuesto es un **ratchet**: no se puede empeorar.

| Archivo | Máximo de líneas |
|---|---|
| `AGENTS.md` | 140 |
| `ia/INSTRUCTIONS.md` | 120 |
| `ia/CURRENT.md` | 60 |
| `ia/MEMORY.md` | 220 |
| `ia/specs/README.md` | 140 |

Si un archivo excede su presupuesto, no se sube el presupuesto: se mueve contenido a su lugar correcto. Subirlo es una decisión explícita, registrada.

## Relacionados

- Compresión de capas: [DEC-0004](../decisions/DEC-0004-memoria-diferencial.md)
- Perfiles de contexto: [`../DASHBOARD.md`](../DASHBOARD.md)
- Comprobación: [`../tools/check-harness.mjs`](../tools/check-harness.mjs)
