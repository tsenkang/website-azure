// Gera a camada estática do mapa (pisos, paredes, sinalização e móveis) uma única vez.
import { TILE as T } from '../config.js';
import { drawFurniture, hazardStripes, label } from './furniture.js';
import { roundRect, INK } from './sprites.js';

const FLOORS = {
  concrete: { base: '#959ca6', alt: '#8b929c', seam: 'rgba(0,0,0,0.12)' },
  concreteDark: { base: '#6c727a', alt: '#646a71', seam: 'rgba(0,0,0,0.16)' },
  esd: { base: '#b3c3d6', alt: '#a7b8cc', seam: 'rgba(30,50,80,0.2)' },
  epoxy: { base: '#7f93ab', alt: '#788ca4', seam: 'rgba(0,0,0,0.14)' },
  hazard: { base: '#4d535c', alt: '#474d55', seam: 'rgba(0,0,0,0.25)' },
  vinyl: { base: '#cfc1a8', alt: '#c4b69c', seam: 'rgba(80,60,30,0.16)' },
  pavers: { base: '#c2b092', alt: '#b5a384', seam: 'rgba(80,60,40,0.28)' },
  carpet: { base: '#3f5f88', alt: '#3a5880', seam: 'rgba(0,0,0,0.12)' },
  carpetWarm: { base: '#8e5f48', alt: '#855842', seam: 'rgba(0,0,0,0.12)' },
  wood: { base: '#bb8a5a', alt: '#ae7e50', seam: 'rgba(60,30,10,0.2)' },
  marble: { base: '#cdd3dc', alt: '#c2c9d3', seam: 'rgba(60,70,90,0.16)' },
  corridor: { base: '#b4bdc9', alt: '#abb4c1', seam: 'rgba(40,50,70,0.2)' },
  clinic: { base: '#b9d9d2', alt: '#aed0c8', seam: 'rgba(20,90,80,0.2)' },
  warehouse: { base: '#a5a091', alt: '#9b9687', seam: 'rgba(0,0,0,0.14)' },
  cold: { base: '#a6c4d6', alt: '#9abacd', seam: 'rgba(20,60,90,0.22)' },
  garage: { base: '#7d828a', alt: '#757a82', seam: 'rgba(0,0,0,0.2)' },
  tile: { base: '#b9cad6', alt: '#aebfcc', seam: 'rgba(30,60,90,0.2)' },
};

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
    case 'esd': case 'marble': case 'corridor': case 'clinic': case 'cold': case 'tile': {
      ctx.fillStyle = (tx + ty) % 2 ? f.base : f.alt; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 1, y + 1, T - 2, 2);
      ctx.strokeStyle = f.seam; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, y + 0.75, T - 1.5, T - 1.5);
      if (style === 'marble' && r > 0.72) { ctx.strokeStyle = 'rgba(150,150,170,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + r * 20, y); ctx.quadraticCurveTo(x + 16, y + 16, x + T, y + r * 30); ctx.stroke(); }
      break;
    }
    case 'carpet': case 'carpetWarm': {
      ctx.fillStyle = (Math.floor(tx / 2) + Math.floor(ty / 2)) % 2 ? f.base : f.alt; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; for (let i = 0; i < 6; i++) ctx.fillRect(x + hash(tx + i, ty) * T, y + hash(tx, ty + i) * T, 1.5, 1.5);
      break;
    }
    case 'wood': case 'vinyl': {
      ctx.fillStyle = f.base; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = f.seam;
      for (let i = 0; i < 4; i++) ctx.fillRect(x, y + i * 8 + 7, T, 1.2);
      const off = (ty * 4 + Math.floor(r * 3)) % 4;
      ctx.fillRect(x + ((tx * 13 + off * 9) % T), y, 1.2, 8);
      ctx.fillRect(x + ((tx * 7 + off * 5 + 16) % T), y + 8, 1.2, 8);
      break;
    }
    case 'pavers': {
      ctx.fillStyle = f.base; ctx.fillRect(x, y, T, T);
      ctx.strokeStyle = f.seam; ctx.lineWidth = 1.2;
      for (let j = 0; j < 2; j++) {
        const yy = y + j * 16;
        ctx.strokeRect(x + (j ? 8 : 0) + 0.5, yy + 0.5, 16, 16);
        ctx.strokeRect(x + (j ? 24 : 16) + 0.5, yy + 0.5, 16, 16);
      }
      break;
    }
    default: {
      // Placas de concreto/metal com junta a cada 2 tiles.
      ctx.fillStyle = r > 0.5 ? f.base : f.alt; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + hash(tx * 3 + i, ty) * T, y + hash(tx, ty * 3 + i) * T, 2, 2);
      ctx.fillStyle = f.seam;
      if (tx % 2 === 0) ctx.fillRect(x, y, 1.5, T);
      if (ty % 2 === 0) ctx.fillRect(x, y, T, 1.5);
    }
  }
}

