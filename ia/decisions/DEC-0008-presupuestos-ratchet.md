## DEC-0008 — Presupuestos y ratchets sobre lo que se lee cada sesión

Date: 2026-10-21
Status: active

Context:
Dos fuerzas empujan en direcciones opuestas: la documentación útil crece, y el coste de leerla se paga en cada sesión. Exigir limpieza retroactiva de golpe es irreal y desincentiva la adopción; no exigir nada produce el resultado del harness anterior.

Decision:
Los archivos que se leen en cada arranque de sesión tienen presupuesto de tamaño, y el presupuesto funciona como **ratchet**:

- El número actual se congela en [`../tools/harness-baseline.json`](../tools/harness-baseline.json) con `--update-baseline`.
- A partir de ahí **no se puede empeorar**; mejorar y volver a congelar es la vía.
- Los mismos ratchets aplican a la cobertura de trazabilidad en código (archivos con etiqueta `<FEATURE-ID> T0n`, que no puede bajar).

Presupuestos vigentes: `AGENTS.md` ≤ 140 · `ia/INSTRUCTIONS.md` ≤ 120 · `ia/CURRENT.md` ≤ 60 · `ia/MEMORY.md` ≤ 220 · `ia/specs/README.md` ≤ 140 líneas.

Reason:
El ratchet permite adoptar el harness en un proyecto que ya tiene deuda documental sin exigir una limpieza heroica, y al mismo tiempo garantiza que no se degrade. Se descartó el umbral absoluto sin línea base: castigaría al proyecto por su historia en lugar de por su comportamiento.

Consequences:
- `--update-baseline` baja un número solo cuando el cambio ya está commiteado y justificado.
- Subir un presupuesto es una decisión, no un arreglo.

## Relacionados

- Config: [`../tools/harness.config.json`](../tools/harness.config.json) · Mecanismo: [`../tools/check-harness.mjs`](../tools/check-harness.mjs)
- Protocolo: [`../protocol/10-memory-tokens.md`](../protocol/10-memory-tokens.md) · Diseño (G7): [`../DESIGN.md`](../DESIGN.md)
