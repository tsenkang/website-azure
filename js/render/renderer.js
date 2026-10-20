// Renderizador principal: câmera, mundo, personagens, efeitos, neblina de visão e indicadores.
import { TILE as T } from '../config.js';
import { buildStaticLayer, buildMinimapBase } from './world.js';
import { drawAnimated, ANIMATED_TYPES } from './furniture.js';
import { drawCharacter, drawKnockedOut, drawStar, roundRect } from './sprites.js';
import { castRay } from '../core/physics.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fog = document.createElement('canvas');
    this.fctx = this.fog.getContext('2d');
    this.cam = { x: 0, y: 0 };
    this.zoom = 1;
    this.effects = [];
    this.t = 0;
    this.game = null;
    this.targets = []; // alvos de seta (tutorial)
    this.resize();
  }

  setGame(game) {
    this.game = game;
    this.staticLayer = buildStaticLayer(game.map);
    this.minimapBase = buildMinimapBase(game.map, 10);
    this.animated = game.map.furniture.filter((f) => ANIMATED_TYPES.has(f.type));
    this.cam.x = game.local.x; this.cam.y = game.local.y;
    this.effects = [];
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    this.dpr = dpr; this.w = w; this.h = h;
    for (const c of [this.canvas, this.fog]) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    this.canvas.style.width = `${w}px`; this.canvas.style.height = `${h}px`;
    // Mostra ~26 tiles na horizontal (ou ~15 na vertical) para manter a leitura do mapa.
    this.zoom = Math.max(0.72, Math.min(2, Math.min(w / (26 * T), h / (15 * T))));
  }

  addEffect(e) { this.effects.push({ t: 0, dur: 1, ...e }); }

  worldTransform(ctx, camX, camY, zoom, w, h, dpr) {
    ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, (w / 2 - camX * zoom) * dpr, (h / 2 - camY * zoom) * dpr);
  }

  visiblePlayersFor(viewer) {
    const g = this.game;
    return g.players.filter((p) => {
      if (p === viewer) return true;
      if (!p.alive) return !viewer.alive && !p.ejected; // fantasmas só são vistos por fantasmas
      if (!viewer.alive) return true;
      return g.canSee(viewer, p);
    });
  }

  // Desenha o mundo (sem neblina) — usado também pelas câmeras de segurança.
  drawWorld(ctx, camX, camY, zoom, w, h, dpr, opts = {}) {
    const g = this.game;
    this.worldTransform(ctx, camX, camY, zoom, w, h, dpr);
    const vw = w / zoom, vh = h / zoom;
    const sx = Math.max(0, camX - vw / 2 - T), sy = Math.max(0, camY - vh / 2 - T);
    const sw = Math.min(this.staticLayer.width - sx, vw + 2 * T), sh = Math.min(this.staticLayer.height - sy, vh + 2 * T);
    if (sw > 0 && sh > 0) ctx.drawImage(this.staticLayer, sx, sy, sw, sh, sx, sy, sw, sh);

    const inView = (x, y, m = 3 * T) => x > camX - vw / 2 - m && x < camX + vw / 2 + m && y > camY - vh / 2 - m && y < camY + vh / 2 + m;
    const animOpts = { machinesDown: g.sabotage.machinesDown, gpsOff: g.sabotage.gpsOff, critical: !!g.sabotage.critical };
    for (const f of this.animated) {
      if (inView((f.x + f.w / 2) * T, (f.y + f.h / 2) * T)) drawAnimated(ctx, f, this.t, animOpts);
    }

    // Portas trancadas
    for (const d of g.map.doors) {
      if (!d.locked) continue;
      const x = d.x * T, y = d.y * T, dw = d.w * T, dh = d.h * T;
      ctx.fillStyle = '#4a5160'; ctx.fillRect(x, y, dw, dh);
      ctx.fillStyle = '#d9483b';
      if (d.h === 1) for (let i = 0; i < dw; i += 12) ctx.fillRect(x + i + 2, y + 4, 6, dh - 8);
      else for (let j = 0; j < dh; j += 12) ctx.fillRect(x + 4, y + j + 2, dw - 8, 6);
      ctx.fillStyle = '#f2c230'; ctx.fillRect(x, y + dh / 2 - 2, dw, 4);
    }

    // Piso molhado
    const ev = g.events.active;
    if (ev?.id === 'piso') {
      const z = ev.zone;
      ctx.fillStyle = 'rgba(120,190,255,0.22)'; ctx.fillRect(z.x, z.y, z.w, z.h);
      for (let i = 0; i < 3; i++) {
        const px = z.x + z.w * (0.2 + i * 0.3), py = z.y + z.h / 2;
        ctx.fillStyle = '#f2c230';
        ctx.beginPath(); ctx.moveTo(px, py - 14); ctx.lineTo(px + 9, py + 8); ctx.lineTo(px - 9, py + 8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#222'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', px, py + 5);
      }
    }

    if (!opts.camera) this.drawMarkers(ctx);

    // Corpos
    for (const b of g.bodies) {
      if (!inView(b.x, b.y)) continue;
      if (!opts.camera && g.local.alive && !g.canSee(g.local, b)) continue;
      const look = b.dummy ? { color: 'laranja', accessory: 'capacete', skin: '#f1c27d', hair: '#2b1d14', hairStyle: 0 } : g.playerById(b.playerId).look;
      drawKnockedOut(ctx, b.x, b.y, look, this.t);
    }

    // Jogadores ordenados por profundidade
    const list = opts.camera ? g.players.filter((p) => p.alive) : this.visiblePlayersFor(g.local);
    const sorted = list.filter((p) => inView(p.x, p.y)).sort((a, b) => a.y - b.y);
    for (const p of sorted) {
      drawCharacter(ctx, p.x, p.y, { look: p.look, facing: p.facing, moving: p.moving, t: p.animT, ghost: !p.alive, seed: p.id });
      if (p.busy && p.busy.kind !== 'minigame') this.drawBusy(ctx, p);
    }
    return sorted;
  }

  drawBusy(ctx, p) {
    const b = p.busy;
    const x = p.x, y = p.y - 38;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(15,22,35,0.75)'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = b.kind === 'fix' ? '#ff6b5b' : '#f2c230'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, b.t / b.dur)); ctx.stroke();
    ctx.rotate(this.t * 3);
    ctx.fillStyle = '#dfe6ee';
    for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.fillRect(-1.2, -5, 2.4, 3); }
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawMarkers(ctx) {
    const g = this.game;
    const me = g.local;
    const pulse = 0.5 + Math.sin(this.t * 5) * 0.5;
    if (!g.tutorialHideTasks) {
      for (const task of me.tasks) {
        if (task.done) continue;
        const s = g.map.stationById[task.stationId];
        const blocked = g.sabotage.isStationBlocked(s);
        ctx.strokeStyle = blocked ? 'rgba(255,90,80,0.8)' : `rgba(255,214,64,${0.5 + pulse * 0.5})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(s.px, s.py, 10 + pulse * 3, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = blocked ? '#ff5a50' : '#ffd640';
        ctx.font = 'bold 13px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(me.isImpostor ? '?' : '!', s.px, s.py - 18 - pulse * 3);
      }
    }
    const sab = g.sabotage.active;
    if (sab && me.alive) {
      for (const [id, fixed] of Object.entries(sab.fixed)) {
        if (fixed) continue;
        const f = g.map.fixById[id];
        ctx.strokeStyle = `rgba(255,70,60,${0.5 + pulse * 0.5})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.px, f.py, 12 + pulse * 5, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  computeVisibility(x, y, R) {
    const map = this.game.map;
    const pts = [];
    const N = 240;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const d = castRay(map, x, y, a, R);
      // Avança um pouco para dentro das paredes para que a face fique visível.
      const dd = Math.min(R, d + 10);
      pts.push(x + Math.cos(a) * dd, y + Math.sin(a) * dd);
    }
    return pts;
  }

  render(dt) {
    const g = this.game;
    if (!g) return;
    this.t += dt;
    const { ctx, w, h, dpr, zoom } = this;
    const me = g.local;
    // Câmera suave
    const k = 1 - Math.pow(0.0001, dt);
    this.cam.x += (me.x - this.cam.x) * k;
    this.cam.y += (me.y - this.cam.y) * k;
    if (Math.hypot(me.x - this.cam.x, me.y - this.cam.y) > 400) { this.cam.x = me.x; this.cam.y = me.y; }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b111b';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const visible = this.drawWorld(ctx, this.cam.x, this.cam.y, zoom, w, h, dpr);
    this.drawEffects(ctx, dt);

    // Neblina de visão
    if (me.alive) {
      const R = g.visionOf(me);
      const poly = this.computeVisibility(me.x, me.y, R);
      const f = this.fctx;
      f.setTransform(1, 0, 0, 1, 0, 0);
      f.globalCompositeOperation = 'source-over';
      f.clearRect(0, 0, this.fog.width, this.fog.height);
      f.fillStyle = g.sabotage.lightsOut && !me.isImpostor ? 'rgba(2,3,8,0.97)' : 'rgba(4,8,18,0.9)';
      f.fillRect(0, 0, this.fog.width, this.fog.height);
      this.worldTransform(f, this.cam.x, this.cam.y, zoom, w, h, dpr);
      f.globalCompositeOperation = 'destination-out';
      const grad = f.createRadialGradient(me.x, me.y, R * 0.15, me.x, me.y, R + 10);
      grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(0.72, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      f.fillStyle = grad;
      f.beginPath();
      for (let i = 0; i < poly.length; i += 2) (i ? f.lineTo(poly[i], poly[i + 1]) : f.moveTo(poly[i], poly[i + 1]));
      f.closePath(); f.fill();
      f.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.fog, 0, 0);
    }

    // Nomes por cima da neblina
    this.worldTransform(ctx, this.cam.x, this.cam.y, zoom, w, h, dpr);
    for (const p of visible) this.drawName(ctx, p);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawScreenOverlays(ctx);
  }

  drawName(ctx, p) {
    const g = this.game;
    const me = g.local;
    const teammate = me.isImpostor && p.isImpostor;
    const text = p.name + (p.isBot ? ' [BOT]' : '');
    ctx.font = 'bold 10px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width + 8;
    const y = p.y - (p.alive ? 40 : 46);
    ctx.fillStyle = 'rgba(10,16,28,0.55)';
    roundRect(ctx, p.x - tw / 2, y - 7, tw, 14, 6); ctx.fill();
    ctx.fillStyle = teammate ? '#ff6b6b' : p === me ? '#ffe28a' : '#ffffff';
    if (!p.alive) ctx.fillStyle = 'rgba(220,230,255,0.7)';
    ctx.fillText(text, p.x, y + 0.5);
  }

  drawEffects(ctx, dt) {
    this.effects = this.effects.filter((e) => (e.t += dt) < e.dur);
    for (const e of this.effects) {
      const k = e.t / e.dur;
      if (e.type === 'puff') {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.fillStyle = `rgba(230,235,245,${0.7 * (1 - k)})`;
          ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * k * 26, e.y - 10 + Math.sin(a) * k * 18, 9 * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
        }
        if (k < 0.4) { ctx.fillStyle = '#ffd84a'; ctx.font = 'bold 18px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('POW!', e.x, e.y - 34 - k * 20); }
      } else if (e.type === 'vent') {
        ctx.fillStyle = `rgba(160,170,190,${0.6 * (1 - k)})`;
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(e.x + Math.sin(i * 2 + k * 6) * 12, e.y - k * 30 - i * 3, 6 * (1 - k), 0, Math.PI * 2); ctx.fill(); }
      } else if (e.type === 'sparkle') {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + k * 2;
          drawStar(ctx, e.x + Math.cos(a) * (10 + k * 22), e.y - 16 + Math.sin(a) * (8 + k * 16), 4 * (1 - k), '#ffe066');
        }
      } else if (e.type === 'text') {
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = e.color || '#fff'; ctx.font = 'bold 13px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(e.text, e.x, e.y - 40 - k * 24);
        ctx.globalAlpha = 1;
      }
    }
  }

  drawScreenOverlays(ctx) {
    const g = this.game;
    const { w, h } = this;
    const sab = g.sabotage.active;
    if (sab?.type === 'critical') {
      const a = 0.12 + Math.sin(this.t * 6) * 0.1;
      const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      grad.addColorStop(0, 'rgba(255,0,0,0)'); grad.addColorStop(1, `rgba(255,30,30,${a + 0.15})`);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    }
    // Setas para os objetivos
    const arrows = [];
    if (sab && g.local.alive) for (const [id, fixed] of Object.entries(sab.fixed)) if (!fixed) arrows.push({ x: g.map.fixById[id].px, y: g.map.fixById[id].py, color: '#ff4b3e' });
    for (const t of this.targets) arrows.push({ ...t, color: t.color || '#ffd640' });
    for (const a of arrows) this.drawArrow(ctx, a);
  }

  drawArrow(ctx, a) {
    const { w, h, zoom } = this;
    const sx = (a.x - this.cam.x) * zoom + w / 2, sy = (a.y - this.cam.y) * zoom + h / 2;
    const m = 50;
    if (sx > m && sx < w - m && sy > m && sy < h - m) {
      const bob = Math.sin(this.t * 6) * 5;
      ctx.fillStyle = a.color;
      ctx.beginPath(); ctx.moveTo(sx, sy - 30 + bob); ctx.lineTo(sx - 9, sy - 44 + bob); ctx.lineTo(sx + 9, sy - 44 + bob); ctx.closePath(); ctx.fill();
      return;
    }
    const ang = Math.atan2(sy - h / 2, sx - w / 2);
    const ex = Math.max(m, Math.min(w - m, sx)), ey = Math.max(m, Math.min(h - m, sy));
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang);
    ctx.fillStyle = a.color; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-8, -12); ctx.lineTo(-3, 0); ctx.lineTo(-8, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // Visão de uma câmera de segurança em um canvas pequeno.
  renderCamera(canvas, view) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    this.drawWorld(ctx, view.px, view.py, w / (12 * T), w, h, 1, { camera: true });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(120,255,160,0.06)'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, y, w, 1); }
  }

  // Minimapa (também usado no mapa grande e no menu de sabotagem).
  drawMap(canvas, opts = {}) {
    const g = this.game;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const s = Math.min(w / (g.map.W * T), h / (g.map.H * T));
    const ox = (w - g.map.W * T * s) / 2, oy = (h - g.map.H * T * s) / 2;
    const P = (x, y) => [ox + x * s, oy + y * s];
    const offline = (g.sabotage.gpsOff || g.events.minimapOff) && !opts.force;
    ctx.drawImage(this.minimapBase, ox, oy, g.map.W * T * s, g.map.H * T * s);
    if (offline) {
      for (let i = 0; i < 400; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`; ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
      ctx.fillStyle = 'rgba(10,15,25,0.6)'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ff6b5b'; ctx.font = `bold ${Math.max(11, w / 22)}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(g.sabotage.gpsOff ? 'GPS OFFLINE' : 'SEM SINAL DE WI-FI', w / 2, h / 2);
      return { s, ox, oy };
    }
    const pulse = 0.5 + Math.sin(this.t * 5) * 0.5;
    for (const t of g.local.tasks) {
      if (t.done) continue;
      const st = g.map.stationById[t.stationId];
      const [x, y] = P(st.px, st.py);
      ctx.fillStyle = '#ffd640'; ctx.beginPath(); ctx.arc(x, y, Math.max(2.5, 4 * (w / 600)) + pulse, 0, Math.PI * 2); ctx.fill();
    }
    const sab = g.sabotage.active;
    if (sab) for (const [id, fixed] of Object.entries(sab.fixed)) {
      if (fixed) continue;
      const f = g.map.fixById[id];
      const [x, y] = P(f.px, f.py);
      ctx.strokeStyle = '#ff4b3e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 5 + pulse * 3, 0, Math.PI * 2); ctx.stroke();
    }
    if (opts.sabotage) {
      for (const r of g.map.rooms) {
        if (r.corridor) continue;
        const locked = g.sabotage.doorLocks[r.id];
        const [x, y] = P(r.cx, r.cy + r.h * T * 0.28);
        ctx.fillStyle = locked ? '#ff4b3e' : 'rgba(255,255,255,0.85)';
        ctx.font = `bold ${Math.max(10, w / 70)}px "Segoe UI", sans-serif`; ctx.textAlign = 'center';
        ctx.fillText(locked ? '🔒 trancada' : '🚪 trancar', x, y);
      }
    }
    if (opts.big) {
      ctx.fillStyle = 'rgba(232,238,246,0.92)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const fs = Math.max(10, Math.round(w / 64));
      ctx.font = `600 ${fs}px "Inter", "Segoe UI", sans-serif`;
      for (const r of g.map.rooms) {
        if (r.corridor) continue;
        const [x, y] = P(r.cx, r.y * T + T * 1.6);
        const words = r.name.split(' ');
        const maxW = r.w * T * s * 0.9;
        if (ctx.measureText(r.name).width > maxW && words.length > 1) {
          const half = Math.ceil(words.length / 2);
          ctx.fillText(words.slice(0, half).join(' '), x, y);
          ctx.fillText(words.slice(half).join(' '), x, y + fs * 1.15);
        } else ctx.fillText(r.name, x, y);
      }
    }
    if (g.local.isImpostor && opts.big) {
      for (const v of g.map.vents) { const [x, y] = P(v.px, v.py); ctx.fillStyle = '#9aa5b5'; ctx.fillRect(x - 3, y - 3, 6, 6); }
    }
    const [mx, my] = P(g.local.x, g.local.y);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx, my, Math.max(3.5, 5 * (w / 600)), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = g.local.color.hex; ctx.beginPath(); ctx.arc(mx, my, Math.max(2.5, 3.5 * (w / 600)), 0, Math.PI * 2); ctx.fill();
    return { s, ox, oy };
  }
}
