#!/usr/bin/env node
/**
 * run-tests.mjs - fuente de verdad de las pruebas del proyecto.
 *
 * Ejecuta los comandos declarados en ia/tools/harness.config.json -> tests.commands
 * y escribe ia/.harness/last-run.json con el resultado REAL.
 *
 * Esa salida es la que cruza check-harness.mjs contra ia/KNOWN-FAILURES.md
 * (regla de reconciliacion, DEC-0012).
 *
 *   node ia/tools/run-tests.mjs              # corre todo lo declarado
 *   node ia/tools/run-tests.mjs --root <dir>
 *
 * Sin dependencias: solo Node >= 18.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IA_DEFAULT = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const optOf = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const ROOT = path.resolve(optOf('--root', path.resolve(IA_DEFAULT, '..')));
const IA = path.join(ROOT, 'ia');
const OUT_DIR = path.join(IA, '.harness');
const LOG_DIR = path.join(OUT_DIR, 'tests');
const LAST_RUN = path.join(OUT_DIR, 'last-run.json');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function loadConfig() {
  const p = path.join(IA, 'tools', 'harness.config.json');
  if (!fs.existsSync(p)) return { tests: { commands: [], timeoutMs: 600000 } };
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return { tests: { commands: [], timeoutMs: 600000 } }; }
}

const cfg = loadConfig();
const commands = (cfg.tests && cfg.tests.commands) || [];
const timeoutMs = (cfg.tests && cfg.tests.timeoutMs) || 600000;

fs.mkdirSync(LOG_DIR, { recursive: true });

if (!commands.length) {
  const result = {
    ranAt: new Date().toISOString(),
    ok: true,
    note: 'Sin comandos declarados en ia/tools/harness.config.json -> tests.commands',
    commands: [],
    failed: [],
  };
  fs.writeFileSync(LAST_RUN, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log('[run-tests] No hay comandos declarados.');
  console.log('[run-tests] Declara tus suites en ia/tools/harness.config.json -> tests.commands.');
  console.log(`[run-tests] Escrito ${rel(LAST_RUN)} (ok=true, sin fallos).`);
  process.exit(0);
}

const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60).toLowerCase();

function runOne(command, i) {
  const started = Date.now();
  const r = spawnSync(command, { cwd: ROOT, shell: true, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
  const ms = Date.now() - started;
  const output = `${r.stdout || ''}${r.stderr || ''}`;
  const logFile = path.join(LOG_DIR, `${String(i + 1).padStart(2, '0')}-${slug(command)}.log`);
  fs.writeFileSync(logFile, output || '(sin salida)\n', 'utf8');

  const timedOut = r.error && r.error.code === 'ETIMEDOUT';
  const exitCode = r.status === null ? -1 : r.status;

  // OJO: nada de \b despues de la alternativa. Entre un simbolo como \u2717 y un
  // espacio NO hay frontera de palabra, asi que `\u2717\b` no coincide nunca.
  // Se usa un lookahead de separador, que sirve igual para letras y simbolos.
  const RE_FALLO = /^\s*(?:FAIL|FALLO|FALL\u00d3|not ok|\u2717)(?=\s|:|$).*$/gim;
  const RE_NOMBRE = /^\s*(?:FAIL|FALLO|FALL\u00d3|not ok|\u2717)\s*:?\s*(.+)$/i;
  const passLines = (output.match(/^\s*(?:PASS|OK|ok)\b.*$/gim) || []).length;
  const failLines = (output.match(RE_FALLO) || []);
  const failedNames = failLines
    .map((l) => (RE_NOMBRE.exec(l) || [])[1])
    .filter(Boolean)
    .filter((s) => s.trim() !== '')
    .map((s) => s.trim().slice(0, 160));

  const ok = !timedOut && exitCode === 0;
  if (!ok && !failedNames.length) failedNames.push(`${command} (exit ${timedOut ? 'timeout' : exitCode})`);

  console.log(`[run-tests] ${ok ? 'ok  ' : 'FAIL'} ${command}  (exit ${timedOut ? 'timeout' : exitCode}, ${ms} ms)`);

  return { command, exitCode, timedOut, ms, ok, pass: passLines, failed: failedNames.length, log: rel(logFile), failedNames };
}

const results = commands.map(runOne);
const failed = [...new Set(results.flatMap((r) => r.failedNames))];
const ok = results.every((r) => r.ok);

const payload = {
  ranAt: new Date().toISOString(),
  ok,
  commands: results,
  failed,
};
fs.writeFileSync(LAST_RUN, JSON.stringify(payload, null, 2) + '\n', 'utf8');

const totalPass = results.reduce((a, r) => a + r.pass, 0);
console.log(`\n[run-tests] ${ok ? 'TODO OK' : 'HAY FALLOS'} | ${results.length} suite(s) | ${totalPass} PASS | ${failed.length} fallo(s) nombrado(s)`);
if (failed.length) {
  console.log('[run-tests] Fallos:');
  for (const f of failed) console.log(`  - ${f}`);
  console.log('[run-tests] Reconciliacion (DEC-0012): cada fallo debe estar en ia/KNOWN-FAILURES.md con dueno y cierre.');
}
console.log(`[run-tests] Escrito ${rel(LAST_RUN)}`);

process.exit(ok ? 0 : 1);
