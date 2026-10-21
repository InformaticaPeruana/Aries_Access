# UPDATE — llevar una copia del harness a una version nueva

> El harness mejora. Los proyectos que lo adoptaron **no** se actualizan solos. Este es el procedimiento, y su regla central es una: **nunca sobrescribas un archivo del proyecto.**

Ver [DEC-0018](./decisions/DEC-0018-version-actualizacion.md).

---

## Antes de tocar nada

```bash
cd <proyecto>
git status                  # tiene que estar limpio
git checkout -b harness-vX.Y.Z
cat ia/VERSION              # version ACTUAL de esta copia
cat <ruta-de-la-plantilla>/ia/VERSION   # version a la que quieres llegar
```

Si el proyecto **no** esta bajo git, para. Haz una copia de seguridad de `ia/` primero. Una actualizacion sin red de seguridad es una operacion de una sola direccion ([protocol/08-gates.md](./protocol/08-gates.md)).

---

## Los tres grupos de archivos

Esta es la parte que decide si la actualizacion sale bien o destruye datos.

### A. Del harness — se reemplazan

Son de la plantilla. Se copian encima sin miedo.

```
ia/VERSION
ia/.gitattributes              ia/.gitignore
ia/README.md                   ia/DESIGN.md
ia/ADOPT.md                  ia/UPDATE.md
ia/AGENTS.template.md          ia/OBSIDIAN.md
ia/INSTRUCTIONS.md
ia/protocol/**                ia/agents/**
ia/tools/check-harness.mjs     ia/tools/run-tests.mjs
ia/tools/browser-cdp.mjs       ia/tools/git-hooks/**
ia/tools/ci/**
ia/qa/README.md                ia/qa/selftest-*.mjs
ia/qa/*.example.mjs            ia/qa/fixture/**
ia/decisions/_template.md      ia/decisions/DEC-0001..<ultima heredada>
ia/specs/_template.md          ia/specs/_tracking_template.md
ia/specs/_review_template.md
ia/plans/_plan_template.md     ia/plans/_task_template.md
ia/changes/_template.md
```

### B. Del proyecto — NO se tocan, nunca

Tienen tu trabajo. Si algo de aqui aparece modificado en la plantilla, **no lo copies**: son dos proyectos distintos.

```
ia/CURRENT.md          ia/MEMORY.md           ia/PROJECT.md
ia/ARCHITECTURE.md     ia/CHANGELOG.md        ia/BACKLOG.md
ia/CHECKLIST.md        ia/DEBT.md            ia/KNOWN-FAILURES.md
ia/GATES.md
ia/specs/<modulo>/**   ia/plans/<FEATURE-ID>/**
ia/changes/CHANGE-*.md ia/research/**         ia/archive/**
ia/decisions/DEC-<las tuyas>.md
ia/qa/smoke.mjs        ia/qa/form.mjs         (tus pruebas, derivadas de los .example)
```

### C. Mixtos — se fusionan a mano, con juicio

Contienen estructura de la plantilla **y** datos tuyos. Reemplazarlos borra tu trabajo; ignorarlos deja la estructura vieja.

| Archivo | Que se actualiza | Que se conserva |
|---|---|---|
| `ia/decisions/INDEX.md` | Las filas de las decisiones heredadas que cambiaron | **Tus** decisiones |
| `ia/specs/README.md` | La estructura, las plantillas y la seccion de diferencias aceptadas | **Tu** tabla de features |
| `ia/tools/harness.config.json` | Las claves nuevas y los valores por defecto que cambiaron | `adopted`, `codeRoots`, `tests.commands`, `qa.order`, tus excepciones |
| `ia/tools/harness-baseline.json` | Nada: es tuyo | Todo. **No lo copies de la plantilla** |
| `ia/DASHBOARD.md`, `ia/OBSIDIAN.md` | Si los personalizaste, decide caso por caso | — |

`harness-baseline.json` merece su linea: es el ratchet **de tu proyecto**. Copiar el de la plantilla te pondria techos ajenos.

---

## Procedimiento

