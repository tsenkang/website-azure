// Salas online: lobby, partida autoritativa no servidor, validação de ações e reconexão.
import crypto from 'node:crypto';
import { Game } from '../js/core/game.js';
import { BotBrain } from '../js/core/ai.js';
import { DEFAULT_SETTINGS, PLAYER_COLORS, ACCESSORIES, BOT_NAMES } from '../js/config.js';
import { MAPS } from '../js/core/maps/index.js';
import { randomLook } from '../js/core/player.js';
import { buildSnapshot, buildInit, meetingPayload, resultPayload, revealPayload } from '../js/net/protocol.js';

const TICK = 1 / 20;
const SNAP_EVERY = 3; // ~15 snapshots por segundo
const MAX_PLAYERS = 10;
const MIN_TASK_TIME = 1.5; // segundos mínimos com o minijogo aberto antes de aceitar a conclusão

const code4 = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[crypto.randomInt(24)]).join('');
const cleanName = (s) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14) || 'Aluno';

function cleanLook(look) {
  const l = look && typeof look === 'object' ? look : {};
  const fallback = randomLook(PLAYER_COLORS[0].id);
  return {
    color: PLAYER_COLORS.some((c) => c.id === l.color) ? l.color : fallback.color,
    accessory: ACCESSORIES.some((a) => a.id === l.accessory) ? l.accessory : fallback.accessory,
    skin: /^#[0-9a-f]{6}$/i.test(l.skin) ? l.skin : fallback.skin,
    hair: /^#[0-9a-f]{6}$/i.test(l.hair) ? l.hair : fallback.hair,
    hairStyle: [0, 1, 2].includes(l.hairStyle) ? l.hairStyle : 0,
  };
}

function cleanSettings(s, current) {
  const out = { ...current };
  const num = (v, lo, hi, d) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.round(Number(v)))) : d);
  if (s.impostors != null) out.impostors = num(s.impostors, 1, 3, out.impostors);
  if (s.tasksPerPlayer != null) out.tasksPerPlayer = num(s.tasksPerPlayer, 3, 7, out.tasksPerPlayer);
  if (s.votingTime != null) out.votingTime = num(s.votingTime, 20, 120, out.votingTime);
  if (s.discussionTime != null) out.discussionTime = num(s.discussionTime, 0, 60, out.discussionTime);
  if (['facil', 'normal', 'dificil'].includes(s.difficulty)) out.difficulty = s.difficulty;
  if (typeof s.revealRoles === 'boolean') out.revealRoles = s.revealRoles;
  if (typeof s.visualTasks === 'boolean') out.visualTasks = s.visualTasks;
  if (MAPS[s.map]) out.map = s.map;
  return out;
}

export class RoomManager {
  constructor() { this.rooms = new Map(); }

  create() {
    let code;
    do code = code4(); while (this.rooms.has(code));
    const room = new Room(code, this);
    this.rooms.set(code, room);
    return room;
  }

  get(code) { return this.rooms.get(String(code || '').toUpperCase()); }
  remove(room) { room.stop(); this.rooms.delete(room.code); }
}

class Room {
  constructor(code, manager) {
    this.code = code;
    this.manager = manager;
    this.members = []; // { id, token, name, look, ws, connected, playerId }
    this.hostId = null;
    this.settings = { ...DEFAULT_SETTINGS, rolePref: 'aleatorio' };
    this.bots = [];
    this.state = 'lobby';
    this.game = null;
    this.timer = null;
    this.tickCount = 0;
    this.emptySince = null;
  }

  // ---------- membros ----------
  join(ws, name, look) {
    if (this.state !== 'lobby') return { error: 'A partida desta sala já começou. Espere terminar ou crie outra sala.' };
    if (this.members.length + this.bots.length >= MAX_PLAYERS) return { error: 'Sala cheia (máximo de 10 participantes).' };
    const member = { id: crypto.randomUUID(), token: crypto.randomUUID(), name: cleanName(name), look: cleanLook(look), ws, connected: true, playerId: null };
    // Cores não se repetem dentro da sala.
    const used = new Set([...this.members.map((m) => m.look.color), ...this.bots.map((b) => b.look.color)]);
    if (used.has(member.look.color)) member.look.color = PLAYER_COLORS.find((c) => !used.has(c.id))?.id || member.look.color;
    this.members.push(member);
    if (!this.hostId) this.hostId = member.id;
    this.emptySince = null;
    this.broadcastRoom();
    return { member };
  }

