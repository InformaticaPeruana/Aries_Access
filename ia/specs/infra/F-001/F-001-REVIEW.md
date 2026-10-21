---
Feature: F-001
Veredicto: APROBADO_CON_OBSERVACIONES
Revisor: subagente REVIEWER (contexto fresco)
Fecha: 2026-10-21
---

# F-001 — REVIEW

Revisión adversarial ([DEC-0006](../../../decisions/DEC-0006-revision-adversarial.md) · [`../../../protocol/07-review.md`](../../../protocol/07-review.md)).

> Obligatoria por `Riesgo: alto` y por `Areas: [acceso-remoto, credenciales, portapapeles]` (ver `reviewTriggers` en [`../../../tools/harness.config.json`](../../../tools/harness.config.json)).
> La ejecuta un revisor con **contexto fresco**: spec + AC + diff. No recibe el razonamiento del implementador.
> **Este informe es de la ronda 3.** Las rondas 1 y 2 devolvieron `RECHAZADO`; sus hallazgos y su destino están en el TRACKING y en el §Historial de este archivo.

## Alcance revisado

- **Diff:** **no hay diff.** Revisión **pre-implementación** (ronda 3) sobre spec/plan/tareas: `ops/**` y `tests/**` no existen todavía (el propio `check-harness` reporta `SKIP ninguna codeRoot existe`). No se revisó código ejecutable.
- **Artefactos leídos:** `ia/specs/infra/F-001/F-001.spec.md`, `ia/plans/F-001/PLAN.md`, `T01`–`T09`, `F-001-TRACKING.md`, `DEC-0024/0025/0026`, `decisions/INDEX.md`, `CHECKLIST.md`, `GATES.md`, `CURRENT.md`, `ARCHITECTURE.md`, `PROJECT.md`, `MEMORY.md`, `specs/README.md`, `.gitignore`, `ia/tools/harness.config.json`, `ia/tools/run-tests.mjs`, `AGENTS.md`.
- **Requisitos verificados:** R1–R9 (cobertura AC) · **AC verificados:** AC1–AC13 (dueño único, dependencia y demostrabilidad declarada).
- **Contraste externo (fuente primaria, no memoria):** documentación y artefactos de Guacamole 1.6.0 — `auth-ban.html`, `reverse-proxy.html`, `postgresql-auth.html`, el ensamblado `guacamole-auth-jdbc-1.6.0` y `src/guacd/systemd/guacd.service.in`.

### Harness

`node ia/tools/check-harness.mjs --report` → **20 chequeos, 2 FAIL, 0 warn**.

- `gate-revision` — **esperado e ignorado**: falta `F-001-REVIEW.md`, que es este informe.
- `enlaces-rotos` — **mismo motivo**: los 3 fallos son sólo el enlace `./F-001-REVIEW.md` desde la spec y el TRACKING. Resuelven al guardar este archivo.
- **No hay ningún otro FAIL ni warn.** Los SKIP son esperados: `trazabilidad-codigo` (sin `codeRoots` todavía), `playwright`/`gstack` (DEC-0015), `ia-harness/CURRENT.md`.
- El checker **no** valida paridad AC↔tarea ni la numeración de scripts: los hallazgos 1, 3 y 4 no los detecta ninguna máquina.

## Qué se buscó

- Bugs que pasan el build pero rompen en producción (aquí: pasos que producen un stack que arranca y no autentica, o que expone de más).
- Casos borde: certificado, reenvío, IP dinámica, reinicio, fallo de dependencia externa.
- Desviaciones spec ↔ plan ↔ tarea ↔ decisión ↔ CHECKLIST ↔ CURRENT.
- AC sin dueño, con dueño duplicado o **no demostrable con un comando o una pantalla**.
- Requerimientos sin AC y tareas sin dependencia o con ciclo.
- Documentos que afirmen algo ya falso.
- Enlaces relativos con profundidad incorrecta desde `ia/specs/infra/F-001/` y `ia/plans/F-001/`.
- Riesgos operativos sobre `server01` (1 vCPU, disco 99 %, 21 contenedores) sin declarar.

Comprobaciones hechas además: paridad R1–R9 ↔ AC (todas cubiertas), tabla AC↔tarea (13 AC, 13 dueños, sin duplicados), grafo de dependencias `T01→T02→{T03,T04}→T05→T06→T07→{T08,T09}` (**sin ciclo**), y todos los enlaces relativos (el checker sólo marca el `-REVIEW.md` que este informe crea).

## Ronda 2 — verificación de hallazgos

