// Gera a camada estática do mapa (pisos, paredes, sinalização e móveis) uma única vez.
import { TILE as T } from '../config.js';
import { drawFurniture, hazardStripes, label } from './furniture.js';
import { roundRect } from './sprites.js';

const FLOORS = {
  concrete: { base: '#9198a1', alt: '#878e97' },
  concreteDark: { base: '#6c727a', alt: '#646a71' },
  esd: { base: '#c7d4e1', alt: '#bccbda' },
  epoxy: { base: '#8193a8', alt: '#7a8ca1' },
  hazard: { base: '#4d535c', alt: '#474d55' },
  vinyl: { base: '#ddd2c0', alt: '#d3c8b5' },
  pavers: { base: '#bfae92', alt: '#b3a284' },
  carpet: { base: '#3f5f88', alt: '#3a5880' },
  carpetWarm: { base: '#8e5f48', alt: '#855842' },
  wood: { base: '#b9895a', alt: '#ad7e50' },
  marble: { base: '#ebecef', alt: '#e2e4e8' },
  corridor: { base: '#cfd5dd', alt: '#c6cdd6' },
};

// Gerador pseudoaleatório determinístico para detalhes do piso.
function hash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function drawFloorTile(ctx, style, tx, ty) {
  const x = tx * T, y = ty * T;
  const f = FLOORS[style] || FLOORS.concrete;
  const r = hash(tx, ty);
  switch (style) {
    case 'esd': case 'marble': case 'corridor': {
      ctx.fillStyle = (tx + ty) % 2 ? f.base : f.alt; ctx.fillRect(x, y, T, T);
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
      if (style === 'marble' && r > 0.7) { ctx.strokeStyle = 'rgba(150,150,170,0.25)'; ctx.beginPath(); ctx.moveTo(x + r * 20, y); ctx.quadraticCurveTo(x + 16, y + 16, x + T, y + r * 30); ctx.stroke(); }
      break;
    }
    case 'carpet': case 'carpetWarm': {
      ctx.fillStyle = (Math.floor(tx / 2) + Math.floor(ty / 2)) % 2 ? f.base : f.alt; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(255,255,255,0.03)'; for (let i = 0; i < 6; i++) ctx.fillRect(x + hash(tx + i, ty) * T, y + hash(tx, ty + i) * T, 1, 1);
      break;
    }
    case 'wood': case 'vinyl': {
      ctx.fillStyle = f.base; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      for (let i = 0; i < 4; i++) ctx.fillRect(x, y + i * 8 + 7, T, 1);
      const off = (ty * 4 + Math.floor(r * 3)) % 4;
      ctx.fillRect(x + ((tx * 13 + off * 9) % T), y, 1, 8);
      ctx.fillRect(x + ((tx * 7 + off * 5 + 16) % T), y + 8, 1, 8);
      break;
    }
    case 'pavers': {
      ctx.fillStyle = f.base; ctx.fillRect(x, y, T, T);
      ctx.strokeStyle = 'rgba(80,60,40,0.25)'; ctx.lineWidth = 1;
      for (let j = 0; j < 2; j++) {
        const yy = y + j * 16;
        ctx.strokeRect(x + (j ? 8 : 0) + 0.5, yy + 0.5, 16, 16);
        ctx.strokeRect(x + (j ? 24 : 16) + 0.5, yy + 0.5, 16, 16);
      }
      break;
    }
    default: {
      ctx.fillStyle = r > 0.5 ? f.base : f.alt; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + hash(tx * 3 + i, ty) * T, y + hash(tx, ty * 3 + i) * T, 2, 2);
    }
  }
}

function isFloor(map, tx, ty) {
  return tx >= 0 && ty >= 0 && tx < map.W && ty < map.H && map.tiles[ty * map.W + tx] === 1;
}

