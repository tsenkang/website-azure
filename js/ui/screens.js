// Telas: menu, lobby local e online, revelação de papel, pausa, ajuda, mapa, sabotagem, câmeras, admin,
// eliminação e fim de partida.
import { PLAYER_COLORS, ACCESSORIES, DIFFICULTY, BOT_NAMES } from '../config.js';
import { drawAvatar } from '../render/sprites.js';
import { buildMinimapBase } from '../render/world.js';
import { buildMap } from '../core/map.js';
import { MAP_LIST, MAPS } from '../core/maps/index.js';
import { randomLook } from '../core/player.js';
import { SABOTAGES } from '../core/sabotage.js';
import { audio } from '../audio.js';
import { icon } from './icons.js';

const screens = () => document.getElementById('screens');
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const closeBtn = '<button class="x-btn" aria-label="Fechar">' + icon('close') + '</button>';

function mount(html, cls) {
  const el = document.createElement('div');
  el.className = `screen ${cls}`;
  el.innerHTML = html;
  screens().appendChild(el);
  return el;
}

function animateAvatars(root) {
  let t = 0, raf;
  const loop = () => {
    if (!root.isConnected) return;
    t += 1 / 60;
    for (const c of root.querySelectorAll('canvas[data-look]')) {
      drawAvatar(c, JSON.parse(c.dataset.look), { t: t + Number(c.dataset.seed || 0), moving: c.dataset.moving === '1', facing: Number(c.dataset.facing || 1), seed: Number(c.dataset.seed || 0) });
    }
    raf = requestAnimationFrame(loop);
  };
  loop();
  return () => cancelAnimationFrame(raf);
}

const previewCache = {};
function mapPreview(canvas, mapId) {
  if (!previewCache[mapId]) previewCache[mapId] = buildMinimapBase(buildMap(mapId), 4);
  const base = previewCache[mapId];
  canvas.width = 240; canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d1420'; ctx.fillRect(0, 0, 240, 160);
  const s = Math.min(240 / base.width, 160 / base.height);
  ctx.drawImage(base, (240 - base.width * s) / 2, (160 - base.height * s) / 2, base.width * s, base.height * s);
}

export const HELP_HTML = `
  <div class="help">
    <section><h3>Objetivo</h3>
      <p><b>Alunos:</b> completem todas as tarefas da turma ou descubram e encaminhem todos os impostores à coordenação.</p>
      <p><b>Impostores:</b> finjam ser alunos, sabotem a escola e eliminem colegas até ficarem em igualdade numérica, ou deixem a sobrecarga da subestação estourar o cronômetro.</p></section>
    <section><h3>Controles</h3>
      <ul class="keys">
        <li><kbd>W A S D</kbd> / <kbd>setas</kbd> andar</li>
        <li><kbd>E</kbd> usar: tarefa, conserto, sinal de emergência, câmeras e admin</li>
        <li><kbd>R</kbd> reportar aluno desacordado</li>
        <li><kbd>M</kbd> ou <kbd>Tab</kbd> mapa</li>
        <li><kbd>Q</kbd> eliminar (impostor)</li>
        <li><kbd>F</kbd> sabotar (impostor)</li>
        <li><kbd>V</kbd> entrar ou sair do duto (impostor). Dentro do duto, clique nas setas ou use <kbd>W A S D</kbd> para trocar de saída.</li>
        <li><kbd>Enter</kbd> escrever no chat da reunião</li>
        <li><kbd>Esc</kbd> fechar janela ou pausar</li>
      </ul>
      <p class="muted">No celular: arraste no lado esquerdo da tela para andar e use os botões à direita.</p></section>
    <section><h3>Provas e informação</h3>
      <ul>
        <li><b>Tarefas visuais</b> (escâner da enfermaria, torno, solda, lixo, gerador): quem estiver perto vê a animação. Impostor não consegue fazer, então quem é visto fazendo é aluno.</li>
        <li><b>Painel de admin</b>: mostra quantas pessoas há em cada sala, sem dizer quem.</li>
        <li><b>Câmeras de segurança</b>: imagens ao vivo de quatro pontos do mapa.</li>
      </ul></section>
    <section><h3>Sabotagens</h3>
      <ul>
        <li><b>Apagão</b>: a visão dos alunos diminui. Religue o quadro de energia.</li>
        <li><b>GPS offline</b>: minimapa e admin caem. Reinicie o servidor.</li>
        <li><b>Pane nas máquinas</b>: tarefas de máquinas travam. Reinicie o CLP.</li>
        <li><b>Sobrecarga na subestação</b> (crítica): estabilize os dois consoles antes do tempo acabar.</li>
        <li><b>Portas trancadas</b>: as portas de uma sala ficam bloqueadas por 10 segundos.</li>
      </ul></section>
    <section><h3>Reuniões</h3>
      <p>Reporte um corpo ou aperte o sinal de emergência (1 vez por partida). O chat é livre. Os bots entendem acusações ("foi o Bruno", "vi a Camila no duto"), defesas ("confio na Sofia") e perguntas ("Diego, onde você estava?").</p>
      <p class="muted">Empate, ou "pular" com o mesmo número de votos que o mais votado, não expulsa ninguém. Bots aparecem sempre com a etiqueta BOT.</p></section>
  </div>`;