  rejoin(ws, token) {
    const m = this.members.find((x) => x.token === token);
    if (!m) return null;
    if (m.ws && m.ws !== ws) { try { m.ws.close(4000, 'Conectado em outra aba'); } catch { /* já fechado */ } }
    m.ws = ws; m.connected = true;
    this.emptySince = null;
    if (this.game && m.playerId != null) {
      const p = this.game.playerById(m.playerId);
      if (p && p.disconnected) {
        p.isBot = false; p.brain = null; p.disconnected = false; p.busy = null;
        this.broadcastEvent('playerBack', { id: p.id });
      }
      this.sendStart(m);
    } else this.broadcastRoom();
    return m;
  }

  leave(member, explicit = false) {
    member.connected = false;
    member.ws = null;
    if (this.game && this.state === 'game' && member.playerId != null) {
      // No meio da partida, um bot assume o lugar até a pessoa reconectar.
      const p = this.game.playerById(member.playerId);
      if (p && !p.disconnected) {
        p.disconnected = true; p.isBot = true; p.busy = null; p.brain = new BotBrain(this.game, p);
        this.broadcastEvent('playerLeft', { id: p.id });
      }
      if (explicit) member.left = true;
    } else {
      this.members = this.members.filter((m) => m !== member);
    }
    if (this.hostId === member.id) this.hostId = this.members.find((m) => m.connected)?.id || null;
    if (!this.members.some((m) => m.connected)) this.emptySince = Date.now();
    this.broadcastRoom();
  }

  isHost(member) { return member.id === this.hostId; }

  roomState() {
    return {
      code: this.code,
      hostId: this.hostId,
      state: this.state,
      settings: this.settings,
      members: this.members.filter((m) => !m.left).map((m) => ({ id: m.id, name: m.name, look: m.look, connected: m.connected })),
      bots: this.bots,
      maps: Object.values(MAPS).map((m) => ({ id: m.id, name: m.name })),
    };
  }

  send(member, type, data) {
    if (!member.ws || member.ws.readyState !== 1) return;
    try { member.ws.send(JSON.stringify({ type, ...data })); } catch { /* conexão caiu */ }
  }

  broadcastRoom() { for (const m of this.members) this.send(m, 'room', { room: this.roomState(), you: m.id }); }

  broadcastEvent(name, data, filter = null) {
    for (const m of this.members) {
      if (!m.connected) continue;
      const p = m.playerId != null && this.game ? this.game.playerById(m.playerId) : null;
      const payload = typeof data === 'function' ? data(p) : data;
      if (payload == null || (filter && !filter(p))) continue;
      this.send(m, 'event', { name, data: payload });
    }
  }

  // ---------- lobby ----------
  handleLobby(member, msg) {
    if (msg.type === 'profile') {
      member.name = cleanName(msg.name);
      const look = cleanLook(msg.look);
      const used = new Set([...this.members.filter((m) => m !== member).map((m) => m.look.color), ...this.bots.map((b) => b.look.color)]);
      if (used.has(look.color)) look.color = member.look.color;
      member.look = look;
      this.broadcastRoom();
      return;
    }
    if (!this.isHost(member)) return;
    if (msg.type === 'settings') { this.settings = cleanSettings(msg.settings || {}, this.settings); this.broadcastRoom(); }
    else if (msg.type === 'addBot') this.addBot();
    else if (msg.type === 'removeBot') { this.bots.pop(); this.broadcastRoom(); }
    else if (msg.type === 'fillBots') { while (this.members.length + this.bots.length < 8 && this.addBot(false)); this.broadcastRoom(); }
    else if (msg.type === 'start') this.startGame();
  }

  addBot(broadcast = true) {
    if (this.members.length + this.bots.length >= MAX_PLAYERS) return false;
    const used = new Set([...this.members.map((m) => m.look.color), ...this.bots.map((b) => b.look.color)]);
    const color = PLAYER_COLORS.find((c) => !used.has(c.id));
    if (!color) return false;
    const names = BOT_NAMES.filter((n) => !this.bots.some((b) => b.name === n) && !this.members.some((m) => m.name === n));
    this.bots.push({ name: names[crypto.randomInt(names.length)], look: randomLook(color.id) });
    if (broadcast) this.broadcastRoom();
    return true;
  }