export function buildStaticLayer(map) {
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(map.W * T, map.H * T) : Object.assign(document.createElement('canvas'), { width: map.W * T, height: map.H * T });
  const ctx = canvas.getContext('2d');

  // Fundo externo: área verde e calçada ao redor da escola.
  ctx.fillStyle = '#1b2a22'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let ty = 0; ty < map.H; ty++) for (let tx = 0; tx < map.W; tx++) {
    ctx.fillStyle = hash(tx, ty) > 0.5 ? '#24392c' : '#203427';
    ctx.fillRect(tx * T, ty * T, T, T);
  }

  // Pisos
  for (let ty = 0; ty < map.H; ty++) for (let tx = 0; tx < map.W; tx++) {
    const k = ty * map.W + tx;
    if (map.tiles[k] !== 1) continue;
    const room = map.rooms[map.roomGrid[k]];
    drawFloorTile(ctx, room ? room.floor : 'corridor', tx, ty);
  }

  // Detalhes de piso por sala
  for (const r of map.rooms) {
    const x = r.x * T, y = r.y * T, w = r.w * T, h = r.h * T;
    if (r.corridor) {
      // Piso tátil amarelo ao longo do corredor
      ctx.fillStyle = 'rgba(242,194,48,0.75)';
      if (r.w > r.h) ctx.fillRect(x, y + h / 2 - 5, w, 10); else ctx.fillRect(x + w / 2 - 5, y, 10, h);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      if (r.w > r.h) for (let i = x; i < x + w; i += 6) ctx.fillRect(i, y + h / 2 - 4, 2, 8);
      else for (let j = y; j < y + h; j += 6) ctx.fillRect(x + w / 2 - 4, j, 8, 2);
    }
    if (r.id === 'oficina' || r.id === 'automacao' || r.id === 'manutencao') {
      ctx.strokeStyle = 'rgba(242,194,48,0.8)'; ctx.lineWidth = 3; ctx.setLineDash([]);
      ctx.strokeRect(x + T * 1.5, y + T * 5.5, w - T * 3, h - T * 8);
    }
    if (r.id === 'labtec') {
      hazardStripes(ctx, x, y + h - 10, w, 10, 8);
      hazardStripes(ctx, x, y, 10, h, 8);
    }
    if (r.id === 'patio') {
      ctx.fillStyle = '#4c8f45';
      ctx.fillRect(x + T * 6, y + T * 5, T * 2, T * 4);
      ctx.fillRect(x + T * 16, y + T * 5, T * 2, T * 4);
      ctx.fillStyle = '#5ea655';
      for (let i = 0; i < 40; i++) ctx.fillRect(x + T * 6 + hash(i, 1) * T * 2, y + T * 5 + hash(1, i) * T * 4, 2, 3);
      for (let i = 0; i < 40; i++) ctx.fillRect(x + T * 16 + hash(i, 2) * T * 2, y + T * 5 + hash(2, i) * T * 4, 2, 3);
    }
    if (r.id === 'entrada') {
      ctx.fillStyle = 'rgba(44,93,158,0.18)';
      roundRect(ctx, x + T * 8, y + T * 2, T * 8, T * 2, 8); ctx.fill();
    }
  }

  // Paredes com face frontal (efeito 2.5D)
  for (let ty = 0; ty < map.H; ty++) for (let tx = 0; tx < map.W; tx++) {
    if (isFloor(map, tx, ty)) continue;
    const near = isFloor(map, tx + 1, ty) || isFloor(map, tx - 1, ty) || isFloor(map, tx, ty + 1) || isFloor(map, tx, ty - 1) ||
      isFloor(map, tx + 1, ty + 1) || isFloor(map, tx - 1, ty - 1) || isFloor(map, tx + 1, ty - 1) || isFloor(map, tx - 1, ty + 1);
    if (!near) continue;
    const x = tx * T, y = ty * T;
    ctx.fillStyle = '#26324a'; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = '#34445f'; ctx.fillRect(x, y, T, 4);
    if (isFloor(map, tx, ty + 1)) {
      ctx.fillStyle = '#e4e8ee'; ctx.fillRect(x, y + 12, T, 20);
      ctx.fillStyle = '#2c5d9e'; ctx.fillRect(x, y + 26, T, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x, y + 12, T, 2);
    }
    if (isFloor(map, tx, ty - 1)) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y, T, 3); }
  }
  // Sombra suave das paredes sobre o piso
  for (let ty = 0; ty < map.H; ty++) for (let tx = 0; tx < map.W; tx++) {
    if (!isFloor(map, tx, ty) || isFloor(map, tx, ty - 1)) continue;
    const g = ctx.createLinearGradient(0, ty * T, 0, ty * T + 10);
    g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(tx * T, ty * T, T, 10);
  }

  drawWallDecor(ctx, map);

  // Portas: soleira e batentes
  for (const d of map.doors) {
    const x = d.x * T, y = d.y * T, w = d.w * T, h = d.h * T;
    ctx.fillStyle = 'rgba(40,50,70,0.35)';
    if (d.h === 1) { ctx.fillRect(x, y + h / 2 - 3, w, 6); ctx.fillStyle = '#7a8597'; ctx.fillRect(x - 3, y, 4, h); ctx.fillRect(x + w - 1, y, 4, h); }
    else { ctx.fillRect(x + w / 2 - 3, y, 6, h); ctx.fillStyle = '#7a8597'; ctx.fillRect(x, y - 3, w, 4); ctx.fillRect(x, y + h - 1, w, 4); }
  }

  // Dutos de ventilação
  for (const v of map.vents) {
    const x = v.x * T + 3, y = v.y * T + 5;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; roundRect(ctx, x + 2, y + 3, T - 6, T - 10, 3); ctx.fill();
    ctx.fillStyle = '#7a8597'; roundRect(ctx, x, y, T - 6, T - 10, 3); ctx.fill();
    ctx.fillStyle = '#2a303b';
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 4, y + 3 + i * 4.5, T - 14, 2.4);
  }

  // Móveis e equipamentos (ordenados para sobreposição correta)
  const furn = [...map.furniture].sort((a, b) => (a.y + a.h) - (b.y + b.h));
  for (const f of furn) drawFurniture(ctx, f);

  // Iluminação ambiente por sala
  for (const r of map.rooms) {
    if (r.corridor || !r.light) continue;
    const g = ctx.createRadialGradient(r.cx, r.cy, 10, r.cx, r.cy, Math.max(r.w, r.h) * T * 0.6);
    g.addColorStop(0, hexA(r.light, 0.14)); g.addColorStop(1, hexA(r.light, 0));
    ctx.fillStyle = g; ctx.fillRect(r.x * T, r.y * T, r.w * T, r.h * T);
    if (r.dim) { ctx.fillStyle = 'rgba(10,8,20,0.28)'; ctx.fillRect(r.x * T, r.y * T, r.w * T, r.h * T); }
  }

  drawSigns(ctx, map);
  return canvas;
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function faceTiles(map, ty, x0, x1) {
  const out = [];
  for (let tx = x0; tx <= x1; tx++) if (!isFloor(map, tx, ty) && isFloor(map, tx, ty + 1)) out.push(tx);
  return out;
}

