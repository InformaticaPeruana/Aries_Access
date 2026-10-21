#!/usr/bin/env node
/**
 * selftest-cdp.mjs - prueba el motor de navegador propio (ia/tools/browser-cdp.mjs)
 * y, de paso, demuestra como se valida un formulario web por capas.
 *
 * No necesita ningun proyecto: sirve su propio fixture (ia/qa/fixture/form.html).
 * Verifica que el motor arranca Edge/Chrome, navega, interactua, lee, captura y
 * recoge consola y red. Si esto pasa, el motor sirve para el QA real.
 *
 *   node ia/qa/selftest-cdp.mjs
 *   QA_HEADED=1 node ia/qa/selftest-cdp.mjs      # para verlo con interfaz
 *
 * Cero dependencias. Requiere Node >= 22 (WebSocket global).
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, probe } from '../tools/browser-cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IA = path.resolve(HERE, '..');
const ROOT = path.resolve(IA, '..');
const FIXTURE = path.join(HERE, 'fixture');
const OUT = path.join(IA, '.harness', 'qa', 'FORM-CDP');
fs.mkdirSync(OUT, { recursive: true });

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
let passed = 0, failed = 0;
const results = [];
function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  ok ? passed++ : failed++;
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

// --- servidor del fixture ---------------------------------------------------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; } // evita un console error falso
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = path.join(FIXTURE, urlPath === '/' ? 'form.html' : urlPath.replace(/^\/+/, ''));
  if (!file.startsWith(FIXTURE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('no encontrado');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

const pre = probe();
if (!pre.available) {
  console.log(`ERROR ${pre.detail}`);
  process.exit(2);
}
console.log(`motor: cdp | ${pre.detail}\n`);

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

let session;
const evidence = { engine: 'cdp', browser: pre.detail, fixture: base, checkedAt: new Date().toISOString(), checks: results };

try {
  session = await launch({ headless: process.env.QA_HEADED !== '1' });
  console.log(`navegador: ${session.browserVersion} (puerto ${session.port})\n`);

  // --- carga y estructura ---------------------------------------------------
  await session.goto(`${base}/form.html`);
  check('la pagina carga', (await session.text('h1')).includes('Alta de producto'));
  check('el titulo del documento es el esperado', (await session.evalJs('document.title')).includes('Fixture'));

  const forms = await session.forms();
  fs.writeFileSync(path.join(OUT, 'forms.json'), JSON.stringify(forms, null, 2) + '\n', 'utf8');
  const fields = forms[0]?.fields || [];
  check('el formulario expone sus campos como dato', fields.length === 3, `${fields.map((f) => f.name).join(', ')}`);
  check('nombre y precio son obligatorios',
    fields.filter((f) => f.required).map((f) => f.name).sort().join(',') === 'nombre,precio');

  // --- capa cliente: submit vacio ------------------------------------------
  await session.click('#guardar');
  check('submit vacio: muestra el error de nombre', await session.isVisible('[data-error-for="nombre"]'));
  check('submit vacio: muestra el error de precio', await session.isVisible('[data-error-for="precio"]'));
  check('submit vacio: NO guarda nada', (await session.count('#lista tr')) === 0);
  check('submit vacio: el foco va al primer campo con error',
    (await session.evalJs('document.activeElement && document.activeElement.id')) === 'nombre');
  check('submit vacio: marca el campo como invalido',
    (await session.evalJs('document.querySelector("#nombre").getAttribute("aria-invalid")')) === 'true');

  // --- capa cliente: regla de longitud -------------------------------------
  await session.fill('#nombre', 'ab');
  await session.fill('#precio', '10');
  await session.click('#guardar');
  const msgCorto = await session.text('[data-error-for="nombre"]');
  check('nombre corto: rechaza y explica por que', msgCorto.includes('3 caracteres'), msgCorto);

  // --- camino feliz ---------------------------------------------------------
  await session.fill('#nombre', 'Caf\u00e9 \u00d1and\u00fa');
  await session.fill('#precio', '12.50');
  await session.click('#guardar');
  check('camino feliz: el boton se deshabilita durante el guardado', (await session.isDisabled('#guardar')) === true);
  await session.evalJs('new Promise(r => setTimeout(r, 450))');
  check('camino feliz: aparece exactamente una fila', (await session.count('#lista tr')) === 1);
  check('camino feliz: la fila tiene el dato real', (await session.text('#lista tr:last-child .col-nombre')) === 'Caf\u00e9 \u00d1and\u00fa');
  check('camino feliz: los errores desaparecieron', !(await session.isVisible('[data-error-for="nombre"]')));
  check('camino feliz: el boton vuelve a habilitarse', (await session.isDisabled('#guardar')) === false);

  // --- doble submit ---------------------------------------------------------
  await session.fill('#nombre', 'Producto dos');
  await session.fill('#precio', '5');
  await session.click('#guardar');
  await session.click('#guardar'); // segundo clic con el boton deshabilitado
  await session.evalJs('new Promise(r => setTimeout(r, 450))');
  check('doble clic: guarda una sola vez', (await session.count('#lista tr')) === 2, `${await session.count('#lista tr')} filas`);
  check('doble clic: solo un guardado efectivo', (await session.evalJs('window.__guardados')) === 2);

  // --- XSS ------------------------------------------------------------------
  const payload = '<script>window.__xss = 1</script>';
  await session.fill('#nombre', payload);
  await session.fill('#precio', '1');
  await session.click('#guardar');
  await session.evalJs('new Promise(r => setTimeout(r, 450))');
  check('XSS: el valor se muestra como texto literal', (await session.text('#lista tr:last-child .col-nombre')) === payload);
  check('XSS: no se ejecuto nada', (await session.evalJs('typeof window.__xss')) === 'undefined');

  // --- red y consola --------------------------------------------------------
  const requests = await session.requests('/form.html');
  check('la red registra la navegacion real', requests.length >= 1, requests.map((r) => `${r.method} ${r.status}`).join(', '));
  const errors = await session.consoleErrors();
  check('consola sin errores', errors.length === 0, errors.join(' | '));

  // --- captura --------------------------------------------------------------
  const shot = await session.screenshot(path.join(OUT, 'formulario.png'));
  check('la captura se escribe en disco', fs.existsSync(shot) && fs.statSync(shot).size > 1000, rel(shot));

  evidence.forms = forms;
  evidence.requests = requests;
  evidence.consoleErrors = errors;
} catch (err) {
  // Distinguir un fallo del motor de un fallo de la asercion.
  check('el motor completo el recorrido', false, `ERROR: ${err.message}`);
  evidence.error = err.message;
} finally {
  if (session) await session.close();
  server.close();
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(evidence, null, 2) + '\n', 'utf8');
}

console.log(`\n${failed ? 'HAY FALLOS' : 'TODO OK'} | ${passed}/${passed + failed} comprobaciones`);
console.log(`Evidencia: ${rel(path.join(OUT, 'summary.json'))}`);
process.exit(failed ? 1 : 0);
