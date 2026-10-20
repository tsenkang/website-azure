// Controlador do aplicativo: telas, loop principal e ligação entre lógica, renderização, UI, áudio e rede.
import { DEFAULT_SETTINGS, PLAYER_COLORS } from './config.js';
import { Game } from './core/game.js';
import { randomLook } from './core/player.js';
import { MAPS, MAP_LIST } from './core/maps/index.js';
import { Renderer } from './render/renderer.js';
import { Input } from './input.js';
import { audio } from './audio.js';
import { Hud, toast } from './ui/hud.js';
import { MeetingUI } from './ui/meetingUI.js';
import { openMinigame } from './ui/minigames.js';
import { Tutorial } from './ui/tutorial.js';
import { SABOTAGES } from './core/sabotage.js';
import { RANDOM_EVENTS } from './core/events.js';
import { NetClient, defaultServerUrl } from './net/client.js';
import * as screens from './ui/screens.js';

const STORE_KEY = 'senai-suspeitos-v2';
function loadPrefs() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } }
function savePrefs() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ profile: app.profile, settings: app.settings, volume: audio.volume, muted: audio.muted, server: app.serverUrl })); } catch { /* armazenamento indisponível */ }
}

const prefs = loadPrefs();
const app = {
  profile: prefs.profile || { name: 'Você', look: randomLook(PLAYER_COLORS[0].id) },
  settings: { ...DEFAULT_SETTINGS, ...(prefs.settings || {}) },
  serverUrl: new URLSearchParams(location.search).get('server') || prefs.server || defaultServerUrl(),
  game: null,
  demo: null, // partida de bots rodando atrás do menu
  ctl: null, // ações do jogador (local ou online)
  net: null,
  bots: null,
  panel: null,
  minigame: null,
  tutorial: null,
  pauseEl: null,
  lobbyUI: null,
  stepT: 0,
  ambientT: 0,
  meetingTick: 0,
};
if (!MAPS[app.settings.map]) app.settings.map = 'unidade';
audio.setVolume(prefs.volume ?? 0.7);
audio.setMuted(!!prefs.muted);

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const input = new Input();
const hud = new Hud((a) => action(a));
const meetingUI = new MeetingUI();
input.attachJoystick(document.getElementById('joy-zone'), document.getElementById('joy-knob'), document.getElementById('joy-base'));
window.addEventListener('resize', () => renderer.resize());

// ---------------- controladores de ação ----------------
function localController(g) {
  const me = g.local;
  return {
    report: (b) => g.report(me, b),
    kill: (t) => g.tryKill(me, t),
    ventEnter: () => g.enterVent(me),
    ventMove: (id) => g.moveVent(me, id),
    ventExit: () => g.exitVent(me),
    emergency: () => g.callEmergency(me),
    taskOpen: (s) => g.startBusy(me, 'minigame', Infinity, { stationId: s.id }),
    taskDone: (s) => { me.busy = null; return g.completeTask(me, s.id); },
    fake: (s) => g.startBusy(me, 'fake', 2.5 + Math.random() * 2, { stationId: s.id }),
    fixOpen: (f) => g.startBusy(me, 'minigame', Infinity, { fixId: f.id }),
    fixDone: (f) => { me.busy = null; g.sabotage.fix(f.id, me); },
    panelOpen: (kind) => g.startBusy(me, 'minigame', Infinity, { panel: kind }),
    close: () => { if (me.busy?.kind === 'minigame') me.busy = null; },
    sabotage: (type, room) => g.sabotage.trigger(type, me, room),
    vote: (t) => g.meeting.castVote(me, t),
    chat: (text) => g.meeting.chat(me, text),
    quick: (kind, t) => g.meeting.humanSay(kind, t, me),
  };
}

