#!/usr/bin/env node
/**
 * smoke.example.mjs - PLANTILLA del camino de humo (DEC-0014).
 *
 * Copiala a ia/qa/smoke.mjs y adaptala al proyecto. Recorre el mismo camino que
 * el usuario y AFIRMA condiciones observables. Escribe artefactos en
 * ia/.harness/qa/<FEATURE-ID>/ y sale con codigo != 0 si algo falla.
 *
 * Sin dependencias: solo Node >= 18 (fetch ya es global).
 * Para superficie web sin API, sustituye los `fetch` por el driver de navegador
 * que tengas disponible y guarda igualmente los artefactos aqui.
 *
 *   node ia/qa/smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IA = path.resolve(HERE, '..');
const ROOT = path.resolve(IA, '..');

// --- Configura el camino de humo del proyecto -------------------------------
const FEATURE = 'F-001';
const ARTIFACTS = path.join(IA, '.harness', 'qa', FEATURE);

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8000';

/** Pasos del camino: nombre + condicion observable. */
const steps = [
  {
    name: 'health responde 200 y status ok',
    async run() {
      const res = await fetch(`${BASE_URL}/health`);
      const body = await res.json().catch(() => ({}));
      return {
        artifact: { request: `GET ${BASE_URL}/health`, status: res.status, body },
        ok: res.status === 200 && body.status === 'ok',
        detail: `status=${res.status} body.status=${body.status}`,
      };
    },
  },
  {
    name: 'health no expone secretos',
    async run() {
      const res = await fetch(`${BASE_URL}/health`);
      const text = await res.text();
      const leaked = /(password|secret|token|api[_-]?key)["']?\s*[:=]\s*["'][^"']+/i.test(text);
      return {
        artifact: { raw: text.slice(0, 2000) },
        ok: !leaked,
        detail: leaked ? 'posible secreto en la respuesta' : 'sin secretos',
      };
    },
  },
  // Anade aqui los pasos del flujo real: login -> accion principal -> efecto.
];

// --- Runner -----------------------------------------------------------------
fs.mkdirSync(ARTIFACTS, { recursive: true });
const evidence = { feature: FEATURE, ranAt: new Date().toISOString(), baseUrl: BASE_URL, steps: [] };
let failed = 0;

for (const step of steps) {
  try {
    const { artifact, ok, detail } = await step.run();
    const file = path.join(ARTIFACTS, `${step.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`);
    fs.writeFileSync(file, JSON.stringify(artifact, null, 2) + '\n', 'utf8');
    evidence.steps.push({ step: step.name, ok, detail, artifact: path.relative(ROOT, file).split(path.sep).join('/') });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${step.name}  (${detail})`);
    if (!ok) failed++;
  } catch (err) {
    // Un fallo de red al arrancar el entorno no es "FAIL del producto": se distingue.
    evidence.steps.push({ step: step.name, ok: false, detail: `ERROR: ${err.message}`, artifact: null });
    console.log(`ERROR ${step.name}  (${err.message})`);
    failed++;
  }
}

const summaryPath = path.join(ARTIFACTS, 'summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(evidence, null, 2) + '\n', 'utf8');

console.log(`\n${failed ? 'HAY FALLOS' : 'TODO OK'} | ${steps.length - failed}/${steps.length} pasos`);
console.log(`Evidencia: ${path.relative(ROOT, summaryPath).split(path.sep).join('/')}`);
process.exit(failed ? 1 : 0);
