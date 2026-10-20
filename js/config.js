// Constantes globais do jogo SENAI: SUSPEITOS.
export const TILE = 32;
export const MAP_W = 88;
export const MAP_H = 58;

export const PLAYER_RADIUS = 10;
export const BASE_SPEED = 145; // px/s

export const VISION = {
  crew: 6.5 * TILE,
  impostor: 8 * TILE,
  lightsOut: 2.4 * TILE,
};

export const KILL_RANGE = 1.7 * TILE;
export const REPORT_RANGE = 2.4 * TILE;
export const USE_RANGE = 1.5 * TILE;
export const VENT_RANGE = 1.1 * TILE;
export const EMERGENCY_RANGE = 1.9 * TILE;

export const PLAYER_COLORS = [
  { id: 'azul', name: 'Azul', hex: '#2f6fde', dark: '#1c468f' },
  { id: 'vermelho', name: 'Vermelho', hex: '#d93b3b', dark: '#8f2020' },
  { id: 'verde', name: 'Verde', hex: '#2fa35a', dark: '#1b6537' },
  { id: 'amarelo', name: 'Amarelo', hex: '#f2c230', dark: '#a07a10' },
  { id: 'laranja', name: 'Laranja', hex: '#f07f22', dark: '#9c4c0e' },
  { id: 'roxo', name: 'Roxo', hex: '#7a4fd6', dark: '#4b2c8c' },
  { id: 'rosa', name: 'Rosa', hex: '#ec6fb4', dark: '#a0407a' },
  { id: 'ciano', name: 'Ciano', hex: '#2cc6d6', dark: '#16808b' },
  { id: 'branco', name: 'Branco', hex: '#e8edf3', dark: '#9aa6b5' },
  { id: 'grafite', name: 'Grafite', hex: '#4a5160', dark: '#2a2e38' },
  { id: 'marrom', name: 'Marrom', hex: '#8a5a36', dark: '#56361e' },
  { id: 'lima', name: 'Lima', hex: '#a6d93b', dark: '#66871f' },
];

export const ACCESSORIES = [
  { id: 'capacete', name: 'Capacete de segurança' },
  { id: 'oculos', name: 'Óculos de proteção' },
  { id: 'bone', name: 'Boné' },
  { id: 'fone', name: 'Fone de ouvido' },
  { id: 'touca', name: 'Touca' },
  { id: 'jaleco', name: 'Jaleco' },
  { id: 'nenhum', name: 'Nenhum' },
];

export const SKIN_TONES = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#6b3f1d'];
export const HAIR_COLORS = ['#2b1d14', '#4a2f1b', '#8a5a2b', '#d9b26a', '#1a1a1a', '#b5462e'];

export const BOT_NAMES = [
  'Ana Clara', 'Bruno', 'Camila', 'Diego', 'Eduarda', 'Felipe', 'Giovana', 'Heitor',
  'Isabela', 'João Pedro', 'Larissa', 'Matheus', 'Nicole', 'Otávio', 'Paula', 'Rafael',
  'Sofia', 'Thiago', 'Vitória', 'Yuri', 'Lucas', 'Beatriz',
];

// Parâmetros de dificuldade (afetam principalmente os bots).
export const DIFFICULTY = {
  facil: {
    label: 'Fácil', botSpeed: 0.85, botVision: 0.8, observe: 0.55, killCooldown: 35,
    critTime: 60, killCare: 0.35, voteThreshold: 55, sabotageRate: 0.012, ventUse: 0.25,
    reactTime: 2.2, selfReport: 0, lieSkill: 0.35, randomVote: 0.25,
  },
  normal: {
    label: 'Normal', botSpeed: 0.95, botVision: 0.9, observe: 0.8, killCooldown: 28,
    critTime: 48, killCare: 0.75, voteThreshold: 42, sabotageRate: 0.02, ventUse: 0.6,
    reactTime: 1.2, selfReport: 0.1, lieSkill: 0.65, randomVote: 0.1,
  },
  dificil: {
    label: 'Difícil', botSpeed: 1.0, botVision: 1.0, observe: 1.0, killCooldown: 22,
    critTime: 40, killCare: 1.0, voteThreshold: 34, sabotageRate: 0.03, ventUse: 0.9,
    reactTime: 0.6, selfReport: 0.2, lieSkill: 0.9, randomVote: 0.03,
  },
};

export const DEFAULT_SETTINGS = {
  players: 8,
  impostors: 1,
  difficulty: 'normal',
  tasksPerPlayer: 5,
  revealRoles: true,
  rolePref: 'aleatorio',
  discussionTime: 12,
  votingTime: 35,
};
