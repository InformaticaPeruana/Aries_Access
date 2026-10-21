#!/usr/bin/env node
/**
 * selftest-harness.mjs - prueba al que prueba.
 *
 * Los 17 chequeos de check-harness.mjs son el mecanismo del que dependen todos
 * los invariantes del harness. Si un chequeo deja de detectar, nadie se entera:
 * los commits pasan igual. Este archivo existe para que eso no pueda pasar en
 * silencio (DEC-0019).
 *
 * Por cada chequeo: copia el harness a temporal, rompe EXACTAMENTE lo que ese
 * chequeo vigila, corre el checker, y afirma dos cosas:
 *
 *   1. DETECCION: el chequeo esperado falla (o avisa, segun el caso).
 *   2. PRECISION: ninguno de los demas falla.
 *
 * La segunda es la que importa: un chequeo que falla por todo es tan inutil
 * como uno que no falla nunca.
 *
 *   node ia/qa/selftest-harness.mjs
 *
 * No toca el harness real: todo ocurre sobre copias en el directorio temporal.
 * Un chequeo sin su caso aqui esta incompleto (ia/UPDATE.md).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IA = path.resolve(HERE, '..');
const ROOT = path.resolve(IA, '..');
const CHECKER = path.join(IA, 'tools', 'check-harness.mjs');
const TMP = path.join(os.tmpdir(), 'qa-selftest-harness');

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
/** Ruta dentro de la copia de trabajo. */
const C = (dir, r) => path.join(dir, 'ia', r);

// ---------------------------------------------------------------- utilidades --

function copiarHarness(destino) {
  fs.rmSync(destino, { recursive: true, force: true });
  fs.mkdirSync(destino, { recursive: true });
  fs.cpSync(IA, path.join(destino, 'ia'), {
    recursive: true,
    filter: (origen) => !origen.includes(`${path.sep}.harness`),
  });
}

function escribir(p, txt) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, txt, 'utf8');
}

function agregar(p, txt) {
  fs.appendFileSync(p, txt, 'utf8');
}

function leer(p) {
  return fs.readFileSync(p, 'utf8');
}