function netController(g, net) {
  const me = g.local;
  return {
    report: () => net.send('report'),
    kill: (t) => net.send('kill', { target: t.id }),
    ventEnter: () => net.send('ventEnter'),
    ventMove: (id) => net.send('ventMove', { to: id }),
    ventExit: () => net.send('ventExit'),
    emergency: () => net.send('emergency'),
    taskOpen: (s) => { g.startBusy(me, 'minigame', Infinity, { stationId: s.id }); net.send('taskOpen', { stationId: s.id }); },
    taskDone: (s) => { me.busy = null; net.send('taskDone', { stationId: s.id }); return true; },
    fake: (s) => { g.startBusy(me, 'fake', 3, { stationId: s.id }); net.send('taskOpen', { stationId: s.id }); },
    fixOpen: (f) => { g.startBusy(me, 'minigame', Infinity, { fixId: f.id }); net.send('fixOpen', { fixId: f.id }); },
    fixDone: (f) => { me.busy = null; net.send('fixDone', { fixId: f.id }); },
    panelOpen: (kind) => { g.startBusy(me, 'minigame', Infinity, { panel: kind }); net.send('panelOpen', { kind }); },
    close: () => { if (me.busy?.kind === 'minigame') me.busy = null; net.send('close'); },
    sabotage: (type, room) => { if (!g.sabotage.canTrigger(type)) return false; net.send('sabotage', { sab: type, room }); return true; },
    vote: (t) => { net.send('vote', { target: t }); return true; },
    chat: (text) => net.send('chat', { text }),
    quick: (kind, t) => net.send('quick', { kind, target: t }),
  };
}

// ---------------- partida de fundo do menu ----------------
function startDemo() {
  const demo = new Game({ settings: { ...DEFAULT_SETTINGS, map: MAP_LIST[Math.floor(Math.random() * MAP_LIST.length)].id, players: 9, impostors: 2, discussionTime: 2, votingTime: 4 }, allBots: true });
  demo.demoFollow = 0;
  app.demo = demo;
  renderer.setGame(demo);
  renderer.demo = true;
}

// ---------------- fluxo de telas ----------------
function toMenu() {
  teardown();
  hud.hide();
  startDemo();
  screens.showMenu({
    onPlay: toLobby,
    onOnline: toOnline,
    onTutorial: () => startMatch({ tutorial: true }),
    onHelp: () => screens.showHelp(),
    onlineAvailable: !!app.serverUrl,
  });
}

function toLobby() {
  teardown();
  hud.hide();
  if (!app.demo) startDemo();
  screens.showLobby({
    profile: app.profile,
    settings: app.settings,
    onBack: toMenu,
    onChange: savePrefs,
    onStart: (bots) => { app.bots = bots; savePrefs(); startMatch({}); },
  });
}

function teardown(keepNet = false) {
  closePanel();
  closeMinigame();
  meetingUI.close();
  if (app.tutorial) { app.tutorial.destroy(false); app.tutorial = null; }
  if (app.pauseEl) { app.pauseEl.remove(); app.pauseEl = null; }
  audio.stopAlarm();
  audio.stopAmbient();
  app.game = null;
  app.ctl = null;
  app.demo = null;
  renderer.game = null;
  renderer.demo = false;
  if (!keepNet && app.net) { app.net.leave(); app.net = null; }
  app.lobbyUI = null;
  document.getElementById('screens').innerHTML = '';
  document.getElementById('toasts').innerHTML = '';
}

function startMatch({ tutorial = false }) {
  teardown();
  const settings = tutorial ? { ...app.settings, map: 'unidade' } : app.settings;
  const game = new Game({ settings, human: { name: app.profile.name, look: app.profile.look }, tutorial, bots: tutorial ? null : app.bots });
  beginGame(game, localController(game), () => {
    if (tutorial) app.tutorial = new Tutorial(game, renderer, { onFinish: () => { app.tutorial = null; toMenu(); }, isMapOpen: () => app.panel?.kind === 'map' });
  });
}

function beginGame(game, ctl, onRevealDone) {
  app.game = game;
  app.ctl = ctl;
  renderer.demo = false;
  renderer.setGame(game);
  hud.attach(game, renderer);
  bindGameEvents(game);
  if (game.mode === 'local') game.paused = true;
  screens.showRoleReveal(game, () => {
    if (app.game !== game) return;
    game.paused = false;
    onRevealDone && onRevealDone();
  });
}

// ---------------- online ----------------
function toOnline() {
  teardown();
  hud.hide();
  startDemo();
  const entry = screens.showOnlineEntry({
    profile: app.profile,
    serverUrl: app.serverUrl,
    onChange: savePrefs,
    onBack: toMenu,
    onCreate: async (url) => { await connect(url); app.net.create(app.profile); },
    onJoin: async (url, code) => { await connect(url); app.net.join(code, app.profile); },
  });
  app.onlineEntry = entry;
}

