// Duas janelas de navegador jogando online pela interface (criar sala, entrar, iniciar, ver o outro andar).
// Uso: npm start (em outro terminal) e depois: node tests/online-browser.mjs [url] [pasta-de-screenshots]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const URL = process.argv[2] || 'http://localhost:8080/';
const OUT = process.argv[3] || '/tmp';
const browser = await chromium.launch();
const errors = [];
const page = async (name) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(`${name} console: ${m.text()}`); });
  await p.goto(URL);
  await p.waitForTimeout(600);
  return p;
};
const ok = (label, cond) => { console.log(`${cond ? '✔' : '✖'} ${label}`); if (!cond) errors.push(label); };

const A = await page('A');
const B = await page('B');
await A.click('[data-a="online"]');
await A.fill('#oname', 'Ana');
await A.click('[data-a="create"]');
await A.waitForSelector('.room-code b');
await A.waitForFunction(() => document.querySelector('.room-code b').textContent.length === 4);
const code = await A.textContent('.room-code b');
ok(`sala criada pela interface (${code})`, /^[A-Z]{4}$/.test(code));

await B.click('[data-a="online"]');
await B.fill('#oname', 'Bia');
await B.fill('#ocode', code);
await B.click('[data-a="join"]');
await B.waitForSelector('.room-code b');
await A.waitForFunction(() => document.querySelectorAll('.slots li').length === 2);
ok('as duas pessoas aparecem no lobby', true);
ok('quem entrou não vê o botão de começar', await B.$eval('[data-a="start"]', (e) => e.style.display === 'none'));
await A.click('.map-opt[data-map="fabrica"]');
await B.waitForFunction(() => document.querySelector('.map-opt.on')?.dataset.map === 'fabrica');
ok('mudança de mapa do anfitrião chega para todos', true);
await A.click('[data-a="fillBots"]');
await A.waitForTimeout(300);
await A.screenshot({ path: `${OUT}/online-lobby.png` });
await A.click('[data-a="start"]');
await A.waitForSelector('.reveal button'); await B.waitForSelector('.reveal button');
await A.click('.reveal button'); await B.click('.reveal button');
await A.waitForTimeout(800);
const ids = await Promise.all([A, B].map((p) => p.evaluate(() => ({ id: window.__senai.app.game.local.id, mode: window.__senai.app.game.mode, map: window.__senai.app.game.map.id }))));
ok('as duas janelas entram na mesma partida online', ids[0].mode === 'mirror' && ids[1].mode === 'mirror' && ids[0].map === 'fabrica' && ids[0].id !== ids[1].id);

// A anda; B recebe a nova posição pelo servidor.
const before = await B.evaluate((id) => { const p = window.__senai.app.game.playerById(id); return [p.netX, p.netY]; }, ids[0].id);
await A.keyboard.down('d'); await A.waitForTimeout(900); await A.keyboard.up('d');
await A.waitForTimeout(400);
const after = await B.evaluate((id) => { const p = window.__senai.app.game.playerById(id); return [p.netX, p.netY]; }, ids[0].id);
ok(`movimento de uma janela aparece na outra (${Math.round(after[0] - before[0])}px)`, after[0] - before[0] > 60);
await A.screenshot({ path: `${OUT}/online-game-A.png` });
await B.screenshot({ path: `${OUT}/online-game-B.png` });

console.log(errors.length ? `\nProblemas:\n${errors.join('\n')}` : '\nOnline pela interface: tudo certo.');
await browser.close();
process.exit(errors.length ? 1 : 0);
