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
| [T03](../../../plans/F-001/T03-guacd.md) | `guacd` 1.6.0 como servicio | T02 | pending | — |
| [T04](../../../plans/F-001/T04-postgresql.md) | PostgreSQL, esquema y usuario de base | T02 | pending | — |
| [T05](../../../plans/F-001/T05-tomcat-webapp.md) | Tomcat 9, webapp y extensiones en `127.0.0.1:8081` | T03, T04 | pending | — |
| [T06](../../../plans/F-001/T06-cuentas-totp.md) | Cuentas endurecidas, TOTP y límite de intentos | T05 | pending | — |
| [T07](../../../plans/F-001/T07-apache-tls.md) | vhost de Apache y TLS público | T06 | pending | — |
| [T08](../../../plans/F-001/T08-conexion-rdp.md) | Conexión RDP a la VM Windows | T07 | pending | — |
| [T09](../../../plans/F-001/T09-smoke-test.md) | Suite smoke, `tests.commands` y reinicio | T07 | pending | — |

## Estado por AC

Un AC, una tarea dueña ([`F-001.spec.md`](./F-001.spec.md) §Criterios de aceptación).

| AC | Requerimiento | Tarea | Estado | Evidencia |
|----|---------------|-------|--------|-----------|
| AC1 | R1 | T05 | pending | — |
| AC2 | R3 | T05 | pending | — |
| AC3 | R5 | T04 | pending | — |
| AC4 | R5 | T05 | pending | — |
| AC5 | R6 | T06 | pending | — |
| AC6 | R4 | T07 | pending | — |
| AC7 | R7 | T08 | pending | — |
| AC8 | R7 | T08 | pending | — |
| AC9 | R2 | T05 | pending | — |
| AC10 | R9 | T09 | pending | — |
| AC11 | R8 | T09 | pending | — |
| AC12 | R1 | T09 | pending | Gate: exige reiniciar `server01` (ver Notas) |
| AC13 | R6 | T06 | pending | — |

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
