// Teste do modo online contra o servidor real (dois clientes WebSocket).
// Uso: npm start (em outro terminal) e depois: node tests/online.mjs [http://localhost:8080]
import WebSocket from 'ws';
import { buildMap } from '../js/core/map.js';
import { findPath } from '../js/core/pathfinding.js';

const BASE = process.argv[2] || 'http://localhost:8080';
const WS_URL = BASE.replace(/^http/, 'ws') + '/ws';
const results = [];
const ok = (label, cond, extra = '') => { results.push([label, !!cond]); console.log(`${cond ? '✔' : '✖'} ${label}${extra ? ` — ${extra}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Client {
  constructor(name, color) {
    this.name = name; this.color = color;
    this.msgs = []; this.events = []; this.snap = null; this.init = null; this.room = null;
  }
  open() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', (raw) => {
        const m = JSON.parse(raw.toString());
        this.msgs.push(m);
        if (m.type === 'snap') this.snap = m.s;
        if (m.type === 'start') this.init = m.init;
        if (m.type === 'room') this.room = m.room;
        if (m.type === 'joined') { this.code = m.code; this.token = m.token; }
        if (m.type === 'event') this.events.push(m);
      });
    });
  }
  send(type, data = {}) { this.ws.send(JSON.stringify({ type, ...data })); }
  async waitFor(pred, ms = 8000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { const m = this.msgs.find(pred); if (m) return m; await sleep(30); }
    return null;
  }
  event(name) { return this.events.find((e) => e.name === name); }
  get look() { return { color: this.color, accessory: 'capacete', skin: '#f1c27d', hair: '#2b1d14', hairStyle: 0 }; }
}

// Anda de verdade até um ponto, enviando posições plausíveis (o servidor valida velocidade e colisão).
async function walkTo(c, map, x, y) {
  const me = c.snap.pl.find((p) => p[0] === c.init.you.id);
  let cx = me[1], cy = me[2];
  const path = findPath(map, cx, cy, x, y) || [];
  for (const wp of path) {
    while (Math.hypot(wp.x - cx, wp.y - cy) > 1) {
      const d = Math.hypot(wp.x - cx, wp.y - cy);
      const step = Math.min(d, 8);
      cx += ((wp.x - cx) / d) * step; cy += ((wp.y - cy) / d) * step;
      c.send('move', { x: cx, y: cy, f: 1, m: 1 });
      await sleep(66);
    }
  }
  return { x: cx, y: cy };
}

const a = new Client('Ana', 'azul');
const b = new Client('Bia', 'vermelho');
await a.open(); await b.open();
a.send('create', { name: a.name, look: a.look });
await a.waitFor((m) => m.type === 'joined');
ok('cria sala com código de 4 letras', /^[A-Z]{4}$/.test(a.code), a.code);
b.send('join', { code: a.code, name: b.name, look: { ...b.look, color: 'azul' } });
await b.waitFor((m) => m.type === 'joined');
await sleep(200);
ok('segunda pessoa entra pelo código', a.room?.members.length === 2);
ok('cores não se repetem na sala', a.room.members[0].look.color !== a.room.members[1].look.color);

const bad = new Client('X', 'verde'); await bad.open();
bad.send('join', { code: 'ZZZZ', name: 'X', look: bad.look });
ok('código inválido gera erro claro', !!(await bad.waitFor((m) => m.type === 'error')));
bad.ws.close();

b.send('settings', { settings: { map: 'fabrica' } });
await sleep(150);
ok('só o anfitrião muda as regras', a.room.settings.map !== 'fabrica');
a.send('settings', { settings: { map: 'galpao', discussionTime: 2, votingTime: 20, impostors: 1 } });
a.send('fillBots');
await sleep(250);
ok('anfitrião completa a sala com bots', a.room.members.length + a.room.bots.length === 8, `${a.room.bots.length} bots`);
a.send('start');
await a.waitFor((m) => m.type === 'start'); await b.waitFor((m) => m.type === 'start');
await a.waitFor((m) => m.type === 'snap'); await b.waitFor((m) => m.type === 'snap');
ok('partida começa para os dois no mapa escolhido', a.init?.map === 'galpao' && b.init?.map === 'galpao');
const initJson = JSON.stringify(b.init.players);
ok('papéis dos outros não são enviados', !initJson.includes('"role"'));
ok('cada um recebe só o próprio papel', ['crew', 'impostor'].includes(a.init.you.role) && ['crew', 'impostor'].includes(b.init.you.role));
ok('snapshot não contém papéis', !JSON.stringify(a.snap).includes('impostor'));

