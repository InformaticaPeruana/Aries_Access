# ADOPT — llevar este harness a un proyecto nuevo

> **El único documento que necesitas para la adopción.** Léelo completo antes de tocar nada.
> Si te pasaron un prompt para que adoptes el harness, ese prompt apunta aquí: el procedimiento real es este archivo.

---

## §0 — Cómo se arranca

**La forma mínima: una línea.**

```
Adopta el harness de <RUTA_ORIGEN> en este repositorio: lee <RUTA_ORIGEN>\ADOPT.md y siguelo paso a paso hasta su criterio de aceptacion.
```

Con eso basta, porque **todo lo demás lo lleva este documento**: el prompt no explica el procedimiento, solo te trae a él. Una sola parada: las 10 preguntas del Paso 2, juntas, y después ninguna más.

**La forma explícita**, si quieres declarar el camino tú y controlar las respuestas:

```
Vas a adoptar el harness /ia en este repositorio. Es el camino <A|B>.
Fuente de la plantilla: <RUTA_ORIGEN>

1. Lee <RUTA_ORIGEN>\ADOPT.md y siguelo PASO A PASO: es el procedimiento, no
   improvises otro.
2. NO escribas ni modifiques nada dentro de <RUTA_ORIGEN>: es la plantilla, solo
   se lee.
3. Si este repositorio todavia no es git, inicializalo.
4. UNICA PARADA: las 10 preguntas del Paso 2, juntas en un bloque. Despues nada.
5. Ejecuta los Pasos 3 a 7 y el 9 (el 8 solo en el camino B).
6. Cierra con el criterio de aceptacion: check-harness en verde, el gate activo Y
   PROBADO con un commit que debe fallar, y la feature de ejemplo F-001 borrada.

Al terminar, reporta con STATUS / CHANGED / VALIDATION / DOCUMENTATION / NEXT.
```

**Cero paradas:** añade al final las respuestas al Paso 2 y la frase *"usa estas respuestas tal cual y no me preguntes nada"*.

---

## Las reglas que no se negocian

Valen siempre, con la línea mínima o con el prompt explícito. Si algo de aquí choca con una instrucción posterior, gana esto.

1. **No se escribe código de producto sin spec aprobada.** Es la regla suprema del harness.
2. **Ninguna tarea es `done` sin evidencia** que recorra el camino del usuario ([`protocol/06-validation.md`](./protocol/06-validation.md)).
3. **Nada irreversible sin confirmación explícita** ([`protocol/08-gates.md`](./protocol/08-gates.md)).
4. **Nombres de archivo y código en ASCII**; la prosa en castellano, con sus acentos ([DEC-0021](./decisions/DEC-0021-ascii-en-nombres-y-codigo.md)).
5. **El gate de commit queda activo y probado.** Un gate que nunca se ha visto fallar no es un gate.
6. **`CURRENT.md` es el estado de ahora**, máximo 60 líneas. Nada de historial.
7. **No se inventa.** Lo que no puedas verificar se reporta como `UNKNOWN` y va a [`CHECKLIST.md`](./CHECKLIST.md) con dueño y condición de cierre.

---

## Qué es esto, en 30 segundos

`ia/` es la memoria persistente y el proceso de desarrollo asistido por IA. El código es el producto; `/ia` es cómo se decide, se ejecuta y se **comprueba**.

Tres cosas importantes antes de empezar:

1. **No es una librería.** Es un conjunto de documentos que se ejecutan como instrucciones, más tres mecanismos en Node que se corren.
2. **Cada invariante tiene un mecanismo que lo verifica** (`ia/tools/check-harness.mjs`). El harness no depende de tu disciplina. El check en verde **no** reemplaza la evidencia: solo impide que el proceso se degrade en silencio.
3. **Está en castellano neutro**, con lo técnico en inglés ([DEC-0010](./decisions/DEC-0010-idioma-castellano.md)). No cambies eso sin registrar una decisión.

Mapa completo: [`README.md`](./README.md). Diseño y por qué de cada pieza: [`DESIGN.md`](./DESIGN.md).

---

## Regla cero

**No inventes. Pregunta.**

Todo lo que no puedas verificar en el repositorio o en las respuestas del humano, se reporta como `UNKNOWN`. Un harness que arranca con datos inventados contamina cada sesión futura.

