/**
 * browser-cdp.mjs - motor de navegador PROPIO, sin dependencias.
 *
 * Habla Chrome DevTools Protocol directamente contra el Edge o Chrome que ya
 * esta instalado en la maquina. Cero descargas, cero carpetas que llevar:
 * este archivo, solo, es un motor de navegador funcional.
 *
 * Requiere: Node >= 18 (usa `WebSocket` y `fetch` globales; `WebSocket` global
 * esta disponible desde Node 22 de forma estable).
 *
 *   import { findBrowser, launch } from './browser-cdp.mjs';
 *   const s = await launch();
 *   await s.goto('https://example.com');
 *   console.log(await s.text('h1'));
 *   await s.close();
 *
 * Que NO hace (a proposito):
 *   - Auto-wait inteligente ni reintentos como Playwright. Tiene waitFor con
 *     sondeo explicito. Si necesitas aserciones ricas, usa el motor playwright
 *     (ver ia/qa/driver.mjs).
 *   - Selectores de texto tipo Playwright (`text=...`). Solo CSS, y `@eN`
 *     opcional. Para texto, resuelvelo con evalJs.
 *
 * Decision: DEC-0015. Uso desde pruebas: ia/qa/driver.mjs.
 */

import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Busqueda del navegador
// ---------------------------------------------------------------------------

function candidatePaths() {
  const fromEnv = [process.env.QA_BROWSER_PATH, process.env.CHROME_PATH].filter(Boolean);
  const byPlatform = {
    win32: [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/microsoft-edge',
      '/snap/bin/chromium',
    ],
  };
  return [...fromEnv, ...(byPlatform[process.platform] || byPlatform.linux)];
}

/** Devuelve { name, path } del primer navegador Chromium-based encontrado, o null. */
export function findBrowser() {
  for (const p of candidatePaths()) {
    if (!p) continue;
    try {
      if (fs.existsSync(p)) {
        const name = /edge|msedge/i.test(p) ? 'edge' : /chrome/i.test(p) ? 'chrome' : 'chromium';
        return { name, path: p };
      }
    } catch { /* ignora rutas ilegibles */ }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Perfil real del usuario (opcional, requiere el navegador CERRADO)
// ---------------------------------------------------------------------------
//
// Reutilizar el perfil real da la sesion autenticada completa: cookies,
// localStorage, IndexedDB. Es mas que importar cookies: un token guardado en
// localStorage no vive en la base de cookies, y muchos SPAs lo guardan ahi.
//
// Dos advertencias que no son negociables (ver DEC-0017):
//   1. El navegador debe estar CERRADO. Con el abierto, Windows delega al
//      proceso vivo, el puerto de depuracion no abre, y ademas se abre una
//      ventana en el navegador del usuario.
//   2. Es la sesion real de la persona: su historial, sus logins. Tratarlo como
//      operacion con consentimiento (protocol/08-gates.md).

const USER_DATA_ROOTS = {
  win32: {
    chrome: ['Google/Chrome/User Data'],
    edge: ['Microsoft/Edge/User Data'],
    brave: ['BraveSoftware/Brave-Browser/User Data'],
    chromium: ['Chromium/User Data'],
  },
  darwin: {
    chrome: ['Library/Application Support/Google/Chrome'],
    edge: ['Library/Application Support/Microsoft Edge'],
    brave: ['Library/Application Support/BraveSoftware/Brave-Browser'],
    chromium: ['Library/Application Support/Chromium'],
  },
  linux: {
    chrome: ['.config/google-chrome'],
    chromium: ['.config/chromium'],
    edge: ['.config/microsoft-edge'],
    brave: ['.config/BraveSoftware/Brave-Browser'],
  },
};

const HOME_BASES = { win32: [process.env.LOCALAPPDATA, process.env.APPDATA], darwin: [os.homedir()], linux: [os.homedir()] };

/** Ruta del directorio de perfil real, o null si no se encuentra. */
export function resolveRealProfile(browserName = null, subProfile = 'Default') {
  const roots = USER_DATA_ROOTS[process.platform] || USER_DATA_ROOTS.linux;
  const bases = (HOME_BASES[process.platform] || [os.homedir()]).filter(Boolean);
  const wanted = browserName && roots[browserName] ? [browserName] : Object.keys(roots);
  for (const nombre of wanted) {
    for (const relativo of roots[nombre]) {
      for (const base of bases) {
        const userData = path.join(base, ...relativo.split('/'));
        const perfil = path.join(userData, subProfile);
        if (fs.existsSync(perfil)) return { browser: nombre, userData, profile: perfil };
      }
    }
  }
  return null;
}

/** El navegador esta corriendo? (si lo esta, el perfil esta bloqueado) */
export function isBrowserRunning(browser) {
  const exe = path.basename(browser.path);
  try {
    if (process.platform === 'win32') {
      const r = spawnSync('tasklist', ['/FI', `IMAGENAME eq ${exe}`, '/NH'], { encoding: 'utf8', timeout: 15000 });
      return new RegExp(exe.replace('.', '\\.'), 'i').test(r.stdout || '');
    }
    const r = spawnSync('pgrep', ['-f', exe], { encoding: 'utf8', timeout: 15000 });
    return r.status === 0;
  } catch {
    return null; // no se pudo determinar: no bloquees el intento por eso
  }
}


// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForCdp(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = 'sin respuesta';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return await res.json();
      last = `status ${res.status}`;
    } catch (err) { last = err.message; }
    await sleep(150);
  }
  throw new Error(`CDP no respondio en ${timeoutMs} ms (${last})`);
}

