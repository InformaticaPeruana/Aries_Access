---
Feature: F-001
Task: T06
Status: pending
Depends: T05
---

# T06 — Cuentas endurecidas, TOTP y límite de intentos

## Objetivo

Dejar de faltar el **control de acceso**, **antes** de que el servicio se vea desde Internet: nadie entra con la cuenta por defecto, hace falta un segundo factor, y los intentos fallidos tienen tope.

## Requerimientos

- R6 · **AC5** (cierra aquí)
- R6 · **AC13** (cierra aquí): límite de intentos con la extensión `ban`

## Archivos previstos

- `ops/40-cuentas-totp.sh` (sin secretos: los pide por entorno)

## Validación

Contra la webapp **en `http://127.0.0.1:8081/guacamole/`** (todavía no está publicada al 443):

1. `guacadmin`/`guacadmin` **no** entra.
2. El usuario propio entra con contraseña **y** código TOTP.
3. Con el código TOTP de hace 5 minutos, **no** entra.
4. **AC13:** agotados los intentos fallidos configurados desde la misma IP, el login se rechaza con **"Too many failed authentication attempts. Please try again later."** (`LOGIN.ERROR_TOO_MANY_ATTEMPTS`) durante la ventana configurada; la extensión `guacamole-auth-ban-1.6.0.jar` está en `extensions/` y los parámetros están puestos.

```bash
ssh humberto@192.168.18.70 'ls -1 /etc/guacamole/extensions/ | grep -E "totp|ban"'
ssh humberto@192.168.18.70 'grep -rE "ban-(max-invalid-attempts|address-duration)" /etc/guacamole/'
ssh humberto@192.168.18.70 'for i in $(seq 1 6); do curl -s -o /dev/null -w "%{http_code} " -X POST http://127.0.0.1:8081/guacamole/api/tokens -d "username=guacadmin&password=mala$i"; done; echo'
```

Cierra con las cuatro comprobaciones. Evidencia: capturas en `ia/.harness/F-001/T06/`.

## Trazabilidad

```
# F-001 T06
```

## Notas

- **Esta tarea va antes de T07 a propósito.** Abrir el 443 con `guacadmin`/`guacadmin` y sin segundo factor deja en Internet un gateway RDP con la contraseña por defecto. Si T07 tiene que esperar, espera. Por eso el script es `ops/40-` y el vhost es `ops/50-`: el orden numérico **es** el orden de ejecución.
- **AC13 se revalida por el 443 después de T07.** Detrás de nginx, sin `X-Forwarded-For` y sin `RemoteIpValve`, todos los clientes llegan como `127.0.0.1` y cinco fallos de cualquiera bloquearían a todos (auto-DoS). T05 y T07 ya dejan eso configurado; la revalidación es de esta tarea o de T09.
- Se instala la extensión de TOTP de 1.6.0 (`guacamole-auth-totp-1.6.0.jar`) en `GUACAMOLE_HOME/extensions/` y se habilita el parámetro correspondiente. La **misma versión** que `guacd` y la webapp (R2).
- **Límite de intentos:** en 1.6.0 lo da la extensión **`guacamole-auth-ban-1.6.0.jar`** (`ban-max-invalid-attempts`, `ban-address-duration`). Se instala y se **verifica el bloqueo de verdad** (AC13). Si el efecto no se puede demostrar, no se da por hecho: se declara en [`../../DEBT.md`](../../DEBT.md) con disparador y se corrige R6, porque un límite que no se comprueba no está.
- Las contraseñas y los secretos TOTP se guardan **fuera del repo**; el script los lee de variables de entorno.
- Los usuarios son nominales (uno por persona): no se comparten credenciales. Cuántos y quiénes lo fija el ítem 6 de [`../../CHECKLIST.md`](../../CHECKLIST.md) — **es lo único que bloquea a esta tarea**.

## Relacionados

- Spec: `ia/specs/infra/F-001/F-001.spec.md` · TRACKING: `ia/specs/infra/F-001/F-001-TRACKING.md`
- Datos externos: [`../../CHECKLIST.md`](../../CHECKLIST.md) · Áreas de riesgo: [`../../decisions/DEC-0024-adopcion-aries-access.md`](../../decisions/DEC-0024-adopcion-aries-access.md)
