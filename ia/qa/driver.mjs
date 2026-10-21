/**
 * driver.mjs - resuelve QUE motor de navegador usar para las pruebas de QA.
 *
 * Politica (DEC-0015): no se vendoriza ningun navegador dentro de ia/. El harness
 * resuelve el motor en tiempo de ejecucion y deja registro de cual se uso.
 *
 * Motores, en orden de preferencia:
 *
 *   1. playwright  -> npm i -D playwright && npx playwright install chromium
 *                     API en proceso: auto-wait, aserciones, trace. El mejor para
 *                     SCRIPTS de prueba con aserciones ricas.
 *   2. cdp         -> nada que instalar. Usa el Chrome/Edge que ya esta en la
 *                     maquina (ia/tools/browser-cdp.mjs). Motor por DEFECTO
 *                     cuando no hay Playwright: es el que hace portable la carpeta ia/.
 *   3. gstack      -> checkout externo de gstack con binario compilado. Opcional.
 *                     Ninguna prueba debe depender de el.
 *
 * Uso:
 *   import { createSession, listEngines } from './driver.mjs';
 *   const s = await createSession();            // auto
 *   await s.goto(url); await s.fill('#x','y'); await s.click('#ok');
 *   console.log(s.engine);                      // registra el motor en la evidencia
 *   await s.close();
 *
 * Interfaz uniforme: goto, url, waitFor, click, fill, press, select, text, value,
 * isVisible, isDisabled, count, forms, evalJs, consoleErrors, requests,
 * clearRequests, screenshot, raw, close.
 *
 *   QA_ENGINE=cdp node ...        # forzar un motor (auto por defecto)
 *   QA_HEADED=1 node ...          # con interfaz visible (cdp y playwright)
 *   QA_BROWSER_PATH=... node ...  # navegador explicito para el motor cdp
 *   GSTACK_ROOT=... node ...      # ubicacion del checkout de gstack
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const IA = path.resolve(HERE, '..');
const ROOT = path.resolve(IA, '..');

/** Orden de preferencia, desde ia/tools/harness.config.json -> qa. */
function loadQaConfig() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(IA, 'tools', 'harness.config.json'), 'utf8'));
    return cfg.qa || {};
  } catch {
    return {};
  }
}
const QA_CFG = loadQaConfig();
export const DEFAULT_ORDER = Array.isArray(QA_CFG.order) && QA_CFG.order.length
  ? QA_CFG.order
  : ['playwright', 'cdp', 'gstack'];

// ---------------------------------------------------------------------------
// Sondas
// ---------------------------------------------------------------------------

function probePlaywright() {
  try {
    const entry = require.resolve('playwright');
    return { name: 'playwright', available: true, detail: entry };
  } catch {
    return {
      name: 'playwright',
      available: false,
      detail: 'no instalado | npm i -D playwright && npx playwright install chromium',
    };
  }
}

async function probeCdp() {
  try {
    const { probe } = await import('../tools/browser-cdp.mjs');
    const r = probe();
    return { name: 'cdp', available: r.available, detail: r.detail };
  } catch (err) {
    return { name: 'cdp', available: false, detail: `browser-cdp.mjs no disponible: ${err.message}` };
  }
}

function gstackCandidates() {
  return [
    process.env.GSTACK_ROOT,
    path.join(ROOT, '.gstack'),
    path.join(ROOT, '..', 'gstack'),
    path.join(os.homedir(), '.claude', 'skills', 'gstack'),
  ].filter(Boolean);
}

function probeGstack() {
  for (const root of gstackCandidates()) {
    const win = path.join(root, 'browse', 'dist', 'browse.exe');
    const nix = path.join(root, 'browse', 'dist', 'browse');
    if (fs.existsSync(win)) return { name: 'gstack', available: true, detail: win, bin: win, root };
    if (fs.existsSync(nix)) return { name: 'gstack', available: true, detail: nix, bin: nix, root };
    if (fs.existsSync(root)) {
      return {
        name: 'gstack',
        available: false,
        detail: `${root} existe pero no esta compilado | ./setup (requiere Bun)`,
      };
    }
  }
  return { name: 'gstack', available: false, detail: 'checkout no encontrado | define GSTACK_ROOT' };
}

