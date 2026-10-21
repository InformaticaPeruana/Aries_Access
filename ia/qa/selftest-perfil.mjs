/**
 * Prueba del perfil persistente: demuestra que un perfil conserva la sesion
 * entre lanzamientos, y que el perfil temporal NO se conserva.
 * No toca el perfil real del usuario.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launch, resolveRealProfile, isBrowserRunning, findBrowser, probe } from '../tools/browser-cdp.mjs';

let pass = 0, fail = 0;
const check = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  (' + d + ')' : ''}`); };

const perfil = path.join(os.tmpdir(), 'qa-perfil-de-prueba');
fs.rmSync(perfil, { recursive: true, force: true });
fs.mkdirSync(perfil, { recursive: true });

// --- 1. lanzar con un perfil propio y meter una cookie ---
let s = await launch({ profileDir: perfil });
check('lanzar con perfil propio', s.profileKind === 'usuario', `profileKind=${s.profileKind}`);
await s.goto('http://localhost');
await s.raw('Network.setCookie', {
  name: 'sesion_de_prueba', value: 'token-abc', domain: 'localhost', path: '/',
  expires: Math.floor(Date.now() / 1000) + 3600, // persistente: Chrome solo guarda en disco las que caducan
});
const antes = (await s.raw('Network.getCookies', { urls: ['http://localhost'] })).cookies;
check('la cookie se escribio en el perfil', antes.some((c) => c.name === 'sesion_de_prueba'));
await s.close();

// --- 2. el perfil propio NO se borra ---
check('el perfil propio sigue en disco tras cerrar', fs.existsSync(perfil));

// --- 3. relanzar: la sesion debe persistir ---
s = await launch({ profileDir: perfil });
await s.goto('http://localhost');
const despues = (await s.raw('Network.getCookies', { urls: ['http://localhost'] })).cookies;
const persistio = despues.find((c) => c.name === 'sesion_de_prueba');
check('LA SESION PERSISTE entre lanzamientos', Boolean(persistio), persistio ? 'cookie encontrada' : 'no');
await s.close();

// --- 4. un perfil temporal SI se borra ---
s = await launch();
const temporal = s.profile;
check('el perfil temporal es distinto', s.profileKind === 'temporal');
await s.close();
check('el perfil temporal se borra al cerrar', !fs.existsSync(temporal));

// --- 5. perfil real: se resuelve, y se rechaza si el navegador esta abierto ---
const real = resolveRealProfile();
check('el perfil real se resuelve', Boolean(real), real ? real.profile.replace(os.homedir(), '~') : 'no encontrado');
const corriendo = isBrowserRunning(findBrowser());
console.log(`      navegador corriendo ahora: ${corriendo}`);
if (corriendo === true) {
  try {
    await launch({ profile: 'real' });
    check('rechaza el perfil real con el navegador abierto', false, 'NO lo rechazo');
  } catch (e) {
    check('rechaza el perfil real con el navegador abierto', /esta abierto/.test(e.message), e.message.slice(0, 60) + '...');
  }
} else {
  console.log('      (se omite: el navegador no esta corriendo, no hay nada que rechazar)');
}

console.log('\n      sonda del driver:', probe().detail);
fs.rmSync(perfil, { recursive: true, force: true });
console.log(`\n${fail ? 'HAY FALLOS' : 'TODO OK'} | ${pass}/${pass + fail} comprobaciones`);
process.exit(fail ? 1 : 0);
