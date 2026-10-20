// Personagens desenhados proceduralmente (alunos com uniforme técnico e acessórios).
import { colorOf } from '../core/player.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHair(ctx, look, f) {
  ctx.fillStyle = look.hair;
  ctx.beginPath();
  if (look.hairStyle === 0) {
    ctx.arc(0, -18, 8.4, Math.PI * 1.02, Math.PI * 1.98);
    ctx.lineTo(7, -18);
    ctx.quadraticCurveTo(0, -21, -7, -17);
  } else if (look.hairStyle === 1) {
    ctx.arc(0, -18, 8.8, Math.PI * 0.95, Math.PI * 2.05);
    ctx.lineTo(-f * 8.5, -11);
    ctx.lineTo(-f * 6, -12);
    ctx.quadraticCurveTo(0, -21, f * 7, -17);
  } else {
    for (let i = -3; i <= 3; i++) ctx.arc(i * 2.4, -24 + Math.abs(i) * 0.9, 3.4, 0, Math.PI * 2);
  }
  ctx.fill();
}

function drawAccessory(ctx, look, f, colors) {
  switch (look.accessory) {
    case 'capacete': {
      ctx.fillStyle = '#f2c230';
      ctx.beginPath(); ctx.arc(0, -19, 9, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#d9a514';
      roundRect(ctx, -11, -20, 22, 3, 1.5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.ellipse(-3, -24, 3, 1.6, -0.4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'oculos': {
      ctx.fillStyle = '#333';
      ctx.fillRect(-8.5, -19, 17, 2);
      ctx.fillStyle = 'rgba(150,220,255,0.75)';
      roundRect(ctx, f * 2.5 - 6.5, -20.5, 13, 5.5, 2.5); ctx.fill();
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1; ctx.stroke();
      break;
    }
    case 'bone': {
      ctx.fillStyle = colors.dark;
      ctx.beginPath(); ctx.arc(0, -19.5, 8.6, Math.PI, 0); ctx.fill();
      roundRect(ctx, f > 0 ? 2 : -13, -21, 11, 3, 1.5); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, -27.5, 1.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'fone': {
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -18, 9.5, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.fillStyle = '#e04b4b';
      roundRect(ctx, -11, -19, 4, 6, 2); ctx.fill();
      roundRect(ctx, 7, -19, 4, 6, 2); ctx.fill();
      break;
    }
    case 'touca': {
      ctx.fillStyle = colors.dark;
      ctx.beginPath(); ctx.arc(0, -19, 8.8, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(-9, -20, 18, 3);
      ctx.beginPath(); ctx.arc(0, -29, 2.6, 0, Math.PI * 2); ctx.fill();
      break;
    }
    default: break;
  }
}

// Desenha um aluno em (x, y) = centro de colisão. Os pés ficam em y + 10.
export function drawCharacter(ctx, x, y, o) {
  const look = o.look;
  const colors = colorOf(look);
  const f = o.facing || 1;
  const t = o.t || 0;
  const walk = o.moving ? Math.sin(t * 13) : 0;
  const bob = o.moving ? Math.abs(Math.sin(t * 13)) * 1.6 : Math.sin(t * 2.5) * 0.4;
  const s = o.scale || 1;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (o.ghost) ctx.globalAlpha *= 0.5;

  if (!o.ghost) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(0, 10, 10, 3.6, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.translate(0, o.ghost ? Math.sin(t * 3) * 2 - 3 : -bob);

  // Pernas
  if (!o.ghost) {
    ctx.fillStyle = '#1f2a44';
    roundRect(ctx, -6, 1 + walk * 2, 5, 9, 2.4); ctx.fill();
    roundRect(ctx, 1, 1 - walk * 2, 5, 9, 2.4); ctx.fill();
    ctx.fillStyle = '#111';
    roundRect(ctx, -6.5, 8 + walk * 2, 6, 3, 1.5); ctx.fill();
    roundRect(ctx, 0.5, 8 - walk * 2, 6, 3, 1.5); ctx.fill();
  }

  // Mochila
  ctx.fillStyle = '#2b3445';
  roundRect(ctx, -f * 12 - 3, -9, 6, 11, 2.5); ctx.fill();

  // Corpo / uniforme
  const jaleco = look.accessory === 'jaleco';
  if (o.ghost) {
    ctx.fillStyle = colors.hex;
    ctx.beginPath();
    ctx.moveTo(-9, -6);
    ctx.quadraticCurveTo(-9, -12, 0, -12);
    ctx.quadraticCurveTo(9, -12, 9, -6);
    ctx.lineTo(9, 6);
    for (let i = 0; i <= 4; i++) ctx.lineTo(9 - i * 4.5, 6 + (i % 2 ? -3 : 1) + Math.sin(t * 6 + i) * 1.2);
    ctx.closePath();
    ctx.fill();
  } else {
    const grad = ctx.createLinearGradient(0, -11, 0, 4);
    grad.addColorStop(0, jaleco ? '#ffffff' : colors.hex);
    grad.addColorStop(1, jaleco ? '#d5dbe3' : colors.dark);
    ctx.fillStyle = grad;
    roundRect(ctx, -9, -11, 18, 15, 6); ctx.fill();
    if (jaleco) {
      ctx.fillStyle = colors.hex;
      ctx.beginPath(); ctx.moveTo(-3, -11); ctx.lineTo(0, -4); ctx.lineTo(3, -11); ctx.fill();
      ctx.fillStyle = '#9aa6b5'; ctx.fillRect(-0.5, -4, 1, 8);
    } else {
      // Faixa refletiva do uniforme técnico
      ctx.fillStyle = 'rgba(235,240,245,0.85)';
      ctx.fillRect(-9, -3, 18, 2.4);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(-9, -0.6, 18, 0.8);
    }
    // Crachá
    ctx.fillStyle = '#fff';
    roundRect(ctx, f * 3 - 2, -9, 4, 4.5, 1); ctx.fill();
    ctx.fillStyle = '#2c5d9e'; ctx.fillRect(f * 3 - 2, -9, 4, 1.4);
    // Braços
    ctx.fillStyle = jaleco ? '#e8edf3' : colors.hex;
    ctx.beginPath(); ctx.ellipse(-10, -3 - walk * 1.5, 2.8, 4.5, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, -3 + walk * 1.5, 2.8, 4.5, -0.2, 0, Math.PI * 2); ctx.fill();
  }

  // Cabeça
  ctx.fillStyle = look.skin;
  ctx.beginPath(); ctx.arc(0, -17, 8, 0, Math.PI * 2); ctx.fill();
  drawHair(ctx, look, f);
  // Olhos
  const blink = (Math.floor(t * 10 + (o.seed || 0) * 13) % 37) === 0;
  ctx.fillStyle = '#1b1b1b';
  if (o.ko) {
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 1.3;
    for (const ex of [f * 2 - 3, f * 2 + 3]) {
      ctx.beginPath(); ctx.moveTo(ex - 1.5, -18.5); ctx.lineTo(ex + 1.5, -15.5); ctx.moveTo(ex + 1.5, -18.5); ctx.lineTo(ex - 1.5, -15.5); ctx.stroke();
    }
  } else if (blink) {
    ctx.fillRect(f * 2 - 4.5, -16.5, 3, 1); ctx.fillRect(f * 2 + 1.5, -16.5, 3, 1);
  } else {
    ctx.beginPath(); ctx.ellipse(f * 2 - 3, -16.5, 1.3, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(f * 2 + 3, -16.5, 1.3, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(f * 2 - 3, -17.6, 0.8, 0.8); ctx.fillRect(f * 2 + 3, -17.6, 0.8, 0.8);
  }
  ctx.fillStyle = 'rgba(255,120,120,0.35)';
  ctx.beginPath(); ctx.arc(f * 2 - 5.5, -13.5, 1.6, 0, Math.PI * 2); ctx.arc(f * 2 + 5.5, -13.5, 1.6, 0, Math.PI * 2); ctx.fill();
  drawAccessory(ctx, look, f, colors);

  if (o.ghost) {
    ctx.strokeStyle = 'rgba(255,240,150,0.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, -30, 6, 2, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// Aluno desacordado (eliminado): deitado, olhos em "x" e estrelinhas girando. Sem conteúdo gráfico.
export function drawKnockedOut(ctx, x, y, look, t, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 4, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.rotate(-Math.PI / 2);
  ctx.translate(-2, 6);
  drawCharacter(ctx, 0, 0, { look, facing: 1, t: 0, moving: false, ko: true });
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const a = t * 3 + (i * Math.PI * 2) / 3;
    drawStar(ctx, -20 + Math.cos(a) * 8, -8 + Math.sin(a) * 3, 3, '#ffd84a');
  }
  ctx.restore();
}

export function drawStar(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

// Avatar para a interface (lobby, reunião, tela final).
export function drawAvatar(canvas, look, opts = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const scale = opts.scale || h / 40;
  if (opts.dead) {
    ctx.globalAlpha = 0.55;
    drawKnockedOut(ctx, w / 2 + 4, h * 0.62, look, opts.t || 0, scale * 0.85);
    ctx.globalAlpha = 1;
  } else {
    drawCharacter(ctx, w / 2, h * 0.68, { look, facing: opts.facing || 1, t: opts.t || 0, moving: !!opts.moving, scale, ghost: !!opts.ghost });
  }
}

export { roundRect };
