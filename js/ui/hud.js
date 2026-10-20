// HUD durante a partida: barra de tarefas, lista, minimapa, botões de ação e avisos.
import { SABOTAGES } from '../core/sabotage.js';
import { RANDOM_EVENTS } from '../core/events.js';

const $ = (sel, root = document) => root.querySelector(sel);

export function toast(text, kind = '', ms = 3200) {
  const box = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = text;
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

export class Hud {
  constructor(onAction) {
    this.root = $('#hud');
    this.onAction = onAction;
    this.game = null;
    this.lastRoom = null;
    this.roomTimer = 0;
    this.taskSig = '';
    this.root.querySelectorAll('[data-action]').forEach((b) => {
      b.addEventListener('click', (e) => { e.stopPropagation(); this.onAction(b.dataset.action); });
    });
    $('.minimap', this.root).addEventListener('click', () => this.onAction('map'));
    const toggle = $('.tasklist-toggle', this.root);
    toggle.addEventListener('click', () => {
      const list = $('.tasklist', this.root);
      list.classList.toggle('collapsed');
      toggle.setAttribute('aria-expanded', String(!list.classList.contains('collapsed')));
    });
    this.buttons = Object.fromEntries([...this.root.querySelectorAll('.act')].map((b) => [b.dataset.action, b]));
  }

  attach(game, renderer) {
    this.game = game;
    this.renderer = renderer;
    this.lastRoom = null;
    this.taskSig = '';
    const me = game.local;
    const chip = $('.role-chip', this.root);
    chip.className = `role-chip ${me.isImpostor ? 'imp' : 'crew'}`;
    chip.textContent = game.tutorial ? 'TREINAMENTO' : me.isImpostor ? 'IMPOSTOR' : 'ALUNO';
    if (me.isImpostor) {
      const mates = game.players.filter((p) => p.isImpostor && p !== me).map((p) => p.name);
      chip.title = mates.length ? `Parceiros: ${mates.join(', ')}` : 'Você é o único impostor';
    } else chip.title = '';
    this.buttons.sabotage.style.display = me.isImpostor ? '' : 'none';
    this.buttons.vent.style.display = me.isImpostor ? '' : 'none';
    this.buttons.kill.style.display = me.isImpostor ? '' : 'none';
    this.buttons.report.style.display = '';
    $('.ghost-note', this.root).classList.add('hidden');
    const small = window.innerWidth < 640;
    $('.tasklist', this.root).classList.toggle('collapsed', small);
    this.show();
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  showRoom(name) {
    const el = $('.room-toast', this.root);
    el.textContent = name;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  ghostNote(text) {
    const el = $('.ghost-note', this.root);
    el.textContent = text;
    el.classList.toggle('hidden', !text);
  }

  update() {
    const g = this.game;
    if (!g) return;
    const me = g.local;

    // Barra de progresso coletiva
    const { done, total } = g.taskProgress();
    $('.taskbar-track i', this.root).style.width = `${total ? (done / total) * 100 : 0}%`;
    $('.taskbar', this.root).style.display = g.tutorial ? 'none' : '';

    // Lista de tarefas
    const sig = me.tasks.map((t) => `${t.stationId}:${t.done}`).join('|') + (g.sabotage.machinesDown ? 'M' : '');
    if (sig !== this.taskSig) {
      this.taskSig = sig;
      const ul = $('.tasklist ul', this.root);
      ul.innerHTML = '';
      if (me.isImpostor) {
        const li = document.createElement('li');
        li.className = 'imp-hint';
        li.textContent = 'Tarefas falsas: finja fazê-las para não levantar suspeitas.';
        ul.appendChild(li);
      }
      for (const t of me.tasks) {
        const s = g.map.stationById[t.stationId];
        const li = document.createElement('li');
        const blocked = g.sabotage.isStationBlocked(s);
        li.className = t.done ? 'done' : blocked ? 'blocked' : '';
        li.innerHTML = `<b>${g.roomName(s.room)}:</b> ${s.name}${s.long ? ' <em>(longa)</em>' : ''}`;
        ul.appendChild(li);
      }
    }

    // Nome da sala atual
    const room = g.roomAtPos(me.x, me.y);
    const rid = room?.id || null;
    if (rid !== this.lastRoom) {
      this.lastRoom = rid;
      if (room) this.showRoom(room.name);
    }

    // Faixa de sabotagem
    const sab = g.sabotage.active;
    const banner = $('.sab-banner', this.root);
    if (sab) {
      const def = SABOTAGES[sab.type];
      const parts = Object.entries(sab.fixed).map(([id, ok]) => `${ok ? '✔' : '✖'} ${g.map.fixById[id].name}`).join(' · ');
      banner.innerHTML = `<b>${def.critical ? '🚨' : '⚠️'} ${def.name}${def.critical ? ` — ${Math.ceil(sab.remaining)}s` : ''}</b><span>${me.isImpostor ? 'Sabotagem em andamento.' : def.alert}</span><small>${parts}</small>`;
      banner.className = `sab-banner ${def.critical ? 'critical' : ''}`;
    } else banner.className = 'sab-banner hidden';

    // Evento aleatório
    const ev = g.events.active;
    const evb = $('.event-banner', this.root);
    if (ev) { const d = RANDOM_EVENTS[ev.id]; evb.innerHTML = `<b>${d.name}</b> ${d.desc} <i>${Math.ceil(ev.remaining)}s</i>`; evb.className = 'event-banner'; }
    else evb.className = 'event-banner hidden';

    // Botões de ação e dica contextual
    const it = g.interactionsFor(me);
    this.interactions = it;
    const b = this.buttons;
    b.use.disabled = !it.use || it.use.disabled || it.use.kind === 'blocked';
    b.use.querySelector('.lbl').textContent = it.use?.kind === 'emergency' ? 'REUNIÃO' : it.use?.kind === 'cameras' ? 'CÂMERAS' : it.use?.kind === 'fix' ? 'CONSERTAR' : 'USAR';
    b.report.disabled = !it.report;
    if (me.isImpostor) {
      b.kill.disabled = !it.kill;
      b.kill.querySelector('.cd').textContent = me.alive && me.killCooldown > 0 ? Math.ceil(me.killCooldown) : '';
      b.kill.style.display = me.alive ? '' : 'none';
      b.vent.disabled = !it.vent;
      b.vent.style.display = me.alive ? '' : 'none';
      const sabCd = g.sabotage.cooldown;
      b.sabotage.querySelector('.cd').textContent = sabCd > 0 ? Math.ceil(sabCd) : '';
    }

    const prompt = $('.prompt', this.root);
    let text = '';
    if (me.busy?.kind === 'fake') text = `Fingindo tarefa... ${Math.round((me.busy.t / me.busy.dur) * 100)}%`;
    else if (it.report) text = '<kbd>R</kbd> Reportar aluno desacordado';
    else if (it.kill) text = `<kbd>Q</kbd> Eliminar ${it.kill.name}`;
    else if (it.use) text = it.use.disabled ? it.use.label : `<kbd>E</kbd> ${it.use.label}`;
    else if (it.vent) text = '<kbd>V</kbd> Entrar no duto de ventilação';
    prompt.innerHTML = text;
    prompt.classList.toggle('hidden', !text);

    // Minimapa
    const mm = $('.minimap', this.root);
    this.renderer.drawMap(mm);
  }
}
