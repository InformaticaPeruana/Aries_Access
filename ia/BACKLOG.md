# BACKLOG — trabajo pendiente

Lista compacta. No es documentación extensa y no lleva justificaciones largas: una línea por ítem, con prioridad y, si aplica, la feature que lo cerraría.

## Formato

```md
* [ ] P0 <qué> — <por qué importa en media línea> (feature: F-XXX | owner: <quién>)
```

`P0` = bloquea algo · `P1` = importante · `P2` = mejora · `P3` = idea.

**Regla:** lo que descubras fuera del alcance de una tarea se registra aquí, **no se implementa** ([`protocol/02-cycle.md`](./protocol/02-cycle.md)). Si es un atajo ya aceptado con disparador, va a [`DEBT.md`](./DEBT.md), no aquí.

---

## P0 — Bloquea

* [ ] Reserva de DHCP para `server01` — con IP dinámica, el vhost y el certificado se rompen solos (feature: F-001, owner: usuario)

## P1 — Importante

* [ ] Cerrar el ítem 6 de [`CHECKLIST.md`](./CHECKLIST.md) (sesiones concurrentes y quién accede) — define cuántos usuarios entran y si hace falta licencia RDS (feature: F-001, owner: usuario)
* [ ] Activar **UFW** en `server01` — hoy está inactivo con 21 contenedores escuchando; cambiarlo afecta a todo el host y no es alcance de F-001 (owner: usuario)
* [ ] Declarar las pruebas del proyecto en `tests.commands` — hoy el chequeo de pruebas está en `SKIP`; lo cierra T09 (feature: F-001)

## P2 — Mejora

* [ ] Renovar el certificado interno de `server01` antes del **2029-01-25** (`/etc/ssl/guacamole/`, autofirmado, sin ACME) — owner: usuario
* [ ] Averiguar por qué `%a` del access log de Tomcat sigue mostrando la IP del proxy aunque el ban ya separa por IP de cliente con `X-Forwarded-For` (observado en T07) — owner: agente
* [ ] Panel de acceso propio en `public/` con tarjetas y deep links a cada conexión (feature: F-002)
* [ ] Extensión de branding (`.jar` con `guac-manifest.json`) para el login y la cabecera (owner: usuario)

## P3 — Ideas

* [ ] TOTP para las cuentas que no sean la del usuario (F-001 sólo lo deja activo para las que entran)
* [ ] Grabación de sesiones para auditoría (sube disco y ancho de banda)

## Roadmap (si existe)

<Fases posteriores acordadas con el negocio, sin detalle.>

## Relacionados

- Deuda con disparador: [`DEBT.md`](./DEBT.md) · Datos externos: [`CHECKLIST.md`](./CHECKLIST.md)
- Fallos conocidos: [`KNOWN-FAILURES.md`](./KNOWN-FAILURES.md) · Estado: [`CURRENT.md`](./CURRENT.md)
