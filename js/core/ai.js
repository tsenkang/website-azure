// Inteligência dos bots: tarefas, observação, sabotagem, eliminações e reuniões.
import { TILE as T, REPORT_RANGE, EMERGENCY_RANGE } from '../config.js';
import { findPath } from './pathfinding.js';
import { lineOfSight } from './physics.js';
import { SABOTAGES } from './sabotage.js';

const TASK_DUR = { tools: 11, gauge: 7, wires: 7, circuit: 11, robot: 11, sort: 8, quiz: 9, wait: 12, sequence: 8, diag: 11, logic: 8, keypad: 6, scan: 10 };
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const HUMOR = [
  'Gente, eu só queria terminar meu TCC em paz...',
  'Alguém viu meu paquímetro? Sumiu da bancada.',
  'Se eu reprovar por causa dessa reunião, a culpa é de vocês.',
  'O professor vai dar falta pra todo mundo desse jeito.',
  'Quem deixou o torno ligado sem EPI?',
  'Eu juro que só fui no bebedouro.',
  'Pode ser rápido? A coxinha da cantina tá esfriando.',
];

export class BotBrain {
  constructor(game, p) {
    this.g = game;
    this.p = p;
    this.goal = null;
    this.path = null;
    this.pathIdx = 0;
    this.pathVersion = -1;
    this.observeT = Math.random() * 0.3;
    this.decideT = Math.random() * 0.25;
    this.sightings = {};
    this.sus = {};
    this.together = {};
    this.witness = [];
    this.roomHistory = [];
    this.seenBodies = new Set();
    this.pending = null;
    this.idleUntil = 0;
    this.stuck = { t: 0, x: p.x, y: p.y, count: 0 };
    this.careless = Math.random() > game.diff.killCare;
    this.repathT = 0;
    this.fakeIdx = 0;
    this.defenses = 0;
    this.cleared = {}; // quem foi visto fazendo tarefa visual (prova de inocência)
  }

  get diff() { return this.g.diff; }

  // ---------------- percepção ----------------
  observe() {
    const { g, p } = this;
    const room = g.roomAtPos(p.x, p.y);
    const last = this.roomHistory[this.roomHistory.length - 1];
    if (room && (!last || last.room !== room.id)) {
      this.roomHistory.push({ t: g.time, room: room.id });
      if (this.roomHistory.length > 50) this.roomHistory.shift();
    }
    if (!p.alive) return;
    for (const q of g.players) {
      if (q === p || !q.alive) continue;
      if (Math.random() > this.diff.observe + 0.15) continue;
      if (!g.canSee(p, q)) continue;
      const arr = (this.sightings[q.id] ||= []);
      const prev = arr[arr.length - 1];
      if (!prev || g.time - prev.t > 0.9) {
        arr.push({ t: g.time, x: q.x, y: q.y, room: g.roomAtPos(q.x, q.y)?.id });
        if (arr.length > 40) arr.shift();
      }
      if (dist(p, q) < 5 * T) this.together[q.id] = (this.together[q.id] || 0) + 0.3;
      const visual = g.visualTaskOf(q);
      if (visual && !this.cleared[q.id]) {
        this.cleared[q.id] = { station: visual.id, room: visual.room, t: g.time };
        this.addSus(q.id, -70);
      }
    }
    for (const b of g.bodies) {
      if (this.seenBodies.has(b.id) || b.dummy) continue;
      if (!g.canSee(p, b)) continue;
      this.seenBodies.add(b.id);
      this.onSeeBody(b);
    }
  }

  onSeeBody(b) {
    const { g, p } = this;
    if (!p.alive || this.pending?.kind === 'report') return;
    if (p.isImpostor) {
      if (b.playerId != null && g.playerById(b.playerId).killedBy === p.id && Math.random() < this.diff.selfReport) {
        this.pending = { kind: 'report', body: b, at: g.time + rand(2.5, 5) };
      }
      return;
    }
    this.pending = { kind: 'report', body: b, at: g.time + this.diff.reactTime * rand(0.6, 1.4) };
  }

