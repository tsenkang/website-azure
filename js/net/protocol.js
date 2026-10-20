// Protocolo online compartilhado: o servidor monta o estado de cada jogador (sem vazar segredos)
// e o cliente aplica esse estado na cópia local da partida (modo 'mirror').
import { TILE as T } from '../config.js';
import { setRoomDoorsLocked } from '../core/map.js';

const r1 = (v) => Math.round(v * 10) / 10;

// Quem o espectador pode receber: vivos não recebem fantasmas; ninguém recebe quem está no duto.
function visibleTo(game, viewer, p) {
  if (p === viewer) return true;
  if (p.inVent) return false;
  if (!p.alive) return viewer && !viewer.alive && !p.ejected;
  return true;
}

export function buildSnapshot(game, viewer) {
  const sab = game.sabotage;
  const snap = {
    t: r1(game.time),
    ph: game.phase,
    pl: game.players.filter((p) => visibleTo(game, viewer, p)).map((p) => {
      const vis = game.visualTaskOf(p);
      return [p.id, r1(p.x), r1(p.y), p.facing, p.moving ? 1 : 0, p.alive ? 1 : 0, p.ejected ? 1 : 0, vis ? vis.id : 0, p.disconnected ? 1 : 0];
    }),
    bd: game.bodies.map((b) => [b.id, b.playerId, r1(b.x), r1(b.y), b.room || '', b.time]),
    tp: [game.taskProgress().done, game.taskProgress().total],
    sb: sab.active ? { ty: sab.active.type, rm: r1(sab.active.remaining), fx: sab.active.fixed } : null,
    dl: { ...sab.doorLocks },
    ev: game.events.active ? { id: game.events.active.id, rem: r1(game.events.active.remaining), zone: game.events.active.zone } : null,
    ec: r1(game.emergencyCooldown),
  };
  if (viewer) {
    snap.me = {
      kc: r1(viewer.killCooldown), eu: viewer.emergencyUses, vc: r1(viewer.ventCooldown), iv: viewer.inVent || 0,
      al: viewer.alive ? 1 : 0, x: r1(viewer.x), y: r1(viewer.y),
      tk: viewer.tasks.map((t) => [t.stations[0], t.done ? 1 : 0, t.step, r1(t.readyAt || 0)]), bz: viewer.busy ? viewer.busy.kind : 0,
    };
    if (viewer.isImpostor) { snap.sc = r1(sab.cooldown); snap.dc = r1(sab.doorCooldown); }
  }
  if (game.meeting.state) {
    const st = game.meeting.state;
    snap.mt = { t: r1(st.t), ph: st.phase, voted: Object.keys(st.votes).map(Number) };
  }
  return snap;
}

// Dados iniciais enviados a cada jogador quando a partida começa (ou quando ele reconecta).
export function buildInit(game, viewer) {
  return {
    map: game.map.id,
    settings: game.settings,
    // Só revela mortes que o jogador já conhece (expulsões, reuniões anteriores ou se ele também é espectro).
    players: game.players.map((p) => {
      const knownDead = !p.alive && (p.ejected || p === viewer || !viewer.alive || (p.deathTime != null && p.deathTime < (game.lastMeetingAt ?? -1)));
      return { id: p.id, name: p.name, look: p.look, isBot: !p.human, alive: !knownDead, ejected: !!p.ejected };
    }),
    you: {
      id: viewer.id,
      role: viewer.role,
      tasks: viewer.tasks.map((t) => ({ stationId: t.stationId, stations: t.stations, step: t.step, done: t.done, readyAt: t.readyAt || 0 })),
      teammates: viewer.isImpostor ? game.players.filter((p) => p.isImpostor && p !== viewer).map((p) => p.id) : [],
      alive: viewer.alive,
    },
    phase: game.phase,
  };
}

export function meetingPayload(game, st) {
  return {
    kind: st.kind,
    caller: st.caller.id,
    victim: st.victim ? st.victim.id : null,
    room: st.room,
    body: st.body ? { id: st.body.id, playerId: st.body.playerId, x: st.body.x, y: st.body.y, room: st.body.room } : null,
    discussionEnd: st.discussionEnd,
    votingEnd: st.votingEnd,
    dead: game.players.filter((p) => !p.alive).map((p) => [p.id, p.ejected ? 1 : 0]),
    chat: st.chat.map((c) => [c.id, c.text]),
    t: st.t,
    phase: st.phase,
    voted: Object.keys(st.votes).map(Number),
  };
}

