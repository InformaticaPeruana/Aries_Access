---
Feature: F-001
Task: T02
Status: pending
Depends: T01
---

# T02 — Liberar disco en `server01` (gate)

## Objetivo

Que quede **espacio suficiente medido** para el stack sin borrar nada que haga falta: el host está al 99% con 1.4 GB libres, y el tamaño real del stack lo midió T01.

## Requerimientos

- R1

## Archivos previstos

- Ninguno del repo. Inventario, prueba de recuperabilidad y resultado quedan en el TRACKING y en [`../../GATES.md`](../../GATES.md).

## Validación

```bash
ssh humberto@192.168.18.70 'df -h /; sudo du -sh /var/www/backups/* 2>/dev/null | sort -h | tail -20'
# PASO 1 — recuperabilidad, ANTES de borrar nada:
ssh humberto@192.168.18.70 'sudo tar -tzf <copia-retenida>.tar.gz | head'   # la copia que se conserva abre y lista
# PASO 2 — borrado acordado, solo rutas declaradas en el gate:
ssh humberto@192.168.18.70 'sudo rm -v <rutas exactas acordadas>'
# PASO 3 — comprobacion
ssh humberto@192.168.18.70 'df -h /'
```

Cierra con `df -h /` mostrando holgura suficiente para el stack medido en T01 (objetivo: ≥ 5 GB libres), la recuperabilidad probada **como paso separado y previo**, y sólo las rutas declaradas borradas.

## Trazabilidad

```
// F-001 T02
```

## Notas

- **Es una operación de una sola dirección** ([`../../protocol/08-gates.md`](../../protocol/08-gates.md)): se anuncia qué rutas exactas se borran, se declara qué se pierde, se **demuestra recuperabilidad** (una copia retenida que abre y lista, o una copia fuera del host) y se espera **confirmación explícita**. Sin el gate cerrado, esta tarea queda `blocked`.
- **Esta tarea bloquea toda instalación:** T03 en adelante no arranca hasta que esté `done`.
- El inventario del host estimó 30-45 GB liberables en `/var/www/backups` conservando las 2-3 copias más recientes; **esa cifra no está verificada en el repo**: se confirma con `du` antes de proponer el borrado, y el borrado lo decide el usuario, no el agente.
- **No se borra nada sin listarlo antes**, y no se toca `/var/lib/docker` ni `/opt/supabase`.

## Relacionados

- Spec: `ia/specs/infra/F-001/F-001.spec.md` · TRACKING: `ia/specs/infra/F-001/F-001-TRACKING.md`
- Gates: [`../../GATES.md`](../../GATES.md) · Protocolo: [`../../protocol/08-gates.md`](../../protocol/08-gates.md)