  onWitnessKill(killer, victim, body) {
    const { g, p } = this;
    if (p.isImpostor || !p.alive) return;
    this.sus[killer.id] = 100;
    this.witness.push({ type: 'kill', who: killer.id, victim: victim.id, room: body.room, t: g.time });
    this.seenBodies.add(body.id);
    this.pending = { kind: 'report', body, at: g.time + 0.4 };
  }

  onWitnessVent(q) {
    const { g, p } = this;
    if (p.isImpostor || !p.alive) return;
    if (this.witness.some((w) => w.type === 'vent' && w.who === q.id)) return;
    this.sus[q.id] = 100;
    this.witness.push({ type: 'vent', who: q.id, room: g.roomAtPos(q.x, q.y)?.id, t: g.time });
    if (!this.pending && p.emergencyUses > 0) this.pending = { kind: 'emergency', at: g.time + 0.5, giveUp: g.time + 40 };
  }

  // ---------------- movimento ----------------
  setGoal(x, y, kind, data = null) {
    const { g, p } = this;
    const same = this.goal && this.goal.kind === kind && this.goal.data === data && Math.hypot(this.goal.x - x, this.goal.y - y) < 4;
    if (same && this.path && this.pathVersion === g.map.version) return true;
    const path = findPath(g.map, p.x, p.y, x, y, !p.alive);
    this.goal = { x, y, kind, data };
    if (!path) { this.path = null; this.goal.unreachable = true; return false; }
    this.path = path;
    this.pathIdx = 0;
    this.pathVersion = g.map.version;
    return true;
  }

  clearGoal() { this.goal = null; this.path = null; }

  atGoal(tol = 6) { return this.goal && Math.hypot(this.goal.x - this.p.x, this.goal.y - this.p.y) <= tol; }

  followPath(dt) {
    const { g, p } = this;
    if (!this.path || p.busy) { g.movePlayer(p, 0, 0, dt); return; }
    if (this.pathVersion !== g.map.version && this.goal) {
      this.setGoal(this.goal.x, this.goal.y, this.goal.kind, this.goal.data);
      if (!this.path) { g.movePlayer(p, 0, 0, dt); return; }
    }
    let wp = this.path[this.pathIdx];
    while (wp && Math.hypot(wp.x - p.x, wp.y - p.y) < 4) { this.pathIdx++; wp = this.path[this.pathIdx]; }
    if (!wp) { this.path = null; g.movePlayer(p, 0, 0, dt); return; }
    g.movePlayer(p, wp.x - p.x, wp.y - p.y, dt);

    this.stuck.t += dt;
    if (this.stuck.t > 1.2) {
      if (Math.hypot(p.x - this.stuck.x, p.y - this.stuck.y) < 6) {
        this.stuck.count++;
        if (this.stuck.count > 2) { this.clearGoal(); this.stuck.count = 0; this.idleUntil = g.time + 0.5; }
        else if (this.goal) { this.pathVersion = -1; }
      } else this.stuck.count = 0;
      this.stuck = { t: 0, x: p.x, y: p.y, count: this.stuck.count };
    }
  }

  // ---------------- decisões ----------------
  update(dt) {
    const { p } = this;
    if (p.busy) { p.moving = false; return; }
    this.observeT -= dt;
    if (this.observeT <= 0) { this.observe(); this.observeT = 0.3; }
    this.decideT -= dt;
    this.repathT -= dt;
    if (this.decideT <= 0) {
      this.decideT = 0.25;
      if (!p.alive) this.decideGhost();
      else if (p.isImpostor) this.decideImpostor();
      else this.decideCrew();
    }
    if (this.p.busy) return;
    this.followPath(dt);
  }

