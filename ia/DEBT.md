# DEBT — atajos aceptados

Registro de **simplificaciones deliberadas** que se aceptaron para avanzar, cada una con el disparador que la cierra. Ver [DEC-0011](./decisions/DEC-0011-deuda-atajos.md) y [`protocol/04-plan.md`](./protocol/04-plan.md).

**Esto no es el backlog.** El backlog son cosas por hacer; esto son cosas que **elegimos no hacer bien todavía**, con una condición objetiva de revisión.

**Regla:** un atajo nunca lo decide el agente. Existe solo detrás de una elección explícita del usuario, y se marca en el código con:

```
// deuda(<ID>): <techo aceptado>, cerrar cuando <disparador>
```

## Campos de cada entrada

| Campo | Significado |
|---|---|
| ID | `DEUDA-001`, consecutivo |
| Feature | De dónde salió |
| Techo aceptado | Qué NO cubre hoy (sé concreto: "solo camino feliz", "sin concurrencia", "valor fijo") |
| Disparador | Condición **observable** que obliga a revisarlo (un umbral de datos, una fecha, un evento) |
| Impacto si no se cierra | Qué se rompe o se degrada |
| Estado | `abierta \| revisada \| cerrada` |

---

## DEUDA-001 — <título>

- **Feature:** <FEATURE-ID> · **Fecha:** <YYYY-MM-DD> · **Estado:** abierta
- **Techo aceptado:** <...>
- **Disparador:** <...>
- **Impacto si no se cierra:** <...>
- **Cierre:** <qué se hará y en qué feature>

---

## Cómo se revisa

La deuda **no se acumula en silencio**: se revisa en cada retro (ver [`protocol/13-close-git.md`](./protocol/13-close-git.md)). `node ia/tools/check-harness.mjs --report` cuenta la deuda abierta para que el número no se esconda.

## Relacionados

- Backlog: [`BACKLOG.md`](./BACKLOG.md) · Decisiones: [`decisions/INDEX.md`](./decisions/INDEX.md)
- Marcador en código: [`protocol/04-plan.md`](./protocol/04-plan.md) · Ratchet: [`tools/check-harness.mjs`](./tools/check-harness.mjs)
