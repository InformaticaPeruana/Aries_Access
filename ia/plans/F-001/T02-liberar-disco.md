---
Feature: F-001
Task: T02
Status: done
Depends: T01
---

# T02 — Liberar disco en `server01` (gate) — **NO APLICA**

## Objetivo

Que quede **espacio suficiente medido** para el stack sin borrar nada que haga falta.

## Cierre (2026-10-21)

**No se borró nada y no hace falta.** T01 midió el disco real:

```
Filesystem                         Size  Used Avail Use% Mounted on
/dev/mapper/ubuntu--vg-ubuntu--lv   97G   47G   46G  51% /
```

**46 GB libres**: el dato de partida ("99%, 1.4 GB") era anterior a la limpieza de respaldos que hizo el proyecto `Aries_ServerLinux` (retiró 24 copias antiguas de `/var/www/backups`). El gate se **cancela** y la tarea cierra sin operación destructiva.

Umbral de seguridad que queda como regla: si `df -h /` baja de **10 GB** durante el despliegue, se para y se avisa.

## Trazabilidad

```
# F-001 T02
```

## Notas

- Si en el futuro un `apt-get install` dejara el disco por debajo de 10 GB, esta tarea se reabre **con gate completo** y confirmación explícita; no antes.
- Queda constancia en [`../../GATES.md`](../../GATES.md): la operación estaba catalogada y **no se ejecutó**.

## Relacionados

- Spec: `ia/specs/infra/F-001/F-001.spec.md` · TRACKING: `ia/specs/infra/F-001/F-001-TRACKING.md`
- Gates: [`../../GATES.md`](../../GATES.md) · Protocolo: [`../../protocol/08-gates.md`](../../protocol/08-gates.md)
