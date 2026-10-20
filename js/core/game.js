// Estado central da partida. Não depende do DOM: roda no navegador ou no Node.
// Modos: 'local' (single-player com bots), 'server' (autoridade online) e 'mirror' (cópia no cliente online).
import {
  TILE as T, PLAYER_RADIUS, BASE_SPEED, VISION, KILL_RANGE, REPORT_RANGE, USE_RANGE, VENT_RANGE,
  EMERGENCY_RANGE, PLAYER_COLORS, BOT_NAMES, DIFFICULTY, DEFAULT_SETTINGS,
} from '../config.js';
import { buildMap, roomAt } from './map.js';
import { moveEntity, lineOfSight, collides } from './physics.js';
import { Player, randomLook, resetPlayerIds } from './player.js';
import { SabotageSystem } from './sabotage.js';
import { MeetingSystem } from './meeting.js';
import { RandomEvents } from './events.js';
import { BotBrain } from './ai.js';

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

export class Game {
  constructor({
    settings = {}, human = null, humans = null, localIndex = 0, tutorial = false, allBots = false, bots = null, mode = 'local',
  } = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.diff = DIFFICULTY[this.settings.difficulty] || DIFFICULTY.normal;
    this.mode = mode;
    this.tutorial = tutorial;
    this.map = buildMap(this.settings.map);
    this.listeners = {};
    this.time = 0;
    this.phase = 'play';
    this.paused = false;
    this.bodies = [];
    this.log = [];
    this.input = { x: 0, y: 0 };
    this.emergencyCooldown = 15;
    this.meetingsHeld = 0;
    this.result = null;

    resetPlayerIds();
    this.players = [];
    const humanList = humans || [human || { name: 'Você', look: randomLook('azul') }];
    for (const h of humanList) {
      const p = new Player({ name: h.name || 'Aluno', look: { ...h.look }, isBot: allBots });
      p.human = !allBots;
      p.clientId = h.clientId || null;
      this.players.push(p);
    }
    this.local = mode === 'server' ? null : this.players[localIndex] || this.players[0];
    if (this.local) this.local.isLocal = true;

    const total = tutorial ? humanList.length : Math.max(humanList.length, Math.max(4, Math.min(10, this.settings.players)));
    const used = new Set(this.players.map((p) => p.look.color));
    const colors = shuffle(PLAYER_COLORS.filter((c) => !used.has(c.id)));
    const names = shuffle(BOT_NAMES.filter((n) => !this.players.some((p) => p.name === n)));
    for (let i = this.players.length, b = 0; i < total; i++, b++) {
      const preset = bots && bots[b];
      const look = preset ? { ...preset.look } : randomLook((colors[b] || PLAYER_COLORS[b % PLAYER_COLORS.length]).id);
      this.players.push(new Player({ name: preset ? preset.name : names[b], look, isBot: true }));
    }

    this.sabotage = new SabotageSystem(this);
    this.meeting = new MeetingSystem(this);
    this.events = new RandomEvents(this);

    if (mode !== 'mirror') {
      this.assignRoles();
      this.assignTasks();
    }
    this.placeAtSpawn();
    for (const p of this.players) {
      p.killCooldown = 20;
      p.lastRoomId = this.roomAtPos(p.x, p.y)?.id;
      if (p.isBot && mode !== 'mirror') p.brain = new BotBrain(this, p);
    }
    this.addLog(`A aula começou! (${this.map.name})`, 'start');
  }