async function connect(url) {
  const target = url || defaultServerUrl();
  if (!target) throw new Error('Informe o endereço do servidor (ex.: wss://seu-jogo.onrender.com/ws).');
  if (app.net) app.net.leave();
  const net = new NetClient(target);
  await net.connect();
  app.serverUrl = url;
  savePrefs();
  app.net = net;
  net.on('error', (e) => {
    if (app.onlineEntry && document.contains(app.onlineEntry.el)) app.onlineEntry.error(e.message);
    else toast(e.message, 'bad', 5000);
    if (e.fatal) toMenu();
  });
  net.on('joined', () => { if (app.onlineEntry) { app.onlineEntry.close(); app.onlineEntry = null; } });
  net.on('room', (room) => {
    if (room.state === 'lobby' && !app.lobbyUI) {
      // Também cobre a volta ao lobby depois do fim da partida.
      if (app.game) { closePanel(); closeMinigame(); meetingUI.close(); app.game = null; app.ctl = null; renderer.game = null; hud.hide(); document.getElementById('screens').innerHTML = ''; }
      showOnlineLobby();
    } else if (app.lobbyUI) app.lobbyUI.update(room);
  });
  net.on('start', (game) => {
    if (app.lobbyUI) { app.lobbyUI.close(); app.lobbyUI = null; }
    teardown(true);
    beginGame(game, netController(game, net));
  });
  net.on('connection', ({ state }) => {
    if (state === 'lost') hud.netState('Conexão perdida... reconectando');
    if (state === 'back') { hud.netState(null); toast('Conexão restabelecida.', 'ok'); }
    if (state === 'gone') { toast('Não foi possível reconectar ao servidor.', 'bad', 6000); app.net = null; toMenu(); }
  });
  return net;
}

function showOnlineLobby() {
  const net = app.net;
  document.getElementById('screens').querySelectorAll('.end-screen').forEach((e) => e.remove());
  if (!app.demo && !app.game) startDemo();
  app.lobbyUI = screens.showOnlineLobby({
    net,
    profile: app.profile,
    onProfile: savePrefs,
    onLeave: () => { net.leave(); app.net = null; app.lobbyUI = null; toMenu(); },
  });
}