  handlePending() {
    const { g, p } = this;
    const a = this.pending;
    if (!a || g.time < a.at) return !!a && a.kind !== 'emergency';
    if (a.kind === 'report') {
      if (!g.bodies.includes(a.body)) { this.pending = null; return false; }
      const near = Math.hypot(a.body.x - p.x, a.body.y - p.y) <= REPORT_RANGE * 0.85 && lineOfSight(g.map, p.x, p.y, a.body.x, a.body.y);
      if (near) { this.pending = null; g.report(p, a.body); return true; }
      if (!this.setGoal(a.body.x, a.body.y, 'report', a.body)) this.pending = null;
      return true;
    }
    if (a.kind === 'emergency') {
      if (g.time > a.giveUp || p.emergencyUses <= 0) { this.pending = null; return false; }
      if (g.canCallEmergency(p)) { this.pending = null; g.callEmergency(p); return true; }
      if (g.sabotage.critical) return false;
      const e = g.map.emergency;
      if (Math.hypot(e.px - p.x, e.py - p.y) > EMERGENCY_RANGE * 0.8) this.setGoal(e.stand.px, e.stand.py, 'emergency');
      return true;
    }
    if (a.kind === 'vent') {
      const v = a.vent;
      if (Math.hypot(v.px - p.x, v.py - p.y) < 8) {
        if (g.enterVent(p)) {
          this.pending = { kind: 'inVent', at: g.time, until: g.time + rand(1, 2.5), hops: 0 };
          this.clearGoal();
        } else this.pending = null;
      } else if (!this.setGoal(v.px, v.py, 'vent', v)) this.pending = null;
      return true;
    }
    if (a.kind === 'inVent') {
      // Escondido no duto: troca de saída algumas vezes e só sai quando ninguém está olhando.
      if (!p.inVent) { this.pending = null; return false; }
      if (g.time < a.until) return true;
      const exitPoint = { x: p.x, y: p.y };
      const watched = g.players.some((q) => q.alive && !q.isImpostor && q !== p && Math.hypot(q.x - exitPoint.x, q.y - exitPoint.y) < g.visionOf(q) && lineOfSight(g.map, q.x, q.y, exitPoint.x, exitPoint.y));
      if ((a.hops < 1 || watched || Math.random() < 0.35) && a.hops < 4) {
        g.moveVent(p, pick(g.ventLinks(p.inVent)).id);
        a.hops++;
        a.until = g.time + rand(0.8, 2);
      } else if (g.exitVent(p)) {
        this.pending = null;
        this.idleUntil = g.time + rand(0.3, 1);
      }
      return true;
    }
    if (a.kind === 'flee') {
      if (this.atGoal(10) || g.time > a.until) { this.pending = null; return false; }
      if (!this.goal || this.goal.kind !== 'flee') this.setGoal(a.x, a.y, 'flee');
      return true;
    }
    return false;
  }

  decideCrew() {
    const { g, p } = this;
    if (this.handlePending()) return;
    const sab = g.sabotage.active;
    if (sab) {
      const def = SABOTAGES[sab.type];
      const needed = def.fixes.filter((f) => !sab.fixed[f]).map((id) => g.map.fixById[id]);
      if (needed.length && (def.critical || this.isAmongNearestTo(needed[0], 2))) {
        const target = this.chooseFix(needed);
        if (target) {
          if (Math.hypot(target.stand.px - p.x, target.stand.py - p.y) < 8) {
            g.startBusy(p, 'fix', def.fixTime * rand(1, 1.3), { fixId: target.id });
            this.clearGoal();
          } else this.setGoal(target.stand.px, target.stand.py, 'fix', target.id);
          return;
        }
      }
    }
    if (this.pending?.kind === 'emergency') return;
    if (g.time < this.idleUntil) return;
    this.doTasksOrWander();
  }

  isAmongNearestTo(point, n) {
    const { g, p } = this;
    const crew = g.players.filter((q) => q.alive && !q.isImpostor && q.isBot)
      .sort((a, b) => Math.hypot(a.x - point.px, a.y - point.py) - Math.hypot(b.x - point.px, b.y - point.py));
    return crew.slice(0, n).includes(p);
  }

  chooseFix(needed) {
    const { g, p } = this;
    const heading = (f) => g.players.filter((q) => q !== p && q.isBot && q.alive && q.brain.goal?.kind === 'fix' && q.brain.goal.data === f.id).length;
    return [...needed].sort((a, b) => (heading(a) - heading(b)) * 30 * T + (Math.hypot(a.px - p.x, a.py - p.y) - Math.hypot(b.px - p.x, b.py - p.y)))[0];
  }

