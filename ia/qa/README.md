# QA — pruebas de camino de usuario

Artefactos, plantillas y **el motor de navegador** ([DEC-0014](../decisions/DEC-0014-evidencia-camino-usuario.md), [DEC-0015](../decisions/DEC-0015-motores-qa.md) · [`../protocol/09-qa.md`](../protocol/09-qa.md)).

## Qué vive aquí

| Archivo | Para qué |
|---|---|
| [`driver.mjs`](./driver.mjs) | **Resuelve el motor de navegador** y expone una interfaz uniforme. Todo lo demás se apoya en esto. |
| [`smoke.example.mjs`](./smoke.example.mjs) | Plantilla del camino de humo (sin navegador, solo HTTP). |
| [`form.example.mjs`](./form.example.mjs) | Plantilla de validación de un formulario, por capas. |
| [`selftest-cdp.mjs`](./selftest-cdp.mjs) | **Autoprueba del motor propio.** Si esto pasa, el motor sirve para el QA real. |
| [`selftest-perfil.mjs`](./selftest-perfil.mjs) | Autoprueba del perfil persistente (8 comprobaciones). No toca tu perfil real. |
| [`selftest-harness.mjs`](./selftest-harness.mjs) | **Autoprueba del checker:** un caso por chequeo, con detección y precisión. |
| [`fixture/`](./fixture/form.html) | Formulario de ejemplo que usa la autoprueba. Sin dependencias de ningún proyecto. |

Los **artefactos** que producen las pruebas (capturas, respuestas HTTP, logs) van a `ia/.harness/qa/<FEATURE-ID>/`, ignorado por git. Lo que se versiona es la prueba y su resultado en el TRACKING.

## Los tres motores

El harness **no vendoriza ningún navegador**: no hay que llevar carpetas grandes de un lado a otro. El motor se resuelve en tiempo de ejecución.

| Orden | Motor | Dónde vive | Coste | Cuándo |
|---|---|---|---|---|
| 1 | **playwright** | `package.json` del proyecto | `npm i -D playwright` + Chromium | Scripts con aserciones ricas: auto-wait, trace, selectores de texto |
| 2 | **cdp** | **dentro de `ia/`** ([`../tools/browser-cdp.mjs`](../tools/browser-cdp.mjs)) | **cero instalación** | Por defecto si no hay Playwright. Usa el Chrome o Edge que ya está en la máquina |
| 3 | **gstack** | checkout externo, opcional | Bun + binario compilado | Solo si lo tienes montado. Ninguna prueba debe depender de él |

```bash
node -e "import('./ia/qa/driver.mjs').then(m => m.listEngines().then(console.table))"
```

Para forzar uno: `QA_ENGINE=cdp` o `QA_ENGINE=playwright`. Con `QA_HEADED=1` se ve la ventana.

## Uso

```js
import { createSession } from './driver.mjs';

const s = await createSession();                 // elige el mejor disponible
await s.goto('http://127.0.0.1:5173/productos');
await s.fill('#nombre', 'Café Ñandú');
await s.fill('#precio', '12.50');
await s.click('#guardar');
if (!(await s.isVisible('#lista tr'))) throw new Error('no se guardo');

console.log(s.engine);   // REGISTRA el motor: va en la columna Evidencia
await s.close();
```

Interfaz uniforme: `goto` · `url` · `waitFor` · `click` · `fill` · `press` · `select` · `text` · `value` · `isVisible` · `isDisabled` · `count` · `forms` · `evalJs` · `consoleErrors` · `requests` · `clearRequests` · `screenshot` · `raw` · `close`.

Cualquier método de CDP está disponible con `raw(method, params)`.

## Regla de la evidencia

La columna `Evidencia` del TRACKING **registra el motor** que produjo el resultado:

```
node ia/qa/selftest-cdp.mjs → 22/22 PASS (engine=cdp)
```

Sin eso, dos corridas no son comparables. Y un AC crítico se prueba con el motor **declarado**, no con "el que estuviera disponible".

## Qué es una prueba de camino de usuario

Recorre el mismo camino que el usuario y **afirma una condición observable**:

- **Web** → navegador real: la página carga, el elemento existe, la acción produce el efecto, la consola está limpia.
- **API** → petición HTTP real con su status y payload.
- **CLI** → comando real, salida y exit code.
- **Job/worker** → ejecución real y efecto observable.
- **Webhook** → entrega real y respuesta del receptor.

Lo que **no** es evidencia: consultar la base de datos directamente, o un test unitario del servicio sin pasar por la capa de entrada.

## Autoprueba del motor

```bash
node ia/qa/selftest-cdp.mjs
```

Levanta su propio fixture, arranca el navegador, valida un formulario por capas (cliente, doble envío, XSS, consola, red) y escribe la evidencia y una captura. Es la comprobación de que el motor está sano antes de confiar en él.

## Relacionados

- Protocolo: [`../protocol/09-qa.md`](../protocol/09-qa.md) · Validación: [`../protocol/06-validation.md`](../protocol/06-validation.md)
- Decisiones: [DEC-0014](../decisions/DEC-0014-evidencia-camino-usuario.md) · [DEC-0015](../decisions/DEC-0015-motores-qa.md) · Motor: [`../tools/browser-cdp.mjs`](../tools/browser-cdp.mjs)
