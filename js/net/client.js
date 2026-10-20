// Cliente online: conexão WebSocket, lobby, cópia local da partida e reconexão automática.
import { Game } from '../core/game.js';
import { applySnapshot, meetingFromPayload } from './protocol.js';

const STORE = 'senai-suspeitos-net';
const save = (v) => { try { sessionStorage.setItem(STORE, JSON.stringify(v)); } catch { /* sem armazenamento */ } };
const load = () => { try { return JSON.parse(sessionStorage.getItem(STORE)) || null; } catch { return null; } };

export function defaultServerUrl() {
  if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return '';
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}

export class NetClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.handlers = {};
    this.room = null;
    this.youId = null;
    this.code = null;
    this.token = null;
    this.game = null;
    this.closedByUser = false;
    this.retries = 0;
    this.moveT = 0;
  }

  on(type, fn) { (this.handlers[type] ||= []).push(fn); }
  emit(type, data) { for (const fn of this.handlers[type] || []) fn(data); }

  connect() {
    return new Promise((resolve, reject) => {
      let opened = false;
      let ws;
      try { ws = new WebSocket(this.url); } catch { reject(new Error('Endereço do servidor inválido.')); return; }
      this.ws = ws;
      const timeout = setTimeout(() => { if (!opened) { ws.close(); reject(new Error('O servidor não respondeu. Ele pode estar iniciando (no plano grátis do Render isso leva ~1 minuto); tente de novo.')); } }, 12000);
      ws.onopen = () => { opened = true; clearTimeout(timeout); this.retries = 0; resolve(); };
      ws.onerror = () => { if (!opened) { clearTimeout(timeout); reject(new Error('Não foi possível conectar ao servidor.')); } };
      ws.onmessage = (ev) => { let msg; try { msg = JSON.parse(ev.data); } catch { return; } this.handle(msg); };
      ws.onclose = () => { if (opened) this.onClose(); };
    });
  }

  send(type, data = {}) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ type, ...data }));
  }

  create(profile) { this.send('create', { name: profile.name, look: profile.look }); }
  join(code, profile) { this.send('join', { code: String(code).trim().toUpperCase(), name: profile.name, look: profile.look }); }
  leave() { this.closedByUser = true; this.send('leave'); save(null); try { this.ws.close(); } catch { /* ok */ } }

  async onClose() {
    if (this.closedByUser) return;
    this.emit('connection', { state: 'lost' });
    // Tenta voltar para a mesma sala algumas vezes.
    while (this.retries < 6 && !this.closedByUser) {
      this.retries++;
      await new Promise((r) => setTimeout(r, 1000 * this.retries));
      try {
        await this.connect();
        this.send('rejoin', { code: this.code, token: this.token });
        this.emit('connection', { state: 'back' });
        return;
      } catch { /* tenta de novo */ }
    }
    this.emit('connection', { state: 'gone' });
  }

  handle(msg) {
    switch (msg.type) {
      case 'joined':
        this.code = msg.code; this.token = msg.token; this.youId = msg.id;
        save({ url: this.url, code: msg.code, token: msg.token });
        this.emit('joined', msg);
        break;
      case 'room':
        this.room = msg.room; this.youId = msg.you;
        this.emit('room', msg.room);
        break;
      case 'error': this.emit('error', msg); break;
      case 'start': this.startGame(msg.init); break;
      case 'snap': if (this.game) applySnapshot(this.game, msg.s); break;
      case 'correct': if (this.game?.local) { this.game.local.x = msg.x; this.game.local.y = msg.y; } break;
      case 'event': this.handleEvent(msg.name, msg.data); break;
      default: break;
    }
  }

  get isHost() { return this.room && this.room.hostId === this.youId; }

  startGame(init) {
    const youIndex = init.players.findIndex((p) => p.id === init.you.id);
    const game = new Game({
      settings: { ...init.settings, players: init.players.length },
      humans: init.players.map((p) => ({ name: p.name, look: p.look })),
      localIndex: youIndex,
      mode: 'mirror',
    });
    game.net = this;
    for (const info of init.players) {
      const p = game.playerById(info.id);
      p.isBot = info.isBot;
      p.human = !info.isBot;
      p.alive = info.alive;
      p.ejected = !!info.ejected;
    }
    const me = game.local;
    me.role = init.you.role;
    me.tasks = init.you.tasks.map((t) => ({ ...t }));
    me.alive = init.you.alive;
    for (const id of init.you.teammates) game.playerById(id).role = 'impostor';
    game.phase = init.phase === 'ended' ? 'play' : init.phase;
    this.game = game;
    this.emit('start', game);
  }

  // Envia a posição prevista do jogador local (~15 vezes por segundo).
  tick(dt) {
    const g = this.game;
    if (!g || g.phase !== 'play') return;
    this.moveT -= dt;
    if (this.moveT > 0) return;
    this.moveT = 1 / 15;
    const me = g.local;
    this.send('move', { x: Math.round(me.x * 10) / 10, y: Math.round(me.y * 10) / 10, f: me.facing, m: me.moving ? 1 : 0 });
  }

  handleEvent(name, d) {
    const g = this.game;
    if (!g) return;
    const P = (id) => (id == null ? null : g.playerById(id));
    switch (name) {
      case 'kill': {
        const target = P(d.target);
        target.alive = false;
        target.killedBy = d.killer;
        if (!g.bodies.some((b) => b.id === d.body.id)) g.bodies.push(d.body);
        g.emit('kill', { killer: P(d.killer), target, body: d.body, witnesses: d.witnesses.map(P) });
        break;
      }
      case 'ventEnter': case 'ventExit': {
        const p = P(d.p);
        if (name === 'ventEnter' && p === g.local) p.inVent = d.vent;
        if (name === 'ventExit' && p === g.local) p.inVent = null;
        g.emit(name, { p, vent: g.map.ventById[d.vent], witnesses: d.witnesses.map(P) });
        break;
      }
      case 'ventMove': {
        const p = P(d.p); const to = g.map.ventById[d.to];
        if (p === g.local) { p.inVent = to.id; p.x = to.px; p.y = to.py; }
        g.emit('ventMove', { p, from: g.map.ventById[d.from], to });
        break;
      }
      case 'taskDone': {
        const t = g.local.tasks.find((x) => x.stationId === d.station);
        if (t) t.done = true;
        g.emit('taskDone', { p: g.local, station: g.map.stationById[d.station] });
        break;
      }
      case 'sabotage': g.sabotage.active = g.sabotage.active || { type: d.type, remaining: 99, fixed: {} }; g.emit('sabotage', { type: d.type }); break;
      case 'sabotageEnd': g.sabotage.active = null; g.emit('sabotageEnd', { type: d.type, who: P(d.who) }); break;
      case 'fixPart': g.emit('fixPart', { fixId: d.fixId, who: P(d.who) }); break;
      case 'doors': g.emit('doors', d); break;
      case 'randomEvent': g.emit('randomEvent', { id: d.id, zone: d.zone }); break;
      case 'meetingStart': {
        for (const p of g.players) { p.busy = null; p.inVent = null; }
        g.phase = 'meeting';
        g.meeting.state = meetingFromPayload(g, d);
        g.emit('meetingStart', g.meeting.state);
        break;
      }
      case 'chat': {
        const st = g.meeting.state;
        const speaker = P(d.id);
        if (st) st.chat.push({ id: d.id, name: speaker.name, text: d.text, t: st.t });
        g.emit('chat', { speaker, text: d.text });
        break;
      }
      case 'vote': { const st = g.meeting.state; if (st) st.votes[d.voter] = '?'; g.emit('vote', { voter: P(d.voter) }); break; }
      case 'votingStart': if (g.meeting.state) g.meeting.state.phase = 'voting'; g.emit('votingStart', g.meeting.state); break;
      case 'votingEnd': case 'eject': {
        const st = g.meeting.state;
        const ej = P(d.ejected);
        if (ej && d.ejectedRole) ej.role = d.ejectedRole;
        const result = { ...d, ejected: ej, votes: d.votes };
        if (st) { st.result = result; st.votes = { ...d.votes }; st.phase = name === 'eject' ? 'eject' : 'results'; }
        g.emit(name, result);
        break;
      }
      case 'meetingEnd': {
        const ej = g.meeting.state?.result?.ejected;
        if (ej) { ej.alive = false; ej.ejected = true; }
        g.meeting.state = null;
        g.bodies = [];
        g.phase = 'play';
        g.emit('meetingEnd', {});
        break;
      }
      case 'end': {
        for (const info of d.players) {
          const p = P(info.id);
          p.role = info.role; p.alive = info.alive; p.ejected = info.ejected; p.stats = info.stats; p.tasks = info.tasks;
        }
        g.log = d.log;
        g.netProgress = d.result.progress;
        g.phase = 'ended';
        g.result = { ...d.result, localWon: (d.result.winner === 'impostor') === g.local.isImpostor };
        g.emit('end', g.result);
        break;
      }
      case 'playerLeft': g.emit('netNotice', { text: `${P(d.id).name} caiu da partida. Um bot assumiu o lugar até a pessoa voltar.` }); P(d.id).isBot = true; break;
      case 'playerBack': g.emit('netNotice', { text: `${P(d.id).name} voltou para a partida.` }); P(d.id).isBot = false; break;
      default: break;
    }
  }

  static saved() { return load(); }
}
