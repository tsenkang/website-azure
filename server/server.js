// Servidor do SENAI: SUSPEITOS — serve os arquivos do jogo e as partidas online por WebSocket.
// Uso: npm install && npm start   (porta em PORT, padrão 8080)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { RoomManager } from './rooms.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8080;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};
// Só estes caminhos são públicos; código do servidor, testes e dependências ficam de fora.
const PUBLIC = [/^\/index\.html$/, /^\/css\/[\w./-]+\.css$/, /^\/js\/[\w./-]+\.js$/, /^\/favicon\.svg$/];

const rooms = new RoomManager();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let p = decodeURIComponent(url.pathname);
  if (p === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); return; }
  if (p === '/' || p === '') p = '/index.html';
  if (p.includes('..') || !PUBLIC.some((re) => re.test(p))) { res.writeHead(404); res.end('Não encontrado'); return; }
  try {
    const file = await readFile(path.join(ROOT, p));
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': p.endsWith('.html') ? 'no-cache' : 'public, max-age=300' });
    res.end(file);
  } catch {
    res.writeHead(404); res.end('Não encontrado');
  }
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });

wss.on('connection', (ws) => {
  let room = null;
  let member = null;
  let budget = 60; // limite simples de mensagens por segundo
  const refill = setInterval(() => { budget = 60; }, 1000);
  const send = (type, data = {}) => { if (ws.readyState === 1) ws.send(JSON.stringify({ type, ...data })); };
  send('hello', { version: 1 });

  ws.on('message', (raw) => {
    if (--budget < 0) return;
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'create' && !member) {
      room = rooms.create();
      const r = room.join(ws, msg.name, msg.look);
      member = r.member;
      send('joined', { code: room.code, token: member.token, id: member.id });
      return;
    }
    if (msg.type === 'join' && !member) {
      const target = rooms.get(msg.code);
      if (!target) { send('error', { message: 'Sala não encontrada. Confira o código.' }); return; }
      const r = target.join(ws, msg.name, msg.look);
      if (r.error) { send('error', { message: r.error }); return; }
      room = target; member = r.member;
      send('joined', { code: room.code, token: member.token, id: member.id });
      return;
    }
    if (msg.type === 'rejoin' && !member) {
      const target = rooms.get(msg.code);
      const m = target && target.rejoin(ws, String(msg.token || ''));
      if (!m) { send('error', { message: 'Não foi possível voltar para a sala.', fatal: true }); return; }
      room = target; member = m;
      send('joined', { code: room.code, token: member.token, id: member.id, rejoined: true });
      return;
    }
    if (!room || !member) return;
    if (msg.type === 'leave') { room.leave(member, true); member = null; room = null; return; }
    if (msg.type === 'backToLobby') { room.backToLobby(member); return; }
    if (room.state === 'lobby') room.handleLobby(member, msg);
    else if (room.state === 'game') room.handleGame(member, msg);
  });

  ws.on('close', () => {
    clearInterval(refill);
    if (room && member) room.leave(member, false);
  });
});

// Limpa salas vazias depois de alguns minutos.
setInterval(() => {
  for (const room of rooms.rooms.values()) {
    if (room.emptySince && Date.now() - room.emptySince > 3 * 60 * 1000) rooms.remove(room);
  }
}, 30 * 1000);

server.listen(PORT, () => console.log(`SENAI: SUSPEITOS rodando em http://localhost:${PORT}`));
