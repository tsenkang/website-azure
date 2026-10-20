// Interface da reunião: chat livre, atalhos de fala, votação, resultado e expulsão.
import { drawAvatar } from '../render/sprites.js';
import { audio } from '../audio.js';
import { icon } from './icons.js';
import { CHAT_MAX } from '../core/chat.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class MeetingUI {
  constructor() {
    this.el = null;
    this.game = null;
    this.selected = null;
    this.actions = null;
  }

  // actions: { vote(target), chat(text), quick(kind, targetId) }
  open(game, st, actions) {
    this.game = game;
    this.actions = actions;
    this.selected = null;
    const me = game.local;
    const reasonText = st.kind === 'report'
      ? `${esc(st.caller.name)} encontrou ${esc(st.victim?.name || 'alguém')} desacordado(a) ${game.roomPhrase(st.room)}.`
      : `${esc(st.caller.name)} apertou o sinal de emergência.`;
    const el = document.createElement('div');
    el.className = 'meeting';
    el.innerHTML = `
      <div class="meeting-panel">
        <header>
          <div class="m-title"><span class="m-icon">${icon(st.kind === 'report' ? 'report' : 'bell')}</span>
            <div><h2>${st.kind === 'report' ? 'OCORRÊNCIA REPORTADA' : 'REUNIÃO DE EMERGÊNCIA'}</h2><p>${reasonText}</p></div></div>
          <div class="m-timer"><small class="m-phase">Discussão</small><b>--</b></div>
        </header>
        <div class="m-body">
          <div class="m-players"></div>
          <aside class="m-chat">
            <div class="m-log" aria-live="polite"></div>
            ${me.alive ? `
            <form class="m-input"><input type="text" id="chatbox" maxlength="${CHAT_MAX}" placeholder="Escreva no chat... (Enter)" autocomplete="off" aria-label="Mensagem"><button type="submit" aria-label="Enviar">${icon('send')}</button></form>
            <div class="m-quick"><button data-say="where">Onde eu estava</button><button data-say="notme">Não fui eu</button><button data-say="skip">Sem provas</button></div>`
    : '<p class="m-dead">Você está desacordado(a) e só pode assistir à reunião.</p>'}
          </aside>
        </div>
        <footer>
          <button class="btn skip-vote" ${me.alive ? '' : 'disabled'}>Pular votação</button>
          <div class="skip-chips"></div>
          <div class="confirm hidden"><span></span><button class="btn primary yes">Confirmar voto</button><button class="btn no">Cancelar</button></div>
        </footer>
      </div>
      <div class="eject hidden"></div>`;
    document.getElementById('screens').appendChild(el);
    this.el = el;

    const grid = el.querySelector('.m-players');
    for (const p of game.players) {
      const card = document.createElement('button');
      card.className = 'm-card';
      card.dataset.id = p.id;
      card.innerHTML = `<canvas></canvas><div class="info"><b>${esc(p.name)}${p === me ? ' (você)' : ''}</b><small>${p.isBot ? 'BOT' : 'JOGADOR'}${me.isImpostor && p.isImpostor ? ' · <span class="imp">IMPOSTOR</span>' : ''}</small></div><span class="flag"></span><div class="chips"></div>`;
      grid.appendChild(card);
      card.addEventListener('click', () => this.select(p));
    }
    for (const c of st.chat) this.addChat({ speaker: game.playerById(c.id), text: c.text });

    const form = el.querySelector('.m-input');
    if (form) {
      const input = form.querySelector('input');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        this.actions.chat(text);
        input.value = '';
        audio.click();
      });
      // Enter em qualquer lugar foca o chat.
      this.keyHandler = (e) => { if (e.key === 'Enter' && document.activeElement !== input) { e.preventDefault(); input.focus(); } };
      window.addEventListener('keydown', this.keyHandler);
    }
    el.querySelectorAll('[data-say]').forEach((b) => b.addEventListener('click', () => { this.actions.quick(b.dataset.say, null); audio.click(); }));
    el.querySelector('.skip-vote').addEventListener('click', () => this.select('skip'));
    el.querySelector('.confirm .no').addEventListener('click', () => { this.selected = null; this.refresh(); });
    el.querySelector('.confirm .yes').addEventListener('click', () => {
      if (this.selected == null) return;
      this.actions.vote(this.selected === 'skip' ? 'skip' : this.selected.id);
      audio.vote();
      this.voted = true;
      this.selected = null;
      this.refresh();
    });
    this.voted = false;
    this.refresh();
  }

  select(target) {
    const g = this.game, st = g.meeting.state;
    if (!st || st.phase !== 'voting' || !g.local.alive || this.voted || g.local.id in st.votes) return;
    if (target !== 'skip' && !target.alive) return;
    this.selected = target;
    audio.click();
    this.refresh();
  }

  addChat({ speaker, text }) {
    if (!this.el || !speaker) return;
    const log = this.el.querySelector('.m-log');
    const row = document.createElement('div');
    row.className = `m-msg ${speaker === this.game.local ? 'mine' : ''}`;
    row.innerHTML = `<canvas></canvas><div><b style="color:${speaker.color.dark}">${esc(speaker.name)}${speaker.isBot ? ' <i>BOT</i>' : ''}</b><p></p></div>`;
    row.querySelector('p').textContent = text;
    log.appendChild(row);
    drawAvatar(row.querySelector('canvas'), speaker.look, { scale: 0.85 });
    log.scrollTop = log.scrollHeight;
    if (speaker !== this.game.local) audio.tone(500 + Math.random() * 200, 0.05, { type: 'triangle', vol: 0.06 });
  }

  refresh() {
    const g = this.game, st = g.meeting.state;
    if (!this.el || !st) return;
    const me = g.local;
    const phaseEl = this.el.querySelector('.m-phase');
    const timer = this.el.querySelector('.m-timer b');
    if (st.phase === 'discussion') { phaseEl.textContent = 'Discussão (votação em breve)'; timer.textContent = Math.max(0, Math.ceil(st.discussionEnd - st.t)); }
    else if (st.phase === 'voting') { phaseEl.textContent = 'Votação'; timer.textContent = Math.max(0, Math.ceil(st.votingEnd - st.t)); }
    else { phaseEl.textContent = 'Resultado'; timer.textContent = '✔'; }
    this.el.classList.toggle('voting', st.phase === 'voting');
    const iVoted = this.voted || me.id in st.votes;

    for (const card of this.el.querySelectorAll('.m-card')) {
      const p = g.playerById(card.dataset.id);
      const voted = p.id in st.votes;
      card.classList.toggle('dead', !p.alive);
      card.classList.toggle('selected', this.selected !== 'skip' && this.selected?.id === p.id);
      card.classList.toggle('caller', st.caller === p);
      card.disabled = st.phase !== 'voting' || !p.alive || !me.alive || iVoted;
      const flag = card.querySelector('.flag');
      flag.textContent = !p.alive ? 'fora' : st.phase === 'results' || st.phase === 'eject' ? '' : voted ? 'votou ✔' : '';
      if (!card.dataset.drawn || card.dataset.alive !== String(p.alive)) {
        drawAvatar(card.querySelector('canvas'), p.look, { dead: !p.alive, scale: 1 });
        card.dataset.drawn = '1'; card.dataset.alive = String(p.alive);
      }
    }
    const confirm = this.el.querySelector('.confirm');
    if (this.selected != null && st.phase === 'voting') {
      confirm.classList.remove('hidden');
      confirm.querySelector('span').textContent = this.selected === 'skip' ? 'Pular a votação?' : `Votar em ${this.selected.name}?`;
    } else confirm.classList.add('hidden');
    this.el.querySelector('.skip-vote').disabled = st.phase !== 'voting' || !me.alive || iVoted;
  }

  showResults(result) {
    if (!this.el) return;
    const g = this.game;
    for (const card of this.el.querySelectorAll('.m-card')) card.querySelector('.chips').innerHTML = '';
    const chip = (voterId) => {
      const v = g.playerById(voterId);
      const c = document.createElement('i');
      c.className = 'chip'; c.style.background = v.color.hex; c.title = v.name;
      return c;
    };
    let delay = 0;
    for (const [voter, target] of Object.entries(result.votes || {})) {
      setTimeout(() => {
        if (!this.el) return;
        const box = target === 'skip' ? this.el.querySelector('.skip-chips') : this.el.querySelector(`.m-card[data-id="${target}"] .chips`);
        box?.appendChild(chip(voter));
        audio.tone(600, 0.05, { type: 'triangle', vol: 0.08 });
      }, delay);
      delay += 160;
    }
    this.el.querySelector('.skip-chips').insertAdjacentHTML('afterbegin', '<small>Pularam:</small>');
    this.selected = null;
    this.refresh();
  }

  showEject(result) {
    if (!this.el) return;
    const g = this.game;
    const ej = result.ejected;
    const box = this.el.querySelector('.eject');
    box.classList.remove('hidden');
    let line1, line2 = '';
    if (!ej) line1 = result.tie ? 'Empate! Ninguém foi encaminhado à coordenação.' : 'A turma decidiu pular. Ninguém foi encaminhado.';
    else {
      line1 = `${ej.name} foi encaminhado(a) à coordenação.`;
      if (g.settings.revealRoles) {
        const left = result.impostorsLeft != null ? result.impostorsLeft : g.players.filter((p) => p.alive && p.isImpostor && p !== ej).length;
        line2 = `${ej.name} ${ej.isImpostor ? 'ERA' : 'NÃO era'} um impostor. ${left} impostor${left === 1 ? '' : 'es'} restante${left === 1 ? '' : 's'}.`;
      }
    }
    box.innerHTML = `<div class="hall"><div class="door">COORDENAÇÃO</div>${ej ? '<canvas class="walker"></canvas>' : ''}</div><h2 class="type"></h2><p class="type2"></p>`;
    if (ej) {
      const c = box.querySelector('.walker');
      let t = 0;
      const anim = () => {
        if (!this.el || !c.isConnected) return;
        t += 1 / 60;
        drawAvatar(c, ej.look, { moving: true, t, scale: 2 });
        if (t < 5) requestAnimationFrame(anim);
      };
      anim();
    }
    const typeText = (el, text, speed, cb) => {
      let i = 0;
      const step = () => { if (!el.isConnected) return; el.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(step, speed); else cb && cb(); };
      step();
    };
    audio.eject();
    typeText(box.querySelector('.type'), line1, 35, () => {
      if (line2) setTimeout(() => { audio.reveal(ej.isImpostor); typeText(box.querySelector('.type2'), line2, 30); }, 300);
    });
  }

  close() {
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    this.keyHandler = null;
    if (this.el) this.el.remove();
    this.el = null;
  }
}