/** Corre el checker sobre una copia y devuelve el mapa id -> status. */
function correrChecker(dir) {
  const r = spawnSync(process.execPath, [CHECKER, '--root', dir, '--json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  let salida;
  try {
    salida = JSON.parse(r.stdout);
  } catch {
    throw new Error(`el checker no devolvio JSON.\nstdout: ${(r.stdout || '').slice(0, 300)}\nstderr: ${(r.stderr || '').slice(0, 300)}`);
  }
  return Object.fromEntries(salida.checks.map((c) => [c.id, c.status]));
}

const INVALIDO = 'INVALIDO'; // valor centinela mientras no se corre

// -------------------------------------------------------------------- casos --

const casos = [
  {
    id: 'presupuesto-entrada',
    que: 'un archivo de entrada pasado de presupuesto',
    mutar: (d) => agregar(C(d, 'CURRENT.md'), '\n' + Array.from({ length: 45 }, (_, i) => `linea extra ${i}`).join('\n') + '\n'),
  },
  {
    id: 'enlaces',
    que: 'un documento sin ningun enlace saliente',
    mutar: (d) => escribir(C(d, 'plans/_plan_template.md'), '# PLAN\n\nEste documento no tiene enlaces salientes.\n'),
  },
  {
    id: 'indice-decisiones',
    que: 'una decision que no esta en INDEX.md',
    mutar: (d) => escribir(C(d, 'decisions/DEC-9000-de-prueba.md'),
      '## DEC-9000 - de prueba\n\nDate: 2026-01-01\nStatus: active\n\nContext:\nPrueba.\n\nDecision:\nPrueba.\n\nReason:\nPrueba.\n\nConsequences:\nPrueba.\n\n## Relacionados\n\n- Indice: [`INDEX.md`](./INDEX.md)\n'),
  },
  {
    id: 'indice-specs',
    que: 'una feature que no esta en specs/README.md',
    mutar: (d) => {
      escribir(C(d, 'specs/demo/F-900/F-900.spec.md'),
        '---\nSpec: F-900\nRiesgo: bajo\nAreas: []\nEstado: pending\n---\n\n# F-900\n\n- Spec: [`F-900.spec.md`](./F-900.spec.md) | Plan: [`plan`](../../../plans/F-900/PLAN.md)\n');
      escribir(C(d, 'plans/F-900/PLAN.md'),
        '# PLAN-F-900\n\n- Protocolo: [`04-plan.md`](../../protocol/04-plan.md)\n');
      escribir(C(d, 'plans/F-900/T01-x.md'),
        '---\nFeature: F-900\nTask: T01\nStatus: pending\nDepends: -\n---\n\n# T01\n\n- Protocolo: [`04-plan.md`](../../protocol/04-plan.md)\n');
    },
  },
  {
    id: 'paridad-plan-spec',
    que: 'un plan sin su spec',
    mutar: (d) => escribir(C(d, 'plans/F-901/PLAN.md'),
      '# PLAN-F-901\n\n- Protocolo: [`04-plan.md`](../../protocol/04-plan.md)\n'),
  },
  {
    id: 'estados',
    que: 'un estado fuera del vocabulario',
    mutar: (d) => escribir(C(d, 'plans/F-001/T01-endpoint-salud.md'),
      leer(C(d, 'plans/F-001/T01-endpoint-salud.md')).replace('Status: done', 'Status: casi-listito')),
  },
  {
    id: 'paridad-tracking',
    que: 'un archivo de tarea sin su fila en el TRACKING',
    // Se quita la FILA, no el archivo: borrarlo romperia ademas el enlace del
    // TRACKING y el caso dejaria de aislar lo suyo.
    mutar: (d) => {
      const p = C(d, 'specs/demo/F-001/F-001-TRACKING.md');
      const txt = leer(p);
      const linea = txt.split(/\r?\n/).find((l) => /^\|\s*\[?T02/.test(l));
      if (!linea) throw new Error('no encontre la fila de T02');
      escribir(p, txt.replace(linea + '\n', '').replace(linea, ''));
    },
  },
  {
    id: 'trazabilidad-codigo',
    que: 'codigo sin etiqueta, con el ratchet exigiendo mas',
    mutar: (d) => {
      escribir(path.join(d, 'src', 'prueba.php'), '<?php\n// sin etiqueta de feature\necho 1;\n');
      escribir(C(d, 'tools/harness-baseline.json'), JSON.stringify({ updatedAt: '2026-01-01', entryFileLines: {}, codeFilesTotal: 1, codeTaggedFiles: 1 }, null, 2));
    },
  },
  {
    id: 'fallos-conocidos',
    que: 'un fallo conocido sin dueno ni condicion de cierre',
    mutar: (d) => {
      // Hay que meterlo DENTRO de la tabla real: al final del archivo quedaria
      // fuera (despues del historial) y el chequeo ni lo veria.
      const p = C(d, 'KNOWN-FAILURES.md');
      const filaVacia = '| \u2014 | \u2014 | \u2014 | \u2014 | \u2014 |';
      const txt = leer(p);
      if (!txt.includes(filaVacia)) throw new Error('no encontre la fila vacia de "Fallos conocidos"');
      escribir(p, txt.replace(filaVacia, '| test_x.php AC1 | falla algo | UNKNOWN | \u2014 | \u2014 |'));
    },
  },
  {
    id: 'gate-revision',
    que: 'una feature de riesgo alto con el veredicto en placeholder',
    // No se borra el archivo: eso romperia el enlace del TRACKING y no aislaria.
    mutar: (d) => {
      const p = C(d, 'specs/demo/F-001/F-001-REVIEW.md');
      escribir(p, leer(p).replace(/^Veredicto: .*$/m, 'Veredicto: <pendiente>'));
    },
  },
  {
    id: 'gates',
    que: 'un gate sin prueba de recuperabilidad',
    // Trae confirmacion y resultado, pero no la prueba: aisla la regla nueva
    // (DEC-0020) en vez de fallar por otra cosa.
    mutar: (d) => agregar(C(d, 'GATES.md'),
      '\n## 2026-10-20 10:00 - prueba sin recuperabilidad\n\n- **Operacion:** `DROP TABLE x`\n- **Alcance:** local\n- **Irreversible porque:** borra datos\n- **Confirmado por:** Humberto\n- **Resultado:** OK\n'),
  },
  {
    id: 'binarios',
    que: 'un binario dentro de /ia',
    esperado: 'WARN',
    mutar: (d) => escribir(C(d, 'qa/fixture/captura-de-prueba.png'), 'no es un png de verdad, solo el nombre importa\n'),
  },
  {
    id: 'deuda',
    que: 'deuda sin disparador observable',
    mutar: (d) => agregar(C(d, 'DEBT.md'), '\n## DEUDA-900 - de prueba\n\n- **Feature:** F-900 | **Estado:** abierta\n- **Techo aceptado:** algo\n'),
  },
  {
    id: 'tablas',
    que: 'una tabla markdown con columnas inconsistentes',
    mutar: (d) => agregar(C(d, 'README.md'), '\n| Columna A | Columna B |\n|---|---|\n| una | dos | tres |\n'),
  },
  {
    id: 'punto-de-retomada',
    que: 'una tarea activa mientras CURRENT.md no apunta a nada',
    mutar: (d) => escribir(C(d, 'plans/F-001/T01-endpoint-salud.md'),
      leer(C(d, 'plans/F-001/T01-endpoint-salud.md')).replace('Status: done', 'Status: in_progress')),
  },
  {
    id: 'ascii',
    que: 'un nombre con enie y un caracter no ASCII en codigo',
    mutar: (d) => {
      escribir(path.join(d, 'ia', 'qa', 'fixture', 'n\u00f1-o.mjs'), 'export const x = "sin acentos";\n');
      escribir(C(d, 'qa/prueba-ascii.mjs'), '// linea con enie: dise\u00f1o\nexport const y = 1;\n');
    },
  },
  {
    id: 'enlaces-rotos',
    que: 'un enlace relativo que no resuelve',
    mutar: (d) => agregar(C(d, 'protocol/04-plan.md'), '\n- Enlace roto de prueba: [no existe](./no-existe-jamas.md)\n'),
  },
  {
    id: 'gates',
    que: 'un gate ANTERIOR a la regla, sin prueba de recuperabilidad (no aplica hacia atras)',
    esperado: 'PASS',
    mutar: (d) => agregar(C(d, 'GATES.md'),
      '\n## 2026-01-01 09:00 - entrada anterior a la regla\n\n- **Operacion:** `x`\n- **Alcance:** local\n- **Irreversible porque:** si\n- **Confirmado por:** Humberto\n- **Resultado:** OK\n'),
  },
  {
    id: 'gate-activo',
    que: 'un repositorio git sin el gate activado',
    // git init en la copia: sin core.hooksPath, el hook no esta donde git mira.
    mutar: (d) => { spawnSync('git', ['init', '-q'], { cwd: d, encoding: 'utf8' }); },
  },
  {
    id: 'version-harness',
    que: 'una copia con VERSION sin numero de version',
    // Se corrompe el contenido, no se borra el archivo: borrarlo romperia los
    // enlaces que apuntan a el y el caso dejaria de aislar lo suyo.
    mutar: (d) => {
      const p = C(d, 'VERSION');
      escribir(p, leer(p).replace(/^harness:\s*\d+\.\d+\.\d+/m, 'harness: sin-numero'));
    },
  },
];

// motores-qa NO tiene caso: su resultado depende del entorno (que haya Chrome
// instalado y si esta abierto). Forzarlo exigiria falsear la sonda, y un caso
// falso es peor que un caso ausente. Se prueba de verdad en el proyecto donde
// falte el motor. Queda declarado aqui a proposito.
const SIN_CASO = ['motores-qa'];

// ------------------------------------------------------------------- runner --

if (!fs.existsSync(CHECKER)) {
  console.error(`ERROR no encuentro ${rel(CHECKER)}`);
  process.exit(2);
}

let pasan = 0, fallan = 0;
const resultados = [];

// 0. La copia intacta debe estar en verde. Sin esto, lo demas no significa nada.
{
  const d = path.join(TMP, 'base');
  copiarHarness(d);
  const estados = correrChecker(d);
  const fallos = Object.entries(estados).filter(([, v]) => v === 'FAIL').map(([k]) => k);
  const ok = fallos.length === 0;
  ok ? pasan++ : fallan++;
  resultados.push({ caso: '(copia intacta)', ok, esperado: 'sin FAIL', obtenido: fallos.length ? fallos.join(',') : 'sin FAIL' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  copia intacta -> sin FAIL  ${ok ? '' : `(fallos: ${fallos.join(', ')})`}`);
}

// 1..N. Cada caso.
for (const caso of casos) {
  const esperado = caso.esperado || 'FAIL';
  const d = path.join(TMP, caso.id);
  copiarHarness(d);
  caso.mutar(d);
  let estados;
  try {
    estados = correrChecker(d);
  } catch (e) {
    fallan++;
    resultados.push({ caso: caso.id, ok: false, esperado, obtenido: `ERROR: ${e.message.slice(0, 120)}` });
    console.log(`FAIL  ${caso.id}  ERROR al correr el checker: ${e.message.slice(0, 120)}`);
    continue;
  }

  const propio = estados[caso.id];
  const otros = Object.entries(estados).filter(([id, v]) => id !== caso.id && v === 'FAIL').map(([id]) => id);
  const detecta = propio === esperado;
  const preciso = otros.length === 0;
  const ok = detecta && preciso;

  ok ? pasan++ : fallan++;
  const obtenido = detecta
    ? (preciso ? `${propio}, sin colaterales` : `${propio}, PERO tambien falla: ${otros.join(', ')}`)
    : `esperaba ${esperado} y dio ${propio}`;
  resultados.push({ caso: caso.id, ok, que: caso.que, esperado, obtenido });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${caso.id}  ${ok ? '' : `- ${obtenido}`}`);
}

// Reporte de los que no tienen caso, para que no se olviden.
for (const id of SIN_CASO) {
  console.log(`skip  ${id}  (depende del entorno; ver el comentario en este archivo)`);
}

fs.rmSync(TMP, { recursive: true, force: true });

const conCaso = casos.length + 1;
const idsCubiertos = new Set(casos.map((c) => c.id)).size;
const totalChequeos = idsCubiertos + SIN_CASO.length;
console.log(`\n${fallan ? 'HAY FALLOS' : 'TODO OK'} | ${pasan}/${conCaso} casos (${idsCubiertos} chequeos con caso, ${SIN_CASO.length} sin caso) | ${SIN_CASO.length} sin caso (declarados)`);
console.log(`cobertura: ${idsCubiertos} de ${totalChequeos} chequeos con su caso de prueba`);

if (fallan) {
  console.log('\nUn chequeo que no detecta lo suyo, o que detecta de mas, esta roto.');
  console.log('Arregla el CHECKER, no la expectativa: bajar el liston para que pase es fabricar un verde.');
}
process.exit(fallan ? 1 : 0);