// ---------- Menu principal ----------
export function showMenu({ onPlay, onOnline, onTutorial, onHelp, onlineAvailable }) {
  const el = mount(`
    <div class="menu">
      <h1 class="logo" aria-label="SENAI: Suspeitos"><span class="l1">SENAI:</span><span class="l2">SUSPEITOS</span></h1>
      <p class="tagline">Tem alguém sabotando as oficinas. Termine suas tarefas, desconfie de todo mundo e não deixe a subestação didática entrar em pane.</p>
      <div class="menu-buttons">
        <button class="btn primary big wide" data-a="play"><span class="bi">${icon('play')}</span>Jogar com bots</button>
        <button class="btn blue big" data-a="online"><span class="bi">${icon('online')}</span>Online</button>
        <button class="btn big" data-a="tutorial"><span class="bi">${icon('school')}</span>Tutorial</button>
        <button class="btn big wide" data-a="help"><span class="bi">${icon('book')}</span>Como jogar</button>
      </div>
      ${onlineAvailable ? '' : '<p class="muted small">O modo online precisa do servidor do jogo (veja o README para publicar no Render).</p>'}
    </div>
    <footer class="disclaimer">Projeto escolar/fã sem vínculo oficial com o SENAI. Personagens, mapas e arte originais, gerados por código.</footer>`, 'menu-screen');
  const go = (fn) => () => { audio.init(); audio.click(); fn(); };
  el.querySelector('[data-a="play"]').onclick = go(() => { el.remove(); onPlay(); });
  el.querySelector('[data-a="online"]').onclick = go(() => { el.remove(); onOnline(); });
  el.querySelector('[data-a="tutorial"]').onclick = go(() => { el.remove(); onTutorial(); });
  el.querySelector('[data-a="help"]').onclick = go(onHelp);
  return el;
}

export function showHelp(onClose) {
  const el = mount(`<div class="modal wide"><header><h2>Como jogar</h2>${closeBtn}</header>${HELP_HTML}</div>`, 'modal-screen');
  const close = () => { el.remove(); onClose && onClose(); };
  el.querySelector('.x-btn').onclick = close;
  el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });
  return { el, close };
}

// ---------- Personalização (compartilhada entre os lobbies) ----------
function customizer(root, profile, { onChange, takenColors = () => [] }) {
  root.innerHTML = `
    <h3>Seu personagem</h3>
    <canvas class="preview"></canvas>
    <label>Nome <input class="name" id="pname" maxlength="14" autocomplete="off"></label>
    <div class="label">Cor do uniforme</div>
    <div class="swatches">${PLAYER_COLORS.map((c) => `<button class="sw" data-c="${c.id}" title="${c.name}" style="--c:${c.hex}"></button>`).join('')}</div>
    <label>Acessório <select class="acc" id="pacc">${ACCESSORIES.map((a) => `<option value="${a.id}">${a.name}</option>`).join('')}</select></label>`;
  const preview = root.querySelector('.preview');
  const name = root.querySelector('.name');
  const acc = root.querySelector('.acc');
  name.value = profile.name;
  acc.value = profile.look.accessory;
  const paint = () => {
    const taken = takenColors();
    root.querySelectorAll('.sw').forEach((b) => { b.classList.toggle('on', b.dataset.c === profile.look.color); b.disabled = taken.includes(b.dataset.c) && b.dataset.c !== profile.look.color; });
  };
  root.querySelectorAll('.sw').forEach((b) => b.onclick = () => { profile.look.color = b.dataset.c; audio.click(); paint(); onChange(); });
  acc.onchange = () => { profile.look.accessory = acc.value; onChange(); };
  name.oninput = () => { profile.name = name.value.trim().slice(0, 14) || 'Aluno'; onChange(); };
  let t = 0, raf;
  const loop = () => { if (!root.isConnected) return; t += 1 / 60; drawAvatar(preview, profile.look, { t, moving: Math.sin(t * 0.8) > 0, scale: 3 }); raf = requestAnimationFrame(loop); };
  loop();
  paint();
  return { paint, stop: () => cancelAnimationFrame(raf) };
}

