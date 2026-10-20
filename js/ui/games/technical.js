// Minijogos técnicos: cabos, circuito, ferramentas, braço robótico e medidor.
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

// ---------- Conectar cabos ----------
export function wires(root, api) {
  const colors = [['#e74c3c', 'Fase'], ['#3498db', 'Neutro'], ['#f1c40f', 'Retorno'], ['#2ecc71', 'Terra']];
  const right = shuffle(colors.map((c, i) => i));
  root.innerHTML = '';
  const box = el('div', 'wires');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('wires-svg');
  box.appendChild(svg);
  const L = el('div', 'wires-col left'), R = el('div', 'wires-col right');
  colors.forEach(([c, n], i) => {
    const t = el('div', 'wire-term', `<span class="plug" style="background:${c}"></span><small>${n}</small>`);
    t.dataset.i = i; L.appendChild(t);
  });
  right.forEach((i) => {
    const t = el('div', 'wire-term', `<small>${colors[i][1]}</small><span class="plug" style="background:${colors[i][0]}"></span>`);
    t.dataset.i = i; R.appendChild(t);
  });
  box.append(L, R);
  root.appendChild(box);
  const connected = new Set();
  let drag = null;

  const center = (node) => {
    const b = box.getBoundingClientRect(), r = node.querySelector('.plug').getBoundingClientRect();
    return [r.left + r.width / 2 - b.left, r.top + r.height / 2 - b.top];
  };
  const line = (x1, y1, x2, y2, c) => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const mx = (x1 + x2) / 2;
    p.setAttribute('d', `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
    p.setAttribute('stroke', c); p.setAttribute('stroke-width', '9'); p.setAttribute('fill', 'none'); p.setAttribute('stroke-linecap', 'round');
    svg.appendChild(p); return p;
  };
  const down = (e) => {
    const t = e.target.closest('.wires-col.left .wire-term');
    if (!t || connected.has(+t.dataset.i)) return;
    const [x, y] = center(t);
    drag = { i: +t.dataset.i, x, y, path: line(x, y, x, y, colors[+t.dataset.i][0]) };
    box.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!drag) return;
    const b = box.getBoundingClientRect();
    const x2 = e.clientX - b.left, y2 = e.clientY - b.top, mx = (drag.x + x2) / 2;
    drag.path.setAttribute('d', `M${drag.x},${drag.y} C${mx},${drag.y} ${mx},${y2} ${x2},${y2}`);
  };
  const up = (e) => {
    if (!drag) return;
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.wires-col.right .wire-term');
    if (target && +target.dataset.i === drag.i) {
      const [x2, y2] = center(target); const mx = (drag.x + x2) / 2;
      drag.path.setAttribute('d', `M${drag.x},${drag.y} C${mx},${drag.y} ${mx},${y2} ${x2},${y2}`);
      connected.add(drag.i);
      L.children[drag.i].classList.add('done'); target.classList.add('done');
      api.audio.progress();
      api.setStatus(`${connected.size}/4 cabos conectados`);
      if (connected.size === 4) api.complete();
    } else {
      drag.path.remove();
      if (target) api.fail('Cor errada! Siga o padrão de cores do painel.');
    }
    drag = null;
  };
  box.addEventListener('pointerdown', down);
  box.addEventListener('pointermove', move);
  box.addEventListener('pointerup', up);
  api.setStatus('0/4 cabos conectados');
}

// ---------- Circuito com peças giratórias ----------
export function circuit(root, api) {
  const N = 4;
  // Direções: 0 cima, 1 direita, 2 baixo, 3 esquerda
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  let path;
  for (let tries = 0; tries < 200 && !path; tries++) {
    const startRow = Math.floor(Math.random() * N);
    const seen = new Set([`0,${startRow}`]);
    const p = [[0, startRow]];
    let ok = false;
    while (p.length < 40) {
      const [x, y] = p[p.length - 1];
      if (x === N - 1 && p.length >= 5) { ok = true; break; }
      const opts = shuffle([1, 0, 2, 1]).filter((d) => {
        const nx = x + DX[d], ny = y + DY[d];
        return nx >= 0 && ny >= 0 && nx < N && ny < N && !seen.has(`${nx},${ny}`);
      });
      if (!opts.length) break;
      const d = opts[0];
      p.push([x + DX[d], y + DY[d]]); seen.add(`${x + DX[d]},${y + DY[d]}`);
    }
    if (ok) path = p;
  }
  const grid = Array.from({ length: N }, () => Array(N).fill(null));
  path.forEach(([x, y], i) => {
    const prev = i === 0 ? [x - 1, y] : path[i - 1];
    const next = i === path.length - 1 ? [x + 1, y] : path[i + 1];
    const dIn = [0, 1, 2, 3].find((d) => x + DX[d] === prev[0] && y + DY[d] === prev[1]);
    const dOut = [0, 1, 2, 3].find((d) => x + DX[d] === next[0] && y + DY[d] === next[1]);
    const straight = (dIn + 2) % 4 === dOut;
    grid[y][x] = { kind: straight ? 'straight' : 'corner', rot: 0, solution: [dIn, dOut] };
  });
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!grid[y][x]) grid[y][x] = { kind: Math.random() < 0.5 ? 'straight' : 'corner', rot: 0 };
  const conns = (c) => {
    const base = c.kind === 'straight' ? [1, 3] : [0, 1];
    return base.map((d) => (d + c.rot) % 4);
  };
  for (const row of grid) for (const c of row) c.rot = Math.floor(Math.random() * 4);
  const startRow = path[0][1];
  const endRow = path[path.length - 1][1];

  root.innerHTML = '';
  const wrap = el('div', 'circuit');
  const bat = el('div', 'circ-end bat', '🔋'); bat.style.gridRow = `${startRow + 1}`;
  const led = el('div', 'circ-end led', '💡'); led.style.gridRow = `${endRow + 1}`;
  const board = el('div', 'circ-board');
  const cells = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const c = el('button', 'circ-cell');
    c.dataset.x = x; c.dataset.y = y;
    board.appendChild(c); cells.push(c);
  }
  const left = el('div', 'circ-side'); left.appendChild(bat);
  const right = el('div', 'circ-side'); right.appendChild(led);
  wrap.append(left, board, right);
  root.appendChild(wrap);

  const trace = () => {
    const lit = new Set();
    let x = 0, y = startRow, from = 3;
    for (let s = 0; s < 40; s++) {
      if (x < 0 || y < 0 || x >= N || y >= N) break;
      const cs = conns(grid[y][x]);
      if (!cs.includes(from)) break;
      lit.add(`${x},${y}`);
      const out = cs.find((d) => d !== from);
      if (x === N - 1 && y === endRow && out === 1) return { lit, ok: true };
      x += DX[out]; y += DY[out]; from = (out + 2) % 4;
    }
    return { lit, ok: false };
  };
  const draw = () => {
    const { lit, ok } = trace();
    cells.forEach((c) => {
      const cell = grid[+c.dataset.y][+c.dataset.x];
      const on = lit.has(`${c.dataset.x},${c.dataset.y}`);
      c.className = `circ-cell ${on ? 'on' : ''}`;
      c.innerHTML = `<span class="pipe ${cell.kind}" style="transform:rotate(${cell.rot * 90}deg)"></span>`;
    });
    led.classList.toggle('lit', ok);
    return ok;
  };
  if (draw()) { grid[0][0].rot = (grid[0][0].rot + 1) % 4; draw(); }
  board.addEventListener('click', (e) => {
    const c = e.target.closest('.circ-cell');
    if (!c || led.classList.contains('lit')) return;
    const cell = grid[+c.dataset.y][+c.dataset.x];
    cell.rot = (cell.rot + 1) % 4;
    api.audio.click();
    if (draw()) { api.setStatus('Circuito fechado! O LED acendeu.', 'ok'); api.complete(); }
  });
  api.setStatus('Gire as peças para fechar o circuito.');
}

// ---------- Organizar ferramentas ----------
export function tools(root, api) {
  const items = shuffle([['🔧', 'Chave inglesa'], ['🔨', 'Martelo'], ['🪛', 'Chave de fenda'], ['📏', 'Régua de aço'], ['🪚', 'Serrote'], ['✂️', 'Tesoura de chapa']]).slice(0, 5);
  root.innerHTML = '';
  const board = el('div', 'pegboard');
  const bench = el('div', 'bench');
  for (const [ico, name] of shuffle(items)) {
    const s = el('button', 'peg-slot', `<span>${ico}</span><small>${name}</small>`);
    s.dataset.name = name; board.appendChild(s);
  }
  items.forEach(([ico, name]) => {
    const t = el('button', 'tool', ico);
    t.title = name; t.dataset.name = name;
    t.style.transform = `rotate(${Math.round(Math.random() * 60 - 30)}deg)`;
    bench.appendChild(t);
  });
  root.append(board, el('div', 'bench-label', 'Bancada'), bench);
  let selected = null, placed = 0;
  bench.addEventListener('click', (e) => {
    const t = e.target.closest('.tool');
    if (!t || t.classList.contains('used')) return;
    bench.querySelectorAll('.tool').forEach((x) => x.classList.remove('sel'));
    selected = t; t.classList.add('sel'); api.audio.click();
    api.setStatus(`Selecionado: ${t.title}. Agora clique no contorno certo.`);
  });
  board.addEventListener('click', (e) => {
    const s = e.target.closest('.peg-slot');
    if (!s || !selected || s.classList.contains('filled')) return;
    if (s.dataset.name === selected.dataset.name) {
      s.classList.add('filled'); selected.classList.add('used'); selected.classList.remove('sel');
      selected = null; placed++;
      api.audio.progress();
      api.setStatus(`${placed}/${items.length} ferramentas no lugar`);
      if (placed === items.length) api.complete();
    } else api.fail('Esse contorno é de outra ferramenta!');
  });
  api.setStatus(`0/${items.length} ferramentas no lugar`);
}

// ---------- Calibrar braço robótico ----------
export function robot(root, api) {
  const target = [Math.round(20 + Math.random() * 120), Math.round(-110 + Math.random() * 100)];
  root.innerHTML = `
    <div class="robot">
      <canvas width="360" height="220"></canvas>
      <label>Eixo 1 (base) <input type="range" min="0" max="180" value="${target[0] > 90 ? 15 : 165}"><b></b></label>
      <label>Eixo 2 (cotovelo) <input type="range" min="-150" max="30" value="${target[1] > -40 ? -140 : 20}"><b></b></label>
    </div>`;
  const cv = root.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const [r1, r2] = root.querySelectorAll('input');
  const [b1, b2] = root.querySelectorAll('b');
  let hold = 0, raf, last = performance.now(), finished = false;
  const arm = (a1, a2, color, width, alpha) => {
    const bx = 180, by = 200, l1 = 95, l2 = 75;
    const t1 = (-a1 * Math.PI) / 180, t2 = t1 + (-a2 * Math.PI) / 180;
    const ex = bx + Math.cos(t1) * l1, ey = by + Math.sin(t1) * l1;
    const hx = ex + Math.cos(t2) * l2, hy = ey + Math.sin(t2) * l2;
    ctx.globalAlpha = alpha; ctx.lineCap = 'round';
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = '#2a3140'; ctx.beginPath(); ctx.arc(ex, ey, width / 2 + 2, 0, Math.PI * 2); ctx.arc(hx, hy, width / 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  };
  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const a1 = +r1.value, a2 = +r2.value;
    b1.textContent = `${a1}°`; b2.textContent = `${a2}°`;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#1b2433'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#f2c230'; ctx.fillRect(140, 200, 80, 12);
    arm(target[0], target[1], '#7fe0a0', 16, 0.35);
    const ok = Math.abs(a1 - target[0]) <= 4 && Math.abs(a2 - target[1]) <= 4;
    arm(a1, a2, ok ? '#3fdc7a' : '#ef8a1f', 14, 1);
    if (ok && !finished) {
      hold += dt;
      api.setStatus(`Posição correta! Mantendo... ${Math.min(100, Math.round(hold * 100))}%`, 'ok');
      if (hold >= 1) { finished = true; api.complete(); }
    } else if (!finished) { hold = 0; api.setStatus(`Diferença: eixo 1 ${Math.abs(a1 - target[0])}°, eixo 2 ${Math.abs(a2 - target[1])}°`); }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

// ---------- Medidor (parar o ponteiro na faixa verde) ----------
export function gauge(root, api) {
  const labels = {
    oficina_torno: 'Rotação do torno (RPM)', labtec_estabilidade: 'Tensão do gerador (V)', manut_caldeira: 'Pressão da caldeira (bar)',
    doca_esteira: 'Velocidade da esteira (m/min)', camara_temp: 'Temperatura da câmara (°C)', pint_pressao: 'Pressão da pistola (psi)',
    fun_solda: 'Corrente de solda (A)', linha_torque: 'Torque do parafuso (N·m)',
  };
  root.innerHTML = `<div class="gauge"><canvas width="320" height="190"></canvas><div class="gauge-label">${labels[api.variant] || 'Medidor'}</div>
    <div class="gauge-hits"><i></i><i></i><i></i></div><button class="btn primary big">PARAR</button></div>`;
  const cv = root.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const hits = root.querySelectorAll('.gauge-hits i');
  let t = 0, speed = 1.6, score = 0, zone = newZone(0.22), raf, last = performance.now(), locked = 0;
  function newZone(size) { const c = 0.2 + Math.random() * 0.6; return [c - size / 2, c + size / 2]; }
  const val = () => (Math.sin(t * speed) + 1) / 2;
  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (locked > 0) locked -= dt; else t += dt;
    const v = val();
    ctx.clearRect(0, 0, cv.width, cv.height);
    const cx = 160, cy = 170, r = 130;
    const ang = (x) => Math.PI + x * Math.PI;
    ctx.lineWidth = 22;
    ctx.strokeStyle = '#3a4252'; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = '#3fdc7a'; ctx.beginPath(); ctx.arc(cx, cy, r, ang(zone[0]), ang(zone[1])); ctx.stroke();
    ctx.strokeStyle = '#d9483b'; ctx.beginPath(); ctx.arc(cx, cy, r, ang(0.92), 0); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang(v)) * (r - 18), cy + Math.sin(ang(v)) * (r - 18)); ctx.stroke();
    ctx.fillStyle = '#ccd'; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    if (locked > 0 || score >= 3) return;
    const v = val();
    locked = 0.5;
    if (v >= zone[0] && v <= zone[1]) {
      hits[score].classList.add('on'); score++; api.audio.progress();
      if (score >= 3) { api.complete(); return; }
      speed += 0.5; zone = newZone(0.22 - score * 0.04);
      api.setStatus(`Acerto ${score}/3! Fica mais rápido...`, 'ok');
    } else api.fail('Fora da faixa! Tente de novo.');
  };
  root.querySelector('button').addEventListener('click', stop);
  const key = (e) => { if (e.code === 'Space') { e.preventDefault(); stop(); } };
  window.addEventListener('keydown', key);
  raf = requestAnimationFrame(frame);
  api.setStatus('Acertos: 0/3');
  return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', key); };
}
