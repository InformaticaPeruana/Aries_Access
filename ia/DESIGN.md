# DESIGN — de dónde viene este harness y qué gap cierra cada pieza

Documento de trazabilidad del diseño. Sirve para **evaluar la hipótesis**: este harness es tu harness probado en un proyecto real, **más** los mecanismos que corrigen los gaps detectados. Aquí se declara qué cierra cada cosa, para que el experimento sea medible y no una opinión.

## Origen y autoría

Este harness es de **Humberto Roldan**. Hay tres orígenes distintos y conviene no confundirlos.

### Suyo: la metodología y la estructura

Probada en producción antes de este repositorio, en un harness propio para un proyecto POS multiempresa.

- El ciclo **1 feature = 1 SPEC + 1 PLAN + 1 TRACKING**, en carpetas por feature.
- Las **tareas como órdenes de trabajo** (`T0n`), atómicas, con dependencias y validación declarada.
- Los **archivos de estado**: `CURRENT`, `MEMORY`, `PROJECT`, `ARCHITECTURE`, `CHANGELOG`, `BACKLOG`, `CHECKLIST`, `DASHBOARD`, `OBSIDIAN`.
- El **vocabulario único de estados** con `partial` como estado legítimo, y la regla de cierre por evidencia en lugar de checkboxes.
- **Evidencia por el camino del usuario** (HTTP real, pantalla real).
- El **registro de decisiones** con índice y formato `Context / Decision / Reason / Consequences`.
- Los **enlaces relativos como contrato de navegación** (grafo compatible con Obsidian).
- El **BOOTSTRAP MODE** y el **contrato de subagente determinista** (`ROLE / OBJECTIVE / INPUT / FILES / RULES / OUTPUT`).
- La **economía de tokens**, **enlace-primero y búsqueda como respaldo**, **esperar por condición y no por tiempo**, **cambio mínimo**, **control de scope** y la **clasificación de la solicitud**.
- **Y la tesis central de todo esto:** *"todo invariante que este harness declare debe tener un mecanismo que lo verifique, no solo disciplina"* — su `DEC-0019`, que además ya nombraba el archivo `tools/check-harness.mjs`. La regla es suya; lo que faltaba era implementarla, y eso es lo que hace este repositorio.

### Implementado en este harness (a partir de su método)

No existía antes. El texto y el código son nuevos.

- [`tools/check-harness.mjs`](./tools/check-harness.mjs) — sus **chequeos**, la implementación de su regla. El número actual lo dice `--report`: no se repite aquí, porque se queda obsoleto y nada lo verifica.
- [`tools/run-tests.mjs`](./tools/run-tests.mjs) — fuente de verdad de las pruebas.
- [`tools/browser-cdp.mjs`](./tools/browser-cdp.mjs) — motor de navegador propio contra Chrome DevTools Protocol, sin dependencias.
- [`qa/driver.mjs`](./qa/driver.mjs) — resolutor de motores; y [`qa/`](./qa/) con plantillas, fixture y autoprueba.
- El **protocolo dividido en 14 documentos por fase**, con router corto ([`INSTRUCTIONS.md`](./INSTRUCTIONS.md)).
- Los tres **ledgers nuevos**: [`KNOWN-FAILURES.md`](./KNOWN-FAILURES.md), [`DEBT.md`](./DEBT.md) y [`GATES.md`](./GATES.md).
- Los **contratos de subagente** [`REVIEWER`](./agents/REVIEWER.md), [`INVESTIGATOR`](./agents/INVESTIGATOR.md) y [`EXPLORER`](./agents/EXPLORER.md), y el gate de revisión por riesgo.
- Los **presupuestos con ratchet** ([DEC-0008](./decisions/DEC-0008-presupuestos-ratchet.md)) y el **punto de retomada** ([DEC-0016](./decisions/DEC-0016-contexto-delegacion.md)).
- [`ADOPT.md`](./ADOPT.md) y el flag `adopted`.
- Las plantillas de spec, tracking, revisión, plan y tarea; el glosario.

### Tomado de gstack (ajeno, acreditado)

Patrones e ideas que se incorporaron tras estudiar su diseño. **No se copió código suyo.**

- Chequeos ejecutables como **gate de commit** y el patrón **ratchet**.
- **Gates de operaciones de una sola dirección.**
- El **ledger de deuda con disparador** observable.
- La **sonda con respaldo** al resolver un motor.
- La **revisión adversarial obligatoria por riesgo.**
- Un término: **«Iron Law»** (no hay fix sin causa raíz), en [`agents/INVESTIGATOR.md`](./agents/INVESTIGATOR.md) y [`protocol/07-review.md`](./protocol/07-review.md).

