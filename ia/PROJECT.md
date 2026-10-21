# PROJECT

Información **relativamente estable**. Nada de historial: eso es [`CHANGELOG.md`](./CHANGELOG.md). Se actualiza al cerrar cada feature si cambió el estado, el stack o los comandos (ver [`protocol/13-close-git.md`](./protocol/13-close-git.md)).

## Objetivo del sistema

Dar acceso a las **VMs Windows de VMware desde el navegador** con Apache Guacamole: un solo punto de entrada, con TLS, y **sin instalar ningún agente** (AnyDesk/RustDesk) dentro de los guests. Uso personal/interno de AriesDev.

## Alcance

Guacamole desplegado de forma **nativa** en `server01`, publicado por el **Apache del host** con certificado válido, con usuarios nominales y segundo factor, y con una conexión RDP por VM Windows.

**No hace** (deliberadamente): no implementa un panel propio todavía, no gestiona el encendido de las VMs (eso es del ESXi), no integra el hipervisor, no graba sesiones y no despliega contenedores.

## Componentes

| Componente | Ruta | Stack |
|---|---|---|
| Host Guacamole (`server01`) | fuera del repo: `192.168.18.70` | Ubuntu 24.04.4 LTS + `guacd` + Tomcat 9 + PostgreSQL 16 + Apache 2.4 |
| Aprovisionamiento | `ops/` | Bash idempotente, ASCII, LF |
| Pruebas smoke | `tests/` | Node / Bash, lanzadas por el harness |
| Panel de acceso propio (pendiente, F-002) | `public/` | HTML/CSS/JS estático |

## Tecnologías

Apache Guacamole **1.6.0** (`guacd` y webapp en la misma versión), **Tomcat 9** — no 10+: Guacamole 1.6.0 usa `javax.servlet` y Tomcat 10+ exige `jakarta.servlet` ([DEC-0026](./decisions/DEC-0026-arquitectura-despliegue-server01.md)) — con JDK 17+, PostgreSQL 16, **Apache 2.4** (el que ya corre en el host), Node.js solo para las herramientas del harness. Sin Docker ([DEC-0025](./decisions/DEC-0025-despliegue-nativo-sin-docker.md)).

## Módulos principales

- `ops/` — scripts de aprovisionamiento del stack en el host, uno por etapa (10-guacd, 20-postgresql, 30-tomcat-webapp, 40-cuentas-totp, 50-apache-tls, 60-conexion-rdp).
- `tests/` — suite smoke que comprueba servicios, puertos y HTTPS sin abrir el navegador.
- `public/` — panel de acceso propio (F-002, todavía no existe).

## Convenciones

- **Commits:** Conventional Commits referenciando la feature: `feat(F-001): ...`.
- **Trazabilidad:** cada archivo de código tocado lleva en su cabecera `// F-001 T0n` (o `# F-001 T0n` en Bash).
- **Nombres de archivo en inglés o técnicos, siempre ASCII** ([DEC-0021](./decisions/DEC-0021-ascii-en-nombres-y-codigo.md)); la prosa va en castellano.
- **Finales de línea LF** en todo lo que se ejecuta en Linux.
- Los scripts del host son **idempotentes y no interactivos**: repetirlos no rompe nada.

## Restricciones importantes

- **`server01` está compartido y en producción**: sirve Supabase, n8n, Chatwoot y Evolution API con 21 contenedores. Ningún servicio existente se para, reinicia ni reconfigura.
- **1 vCPU y ~3.9 GiB de RAM libres**: el stack no puede dejar sin memoria a los vecinos.
- **Disco**: liberar espacio es paso previo, y es un gate (borra respaldos).
- **Puertos tomados**: 80 (Apache), 8080 (Evolution API), 5432/5433 (Supabase). De ahí `127.0.0.1:8081` y `127.0.0.1:5434` ([DEC-0026](./decisions/DEC-0026-arquitectura-despliegue-server01.md)).
- **Sin secretos en el repo**; **sin Docker**; **nada sin spec aprobada**.

## Comandos principales

| Qué | Comando |
|---|---|
| Instalar el stack en el host | `sudo bash ops/10-guacd.sh` … `sudo bash ops/60-conexion-rdp.sh` (uno por etapa, en orden) |
| Levantar en dev | No aplica: el producto es el host. Recargar servicios: `sudo systemctl restart guacd guacamole-tomcat` y `sudo apache2ctl configtest && sudo systemctl reload apache2` |
| Build | No aplica: sin código compilado propio. `guacd` se compila en el host desde la release 1.6.0 |
| Tests | `node ia/tools/run-tests.mjs` (suite smoke de `tests/`) |
| Comprobar el harness | `node ia/tools/check-harness.mjs --report` |

## Estructura del repositorio

```
AGENTS.md          # entrada de sesión
ia/                # el proceso: specs, planes, decisiones, protocolo
ops/               # aprovisionamiento del stack en el host
tests/             # suite smoke
public/            # panel de acceso propio (F-002, pendiente)
```

## Relacionados

- Arquitectura: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · Memoria: [`MEMORY.md`](./MEMORY.md)
- Entrada de sesión: [`AGENTS.template.md`](./AGENTS.template.md) · Estado: [`CURRENT.md`](./CURRENT.md)
