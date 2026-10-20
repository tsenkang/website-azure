// A* em grade com 8 direções e suavização de caminho.
import { TILE as T, PLAYER_RADIUS } from '../config.js';
import { isSolid } from './map.js';
import { walkableLine } from './physics.js';

class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(node, f) {
    const a = this.a; a.push([f, node]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]]; i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top[1];
  }
}

const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

export function findPath(map, sx, sy, gx, gy, noClip = false) {
  const W = map.W;
  let stx = Math.floor(sx / T), sty = Math.floor(sy / T);
  const gtx = Math.floor(gx / T), gty = Math.floor(gy / T);
  const blocked = (x, y) => (noClip ? (x < 1 || y < 1 || x >= map.W - 1 || y >= map.H - 1) : isSolid(map, x, y));
  if (blocked(gtx, gty)) return null;
  if (blocked(stx, sty)) {
    // Começo dentro de algo sólido (borda de colisão): usa o vizinho livre mais próximo.
    let found = false;
    for (const [dx, dy] of DIRS) if (!blocked(stx + dx, sty + dy)) { stx += dx; sty += dy; found = true; break; }
    if (!found) return null;
  }
  const start = sty * W + stx, goal = gty * W + gtx;
  const g = new Float32Array(W * map.H).fill(Infinity);
  const came = new Int32Array(W * map.H).fill(-1);
  const closed = new Uint8Array(W * map.H);
  const h = (k) => { const x = k % W, y = (k / W) | 0; const dx = Math.abs(x - gtx), dy = Math.abs(y - gty); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  const open = new MinHeap();
  g[start] = 0; open.push(start, h(start));
  let iterations = 0;
  while (open.size) {
    const cur = open.pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (++iterations > 20000) return null;
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (blocked(nx, ny)) continue;
      if (dx && dy && (blocked(cx + dx, cy) || blocked(cx, cy + dy))) continue;
      const nk = ny * W + nx;
      const ng = g[cur] + cost;
      if (ng < g[nk]) { g[nk] = ng; came[nk] = cur; open.push(nk, ng + h(nk)); }
    }
  }
  if (start !== goal && came[goal] < 0) return null;
  const tilesPath = [];
  for (let k = goal; k !== -1 && k !== start; k = came[k]) tilesPath.push(k);
  tilesPath.reverse();
  const pts = tilesPath.map((k) => ({ x: (k % W + 0.5) * T, y: (((k / W) | 0) + 0.5) * T }));
  if (pts.length) pts[pts.length - 1] = { x: gx, y: gy };
  else pts.push({ x: gx, y: gy });
  return noClip ? pts : smooth(map, sx, sy, pts);
}

function smooth(map, sx, sy, pts) {
  const out = [];
  let cx = sx, cy = sy, i = 0;
  const r = PLAYER_RADIUS + 1;
  while (i < pts.length) {
    let j = Math.min(pts.length - 1, i + 24);
    while (j > i && !walkableLine(map, cx, cy, pts[j].x, pts[j].y, r)) j--;
    out.push(pts[j]);
    cx = pts[j].x; cy = pts[j].y; i = j + 1;
  }
  return out;
}
