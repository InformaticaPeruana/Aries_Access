## DEC-0014 — La evidencia debe recorrer el camino del usuario

Date: 2026-10-21
Status: active

Context:
Es fácil declarar `PASS` con una prueba que consulta la base de datos o que llama al servicio directamente. Ambas demuestran que el almacén guardó algo, no que el usuario pueda lograrlo. En código donde el valor está en el flujo completo (una venta, un cobro, un despacho), la evidencia que no cruza la capa de entrada no prueba el criterio de aceptación.

Decision:
Un AC funcional observable se cierra con evidencia que recorre **el mismo camino que el usuario**, según la superficie:

- Web/UI → navegador real (petición HTTP real, captura, consola sin errores).
- API → llamada HTTP real con status y payload, guardada como artefacto.
- CLI → comando real, salida y exit code.
- Job/worker → ejecución real y efecto observable.
- Webhook/integración → entrega real y respuesta del receptor.

Cada superficie tiene un camino de humo definido, y su resultado va al TRACKING.

## Reason

Cierra el hueco entre "funciona en el almacén" y "funciona para quien lo usa". Se descartó exigir E2E automatizado para todo: en proyectos sin esa infraestructura sería irreal y se saltaría. La regla es sobre **qué** constituye evidencia, no sobre con qué herramienta se produce.

## Consequences

- Una consulta SQL o un test unitario del servicio **no** cierran un AC de comportamiento observable.
- Si no hay automatización, la prueba manual también produce artefacto: captura más la línea de log que demuestra el efecto.
- `PASS` sin artefacto es una afirmación, no una validación ([`../protocol/06-validation.md`](../protocol/06-validation.md)).

## Relacionados

- Protocolo: [`../protocol/09-qa.md`](../protocol/09-qa.md) · Plantilla: [`../qa/smoke.example.mjs`](../qa/smoke.example.mjs)
- Índice: [`INDEX.md`](./INDEX.md) · Diseño (G8): [`../DESIGN.md`](../DESIGN.md)
