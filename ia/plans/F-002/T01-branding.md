---
Feature: F-002
Task: T01
Status: pending
Depends: -
---

# T01 — Extensión de branding oficial

## Objetivo

Que el login y la carcasa de Guacamole digan **Aries Access Infrastructure** con la paleta institucional, mediante la extensión oficial de Guacamole y sin tocar el producto.

## Requerimientos

- R1, R2, R3, R4, R5 · **AC1, AC2, AC3, AC4** (se cierran aquí)

## Archivos previstos

- `ops/branding/guac-manifest.json`
- `ops/branding/css/aries.css`
- `ops/branding/translations/en.json`, `es.json`
- `ops/70-branding.sh` — construye el `.jar` e lo instala (idempotente)

## Validación

```bash
bash ops/70-branding.sh          # construye e instala
ssh humberto@192.168.18.70 'ls -l /etc/guacamole/extensions/ | grep aries'
ssh humberto@192.168.18.70 'sha256sum /opt/tomcat9/webapps/guacamole.war'   # igual que en T05
F001_HOST=humberto@192.168.18.70 node ia/tools/smoke.mjs                    # sin regresiones
```

Y en el navegador: login con `humberto` + TOTP, título **Aries Access Infrastructure**, fondo navy, acción en amber, y las dos conexiones siguen abriendo.

Cierra cuando AC1–AC4 pasan y la regresión de F-001 sigue en PASS.

## Trazabilidad

```
# F-002 T01
```

## Notas

- **Se inspecciona el CSS desplegado antes de escribir** (`webapp.css` y las clases del login) para no inventar selectores. Si un elemento no se puede estilizar sin tocar el producto, se deja y se anota.
- **Traducciones:** se sobrescriben sólo las claves del nombre del producto (`APP.NAME` y las que lo muestran); el resto queda como está.
- **Sin logo por ahora:** `smallIcon`/`largeIcon` se dejan fuera hasta que exista el activo. Inventar un logo es peor que no tenerlo.
- **Instalación con vuelta atrás:** antes de copiar el `.jar`, listar las extensiones presentes. Si el login se rompe, se borra el `.jar` y se reinicia `guacamole-tomcat`.
- El `.jar` se arma con `zip`/`jar`; si falta en el host, se instala `zip` (una dependencia mínima, no un framework).

## Relacionados

- Spec: [`../../specs/ui/F-002/F-002.spec.md`](../../specs/ui/F-002/F-002.spec.md) · TRACKING: [`../../specs/ui/F-002/F-002-TRACKING.md`](../../specs/ui/F-002/F-002-TRACKING.md)
- Protocolo: [`../../protocol/04-plan.md`](../../protocol/04-plan.md) · Feature base: [`../F-001/T05-tomcat-webapp.md`](../F-001/T05-tomcat-webapp.md)
