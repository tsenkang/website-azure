// Resolve cada minijogo pela interface (cliques, arrastes e teclas reais) e confere o registro na partida.
// Uso: node tests/minigames.mjs [url]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const URL = process.argv[2] || 'http://localhost:8080/index.html';
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
  // Uma tarefa de etapa única por tipo; a amostra também é testada na segunda fase.
  g.local.tasks = Object.values(byType).map((id) => ({ stationId: id, stations: [id], step: 0, done: false, readyAt: 0 }));
  const sampleId = byType.sample;
  g.local.tasks.push({ stationId: sampleId, stations: [sampleId, sampleId], step: 1, done: false, readyAt: 0, phase2: true });
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

async function canvasClick(sel, x, y) {
  const box = await (await page.$(sel)).boundingBox();
  const size = await page.$eval(sel, (c) => [c.width, c.height]);
  return { x: box.x + (x / size[0]) * box.width, y: box.y + (y / size[1]) * box.height };
}

const solvers = {
  async card() {
    for (let attempt = 0; attempt < 3 && await page.$('.badge'); attempt++) {
      const b = await (await page.$('.badge')).boundingBox();
      const slot = await (await page.$('.slot')).boundingBox();
      await page.mouse.move(b.x + 20, b.y + 50);
      await page.mouse.down();
      for (let i = 1; i <= 16; i++) { await page.mouse.move(b.x + 20 + ((slot.width - 140) * i) / 16, b.y + 50); await wait(45); }
      await page.mouse.up();
      await wait(400);
    }
  },
  async upload() { await page.click('.transfer button'); await wait(7600); },
  async trash() { const k = await (await page.$('.knob')).boundingBox(); await page.mouse.move(k.x + 20, k.y + 20); await page.mouse.down(); await wait(2500); await page.mouse.up(); },
  async debris() {
    for (let i = 0; i < 80 && await page.$('.turret canvas'); i++) {
      const t = await page.$eval('.turret canvas', (c) => { const r = c._targets.find((x) => !x.boom && x.x > 20 && x.x < 340); return r ? [r.x + r.vx * 0.05, r.y + r.vy * 0.05] : null; });
      if (t) { const p = await canvasClick('.turret canvas', t[0], t[1]); await page.mouse.click(p.x, p.y); }
      await wait(120);
    }
  },
  async shields() { for (const h of await page.$$('.hex.red')) await h.click(); },
  async fuel() { const b = await (await page.$('.hold-fuel')).boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await wait(3600); await page.mouse.up(); },
  async divert() { const h = await (await page.$('.sl.target .handle')).boundingBox(); await page.mouse.move(h.x + 10, h.y + 10); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(h.x + 10, h.y + 10 - i * 16); await wait(20); } await page.mouse.up(); },
  async accept() { await page.click('.accept button'); },
  async simon() {
    const seq = await page.$eval('.pads', (p) => p._seq);
    for (let round = 1; round <= 5; round++) {
      await page.waitForFunction((r) => document.querySelector('.mg-status')?.textContent.includes(`repita ${r} luz`), round, { timeout: 8000 });
      for (let k = 0; k < round; k++) { await page.click(`.pad >> nth=${seq[k]}`); await wait(120); }
      await wait(200);
    }
  },
  async manifold() { for (let n = 1; n <= 10; n++) await page.click(`.valve:text-is("${n}")`); },
  async sample() {
    if (await page.$('.tube.bad')) await page.click('.tube.bad');
    else { await page.click('.sample button'); await wait(1200); }
  },
  async filter() {
    for (let i = 0; i < 10 && await page.$('.filterbox canvas'); i++) {
      const d = await page.$eval('.filterbox canvas', (c) => { const x = c._targets.find((t) => !t.gone); return x ? [x.x, x.y] : null; });
      if (!d) break;
      const a = await canvasClick('.filterbox canvas', d[0], d[1]);
      const b = await canvasClick('.filterbox canvas', 20, 120);
      await page.mouse.move(a.x, a.y); await page.mouse.down();
      for (let k = 1; k <= 8; k++) { await page.mouse.move(a.x + ((b.x - a.x) * k) / 8, a.y + ((b.y - a.y) * k) / 8); await wait(15); }
      await page.mouse.up(); await wait(100);
    }
  },
  async steering() {
    const p0 = await page.$eval('.steer canvas', (c) => [c._targets[0].x, c._targets[0].y]);
    const a = await canvasClick('.steer canvas', p0[0], p0[1]);
    const b = await canvasClick('.steer canvas', 150, 150);
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    for (let k = 1; k <= 10; k++) { await page.mouse.move(a.x + ((b.x - a.x) * k) / 10, a.y + ((b.y - a.y) * k) / 10); await wait(15); }
    await page.mouse.up(); await wait(700);
  },
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
  async scan() { await wait(8800); },
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
const tasks = await page.evaluate(() => window.__senai.app.game.local.tasks.map((t, i) => [t.stationId, window.__senai.app.game.map.stationById[t.stationId].task + (t.phase2 ? '(fase 2)' : ''), i]));
for (const [id, type, idx] of tasks) {
  // As tarefas são abertas uma de cada vez: as outras ficam marcadas como concluídas enquanto isso.
  await page.evaluate((idx) => { const ts = window.__senai.app.game.local.tasks; ts.forEach((t, i) => { t._was = t._was ?? t.done; t.done = i !== idx ? true : t.done; }); }, idx);
  await openStation(id);
  try { await solvers[type.replace('(fase 2)', '')](); } catch (e) { errors.push(`${type}: ${e.message}`); }
  await page.waitForSelector('.mg-overlay', { state: 'detached', timeout: 15000 }).catch(() => {});
  const done = await page.evaluate((idx) => { const ts = window.__senai.app.game.local.tasks; const t = ts[idx]; const ok = t.done || t.step > 0 && !t.phase2; ts.forEach((x, i) => { if (i !== idx) x.done = x._was; }); return ok; }, idx);
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
