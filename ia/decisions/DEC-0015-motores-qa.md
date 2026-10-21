## DEC-0015 — Motores de QA: nada vendorizado, el motor se resuelve en tiempo de ejecución

Date: 2026-10-21
Status: active

Context:
Hacia falta poder validar superficie web (formularios, flujos) desde una carpeta `ia/` que se copia de un proyecto a otro. La tentación es meter el navegador *dentro* de `ia/`. Eso no funciona: el navegador headless de referencia es un binario compilado de ~58 MB que además descarga Chromium y necesita Bun, así que "llevarlo en la carpeta" significa cargar el problema, no resolverlo. Y el daemon sigue necesitando Chromium en tiempo de ejecución.

Por otro lado, un proyecto nuevo no debería quedar sin poder probar su UI por no haber instalado nada.

Decision:
**Ningún navegador se versiona dentro de `ia/`.** El harness resuelve el motor en tiempo de ejecución y registra cuál usó.

Tres motores, en orden de preferencia:

1. **`playwright`** — dependencia del proyecto (`npm i -D playwright`). API en proceso: auto-wait, aserciones, trace. Es el mejor para *scripts* de prueba.
2. **`cdp`** — **propio, dentro de `ia/`** (`ia/tools/browser-cdp.mjs`, sin dependencias). Habla Chrome DevTools Protocol contra el Chrome o Edge **ya instalado** en la máquina. Cero descargas. Es el motor por defecto cuando no hay Playwright, y es lo que hace portable la carpeta `ia/`.
3. **`gstack`** — checkout externo, opcional, nunca requerido.

La elección se hace con `ia/qa/driver.mjs`, con sonda y precedencia. Se puede forzar con `QA_ENGINE`.

Regla de evidencia: la columna `Evidencia` del TRACKING **registra el motor**. Un AC crítico se prueba con el motor declarado, no con "el que estuviera disponible".

## Reason

Copia el patrón que ya funciona en herramientas maduras: sondear el motor disponible y degradar con dignidad, en lugar de exigir una instalación concreta. Se descartaron dos alternativas:

- **Vendorizar el navegador en `ia/`**: rompe [DEC-0013](./DEC-0013-sin-binarios.md), engorda el repo con un blob binario, elimina la actualización y no evita la dependencia de Chromium en runtime.
- **Un único motor obligatorio (Playwright)**: deja a un proyecto nuevo sin poder probar nada hasta instalar dependencias. Y obliga a descargar Chromium también, así que no es más barato que el motor propio.

## Consequences

- El motor `cdp` se mantiene a mano. Es pequeño y usa una superficie de CDP estable, pero es deuda consciente: si aparece un caso que lo supera, se usa Playwright para *ese* caso.
- `check-harness` reporta qué motores están disponibles (aviso, no fallo): un harness es válido sin navegador, pero entonces los AC de UI quedan en `partial`.
- El motor `gstack` no está verificado (su binario requiere compilación). Su adaptador está marcado como tal; ninguna prueba debe depender de él.
- `ia/qa/selftest-cdp.mjs` es la autoprueba del motor propio. Si falla, el motor no es confiable.

## Relacionados

- Motores: [`../qa/driver.mjs`](../qa/driver.mjs) · [`../tools/browser-cdp.mjs`](../tools/browser-cdp.mjs) · [`../qa/README.md`](../qa/README.md)
- Evidencia: [DEC-0014](./DEC-0014-evidencia-camino-usuario.md) · Sin binarios: [DEC-0013](./DEC-0013-sin-binarios.md) · Índice: [`INDEX.md`](./INDEX.md)