// ---------------- eventos da partida ----------------
function bindGameEvents(game) {
  const me = game.local;
  const seesPoint = (x, y) => !me.alive || game.canSee(me, { x, y });

  game.on('kill', ({ killer, target, body, witnesses }) => {
    if (target === me) {
      closeMinigame(); closePanel();
      audio.kill();
      renderer.addEffect({ type: 'puff', x: body.x, y: body.y, dur: 0.9 });
      if (game.mode === 'local') game.paused = true;
      screens.showDeath(killer, target, () => {
        if (app.game !== game) return;
        game.paused = false;
        hud.ghostNote(me.isImpostor ? '' : 'Você é um espectro: atravesse paredes e termine suas tarefas para ajudar a turma.');
      });
    } else if (killer === me || witnesses.includes(me) || seesPoint(body.x, body.y)) {
      audio.kill();
      renderer.addEffect({ type: 'puff', x: body.x, y: body.y, dur: 0.9 });
    }
  });
  for (const name of ['ventEnter', 'ventExit']) {
    game.on(name, ({ p, vent }) => {
      if (p === me || seesPoint(vent.px, vent.py)) { renderer.addEffect({ type: 'vent', x: vent.px, y: vent.py, dur: 0.8 }); audio.vent(); }
      if (p === me && name === 'ventEnter') closePanel();
    });
  }
  game.on('ventMove', ({ p }) => { if (p === me) audio.tone(160, 0.12, { type: 'square', vol: 0.06 }); });
  game.on('taskDone', ({ p }) => { if (p === me) renderer.addEffect({ type: 'sparkle', x: me.x, y: me.y, dur: 0.9 }); });
  game.on('taskStep', ({ p, task }) => {
    if (p !== me || !task) return;
    const next = game.map.stationById[task.stationId];
    toast(task.readyAt ? `Etapa concluída! Volte em ${Math.ceil(task.readyAt - game.time)}s para terminar.` : `Etapa ${task.step}/${task.stations.length} concluída! Próxima: ${next.name} (${game.roomName(next.room)}).`, 'ok', 4000);
  });
  game.on('sabotage', ({ type }) => {
    const def = SABOTAGES[type];
    if (type === 'lights') audio.lightsOff(); else audio.sabotage();
    if (def.critical) audio.startAlarm();
    toast(`${def.name}!`, 'bad');
    if (type === 'machines' && app.minigame?.station?.machine) { closeMinigame(); toast('As máquinas pararam no meio da tarefa!', 'bad'); }
  });
  game.on('sabotageEnd', ({ type, who }) => {
    audio.stopAlarm();
    if (who) { audio.fixed(); toast(`${SABOTAGES[type].name} resolvido por ${who.name}`, 'ok'); }
  });
  game.on('fixPart', ({ fixId, who }) => { if (who && who !== me && game.sabotage.active) toast(`${who.name} estabilizou: ${game.map.fixById[fixId].name}`); });
  game.on('doors', ({ room, locked }) => {
    const here = game.roomAtPos(me.x, me.y)?.id === room;
    if (locked && (here || me.isImpostor)) { toast(`Portas trancadas: ${game.roomName(room)}`, 'bad'); audio.sabotage(); }
  });
  game.on('randomEvent', ({ id }) => { const def = RANDOM_EVENTS[id]; toast(`${def.name} ${def.desc}`, 'info', 5000); audio.bell(); });
  game.on('netNotice', ({ text }) => toast(text, 'info', 4500));
  game.on('meetingStart', (st) => {
    closeMinigame(); closePanel();
    audio.stopAlarm();
    if (st.kind === 'report') audio.report(); else audio.bell();
    hud.hide();
    meetingUI.open(game, st, app.ctl);
  });
  game.on('chat', (msg) => meetingUI.addChat(msg));
  game.on('vote', ({ voter }) => { if (voter !== me) audio.tone(420, 0.06, { type: 'triangle', vol: 0.08 }); meetingUI.refresh(); });
  game.on('votingStart', () => { audio.vote(); meetingUI.refresh(); });
  game.on('votingEnd', (result) => meetingUI.showResults(result));
  game.on('eject', (result) => meetingUI.showEject(result));
  game.on('meetingEnd', () => {
    meetingUI.close();
    if (game.phase !== 'ended') hud.show();
    hud.ghostNote(!me.alive ? (me.ejected ? 'Você foi encaminhado(a) à coordenação. Assista ao resto da aula como espectro.' : me.isImpostor ? '' : 'Você é um espectro: termine suas tarefas para ajudar a turma.') : '');
  });
  game.on('end', () => {
    closeMinigame(); closePanel();
    audio.stopAlarm();
    setTimeout(() => {
      if (app.game !== game) return;
      meetingUI.close();
      hud.hide();
      audio.stopAmbient();
      document.querySelectorAll('.death-screen, .modal-screen').forEach((e) => e.remove());
      document.getElementById('toasts').innerHTML = '';
      if (app.pauseEl) { app.pauseEl.remove(); app.pauseEl = null; }
      const online = game.mode === 'mirror' ? { isHost: app.net?.isHost } : null;
      screens.showEnd(game, {
        online,
        onRematch: () => startMatch({}),
        onLobby: () => { if (online) app.net?.send('backToLobby'); else toLobby(); },
        onMenu: toMenu,
      });
    }, game.meeting.active ? 0 : 1200);
  });
}

