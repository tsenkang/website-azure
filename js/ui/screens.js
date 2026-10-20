// Telas: menu, lobby, revelação de papel, pausa, ajuda, mapa, sabotagem, câmeras, eliminação e fim.
import { PLAYER_COLORS, ACCESSORIES, DIFFICULTY, BOT_NAMES } from '../config.js';
import { drawAvatar } from '../render/sprites.js';
import { randomLook } from '../core/player.js';
import { SABOTAGES } from '../core/sabotage.js';
import { audio } from '../audio.js';

const screens = () => document.getElementById('screens');
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

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
      drawAvatar(c, JSON.parse(c.dataset.look), { t: t + Number(c.dataset.seed || 0), moving: c.dataset.moving === '1', facing: Number(c.dataset.facing || 1) });
    }
    raf = requestAnimationFrame(loop);
  };
  loop();
  return () => cancelAnimationFrame(raf);
}

export const HELP_HTML = `
  <div class="help">
    <section><h3>🎯 Objetivo</h3>
      <p><b>Alunos:</b> completem todas as tarefas da turma ou descubram e encaminhem todos os impostores à coordenação.</p>
      <p><b>Impostores:</b> finjam ser alunos, sabotem a escola e eliminem colegas até ficarem em igualdade numérica — ou deixem a sobrecarga da subestação explodir o cronômetro.</p></section>
    <section><h3>⌨️ Controles</h3>
      <ul class="keys">
        <li><kbd>W A S D</kbd> / <kbd>setas</kbd> Andar</li>
        <li><kbd>E</kbd> Usar / fazer tarefa / consertar / sinal de emergência</li>
        <li><kbd>R</kbd> Reportar aluno desacordado</li>
        <li><kbd>M</kbd> ou <kbd>Tab</kbd> Mapa</li>
        <li><kbd>Q</kbd> Eliminar (impostor)</li>
        <li><kbd>F</kbd> Sabotar (impostor)</li>
        <li><kbd>V</kbd> Duto de ventilação (impostor)</li>
        <li><kbd>Esc</kbd> Fechar janela / pausar</li>
      </ul>
      <p class="muted">No celular: arraste no lado esquerdo da tela para andar e use os botões à direita.</p></section>
    <section><h3>🛠️ Sabotagens</h3>
      <ul>
        <li><b>Apagão</b>: a visão dos alunos diminui. Conserte no quadro de energia da Manutenção.</li>
        <li><b>GPS offline</b>: o minimapa cai. Reinicie o servidor no Lab. de Informática.</li>
        <li><b>Pane nas máquinas</b>: tarefas de máquinas ficam travadas. Reinicie o CLP da Automação.</li>
        <li><b>Sobrecarga na subestação</b> (crítica): estabilize os DOIS consoles (Lab. Técnico e Manutenção) antes do tempo acabar.</li>
        <li><b>Portas trancadas</b>: as portas de uma sala ficam bloqueadas por 10 segundos.</li>
      </ul></section>
    <section><h3>🗳️ Reuniões</h3>
      <p>Reporte um aluno desacordado ou aperte o sinal de emergência no Pátio (1 vez por partida). Discuta com as falas rápidas e vote. Empates ou maioria de "pular" não expulsam ninguém.</p>
      <p class="muted">Todos os outros participantes são <b>bots</b> controlados pelo computador e estão identificados com [BOT].</p></section>
  </div>`;

// ---------- Menu principal ----------
export function showMenu({ onPlay, onTutorial, onHelp }) {
  const looks = PLAYER_COLORS.slice(0, 7).map((c) => randomLook(c.id));
  const el = mount(`
    <div class="menu">
      <div class="menu-hero">
        <div class="stripes"></div>
        <p class="kicker">UM JOGO DE DEDUÇÃO SOCIAL NA ESCOLA TÉCNICA</p>
        <h1>SENAI<span>:</span> <em>SUSPEITOS</em></h1>
        <p class="tagline">Tem alguém sabotando as oficinas. Termine suas tarefas, desconfie de todo mundo e não deixe a subestação didática entrar em pane.</p>
        <div class="menu-crowd">${looks.map((l, i) => `<canvas data-look='${JSON.stringify(l)}' data-seed="${i}" data-moving="${i % 2}" data-facing="${i < 3 ? 1 : -1}"></canvas>`).join('')}</div>
        <div class="menu-buttons">
          <button class="btn primary big" data-a="play">▶ Jogar</button>
          <button class="btn big" data-a="tutorial">🎓 Tutorial</button>
          <button class="btn big" data-a="help">📘 Como jogar</button>
        </div>
      </div>
      <footer class="disclaimer">Projeto escolar/fã sem vínculo oficial com o SENAI. Personagens, mapa e arte originais gerados por código.</footer>
    </div>`, 'menu-screen');
  const stop = animateAvatars(el);
  el.querySelector('[data-a="play"]').onclick = () => { audio.init(); audio.click(); stop(); el.remove(); onPlay(); };
  el.querySelector('[data-a="tutorial"]').onclick = () => { audio.init(); audio.click(); stop(); el.remove(); onTutorial(); };
  el.querySelector('[data-a="help"]').onclick = () => { audio.init(); audio.click(); onHelp(); };
  return el;
}

