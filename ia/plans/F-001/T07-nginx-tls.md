---
Feature: F-001
Task: T07
Status: pending
Depends: T06
---

# T07 — vhost de nginx y TLS público

## Objetivo

Dejar de faltar el **acceso desde fuera**: un nombre con certificado válido que publique la webapp a través del nginx que ya corre en el host — y sólo ahora que las cuentas están endurecidas.

## Requerimientos

- R4 · AC6

## Archivos previstos

- `ops/50-nginx-tls.sh`
- `/etc/nginx/sites-available/guacamole.conf` (en el host, no en el repo)

## Validación

Desde **fuera de la red interna** (no desde `server01`):

```bash
openssl s_client -connect <dominio>:443 -servername <dominio> </dev/null 2>/dev/null | openssl x509 -noout -issuer -dates
openssl s_client -connect <dominio>:443 -servername <dominio> -verify_return_error </dev/null 2>&1 | grep -i "Verify return code"   # debe decir 0 (ok)
curl -sS https://<dominio>/guacamole/ | grep -i -m1 guacamole
```

Y en el host, antes de recargar, y después:

```bash
ssh humberto@192.168.18.70 'sudo nginx -t'
ssh humberto@192.168.18.70 'sudo nginx -T > /tmp/nginx-despues.txt && diff /tmp/nginx-antes.txt /tmp/nginx-despues.txt'
```

Cierra cuando el emisor del certificado es una CA pública (sin `-k`), el cuerpo es el login de Guacamole, `nginx -t` pasa y el `diff` de `nginx -T` **sólo** muestra el vhost nuevo.

## Trazabilidad

```
# F-001 T07
```

## Notas

- **Este es el momento en que Guacamole se hace público.** No arranca hasta que T06 esté `done`; es la regla de secuencia del PLAN y el motivo de que numere después de las cuentas.
- **Un vhost mal escrito tumba todos los sitios del host.** Se escribe un archivo **nuevo** con `server_name` propio, se valida con `nginx -t` y se compara `nginx -T` contra la copia de T01: ningún vhost ajeno puede cambiar.
- El sitio necesita `proxy_pass http://127.0.0.1:8081/guacamole/`, `Upgrade`/`Connection` para WebSocket, **`proxy_buffering off`** y **`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`**: sin el último, Guacamole ve a todos los clientes como `127.0.0.1`, el límite de intentos bloquearía a todos a la vez y el historial guardaría IPs falsas. Se completa con el `RemoteIpValve` de T05.
- **Con el vhost ya publicado se revalida AC13 por el 443**: el bloqueo tiene que dispararse con la IP real del cliente, no con `127.0.0.1`.
- El certificado se emite con **`webroot` o `dns-01`**, nunca con `certbot --nginx`: ese modo reescribe archivos de `/etc/nginx/sites-*` y tocaría vhosts ajenos (R4).
- Depende de datos externos que están en [`../../CHECKLIST.md`](../../CHECKLIST.md): el **dominio**, su **DNS** y el **reenvío del 443** en el router hacia `server01`. Sin ellos, esta tarea está `blocked` y no se fuerza.
- Si el 443 no está disponible, la alternativa cambia AC6 y hay que volver al usuario.

## Relacionados

- Spec: `ia/specs/infra/F-001/F-001.spec.md` · TRACKING: `ia/specs/infra/F-001/F-001-TRACKING.md`
- Datos externos: [`../../CHECKLIST.md`](../../CHECKLIST.md) · Gates: [`../../GATES.md`](../../GATES.md)
