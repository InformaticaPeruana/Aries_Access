// F-001 T09 - smoke suite del stack Guacamole en server01.
//
// Uso:
//   node tests/smoke.mjs
//
// Variables de entorno (ninguna se versiona):
//   F001_HOST        host SSH, p.ej. humberto@192.168.18.70. Sin esto -> SKIP.
//   F001_PUBLIC_URL  URL publica, p.ej. https://remoto.informaticaperuana.com/desktop/
//                    Sin esto, esa comprobacion se salta.
//
// Contrato con run-tests.mjs: imprime PASS/FAIL/SKIP por caso y devuelve 0.
// Sin entorno NO puede devolver distinto de 0: el harness de todo el repo se
// pondria en rojo en cualquier clon sin acceso al host.

import { execFileSync } from 'node:child_process';
import https from 'node:https';

const HOST = process.env.F001_HOST || '';
const PUBLIC_URL = process.env.F001_PUBLIC_URL || '';

let failures = 0;

function pass(msg) { console.log(`PASS ${msg}`); }
function fail(msg) { failures++; console.log(`FAIL ${msg}`); }
function skip(msg) { console.log(`SKIP ${msg}`); }

// Comprueba el host por SSH: servicios, puertos en loopback y respuesta local.
const REMOTE = `
set -u
r() { printf 'RESULT %s\\n' "$1"; }
printf 'GUACD=%s\\n'  "$(systemctl is-enabled guacd 2>/dev/null)/$(systemctl is-active guacd 2>/dev/null)"
printf 'TOMCAT=%s\\n' "$(systemctl is-enabled guacamole-tomcat 2>/dev/null)/$(systemctl is-active guacamole-tomcat 2>/dev/null)"
printf 'PG=%s\\n'     "$(pg_lsclusters -h 2>/dev/null | awk '$2=="guacamole" {print $4"/"$3}')"
printf 'HTTP=%s\\n'   "$(curl -sk -o /dev/null -w '%{http_code}' https://127.0.0.1/desktop/ 2>/dev/null)"
ss -ltn 2>/dev/null | awk 'NR>1 {print "LISTEN " $4}'
`;

function checkLocal() {
  let out;
  try {
    out = execFileSync('ssh', [
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=8',
      HOST, 'bash -s',
    ], { input: REMOTE, encoding: 'utf8', timeout: 60000 });
  } catch (err) {
    const detail = (err.stderr || err.message || '').toString().trim().split('\n')[0];
    fail(`SSH a ${HOST}: ${detail}`);
    return;
  }

  const get = (k) => {
    const m = out.match(new RegExp(`^${k}=(.*)$`, 'm'));
    return m ? m[1].trim() : '';
  };
  const listens = [];
  for (const line of out.split('\n')) {
    const m = line.match(/^LISTEN (\S+)$/);
    if (m) listens.push(m[1]);
  }

  const [guacdEn, guacdAct] = [get('GUACD').split('/')[0], get('GUACD').split('/')[1]];
  guacdEn === 'enabled' && guacdAct === 'active'
    ? pass('guacd enabled + active')
    : fail(`guacd en estado ${get('GUACD')}`);

  const [tcEn, tcAct] = [get('TOMCAT').split('/')[0], get('TOMCAT').split('/')[1]];
  tcEn === 'enabled' && tcAct === 'active'
    ? pass('guacamole-tomcat enabled + active')
    : fail(`guacamole-tomcat en estado ${get('TOMCAT')}`);

  get('PG') === 'online/5434'
    ? pass('cluster PostgreSQL online en 5434')
    : fail(`cluster PostgreSQL en estado ${get('PG') || 'ausente'}`);

  const loopbackOnly = ['4822', '5434', '8081'].every((p) =>
    listens.some((a) => a.endsWith(`:${p}`)) &&
    !listens.some((a) => a === `0.0.0.0:${p}` || a === `*:${p}` || a === `[::]:${p}`)
  );
  loopbackOnly
    ? pass('4822 / 5434 / 8081 solo en loopback')
    : fail(`puertos: ${listens.join(' ') || 'ninguno'}`);

  listens.some((a) => a.endsWith(':443') || a === '*:443')
    ? pass('443 escuchando (backend de Apache)')
    : fail('el 443 no escucha');

  get('HTTP') === '200'
    ? pass('https://127.0.0.1/desktop/ responde 200')
    : fail(`https local responde ${get('HTTP') || 'sin respuesta'}`);
}

function checkPublic() {
  if (!PUBLIC_URL) {
    skip('URL publica (F001_PUBLIC_URL no definida)');
    return;
  }
  return new Promise((resolve) => {
    const req = https.get(PUBLIC_URL, { timeout: 15000 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          fail(`${PUBLIC_URL} responde ${res.statusCode}`);
        } else if (!/guacamole/i.test(body)) {
          fail(`${PUBLIC_URL} responde 200 pero no parece el login de Guacamole`);
        } else {
          pass(`${PUBLIC_URL} responde 200 con certificado valido`);
        }
        resolve();
      });
    });
    req.on('timeout', () => { req.destroy(); fail(`${PUBLIC_URL}: timeout`); resolve(); });
    req.on('error', (e) => { fail(`${PUBLIC_URL}: ${e.code || e.message}`); resolve(); });
  });
}

async function main() {
  console.log(`# F-001 smoke - host=${HOST || '(sin definir)'} publico=${PUBLIC_URL || '(sin definir)'}`);
  if (!HOST) {
    for (const c of ['guacd', 'guacamole-tomcat', 'PostgreSQL 5434', 'puertos en loopback', '443', 'https local']) {
      skip(`${c} (F001_HOST no definida)`);
    }
    await checkPublic();
  } else {
    checkLocal();
    await checkPublic();
  }

  if (failures > 0) {
    console.log(`# ${failures} comprobacion(es) fallaron`);
    process.exit(1);
  }
  console.log('# smoke ok');
}

main();