async function firstPageTarget(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* reintenta */ }
    await sleep(150);
  }
  throw new Error('el navegador no expuso ninguna pestana (target)');
}

// ---------------------------------------------------------------------------
// Cliente CDP
// ---------------------------------------------------------------------------

class CdpClient {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.listeners = new Set();
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data)); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject, timer } = this.pending.get(msg.id);
        clearTimeout(timer);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (codigo ${msg.error.code})`));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners) fn(msg);
      }
    });
  }

  send(method, params = {}, timeoutMs = 30000) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timeout CDP en ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
}

// ---------------------------------------------------------------------------
// Teclado
// ---------------------------------------------------------------------------

const KEYMAP = {
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
  Tab: { key: 'Tab', code: 'Tab', keyCode: 9, text: '\t' },
  Escape: { key: 'Escape', code: 'Escape', keyCode: 27, text: '' },
  Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8, text: '' },
  Delete: { key: 'Delete', code: 'Delete', keyCode: 46, text: '' },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, text: '' },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, text: '' },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37, text: '' },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, text: '' },
  Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
};

// ---------------------------------------------------------------------------
// Sesion
// ---------------------------------------------------------------------------

/**
 * Lanza el navegador y devuelve la sesion.
 * @param {{headless?: boolean, browserPath?: string, timeoutMs?: number, windowSize?: string}} opts
 */
export async function launch(opts = {}) {
  const {
    headless = true,
    browserPath = null,
    timeoutMs = 30000,
    windowSize = '1366,900',
    profile: modoPerfil = 'temp',
    profileDir = null,
    subProfile = 'Default',
    keepProfile = false,
  } = opts;

  const browser = browserPath ? { name: 'custom', path: browserPath } : findBrowser();
  if (!browser) {
    throw new Error(
      'No se encontro Chrome ni Edge. Instala uno, o define QA_BROWSER_PATH con la ruta al ejecutable.'
    );
  }

  // --- perfil: temporal (por defecto) o del usuario (sesion real) ------------
  let profile;
  let perfilPropio = false; // si es del usuario NO se borra al cerrar
  let perfilReal = false;   // solo el perfil real exige el navegador cerrado
  if (profileDir) {
    if (!fs.existsSync(profileDir)) throw new Error(`El perfil indicado no existe: ${profileDir}`);
    profile = path.resolve(profileDir);
    perfilPropio = true;
    // Un directorio explicito puede no tener nada que ver con el navegador en
    // uso, asi que no se exige cerrarlo aqui: si de verdad apunta a un perfil
    // en uso, lo detecta la salida inmediata del proceso, mas abajo.
  } else if (modoPerfil === 'real') {
    const real = resolveRealProfile(browser.name === 'custom' ? null : browser.name, subProfile);
    if (!real) {
      throw new Error('No encontre el perfil real de Chrome/Edge. Usa profileDir, o deja profile: "temp".');
    }
    profile = real.profile;
    perfilPropio = true;
    perfilReal = true;
  } else {
    profile = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-cdp-'));
  }

  // El perfil real de una persona solo se puede abrir si su navegador esta
  // cerrado. De lo contrario el proceso nuevo delega en el que ya corre
  // (DEC-0017): el puerto de depuracion no abre y se abre una ventana suya.
  if (perfilReal && isBrowserRunning(browser) === true) {
    throw new Error(
      `${browser.name} esta abierto. Con el perfil real hay que cerrarlo primero: si no, el proceso nuevo delega en el que ya corre, el puerto de depuracion no abre y ademas se abre una ventana en tu navegador.`
    );
  }

  const port = await freePort();
  const args = [
    headless ? '--headless=new' : '--new-window',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--hide-scrollbars',
    '--mute-audio',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${windowSize}`,
    'about:blank',
  ];

  const proc = spawn(browser.path, args, { stdio: 'ignore', windowsHide: true });
  let exited = false;
  proc.on('exit', () => { exited = true; });

  let version;
  try {
    version = await waitForCdp(port, timeoutMs);
  } catch (err) {
    if (exited) {
      throw new Error(
        `El navegador salio inmediatamente sin abrir el puerto de depuracion. Si estas usando un perfil real, cierralo antes de reintentar. Detalle: ${err.message}`
      );
    }
    throw err;
  }
  const target = await firstPageTarget(port, timeoutMs);

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout conectando al WebSocket de CDP')), timeoutMs);
    ws.addEventListener('open', () => { clearTimeout(t); resolve(); });
    ws.addEventListener('error', (e) => { clearTimeout(t); reject(new Error(`error de WebSocket: ${e.message || 'desconocido'}`)); });
  });

  const cdp = new CdpClient(ws);
  const consoleErrors = [];
  const consoleAll = [];
  const requests = new Map();

  cdp.on((msg) => {
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || [])
        .map((a) => (a.value !== undefined ? String(a.value) : a.description || a.type))
        .join(' ');
      consoleAll.push({ level: msg.params.type, text });
      if (msg.params.type === 'error') consoleErrors.push(text);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails || {};
      consoleErrors.push(d.exception?.description || d.text || 'excepcion sin descripcion');
    }
    if (msg.method === 'Network.requestWillBeSent') {
      requests.set(msg.params.requestId, { method: msg.params.request.method, url: msg.params.request.url, status: null });
    }
    if (msg.method === 'Network.responseReceived') {
      const r = requests.get(msg.params.requestId);
      if (r) r.status = msg.params.response.status;
    }
  });

  await Promise.all([
    cdp.send('Page.enable'),
    cdp.send('Runtime.enable'),
    cdp.send('Network.enable'),
  ]);

  // --- helpers internos -----------------------------------------------------
  async function evaluate(expression) {
    const res = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      const d = res.exceptionDetails;
      throw new Error(`error al evaluar en la pagina: ${d.exception?.description || d.text}`);
    }
    return res.result.value;
  }

  const q = (sel) => JSON.stringify(String(sel));

  async function elementBox(sel) {
    return evaluate(`(() => {
      const el = document.querySelector(${q(sel)});
      if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
  }

  async function waitUntilComplete(timeout) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      try {
        const state = await evaluate('document.readyState');
        if (state === 'complete') return true;
      } catch { /* la navegacion puede cortar la evaluacion */ }
      await sleep(100);
    }
    return false;
  }

  const session = {
    engine: 'cdp',
    browser: browser.name,
    browserVersion: version.Browser,
    port,
    profile,
    profileKind: perfilPropio ? 'usuario' : 'temporal',

    /** Navega y espera a `document.readyState === 'complete'`. */
    async goto(url, { timeout = timeoutMs } = {}) {
      const res = await cdp.send('Page.navigate', { url });
      if (res.errorText) throw new Error(`no se pudo navegar a ${url}: ${res.errorText}`);
      await waitUntilComplete(timeout);
      return url;
    },

    url: () => evaluate('location.href'),

    /** Espera a que exista el selector y sea visible. Devuelve true, o false si expira. */
    async waitFor(sel, { timeout = 15000, poll = 100 } = {}) {
      if (String(sel).startsWith('--')) { // --load | --networkidle -> readyState
        return waitUntilComplete(timeout);
      }
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        if (await session.isVisible(sel)) return true;
        await sleep(poll);
      }
      return false;
    },

    /** Clic con eventos de raton reales (CDP), no `el.click()`. */
    async click(sel, { timeout = 15000 } = {}) {
      let box = await elementBox(sel);
      if (!box) {
        const ok = await session.waitFor(sel, { timeout });
        if (!ok) throw new Error(`click: no encontre el elemento ${sel}`);
        box = await elementBox(sel);
        if (!box) throw new Error(`click: ${sel} existe pero no tiene area visible`);
      }
      const base = { x: box.x, y: box.y, button: 'left', clickCount: 1 };
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...base });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...base });
    },

    /**
     * Escribe en un input/textarea. Usa el setter nativo y dispara input+change,
     * que es lo que necesitan React y Vue para notar el cambio.
     */
    async fill(sel, value, { timeout = 15000 } = {}) {
      const ok = await session.waitFor(sel, { timeout });
      if (!ok) throw new Error(`fill: no encontre el elemento ${sel}`);
      const res = await evaluate(`(() => {
        const el = document.querySelector(${q(sel)});
        if (!el) return false;
        el.focus();
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
                    : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype
                    : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, ${JSON.stringify(String(value))});
        else el.value = ${JSON.stringify(String(value))};
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`);
      if (!res) throw new Error(`fill: ${sel} no acepto el valor`);
    },

    /** Pulsa una tecla (Enter, Tab, Escape, flechas, Backspace...). */
    async press(keyIn) {
      const def = KEYMAP[keyIn] || { key: keyIn, code: keyIn, keyCode: 0, text: '' };
      const common = {
        key: def.key,
        code: def.code,
        windowsVirtualKeyCode: def.keyCode,
        nativeVirtualKeyCode: def.keyCode,
      };
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...common, text: def.text || undefined });
      if (def.text) await cdp.send('Input.dispatchKeyEvent', { type: 'char', ...common, text: def.text });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...common });
    },

    /** Selecciona una opcion de un <select> por value, label o texto. */
    async select(sel, value) {
      const res = await evaluate(`(() => {
        const el = document.querySelector(${q(sel)});
        if (!el) return false;
        const want = ${JSON.stringify(String(value))};
        const opt = [...el.options].find((o) => o.value === want || o.label === want || o.text === want);
        if (!opt) return false;
        el.value = opt.value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`);
      if (!res) throw new Error(`select: no encontre la opcion "${value}" en ${sel}`);
    },

    /** Texto visible de un selector, o de la pagina completa. */
    text: (sel) => evaluate(`(() => {
      const el = ${sel ? `document.querySelector(${q(sel)})` : 'document.body'};
      return el ? (el.innerText || el.textContent || '') : '';
    })()`),

    value: (sel) => evaluate(`(() => { const el = document.querySelector(${q(sel)}); return el ? el.value : null; })()`),

    isVisible: (sel) => evaluate(`(() => {
      const el = document.querySelector(${q(sel)});
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
    })()`),

    isDisabled: (sel) => evaluate(`(() => {
      const el = document.querySelector(${q(sel)});
      if (!el) return null;
      return el.disabled === true || el.getAttribute('aria-disabled') === 'true';
    })()`),

    count: (sel) => evaluate(`document.querySelectorAll(${q(sel)}).length`),

    /** Campos de todos los formularios, como dato estructurado. */
    forms: () => evaluate(`[...document.forms].map((f) => ({
      name: f.getAttribute('name') || null,
      action: f.getAttribute('action') || null,
      method: (f.getAttribute('method') || 'get').toLowerCase(),
      fields: [...f.elements].map((e) => ({
        name: e.name || null, type: e.type || e.tagName.toLowerCase(),
        required: Boolean(e.required), value: e.value ?? null,
        valid: typeof e.checkValidity === 'function' ? e.checkValidity() : null,
      })),
    }))`),

    /** Ejecuta JS en la pagina y devuelve el valor. */
    evalJs: (expr) => evaluate(String(expr)),

    /** Errores de consola y excepciones de pagina, acumulados desde el arranque. */
    consoleErrors: () => consoleErrors.slice(),

    /** Consola completa (incluye logs e info). */
    consoleMessages: () => consoleAll.slice(),

    /** Peticiones de red. Filtra por subcadena de URL. */
    requests: (substr) => [...requests.values()].filter((r) => !substr || r.url.includes(substr)),

    clearRequests: () => requests.clear(),

    /** Captura de pantalla. Devuelve la ruta escrita. */
    async screenshot(file, { fullPage = true } = {}) {
      const res = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage });
      const out = path.resolve(file);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, Buffer.from(res.data, 'base64'));
      return out;
    },

    /** Escotilla de escape: cualquier metodo de CDP. */
    raw: (method, params) => cdp.send(method, params),

    /** Cierra navegador y limpia el perfil temporal (nunca el del usuario). */
    async close() {
      // Cierre ORDENADO por el endpoint de navegador, para que Chrome vuelque el
      // perfil a disco. Un kill seco puede perder cookies y localStorage, que es
      // justo lo que hace util reutilizar un perfil (DEC-0017).
      try {
        const w = new WebSocket(version.webSocketDebuggerUrl);
        await new Promise((resolver) => {
          const terminar = () => resolver();
          w.addEventListener('open', () => {
            try { w.send(JSON.stringify({ id: 1, method: 'Browser.close' })); } catch { /* ya cerrado */ }
            setTimeout(terminar, 1500);
          });
          w.addEventListener('close', terminar);
          w.addEventListener('error', terminar);
          setTimeout(terminar, 3000);
        });
      } catch { /* si no se puede, se recurre al kill */ }

      const limite = Date.now() + 8000;
      while (!exited && Date.now() < limite) await sleep(100);

      try { ws.close(); } catch { /* ya cerrado */ }
      try { if (!exited) proc.kill(); } catch { /* ya muerto */ }
      await sleep(300);

      // Un perfil del usuario no se borra jamas. Uno temporal, si.
      if (!perfilPropio && !keepProfile) {
        try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* en uso: lo limpia el SO */ }
      }
    },
  };

  return session;
}

/** Sonda barata: hay navegador instalado? y se puede usar un perfil real? (no lanza nada) */
export function probe() {
  const b = findBrowser();
  if (!b) return { available: false, detail: 'no hay Chrome ni Edge; define QA_BROWSER_PATH' };
  const real = resolveRealProfile(b.name);
  let extra;
  if (!real) {
    extra = ' | perfil real: no encontrado';
  } else {
    const corriendo = isBrowserRunning(b);
    extra = ` | perfil real: ${corriendo === true ? 'bloqueado (navegador abierto)' : corriendo === false ? 'disponible' : 'sin determinar'}`;
  }
  return { available: true, detail: `${b.name} en ${b.path}${extra}` };
}

export default { findBrowser, launch, probe, resolveRealProfile, isBrowserRunning };