export function showHelp(onClose) {
  const el = mount(`<div class="modal wide"><header><h2>Como jogar</h2><button class="mg-close" aria-label="Fechar">✕</button></header>${HELP_HTML}</div>`, 'modal-screen');
  const close = () => { el.remove(); onClose && onClose(); };
  el.querySelector('.mg-close').onclick = close;
  el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });
  return { el, close };
}

// ---------- Lobby ----------
export function makeBots(count, avoidColor) {
  const colors = shuffle(PLAYER_COLORS.filter((c) => c.id !== avoidColor));
  const names = shuffle(BOT_NAMES);
  return Array.from({ length: count }, (_, i) => ({ name: names[i], look: randomLook(colors[i].id) }));
}

export function showLobby({ profile, settings, onStart, onBack, onChange }) {
  let bots = makeBots(settings.players - 1, profile.look.color);
  const el = mount(`
    <div class="lobby">
      <header class="lobby-head"><button class="btn ghost" data-a="back">← Menu</button><h2>Lobby da turma</h2><span class="muted">Partida local com bots</span></header>
      <div class="lobby-grid">
        <section class="card custom">
          <h3>Seu personagem</h3>
          <canvas class="preview"></canvas>
          <label>Nome <input class="name" maxlength="14" value=""></label>
          <div class="label">Cor do uniforme</div>
          <div class="swatches">${PLAYER_COLORS.map((c) => `<button class="sw" data-c="${c.id}" title="${c.name}" style="--c:${c.hex}"></button>`).join('')}</div>
          <label>Acessório <select class="acc">${ACCESSORIES.map((a) => `<option value="${a.id}">${a.name}</option>`).join('')}</select></label>
        </section>
        <section class="card settings">
          <h3>Regras da partida</h3>
          <div class="field"><span>Participantes</span><div class="stepper" data-k="players" data-min="4" data-max="10"><button>−</button><b></b><button>+</button></div></div>
          <div class="field"><span>Impostores</span><div class="stepper" data-k="impostors" data-min="1" data-max="3"><button>−</button><b></b><button>+</button></div></div>
          <div class="field"><span>Tarefas por aluno</span><div class="stepper" data-k="tasksPerPlayer" data-min="3" data-max="7"><button>−</button><b></b><button>+</button></div></div>
          <div class="field"><span>Tempo de votação</span><div class="stepper" data-k="votingTime" data-min="20" data-max="90" data-step="5"><button>−</button><b></b><button>+</button></div></div>
          <div class="field"><span>Dificuldade dos bots</span><div class="seg" data-k="difficulty">${Object.entries(DIFFICULTY).map(([k, d]) => `<button data-v="${k}">${d.label}</button>`).join('')}</div></div>
          <div class="field"><span>Seu papel</span><div class="seg" data-k="rolePref"><button data-v="aleatorio">Aleatório</button><button data-v="aluno">Aluno</button><button data-v="impostor">Impostor</button></div></div>
          <div class="field"><span>Revelar papel ao expulsar</span><div class="seg" data-k="revealRoles"><button data-v="true">Sim</button><button data-v="false">Não</button></div></div>
          <p class="hint"></p>
        </section>
        <section class="card roster">
          <h3>Participantes <button class="btn tiny" data-a="reroll" title="Sortear outros bots">🎲 Trocar bots</button></h3>
          <ul class="slots"></ul>
        </section>
      </div>
      <div class="lobby-foot"><button class="btn primary big" data-a="start">Começar a aula ▶</button></div>
    </div>`, 'lobby-screen');

  const preview = el.querySelector('.preview');
  const name = el.querySelector('.name');
  name.value = profile.name;
  const acc = el.querySelector('.acc');
  acc.value = profile.look.accessory;
  let t = 0, raf;
  const loop = () => { if (!el.isConnected) return; t += 1 / 60; drawAvatar(preview, profile.look, { t, moving: Math.sin(t * 0.8) > 0, scale: 3 }); raf = requestAnimationFrame(loop); };
  loop();

  const renderSlots = () => {
    const ul = el.querySelector('.slots');
    ul.innerHTML = '';
    const all = [{ name: profile.name || 'Você', look: profile.look, me: true }, ...bots];
    all.forEach((p, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<canvas></canvas><b>${p.name}</b>${p.me ? '<span class="tag you">VOCÊ</span>' : '<span class="tag bot">BOT</span>'}`;
      ul.appendChild(li);
      drawAvatar(li.querySelector('canvas'), p.look, { t: i });
    });
  };
  const maxImp = () => Math.max(1, Math.floor((settings.players - 1) / 3));
  const renderSettings = () => {
    settings.impostors = Math.min(settings.impostors, maxImp());
    el.querySelectorAll('.stepper').forEach((s) => { s.querySelector('b').textContent = settings[s.dataset.k] + (s.dataset.k === 'votingTime' ? 's' : ''); });
    el.querySelectorAll('.seg').forEach((s) => s.querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(settings[s.dataset.k]) === b.dataset.v)));
    el.querySelectorAll('.sw').forEach((b) => b.classList.toggle('on', b.dataset.c === profile.look.color));
    el.querySelector('.hint').textContent = `Com ${settings.players} participantes, o máximo é ${maxImp()} impostor(es). Bots ${DIFFICULTY[settings.difficulty].label.toLowerCase()}s.`;
    onChange && onChange();
  };
  el.querySelectorAll('.stepper').forEach((s) => {
    const [minus, plus] = s.querySelectorAll('button');
    const step = Number(s.dataset.step || 1);
    const set = (d) => {
      const k = s.dataset.k;
      settings[k] = Math.max(Number(s.dataset.min), Math.min(Number(s.dataset.max), settings[k] + d * step));
      if (k === 'players') bots = makeBots(settings.players - 1, profile.look.color);
      audio.click(); renderSettings(); renderSlots();
    };
    minus.onclick = () => set(-1); plus.onclick = () => set(1);
  });
  el.querySelectorAll('.seg').forEach((s) => s.querySelectorAll('button').forEach((b) => {
    b.onclick = () => { const v = b.dataset.v; settings[s.dataset.k] = v === 'true' ? true : v === 'false' ? false : v; audio.click(); renderSettings(); };
  }));
  el.querySelectorAll('.sw').forEach((b) => b.onclick = () => {
    profile.look.color = b.dataset.c;
    if (bots.some((x) => x.look.color === b.dataset.c)) bots = makeBots(settings.players - 1, profile.look.color);
    audio.click(); renderSettings(); renderSlots();
  });
  acc.onchange = () => { profile.look.accessory = acc.value; renderSlots(); onChange && onChange(); };
  name.oninput = () => { profile.name = name.value.trim().slice(0, 14) || 'Você'; renderSlots(); onChange && onChange(); };
  el.querySelector('[data-a="reroll"]').onclick = () => { bots = makeBots(settings.players - 1, profile.look.color); audio.click(); renderSlots(); };
  el.querySelector('[data-a="back"]').onclick = () => { cancelAnimationFrame(raf); el.remove(); onBack(); };
  el.querySelector('[data-a="start"]').onclick = () => { audio.init(); audio.click(); cancelAnimationFrame(raf); el.remove(); onStart(bots); };
  renderSettings();
  renderSlots();
  return el;
}

// ---------- Revelação de papel ----------
export function showRoleReveal(game, onDone) {
  const me = game.local;
  const imps = game.players.filter((p) => p.isImpostor);
  const shown = me.isImpostor ? imps : game.players;
  const n = imps.length;
  const el = mount(`
    <div class="reveal ${me.isImpostor ? 'imp' : 'crew'}">
      <p class="kicker">${game.tutorial ? 'MODO TREINAMENTO' : 'SEU PAPEL NESTA AULA'}</p>
      <h1>${game.tutorial ? 'TREINAMENTO' : me.isImpostor ? 'IMPOSTOR' : 'ALUNO'}</h1>
      <p>${game.tutorial ? 'Aprenda os controles básicos com o monitor da turma.' : me.isImpostor ? (n > 1 ? `Você e ${imps.filter((p) => p !== me).map((p) => p.name).join(', ')} são os impostores. Eliminem e sabotem sem serem descobertos.` : 'Elimine e sabote sem ser descoberto. Use os dutos de ventilação para fugir.') : `Há ${n} impostor${n > 1 ? 'es' : ''} entre nós. Complete suas tarefas e fique de olho em todo mundo.`}</p>
      <div class="reveal-row">${shown.map((p, i) => `<div><canvas data-look='${JSON.stringify(p.look)}' data-seed="${i}"></canvas><small>${p.name}${p.isBot ? ' · BOT' : ''}</small></div>`).join('')}</div>
      <button class="btn big">Ir para a aula ▶</button>
    </div>`, 'reveal-screen');
  const stop = animateAvatars(el);
  audio.reveal(me.isImpostor);
  let closed = false;
  const close = () => { if (closed) return; closed = true; stop(); el.classList.add('fade'); setTimeout(() => el.remove(), 300); onDone(); };
  el.querySelector('button').onclick = close;
  const timer = setTimeout(close, 6000);
  el.addEventListener('click', () => clearTimeout(timer));
  return el;
}

// ---------- Pausa ----------
export function showPause({ onResume, onQuit, onHelp, volume, muted, onVolume, onMute }) {
  const el = mount(`
    <div class="modal">
      <header><h2>Pausado</h2></header>
      <div class="pause-body">
        <label>Volume <input type="range" min="0" max="100" value="${Math.round(volume * 100)}"></label>
        <label class="check"><input type="checkbox" ${muted ? 'checked' : ''}> Silenciar sons</label>
        <button class="btn primary big" data-a="resume">Continuar</button>
        <button class="btn" data-a="help">Controles e regras</button>
        <button class="btn danger" data-a="quit">Sair para o menu</button>
      </div>
    </div>`, 'modal-screen');
  el.querySelector('input[type=range]').oninput = (e) => onVolume(Number(e.target.value) / 100);
  el.querySelector('input[type=checkbox]').onchange = (e) => onMute(e.target.checked);
  el.querySelector('[data-a="resume"]').onclick = () => { el.remove(); onResume(); };
  el.querySelector('[data-a="help"]').onclick = () => onHelp();
  el.querySelector('[data-a="quit"]').onclick = () => { el.remove(); onQuit(); };
  return el;
}

// ---------- Mapa grande / menu de sabotagem ----------
export function showMapPanel(game, renderer, { sabotage = false, onSabotage, onClose }) {
  const el = mount(`
    <div class="modal map-modal">
      <header><h2>${sabotage ? '⚠️ Painel de sabotagem' : '🗺️ Mapa da escola'}</h2><button class="mg-close" aria-label="Fechar">✕</button></header>
      ${sabotage ? `<div class="sab-buttons">${['lights', 'gps', 'machines', 'critical'].map((k) => `<button class="btn sab" data-s="${k}">${SABOTAGES[k].name}</button>`).join('')}</div>
        <p class="muted small">Clique em uma sala no mapa para trancar as portas dela por 10 s.</p>` : '<p class="muted small">Pontos amarelos: suas tarefas. Círculos vermelhos: sabotagens a consertar.</p>'}
      <canvas class="bigmap" width="880" height="580"></canvas>
    </div>`, 'modal-screen map-screen');
  const cv = el.querySelector('.bigmap');
  let raf;
  const loop = () => {
    if (!el.isConnected) return;
    const info = renderer.drawMap(cv, { big: true, sabotage, force: sabotage });
    el.dataset.s = info.s; el.dataset.ox = info.ox; el.dataset.oy = info.oy;
    if (sabotage) {
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
  el.querySelector('.mg-close').onclick = close;
  el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });
  if (sabotage) {
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
      <header><h2>📹 Câmeras de segurança <span class="rec">● REC</span></h2><button class="mg-close" aria-label="Fechar">✕</button></header>
      <div class="cam-grid">${views.map((v) => `<figure><canvas width="360" height="220"></canvas><figcaption>${v.name}</figcaption></figure>`).join('')}</div>
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
  el.querySelector('.mg-close').onclick = close;
  el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });
  return { el, close };
}

// ---------- Eliminação do jogador local ----------
export function showDeath(killer, victim, onDone) {
  const el = mount(`
    <div class="death">
      <div class="death-stage"><canvas class="k" data-look='${JSON.stringify(killer.look)}' data-moving="0"></canvas><span class="pow">POW!</span><canvas class="v"></canvas></div>
      <h2>Você foi eliminado(a)!</h2>
      <p>${killer.name} era impostor${killer.isBot ? ' (BOT)' : ''}. Agora você é um espectro: ainda pode completar suas tarefas para ajudar a turma.</p>
    </div>`, 'death-screen');
  const stop = animateAvatars(el);
  drawAvatar(el.querySelector('.v'), victim.look, { dead: true, scale: 2 });
  setTimeout(() => { stop(); el.classList.add('fade'); setTimeout(() => { el.remove(); onDone && onDone(); }, 300); }, 2800);
}

// ---------- Fim de partida ----------
export function showEnd(game, { onRematch, onLobby, onMenu }) {
  const r = game.result;
  const me = game.local;
  const mm = Math.floor(r.duration / 60), ss = Math.floor(r.duration % 60);
  const rows = [...game.players].sort((a, b) => (b.isImpostor - a.isImpostor) || (b.alive - a.alive)).map((p) => `
    <tr class="${p.isImpostor ? 'imp' : ''} ${p === me ? 'me' : ''}">
      <td><canvas data-look='${JSON.stringify(p.look)}'></canvas></td>
      <td><b>${p.name}</b>${p.isBot ? ' <span class="tag bot">BOT</span>' : ' <span class="tag you">VOCÊ</span>'}</td>
      <td>${p.isImpostor ? '<span class="role imp">Impostor</span>' : '<span class="role crew">Aluno</span>'}</td>
      <td>${p.alive ? 'Presente' : p.ejected ? 'Coordenação' : 'Desacordado'}</td>
      <td>${p.isImpostor ? '—' : `${p.tasks.filter((t) => t.done).length}/${p.tasks.length}`}</td>
      <td>${p.isImpostor ? p.stats.kills : '—'}</td>
      <td>${p.stats.meetingsCalled + p.stats.reports}</td>
      <td>${p.stats.votesCorrect}/${p.stats.votesCast}</td>
    </tr>`).join('');
  const timeline = game.log.filter((l) => l.kind !== 'roles').map((l) => `<li class="tl-${l.kind}"><time>${Math.floor(l.t / 60)}:${String(Math.floor(l.t % 60)).padStart(2, '0')}</time> ${l.text}</li>`).join('');
  const el = mount(`
    <div class="end ${r.winner}">
      <div class="end-hero">
        <p class="kicker">${r.localWon ? 'VOCÊ VENCEU!' : 'VOCÊ PERDEU...'}</p>
        <h1>${r.winner === 'crew' ? 'VITÓRIA DOS ALUNOS' : 'VITÓRIA DOS IMPOSTORES'}</h1>
        <p>${r.reason}</p>
        <div class="end-stats"><div><b>${mm}:${String(ss).padStart(2, '0')}</b><small>duração</small></div><div><b>${r.meetings}</b><small>reuniões</small></div><div><b>${r.progress.done}/${r.progress.total}</b><small>tarefas</small></div></div>
      </div>
      <div class="end-body">
        <section class="card"><h3>Estatísticas da turma</h3>
          <div class="table-wrap"><table><thead><tr><th></th><th>Nome</th><th>Papel</th><th>Situação</th><th>Tarefas</th><th>Elim.</th><th>Reuniões</th><th>Votos certos</th></tr></thead><tbody>${rows}</tbody></table></div>
        </section>
        <section class="card"><h3>Linha do tempo</h3><ol class="timeline">${timeline}</ol></section>
      </div>
      <div class="end-foot"><button class="btn primary big" data-a="rematch">🔁 Revanche</button><button class="btn big" data-a="lobby">Lobby</button><button class="btn big ghost" data-a="menu">Menu</button></div>
    </div>`, 'end-screen');
  el.querySelectorAll('canvas[data-look]').forEach((c, i) => drawAvatar(c, JSON.parse(c.dataset.look), { t: i }));
  if (r.localWon) audio.win(); else audio.lose();
  el.querySelector('[data-a="rematch"]').onclick = () => { el.remove(); onRematch(); };
  el.querySelector('[data-a="lobby"]').onclick = () => { el.remove(); onLobby(); };
  el.querySelector('[data-a="menu"]').onclick = () => { el.remove(); onMenu(); };
  return el;
}
