// Janela de minijogo. Cada minijogo recebe um contêiner e uma API com complete()/setStatus().
import { audio } from '../audio.js';
import * as technical from './games/technical.js';
import * as knowledge from './games/knowledge.js';
import * as simple from './games/simple.js';
import * as ship from './games/ship.js';
import { icon } from './icons.js';

const GAMES = {
  wires: technical.wires,
  circuit: technical.circuit,
  robot: technical.robot,
  gauge: technical.gauge,
  keypad: knowledge.keypad,
  switches: simple.switches,
  hold: simple.hold,
  scan: simple.scan,
  card: ship.card,
  upload: ship.upload,
  trash: ship.trash,
  debris: ship.debris,
  shields: ship.shields,
  fuel: ship.fuel,
  divert: ship.divert,
  accept: ship.accept,
  simon: ship.simon,
  manifold: ship.manifold,
  sample: ship.sample,
  filter: ship.filter,
  steering: ship.steering,
};

export const HELP = {
  wires: 'Arraste cada cabo da esquerda até o terminal da mesma cor.',
  circuit: 'Clique nas peças para girá-las e ligar a bateria ao LED.',
  robot: 'Ajuste os dois eixos até o braço coincidir com a posição alvo.',
  gauge: 'Aperte PARAR (ou Espaço) quando o ponteiro estiver na faixa verde. Três acertos.',
  keypad: 'Digite o código mostrado e confirme.',
  switches: 'Ligue todos os disjuntores do quadro.',
  hold: 'Mantenha o botão pressionado até estabilizar.',
  scan: 'Tarefa visual: quem estiver por perto vê o escaneamento acontecer.',
  card: 'Passe o crachá pelo leitor na velocidade certa.',
  upload: 'Transfira os dados sem fechar a janela.',
  trash: 'Segure a alavanca até o lixo cair todo.',
  debris: 'Mire e clique na sucata antes que ela entre na máquina.',
  shields: 'Clique nos escudos vermelhos até todos ficarem brancos.',
  fuel: 'Segure o botão até encher.',
  divert: 'Suba a chave indicada até o topo.',
  accept: 'Aceite a energia que foi desviada para cá.',
  simon: 'Repita a sequência de luzes. Cinco etapas.',
  manifold: 'Clique nos números em ordem, de 1 a 10.',
  sample: 'Inicie a análise e volte depois para escolher a amostra alterada.',
  filter: 'Arraste toda a sujeira até a sucção.',
  steering: 'Leve a mira até o centro.',
};

export function openMinigame(type, { title, subtitle, variant, phase = 0, onComplete, onClose }) {
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
    phase,
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
  cleanup = (GAMES[type] || ship.accept)(body, api) || null;
  return { close: () => close(false), get done() { return done; } };
}
