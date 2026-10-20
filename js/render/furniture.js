// Desenho estático dos móveis/equipamentos e das partes animadas.
import { TILE as T } from '../config.js';
import { roundRect, INK } from './sprites.js';

const C = {
  metal: '#9aa5b5', metalDark: '#566174', metalDeep: '#3a4252', blue: '#2c5d9e', blueLight: '#4b86d6',
  yellow: '#f2c230', red: '#d9483b', wood: '#a8774a', woodDark: '#7a5230', white: '#eef2f6', black: '#1d222b',
  green: '#3fae5e', screen: '#123049',
};

function shadow(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,10,20,0.32)';
  roundRect(ctx, x + 4, y + 7, w, h, 5); ctx.fill();
}

// Contorno escuro grosso (estilo cartoon) no caminho atual.
function ink(ctx, lw = 2.2) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); }

// Caixa em perspectiva 3/4: tampo + face frontal, com contorno e brilho na quina.
function box(ctx, x, y, w, h, top, front, fh = 7, r = 3) {
  ctx.fillStyle = front;
  roundRect(ctx, x, y + fh * 0.4, w, h - fh * 0.4, r); ctx.fill();
  ctx.fillStyle = top;
  roundRect(ctx, x, y, w, h - fh, r); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x + r, y + 1.5, w - r * 2, 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x + 1, y + h - fh); ctx.lineTo(x + w - 1, y + h - fh); ctx.stroke();
  roundRect(ctx, x, y, w, h, r); ink(ctx);
}

function chair(ctx, x, y, color = '#2f3a4f') {
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x + 1, y + 5, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color; roundRect(ctx, x - 6, y - 5, 12, 10, 3); ctx.fill(); ink(ctx, 1.6);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; roundRect(ctx, x - 5, y - 4, 10, 3, 2); ctx.fill();
}

function monitor(ctx, x, y, w = 16, glow = '#3d8bd9') {
  ctx.fillStyle = C.black; roundRect(ctx, x, y, w, 10, 1.5); ctx.fill(); ink(ctx, 1.4);
  ctx.fillStyle = glow; ctx.fillRect(x + 1.5, y + 1.5, w - 3, 7);
  ctx.fillStyle = '#444'; ctx.fillRect(x + w / 2 - 1.5, y + 10, 3, 3);
}

function hazardStripes(ctx, x, y, w, h, size = 8) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = C.yellow; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#222';
  for (let i = -h; i < w + h; i += size * 2) {
    ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + size, y + h); ctx.lineTo(x + i + size + h, y); ctx.lineTo(x + i + h, y); ctx.fill();
  }
  ctx.restore();
}

