// Tutorial interativo: passos guiados que observam o estado real da partida de treino.
import { TILE as T } from '../config.js';
import { audio } from '../audio.js';

export class Tutorial {
  constructor(game, renderer, { onFinish, isMapOpen }) {
    this.game = game;
    this.renderer = renderer;
    this.onFinish = onFinish;
    this.isMapOpen = isMapOpen;
    this.step = 0;
    this.moved = 0;
    this.mapWasOpen = false;
    this.startPos = { x: game.local.x, y: game.local.y };
    const d = game.map.tutorial.dummy;
    this.dummy = { px: d.x * T, py: d.y * T };
    game.bodies.push({ id: 'dummy', dummy: true, x: this.dummy.px, y: this.dummy.py, time: 0, room: 'patio' });
    this.panel = document.createElement('div');
    this.panel.className = 'tutorial-panel';
    document.getElementById('screens').appendChild(this.panel);
    this.unsub = game.on('dummyReport', () => this.finishReport());
    this.steps = [
      { text: 'Bem-vindo(a) ao treinamento! Use <kbd>W A S D</kbd> ou as <kbd>setas</kbd> para andar pela recepção.', done: () => this.moved > 160 },
      { text: 'Siga a seta amarela até a <b>Sala de Aula 12</b>. O nome da sala aparece no topo quando você entra.', target: () => this.game.map.roomById.aula, done: () => this.game.roomAtPos(this.game.local.x, this.game.local.y)?.id === 'aula' },
      { text: 'Tarefas aparecem com um <b>!</b> amarelo. Chegue perto da mesa do professor e aperte <kbd>E</kbd> para fazer a <b>prova surpresa</b>.', target: () => this.game.map.stationById.aula_prova, done: () => this.game.local.tasks.find((t) => t.stationId === 'aula_prova').done },
      { text: 'Mandou bem! Abra o mapa com <kbd>M</kbd> (ou clique no minimapa) para ver onde estão suas tarefas. Depois feche com <kbd>M</kbd>.', done: () => { if (this.isMapOpen()) this.mapWasOpen = true; return this.mapWasOpen && !this.isMapOpen(); } },
      { text: 'Vá ao <b>Pátio</b> e monte o lanche da cantina (tarefa com <b>!</b>). A barra de tarefas da turma enche quando todos colaboram.', target: () => this.game.map.stationById.cantina_lanche, done: () => this.game.local.tasks.find((t) => t.stationId === 'cantina_lanche').done },
      { text: 'Tem um <b>boneco de primeiros socorros</b> caído no Pátio. Chegue perto e aperte <kbd>R</kbd> para reportar a ocorrência.', target: () => this.dummy, done: () => false },
    ];
    this.render();
  }

  render() {
    const s = this.steps[this.step];
    this.panel.innerHTML = `<small>TREINAMENTO · PASSO ${this.step + 1}/${this.steps.length}</small><p>${s.text}</p><button class="btn tiny ghost">Sair do tutorial</button>`;
    this.panel.querySelector('button').onclick = () => this.destroy(true);
    const tgt = s.target ? s.target() : null;
    this.renderer.targets = tgt ? [{ x: tgt.px ?? tgt.cx, y: tgt.py ?? tgt.cy }] : [];
    this.panel.classList.remove('pop'); void this.panel.offsetWidth; this.panel.classList.add('pop');
  }

  update() {
    const me = this.game.local;
    this.moved = Math.max(this.moved, Math.hypot(me.x - this.startPos.x, me.y - this.startPos.y));
    const s = this.steps[this.step];
    if (s && s.done()) {
      this.step++;
      audio.fixed();
      if (this.step < this.steps.length) this.render();
    }
  }

  finishReport() {
    if (this.step < this.steps.length - 1) return;
    this.renderer.targets = [];
    audio.bell();
    this.panel.innerHTML = `
      <small>TREINAMENTO CONCLUÍDO</small>
      <p><b>Reuniões:</b> quando alguém reporta ou aperta o sinal de emergência no Pátio, todos discutem e votam. O mais votado é encaminhado à coordenação; empate ou maioria de "pular" não expulsa ninguém.</p>
      <p><b>Se você for impostor:</b> <kbd>Q</kbd> elimina um aluno próximo, <kbd>F</kbd> abre o painel de sabotagem e <kbd>V</kbd> usa os dutos de ventilação. Finja fazer tarefas para não levantar suspeitas!</p>
      <p><b>Sabotagens:</b> siga as setas vermelhas para consertar. A sobrecarga da subestação exige consertar dois consoles antes do tempo acabar.</p>
      <button class="btn primary">Concluir e voltar ao menu</button>`;
    this.panel.querySelector('button').onclick = () => this.destroy(true);
  }

  destroy(finish = false) {
    this.unsub && this.unsub();
    this.renderer.targets = [];
    this.panel.remove();
    if (finish) this.onFinish();
  }
}
