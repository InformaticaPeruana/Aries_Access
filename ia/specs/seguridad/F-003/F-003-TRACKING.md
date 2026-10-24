---
Feature: F-003
Estado: in_progress
---

# F-003 — TRACKING

Bitácora de ejecución ([DEC-0003](../../../decisions/DEC-0003-estados-cierre.md), [DEC-0009](../../../decisions/DEC-0009-tareas-ordenes-trabajo.md)).

> **Implementación previa a la spec**, a pedido del usuario y con auditoría en curso (2026-10-27). El estado es el real, con su evidencia.

## Tareas

| Tarea | Objetivo | Depende de | Estado | Evidencia |
|-------|----------|------------|--------|-----------|
| [T01](../../../plans/F-003/T01-grabacion.md) | Grabación con retención de 7 días | - | done | `.guac` de 638 KB en `/var/www/aries-grabaciones/files` (0640 `daemon:www-data`); timer diario con `-mtime +6` |
| [T02](../../../plans/F-003/T02-eventos-alertas.md) | Colector de eventos y alertas | - | done | JSONL con `acceso` (con duración), `fallo` y `bloqueo`; 5 fallos → alerta + correo aceptado |
| [T03](../../../plans/F-003/T03-grabaciones-web.md) | Página de grabaciones y enlace en la UI | T01 | partial | público **401/200**, backend desde otra IP **403** y `.guac` servido completo. **Falta la prueba de reproducción en el navegador** |
| [T04](../../../plans/F-003/T04-archivos-fuerza-bruta.md) | Sin transferencia + fuerza bruta | - | done | `enable-drive=false` aplicado desde `ops/90-grabacion.sh`; ban 5/300000 |
| [T05](../../../plans/F-003/T05-red-rdp.md) | Inventario de red y acotamiento del RDP | - | partial | 18 hosts inventariados; **falta ejecutar** `rdp-firewall.ps1` en cada equipo |

## Estado por AC

| AC | Requerimiento | Tarea | Estado | Evidencia |
|----|---------------|-------|--------|-----------|
| AC1 | R1 | T01 | done | archivo existe en 0640 y el timer diario ejecuta `-mtime +6` (7 días) |
| AC2 | R2 | T02 | done | eventos con IP real (probado con `X-Forwarded-For` falsificado: se registró la IP del salto real, no la del cliente) |
| AC3 | R3 | T02 | done | 5 fallos → 1 alerta; correo aceptado por el SMTP |
| AC4 | R4 | T03 | partial | 401/200/403 y descarga correctas; **falta la cláusula "se reproduce en el navegador"**, que exige una prueba visual |
| AC5 | R5 | T04 | done | `enable-drive=false` (idempotente en `ops/90-grabacion.sh`) |
| AC6 | R6 | T04 | done | documento de auditoría §5.4 |
| AC7 | R7 | T05 | partial | inventario y plan escritos; ejecución del firewall pendiente |
| AC8 | R8 | T02 | done | login con TOTP vigente; `.war` con `sha256` oficial sin cambios |

## Notas de ejecución

- **Reproducción:** la UI de Guacamole no puede enlazar la grabación (el backend JDBC de 1.6.0 no guarda el registro de actividad). Se resolvió con **página propia** y un enlace inyectado por la extensión (campo `js`), sin tocar el `.war`.
- **IP del cliente:** el colector toma el **salto derecho no interno** del `X-Forwarded-For`, igual que `RemoteIpValve`. El primer intento tomaba el valor izquierdo, que el cliente puede falsificar: se corrigió y se probó con `X-Forwarded-For: 6.6.6.6, 203.0.113.9` → se registró `203.0.113.9`.
- **Zona horaria:** el timestamp del access log se parsea con su offset (`%z`). Asumirlo UTC desplazaba 5 horas y dejaba la ventana de fuerza bruta vacía.
- **Retención:** `-mtime +6` (7 días de calendario, no 8).
- **Permisos:** `.guac` en `0640`, `UMask=0007` en `guacd.service`; `index.json` en `0640`; htpasswd con hash `bcrypt`.
- **Basic Auth:** va en un `<LocationMatch>` con `<RequireAll>`, porque el `<Location />` global del vhost anulaba el `Require valid-user` de los `<Directory>`.
- **Correo:** si el envío falla, la alerta queda en `pending_alerts` y se reintenta en la corrida siguiente; sin `SMTP_HOST` el colector falla con código distinto de cero y deja rastro en el journal.
- **Ruido conocido:** durante las pruebas se reenvió el histórico dos veces y salieron correos de "fuera de horario" que no eran incidentes reales. El estado quedó al día (`last_end` en el último cierre) y el bootstrap ya no fuerza `primera`, así que no se repite.

## Revisión

- **Ronda 1 (2026-10-24) — `RECHAZADO`.** Un bloqueante (IP falsificable en eventos y en la clave de fuerza bruta) y siete mayores, todos corregidos: IP por salto derecho, cierre de sesión con duración, alerta persistente si falla el SMTP, offset de zona horaria, permisos de las grabaciones, script de firewall que fallaba en silencio y documento de auditoría contradictorio.
- **Ronda 2 (2026-10-24)** — `RECHAZADO`. Encontró que el reproductor pasaba una URL donde la API 1.6.0 exige un `Blob` (bloqueante), que el watermark por `history_id` perdía sesiones que cierran fuera de orden, y que la alerta de fuera de horario se perdía si fallaba el SMTP. Corregidos: `fetch` + `Blob` + `onload`, watermark por `end_date` y `pending_alerts` persistidas. También se corrigieron la ruta y el estado en el documento de auditoría.

- **Ronda 3 (2026-10-24)** — `APROBADO_CON_OBSERVACIONES`. Ver [`F-003-REVIEW.md`](./F-003-REVIEW.md). Dejó dos mayores (bootstrap del watermark y AC4 sin prueba visual) y menores; el bootstrap quedó corregido y **AC4/T03 bajan a `partial`** hasta la prueba en navegador.

## Relacionados

- Spec: [`F-003.spec.md`](./F-003.spec.md) · Plan: [`../../../plans/F-003/PLAN.md`](../../../plans/F-003/PLAN.md)
- Auditoría: [`../../../research/2026-10-24-estado-seguridad-y-auditoria.md`](../../../research/2026-10-24-estado-seguridad-y-auditoria.md)
