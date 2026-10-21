## DEC-0006 — Revisión adversarial obligatoria por riesgo

Date: 2026-10-21
Status: active

Context:
El ciclo del harness anterior era `REQUEST → CONTEXT → SPEC → PLAN → IMPLEMENT → VALIDATE → RECORD`. No existía revisión. Quien implementaba era quien validaba y quien declaraba el éxito: el mismo agente, con el mismo razonamiento y los mismos puntos ciegos. En código con efecto financiero o fiscal, ese es el riesgo más caro del proceso.

Decision:
Existe una fase `REVIEW` obligatoria cuando la spec declara `Riesgo: alto` **o** `Areas` intersecta con `dinero`, `stock`, `fiscal` o `integraciones`.

- La ejecuta el subagente [`REVIEWER`](../agents/REVIEWER.md) con contexto fresco: recibe spec, AC y diff, **no** el razonamiento del implementador.
- Veredicto `APROBADO | APROBADO_CON_OBSERVACIONES | RECHAZADO`, persistido en `<FEATURE-ID>-REVIEW.md`.
- Hallazgos bloqueantes → tareas nuevas o entradas en [`../DEBT.md`](../DEBT.md) con disparador.

Recomendada para `Riesgo: medio` y para todo cambio que toque autenticación, permisos, migraciones o concurrencia.

Reason:
Una revisión con contexto fresco encuentra lo que la autovalidación no puede. Se descartó hacerla obligatoria siempre: el coste sería desproporcionado en cambios triviales y terminaría por saltarse.

Consequences:
- El gate lo comprueba [`../tools/check-harness.mjs`](../tools/check-harness.mjs): una feature de riesgo sin `-REVIEW.md` no cierra.
- Honestidad obligatoria: si no hay un segundo modelo disponible, se dice. Una revisión del mismo modelo no es independiente y no se presenta como tal.

## Relacionados

- Protocolo: [`../protocol/07-review.md`](../protocol/07-review.md) · Contrato: [`../agents/REVIEWER.md`](../agents/REVIEWER.md)
- Índice: [`INDEX.md`](./INDEX.md) · Diseño (G3): [`../DESIGN.md`](../DESIGN.md)
