// Testa as mecânicas novas pela interface: duto com esconderijo, painel de admin, tarefa visual,
// chat livre com resposta de bot e os três mapas.
// Uso: npm start (em outro terminal) e depois: node tests/features.mjs [url] [pasta-de-screenshots]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const URL = process.argv[2] || 'http://localhost:8080/';
const OUT = process.argv[3] || '/tmp';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const ok = (label, cond) => { console.log(`${cond ? '✔' : '✖'} ${label}`); if (!cond) errors.push(label); };
const wait = (ms) => page.waitForTimeout(ms);
const start = async (settings) => {
  await page.evaluate((s) => { Object.assign(window.__senai.app.settings, s); window.__senai.app.bots = null; window.__senai.startMatch({}); }, settings);
  await page.click('.reveal button');
  await wait(300);
};
const G = (fn, arg) => page.evaluate(fn, arg);

await page.goto(URL);
await wait(500);

// ---------- Duto com esconderijo ----------
await start({ map: 'unidade', rolePref: 'impostor', players: 6, impostors: 1 });
await G(() => {
  const g = window.__senai.app.game; const me = g.local; const v = g.map.ventById.v_patio;
  me.x = v.px + 6; me.y = v.py; me.ventCooldown = 0;
  // Um bot olhando de perto: não pode enxergar quem está no duto.
  const bot = g.players.find((p) => p.isBot); bot.brain.update = () => {}; bot.x = v.px + 50; bot.y = v.py + 10;
  window.__watcher = bot.id;
});
await wait(150);
await page.keyboard.press('v');
await wait(300);
const inVent = await G(() => window.__senai.app.game.local.inVent);
ok('V entra no duto e o impostor fica escondido', inVent === 'v_patio');
ok('quem está do lado não enxerga quem está no duto', await G(() => { const g = window.__senai.app.game; return !g.canSee(g.playerById(window.__watcher), g.local); }));
ok('setas para as outras saídas aparecem', (await G(() => window.__senai.app.game && document.querySelector('canvas#game') && window.__senai.app.game.ventLinks('v_patio').length)) === 2);
await page.screenshot({ path: `${OUT}/feat-vent.png` });
await page.keyboard.press('s');
await wait(300);
const moved = await G(() => window.__senai.app.game.local.inVent);
ok(`direção escolhe outra saída do duto (${moved})`, moved && moved !== 'v_patio');
await page.keyboard.press('v');
await wait(300);
ok('V de novo sai do duto quando quiser', await G(() => !window.__senai.app.game.local.inVent));

// ---------- Painel de admin ----------
await start({ map: 'galpao', rolePref: 'aluno', players: 8 });
await G(() => { const g = window.__senai.app.game; const a = g.map.adminConsole; g.local.x = a.stand.px; g.local.y = a.stand.py; });
await wait(150);
await page.keyboard.press('e');
await wait(500);
const adminTitle = await page.$eval('.map-modal h2', (e) => e.textContent).catch(() => '');
ok('E no console abre o painel de admin', adminTitle.includes('admin'));
const counts = await G(() => window.__senai.app.game.adminCounts());
ok('admin conta pessoas por sala', counts && Object.values(counts).reduce((s, n) => s + n, 0) >= 6);
await page.screenshot({ path: `${OUT}/feat-admin.png` });
await page.keyboard.press('Escape');

// ---------- Tarefa visual testemunhada por um bot ----------
await start({ map: 'unidade', rolePref: 'aluno', players: 6, visualTasks: true });
await G(() => {
  const g = window.__senai.app.game; const me = g.local; const s = g.map.stationById.enfermaria_exame;
  me.tasks = [g.makeTask(s.id)]; me.x = s.stand.px; me.y = s.stand.py;
  const bot = g.players.find((p) => p.isBot && !p.isImpostor); bot.x = s.px + 70; bot.y = s.py + 20; bot.brain.decideCrew = () => {}; bot.brain.decideImpostor = () => {};
  window.__witness = bot.id;
});
await wait(150);
await page.keyboard.press('e');
await wait(1500);
ok('bot que vê o escaneamento passa a confiar em você', await G(() => { const g = window.__senai.app.game; return !!g.playerById(window.__witness).brain.cleared[g.local.id]; }));
await page.keyboard.press('Escape');
await G(() => { const g = window.__senai.app.game; const s = g.map.stationById.enfermaria_exame; const bot = g.playerById(window.__witness); bot.x = s.stand.px; bot.y = s.stand.py; g.startBusy(bot, 'task', 30, { stationId: s.id }); g.local.x = s.px - 60; g.local.y = s.py + 30; });
await wait(400);
await page.screenshot({ path: `${OUT}/feat-scan.png` });

// ---------- Chat livre com resposta de bot ----------
await G(() => { const g = window.__senai.app.game; g.emergencyCooldown = 0; g.local.x = g.map.emergency.stand.px; g.local.y = g.map.emergency.stand.py; for (const p of g.players) p.busy = null; });
await wait(150);
await page.keyboard.press('e');
await page.waitForSelector('#chatbox');
const botName = await G(() => window.__senai.app.game.players.find((p) => p.isBot && p.alive).name);
await page.fill('#chatbox', `${botName}, onde você estava?`);
await page.keyboard.press('Enter');
await wait(3500);
const answered = await G((n) => window.__senai.app.game.meeting.state.chat.some((c) => c.name === n && /estava|Tava/.test(c.text)), botName);
ok(`bot responde pergunta feita no chat livre (${botName})`, answered);
await page.screenshot({ path: `${OUT}/feat-chat.png` });

// ---------- Tarefa em 2 etapas: baixar dados e enviar no servidor ----------
await start({ map: 'unidade', rolePref: 'aluno', players: 6 });
await G(() => { const g = window.__senai.app.game; g.local.tasks = [g.makeTask('aula_prova')]; const s = g.map.stationById.aula_prova; g.local.x = s.stand.px; g.local.y = s.stand.py; });
await wait(150);
await page.keyboard.press('e');
await page.click('.transfer button');
await page.waitForSelector('.mg-overlay', { state: 'detached', timeout: 12000 });
const afterStep = await G(() => { const t = window.__senai.app.game.local.tasks[0]; return [t.step, t.stationId, t.done]; });
ok(`baixar dados leva à etapa de envio no servidor (${afterStep[1]})`, afterStep[0] === 1 && afterStep[1] === 'info_upload' && !afterStep[2]);
await G(() => { const g = window.__senai.app.game; const s = g.map.stationById.info_upload; g.local.x = s.stand.px; g.local.y = s.stand.py; });
await wait(150);
await page.keyboard.press('e');
await page.click('.transfer button');
await page.waitForSelector('.mg-overlay', { state: 'detached', timeout: 12000 });
ok('enviar dados conclui a tarefa inteira', await G(() => window.__senai.app.game.local.tasks[0].done));

// ---------- Mapas novos ----------
for (const map of ['galpao', 'fabrica']) {
  await start({ map, rolePref: 'aluno', players: 8 });
  await G(() => { const g = window.__senai.app.game; const r = g.map.rooms.find((x) => x.id === (g.map.id === 'galpao' ? 'armazem' : 'linha')); g.local.x = r.cx; g.local.y = r.cy - 70; });
  await wait(700);
  await page.screenshot({ path: `${OUT}/feat-map-${map}.png` });
  ok(`mapa ${map} carrega e renderiza`, await G(() => window.__senai.app.game.map.stations.length >= 20));
}

console.log(errors.length ? `\nProblemas:\n${errors.join('\n')}` : '\nMecânicas novas: tudo certo.');
await browser.close();
process.exit(errors.length ? 1 : 0);