const map = buildMap('galpao');
// Trapaça: teletransporte é recusado e o servidor corrige a posição.
a.send('move', { x: map.emergency.px, y: map.emergency.py, f: 1, m: 1 });
ok('servidor bloqueia teletransporte', !!(await a.waitFor((m) => m.type === 'correct', 2000)));
// Trapaça: concluir tarefa sem abrir o minijogo.
const someTask = a.init.you.tasks[0].stationId;
a.send('taskDone', { stationId: someTask });
await sleep(300);
ok('servidor recusa tarefa concluída sem minijogo', a.snap.me.tk.find((t) => t[0] === someTask)[1] === 0);

// Anda até o botão e convoca reunião.
await sleep(1500);
await walkTo(a, map, map.emergency.stand.px, map.emergency.stand.py);
await sleep(200);
const emergencyCdLeft = a.snap.ec;
if (emergencyCdLeft > 0) await sleep(emergencyCdLeft * 1000 + 200);
a.send('emergency');
const meetA = await a.waitFor((m) => m.type === 'event' && m.data && m.name === 'meetingStart', 6000);
const meetB = await b.waitFor((m) => m.type === 'event' && m.name === 'meetingStart', 6000);
ok('andar até o botão e convocar reunião funciona', !!meetA && !!meetB, meetA ? '' : 'sem meetingStart (alguém pode ter reportado antes)');

a.send('chat', { text: 'Bia, onde você estava? Acho suspeito.' });
const chatB = await b.waitFor((m) => m.type === 'event' && m.name === 'chat' && m.data.text.startsWith('Bia, onde'), 4000);
ok('chat livre chega para todos', !!chatB);
b.send('chat', { text: '<script>alert(1)</script>' + 'x'.repeat(300) });
const longMsg = await a.waitFor((m) => m.type === 'event' && m.name === 'chat' && m.data.text.includes('script'), 3000);
ok('mensagens longas são cortadas em 140 caracteres', longMsg && longMsg.data.text.length <= 140);

await a.waitFor((m) => m.type === 'event' && m.name === 'votingStart', 8000);
a.send('vote', { target: 'skip' }); b.send('vote', { target: 'skip' });
const vEnd = await a.waitFor((m) => m.type === 'event' && m.name === 'votingEnd', 25000);
ok('votação termina e o resultado chega', !!vEnd, vEnd ? `pularam: ${vEnd.data.skip}` : '');
const mEnd = await a.waitFor((m) => m.type === 'event' && m.name === 'meetingEnd', 15000);
ok('reunião acaba e a partida continua', !!mEnd);

// Queda e reconexão.
const token = b.token;
b.ws.close();
const left = await a.waitFor((m) => m.type === 'event' && m.name === 'playerLeft', 4000);
ok('quando alguém cai, os outros são avisados (bot assume)', !!left);
const b2 = new Client('Bia', 'vermelho'); await b2.open();
b2.send('rejoin', { code: a.code, token });
const back = await b2.waitFor((m) => m.type === 'start', 4000);
ok('reconexão devolve a mesma personagem', back && back.init.you.id === b.init.you.id);
ok('os outros veem a volta', !!(await a.waitFor((m) => m.type === 'event' && m.name === 'playerBack', 3000)));

a.ws.close(); b2.ws.close();
const failed = results.filter((r) => !r[1]).length;
console.log(failed ? `\n${failed} verificação(ões) falharam.` : '\nModo online: tudo certo.');
process.exit(failed ? 1 : 0);