  doTasksOrWander() {
    const { g, p } = this;
    const open = p.tasks.filter((t) => !t.done).map((t) => g.map.stationById[t.stationId])
      .filter((s) => !g.sabotage.isStationBlocked(s));
    if (this.detour) {
      if (this.goal?.kind === 'wander' && this.atGoal(10)) { this.detour = false; this.clearGoal(); this.idleUntil = g.time + rand(1, 4); return; }
      if (this.goal?.kind !== 'wander' || !this.path) { const s = pick(g.map.stations); this.setGoal(s.stand.px, s.stand.py, 'wander', s.id); }
      return;
    }
    if (open.length) {
      let target = this.goal?.kind === 'task' ? open.find((s) => s.id === this.goal.data) : null;
      if (!target || this.goal?.unreachable) {
        open.sort((a, b) => Math.hypot(a.px - p.x, a.py - p.y) - Math.hypot(b.px - p.x, b.py - p.y));
        target = this.goal?.unreachable && open.length > 1 ? open[1] : open[0];
      }
      if (Math.hypot(target.stand.px - p.x, target.stand.py - p.y) < 8) {
        const dur = (TASK_DUR[target.task] || 5) * rand(0.85, 1.35);
        g.startBusy(p, p.isImpostor ? 'fake' : 'task', dur, { stationId: target.id });
        this.clearGoal();
        this.idleUntil = g.time + dur + rand(0.5, 2);
        // Alunos se distraem: às vezes passeiam antes da próxima tarefa.
        this.detour = Math.random() < 0.45;
      } else this.setGoal(target.stand.px, target.stand.py, 'task', target.id);
      return;
    }
    this.wander();
  }

  wander() {
    const { g } = this;
    if (this.goal?.kind === 'wander' && !this.atGoal(10) && this.path) return;
    if (this.goal?.kind === 'wander' && this.atGoal(10)) {
      this.clearGoal();
      this.idleUntil = g.time + rand(1.5, 5);
      return;
    }
    const s = pick(g.map.stations);
    this.setGoal(s.stand.px, s.stand.py, 'wander', s.id);
  }

  // ---------------- impostor ----------------
  decideImpostor() {
    const { g, p } = this;
    const diff = this.diff;
    if (this.handlePending()) return;

    const target = g.killTargetFor(p);
    if (target && (this.careless || this.safeToKill(target))) {
      if (g.tryKill(p, target)) { this.afterKill(); return; }
    }

    if (Math.random() < diff.sabotageRate * 0.25) this.trySabotage();

    if (p.killCooldown < 5) {
      const prey = this.findIsolatedPrey();
      if (prey) {
        if (this.repathT <= 0 || this.goal?.kind !== 'hunt' || this.goal.data !== prey.id) {
          this.repathT = 0.6;
          this.setGoal(prey.x, prey.y, 'hunt', prey.id);
        }
        return;
      }
    }
    if (this.goal?.kind === 'hunt') this.clearGoal();
    if (g.time < this.idleUntil) return;
    this.doTasksOrWander();
  }

  safeToKill(target) {
    const { g, p } = this;
    for (const q of g.players) {
      if (q === p || q === target || !q.alive || q.isImpostor) continue;
      if (g.canSee(q, p) || g.canSee(q, target)) return false;
    }
    return true;
  }

  findIsolatedPrey() {
    const { g, p } = this;
    const crew = g.players.filter((q) => q.alive && !q.isImpostor);
    let best = null, bestScore = -Infinity;
    for (const q of crew) {
      if (!g.canSee(p, q)) continue;
      let nearest = Infinity;
      for (const o of crew) if (o !== q) nearest = Math.min(nearest, dist(o, q));
      if (nearest < 7 * T && !this.careless) continue;
      const score = nearest - dist(p, q) * 0.5;
      if (score > bestScore) { bestScore = score; best = q; }
    }
    return best;
  }

