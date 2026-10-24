# Estado de seguridad, trazabilidad y auditoría — insumo para ISO/IEC 27001

**Fecha:** 2026-10-24 · **Alcance:** portal de acceso remoto `remoto.informaticaperuana.com` y su infraestructura de soporte (`server01`, VMs Windows del ESXi) · **Autor:** agente de implementación, a pedido del responsable del sistema.

> **Naturaleza de este documento.** Es un **insumo técnico** para responder preguntas de auditoría: describe qué está implementado, con qué evidencia y qué falta. **No** es una declaración de conformidad ni sustituye la evaluación del auditor. Las afirmaciones están respaldadas con comandos reproducibles (§7) salvo donde se indica "no verificado".

---

## 1. Resumen ejecutivo

El portal está publicado con **HTTPS de CA pública**, autenticación **usuario + contraseña + segundo factor (TOTP)**, **límite de intentos** y **registro de accesos** en base de datos. La **transferencia de archivos está deshabilitada**. Hay **tres brechas abiertas** que deben declararse: **no hay grabación de sesiones**, **no hay envío automatizado de eventos a un SIEM ni alertas**, y **el RDP de las VMs es alcanzable desde toda la LAN**. Ninguna de las tres afecta la autenticación del portal, pero las tres son relevantes para los controles de registro, supervisión y segregación de redes.

---

## 2. Sistemas en alcance

| Componente | Ubicación | Versión / detalle |
|---|---|---|
| Portal (proxy público) | `remoto.informaticaperuana.com` → nginx del usuario (`192.168.18.203`) | TLS **Let's Encrypt**, válido hasta **2027-01-21** |
| Backend web | `server01` (`192.168.18.70`), Apache 2.4.58 | vhost 443 con **certificado propio**, acceso restringido a `192.168.18.203` y loopback |
| Aplicación | Tomcat 9.0.123 + Guacamole 1.6.0 (`.war` oficial) | contexto `/desktop/`, `127.0.0.1:8081` |
| Motor de escritorio remoto | `guacd` 1.6.0 (compilado, FreeRDP 2.11.5) | `127.0.0.1:4822`, primer plano, usuario `daemon` |
| Base de datos | PostgreSQL 16 (clúster `guacamole`) | `127.0.0.1:5434`, base `guacamole_db` |
| VMs Windows | `192.168.18.75`, `192.168.18.41` | Windows 10 Pro, RDP 3389 |

---

## 3. Controles implementados (con evidencia)

| Control | Estado | Evidencia |
|---|---|---|
| **Autenticación multifactor (TOTP)** | Implementado | Extensión `guacamole-auth-totp-1.6.0.jar`; el login devuelve `TOTP.INFO_CODE_REQUIRED` |
| **Límite de intentos** | Implementado | `guacamole-auth-ban`: 5 intentos / 300 s; verificado con `HTTP 429` y prueba de dos IPs |
| **Cuenta por defecto neutralizada** | Implementado | `guacadmin` con contraseña aleatoria (60+ bits de entropía en `/root/guacadmin.pass`, `600`) |
| **Usuarios nominales** | Implementado | Un usuario humano (`humberto`) con `ADMINISTER`; sin cuentas compartidas |
| **TLS en tránsito público** | Implementado | Let's Encrypt; `ssl_verify_result=0` |
| **TLS en tránsito interno** | Implementado | Certificado propio en `server01:443`; el proxy público no tiene otro camino al backend |
| **Restricción del backend por IP** | Implementado | El 443 de `server01` responde **403** a cualquier IP distinta de `192.168.18.203` |
| **Puertos de aplicación en loopback** | Implementado | `ss -ltn`: `127.0.0.1:8081`, `127.0.0.1:5434`, `127.0.0.1:4822` |
| **Registro de accesos (quién/cuándo/desde dónde)** | Implementado | Tablas `guacamole_connection_history` y `guacamole_user_history`; `remote_host` guarda la **IP real del cliente** (verificado) |
| **Integridad del producto** | Implementado | `.war` oficial verificado por `sha256` (`b41ceb1e…6e716`); sin parches al binario |
| **Transferencia de archivos** | **Deshabilitada** (2026-10-24) | `enable-drive=false` en las dos conexiones |
| **Administración de cambios** | Implementado | Todo cambio pasa por spec aprobada, código versionado en git y verificación registrada |
| **Grabación de sesiones** | **Implementado** (retención 7 días) | `recording-path=/var/lib/guacd/recordings` + timer `aries-grabacion-limpieza` |
| **Envío a SIEM / alertas** | **Implementado** (correo + JSONL) | `/var/log/aries/eventos.jsonl`, timer `aries-eventos` cada 5 min; prueba de fuego con 5 fallos → alerta |
| **Segregación de red / RDP acotado** | **No implementado** | Ver §4 y §5.5 |
| **Cifrado de credenciales en reposo** | **No implementado** | Ver §4 |