// Regras da partida (iguais no lobby local e online; só o anfitrião edita no online).
function rulesHtml({ online }) {
  return `
    <h3>Regras da partida</h3>
    <div class="label muted small">Mapa</div>
    <div class="maps">${MAP_LIST.map((m) => `<button class="map-opt" data-map="${m.id}"><canvas></canvas><b>${m.name}</b></button>`).join('')}</div>
    <p class="map-desc"></p>
    ${online ? '' : '<div class="field"><span>Participantes</span><div class="stepper" data-k="players" data-min="4" data-max="10"><button>−</button><b></b><button>+</button></div></div>'}
    <div class="field"><span>Impostores</span><div class="stepper" data-k="impostors" data-min="1" data-max="3"><button>−</button><b></b><button>+</button></div></div>
    <div class="field"><span>Tarefas por aluno</span><div class="stepper" data-k="tasksPerPlayer" data-min="3" data-max="7"><button>−</button><b></b><button>+</button></div></div>
    <div class="field"><span>Tempo de votação</span><div class="stepper" data-k="votingTime" data-min="20" data-max="120" data-step="5"><button>−</button><b></b><button>+</button></div></div>
    <div class="field"><span>Dificuldade dos bots</span><div class="seg" data-k="difficulty">${Object.entries(DIFFICULTY).map(([k, d]) => `<button data-v="${k}">${d.label}</button>`).join('')}</div></div>
    ${online ? '' : '<div class="field"><span>Seu papel</span><div class="seg" data-k="rolePref"><button data-v="aleatorio">Aleatório</button><button data-v="aluno">Aluno</button><button data-v="impostor">Impostor</button></div></div>'}
    <div class="field"><span>Tarefas visuais</span><div class="seg" data-k="visualTasks"><button data-v="true">Sim</button><button data-v="false">Não</button></div></div>
    <div class="field"><span>Revelar papel ao expulsar</span><div class="seg" data-k="revealRoles"><button data-v="true">Sim</button><button data-v="false">Não</button></div></div>
    <p class="hint"></p>`;
}

function bindRules(root, settings, { editable, onChange, totalPlayers }) {
  root.querySelectorAll('.map-opt').forEach((b) => mapPreview(b.querySelector('canvas'), b.dataset.map));
  const maxImp = () => Math.max(1, Math.floor((totalPlayers() - 1) / 3));
  const render = () => {
    root.querySelectorAll('.stepper').forEach((s) => {
      s.querySelector('b').textContent = settings[s.dataset.k] + (s.dataset.k === 'votingTime' ? 's' : '');
      s.querySelectorAll('button').forEach((b) => { b.disabled = !editable(); });
    });
    root.querySelectorAll('.seg').forEach((s) => s.querySelectorAll('button').forEach((b) => { b.classList.toggle('on', String(settings[s.dataset.k]) === b.dataset.v); b.disabled = !editable(); }));
    root.querySelectorAll('.map-opt').forEach((b) => { b.classList.toggle('on', b.dataset.map === settings.map); b.disabled = !editable(); });
    root.querySelector('.map-desc').textContent = MAPS[settings.map]?.desc || '';
    root.querySelector('.hint').textContent = `Com ${totalPlayers()} participantes, o máximo é ${maxImp()} impostor(es).`;
  };
  root.querySelectorAll('.stepper').forEach((s) => {
    const [minus, plus] = s.querySelectorAll('button');
    const step = Number(s.dataset.step || 1);
    const set = (d) => {
      const k = s.dataset.k;
      settings[k] = Math.max(Number(s.dataset.min), Math.min(Number(s.dataset.max), settings[k] + d * step));
      if (k !== 'impostors') settings.impostors = Math.min(settings.impostors, maxImp());
      else settings.impostors = Math.min(settings.impostors, maxImp());
      audio.click(); render(); onChange(k);
    };
    minus.onclick = () => set(-1); plus.onclick = () => set(1);
  });
  root.querySelectorAll('.seg').forEach((s) => s.querySelectorAll('button').forEach((b) => {
    b.onclick = () => { const v = b.dataset.v; settings[s.dataset.k] = v === 'true' ? true : v === 'false' ? false : v; audio.click(); render(); onChange(s.dataset.k); };
  }));
  root.querySelectorAll('.map-opt').forEach((b) => b.onclick = () => { settings.map = b.dataset.map; audio.click(); render(); onChange('map'); });
  render();
  return { render };
}

