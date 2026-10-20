// Minijogos curtos: escâner médico, disjuntores e botão de estabilização.

// Exame médico no escâner (tarefa visual): basta ficar parado até o fim da leitura.
export function scan(root, api) {
  const data = [
    ['Altura', `${(1.55 + Math.random() * 0.35).toFixed(2)} m`],
    ['Peso', `${Math.round(50 + Math.random() * 35)} kg`],
    ['Tipo sanguíneo', ['A+', 'A-', 'B+', 'O+', 'O-', 'AB+'][Math.floor(Math.random() * 6)]],
    ['Pressão', `${11 + Math.floor(Math.random() * 3)}x${7 + Math.floor(Math.random() * 2)}`],
    ['Visão', '20/20'],
    ['Resultado', 'APTO para as aulas práticas'],
  ];
  root.innerHTML = `<div class="scanner"><div class="scan-body"><div class="scan-figure"></div><div class="scan-line"></div></div><ul class="scan-data"></ul><div class="bar"><i></i></div></div>`;
  const list = root.querySelector('.scan-data');
  const bar = root.querySelector('.bar i');
  const dur = 8;
  let t = 0;
  const timer = setInterval(() => {
    t += 0.1;
    bar.style.width = `${Math.min(100, (t / dur) * 100)}%`;
    const shown = Math.min(data.length, Math.floor((t / dur) * (data.length + 0.5)));
    while (list.children.length < shown) {
      const [k, v] = data[list.children.length];
      const li = document.createElement('li');
      li.innerHTML = `<span>${k}</span><b>${v}</b>`;
      list.appendChild(li);
      api.audio.progress();
    }
    api.setStatus(`Escaneando... ${Math.min(100, Math.round((t / dur) * 100))}% — fique parado na plataforma`);
    if (t >= dur) { clearInterval(timer); api.complete(); }
  }, 100);
  return () => clearInterval(timer);
}

export function switches(root, api) {
  const n = 6;
  let state;
  do { state = Array.from({ length: n }, () => Math.random() < 0.4); } while (state.every(Boolean));
  root.innerHTML = `<div class="breakers"><div class="breaker-row"></div><p>Quadro geral — circuitos de iluminação</p></div>`;
  const row = root.querySelector('.breaker-row');
  state.forEach((on, i) => {
    const b = document.createElement('button');
    b.className = `breaker ${on ? 'on' : ''}`;
    b.innerHTML = `<i></i><small>C${i + 1}</small>`;
    b.addEventListener('click', () => {
      state[i] = !state[i]; b.classList.toggle('on', state[i]); api.audio.click();
      const count = state.filter(Boolean).length;
      api.setStatus(`${count}/${n} circuitos ligados`);
      if (count === n) api.complete();
    });
    row.appendChild(b);
  });
  api.setStatus(`${state.filter(Boolean).length}/${n} circuitos ligados`);
}

export function hold(root, api) {
  const need = 2.5;
  root.innerHTML = `<div class="holder"><div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="bg"/><circle cx="60" cy="60" r="52" class="fg"/></svg>
    <button class="hold-btn">SEGURE</button></div><p>Mantenha pressionado (mouse, toque ou Espaço) para estabilizar a subestação.</p></div>`;
  const fg = root.querySelector('.fg');
  const btn = root.querySelector('.hold-btn');
  const C = 2 * Math.PI * 52;
  fg.style.strokeDasharray = C; fg.style.strokeDashoffset = C;
  let t = 0, pressing = false, last = performance.now(), raf, finished = false;
  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (pressing && !finished) t += dt; else if (!finished) t = Math.max(0, t - dt * 2);
    fg.style.strokeDashoffset = C * (1 - Math.min(1, t / need));
    if (!finished) api.setStatus(pressing ? `Estabilizando... ${Math.round((t / need) * 100)}%` : 'Pressione e segure');
    if (t >= need && !finished) { finished = true; api.complete(); }
    raf = requestAnimationFrame(frame);
  };
  const on = (e) => { e.preventDefault(); pressing = true; btn.classList.add('active'); };
  const off = () => { pressing = false; btn.classList.remove('active'); };
  btn.addEventListener('pointerdown', on);
  window.addEventListener('pointerup', off);
  const kd = (e) => { if (e.code === 'Space') { e.preventDefault(); pressing = true; btn.classList.add('active'); } };
  const ku = (e) => { if (e.code === 'Space') off(); };
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); window.removeEventListener('pointerup', off); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
}
