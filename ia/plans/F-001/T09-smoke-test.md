---
Feature: F-001
Task: T09
Status: pending
Depends: T07
---

# T09 — Suite smoke, `tests.commands` y reinicio

## Objetivo

Dejar de faltar la **comprobación automática** —un comando que diga si el stack sigue en pie, sin abrir el navegador— y la prueba de que aguanta un reinicio.

## Requerimientos

- R9 · AC10
- R8 · AC11
- R1 · AC12

## Archivos previstos

- `tests/smoke.mjs` (**Node**, no `.sh`: en Windows `run-tests.mjs` lanza los comandos con `shell` y el `sh` de Git no está en el PATH de Node)
- `ia/tools/harness.config.json` — `tests.commands`

## Validación

```bash
node ia/tools/run-tests.mjs                      # camino con entorno: PASS por caso
$env:F001_HOST=""; node ia/tools/run-tests.mjs   # camino sin entorno: SKIP, exit 0
cat ia/.harness/tests/*.log                      # evidencia del SKIP (el runner no lo imprime)
grep -rlP '\r' ops/ || echo "ops/ sin CRLF"                          # AC11, mitad 1
LC_ALL=C grep -rlP '[^\x00-\x7F]' ops/ || echo "ops/ en ASCII"       # AC11, mitad 2
```

AC12: tras un **reinicio acordado** de `server01`, se repiten las comprobaciones de AC1 y AC6 sin intervención manual.

Cierra en **PASS** con la salida guardada como evidencia, con el camino de SKIP probado, y con AC12 resuelto o declarado `partial`.

## Trazabilidad

```
// F-001 T09
```

## Notas

- La suite comprueba, contra el host: los servicios `active`+`enabled` (incluido el clúster de PostgreSQL), los puertos en loopback, y `https://<dominio>/guacamole/` respondiendo con certificado válido.
- **Sin entorno tiene que salir SKIP con exit 0.** Si falta el host, el dominio o las credenciales, la suite **no puede devolver exit ≠ 0**: `run-tests.mjs` lo convertiría en FAIL y el gate de pre-commit en rojo para todo el repositorio, en cualquier clon y en cualquier CI. Los dos caminos (con y sin entorno) se prueban antes de dar AC10 por bueno, y la evidencia del SKIP se lee del log (`ia/.harness/tests/`), porque el runner no imprime el estado `SKIP`.
- Las variables de entorno que necesita quedan **documentadas** en la cabecera del script y en el TRACKING; sus valores viven fuera del repo (ver `.gitignore`).
- **No** sustituye a AC7/AC8: el camino del usuario se verifica en el navegador (T08).
- Cierra el hueco declarado en [DEC-0024](../../decisions/DEC-0024-adopcion-aries-access.md): `tests.commands` deja de estar vacío.
- **AC12 es un gate:** reiniciar `server01` tumba Supabase, n8n y Chatwoot ([`../../GATES.md`](../../GATES.md)). Sin ventana acordada, queda `partial` con dueño y condición.

## Relacionados

- Spec: `ia/specs/infra/F-001/F-001.spec.md` · TRACKING: `ia/specs/infra/F-001/F-001-TRACKING.md`
- Protocolo: [`../../protocol/06-validation.md`](../../protocol/06-validation.md) · Gates: [`../../GATES.md`](../../GATES.md)
