---
Feature: F-001
Estado: in_progress
---

# F-001 — TRACKING

Bitácora de ejecución. **Único lugar donde vive el estado de las tareas**, junto al `Status:` de cada `T0n` ([DEC-0003](../../../decisions/DEC-0003-estados-cierre.md), [DEC-0009](../../../decisions/DEC-0009-tareas-ordenes-trabajo.md)).

`done` exige evidencia de **todos** sus AC. Si falta alguno → `partial`, con lo que falta, quién lo cierra y bajo qué condición. `blocked` es para dependencias externas.

| Tarea | Objetivo | Depende de | Estado | Evidencia |
|-------|----------|------------|--------|-----------|
| [T01](../../../plans/F-001/T01-verificacion-previa.md) | Verificación previa de `server01` (solo lectura) | - | done | 2026-10-21: informe abajo (SO, disco 46 GB, puertos, Apache, ausencias, RDP a `192.168.18.41`) |
| [T02](../../../plans/F-001/T02-liberar-disco.md) | Liberar disco (gate) — **no aplica** | T01 | done | 2026-10-21: 46 GB libres medidos en T01; **no se borró nada** |
| [T03](../../../plans/F-001/T03-guacd.md) | `guacd` 1.6.0 como servicio | T02 | done | 2026-10-21: `guacd version 1.6.0`, `enabled`+`active`, `LISTEN 127.0.0.1:4822`, `configure` con `RDP ... yes` y `freerdp 2.x` |
| [T04](../../../plans/F-001/T04-postgresql.md) | PostgreSQL, esquema y usuario de base | T02 | done | 2026-10-21: clúster `16/guacamole` **online en 127.0.0.1:5434**, `guacamole_db` con **23 tablas** y `guacadmin`; el 5432 de Supabase sin tocar |
| [T05](../../../plans/F-001/T05-tomcat-webapp.md) | Tomcat 9, webapp y extensiones en `127.0.0.1:8081` | T03, T04 | done | 2026-10-21: Tomcat **9.0.123** + webapp **1.6.0**, `-Xmx512m`, extensión JDBC y driver 42.7.2; **`authToken` real** con `dataSource: postgresql` |
| [T06](../../../plans/F-001/T06-cuentas-totp.md) | Cuentas endurecidas, TOTP y límite de intentos | T05 | partial | 2026-10-21: `guacadmin`/`guacadmin` **rechazado**, usuario `humberto` creado, TOTP instalado y **exigido** (`TOTP.INFO_ENROLL_REQUIRED`), ban con **HTTP 429** tras 5 fallos. **Falta:** enrolar el dispositivo del usuario y comprobar el código caducado (AC5 3/3) |
| [T07](../../../plans/F-001/T07-apache-tls.md) | vhost de Apache y TLS público | T06 | partial | 2026-10-23: **lado `server01` hecho** — 443 con certificado propio, `200` por `https://127.0.0.1/guacamole/`, ACL a `192.168.18.203`, y el ban separa por IP de cliente con `X-Forwarded-For`. **Falta el nginx del usuario** para AC6 |
| [T08](../../../plans/F-001/T08-conexion-rdp.md) | Conexión RDP a la VM Windows | T07 | pending | — |
| [T09](../../../plans/F-001/T09-smoke-test.md) | Suite smoke, `tests.commands` y reinicio | T07 | pending | — |

## Estado por AC

Un AC, una tarea dueña ([`F-001.spec.md`](./F-001.spec.md) §Criterios de aceptación).