// ---------------- ações do jogador ----------------
function action(name) {
  const g = app.game;
  if (!g || g.phase !== 'play' || g.paused) {
    if (name === 'pause' && g && g.phase === 'play') togglePause();
    return;
  }
  const me = g.local;
  const ctl = app.ctl;
  if (app.minigame && name !== 'pause') return;
  audio.init();
  if (me.inVent) {
    if (name === 'vent' || name === 'use') ctl.ventExit();
    else if (name === 'pause') togglePause();
    else if (name === 'sabotage') openPanel('sabotage');
    return;
  }
  const it = g.interactionsFor(me);
  switch (name) {
    case 'use': {
      const u = it.use;
      if (!u || u.disabled) { if (u?.disabled) audio.error(); return; }
      if (u.kind === 'task') startTaskMinigame(u.station);
      else if (u.kind === 'fake') { if (!me.busy) ctl.fake(u.station); }
      else if (u.kind === 'blocked') { audio.error(); toast('Essa máquina está parada. Reinicie o CLP.', 'bad'); }
      else if (u.kind === 'fix') startFixMinigame(u.fix);
      else if (u.kind === 'emergency') ctl.emergency();
      else if (u.kind === 'cameras' || u.kind === 'admin') openPanel(u.kind);
      break;
    }
    case 'report': if (it.report) ctl.report(it.report); break;
    case 'kill': if (it.kill) ctl.kill(it.kill); break;
    case 'vent': if (it.vent) ctl.ventEnter(); break;
    case 'sabotage': if (me.isImpostor) openPanel('sabotage'); break;
    case 'map': app.panel?.kind === 'map' ? closePanel() : openPanel('map'); break;
    case 'pause': togglePause(); break;
    default: break;
  }
}

// Dentro do duto: escolhe a saída na direção pressionada.
function ventDirection(dx, dy) {
  const g = app.game;
  if (!g || !g.local.inVent) return;
  const want = Math.atan2(dy, dx);
  let best = null, bd = Infinity;
  for (const a of renderer.ventArrows) {
    const d = Math.abs(Math.atan2(Math.sin(a.ang - want), Math.cos(a.ang - want)));
    if (d < bd) { bd = d; best = a; }
  }
  if (best && bd < 1.2) app.ctl.ventMove(best.id);
}

canvas.addEventListener('pointerdown', (e) => {
  const g = app.game;
  if (!g || !g.local.inVent) return;
  const hit = renderer.ventArrows.find((a) => Math.hypot(a.x - e.clientX, a.y - e.clientY) < 34);
  if (hit) app.ctl.ventMove(hit.id);
});

function startTaskMinigame(station) {
  const g = app.game, ctl = app.ctl;
  const task = g.local.tasks.find((t) => t.stationId === station.id && !t.done);
  ctl.taskOpen(station);
  const m = openMinigame(station.task, {
    title: station.name,
    variant: station.variant,
    phase: task && task.stations[task.step - 1] === station.id ? 1 : 0,
    subtitle: station.visual && g.settings.visualTasks ? 'Tarefa visual: quem estiver por perto vê você fazendo.' : undefined,
    onComplete: () => {
      app.minigame = null;
      if (!ctl.taskDone(station)) toast('A tarefa não pôde ser registrada agora.', 'bad');
    },
    onClose: () => { app.minigame = null; ctl.close(); },
  });
  app.minigame = { ...m, station };
}

const FIX_GAMES = { lights: ['switches', 'Religar o quadro de energia'], gps: ['keypad', 'Reiniciar o servidor'], machines: ['wires', 'Reconectar o CLP'], critA: ['hold', 'Estabilizar a subestação'], critB: ['hold', 'Estabilizar a subestação'] };

function startFixMinigame(fix) {
  const ctl = app.ctl;
  const [type, title] = FIX_GAMES[fix.id];
  ctl.fixOpen(fix);
  const m = openMinigame(type, {
    title, subtitle: fix.name, variant: fix.id,
    onComplete: () => { app.minigame = null; ctl.fixDone(fix); },
    onClose: () => { app.minigame = null; ctl.close(); },
  });
  app.minigame = { ...m, fix };
}

function closeMinigame() {
  if (!app.minigame) return;
  const m = app.minigame;
  app.minigame = null;
  m.close();
}

function openPanel(kind) {
  const g = app.game;
  closePanel();
  if (kind === 'map' || kind === 'sabotage' || kind === 'admin') {
    if (kind === 'admin') app.ctl.panelOpen('admin');
    const p = screens.showMapPanel(g, renderer, {
      mode: kind,
      onSabotage: (type, room) => app.ctl.sabotage(type, room),
      onClose: () => { if (kind === 'admin') app.ctl?.close(); app.panel = null; },
    });
    app.panel = { kind, close: p.close };
  } else if (kind === 'cameras') {
    app.ctl.panelOpen('cameras');
    const p = screens.showCameras(g, renderer, () => { app.panel = null; app.ctl?.close(); });
    app.panel = { kind, close: p.close };
  }
}

