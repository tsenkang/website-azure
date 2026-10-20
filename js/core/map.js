// Definição e construção do mapa: uma unidade técnica fictícia inspirada no SENAI.
// Tudo é baseado em uma grade de tiles; móveis sólidos ocupam tiles inteiros.
import { TILE as T, MAP_W, MAP_H, USE_RANGE, EMERGENCY_RANGE } from '../config.js';

export const ROOM_DEFS = [
  { id: 'oficina', name: 'Oficina Mecânica', prep: 'na', x: 2, y: 2, w: 18, h: 14, floor: 'concrete', light: '#ffcf7a' },
  { id: 'eletronica', name: 'Lab. de Eletrônica', prep: 'no', x: 21, y: 2, w: 18, h: 14, floor: 'esd', light: '#7fd8ff' },
  { id: 'automacao', name: 'Oficina de Automação', prep: 'na', x: 40, y: 2, w: 22, h: 14, floor: 'epoxy', light: '#a6bcff' },
  { id: 'labtec', name: 'Lab. Técnico Especial', prep: 'no', x: 63, y: 2, w: 23, h: 14, floor: 'hazard', light: '#ff8f5e' },
  { id: 'corr_n', name: 'Corredor Norte', prep: 'no', x: 2, y: 17, w: 84, h: 4, floor: 'corridor', corridor: true },
  { id: 'almox', name: 'Almoxarifado', prep: 'no', x: 2, y: 22, w: 14, h: 14, floor: 'concreteDark', dim: 0.62, light: '#c9a46a' },
  { id: 'corr_w', name: 'Corredor Oeste', prep: 'no', x: 17, y: 21, w: 3, h: 16, floor: 'corridor', corridor: true },
  { id: 'aula', name: 'Sala de Aula 12', prep: 'na', x: 21, y: 22, w: 16, h: 14, floor: 'vinyl', light: '#fff2c4' },
  { id: 'patio', name: 'Pátio e Cantina', prep: 'no', x: 38, y: 22, w: 24, h: 14, floor: 'pavers', light: '#fff6d8' },
  { id: 'corr_e', name: 'Corredor Leste', prep: 'no', x: 63, y: 21, w: 3, h: 16, floor: 'corridor', corridor: true },
  { id: 'info', name: 'Lab. de Informática', prep: 'no', x: 67, y: 22, w: 19, h: 14, floor: 'carpet', light: '#8fc4ff' },
  { id: 'corr_s', name: 'Corredor Sul', prep: 'no', x: 2, y: 37, w: 84, h: 4, floor: 'corridor', corridor: true },
  { id: 'manutencao', name: 'Área de Manutenção', prep: 'na', x: 2, y: 42, w: 18, h: 14, floor: 'concrete', light: '#ffb36b' },
  { id: 'professores', name: 'Sala dos Professores', prep: 'na', x: 21, y: 42, w: 16, h: 14, floor: 'wood', light: '#ffe2b0' },
  { id: 'entrada', name: 'Entrada e Recepção', prep: 'na', x: 38, y: 42, w: 24, h: 14, floor: 'marble', light: '#ffffff' },
  { id: 'biblioteca', name: 'Biblioteca Técnica', prep: 'na', x: 63, y: 42, w: 23, h: 14, floor: 'carpetWarm', light: '#ffd9a8' },
];

export const DOOR_DEFS = [
  { rooms: ['oficina'], x: 8, y: 16, w: 3, h: 1 },
  { rooms: ['eletronica'], x: 28, y: 16, w: 3, h: 1 },
  { rooms: ['eletronica', 'automacao'], x: 39, y: 8, w: 1, h: 2 },
  { rooms: ['automacao'], x: 49, y: 16, w: 4, h: 1 },
  { rooms: ['labtec'], x: 72, y: 16, w: 3, h: 1 },
  { rooms: ['almox'], x: 16, y: 27, w: 1, h: 2 },
  { rooms: ['aula'], x: 20, y: 25, w: 1, h: 2 },
  { rooms: ['aula'], x: 27, y: 36, w: 3, h: 1 },
  { rooms: ['patio'], x: 46, y: 21, w: 8, h: 1 },
  { rooms: ['patio'], x: 46, y: 36, w: 8, h: 1 },
  { rooms: ['patio'], x: 62, y: 28, w: 1, h: 2 },
  { rooms: ['info'], x: 66, y: 27, w: 1, h: 2 },
  { rooms: ['info'], x: 75, y: 21, w: 3, h: 1 },
  { rooms: ['manutencao'], x: 9, y: 41, w: 3, h: 1 },
  { rooms: ['manutencao', 'professores'], x: 20, y: 48, w: 1, h: 2 },
  { rooms: ['professores'], x: 27, y: 41, w: 3, h: 1 },
  { rooms: ['entrada'], x: 45, y: 41, w: 10, h: 1 },
  { rooms: ['biblioteca'], x: 72, y: 41, w: 3, h: 1 },
];

