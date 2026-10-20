// Movimentação com colisão círculo × tiles e utilitários de linha de visão.
import { TILE as T } from '../config.js';
import { isSolid, isOpaque } from './map.js';

function resolveCircle(map, p, r) {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    const x0 = Math.floor((p.x - r) / T), x1 = Math.floor((p.x + r) / T);
    const y0 = Math.floor((p.y - r) / T), y1 = Math.floor((p.y + r) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!isSolid(map, tx, ty)) continue;
      const left = tx * T, top = ty * T;
      const cx = Math.max(left, Math.min(p.x, left + T));
      const cy = Math.max(top, Math.min(p.y, top + T));
      const dx = p.x - cx, dy = p.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        p.x += (dx / d) * (r - d);
        p.y += (dy / d) * (r - d);
      } else {
        // Centro dentro do tile: empurra para a borda mais próxima.
        const opts = [
          [p.x - left + r, -1, 0], [left + T - p.x + r, 1, 0],
          [p.y - top + r, 0, -1], [top + T - p.y + r, 0, 1],
        ].sort((a, b) => a[0] - b[0]);
        p.x += opts[0][1] * opts[0][0];
        p.y += opts[0][2] * opts[0][0];
      }
      moved = true;
    }
    if (!moved) break;
  }
}

// Move a entidade em sub-passos para não atravessar paredes finas.
export function moveEntity(map, ent, dx, dy, r, noClip = false) {
  if (noClip) {
    ent.x = Math.max(T, Math.min((map.W - 1) * T, ent.x + dx));
    ent.y = Math.max(T, Math.min((map.H - 1) * T, ent.y + dy));
    return;
  }
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 4));
  for (let i = 0; i < steps; i++) {
    ent.x += dx / steps;
    ent.y += dy / steps;
    resolveCircle(map, ent, r);
  }
}

export function collides(map, x, y, r) {
  const x0 = Math.floor((x - r) / T), x1 = Math.floor((x + r) / T);
  const y0 = Math.floor((y - r) / T), y1 = Math.floor((y + r) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolid(map, tx, ty)) return true;
  return false;
}

// Distância percorrida por um raio até bater em um tile opaco (DDA).
export function castRay(map, x, y, ang, maxDist) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let tx = Math.floor(x / T), ty = Math.floor(y / T);
  const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
  const tDeltaX = Math.abs(T / (dx || 1e-9)), tDeltaY = Math.abs(T / (dy || 1e-9));
  let tMaxX = dx > 0 ? ((tx + 1) * T - x) / dx : dx < 0 ? (tx * T - x) / dx : Infinity;
  let tMaxY = dy > 0 ? ((ty + 1) * T - y) / dy : dy < 0 ? (ty * T - y) / dy : Infinity;
  let t = 0;
  while (t < maxDist) {
    if (tMaxX < tMaxY) { t = tMaxX; tMaxX += tDeltaX; tx += stepX; }
    else { t = tMaxY; tMaxY += tDeltaY; ty += stepY; }
    if (t >= maxDist) return maxDist;
    if (isOpaque(map, tx, ty)) return t;
  }
  return maxDist;
}

export function lineOfSight(map, x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  if (d < 1) return true;
  return castRay(map, x0, y0, Math.atan2(y1 - y0, x1 - x0), d) >= d - 0.5;
}

// Verifica se um corpo de raio r consegue andar em linha reta entre dois pontos.
export function walkableLine(map, x0, y0, x1, y1, r) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(d / 8));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (collides(map, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r)) return false;
  }
  return true;
}