function isFloor(map, tx, ty) {
  return tx >= 0 && ty >= 0 && tx < map.W && ty < map.H && map.tiles[ty * map.W + tx] === 1;
}

function makeCanvas(w, h) {
  return typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
}

export function buildStaticLayer(map) {
  const canvas = makeCanvas(map.W * T, map.H * T);
  const ctx = canvas.getContext('2d');

  // Fundo externo: gramado escuro.
  for (let ty = 0; ty < map.H; ty++) for (let tx = 0; tx < map.W; tx++) {
    ctx.fillStyle = hash(tx, ty) > 0.5 ? '#22382a' : '#1e3326';
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
      // Piso tátil amarelo
      ctx.fillStyle = 'rgba(242,194,48,0.85)';
      if (r.w > r.h) ctx.fillRect(x, y + h / 2 - 5, w, 10); else ctx.fillRect(x + w / 2 - 5, y, 10, h);
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      if (r.w > r.h) for (let i = x; i < x + w; i += 6) ctx.fillRect(i, y + h / 2 - 4, 2, 8);
      else for (let j = y; j < y + h; j += 6) ctx.fillRect(x + w / 2 - 4, j, 8, 2);
    }
    if (r.deco === 'safety') {
      ctx.strokeStyle = 'rgba(242,194,48,0.9)'; ctx.lineWidth = 4;
      ctx.strokeRect(x + T * 1.5, y + T * 4.5, w - T * 3, h - T * 6.5);
    }
    if (r.deco === 'lanes') {
      ctx.strokeStyle = 'rgba(242,194,48,0.75)'; ctx.lineWidth = 3; ctx.setLineDash([16, 10]);
      ctx.beginPath(); ctx.moveTo(x + T, y + h / 2); ctx.lineTo(x + w - T, y + h / 2); ctx.stroke(); ctx.setLineDash([]);
    }
    if (r.deco === 'hazard') {
      hazardStripes(ctx, x, y + h - 10, w, 10, 8);
      hazardStripes(ctx, x, y, 10, h, 8);
    }
    if (r.deco === 'grass') {
      for (const gx of [6, 16]) {
        ctx.fillStyle = '#4c8f45'; roundRect(ctx, x + T * gx, y + T * 5, T * 2, T * 4, 8); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#2f5e2a'; ctx.stroke();
        ctx.fillStyle = '#62ad58';
        for (let i = 0; i < 40; i++) ctx.fillRect(x + T * gx + 3 + hash(i, gx) * (T * 2 - 6), y + T * 5 + 3 + hash(gx, i) * (T * 4 - 6), 2, 3);
      }
    }
    if (r.deco === 'rug') {
      ctx.fillStyle = 'rgba(44,93,158,0.22)';
      roundRect(ctx, x + w / 2 - T * 4, y + T * 1.2, T * 8, T * 2, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(44,93,158,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  // Sombra suave das paredes sobre o piso
  for (let ty = 0; ty < map.H; ty++) for (let tx = 0; tx < map.W; tx++) {
    if (!isFloor(map, tx, ty) || isFloor(map, tx, ty - 1)) continue;
    const g = ctx.createLinearGradient(0, ty * T, 0, ty * T + 14);
    g.addColorStop(0, 'rgba(0,0,0,0.32)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(tx * T, ty * T, T, 14);
  }

  // Paredes com face frontal (2.5D) e contorno grosso
  for (let ty = 0; ty < map.H; ty++) for (let tx = 0; tx < map.W; tx++) {
    if (isFloor(map, tx, ty)) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (isFloor(map, tx + dx, ty + dy)) { near = true; break; }
    if (!near) continue;
    const x = tx * T, y = ty * T;
    ctx.fillStyle = '#2a3550'; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = '#3a4a6c'; ctx.fillRect(x, y + 2, T, 3);
    if (isFloor(map, tx, ty + 1)) {
      ctx.fillStyle = '#e6eaf0'; ctx.fillRect(x, y + 10, T, 22);
      ctx.fillStyle = '#c9d0db'; ctx.fillRect(x, y + 10, T, 3);
      ctx.fillStyle = '#2c5d9e'; ctx.fillRect(x, y + 25, T, 7);
    }
  }
  // Contornos: topo das paredes e base das faces
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineCap = 'square';
  ctx.beginPath();
  for (let ty = 0; ty < map.H; ty++) for (let tx = 0; tx < map.W; tx++) {
    const wall = !isFloor(map, tx, ty);
    const x = tx * T, y = ty * T;
    if (wall && isFloor(map, tx, ty + 1)) { ctx.moveTo(x, y + T); ctx.lineTo(x + T, y + T); ctx.moveTo(x, y + 10); ctx.lineTo(x + T, y + 10); }
    if (wall && isFloor(map, tx, ty - 1)) { ctx.moveTo(x, y); ctx.lineTo(x + T, y); }
    if (wall && isFloor(map, tx + 1, ty)) { ctx.moveTo(x + T, y); ctx.lineTo(x + T, y + T); }
    if (wall && isFloor(map, tx - 1, ty)) { ctx.moveTo(x, y); ctx.lineTo(x, y + T); }
  }
  ctx.stroke();

  drawWallDecor(ctx, map);

  // Portas: soleira e batentes
  for (const d of map.doors) {
    const x = d.x * T, y = d.y * T, w = d.w * T, h = d.h * T;
    ctx.fillStyle = 'rgba(40,50,70,0.35)';
    if (d.h === 1) {
      ctx.fillRect(x, y + h / 2 - 3, w, 6);
      ctx.fillStyle = '#7a8597'; ctx.fillRect(x - 4, y, 6, h); ctx.fillRect(x + w - 2, y, 6, h);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x - 4, y, 6, h); ctx.strokeRect(x + w - 2, y, 6, h);
    } else {
      ctx.fillRect(x + w / 2 - 3, y, 6, h);
      ctx.fillStyle = '#7a8597'; ctx.fillRect(x, y - 4, w, 6); ctx.fillRect(x, y + h - 2, w, 6);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x, y - 4, w, 6); ctx.strokeRect(x, y + h - 2, w, 6);
    }
  }

  // Dutos de ventilação
  for (const v of map.vents) drawVent(ctx, v.x * T, v.y * T);

  // Móveis e equipamentos (ordenados para sobreposição correta)
  const furn = [...map.furniture].sort((a, b) => (a.y + a.h) - (b.y + b.h));
  for (const f of furn) drawFurniture(ctx, f);

  // Iluminação ambiente por sala
  for (const r of map.rooms) {
    if (r.corridor || !r.light) continue;
    const g = ctx.createRadialGradient(r.cx, r.cy, 10, r.cx, r.cy, Math.max(r.w, r.h) * T * 0.6);
    g.addColorStop(0, hexA(r.light, 0.16)); g.addColorStop(1, hexA(r.light, 0));
    ctx.fillStyle = g; ctx.fillRect(r.x * T, r.y * T, r.w * T, r.h * T);
    if (r.dim) { ctx.fillStyle = 'rgba(10,8,20,0.3)'; ctx.fillRect(r.x * T, r.y * T, r.w * T, r.h * T); }
  }

  drawSigns(ctx, map);
  return canvas;
}

export function drawVent(ctx, x, y, open = false) {
  const vx = x + 3, vy = y + 5;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; roundRect(ctx, vx + 2, vy + 4, T - 6, T - 10, 4); ctx.fill();
  ctx.fillStyle = open ? '#1a1d24' : '#8a95a7'; roundRect(ctx, vx, vy, T - 6, T - 10, 4); ctx.fill();
  ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
  if (!open) {
    ctx.fillStyle = '#2a303b';
    for (let i = 0; i < 4; i++) ctx.fillRect(vx + 4, vy + 3.5 + i * 4.5, T - 14, 2.4);
  }
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function drawWallDecor(ctx, map) {
  // Faces de parede voltadas para corredores recebem escaninhos, extintores e murais.
  for (let ty = 0; ty < map.H; ty++) for (let tx = 0; tx < map.W; tx++) {
    if (isFloor(map, tx, ty) || !isFloor(map, tx, ty + 1)) continue;
    const below = map.rooms[map.roomGrid[(ty + 1) * map.W + tx]];
    if (!below?.corridor) continue;
    const x = tx * T, y = ty * T + 12;
    const m = tx % 9;
    if (m >= 2 && m <= 4) {
      ctx.fillStyle = tx % 2 ? '#3f78c4' : '#2c5d9e'; ctx.fillRect(x + 1, y, T - 2, 13);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(x + 1, y, T - 2, 13);
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x + 4, y + 3, T - 8, 1.5); ctx.fillRect(x + 4, y + 6, T - 8, 1.5);
      ctx.fillStyle = '#ddd'; ctx.fillRect(x + T - 7, y + 8, 2, 3);
    } else if (m === 7) {
      ctx.fillStyle = '#d63a2f'; roundRect(ctx, x + 12, y + 1, 8, 12, 3); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#222'; ctx.fillRect(x + 14, y - 1, 4, 3);
    } else if (m === 0) {
      ctx.fillStyle = '#c9a46a'; ctx.fillRect(x + 3, y + 1, T - 6, 11);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(x + 3, y + 1, T - 6, 11);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 6, y + 3, 8, 6);
      ctx.fillStyle = '#ffd84a'; ctx.fillRect(x + 17, y + 4, 8, 5);
    }
  }
  // Lousas
  for (const b of map.boards) {
    for (let tx = b.x0; tx <= b.x1; tx++) {
      ctx.fillStyle = '#2f5d3a'; ctx.fillRect(tx * T, b.y * T + 12, T, 12);
      ctx.fillStyle = '#7a5230'; ctx.fillRect(tx * T, b.y * T + 24, T, 2);
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(b.x0 * T, b.y * T + 12, (b.x1 - b.x0 + 1) * T, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '7px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    b.lines.forEach((line, i) => ctx.fillText(line, (b.x0 + i * 5) * T + 8, b.y * T + 21));
  }
  // Portão principal e placa de saída
  if (map.gate) {
    const g = map.gate;
    ctx.fillStyle = '#2c5d9e'; ctx.fillRect(g.x * T, g.y * T, g.w * T, 9);
    ctx.fillStyle = 'rgba(180,220,255,0.7)'; ctx.fillRect(g.x * T + 4, g.y * T + 2, g.w * T - 8, 4);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(g.x * T, g.y * T, g.w * T, 9);
    ctx.fillStyle = '#1f9d55'; roundRect(ctx, (g.x + g.w / 2 - 2) * T, (g.y - 1) * T + 2, 4 * T, 11, 2); ctx.fill();
    ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, 'SAÍDA ➜', (g.x + g.w / 2) * T, (g.y - 1) * T + 8, '#fff', 8);
  }
}

function drawSigns(ctx, map) {
  ctx.textBaseline = 'middle';
  for (const d of map.doors) {
    const room = map.roomById[d.rooms[0]];
    let x, y;
    if (d.h === 1) { x = (d.x + d.w + 1.6) * T; y = d.y * T + (d.y < room.y ? 5 : 19); }
    else { x = (d.x + 0.5) * T; y = (d.y - 1) * T + 19; }
    const text = room.name.toUpperCase();
    ctx.font = '800 8px "Nunito", "Segoe UI", Arial, sans-serif';
    const tw = ctx.measureText(text).width + 14;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(ctx, x - tw / 2 + 2, y - 5, tw, 13, 4); ctx.fill();
    ctx.fillStyle = '#1d4f91'; roundRect(ctx, x - tw / 2, y - 7, tw, 13, 4); ctx.fill();
    ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#f2c230'; ctx.fillRect(x - tw / 2 + 4, y - 4, 2.5, 7);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(text, x + 2, y);
  }
}

// Mapa reduzido para o minimapa, o mapa grande, o admin e a escolha de mapa.
export function buildMinimapBase(map, scale = 10) {
  const canvas = makeCanvas(map.W * scale, map.H * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d1420'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let ty = 0; ty < map.H; ty++) for (let tx = 0; tx < map.W; tx++) {
    const k = ty * map.W + tx;
    if (map.tiles[k] !== 1) continue;
    const room = map.rooms[map.roomGrid[k]];
    ctx.fillStyle = room?.corridor ? '#5f6f88' : '#3e6094';
    if (map.furnGrid[k] >= 0) ctx.fillStyle = room?.corridor ? '#4c5a70' : '#2f4a73';
    ctx.fillRect(tx * scale, ty * scale, scale, scale);
  }
  ctx.strokeStyle = '#a9c2e6'; ctx.lineWidth = Math.max(1, scale / 5);
  for (const r of map.rooms) if (!r.corridor) ctx.strokeRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
  return canvas;
}
