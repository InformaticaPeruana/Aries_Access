#!/usr/bin/env node
/**
 * form.example.mjs - PLANTILLA de validacion de un formulario (DEC-0014).
 *
 * Un formulario tiene CAPAS y cada capa se prueba por el camino correcto:
 *
 *   A) Validacion en SERVIDOR  -> HTTP directo, SIN pasar por el formulario.
 *      Si lo pruebas desde la UI, el cliente bloquea el envio y nunca llegas
 *      al servidor: demuestras que tu cliente funciona, no que el servidor
 *      rechaza. Esta parte corre sin navegador y es la que casi nadie hace.
 *
 *   B) Validacion en CLIENTE y comportamiento de UI -> navegador real.
 *      Necesita un driver. Aqui quedan declarados los casos y el contrato;
 *      se marcan SKIP si no hay driver, en lugar de fingir que pasan.
 *
 * Copiala a ia/qa/form.mjs y apuntala a tu formulario. Ajusta FORMS.
 *
 *   node ia/qa/form.mjs
 *   SMOKE_BASE_URL=http://127.0.0.1:8000 node ia/qa/form.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listEngines } from './driver.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IA = path.resolve(HERE, '..');
const ROOT = path.resolve(IA, '..');
const OUT = path.join(IA, '.harness', 'qa', 'FORM');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8000';

// ---------------------------------------------------------------------------
// Ajusta esto a tu formulario.
// ---------------------------------------------------------------------------
const FORM = {
  // Endpoint que recibe el formulario.
  endpoint: '/api/productos',
  // Como se obtiene el token, si el endpoint lo exige. Deja null si es publico.
  // Credenciales de PRUEBA, desde variables de entorno. NUNCA pongas credenciales
  // reales aqui: este archivo se versiona, y el escaneo de credenciales (paso 5 de
  // la disciplina de validacion) lo detectaria.
  auth: {
    endpoint: '/api/auth/login',
    body: {
      email: process.env.QA_USER || 'usuario@example.com',
      password: process.env.QA_PASSWORD || '',
    },
    tokenField: 'token',
  },
  // Payload valido minimo. El resto de casos lo derivan.
  valid: { nombre: 'Producto de prueba', precio: 12.5 },
  // Mensajes obligatorios por campo, tal como los devuelve el servidor.
  // El invariante NO es el texto exacto: es que el campo aparezca senalado.
  fields: ['nombre', 'precio'],
  // Casos del servidor. `expect` es el status HTTP esperado.
  // `mustMention` es el campo que la respuesta DEBE senalar.
  serverCases: [
    { name: 'nombre vacio',            payload: { nombre: '', precio: 1 },        expect: 422, mustMention: 'nombre' },
    { name: 'nombre solo espacios',    payload: { nombre: '   ', precio: 1 },     expect: 422, mustMention: 'nombre' },
    { name: 'nombre ausente',          payload: { precio: 1 },                    expect: 422, mustMention: 'nombre' },
    { name: 'precio no numerico',      payload: { nombre: 'X', precio: 'abc' },   expect: 422, mustMention: 'precio' },
    { name: 'precio negativo',         payload: { nombre: 'X', precio: -1 },      expect: 422, mustMention: 'precio' },
    { name: 'precio ausente',          payload: { nombre: 'X' },                  expect: 422, mustMention: 'precio' },
    { name: 'longitud excedida',       payload: { nombre: 'x'.repeat(500), precio: 1 }, expect: 422, mustMention: 'nombre' },
    { name: 'inyeccion HTML en nombre', payload: { nombre: '<script>alert(1)</script>', precio: 1 }, expect: [201, 422], mustMention: null,
      note: 'Si acepta, el valor NUNCA debe ejecutarse al mostrarse en el listado. Se verifica en la parte B.' },
    { name: 'unicode valido',          payload: { nombre: 'Caf\u00e9 \u00d1and\u00fa \u65e5\u672c\u8a9e', precio: 1 }, expect: [201, 422], mustMention: null },
  ],
};

// Casos que SOLO se pueden probar con navegador.
const UI_CASES = [
  'submit vacio: muestra mensaje y NO emite request',
  'el foco se mueve al primer campo con error',
  'el mensaje de error desaparece al corregir el campo',
  'doble clic en Guardar: emite un solo request',
  'el boton se deshabilita durante el envio',
  'camino feliz: guarda y el registro aparece en el listado',
  'el nombre con HTML se muestra escapado, sin ejecutar (XSS)',
  'la consola del navegador queda sin errores',
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
const evidence = { form: FORM.endpoint, ranAt: new Date().toISOString(), baseUrl: BASE_URL, serverCases: [], uiCases: UI_CASES };
let failed = 0, skipped = 0;

function save(name, data) {
  const f = path.join(OUT, `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`);
  fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return path.relative(ROOT, f).split(path.sep).join('/');
}

async function getToken() {
  if (!FORM.auth) return null;
  const res = await fetch(`${BASE_URL}${FORM.auth.endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(FORM.auth.body),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body[FORM.auth.tokenField]) {
    throw new Error(`login fallo (status ${res.status}); ajusta FORM.auth`);
  }
  return body[FORM.auth.tokenField];
}

const raw = (html) => String(html ?? '').replace(/<[^>]*>/g, '');

console.log('--- A) Validacion en SERVIDOR (HTTP directo, sin formulario) ---');
let token;
try {
  token = await getToken();
} catch (err) {
  console.log(`ERROR no puedo autenticar: ${err.message}`);
  console.log('       Revisa FORM.auth o si el servicio esta arriba.');
  process.exit(2);
}

for (const c of FORM.serverCases) {
  const expected = Array.isArray(c.expect) ? c.expect : [c.expect];
  try {
    const res = await fetch(`${BASE_URL}${FORM.endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(c.payload),
    });
    const text = await res.text();
    const body = (() => { try { return JSON.parse(text); } catch { return { raw: text.slice(0, 500) }; } })();
    const statusOk = expected.includes(res.status);
    const mentions = c.mustMention
      ? JSON.stringify(body).toLowerCase().includes(c.mustMention.toLowerCase())
      : true;
    const ok = statusOk && mentions;
    const detail = ok
      ? `status ${res.status}`
      : `status ${res.status} (esperaba ${expected.join('/')})${mentions ? '' : ` y no senala '${c.mustMention}'`}`;
    const artifact = save(`srv-${c.name}`, { request: { payload: c.payload }, status: res.status, body });
    evidence.serverCases.push({ case: c.name, ok, detail, artifact, note: c.note });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}  (${detail})`);
    if (!ok) failed++;
  } catch (err) {
    evidence.serverCases.push({ case: c.name, ok: false, detail: `ERROR: ${err.message}`, artifact: null });
    console.log(`ERROR ${c.name}  (${err.message})`);
    failed++;
  }
}

console.log('\n--- B) Validacion en CLIENTE y UI (navegador real) ---');
// La disponibilidad se SONDEA, no se asume: ver ia/qa/driver.mjs
const engines = await listEngines();
const uiEngine = engines.find((e) => e.available);
if (!uiEngine) {
  for (const name of UI_CASES) console.log(`SKIP  ${name}`);
  skipped = UI_CASES.length;
  console.log('\n       Estas ocho afirmaciones NO estan probadas. Declararlas en el');
  console.log('       TRACKING como partial, no como done. Para cubrirlas, usa el');
  console.log('       resolutor de motores: ia/qa/driver.mjs');
  for (const e of engines) console.log(`       - ${e.name}: ${e.detail}`);
}

fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(evidence, null, 2) + '\n', 'utf8');

console.log(`\n${failed ? 'HAY FALLOS' : 'SERVIDOR OK'} | ${FORM.serverCases.length - failed}/${FORM.serverCases.length} casos de servidor | ${skipped} casos de UI sin probar`);
console.log(`Evidencia: ${path.relative(ROOT, path.join(OUT, 'summary.json')).split(path.sep).join('/')}`);
process.exit(failed ? 1 : 0);

// ---------------------------------------------------------------------------
// Seccion B - como completarla.
//
//   import { createSession } from './driver.mjs';
//
//   const page = await createSession();          // elige motor: playwright | cdp | gstack
//   page.clearRequests();
//   await page.goto('http://127.0.0.1:5173/productos');
//
//   await page.click('button[type="submit"]');                       // submit vacio
//   assert(await page.isVisible('[data-error-for="nombre"]'), 'debe mostrar el error');
//   assert((await page.requests(FORM.endpoint)).length === 0, 'no debe emitir request');
//   assert((await page.evalJs('document.activeElement.id')) === 'nombre', 'foco en el error');
//
//   await page.fill('#nombre', FORM.valid.nombre);
//   await page.fill('#precio', String(FORM.valid.precio));
//   await page.click('button[type="submit"]');
//   assert((await page.count('#lista tr')) === 1, 'debe guardar y aparecer en el listado');
//   assert((await page.consoleErrors()).length === 0, 'consola limpia');
//
//   await page.screenshot('ia/.harness/qa/FORM/alta.png');
//   await page.close();
//
// El resultado de cada caso se guarda con save() y se copia a la columna
// `Evidencia` del TRACKING, **indicando el motor** (`page.engine`).
// Mientras la seccion B no corra, los AC de cliente van como `partial`, con
// quien los cierra y bajo que condicion.
// ---------------------------------------------------------------------------