export function makeBots(count, avoidColor) {
  const colors = shuffle(PLAYER_COLORS.filter((c) => c.id !== avoidColor));
  const names = shuffle(BOT_NAMES);
  return Array.from({ length: count }, (_, i) => ({ name: names[i], look: randomLook(colors[i].id) }));
}

function slotHtml(p, i) {
  return `<li><canvas data-i="${i}"></canvas><b>${esc(p.name)}</b>${p.host ? `<span class="crown" title="Anfitrião">${icon('crown')}</span>` : ''}${p.me ? '<span class="tag you">VOCÊ</span>' : p.bot ? '<span class="tag bot">BOT</span>' : p.offline ? '<span class="tag off">CAIU</span>' : ''}</li>`;
}

export function showLobby({ profile, settings, onStart, onBack, onChange }) {
  let bots = makeBots(settings.players - 1, profile.look.color);
  const el = mount(`
    <div class="lobby">
      <header class="lobby-head"><button class="btn" data-a="back"><span class="bi">${icon('back')}</span>Menu</button><h2>Lobby da turma</h2><span class="muted">Partida local com bots</span></header>
      <div class="lobby-grid">
        <section class="card custom"></section>
        <section class="card settings">${rulesHtml({ online: false })}</section>
        <section class="card roster">
          <h3>Participantes <button class="btn tiny" data-a="reroll" title="Sortear outros bots">Trocar bots</button></h3>
          <ul class="slots"></ul>
        </section>
      </div>
      <div class="lobby-foot"><button class="btn primary big" data-a="start"><span class="bi">${icon('play')}</span>Começar a aula</button></div>
    </div>`, 'lobby-screen');

  const renderSlots = () => {
    const ul = el.querySelector('.slots');
    const all = [{ name: profile.name || 'Você', look: profile.look, me: true }, ...bots.map((b) => ({ ...b, bot: true }))];
    ul.innerHTML = all.map(slotHtml).join('');
    ul.querySelectorAll('canvas').forEach((c, i) => drawAvatar(c, all[i].look, { t: i }));
  };
  const cust = customizer(el.querySelector('.custom'), profile, {
    onChange: () => {
      if (bots.some((x) => x.look.color === profile.look.color)) bots = makeBots(settings.players - 1, profile.look.color);
      renderSlots(); onChange();
    },
  });
  bindRules(el.querySelector('.settings'), settings, {
    editable: () => true,
    totalPlayers: () => settings.players,
    onChange: (k) => { if (k === 'players') bots = makeBots(settings.players - 1, profile.look.color); renderSlots(); onChange(); },
  });
  el.querySelector('[data-a="reroll"]').onclick = () => { bots = makeBots(settings.players - 1, profile.look.color); audio.click(); renderSlots(); };
  el.querySelector('[data-a="back"]').onclick = () => { cust.stop(); el.remove(); onBack(); };
  el.querySelector('[data-a="start"]').onclick = () => { audio.init(); audio.click(); cust.stop(); el.remove(); onStart(bots); };
  renderSlots();
  return el;
}

