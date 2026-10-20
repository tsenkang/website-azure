// Teclado numérico (usado para reiniciar o servidor durante a sabotagem de GPS).
export function keypad(root, api) {
  const code = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join('');
  const isReset = api.variant === 'gps' || api.variant === 'machines';
  const cardTitle = isReset ? 'CÓDIGO DE REINICIALIZAÇÃO' : 'CARTEIRINHA DO ALUNO';
  root.innerHTML = `<div class="keypad-wrap">
    <div class="id-card"><b>${cardTitle}</b><span>${isReset ? 'Etiqueta do equipamento' : 'Matrícula'}</span><code>${code}</code></div>
    <div class="keypad"><div class="display">_____</div><div class="keys"></div></div></div>`;
  const display = root.querySelector('.display');
  const keys = root.querySelector('.keys');
  let typed = '';
  const render = () => { display.textContent = (typed + '_____').slice(0, 5); };
  const press = (k) => {
    if (k === 'C') typed = '';
    else if (k === 'OK') {
      if (typed === code) { display.classList.add('ok'); api.complete(); return; }
      api.fail('Código incorreto.'); typed = '';
    } else if (typed.length < 5) typed += k;
    api.audio.click(); render();
  };
  for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK']) {
    const b = document.createElement('button');
    b.className = `key ${k === 'OK' ? 'ok' : k === 'C' ? 'clr' : ''}`; b.textContent = k;
    b.addEventListener('click', () => press(k));
    keys.appendChild(b);
  }
  const onKey = (e) => {
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Enter') press('OK');
    else if (e.key === 'Backspace') { typed = typed.slice(0, -1); render(); }
  };
  window.addEventListener('keydown', onKey);
  api.setStatus('Digite o código de 5 dígitos.');
  return () => window.removeEventListener('keydown', onKey);
}

