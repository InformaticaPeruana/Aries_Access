# 07 — Revisión adversarial

**Quien implementa no es quien revisa.** Este es el gap de mayor riesgo en cualquier harness: sin revisión independiente, el mismo agente que escribió el código decide que está bien.

## Cuándo es obligatoria

Es obligatoria cuando la feature declara, en su frontmatter:

- `Riesgo: alto`, **o**
- `Areas:` intersecta con `dinero`, `stock`, `fiscal`, `integraciones`.

En esos casos la feature **no se cierra** sin `ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>-REVIEW.md` con un `Veredicto:`. Lo comprueba [`../tools/check-harness.mjs`](../tools/check-harness.mjs).

Recomendada (no obligatoria) para `Riesgo: medio` y para todo cambio que toque autenticación, permisos, migraciones o concurrencia.

## Cómo se hace

1. Se lanza el subagente [`REVIEWER`](../agents/REVIEWER.md) con **contexto fresco**. Recibe la SPEC, los AC y el **diff**, no tu razonamiento.
2. El reviewer busca explícitamente: bugs que pasan el build pero rompen en producción, casos borde sin cubrir, desviaciones spec↔código, efectos colaterales en otras features, y ACs que la evidencia no demuestra.
3. Emite `APROBADO | APROBADO_CON_OBSERVACIONES | RECHAZADO` + hallazgos con severidad.
4. Se persiste en `-REVIEW.md`. Los hallazgos bloqueantes se convierten en tareas nuevas o en entradas de [`../DEBT.md`](../DEBT.md) con disparador.

## Segunda opinión de otro modelo

Si hay disponible otro modelo o CLI (otro proveedor, otro agente), úsalo para la revisión de features de `Riesgo: alto`. Dos modelos independientes acordando algo es una señal fuerte; **no es una orden**: el usuario decide.

> Nota de honestidad: si no hay un segundo modelo disponible, dilo. Una revisión con contexto fresco del mismo modelo **no** es lo mismo que una independiente, y no debe presentarse como si lo fuera.

## Investigación antes que solución

Cuando algo falla y la causa no es evidente, no se parchea: se investiga primero. `Iron Law: no hay fix sin causa raíz.` Usa [`../agents/INVESTIGATOR.md`](../agents/INVESTIGATOR.md) y registra el hallazgo en `research/` si tiene valor futuro.

## Relacionados

- Contratos de subagentes: [`../agents/REVIEWER.md`](../agents/REVIEWER.md) · [`12-subagents.md`](./12-subagents.md)
- Validación: [`06-validation.md`](./06-validation.md)
- Plantilla de revisión: [`../specs/_review_template.md`](../specs/_review_template.md)
