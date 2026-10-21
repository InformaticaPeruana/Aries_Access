---
Feature: F-001
Task: T07
Status: pending
Depends: T06
---

# T07 — vhost de Apache y TLS público

## Objetivo

Dejar de faltar el **acceso desde fuera**: un nombre con certificado válido que publique la webapp a través del **Apache que ya corre en el host** — y sólo ahora que las cuentas están endurecidas.

## Requerimientos

- R4 · **AC6** (cierra aquí)

## Archivos previstos

- `ops/50-apache-tls.sh`
- `/etc/apache2/sites-available/guacamole.conf` (en el host, no en el repo)

## Validación

En el host, **antes** de recargar:

```bash
ssh humberto@192.168.18.70 'sudo apache2ctl configtest && sudo apache2ctl -S'
ssh humberto@192.168.18.70 'ls -1 /etc/apache2/sites-enabled/'
```

Desde **fuera de la red interna** (no desde `server01`):

```bash
openssl s_client -connect <dominio>:443 -servername <dominio> -verify_return_error </dev/null 2>&1 | grep -i 'Verify return code'   # debe decir 0 (ok)
curl -sS https://<dominio>/guacamole/ | grep -i -m1 guacamole
```

Cierra cuando `configtest` da `Syntax OK`, el sitio nuevo está habilitado **junto** a los existentes, el código de verificación de la cadena es **0** (sin `-k`) y el cuerpo es el login de Guacamole.

## Trazabilidad

```
# F-001 T07
```

## Notas

- **Este es el momento en que Guacamole se hace público.** No arranca hasta que T06 esté `done`; es la regla de secuencia del PLAN y el motivo de que numere después de las cuentas.
- **El proxy del host es Apache 2.4.58**, no nginx ([DEC-0026](../../decisions/DEC-0026-arquitectura-despliegue-server01.md)). Hay que habilitar `proxy`, `proxy_http`, `proxy_wstunnel`, `ssl`, `headers` y `rewrite` (`a2enmod`) y escribir un vhost **nuevo**; `000-default` no se toca.
- Directivas que necesita el sitio:
  - `ProxyPass /guacamole/ http://127.0.0.1:8081/guacamole/` y su `ProxyPassReverse`;
  - `RewriteEngine On` con `RewriteCond %{HTTP:Upgrade} =websocket` y `RewriteRule ^/guacamole/(.*) ws://127.0.0.1:8081/guacamole/$1 [P,L]` — sin esto el escritorio no arranca (el WebSocket es el canal);
  - `ProxyPreserveHost On` y `RequestHeader set X-Forwarded-Proto "https"`.
- **Un vhost mal escrito tumba todos los sitios del host**: copia de `/etc/apache2` antes (`cp -a /etc/apache2 /root/apache2-antes-$(date +%F)`) y `apache2ctl configtest` obligatorio. Si el `configtest` falla, **no se recarga**.
- El certificado se emite con **`certbot certonly --webroot -w /var/www/html -d <dominio>`** (Apache ya sirve `/.well-known` en el 80) o con `dns-01`; **nunca** `certbot --apache`, que reescribe vhosts ajenos (R4).
- Tras publicar, **se revalida AC13 por el 443**: el límite de intentos tiene que dispararse con la IP real del cliente, no con `127.0.0.1`.
- Depende de datos externos que están en [`../../CHECKLIST.md`](../../CHECKLIST.md): el **dominio**, su **DNS** y el **reenvío del 443** en el router hacia `server01` (y el **80** si se emite con `webroot`). Sin ellos, esta tarea está `blocked` y no se fuerza.
- Si el 443 no está disponible, la alternativa cambia AC6 y hay que volver al usuario.

## Relacionados

- Spec: `ia/specs/infra/F-001/F-001.spec.md` · TRACKING: `ia/specs/infra/F-001/F-001-TRACKING.md`
- Arquitectura: [`../../decisions/DEC-0026-arquitectura-despliegue-server01.md`](../../decisions/DEC-0026-arquitectura-despliegue-server01.md) · Datos externos: [`../../CHECKLIST.md`](../../CHECKLIST.md)
