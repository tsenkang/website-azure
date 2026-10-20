// HUD durante a partida: barra de tarefas, lista, minimapa, botões de ação e avisos.
import { SABOTAGES } from '../core/sabotage.js';
import { RANDOM_EVENTS } from '../core/events.js';
import { ICONS } from './icons.js';

const $ = (sel, root = document) => root.querySelector(sel);

export function toast(text, kind = '', ms = 3200) {
  const box = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = text;
  box.appendChild(t);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

export class Hud {
  constructor(onAction) {
    this.root = $('#hud');
    this.onAction = onAction;
    this.game = null;
    this.lastRoom = null;
    this.taskSig = '';
    this.root.querySelectorAll('[data-icon]').forEach((s) => { s.innerHTML = ICONS[s.dataset.icon] || ''; });
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
    for (const k of ['sabotage', 'vent', 'kill']) this.buttons[k].style.display = me.isImpostor ? '' : 'none';
    $('.ghost-note', this.root).classList.add('hidden');
    $('.tasklist', this.root).classList.toggle('collapsed', window.innerWidth < 640);
    this.netState(null);
    this.show();
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  netState(text) {
    const el = $('.net-badge', this.root);
    el.textContent = text || '';
    el.classList.toggle('hidden', !text);
  }

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

    const { done, total } = g.taskProgress();
    $('.taskbar-track i', this.root).style.width = `${total ? (done / total) * 100 : 0}%`;
    $('.taskbar', this.root).style.display = g.tutorial ? 'none' : '';

    const waiting = me.tasks.some((t) => !t.done && t.readyAt > g.time);
    const sig = me.tasks.map((t) => `${t.stationId}:${t.done}:${t.step}`).join('|') + (g.sabotage.machinesDown ? 'M' : '') + (waiting ? Math.ceil(g.time) : '');
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
        const multi = t.stations.length > 1 && !t.done;
        const wait = !t.done && t.readyAt > g.time ? ` <em>(volte em ${Math.ceil(t.readyAt - g.time)}s)</em>` : '';
        li.className = t.done ? 'done' : blocked ? 'blocked' : wait ? 'waiting' : '';
        li.innerHTML = `<b>${g.roomName(s.room)}:</b> ${s.name}${multi ? ` <em>(${t.step + 1}/${t.stations.length})</em>` : ''}${wait}${s.visual && g.settings.visualTasks ? ' <em>(visual)</em>' : ''}`;
        ul.appendChild(li);
      }
    }

    const room = g.roomAtPos(me.x, me.y);
    const rid = room?.id || null;
    if (rid !== this.lastRoom) {
      this.lastRoom = rid;
      if (room) this.showRoom(room.name);
    }

    const sab = g.sabotage.active;
    const banner = $('.sab-banner', this.root);
    if (sab && SABOTAGES[sab.type]) {
      const def = SABOTAGES[sab.type];
      const parts = Object.entries(sab.fixed || {}).map(([id, ok]) => `${ok ? '✔' : '✖'} ${g.map.fixById[id]?.name || id}`).join(' · ');
      banner.innerHTML = `<b>${def.name}${def.critical ? ` — ${Math.ceil(sab.remaining)}s` : ''}</b><span>${me.isImpostor ? 'Sabotagem em andamento.' : def.alert}</span><small>${parts}</small>`;
      banner.className = `sab-banner ${def.critical ? 'critical' : ''}`;
    } else banner.className = 'sab-banner hidden';

    const ev = g.events.active;
    const evb = $('.event-banner', this.root);
    if (ev && RANDOM_EVENTS[ev.id]) { const d = RANDOM_EVENTS[ev.id]; evb.innerHTML = `<b>${d.name}</b> ${d.desc} <i>${Math.ceil(ev.remaining)}s</i>`; evb.className = 'event-banner'; }
    else evb.className = 'event-banner hidden';

    const it = g.interactionsFor(me);
    this.interactions = it;
    const b = this.buttons;
    b.use.disabled = !it.use || it.use.disabled || it.use.kind === 'blocked';
    const useLabels = { emergency: 'REUNIÃO', cameras: 'CÂMERAS', admin: 'ADMIN', fix: 'CONSERTAR' };
    const useIcons = { emergency: 'bell', cameras: 'cameras', admin: 'admin', fix: 'fix' };
    const kind = it.use?.kind;
    b.use.querySelector('.lbl').textContent = useLabels[kind] || 'USAR';
    const ui = useIcons[kind] || 'use';
    if (b.use.dataset.ico !== ui) { b.use.dataset.ico = ui; b.use.querySelector('.ico').innerHTML = ICONS[ui]; }
    b.report.disabled = !it.report;
    if (me.isImpostor) {
      b.kill.disabled = !it.kill;
      b.kill.querySelector('.cd').textContent = me.alive && me.killCooldown > 0 && !me.inVent ? Math.ceil(me.killCooldown) : '';
      b.kill.style.display = me.alive ? '' : 'none';
      const inVent = !!me.inVent;
      b.vent.disabled = !(inVent || it.vent);
      b.vent.classList.toggle('invent', inVent);
      b.vent.querySelector('.lbl').textContent = inVent ? 'SAIR' : 'DUTO';
      const vi = inVent ? 'exit' : 'vent';
      if (b.vent.dataset.ico !== vi) { b.vent.dataset.ico = vi; b.vent.querySelector('.ico').innerHTML = ICONS[vi]; }
      b.vent.style.display = me.alive ? '' : 'none';
      const sabCd = g.sabotage.cooldown;
      b.sabotage.querySelector('.cd').textContent = sabCd > 0 && !g.sabotage.active ? Math.ceil(sabCd) : '';
    }

    const prompt = $('.prompt', this.root);
    let text = '';
    if (me.inVent) text = 'Escondido no duto: clique nas setas (ou W A S D) para trocar de saída, <kbd>V</kbd> para sair';
    else if (me.busy?.kind === 'fake') text = `Fingindo tarefa... ${Math.round((me.busy.t / me.busy.dur) * 100)}%`;
    else if (it.report) text = '<kbd>R</kbd> Reportar aluno desacordado';
    else if (it.kill) text = `<kbd>Q</kbd> Eliminar ${it.kill.name}`;
    else if (it.use) text = it.use.disabled ? it.use.label : `<kbd>E</kbd> ${it.use.label}`;
    else if (it.vent) text = '<kbd>V</kbd> Entrar no duto de ventilação';
    prompt.innerHTML = text;
    prompt.classList.toggle('hidden', !text);

    this.renderer.drawMap($('.minimap', this.root));
  }
}
