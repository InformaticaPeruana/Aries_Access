# AGENTS.md — <PROYECTO>

> Copia este archivo a `AGENTS.md` en la **raíz del proyecto** y rellena los `<...>`.
> Es la puerta de entrada de cada sesión: mantenlo corto y sin datos del bootstrap.

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
| 1 | Clasificar la solicitud y preparar SPEC ([`protocol/02-cycle.md`](ia/protocol/02-cycle.md), [`03-spec.md`](ia/protocol/03-spec.md)) |
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
| <build> | `<npm run build / flutter analyze / ...>` |
| <dev> | `<npm run dev / php -S ... / ...>` |

## Proyecto

<Descripción de 2-3 líneas: qué es, para quién, y las restricciones que importan.>

| Componente | Ruta | Stack |
|---|---|---|
| <...> | `<...>` | <...> |

Arquitectura: [`ia/ARCHITECTURE.md`](ia/ARCHITECTURE.md) · información estable: [`ia/PROJECT.md`](ia/PROJECT.md).

## Convenciones

- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `ui:`, `refactor:`), referenciando la feature: `feat(F-001): ...`.
- **Trazabilidad:** cada archivo de código tocado se etiqueta en su cabecera con `// <FEATURE-ID> T0n`.
- **Sin dependencias nuevas** sin decisión registrada en `ia/decisions/`.

## Relacionados

- Router del harness: [`ia/INSTRUCTIONS.md`](ia/INSTRUCTIONS.md)
- Estado actual: [`ia/CURRENT.md`](ia/CURRENT.md)
- Riesgos y gates: [`ia/GATES.md`](ia/GATES.md)
