#!/usr/bin/env node
/**
 * install-hooks.mjs - activa el gate de commit del harness y comprueba que muerde.
 *
 * Por que existe: la activacion del gate NO viaja con el clon. `core.hooksPath`
 * es configuracion local de cada repositorio, y git no permite que un repositorio
 * la imponga a quien lo clona: un hook es codigo que se ejecuta en tu maquina, y
 * si viajara, clonar cualquier repositorio seria ejecucion de codigo remoto.
 *
 * Un comando, y verificado:
 *
 *   node ia/tools/install-hooks.mjs
 *
 * Hace tres cosas: activa, comprueba la configuracion, y PRUEBA QUE MUERDE.
 * Un gate que nunca se ha visto fallar no es un gate.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IA = path.resolve(HERE, '..');
const ROOT = path.resolve(IA, '..');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function git(args, opts = {}) {
  return spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', ...opts });
}

// El shell: en Windows lo trae Git for Windows.
function shell() {
  for (const sh of ['sh', 'bash']) {
    const r = spawnSync(sh, ['-c', 'exit 0'], { encoding: 'utf8' });
    if (r.status === 0) return sh;
  }
  return null;
}

// El hooksPath que declara la configuracion del harness, si existe.
function hooksPathEsperado() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(IA, 'tools', 'harness.config.json'), 'utf8'));
    return cfg.hooksPath || 'ia/tools/git-hooks';
  } catch {
    return 'ia/tools/git-hooks';
  }
}

const esperado = hooksPathEsperado();
const hook = path.join(ROOT, esperado, 'pre-commit');

console.log(`[install-hooks] repositorio: ${ROOT}`);

// --- 0. Es un repositorio git? ---------------------------------------------
if (git(['rev-parse', '--git-dir']).status !== 0) {
  console.error('[install-hooks] Esto no es un repositorio git. Un gate de commit necesita uno:');
  console.error('[install-hooks]   git init && git add -A && git commit -m "primer commit"');
  console.error('[install-hooks] ...y vuelve a ejecutarme.');
  process.exit(2);
}

// --- 1. Existe el hook? -----------------------------------------------------
if (!fs.existsSync(hook)) {
  console.error(`[install-hooks] No encuentro ${rel(hook)}.`);
  console.error('[install-hooks] Copia incompleta del harness: revisa ia/tools/git-hooks/.');
  process.exit(2);
}

// --- 2. Activar -------------------------------------------------------------
const antes = (git(['config', '--get', 'core.hooksPath']).stdout || '').trim();
const r = git(['config', 'core.hooksPath', esperado]);
if (r.status !== 0) {
  console.error(`[install-hooks] No pude escribir la configuracion: ${r.stderr || 'motivo desconocido'}`);
  process.exit(2);
}
const despues = (git(['config', '--get', 'core.hooksPath']).stdout || '').trim();
if (despues !== esperado) {
  console.error(`[install-hooks] La configuracion no quedo como esperaba: "${despues}" en vez de "${esperado}".`);
  process.exit(2);
}
console.log(`[install-hooks] core.hooksPath: ${antes || '(sin definir)'} -> ${despues}`);

// --- 3. Que muerda: violacion temporal, hook directo, sin commit ------------
// No se hace un commit de prueba a proposito: si el gate estuviera roto, ese
// commit se crearia de verdad. Se ejecuta el hook DIRECTAMENTE y se comprueba
// que sale con error. El archivo de prueba se borra siempre.
const sh = shell();
if (!sh) {
  console.log('[install-hooks] No encontre sh ni bash, asi que no puedo probar el gate aqui.');
  console.log('[install-hooks] Comprueba tu que muerde: git commit --allow-empty -m "prueba"  (debe fallar si el harness esta en rojo)');
  process.exit(0);
}

const cebo = path.join(ROOT, '.prueba-del-gate.mjs');
let mordio = null;
try {
  // Un caracter no ASCII basta: lo vigila el chequeo `ascii`.
  fs.writeFileSync(cebo, '// dise\u00f1o\n', 'utf8');
  const salida = spawnSync(sh, [rel(hook)], { cwd: ROOT, encoding: 'utf8' });
  mordio = salida.status !== 0;
  if (!mordio) {
    console.error('[install-hooks] El hook corrio pero NO bloqueo una violacion. El gate no sirve.');
    console.error('[install-hooks] Revisa ia/tools/check-harness.mjs: una corrida en verde con una violacion presente es un chequeo roto.');
  }
} finally {
  fs.rmSync(cebo, { force: true });
}

if (mordio) {
  console.log('[install-hooks] El gate muerde: con una violacion presente, el hook bloquea.');
  console.log('[install-hooks] Listo. Tus commits pasan por check-harness.');
  process.exit(0);
}
process.exit(1);