export function resultPayload(game, result) {
  const st = game.meeting.state;
  const ej = result.ejected;
  return {
    counts: result.counts,
    skip: result.skip,
    tie: result.tie,
    votes: result.votes,
    ejected: ej ? ej.id : null,
    ejectedRole: ej && game.settings.revealRoles ? ej.role : null,
    impostorsLeft: game.settings.revealRoles ? game.players.filter((p) => p.alive && p.isImpostor && p !== ej).length : null,
    t: st ? st.t : 0,
  };
}

export function revealPayload(game) {
  return {
    result: { winner: game.result.winner, reason: game.result.reason, duration: game.result.duration, meetings: game.result.meetings, progress: game.result.progress },
    players: game.players.map((p) => ({
      id: p.id, role: p.role, alive: p.alive, ejected: p.ejected, stats: p.stats,
      tasks: p.tasks.map((t) => ({ stationId: t.stationId, stations: t.stations, step: t.step, done: t.done, readyAt: t.readyAt || 0 })),
    })),
    log: game.log,
  };
}

// ---------------- lado do cliente ----------------

export function applySnapshot(game, snap) {
  const me = game.local;
  const seen = new Set();
  for (const [id, x, y, f, m, alive, ejected, vis, disc] of snap.pl) {
    const p = game.playerById(id);
    if (!p) continue;
    seen.add(id);
    p.netHidden = false;
    p.netX = x; p.netY = y;
    p.alive = !!alive; p.ejected = !!ejected;
    p.netVisual = vis || null;
    p.disconnected = !!disc;
    if (p !== me) { p.facing = f; p.moving = !!m; }
  }
  for (const p of game.players) if (!seen.has(p.id) && p !== me) p.netHidden = true;

  game.bodies = snap.bd.map(([id, playerId, x, y, room, time]) => ({ id, playerId, x, y, room: room || null, time }));
  game.netProgress = { done: snap.tp[0], total: snap.tp[1] };
  game.emergencyCooldown = snap.ec;
  game.time = snap.t;

  const sab = game.sabotage;
  sab.active = snap.sb ? { type: snap.sb.ty, remaining: snap.sb.rm, fixed: snap.sb.fx, t: 0 } : null;
  const locked = snap.dl || {};
  for (const room of new Set([...Object.keys(sab.doorLocks), ...Object.keys(locked)])) {
    const was = room in sab.doorLocks, now = room in locked;
    if (was !== now) setRoomDoorsLocked(game.map, room, now);
  }
  sab.doorLocks = locked;
  if (snap.sc != null) sab.cooldown = snap.sc;
  if (snap.dc != null) sab.doorCooldown = snap.dc;
  game.events.active = snap.ev ? { id: snap.ev.id, remaining: snap.ev.rem, zone: snap.ev.zone } : null;

  if (snap.me && me) {
    const s = snap.me;
    me.killCooldown = s.kc; me.emergencyUses = s.eu; me.ventCooldown = s.vc;
    me.alive = !!s.al;
    const wasInVent = me.inVent;
    me.inVent = s.iv || null;
    // A posição do jogador local é prevista no cliente; o servidor só corrige diferenças grandes.
    if (me.inVent || wasInVent !== me.inVent || Math.hypot(s.x - me.x, s.y - me.y) > 2.5 * T) { me.x = s.x; me.y = s.y; }
    for (const [firstId, done, step, readyAt] of s.tk) {
      const t = me.tasks.find((x) => x.stations[0] === firstId);
      if (!t) continue;
      t.done = !!done; t.step = step; t.stationId = t.stations[step]; t.readyAt = readyAt;
    }
    if (!s.bz && me.busy && me.busy.kind !== 'minigame') me.busy = null;
  }
  if (snap.mt && game.meeting.state) {
    const st = game.meeting.state;
    st.t = snap.mt.t;
    if (st.phase !== 'results' && st.phase !== 'eject') st.phase = snap.mt.ph;
    for (const id of snap.mt.voted) if (!(id in st.votes)) st.votes[id] = '?';
  }
}

export function meetingFromPayload(game, m) {
  for (const [id, ejected] of m.dead) {
    const p = game.playerById(id);
    if (p) { p.alive = false; p.ejected = !!ejected; }
  }
  const st = {
    kind: m.kind,
    caller: game.playerById(m.caller),
    victim: m.victim != null ? game.playerById(m.victim) : null,
    room: m.room,
    body: m.body,
    t: m.t || 0,
    phase: m.phase || 'discussion',
    discussionEnd: m.discussionEnd,
    votingEnd: m.votingEnd,
    votes: Object.fromEntries((m.voted || []).map((id) => [id, '?'])),
    chat: [],
    accusations: {},
    scheduled: [],
    result: null,
    phaseT: 0,
  };
  for (const [id, text] of m.chat || []) st.chat.push({ id, name: game.playerById(id)?.name, text, t: 0 });
  return st;
}