1. **Rama nueva y `git status` limpio.** Sin red de seguridad, no empieces.
2. **Copia solo el grupo A.** Desde la plantilla actualizada, sobre tu `ia/`:

   ```bash
   # ejemplo con rsync; en Windows sirve robocopy o copiar y pegar
   rsync -a --existing --ignore-times <plantilla>/ia/VERSION ./ia/
   # repite por archivo o por carpeta del grupo A. NO uses un -a global sobre ia/.
   ```

3. **Fusiona el grupo C a mano**, mirando el diff. En `harness.config.json` lo importante es **añadir las claves nuevas sin borrar las tuyas**.
4. **No toques el grupo B.** Si el diff de la plantilla incluye cambios en un archivo del grupo B, es que son dos proyectos distintos: ignorálos.
5. **Actualiza `ia/VERSION`** al numero nuevo. Es el paso que dice "esta copia esta al dia".
6. **Verifica:**

   ```bash
   node ia/tools/check-harness.mjs --report    # los chequeos, y los nuevos que traiga
   node ia/qa/selftest-cdp.mjs                 # el motor sigue sano
   node ia/qa/selftest-perfil.mjs              # el perfil tambien
   node ia/tools/run-tests.mjs                 # tus pruebas siguen pasando
   git diff --stat                             # lee lo que cambio antes de commitear
   ```

7. **Registra** en `ia/CHANGELOG.md`: version nueva, que archivos del harness cambiaron, y qué claves nuevas entraron en la config.
8. **Commit** con `chore(harness): actualizar a vX.Y.Z`. Y revisa el diff de los grupos B y C **una vez mas** antes de cerrar la rama.

---

## Como saber si una copia quedo vieja

```bash
cat ia/VERSION
```

Y el chequeo lo reporta en cada corrida:

```
node ia/tools/check-harness.mjs --report | grep -i version
```

Si un proyecto esta en `1.0.0` y la plantilla va por `1.1.0`, hay camino por recorrer. El chequeo **no** compara contra la red —no debe depender de internet— asi que la comparacion la haces tú con las dos rutas.

---

## Que puede salir mal

| Sintoma | Causa | Arreglo |
|---|---|---|
| `CURRENT.md` aparece con `<...>` o con texto de plantilla | Copiaste un archivo del grupo B | `git checkout ia/CURRENT.md` y vuelve a empezar |
| El chequeo reporta `0 FAIL` pero el proyecto perdio sus decisiones | Fusionaste `INDEX.md` reemplazando en vez de añadir | `git checkout ia/decisions/INDEX.md`, fusiona a mano |
| El ratchet salta con techos que no son tuyos | Copiaste `harness-baseline.json` | Bórralo y `--update-baseline` |
| `check-harness` no arranca tras copiar | Copia incompleta: falta un archivo del grupo A | El chequeo `version-harness` te dice cuál |
| Perdiste trabajo del grupo B | Lo sobrescribiste | `git reflog` / `git checkout <sha> -- ia/<archivo>`. Por esto existe la rama del paso 1 |

---

## Migraciones

Cambios que obligan a hacer algo a mano al actualizar. Lo más nuevo arriba.

### 3.1.0 — el gate se activa con un comando, y un chequeo lo exige

**Nuevo:**
- [`tools/install-hooks.mjs`](./tools/install-hooks.mjs): activa el gate, verifica la configuración y **prueba que muerde** (con una violación temporal, sin crear ningún commit).
- Chequeo `gate-activo`: falla si el repositorio es git y el hook del harness no está activo. Se apaga en integración continua, donde no se commitea.

**Qué revisar en tu proyecto:**
1. Corre `node ia/tools/install-hooks.mjs`. Si el chequeo `gate-activo` te lo estaba pidiendo, esto lo cierra.
2. Si tu stack tiene ciclo de vida de paquetes, añade la llamada — la tabla está en [`ADOPT.md`](./ADOPT.md) Paso 5.

### 3.0.0 — nombres de archivo en inglés, y las condiciones nuevas

**Renombrados** (el contenido no cambia, solo el nombre):

| Antes | Ahora |
|---|---|
| `ia/ADOPTAR.md` | `ia/ADOPT.md` |
| `ia/ACTUALIZAR.md` | `ia/UPDATE.md` |
| `ia/DEUDA.md` | `ia/DEBT.md` |
| `ia/instrucciones.md` | `ia/INSTRUCTIONS.md` |
| `ia/protocolo/` | `ia/protocol/` |
| `01-rol-objetivo` · `02-ciclo` · `06-validacion` · `07-revision` · `10-memoria-tokens` · `12-subagentes` · `13-cierre-git` · `14-contexto` | `01-role-goal` · `02-cycle` · `06-validation` · `07-review` · `10-memory-tokens` · `12-subagents` · `13-close-git` · `14-context` |

