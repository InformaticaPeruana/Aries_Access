# Agentes — contratos de subagente

Registro de los roles que puede tomar un subagente. Reglas generales en [`../protocol/12-subagents.md`](../protocol/12-subagents.md).

## Rol y contrato

| Rol | Contrato | Para qué | Obligatorio cuando |
|---|---|---|---|
| `REVIEWER` | [`REVIEWER.md`](./REVIEWER.md) | Revisión adversarial con contexto fresco | `Riesgo: alto` o `Areas` toca dinero/stock/fiscal/integraciones |
| `INVESTIGATOR` | [`INVESTIGATOR.md`](./INVESTIGATOR.md) | Causa raíz antes que fix | Algo falla y la causa no es evidente |
| `EXPLORER` | [`EXPLORER.md`](./EXPLORER.md) | Mapear un área sin modificarla | Antes de una spec que toca código desconocido |

## Cómo añadir un rol

1. Crea `ia/agents/<ROL>.md` con: objetivo, entradas exactas, qué busca o produce, formato de salida, y **límites explícitos** (qué no debe hacer).
2. Añádelo a la tabla de este archivo y a la de [`../protocol/12-subagents.md`](../protocol/12-subagents.md).
3. Si el rol introduce un invariante comprobable (por ejemplo, un veredicto persistido), añade su chequeo en [`../tools/check-harness.mjs`](../tools/check-harness.mjs).

## Reglas transversales

- **Modo:** `DETERMINISTIC · LOW_CONTEXT · SINGLE_PURPOSE · NO_CHATTER`.
- **Contexto mínimo:** solo objetivo, archivos relevantes, restricciones y formato de salida. Nunca todo el proyecto.
- **Sin decisiones de producto.** Si el subagente necesita decidir algo de producto, devuelve `UNKNOWN` y lo decide el usuario.
- **No toca la memoria central.** El agente principal integra y registra.
- **Su output es una afirmación, no un hecho.** El agente principal lo verifica antes de darlo por bueno.

## Relacionados

- Protocolo: [`../protocol/12-subagents.md`](../protocol/12-subagents.md) · Revisión: [`../protocol/07-review.md`](../protocol/07-review.md)
- Plantilla de revisión: [`../specs/_review_template.md`](../specs/_review_template.md) · Diseño (G3): [`../DESIGN.md`](../DESIGN.md)