---

## Prerrequisitos

```bash
node --version    # >= 18 (22 recomendado)
git --version
```

Nada más. El harness no tiene dependencias, no tiene build y no compila. Para el motor de navegador propio basta con tener Chrome o Edge instalado.

Además necesitas **acceso de solo lectura a la carpeta de origen** (la ruta que te dieron). Si no puedes leerla, detente y pídesela al humano.

---

## Paso 0 — Crea tu `ia/` a partir de la referencia

La carpeta de origen es la **plantilla**. Tu repo necesita su **propia** `ia/`, que a partir de aquí es la fuente de verdad.

### 0.1 Copia, excluyendo los artefactos

```bash
# desde la raiz de TU repo (bash / Git Bash)
cp -r "<RUTA_ORIGEN>" ./ia
rm -rf ia/.harness                    # artefactos de la plantilla: no se copian
rm -f  ia/tools/harness-baseline.json # el ratchet es por proyecto: se sella en el Paso 6
```

```powershell
# equivalente en PowerShell
Copy-Item "<RUTA_ORIGEN>" -Destination ".\ia" -Recurse
Remove-Item "ia\.harness" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "ia\tools\harness-baseline.json" -Force -ErrorAction SilentlyContinue
```

**Por qué se borran esos dos:**

- `ia/.harness/` es salida de ejecución (capturas, respuestas, `last-run.json`) de la plantilla. No significa nada en tu proyecto y ya está en `ia/.gitignore`.
- `ia/tools/harness-baseline.json` congela los números **de la plantilla**. Si lo copias, tu ratchet arranca con techos ajenos. Se sella de nuevo sobre tu proyecto real.

### 0.2 No escribas en el origen

La carpeta de origen **solo se lee**. Nada de arreglarle un enlace, ni actualizarle un ejemplo, ni dejar tus notas ahí. Si detectas algo que crees que debería cambiar en la plantilla, apúntalo y coméntaselo al humano al final; no lo toques.

A partir de este momento, `ia/` en **tu** repo es la fuente de verdad. Las dos carpetas van a divergir, y eso es correcto.

### 0.3 Si ya existe `AGENTS.md` o `CLAUDE.md`

**No lo sobrescribas.** Si tu repo ya tiene instrucciones para agentes, son del proyecto y valen más que la plantilla.

1. Léelo completo.
2. Integra lo del harness **sin perder nada** de lo existente: conserva las secciones previas y añade las del harness (regla suprema, idioma, arranque de sesión, flujo, comandos, proyecto, convenciones).
3. Si hay conflicto real (una instrucción existente contradice una del harness, por ejemplo un vocabulario de estados distinto), **detente y pregunta** al humano. No resuelvas el conflicto por tu cuenta.

Si no existe ninguno de los dos, `ia/AGENTS.template.md` es tu punto de partida (Paso 3).

### 0.4 Verifica la copia

```bash
node ia/tools/check-harness.mjs        # debe ejecutar; los FAIL son esperados todavia
ls ia/tools ia/qa ia/protocol ia/decisions
```

Si el checker no arranca, la copia está incompleta. No sigas hasta que arranque.

---

## Paso 1 — Determina tu camino

| Camino | Cuándo | Qué harás |
|---|---|---|
| **A — Proyecto vacío** | El repo no tiene código de producto | Adoptar y esperar la primera feature |
| **B — Proyecto existente** | El repo ya tiene código | Adoptar **y además** ejecutar el bootstrap (Paso 8) |

Dilo explícitamente antes de seguir. Si no lo sabes, mira el repo y decide: ¿hay código de producto versionado, o no?

---

## Paso 2 — Preguntas al humano (obligatorias, antes de escribir nada)

Estas respuestas determinan los pasos 3 a 6. **No las adivines.** Pregúntalas juntas, en un solo bloque:

1. **Proyecto:** ¿nombre y propósito en una frase? ¿Para quién?
2. **Camino:** ¿A o B?
3. **Stack y comandos:** ¿cómo se instala, cómo se levanta en desarrollo, cómo se compila? Comandos exactos.
4. **Pruebas:** ¿cómo se corren? ¿Un runner (`npm test`) o scripts sueltos?
5. **Código:** ¿en qué carpetas vive el código de producto? (para `codeRoots`)
6. **Módulos:** ¿qué prefijos usarás para los IDs de feature? (`F-`, `B-`, `API-`…). Uno por módulo, consecutivo.
7. **Riesgo:** ¿qué áreas son dinero, stock, fiscal o integraciones? Se usarán para exigir revisión adversarial.
8. **Entornos con datos reales:** ¿hay staging o producción? ¿Qué operaciones son irreversibles ahí? (alimenta el catálogo de gates)
9. **Repositorio:** ¿remoto? ¿GitHub Actions u otro CI?
10. **Obsidian:** ¿usas Obsidian para navegar `/ia`?

Si el humano no tiene respuesta para algo, **queda como `UNKNOWN`** y se registra en [`CHECKLIST.md`](./CHECKLIST.md) con dueño y condición de cierre.

---

## Paso 3 — Escribe la puerta de entrada

```bash
# Si NO existia AGENTS.md ni CLAUDE.md en este repo:
cp ia/AGENTS.template.md AGENTS.md
#   rellena TODO lo que tenga <...>. Mantenlo por debajo de 140 lineas.
#
# Si YA existia: no lo sobrescribas. Integra las secciones del harness en el
# archivo existente (Paso 0.3) sin perder nada de lo que ya decia.

node ia/tools/check-harness.mjs --report
```

En el primer arranque es normal que salga con avisos: el presupuesto de `AGENTS.md`, los enlaces, los motores de QA. No lo arregles todavía: primero sella la línea base (Paso 6).

---

## Paso 4 — Ajusta `ia/tools/harness.config.json`

| Campo | Cómo lo decides |
|---|---|
| `codeRoots` | Las carpetas de código de la respuesta 5. **Mal puesto, la trazabilidad reporta `SKIP` y no vigila nada** |
| `tests.commands` | Las suites de la respuesta 4. Si son scripts sueltos, apunta al runner agregador, no a 60 entradas |
| `qa.order` | Déjalo `["playwright", "cdp", "gstack"]` salvo que tengas motivo. `cdp` funciona sin instalar nada |
| `reviewTriggers.risks` / `.areas` | `["alto"]` y las áreas de la respuesta 7 |
| `entryBudgets` | No los subas. Si `AGENTS.md` no cabe en 140 líneas, recorta: es señal, no problema |
| `binaryExtensions` | Déjalo. Avísate de binarios versionados en `/ia` |
| `exceptions.*` | Vacías al adoptar. **Cada excepción que añadas necesita su motivo escrito** en una decisión o en `specs/README.md` |

Si `codeRoots` y `tests.commands` quedan vacíos, los dos chequeos correspondientes se reportan como `SKIP`. Eso es honesto, pero significa que la mitad del harness no vigila nada. Dilo al humano.

---

## Paso 5 — Activa el gate de commit

**Requisito previo:** el repositorio tiene que ser git. Si no lo es, este es el momento: `git init` y un primer commit con lo que haya. Sin repositorio no hay gate, y sin gate el harness pierde su pieza central.

```bash
node ia/tools/install-hooks.mjs
```

Ese comando hace las tres cosas: activa `core.hooksPath`, comprueba que quedó bien, y **prueba que muerde** —provoca una violación temporal y ejecuta el hook directamente, sin crear ningún commit. Si dice `El gate muerde`, está listo.

**Por qué hace falta un comando y no viene ya activado:** `core.hooksPath` es configuración **local de cada repositorio**, y git no permite que un repositorio la imponga a quien lo clona. Un hook es código que se ejecuta en tu máquina: si viajara con el clon, clonar cualquier repositorio sería ejecución de código remoto. Así que **cada clon activa el suyo** — y el chequeo `gate-activo` te lo recuerda si lo olvidas.

En Windows funciona sin permisos de ejecución: Git for Windows corre los hooks vía `sh`. En Linux/macOS, si no arranca:

```bash
chmod +x ia/tools/git-hooks/pre-commit
```

**Si tu stack tiene gestor de paquetes con ciclo de vida**, añade ahí la llamada para que se active al instalar dependencias:

| Stack | Dónde |
|---|---|
| Node / `package.json` | `"scripts": { "prepare": "node ia/tools/install-hooks.mjs" }` |
| PHP / `composer.json` | `"scripts": { "post-install-cmd": ["node ia/tools/install-hooks.mjs"] }` |