  afterKill() {
    const { g, p } = this;
    this.careless = Math.random() > this.diff.killCare;
    const vent = g.map.vents.filter((v) => Math.hypot(v.px - p.x, v.py - p.y) < 13 * T)
      .sort((a, b) => Math.hypot(a.px - p.x, a.py - p.y) - Math.hypot(b.px - p.x, b.py - p.y))[0];
    if (vent && Math.random() < this.diff.ventUse) {
      this.pending = { kind: 'vent', vent, at: g.time + 0.2 };
    } else {
      const far = g.map.stations.filter((s) => Math.hypot(s.px - p.x, s.py - p.y) > 15 * T);
      const s = pick(far.length ? far : g.map.stations);
      this.pending = { kind: 'flee', x: s.stand.px, y: s.stand.py, at: g.time, until: g.time + 20 };
    }
    this.clearGoal();
  }

  trySabotage() {
    const { g, p } = this;
    const sab = g.sabotage;
    const crewAlive = g.players.filter((q) => q.alive && !q.isImpostor).length;
    const options = [];
    if (sab.canTrigger('lights')) options.push(['lights', 3], ['gps', 1], ['machines', 1]);
    if (sab.canTrigger('critical') && crewAlive >= 3 && g.time > 40) options.push(['critical', 1.6]);
    if (sab.canTrigger('doors')) options.push(['doors', 1.5]);
    if (!options.length) return;
    let r = Math.random() * options.reduce((s, o) => s + o[1], 0);
    let type = options[0][0];
    for (const [t, w] of options) { r -= w; if (r <= 0) { type = t; break; } }
    if (type === 'doors') {
      const rooms = g.players.filter((q) => q.alive && !q.isImpostor).map((q) => g.roomAtPos(q.x, q.y)).filter((r) => r && !r.corridor);
      if (!rooms.length) return;
      sab.trigger('doors', p, pick(rooms).id);
    } else sab.trigger(type, p);
  }

  decideGhost() {
    const { g, p } = this;
    if (p.isImpostor) {
      if (Math.random() < this.diff.sabotageRate * 0.15) this.trySabotage();
      if (g.time >= this.idleUntil) this.wander();
      return;
    }
    if (g.time < this.idleUntil) return;
    this.doTasksOrWander();
  }

  // ---------------- reuniões ----------------
  onMeetingStart(st) {
    const { g, p } = this;
    this.clearGoal();
    this.pending = null;
    this.defenses = 0;
    if (!st.body || p.isImpostor || st.body.dummy) return;
    const bt = st.body.time;
    for (const q of g.players) {
      if (q === p || !q.alive) continue;
      for (const s of this.sightings[q.id] || []) {
        if (Math.abs(s.t - bt) > 9) continue;
        const d = Math.hypot(s.x - st.body.x, s.y - st.body.y);
        if (d < 7 * T) this.addSus(q.id, 28 * this.diff.observe);
        else if (d > 14 * T) this.addSus(q.id, -18);
      }
    }
  }

  addSus(id, v) { this.sus[id] = Math.max(-50, Math.min(100, (this.sus[id] || 0) + v)); }

  roomAt(t) {
    let r = null;
    for (const h of this.roomHistory) { if (h.t <= t) r = h.room; else break; }
    return r || this.p.lastRoomId;
  }