| # | Hallazgo de la ronda 2 | Estado | Evidencia |
|---|------------------------|--------|-----------|
| H1 | El driver JDBC no viene en `guacamole-auth-jdbc-1.6.0.tar.gz` | **resuelto** | `F-001.spec.md:38`, `T04-postgresql.md:44`, `T05-tomcat-webapp.md:52`. Verificado contra el ensamblado upstream: sólo se empaqueta el `.jar` de la base y `postgresql/schema/`; el driver se baja aparte |
| H2 | AC4 no era demostrable (`curl -sI` da 200 sin extensión) | **resuelto** | `F-001.spec.md:74` exige `POST /api/tokens` → `authToken` + log de Tomcat y dice explícitamente que `curl -sI` **no** vale; repetido en `T05-tomcat-webapp.md:35,39` |
| H3 | Parámetros RDP inexistentes | **resuelto** | `F-001.spec.md:40` y `T08-conexion-rdp.md:41` usan `ignore-cert`, `disable-copy=false`, `disable-paste=false`; T08 dice "no existe un `enable-clipboard`". Los tres existen en `PROTOCOL_RDP` de 1.6.0 |
| H4 | R6 exigía límite de intentos sin declarar extensión ni probarlo | **resuelto** | `F-001.spec.md:39` nombra `guacamole-auth-ban`; AC13 lo prueba con `ban-max-invalid-attempts`/`ban-address-duration`; `T06-cuentas-totp.md:29,50` |
| H5 | FreeRDP 3 dado por hecho | **resuelto** | `T03-guacd.md:45` fija `freerdp2-dev` (2.11.5 en Ubuntu 24.04) y cita GUACAMOLE-2146 |
| H6 | CHECKLIST ítem 6 decía que bloqueaba T07 | **resuelto** | `CHECKLIST.md:51` → "Bloquea: T06 (crear usuarios). No bloquea T01–T05" |
| H7 | Referencias stale por el renumerado | **resuelto** | `CHECKLIST.md:58` → AC6; `GATES.md` → AC12; `CURRENT.md` → AC12; AC3 con `PGPASSWORD` en la spec y en T04 |
| H8 | `DEC-0025` afirmaba Tomcat 10+, Caddy y `UNKNOWN` | **resuelto** | `DEC-0025:13` (Tomcat 9), `:16` (nginx, no Caddy), `:30-36` (Enmiendas); no queda ningún `UNKNOWN` |
| H9 | Unicidad de dueño de AC | **resuelto** | un dueño por AC; `T01`, `T03` y `T04` dicen ahora "aporta evidencia (dueño: T05)" y no reclaman el cierre |
| H10 | El tope de heap no se verificaba | **resuelto** | `T05-tomcat-webapp.md:34` (`ps -o args= -C java` con `-Xmx`) |
| H11 | `DEC-0024` con `codeRoots` sin anotar; `INDEX` sin enmienda | **resuelto** | `DEC-0024:15` y `decisions/INDEX.md:30` |
| H12 | Puertos de Supabase inconsistentes | **resuelto** | `DEC-0026:13,23` y `PROJECT.md:47` son coherentes |
| H13 | `openssl s_client` sin comprobar la cadena | **resuelto** | `T07-nginx-tls.md:29` añade `-verify_return_error` y exige `Verify return code: 0` |

**Conclusión de la ronda 2: los 13 hallazgos quedan resueltos.** No queda ningún bloqueante heredado.

## Hallazgos de la ronda 3

