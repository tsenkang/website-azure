// Personagens desenhados proceduralmente: alunos em estilo cartoon, com contorno escuro grosso,
// sombreamento chapado e olhos grandes.
import { colorOf } from '../core/player.js';

export const INK = '#15171f';
const OUT = 2.4;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillOut(ctx, fill, lw = OUT) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

// Corpo com sombra chapada no lado oposto ao olhar.
function bodyShape(ctx) {
  ctx.beginPath();
  ctx.moveTo(-10, -2);
  ctx.quadraticCurveTo(-11, -13, 0, -13);
  ctx.quadraticCurveTo(11, -13, 10, -2);
  ctx.lineTo(10.5, 5);
  ctx.quadraticCurveTo(10.5, 8, 7, 8);
  ctx.lineTo(-7, 8);
  ctx.quadraticCurveTo(-10.5, 8, -10.5, 5);
  ctx.closePath();
}

function drawHair(ctx, look, f) {
  ctx.beginPath();
  if (look.hairStyle === 0) {
    ctx.moveTo(-10, -20);
    ctx.quadraticCurveTo(-10, -31, 0, -31);
    ctx.quadraticCurveTo(10, -31, 10.3, -20);
    ctx.quadraticCurveTo(4 * f, -26, -10, -20);
  } else if (look.hairStyle === 1) {
    ctx.moveTo(-10.4, -14);
    ctx.quadraticCurveTo(-12, -31, 0, -31.5);
    ctx.quadraticCurveTo(12, -31, 10.4, -14);
    ctx.quadraticCurveTo(9, -24, 2 * f, -25);
    ctx.quadraticCurveTo(-8, -24, -10.4, -14);
  } else {
    for (let i = -3; i <= 3; i++) ctx.arc(i * 2.9, -28 + Math.abs(i) * 1.1, 4, 0, Math.PI * 2);
  }
  fillOut(ctx, look.hair, 2);
}