| AC | Requerimiento | Tarea | Estado | Evidencia |
|----|---------------|-------|--------|-----------|
| AC1 | R1 | T05 | done | `guacd` y `guacamole-tomcat` `enabled`+`active`; clúster `16/guacamole` online |
| AC2 | R3 | T05 | done | `127.0.0.1:4822`, `127.0.0.1:5434`, `[::ffff:127.0.0.1]:8081`; **ninguno en `0.0.0.0`**. El 443 escucha en todo, pero desde `192.168.18.41` responde **403** (solo `192.168.18.203` y loopback) |
| AC3 | R5 | T04 | done | `\dt` con `guacamole_user`/`guacamole_db` lista las tablas `guacamole_*` (23) |
| AC4 | R5 | T05 | done | `POST /api/tokens` → `authToken` con `dataSource: postgresql` |
| AC5 | R6 | T06 | partial | 1/3 y 2/3 hechos: `guacadmin`/`guacadmin` rechazado y TOTP exigido (`TOTP.INFO_ENROLL_REQUIRED`). Falta 3/3: código TOTP caducado, que exige el dispositivo enrolado (usuario) |
| AC6 | R4 | T07 | pending | — |
| AC7 | R7 | T08 | pending | — |
| AC8 | R7 | T08 | pending | — |
| AC9 | R2 | T05 | done | guacd 1.6.0 · webapp 1.6.0 (`pom.properties`) · extensión 1.6.0 · driver 42.7.2 · Tomcat 9.0.123 (JVM built 21, corre en Java 17) |
| AC10 | R9 | T09 | pending | — |
| AC11 | R8 | T09 | pending | — |
| AC12 | R1 | T09 | pending | Gate: exige reiniciar `server01` (ver Notas) |
| AC13 | R6 | T06 | done | 5 fallos desde la misma IP → **HTTP 429** `Too many failed authentication attempts.` (`ban-max-invalid-attempts: 5`, `ban-address-duration: 300000`) |

## T01 — verificación de `server01` (2026-10-21 21:25)

Salida real, sin editar. **Solo lectura**; ningún comando de escritura.

| Qué | Medido |
|---|---|
| SO / kernel | Ubuntu 24.04.4 LTS (noble) · 6.8.0-142-generic · VMware |
| Red | `server01` · `ens160` `192.168.18.70/24` · up 20 días · load 0.38 |
| Disco | `/` 97G, **46G libres (51%)** · `/boot` 1.6G libres |
| RAM | 7942 MB totales, **4597 MB disponibles** · swap 826/4096 usada |
| `:80` | **Apache/2.4.58**, vhost `000-default`, sin SSL |
| `:443` | **libre** |
| `:8080` | **ocupado** (Evolution API) |
| `:8081` | **libre** |
| `:5432`, `:5433`, `:6543`, `:8000`, `:3000`, `:5678`, `:8443` | ocupados (Supabase, Chatwoot, n8n, Kong) |
| `:5434` | **libre** |
| `:4822` | **libre** |
| `:3306`, `:33060` | MySQL local |
| **nginx** | **no instalado** (ni unidad, ni binario) |
| PostgreSQL | **no instalado en el host** (el de Supabase es un contenedor) |
| Tomcat | no instalado · **`tomcat9` sin candidato en noble** · `tomcat10` 10.1.55 disponible |
| Java | no instalado · `openjdk-17` y `openjdk-21` disponibles |
| `guacd` | no instalado |
| `sudo` | **pide contraseña** (el usuario está en el grupo `sudo`) |
| Docker | servicio activo, 3 bridges · el usuario **no** está en el grupo `docker` |
| Apache | sin `proxy`, `proxy_http`, `proxy_wstunnel`, `ssl` ni `headers` habilitados |

### Consecuencias (cambian el plan)

1. **T02 (liberar disco) no hace falta.** Hay 46 GB libres: el dato de "99% / 1.4 GB" del inventario de partida está desactualizado. El gate de borrado **se cancela** y T03/T04 dejan de depender de él.
2. **El proxy del host es Apache, no nginx.** R4 y DEC-0026 nombran nginx; hay que reescribirlos para Apache (`mod_proxy_http`, `mod_proxy_wstunnel`, `mod_ssl`, `mod_headers`), sin tocar el vhost `000-default`.
3. **`tomcat9` no está en los repositorios de noble.** Se instala del **tarball oficial de Apache** y la unidad de systemd la creamos nosotros: desaparece la incógnita del "nombre real de la unidad".
4. **`sudo` con contraseña:** T03–T08 no pueden ejecutarse solas. Hace falta una vía (NOPASSWD acotado o que el usuario corra los scripts).

