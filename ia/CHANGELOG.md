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

## Relacionados

- Estado actual: [`CURRENT.md`](./CURRENT.md) · Mapa: [`README.md`](./README.md)
- Pendientes: [`BACKLOG.md`](./BACKLOG.md) · Deuda: [`DEBT.md`](./DEBT.md) · Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md)
