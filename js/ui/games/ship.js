// Missões de ação (no espírito do gênero): crachá, dados, lixo, sucata, escudos, combustível,
// energia, reator, válvulas, amostra, filtro e mira.
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const INK = '#15171f';

function canvasLoop(cv, draw) {
  let raf, last = performance.now();
  const frame = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; draw(dt); raf = requestAnimationFrame(frame); };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

function canvasPoint(cv, e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
}

// ---------- Passar o crachá: arraste pelo leitor na velocidade certa ----------
export function card(root, api) {
  root.innerHTML = `<div class="swipe"><div class="reader"><div class="reader-led"></div><span class="reader-msg">PASSE O CRACHÁ</span></div>
    <div class="slot"><div class="badge" tabindex="0"><b>CRACHÁ</b><i></i><small>ALUNO · MAT. ${String(Math.floor(10000 + Math.random() * 89999))}</small></div></div></div>`;
  const slot = root.querySelector('.slot');
  const badge = root.querySelector('.badge');
  const msg = root.querySelector('.reader-msg');
  const led = root.querySelector('.reader-led');
  let drag = null, done = false;
  const maxX = () => slot.clientWidth - badge.offsetWidth - 8;
  const setX = (x) => { badge.style.transform = `translateX(${Math.max(0, Math.min(maxX(), x))}px)`; };
  badge.addEventListener('pointerdown', (e) => {
    if (done) return;
    drag = { startX: e.clientX, t0: performance.now(), max: 0 };
    badge.setPointerCapture(e.pointerId);
    msg.textContent = 'LENDO...'; led.className = 'reader-led';
  });
  badge.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    drag.max = Math.max(drag.max, dx);
    setX(dx);
  });
  badge.addEventListener('pointerup', () => {
    if (!drag) return;
    const dt = (performance.now() - drag.t0) / 1000;
    const full = drag.max >= maxX() - 6;
    drag = null;
    if (!full) { msg.textContent = 'PASSE ATÉ O FIM'; led.className = 'reader-led bad'; api.fail('O crachá precisa passar pelo leitor inteiro.'); }
    else if (dt < 0.45) { msg.textContent = 'MUITO RÁPIDO'; led.className = 'reader-led bad'; api.fail('Rápido demais. Passe mais devagar.'); }
    else if (dt > 1.3) { msg.textContent = 'MUITO DEVAGAR'; led.className = 'reader-led bad'; api.fail('Devagar demais. Passe com mais firmeza.'); }
    else { done = true; msg.textContent = 'ACEITO'; led.className = 'reader-led ok'; api.complete(); return; }
    setTimeout(() => { if (!done) setX(0); }, 250);
  });
  api.setStatus('Arraste o crachá da esquerda para a direita, sem pressa e sem demora.');
}

// ---------- Baixar / enviar dados ----------
export function upload(root, api) {
  const up = api.variant === 'upload';
  root.innerHTML = `<div class="transfer"><div class="folders"><div class="folder">${up ? 'MEU PC' : 'TERMINAL'}</div><div class="files"></div><div class="folder ${up ? 'cloud' : ''}">${up ? 'SERVIDOR' : 'MEU PC'}</div></div>
    <div class="bar"><i></i></div><p class="eta"></p><button class="btn primary big">${up ? 'Enviar' : 'Baixar'}</button></div>`;
  const bar = root.querySelector('.bar i');
  const eta = root.querySelector('.eta');
  const files = root.querySelector('.files');
  const btn = root.querySelector('button');
  const dur = up ? 7 : 6;
  let t = 0, timer = null;
  btn.addEventListener('click', () => {
    btn.disabled = true; btn.textContent = up ? 'Enviando...' : 'Baixando...';
    timer = setInterval(() => {
      t += 0.1;
      const k = Math.min(1, t / dur);
      bar.style.width = `${k * 100}%`;
      eta.textContent = `Tempo restante: ${Math.max(0, Math.ceil(dur - t))}s`;
      if (Math.random() < 0.3) {
        const f = el('span', 'flying-file', '▤');
        files.appendChild(f);
        setTimeout(() => f.remove(), 900);
      }
      api.setStatus(`${Math.round(k * 100)}% — não feche a janela`);
      if (t >= dur) {
        clearInterval(timer); timer = null;
        if (!up) api.setStatus('Download concluído! Agora envie os dados no servidor.', 'ok');
        api.complete();
      }
    }, 100);
  });
  api.setStatus(up ? 'Envie os dados que você baixou.' : 'Baixe os dados para levar até o servidor.');
  return () => timer && clearInterval(timer);
}

