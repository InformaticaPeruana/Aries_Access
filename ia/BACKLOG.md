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

* [ ] Ninguno.

## P1 — Importante

* [ ] Cerrar los ítems 1-4 de [`CHECKLIST.md`](./CHECKLIST.md) — sin ellos la spec de F-001 se escribiría con suposiciones (feature: F-001)
* [ ] Declarar las pruebas del proyecto en `tests.commands` — hoy el chequeo de pruebas y la mitad de la verificación están en `SKIP` (owner: usuario)

## P2 — Mejora

* [ ] Panel de acceso propio en `public/` con tarjetas y deep links a cada conexión (feature: F-002)
* [ ] Extensión de branding (`.jar` con `guac-manifest.json`) para el login y la cabecera (owner: usuario)

## P3 — Ideas

* [ ] TOTP en Guacamole para las cuentas que no sean la del usuario
* [ ] Grabación de sesiones para auditoría (sube disco y ancho de banda)

## Roadmap (si existe)

<Fases posteriores acordadas con el negocio, sin detalle.>

## Relacionados

- Deuda con disparador: [`DEBT.md`](./DEBT.md) · Datos externos: [`CHECKLIST.md`](./CHECKLIST.md)
- Fallos conocidos: [`KNOWN-FAILURES.md`](./KNOWN-FAILURES.md) · Estado: [`CURRENT.md`](./CURRENT.md)