// ---------- Online: entrada ----------
export function showOnlineEntry({ profile, serverUrl, onCreate, onJoin, onBack, onChange }) {
  const el = mount(`
    <div class="panel online">
      <header style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2>Jogar online</h2>${closeBtn}</header>
      <label class="muted small">Seu nome <input class="input" id="oname" maxlength="14" autocomplete="off"></label>
      <div class="row">
        <button class="btn primary big" data-a="create">Criar sala</button>
      </div>
      <div class="row">
        <input class="input code-input" id="ocode" maxlength="4" placeholder="CÓDIGO" autocomplete="off" aria-label="Código da sala">
        <button class="btn blue big" data-a="join">Entrar</button>
      </div>
      <details><summary>Servidor</summary>
        <label class="muted small">Endereço WebSocket <input class="input" id="osrv" placeholder="wss://seu-jogo.onrender.com/ws" autocomplete="off"></label>
        <p class="small">Deixe o padrão quando o jogo estiver aberto pelo próprio servidor (Render).</p>
      </details>
      <p class="err hidden"></p>
    </div>`, 'online-screen');
  const name = el.querySelector('#oname');
  const code = el.querySelector('#ocode');
  const srv = el.querySelector('#osrv');
  name.value = profile.name;
  srv.value = serverUrl || '';
  name.oninput = () => { profile.name = name.value.trim().slice(0, 14) || 'Aluno'; onChange(); };
  code.oninput = () => { code.value = code.value.toUpperCase().replace(/[^A-Z]/g, ''); };
  const err = el.querySelector('.err');
  const busy = (on) => el.querySelectorAll('button').forEach((b) => { b.disabled = on; });
  const run = async (fn) => {
    err.classList.add('hidden'); busy(true);
    try { await fn(srv.value.trim()); } catch (e) { err.textContent = e.message; err.classList.remove('hidden'); busy(false); }
  };
  el.querySelector('[data-a="create"]').onclick = () => run((url) => onCreate(url));
  el.querySelector('[data-a="join"]').onclick = () => {
    if (code.value.length !== 4) { err.textContent = 'Digite o código de 4 letras da sala.'; err.classList.remove('hidden'); return; }
    run((url) => onJoin(url, code.value));
  };
  code.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.querySelector('[data-a="join"]').click(); });
  el.querySelector('.x-btn').onclick = () => { el.remove(); onBack(); };
  return { el, error(msg) { err.textContent = msg; err.classList.remove('hidden'); busy(false); }, close: () => el.remove() };
}

// ---------- Online: lobby da sala ----------
export function showOnlineLobby({ net, profile, onLeave, onProfile }) {
  const el = mount(`
    <div class="lobby">
      <header class="lobby-head">
        <button class="btn" data-a="leave"><span class="bi">${icon('back')}</span>Sair</button>
        <h2>Sala online</h2>
        <div class="room-code"><small>CÓDIGO</small><b></b></div>
      </header>
      <div class="lobby-grid">
        <section class="card custom"></section>
        <section class="card settings"></section>
        <section class="card roster">
          <h3>Participantes <span class="count muted small"></span></h3>
          <ul class="slots"></ul>
          <div class="row host-only" style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
            <button class="btn tiny" data-a="addBot">+ Bot</button><button class="btn tiny" data-a="removeBot">− Bot</button><button class="btn tiny" data-a="fillBots">Completar com bots</button>
          </div>
        </section>
      </div>
      <div class="lobby-foot"><span class="muted wait-msg"></span><button class="btn primary big host-only" data-a="start"><span class="bi">${icon('play')}</span>Começar a partida</button></div>
    </div>`, 'lobby-screen');
  let room = net.room;
  const settings = { ...(room?.settings || {}) };
  const takenColors = () => (room ? [...room.members.filter((m) => m.id !== net.youId).map((m) => m.look.color), ...room.bots.map((b) => b.look.color)] : []);
  let profileTimer = null;
  const cust = customizer(el.querySelector('.custom'), profile, {
    takenColors,
    onChange: () => { clearTimeout(profileTimer); profileTimer = setTimeout(() => { net.send('profile', { name: profile.name, look: profile.look }); onProfile(); }, 250); },
  });
  const settingsEl = el.querySelector('.settings');
  settingsEl.innerHTML = rulesHtml({ online: true });
  const rules = bindRules(settingsEl, settings, {
    editable: () => net.isHost,
    totalPlayers: () => (room ? room.members.length + room.bots.length : 1),
    onChange: () => net.send('settings', { settings }),
  });
  const update = (r) => {
    room = r;
    Object.assign(settings, r.settings);
    el.querySelector('.room-code b').textContent = r.code;
    const all = [...r.members.map((m) => ({ name: m.name, look: m.look, me: m.id === net.youId, host: m.id === r.hostId, offline: !m.connected })), ...r.bots.map((b) => ({ ...b, bot: true }))];
    const ul = el.querySelector('.slots');
    ul.innerHTML = all.map(slotHtml).join('');
    ul.querySelectorAll('canvas').forEach((c, i) => drawAvatar(c, all[i].look, { t: i }));
    el.querySelector('.count').textContent = `${all.length}/10`;
    el.querySelectorAll('.host-only').forEach((b) => { b.style.display = net.isHost ? '' : 'none'; });
    el.querySelector('.wait-msg').textContent = net.isHost ? (all.length < 4 ? 'Faltam participantes: bots completam até 4 ao começar.' : '') : 'Esperando o anfitrião começar a partida...';
    const mine = r.members.find((m) => m.id === net.youId);
    if (mine && mine.look.color !== profile.look.color) { profile.look.color = mine.look.color; }
    cust.paint();
    rules.render();
  };
  el.querySelector('[data-a="leave"]').onclick = () => { cust.stop(); el.remove(); onLeave(); };
  for (const a of ['addBot', 'removeBot', 'fillBots', 'start']) el.querySelector(`[data-a="${a}"]`).onclick = () => { audio.click(); net.send(a); };
  if (room) update(room);
  return { el, update, close: () => { cust.stop(); el.remove(); } };
}

