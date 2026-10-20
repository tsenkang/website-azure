// Eventos aleatórios que alteram levemente a partida.
import { TILE as T } from '../config.js';

export const RANDOM_EVENTS = {
  piso: {
    name: 'Piso molhado!', desc: 'A equipe de limpeza passou no corredor. Ande com cuidado (mais devagar).', duration: 25,
    zones: [
      { x: 22 * T, y: 17 * T, w: 14 * T, h: 4 * T },
      { x: 52 * T, y: 37 * T, w: 14 * T, h: 4 * T },
      { x: 4 * T, y: 37 * T, w: 12 * T, h: 4 * T },
      { x: 66 * T, y: 17 * T, w: 14 * T, h: 4 * T },
    ],
  },
  lanche: { name: 'Hora do lanche!', desc: 'A cantina liberou coxinha. Quem passa pelo Pátio ganha energia extra (mais velocidade).', duration: 22 },
  wifi: { name: 'Wi-Fi caiu!', desc: 'A rede da escola oscilou: o minimapa fica fora do ar por alguns segundos.', duration: 15 },
};

export class RandomEvents {
  constructor(game) {
    this.game = game;
    this.active = null; // { id, remaining, zone }
    this.next = 70 + Math.random() * 40;
  }

  speedMultiplierAt(x, y) {
    const a = this.active;
    if (!a) return 1;
    if (a.id === 'piso') {
      const z = a.zone;
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return 0.6;
    }
    if (a.id === 'lanche') {
      const room = this.game.roomAtPos(x, y);
      if (room && room.id === 'patio') return 1.3;
    }
    return 1;
  }

  get minimapOff() { return this.active?.id === 'wifi'; }

  update(dt) {
    const g = this.game;
    if (this.active) {
      this.active.remaining -= dt;
      if (this.active.remaining <= 0) { g.emit('randomEventEnd', this.active); this.active = null; }
      return;
    }
    if (g.sabotage.active || g.tutorial) return;
    this.next -= dt;
    if (this.next > 0) return;
    this.next = 75 + Math.random() * 50;
    const ids = Object.keys(RANDOM_EVENTS);
    const id = ids[Math.floor(Math.random() * ids.length)];
    const def = RANDOM_EVENTS[id];
    this.active = { id, remaining: def.duration, zone: def.zones ? def.zones[Math.floor(Math.random() * def.zones.length)] : null };
    g.emit('randomEvent', { id, def, zone: this.active.zone });
    g.addLog(`Evento: ${def.name}`, 'event');
  }

  clear() { this.active = null; }
}
