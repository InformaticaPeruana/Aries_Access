# HARNESS `/ia` — Spec Driven Development

Este directorio es la **memoria persistente y la fuente de verdad del proceso** de desarrollo asistido por IA de este proyecto. El código es el producto; `/ia` es cómo se decide, se ejecuta y se comprueba.

> Plantilla generalizable de **Humberto Roldan**. Proviene del harness que él mismo construyó y usó en producción en un proyecto POS multiempresa, **más** los mecanismos que corrigen los gaps detectados (ver [`DESIGN.md`](./DESIGN.md)).

## Mapa

| Nodo | Para qué |
|------|----------|
| [`ADOPT.md`](./ADOPT.md) | **Adopción.** Cómo llevar este harness a un proyecto nuevo, o pedirle a otro agente que lo haga. Empieza por aquí si `ia/` acaba de llegar al repo. |
| [`UPDATE.md`](./UPDATE.md) · [`VERSION`](./VERSION) | **Actualización.** Cómo llevar una copia a una versión nueva sin perder datos del proyecto. `VERSION` dice de qué versión es tu copia. |
| [`INSTRUCTIONS.md`](./INSTRUCTIONS.md) | **Router.** Léelo primero: dice qué leer y en qué orden. |
| [`protocol/`](./protocol/) | El protocolo, dividido por fase (se carga bajo demanda). |
| [`CURRENT.md`](./CURRENT.md) | Estado operativo actual. **≤ 60 líneas.** |
| [`MEMORY.md`](./MEMORY.md) | Memoria diferencial (conocimiento reutilizable). |
| [`PROJECT.md`](./PROJECT.md) | Información estable del proyecto. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Estado arquitectónico. |
| [`DECISIONS`](./decisions/INDEX.md) | Decisiones vigentes, una por archivo. |
| [`specs/`](./specs/README.md) | Especificaciones + índice + diferencias aceptadas. |
| [`plans/`](./plans/) | Planes y órdenes de trabajo (`T0n`). |
| [`CHANGELOG.md`](./CHANGELOG.md) | Historial cronológico. |
| [`BACKLOG.md`](./BACKLOG.md) | Trabajo pendiente. |
| [`DEBT.md`](./DEBT.md) | Deuda por **atajos aceptados**, con disparador de cierre. |
| [`KNOWN-FAILURES.md`](./KNOWN-FAILURES.md) | Fallos conocidos con dueño y condición de cierre. |
| [`GATES.md`](./GATES.md) | Bitácora de operaciones de una sola dirección. |
| [`CHECKLIST.md`](./CHECKLIST.md) | Datos externos a conseguir. |
| [`agents/`](./agents/README.md) | Contratos de subagentes (incluye `REVIEWER`). |
| [`tools/`](./tools/) | **Mecanismos ejecutables**: comprobación del harness y motor de navegador propio (CDP). |
| [`qa/`](./qa/) | Pruebas de camino de usuario, resolutor de motores de navegador y autoprueba. |
| [`DASHBOARD.md`](./DASHBOARD.md) · [`OBSIDIAN.md`](./OBSIDIAN.md) | Vistas y configuración del vault. |

## Adoptarlo en un proyecto nuevo

**El procedimiento es [`ADOPT.md`](./ADOPT.md). Léelo y síguelo en orden.** Cubre los dos caminos (repo vacío y repo existente), las preguntas obligatorias al humano, el sellado del ratchet, el criterio de aceptación y los errores típicos. Si quieres que lo adopte **otro agente**, el prompt para pegar está en su §0.

Solo para orientarte, la forma que tiene:

```bash
cp ia/AGENTS.template.md AGENTS.md            # y rellenalo
# ajusta ia/tools/harness.config.json (codeRoots, tests.commands)
git config core.hooksPath ia/tools/git-hooks
node ia/tools/check-harness.mjs --report
node ia/tools/check-harness.mjs --update-baseline   # sella el ratchet
```

## Regla suprema

**No se escribe código sin spec aprobada.** Y ninguna spec se declara cumplida sin evidencia verificable.

## La regla que hace que esto no sea discurso

Todo invariante del harness tiene un **mecanismo que lo comprueba** ([`tools/check-harness.mjs`](./tools/check-harness.mjs)). El check en verde **no** reemplaza la evidencia: la evidencia son la columna `Evidencia` del TRACKING y las pruebas. El check solo impide que el harness se degrade en silencio.

## Relacionados

- Diseño y trazabilidad de cada mecanismo: [`DESIGN.md`](./DESIGN.md)
- Protocolo completo: [`INSTRUCTIONS.md`](./INSTRUCTIONS.md)
- Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md)
