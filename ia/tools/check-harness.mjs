#!/usr/bin/env node
/**
 * check-harness.mjs - comprueba los invariantes del harness /ia.
 *
 * Sin dependencias: solo Node >= 18.
 *
 *   node ia/tools/check-harness.mjs                 # verifica
 *   node ia/tools/check-harness.mjs --report        # verifica + dashboard
 *   node ia/tools/check-harness.mjs --json          # salida maquina
 *   node ia/tools/check-harness.mjs --root <dir>    # verifica otro checkout
 *   node ia/tools/check-harness.mjs --update-baseline
 *
 * Salida: PASS / FAIL / WARN / SKIP por chequeo. Exit 1 si hay algun FAIL.
 * Regla de honestidad: el check en verde NO reemplaza la evidencia.
 *
 * Diseno y justificacion de cada chequeo: ../DESIGN.md | DEC-0002.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---------------------------------------------------------------- entorno ----

const HERE = path.dirname(fileURLToPath(import.meta.url)); // ia/tools
const IA_DEFAULT = path.resolve(HERE, '..');              // ia

const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const optOf = (f, d) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const ROOT = path.resolve(optOf('--root', path.resolve(IA_DEFAULT, '..')));
const IA = path.join(ROOT, 'ia');
const AS_JSON = hasFlag('--json');
const WITH_REPORT = hasFlag('--report');
const UPDATE_BASELINE = hasFlag('--update-baseline');

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

// ----------------------------------------------------------------- config ----

const DEFAULTS = {
  specsDir: 'ia/specs',
  plansDir: 'ia/plans',
  decisionsDir: 'ia/decisions',
  agentsDir: 'ia/agents',
  qaDir: 'ia/qa',
  entryBudgets: {
    'AGENTS.md': 140,
    'ia/INSTRUCTIONS.md': 120,
    'ia/CURRENT.md': 60,
    'ia-harness/CURRENT.md': 60,
    'ia/MEMORY.md': 220,
    'ia/specs/README.md': 140,
  },
  stateVocab: {
    feature: ['pending', 'in_progress', 'completed', 'blocked'],
    task: ['pending', 'in_progress', 'done', 'partial', 'blocked'],
  },
  reviewTriggers: {
    risks: ['alto'],
    areas: ['dinero', 'stock', 'fiscal', 'integraciones'],
  },
  codeRoots: ['src', 'app', 'lib', 'api', 'backend', 'frontend'],
  codeExtensions: ['.php', '.js', '.jsx', '.ts', '.tsx', '.dart', '.py', '.go', '.rb', '.java', '.kt', '.cs', '.swift', '.vue', '.svelte'],
  codeTagRegex: '(?:[A-Z]{1,4}-\\d{1,4})\\s+T\\d{2}',
  orphanExemptPrefixes: ['ia/archive/', 'ia/research/', 'ia/changes/', 'ia/.harness/'],
  binaryExtensions: ['.rar', '.zip', '.7z', '.tar', '.gz', '.exe', '.dll', '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.jpg', '.jpeg', '.png'],
  binariesScanRoot: 'ia',
  maintenanceDir: 'ia-harness',
  hooksPath: 'ia/tools/git-hooks',
  knownFailuresFile: 'ia/KNOWN-FAILURES.md',
  gatesFile: 'ia/GATES.md',
  // Lo pone en true el Paso 9 de ia/ADOPT.md. Con true, la falta de AGENTS.md pasa a ser FAIL.
  adopted: false,

  update: {
    versionFile: 'ia/VERSION',
    // Archivos del harness. Si falta uno, la copia esta a medio actualizar.
    // Ver ia/UPDATE.md (grupo A) y DEC-0018.
    criticalFiles: [
      'ia/VERSION',
      'ia/INSTRUCTIONS.md',
      'ia/protocol',
      'ia/agents',
      'ia/tools/check-harness.mjs',
      'ia/tools/run-tests.mjs',
      'ia/tools/browser-cdp.mjs',
      'ia/tools/git-hooks/pre-commit',
      'ia/qa/driver.mjs',
      'ia/qa/selftest-cdp.mjs',
      'ia/qa/selftest-perfil.mjs',
      'ia/qa/selftest-harness.mjs',
      'ia/qa/fixture',
      'ia/DESIGN.md',
      'ia/ADOPT.md',
      'ia/UPDATE.md',
    ],
  },
  exceptions: {
    plansWithoutSpec: [],
    specsWithoutPlan: [],
    orphanDocs: [],
    binaryAllow: [],
    // AGENTS.template.md se copia a la RAIZ del proyecto, asi que sus enlaces son
    // relativos al DESTINO (ia/CURRENT.md) y desde ia/ no resuelven por diseno.
    enlacesRotos: ['ia/AGENTS.template.md'],
  },
  tests: {
    commands: [],
    timeoutMs: 600000,
  },
};

function loadConfig() {
  const p = path.join(IA, 'tools', 'harness.config.json');
  if (!fs.existsSync(p)) return structuredClone(DEFAULTS);
  try {
    const user = JSON.parse(fs.readFileSync(p, 'utf8'));
    return deepMerge(structuredClone(DEFAULTS), user);
  } catch (err) {
    console.error(`[check-harness] harness.config.json invalido: ${err.message}`);
    process.exit(2);
  }
}

function deepMerge(base, patch) {
  for (const [k, v] of Object.entries(patch || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      base[k] = deepMerge(base[k], v);
    } else {
      base[k] = v;
    }
  }
  return base;
}

const CFG = loadConfig();
const BASELINE_PATH = path.join(IA, 'tools', 'harness-baseline.json');
const BASELINE = fs.existsSync(BASELINE_PATH) ? safeJson(BASELINE_PATH) : {};

function safeJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}

// ---------------------------------------------------------------- helpers ----

const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);
const isPlaceholder = (s) => /<[^>]{1,40}>|YYYY-MM-DD|F-XXX|T0n|FEATURE-ID/.test(s);

function walk(dir, predicate, out = []) {
  if (!exists(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '.harness') continue;
      walk(full, predicate, out);
    } else if (!predicate || predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function dirsIn(dir) {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(dir, e.name));
}

/** Frontmatter YAML simple: `clave: valor` y `clave: [a, b]`. */
function frontmatter(text) {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end < 0) return {};
  const out = {};
  for (const raw of text.slice(3, end).split(/\r?\n/)) {
    const m = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(raw.trim());
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      v = v.replace(/^["']|["']$/g, '');
    }
    out[m[1].toLowerCase()] = v;
  }
  return out;
}

