// Minijogos curtos: separar itens, aguardar processo, disjuntores e botão de estabilização.
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const SORTS = {
  almox_componentes: {
    bins: [['⚡', 'Eletrônicos'], ['🔩', 'Fixação'], ['🦺', 'EPIs']],
    items: [['Resistor', 0], ['Capacitor', 0], ['LED', 0], ['Transistor', 0], ['Parafuso', 1], ['Porca', 1], ['Arruela', 1], ['Rebite', 1], ['Luvas', 2], ['Óculos', 2], ['Protetor auricular', 2], ['Capacete', 2]],
  },
  automacao_esteira: {
    bins: [['✅', 'Peça aprovada'], ['❌', 'Peça com defeito']],
    items: [['Engrenagem OK', 0], ['Eixo OK', 0], ['Flange OK', 0], ['Bucha OK', 0], ['Engrenagem trincada', 1], ['Eixo empenado', 1], ['Flange com rebarba', 1], ['Bucha amassada', 1]],
  },
  patio_reciclagem: {
    bins: [['🟦', 'Papel'], ['🟥', 'Plástico'], ['🟨', 'Metal']],
    items: [['Folha de prova', 0], ['Caixa de papelão', 0], ['Jornal', 0], ['Garrafa PET', 1], ['Copinho', 1], ['Embalagem de salgadinho', 1], ['Lata de refri', 2], ['Clipe', 2], ['Tampinha', 2]],
  },
};

export function sort(root, api) {
  const def = SORTS[api.variant] || SORTS.almox_componentes;
  const queue = shuffle(def.items).slice(0, 7);
  root.innerHTML = `<div class="sorter"><div class="sort-item"></div><div class="bins"></div></div>`;
  const itemEl = root.querySelector('.sort-item');
  const bins = root.querySelector('.bins');
  let i = 0;
  def.bins.forEach(([ico, name], bi) => {
    const b = document.createElement('button');
    b.className = 'bin'; b.innerHTML = `<span>${ico}</span><small>${name}</small>`;
    b.addEventListener('click', () => {
      if (i >= queue.length) return;
      if (queue[i][1] === bi) {
        i++; api.audio.progress(); b.classList.add('pulse'); setTimeout(() => b.classList.remove('pulse'), 250);
        if (i >= queue.length) { itemEl.textContent = 'Tudo organizado!'; api.complete(); return; }
        show();
      } else api.fail('Caixa errada!');
    });
    bins.appendChild(b);
  });
  const show = () => { itemEl.innerHTML = `<b>${queue[i][0]}</b><small>${i + 1}/${queue.length}</small>`; api.setStatus(`Itens separados: ${i}/${queue.length}`); };
  show();
}

const WAITS = {
  aula_projetor: ['Ligar projetor', 'Aquecendo a lâmpada do projetor...', 6],
  info_upload: ['Enviar arquivo', 'Enviando projeto_final_v7_AGORA_VAI.zip...', 9],
  entrada_impressora: ['Imprimir', 'Imprimindo 40 apostilas de Desenho Técnico...', 7],
};

export function wait(root, api) {
  const [btn, msg, dur] = WAITS[api.variant] || ['Iniciar', 'Processando...', 6];
  root.innerHTML = `<div class="waiter"><div class="wait-icon">⏳</div><p>${msg}</p><div class="bar"><i></i></div><button class="btn primary big">${btn}</button></div>`;
  const bar = root.querySelector('.bar i');
  const button = root.querySelector('button');
  let t = 0, timer = null;
  button.addEventListener('click', () => {
    button.disabled = true; button.textContent = 'Em andamento...';
    root.querySelector('.wait-icon').classList.add('spin');
    timer = setInterval(() => {
      t += 0.1;
      bar.style.width = `${Math.min(100, (t / dur) * 100)}%`;
      api.setStatus(`${Math.min(100, Math.round((t / dur) * 100))}% — não feche a janela`);
      if (t >= dur) { clearInterval(timer); timer = null; api.complete(); }
    }, 100);
  });
  api.setStatus('Clique para iniciar.');
  return () => timer && clearInterval(timer);
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