const F = (type, x, y, w, h, extra = {}) => ({ type, x, y, w, h, solid: true, opaque: false, ...extra });
const TALL = { opaque: true };

export const FURNITURE_DEFS = [
  // Oficina mecânica
  F('toolboard', 3, 2, 6, 1),
  F('lathe', 10, 3, 4, 2), F('lathe', 15, 3, 4, 2),
  F('workbench', 4, 7, 5, 2), F('workbench', 12, 7, 5, 2),
  F('drill', 3, 11, 2, 2), F('compressor', 8, 12, 2, 2), F('cnc', 13, 11, 4, 3),
  // Laboratório de eletrônica
  F('cabinet', 22, 2, 4, 1), F('epanel', 34, 2, 3, 1),
  F('ebench', 23, 5, 6, 2), F('ebench', 31, 5, 6, 2), F('ebench', 23, 10, 6, 2), F('ebench', 31, 10, 6, 2),
  // Oficina de automação
  F('robot', 43, 4, 3, 3), F('robot', 55, 4, 3, 3), F('conveyor', 47, 5, 7, 1),
  F('clp', 59, 2, 3, 1), F('printer3d', 42, 11, 2, 2), F('printer3d', 45, 11, 2, 2), F('wsdesk', 52, 11, 5, 2),
  // Laboratório técnico especial
  F('transformer', 66, 3, 5, 4), F('hvcabinet', 74, 2, 4, 1), F('console', 79, 4, 3, 2),
  F('chamber', 66, 10, 6, 4, TALL), F('generator', 76, 10, 4, 3),
  // Almoxarifado
  F('shelf', 3, 23, 7, 1, TALL), F('shelf', 3, 26, 7, 1, TALL), F('shelf', 3, 29, 7, 1, TALL), F('shelf', 3, 32, 7, 1, TALL),
  F('crates', 11, 23, 3, 2, TALL), F('pallet', 12, 31, 2, 2),
  // Sala de aula
  F('teacherdesk', 30, 23, 4, 1), F('projector', 22, 22, 1, 1),
  ...[27, 30, 33].flatMap((y) => [23, 27, 31].map((x) => F('studentdesk', x, y, 2, 1))),
  // Pátio e cantina
  F('emergencytable', 49, 28, 2, 2), F('roundtable', 42, 25, 2, 2), F('roundtable', 42, 31, 2, 2),
  F('roundtable', 56, 25, 2, 2), F('roundtable', 56, 31, 2, 2), F('cantinacounter', 39, 34, 6, 1),
  F('vending', 58, 22, 2, 1), F('recyclebins', 59, 34, 3, 1),
  F('planter', 38, 22, 1, 1), F('planter', 61, 22, 1, 1), F('planter', 38, 28, 1, 1),
  // Laboratório de informática
  F('serverrack', 80, 22, 5, 1, TALL), F('printer', 68, 22, 3, 1),
  ...[25, 29, 33].flatMap((y) => [69, 74, 79].map((x) => F('pcdesk', x, y, 4, 1))),
  // Área de manutenção
  F('powerpanel', 3, 42, 3, 1), F('cablepanel', 2, 46, 1, 3), F('boiler', 14, 43, 4, 3),
  F('console', 8, 53, 3, 2), F('workbench', 13, 50, 4, 2), F('barrels', 3, 53, 2, 2),
  // Sala dos professores
  F('bookshelf', 22, 42, 3, 1, TALL), F('coffee', 34, 42, 2, 1), F('meetingtable', 25, 46, 8, 3),
  F('sofa', 22, 53, 4, 2), F('lockers', 29, 55, 5, 1), F('monitordesk', 35, 47, 1, 3),
  // Entrada e recepção
  F('reception', 44, 50, 12, 1), F('turnstile', 46, 45, 8, 1, { solid: false }),
  F('sofa', 39, 47, 1, 4), F('sofa', 60, 47, 1, 4), F('planter', 39, 42, 1, 1), F('planter', 60, 42, 1, 1),
  F('planter', 38, 55, 1, 1), F('planter', 61, 55, 1, 1), F('trophy', 56, 55, 4, 1), F('printer', 58, 43, 2, 1),
  // Biblioteca
  F('bookshelf', 65, 44, 6, 1, TALL), F('bookshelf', 65, 47, 6, 1, TALL), F('bookshelf', 65, 50, 6, 1, TALL),
  F('bookshelf', 65, 53, 6, 1, TALL), F('readtable', 75, 45, 4, 2), F('readtable', 75, 50, 4, 2),
  F('librarydesk', 81, 43, 3, 1),
];