---

## 4. Brechas identificadas y plan

| # | Brecha | Riesgo | Mitigación propuesta | Coste |
|---|---|---|---|---|
| B1 | **Sin grabación de sesiones** | No se puede reconstruir qué se hizo dentro de una sesión | **Implementado (2026-10-24):** `recording-path`, `create-recording-path` y `recording-name=${HISTORY_UUID}` en las conexiones, con **timer diario que borra lo anterior a 7 días**. Reproducción desde la UI | **Bajo** |
| B2 | **Sin alertas ni envío a SIEM** | Un acceso no autorizado o fuera de horario no se detecta a tiempo | **Implementado (2026-10-24):** colector cada 5 min → **JSONL** en `/var/log/aries/eventos.jsonl` + **correo** ante fuerza bruta (≥5 fallos/15 min por IP) y ante **acceso fuera de horario** (L-V 8-20, sáb 8-15, hora de Lima). Correo de prueba aceptado por el SMTP | **Bajo** |
| B3 | **RDP alcanzable desde toda la LAN** | Cualquier equipo de la red puede atacar 3389 sin pasar por el portal. Medido: desde `192.168.18.41`, `192.168.18.75:3389` responde **abierto** | **Control compensatorio** (no hay VLAN: el switch no soporta 802.1Q y no hay invitados): reglas de "Escritorio remoto" acotadas a **`192.168.18.70`** en cada equipo, con `ops/windows/rdp-firewall.ps1`. Riesgo residual aceptado y documentado | **Bajo** |
| B4 | **Credenciales de guest en claro en la base** | Quien lea la base obtiene las credenciales de RDP | Cifrado en reposo del volumen o disco; o rotación periódica de las cuentas de guest | **Medio** |
| B5 | **Sin política de caducidad de contraseñas** | Credencial de larga vida | Rotación documentada y calendarizada | **Bajo** |
| B6 | **UFW inactivo en el host** | Host compartido con 21 contenedores; sin filtro local | Fuera del alcance de este proyecto (afecta a servicios de terceros); decisión del responsable del host | **Alto** (riesgo de indisponibilidad) |
| B7 | **Certificado interno vence en 2029** | Corte del tramo interno | Renovación calendarizada | **Bajo** |

---

## 5. Los cinco puntos consultados

### 5.1 Trazabilidad y grabación de pantalla

**Hoy:** se registra el **metadato** de cada acceso — usuario, conexión, IP de origen, inicio, fin y duración — en `guacamole_connection_history`, y cada autenticación en `guacamole_user_history`. Consultable en la UI (**Ajustes → Sesiones activas** e **Historial de uso**) y exportable a CSV.

**Grabación: implementada desde el 2026-10-24** con **retención de 7 días**. Se activa por conexión (`recording-path`, `create-recording-path`, `recording-name=${HISTORY_UUID}`). **No es video**: Guacamole graba el protocolo de dibujo, por lo que el consumo de disco y CPU es bajo (una sesión de 26 s ≈ 624 KB). Un timer diario (04:15) borra lo anterior a 7 días.

**Limitación verificada (2026-10-24):** la **reproducción desde la propia UI no está disponible** en esta combinación. El enlace "Ver grabación" depende de un registro de actividad asociado a la sesión, y el módulo **JDBC de PostgreSQL de Guacamole 1.6.0 no almacena esos registros**: la API devuelve `logs: {}` para una sesión que sí generó archivo, y el `.jar` del módulo no conoce ninguna tabla de actividad. La grabación **se produce y se conserva**; lo que falta es el reproductor.

