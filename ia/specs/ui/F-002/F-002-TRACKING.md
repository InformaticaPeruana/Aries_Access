---
Feature: F-002
Estado: in_progress
---

# F-002 — TRACKING

Bitácora de ejecución. **Único lugar donde vive el estado de las tareas**, junto al `Status:` de cada `T0n` ([DEC-0003](../../../decisions/DEC-0003-estados-cierre.md), [DEC-0009](../../../decisions/DEC-0009-tareas-ordenes-trabajo.md)).

## Tareas

| Tarea | Objetivo | Depende de | Estado | Evidencia |
|-------|----------|------------|--------|-----------|
| [T01](../../../plans/F-002/T01-branding.md) | Extensión de branding oficial | - | partial | 2026-10-24: extensión instalada, `APP.NAME` = **Aries Access Infrastructure** y CSS servido; war intacto; 6 PASS. Falta confirmación visual de la paleta (AC2) |
| [T02](../../../plans/F-002/T02-portal.md) | Portada estática con las máquinas | T01 | pending | — |

## Estado por AC

| AC | Requerimiento | Tarea | Estado | Evidencia |
|----|---------------|-------|--------|-----------|
| AC1 | R1 | T01 | done | `translations/en.json` servido por la app: `APP.NAME = Aries Access Infrastructure` |
| AC2 | R2 | T01 | partial | Los 6 tokens están en el `app.css` servido (`aries-navy-900` ×6). Falta la confirmación visual del usuario |
| AC3 | R3, R5 | T01 | done | Extensión en `extensions/`; `sha256` del war **sin cambios** (`b41ceb1e…6e716`); suite de F-001 en **6 PASS** |
| AC4 | R4 | T01 | done | `bash ops/70-branding.sh` dos veces seguidas: mismo resultado, `/desktop/` 200 |
| AC5 | R6 | T02 | pending | — |

## T01 — branding aplicado (2026-10-24 02:10) — `partial`

Ejecutado con `sudo bash ops/70-branding.sh` (las fuentes se suben junto al script).

```
== validando el manifest ==
   Aries Access Branding (namespace aries)
== construyendo /tmp/aries-branding-1.0.0.jar ==
   2359 bytes
== instalando en /etc/guacamole/extensions ==
   aries-branding-1.0.0.jar  guacamole-auth-ban  guacamole-auth-jdbc-postgresql  guacamole-auth-totp
== verificacion de las traducciones servidas ==
   APP.NAME            = Aries Access Infrastructure
   APP.ACTION_ACKNOWLEDGE sigue: True
   claves APP totales  = 46
```

**Lo que costó descubrir y queda anotado:**

- Guacamole **fusiona** las traducciones de la extensión en las del producto, pero por ser un merge en profundidad hay que entregar el JSON **anidado** (`{"APP": {"NAME": ...}}`). Con eso, `APP.NAME` cambia y las otras 45 claves siguen ahí: sin eso el riesgo era dejar toda la interfaz con claves crudas.
- El CSS de la extensión **no** se sirve como archivo aparte: Guacamole lo concatena en `/desktop/app.css`. Verificado con `grep aries-navy-900` sobre ese recurso (6 coincidencias).
- `.war` intacto: `sha256` idéntico al de T05.

**Falta para cerrar T01:** que el usuario mire el login y confirme la paleta (AC2). El CSS está servido, pero "se ve bien" no lo puede afirmar un `grep`.

**Corrección del primer intento (2026-10-24):** la primera versión pintaba `html, body` de navy, y eso dejó **toda la aplicación** con fondo oscuro y texto oscuro: la lista de conexiones quedó ilegible (lo reportó el usuario con captura). El navy se limita ahora a `.login-ui`; la app va sobre `gray-050` con texto `ink-900`, y `body.client` se deja en negro para las sesiones. Lección para el CSS del branding: **el fondo global no se toca; se pinta la vista, no el documento.**

## Notas de ejecución

- **Nada ejecutado.** La spec está escrita y espera aprobación explícita.
- **F-001 manda:** cualquier cambio de esta feature no puede romper el acceso ya publicado (`remoto.informaticaperuana.com`). La regresión se comprueba con la suite de F-001 antes de dar una tarea por buena.
- **Datos externos pendientes:** los hexadecimales exactos de la marca y el logo (ítem 10 del [`../../../CHECKLIST.md`](../../../CHECKLIST.md)).

## Revisión

- **No requiere revisión adversarial:** `Riesgo: medio` y `Areas: [ui]`, sin tocar autenticación ni datos. Si en T01 se descubre que hay que tocar algo de `guacamole.properties`, se vuelve a evaluar.

## Relacionados

- Spec: [`F-002.spec.md`](./F-002.spec.md) · Plan: [`../../../plans/F-002/PLAN.md`](../../../plans/F-002/PLAN.md)
- Feature base: [`../../infra/F-001/F-001-TRACKING.md`](../../infra/F-001/F-001-TRACKING.md)