// ---------- Revelação de papel ----------
export function showRoleReveal(game, onDone) {
  const me = game.local;
  const imps = game.players.filter((p) => p.isImpostor);
  const shown = me.isImpostor ? imps : game.players;
  const n = game.settings.impostors;
  const el = mount(`
    <div class="reveal ${me.isImpostor ? 'imp' : 'crew'}">
      <p class="kicker">${game.tutorial ? 'MODO TREINAMENTO' : `${esc(game.map.name.toUpperCase())} · SEU PAPEL`}</p>
      <h1>${game.tutorial ? 'TREINO' : me.isImpostor ? 'IMPOSTOR' : 'ALUNO'}</h1>
      <p>${game.tutorial ? 'Aprenda os controles básicos com o monitor da turma.' : me.isImpostor ? (imps.length > 1 ? `Você e ${imps.filter((p) => p !== me).map((p) => esc(p.name)).join(', ')} são os impostores. Eliminem e sabotem sem serem descobertos.` : 'Elimine e sabote sem ser descoberto. Esconda-se nos dutos de ventilação.') : `Há impostores entre nós (até ${n}). Complete suas tarefas e fique de olho em todo mundo.`}</p>
      <div class="reveal-row">${shown.map((p, i) => `<div><canvas data-look='${JSON.stringify(p.look)}' data-seed="${i}"></canvas><small>${esc(p.name)}${p.isBot ? ' · BOT' : ''}</small></div>`).join('')}</div>
      <button class="btn primary big">Ir para a aula</button>
    </div>`, 'reveal-screen');
  const stop = animateAvatars(el);
  audio.reveal(me.isImpostor);
  let closed = false;
  const close = () => { if (closed) return; closed = true; stop(); el.classList.add('fade'); setTimeout(() => el.remove(), 300); onDone(); };
  el.querySelector('button').onclick = close;
  const timer = setTimeout(close, 5500);
  el.addEventListener('click', () => clearTimeout(timer));
  return { close };
}

// ---------- Pausa ----------
export function showPause({ onResume, onQuit, onHelp, volume, muted, onVolume, onMute, online }) {
  const el = mount(`
    <div class="modal">
      <header><h2>${online ? 'Menu' : 'Pausado'}</h2></header>
      <div class="pause-body">
        ${online ? '<p class="muted small">No modo online a partida continua rodando enquanto este menu está aberto.</p>' : ''}
        <label>Volume <input type="range" id="vol" min="0" max="100" value="${Math.round(volume * 100)}"></label>
        <label><input type="checkbox" id="mute" ${muted ? 'checked' : ''}> Silenciar sons</label>
        <button class="btn primary big" data-a="resume">Continuar</button>
        <button class="btn" data-a="help">Controles e regras</button>
        <button class="btn danger" data-a="quit">${online ? 'Sair da sala' : 'Sair para o menu'}</button>
      </div>
    </div>`, 'modal-screen');
  el.querySelector('#vol').oninput = (e) => onVolume(Number(e.target.value) / 100);
  el.querySelector('#mute').onchange = (e) => onMute(e.target.checked);
  el.querySelector('[data-a="resume"]').onclick = () => { el.remove(); onResume(); };
  el.querySelector('[data-a="help"]').onclick = () => onHelp();
  el.querySelector('[data-a="quit"]').onclick = () => { el.remove(); onQuit(); };
  return el;
}

