// Resolve cada minijogo pela interface (cliques, arrastes e teclas reais) e confere o registro na partida.
// Uso: node tests/minigames.mjs [url]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const URL = process.argv[2] || 'http://localhost:8123/index.html';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms) => page.waitForTimeout(ms);

await page.goto(URL);
await wait(500);
// Partida em que o humano é aluno, com uma estação de cada tipo de minijogo.
await page.evaluate(() => {
  const s = window.__senai.app.settings;
  s.rolePref = 'aluno'; s.players = 4; s.impostors = 1;
  window.__senai.startMatch(false);
});
await page.click('.reveal button');
await page.evaluate(() => {
  const g = window.__senai.app.game;
  const byType = {};
  for (const st of g.map.stations) byType[st.task] ||= st.id;
  g.local.tasks = Object.values(byType).map((id) => ({ stationId: id, done: false }));
  // Congela os bots para o teste ser determinístico.
  for (const p of g.players) if (p.isBot) { p.brain.update = () => {}; }
  g.sabotage.cooldown = 999; g.events.next = 9999;
});

async function openStation(id) {
  await page.evaluate((id) => { const g = window.__senai.app.game; const s = g.map.stationById[id]; g.local.x = s.stand.px; g.local.y = s.stand.py; }, id);
  await wait(80);
  await page.keyboard.press('e');
  await page.waitForSelector('.mg-overlay .mg-body');
}

const solvers = {
  async wires() {
    const left = await page.$$('.wires-col.left .wire-term');
    for (const l of left) {
      const i = await l.getAttribute('data-i');
      const r = await page.$(`.wires-col.right .wire-term[data-i="${i}"] .plug`);
      const a = await (await l.$('.plug')).boundingBox(), b = await r.boundingBox();
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
      await page.mouse.up();
    }
  },
  async circuit() {
    const moves = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('.circ-cell')];
      const N = 4;
      const grid = cells.map((c) => {
        const pipe = c.querySelector('.pipe');
        return { kind: pipe.classList.contains('straight') ? 'straight' : 'corner', rot: Math.round(parseFloat(pipe.style.transform.match(/-?\d+/)[0]) / 90) % 4 };
      });
      const startRow = Number(document.querySelector('.circ-end.bat').style.gridRow) - 1;
      const endRow = Number(document.querySelector('.circ-end.led').style.gridRow) - 1;
      const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
      const conns = (kind, rot) => (kind === 'straight' ? [1, 3] : [0, 1]).map((d) => (d + rot) % 4);
      const chosen = {};
      const dfs = (x, y, from, used) => {
        if (x < 0 || y < 0 || x >= N || y >= N || used.has(`${x},${y}`)) return false;
        const cell = grid[y * N + x];
        for (let rot = 0; rot < 4; rot++) {
          const cs = conns(cell.kind, rot);
          if (!cs.includes(from)) continue;
          const out = cs.find((d) => d !== from);
          chosen[y * N + x] = rot;
          if (x === N - 1 && y === endRow && out === 1) return true;
          used.add(`${x},${y}`);
          if (dfs(x + DX[out], y + DY[out], (out + 2) % 4, used)) return true;
          used.delete(`${x},${y}`);
          delete chosen[y * N + x];
        }
        return false;
      };
      if (!dfs(0, startRow, 3, new Set())) return null;
      return Object.entries(chosen).map(([k, rot]) => [Number(k), (rot - grid[k].rot + 4) % 4]);
    });
    if (!moves) throw new Error('circuito sem solução');
    for (const [k, clicks] of moves) for (let i = 0; i < clicks; i++) await page.click(`.circ-cell >> nth=${k}`);
  },
  async tools() {
    for (const t of await page.$$('.bench .tool')) {
      const name = await t.getAttribute('data-name');
      await t.click();
      await page.click(`.peg-slot[data-name="${name}"]`);
    }
  },
  async robot() {
    const ranges = await page.$$('.robot input');
    for (const [idx, low] of [[0, 0], [1, -150]]) {
      await ranges[idx].evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input')); }, low);
      await wait(80);
      const diff = await page.evaluate((idx) => Number(document.querySelector('.mg-status').textContent.match(/eixo 1 (\d+)°, eixo 2 (\d+)°/)[idx + 1]), idx);
      await ranges[idx].evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input')); }, low + diff);
    }
    await wait(1400);
  },
  async gauge() {
    for (let i = 0; i < 120 && await page.$('.gauge'); i++) {
      await page.keyboard.press('Space');
      await wait(560);
    }
  },
  async quiz() { await clickUntilDone('.opts button:not([disabled])', 900); },
  async diag() { await clickUntilDone('.opts button:not([disabled])', 600); },
  async logic() {
    for (let r = 0; r < 3; r++) {
      for (let code = 0; code < 8; code++) {
        if (await page.$('.lamp.on') || !(await page.$('.logic'))) break;
        // Código Gray: troca uma chave por vez até passar por todas as combinações.
        await page.click(`.switches .toggle >> nth=${[0, 1, 0, 2, 0, 1, 0, 2][code]}`);
      }
      await wait(800);
    }
  },
  async sequence() {
    const order = await page.evaluate(() => {
      const items = [...document.querySelectorAll('.seq-item')].map((b, i) => ({ i, sub: b.querySelector('small').textContent }));
      const prompt = document.querySelector('.seq-prompt').textContent;
      if (prompt.startsWith('Pedido')) {
        const names = prompt.split(':')[1].split('→').map((s) => s.trim().split(' ').slice(1).join(' '));
        return names.map((n) => items.find((it) => it.sub === n).i);
      }
      if (prompt.includes('CDD')) return [...items].sort((a, b) => parseFloat(a.sub) - parseFloat(b.sub)).map((it) => it.i);
      return [...items].sort((a, b) => parseInt(a.sub, 10) - parseInt(b.sub, 10)).map((it) => it.i);
    });
    for (const i of order) await page.click(`.seq-item >> nth=${i}`);
  },
  async keypad() {
    const code = await page.textContent('.id-card code');
    for (const d of code) await page.keyboard.press(d);
    await page.keyboard.press('Enter');
  },
  async sort() {
    for (let k = 0; k < 40 && await page.$('.sorter'); k++) {
      const item = await page.$('.sort-item');
      if (!item) break;
      const before = await item.textContent();
      for (const b of await page.$$('.bin')) {
        await b.click().catch(() => {});
        const now = await page.$('.sort-item');
        if (!now || (await now.textContent()) !== before) break;
      }
    }
  },
  async wait() { await page.click('.waiter button'); await wait(9800); },
  async switches() { for (const b of await page.$$('.breaker:not(.on)')) await b.click(); },
  async hold() { const b = await (await page.$('.hold-btn')).boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await wait(2900); await page.mouse.up(); },
};