/** Status desde frontmatter o desde una linea `Status:` / `Estado:`. */
function stateOf(text) {
  const fm = frontmatter(text);
  if (fm.status) return String(fm.status).toLowerCase();
  if (fm.estado) return String(fm.estado).toLowerCase();
  const m = /^(?:Status|Estado)\s*:\s*([A-Za-z_]+)\s*$/m.exec(text);
  return m ? m[1].toLowerCase() : null;
}

function markdownLinks(text) {
  const out = [];
  const re = /\[[^\]]*\]\(([^)\s]+)\)/g;
  let m;
  while ((m = re.exec(text))) out.push(m[1]);
  return out;
}

/**
 * Filas de la primera tabla markdown que tenga las columnas pedidas.
 * - `desde`: ancla de seccion; solo busca a partir del encabezado que la cumpla.
 *   Sin esto se leeria la primera tabla del documento, que muchas veces es un
 *   ejemplo de formato y no la lista real (bug encontrado por selftest-harness).
 * - Ignora lo que este dentro de bloques de codigo: ahi viven los ejemplos.
 */
function tableRows(text, requiredColumns, { desde = null } = {}) {
  const lineas = text.split(/\r?\n/);
  let inicio = 0;
  if (desde) {
    const idx = lineas.findIndex((l) => desde.test(l));
    if (idx < 0) return null;
    inicio = idx;
  }
  let enFence = false;
  for (let i = inicio; i < lineas.length; i++) {
    const t = lineas[i].trim();
    if (/^(```|~~~)/.test(t)) { enFence = !enFence; continue; }
    if (enFence || !t.startsWith('|')) continue;
    const header = splitRow(lineas[i]).map(norm);
    const idx = {};
    for (const col of requiredColumns) {
      idx[col] = header.findIndex((h) => h.includes(norm(col)));
    }
    if (Object.values(idx).some((v) => v < 0)) continue;
    const rows = [];
    for (let j = i + 2; j < lineas.length; j++) {
      const l = lineas[j].trim();
      if (!l.startsWith('|')) break;
      const cells = splitRow(l);
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      rows.push(cells);
    }
    return { header, idx, rows };
  }
  return null;
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

const cellText = (c) => (c || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim();

/**
 * Celda vacia: nada, o solo espacios, guiones (largo, medio o corto) y puntos.
 * Deliberadamente NO compara contra un caracter literal concreto: los documentos
 * usan guion largo como marca de "sin dato", y una comparacion exacta se rompia
 * en cuanto cambiaba el caracter. Aprendido arreglando el ASCII del codigo.
 */
const estaVacio = (v) => {
  const s = String(v ?? '').trim();
  return s === '' || /^[\s\u2014\u2013.\-]+$/.test(s) || isPlaceholder(s);
};

/** Normaliza para comparar cabeceras: minusculas y sin diacriticos (Dueno -> dueno). */
const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// --------------------------------------------------------------- chequeos ----

const checks = [];
const add = (r) => checks.push({ items: [], ...r });
const FAIL = 'FAIL', WARN = 'WARN', PASS = 'PASS', SKIP = 'SKIP';

// 1. Presupuesto de los archivos que se leen en cada sesion (ratchet, DEC-0008).
function checkEntryBudgets() {
  const items = [];
  let fail = false;
  const lines = {};
  for (const [file, max] of Object.entries(CFG.entryBudgets)) {
    const p = path.join(ROOT, file);
    if (!exists(p)) {
      // En un proyecto ya adoptado, AGENTS.md es obligatorio: es la puerta de entrada.
      if (file === 'AGENTS.md' && CFG.adopted) {
        fail = true;
        items.push({ level: FAIL, text: `${file}: no existe y el harness esta adoptado (adopted: true) - ver ia/ADOPT.md Paso 9` });
      } else {
        items.push({ level: SKIP, text: `${file}: no existe (se omite)` });
      }
      continue;
    }
    const n = read(p).split(/\r?\n/).length;
    lines[file] = n;
    const allowed = Math.max(max, BASELINE.entryFileLines?.[file] ?? 0);
    if (n > allowed) {
      fail = true;
      items.push({ level: FAIL, text: `${file}: ${n} lineas > ${allowed} (presupuesto ${max}${allowed > max ? `, heredado ${BASELINE.entryFileLines[file]}` : ''})` });
    } else {
      items.push({ level: PASS, text: `${file}: ${n}/${allowed}` });
    }
  }
  measurements.entryFileLines = lines;
  add({ id: 'presupuesto-entrada', title: 'Presupuesto de archivos de entrada', status: fail ? FAIL : PASS, items });
}

// 2. Ningun documento aislado (DEC-0005).
function checkOrphans() {
  const items = [];
  const files = walk(IA, (f) => f.endsWith('.md'));
  const orphans = [];
  for (const f of files) {
    const r = rel(f);
    if (CFG.orphanExemptPrefixes.some((pre) => r.startsWith(pre))) continue;
    if (CFG.exceptions.orphanDocs.includes(r)) continue;
    if (markdownLinks(read(f)).length === 0) orphans.push(r);
  }
  for (const o of orphans) items.push({ level: FAIL, text: `${o}: 0 enlaces salientes` });
  if (!orphans.length) items.push({ level: PASS, text: `${files.length} documentos, ninguno aislado` });
  measurements.orphans = orphans.length;
  add({ id: 'enlaces', title: 'Nodos sin enlace saliente (DEC-0005)', status: orphans.length ? FAIL : PASS, items });
}

// 3. Paridad decisions/INDEX.md <-> archivos DEC-*.md.
function checkDecisionIndex() {
  const dir = path.join(ROOT, CFG.decisionsDir);
  const idxPath = path.join(dir, 'INDEX.md');
  const items = [];
  const files = exists(dir)
    ? fs.readdirSync(dir).filter((f) => /^DEC-.*\.md$/i.test(f)).sort()
    : [];
  if (!exists(idxPath)) {
    return add({ id: 'indice-decisiones', title: 'Indice de decisiones', status: FAIL, items: [{ level: FAIL, text: `${rel(idxPath)}: no existe` }] });
  }
  const idx = read(idxPath);
  const missing = files.filter((f) => !idx.includes(f));
  for (const m of missing) items.push({ level: FAIL, text: `${CFG.decisionsDir}/${m}: no aparece en INDEX.md` });
  // Enlaces del indice que apuntan a archivos inexistentes.
  for (const link of markdownLinks(idx)) {
    if (!link.endsWith('.md')) continue;
    const target = path.resolve(dir, link);
    if (!exists(target)) items.push({ level: FAIL, text: `INDEX.md -> ${link}: destino inexistente` });
  }
  if (!items.length) items.push({ level: PASS, text: `${files.length} decisiones indexadas y existentes` });
  add({ id: 'indice-decisiones', title: 'Paridad decisions/INDEX.md', status: items.some((i) => i.level === FAIL) ? FAIL : PASS, items });
}

// 4. Paridad specs/README.md <-> carpetas de spec.
function checkSpecIndex() {
  const specsDir = path.join(ROOT, CFG.specsDir);
  const idxPath = path.join(specsDir, 'README.md');
  const items = [];
  if (!exists(idxPath)) {
    return add({ id: 'indice-specs', title: 'Indice de specs', status: FAIL, items: [{ level: FAIL, text: `${rel(idxPath)}: no existe` }] });
  }
  const idx = read(idxPath);
  const featureIds = specsFeatureDirs().map((d) => path.basename(d));
  const unindexed = featureIds.filter((id) => !idx.includes(id));
  for (const u of unindexed) items.push({ level: FAIL, text: `${CFG.specsDir}/**/${u}: no aparece en specs/README.md` });
  for (const link of markdownLinks(idx)) {
    if (!/\.md$/.test(link)) continue;
    const target = path.resolve(specsDir, link);
    if (!exists(target) && !isPlaceholder(link)) {
      items.push({ level: FAIL, text: `specs/README.md -> ${link}: destino inexistente` });
    }
  }
  if (!items.length) items.push({ level: PASS, text: `${featureIds.length} features indexadas` });
  add({ id: 'indice-specs', title: 'Paridad specs/README.md', status: items.some((i) => i.level === FAIL) ? FAIL : PASS, items });
}

/** Directorios de feature dentro de specs/ (los que contienen un *.spec.md). */
function specsFeatureDirs() {
  const specsDir = path.join(ROOT, CFG.specsDir);
  return walk(specsDir, (f) => /\.spec\.md$/i.test(f)).map((f) => path.dirname(f));
}

// 5. Paridad plan <-> spec (DEC-0001).
function checkPlanSpecParity() {
  const items = [];
  const planDirs = dirsIn(path.join(ROOT, CFG.plansDir));
  const specNames = new Set(specsFeatureDirs().map((d) => path.basename(d)));
  for (const d of planDirs) {
    const id = path.basename(d);
    if (isPlaceholder(id)) continue;
    if (!specNames.has(id) && !CFG.exceptions.plansWithoutSpec.includes(id)) {
      items.push({ level: FAIL, text: `${rel(d)}: sin spec correspondiente` });
    }
  }
  const planNames = new Set(planDirs.map((d) => path.basename(d)));
  for (const id of specNames) {
    if (isPlaceholder(id)) continue;
    if (!planNames.has(id) && !CFG.exceptions.specsWithoutPlan.includes(id)) {
      items.push({ level: FAIL, text: `${CFG.specsDir}/**/${id}: spec sin plan correspondiente` });
    }
  }
  if (!items.length) items.push({ level: PASS, text: `${planDirs.length} planes y ${specNames.size} specs en paridad` });
  measurements.features = specNames.size;
  add({ id: 'paridad-plan-spec', title: 'Paridad plan <-> spec', status: items.some((i) => i.level === FAIL) ? FAIL : PASS, items });
}

// 6. Estados: presentes y dentro del vocabulario (DEC-0003).
function checkStates() {
  const items = [];
  const taskVocab = CFG.stateVocab.task;
  const featVocab = CFG.stateVocab.feature;
  const counts = { task: {}, feature: {} };
  const bump = (bucket, v) => { counts[bucket][v] = (counts[bucket][v] || 0) + 1; };

  // Tareas: Status obligatorio.
  const taskFiles = walk(path.join(ROOT, CFG.plansDir), (f) => /(^|[\\/])T\d+.*\.md$/i.test(f));
  for (const f of taskFiles) {
    const txt = read(f);
    if (isPlaceholder(txt.slice(0, 400))) continue;
    const st = stateOf(txt);
    if (!st) { items.push({ level: FAIL, text: `${rel(f)}: sin 'Status:'` }); continue; }
    if (!taskVocab.includes(st)) { items.push({ level: FAIL, text: `${rel(f)}: Status '${st}' fuera del vocabulario` }); continue; }
    bump('task', st);
  }

  // TRACKING: estado de feature + columna Estado de la tabla.
  for (const f of walk(path.join(ROOT, CFG.specsDir), (t) => /-TRACKING\.md$/i.test(t))) {
    const txt = read(f);
    if (isPlaceholder(txt.slice(0, 400))) continue;
    const st = stateOf(txt);
    if (!st) items.push({ level: FAIL, text: `${rel(f)}: sin 'Estado:'` });
    else if (!featVocab.includes(st)) items.push({ level: FAIL, text: `${rel(f)}: Estado '${st}' fuera del vocabulario` });
    else bump('feature', st);

    const table = tableRows(txt, ['tarea', 'estado']);
    if (table) {
      for (const row of table.rows) {
        const val = (row[table.idx.estado] || '').toLowerCase().trim();
        if (estaVacio(val)) continue;
        const first = val.split(/[\s(]/)[0];
        if (!taskVocab.includes(first)) {
          items.push({ level: FAIL, text: `${rel(f)}: estado '${val}' fuera del vocabulario` });
        }
        // No se cuenta aqui: el conteo de tareas sale de los archivos T0n,
        // para no duplicar (tabla + archivo son el mismo hecho).
      }
    }
  }
  measurements.taskStates = counts.task;
  measurements.featureStates = counts.feature;
  if (!items.length) {
    items.push({ level: PASS, text: `estados validos (tareas: ${JSON.stringify(counts.task)})` });
  }
  add({ id: 'estados', title: 'Vocabulario de estados (DEC-0003)', status: items.some((i) => i.level === FAIL) ? FAIL : PASS, items });
}

// 7. Paridad TRACKING <-> archivos de tarea (DEC-0009).
function checkTrackingParity() {
  const items = [];
  const trackings = walk(path.join(ROOT, CFG.specsDir), (t) => /-TRACKING\.md$/i.test(t));
  for (const tr of trackings) {
    const featureId = path.basename(path.dirname(tr));
    if (isPlaceholder(featureId)) continue;
    const planDir = path.join(ROOT, CFG.plansDir, featureId);
    if (!exists(planDir)) continue; // lo reporta paridad-plan-spec
    const taskFiles = fs.readdirSync(planDir).filter((f) => /^T\d+.*\.md$/i.test(f));
    const onDisk = new Set(taskFiles.map((f) => (/^(T\d+)/.exec(f) || [])[1]).filter(Boolean));
    const table = tableRows(read(tr), ['tarea']);
    const inTracking = new Set();
    if (table) {
      for (const row of table.rows) {
        const id = (/^(T\d+)/.exec(cellText(row[table.idx.tarea])) || [])[1];
        if (id) inTracking.add(id);
      }
    } else if (onDisk.size) {
      items.push({ level: FAIL, text: `${rel(tr)}: sin tabla de tareas` });
    }
    for (const id of onDisk) if (!inTracking.has(id)) items.push({ level: FAIL, text: `${rel(tr)}: falta la fila de ${id}` });
    for (const id of inTracking) if (!onDisk.has(id)) items.push({ level: FAIL, text: `${rel(planDir)}: falta el archivo ${id}-*.md` });
  }
  if (!items.length) items.push({ level: PASS, text: `${trackings.length} trackings en paridad con sus tareas` });
  add({ id: 'paridad-tracking', title: 'Paridad TRACKING <-> tareas (DEC-0009)', status: items.some((i) => i.level === FAIL) ? FAIL : PASS, items });
}

// 8. Trazabilidad codigo<->spec, como ratchet (DEC-0002/DEC-0008).
function checkCodeTags() {
  const items = [];
  const roots = CFG.codeRoots.map((r) => path.join(ROOT, r)).filter(exists);
  if (!roots.length) return add({ id: 'trazabilidad-codigo', title: 'Trazabilidad en codigo', status: SKIP, items: [{ level: SKIP, text: `ninguna codeRoot existe: ${CFG.codeRoots.join(', ')}` }] });
  const re = new RegExp(CFG.codeTagRegex);
  let total = 0, tagged = 0;
  for (const root of roots) {
    for (const f of walk(root, (p) => CFG.codeExtensions.includes(path.extname(p).toLowerCase()))) {
      total++;
      if (re.test(read(f))) tagged++;
    }
  }
  measurements.codeFilesTotal = total;
  measurements.codeTaggedFiles = tagged;
  const base = BASELINE.codeTaggedFiles ?? 0;
  const pct = total ? ((tagged / total) * 100).toFixed(1) : '0.0';
  items.push({ level: tagged < base ? FAIL : PASS, text: `${tagged}/${total} archivos con etiqueta <FEATURE-ID> T0n (${pct}%) | linea base ${base}` });
  if (tagged > base) items.push({ level: PASS, text: `mejoro: sube la linea base con --update-baseline` });
  add({ id: 'trazabilidad-codigo', title: 'Trazabilidad codigo<->spec (ratchet)', status: tagged < base ? FAIL : PASS, items });
}

// 9. Fallos conocidos con dueno y cierre, cruzados con el runner (DEC-0012).
function checkKnownFailures() {
  const items = [];
  const p = path.join(ROOT, CFG.knownFailuresFile);
  if (!exists(p)) {
    return add({ id: 'fallos-conocidos', title: 'Fallos conocidos (DEC-0012)', status: WARN, items: [{ level: WARN, text: `${CFG.knownFailuresFile}: no existe (no hay registro de fallos)` }] });
  }
  const txt = read(p);
  // OJO: hay que leer la tabla de la lista real, no la del ejemplo de formato.
  // Sin el ancla se leeria la primera tabla del documento (ver tableRows).
  const tabla = tableRows(txt, ['dueno', 'cierre'], { desde: /^##\s+Fallos conocidos\s*$/im });
  if (!tabla) {
    return add({
      id: 'fallos-conocidos',
      title: 'Fallos conocidos (DEC-0012)',
      status: FAIL,
      items: [{ level: FAIL, text: `${CFG.knownFailuresFile}: no encuentro la tabla bajo '## Fallos conocidos'` }],
    });
  }
  const table = tabla;
  const listed = new Set();
  let malformed = 0;
  if (table) {
    for (const row of table.rows) {
      const name = cellText(row[0]);
      if (estaVacio(name)) continue;
      listed.add(name);
      const dueno = cellText(row[table.idx.dueno]);
      const cierre = cellText(row[table.idx.cierre]);
      if (estaVacio(dueno) || estaVacio(cierre)) {
        malformed++;
        items.push({ level: FAIL, text: `'${name}': falta Dueno o condicion de Cierre` });
      }
    }
  }
  // Cruce con el runner, si existe.
  const run = safeJson(path.join(IA, '.harness', 'last-run.json'));
  if (run && Array.isArray(run.failed)) {
    const newFails = run.failed.filter((f) => !listed.has(f));
    for (const f of newFails) items.push({ level: FAIL, text: `fallo NUEVO no registrado: ${f}` });
    const stale = [...listed].filter((l) => !run.failed.includes(l) && l !== '-');
    for (const s of stale) items.push({ level: WARN, text: `entrada obsoleta (ya pasa): ${s}` });
    if (!newFails.length && !stale.length) items.push({ level: PASS, text: `${listed.size} fallos conocidos, reconciliados con el runner` });
  } else {
    items.push({ level: SKIP, text: 'sin ia/.harness/last-run.json: corre run-tests.mjs para reconciliar' });
  }
  const status = items.some((i) => i.level === FAIL) ? FAIL : PASS;
  measurements.knownFailures = listed.size;
  add({ id: 'fallos-conocidos', title: 'Fallos conocidos (DEC-0012)', status, items });
}

// 10. Gate de revision adversarial por riesgo (DEC-0006).
function checkReviewGate() {
  const items = [];
  let required = 0, present = 0;
  for (const spec of walk(path.join(ROOT, CFG.specsDir), (f) => /\.spec\.md$/i.test(f))) {
    const txt = read(spec);
    const fm = frontmatter(txt);
    const riesgo = String(fm.riesgo || '').toLowerCase();
    const areas = Array.isArray(fm.areas) ? fm.areas.map((a) => a.toLowerCase()) : [];
    const needs = CFG.reviewTriggers.risks.includes(riesgo) || areas.some((a) => CFG.reviewTriggers.areas.includes(a));
    if (!needs) continue;
    required++;
    const dir = path.dirname(spec);
    const review = fs.readdirSync(dir).find((f) => /-REVIEW\.md$/i.test(f));
    if (!review) {
      items.push({ level: FAIL, text: `${rel(spec)}: riesgo '${riesgo || areas.join(',')}' exige -REVIEW.md` });
      continue;
    }
    const rtxt = read(path.join(dir, review));
    const rfm = frontmatter(rtxt);
    const veredicto = String(rfm.veredicto || '').toUpperCase().trim();
    if (!veredicto) {
      items.push({ level: FAIL, text: `${rel(dir)}/${review}: sin 'Veredicto:' en el frontmatter` });
      continue;
    }
    if (!/^(APROBADO|APROBADO_CON_OBSERVACIONES|RECHAZADO)$/.test(veredicto)) {
      items.push({ level: FAIL, text: `${rel(dir)}/${review}: veredicto '${veredicto}' no es APROBADO | APROBADO_CON_OBSERVACIONES | RECHAZADO` });
      continue;
    }
    if (veredicto === 'RECHAZADO') {
      items.push({ level: FAIL, text: `${rel(dir)}/${review}: veredicto RECHAZADO` });
      continue;
    }
    present++;
    items.push({ level: PASS, text: `${rel(dir)}: ${veredicto}` });
  }
  if (!required) items.push({ level: PASS, text: 'ninguna feature exige revision por ahora' });
  measurements.reviews = { required, present };
  add({ id: 'gate-revision', title: 'Gate de revision adversarial (DEC-0006)', status: items.some((i) => i.level === FAIL) ? FAIL : PASS, items });
}

// 11. Gates de una sola direccion bien formados (DEC-0007).
function checkGates() {
  const items = [];
  const p = path.join(ROOT, CFG.gatesFile);
  if (!exists(p)) return add({ id: 'gates', title: 'Bitacora de gates (DEC-0007)', status: SKIP, items: [{ level: SKIP, text: `${CFG.gatesFile}: no existe` }] });
  const txt = read(p);
  // Una entrada de gate empieza por fecha: `## YYYY-MM-DD HH:mm - ...`.
  // Cualquier otra cabecera (Notas, Campos, el ejemplo con placeholders) se ignora.
  // Un campo NUEVO obligatorio no puede invalidar lo ya escrito (DEC-0023): el
  // requisito aplica desde la fecha en que se introdujo, no hacia atras.
  const FECHA_MINIMA_RECUPERABILIDAD = '2026-10-14';
  const blocks = txt.split(/\n(?=## )/).slice(1);
  let count = 0, pending = 0;
  for (const b of blocks) {
    const heading = b.split('\n')[0];
    if (!/^##\s+\d{4}-\d{2}-\d{2}/.test(heading)) continue;
    count++;
    const fecha = /^##\s+(\d{4}-\d{2}-\d{2})/.exec(heading)[1];
    const exigeRecuperabilidad = fecha >= FECHA_MINIMA_RECUPERABILIDAD;
    const conf = /Confirmado por:\**\s*(\S.*)/i.exec(b);
    const res = /Resultado:\**\s*(\S.*)/i.exec(b);
    const rec = /Recuperabilidad comprobada:\**\s*(\S.*)/i.exec(b);
    if (!conf || !res || (exigeRecuperabilidad && !rec)) {
      items.push({ level: FAIL, text: `${heading.trim()}: falta 'Recuperabilidad comprobada:', 'Confirmado por:' o 'Resultado:'` });
      continue;
    }
    if (exigeRecuperabilidad && isPlaceholder(rec[1])) {
      items.push({ level: FAIL, text: `${heading.trim()}: la recuperabilidad esta declarada, no comprobada (pon el comando y su resultado)` });
      continue;
    }
    if (isPlaceholder(conf[1])) pending++;
  }
  if (!count) items.push({ level: PASS, text: 'sin gates ejecutados registrados' });
  if (pending) items.push({ level: WARN, text: `${pending} gate(s) pendiente(s) de confirmacion` });
  measurements.gates = { count, pending };
  add({ id: 'gates', title: 'Bitacora de gates (DEC-0007)', status: items.some((i) => i.level === FAIL) ? FAIL : PASS, items });
}

// 12. Binarios dentro de /ia (DEC-0013). Aviso, no fallo.
function checkBinaries() {
  const items = [];
  const root = path.join(ROOT, CFG.binariesScanRoot);
  const found = walk(root, (f) => CFG.binaryExtensions.includes(path.extname(f).toLowerCase()));
  for (const f of found) {
    if (CFG.exceptions.binaryAllow.includes(rel(f))) continue;
    items.push({ level: WARN, text: `${rel(f)}: binario versionado en /ia` });
  }
  if (!found.length) items.push({ level: PASS, text: 'sin binarios en /ia' });
  measurements.binaries = found.length;
  add({ id: 'binarios', title: 'Binarios dentro de /ia (DEC-0013)', status: items.some((i) => i.level === FAIL) ? FAIL : (items.some((i) => i.level === WARN) ? WARN : PASS), items });
}

// 13. Deuda aceptada: disparador obligatorio (DEC-0011). Aviso si hay abierta.
function checkDebt() {
  const items = [];
  const p = path.join(IA, 'DEBT.md');
  if (!exists(p)) return add({ id: 'deuda', title: 'Ledger de deuda (DEC-0011)', status: SKIP, items: [{ level: SKIP, text: 'ia/DEBT.md: no existe' }] });
  const txt = read(p);
  // Una entrada de deuda empieza por su id: `## DEUDA-001 - ...`.
  const blocks = txt.split(/\n(?=## )/).slice(1);
  let open = 0, bad = 0;
  for (const b of blocks) {
    const heading = b.split('\n')[0];
    if (!/^##\s+DEUDA-/i.test(heading)) continue;
    if (isPlaceholder(heading)) continue;
    const disparador = /Disparador:\**\s*(\S.*)/i.exec(b);
    const estado = /Estado:\**\s*(\w+)/i.exec(b);
    if (!disparador || isPlaceholder(disparador[1])) { bad++; items.push({ level: FAIL, text: `${heading.trim()}: sin disparador` }); continue; }
    if (estado && estado[1].toLowerCase() !== 'cerrada') open++;
  }
  measurements.debtOpen = open;
  if (bad) return add({ id: 'deuda', title: 'Ledger de deuda (DEC-0011)', status: FAIL, items });
  if (open) items.push({ level: WARN, text: `${open} deuda(s) abierta(s) con disparador` });
  else items.push({ level: PASS, text: 'sin deuda abierta' });
  add({ id: 'deuda', title: 'Ledger de deuda (DEC-0011)', status: open ? WARN : PASS, items });
}

// 14. Motores de navegador disponibles para el QA (DEC-0015). Aviso, no fallo:
// un harness es valido sin navegador, pero entonces los AC de superficie web
// no se pueden cerrar y van como `partial`.
async function checkQaEngines() {
  const items = [];
  let available = 0;
  try {
    const mod = await import(pathToFileURL(path.join(IA, 'qa', 'driver.mjs')).href);
    for (const e of await mod.listEngines()) {
      if (e.available) { available++; items.push({ level: PASS, text: `${e.name}: disponible | ${e.detail}` }); }
      else items.push({ level: SKIP, text: `${e.name}: no disponible | ${e.detail}` });
    }
    if (!available) items.push({ level: WARN, text: 'ningun motor: los AC de UI quedaran en partial' });
  } catch (err) {
    items.push({ level: SKIP, text: `no se pudo sondear (${err.message})` });
  }
  measurements.qaEngines = available;
  add({ id: 'motores-qa', title: 'Motores de navegador para QA (DEC-0015)', status: available ? PASS : WARN, items });
}

// 15. Tablas markdown bien formadas: una fila con distinto numero de columnas
// que su cabecera rompe el render (y rompe el parseo de Dataview). Un pipe
// literal dentro de una celda debe ir escapado como \|.
function checkTables() {
  const items = [];
  const files = walk(IA, (f) => f.endsWith('.md'));
  let tables = 0;
  for (const file of files) {
    const lines = read(file).split(/\r?\n/);
    let inFence = false;
    let enTabla = false;
    let esperadas = 0;
    let numero = 0;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (/^(```|~~~)/.test(t)) { inFence = !inFence; enTabla = false; continue; }
      if (inFence) continue;
      if (!t.startsWith('|')) { enTabla = false; continue; }
      const cols = t.replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).length;
      if (!enTabla) { esperadas = cols; enTabla = true; numero = i + 1; tables++; continue; }
      if (/^\|[\s:|-]+\|$/.test(t)) continue; // fila separadora
      if (cols !== esperadas) {
        items.push({ level: FAIL, text: `${rel(file)}:${i + 1}: ${cols} columnas, la tabla (linea ${numero}) declara ${esperadas}. Un pipe literal debe ir como \\|` });
      }
    }
  }
  measurements.tables = tables;
  if (!items.length) items.push({ level: PASS, text: `${tables} tablas, todas con columnas consistentes` });
  add({ id: 'tablas', title: 'Tablas markdown bien formadas', status: items.some((i) => i.level === FAIL) ? FAIL : PASS, items });
}

// 16. Punto de retomada (DEC-0016, protocol/14-context.md).
// El contexto de una conversacion no se puede medir desde el repo. El punto de
// retomada SI: como maximo una tarea activa, y CURRENT.md apuntando a ella.
function checkResumePoint() {
  const items = [];
  const activas = walk(path.join(ROOT, CFG.plansDir), (p) => /(^|[\\/])T\d+.*\.md$/i.test(p))
    .filter((f) => stateOf(read(f)) === 'in_progress')
    .map(rel);
  const featuresActivas = walk(path.join(ROOT, CFG.specsDir), (t) => /-TRACKING\.md$/i.test(t))
    .filter((f) => stateOf(read(f)) === 'in_progress')
    .map(rel);
  measurements.inProgress = activas.length;

  if (activas.length > 1) {
    for (const a of activas) items.push({ level: FAIL, text: `${a}: in_progress - solo puede haber UNA tarea activa (deja las otras en partial o pending con nota)` });
  }

  const hayTrabajo = activas.length > 0 || featuresActivas.length > 0;
  const cur = path.join(IA, 'CURRENT.md');
  if (hayTrabajo && !exists(cur)) {
    items.push({ level: FAIL, text: 'CURRENT.md: no existe y hay trabajo en curso' });
  } else if (hayTrabajo) {
    const txt = read(cur);
    const seccion = (nombre) => {
      const m = new RegExp(`^##\\s+${nombre}\\s*$`, 'm').exec(txt);
      if (!m) return null;
      const resto = txt.slice(m.index + m[0].length);
      const fin = resto.search(/\n##\s/);
      return (fin >= 0 ? resto.slice(0, fin) : resto).replace(/<!--[\s\S]*?-->/g, '').trim();
    };
    const vacio = (v) => v === null || estaVacio(v);
    for (const nombre of ['Active Spec', 'Active Plan', 'Next']) {
      if (vacio(seccion(nombre))) {
        items.push({ level: FAIL, text: `CURRENT.md: '${nombre}' vacio y hay trabajo en curso (${activas.length} tarea(s), ${featuresActivas.length} feature(s) in_progress)` });
      }
    }
  }

  if (!items.length) {
    items.push({ level: PASS, text: activas.length ? `1 tarea activa y CURRENT apunta a ella` : 'sin tareas activas; no hay nada que retomar' });
  }
  add({ id: 'punto-de-retomada', title: 'Punto de retomada (DEC-0016)', status: items.some((i) => i.level === FAIL) ? FAIL : PASS, items });
}

// 17. Version del harness y estructura intacta (DEC-0018).
// Detecta una copia a medio actualizar: nombra el archivo que falta en vez de
// dejar que reviente mas adelante, en mitad de una tarea.
function checkVersion() {
  const items = [];
  const p = path.join(ROOT, CFG.update.versionFile);
  if (!exists(p)) {
    items.push({ level: FAIL, text: `${CFG.update.versionFile}: no existe (una copia sin version no se puede actualizar)` });
  } else {
    const txt = read(p);
    const m = /^harness:\s*(\d+\.\d+\.\d+)/m.exec(txt);
    const f = /^fecha:\s*(\d{4}-\d{2}-\d{2})/m.exec(txt);
    if (!m) items.push({ level: FAIL, text: `${CFG.update.versionFile}: falta 'harness: X.Y.Z'` });
    else measurements.harnessVersion = m[1];
    if (!f) items.push({ level: FAIL, text: `${CFG.update.versionFile}: falta 'fecha: YYYY-MM-DD'` });
  }
  for (const relativo of CFG.update.criticalFiles) {
    if (!exists(path.join(ROOT, relativo))) {
      items.push({ level: FAIL, text: `${relativo}: falta - actualizacion incompleta? (ver ia/UPDATE.md)` });
    }
  }
  if (!items.length) {
    items.push({ level: PASS, text: `version ${measurements.harnessVersion}, ${CFG.update.criticalFiles.length} archivos del harness presentes` });
  }
  add({ id: 'version-harness', title: 'Version y estructura del harness (DEC-0018)', status: items.some((i) => i.level === FAIL) ? FAIL : PASS, items });
}

// 18. Nombres en ASCII y codigo sin caracteres exoticos (DEC-0021).
// Un nombre con enie o acento se rompe en sistemas de archivos que normalizan
// distinto (NFC/NFD) y vuelve el archivo imposible de localizar con las
// herramientas habituales. En la prosa (.md) el caracter es correcto y se queda.
const EXT_NO_MD = /\.md$/i;
function checkAscii() {
  const items = [];
  const codigoExt = /\.(mjs|json|yml|yaml|sh|html|cmd|ps1|bat|toml|ts|js)$/i;
  const nombres = [];
  const contenidos = [];

  for (const p of walk(ROOT)) {
    const r = rel(p);
    if (/[^\x00-\x7F]/.test(path.basename(p))) {
      nombres.push(r);
      continue;
    }
    // Codigo y configuracion: ASCII puro. Los .md (prosa) quedan fuera a proposito.
    const esConfig = EXT_NO_MD.test(p) === false && (codigoExt.test(p) || path.basename(p).startsWith('.') || path.basename(p) === 'VERSION');
    if (!esConfig) continue;
    const linea = read(p).split(/\r?\n/).findIndex((l) => /[^\x00-\x7F]/.test(l));
    if (linea >= 0) contenidos.push(`${r}:${linea + 1}`);
  }

  for (const n of nombres) items.push({ level: FAIL, text: `${n}: el NOMBRE tiene caracteres no ASCII (use ASCII, aunque el texto sea castellano)` });
  for (const c of contenidos) items.push({ level: FAIL, text: `${c}: caracter no ASCII en codigo o configuracion` });

  if (!items.length) items.push({ level: PASS, text: 'nombres en ASCII y codigo/configuracion en ASCII puro' });
  measurements.ascii = items.length;
  add({ id: 'ascii', title: 'Nombres y codigo en ASCII (DEC-0021)', status: items.some((i) => i.level === FAIL) ? FAIL : PASS, items });
}

// 19. Enlaces relativos que no resuelven (DEC-0016, DEC-0022).
// El contrato de navegacion decia que los enlaces son el camino, pero nadie
// verificaba que llegaran a algun sitio. Sin esto, un renombrado rompe 150
// enlaces en silencio.
function checkEnlacesRotos() {
  const items = [];
  let revisados = 0;
  let exentos = 0;
  // Cubre el harness Y la carpeta de mantenimiento, para que no se puede pudra
  // por dentro (ia-harness/ no viaja al proyecto, pero vive en este repositorio).
  const raices = [IA];
  const mant = path.join(ROOT, CFG.maintenanceDir);
  if (exists(mant)) raices.push(mant);
  const docs = raices.flatMap((raiz) => walk(raiz, (f) => f.endsWith('.md')));
  for (const p of docs) {
    const r = rel(p);
    if (CFG.orphanExemptPrefixes.some((pre) => r.startsWith(pre))) continue;
    // CONVENCION: los archivos cuyo nombre empieza por `_` o termina en
    // `.template.md` son plantillas que se COPIAN a otra profundidad. Sus enlaces
    // son relativos al DESTINO, asi que desde su ubicacion en la plantilla no
    // resuelven por diseno. Ver ia/UPDATE.md.
    const base = path.basename(p);
    if (base.startsWith('_') || /\.template\.md$/i.test(base) || CFG.exceptions.enlacesRotos.includes(r)) {
      exentos++;
      continue;
    }
    const dir = path.dirname(p);
    let enFence = false;
    for (const linea of read(p).split(/\r?\n/)) {
      if (/^\s*(```|~~~)/.test(linea)) { enFence = !enFence; continue; }
      if (enFence) continue;
      // Los ejemplos entre comillas invertidas NO son enlaces: el texto que
      // documenta la sintaxis no debe contarse. Ojo: no afecta a los enlaces
      // reales, porque el destino va entre parentesis, fuera del codigo.
      const sinEjemplos = linea.replace(/`[^`]*`/g, '');
      for (const link of markdownLinks(sinEjemplos)) {
        if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith('#')) continue; // externo o ancla
        const limpio = link.split('#')[0].split('?')[0].trim();
        if (!limpio || isPlaceholder(limpio)) continue; // los ejemplos de plantilla apuntan a rutas que aun no existen
        revisados++;
        if (!exists(path.resolve(dir, limpio))) {
          items.push({ level: FAIL, text: `${r}: el enlace '${link}' no resuelve` });
        }
      }
    }
  }

  measurements.enlacesRevisados = revisados;
  if (exentos) items.push({ level: SKIP, text: `${exentos} archivo(s) exento(s) por diseno (ver exceptions.enlacesRotos)` });
  if (!items.length) items.push({ level: PASS, text: `${revisados} enlaces relativos, todos resuelven` });
  add({ id: 'enlaces-rotos', title: 'Enlaces relativos que resuelven (DEC-0016)', status: items.some((i) => i.level === FAIL) ? FAIL : PASS, items });
}

// 20. El gate de commit esta activo (DEC-0002).
// La activacion NO viaja con el clon: `core.hooksPath` es configuracion local, y
// git no deja que un repositorio la imponga a quien lo clona (un hook es codigo
// que corre en tu maquina). Si no se comprueba, olvidarlo es silencioso: se puede
// commitear en rojo sin enterarse. Ya paso.
function checkGateActivo() {
  const items = [];
  const skip = (texto) => add({ id: 'gate-activo', title: 'Gate de commit activo (DEC-0002)', status: SKIP, items: [{ level: SKIP, text: texto }] });

  // En integracion continua no se commitea: alli el gate no aplica.
  if (process.env.CI && process.env.CI !== 'false') return skip('en integracion continua no se commitea: no aplica');

  const gitDir = spawnSync('git', ['rev-parse', '--git-dir'], { cwd: ROOT, encoding: 'utf8' });
  if (gitDir.status !== 0) return skip('este directorio no es un repositorio git: no hay gate que activar');

  const cfg = spawnSync('git', ['config', '--get', 'core.hooksPath'], { cwd: ROOT, encoding: 'utf8' });
  const hooksPath = (cfg.stdout || '').trim() || '.git/hooks';
  const hookFile = path.resolve(ROOT, hooksPath, 'pre-commit');

  if (!exists(hookFile)) {
    items.push({ level: FAIL, text: `no hay ${hooksPath}/pre-commit: el gate NO esta activo. Activalo con: node ia/tools/install-hooks.mjs` });
  } else {
    const txt = read(hookFile);
    if (!/check-harness/.test(txt)) {
      items.push({ level: WARN, text: `${hooksPath}/pre-commit existe pero no llama a check-harness: el gate no es el del harness` });
    } else {
      items.push({ level: PASS, text: `activo: ${hooksPath}/pre-commit llama a check-harness` });
    }
  }
  add({ id: 'gate-activo', title: 'Gate de commit activo (DEC-0002)', status: items.some((i) => i.level === FAIL) ? FAIL : (items.some((i) => i.level === WARN) ? WARN : PASS), items });
}

const measurements = {};

// ------------------------------------------------------------------ salida ----

function updateBaseline() {
  const data = {
    updatedAt: new Date().toISOString().slice(0, 10),
    note: 'Ratchet del harness: los presupuestos no pueden empeorar. Ver DEC-0008.',
    entryFileLines: measurements.entryFileLines || {},
    codeFilesTotal: measurements.codeFilesTotal ?? null,
    codeTaggedFiles: measurements.codeTaggedFiles ?? null,
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`[check-harness] linea base actualizada -> ${rel(BASELINE_PATH)}`);
}

function report() {
  const line = '-'.repeat(66);
  console.log(`\n${line}\nHARNESS v${measurements.harnessVersion ?? '?'} | reporte\n${line}`);
  const f = measurements.features ?? 0;
  console.log(`Features: ${f}   Tareas por estado: ${JSON.stringify(measurements.taskStates || {})}`);
  console.log(`Features por estado: ${JSON.stringify(measurements.featureStates || {})}`);
  console.log(`Trazabilidad codigo: ${measurements.codeTaggedFiles ?? '?'}/${measurements.codeFilesTotal ?? '?'} archivos etiquetados`);
  console.log(`Revision adversarial: ${measurements.reviews?.present ?? 0}/${measurements.reviews?.required ?? 0} exigidas`);
  console.log(`Fallos conocidos: ${measurements.knownFailures ?? 0}   Gates: ${measurements.gates?.count ?? 0} (pendientes ${measurements.gates?.pending ?? 0})`);
  console.log(`Deuda abierta: ${measurements.debtOpen ?? 0}   Documentos aislados: ${measurements.orphans ?? 0}   Binarios en /ia: ${measurements.binaries ?? 0}`);
  console.log(`Tablas markdown: ${measurements.tables ?? 0}   Tareas activas (debe ser 0 o 1): ${measurements.inProgress ?? 0}`);
  console.log(`\nPresupuestos:`);
  for (const [file, n] of Object.entries(measurements.entryFileLines || {})) {
    const allowed = Math.max(CFG.entryBudgets[file] ?? 0, BASELINE.entryFileLines?.[file] ?? 0);
    const bar = n > allowed ? 'EXCEDE' : `${n}/${allowed}`;
    console.log(`  ${bar.padStart(9)}  ${file}`);
  }
  console.log(`${line}\n`);
}

async function main() {
  const pendientes = [
    checkEntryBudgets, checkOrphans, checkDecisionIndex, checkSpecIndex,
    checkPlanSpecParity, checkStates, checkTrackingParity, checkCodeTags,
    checkKnownFailures, checkReviewGate, checkGates, checkBinaries, checkDebt,
    checkQaEngines, checkTables, checkResumePoint, checkVersion, checkAscii,
    checkEnlacesRotos, checkGateActivo,
  ];
  for (const fn of pendientes) await fn();

  if (UPDATE_BASELINE) { updateBaseline(); return; }

  if (AS_JSON) {
    console.log(JSON.stringify({ root: ROOT, checks, measurements }, null, 2));
  } else {
    const icon = { PASS: 'ok  ', FAIL: 'FAIL', WARN: 'warn', SKIP: 'skip' };
    const order = { FAIL: 0, WARN: 1, SKIP: 2, PASS: 3 };
    let fails = 0, warns = 0;
    for (const c of checks) {
      if (c.status === FAIL) fails++;
      if (c.status === WARN) warns++;
      console.log(`[${icon[c.status]}] ${c.id} - ${c.title}`);
      for (const it of c.items.sort((a, b) => order[a.level] - order[b.level])) {
        if (it.level === PASS && process.env.HARNESS_VERBOSE !== '1') continue;
        console.log(`        ${it.level === PASS ? '|' : it.level} ${it.text}`);
      }
    }
    if (WITH_REPORT) report();
    console.log(`\n${checks.length} chequeos | ${fails} FAIL | ${warns} warn`);
    if (fails) console.log('El harness no esta en verde. Corrige o justifica con --no-verify.');
  }
  process.exit(checks.some((c) => c.status === FAIL) ? 1 : 0);
}

if (!exists(IA)) {
  console.error(`[check-harness] no se encontro ${IA}. Usa --root <dir>.`);
  process.exit(2);
}

main();