function closePanel() {
  if (!app.panel) return;
  const p = app.panel;
  app.panel = null;
  p.close();
}

function togglePause() {
  const g = app.game;
  if (!g || g.phase !== 'play') return;
  const online = g.mode === 'mirror';
  if (app.pauseEl) { app.pauseEl.remove(); app.pauseEl = null; if (!online) g.paused = false; return; }
  if (!online) g.paused = true;
  app.pauseEl = screens.showPause({
    online,
    volume: audio.volume, muted: audio.muted,
    onVolume: (v) => { audio.setVolume(v); savePrefs(); },
    onMute: (m) => { audio.setMuted(m); savePrefs(); },
    onResume: () => { app.pauseEl = null; if (!online) g.paused = false; },
    onHelp: () => screens.showHelp(),
    onQuit: () => { app.pauseEl = null; toMenu(); },
  });
}

// ---------------- atalhos de teclado ----------------
input.on('e', () => action('use'));
input.on('r', () => action('report'));
input.on('q', () => action('kill'));
input.on('v', () => action('vent'));
input.on('f', () => action('sabotage'));
input.on('m', () => action('map'));
input.on('tab', (e) => { e.preventDefault(); action('map'); });
for (const [keys, dx, dy] of [[['w', 'arrowup'], 0, -1], [['s', 'arrowdown'], 0, 1], [['a', 'arrowleft'], -1, 0], [['d', 'arrowright'], 1, 0]]) {
  for (const k of keys) input.on(k, () => ventDirection(dx, dy));
}
input.on('escape', () => {
  if (app.minigame) { closeMinigame(); return; }
  if (app.panel) { closePanel(); return; }
  const modal = document.querySelector('.modal-screen:not(.map-screen)');
  if (modal && !app.pauseEl) { modal.remove(); return; }
  action('pause');
});

// ---------------- loop principal ----------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const g = app.game;
  if (g) {
    const blocked = !!app.minigame || !!app.panel || (app.pauseEl && g.mode !== 'mirror') || g.local.inVent;
    g.input = blocked ? { x: 0, y: 0 } : input.axis();
    g.update(dt);
    if (g.mode === 'mirror') {
      // Tarefa falsa no online: o progresso é só visual no cliente.
      const b = g.local.busy;
      if (b && b.kind === 'fake') { b.t += dt; if (b.t >= b.dur) { g.local.busy = null; g.fakeStep(g.local, b.stationId); } }
      app.net?.tick(dt);
    }
    if (g.phase === 'meeting') {
      app.meetingTick += dt;
      if (app.meetingTick > 0.2) { app.meetingTick = 0; meetingUI.refresh(); }
    }
    renderer.render(g.paused ? 0 : dt);
    if (g.phase === 'play') hud.update();
    if (app.tutorial) app.tutorial.update();

    const me = g.local;
    if (me.moving && me.alive && !g.paused) {
      app.stepT -= dt;
      if (app.stepT <= 0) { audio.step(); app.stepT = 0.3; }
    }
    app.ambientT -= dt;
    if (app.ambientT <= 0 && g.phase === 'play') {
      app.ambientT = 0.25;
      const room = g.roomAtPos(me.x, me.y)?.id;
      audio.setAmbientRoom(room);
      audio.ambientTick(room);
    }
  } else if (app.demo) {
    // Menu: a câmera passeia seguindo os bots da partida de fundo.
    const d = app.demo;
    d.update(dt);
    if (d.phase === 'ended') { startDemo(); }
    else {
      d.demoT = (d.demoT || 0) - dt;
      if (d.demoT <= 0 || !d.players[d.demoFollow]?.alive) {
        const alive = d.players.filter((p) => p.alive && !p.inVent);
        d.demoFollow = d.players.indexOf(alive[Math.floor(Math.random() * alive.length)]);
        d.demoT = 9;
      }
      d.local = d.players[d.demoFollow] || d.players[0];
      renderer.render(dt);
    }
  }
  requestAnimationFrame(frame);
}

window.addEventListener('pointerdown', () => audio.init(), { once: true });
window.addEventListener('keydown', () => audio.init(), { once: true });

// Ganchos para testes automatizados.
window.__senai = { app, action, startMatch, toMenu, toLobby, toOnline, connect };

toMenu();
requestAnimationFrame(frame);