  // ---------- partida ----------
  startGame() {
    const humans = this.members.filter((m) => m.connected && !m.left);
    if (!humans.length) return;
    while (humans.length + this.bots.length < 4) this.addBot(false);
    const total = humans.length + this.bots.length;
    this.game = new Game({
      settings: { ...this.settings, players: total, rolePref: 'aleatorio' },
      humans: humans.map((m) => ({ name: m.name, look: m.look, clientId: m.id })),
      bots: this.bots,
      mode: 'server',
    });
    this.members = humans;
    humans.forEach((m, i) => { m.playerId = this.game.players[i].id; m.lastMove = Date.now(); });
    this.state = 'game';
    this.hookEvents();
    for (const m of humans) this.sendStart(m);
    this.broadcastRoom();
    this.tickCount = 0;
    this.timer = setInterval(() => this.tick(), TICK * 1000);
  }

  sendStart(member) {
    const p = this.game.playerById(member.playerId);
    this.send(member, 'start', { init: buildInit(this.game, p) });
    if (this.game.meeting.state) this.send(member, 'event', { name: 'meetingStart', data: meetingPayload(this.game, this.game.meeting.state) });
  }

  hookEvents() {
    const g = this.game;
    const ids = (arr) => arr.map((p) => p.id);
    g.on('kill', ({ killer, target, body, witnesses }) => {
      const data = { killer: killer.id, target: target.id, body: { id: body.id, playerId: body.playerId, x: body.x, y: body.y, room: body.room, time: body.time }, witnesses: ids(witnesses) };
      this.broadcastEvent('kill', (p) => (p && (p === killer || p === target || witnesses.includes(p)) ? data : null));
    });
    for (const name of ['ventEnter', 'ventExit']) {
      g.on(name, ({ p, vent, witnesses }) => {
        const data = { p: p.id, vent: vent.id, witnesses: ids(witnesses) };
        this.broadcastEvent(name, (v) => (v && (v === p || witnesses.includes(v)) ? data : null));
      });
    }
    g.on('ventMove', ({ p, from, to }) => this.broadcastEvent('ventMove', (v) => (v === p ? { p: p.id, from: from.id, to: to.id } : null)));
    g.on('taskDone', ({ p, station }) => this.broadcastEvent('taskDone', (v) => (v === p ? { p: p.id, station: station.id } : null)));
    g.on('taskStep', ({ p, station, task }) => this.broadcastEvent('taskStep', (v) => (v === p ? { station: station.id, first: task.stations[0], step: task.step, readyAt: task.readyAt } : null)));
    g.on('sabotage', ({ type }) => this.broadcastEvent('sabotage', { type }));
    g.on('sabotageEnd', ({ type, who }) => this.broadcastEvent('sabotageEnd', { type, who: who ? who.id : null }));
    g.on('fixPart', ({ fixId, who }) => this.broadcastEvent('fixPart', { fixId, who: who ? who.id : null }));
    g.on('doors', ({ room, locked }) => this.broadcastEvent('doors', { room, locked }));
    g.on('randomEvent', ({ id, zone }) => this.broadcastEvent('randomEvent', { id, zone }));
    g.on('meetingStart', (st) => this.broadcastEvent('meetingStart', meetingPayload(g, st)));
    g.on('chat', ({ speaker, text }) => this.broadcastEvent('chat', { id: speaker.id, text }));
    g.on('vote', ({ voter }) => this.broadcastEvent('vote', { voter: voter.id }));
    g.on('votingStart', () => this.broadcastEvent('votingStart', {}));
    g.on('votingEnd', (result) => this.broadcastEvent('votingEnd', resultPayload(g, result)));
    g.on('eject', (result) => this.broadcastEvent('eject', resultPayload(g, result)));
    g.on('meetingEnd', () => this.broadcastEvent('meetingEnd', {}));
    g.on('end', () => {
      this.broadcastEvent('end', revealPayload(g));
      this.state = 'ended';
      this.broadcastRoom();
      setTimeout(() => this.stop(), 1000);
    });
  }