| # | Severidad | Hallazgo | Evidencia | Acción |
|---|-----------|----------|-----------|--------|
| 1 | **mayor** | **El orden numérico de los scripts contradecía la secuencia de seguridad.** `ops/40-nginx-tls.sh` (T07) se ejecutaba **después** de `ops/50-cuentas-totp.sh` (T06), pero `PROJECT.md`/`AGENTS.md` mandan ejecutar `ops/10` … `ops/60` "en orden": seguir esa lista abre el 443 público **antes** de cambiar `guacadmin`/`guacadmin` y activar TOTP | `T06:20`, `T07:20` frente a `PROJECT.md:30,54`, `AGENTS.md:46`, `PLAN.md:10` | Renumerar (`40-cuentas`, `50-nginx`) **o** fijar el orden explícito. Debe quedar cerrado antes de T06 |
| 2 | **mayor** | **El límite de intentos queda mal dimensionado detrás de nginx.** Sin `RemoteIpValve` ni `X-Forwarded-For`, todos los clientes llegan como `127.0.0.1`: cinco fallos de **cualquiera** bloquean a **todos** (auto-DoS sobre el gateway RDP) y el historial guarda IPs falsas. AC13 se validaba **antes** de publicar, así que nada lo detectaba | `T05:55`, `T07:52`, `F-001.spec.md:39,83`; `auth-ban.html` y `reverse-proxy.html` de 1.6.0 | `proxy_set_header X-Forwarded-For` en el vhost + `RemoteIpValve` en `server.xml`, y **revalidar AC13 por el 443** |
| 3 | **mayor** | **AC13 citaba un mensaje que Guacamole 1.6.0 no emite.** El texto real es `Too many failed authentication attempts. Please try again later.` | `F-001.spec.md:83`, `T06:29`; `translations/en.json` de la extensión `ban` | Reescribir AC13 con el texto real y aceptar `HTTP 429` / `LOGIN.ERROR_TOO_MANY_ATTEMPTS` |
| 4 | menor | **AC13 no aparecía en los requerimientos de su tarea ni en la fila del PLAN** | `F-001.spec.md:83`, `F-001-TRACKING.md:42` frente a `PLAN.md:21`, `T06:16` | Añadir `AC13` a T06 y al PLAN |
| 5 | menor | **T03 no decía cómo atar `guacd` a loopback**: la unidad upstream es `guacd -f`, sin `-b` | `T03:26-32,42`; `guacd.service.in` de 1.6.0 | Fijar `bind-host = 127.0.0.1` |
| 6 | menor | **La unidad compartida no tenía dueño en disco**: `guacd` corre como `daemon`, y nadie creaba `/var/lib/guacd` | `T08:29,41-42`, `T03:45` | `install -d -o daemon -g daemon /var/lib/guacd /var/lib/guacd/drive` |
| 7 | menor | **AC11 sólo demostraba la mitad**: el comando comprobaba CR, no ausencia de no-ASCII | `T09:31` frente a `F-001.spec.md:81` | Añadir `LC_ALL=C grep -rlP '[^\x00-\x7F]' ops/` |
| 8 | menor | **AC10 pide "SKIP" pero el runner no lo imprime**: la evidencia del camino sin entorno queda dentro de `ia/.harness/tests/*.log` | `run-tests.mjs:86-91`, `T09:27-36` | Leer el log como evidencia |
| 9 | menor | **T09 dejaba abierto `.sh` o `.mjs`**: con `shell:true` en el Windows del repo, un `tests/smoke.sh` no arranca | `T09:22`, `run-tests.mjs:64`, `MEMORY.md:68` | Fijar `tests/smoke.mjs` |
| 10 | observación | **AC9 mezclaba versiones que no comparten esquema**: el driver es `postgresql-42.x`, no 1.6.0 | `F-001.spec.md:35` frente a `:79` | Aclararlo (hecho) |
| 11 | observación | **`systemctl restart guacd tomcat` era una suposición**: la unidad es `tomcat9` | `AGENTS.md:47`, `PROJECT.md:55` | Marcar la unidad como "la que fije T01" |
| 12 | observación | **`tomcat9` arranca en 8080 al instalarse** y el 8080 es de Evolution API: hay una ventana de conflicto | `T05:55`, `PROJECT.md:47` | Parar el servicio y cambiar el conector **antes** del primer arranque |
| 13 | observación | **Compilar `guacd` en 1 vCPU satura el host compartido** y el PLAN no declaraba el impacto del build | `PLAN.md:28-29`, `T03:42-47` | Declararlo en T03 (`nice`/`ionice`, sin `make -j`) |
| 14 | observación | **`webroot` necesita el 80 entrante desde Internet** y el CHECKLIST sólo declaraba el 443 | `CHECKLIST.md:60-66`, `T07:53` | Añadir el 80 a la condición de cierre, o fijar `dns-01` |

## AC sin evidencia suficiente

No hay AC **sin dueño** ni con dueño duplicado (13 AC, 13 tareas). Nada está ejecutado —es pre-implementación—, así que todos los AC están `pending` por definición y eso no es un hallazgo.

- **AC13** — no era demostrable **tal como estaba escrito**: exigía observar `"not allowed at this time"`, cadena que el producto no emite (hallazgo 3).
- **AC11** — la evidencia prevista sólo cubría el retorno de carro (hallazgo 7).
- **AC10** — el camino `SKIP` existe, pero la evidencia prevista no lo mostraba en la salida que se archiva (hallazgo 8).

## Veredicto

**APROBADO_CON_OBSERVACIONES** — Los 13 hallazgos de la ronda 2 están resueltos y verificados contra la documentación y los artefactos de Guacamole 1.6.0, no contra la memoria. No queda nada que rompa el despliegue **siguiendo el PLAN y el orden de tareas** (T06 antes de T07 está declarado como regla no negociable en tres sitios). Quedan dos hallazgos mayores de seguridad/operación que no bloquean el arranque pero sí deben cerrarse antes de publicar el 443, más menores de trazabilidad y de evidencia.

