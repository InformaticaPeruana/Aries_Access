---
Feature: F-003
Veredicto: APROBADO_CON_OBSERVACIONES
Revisor: subagente REVIEWER (contexto fresco)
Fecha: 2026-10-24
---

# F-003 — REVIEW (ronda 3)

Revisión adversarial ([DEC-0006](../../../decisions/DEC-0006-revision-adversarial.md) · [`../../../protocol/07-review.md`](../../../protocol/07-review.md)).

> Contexto fresco, mismo modelo: **no** es una segunda opinión independiente ([protocolo 07](../../../protocol/07-review.md)).
> Alcance de esta ronda: verificación de las correcciones de la ronda 2 y búsqueda de regresiones. No se rehace el análisis completo.

## Alcance revisado

- **Diff:** `ops/alertas/eventos.py`, `ops/90-grabacion.sh`, `ops/91-grabaciones.sh`, `ops/95-alertas.sh`, `ops/80-portal.sh`, `ops/50-apache-tls.sh`, `ops/10-guacd.sh`, `ops/70-branding.sh`, `ops/branding/{guac-manifest.json,js/aries.js}`, `ops/windows/rdp-firewall.ps1`, `public/grabaciones/index.html`; documentación en `ia/specs/seguridad/F-003/**`, `ia/plans/F-003/**`, `ia/research/2026-10-24-*.md`, `ia/CURRENT.md`, `ia/CHANGELOG.md`.
- **Requisitos:** R1–R8 (foco R2, R3, R4, R7, R8) · **AC:** AC1–AC8.
- **Herramientas:** `node ia/tools/check-harness.mjs --report` y `python -m py_compile ops/alertas/eventos.py`.
- **Contraste externo:** `apache/guacamole-client` tag `1.6.0` — `SessionRecording.js`, `ExtensionManifest.java`, `doc/guacamole-playback-example/`.

## Ronda 2 — verificación

| # | Hallazgo de la ronda 2 | Estado | Evidencia |
|---|------------------------|--------|-----------|
| 1 | El reproductor pasaba una URL `string` a `Guacamole.SessionRecording` (exige `Blob\|Tunnel`) | **Resuelto** | `public/grabaciones/index.html`: `fetch` → `Blob` y arranque en `onload`. Upstream 1.6.0: el constructor con `Blob` parsea y `connect()` está guardado con `if (tunnel)`, así que la llamada restante es inocua |
| 2 | Watermark por `history_id` perdía sesiones que cierran fuera de orden | **Resuelto** | `eventos.py`: `end_date > last_end`, `order by end_date`, avance por `end_date` |
| 3 | Alerta de fuera de horario perdida si falla el SMTP | **Resuelto** | `pending_alerts` persistidas; solo se vacían tras envío aceptado; `SMTP_HOST` validado al inicio |
| 4 | Documento de auditoría contradictorio | **Resuelto** | ruta real, B1/B2 cerradas, B3 abierta, A.8.15/A.8.16 corregidos, sin promesa de MP4 ni "Reproducción desde la UI" |
| 5 | `index.json` legible por todos | **Resuelto** | `0640 root:www-data`, aplicado antes del `replace` |
| 6 | Migración del estado sin reenviar el histórico | **Parcial** | cumple el caso real del host; fallaba con histórico vacío (hallazgo 1, corregido después) |
| 7 | `ops/80-portal.sh` publicaba `grabaciones/` en `/portal/` | **Resuelto** | `rm -rf "${DEST}/grabaciones"` tras el copiado |
| 8 | Evento `acceso` sin `inicio`/`fin`/`duracion_s` | **Resuelto** | `inicio`, `fin`, `duracion_s` y `detalle` |
| 9 | `rdp-firewall.ps1` fallaba en silencio | **Resuelto** | búsqueda por puerto, códigos 0/1/2, detección de `Any` y rangos |
| 10 | Proceso: CURRENT, CHANGELOG y TRACKING sin F-003 | **Resuelto** | actualizados |

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Acción |
|---|-----------|----------|-----------|--------|
| 1 | mayor | El bootstrap de `last_end` forzaba `primera` y descartaba la primera sesión si el histórico estaba vacío | `eventos.py` | **Corregido en la misma sesión:** ya no se fuerza `primera`; el filtro `end_date > last_end` excluye el histórico |
| 2 | mayor | **AC4 marcado `done` sin prueba de reproducción en el navegador** | `F-003-TRACKING.md`, `T03`, `CHANGELOG` | **Corregido:** AC4 y T03 pasan a `partial` hasta la prueba visual. El código es correcto contra la API 1.6.0 |
| 3 | menor | Colector sin exclusión mutua | `eventos.py`, `95-alertas.sh` | **Corregido:** `flock` en la unidad |
| 4 | menor | El reproductor no permite repetir | `index.html` | **Corregido:** `oncomplete` con `seek(0)` y botón a "Reproducir" |
| 5 | menor | Grabación completa en memoria del navegador | `index.html` | Aceptado; disparador: primera sesión > 30 min |
| 6 | menor | Sin SMTP no se recolecta JSONL | `eventos.py` | Aceptado: se prioriza el fallo visible del correo |
| 7 | menor | `index.json` 0644 durante la regeneración | `91-grabaciones.sh` | **Corregido:** permisos antes del `replace` |
| 8 | menor | Enlace al informe de revisión | `TRACKING` | **Corregido:** este informe |

## AC sin evidencia suficiente

- **AC4 (parcial):** 401/200/403 y descarga demostrados; **falta la reproducción visual**, que es la cláusula que el AC exige. Queda `partial` y así debe presentarse al auditor.
- **AC7:** `partial` declarado y consistente (falta ejecutar el firewall en cada equipo).

## Veredicto

**APROBADO_CON_OBSERVACIONES** — El bloqueante de la ronda 2 está resuelto de forma real (Blob + `onload`) y los dos mayores también (watermark por `end_date`, alertas pendientes). No aparece ningún defecto que rompa la seguridad ni que haga imposible demostrar un AC. Quedan observaciones menores y la prueba visual de AC4, que **no** deben presentarse como hechas.

## Historial de rondas

| Ronda | Veredicto | Qué la motivó |
|---|---|---|
| 1 | `RECHAZADO` | IP falsificable (izquierda del `X-Forwarded-For`), eventos sin fin/duración, alerta perdida si falla el SMTP, UTC asumido, permisos, firewall en silencio, documento contradictorio y AC4 sin demostrar. |
| 2 | `RECHAZADO` | Reproductor con URL en vez de `Blob`, watermark que perdía sesiones y alerta de fuera de horario perdida al fallar el SMTP. |
| 3 | `APROBADO_CON_OBSERVACIONES` | Todo lo anterior resuelto; quedan la prueba visual de AC4 y observaciones menores. |

## Relacionados

- Spec: [`F-003.spec.md`](./F-003.spec.md) · TRACKING: [`F-003-TRACKING.md`](./F-003-TRACKING.md) · Plan: [`../../../plans/F-003/PLAN.md`](../../../plans/F-003/PLAN.md)
- Contrato: [`../../../agents/REVIEWER.md`](../../../agents/REVIEWER.md) · Auditoría: [`../../../research/2026-10-24-estado-seguridad-y-auditoria.md`](../../../research/2026-10-24-estado-seguridad-y-auditoria.md)
