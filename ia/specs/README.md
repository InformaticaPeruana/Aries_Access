# Specs — inventario

Fuente de verdad de las especificaciones: `ia/specs/` ([DEC-0001](../decisions/DEC-0001-metodologia-3-documentos.md)). Este archivo es el **índice** y el registro de **diferencias aceptadas**: sin él, una desviación deliberada se confunde con deuda.

## Estructura

```
ia/specs/README.md                                   # este índice
ia/specs/_template.md                                # plantilla de spec
ia/specs/_tracking_template.md                       # plantilla de TRACKING
ia/specs/_review_template.md                         # plantilla de revisión
ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>.spec.md
ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>-TRACKING.md
ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>-REVIEW.md   # solo si el riesgo lo exige
```

Todo `<FEATURE-ID>` nuevo debe aparecer en la tabla de abajo. Lo comprueba [`../tools/check-harness.mjs`](../tools/check-harness.mjs).

## Features

Prefijos de ID (uno por módulo, consecutivo desde `001`): `F-` features, `S-` seguridad y endurecimiento, `D-` despliegue y operación.

| ID | Módulo | Título | Riesgo | Estado |
|----|--------|--------|--------|--------|
| [F-001](./infra/F-001/F-001.spec.md) | infra | Desplegar Guacamole nativo en `server01` con acceso RDP a las VMs del ESXi | alto | in_progress |
| [F-002](./ui/F-002/F-002.spec.md) | ui | Identidad visual de Aries Access Infrastructure sobre Guacamole | medio | completed |
| [F-003](./seguridad/F-003/F-003.spec.md) | seguridad | Observabilidad, grabación de sesiones y endurecimiento del acceso remoto | alto | in_progress |

## Diferencias aceptadas / superseded

Desviaciones detectadas entre spec y código que **no son deuda**: decisiones posteriores, capacidades superadas o mejoras. Se declaran para no perderlas y para no contarlas dos veces.

| Feature | Diferencia | Por qué no es deuda |
|---------|------------|---------------------|
| — | — | — |

> Gaps que **sí** son deuda → [`../BACKLOG.md`](../BACKLOG.md). Atajos aceptados con disparador → [`../DEBT.md`](../DEBT.md). Fallos conocidos → [`../KNOWN-FAILURES.md`](../KNOWN-FAILURES.md).

## Relacionados

- Protocolo: [`../protocol/03-spec.md`](../protocol/03-spec.md) · Planes: [`../plans/_plan_template.md`](../plans/_plan_template.md)
- Estado: [`../CURRENT.md`](../CURRENT.md) · Decisiones: [`../decisions/INDEX.md`](../decisions/INDEX.md)
