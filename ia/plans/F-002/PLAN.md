# PLAN-F-002

> **Un índice, no un documento.** Debe leerse completo en una pantalla. El detalle baja a las tareas ([DEC-0009](../../decisions/DEC-0009-tareas-ordenes-trabajo.md)).

Spec: `ia/specs/ui/F-002/F-002.spec.md`

## Reglas de secuencia (no negociables)

1. **Primero el branding (T01), después la portada (T02):** la portada necesita los tokens ya definidos y probados en el login.
2. **Nada de tocar el `.war`**: si una idea sólo se puede hacer modificando el producto, no se hace y se anota en el BACKLOG.

## Tareas

| ID | Objetivo | Depende de | Requerimientos | Validación |
|----|----------|------------|----------------|------------|
| [T01](./T01-branding.md) | Extensión de branding oficial: nombre, paleta y CSS del login | - | R1, R2, R3, R4, R5 | AC1, AC2, AC3, AC4 + regresión de F-001 |
| [T02](./T02-portal.md) | Portada estática en `public/` con una tarjeta por máquina | T01 | R6 | AC5, con y sin JavaScript |

## Riesgos

- **Selectores frágiles:** el CSS se apoya en clases del build de Guacamole; si cambian de versión, se rompe. Mitigación: inspeccionar el CSS desplegado antes de escribir, y aceptar que el branding es lo primero que hay que revisar al actualizar Guacamole.
- **Un CSS mal escrito puede dejar el login inusable.** Mitigación: la extensión se instala con copia previa y se prueba el login completo antes de darla por buena; si algo se rompe, se retira el `.jar` y se reinicia.
- **El logo no existe todavía.** Sin activo, T01 no inventa uno: aplica nombre y paleta. El logo queda como dato externo en el CHECKLIST.
- **Hexes de marca no confirmados:** si el usuario tiene el manual, se sustituyen los tokens; la estructura no cambia.

## Atajos previstos

- **Ninguno.** Si T02 se posterga, queda en [`../../BACKLOG.md`](../../BACKLOG.md) con su disparador, no a medias.

## Relacionados

- Spec: `ia/specs/ui/F-002/F-002.spec.md` · TRACKING: `ia/specs/ui/F-002/F-002-TRACKING.md`
- Protocolo: [`../../protocol/04-plan.md`](../../protocol/04-plan.md) · Feature base: [`../F-001/PLAN.md`](../F-001/PLAN.md)