### VM Windows de destino (medida)

| Dato | Valor |
|---|---|
| Nombre | `DESKTOP-8T09V6F` |
| SO | **Windows 10 Pro** (build 19041, VMware7,1) |
| IP | **`192.168.18.41/24`**, gw `192.168.18.1`, origen **Manual** (estática) |
| RDP | `fDenyTSConnections=0` (habilitado) · **NLA activo** · `SecurityLayer=2` · puerto 3389 |
| Alcance desde `server01` | **`192.168.18.41 3389 OK`** (TCP abierto; el ping ICMP no responde, es lo normal) |
| Cuentas locales | `usuario` (habilitada) |

### Lo que falta de T01

- `ss -ltnp` con nombres de proceso y `apache2ctl -S` completos: requieren `sudo` sin contraseña (pendiente de la entrada NOPASSWD).
- El **usuario y la contraseña** del guest para la conexión de T08: no son un dato de T01, se cargan en Guacamole.

## T03 — `guacd` 1.6.0 (2026-10-21 21:52) — `done`

Ejecutado con `sudo bash ops/10-guacd.sh` (idempotente, no interactivo).

```
$ guacd -v
Guacamole proxy daemon (guacd) version 1.6.0
$ systemctl is-enabled guacd ; systemctl is-active guacd
enabled
active
$ ss -ltn | grep 4822
LISTEN 0      5          127.0.0.1:4822       0.0.0.0:*
$ ps -o user=,args= -C guacd
daemon   1262158 /usr/local/sbin/guacd -f -b 127.0.0.1
```

Del resumen de `configure` (`/var/log/guacd-build.log`):

```
     freerdp ............. yes (2.x)
      RDP ........... yes
   FreeRDP plugins: /usr/lib/x86_64-linux-gnu/freerdp2
```

- Toolchain instalado: `build-essential` + `freerdp2-dev 2.11.5` + cairo/pango/ssh2/telnet/vnc/pulse/ssl/vorbis/webp. `guacenc` deshabilitado (no se usa).
- Disco: **sigue al 51%** (46 GB libres). RAM disponible 4568 MB.
- `/var/lib/guacd` y `/var/lib/guacd/drive` en `daemon:daemon 0750`; `/etc/guacamole` en `root:root 0755`.
- **Efecto colateral declarado:** `needrestart` reinició `open-vm-tools`, `packagekit`, `polkit`, `udisks2`, `upower` y `vgauth` (servicios de sistema, no del producto). **Ningún contenedor se reinició** ("No containers need to be restarted").

## T04 — PostgreSQL 16 en el 5434 (2026-10-21 22:05) — `done`

Ejecutado con `sudo bash ops/20-postgresql.sh`.

```
$ pg_lsclusters
Ver Cluster   Port Status Owner    Data directory                   Log file
16  guacamole 5434 online postgres /var/lib/postgresql/16/guacamole /var/log/postgresql/postgresql-16-guacamole.log
$ ss -ltn | grep 5434
LISTEN 0      200        127.0.0.1:5434       0.0.0.0:*
$ ss -ltn | grep 5432          # Supabase: intacto
LISTEN 0      4096         0.0.0.0:5432       0.0.0.0:*
```