// Estações de tarefa. Coordenadas em tiles (pontos fracionários); px = valor * TILE.
export const STATION_DEFS = [
  { id: 'oficina_ferramentas', room: 'oficina', task: 'tools', name: 'Organizar o painel de ferramentas', x: 6, y: 3.45, long: true },
  { id: 'oficina_torno', room: 'oficina', task: 'gauge', name: 'Ajustar a rotação do torno', x: 12, y: 5.45, machine: true },
  { id: 'eletronica_painel', room: 'eletronica', task: 'wires', name: 'Religar o painel didático', x: 35.5, y: 3.45 },
  { id: 'eletronica_circuito1', room: 'eletronica', task: 'circuit', name: 'Montar circuito na protoboard', x: 26, y: 7.45, long: true },
  { id: 'eletronica_circuito2', room: 'eletronica', task: 'circuit', name: 'Consertar placa de LED', x: 34, y: 12.45, long: true },
  { id: 'automacao_braco', room: 'automacao', task: 'robot', name: 'Calibrar o braço robótico', x: 44.5, y: 7.45, machine: true, long: true },
  { id: 'automacao_esteira', room: 'automacao', task: 'sort', name: 'Separar peças da esteira', x: 50, y: 6.45, machine: true },
  { id: 'labtec_estabilidade', room: 'labtec', task: 'gauge', name: 'Teste de estabilidade do gerador', x: 78, y: 13.45, machine: true },
  { id: 'labtec_inspecao', room: 'labtec', task: 'quiz', name: 'Inspeção de segurança (NR-10)', x: 75.5, y: 3.45 },
  { id: 'almox_componentes', room: 'almox', task: 'sort', name: 'Reorganizar componentes', x: 6.5, y: 27.5 },
  { id: 'aula_prova', room: 'aula', task: 'quiz', name: 'Fazer a prova surpresa', x: 31.5, y: 24.45 },
  { id: 'aula_projetor', room: 'aula', task: 'wait', name: 'Ligar o projetor', x: 22.5, y: 23.45 },
  { id: 'cantina_lanche', room: 'patio', task: 'sequence', name: 'Montar o lanche do pedido', x: 41.5, y: 33.55 },
  { id: 'patio_reciclagem', room: 'patio', task: 'sort', name: 'Separar o lixo reciclável', x: 60.5, y: 33.55 },
  { id: 'info_diagnostico', room: 'info', task: 'diag', name: 'Diagnosticar computador', x: 71, y: 26.45, long: true },
  { id: 'info_logica', room: 'info', task: 'logic', name: 'Desafio de portas lógicas', x: 81, y: 30.45 },
  { id: 'info_upload', room: 'info', task: 'wait', name: 'Enviar projeto ao servidor', x: 76, y: 34.45, long: true },
  { id: 'manut_cabos', room: 'manutencao', task: 'wires', name: 'Conectar cabos do quadro', x: 3.55, y: 47.5 },
  { id: 'manut_caldeira', room: 'manutencao', task: 'gauge', name: 'Regular a pressão da caldeira', x: 16, y: 46.45 },
  { id: 'prof_diarios', room: 'professores', task: 'sequence', name: 'Organizar diários de classe', x: 28.5, y: 49.45 },
  { id: 'entrada_matricula', room: 'entrada', task: 'keypad', name: 'Registrar matrícula na catraca', x: 50, y: 49.55 },
  { id: 'entrada_impressora', room: 'entrada', task: 'wait', name: 'Imprimir apostilas', x: 59, y: 44.45 },
  { id: 'biblio_catalogo', room: 'biblioteca', task: 'quiz', name: 'Consultar catálogo técnico', x: 82.5, y: 44.45 },
  { id: 'biblio_livros', room: 'biblioteca', task: 'sequence', name: 'Devolver livros às estantes', x: 68, y: 48.5 },
];

