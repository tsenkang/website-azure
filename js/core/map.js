// Construção do mapa a partir das definições em ./maps. Tudo é baseado em uma grade de tiles;
// móveis sólidos ocupam tiles inteiros.
import { TILE as T, USE_RANGE, EMERGENCY_RANGE } from '../config.js';
import { MAPS, DEFAULT_MAP } from './maps/index.js';

// Constrói uma instância mutável do mapa (portas podem ser trancadas durante a partida).
export function buildMap(mapId = DEFAULT_MAP) {
  const def = MAPS[mapId] || MAPS[DEFAULT_MAP];
  const W = def.W, H = def.H;
  const tiles = new Uint8Array(W * H); // 0 parede, 1 piso
  const roomGrid = new Int16Array(W * H).fill(-1);
  const doorGrid = new Int16Array(W * H).fill(-1);
  const furnGrid = new Int16Array(W * H).fill(-1);
  const solid = new Uint8Array(W * H);
  const opaque = new Uint8Array(W * H);

  const rooms = def.rooms.map((r, i) => ({ ...r, index: i, cx: (r.x + r.w / 2) * T, cy: (r.y + r.h / 2) * T }));
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

  const doors = def.doors.map((d, i) => ({ ...d, index: i, locked: false }));
  for (const d of doors) {
    carve(d.x, d.y, d.w, d.h, (k) => { tiles[k] = 1; doorGrid[k] = d.index; roomGrid[k] = roomById[d.rooms[0]].index; });
  }

  const furniture = def.furniture.map((f, i) => ({ ...f, index: i }));
  for (const f of furniture) {
    f.room = roomGrid[f.y * W + f.x] >= 0 ? rooms[roomGrid[f.y * W + f.x]].id : null;
    if (f.solid) carve(f.x, f.y, f.w, f.h, (k) => { furnGrid[k] = f.index; });
  }

  const pt = (p) => ({ ...p, px: p.x * T, py: p.y * T });
  const map = {
    id: def.id, name: def.name, def,
    W, H, tiles, roomGrid, doorGrid, furnGrid, solid, opaque, rooms, roomById, doors, furniture,
    version: 0,
    stations: def.stations.map((s) => ({ ...pt(s), variant: s.variant || s.id })),
    vents: def.vents.map((v) => ({ ...v, px: (v.x + 0.5) * T, py: (v.y + 0.5) * T, room: rooms[roomGrid[v.y * W + v.x]]?.id })),
    fixPoints: def.fixes.map((f) => ({ ...pt(f), sabotage: f.id.startsWith('crit') ? 'critical' : f.id })),
    emergency: pt(def.emergency),
    cameraConsole: pt(def.cameraConsole),
    adminConsole: pt(def.adminConsole),
    cameraViews: def.cameraViews.map(pt),
    spawn: pt(def.spawn),
    boards: def.boards || [],
    gate: def.gate || null,
    tutorial: def.tutorial || null,
  };
  map.stationById = Object.fromEntries(map.stations.map((s) => [s.id, s]));
  map.fixById = Object.fromEntries(map.fixPoints.map((f) => [f.id, f]));
  map.ventById = Object.fromEntries(map.vents.map((v) => [v.id, v]));
  recomputeSolid(map);

  for (const p of [...map.stations, ...map.fixPoints, map.cameraConsole, map.adminConsole]) {
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
  if (!best) throw new Error(`[${map.id}] Sem tile de apoio perto de (${(px / T).toFixed(2)}, ${(py / T).toFixed(2)})`);
  return best;
}
