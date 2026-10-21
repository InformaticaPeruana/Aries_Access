## DEC-0024 — Adopción del harness `/ia` en Aries_Access

Date: 2026-10-21
Status: active

Context:
Aries_Access arranca sin código de producto: solo existe la conversación de investigación previa sobre Guacamole (`conversaciones/2026-10-21-guacamole-vms-navegador.md`) y la decisión de trabajar bajo Spec Driven Development. El repositorio todavía no era git.

Decision:
Se adopta la plantilla del harness (v3.1.0) siguiendo [`../ADOPT.md`](../ADOPT.md) íntegro, por el **camino A** (proyecto vacío: se adopta y se espera la primera feature), con estos parámetros:

| Parámetro | Valor |
|---|---|
| Camino | **A** — sin código de producto que bootstrapear |
| `codeRoots` | `src`, `public` — **ampliado por [DEC-0026](./DEC-0026-arquitectura-despliegue-server01.md) a `ops` y `tests`**, y `codeExtensions` a `.sh`/`.mjs` |
| `tests.commands` | vacío (no hay pruebas todavía; el chequeo se reporta como `SKIP`) |
| `qa.order` | `playwright`, `cdp`, `gstack` (valor por defecto; `cdp` funciona sin instalar nada) |
| Áreas de riesgo | `acceso-remoto`, `credenciales`, `portapapeles` |
| Riesgo que obliga revisión adversarial | `alto` |
| Excepciones añadidas | **ninguna** |
| Remoto | `https://github.com/InformaticaPeruana/Aries_Access.git` |
| CI | ninguno por ahora (si se añade, se copia `ia/tools/ci/harness.yml`) |

La investigación de partida se conserva como copia de trabajo en [`../research/2026-10-21-guacamole-vms-navegador.md`](../research/2026-10-21-guacamole-vms-navegador.md).

Reason:
El proyecto no tiene código, así que el bootstrap de [`../protocol/11-bootstrap.md`](../protocol/11-bootstrap.md) (camino B) no aplica: no hay nada que reconstruir.
Se descartó dejar `codeRoots` y `tests.commands` con valores de ejemplo: un `codeRoots` que no corresponde deja la trazabilidad en `SKIP` y da la apariencia de estar adoptado sin estarlo.
Se descartó también inventar las pruebas: no hay suites, y declarar comandos que no existen convierte el chequeo en teatro.

Consequences:
- **Obligatorio desde ahora:** nada de código de producto sin SPEC aprobada; los estados usan el vocabulario de [DEC-0003](./DEC-0003-estados-cierre.md) y el commit pasa por el gate de [DEC-0002](./DEC-0002-enforcement-mecanismo.md).
- **Hueco declarado:** con `tests.commands` vacío, `run-tests.mjs` no ejecuta nada y la mitad de verificación no vigila. Se cierra en la primera feature que traiga pruebas (ver [`../BACKLOG.md`](../BACKLOG.md)).
- Las decisiones heredadas `DEC-0001..DEC-0023` quedan fechadas a 2026-10-21: son las políticas que este proyecto acepta desde hoy.
- La fecha de vigencia del campo *Recuperabilidad comprobada* de [`../GATES.md`](../GATES.md) se mantiene en 2026-10-14 ([DEC-0023](./DEC-0023-campo-nuevo-desde-su-fecha.md)); Aries_Access no tiene entradas anteriores, así que no hay exención que aplicar.

## Relacionados

- Procedimiento: [`../ADOPT.md`](../ADOPT.md) · Estado: [`../CURRENT.md`](../CURRENT.md) · Datos por cerrar: [`../CHECKLIST.md`](../CHECKLIST.md)
- Índice: [`INDEX.md`](./INDEX.md) · Despliegue elegido: [DEC-0025](./DEC-0025-despliegue-nativo-sin-docker.md)