  meetingStatements(st) {
    const { g, p } = this;
    const out = [];
    let delay = rand(0.8, 2.5);
    const push = (text, effect = null, gap = rand(1.5, 4)) => { out.push({ delay, text, effect }); delay += gap; };
    const victim = st.victim;
    const roomP = (id) => g.roomPhrase(id);
    const aliveOthers = g.players.filter((q) => q.alive && q !== p);

    if (st.caller === p) {
      if (st.kind === 'report') push(`Achei ${victim.name} desacordado(a) ${roomP(st.body.room)}!`, null, 1.2);
      else {
        const w = this.witness.find((x) => x.type === 'vent');
        push(w ? 'Convoquei a reunião porque vi uma coisa muito estranha...' : 'Convoquei a reunião. Precisamos conversar.', null, 1.2);
      }
    }

    if (!p.isImpostor) {
      const kill = this.witness.find((w) => w.type === 'kill' && g.playerById(w.who).alive);
      if (kill) {
        const k = g.playerById(kill.who);
        push(`Foi ${k.name}! Eu vi ${k.name} derrubando ${g.playerById(kill.victim).name} ${roomP(kill.room)}!`, { target: k.id, strength: 70 }, 2);
      }
      const vent = this.witness.find((w) => w.type === 'vent' && g.playerById(w.who).alive);
      if (vent) {
        const v = g.playerById(vent.who);
        push(`${v.name} saiu de um duto de ventilação ${roomP(vent.room)}! Aluno normal não faz isso.`, { target: v.id, strength: 60 }, 2);
      }
      const clearedIds = Object.keys(this.cleared).map(Number).filter((id) => g.playerById(id).alive && g.playerById(id) !== p);
      if (clearedIds.length && Math.random() < 0.85) {
        const c = g.playerById(clearedIds[0]);
        const s = g.map.stationById[this.cleared[c.id].station];
        push(`Eu vi ${c.name} fazendo "${s.name.toLowerCase()}" ${roomP(s.room)}. Tarefa visual: ${c.name} é aluno(a) com certeza.`, { target: c.id, strength: -45 });
      }
      if (!kill && !vent) {
        const top = aliveOthers.map((q) => [q, this.sus[q.id] || 0]).sort((a, b) => b[1] - a[1])[0];
        if (top && top[1] >= 22) {
          const s = (this.sightings[top[0].id] || []).slice(-1)[0];
          push(`${top[0].name} estava ${roomP(s?.room || st.room)} perto da hora. Achei suspeito.`, { target: top[0].id, strength: 18 + top[1] * 0.2 });
        }
        const where = st.body ? this.roomAt(st.body.time) : p.lastRoomId;
        push(`Eu estava ${roomP(where)} fazendo minhas tarefas.`);
        const buddy = aliveOthers.map((q) => [q, this.together[q.id] || 0]).sort((a, b) => b[1] - a[1])[0];
        if (buddy && buddy[1] > 6 && Math.random() < 0.6) push(`${buddy[0].name} ficou um tempo comigo, acho que é de confiança.`, { target: buddy[0].id, strength: -12 });
        if (!top || top[1] < 22) push(Math.random() < 0.5 ? 'Não vi nada de estranho. Melhor pular se ninguém tiver prova.' : pick(HUMOR));
      }
    } else {
      // Impostor: álibi falso e possível acusação.
      let where = st.body ? this.roomAt(st.body.time - 6) : p.lastRoomId;
      if (st.body && where === st.body.room) {
        const others = g.map.rooms.filter((r) => !r.corridor && r.id !== st.body.room);
        where = pick(others).id;
      }
      const myTask = p.tasks.find((t) => t.done) || p.tasks[0];
      const taskName = myTask ? g.map.stationById[myTask.stationId].name.toLowerCase() : 'minhas tarefas';
      push(`Eu estava ${roomP(where)}, fui ${taskName.startsWith('fazer') ? '' : 'fazer: '}${taskName}.`);
      if (Math.random() < this.diff.lieSkill) {
        const crew = aliveOthers.filter((q) => !q.isImpostor);
        const nearBody = st.body ? crew.filter((q) => (this.sightings[q.id] || []).some((s) => Math.abs(s.t - st.body.time) < 15 && Math.hypot(s.x - st.body.x, s.y - st.body.y) < 9 * T)) : [];
        const target = pick(nearBody.length ? nearBody : crew);
        if (target) push(`Vi ${target.name} andando sozinho(a) ${roomP(st.room || target.lastRoomId)}... muito estranho.`, { target: target.id, strength: 22 });
      } else if (Math.random() < 0.4) push(pick(HUMOR));
    }
    return out;
  }

