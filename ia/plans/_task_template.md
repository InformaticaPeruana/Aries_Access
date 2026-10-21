---
Feature: F-XXX
Task: T0n
Status: pending              # pending | in_progress | done | partial | blocked
Depends: -
---

# T0n — <título corto>

> Copia este archivo a `ia/plans/<FEATURE-ID>/T0n-<nombre>.md`.
> Una **orden de trabajo**: 15-50 líneas. Es lo único que se lee para implementar, junto al TRACKING.

## Objetivo

<Qué deja de faltar cuando esta tarea termina. Una sola cosa.>

## Requerimientos

<Por ID. **No copies el texto** de la spec (regla "apuntar, no copiar").>

- R1 · AC1
- R2

## Archivos previstos

<Estimación. Si un archivo no está aquí y se necesita tocar, se justifica.>

- `<ruta>`

## Validación

<El comando, consulta o prueba de camino de usuario exacto que cierra esta tarea. Concreto: si no se puede ejecutar tal cual, no sirve.>

```bash
<comando>
```

## Trazabilidad

Todo archivo de código tocado se etiqueta en su cabecera:

```
// F-XXX T0n
```

Si se acepta un atajo, se marca con el id de su entrada en [`../../DEBT.md`](../../DEBT.md):

```
// deuda(DEUDA-XXX): <techo>, cerrar cuando <disparador>
```

## Notas

<Decisiones locales, trampas encontradas, lo que sorprendió. Breve.>

- —

## Relacionados

- Spec: `ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>.spec.md` · TRACKING: `ia/specs/<modulo>/<FEATURE-ID>/<FEATURE-ID>-TRACKING.md`
- Protocolo: [`../../protocol/04-plan.md`](../../protocol/04-plan.md) · Estados: [`../../protocol/05-tracking.md`](../../protocol/05-tracking.md)
