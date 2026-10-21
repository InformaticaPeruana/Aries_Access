---
Feature: F-001
Task: T03
Status: pending
Depends: T02
---

# T03 — `guacd` 1.6.0 como servicio

## Objetivo

Dejar de faltar el **motor de escritorio remoto**: `guacd` instalado, con RDP **de verdad** compilado dentro, y arrancando solo.

## Requerimientos

- R1, R2, R3
- **Aporta evidencia** a AC1, AC2 y AC9 (dueños: T05): ninguno se cierra aquí. El cierre propio de esta tarea es el resumen de `configure` con RDP habilitado.

## Archivos previstos

- `ops/10-guacd.sh` — aprovisionamiento idempotente.

## Validación

```bash
ssh humberto@192.168.18.70 'guacd -v'                      # sintaxis fijada en T01
ssh humberto@192.168.18.70 'systemctl is-enabled guacd; systemctl is-active guacd'
ssh humberto@192.168.18.70 'ss -ltnp | grep 4822'
ssh humberto@192.168.18.70 'grep -E "freerdp|RDP" /tmp/guacd-configure.txt'   # debe decir yes
```

Cierra cuando `configure` declaró RDP habilitado (resumen guardado), la versión es la 1.6.0, la unidad está `enabled`+`active` y el 4822 escucha **solo** en `127.0.0.1`.

## Trazabilidad

```
# F-001 T03
```

## Notas

- Se compila de fuentes desde la release **1.6.0**: dependencias de build, `./configure --with-systemd-dir=/etc/systemd/system`, `make`, `make install`, `systemctl daemon-reload`.
- **Guardar el resumen de `configure` como evidencia** y exigir `freerdp ... yes` y RDP habilitado: si falta FreeRDP, `guacd` arranca igual y T08 no conecta nunca.
- **FreeRDP: se fija `freerdp2-dev` (2.11.5 en Ubuntu 24.04)** y se registra la versión. El soporte de FreeRDP 3.x en Guacamole 1.6.0 es **experimental** (JIRA GUACAMOLE-2146): no se elige por ser más nuevo.
- **`guacd` tiene que escuchar solo en loopback** (R3): se fija `bind-host = 127.0.0.1` en `/etc/guacamole/guacd.conf` (o `-b 127.0.0.1` en la unidad). La unidad de upstream **no** lo hace: sin esto escucha en todas las interfaces y AC2 falla.
- **Crear `/var/lib/guacd` y `/var/lib/guacd/drive` con dueño `daemon`** (`install -d -o daemon -g daemon ...`): es la ruta de la unidad compartida de T08, y `guacd` corre como `daemon`.
- **La compilación satura el host**: 1 vCPU compartido con Supabase, n8n y Chatwoot. Se compila con `nice -n 19` y **sin `make -j`**, en una ventana acordada, y se avisa al usuario antes de empezar.
- El script va en **ASCII puro** y con finales de línea **LF** (AC11).
- Al terminar, **purgar el toolchain** de compilación: el disco es el recurso escaso.
- Si el disco vuelve a apretar antes de terminar, se para y se avisa.

## Relacionados

- Spec: `ia/specs/infra/F-001/F-001.spec.md` · TRACKING: `ia/specs/infra/F-001/F-001-TRACKING.md`
- Protocolo: [`../../protocol/04-plan.md`](../../protocol/04-plan.md) · Estados: [`../../protocol/05-tracking.md`](../../protocol/05-tracking.md)