function drawWallDecor(ctx, map) {
  // Armários (escaninhos) nos corredores norte e sul
  for (const ty of [16, 36]) {
    for (const tx of faceTiles(map, ty, 3, 84)) {
      if (tx % 9 === 2 || tx % 9 === 3 || tx % 9 === 4) {
        const x = tx * T, y = ty * T + 12;
        ctx.fillStyle = tx % 2 ? '#3f78c4' : '#2c5d9e'; ctx.fillRect(x + 1, y, T - 2, 14);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 4, y + 3, T - 8, 1.5); ctx.fillRect(x + 4, y + 6, T - 8, 1.5);
        ctx.fillStyle = '#ddd'; ctx.fillRect(x + T - 7, y + 8, 2, 3);
      } else if (tx % 9 === 7) {
        ctx.fillStyle = '#d63a2f'; roundRect(ctx, tx * T + 12, ty * T + 13, 8, 12, 3); ctx.fill(); // extintor
        ctx.fillStyle = '#222'; ctx.fillRect(tx * T + 14, ty * T + 11, 4, 3);
      } else if (tx % 9 === 0) {
        ctx.fillStyle = '#c9a46a'; ctx.fillRect(tx * T + 3, ty * T + 13, T - 6, 11); // mural
        ctx.fillStyle = '#fff'; ctx.fillRect(tx * T + 6, ty * T + 15, 8, 6);
        ctx.fillStyle = '#ffd84a'; ctx.fillRect(tx * T + 17, ty * T + 16, 8, 5);
      }
    }
  }
  // Lousa da sala de aula
  for (const tx of faceTiles(map, 21, 24, 33)) {
    ctx.fillStyle = '#2f5d3a'; ctx.fillRect(tx * T, 21 * T + 12, T, 13);
    ctx.fillStyle = '#7a5230'; ctx.fillRect(tx * T, 21 * T + 24, T, 2);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '7px monospace'; ctx.textAlign = 'left';
  ctx.fillText('V = R · I    P = V · I', 24 * T + 8, 21 * T + 20);
  ctx.fillText('PROVA SURPRESA HOJE! :)', 29 * T + 6, 21 * T + 20);
  // Placas "SAÍDA" sobre as portas da recepção
  ctx.fillStyle = '#1f9d55'; roundRect(ctx, 48 * T, 55 * T + 2, 4 * T, 10, 2); ctx.fill();
  label(ctx, 'SAÍDA ➜', 50 * T, 55 * T + 7, '#fff', 8);
  // Portão principal (decorativo) na parede inferior da recepção
  ctx.fillStyle = '#2c5d9e'; ctx.fillRect(46 * T, 56 * T, 8 * T, 8);
  ctx.fillStyle = 'rgba(180,220,255,0.6)'; ctx.fillRect(46 * T + 4, 56 * T + 2, 8 * T - 8, 4);
}