- **No se creó el clúster por defecto en el 5432**: se escribió `create_main_cluster = false` en `/etc/postgresql-common/createcluster.conf` **antes** de instalar, y el clúster se creó directamente en el **5434**.
- `guacamole_db` con **23 tablas** `guacamole_*` y el administrador por defecto **`guacadmin`** (en `guacamole_entity`, que es donde vive el nombre en 1.6.0).
- Contraseña del rol en `/root/guacamole-db.pass` (600, fuera del repo).
- Esquema desde `guacamole-auth-jdbc-1.6.0.tar.gz` (sólo `postgresql/schema/*.sql`; el `upgrade/` es para instalaciones viejas). El tarball y el `.jar` quedan en `/var/cache/guacamole/` para T05.
- **Dos fallos corregidos en el camino** (el script es idempotente y se reejecutó): `pg_conftool` escribía `listen_addresses` sin comillas y luego las duplicaba; se fija la línea con `sed`. Y el bucle del esquema recorría `upgrade/`, que no aplica a una base nueva.

## T05 — Tomcat 9 + webapp 1.6.0 (2026-10-21 22:20) — `done`

Ejecutado con `sudo bash ops/30-tomcat-webapp.sh`.

```
$ systemctl is-enabled guacamole-tomcat ; systemctl is-active guacamole-tomcat
enabled
active
$ ss -ltn | grep -E ':(4822|5434|8081)'
LISTEN 0 200        127.0.0.1:5434    0.0.0.0:*
LISTEN 0   5        127.0.0.1:4822    0.0.0.0:*
LISTEN 0 100  [::ffff:127.0.0.1]:8081        *:*
$ curl -sI http://127.0.0.1:8081/guacamole/ | head -1
HTTP/1.1 200
$ ps -o args= -C java | grep -o -- '-Xmx[0-9]*m'
-Xmx512m
$ curl -s -X POST .../api/tokens -d 'username=guacadmin&password=guacadmin'
{"authToken":"<oculto>","username":"guacadmin","dataSource":"postgresql","availableDataSources":["postgresql","postgresql-shared"]}
```

**Versiones (AC9):** Tomcat **9.0.123** (tarball oficial) · webapp **1.6.0** (`META-INF/maven/org.apache.guacamole/guacamole/pom.properties`, sha256 `b41ceb1e…6e716`) · extensión `guacamole-auth-jdbc-postgresql-1.6.0.jar` · driver **42.7.2** (`libpostgresql-jdbc-java`) · Java **17.0.20.1**.

**Decisiones de la tarea, tal como quedaron:**

- Tomcat 9 del tarball en `/opt/tomcat9`, usuario de servicio `guacamole` sin shell, unidad propia con `Type=forking` y `CATALINA_PID`.
- Conector `port="8081" address="127.0.0.1"` y **`RemoteIpValve`** (`internalProxies="127.0.0.1"`) ya puestos: T07 sólo tiene que mandar `X-Forwarded-For`.
- `setenv.sh` con **`-Xmx512m`** y `-DGUACAMOLE_HOME=/etc/guacamole`.
- Se borraron `docs`, `examples`, `manager`, `host-manager` y `ROOT` de `webapps/`.
- `guacamole.properties` en **`0640 root:guacamole`** (contiene la contraseña de la base, que se lee de `/root/guacamole-db.pass`).
- **Fallo corregido:** `/etc/guacamole` quedó en `0750` y `guacd` (usuario `daemon`) no podía leerlo; el propio `guacd -v` lo delataba con `Unable to open "/etc/guacamole/guacd.conf": Permission denied`. Se pasó a `0755` en los directorios y se mantiene `0640` en el fichero sensible. `guacd` sigue `active` y en `127.0.0.1:4822`.
- RAM tras el despliegue: 4333 MB disponibles (antes 4568). Disco 52%.

## T06 — cuentas, TOTP y `ban` (2026-10-21 22:40) — `partial`

Ejecutado con `sudo bash ops/40-cuentas-totp.sh`.