/** Estado de todos los motores. No lanza nada. */
export async function listEngines() {
  return [probePlaywright(), await probeCdp(), probeGstack()];
}

/** Elige motor. `prefer` puede ser 'auto', un nombre, o un array con el orden. */
export async function pickEngine(prefer) {
  const wanted = prefer ?? process.env.QA_ENGINE ?? QA_CFG.preferred ?? 'auto';
  const all = await listEngines();
  const order = Array.isArray(wanted) ? wanted : wanted === 'auto' ? DEFAULT_ORDER : [wanted];
  for (const name of order) {
    const found = all.find((e) => e.name === name && e.available);
    if (found) return found;
  }
  const detalle = all.map((e) => `  - ${e.name}: ${e.detail}`).join('\n');
  throw new Error(`Ningun motor de navegador disponible.\n${detalle}\n\nInstala el motor cdp (ya funciona si tienes Chrome o Edge) o Playwright.`);
}

// ---------------------------------------------------------------------------
// Adaptador: Playwright
// ---------------------------------------------------------------------------

async function playwrightAdapter({ headless }) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests = [];
  const consoleErrors = [];
  page.on('request', (r) => requests.push({ method: r.method(), url: r.url(), status: null }));
  page.on('response', (r) => {
    const hit = requests.find((x) => x.url === r.url() && x.status === null);
    if (hit) hit.status = r.status();
  });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  return {
    engine: 'playwright',
    browserVersion: browser.version(),
    goto: (url) => page.goto(url, { waitUntil: 'load' }),
    url: () => page.url(),
    waitFor: (sel, { timeout = 15000 } = {}) =>
      String(sel).startsWith('--') ? page.waitForLoadState(sel.slice(2), { timeout }) : page.waitForSelector(sel, { timeout }),
    click: (sel) => page.click(sel),
    fill: (sel, v) => page.fill(sel, String(v)),
    press: (k) => page.keyboard.press(k),
    select: (sel, v) => page.selectOption(sel, v),
    text: (sel) => (sel ? page.textContent(sel) : page.innerText('body')),
    value: (sel) => page.inputValue(sel),
    isVisible: (sel) => page.isVisible(sel),
    isDisabled: (sel) => page.isDisabled(sel),
    count: (sel) => page.locator(sel).count(),
    forms: () => page.$$eval('form', (forms) => forms.map((f) => ({
      name: f.getAttribute('name'),
      action: f.getAttribute('action'),
      method: (f.getAttribute('method') || 'get').toLowerCase(),
      fields: [...f.elements].map((e) => ({ name: e.name, type: e.type, required: e.required, value: e.value })),
    }))),
    evalJs: (expr) => page.evaluate(expr),
    consoleErrors: () => consoleErrors.slice(),
    requests: (substr) => requests.filter((r) => !substr || r.url.includes(substr)),
    clearRequests: () => { requests.length = 0; },
    screenshot: async (file, { fullPage = true } = {}) => {
      const out = path.resolve(file);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await page.screenshot({ path: out, fullPage });
      return out;
    },
    raw: (method, params) => context.newCDPSession(page).then((s) => s.send(method, params)),
    close: () => browser.close(),
  };
}

// ---------------------------------------------------------------------------
// Adaptador: gstack browse (opcional)
// ---------------------------------------------------------------------------
//
// Los nombres de comando provienen de la referencia oficial de gstack
// (gstack/gstack/llms.txt, seccion Browse Commands). ATENCION: la forma exacta
// de la SALIDA de `is`, `forms` y `text` no se ha podido verificar (el binario
// no estaba compilado), asi que el parseo de estado es tolerante y debe
// confirmarse con `browse <comando> --help` antes de confiar en aserciones.
// Para aserciones ricas, usar Playwright o el motor cdp.

