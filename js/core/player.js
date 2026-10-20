// Entidade de jogador (humano ou bot). Só dados e estado — sem renderização.
import { PLAYER_COLORS, ACCESSORIES, SKIN_TONES, HAIR_COLORS } from '../config.js';

let nextId = 0;
export function resetPlayerIds() { nextId = 0; }

export function randomLook(colorId, rng = Math.random) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  return {
    color: colorId,
    accessory: pick(ACCESSORIES.filter((a) => a.id !== 'nenhum')).id,
    skin: pick(SKIN_TONES),
    hair: pick(HAIR_COLORS),
    hairStyle: Math.floor(rng() * 3),
  };
}

export function colorOf(look) {
  return PLAYER_COLORS.find((c) => c.id === look.color) || PLAYER_COLORS[0];
}

export class Player {
  constructor({ name, look, isBot }) {
    this.id = nextId++;
    this.name = name;
    this.look = look;
    this.isBot = isBot;
    this.role = 'crew';
    this.alive = true;
    this.ejected = false;
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.moving = false;
    this.animT = Math.random() * 10;
    this.tasks = [];
    this.killCooldown = 0;
    this.ventCooldown = 0;
    this.emergencyUses = 1;
    this.busy = null; // tarefa/ação em andamento: { kind, until, ... }
    this.speedMul = 1;
    this.stats = { tasksDone: 0, kills: 0, meetingsCalled: 0, reports: 0, votesCast: 0, votesCorrect: 0, timeAlive: 0, sabotages: 0 };
    this.deathTime = null;
    this.killedBy = null;
    this.brain = null;
  }

  get isImpostor() { return this.role === 'impostor'; }
  get isGhost() { return !this.alive; }
  get color() { return colorOf(this.look); }
  get tasksRemaining() { return this.tasks.filter((t) => !t.done).length; }
}