Comprueba que **muerde** de verdad (el instalador ya lo hace, pero conviene verlo una vez con tus ojos). Provoca un fallo a propósito y confirma que el commit se bloquea:

```bash
# rompe algo del harness y trata de commitear
git commit --allow-empty -m "prueba del gate"    # debe FALLAR
```

Después arregla lo que rompiste. Si el gate no bloquea, **detente y repórtalo**: el harness pierde su pieza central.

Si hay CI (respuesta 9), copia `ia/tools/ci/harness.yml` a `.github/workflows/`.

---

## Paso 6 — Verifica y sella la línea base

```bash
node ia/tools/check-harness.mjs --report        # mira QUE dice, no solo si pasa
node ia/qa/selftest-cdp.mjs                     # 22/22 si hay Chrome o Edge
node ia/tools/run-tests.mjs                     # deja ia/.harness/last-run.json
node ia/tools/check-harness.mjs --update-baseline
```

El `--update-baseline` **congela el estado actual como techo**: a partir de ahí no se puede empeorar (es un ratchet, [DEC-0008](./decisions/DEC-0008-presupuestos-ratchet.md)). Sirve para adoptar un proyecto que ya trae deuda documental sin exigir una limpieza heroica.

Reglas del sellado:

- **Antes** de sellar, arregla lo que sea rápido y correcto: enlaces que faltan, decisiones sin indexar, el `AGENTS.md` recortado.
- **Después** de sellar, la única forma de bajar un número es con el cambio ya commiteado y justificado.
- No selles para tapar un fallo real (`FAIL`). Un `FAIL` es una violación de un invariante; el baseline solo gobierna los presupuestos y los ratchets.

---

## Paso 7 — Borra el ejemplo

La plantilla trae una feature de trabajo completa para que se vea el ciclo. **Bórrala**, o tus features convivirán con una ficticia:

```bash
rm -rf ia/specs/demo ia/plans/F-001
```

Y elimina la fila `F-001` de la tabla en [`specs/README.md`](./specs/README.md) (y el aviso que está debajo).

No borres `ia/qa/fixture/` ni `ia/qa/selftest-cdp.mjs`: son la autoprueba del motor, no un ejemplo de producto.

---

## Paso 8 — Bootstrap (solo camino B)

Si el repo ya tenía código, ejecuta [`protocol/11-bootstrap.md`](./protocol/11-bootstrap.md) **antes** de cualquier desarrollo nuevo. Reconstruye el estado real sin modificar comportamiento:

- Inventario → `ARCHITECTURE.md` → `PROJECT.md` → `MEMORY.md` → `CURRENT.md`
- Deuda evidente → `BACKLOG.md` (no la corrijas)
- Decisiones inferidas **solo** con evidencia en código o configuración. Si no hay evidencia, no inventes
- Cierra con un resumen compacto y `CURRENT.md` listo para continuar

Dos advertencias del propio protocolo: **no modifiques funcionalidad durante el bootstrap**, y lo que encuentres (documentos sin enlaces, presupuestos excedidos) es la foto honesta del punto de partida, no un fracaso.

Si tienes acceso a un subagente, `ia/agents/EXPLORER.md` está hecho exactamente para esto: mapear sin modificar.

---

## Paso 9 — Registra la adopción

1. **Decisión:** crea `ia/decisions/DEC-00NN-adopcion-<proyecto>.md` usando el **siguiente número libre** (mira [`decisions/INDEX.md`](./decisions/INDEX.md); no reutilices uno existente) con: camino elegido (A o B), `codeRoots`, `tests.commands`, `qa.order`, las áreas de riesgo y **cualquier excepción que hayas añadido**. Añádela al índice.
2. **Fecha las decisiones heredadas:** los `DEC-0001..0015` traen `<YYYY-MM-DD>`. Pon la fecha de adopción en todas: son las políticas que el proyecto acepta desde hoy.
3. **Marca la adopción** para que el harness pueda verificarla: pon `"adopted": true` en `ia/tools/harness.config.json`.
4. **No toques `ia/VERSION`:** marca de qué versión del harness es tu copia, y es lo que te permite actualizarla después ([`UPDATE.md`](./UPDATE.md)).
4. **Registra** en [`CHANGELOG.md`](./CHANGELOG.md) (hay una entrada plantilla).
5. **Rellena** [`CURRENT.md`](./CURRENT.md) con el estado real: qué es, en qué punto está, qué sigue. Máximo 60 líneas. Si te pasas, no estás describiendo el presente, estás escribiendo historial.
6. **`MEMORY.md`:** solo lo que ahorre una sesión futura. Si no tienes nada todavía, déjalo con los encabezados vacíos.