**Alternativas para reproducir (a decidir):**
1. **`guacenc`** (incluido en `guacamole-server`): convierte el `.guac` a **MP4**. Requiere recompilar `guacd` con `--with-guacenc` y las librerías de ffmpeg. Ventaja para auditoría: el video es portable y se puede entregar.
2. **Página de reproducción propia** en `public/` con `guacamole-common-js` (ya presente en la webapp): reproduce el `.guac` en el navegador. Requiere exponer los archivos de grabación al servidor web, con control de acceso.

Hasta entonces, la evidencia de auditoría es el **metadato** (quién, cuándo, desde dónde, a qué máquina, cuánto) más los archivos `.guac` conservados.

### 5.2 Logs, registros de acceso e intentos fallidos para SIEM

**Implementado desde el 2026-10-24.** Un colector (`aries-eventos`, cada 5 minutos) lee:

- los accesos nuevos de `guacamole_connection_history` (usuario, conexión, IP real, duración);
- las líneas nuevas del access log de Tomcat con estado `401/403/429` sobre `/api/tokens` (intentos fallidos y bloqueos, con la IP real detrás del proxy).

Produce **JSONL** en `/var/log/aries/eventos.jsonl` —formato listo para cualquier colector— y **envía correo** cuando:

- una misma IP acumula **≥ 5 fallos en 15 minutos** (fuerza bruta);
- hay un **acceso fuera de horario**: lunes a viernes 08:00–20:00 y sábados 08:00–15:00, hora de Lima (domingo cerrado).

**Prueba de fuego ejecutada:** 5 intentos fallidos desde una IP de prueba → **1 alerta** y correo aceptado por el servidor SMTP. También se desactivó el *buffering* del access log de Tomcat para que los eventos no lleguen con retraso.

**Hallazgo relevante:** el portal **ya recibe intentos desde Internet**. Entre los eventos recolectados hay fallos de autenticación desde `209.45.116.174`, `149.57.180.157` y `34.12.243.235`. No son accesos válidos: el límite de intentos y el TOTP los contienen, y desde ahora generan alerta.

**Pendiente opcional:** reenvío a un colector/SIEM remoto por `rsyslog` (ya instalado). Hoy los eventos quedan en JSONL en el propio host.

### 5.3 Transferencia de archivos

**Deshabilitada** desde el 2026-10-24 en las dos conexiones (`enable-drive=false`). El usuario ya no ve una unidad compartida en el guest.

**Aclaración para el auditor:** el **portapapeles de texto sigue habilitado** (no es transferencia de archivos). Si el criterio de auditoría lo incluye, se desactiva con `disable-copy` y `disable-paste`.

### 5.4 Mitigación de fuerza bruta

**Implementado:** bloqueo por IP tras 5 intentos fallidos durante 5 minutos (extensión oficial `guacamole-auth-ban`), con verificación de que el conteo usa la **IP real del cliente y no la del proxy** (prueba con dos IPs: una bloqueada, la otra no).

**Adicionales evaluados, no implementados:**

| Medida | Efecto | Coste |
|---|---|---|
| Bajar a 3 intentos / 15 min | Endurece el umbral | 1 línea |
| `limit_req` por IP en el nginx público | Corta antes de llegar a la aplicación | 3 líneas |
| `fail2ban` sobre el access log | Bloqueo en firewall | Medio: toca `iptables` en host compartido |
| Restricción geográfica en nginx | Reduce superficie drásticamente | Bajo, si el uso es solo desde Perú |

### 5.5 Red y aislamiento del RDP

**Estado medido:** la red es **plana** (`192.168.18.0/24`). `server01` no expone RDP (`3389` cerrado), pero **las VMs sí aceptan RDP desde cualquier equipo de la LAN**. El portal no es el vector; el vector es el acceso directo al guest.

**Diseño objetivo:**

```
Internet ──443──► nginx (192.168.18.203) ──443──► server01 (192.168.18.70) ──► guacd ──3389──► VMs
                                                                                    ▲
                                        (solo server01 puede iniciar 3389) ─────────┘
```

1. **Ahora (5 min por VM):** firewall del guest con 3389 permitido **solo desde `192.168.18.70`**.
2. **Objetivo:** VLAN para las VMs, con `server01` como único punto de ruteo hacia ellas; visitantes en otra VLAN sin acceso a la de VMs.
3. **Portal:** no requiere cambios; el nginx público solo habla con `server01:443`.

**Pendiente de autorización:** inventario completo de la LAN (escaneo de lectura) para documentar qué hay, qué debería estar expuesto y qué aislar.

---

