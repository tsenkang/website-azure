// Controlador do aplicativo: telas, loop principal e ligação entre lógica, renderização, UI e áudio.
import { DEFAULT_SETTINGS, PLAYER_COLORS } from './config.js';
import { Game } from './core/game.js';
import { randomLook } from './core/player.js';
import { Renderer } from './render/renderer.js';
import { Input } from './input.js';
import { audio } from './audio.js';
import { Hud, toast } from './ui/hud.js';
import { MeetingUI } from './ui/meetingUI.js';
import { openMinigame } from './ui/minigames.js';
import { Tutorial } from './ui/tutorial.js';
import { SABOTAGES } from './core/sabotage.js';
import * as screens from './ui/screens.js';

const STORE_KEY = 'senai-suspeitos-v1';
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}
function savePrefs() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ profile: app.profile, settings: app.settings, volume: audio.volume, muted: audio.muted })); } catch { /* armazenamento indisponível */ }
}

const prefs = loadPrefs();
const app = {
  profile: prefs.profile || { name: 'Você', look: randomLook(PLAYER_COLORS[0].id) },
  settings: { ...DEFAULT_SETTINGS, ...(prefs.settings || {}) },
  game: null,
  bots: null,
  panel: null, // janela aberta (mapa, câmeras, sabotagem, pausa)
  minigame: null,
  tutorial: null,
  stepT: 0,
  ambientT: 0,
};
audio.setVolume(prefs.volume ?? 0.7);
audio.setMuted(!!prefs.muted);

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const input = new Input();
const hud = new Hud((a) => action(a));
const meetingUI = new MeetingUI();
input.attachJoystick(document.getElementById('joy-zone'), document.getElementById('joy-knob'), document.getElementById('joy-base'));
window.addEventListener('resize', () => renderer.resize());

// ---------------- fluxo de telas ----------------
function toMenu() {
  teardown();
  hud.hide();
  screens.showMenu({ onPlay: toLobby, onTutorial: () => startMatch(true), onHelp: () => screens.showHelp() });
}

function toLobby() {
  teardown();
  hud.hide();
  screens.showLobby({
    profile: app.profile,
    settings: app.settings,
    onBack: toMenu,
    onChange: savePrefs,
    onStart: (bots) => { app.bots = bots; savePrefs(); startMatch(false); },
  });
}

function teardown() {
  closePanel();
  closeMinigame();
  meetingUI.close();
  if (app.tutorial) { app.tutorial.destroy(false); app.tutorial = null; }
  audio.stopAlarm();
  audio.stopAmbient();
  app.game = null;
  renderer.game = null;
  document.getElementById('screens').innerHTML = '';
}

function startMatch(tutorial) {
  teardown();
  const game = new Game({
    settings: app.settings,
    human: { name: app.profile.name, look: app.profile.look },
    tutorial,
    bots: tutorial ? null : app.bots,
  });
  app.game = game;
  renderer.setGame(game);
  hud.attach(game, renderer);
  bindGameEvents(game);
  game.paused = true;
  screens.showRoleReveal(game, () => {
    if (app.game !== game) return;
    game.paused = false;
    if (tutorial) app.tutorial = new Tutorial(game, renderer, { onFinish: () => { app.tutorial = null; toMenu(); }, isMapOpen: () => app.panel?.kind === 'map' });
  });
}

