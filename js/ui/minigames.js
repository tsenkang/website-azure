// Janela de minijogo. Cada minijogo recebe um contêiner e uma API com complete()/setStatus().
import { audio } from '../audio.js';
import * as technical from './games/technical.js';
import * as knowledge from './games/knowledge.js';
import * as simple from './games/simple.js';
import { icon } from './icons.js';

const GAMES = {
  wires: technical.wires,
  circuit: technical.circuit,
  tools: technical.tools,
  robot: technical.robot,
  gauge: technical.gauge,
  quiz: knowledge.quiz,
  diag: knowledge.diag,
  logic: knowledge.logic,
  sequence: knowledge.sequence,
  keypad: knowledge.keypad,
  sort: simple.sort,
  wait: simple.wait,
  switches: simple.switches,
  hold: simple.hold,
  scan: simple.scan,
};

export const HELP = {
  wires: 'Arraste cada cabo da esquerda até o terminal da mesma cor.',
  circuit: 'Clique nas peças para girá-las e ligar a bateria ao LED.',
  tools: 'Clique em uma ferramenta e depois no contorno correspondente do painel.',
  robot: 'Ajuste os dois eixos até o braço coincidir com a posição alvo.',
  gauge: 'Aperte PARAR (ou Espaço) quando o ponteiro estiver na faixa verde. Três acertos.',
  quiz: 'Responda corretamente a 3 perguntas.',
  diag: 'Leia os sintomas e escolha a peça com defeito. Três diagnósticos.',
  logic: 'Ligue/desligue as chaves até a saída S acender. Três circuitos.',
  sequence: 'Clique nos itens na ordem pedida.',
  keypad: 'Digite o código mostrado e confirme.',
  sort: 'Clique na caixa correta para cada item que aparece.',
  wait: 'Inicie o processo e aguarde terminar sem fechar a janela.',
  switches: 'Ligue todos os disjuntores do quadro.',
  hold: 'Mantenha o botão pressionado até estabilizar.',
  scan: 'Tarefa visual: quem estiver por perto vê o escaneamento acontecer.',
};

export function openMinigame(type, { title, subtitle, variant, onComplete, onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'mg-overlay';
  overlay.innerHTML = `
    <div class="mg-panel" role="dialog" aria-label="${title}">
      <header class="mg-head">
        <div><h3>${title}</h3><p>${subtitle || HELP[type] || ''}</p></div>
        <button class="x-btn" title="Fechar (Esc)" aria-label="Fechar">${icon('close')}</button>
      </header>
      <div class="mg-body"></div>
      <footer class="mg-status"></footer>
    </div>`;
  document.getElementById('overlays').appendChild(overlay);
  const body = overlay.querySelector('.mg-body');
  const status = overlay.querySelector('.mg-status');
  let done = false, closed = false, cleanup = null;

  const close = (completed = false) => {
    if (closed) return;
    closed = true;
    if (cleanup) cleanup();
    overlay.classList.add('closing');
    setTimeout(() => overlay.remove(), 180);
    if (!completed && onClose) onClose();
  };

  const api = {
    variant,
    audio,
    setStatus(text, kind = '') { status.textContent = text; status.className = `mg-status ${kind}`; },
    complete() {
      if (done) return;
      done = true;
      audio.taskDone();
      api.setStatus('Tarefa concluída! ✔', 'ok');
      overlay.querySelector('.mg-panel').classList.add('success');
      setTimeout(() => { close(true); onComplete && onComplete(); }, 650);
    },
    fail(text) { audio.error(); api.setStatus(text, 'bad'); overlay.querySelector('.mg-panel').classList.add('shake'); setTimeout(() => overlay.querySelector('.mg-panel')?.classList.remove('shake'), 400); },
  };
  overlay.querySelector('.x-btn').addEventListener('click', () => { audio.click(); close(false); });
  overlay.addEventListener('pointerdown', (e) => { if (e.target === overlay) close(false); });
  cleanup = (GAMES[type] || simple.wait)(body, api) || null;
  return { close: () => close(false), get done() { return done; } };
}
