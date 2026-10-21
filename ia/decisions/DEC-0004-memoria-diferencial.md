## DEC-0004 — Memoria diferencial y presupuesto por archivo

Date: 2026-10-21
Status: active

Context:
En el harness anterior, `CURRENT.md` —declarado en su propio protocolo como "el archivo más importante para recuperar contexto" y "pequeño"— terminó con 115 líneas y **36 500 caracteres**, diez líneas de más de 1500 caracteres, narrando features completadas. Es el primer archivo que lee cada sesión: el coste se paga siempre. El problema no fue descuido; fue no tener un límite que doliera.

Decision:
Cada archivo tiene **una** función y un **presupuesto de tamaño**:

- `CURRENT.md` ≤ 60 líneas — solo el ahora.
- `MEMORY.md` ≤ 220 líneas — solo conocimiento reutilizable.
- `CHANGELOG.md` — historial, sin límite (no se lee en el arranque).
- `specs/` — contratos; el estado vive en el TRACKING.

La memoria es **diferencial**, no acumulativa: cuando un dato deja de ser relevante se reemplaza.

Narrar una feature completada en `CURRENT.md` está prohibido: eso pertenece al `CHANGELOG.md` y a su spec.

Reason:
Un límite comprobado cambia el comportamiento; una recomendación no. Se descartó dejar `CURRENT.md` sin presupuesto confiando en la disciplina: ya se probó y se degradó.

Consequences:
- El presupuesto lo comprueba [`../tools/check-harness.mjs`](../tools/check-harness.mjs) como ratchet ([DEC-0008](./DEC-0008-presupuestos-ratchet.md)).
- Cuando un archivo se llena, se mueve contenido a su lugar correcto; **no** se sube el presupuesto.
- Subir un presupuesto es una decisión explícita y registrada aquí.

## Relacionados

- Protocolo: [`../protocol/10-memory-tokens.md`](../protocol/10-memory-tokens.md) · Estado: [`../CURRENT.md`](../CURRENT.md)
- Índice: [`INDEX.md`](./INDEX.md) · Diseño (G2): [`../DESIGN.md`](../DESIGN.md)