function bindGameEvents(game) {
  const me = game.local;
  const seesPoint = (x, y) => !me.alive || game.canSee(me, { x, y });

  game.on('kill', ({ killer, target, body, witnesses }) => {
    if (target === me) {
      closeMinigame(); closePanel();
      audio.kill();
      renderer.addEffect({ type: 'puff', x: body.x, y: body.y, dur: 0.9 });
      game.paused = true;
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
  game.on('vent', ({ p, from, to }) => {
    if (p === me || seesPoint(from.px, from.py)) { renderer.addEffect({ type: 'vent', x: from.px, y: from.py, dur: 0.8 }); audio.vent(); }
    if (p !== me && seesPoint(to.px, to.py)) renderer.addEffect({ type: 'vent', x: to.px, y: to.py, dur: 0.8 });
  });
  game.on('taskDone', ({ p }) => {
    if (p === me) renderer.addEffect({ type: 'sparkle', x: me.x, y: me.y, dur: 0.9 });
  });
  game.on('sabotage', ({ type }) => {
    const def = SABOTAGES[type];
    if (type === 'lights') audio.lightsOff(); else audio.sabotage();
    if (def.critical) audio.startAlarm();
    toast(`${def.critical ? '🚨' : '⚠️'} ${def.name}!`, 'bad');
    const m = app.minigame;
    if (type === 'machines' && m && m.station?.machine) { closeMinigame(); toast('As máquinas pararam no meio da tarefa!', 'bad'); }
  });
  game.on('sabotageEnd', ({ type, who }) => {
    audio.stopAlarm();
    if (who) { audio.fixed(); toast(`✔ ${SABOTAGES[type].name} resolvido por ${who.name}`, 'ok'); }
  });
  game.on('fixPart', ({ fixId, who }) => { if (who !== me && game.sabotage.active) toast(`${who.name} estabilizou: ${game.map.fixById[fixId].name}`, ''); });
  game.on('doors', ({ room, locked }) => {
    const here = game.roomAtPos(me.x, me.y)?.id === room;
    if (locked && (here || me.isImpostor)) { toast(`🔒 Portas trancadas: ${game.roomName(room)}`, 'bad'); audio.sabotage(); }
  });
  game.on('randomEvent', ({ def }) => { toast(`📣 ${def.name} ${def.desc}`, 'info', 5000); audio.bell(); });
  game.on('meetingStart', (st) => {
    closeMinigame(); closePanel();
    audio.stopAlarm();
    if (st.kind === 'report') audio.report(); else audio.bell();
    hud.hide();
    meetingUI.open(game, st);
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
      screens.showEnd(game, { onRematch: () => startMatch(false), onLobby: toLobby, onMenu: toMenu });
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
  if (app.minigame && name !== 'pause') return;
  audio.init();
  const it = g.interactionsFor(me);
  switch (name) {
    case 'use': {
      const u = it.use;
      if (!u || u.disabled) { if (u?.disabled) audio.error(); return; }
      if (u.kind === 'task') startTaskMinigame(u.station);
      else if (u.kind === 'fake') { if (!me.busy) g.startBusy(me, 'fake', 2.5 + Math.random() * 2, { stationId: u.station.id }); }
      else if (u.kind === 'blocked') { audio.error(); toast('Essa máquina está parada. Reinicie o CLP na Oficina de Automação.', 'bad'); }
      else if (u.kind === 'fix') startFixMinigame(u.fix);
      else if (u.kind === 'emergency') g.callEmergency(me);
      else if (u.kind === 'cameras') openPanel('cameras');
      break;
    }
    case 'report': if (it.report) g.report(me, it.report); break;
    case 'kill': if (it.kill) g.tryKill(me, it.kill); break;
    case 'vent': if (it.vent) g.useVent(me); break;
    case 'sabotage': if (me.isImpostor) openPanel('sabotage'); break;
    case 'map': app.panel?.kind === 'map' ? closePanel() : openPanel('map'); break;
    case 'pause': togglePause(); break;
    default: break;
  }
}

function startTaskMinigame(station) {
  const g = app.game, me = g.local;
  g.startBusy(me, 'minigame', Infinity);
  const m = openMinigame(station.task, {
    title: station.name,
    variant: station.id,
    onComplete: () => {
      me.busy = null;
      app.minigame = null;
      if (!g.completeTask(me, station.id)) toast('A tarefa não pôde ser registrada agora.', 'bad');
    },
    onClose: () => { me.busy = null; app.minigame = null; },
  });
  app.minigame = { ...m, station };
}

const FIX_GAMES = { lights: ['switches', 'Religar o quadro de energia'], gps: ['keypad', 'Reiniciar o servidor de localização'], machines: ['wires', 'Reconectar o CLP central'], critA: ['hold', 'Estabilizar a subestação'], critB: ['hold', 'Estabilizar a subestação'] };

function startFixMinigame(fix) {
  const g = app.game, me = g.local;
  const [type, title] = FIX_GAMES[fix.id];
  g.startBusy(me, 'minigame', Infinity);
  const m = openMinigame(type, {
    title, subtitle: fix.name, variant: fix.id,
    onComplete: () => { me.busy = null; app.minigame = null; g.sabotage.fix(fix.id, me); },
    onClose: () => { me.busy = null; app.minigame = null; },
  });
  app.minigame = { ...m, fix };
}

function closeMinigame() {
  if (!app.minigame) return;
  const m = app.minigame;
  app.minigame = null;
  m.close();
  if (app.game) app.game.local.busy = null;
}

function openPanel(kind) {
  const g = app.game;
  closePanel();
  if (kind === 'map' || kind === 'sabotage') {
    const p = screens.showMapPanel(g, renderer, {
      sabotage: kind === 'sabotage',
      onSabotage: (type, room) => g.sabotage.trigger(type, g.local, room),
      onClose: () => { app.panel = null; },
    });
    app.panel = { kind: kind === 'sabotage' ? 'sabotage' : 'map', close: p.close };
  } else if (kind === 'cameras') {
    g.startBusy(g.local, 'minigame', Infinity);
    const p = screens.showCameras(g, renderer, () => { app.panel = null; if (app.game) app.game.local.busy = null; });
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
  if (app.pauseEl) { app.pauseEl.remove(); app.pauseEl = null; g.paused = false; return; }
  g.paused = true;
  app.pauseEl = screens.showPause({
    volume: audio.volume, muted: audio.muted,
    onVolume: (v) => { audio.setVolume(v); savePrefs(); },
    onMute: (m) => { audio.setMuted(m); savePrefs(); },
    onResume: () => { app.pauseEl = null; g.paused = false; },
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
    const blocked = !!app.minigame || !!app.panel || !!app.pauseEl;
    const ax = blocked ? { x: 0, y: 0 } : input.axis();
    g.input = ax;
    g.update(dt);
    if (app.meetingTick === undefined) app.meetingTick = 0;
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
  }
  requestAnimationFrame(frame);
}

// Primeiro gesto do usuário habilita o áudio (política dos navegadores).
window.addEventListener('pointerdown', () => audio.init(), { once: true });
window.addEventListener('keydown', () => audio.init(), { once: true });

// Ganchos para testes automatizados (somente leitura/controle básico).
window.__senai = { app, action, startMatch, toMenu, toLobby };

toMenu();
requestAnimationFrame(frame);
