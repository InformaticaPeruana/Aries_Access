## DEC-0017 — Perfil real del navegador para probar con sesión autenticada

Date: 2026-10-21
Status: active

Context:
Algunas pruebas necesitan una sesión que **no se puede scriptear**: 2FA, SSO, un entorno de un cliente donde solo tienes tu navegador, o un SPA que guarda el token en `localStorage` en vez de en cookies. La plantilla solo ofrecía un perfil temporal vacío, así que esas pruebas quedaban en `partial`.

Se evaluó primero la vía que usa gstack: importar las cookies del navegador real. Se implementó la prueba de concepto y el resultado fue concluyente:

- `node:sqlite` funciona en Node 22, así que no hace falta Bun.
- La clave AES se obtiene por DPAPI, cargando el ensamblado `System.Security` en PowerShell.
- **Pero la base de cookies está bloqueada mientras el navegador corre**: `EBUSY` incluso leyendo los bytes, no solo al copiar el archivo. Sin WAL, journal en exclusiva.
- Y peor: **para un SPA con el token en `localStorage`, importar cookies no autentica nada.** El token no vive en la base de cookies.

Decision:
Se añade al motor la opción de **usar un perfil del usuario**:

- `profile: 'temp'` (por defecto) — perfil temporal, se borra al cerrar. Comportamiento actual.
- `profile: 'real'` — resuelve el perfil real de Chrome/Edge/Chromium/Brave según el sistema y lo usa.
- `profileDir: <ruta>` — un perfil explícito, o el de otro navegador.

Reglas asociadas, ninguna opcional:

1. **Un perfil del usuario nunca se borra** al cerrar. Solo se borran los temporales.
2. **Con el perfil real, el navegador debe estar cerrado.** Se comprueba antes de lanzar, porque lanzarlo abierto hace que el proceso nuevo delegue en el que ya corre: el puerto de depuración no abre y además se abre una ventana en el navegador del usuario.
3. **Cierre ordenado.** Se pide `Browser.close` por el endpoint de navegador y se espera al volcado del perfil antes de matar el proceso.
4. Es material sensible: se registra como operación con consentimiento ([`protocol/08-gates.md`](../protocol/08-gates.md)).

Reason:
Reutilizar el perfil cubre **más** que importar cookies —localStorage, IndexedDB, service workers— sin una línea de criptografía, y funciona igual en Windows, macOS y Linux cambiando solo las rutas. La alternativa de las cookies era Windows-only por DPAPI, inútil para tokens de SPA, y exigía cerrar el navegador de todos modos. Se descartó también copiar el perfil a un temporal: evita mutar el original, pero copiar un perfil de gigabytes cuesta más que el problema que resuelve.

## Consequences

- El perfil real entra en el reporte: `motores-qa` dice si está disponible o bloqueado.
- Requiere cerrar el navegador, así que **no sirve para el uso diario**: es para el caso que lo justifica. Se documenta como tal en [`protocol/09-qa.md`](../protocol/09-qa.md) para no crear expectativas.
- Efecto secundario encontrado al probarlo: el cierre por `kill` no volcaba la sesión a disco y la persistencia fallaba. El cierre ordenado arregló la persistencia **también para los perfiles temporales**.
- Sigue sin cubrirse la importación de cookies para sitios clásicos. Si algún día se necesita, la ruta está estudiada y su coste y límites son conocidos.

## Relacionados

- Motor: [`../tools/browser-cdp.mjs`](../tools/browser-cdp.mjs) · Resolutor: [`../qa/driver.mjs`](../qa/driver.mjs) · Prueba: [`../qa/selftest-perfil.mjs`](../qa/selftest-perfil.mjs)
- Protocolo: [`../protocol/09-qa.md`](../protocol/09-qa.md) · Gates: [`../protocol/08-gates.md`](../protocol/08-gates.md) · Índice: [`INDEX.md`](./INDEX.md)