```
$ curl -s -X POST .../api/tokens -d 'username=guacadmin&password=guacadmin'
{"message":"Invalid login",...}
$ curl -s -X POST .../api/tokens -d "username=humberto&password=<guardada>"
{"message":"TOTP enrollment must be completed before authentication can continue",
 "translatableMessage":{"key":"TOTP.INFO_ENROLL_REQUIRED"}, ...}
$ # 6 intentos fallidos seguidos
   intento 1: HTTP 403 ...  intento 4: HTTP 429 {"message":"Too many failed authentication attempts."}
   intento 5: HTTP 429 ...  intento 6: HTTP 429 ...
```

- Extensiones activas: `guacamole-auth-jdbc-postgresql-1.6.0.jar`, `guacamole-auth-ban-1.6.0.jar`, `guacamole-auth-totp-1.6.0.jar` (las dos últimas verificadas por `sha256` contra el `.sha256` oficial).
- Propiedades: `ban-max-invalid-attempts: 5`, `ban-address-duration: 300000`, `totp-issuer: Aries Access`.
- `guacadmin` con contraseña nueva en `/root/guacadmin.pass`; usuario **`humberto`** creado, contraseña en `/root/humberto.pass` (ambos `600`).
- **Cómo se cambia la contraseña (dato que cuesta descubrir):** `PUT /api/session/data/postgresql/users/{usuario}/password` con `{"oldPassword":"...","newPassword":"..."}`. `PUT /users/{usuario}` devuelve **403** con el mensaje que lo explica, y `PATCH` no existe para esto (405).

### Por qué `partial` y no `done`

- **AC5 (3/3) pendiente:** comprobar que un código TOTP de hace 5 minutos no entra exige que el usuario **enrole su dispositivo** (QR en el navegador). Eso no lo puede hacer el agente.
- Mientras no esté, AC5 no cierra y T06 tampoco.
- **Efecto operativo declarado:** con TOTP activo, el login por API sin código deja de servir. Para la automatización de T08 (crear la conexión) hay que **apartar `guacamole-auth-totp-1.6.0.jar`**, hacer la llamada y volverlo a poner. Se hace así y se registra.

## T07 — backend HTTPS en `server01` (2026-10-23 23:55) — `partial`

Ejecutado con `sudo bash ops/50-apache-tls.sh`. **El TLS público no está aquí**: lo termina el nginx del usuario en `192.168.18.203` ([DEC-0027](../../../decisions/DEC-0027-nginx-externo-y-apache-backend.md)).

```
$ ss -ltn | grep ':443'
LISTEN 0 511 *:443 *:*
$ apache2ctl -S
*:443   192.168.18.70 (/etc/apache2/sites-enabled/guacamole.conf:3)
$ curl -sk -o /dev/null -w '%{http_code}' https://127.0.0.1/guacamole/
200
$ openssl x509 -in /etc/ssl/guacamole/guacamole.crt -noout -subject -enddate
subject=CN = 192.168.18.70, O = Aries_Access
notAfter=Jan 25 23:49:34 2029 GMT
sha256 = 21:2B:8C:...:8C:52
```

**Prueba de que el límite de intentos funciona detrás del proxy** (la que importa):

```
5 fallos con X-Forwarded-For: 198.51.100.77  -> el 5.o responde 429
1 fallo  con X-Forwarded-For: 203.0.113.8    -> 403 "Invalid login"  (NO bloqueado)
```

Es decir: el ban cuenta **por IP de cliente**, no por la del proxy. Sin esto, cinco fallos de cualquiera habrían bloqueado a todo el mundo.

### Decisiones y hallazgos de esta tarea