  hearStatement(speaker, targetId, strength) {
    const { g, p } = this;
    const st = g.meeting.state;
    if (targetId === p.id) {
      // Só rebate acusações de verdade (evita bots se defendendo em loop).
      if (strength >= 15) {
        if (!p.isImpostor) this.addSus(speaker.id, 15);
        if (this.defenses < 2 && st) {
          this.defenses++;
          const text = p.isImpostor
            ? pick(['Não fui eu! Eu estava fazendo tarefa!', `Isso é mentira, ${speaker.name}. Tá querendo me incriminar?`, 'Eu? Tá maluco(a)? Eu nem passei por lá.'])
            : pick(['Não fui eu! Eu juro que estava fazendo tarefa.', `${speaker.name}, por que você está me acusando? Suspeito...`, 'Eu sou aluno(a)! Confiem em mim.']);
          const effect = p.isImpostor ? { target: speaker.id, strength: 12 } : { target: speaker.id, strength: 10 };
          st.scheduled.push({ delay: st.t + rand(1, 2.5), text, effect, speaker: p });
          st.scheduled.sort((a, b) => a.delay - b.delay);
        }
      }
      return;
    }
    if (p.isImpostor) return;
    const cred = Math.max(0.1, Math.min(1, 1 - (this.sus[speaker.id] || 0) / 100));
    this.addSus(targetId, strength * cred * (0.6 + this.diff.observe * 0.4));
  }

  // Resposta a uma pergunta feita no chat livre ("Bruno, onde você estava?").
  answerQuestion(st, asker) {
    const { g, p } = this;
    let where = st.body ? this.roomAt(st.body.time) : p.lastRoomId;
    if (p.isImpostor && st.body && where === st.body.room) {
      const others = g.map.rooms.filter((r) => !r.corridor && r.id !== st.body.room);
      where = pick(others).id;
    }
    const buddy = g.players.filter((q) => q.alive && q !== p && q !== asker).sort((a, b) => (this.together[b.id] || 0) - (this.together[a.id] || 0))[0];
    const extra = buddy && (this.together[buddy.id] || 0) > 4 ? ` ${buddy.name} pode confirmar.` : '';
    return pick([`${asker.name}, eu estava ${g.roomPhrase(where)}.${extra}`, `Tava ${g.roomPhrase(where)} fazendo tarefa, ${asker.name}.${extra}`]);
  }

  voteTime(st) {
    const hasWitness = this.witness.some((w) => this.g.playerById(w.who).alive);
    return st.discussionEnd + (hasWitness ? rand(0.5, 2) : rand(2, this.g.settings.votingTime * 0.6));
  }

  decideVote(st) {
    const { g, p } = this;
    const others = g.players.filter((q) => q.alive && q !== p);
    if (!others.length) return 'skip';
    if (!p.isImpostor) {
      const best = others.map((q) => [q, this.sus[q.id] || 0]).sort((a, b) => b[1] - a[1])[0];
      if (best[1] >= this.diff.voteThreshold) return best[0].id;
      if (Math.random() < this.diff.randomVote) return pick(others).id;
      return 'skip';
    }
    const crew = others.filter((q) => !q.isImpostor);
    if (!crew.length) return 'skip';
    const acc = (q) => st.accusations[q.id] || 0;
    const teamHeat = g.players.filter((q) => q.alive && q.isImpostor).reduce((m, q) => Math.max(m, acc(q)), 0);
    const topCrew = [...crew].sort((a, b) => acc(b) - acc(a))[0];
    if (teamHeat >= 35) return acc(topCrew) > 0 ? topCrew.id : pick(crew).id;
    if (acc(topCrew) >= 20) return topCrew.id;
    return Math.random() < 0.2 ? pick(crew).id : 'skip';
  }

  onMeetingEnd(st) {
    const { g } = this;
    const ej = st.result?.ejected;
    for (const id of Object.keys(this.sus)) this.sus[id] *= 0.7;
    if (ej && g.settings.revealRoles && !ej.isImpostor) {
      // Quem empurrou um inocente perde credibilidade.
      for (const [voter, target] of Object.entries(st.votes)) if (Number(target) === ej.id) this.addSus(Number(voter), 8);
    }
    this.witness = this.witness.filter((w) => g.playerById(w.who).alive);
    for (const id of Object.keys(this.cleared)) if (!g.playerById(id).alive) delete this.cleared[id];
    this.pending = null;
    this.clearGoal();
    this.idleUntil = g.time + rand(0.5, 2);
    this.seenBodies.clear();
  }
}
