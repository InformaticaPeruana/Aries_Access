# DASHBOARD — vista del proyecto

> **Este archivo es para humanos y para el agente.** Los bloques `dataview` funcionan en Obsidian (ver [`OBSIDIAN.md`](./OBSIDIAN.md)); la vista que el **agente** puede leer sin Obsidian la produce el mecanismo: `node ia/tools/check-harness.mjs --report`. Ambos deben contar lo mismo.

## Estado actual

Abrir [`CURRENT.md`](./CURRENT.md). Este archivo no lo duplica.

## Estado del harness (fuente: check-harness)

```
node ia/tools/check-harness.mjs --report
```

Imprime: chequeos PASS/FAIL · features por estado · tareas por estado · uso de presupuestos · fallos conocidos · deuda abierta.

## Features y tareas (Obsidian)

```dataview
LIST
FROM "ia/specs"
WHERE contains(file.name, "spec")
SORT file.name ASC
```

```dataview
TABLE Tarea, Feature, Status
FROM "ia/plans"
WHERE contains(file.name, "T")
SORT file.name ASC
```

```dataview
TABLE Estado
FROM "ia/specs"
WHERE contains(file.name, "TRACKING")
SORT file.name ASC
```

## Tareas pendientes

```dataview
LIST
FROM "ia/plans"
WHERE contains(file.name, "T") AND Status != "done"
SORT file.name ASC
```

## Deuda abierta

```dataview
TABLE disparador, feature
FROM "ia"
WHERE file.name = "DEUDA"
```

## Relacionados

- Mecanismo: [`tools/check-harness.mjs`](./tools/check-harness.mjs) · Estado: [`CURRENT.md`](./CURRENT.md)
- Pendientes: [`BACKLOG.md`](./BACKLOG.md) · Deuda: [`DEBT.md`](./DEBT.md) · Fallos: [`KNOWN-FAILURES.md`](./KNOWN-FAILURES.md)
- Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md) · Vault: [`OBSIDIAN.md`](./OBSIDIAN.md)