export const VENT_DEFS = [
  { id: 'v_oficina', group: 'oeste', x: 6, y: 14 },
  { id: 'v_almox', group: 'oeste', x: 14, y: 34 },
  { id: 'v_manut', group: 'oeste', x: 18, y: 54 },
  { id: 'v_eletronica', group: 'centro', x: 37, y: 14 },
  { id: 'v_patio', group: 'centro', x: 40, y: 23 },
  { id: 'v_prof', group: 'centro', x: 35, y: 54 },
  { id: 'v_labtec', group: 'leste', x: 83, y: 14 },
  { id: 'v_info', group: 'leste', x: 85, y: 35 },
  { id: 'v_biblio', group: 'leste', x: 84, y: 54 },
];

// Pontos de resolução de sabotagens.
export const FIX_DEFS = [
  { id: 'lights', sabotage: 'lights', name: 'Quadro de energia', x: 4.5, y: 43.45 },
  { id: 'gps', sabotage: 'gps', name: 'Servidor de localização', x: 82.5, y: 23.45 },
  { id: 'machines', sabotage: 'machines', name: 'CLP central', x: 60, y: 3.45 },
  { id: 'critA', sabotage: 'critical', name: 'Console da subestação (Lab. Técnico)', x: 80.5, y: 6.55 },
  { id: 'critB', sabotage: 'critical', name: 'Console da subestação (Manutenção)', x: 9.5, y: 52.45 },
];

export const EMERGENCY = { x: 50, y: 29 };
export const CAMERA_CONSOLE = { x: 34.45, y: 48.5 };
export const SPAWN = { x: 50, y: 46.5 };

export const CAMERA_VIEWS = [
  { name: 'Corredor Norte', x: 44, y: 18.5 },
  { name: 'Corredor Sul', x: 44, y: 38.5 },
  { name: 'Corredor Oeste', x: 18, y: 28.5 },
  { name: 'Lab. Técnico', x: 74, y: 9 },
];