function drawAccessory(ctx, look, f, colors) {
  switch (look.accessory) {
    case 'capacete': {
      ctx.beginPath(); ctx.arc(0, -22, 10.5, Math.PI, 0); ctx.closePath();
      fillOut(ctx, '#f6c32e');
      ctx.beginPath(); roundRect(ctx, -13, -23.5, 26, 4, 2); fillOut(ctx, '#d9a514', 2);
      ctx.beginPath(); ctx.rect(-1.6, -32.5, 3.2, 9); ctx.fillStyle = '#d9a514'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.beginPath(); ctx.ellipse(-4.5, -28, 3, 1.5, -0.5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'oculos': {
      ctx.fillStyle = INK; ctx.fillRect(-10.5, -20.5, 21, 2.4);
      ctx.beginPath(); roundRect(ctx, f * 3 - 8, -22.5, 16, 7, 3.5); fillOut(ctx, 'rgba(160,225,255,0.85)', 2);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(f * 3 - 5, -21, 4, 1.6);
      break;
    }
    case 'bone': {
      ctx.beginPath(); ctx.arc(0, -22.5, 10, Math.PI, 0); ctx.closePath(); fillOut(ctx, colors.dark);
      ctx.beginPath(); roundRect(ctx, f > 0 ? 2 : -16, -24, 14, 4, 2); fillOut(ctx, colors.dark, 2);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -32, 1.6, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'fone': {
      ctx.strokeStyle = INK; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.arc(0, -19, 11.5, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.strokeStyle = '#3a3f4b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -19, 11.5, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.beginPath(); roundRect(ctx, -14, -21, 5, 8, 2.5); fillOut(ctx, '#e24b4b', 2);
      ctx.beginPath(); roundRect(ctx, 9, -21, 5, 8, 2.5); fillOut(ctx, '#e24b4b', 2);
      break;
    }
    case 'touca': {
      ctx.beginPath(); ctx.arc(0, -21.5, 10.4, Math.PI, 0); ctx.closePath(); fillOut(ctx, colors.dark);
      ctx.beginPath(); roundRect(ctx, -11, -23, 22, 4.5, 2); fillOut(ctx, '#f2f2f2', 2);
      ctx.beginPath(); ctx.arc(0, -33, 3.2, 0, Math.PI * 2); fillOut(ctx, '#f2f2f2', 2);
      break;
    }
    default: break;
  }
}

// Desenha um aluno em (x, y) = centro de colisão. Os pés ficam em y + 11.
export function drawCharacter(ctx, x, y, o) {
  const look = o.look;
  const colors = colorOf(look);
  const f = o.facing || 1;
  const t = o.t || 0;
  const walk = o.moving ? Math.sin(t * 13) : 0;
  const bob = o.moving ? Math.abs(Math.sin(t * 13)) * 1.8 : Math.sin(t * 2.4) * 0.5;
  const s = (o.scale || 1) * 1.08;
  const jaleco = look.accessory === 'jaleco';
  const main = jaleco ? '#f4f6f9' : colors.hex;
  const dark = jaleco ? '#c5ccd6' : colors.dark;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (o.ghost) ctx.globalAlpha *= 0.55;

  if (!o.ghost) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 11, 11, 3.8, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.translate(0, o.ghost ? Math.sin(t * 3) * 2 - 4 : -bob);

  // Pernas
  if (!o.ghost) {
    for (const [lx, ph] of [[-5.5, walk], [1, -walk]]) {
      ctx.beginPath(); roundRect(ctx, lx, 3 + ph * 2, 5, 8, 2.4); fillOut(ctx, '#27324d', 2);
      ctx.beginPath(); roundRect(ctx, lx - 0.8, 8.6 + ph * 2, 6.6, 3.4, 1.7); fillOut(ctx, '#181a20', 1.6);
    }
  }

  // Mochila (atrás do corpo)
  ctx.beginPath(); roundRect(ctx, -f * 12 - 4, -10, 8, 13, 3.5); fillOut(ctx, '#3c4659');
  ctx.fillStyle = '#56627a'; ctx.fillRect(-f * 12 - 2.5, -6, 5, 2);

  // Corpo
  if (o.ghost) {
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.quadraticCurveTo(-11, -13, 0, -13);
    ctx.quadraticCurveTo(11, -13, 10, -2);
    ctx.lineTo(10, 7);
    for (let i = 0; i <= 4; i++) ctx.lineTo(10 - i * 5, 7 + (i % 2 ? -3.5 : 1.5) + Math.sin(t * 6 + i) * 1.3);
    ctx.closePath();
    fillOut(ctx, main);
  } else {
    bodyShape(ctx);
    fillOut(ctx, main);
    // sombra chapada
    ctx.save();
    bodyShape(ctx); ctx.clip();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(-f * 9, 2, 8, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(f * 4, -9, 4, 1.8, 0.3 * f, 0, Math.PI * 2); ctx.fill();
    // faixa refletiva / detalhe do jaleco
    if (jaleco) {
      ctx.fillStyle = colors.hex; ctx.beginPath(); ctx.moveTo(-3.5, -13); ctx.lineTo(0, -5); ctx.lineTo(3.5, -13); ctx.fill();
      ctx.fillStyle = '#9aa6b5'; ctx.fillRect(-0.6, -5, 1.2, 12);
    } else {
      ctx.fillStyle = '#eef2f6'; ctx.fillRect(-12, -1, 24, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-12, 2, 24, 1);
    }
    ctx.restore();
    bodyShape(ctx); ctx.lineWidth = OUT; ctx.strokeStyle = INK; ctx.stroke();
    // crachá
    ctx.beginPath(); roundRect(ctx, f * 3.5 - 2.4, -10, 4.8, 5.4, 1); fillOut(ctx, '#ffffff', 1.3);
    ctx.fillStyle = '#2c5d9e'; ctx.fillRect(f * 3.5 - 2.4, -10, 4.8, 1.6);
    // braços
    for (const [ax, ph, rot] of [[-11, -walk, 0.25], [11, walk, -0.25]]) {
      ctx.beginPath(); ctx.ellipse(ax, -3 + ph * 1.6, 3.2, 5.2, rot, 0, Math.PI * 2); fillOut(ctx, ax * f < 0 ? dark : main, 2);
    }
  }

  // Cabeça
  ctx.beginPath(); ctx.arc(0, -20, 10, 0, Math.PI * 2); fillOut(ctx, look.skin);
  ctx.save();
  ctx.beginPath(); ctx.arc(0, -20, 10, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.arc(-f * 9, -17, 8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.arc(0, -20, 10, 0, Math.PI * 2); ctx.lineWidth = OUT; ctx.strokeStyle = INK; ctx.stroke();
  drawHair(ctx, look, f);

  // Olhos grandes
  const blink = (Math.floor(t * 10 + (o.seed || 0) * 13) % 41) === 0;
  const ex = f * 2.6;
  if (o.ko) {
    ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
    for (const dx of [-3.6, 3.6]) {
      ctx.beginPath(); ctx.moveTo(ex + dx - 2, -21.5); ctx.lineTo(ex + dx + 2, -17.5); ctx.moveTo(ex + dx + 2, -21.5); ctx.lineTo(ex + dx - 2, -17.5); ctx.stroke();
    }
  } else if (blink) {
    ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(ex - 6, -19); ctx.lineTo(ex - 1.5, -19); ctx.moveTo(ex + 1.5, -19); ctx.lineTo(ex + 6, -19); ctx.stroke();
  } else {
    for (const dx of [-3.6, 3.6]) {
      ctx.beginPath(); ctx.ellipse(ex + dx, -19.5, 2.9, 3.6, 0, 0, Math.PI * 2); fillOut(ctx, '#ffffff', 1.4);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(ex + dx + f * 0.9, -19, 1.6, 2.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + dx + f * 0.4, -20.2, 0.7, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,110,110,0.4)';
  ctx.beginPath(); ctx.ellipse(ex - 6.5, -15, 2, 1.3, 0, 0, Math.PI * 2); ctx.ellipse(ex + 6.5, -15, 2, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  if (!o.ko) { ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(ex, -14.8, 1.8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  drawAccessory(ctx, look, f, colors);

  if (o.ghost) {
    ctx.strokeStyle = 'rgba(255,236,140,0.95)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, -35, 7, 2.2, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// Aluno desacordado (eliminado): deitado, olhos em "x" e estrelinhas girando. Sem conteúdo gráfico.
export function drawKnockedOut(ctx, x, y, look, t, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 5, 18, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.rotate(-Math.PI / 2);
  ctx.translate(-2, 6);
  drawCharacter(ctx, 0, 0, { look, facing: 1, t: 0, moving: false, ko: true });
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const a = t * 3 + (i * Math.PI * 2) / 3;
    drawStar(ctx, -24 + Math.cos(a) * 9, -10 + Math.sin(a) * 3.5, 3.6, '#ffd84a');
  }
  ctx.restore();
}

export function drawStar(ctx, x, y, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = INK; ctx.stroke();
}

// Avatar para a interface (lobby, reunião, tela final).
export function drawAvatar(canvas, look, opts = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const scale = opts.scale || h / 46;
  if (opts.dead) {
    ctx.globalAlpha = 0.6;
    drawKnockedOut(ctx, w / 2 + 4, h * 0.62, look, opts.t || 0, scale * 0.8);
    ctx.globalAlpha = 1;
  } else {
    drawCharacter(ctx, w / 2, h * 0.7, { look, facing: opts.facing || 1, t: opts.t || 0, moving: !!opts.moving, scale, ghost: !!opts.ghost, seed: opts.seed });
  }
}

export { roundRect, shade };