// ---------- Mapa grande / sabotagem / admin ----------
export function showMapPanel(game, renderer, { mode = 'map', onSabotage, onClose }) {
  const titles = { map: 'Mapa da escola', sabotage: 'Painel de sabotagem', admin: 'Painel de admin' };
  const notes = {
    map: 'Pontos amarelos: suas tarefas. Círculos vermelhos: sabotagens a consertar.',
    sabotage: 'Escolha uma sabotagem ou clique em uma sala para trancar as portas por 10 s.',
    admin: 'Quantidade de pessoas em cada sala, ao vivo. Não mostra quem é quem.',
  };
  const el = mount(`
    <div class="modal map-modal">
      <header><h2>${titles[mode]}</h2>${closeBtn}</header>
      ${mode === 'sabotage' ? `<div class="sab-buttons">${['lights', 'gps', 'machines', 'critical'].map((k) => `<button class="btn sab" data-s="${k}">${SABOTAGES[k].name}</button>`).join('')}</div>` : ''}
      <p class="muted small">${notes[mode]}</p>
      <canvas class="bigmap" width="880" height="580"></canvas>
    </div>`, 'modal-screen map-screen');
  const cv = el.querySelector('.bigmap');
  let raf;
  const loop = () => {
    if (!el.isConnected) return;
    const info = renderer.drawMap(cv, { big: true, sabotage: mode === 'sabotage', admin: mode === 'admin', force: mode === 'sabotage' });
    el.dataset.s = info.s; el.dataset.ox = info.ox; el.dataset.oy = info.oy;
    if (mode === 'sabotage') {
      el.querySelectorAll('[data-s]').forEach((b) => {
        const can = game.sabotage.canTrigger(b.dataset.s);
        b.disabled = !can;
        b.title = can ? '' : game.sabotage.active ? 'Já existe uma sabotagem ativa' : `Recarga: ${Math.ceil(game.sabotage.cooldown)}s`;
      });
    }
    raf = requestAnimationFrame(loop);
  };
  loop();
  const close = () => { cancelAnimationFrame(raf); el.remove(); onClose && onClose(); };
  el.querySelector('.x-btn').onclick = close;
  el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });
  if (mode === 'sabotage') {
    el.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { if (onSabotage(b.dataset.s)) close(); });
    cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect();
      const x = ((e.clientX - r.left) * (cv.width / r.width) - Number(el.dataset.ox)) / Number(el.dataset.s);
      const y = ((e.clientY - r.top) * (cv.height / r.height) - Number(el.dataset.oy)) / Number(el.dataset.s);
      const room = game.roomAtPos(x, y);
      if (room && !room.corridor && onSabotage('doors', room.id)) close();
    });
  }
  return { el, close };
}

// ---------- Câmeras de segurança ----------
export function showCameras(game, renderer, onClose) {
  const views = game.map.cameraViews;
  const el = mount(`
    <div class="modal cams">
      <header><h2>Câmeras de segurança <span class="rec">● REC</span></h2>${closeBtn}</header>
      <div class="cam-grid">${views.map((v) => `<figure><canvas width="360" height="220"></canvas><figcaption>${esc(v.name)}</figcaption></figure>`).join('')}</div>
    </div>`, 'modal-screen');
  const canvases = [...el.querySelectorAll('canvas')];
  let raf;
  const loop = () => {
    if (!el.isConnected) return;
    canvases.forEach((c, i) => renderer.renderCamera(c, views[i]));
    raf = requestAnimationFrame(loop);
  };
  loop();
  const close = () => { cancelAnimationFrame(raf); el.remove(); onClose && onClose(); };
  el.querySelector('.x-btn').onclick = close;
  el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });
  return { el, close };
}

// ---------- Eliminação do jogador local ----------
export function showDeath(killer, victim, onDone) {
  const el = mount(`
    <div class="death">
      <div class="death-stage">${killer ? `<canvas class="k" data-look='${JSON.stringify(killer.look)}' data-moving="0"></canvas>` : ''}<span class="pow">POW!</span><canvas class="v"></canvas></div>
      <h2>Você foi eliminado(a)!</h2>
      <p>${killer ? `${esc(killer.name)} era impostor${killer.isBot ? ' (BOT)' : ''}. ` : ''}Agora você é um espectro: ainda pode completar suas tarefas para ajudar a turma.</p>
    </div>`, 'death-screen');
  const stop = animateAvatars(el);
  drawAvatar(el.querySelector('.v'), victim.look, { dead: true, scale: 2 });
  setTimeout(() => { stop(); el.classList.add('fade'); setTimeout(() => { el.remove(); onDone && onDone(); }, 300); }, 2800);
}