// ---------- Esvaziar o lixo: segure a alavanca ----------
export function trash(root, api) {
  root.innerHTML = `<div class="chute"><canvas width="300" height="230"></canvas><div class="lever"><div class="knob">PUXE</div></div></div>`;
  const cv = root.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const knob = root.querySelector('.knob');
  const items = Array.from({ length: 22 }, (_, i) => ({ x: 80 + Math.random() * 140, y: 30 + Math.random() * 130, r: 9 + Math.random() * 9, c: ['#7fa35a', '#c79a63', '#9aa5b5', '#e0702b', '#d9d2b8'][i % 5], vy: 0 }));
  let pulling = false, finished = false;
  const stop = canvasLoop(cv, (dt) => {
    ctx.fillStyle = '#2b3240'; ctx.fillRect(0, 0, 300, 230);
    ctx.fillStyle = '#3c4659'; ctx.fillRect(60, 10, 180, 190);
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.strokeRect(60, 10, 180, 190);
    ctx.fillStyle = pulling ? '#111' : '#566174'; ctx.fillRect(60, 196, 180, 12); ctx.strokeRect(60, 196, 180, 12);
    let left = 0;
    for (const it of items) {
      if (pulling) { it.vy += 600 * dt; it.y += it.vy * dt; }
      if (it.y < 240) left++;
      ctx.fillStyle = it.c; ctx.beginPath(); ctx.arc(it.x, Math.min(it.y, 186 - it.r + (pulling ? 60 : 0)), it.r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    }
    if (pulling) api.setStatus(`Esvaziando... ${Math.round((1 - left / items.length) * 100)}%`);
    if (!left && !finished) { finished = true; api.complete(); }
  });
  const on = (e) => { e.preventDefault(); pulling = true; knob.classList.add('down'); };
  const off = () => { pulling = false; knob.classList.remove('down'); for (const it of items) it.vy = 0; };
  knob.addEventListener('pointerdown', on);
  window.addEventListener('pointerup', off);
  api.setStatus('Segure a alavanca para baixo até o lixo cair todo.');
  return () => { stop(); window.removeEventListener('pointerup', off); };
}

// ---------- Destruir a sucata: tiro ao alvo ----------
export function debris(root, api) {
  root.innerHTML = `<div class="turret"><canvas width="360" height="260"></canvas></div>`;
  const cv = root.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const need = 12;
  let hits = 0, finished = false, aim = { x: 180, y: 130 }, flash = 0;
  const rocks = [];
  const spawn = () => rocks.push({ x: 380, y: 30 + Math.random() * 200, vx: -(60 + Math.random() * 70), vy: (Math.random() - 0.5) * 40, r: 12 + Math.random() * 10, a: 0, boom: 0 });
  for (let i = 0; i < 4; i++) { spawn(); rocks[i].x = 120 + i * 70; }
  cv._targets = rocks; // usado pelos testes automatizados
  let spawnT = 0;
  const stop = canvasLoop(cv, (dt) => {
    spawnT -= dt;
    if (spawnT <= 0 && rocks.length < 7) { spawn(); spawnT = 0.7; }
    ctx.fillStyle = '#0b1a14'; ctx.fillRect(0, 0, 360, 260);
    ctx.strokeStyle = 'rgba(80,255,170,0.15)'; ctx.lineWidth = 1;
    for (let x = 0; x < 360; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 260); ctx.stroke(); }
    for (let y = 0; y < 260; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(360, y); ctx.stroke(); }
    for (let i = rocks.length - 1; i >= 0; i--) {
      const r = rocks[i];
      if (r.boom) { r.boom += dt; ctx.strokeStyle = `rgba(255,220,100,${1 - r.boom * 3})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, r.r + r.boom * 60, 0, Math.PI * 2); ctx.stroke(); if (r.boom > 0.33) rocks.splice(i, 1); continue; }
      r.x += r.vx * dt; r.y += r.vy * dt; r.a += dt * 2;
      if (r.x < -30) { rocks.splice(i, 1); continue; }
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.a);
      ctx.fillStyle = '#8a95a7'; ctx.beginPath();
      for (let k = 0; k < 7; k++) { const ang = (k / 7) * Math.PI * 2; const rr = r.r * (0.75 + ((k * 37) % 10) / 30); ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); }
      ctx.closePath(); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.restore();
    }
    if (flash > 0) { flash -= dt; ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(180, 260); ctx.lineTo(aim.x, aim.y); ctx.stroke(); }
    ctx.strokeStyle = '#4bff9a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(aim.x, aim.y, 14, 0, Math.PI * 2); ctx.moveTo(aim.x - 22, aim.y); ctx.lineTo(aim.x + 22, aim.y); ctx.moveTo(aim.x, aim.y - 22); ctx.lineTo(aim.x, aim.y + 22); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '800 14px Nunito, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`Destruídos: ${hits}/${need}`, 10, 22);
  });
  cv.addEventListener('pointermove', (e) => { aim = canvasPoint(cv, e); });
  cv.addEventListener('pointerdown', (e) => {
    if (finished) return;
    aim = canvasPoint(cv, e); flash = 0.08; api.audio.tone(900, 0.05, { type: 'square', vol: 0.06 });
    const target = rocks.find((r) => !r.boom && Math.hypot(r.x - aim.x, r.y - aim.y) < r.r + 6);
    if (target) {
      target.boom = 0.01; hits++; api.audio.progress();
      api.setStatus(`Sucata destruída: ${hits}/${need}`);
      if (hits >= need) { finished = true; api.complete(); }
    }
  });
  api.setStatus(`Clique na sucata para destruí-la antes que entre na máquina (${need}).`);
  return stop;
}

// ---------- Ativar escudos: deixe todos os hexágonos brancos ----------
export function shields(root, api) {
  root.innerHTML = `<div class="shields"><div class="hexes"></div></div>`;
  const box = root.querySelector('.hexes');
  const state = Array.from({ length: 7 }, () => Math.random() < 0.55);
  if (state.every((v) => !v)) state[3] = true;
  state.forEach((red, i) => {
    const b = el('button', `hex h${i} ${red ? 'red' : ''}`);
    b.setAttribute('aria-label', `Escudo ${i + 1}`);
    b.addEventListener('click', () => {
      state[i] = !state[i];
      b.classList.toggle('red', state[i]);
      api.audio.click();
      const left = state.filter(Boolean).length;
      api.setStatus(left ? `Escudos desligados: ${left}` : 'Todos os escudos ativos!', left ? '' : 'ok');
      if (!left) { box.classList.add('on'); api.complete(); }
    });
    box.appendChild(b);
  });
  api.setStatus(`Escudos desligados: ${state.filter(Boolean).length}. Clique nos vermelhos.`);
}

// ---------- Combustível: segure para encher o galão / o tanque ----------
export function fuel(root, api) {
  const put = api.variant === 'fuel_put';
  root.innerHTML = `<div class="fuel"><div class="tank"><i></i><b>${put ? 'GERADOR' : 'GALÃO'}</b></div><button class="btn primary big hold-fuel">Segure para ${put ? 'abastecer' : 'encher'}</button></div>`;
  const fill = root.querySelector('.tank i');
  const btn = root.querySelector('.hold-fuel');
  let level = 0, pressing = false, finished = false;
  const timer = setInterval(() => {
    if (pressing && !finished) {
      level = Math.min(1, level + 0.1 / 3);
      fill.style.height = `${level * 100}%`;
      api.setStatus(`${put ? 'Abastecendo' : 'Enchendo'}... ${Math.round(level * 100)}%`);
      if (level >= 1) { finished = true; if (!put) api.setStatus('Galão cheio! Leve o combustível até o gerador.', 'ok'); api.complete(); }
    }
  }, 100);
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); pressing = true; btn.classList.add('active'); });
  const off = () => { pressing = false; btn.classList.remove('active'); };
  window.addEventListener('pointerup', off);
  api.setStatus(put ? 'Segure o botão até encher o tanque do gerador.' : 'Segure o botão até encher o galão de combustível.');
  return () => { clearInterval(timer); window.removeEventListener('pointerup', off); };
}

// ---------- Desviar energia: suba a chave indicada ----------
export function divert(root, api) {
  const names = ['Oficina', 'Lab. Eletr.', 'Automação', 'Lab. Técn.', 'Pátio', 'Info', 'Enferm.', 'Entrada'];
  const target = Math.floor(Math.random() * names.length);
  root.innerHTML = `<div class="divert"><p>Suba só a chave piscando: <b>${names[target]}</b></p><div class="sliders">${names.map((n, i) => `<div class="sl ${i === target ? 'target' : ''}"><div class="track"><div class="handle" data-i="${i}"></div></div><small>${n}</small></div>`).join('')}</div></div>`;
  const handle = root.querySelector(`.handle[data-i="${target}"]`);
  const track = handle.parentElement;
  let drag = null, done = false;
  root.querySelectorAll('.handle').forEach((h) => { if (h !== handle) h.addEventListener('pointerdown', () => api.fail('Essa chave está travada. Use a que pisca.')); });
  handle.addEventListener('pointerdown', (e) => { if (done) return; drag = { y0: e.clientY }; handle.setPointerCapture(e.pointerId); });
  handle.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const max = track.clientHeight - handle.offsetHeight;
    const up = Math.max(0, Math.min(max, drag.y0 - e.clientY));
    handle.style.transform = `translateY(${-up}px)`;
    if (up >= max - 2 && !done) { done = true; drag = null; track.classList.add('done'); api.complete(); }
  });
  handle.addEventListener('pointerup', () => { if (!done) handle.style.transform = ''; drag = null; });
  api.setStatus('Arraste a chave piscando até o topo.');
}

// ---------- Aceitar energia ----------
export function accept(root, api) {
  root.innerHTML = `<div class="accept"><div class="power-in"><span></span><span></span><span></span></div><button class="btn go big">Aceitar energia</button></div>`;
  root.querySelector('button').addEventListener('click', (e) => { e.target.disabled = true; root.querySelector('.power-in').classList.add('on'); api.complete(); });
  api.setStatus('A energia desviada chegou. Aceite para ligar o setor.');
}

// ---------- Ligar o reator: repita a sequência de luzes ----------
export function simon(root, api) {
  root.innerHTML = `<div class="simon"><div class="pads"></div><div class="rounds"><i></i><i></i><i></i><i></i><i></i></div></div>`;
  const padsBox = root.querySelector('.pads');
  const roundsEl = root.querySelectorAll('.rounds i');
  const pads = Array.from({ length: 9 }, (_, i) => { const b = el('button', 'pad'); b.dataset.i = i; padsBox.appendChild(b); return b; });
  const seq = Array.from({ length: 5 }, () => Math.floor(Math.random() * 9));
  padsBox._seq = seq; // usado pelos testes automatizados
  let round = 1, input = 0, showing = false, timers = [];
  const flash = (i, ms = 380) => { pads[i].classList.add('lit'); api.audio.tone(300 + i * 60, 0.15, { type: 'triangle', vol: 0.12 }); timers.push(setTimeout(() => pads[i].classList.remove('lit'), ms)); };
  const show = () => {
    showing = true; input = 0;
    api.setStatus(`Observe a sequência (etapa ${round}/5)...`);
    for (let k = 0; k < round; k++) timers.push(setTimeout(() => flash(seq[k]), 500 + k * 520));
    timers.push(setTimeout(() => { showing = false; api.setStatus(`Sua vez: repita ${round} luz(es).`); }, 500 + round * 520));
  };
  pads.forEach((p) => p.addEventListener('click', () => {
    if (showing || round > 5) return;
    const i = Number(p.dataset.i);
    flash(i, 200);
    if (i !== seq[input]) { api.fail('Sequência errada! Recomeçando do início.'); round = 1; roundsEl.forEach((r) => r.classList.remove('on')); timers.push(setTimeout(show, 700)); return; }
    input++;
    if (input === round) {
      roundsEl[round - 1].classList.add('on');
      round++;
      if (round > 5) { api.complete(); return; }
      timers.push(setTimeout(show, 600));
    }
  }));
  show();
  return () => timers.forEach(clearTimeout);
}

// ---------- Destravar válvulas: clique de 1 a 10 ----------
export function manifold(root, api) {
  root.innerHTML = `<div class="manifold"><div class="valves"></div></div>`;
  const box = root.querySelector('.valves');
  let next = 1;
  for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])) {
    const b = el('button', 'valve', String(n));
    b.addEventListener('click', () => {
      if (b.classList.contains('on')) return;
      if (n === next) {
        b.classList.add('on'); next++; api.audio.progress();
        api.setStatus(`${next - 1}/10 destravadas`);
        if (next > 10) api.complete();
      } else {
        api.fail('Fora de ordem! Recomeçando.');
        next = 1; box.querySelectorAll('.valve').forEach((v) => v.classList.remove('on'));
      }
    });
    box.appendChild(b);
  }
  api.setStatus(api.variant === 'servers' ? 'Reinicie os servidores na ordem, de 1 a 10.' : 'Clique nos números em ordem, de 1 a 10.');
}

// ---------- Analisar amostra: inicia, espera e depois escolhe o tubo alterado ----------
export function sample(root, api) {
  if (api.phase === 0) {
    root.innerHTML = `<div class="sample"><div class="tubes">${'<i></i>'.repeat(5)}</div><p>A análise leva <b>30 segundos</b>. Pode sair e fazer outra coisa enquanto isso.</p><button class="btn primary big">Iniciar análise</button></div>`;
    root.querySelector('button').addEventListener('click', (e) => {
      e.target.disabled = true;
      root.querySelectorAll('.tubes i').forEach((t, i) => setTimeout(() => t.classList.add('filled'), i * 120));
      setTimeout(() => { api.setStatus('Análise iniciada! Volte daqui a 30 s.', 'ok'); api.complete(); }, 800);
    });
    api.setStatus('Coloque as amostras e inicie a análise.');
    return null;
  }
  const bad = Math.floor(Math.random() * 5);
  root.innerHTML = `<div class="sample"><p>Análise pronta. Clique no tubo <b>com resultado alterado</b>.</p><div class="tubes pick">${Array.from({ length: 5 }, (_, i) => `<button class="tube ${i === bad ? 'bad' : ''}" data-i="${i}"></button>`).join('')}</div></div>`;
  root.querySelectorAll('.tube').forEach((t) => t.addEventListener('click', () => {
    if (Number(t.dataset.i) === bad) api.complete();
    else api.fail('Esse tubo está normal. Procure o de cor diferente.');
  }));
  api.setStatus('Escolha a amostra alterada.');
  return null;
}

// ---------- Limpar o filtro: arraste a sujeira para a sucção ----------
export function filter(root, api) {
  root.innerHTML = `<div class="filterbox"><canvas width="360" height="240"></canvas></div>`;
  const cv = root.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const dirt = Array.from({ length: 7 }, (_, i) => ({ x: 130 + Math.random() * 200, y: 30 + Math.random() * 180, r: 13 + Math.random() * 7, a: Math.random() * 6, c: i % 2 ? '#8b7a52' : '#6f8a4a', gone: false }));
  let drag = null, finished = false;
  cv._targets = dirt; // usado pelos testes automatizados
  const stop = canvasLoop(cv, (dt) => {
    ctx.fillStyle = '#c8d2dd'; ctx.fillRect(0, 0, 360, 240);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
    for (let i = 0; i < 360; i += 12) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 240); ctx.stroke(); }
    ctx.fillStyle = '#2b3240'; ctx.fillRect(0, 60, 54, 120); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.strokeRect(0, 60, 54, 120);
    ctx.fillStyle = '#111'; for (let j = 0; j < 5; j++) ctx.fillRect(10, 72 + j * 21, 34, 9);
    let left = 0;
    for (const d of dirt) {
      if (d.gone) continue;
      left++;
      if (d !== drag) { d.a += dt; d.x += Math.sin(d.a * 2) * 0.2; }
      ctx.fillStyle = d.c; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.7, d.a, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      if (d.x < 54 && d.y > 60 && d.y < 180) { d.gone = true; drag = null; api.audio.tone(200, 0.15, { type: 'sawtooth', vol: 0.08, slide: -120 }); }
    }
    if (!left && !finished) { finished = true; api.complete(); }
    else if (!finished) api.setStatus(`Sujeira restante: ${left}. Arraste até a sucção à esquerda.`);
  });
  cv.addEventListener('pointerdown', (e) => {
    const p = canvasPoint(cv, e);
    drag = dirt.find((d) => !d.gone && Math.hypot(d.x - p.x, d.y - p.y) < d.r + 8) || null;
    if (drag) cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => { if (!drag) return; const p = canvasPoint(cv, e); drag.x = p.x; drag.y = p.y; });
  cv.addEventListener('pointerup', () => { drag = null; });
  return stop;
}

// ---------- Centralizar a mira ----------
export function steering(root, api) {
  root.innerHTML = `<div class="steer"><canvas width="300" height="300"></canvas></div>`;
  const cv = root.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const pos = { x: 40 + Math.random() * 60 + (Math.random() < 0.5 ? 0 : 160), y: 40 + Math.random() * 220 };
  let drag = false, hold = 0, finished = false;
  cv._targets = [pos]; // usado pelos testes automatizados
  const stop = canvasLoop(cv, (dt) => {
    ctx.fillStyle = '#10233a'; ctx.fillRect(0, 0, 300, 300);
    ctx.strokeStyle = 'rgba(140,200,255,0.25)'; ctx.lineWidth = 1.5;
    for (const r of [40, 80, 120]) { ctx.beginPath(); ctx.arc(150, 150, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(150, 10); ctx.lineTo(150, 290); ctx.moveTo(10, 150); ctx.lineTo(290, 150); ctx.stroke();
    const inside = Math.hypot(pos.x - 150, pos.y - 150) < 10;
    ctx.fillStyle = inside ? 'rgba(75,224,138,0.35)' : 'rgba(255,214,64,0.15)';
    ctx.beginPath(); ctx.arc(150, 150, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = inside ? '#4be08a' : '#ffd640'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2); ctx.moveTo(pos.x - 26, pos.y); ctx.lineTo(pos.x + 26, pos.y); ctx.moveTo(pos.x, pos.y - 26); ctx.lineTo(pos.x, pos.y + 26); ctx.stroke();
    if (inside && !drag && !finished) { hold += dt; if (hold > 0.4) { finished = true; api.complete(); } } else hold = 0;
  });
  cv.addEventListener('pointerdown', (e) => { const p = canvasPoint(cv, e); if (Math.hypot(p.x - pos.x, p.y - pos.y) < 34) { drag = true; cv.setPointerCapture(e.pointerId); } });
  cv.addEventListener('pointermove', (e) => { if (!drag) return; const p = canvasPoint(cv, e); pos.x = Math.max(10, Math.min(290, p.x)); pos.y = Math.max(10, Math.min(290, p.y)); });
  cv.addEventListener('pointerup', () => { drag = false; });
  api.setStatus('Arraste a mira até o centro e solte.');
  return stop;
}
