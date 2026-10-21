# 12 — Subagentes

Usa subagentes **solo** cuando aportan valor claro. Los **disparadores observables** —cuándo sí y cuándo no, con la condición concreta— están en [`14-context.md`](./14-context.md) §2. No para tareas simples: el coste de coordinación supera el ahorro.

## Modo obligatorio

Todos los subagentes trabajan en modo:

```
DETERMINISTIC · LOW_CONTEXT · SINGLE_PURPOSE · NO_CHATTER
```

Cada subagente recibe **únicamente**: objetivo · archivos relevantes · restricciones · formato exacto de salida. Nunca le envíes todo el contexto del proyecto salvo necesidad extrema.

## Contrato base

```
ROLE
You are a deterministic single-purpose software agent.

OBJECTIVE
{objective}

INPUT
{minimum_required_context}

FILES
{relevant_files}

RULES
- Do only the requested task.
- Do not expand scope.
- Do not redesign unrelated code.
- Do not generate explanations unless required.
- Prefer deterministic solutions.
- Do not create new abstractions unless necessary.
- Do not modify documentation.
- Do not make product decisions.
- Return concise structured output.
- If uncertain, report UNKNOWN instead of guessing.

OUTPUT
RESULT: PASS | FAIL | UNKNOWN
FINDINGS: *
CHANGES: *
RISKS: *
```

## Roles

| Rol | Contrato | Para qué |
|---|---|---|
| `REVIEWER` | [`../agents/REVIEWER.md`](../agents/REVIEWER.md) | Revisión adversarial por riesgo ([`07-review.md`](./07-review.md)) |
| `INVESTIGATOR` | [`../agents/INVESTIGATOR.md`](../agents/INVESTIGATOR.md) | Causa raíz antes que fix ([`06-validation.md`](./06-validation.md)) |
| `EXPLORER` | [`../agents/EXPLORER.md`](../agents/EXPLORER.md) | Mapear un área del código sin modificarla |

Añade roles nuevos siguiendo [`../agents/README.md`](../agents/README.md).

## Responsabilidad del agente principal

Los subagentes **no** mantienen la memoria global. El agente principal:

- integra resultados y verifica lo que el subagente afirma;
- decide cambios;
- actualiza SPEC, PLAN, TRACKING, CURRENT, MEMORY, CHANGELOG y decisiones.

**Nunca permitas que varios subagentes modifiquen a la vez la memoria central.** Un archivo compartido, un dueño.

## Verificación cruzada

El output de un subagente es **una afirmación, no un hecho**. Si dice `PASS`, se comprueba con el mismo rigor que el de un humano: reproduce el comando o revisa el artefacto. Un subagente que se autoaprueba no es una revisión.

## Relacionados

- Revisión: [`07-review.md`](./07-review.md) · Validación: [`06-validation.md`](./06-validation.md)
- Índice de roles: [`../agents/README.md`](../agents/README.md)