// Constrói uma instância mutável do mapa (portas podem ser trancadas por partida).
export function buildMap() {
  const W = MAP_W, H = MAP_H;
  const tiles = new Uint8Array(W * H); // 0 parede, 1 piso
  const roomGrid = new Int16Array(W * H).fill(-1);
  const doorGrid = new Int16Array(W * H).fill(-1);
  const furnGrid = new Int16Array(W * H).fill(-1);
  const solid = new Uint8Array(W * H);
  const opaque = new Uint8Array(W * H);

  const rooms = ROOM_DEFS.map((r, i) => ({ ...r, index: i, cx: (r.x + r.w / 2) * T, cy: (r.y + r.h / 2) * T }));
  const roomById = Object.fromEntries(rooms.map((r) => [r.id, r]));

  const carve = (x, y, w, h, fn) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (i < 0 || j < 0 || i >= W || j >= H) continue;
      fn(j * W + i);
    }
  };

  // Corredores primeiro, salas por cima.
  for (const r of rooms.filter((r) => r.corridor)) carve(r.x, r.y, r.w, r.h, (k) => { tiles[k] = 1; roomGrid[k] = r.index; });
  for (const r of rooms.filter((r) => !r.corridor)) carve(r.x, r.y, r.w, r.h, (k) => { tiles[k] = 1; roomGrid[k] = r.index; });

  const doors = DOOR_DEFS.map((d, i) => ({ ...d, index: i, locked: false }));
  for (const d of doors) {
    carve(d.x, d.y, d.w, d.h, (k) => { tiles[k] = 1; doorGrid[k] = d.index; roomGrid[k] = roomById[d.rooms[0]].index; });
  }

  const furniture = FURNITURE_DEFS.map((f, i) => ({ ...f, index: i }));
  for (const f of furniture) {
    f.room = roomGrid[f.y * W + f.x] >= 0 ? rooms[roomGrid[f.y * W + f.x]].id : null;
    if (f.solid) carve(f.x, f.y, f.w, f.h, (k) => { furnGrid[k] = f.index; });
  }

  const map = {
    W, H, tiles, roomGrid, doorGrid, furnGrid, solid, opaque, rooms, roomById, doors, furniture,
    version: 0,
    stations: STATION_DEFS.map((s) => ({ ...s, px: s.x * T, py: s.y * T })),
    vents: VENT_DEFS.map((v) => ({ ...v, px: (v.x + 0.5) * T, py: (v.y + 0.5) * T, room: rooms[roomGrid[v.y * W + v.x]].id })),
    fixPoints: FIX_DEFS.map((f) => ({ ...f, px: f.x * T, py: f.y * T })),
    emergency: { px: EMERGENCY.x * T, py: EMERGENCY.y * T },
    cameraConsole: { px: CAMERA_CONSOLE.x * T, py: CAMERA_CONSOLE.y * T },
    cameraViews: CAMERA_VIEWS.map((c) => ({ ...c, px: c.x * T, py: c.y * T })),
    spawn: { px: SPAWN.x * T, py: SPAWN.y * T },
  };
  map.stationById = Object.fromEntries(map.stations.map((s) => [s.id, s]));
  map.fixById = Object.fromEntries(map.fixPoints.map((f) => [f.id, f]));
  recomputeSolid(map);

  for (const p of [...map.stations, ...map.fixPoints, map.cameraConsole]) {
    p.stand = findStandTile(map, p.px, p.py, USE_RANGE - 4);
  }
  map.emergency.stand = findStandTile(map, map.emergency.px, map.emergency.py, EMERGENCY_RANGE - 4);
  for (const v of map.vents) v.stand = { tx: v.x, ty: v.y, px: v.px, py: v.py };
  return map;
}

export function recomputeSolid(map) {
  const { W, H, tiles, furnGrid, doorGrid, furniture, doors, solid, opaque } = map;
  for (let k = 0; k < W * H; k++) {
    let s = tiles[k] === 0 ? 1 : 0;
    let o = s;
    if (furnGrid[k] >= 0) { s = 1; if (furniture[furnGrid[k]].opaque) o = 1; }
    if (doorGrid[k] >= 0 && doors[doorGrid[k]].locked) { s = 1; o = 1; }
    solid[k] = s;
    opaque[k] = o;
  }
  map.version++;
}

export function setRoomDoorsLocked(map, roomId, locked) {
  let changed = false;
  for (const d of map.doors) {
    if (d.rooms.includes(roomId) && d.locked !== locked) { d.locked = locked; changed = true; }
  }
  if (changed) recomputeSolid(map);
}

export function isSolid(map, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= map.W || ty >= map.H) return true;
  return map.solid[ty * map.W + tx] === 1;
}

export function isOpaque(map, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= map.W || ty >= map.H) return true;
  return map.opaque[ty * map.W + tx] === 1;
}

export function roomAt(map, x, y) {
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  if (tx < 0 || ty < 0 || tx >= map.W || ty >= map.H) return null;
  const idx = map.roomGrid[ty * map.W + tx];
  return idx >= 0 ? map.rooms[idx] : null;
}

function findStandTile(map, px, py, maxD) {
  let best = null, bestD = Infinity;
  const cx = Math.floor(px / T), cy = Math.floor(py / T);
  for (let ty = cy - 2; ty <= cy + 2; ty++) for (let tx = cx - 2; tx <= cx + 2; tx++) {
    if (isSolid(map, tx, ty)) continue;
    const x = (tx + 0.5) * T, y = (ty + 0.5) * T;
    const d = Math.hypot(x - px, y - py);
    if (d < bestD && d <= maxD) { bestD = d; best = { tx, ty, px: x, py: y }; }
  }
  if (!best) throw new Error(`Sem tile de apoio perto de (${px}, ${py})`);
  return best;
}