## 6. Mapeo a ISO/IEC 27001:2022 (Anexo A)

| Control | Tema | Estado | Observación |
|---|---|---|---|
| A.5.15 | Control de acceso | **Parcial** | Acceso por usuario nominal + MFA; falta documento formal de política |
| A.5.17 | Información de autenticación | **Parcial** | Contraseñas generadas y no versionadas; falta caducidad (B5) |
| A.5.18 | Derechos de acceso | **Cumple** | Permisos por usuario y por conexión en base de datos |
| A.8.2 | Derechos de acceso privilegiado | **Parcial** | `ADMINISTER` otorgado a un usuario; `guacadmin` como rescate con contraseña custodiada |
| A.8.3 | Restricción de acceso a la información | **Parcial** | Unidad compartida deshabilitada; portapapeles activo |
| A.8.5 | Autenticación segura | **Cumple** | MFA + límite de intentos + TLS |
| A.8.12 | Prevención de fuga de datos | **Parcial** | Transferencia de archivos off; sin DLP ni control de portapapeles |
| A.8.15 | Registro (logging) | **Parcial** | Historial en base de datos; sin grabación de sesión (B1) |
| A.8.16 | Actividades de supervisión | **No cumple** | Sin alertas ni envío a SIEM (B2) |
| A.8.20 | Seguridad de redes | **Parcial** | TLS extremo a extremo; backend restringido por IP |
| A.8.22 | Segregación de redes | **No cumple** | LAN plana; RDP alcanzable desde toda la red (B3) |
| A.8.24 | Uso de criptografía | **Parcial** | TLS público e interno; sin cifrado en reposo (B4) |
| A.8.34 | Protección durante pruebas de auditoría | **N/A** | Sin entorno de pruebas separado |

---

## 7. Evidencias reproducibles

```bash
# TLS público (desde fuera de la red interna)
curl -s -o /dev/null -w '%{http_code} %{ssl_verify_result}\n' https://remoto.informaticaperuana.com/desktop/   # 200 0

# Puertos de aplicación solo en loopback
ssh humberto@192.168.18.70 'ss -ltn | grep -E ":(8081|5434|4822)\b"'

# Backend restringido: desde una IP no autorizada
curl -sk -o /dev/null -w '%{http_code}\n' https://192.168.18.70/desktop/    # 403

# Historial de accesos
ssh humberto@192.168.18.70 'sudo -u postgres psql -p 5434 -d guacamole_db -c "select connection_name, start_date, end_date, username, remote_host from guacamole_connection_history order by start_date desc limit 10"'

# Transferencia de archivos deshabilitada
ssh humberto@192.168.18.70 'sudo -u postgres psql -p 5434 -d guacamole_db -tAc "select connection_id, parameter_value from guacamole_connection_parameter where parameter_name = '"'"'enable-drive'"'"'"'

# Alcance del RDP (desde un equipo cualquiera de la LAN)
powershell -c "Test-NetConnection 192.168.18.75 -Port 3389"   # TcpTestSucceeded: True  <- brecha B3
```

---

## 8. Limitaciones de este documento

- Describe **un entorno**, no un SGSI. No cubre personas, procesos, proveedores ni continuidad.
- Las brechas B2, B3 y B4 **están abiertas** a la fecha de este documento; su cierre tiene plan y coste estimado, no fecha comprometida.
- "Cumple" significa que existe un control técnico y una evidencia reproducible; **no** que exista la política documentada que ISO 27001 exige en la mayoría de los controles.
- El escaneo completo de la red **no se realizó**: requiere autorización explícita por tratarse de un barrido de la LAN.

---

## Relacionados

- Feature del portal: [`../specs/infra/F-001/F-001.spec.md`](../specs/infra/F-001/F-001.spec.md) · Identidad visual: [`../specs/ui/F-002/F-002.spec.md`](../specs/ui/F-002/F-002.spec.md)
- Decisiones de arquitectura: [`../decisions/DEC-0026-arquitectura-despliegue-server01.md`](../decisions/DEC-0026-arquitectura-despliegue-server01.md) · [`../decisions/DEC-0027-nginx-externo-y-apache-backend.md`](../decisions/DEC-0027-nginx-externo-y-apache-backend.md)
- Pendientes y gates: [`../BACKLOG.md`](../BACKLOG.md) · [`../GATES.md`](../GATES.md)
