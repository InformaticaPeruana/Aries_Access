---
Feature: F-002
Task: T02
Status: pending
Depends: T01
---

# T02 — Portada estática con las máquinas

## Objetivo

Una portada propia, en `public/`, que sea la cara del servicio: tarjetas por máquina, con la marca y un enlace a cada conexión.

## Requerimientos

- R6 · **AC5** (se cierra aquí)

## Archivos previstos

- `public/index.html`, `public/styles.css`, `public/app.js` (opcional, mejora progresiva)
- Decisión pendiente: quién sirve `public/` (el Apache de `server01` o el nginx del usuario).

## Validación

- Abrir la portada: una tarjeta por máquina (nombre, IP, usuario) y enlace a su conexión.
- Deshabilitar JavaScript: la portada sigue legible y los enlaces siguen funcionando.
- Si Guacamole está caído, la portada lo indica sin romperse.

## Trazabilidad

```
// F-002 T02
```

## Notas

- **Estática y sin build:** HTML/CSS/JS a mano, sin framework ni dependencias.
- **La portada no autentica:** el login es el de Guacamole. Un enlace que lleve a una conexión concreta es un *deep link*, y sólo es estable mientras la conexión exista (el `connection_id` no se conserva si se recrea).
- Usa los **mismos tokens** que T01, para que no haya dos paletas.
- Antes de implementarla hay que decidir **dónde se sirve**: si la publica el Apache de `server01` en el 443, queda detrás del nginx del usuario y sin dominio propio; si se publica en el nginx, es otro vhost que administra el usuario. Es una decisión de despliegue, no de diseño.

## Relacionados

- Spec: [`../../specs/ui/F-002/F-002.spec.md`](../../specs/ui/F-002/F-002.spec.md) · TRACKING: [`../../specs/ui/F-002/F-002-TRACKING.md`](../../specs/ui/F-002/F-002-TRACKING.md)
- Protocolo: [`../../protocol/04-plan.md`](../../protocol/04-plan.md) · Decisiones: [`../../decisions/DEC-0027-nginx-externo-y-apache-backend.md`](../../decisions/DEC-0027-nginx-externo-y-apache-backend.md)
