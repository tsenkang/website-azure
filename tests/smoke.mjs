// Teste de fumaça no navegador (Playwright + Chromium).
// Uso: sirva a pasta (ex.: python3 -m http.server 8123) e rode:
//   node tests/smoke.mjs [url] [pasta-de-screenshots]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const URL = process.argv[2] || 'http://localhost:8123/index.html';
const OUT = process.argv[3] || '/tmp';
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(`console: ${m.text()}`); });

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);
const check = async (label, fn) => { const v = await page.evaluate(fn); console.log(`✔ ${label}:`, JSON.stringify(v)); return v; };

await page.goto(URL);
await wait(800);
await shot('01-menu');

// Lobby e início de partida como aluno
await page.click('[data-a="play"]');
await wait(300);
await page.click('.seg[data-k="rolePref"] [data-v="aluno"]');
await shot('02-lobby');
await page.click('[data-a="start"]');
await wait(500);
await shot('03-reveal');
await page.click('.reveal button');
await wait(400);

// Movimento
const before = await page.evaluate(() => { const p = window.__senai.app.game.local; return [p.x, p.y]; });
await page.keyboard.down('d'); await wait(700); await page.keyboard.up('d');
await page.keyboard.down('w'); await wait(500); await page.keyboard.up('w');
const after = await page.evaluate(() => { const p = window.__senai.app.game.local; return [p.x, p.y]; });
console.log('✔ movimento:', before.map(Math.round), '→', after.map(Math.round));
if (Math.hypot(after[0] - before[0], after[1] - before[1]) < 50) errors.push('jogador não se moveu');
await shot('04-game');

// Teleporta até a primeira tarefa e abre o minijogo com E
const opened = [];
const taskTypes = await page.evaluate(() => window.__senai.app.game.local.tasks.map((t) => window.__senai.app.game.map.stationById[t.stationId].task));
for (let i = 0; i < taskTypes.length; i++) {
  await page.evaluate((i) => {
    const g = window.__senai.app.game; const t = g.local.tasks[i];
    const s = g.map.stationById[t.stationId];
    g.local.x = s.stand.px; g.local.y = s.stand.py;
  }, i);
  await wait(150);
  await page.keyboard.press('e');
  await wait(300);
  const has = await page.$('.mg-overlay');
  opened.push(`${taskTypes[i]}:${has ? 'aberto' : 'NÃO'}`);
  if (i === 0) await shot('05-minigame');
  if (has) { await page.keyboard.press('Escape'); await wait(250); }
}
console.log('✔ minijogos:', opened.join(', '));
if (opened.some((o) => o.endsWith('NÃO'))) errors.push('algum minijogo não abriu');

// Mapa
await page.keyboard.press('m'); await wait(300); await shot('06-map'); await page.keyboard.press('m'); await wait(200);

// Sabotagem (forçada por um impostor bot) e apagão
await page.evaluate(() => { const g = window.__senai.app.game; const imp = g.players.find((p) => p.isImpostor); g.sabotage.cooldown = 0; g.sabotage.trigger('lights', imp); });
await wait(600); await shot('07-lights');
await page.evaluate(() => { const g = window.__senai.app.game; g.sabotage.resolve(null); const imp = g.players.find((p) => p.isImpostor); g.sabotage.cooldown = 0; g.sabotage.trigger('critical', imp); });
await wait(600); await shot('08-critical');
await page.evaluate(() => window.__senai.app.game.sabotage.resolve(null));

// Reunião de emergência pelo jogador
await page.evaluate(() => { const g = window.__senai.app.game; g.emergencyCooldown = 0; g.local.x = g.map.emergency.stand.px; g.local.y = g.map.emergency.stand.py; });
await wait(200);
await page.keyboard.press('e');
await wait(4000);
await shot('09-meeting');
await check('fase', () => window.__senai.app.game.phase + '/' + window.__senai.app.game.meeting.state?.phase);
// Fala rápida + voto em pular quando abrir a votação
await page.click('[data-say="where"]').catch(() => {});
await page.waitForFunction(() => window.__senai.app.game.meeting.state?.phase === 'voting', null, { timeout: 30000 });
await page.click('.skip-vote');
await page.click('.confirm .yes');
await wait(300);
await shot('10-voted');
await page.waitForFunction(() => window.__senai.app.game.phase !== 'meeting', null, { timeout: 60000 });
await check('após reunião', () => ({ phase: window.__senai.app.game.phase, alive: window.__senai.app.game.players.filter((p) => p.alive).length }));

// Acelera a partida até o fim deixando os bots jogarem (o humano fica parado).
await page.evaluate(() => { const g = window.__senai.app.game; for (const t of g.local.tasks) t.done = true; });
const ended = await page.evaluate(async () => {
  const g = window.__senai.app.game;
  for (let i = 0; i < 30 * 60 * 15 && g.phase !== 'ended'; i++) {
    g.paused = false; // a animação de eliminação pausa o jogo; aqui o tempo é simulado
    if (g.phase === 'meeting' && g.meeting.state.phase === 'voting' && g.local.alive && !(g.local.id in g.meeting.state.votes)) g.meeting.castVote(g.local, 'skip');
    g.update(1 / 30);
  }
  return g.result;
});
console.log('✔ fim:', JSON.stringify(ended));
await wait(1800);
await shot('11-end');
if (!(await page.$('.end-screen'))) errors.push('tela final não apareceu');

// Tutorial
await page.click('[data-a="menu"]');
await wait(300);
await page.click('[data-a="tutorial"]');
await wait(300);
await page.click('.reveal button');
await wait(300);
await shot('12-tutorial');

// Partida como impostor
await page.evaluate(() => { window.__senai.app.settings.rolePref = 'impostor'; window.__senai.startMatch(false); });
await wait(300);
await page.click('.reveal button');
await wait(500);
await check('impostor', () => window.__senai.app.game.local.isImpostor);
await page.keyboard.press('f'); await wait(300); await shot('13-sabotage-panel'); await page.keyboard.press('Escape');
// Elimina um aluno ao lado
await page.evaluate(() => {
  const g = window.__senai.app.game; const me = g.local; me.killCooldown = 0;
  const v = g.players.find((p) => !p.isImpostor && p.alive); v.x = me.x + 20; v.y = me.y;
  return true;
});
await wait(100);
await page.keyboard.press('q'); await wait(400);
await check('kill', () => window.__senai.app.game.bodies.length);
await shot('14-kill');

// Mobile
await page.setViewportSize({ width: 390, height: 844 });
await wait(400);
await shot('15-mobile');

console.log(errors.length ? `\n✖ ERROS:\n${errors.join('\n')}` : '\nSem erros de console.');
await browser.close();
process.exit(errors.length ? 1 : 0);
