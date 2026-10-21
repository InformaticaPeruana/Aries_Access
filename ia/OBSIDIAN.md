# OBSIDIAN

Configuración del vault para navegar `/ia` con el grafo de enlaces (ver [DEC-0005](./decisions/DEC-0005-enlaces-navegacion.md)).

## Uso

Abrir **la raíz del proyecto** como vault (no solo `/ia`), para que `AGENTS.md` y `ia/` queden en el mismo grafo.

## Ajustes recomendados

| Ajuste | Valor | Por qué |
|---|---|---|
| Files & Links → New link format | Relative path | Compatible con GitHub y con lectura en terminal |
| Files & Links → Use [[Wikilinks]] | **Off** | Los enlaces relativos markdown funcionan en las tres superficies |
| Appearance → Show inline title | On | Contexto de dónde estás |
| Dataview (plugin) | Instalado | Habilita [`DASHBOARD.md`](./DASHBOARD.md) |

## Grafo

- **Hubs:** [`README.md`](./README.md) (mapa del harness) y [`decisions/INDEX.md`](./decisions/INDEX.md) (mapa de decisiones).
- **Regla:** ningún documento aislado. Cada `.md` de `/ia` tiene ≥ 1 enlace saliente, y los nodos de una feature se enlazan entre sí (spec ↔ tracking ↔ plan ↔ tareas). Lo comprueba [`tools/check-harness.mjs`](./tools/check-harness.mjs).
- Excluir del grafo lo que solo estorba: `ia/archive/`, `ia/.harness/`. Ajustar en Graph view → Filters.

## Notas de sintaxis

- Frontmatter YAML en cada spec, tarea y tracking: es lo que leen Dataview **y** `check-harness`.
- Evita tablas dentro de bloques `dataview`: rompen el parser.

## Relacionados

- Dashboard: [`DASHBOARD.md`](./DASHBOARD.md) · Mapa: [`README.md`](./README.md)
- Decisiones: [DEC-0005](./decisions/DEC-0005-enlaces-navegacion.md) · Estado: [`CURRENT.md`](./CURRENT.md)