  // ---------- eventos ----------
  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); return () => { this.listeners[evt] = this.listeners[evt].filter((f) => f !== fn); }; }
  emit(evt, data) { for (const fn of this.listeners[evt] || []) fn(data); }
  addLog(text, kind = 'info', secret = false) { this.log.push({ t: this.time, text, kind, secret }); }

  // ---------- consultas ----------
  playerById(id) { return this.players.find((p) => p.id === Number(id)); }
  roomAtPos(x, y) { return roomAt(this.map, x, y); }
  roomName(id) { return (id && this.map.roomById[id]?.name) || 'corredor'; }
  roomPhrase(id) { const r = id && this.map.roomById[id]; return r ? `${r.prep} ${r.name}` : 'no corredor'; }
  get alivePlayers() { return this.players.filter((p) => p.alive); }
  get impostors() { return this.players.filter((p) => p.isImpostor); }

  taskProgress() {
    if (this.netProgress) return this.netProgress;
    let done = 0, total = 0;
    for (const p of this.players) {
      if (p.isImpostor) continue;
      total += p.tasks.length;
      done += p.tasks.filter((t) => t.done).length;
    }
    return { done, total };
  }

  visionOf(p) {
    if (!p.alive) return 60 * T;
    let v;
    if (p.isImpostor) v = VISION.impostor;
    else v = this.sabotage.lightsOut ? VISION.lightsOut : VISION.crew;
    const room = this.roomAtPos(p.x, p.y);
    if (room?.dim && !p.isImpostor) v *= room.dim;
    if (p.isBot) v *= this.diff.botVision;
    return v;
  }

  canSee(viewer, target) {
    if (target.inVent && target !== viewer) return false;
    const d = Math.hypot(target.x - viewer.x, target.y - viewer.y);
    if (d > this.visionOf(viewer)) return false;
    return lineOfSight(this.map, viewer.x, viewer.y, target.x, target.y);
  }

  // Tarefa visual em andamento: os outros veem a animação, e isso prova que a pessoa é aluno.
  visualTaskOf(p) {
    if (!this.settings.visualTasks || !p.alive || p.isImpostor || !p.busy) return null;
    const id = p.busy.stationId;
    if (!id || (p.busy.kind !== 'task' && p.busy.kind !== 'minigame')) return null;
    const s = this.map.stationById[id];
    return s?.visual ? s : null;
  }

  // ---------- configuração inicial ----------
  assignRoles() {
    if (this.tutorial) return;
    const n = this.players.length;
    const maxImp = Math.max(1, Math.floor((n - 1) / 3));
    const impCount = Math.max(1, Math.min(this.settings.impostors, maxImp));
    let pool = shuffle(this.players);
    const pref = this.settings.rolePref;
    if (this.mode === 'local' && this.local) {
      if (pref === 'impostor') pool = [this.local, ...pool.filter((p) => p !== this.local)];
      if (pref === 'aluno') pool = [...pool.filter((p) => p !== this.local), this.local];
    }
    pool.slice(0, impCount).forEach((p) => { p.role = 'impostor'; });
    this.addLog(`Impostores: ${this.impostors.map((p) => p.name).join(', ')}`, 'roles', true);
  }

  assignTasks() {
    const st = this.map.stations;
    if (this.tutorial) {
      const ids = this.map.tutorial?.tasks || st.slice(0, 2).map((s) => s.id);
      for (const p of this.players) p.tasks = ids.map((id) => ({ stationId: id, done: false }));
      return;
    }
    const count = Math.max(2, Math.min(8, this.settings.tasksPerPlayer));
    for (const p of this.players) {
      // Variedade de salas: no máximo uma tarefa por sala sempre que possível.
      const byRoom = {};
      for (const s of shuffle(st)) (byRoom[s.room] ||= []).push(s);
      const rooms = shuffle(Object.keys(byRoom));
      const chosen = [];
      let round = 0;
      while (chosen.length < count && round < 3) {
        for (const r of rooms) {
          if (chosen.length >= count) break;
          const s = byRoom[r][round];
          if (s) chosen.push(s);
        }
        round++;
      }
      p.tasks = chosen.map((s) => ({ stationId: s.id, done: false }));
    }
  }

  placeAtSpawn() {
    const n = this.players.length;
    this.players.forEach((p, i) => {
      const a = (i / n) * Math.PI * 2;
      p.x = this.map.spawn.px + Math.cos(a) * 1.6 * T;
      p.y = this.map.spawn.py + Math.sin(a) * 1.2 * T;
      p.netX = p.x; p.netY = p.y;
    });
  }

  placeAroundTable() {
    const n = this.players.length;
    this.players.forEach((p, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      p.x = this.map.emergency.px + Math.cos(a) * 2.4 * T;
      p.y = this.map.emergency.py + Math.sin(a) * 2.2 * T;
      p.netX = p.x; p.netY = p.y;
      p.vx = p.vy = 0;
    });
  }

  // ---------- loop ----------
  update(dt) {
    if (this.paused || this.phase === 'ended') return;
    if (this.mode === 'mirror') { this.updateMirror(dt); return; }
    if (this.phase === 'meeting') { this.meeting.update(dt); return; }
    this.time += dt;
    this.emergencyCooldown = Math.max(0, this.emergencyCooldown - dt);

    for (const p of this.players) {
      if (p.alive) p.stats.timeAlive += dt;
      p.killCooldown = Math.max(0, p.killCooldown - dt);
      p.ventCooldown = Math.max(0, p.ventCooldown - dt);
      if (p.busy) this.updateBusy(p, dt);
    }

    if (this.mode === 'local' && this.local && !this.local.isBot) this.movePlayer(this.local, this.input.x, this.input.y, dt);
    for (const p of this.players) if (p.isBot && this.phase === 'play') p.brain.update(dt);
    for (const p of this.players) {
      p.animT += dt;
      const r = this.roomAtPos(p.x, p.y);
      if (r && !r.corridor) p.lastRoomId = r.id;
    }

    this.sabotage.update(dt);
    if (this.phase !== 'play') return;
    this.events.update(dt);
    this.checkWin();
  }

  // Cliente online: só move o jogador local (predição) e suaviza os demais.
  updateMirror(dt) {
    const me = this.local;
    if (this.phase === 'play' && me) this.movePlayer(me, this.input.x, this.input.y, dt);
    const k = 1 - Math.pow(0.0005, dt);
    for (const p of this.players) {
      p.animT += dt;
      if (p === me) continue;
      if (p.netX == null) continue;
      const dx = p.netX - p.x, dy = p.netY - p.y;
      if (Math.hypot(dx, dy) > 6 * T) { p.x = p.netX; p.y = p.netY; } else { p.x += dx * k; p.y += dy * k; }
    }
    if (this.meeting.state) { this.meeting.state.t += dt; this.meeting.state.phaseT += dt; }
    if (this.sabotage.active) this.sabotage.active.remaining = Math.max(0, this.sabotage.active.remaining - dt);
  }

  speedFor(p) {
    let s = BASE_SPEED * p.speedMul * this.events.speedMultiplierAt(p.x, p.y);
    if (p.isBot) s *= this.diff.botSpeed;
    if (!p.alive) s *= 1.15;
    return s;
  }

  // Move um jogador na direção (dx, dy) normalizada; usado pelo humano e pelos bots.
  movePlayer(p, dx, dy, dt) {
    const len = Math.hypot(dx, dy);
    if (len < 0.01 || p.busy || p.inVent) { p.moving = false; p.vx = p.vy = 0; return; }
    const sp = this.speedFor(p);
    const vx = (dx / len) * sp, vy = (dy / len) * sp;
    const ox = p.x, oy = p.y;
    moveEntity(this.map, p, vx * dt, vy * dt, PLAYER_RADIUS, !p.alive);
    p.vx = (p.x - ox) / dt; p.vy = (p.y - oy) / dt;
    p.moving = Math.hypot(p.vx, p.vy) > 10;
    if (Math.abs(dx) > 0.2) p.facing = dx > 0 ? 1 : -1;
  }

  // Servidor: aceita a posição enviada pelo cliente se for plausível (velocidade e colisão).
  applyClientMove(p, x, y, facing, moving, dtSince) {
    if (this.phase !== 'play' || p.busy || p.inVent) return false;
    const maxD = this.speedFor(p) * Math.min(1, dtSince) * 1.6 + 24;
    const d = Math.hypot(x - p.x, y - p.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || d > maxD) return false;
    if (p.alive && collides(this.map, x, y, PLAYER_RADIUS - 3)) return false;
    if (x < 0 || y < 0 || x > this.map.W * T || y > this.map.H * T) return false;
    p.x = x; p.y = y;
    p.facing = facing >= 0 ? 1 : -1;
    p.moving = !!moving;
    return true;
  }

  updateBusy(p, dt) {
    const b = p.busy;
    b.t += dt;
    if (b.kind === 'minigame') return; // controlado pela interface
    if (b.t < b.dur) return;
    p.busy = null;
    if (b.kind === 'task') this.completeTask(p, b.stationId);
    else if (b.kind === 'fake') {
      const task = p.tasks.find((t) => t.stationId === b.stationId);
      if (task) task.done = true;
      this.emit('fakeDone', { p, stationId: b.stationId });
    } else if (b.kind === 'fix') this.sabotage.fix(b.fixId, p);
  }

  startBusy(p, kind, dur, extra = {}) {
    p.busy = { kind, t: 0, dur, ...extra };
    p.moving = false;
  }

  // ---------- ações ----------
  completeTask(p, stationId) {
    const task = p.tasks.find((t) => t.stationId === stationId);
    if (!task || task.done) return false;
    const station = this.map.stationById[stationId];
    if (this.sabotage.isStationBlocked(station)) return false;
    task.done = true;
    if (!p.isImpostor) {
      p.stats.tasksDone++;
      this.emit('taskDone', { p, station });
      this.checkWin();
    }
    return true;
  }

  killTargetFor(p) {
    if (!p.alive || !p.isImpostor || p.killCooldown > 0 || p.inVent || this.phase !== 'play') return null;
    let best = null, bd = KILL_RANGE;
    for (const q of this.players) {
      if (q === p || !q.alive || q.isImpostor) continue;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d <= bd && lineOfSight(this.map, p.x, p.y, q.x, q.y)) { bd = d; best = q; }
    }
    return best;
  }

  tryKill(killer, target) {
    if (!target || this.killTargetFor(killer) == null) return false;
    const d = Math.hypot(target.x - killer.x, target.y - killer.y);
    if (!target.alive || target.isImpostor || d > KILL_RANGE) return false;
    // Testemunhas: quem consegue ver o impostor no momento da eliminação.
    const witnesses = this.players.filter((q) => q.alive && q !== killer && q !== target && this.canSee(q, killer));
    target.alive = false;
    target.busy = null;
    target.deathTime = this.time;
    target.killedBy = killer.id;
    const room = this.roomAtPos(target.x, target.y);
    const body = { id: `b${target.id}`, playerId: target.id, x: target.x, y: target.y, time: this.time, room: room?.id };
    this.bodies.push(body);
    // O impostor avança até a vítima, mas para ao lado do corpo (sem atravessar paredes).
    const kd = Math.hypot(killer.x - target.x, killer.y - target.y) || 1;
    const kx = killer.x, ky = killer.y;
    killer.x = target.x; killer.y = target.y;
    moveEntity(this.map, killer, ((kx - target.x) / kd) * 18, ((ky - target.y) / kd) * 18, PLAYER_RADIUS);
    killer.killCooldown = this.diff.killCooldown;
    killer.stats.kills++;
    this.addLog(`${killer.name} eliminou ${target.name} (${this.roomName(room?.id)})`, 'kill', true);
    this.emit('kill', { killer, target, body, witnesses });
    for (const w of witnesses) if (w.isBot) w.brain.onWitnessKill(killer, target, body);
    this.checkWin();
    return true;
  }

  bodyNear(p) {
    if (!p.alive || p.inVent || this.phase !== 'play') return null;
    let best = null, bd = REPORT_RANGE;
    for (const b of this.bodies) {
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d <= bd && lineOfSight(this.map, p.x, p.y, b.x, b.y)) { bd = d; best = b; }
    }
    return best;
  }

  report(p, body) {
    if (!p.alive || this.phase !== 'play' || !body) return false;
    if (body.dummy) { this.emit('dummyReport', { p, body }); return true; }
    p.stats.reports++;
    const victim = this.playerById(body.playerId);
    this.addLog(`${p.name} reportou ${victim.name} desacordado(a) (${this.roomName(body.room)})`, 'report');
    this.beginMeeting('report', p, body);
    return true;
  }

  canCallEmergency(p) {
    if (!p.alive || p.inVent || this.phase !== 'play' || p.emergencyUses <= 0 || this.tutorial) return false;
    if (this.emergencyCooldown > 0 || this.sabotage.critical) return false;
    return Math.hypot(p.x - this.map.emergency.px, p.y - this.map.emergency.py) <= EMERGENCY_RANGE;
  }

  callEmergency(p) {
    if (!this.canCallEmergency(p)) return false;
    p.emergencyUses--;
    p.stats.meetingsCalled++;
    this.addLog(`${p.name} convocou uma reunião de emergência`, 'meeting');
    this.beginMeeting('emergency', p, null);
    return true;
  }

  beginMeeting(kind, caller, body) {
    this.phase = 'meeting';
    this.meetingsHeld++;
    this.lastMeetingAt = this.time;
    for (const p of this.players) { p.busy = null; p.moving = false; p.inVent = null; }
    this.sabotage.clearAll();
    this.events.clear();
    this.meeting.start(kind, caller, body);
  }

  ejectPlayer(p) {
    p.alive = false;
    p.ejected = true;
    p.deathTime = this.time;
    this.addLog(`${p.name} foi encaminhado(a) à coordenação (${p.isImpostor ? 'impostor' : 'aluno'})`, 'eject');
  }

  afterMeeting() {
    this.bodies = [];
    this.placeAroundTable();
    this.emergencyCooldown = 15;
    for (const p of this.players) p.killCooldown = Math.max(p.killCooldown, this.diff.killCooldown * 0.8);
    this.sabotage.cooldown = Math.max(this.sabotage.cooldown, 12);
    this.phase = 'play';
    this.emit('meetingEnd', {});
    this.checkWin();
  }

  // ---------- dutos de ventilação ----------
  ventNear(p) {
    if (!p.isImpostor || !p.alive || p.inVent || this.phase !== 'play') return null;
    return this.map.vents.find((v) => Math.hypot(v.px - p.x, v.py - p.y) <= VENT_RANGE) || null;
  }

  ventLinks(ventId) {
    const v = this.map.ventById[ventId];
    return v ? this.map.vents.filter((o) => o.group === v.group && o !== v) : [];
  }

  witnessesOf(p) {
    return this.players.filter((q) => q.alive && q !== p && !q.isImpostor && this.canSee(q, p));
  }

  enterVent(p) {
    const v = this.ventNear(p);
    if (!v || p.ventCooldown > 0 || p.busy) return false;
    const seen = this.witnessesOf(p);
    p.x = v.px; p.y = v.py;
    p.inVent = v.id;
    p.moving = false;
    p.ventCooldown = 0.2;
    for (const q of seen) if (q.isBot) q.brain.onWitnessVent(p);
    this.emit('ventEnter', { p, vent: v, witnesses: seen });
    return true;
  }

  moveVent(p, toId) {
    if (!p.inVent || p.ventCooldown > 0 || this.phase !== 'play') return false;
    const to = this.ventLinks(p.inVent).find((v) => v.id === toId);
    if (!to) return false;
    const from = this.map.ventById[p.inVent];
    p.inVent = to.id;
    p.x = to.px; p.y = to.py;
    p.ventCooldown = 0.25;
    this.emit('ventMove', { p, from, to });
    return true;
  }

  exitVent(p) {
    if (!p.inVent || p.ventCooldown > 0) return false;
    const v = this.map.ventById[p.inVent];
    p.inVent = null;
    p.ventCooldown = 1;
    const seen = this.witnessesOf(p);
    for (const q of seen) if (q.isBot) q.brain.onWitnessVent(p);
    this.emit('ventExit', { p, vent: v, witnesses: seen });
    return true;
  }

  // Painel de admin: quantas pessoas há em cada sala (anônimo). Fica fora do ar com o GPS sabotado.
  adminCounts() {
    if (this.sabotage.gpsOff) return null;
    const counts = {};
    for (const p of this.players) {
      if (!p.alive || p.inVent) continue;
      const r = this.roomAtPos(p.x, p.y);
      if (r) counts[r.id] = (counts[r.id] || 0) + 1;
    }
    for (const b of this.bodies) {
      const r = this.roomAtPos(b.x, b.y);
      if (r) counts[r.id] = (counts[r.id] || 0) + 1;
    }
    return counts;
  }

  // Possíveis interações para um jogador na posição atual (usado pela UI e pelos bots).
  interactionsFor(p) {
    const res = { use: null, report: null, kill: null, vent: null };
    if (this.phase !== 'play' || p.inVent) return res;
    const near = (o, r = USE_RANGE) => Math.hypot(o.px - p.x, o.py - p.y) <= r;
    if (p.alive) {
      for (const f of this.map.fixPoints) {
        if (this.sabotage.needsFix(f.id) && near(f)) { res.use = { kind: 'fix', fix: f, label: `Consertar: ${f.name}` }; break; }
      }
    }
    if (!res.use) {
      for (const t of p.tasks) {
        if (t.done) continue;
        const s = this.map.stationById[t.stationId];
        if (!near(s)) continue;
        if (this.sabotage.isStationBlocked(s)) { res.use = { kind: 'blocked', station: s, label: 'Máquinas paradas: reinicie o CLP' }; break; }
        res.use = p.isImpostor ? { kind: 'fake', station: s, label: `Fingir tarefa: ${s.name}` } : { kind: 'task', station: s, label: s.name };
        break;
      }
    }
    if (!res.use && p.alive && !this.tutorial && near(this.map.emergency, EMERGENCY_RANGE)) {
      res.use = { kind: 'emergency', label: p.emergencyUses > 0 ? 'Convocar reunião de emergência' : 'Sem convocações restantes', disabled: !this.canCallEmergency(p) };
    }
    if (!res.use && near(this.map.cameraConsole)) res.use = { kind: 'cameras', label: 'Ver câmeras de segurança' };
    if (!res.use && near(this.map.adminConsole)) res.use = { kind: 'admin', label: 'Abrir o painel de admin' };
    res.report = this.bodyNear(p);
    res.kill = this.killTargetFor(p);
    res.vent = this.ventNear(p);
    return res;
  }

  // ---------- vitória ----------
  checkWin() {
    if (this.tutorial || this.phase === 'ended' || this.phase === 'meeting' || this.mode === 'mirror') return;
    const imp = this.players.filter((p) => p.alive && p.isImpostor).length;
    const crew = this.players.filter((p) => p.alive && !p.isImpostor).length;
    const { done, total } = this.taskProgress();
    if (imp === 0) this.end('crew', 'Todos os impostores foram encaminhados à coordenação!');
    else if (imp >= crew) this.end('impostor', 'Os impostores ficaram em igualdade numérica com os alunos.');
    else if (total > 0 && done >= total) this.end('crew', 'Todas as tarefas foram concluídas!');
  }

  end(winner, reason) {
    if (this.phase === 'ended') return;
    this.phase = 'ended';
    const localWon = this.local ? (winner === 'impostor') === this.local.isImpostor : null;
    this.result = { winner, reason, localWon, duration: this.time, meetings: this.meetingsHeld, progress: this.taskProgress() };
    this.addLog(reason, 'end');
    this.emit('end', this.result);
  }
}
