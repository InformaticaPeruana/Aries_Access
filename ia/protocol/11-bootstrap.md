# 11 — BOOTSTRAP de un proyecto existente

Cuando el harness se adopta en un proyecto que **ya existe**, se ejecuta esto **una sola vez**, antes de cualquier desarrollo nuevo. Objetivo: reconstruir el estado real **sin modificar comportamiento**.

## Steps

### 1 — Inventario del repositorio
Inspecciona estructura, tecnologías, módulos, configuración, base de datos, APIs, dependencias. **No analices en profundidad lo que no sea necesario.**

### 2 — Arquitectura
Identifica componentes, responsabilidades, integraciones, flujo principal, persistencia, autenticación, servicios externos. Escribe `ARCHITECTURE.md`.

### 3 — Contexto del proyecto
Escribe `PROJECT.md` con la información estable: objetivo, alcance, tecnologías, módulos, convenciones, restricciones, comandos.

### 4 — Capacidades existentes
Identifica las funcionalidades de alto nivel. No documentes cada método: registra **capacidades relevantes**.

### 5 — Deuda técnica
Registra los problemas evidentes en `BACKLOG.md`. **No los corrijas durante el bootstrap.**

### 6 — Decisiones existentes
Infiere una decisión **solo** cuando haya evidencia en código o configuración. Si no hay evidencia, **no inventes**.

### 7 — Memoria
Escribe `MEMORY.md` con el mínimo conocimiento necesario para seguir trabajando.

### 8 — Estado
Escribe `CURRENT.md`: `Objective: Adopt AI Harness` · `Status: Bootstrap completed` · `Next: Await next development request`.

### 9 — Changelog
Registra "AI Harness adopted into existing project".

### 10 — Mecanismo
Ajusta [`../tools/harness.config.json`](../tools/harness.config.json) a este proyecto (rutas de código, comandos de test) y corre `node ia/tools/check-harness.mjs --report`. Fija la línea base del ratchet con `--update-baseline`.

### 11 — STOP
**No modifiques funcionalidad existente durante el bootstrap.** Presenta un resumen compacto de lo encontrado y espera instrucción.

## Sobre el "estado real" al adoptar

Al medir por primera vez vas a encontrar drift (documentos sin enlaces, tareas sin estado, presupuestos excedidos). **Eso no es un fracaso tuyo**: es la foto honesta del punto de partida. Se arregla con `--update-baseline` para congelar el número actual y no empeorar, más una lista corta de correcciones inmediatas. No conviertas el bootstrap en una refactorización de la documentación.

## Relacionados

- Configuración: [`../tools/harness.config.json`](../tools/harness.config.json)
- Estados: [`05-tracking.md`](./05-tracking.md) · Memoria: [`10-memory-tokens.md`](./10-memory-tokens.md)
- Decisiones: [`../decisions/INDEX.md`](../decisions/INDEX.md)