**Qué revisar en tu proyecto — esto es lo que significa adoptar las condiciones:**

1. **Nombres y código en ASCII.** El chequeo `ascii` señala lo que haya que corregir en tus propios archivos. La prosa sigue en castellano, con sus acentos.
2. **Enlaces que resuelvan.** `enlaces-rotos` señala todo enlace relativo que no llegue a un archivo existente. Empieza por los que apunten a los nombres viejos de la tabla.
3. **`GATES.md`:** el campo `Recuperabilidad comprobada` es obligatorio **desde el 2026-10-14**. Tus entradas anteriores quedan exentas y no se reescriben ([DEC-0023](./decisions/DEC-0023-campo-nuevo-desde-su-fecha.md)).
4. **Los nombres viejos en tus documentos:** búscalos con `grep -rl -e ADOPTAR.md -e ACTUALIZAR.md -e DEUDA.md -e instrucciones.md -e protocolo/ ia/`, y con `-Encoding UTF8` o con Node: la consola de Windows miente con los acentos y las eñes.

**El criterio de cierre.** La actualización **está terminada cuando `node ia/tools/check-harness.mjs` sale en verde en tu repositorio**. Los chequeos nuevos son la lista exacta de lo que hay que adoptar en tus artefactos; si algo queda rojo, falta adoptarlo. Y no se silencia con `--no-verify`: eso deja el mecanismo sin efecto y la copia a medias.

### 2.0.0 — `ia/DISEÑO.md` pasa a `ia/DESIGN.md`

**Motivo:** era el único nombre del harness con un carácter no ASCII (la eñe). El mismo nombre en NFC y en NFD son **bytes distintos**, así que git puede verlos como archivos diferentes en otra plataforma; y las herramientas habituales no lo encuentran al buscar. El contenido no cambia, solo el nombre.

**Qué hacer:**
1. Borra `ia/DISEÑO.md` de tu copia.
2. Copia `ia/DESIGN.md` del grupo A.
3. Revisa tus propios documentos: `grep -rl 'DISEÑO.md' ia/`. Si tu consola no lee UTF-8, ese `grep` puede devolver 0 coincidencias **falsamente** (ver la trampa en `MEMORY.md`): búscalo con Node.
4. `node ia/tools/check-harness.mjs` — el chequeo `version-harness` avisa si `ia/DESIGN.md` no está.

**Regla nueva desde esta versión:** nombres de archivo y código en **ASCII**; la prosa sigue en **castellano** con sus acentos ([DEC-0021](./decisions/DEC-0021-ascii-en-nombres-y-codigo.md)). El chequeo `ascii` lo verifica.

## Mejorar el harness (mantenimiento de la plantilla)

Esto es lo que se hace **en la plantilla**, nunca en la copia de un proyecto. La regla que lo resume: **el harness se mejora con el harness** — cada mejora se valida con los mecanismos que ya existen antes de salir.

**Los pasos:**

0. **El gate de la plantilla tiene que estar activo.** Una vez por clon:
   ```bash
   git config core.hooksPath ia/tools/git-hooks
   ```
   Sin él se puede commitear en rojo sin enterarse. **Pasó**: se empujó un commit con el chequeo `ascii` en `FAIL` porque el gate no estaba activo en el repositorio de la plantilla — el mismo Paso 5 que se le exige al proyecto que adopta. El mecanismo estaba escrito; simplemente no estaba enchufado.

