## DEC-0011 — Deuda por atajos aceptados, con disparador de cierre

Date: 2026-10-21
Status: active

Context:
En todo proyecto se aceptan simplificaciones para avanzar: solo camino feliz, sin concurrencia, un valor provisional, cobertura parcial. Cuando eso se hace sin registro, el atajo se convierte en comportamiento esperado y nadie recuerda que era temporal. El backlog no sirve para esto: mezcla "cosas por hacer" con "cosas que elegimos no hacer bien todavía", que son problemas distintos.

Decision:
Existirá un ledger dedicado: [`../DEBT.md`](../DEBT.md). Cada entrada declara feature, **techo aceptado**, **disparador observable**, impacto si no se cierra y estado.

El atajo se marca además en el código:

```
// deuda(DEUDA-001): <techo>, cerrar cuando <disparador>
```

**Nunca lo inicia el agente.** Existe solo detrás de una elección explícita del usuario, registrada en la respuesta.

## Reason

Un techo sin disparador es indistinguible de un descuido. Exigir una condición **observable** —un umbral de datos, una fecha, un evento— hace que la deuda tenga un momento de revisión y no dependa de la memoria. Se descartó usar `TODO` en el código: no dice qué falta ni cuándo importa.

## Consequences

- El reporte de [`../tools/check-harness.mjs`](../tools/check-harness.mjs) cuenta la deuda abierta: el número no se puede esconder.
- La deuda se revisa en cada retro; sin disparador cumplido, sigue abierta con dueño.
- Un `TODO` suelto en el código, sin entrada en el ledger, es un hallazgo de revisión.

## Relacionados

- Ledger: [`../DEBT.md`](../DEBT.md) · Protocolo: [`../protocol/04-plan.md`](../protocol/04-plan.md)
- Índice: [`INDEX.md`](./INDEX.md) · Diseño (G9): [`../DESIGN.md`](../DESIGN.md)