Condiciones para cerrar:

1. **Antes de T06:** resolver la contradicción de numeración de scripts (hallazgo 1).
2. **Antes de T07:** `X-Forwarded-For` en el vhost y `RemoteIpValve` en Tomcat (hallazgo 2), y revalidar AC13 **por el 443**.
3. **Antes de cerrar AC13:** corregir el mensaje citado (hallazgo 3).
4. **Antes de T03/T08:** binding de `guacd` a loopback y creación/propiedad de `/var/lib/guacd` (hallazgos 5 y 6).
5. **Documentación:** AC13 en T06 y en el PLAN (4); evidencia de AC11 y AC10 (7, 8); `tests/smoke.mjs` (9); AC9, unidad de Tomcat y 8080 del `tomcat9` (10–12).
6. **Riesgos a declarar:** coste de CPU del build en 1 vCPU (13) y 80 entrante para `webroot` (14).

Ninguna exige rediseño: son correcciones de orden, de configuración declarada y de redacción de AC. Al ser pre-implementación, la revisión **post-implementación** sigue siendo obligatoria por `Riesgo: alto`.

## Cierre de las observaciones

El implementador aplicó las 14 observaciones en la misma sesión, después de este veredicto. El veredicto **no se reescribió**: esto es lo que cambió.

| # | Cambio aplicado |
|---|-----------------|
| 1 | Scripts renumerados: `ops/40-cuentas-totp.sh` (T06) y `ops/50-nginx-tls.sh` (T07). El orden numérico **es** ahora el orden de ejecución, así que "10 … 60 en orden" deja de ser contradictorio. |
| 2 | `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` en T07 y `RemoteIpValve (internalProxies="127.0.0.1")` en T05; AC13 se revalida por el 443 tras T07. |
| 3 | AC13 y T06 citan el mensaje real (`Too many failed authentication attempts…`, `LOGIN.ERROR_TOO_MANY_ATTEMPTS`, HTTP 429). |
| 4 | `AC13` añadido a los requerimientos de T06 y a la columna de validación del PLAN. |
| 5 | `bind-host = 127.0.0.1` en `/etc/guacamole/guacd.conf` (o `-b` en la unidad), declarado en T03. |
| 6 | T03 crea `/var/lib/guacd` y `/var/lib/guacd/drive` con dueño `daemon`. |
| 7 | T09 comprueba CR **y** no-ASCII en `ops/`. |
| 8 | T09 lee `ia/.harness/tests/*.log` como evidencia del SKIP. |
| 9 | La suite se fija como `tests/smoke.mjs` (Node). |
| 10 | AC9 distingue la versión 1.6.0 del stack de la numeración propia del driver (`postgresql-42.x`). |
| 11 | `AGENTS.md` y `PROJECT.md` nombran `tomcat9` y remiten a T01 como confirmación. |
| 12 | T05 para `tomcat9` tras instalarlo y cambia el conector **antes** del primer arranque. |
| 13 | T03 declara el impacto del build (`nice -n 19`, sin `make -j`, ventana acordada). |
| 14 | El ítem 8 del CHECKLIST incluye el **80 entrante** para `webroot` (o `dns-01` si no puede abrirse). |

## Historial de rondas

| Ronda | Veredicto | Qué la motivó |
|---|---|---|
| 1 | `RECHAZADO` | 5 bloqueantes: Tomcat 10+ incompatible con Guacamole 1.6.0; faltaban la extensión JDBC y el driver; se podía instalar antes de liberar disco; el 443 se abría antes de endurecer las cuentas; R6 sin AC. |
| 2 | `RECHAZADO` | 2 bloqueantes: el driver JDBC no viaja en el tarball (el plan lo afirmaba) y AC4 no era demostrable (`curl -sI` da 200 sin extensión). Más 3 mayores (parámetros RDP inexistentes, `ban` sin declarar, FreeRDP 3 dado por hecho). |
| 3 | `APROBADO_CON_OBSERVACIONES` | Ningún bloqueante heredado. 2 mayores de seguridad/operación y 12 menores/observaciones, todas cerradas en §Cierre de las observaciones. |

## Relacionados

- Spec: [`F-001.spec.md`](./F-001.spec.md) · TRACKING: [`F-001-TRACKING.md`](./F-001-TRACKING.md) · Plan: [`../../../plans/F-001/PLAN.md`](../../../plans/F-001/PLAN.md)
- Contrato: [`../../../agents/REVIEWER.md`](../../../agents/REVIEWER.md) · Deuda: [`../../../DEBT.md`](../../../DEBT.md) · Gates: [`../../../GATES.md`](../../../GATES.md)
