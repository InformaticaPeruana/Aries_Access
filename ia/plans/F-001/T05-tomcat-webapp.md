---
Feature: F-001
Task: T05
Status: pending
Depends: T03, T04
---

# T05 — Tomcat 9, la webapp y las extensiones

## Objetivo

Dejar de faltar la **webapp que de verdad arranca y autentica**: Guacamole sobre Tomcat 9, con la extensión de autenticación de PostgreSQL y su driver JDBC cargados, escuchando en `127.0.0.1:8081` y con el heap acotado.

## Requerimientos

- R1 · AC1
- R3 · AC2
- R5 · AC4
- R2 · AC9

## Archivos previstos

- `ops/30-tomcat-webapp.sh`
- `/etc/guacamole/guacamole.properties`, `/etc/guacamole/extensions/`, `/etc/guacamole/lib/` (en el host, no en el repo)

## Validación

```bash
ssh humberto@192.168.18.70 'systemctl is-enabled <unidad-tomcat>; systemctl is-active <unidad-tomcat>'
ssh humberto@192.168.18.70 'ss -ltnp | grep 8081'
ssh humberto@192.168.18.70 'curl -sI http://127.0.0.1:8081/guacamole/ | head -1'
ssh humberto@192.168.18.70 'ls -1 /etc/guacamole/extensions/ /etc/guacamole/lib/'
ssh humberto@192.168.18.70 'tail -50 <log-de-tomcat>'      # sin NoClassDefFoundError y con la extension cargada
ssh humberto@192.168.18.70 'ps -o args= -C java | grep -o "\-Xmx[0-9]*m"'   # el heap acotado se ve en el proceso
ssh humberto@192.168.18.70 'curl -s -X POST http://127.0.0.1:8081/guacamole/api/tokens -d "username=guacadmin&password=..."'   # AC4: devuelve authToken
ssh humberto@192.168.18.70 'free -m'                       # medido con una sesion abierta
```

Cierra cuando la webapp responde 200/302 en `127.0.0.1:8081`, la extensión JDBC y el driver están en `extensions/` y `lib/`, el log no tiene errores de arranque, la JVM arrancó con `-Xmx512m` y **AC4 pasa con un login real**.

## Trazabilidad

```
# F-001 T05
```

## Notas

- **Tomcat 9, no 10+.** Guacamole 1.6.0 se compila contra `javax.servlet`; Tomcat 10+ usa `jakarta.servlet` y el `.war` no arranca ([DEC-0026](../../decisions/DEC-0026-arquitectura-despliegue-server01.md)). La unidad se llama como diga T01, y **`reload` no existe** en Tomcat: se usa `restart`.
- **La webapp sola no autentica nada.** Hacen falta tres piezas, y **no vienen todas del mismo sitio**:
  - `guacamole-auth-jdbc-postgresql-1.6.0.jar` en `/etc/guacamole/extensions/` — viene en `guacamole-auth-jdbc-1.6.0.tar.gz`;
  - el **driver JDBC** de PostgreSQL (`postgresql-42.x.jar`) en `/etc/guacamole/lib/` — **no** viene en ese tarball: se baja de `jdbc.postgresql.org` o del paquete `libpostgresql-jdbc-java`;
  - la extensión de TOTP y la de `ban` (T06), que se instalan allá.
  Sin las dos primeras, el arranque es limpio y **el login no existe**: AC4 lo detecta exigiendo un `authToken` real, no un 200 de la página.
- El conector de Tomcat se cambia a **8081** (`server.xml`, con copia previa): el 8080 es de Evolution API. **El paquete `tomcat9` arranca en el 8080 al instalarse**, así que se para el servicio y se cambia el conector **antes del primer arranque**: si no, choca con Evolution API (o, si esa API estuviera caída, Tomcat se queda el 8080 y después no lo suelta).
- **`RemoteIpValve` en `server.xml`** con `internalProxies="127.0.0.1"`: Tomcat tiene que leer la IP real de `X-Forwarded-For` (que pone nginx en T07) o el límite de intentos de T06 bloquea a todo el mundo a la vez.
- El **heap de la JVM se fija explícito** (`-Xmx512m`) en la unidad: sin tope, o la webapp muere por OOM en mitad de una sesión, o se come la RAM de los vecinos.
- `/etc/guacamole/guacamole.properties` apunta a `guacd` en `127.0.0.1:4822` y a la base en `127.0.0.1:5434`; permisos `640` y dueño del usuario de Tomcat.
- La versión de la webapp se lee del artefacto descargado (manifiesto del `.war`), **no** del nombre del archivo: se publica renombrada como `guacamole.war`.
- Al terminar, purgar el toolchain y los tarballs.

## Relacionados

- Spec: `ia/specs/infra/F-001/F-001.spec.md` · TRACKING: `ia/specs/infra/F-001/F-001-TRACKING.md`
- Protocolo: [`../../protocol/04-plan.md`](../../protocol/04-plan.md) · Arquitectura: [`../../decisions/DEC-0026-arquitectura-despliegue-server01.md`](../../decisions/DEC-0026-arquitectura-despliegue-server01.md)