---

## Criterio de aceptación

La adopción está terminada cuando **todo esto es cierto y lo puedes demostrar**:

```
[ ] la copia se hizo SIN ia/.harness/ y SIN ia/tools/harness-baseline.json
[ ] no se escribio ni modifico NADA dentro de la carpeta de origen
[ ] node ia/tools/check-harness.mjs           -> 0 FAIL
[ ] AGENTS.md existe en la raiz, <= 140 lineas, sin <...> pendientes
[ ] ia/tools/harness.config.json -> "adopted": true, codeRoots y tests.commands con valores reales
[ ] git config core.hooksPath -> ia/tools/git-hooks
[ ] node ia/tools/install-hooks.mjs dice que el gate muerde (probado, no supuesto)
[ ] ia/tools/harness-baseline.json sellado (regenerado) despues de arreglar lo arreglable
[ ] el ejemplo F-001 borrado (specs/demo, plans/F-001, fila en specs/README.md)
[ ] DEC de adopcion creada con el siguiente numero libre, e indexada; y las decisiones heredadas con fecha
[ ] ia/VERSION sin tocar (marca de que version del harness es esta copia)
[ ] CHANGELOG y CURRENT reflejan la adopcion
[ ] (camino B) bootstrap hecho, con ARCHITECTURE/PROJECT/MEMORY rellenados
```

Cuando termines, reporta con el formato del router: `STATUS / CHANGED / VALIDATION / DOCUMENTATION / NEXT`, nombrando **qué está verificado** y **qué quedó en `UNKNOWN`**.

---

## Errores que se cometen al adoptar

| Error | Por qué duele |
|---|---|
| Rellenar `CURRENT.md` con el historial de la adopción | Es el error que más caro sale: se lee en cada sesión y se vuelve un changelog. Ya le pasó al harness de origen |
| Copiar el texto de la plantilla en vez de usarla | La spec y las tareas referencian requisitos **por ID**. Copiar rompe la trazabilidad |
| Escribir código de producto antes de la espec | Es la regla suprema. Sin spec, el alcance crece en silencio y nadie puede auditar qué se acordó |
| Dejar `codeRoots` vacío | La mitad del harness reporta `SKIP` y no vigila nada. Parece adoptado, no lo está |
| **Escribir en la carpeta de origen** | La plantilla deja de ser confiable para el próximo proyecto, y ya no sabes cuál de las dos copias es la buena |
| **Copiar `ia/.harness/` o el baseline** | Arrastras artefactos ajenos y techos de otro proyecto: el ratchet nace mintiendo |
| **Sobrescribir un `AGENTS.md` existente** | Borras las instrucciones del proyecto. En la práctica, irreversible |
| **Adaptar "un poco" el vocabulario o las plantillas** | Diverges de la plantilla en detalles que el checker y las plantillas esperan. Rompe el chequeo a la primera |
| Sellar la baseline con un `FAIL` pendiente | Convierte una violación en un techo. El invariante deja de existir |
| Acostumbrarse a `--no-verify` | El gate es la única pieza que no depende de la disciplina. Sin él, esto es documentación |
| Añadir excepciones sin motivo escrito | Cada excepción es un agujero en el invariante. Con motivo escrito, es una decisión |
| Cambiar el vocabulario de estados | Rompe el chequeo, las plantillas y las vistas de Obsidian a la vez |

---

## Relacionados

- Mapa del harness: [`README.md`](./README.md) · Router: [`INSTRUCTIONS.md`](./INSTRUCTIONS.md) · Diseño: [`DESIGN.md`](./DESIGN.md)
- Bootstrap: [`protocol/11-bootstrap.md`](./protocol/11-bootstrap.md) · Mecanismo: [`tools/check-harness.mjs`](./tools/check-harness.mjs)
- Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md) · Motores de QA: [`qa/README.md`](./qa/README.md)