- Certificado **propio** (`/etc/ssl/guacamole/`), SAN `IP:192.168.18.70`, 825 días: el tramo es LAN y así T07 no depende del DNS.
- El 443 **solo acepta** `192.168.18.203` y `127.0.0.1` (`Require ip`): no hay segundo camino público.
- `RemoteIpValve` con `internalProxies="127\.0\.0\.1|192\.168\.18\.203"`, y va **antes** del `AccessLogValve` (si va después, el log se escribe con la IP ya restaurada).
- **Tres tropiezos, todos corregidos en el script:** (1) la válvula se insertó en medio del tag `<Host ...>`, que ocupa dos líneas, y dejó Tomcat en `503`; (2) el regex quedó con **dobles** barras invertidas; (3) el `re.sub` del patrón de log tocó una línea de comentario. El script ahora **valida el XML con `ElementTree` antes de escribir**.
- El log de Tomcat sigue mostrando `127.0.0.1` en `%a` aunque la cabecera llega (`xff=203.0.113.9, 127.0.0.1`) y el ban sí separa por IP. Queda como observación en [`../../../BACKLOG.md`](../../../BACKLOG.md).

### Falta para cerrar T07 (AC6)

El nginx del usuario publicando el dominio. Cuando esté, se verifica desde fuera y AC6 cierra.

## Notas de ejecución

- **Spec aprobada el 2026-10-21.** T01 ejecutada el 2026-10-21 21:25 (`partial`): el host quedó verificado y el resultado **corrige tres supuestos** del plan (no hace falta liberar disco, el proxy es Apache y Tomcat 9 no está en los repos). Falta la lista de IPs de las VMs y la prueba del 3389.
- **Regla de secuencia:** ninguna tarea de instalación (T03 en adelante) arranca antes de que **T02 esté `done`**. El disco está al 99% y un `apt-get install` puede tumbar Supabase o n8n.
- **Regla de secuencia:** el vhost público del 443 (T07) **no se abre** hasta que T06 (contraseña de `guacadmin` cambiada + TOTP + límite de intentos) esté `done`. El orden está invertido a propósito respecto a lo natural.
- **AC12 está condicionado:** exige reiniciar `server01`, que da servicio a Supabase, n8n y Chatwoot. Se ejecuta sólo en una ventana acordada y con confirmación explícita ([`../../../GATES.md`](../../../GATES.md)). Si no hay ventana, AC12 queda en `partial` con dueño y condición.
- **T02 es un gate** (borra respaldos). **T01 decide la viabilidad**: si el 3389 de las VMs no responde desde `server01`, o el 443 no está libre, se para y se vuelve al usuario.

## Revisión

- **Ronda 1 (2026-10-21) — `RECHAZADO`.** Un REVIEWER con contexto fresco encontró 5 bloqueantes: Tomcat 10+ es incompatible con Guacamole 1.6.0 (`javax` frente a `jakarta`), faltaban la extensión JDBC de PostgreSQL y su driver, el plan permitía instalar antes de liberar disco, el 443 se abría antes de endurecer las cuentas, y R6 no tenía criterio de aceptación. Todos resueltos en la spec, el plan y las tareas.
- **Ronda 2 (2026-10-21) — `RECHAZADO`.** Encontró 2 bloqueantes: el **driver JDBC no viaja** en el tarball de la extensión (el plan lo afirmaba) y **AC4 no era demostrable** (`curl -sI` responde 200 aunque falte la extensión). También 3 mayores: parámetros RDP inexistentes (`ignore server certificate`, `enable-clipboard`), el límite de intentos de R6 sin extensión declarada (`guacamole-auth-ban`) y FreeRDP 3 dado por hecho. Todos corregidos.
- **Ronda 3 (2026-10-21) — `APROBADO_CON_OBSERVACIONES`.** Sin bloqueantes heredados. Dejó 2 mayores de seguridad/operación y 12 menores; **todas cerradas en la misma sesión** (ver §Cierre de las observaciones del REVIEW): renumeración de scripts, `X-Forwarded-For` + `RemoteIpValve`, mensaje real del `ban`, `bind-host`, dueño de `/var/lib/guacd`, evidencia de AC10/AC11/AC13.
- **Falta la revisión post-implementación** (obligatoria por `Riesgo: alto`): se lanza sobre `ops/`, `tests/` y la evidencia real de este TRACKING antes de cerrar F-001.