function drawSigns(ctx, map) {
  ctx.textBaseline = 'middle';
  const placed = new Set();
  for (const d of map.doors) {
    const room = map.roomById[d.rooms[0]];
    if (placed.has(`${room.id}-${d.y}-${d.x}`)) continue;
    placed.add(`${room.id}-${d.y}-${d.x}`);
    let x, y;
    if (d.h === 1) { x = (d.x + d.w + 1.5) * T; y = d.y * T + (d.y < room.y ? 4 : 20); }
    else { x = (d.x + 0.5) * T; y = (d.y - 1) * T + 20; }
    const text = room.name.toUpperCase();
    ctx.font = 'bold 8px "Segoe UI", Arial, sans-serif';
    const tw = ctx.measureText(text).width + 12;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(ctx, x - tw / 2 + 1, y - 6, tw, 13, 3); ctx.fill();
    ctx.fillStyle = '#1d4f91'; roundRect(ctx, x - tw / 2, y - 7, tw, 13, 3); ctx.fill();
    ctx.fillStyle = '#f2c230'; ctx.fillRect(x - tw / 2 + 3, y - 4, 2, 7);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(text, x + 2, y);
  }
}

// Mapa reduzido para o minimapa e o mapa grande.
export function buildMinimapBase(map, scale = 4) {
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(map.W * scale, map.H * scale) : Object.assign(document.createElement('canvas'), { width: map.W * scale, height: map.H * scale });
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d1420'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let ty = 0; ty < map.H; ty++) for (let tx = 0; tx < map.W; tx++) {
    const k = ty * map.W + tx;
    if (map.tiles[k] !== 1) continue;
    const room = map.rooms[map.roomGrid[k]];
    ctx.fillStyle = room?.corridor ? '#5b6b84' : '#3c5d8f';
    if (map.furnGrid[k] >= 0) ctx.fillStyle = room?.corridor ? '#4c5a70' : '#2f4a73';
    ctx.fillRect(tx * scale, ty * scale, scale, scale);
  }
  ctx.strokeStyle = '#9fb6d6'; ctx.lineWidth = 1;
  for (const r of map.rooms) if (!r.corridor) ctx.strokeRect(r.x * scale + 0.5, r.y * scale + 0.5, r.w * scale - 1, r.h * scale - 1);
  return canvas;
}