function gstackAdapter({ bin, headless }) {
  const run = (args, { timeout = 60000 } = {}) => {
    const r = spawnSync(bin, args, { encoding: 'utf8', timeout });
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
    const spawnErr = r.error ? r.error.message : null;
    const errored = Boolean(spawnErr) || r.status !== 0 || /^\s*\[error/mi.test(out);
    return { ok: !errored, out, code: r.status, spawnErr };
  };
  const must = (args) => {
    const r = run(args);
    if (!r.ok) throw new Error(`browse ${args.slice(0, 2).join(' ')} fallo: ${r.spawnErr || r.out.slice(0, 300)}`);
    return r.out;
  };
  const parseBool = (out) => /^(true|yes|1|visible|enabled)\b/i.test(out.trim());
  const num = (s) => { const n = Number(String(s).trim()); return Number.isFinite(n) ? n : null; };

  if (!headless) run(['connect']); // navegador con interfaz

  return {
    engine: 'gstack',
    browserVersion: 'gstack browse',
    goto: (url) => { must(['goto', url]); must(['wait', '--load']); },
    url: () => must(['url']),
    waitFor: (sel) => { must(['wait', String(sel)]); return true; },
    click: (sel) => { must(['click', String(sel)]); },
    fill: (sel, v) => { must(['fill', String(sel), String(v)]); },
    press: (k) => { must(['press', String(k)]); },
    select: (sel, v) => { must(['select', String(sel), String(v)]); },
    text: (sel) => must(sel ? ['text', String(sel)] : ['text']),
    value: (sel) => must(['js', `document.querySelector(${JSON.stringify(String(sel))}).value`]),
    isVisible: (sel) => parseBool(must(['is', 'visible', String(sel)])),
    isDisabled: (sel) => parseBool(must(['is', 'disabled', String(sel)])),
    count: (sel) => num(must(['js', `document.querySelectorAll(${JSON.stringify(String(sel))}).length`])) ?? 0,
    forms: () => { try { return JSON.parse(must(['forms'])); } catch { return []; } },
    evalJs: (expr) => {
      const out = must(['js', String(expr)]);
      try { return JSON.parse(out); } catch { return out; }
    },
    consoleErrors: () => must(['console', '--errors']).split(/\r?\n/).filter(Boolean),
    requests: (substr) => must(['network'])
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => ({ raw: line, url: line }))
      .filter((r) => !substr || r.url.includes(substr)),
    clearRequests: () => { run(['network', '--clear']); },
    screenshot: () => {
      throw new Error('screenshot no implementado en el motor gstack (flag de salida sin confirmar). Usa el motor cdp o playwright, o `raw("screenshot")`.');
    },
    raw: (method, params) => must(params ? [method, String(params)] : [method]),
    close: () => { run(['disconnect']); run(['stop']); },
  };
}

// ---------------------------------------------------------------------------
// Entrada publica
// ---------------------------------------------------------------------------

/**
 * Devuelve una sesion con la interfaz uniforme.
 * @param {{engine?: string|string[], headless?: boolean, browserPath?: string}} opts
 */
export async function createSession(opts = {}) {
  const { engine } = opts;
  const headless = opts.headless ?? process.env.QA_HEADED !== '1';
  const chosen = await pickEngine(engine);

  if (chosen.name === 'playwright') return playwrightAdapter({ headless });
  if (chosen.name === 'gstack') return gstackAdapter({ bin: chosen.bin, headless });
  const { launch } = await import('../tools/browser-cdp.mjs');
  return launch({
    headless,
    browserPath: opts.browserPath || process.env.QA_BROWSER_PATH || null,
    // perfil: 'temp' (por defecto) o 'real' (requiere el navegador CERRADO - DEC-0017)
    profile: opts.profile || process.env.QA_PROFILE || 'temp',
    profileDir: opts.profileDir || process.env.QA_PROFILE_DIR || null,
    subProfile: opts.subProfile || process.env.QA_SUBPROFILE || 'Default',
    keepProfile: Boolean(opts.keepProfile || process.env.QA_KEEP_PROFILE),
  });
}

export default { createSession, listEngines, pickEngine, DEFAULT_ORDER };