function label(ctx, text, x, y, color = '#fff', size = 8) {
  ctx.fillStyle = color; ctx.font = `bold ${size}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
}

export function drawFurniture(ctx, f) {
  const x = f.x * T, y = f.y * T, w = f.w * T, h = f.h * T;
  const cx = x + w / 2, cy = y + h / 2;
  switch (f.type) {
    case 'toolboard': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 2, w - 4, h - 2, '#b58b5c', '#7a5a38', 6);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let i = 8; i < w - 6; i += 6) for (let j = 6; j < h - 8; j += 5) ctx.fillRect(x + i, y + j, 1.2, 1.2);
      break;
    }
    case 'lathe': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 6, w - 4, h - 8, C.metal, C.metalDark, 10);
      ctx.fillStyle = C.blue; roundRect(ctx, x + 4, y + 4, 26, h - 14, 4); ctx.fill();
      ctx.fillStyle = C.metalDark; ctx.fillRect(x + 32, y + 18, w - 50, 6);
      ctx.fillStyle = C.blue; roundRect(ctx, x + w - 22, y + 10, 16, h - 26, 3); ctx.fill();
      ctx.fillStyle = C.yellow; ctx.fillRect(x + 6, y + h - 10, w - 12, 3);
      break;
    }
    case 'workbench': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 4, w - 4, h - 6, '#c79a68', C.metalDark, 10);
      ctx.fillStyle = C.metalDeep; roundRect(ctx, x + 8, y + 8, 14, 10, 2); ctx.fill(); // morsa
      ctx.fillStyle = C.metal; ctx.fillRect(x + 22, y + 11, 6, 4);
      ctx.fillStyle = C.red; roundRect(ctx, x + w - 34, y + 9, 20, 9, 2); ctx.fill(); // caixa de ferramentas
      ctx.fillStyle = '#ccc'; ctx.fillRect(x + w / 2 - 8, y + 14, 14, 2); ctx.fillRect(x + w / 2 + 10, y + 10, 2, 9);
      break;
    }
    case 'drill': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 6, y + 30, w - 12, h - 32, C.metalDark, C.metalDeep, 6);
      ctx.fillStyle = C.metal; ctx.fillRect(cx - 3, y + 10, 6, 30);
      ctx.fillStyle = C.green; roundRect(ctx, cx - 14, y + 4, 28, 18, 5); ctx.fill();
      ctx.fillStyle = '#333'; ctx.fillRect(cx - 1, y + 22, 2, 8);
      break;
    }
    case 'compressor': {
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = C.red; roundRect(ctx, x + 4, y + 10, w - 8, h - 18, 14); ctx.fill(); ink(ctx);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; roundRect(ctx, x + 8, y + 13, w - 16, 6, 3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, y + 30, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.stroke();
      break;
    }
    case 'cnc': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 2, w - 4, h - 4, '#d9dee6', '#8792a3', 14);
      ctx.fillStyle = 'rgba(80,170,230,0.45)'; roundRect(ctx, x + 10, y + 10, w - 46, h - 34, 4); ctx.fill();
      ctx.fillStyle = C.black; roundRect(ctx, x + w - 30, y + 10, 22, 26, 3); ctx.fill();
      ctx.fillStyle = '#29d07a'; ctx.fillRect(x + w - 27, y + 13, 16, 9);
      label(ctx, 'CNC', x + w - 19, y + 30, '#bbb', 7);
      break;
    }
    case 'cabinet': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 1, y + 1, w - 2, h - 1, '#c7ced8', '#8a95a6', 8);
      const cols = 8;
      for (let i = 0; i < cols; i++) {
        ctx.fillStyle = ['#e85d5d', '#4b86d6', '#f2c230', '#3fae5e'][i % 4];
        ctx.fillRect(x + 6 + i * ((w - 12) / cols), y + 5, (w - 12) / cols - 3, 8);
      }
      break;
    }
    case 'epanel': case 'powerpanel': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 1, w - 4, h - 1, '#b9c2cf', '#6d788a', 8);
      ctx.fillStyle = '#20252e'; roundRect(ctx, x + 6, y + 4, w - 12, 11, 2); ctx.fill();
      for (let i = 0; i < 6; i++) { ctx.fillStyle = ['#e85d5d', '#4b86d6', '#f2c230', '#3fae5e', '#fff', '#e8823a'][i]; ctx.beginPath(); ctx.arc(x + 12 + i * ((w - 24) / 5), y + 9.5, 2.2, 0, Math.PI * 2); ctx.fill(); }
      if (f.type === 'powerpanel') { ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.moveTo(cx - 3, y + 17); ctx.lineTo(cx + 3, y + 17); ctx.lineTo(cx, y + 23); ctx.fill(); }
      break;
    }
    case 'cablepanel': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 2, w - 6, h - 4, '#b9c2cf', '#6d788a', 4);
      ['#e85d5d', '#4b86d6', '#f2c230', '#3fae5e'].forEach((c, i) => {
        ctx.strokeStyle = c; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x + 6, y + 14 + i * 18); ctx.bezierCurveTo(x + 22, y + 20 + i * 18, x + 20, y + 30 + i * 14, x + 8, y + 40 + i * 12); ctx.stroke();
      });
      break;
    }
    case 'ebench': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 4, w - 4, h - 6, '#dfe6ee', '#8c97a8', 10);
      ctx.fillStyle = C.black; roundRect(ctx, x + 10, y + 7, 30, 20, 3); ctx.fill(); // osciloscópio
      ctx.fillStyle = '#0d2a1a'; ctx.fillRect(x + 13, y + 10, 24, 13);
      ctx.fillStyle = '#f5f5f5'; roundRect(ctx, x + 50, y + 10, 40, 16, 2); ctx.fill(); // protoboard
      ctx.fillStyle = '#c33'; ctx.fillRect(x + 54, y + 13, 8, 2); ctx.fillStyle = '#36c'; ctx.fillRect(x + 66, y + 19, 10, 2);
      ctx.fillStyle = C.yellow; roundRect(ctx, x + w - 36, y + 8, 14, 20, 3); ctx.fill(); // multímetro
      ctx.fillStyle = '#9dcfa0'; ctx.fillRect(x + w - 34, y + 11, 10, 6);
      ctx.fillStyle = '#555'; ctx.fillRect(x + w - 18, y + 12, 8, 12);
      break;
    }
    case 'robot': {
      ctx.fillStyle = 'rgba(242,194,48,0.18)'; ctx.beginPath(); ctx.arc(cx, cy, w / 2 + 4, 0, Math.PI * 2); ctx.fill();
      ctx.setLineDash([6, 6]); ctx.strokeStyle = C.yellow; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, w / 2 + 4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.metalDeep; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill(); ink(ctx);
      ctx.fillStyle = '#ef8a1f'; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'conveyor': {
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = C.metalDark; roundRect(ctx, x, y + 2, w, h - 4, 4); ctx.fill(); ink(ctx);
      ctx.fillStyle = '#2a2f38'; ctx.fillRect(x + 4, y + 6, w - 8, h - 12);
      break;
    }
    case 'clp': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 1, w - 4, h - 1, '#d4dae3', '#7d889a', 8);
      ctx.fillStyle = C.black; roundRect(ctx, x + 8, y + 4, 34, 13, 2); ctx.fill();
      label(ctx, 'CLP', x + w - 20, y + 10, C.blue, 9);
      break;
    }
    case 'printer3d': {
      shadow(ctx, x, y, w, h);
      ctx.strokeStyle = C.metalDeep; ctx.lineWidth = 4; roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 3); ctx.stroke();
      ctx.fillStyle = '#2b2f36'; ctx.fillRect(x + 10, y + h - 22, w - 20, 10);
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(x + w / 2 - 6, y + h - 26, 12, 4);
      break;
    }
    case 'wsdesk': case 'librarydesk': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 4, w - 4, h - 6, f.type === 'wsdesk' ? '#e2e7ee' : C.wood, f.type === 'wsdesk' ? '#8c97a8' : C.woodDark, 8);
      monitor(ctx, x + 14, y + 8, 22); if (f.type === 'wsdesk') monitor(ctx, x + 44, y + 8, 22);
      if (f.type === 'librarydesk') { ['#c33', '#36c', '#3a3'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x + w - 30, y + 6 + i * 4, 18, 3.5); }); }
      if (f.type === 'wsdesk') chair(ctx, x + 40, y + h + 4);
      break;
    }
    case 'transformer': {
      ctx.fillStyle = 'rgba(242,194,48,0.12)'; ctx.fillRect(x - 10, y - 6, w + 20, h + 18);
      ctx.strokeStyle = C.yellow; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.strokeRect(x - 8, y - 4, w + 16, h + 14); ctx.setLineDash([]);
      shadow(ctx, x, y, w, h);
      box(ctx, x + 6, y + 6, w - 12, h - 10, '#7c8794', '#4b5563', 16);
      ctx.fillStyle = '#5b6573';
      for (let i = 0; i < 9; i++) ctx.fillRect(x + 14 + i * 15, y + 12, 6, h - 40);
      ctx.fillStyle = '#c9cdd3';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + 40 + i * 40, y + 10, 6, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.moveTo(cx, y + h - 28); ctx.lineTo(cx + 12, y + h - 8); ctx.lineTo(cx - 12, y + h - 8); ctx.closePath(); ctx.fill();
      label(ctx, '⚡', cx, y + h - 14, '#111', 11);
      break;
    }
    case 'hvcabinet': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 1, w - 4, h - 1, '#c3c9d2', '#717c8d', 8);
      hazardStripes(ctx, x + 6, y + 4, w - 12, 6, 5);
      label(ctx, 'ALTA TENSÃO', cx, y + 16, C.red, 7);
      break;
    }
    case 'console': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 2, w - 4, h - 4, '#3b4456', '#262c38', 14);
      ctx.fillStyle = '#0c1f33'; roundRect(ctx, x + 10, y + 7, w - 20, 22, 3); ctx.fill();
      break;
    }
    case 'chamber': {
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = 'rgba(130,210,240,0.28)'; roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 6); ctx.fill();
      ctx.strokeStyle = '#8fa3b8'; ctx.lineWidth = 5; roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 6); ctx.stroke();
      ctx.fillStyle = C.metalDark; ctx.fillRect(cx - 26, cy - 10, 52, 24);
      ctx.fillStyle = '#ff7043'; ctx.beginPath(); ctx.arc(cx, cy + 2, 7, 0, Math.PI * 2); ctx.fill();
      label(ctx, 'CÂMARA DE TESTES', cx, y + 16, '#dff3ff', 8);
      break;
    }
    case 'generator': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 4, y + 6, w - 8, h - 10, '#3e9b5c', '#256b3c', 14);
      ctx.fillStyle = '#2a2f38'; ctx.fillRect(x + 14, y + 14, w - 50, 30);
      ctx.fillStyle = C.metal; ctx.beginPath(); ctx.arc(x + w - 24, y + 26, 10, 0, Math.PI * 2); ctx.fill();
      hazardStripes(ctx, x + 6, y + h - 12, w - 12, 5, 5);
      break;
    }
    case 'shelf': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 1, y + 1, w - 2, h - 1, '#6e7a8c', '#465061', 9);
      const colors = ['#c98b4a', '#2c5d9e', '#d9483b', '#3fae5e', '#f2c230', '#9a6fd6'];
      for (let i = 0; i < f.w * 2; i++) {
        ctx.fillStyle = colors[(i * 7 + f.y) % colors.length];
        roundRect(ctx, x + 5 + i * 15.5, y + 3, 12, 12, 2); ctx.fill();
      }
      break;
    }
    case 'crates': {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        const bx = x + 2 + i * 31, by = y + 2 + j * 31;
        shadow(ctx, bx, by, 28, 28);
        box(ctx, bx, by, 28, 28, '#c69a63', '#8b6537', 6, 2);
        ctx.strokeStyle = '#8b6537'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx + 3, by + 3); ctx.lineTo(bx + 25, by + 19); ctx.stroke();
      }
      break;
    }
    case 'pallet': {
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = '#b08850'; for (let i = 0; i < 5; i++) ctx.fillRect(x + 2, y + 4 + i * 12, w - 4, 7);
      box(ctx, x + 10, y + 10, w - 20, h - 22, '#d7b27a', '#9b7744', 8);
      label(ctx, 'FRÁGIL', cx, cy - 3, '#7a3b1d', 7);
      break;
    }
    case 'teacherdesk': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 3, w - 4, h - 4, C.wood, C.woodDark, 8);
      ctx.fillStyle = '#2b2f36'; roundRect(ctx, x + 12, y + 6, 22, 13, 2); ctx.fill();
      ctx.fillStyle = '#9cc8ff'; ctx.fillRect(x + 14, y + 8, 18, 8);
      ctx.fillStyle = '#fff'; ctx.save(); ctx.translate(x + w - 30, y + 12); ctx.rotate(0.2); ctx.fillRect(-8, -6, 16, 12); ctx.restore();
      chair(ctx, cx, y - 4, '#1e3a6b');
      break;
    }
    case 'projector': {
      ctx.fillStyle = '#ddd'; roundRect(ctx, x + 6, y + 8, 20, 14, 3); ctx.fill(); ink(ctx, 1.6);
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(x + 22, y + 15, 4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'studentdesk': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 3, y + 3, w - 6, h - 4, '#d8b88c', '#9a7a52', 7);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 12, y + 6, 12, 9);
      ctx.fillStyle = '#4b86d6'; ctx.fillRect(x + 30, y + 8, 14, 2);
      chair(ctx, cx, y + h + 8, '#2c5d9e');
      break;
    }
    case 'emergencytable': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(cx + 3, cy + 6, w / 2, h / 2 - 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5c4632'; ctx.beginPath(); ctx.ellipse(cx, cy + 4, w / 2 - 2, h / 2 - 6, 0, 0, Math.PI * 2); ctx.fill(); ink(ctx);
      ctx.fillStyle = '#8a6a4a'; ctx.beginPath(); ctx.ellipse(cx, cy, w / 2 - 2, h / 2 - 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c8ccd2'; ctx.beginPath(); ctx.ellipse(cx, cy, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'roundtable': {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(cx + dx * 24, cy + dy * 22, 6, 0, Math.PI * 2); ctx.fill(); ink(ctx, 1.6);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(cx + 3, cy + 5, 19, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8e2d4'; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill(); ink(ctx);
      ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(cx - 5, cy - 3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d9483b'; ctx.fillRect(cx + 2, cy, 6, 8);
      break;
    }
    case 'cantinacounter': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 1, y + 2, w - 2, h - 2, '#e9edf2', '#b03a2e', 9);
      ctx.fillStyle = 'rgba(180,220,255,0.6)'; ctx.fillRect(x + 6, y + 4, w - 12, 10);
      for (let i = 0; i < 9; i++) { ctx.fillStyle = '#d98b2b'; ctx.beginPath(); ctx.moveTo(x + 14 + i * 19, y + 13); ctx.lineTo(x + 19 + i * 19, y + 5); ctx.lineTo(x + 24 + i * 19, y + 13); ctx.fill(); }
      label(ctx, 'CANTINA', cx, y - 10, '#fff', 9);
      break;
    }
    case 'vending': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 1, w - 4, h - 1, '#d9483b', '#8f2a20', 8);
      ctx.fillStyle = '#ffe9a8'; ctx.fillRect(x + 6, y + 4, w - 22, 11);
      ctx.fillStyle = '#222'; ctx.fillRect(x + w - 14, y + 5, 8, 9);
      break;
    }
    case 'recyclebins': {
      ['#2c6fd6', '#d9483b', '#f2c230'].forEach((c, i) => {
        const bx = x + 4 + i * 31;
        shadow(ctx, bx, y + 2, 26, 26);
        box(ctx, bx, y + 2, 26, 28, c, 'rgba(0,0,0,0.35)', 8);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(bx + 4, y + 6, 18, 3);
      });
      break;
    }
    case 'planter': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(cx + 2, cy + 5, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a5a36'; ctx.beginPath(); ctx.arc(cx, cy + 3, 11, 0, Math.PI * 2); ctx.fill(); ink(ctx);
      ['#2f8f4e', '#3fae5e', '#5cc77a'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx - 4 + i * 4, cy - 3 - (i % 2) * 4, 9 - i * 2, 0, Math.PI * 2); ctx.fill(); });
      break;
    }
    case 'serverrack': {
      shadow(ctx, x, y, w, h);
      for (let i = 0; i < f.w; i++) box(ctx, x + 2 + i * T, y + 1, T - 4, h - 1, '#262b34', '#15181e', 8, 2);
      break;
    }
    case 'printer': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 6, y + 3, w - 12, h - 4, '#e5e8ec', '#9aa3b0', 8);
      ctx.fillStyle = '#3a3f48'; ctx.fillRect(x + 12, y + 6, w - 24, 4);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 16, y + 10, w - 32, 6);
      break;
    }
    case 'pcdesk': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 3, w - 4, h - 4, '#e2e7ee', '#8c97a8', 8);
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = '#2b2f36'; ctx.fillRect(x + 14 + i * 56, y + 17, 26, 4);
        chair(ctx, x + 27 + i * 56, y + h + 6, '#22354f');
      }
      break;
    }
    case 'boiler': {
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = '#7e8a99'; roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 26); ctx.fill(); ink(ctx);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; roundRect(ctx, x + 12, y + 10, w - 24, 10, 5); ctx.fill();
      ctx.strokeStyle = '#b5652f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + 6, y + h - 20); ctx.lineTo(x - 10, y + h - 20); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.stroke();
      break;
    }
    case 'barrels': {
      for (const [dx, dy] of [[16, 16], [46, 22], [24, 46]]) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(x + dx + 2, y + dy + 4, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2c6fd6'; ctx.beginPath(); ctx.arc(x + dx, y + dy, 12, 0, Math.PI * 2); ctx.fill(); ink(ctx);
        ctx.strokeStyle = '#1b4a96'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + dx, y + dy, 8, 0, Math.PI * 2); ctx.stroke();
      }
      break;
    }
    case 'bookshelf': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 1, y + 1, w - 2, h - 1, C.woodDark, '#5a3a20', 9);
      const colors = ['#c0392b', '#2c5d9e', '#27ae60', '#f39c12', '#8e44ad', '#16a085', '#ecf0f1'];
      let bx = x + 4, i = f.x * 3 + f.y;
      while (bx < x + w - 6) { const bw = 3 + ((i * 7) % 4); ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(bx, y + 3, bw, 15); bx += bw + 1; i++; }
      break;
    }
    case 'coffee': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 2, w - 4, h - 2, C.wood, C.woodDark, 7);
      ctx.fillStyle = '#2b2f36'; roundRect(ctx, x + 8, y + 3, 20, 16, 3); ctx.fill();
      ctx.fillStyle = '#d9483b'; ctx.beginPath(); ctx.arc(x + 14, y + 8, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 38, y + 8, 6, 7); ctx.fillRect(x + 48, y + 9, 6, 7);
      break;
    }
    case 'meetingtable': {
      for (let i = 0; i < 4; i++) { chair(ctx, x + 22 + i * 60, y - 6, '#1e3a6b'); chair(ctx, x + 22 + i * 60, y + h + 4, '#1e3a6b'); }
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 4, w - 4, h - 6, '#9c6b3f', '#6e4626', 10);
      ['#fff', '#fff', '#ffe08a'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x + 30 + i * 70, y + 20, 22, 16); });
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + w - 40, y + 40, 5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'sofa': {
      const horiz = f.w > f.h;
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = '#2c5d9e'; roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 8); ctx.fill();
      ctx.fillStyle = '#3f78c4';
      if (horiz) for (let i = 0; i < 3; i++) roundRect(ctx, x + 8 + i * ((w - 16) / 3), y + 12, (w - 16) / 3 - 4, h - 20, 5), ctx.fill();
      else for (let i = 0; i < 3; i++) roundRect(ctx, x + 8, y + 8 + i * ((h - 16) / 3), w - 14, (h - 16) / 3 - 4, 5), ctx.fill();
      break;
    }
    case 'lockers': {
      for (let i = 0; i < f.w * 2; i++) {
        box(ctx, x + 1 + i * 16, y + 1, 15, h - 1, ['#4b86d6', '#2c5d9e'][i % 2], '#1d3f70', 9, 1);
        ctx.fillStyle = '#d0d6de'; ctx.fillRect(x + 12 + i * 16, y + 6, 2, 5);
      }
      break;
    }
    case 'monitordesk': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 1, y + 2, w - 2, h - 4, '#3b4456', '#262c38', 6);
      break;
    }
    case 'reception': {
      shadow(ctx, x, y, w, h);
      box(ctx, x, y + 2, w, h - 2, '#f3f5f8', C.blue, 12, 6);
      monitor(ctx, x + 40, y + 2, 22); monitor(ctx, x + w - 70, y + 2, 22);
      ctx.fillStyle = '#c9a227'; ctx.beginPath(); ctx.arc(cx, y + 10, 4, 0, Math.PI * 2); ctx.fill();
      label(ctx, 'RECEPÇÃO', cx, y + h - 5, '#fff', 8);
      break;
    }
    case 'turnstile': {
      for (let i = 0; i <= f.w; i += 2) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + i * T - 4, y + 10, 10, 18);
        ctx.fillStyle = '#b8c0cc'; roundRect(ctx, x + i * T - 5, y + 6, 10, 20, 3); ctx.fill();
        ctx.fillStyle = '#3fae5e'; ctx.fillRect(x + i * T - 2, y + 9, 4, 3);
        if (i < f.w) { ctx.fillStyle = '#d0d6de'; ctx.fillRect(x + i * T + 5, y + 14, 20, 3); }
      }
      break;
    }
    case 'trophy': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 2, w - 4, h - 2, 'rgba(200,230,255,0.55)', '#6e4626', 8);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = '#e6b422'; ctx.beginPath(); ctx.moveTo(x + 14 + i * 22, y + 16); ctx.lineTo(x + 20 + i * 22, y + 16); ctx.lineTo(x + 22 + i * 22, y + 5); ctx.lineTo(x + 12 + i * 22, y + 5); ctx.fill(); }
      break;
    }
    case 'readtable': {
      for (let i = 0; i < 3; i++) { chair(ctx, x + 22 + i * 40, y - 6, '#6e4626'); chair(ctx, x + 22 + i * 40, y + h + 4, '#6e4626'); }
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 4, w - 4, h - 6, C.wood, C.woodDark, 9);
      ctx.fillStyle = '#3fae5e'; ctx.beginPath(); ctx.arc(x + 20, y + 18, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 50, y + 14, 18, 12); ctx.fillStyle = '#c0392b'; ctx.fillRect(x + 80, y + 16, 16, 10);
      break;
    }
    case 'bed': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 3, y + 2, w - 6, h - 4, '#e9eef4', '#9aa6b5', 8, 5);
      ctx.fillStyle = '#ffffff'; roundRect(ctx, x + 8, y + 6, w - 16, 14, 5); ctx.fill(); ink(ctx, 1.6);
      ctx.fillStyle = '#7ec8e3'; roundRect(ctx, x + 5, y + 26, w - 10, h - 38, 4); ctx.fill(); ink(ctx, 1.6);
      break;
    }
    case 'scanner': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(cx + 2, cy + 5, w / 2 - 6, h / 2 - 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7e8a99'; ctx.beginPath(); ctx.ellipse(cx, cy + 2, w / 2 - 6, h / 2 - 9, 0, 0, Math.PI * 2); ctx.fill(); ink(ctx);
      ctx.fillStyle = '#b8c3cf'; ctx.beginPath(); ctx.ellipse(cx, cy, w / 2 - 12, h / 2 - 15, 0, 0, Math.PI * 2); ctx.fill(); ink(ctx, 1.6);
      ctx.strokeStyle = '#3fdc9a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, w / 2 - 20, h / 2 - 22, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#2b3445'; roundRect(ctx, cx - 8, y + h - 14, 16, 8, 2); ctx.fill(); ink(ctx, 1.4);
      break;
    }
    case 'medcabinet': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 1, w - 4, h - 1, '#f4f7fb', '#b4bfcc', 8);
      ctx.fillStyle = '#e04b4b'; ctx.fillRect(cx - 2, y + 4, 4, 11); ctx.fillRect(cx - 5.5, y + 7.5, 11, 4);
      break;
    }
    case 'admindesk': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 3, w - 4, h - 4, '#3b4456', '#262c38', 12);
      ctx.fillStyle = '#0f2a44'; roundRect(ctx, x + 8, y + 7, w - 16, h - 26, 4); ctx.fill(); ink(ctx, 1.6);
      ctx.strokeStyle = 'rgba(120,200,255,0.55)'; ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) ctx.strokeRect(x + 12 + i * ((w - 28) / 4), y + 11, (w - 36) / 4, h - 34);
      label(ctx, 'ADMIN', cx, y + h - 9, '#9fd4ff', 8);
      break;
    }
    case 'dockdoor': {
      box(ctx, x + 2, y, w - 4, h, '#c9ced6', '#8792a3', 6, 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
      for (let i = 4; i < h - 6; i += 4) { ctx.beginPath(); ctx.moveTo(x + 4, y + i); ctx.lineTo(x + w - 4, y + i); ctx.stroke(); }
      hazardStripes(ctx, x + 2, y + h - 6, w - 4, 4, 4);
      break;
    }
    case 'forklift': {
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = '#2b2f36'; for (const [wx, wy] of [[x + 8, y + h - 8], [x + w - 8, y + h - 8], [x + 8, y + 12], [x + w - 8, y + 12]]) { ctx.beginPath(); ctx.arc(wx, wy, 6, 0, Math.PI * 2); ctx.fill(); ink(ctx, 1.6); }
      box(ctx, x + 6, y + 6, w - 12, h - 14, '#f2b230', '#c48614', 10, 6);
      ctx.fillStyle = '#2b3445'; roundRect(ctx, x + 14, y + 12, w - 28, 16, 3); ctx.fill(); ink(ctx, 1.6);
      ctx.fillStyle = '#8792a3'; ctx.fillRect(x + 10, y - 4, 4, 14); ctx.fillRect(x + w - 14, y - 4, 4, 14);
      break;
    }
    case 'palletrack': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 1, y, w - 2, h, '#e0702b', '#9c4a16', 10, 2);
      for (let i = 0; i < f.w; i++) {
        const bx = x + 4 + i * T;
        ctx.fillStyle = (i + f.y) % 3 ? '#c69a63' : '#d7b27a'; roundRect(ctx, bx, y + 2, T - 8, 14, 2); ctx.fill(); ink(ctx, 1.2);
      }
      break;
    }
    case 'scale': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 4, y + 6, w - 8, h - 10, '#9aa5b5', '#566174', 8);
      ctx.fillStyle = '#123049'; roundRect(ctx, x + 10, y + 10, 24, 10, 2); ctx.fill();
      label(ctx, '25.0 kg', x + 22, y + 15, '#6dffa8', 7);
      break;
    }
    case 'carbody': {
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = '#20232b'; for (const wx of [x + 26, x + w - 26]) { roundRect(ctx, wx - 9, y + 2, 18, 8, 3); ctx.fill(); roundRect(ctx, wx - 9, y + h - 10, 18, 8, 3); ctx.fill(); }
      ctx.fillStyle = f.x % 2 ? '#d93b3b' : '#2f6fde';
      roundRect(ctx, x + 6, y + 8, w - 12, h - 16, 18); ctx.fill(); ink(ctx);
      ctx.fillStyle = 'rgba(170,220,255,0.8)'; roundRect(ctx, x + w * 0.32, y + 14, w * 0.36, h - 28, 8); ctx.fill(); ink(ctx, 1.6);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; roundRect(ctx, x + 14, y + 12, w * 0.16, 5, 2); ctx.fill();
      break;
    }
    case 'engine': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 4, y + 4, w - 8, h - 8, '#7e8a99', '#4b5563', 12, 6);
      ctx.fillStyle = '#c0392b'; roundRect(ctx, x + 12, y + 10, w - 24, 18, 4); ctx.fill(); ink(ctx, 1.6);
      ctx.fillStyle = '#2b2f36'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + 20 + i * 15, y + 19, 4, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'paintbooth': {
      shadow(ctx, x, y, w, h);
      ctx.fillStyle = 'rgba(255,200,230,0.25)'; roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 8); ctx.fill();
      ctx.strokeStyle = '#8fa3b8'; ctx.lineWidth = 6; roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 8); ctx.stroke();
      roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 10); ink(ctx);
      ctx.fillStyle = '#f2c230'; roundRect(ctx, cx - 40, cy - 16, 80, 32, 12); ctx.fill(); ink(ctx, 1.6);
      ctx.fillStyle = 'rgba(255,120,190,0.5)'; ctx.beginPath(); ctx.arc(cx + 24, cy - 18, 14, 0, Math.PI * 2); ctx.fill();
      label(ctx, 'CABINE DE PINTURA', cx, y + 16, '#ffe0f0', 8);
      break;
    }
    case 'bench': {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 8, w - 4, h - 12, C.wood, C.woodDark, 5, 3);
      break;
    }
    case 'cones': {
      for (let i = 0; i < f.w * 2; i++) {
        const px = x + 10 + i * 16, py = y + 20;
        ctx.fillStyle = '#ef7d1a'; ctx.beginPath(); ctx.moveTo(px, py - 14); ctx.lineTo(px + 7, py + 4); ctx.lineTo(px - 7, py + 4); ctx.closePath(); ctx.fill(); ink(ctx, 1.6);
        ctx.fillStyle = '#fff'; ctx.fillRect(px - 3.5, py - 5, 7, 3);
      }
      break;
    }
    default: {
      shadow(ctx, x, y, w, h);
      box(ctx, x + 2, y + 2, w - 4, h - 4, C.metal, C.metalDark);
    }
  }
}

// Partes animadas (desenhadas a cada quadro somente se estiverem na tela).
export function drawAnimated(ctx, f, t, opts) {
  const x = f.x * T, y = f.y * T, w = f.w * T, h = f.h * T;
  const cx = x + w / 2, cy = y + h / 2;
  const down = opts.machinesDown;
  const blink = (rate, phase = 0) => Math.sin(t * rate + phase) > 0;
  switch (f.type) {
    case 'robot': {
      const a1 = down ? 0.6 : Math.sin(t * 0.9 + f.x) * 1.4;
      const a2 = down ? 0.9 : Math.sin(t * 1.7 + f.x) * 1.1;
      const l1 = 26, l2 = 20;
      const ex = cx + Math.cos(a1) * l1, ey = cy + Math.sin(a1) * l1 * 0.8;
      const hx = ex + Math.cos(a1 + a2) * l2, hy = ey + Math.sin(a1 + a2) * l2 * 0.8;
      ctx.lineCap = 'round';
      ctx.strokeStyle = INK; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = '#ef8a1f'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#f5a54a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = '#3a4252'; ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#566174'; ctx.fillRect(hx - 5, hy - 2, 10, 4);
      ctx.lineCap = 'butt';
      break;
    }
    case 'conveyor': {
      const off = down ? 0 : (t * 40) % 16;
      ctx.save(); ctx.beginPath(); ctx.rect(x + 4, y + 6, w - 8, h - 12); ctx.clip();
      ctx.fillStyle = '#3d444f';
      for (let i = -16; i < w; i += 16) ctx.fillRect(x + 4 + i + off, y + 6, 6, h - 12);
      const bx = (down ? 30 : (t * 40) % (w + 40)) - 20;
      ctx.fillStyle = '#c69a63'; roundRect(ctx, x + bx, y + 8, 16, h - 16, 2); ctx.fill();
      ctx.fillStyle = '#9aa5b5'; ctx.beginPath(); ctx.arc(x + ((bx + 90) % (w + 40)) - 20, cy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }
    case 'printer3d': {
      const px = down ? 0 : Math.sin(t * 2.3 + f.x) * (w / 2 - 16);
      ctx.fillStyle = '#566174'; ctx.fillRect(x + 8, y + 18, w - 16, 3);
      ctx.fillStyle = '#ff8a3d'; roundRect(ctx, cx + px - 5, y + 14, 10, 10, 2); ctx.fill();
      break;
    }
    case 'lathe': {
      ctx.save(); ctx.translate(x + 17, y + h / 2 - 2); ctx.rotate(down ? 0 : t * 12);
      ctx.fillStyle = '#c9ced6'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a4252'; for (let i = 0; i < 3; i++) { ctx.rotate((Math.PI * 2) / 3); ctx.fillRect(2, -1.5, 7, 3); }
      ctx.restore();
      break;
    }
    case 'cnc': case 'generator': case 'transformer': case 'boiler': {
      if (down) {
        if (blink(6)) { ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(x + w - 10, y + 8, 5, 0, Math.PI * 2); ctx.fill(); }
        if (Math.random() < 0.15) { ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (Math.random() - 0.5) * 30, cy - Math.random() * 25); ctx.stroke(); }
      } else {
        ctx.fillStyle = blink(3, f.x) ? '#3fdc7a' : '#1f7a43'; ctx.beginPath(); ctx.arc(x + w - 10, y + 8, 3.5, 0, Math.PI * 2); ctx.fill();
        if (f.type === 'boiler') {
          const a = Math.sin(t * 1.3) * 0.6 - 0.6;
          ctx.strokeStyle = '#d9483b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8); ctx.stroke();
        }
      }
      break;
    }
    case 'ebench': {
      ctx.strokeStyle = down ? '#335' : '#43f58a'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i <= 24; i++) ctx.lineTo(x + 13 + i, y + 16.5 + Math.sin(i * 0.6 + t * 6) * 4);
      ctx.stroke();
      break;
    }
    case 'serverrack': {
      for (let i = 0; i < f.w; i++) for (let j = 0; j < 4; j++) {
        const on = opts.gpsOff ? blink(10, i + j) : blink(4 + j, i * 1.7 + j);
        ctx.fillStyle = opts.gpsOff ? (on ? '#ff3b30' : '#401010') : on ? '#39e07a' : '#155a2f';
        ctx.fillRect(x + 8 + i * T + j * 5, y + 8, 3, 3);
        ctx.fillStyle = blink(2.3, i + j * 2) ? '#4bb4ff' : '#123049';
        ctx.fillRect(x + 8 + i * T + j * 5, y + 14, 3, 2);
      }
      break;
    }
    case 'pcdesk': case 'wsdesk': case 'librarydesk': {
      if (f.type === 'pcdesk') for (let i = 0; i < 2; i++) {
        const hue = ((f.x * 13 + f.y * 7 + i * 50) % 360);
        ctx.fillStyle = '#1d222b'; roundRect(ctx, x + 12 + i * 56, y + 3, 30, 13, 1.5); ctx.fill();
        ctx.fillStyle = `hsl(${hue}, 60%, ${42 + Math.sin(t * 2 + i + f.x) * 6}%)`;
        ctx.fillRect(x + 14 + i * 56, y + 5, 26, 9);
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x + 16 + i * 56, y + 7, 10 + ((t * 8 + f.x) % 12), 1.5);
      }
      break;
    }
    case 'console': {
      ctx.fillStyle = opts.critical ? (blink(8) ? '#ff3b30' : '#5a0d0d') : '#0e3c63';
      ctx.fillRect(x + 12, y + 9, w - 24, 18);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = blink(3 + i, i) ? ['#39e07a', '#f2c230', '#4bb4ff', '#ff6b6b', '#fff'][i] : '#2a2f38';
        ctx.beginPath(); ctx.arc(x + 14 + i * ((w - 28) / 4), y + h - 14, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      if (!opts.critical) {
        ctx.strokeStyle = '#4bd6ff'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i <= w - 28; i += 2) ctx.lineTo(x + 14 + i, y + 18 + Math.sin(i * 0.3 + t * 3) * 4);
        ctx.stroke();
      }
      break;
    }
    case 'clp': {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = down ? (blink(8, i) ? '#ff3b30' : '#401010') : blink(2 + i, i) ? '#39e07a' : '#14361f';
        ctx.fillRect(x + 11 + i * 7, y + 7, 4, 4);
      }
      break;
    }
    case 'monitordesk': {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#111'; ctx.fillRect(x + 4, y + 8 + i * 28, w - 8, 20);
        ctx.fillStyle = `rgba(150,200,170,${0.35 + Math.random() * 0.2})`; ctx.fillRect(x + 6, y + 10 + i * 28, w - 12, 16);
      }
      break;
    }
    case 'emergencytable': {
      const pulse = 0.5 + Math.sin(t * 4) * 0.5;
      ctx.fillStyle = `rgba(255,60,60,${0.25 + pulse * 0.25})`; ctx.beginPath(); ctx.arc(cx, cy - 2, 14 + pulse * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b81d1d'; ctx.beginPath(); ctx.ellipse(cx, cy + 1, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff4b4b'; ctx.beginPath(); ctx.ellipse(cx, cy - 2, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(cx - 3, cy - 4, 4, 2, -0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'vending': {
      ctx.fillStyle = `rgba(255,240,180,${0.15 + Math.sin(t * 3) * 0.05})`; ctx.fillRect(x + 4, y + 2, w - 18, 15);
      break;
    }
    default: break;
  }
}

export const ANIMATED_TYPES = new Set(['robot', 'conveyor', 'printer3d', 'lathe', 'cnc', 'generator', 'transformer', 'boiler', 'ebench', 'serverrack', 'pcdesk', 'console', 'clp', 'monitordesk', 'emergencytable', 'vending']);

export { hazardStripes, label };
