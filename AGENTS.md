# AGENTS.md — Aries_Access

> Puerta de entrada de cada sesión. Corto y sin datos del bootstrap. Mapa completo: [`ia/README.md`](ia/README.md).

## ⚠️ Regla Suprema

**NUNCA escribir código sin spec aprobada.** No inferir, no suponer, no inventar.

## Idioma

Toda interacción va en **castellano neutro** (sin voseo): respuestas, preguntas, resúmenes, UI, specs/planes/tracking, docs y mensajes de commit.
Lo **técnico** se mantiene en inglés: identificadores, nombres de tablas/columnas, endpoints, tipos/enums, comandos, flags y siglas.
Ref. [`ia/decisions/DEC-0010-idioma-castellano.md`](ia/decisions/DEC-0010-idioma-castellano.md).

## Arranque de sesión (obligatorio)

1. Leer [`ia/INSTRUCTIONS.md`](ia/INSTRUCTIONS.md) — el router del harness.
2. Leer [`ia/CURRENT.md`](ia/CURRENT.md) — estado operativo actual.
3. Leer [`ia/MEMORY.md`](ia/MEMORY.md) — memoria diferencial.
4. Leer [`ia/decisions/INDEX.md`](ia/decisions/INDEX.md) — decisiones vigentes relevantes.
5. Leer [`ia/specs/README.md`](ia/specs/README.md) — índice de specs y diferencias aceptadas.
6. Si la tarea toca una feature activa: leer su SPEC + TRACKING + la tarea `T0n` en curso.

**Navegación:** usar los enlaces relativos como contrato. Si no resuelven, ubicar con `grep`/`glob`.

## Flujo de trabajo

| Paso | Acción |
|------|--------|
| 0 | Cargar contexto (arriba) |
| 1 | Clasificar la solicitud y preparar SPEC ([`ia/protocol/02-cycle.md`](ia/protocol/02-cycle.md), [`03-spec.md`](ia/protocol/03-spec.md)) |
| 2 | PLAN + tareas `T0n` ([`04-plan.md`](ia/protocol/04-plan.md)) |
| 3 | Implementar **una tarea atómica** y validarla de inmediato |
| 4 | Revisión adversarial si el riesgo lo exige ([`07-review.md`](ia/protocol/07-review.md)) |
| 5 | Registrar: TRACKING, CHANGELOG, CURRENT, MEMORY si aplica |
| 6 | Reportar `STATUS / CHANGED / VALIDATION / DOCUMENTATION / NEXT` |

## Comandos clave

| Qué | Comando |
|-----|---------|
| Comprobar el harness | `node ia/tools/check-harness.mjs --report` |
| Correr pruebas | `node ia/tools/run-tests.mjs` |
| Autoprueba del navegador | `node ia/qa/selftest-cdp.mjs` |
| Motores de QA disponibles | `node -e "import('./ia/qa/driver.mjs').then(m => m.listEngines().then(console.table))"` |
| Instalar el stack | `sudo bash ops/10-guacd.sh` … `ops/60-conexion-rdp.sh`, uno por etapa (definidos en F-001; sin ejecutar todavía) |
| Levantar en dev | No aplica: el producto es el host. Recargar: `sudo systemctl restart guacd guacamole-tomcat` · `sudo apache2ctl configtest && sudo systemctl reload apache2` |
| Build | No aplica: sin código propio compilado. `guacd` se compila en el host desde la release 1.6.0 |

## Proyecto

Aries_Access da acceso a las **VMs Windows de VMware desde el navegador** con Apache Guacamole: un solo punto de entrada, sin instalar agentes (AnyDesk/RustDesk) en los guests. Uso personal/interno de AriesDev. El despliegue es **nativo, sin Docker**: `guacd` + Tomcat 9 + PostgreSQL en `server01`, TLS por el **Apache del host**, y RDP como protocolo de acceso. Feature en curso: **F-001** (spec aprobada, en ejecución).

| Componente | Ruta | Stack |
|---|---|---|
| Host Guacamole | fuera del repo: `server01` (`192.168.18.70`) | Ubuntu 24.04 + guacd + Tomcat 9 + PostgreSQL 16 + Apache 2.4 |
| Aprovisionamiento | `ops/` | Bash idempotente (ASCII, LF) |
| Pruebas smoke | `tests/` | Node/Bash, lanzadas por `run-tests.mjs` |
| Panel de acceso propio (pendiente, F-002) | `public/` | HTML/CSS/JS estático |

Contexto de partida (investigación, 2026-10-21): [`ia/research/2026-10-21-guacamole-vms-navegador.md`](ia/research/2026-10-21-guacamole-vms-navegador.md).
Arquitectura: [`ia/ARCHITECTURE.md`](ia/ARCHITECTURE.md) · información estable: [`ia/PROJECT.md`](ia/PROJECT.md).

## Convenciones

- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `ui:`, `refactor:`), referenciando la feature: `feat(F-001): ...`.
- **Trazabilidad:** cada archivo de código tocado se etiqueta en su cabecera con el ID de feature y la tarea, p. ej. `// F-001 T01`.
- **Prefijos de feature:** `F-` features, `S-` seguridad y endurecimiento, `D-` despliegue y operación. Uno por módulo, consecutivo desde `001`.
- **Sin dependencias nuevas** sin decisión registrada en [`ia/decisions/`](ia/decisions/INDEX.md).

## Relacionados

- Router del harness: [`ia/INSTRUCTIONS.md`](ia/INSTRUCTIONS.md)
- Estado actual: [`ia/CURRENT.md`](ia/CURRENT.md)
- Riesgos y gates: [`ia/GATES.md`](ia/GATES.md)