  tick() {
    const g = this.game;
    if (!g) return;
    g.update(TICK);
    this.tickCount++;
    if (this.tickCount % SNAP_EVERY === 0 && g.phase !== 'ended') {
      for (const m of this.members) {
        if (!m.connected) continue;
        this.send(m, 'snap', { s: buildSnapshot(g, g.playerById(m.playerId)) });
      }
    }
  }

  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  backToLobby(member) {
    if (!this.isHost(member) || this.state !== 'ended') return;
    this.stop();
    this.game = null;
    this.state = 'lobby';
    this.members = this.members.filter((m) => m.connected && !m.left);
    for (const m of this.members) m.playerId = null;
    this.broadcastRoom();
  }

  // ---------- ações durante a partida (sempre validadas aqui) ----------
  handleGame(member, msg) {
    const g = this.game;
    if (!g || this.state !== 'game') return;
    const p = g.playerById(member.playerId);
    if (!p || p.disconnected) return;
    const near = (o, r = 1.5 * 32 + 6) => Math.hypot(o.px - p.x, o.py - p.y) <= r;
    switch (msg.type) {
      case 'move': {
        const now = Date.now();
        const ok = g.applyClientMove(p, Number(msg.x), Number(msg.y), Number(msg.f), msg.m, (now - (member.lastMove || now)) / 1000 + 0.05);
        member.lastMove = now;
        if (!ok && g.phase === 'play' && !p.busy && !p.inVent && Math.hypot(Number(msg.x) - p.x, Number(msg.y) - p.y) > 2) this.send(member, 'correct', { x: p.x, y: p.y });
        break;
      }
      case 'taskOpen': {
        const task = p.tasks.find((t) => t.stationId === msg.stationId && !t.done && g.taskReady(t));
        const s = g.map.stationById[msg.stationId];
        if (!task || !s || !near(s) || p.inVent || g.phase !== 'play' || g.sabotage.isStationBlocked(s)) break;
        if (p.isImpostor) g.startBusy(p, 'fake', 2.5 + Math.random() * 2, { stationId: s.id });
        else g.startBusy(p, 'minigame', Infinity, { stationId: s.id, openedAt: g.time });
        break;
      }
      case 'taskDone': {
        const b = p.busy;
        if (!b || b.kind !== 'minigame' || b.stationId !== msg.stationId || g.time - b.openedAt < MIN_TASK_TIME) break;
        p.busy = null;
        g.completeTask(p, msg.stationId);
        break;
      }
      case 'fixOpen': {
        const f = g.map.fixById[msg.fixId];
        if (!f || !p.alive || !near(f) || !g.sabotage.needsFix(f.id)) break;
        g.startBusy(p, 'minigame', Infinity, { fixId: f.id, openedAt: g.time });
        break;
      }
      case 'fixDone': {
        const b = p.busy;
        if (!b || b.kind !== 'minigame' || b.fixId !== msg.fixId || g.time - b.openedAt < 1) break;
        p.busy = null;
        g.sabotage.fix(msg.fixId, p);
        break;
      }
      case 'panelOpen': {
        const target = msg.kind === 'admin' ? g.map.adminConsole : msg.kind === 'cameras' ? g.map.cameraConsole : null;
        if (target && near(target) && !p.inVent && g.phase === 'play') g.startBusy(p, 'minigame', Infinity, { panel: msg.kind });
        break;
      }
      case 'close': if (p.busy?.kind === 'minigame') p.busy = null; break;
      case 'report': { const b = g.bodyNear(p); if (b) g.report(p, b); break; }
      case 'kill': g.tryKill(p, g.playerById(msg.target)); break;
      case 'emergency': g.callEmergency(p); break;
      case 'ventEnter': g.enterVent(p); break;
      case 'ventMove': g.moveVent(p, String(msg.to)); break;
      case 'ventExit': g.exitVent(p); break;
      case 'sabotage': g.sabotage.trigger(String(msg.sab), p, msg.room ? String(msg.room) : null); break;
      case 'vote': g.meeting.castVote(p, msg.target === 'skip' ? 'skip' : Number(msg.target)); break;
      case 'chat': g.meeting.chat(p, msg.text); break;
      case 'quick': g.meeting.humanSay(String(msg.kind), msg.target != null ? Number(msg.target) : null, p); break;
      default: break;
    }
  }
}