async function clickUntilDone(sel, delay) {
  for (let i = 0; i < 40 && await page.$('.mg-overlay'); i++) {
    const btn = await page.$(sel);
    if (btn) await btn.click().catch(() => {});
    await wait(delay);
  }
}

const results = [];
const tasks = await page.evaluate(() => window.__senai.app.game.local.tasks.map((t) => [t.stationId, window.__senai.app.game.map.stationById[t.stationId].task]));
for (const [id, type] of tasks) {
  await openStation(id);
  try { await solvers[type](); } catch (e) { errors.push(`${type}: ${e.message}`); }
  await page.waitForSelector('.mg-overlay', { state: 'detached', timeout: 15000 }).catch(() => {});
  const done = await page.evaluate((id) => window.__senai.app.game.local.tasks.find((t) => t.stationId === id).done, id);
  results.push(`${type}:${done ? 'OK' : 'FALHOU'}`);
  if (await page.$('.mg-overlay')) await page.keyboard.press('Escape');
}
console.log('Tarefas:', results.join('  '));

// Sabotagens resolvidas pelo jogador
const fixes = [];
for (const [type, ids] of [['lights', ['lights']], ['gps', ['gps']], ['machines', ['machines']], ['critical', ['critA', 'critB']]]) {
  await page.evaluate((type) => { const g = window.__senai.app.game; const imp = g.players.find((p) => p.isImpostor); g.sabotage.cooldown = 0; g.sabotage.trigger(type, imp); }, type);
  for (const id of ids) {
    await page.evaluate((id) => { const g = window.__senai.app.game; const f = g.map.fixById[id]; g.local.x = f.stand.px; g.local.y = f.stand.py; }, id);
    await wait(80);
    await page.keyboard.press('e');
    await page.waitForSelector('.mg-overlay .mg-body');
    const kind = await page.evaluate(() => ['.breakers', '.keypad', '.wires', '.holder'].find((s) => document.querySelector(s)));
    const solver = { '.breakers': 'switches', '.keypad': 'keypad', '.wires': 'wires', '.holder': 'hold' }[kind];
    await solvers[solver]();
    await page.waitForSelector('.mg-overlay', { state: 'detached', timeout: 15000 }).catch(() => {});
  }
  const active = await page.evaluate(() => window.__senai.app.game.sabotage.active);
  fixes.push(`${type}:${active ? 'ATIVA' : 'resolvida'}`);
}
console.log('Sabotagens:', fixes.join('  '));

const bad = results.filter((r) => r.endsWith('FALHOU')).length + fixes.filter((f) => f.endsWith('ATIVA')).length;
console.log(errors.length ? `Erros: ${errors.join(' | ')}` : 'Sem erros de página.');
await browser.close();
process.exit(bad || errors.length ? 1 : 0);
