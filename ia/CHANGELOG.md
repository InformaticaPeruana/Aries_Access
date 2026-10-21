# CHANGELOG

Registro **cronológico resumido**. Formato fijo: es lo que permite reconstruir qué pasó sin releer nada más. El detalle vive en git y en la spec; aquí va el resumen.

No incluir explicaciones largas. Si algo necesita párrafos, su lugar es la spec.

## Formato

```md
## YYYY-MM-DD HH:mm

Task: <qué se hizo, una línea>
Changed:
* <cambio concreto>
Validated:
* <PASS / FAIL / NOT_AVAILABLE + cómo>
Files:
* <ruta>
Spec: <FEATURE-ID o ruta>
```

Para **micro-spec** de correcciones triviales (typo, texto de UI, literal), este es el único registro necesario; indica `micro-spec:` en lugar de `Spec:`.

---

## 2026-10-21 11:00

Task: Adopción del AI Harness (`/ia`) en Aries_Access, camino A.
Changed:
* `ia/` copiada de la plantilla v3.1.0, sin `ia/.harness/` ni baseline ajenos.
* `AGENTS.md` en la raíz, rellenado; `harness.config.json` con `codeRoots` (`src`, `public`), áreas de riesgo (`acceso-remoto`, `credenciales`, `portapapeles`) y `adopted: true`.
* Gate de commit activado y **probado** (`node ia/tools/install-hooks.mjs`).
* Investigación de partida sembrada en `ia/research/2026-10-21-guacamole-vms-navegador.md`.
* Decisiones [DEC-0024](decisions/DEC-0024-adopcion-aries-access.md) y [DEC-0025](decisions/DEC-0025-despliegue-nativo-sin-docker.md); heredadas fechadas a 2026-10-21.
* Feature de ejemplo borrada (`ia/specs/demo`, `ia/plans/F-001`).
* Baseline del ratchet sellada sobre el proyecto.
Validated:
* PASS — `node ia/tools/check-harness.mjs`: 0 FAIL, 0 warn.
* PASS — gate probado con una violación temporal (el hook bloqueó).
* NOT_AVAILABLE — `run-tests.mjs` sin comandos declarados: no hay pruebas todavía (DEC-0024).
Files:
* `AGENTS.md`, `ia/tools/harness.config.json`, `ia/decisions/`, `ia/research/`, `ia/CURRENT.md`, `ia/MEMORY.md`, `ia/CHECKLIST.md`, `ia/GATES.md`, `ia/BACKLOG.md`, `ia/specs/README.md`, `ia/CHANGELOG.md`
Spec: —

## 2026-10-21 19:30

Task: Spec, plan y órdenes de trabajo de F-001 (despliegue nativo de Guacamole en `server01`), con revisión adversarial en tres rondas.
Changed:
* `ia/specs/infra/F-001/` — spec (R1–R9, AC1–AC13), TRACKING y REVIEW. `ia/plans/F-001/` — PLAN y `T01`…`T09`.
* [DEC-0026](decisions/DEC-0026-arquitectura-despliegue-server01.md): host, nginx en vez de Caddy, puertos 8081/5434, **Tomcat 9** y RDP. Enmienda a [DEC-0025](decisions/DEC-0025-despliegue-nativo-sin-docker.md) y ampliación de `codeRoots` de [DEC-0024](decisions/DEC-0024-adopcion-aries-access.md).
* `harness.config.json`: `codeRoots` suma `ops` y `tests`; `codeExtensions` suma `.sh` y `.mjs`.
* `PROJECT.md` y `ARCHITECTURE.md` rellenados (estaban en plantilla); `AGENTS.md` deja de decir `UNKNOWN` en §Comandos.
* `.gitignore` nuevo (`ia/.harness/`, secretos) y `.gitattributes` en la raíz (LF).
* `CHECKLIST.md`: ítems 1, 3, 4 y 5 cerrados; ítem 2 a medias; ítems 8 y 9 nuevos (dominio/DNS/certificado y preparación del guest).
* `GATES.md`: catálogo con las dos operaciones que F-001 va a pedir (borrar respaldos y reiniciar el host).
* `BACKLOG.md`: reserva de DHCP como P0; UFW y sesiones concurrentes como P1.
Validated:
* PASS — `node ia/tools/check-harness.mjs --report`: 0 FAIL, 0 warn.
* PASS — revisión adversarial en 3 rondas con contexto fresco: `RECHAZADO` → `RECHAZADO` → `APROBADO_CON_OBSERVACIONES`, con las 14 observaciones finales cerradas.
* NOT_AVAILABLE — nada ejecutado en `server01`: la spec espera aprobación y T01 es de solo lectura.
Files:
* `ia/specs/infra/F-001/`, `ia/plans/F-001/`, `ia/decisions/DEC-0024-*`, `DEC-0025-*`, `DEC-0026-*`, `ia/PROJECT.md`, `ia/ARCHITECTURE.md`, `ia/CURRENT.md`, `ia/MEMORY.md`, `ia/CHECKLIST.md`, `ia/GATES.md`, `ia/BACKLOG.md`, `ia/specs/README.md`, `ia/tools/harness.config.json`, `AGENTS.md`, `.gitignore`, `.gitattributes`
Spec: F-001

## Relacionados

- Estado actual: [`CURRENT.md`](./CURRENT.md) · Mapa: [`README.md`](./README.md)
- Pendientes: [`BACKLOG.md`](./BACKLOG.md) · Deuda: [`DEBT.md`](./DEBT.md) · Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md)