Proyecto: [garrytan/gstack](https://github.com/garrytan/gstack), licencia MIT.

## Mapa gap → mecanismo → archivo

| # | Gap detectado | Mecanismo que lo cierra | Dónde vive |
|---|---|---|---|
| G1 | Invariantes declarados sin mecanismo que los compruebe; ninguna verificación automática | `check-harness.mjs` con sus chequeos + gate de commit y de CI. Patrón **ratchet**: congela el número actual y prohíbe empeorar | [`tools/check-harness.mjs`](./tools/check-harness.mjs) · [`tools/git-hooks/pre-commit`](./tools/git-hooks/pre-commit) · [`tools/ci/harness.yml`](./tools/ci/harness.yml) |
| G2 | `CURRENT.md` convertido en changelog; se lee en cada sesión | Presupuesto de tamaño con ratchet + separación de responsabilidades por archivo | [DEC-0004](./decisions/DEC-0004-memoria-diferencial.md) · [`protocol/10-memory-tokens.md`](./protocol/10-memory-tokens.md) |
| G3 | No existía fase de revisión; quien implementa se autovalida | `REVIEWER` obligatorio por riesgo, con veredicto persistido y gate comprobado | [`protocol/07-review.md`](./protocol/07-review.md) · [`agents/REVIEWER.md`](./agents/REVIEWER.md) |
| G4 | Sin política para operaciones irreversibles | Catálogo de operaciones de una sola dirección + confirmación explícita + bitácora + **prueba de recuperabilidad comprobable** (comando y resultado, en un paso separado) | [`protocol/08-gates.md`](./protocol/08-gates.md) · [`GATES.md`](./GATES.md) · [DEC-0020](./decisions/DEC-0020-comprobacion-del-gate.md) |
| G5 | Tests sin runner y fallos conocidos solo en prosa | Runner que escribe la fuente de verdad + regla de reconciliación con dueño y cierre | [`tools/run-tests.mjs`](./tools/run-tests.mjs) · [`KNOWN-FAILURES.md`](./KNOWN-FAILURES.md) |
| G6 | Protocolo monolítico que se carga entero | Router corto + protocolo por fases cargado bajo demanda | [`INSTRUCTIONS.md`](./INSTRUCTIONS.md) · [`protocol/`](./protocol/) |
| G7 | Economía de tokens declarada pero no medida | Presupuestos por archivo de entrada, como ratchet | [`tools/harness.config.json`](./tools/harness.config.json) |
| G8 | Validación funcional a mano | Contrato de QA de camino de usuario con artefactos obligatorios | [`protocol/09-qa.md`](./protocol/09-qa.md) · [`qa/`](./qa/) |
| G9 | Atajos aceptados que no dejaban rastro | Marcador en código + ledger con disparador observable, contado en el reporte | [`DEBT.md`](./DEBT.md) · [DEC-0011](./decisions/DEC-0011-deuda-atajos.md) |
| G10 | Un harness no debe arrastrar carpetas grandes para poder probar la UI | Motor de navegador propio dentro de `ia/` (CDP contra el Chrome/Edge de la máquina) + resolución en runtime con Playwright como upgrade | [`qa/driver.mjs`](./qa/driver.mjs) · [`tools/browser-cdp.mjs`](./tools/browser-cdp.mjs) · [DEC-0015](./decisions/DEC-0015-motores-qa.md) |
| G11 | El contexto de una conversación no tiene ciclo de vida: si se llena, no hay ritual ni disparador para retomar | Disparadores **observables** de delegación + punto de retomada verificado (una sola tarea activa, `CURRENT.md` apuntando a ella) | [`protocol/14-context.md`](./protocol/14-context.md) · [DEC-0016](./decisions/DEC-0016-contexto-delegacion.md) |
| G12 | Pruebas que necesitan una sesión que no se puede scriptear (2FA, SSO, token en `localStorage`) quedaban sin poder hacerse | Opción de **perfil real** del navegador, con guardia de navegador cerrado, cierre ordenado y sin borrar nunca un perfil del usuario | [`tools/browser-cdp.mjs`](./tools/browser-cdp.mjs) · [DEC-0017](./decisions/DEC-0017-perfil-real-navegador.md) |
| G13 | El harness se copia por proyecto: al mejorar, las copias no se enteran y nada dice cuál quedó vieja | `VERSION` + procedimiento de actualización con los archivos clasificados en tres grupos + chequeo que nombra lo que falta | [`UPDATE.md`](./UPDATE.md) · [DEC-0018](./decisions/DEC-0018-version-actualizacion.md) |
| G14 | El checker es el mecanismo del que dependen todos los invariantes, y **no tenía prueba**: un chequeo roto dejaba pasar todo en silencio | Autoprueba del checker: un caso por chequeo, con detección **y precisión**. Un chequeo sin su caso está incompleto | [`qa/selftest-harness.mjs`](./qa/selftest-harness.mjs) · [DEC-0019](./decisions/DEC-0019-probar-el-checker.md) |

## Cómo evaluar si funcionó

Al probarlo en un proyecto nuevo, esto es lo medible:

1. **¿El check detecta de verdad?** Corre `node ia/tools/check-harness.mjs --report` sobre el proyecto tal como está hoy. Si no encuentra nada, los chequeos son demasiado laxos.
2. **¿El gate duele en el momento correcto, no después?** El pre-commit debe bloquear un commit con TRACKING desincronizado. Prueba a forzarlo.
3. **¿`CURRENT.md` se mantiene corto?** Es el indicador más honesto: fue lo primero que se corrompió en el harness anterior.
4. **¿La revisión adversarial encuentra algo?** Si el `REVIEWER` nunca encuentra nada en features de riesgo alto, no está revisando: está aprobando.
5. **¿El coste de arranque bajó?** Mide líneas cargadas en el arranque de sesión antes y después del split del protocolo.

## Lo que deliberadamente NO se copió

Catálogo de skills atadas a plataformas concretas · evals pagados · narrativa de productividad · índices generados gigantes · duplicación de plantilla entre skills.

Razón: son coste de mantenimiento sin retorno para un equipo pequeño.

## Riesgos de este diseño

- **El check puede volverse ritual.** Un gate que siempre pasa deja de mirarse. Mitigación: contar en el reporte lo que encuentra, no solo PASS/FAIL.
- **El frontmatter es un contrato.** Si se escribe mal, el parser puede fallar en silencio. Mitigación: el check valida la forma, no solo el valor.
- **Demasiados documentos.** Mitigación: presupuesto de tamaño y la regla "un archivo, una función".

## Relacionados

- Mapa: [`README.md`](./README.md) · Protocolo: [`INSTRUCTIONS.md`](./INSTRUCTIONS.md)
- Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md) · Mecanismo: [`tools/check-harness.mjs`](./tools/check-harness.mjs)