// ---------- Fim de partida ----------
export function showEnd(game, { onRematch, onLobby, onMenu, online = null }) {
  const r = game.result;
  const me = game.local;
  const mm = Math.floor(r.duration / 60), ss = Math.floor(r.duration % 60);
  const rows = [...game.players].sort((a, b) => (b.isImpostor - a.isImpostor) || (b.alive - a.alive)).map((p) => `
    <tr class="${p === me ? 'me' : ''}">
      <td><canvas data-look='${JSON.stringify(p.look)}'></canvas></td>
      <td><b>${esc(p.name)}</b> ${p.isBot ? '<span class="tag bot">BOT</span>' : p === me ? '<span class="tag you">VOCÊ</span>' : ''}</td>
      <td>${p.isImpostor ? '<span class="role imp">Impostor</span>' : '<span class="role crew">Aluno</span>'}</td>
      <td>${p.alive ? 'Presente' : p.ejected ? 'Coordenação' : 'Desacordado'}</td>
      <td>${p.isImpostor ? '—' : `${p.tasks.filter((t) => t.done).length}/${p.tasks.length}`}</td>
      <td>${p.isImpostor ? p.stats.kills : '—'}</td>
      <td>${p.stats.meetingsCalled + p.stats.reports}</td>
      <td>${p.stats.votesCorrect}/${p.stats.votesCast}</td>
    </tr>`).join('');
  const timeline = game.log.filter((l) => l.kind !== 'roles').map((l) => `<li class="tl-${l.kind}"><time>${Math.floor(l.t / 60)}:${String(Math.floor(l.t % 60)).padStart(2, '0')}</time> ${esc(l.text)}</li>`).join('');
  const el = mount(`
    <div class="end ${r.winner}">
      <div class="end-hero">
        <p class="kicker">${r.localWon ? 'VOCÊ VENCEU!' : 'VOCÊ PERDEU...'}</p>
        <h1>${r.winner === 'crew' ? 'VITÓRIA DOS ALUNOS' : 'VITÓRIA DOS IMPOSTORES'}</h1>
        <p>${esc(r.reason)}</p>
        <div class="end-stats"><div><b>${mm}:${String(ss).padStart(2, '0')}</b><small>duração</small></div><div><b>${r.meetings}</b><small>reuniões</small></div><div><b>${r.progress.done}/${r.progress.total}</b><small>tarefas</small></div><div><b>${esc(game.map.name)}</b><small>mapa</small></div></div>
      </div>
      <div class="end-body">
        <section class="card"><h3>Estatísticas da turma</h3>
          <div class="table-wrap"><table><thead><tr><th></th><th>Nome</th><th>Papel</th><th>Situação</th><th>Tarefas</th><th>Elim.</th><th>Reuniões</th><th>Votos certos</th></tr></thead><tbody>${rows}</tbody></table></div>
        </section>
        <section class="card"><h3>Linha do tempo</h3><ol class="timeline">${timeline}</ol></section>
      </div>
      <div class="end-foot">
        ${online ? (online.isHost ? '<button class="btn primary big" data-a="lobby">Voltar todos ao lobby</button>' : '<span class="muted">O anfitrião vai levar todos de volta ao lobby.</span>') : '<button class="btn primary big" data-a="rematch">Revanche</button><button class="btn big" data-a="lobby">Lobby</button>'}
        <button class="btn big ghost" data-a="menu">${online ? 'Sair da sala' : 'Menu'}</button>
      </div>
    </div>`, 'end-screen');
  el.querySelectorAll('canvas[data-look]').forEach((c, i) => drawAvatar(c, JSON.parse(c.dataset.look), { t: i }));
  if (r.localWon) audio.win(); else audio.lose();
  el.querySelector('[data-a="rematch"]')?.addEventListener('click', () => { el.remove(); onRematch(); });
  el.querySelector('[data-a="lobby"]')?.addEventListener('click', () => { el.remove(); onLobby(); });
  el.querySelector('[data-a="menu"]').onclick = () => { el.remove(); onMenu(); };
  return el;
}