1. **Mira el estado antes de empezar:** `ia-harness/CURRENT.md` (dónde va el trabajo) y `ia-harness/BACKLOG.md` (lo identificado y no hecho). Los dos viven en la raíz del **repositorio de la plantilla** y **no viajan a los proyectos**: por eso van sin enlace, porque en tu copia no existen. Sin mirarlos, se repiten ideas y se pierden hallazgos.
2. **Trabaja solo en la plantilla.** Si el cambio nace resolviendo algo de un proyecto, se hace igual aquí; si es específico de ese proyecto, no es una mejora del harness.
2. **Edita los archivos del grupo A**, o añade el nuevo. Si añades uno del grupo A, **decláralo en `harness.config.json` → `update.criticalFiles`**, o el chequeo no lo protegerá y una copia podrá quedar sin él sin que nadie lo note (pasó: `selftest-perfil.mjs` quedó fuera de la lista la primera vez).
3. **Verifica antes de commitear:**
   ```bash
   node ia/tools/check-harness.mjs          # 0 FAIL
   node ia/qa/selftest-harness.mjs          # 17/17  <- que los chequeos sigan detectando
   node ia/qa/selftest-cdp.mjs              # 22/22
   node ia/qa/selftest-perfil.mjs           # 8/8
   ```
   Si tocas el vocabulario, las plantillas o los índices, revisa además que la feature de ejemplo y las decisiones sigan cuadrando.

   **Obligación que trae `selftest-harness`:** un chequeo nuevo sin su caso de prueba está **incompleto**. Añadir un chequeo son dos ediciones, no una: el chequeo y su caso. Si el caso no se puede escribir (porque depende del entorno), se declara en la lista de excepciones del propio archivo con el motivo — nunca se inventa un caso falso, que es peor que uno ausente.
4. **Sube `ia/VERSION`** y escribe la `nota:` con lo que cambió. **Sin esto, los proyectos no se enteran de que hay algo nuevo.** Es el paso que más fácil se olvida y el único que hace útil todo lo demás.
5. **Commit y push**, con Conventional Commits. Los commits son el historial detallado: `git log` en la plantilla es lo que lee quien va a actualizar.
6. **Si el cambio toca la *forma* del harness** (archivos nuevos, cambios en los tres grupos, vocabulario, estructura): añade su decisión, actualiza [`DESIGN.md`](./DESIGN.md) y, si aplica, el grupo correspondiente en este documento.

**Convención de versión.** Sin una, el número no significa nada:

| Cambio | Versión | Los proyectos… |
|---|---|---|
| Correcciones y mejoras de redacción que no cambian reglas | **patch** `1.0.1` | actualizan cuando les apetezca |
| Reglas, mecanismos o archivos nuevos | **minor** `1.1.0` | **deberían actualizar** |
| Cambio que obliga a migrar (renombrar archivos, cambiar el vocabulario, mover grupos) | **major** `2.0.0` | **tienen que actualizar**, y hay que documentar la migración aquí |

**Convención de redacción.** No repitas en prosa un número que ya informa un mecanismo: "los 19 chequeos", "los 20 casos", "8 trampas" se quedan obsoletos en la siguiente mejora y **nada lo verifica**. Escribe el comando que lo dice (`--report`) en vez del número. Y los pasajes **históricos** —decisiones y `CHANGELOG`— no se reescriben: sus números son un hecho de su fecha, no un dato a mantener.

**Y lo que no se hace:** mejorar el harness tocando la copia de un proyecto. Ese camino produce una versión que no existe en ningún otro sitio, que es exactamente cómo el harness anterior acabó con dos copias divergentes.

## Un hallazgo que no es del ítem en curso va al backlog, no al código

Dos reglas de trabajo, y las dos vienen de haberlas incumplido:

1. **Trabaja un ítem del backlog a la vez.** Se toma, se cierra con su verificación, y se marca. Lo que aparezca en el camino y **no sea de ese ítem** se anota en el backlog **en el momento**; no se arregla al vuelo. Arreglar al vuelo encadena cambios: cada parche tapa al anterior y el siguiente error es el que manda.
2. **Si es la tercera vez que arreglas algo parecido, para y nombra la clase.** Una clase nombrada produce un ítem y una decisión; cuatro instancias parcheadas producen cuatro parches y ninguna lección.

## Relacionados

- Version: [`VERSION`](./VERSION) · Decision: [DEC-0018](./decisions/DEC-0018-version-actualizacion.md)
- Adopcion: [`ADOPT.md`](./ADOPT.md) · Gates: [`protocol/08-gates.md`](./protocol/08-gates.md)
- Mecanismo: [`tools/check-harness.mjs`](./tools/check-harness.mjs) · Mapa: [`README.md`](./README.md)
