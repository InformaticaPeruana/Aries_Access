---
Feature: F-001
Task: T08
Status: partial
Depends: T07
---

# T08 — Conexión RDP a la VM Windows

## Objetivo

Dejar de faltar **lo que el usuario vino a buscar**: entrar desde el navegador al Windows de una VM del ESXi, sin instalar nada en el guest.

## Requerimientos

- R7 · AC7
- R7 · AC8

## Archivos previstos

- `ops/60-conexion-rdp.sh` (crea la conexión; sin secretos en el repo)

## Validación

En el navegador, por `https://<dominio>/guacamole/`, con el usuario propio:

1. Se abre el escritorio de la VM Windows (**AC7**). Evidencia: `ia/.harness/F-001/T08/escritorio.png`.
2. Copiar texto en el guest y pegarlo en el equipo local funciona, y al revés también; la unidad `Guacamole` se ve en el guest (**AC8**). Si el navegador bloquea el pegado automático, se acepta el menú **Clipboard** de Guacamole (`Ctrl+Alt+Shift`) y se deja dicho cuál se usó.
3. `ls -l /var/lib/guacd/drive` en el host muestra el directorio de la unidad compartida.

Cierra con las tres comprobaciones sobre **la VM real**, encendida en el ESXi.

## Trazabilidad

```
# F-001 T08
```

## Notas

- Parámetros: `hostname` = IP fija de la VM, **`security=any`** (negociacion automatica: forzar `nla` dio `Security negotiation failed` contra esta VM), **`ignore-cert=true`** (el guest usa certificado autofirmado), `enable-drive`, `drive-name=Guacamole`, **`drive-path=/var/lib/guacd/drive`**, **`create-drive-path=true`**, y el portapapeles en los dos sentidos (**`disable-copy=false`**, **`disable-paste=false`**; no existe un `enable-clipboard`).
- `guacd` corre como `daemon`: el directorio de la unidad tiene que ser escribible por ese usuario, o la unidad aparece vacía o no aparece.
- **El guest tiene que estar preparado** y eso es trabajo del usuario: RDP habilitado (`fDenyTSConnections=0`), firewall con el 3389 **acotado a la IP de `server01`** (no abierto a toda la LAN) e IP fija o reserva. Está en [`../../CHECKLIST.md`](../../CHECKLIST.md); si no está hecho, esta tarea queda `blocked` por preparación, no por Guacamole.
- Si el 3389 no responde desde `server01` (visto en T01), esta tarea está bloqueada por **red**, no por Guacamole: se para y se avisa.
- El usuario y la contraseña del guest se guardan como **parámetros de la conexión** en la base. Ojo: quedan **en claro** en `guacamole_connection_parameter` (verificado en T08), no cifrados; la base solo escucha en loopback y tiene su propia contraseña. **Nunca** en el repo ni en los scripts.

## Relacionados

- Spec: `ia/specs/infra/F-001/F-001.spec.md` · TRACKING: `ia/specs/infra/F-001/F-001-TRACKING.md`
- Datos externos: [`../../CHECKLIST.md`](../../CHECKLIST.md) · Investigación: [`../../research/2026-10-21-guacamole-vms-navegador.md`](../../research/2026-10-21-guacamole-vms-navegador.md)
