// Minijogos de conhecimento e lógica: prova, diagnóstico, portas lógicas, sequência e teclado.
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const BANKS = {
  aula_prova: [
    ['Pela Lei de Ohm, se V = 12 V e R = 4 Ω, a corrente é:', ['3 A', '48 A', '0,33 A', '16 A']],
    ['Qual instrumento mede a corrente elétrica?', ['Amperímetro', 'Voltímetro', 'Paquímetro', 'Ohmímetro']],
    ['O paquímetro é usado principalmente para medir:', ['Dimensões de peças', 'Tensão elétrica', 'Temperatura', 'Rotação']],
    ['Quanto vale 1 kΩ?', ['1000 Ω', '100 Ω', '10 Ω', '1 000 000 Ω']],
    ['Potência elétrica é calculada por:', ['P = V × I', 'P = V ÷ I', 'P = R × I', 'P = V + I']],
    ['Um resistor de faixas marrom, preto e vermelho vale:', ['1 kΩ', '10 Ω', '100 Ω', '10 kΩ']],
    ['Em binário, o número 5 é:', ['101', '110', '011', '111']],
    ['A unidade de frequência é:', ['Hertz (Hz)', 'Watt (W)', 'Ohm (Ω)', 'Joule (J)']],
  ],
  labtec_inspecao: [
    ['A NR-10 trata da segurança em:', ['Instalações e serviços com eletricidade', 'Trabalho em altura', 'Máquinas agrícolas', 'Espaços confinados']],
    ['Antes de intervir em um painel elétrico, deve-se:', ['Desenergizar e bloquear (bloqueio e etiquetagem)', 'Usar luvas de lã', 'Tocar para ver se dá choque', 'Chamar um colega para segurar']],
    ['Qual EPI protege os olhos contra fagulhas?', ['Óculos de proteção', 'Protetor auricular', 'Avental', 'Botina']],
    ['A cor amarela na sinalização de segurança indica:', ['Atenção / cuidado', 'Proibição', 'Equipamento de combate a incêndio', 'Saída de emergência']],
    ['Em caso de choque elétrico em um colega, primeiro:', ['Desligar a fonte de energia', 'Puxar a pessoa com as mãos', 'Jogar água', 'Esperar passar']],
    ['O aterramento serve para:', ['Escoar correntes de fuga com segurança', 'Aumentar a tensão', 'Economizar energia', 'Deixar o fio mais bonito']],
  ],
  log_prova: [
    ['FIFO significa:', ['Primeiro a entrar, primeiro a sair', 'Último a entrar, primeiro a sair', 'Frete incluso', 'Fora do inventário']],
    ['O que é um palete?', ['Estrado para movimentar e armazenar cargas', 'Tipo de caminhão', 'Nota fiscal', 'Etiqueta de preço']],
    ['A nota fiscal acompanha a mercadoria para:', ['Comprovar a operação e o transporte', 'Enfeitar a caixa', 'Proteger do frio', 'Calcular o peso']],
    ['Em uma empilhadeira, a carga deve ser transportada:', ['Baixa e inclinada para trás', 'O mais alto possível', 'Inclinada para frente', 'Sem travar os garfos']],
    ['Código de barras serve para:', ['Identificar produtos rapidamente', 'Pintar a embalagem', 'Medir a temperatura', 'Ligar a esteira']],
  ],
  qc_inspecao: [
    ['O paquímetro mede com precisão de até:', ['0,05 mm (ou menos)', '1 cm', '1 metro', '10 mm']],
    ['Peça fora da tolerância deve ser:', ['Separada e identificada como não conforme', 'Enviada ao cliente', 'Escondida', 'Pintada de novo']],
    ['Um micrômetro é usado para medir:', ['Dimensões muito pequenas', 'Pressão do pneu', 'Velocidade', 'Corrente elétrica']],
    ['PDCA significa:', ['Planejar, Fazer, Checar, Agir', 'Pintar, Desenhar, Cortar, Apertar', 'Peça, Desenho, Cota, Ajuste', 'Produzir, Descartar, Comprar, Armazenar']],
    ['Inspeção por amostragem verifica:', ['Parte do lote para avaliar o todo', 'Todas as peças, uma a uma', 'Só a embalagem', 'Só a cor']],
  ],
  biblio_catalogo: [
    ['Um manual técnico de CLP deve estar na seção de:', ['Automação industrial', 'Literatura', 'Culinária', 'Geografia']],
    ['A sigla CNC significa:', ['Comando Numérico Computadorizado', 'Controle Normal de Corrente', 'Circuito Neutro Comum', 'Central de Normas Corporativas']],
    ['Normas técnicas brasileiras são publicadas pela:', ['ABNT', 'NASA', 'FIFA', 'ONU']],
    ['Um datasheet contém:', ['Especificações técnicas de um componente', 'Notas dos alunos', 'Cardápio da cantina', 'Horários de ônibus']],
    ['IoT significa:', ['Internet das Coisas', 'Índice de Operação Técnica', 'Instalação Ótica Total', 'Interface de Operação de Torno']],
  ],
};

function questionCard(root, q, onAnswer) {
  const [text, options] = q;
  const correct = options[0];
  root.innerHTML = `<div class="quiz"><p class="q">${text}</p><div class="opts"></div></div>`;
  const box = root.querySelector('.opts');
  for (const o of shuffle(options)) {
    const b = document.createElement('button');
    b.className = 'btn opt'; b.textContent = o;
    b.addEventListener('click', () => {
      box.querySelectorAll('button').forEach((x) => { x.disabled = true; if (x.textContent === correct) x.classList.add('right'); });
      if (o !== correct) b.classList.add('wrong');
      setTimeout(() => onAnswer(o === correct), 700);
    });
    box.appendChild(b);
  }
}

// ---------- Prova / inspeção / catálogo ----------
export function quiz(root, api) {
  const bank = shuffle(BANKS[api.variant] || BANKS.aula_prova);
  let idx = 0, score = 0;
  const next = () => {
    if (score >= 3) { api.complete(); return; }
    const q = bank[idx++ % bank.length];
    api.setStatus(`Acertos: ${score}/3`);
    questionCard(root, q, (ok) => {
      if (ok) { score++; api.audio.progress(); } else api.fail('Resposta errada! Vem outra pergunta.');
      next();
    });
  };
  next();
}

// ---------- Diagnóstico de computador ----------
const CASES = [
  ['O computador liga, mas não aparece nada no monitor e ouvem-se bipes longos.', 'Memória RAM'],
  ['O PC desliga sozinho depois de alguns minutos e o gabinete está muito quente.', 'Cooler / ventilação'],
  ['Aparece a mensagem "Nenhum dispositivo de boot encontrado".', 'Disco (SSD/HD)'],
  ['Nada acontece ao apertar o botão de ligar, nem as ventoinhas giram.', 'Fonte de alimentação'],
  ['A internet não funciona, mas outros PCs da sala navegam normalmente.', 'Cabo de rede'],
  ['A tela fica com listras coloridas e travamentos em programas 3D.', 'Placa de vídeo'],
];
const PC_PARTS = ['Memória RAM', 'Cooler / ventilação', 'Disco (SSD/HD)', 'Fonte de alimentação', 'Cabo de rede', 'Placa de vídeo'];

const ENGINE_CASES = [
  ['O motor gira mas não pega, e não há faísca nas velas.', 'Bobina de ignição'],
  ['A luz da bateria acende com o motor ligado e a bateria descarrega.', 'Alternador'],
  ['Fumaça branca no escapamento e o nível de água baixa sempre.', 'Junta do cabeçote'],
  ['O motor esquenta rápido e a ventoinha não liga.', 'Sensor de temperatura'],
  ['Barulho de chiado ao frear.', 'Pastilhas de freio'],
  ['O carro falha em alta rotação e perde potência.', 'Filtro de combustível'],
];
const ENGINE_PARTS = ['Bobina de ignição', 'Alternador', 'Junta do cabeçote', 'Sensor de temperatura', 'Pastilhas de freio', 'Filtro de combustível'];

export function diag(root, api) {
  const engine = api.variant === 'mot_diag';
  const cases = shuffle(engine ? ENGINE_CASES : CASES);
  const PARTS = engine ? ENGINE_PARTS : PC_PARTS;
  let round = 0;
  const next = () => {
    if (round >= 3) { api.complete(); return; }
    const [symptom, answer] = cases[round];
    const options = shuffle([answer, ...shuffle(PARTS.filter((p) => p !== answer)).slice(0, 3)]);
    root.innerHTML = `<div class="diag"><div class="terminal"><span>${engine ? `MOTOR-${String(1 + round)}` : `PC-LAB-${String(10 + round * 7).padStart(2, '0')}`} &gt; relatório do técnico</span><p>${symptom}</p></div><div class="opts"></div></div>`;
    const box = root.querySelector('.opts');
    for (const o of options) {
      const b = document.createElement('button');
      b.className = 'btn opt'; b.textContent = o;
      b.addEventListener('click', () => {
        if (o === answer) { round++; api.audio.progress(); api.setStatus(`Diagnósticos corretos: ${round}/3`, 'ok'); setTimeout(next, 450); }
        else { b.classList.add('wrong'); b.disabled = true; api.fail('Não é essa peça. Leia os sintomas de novo.'); }
      });
      box.appendChild(b);
    }
  };
  api.setStatus('Diagnósticos corretos: 0/3');
  next();
}

// ---------- Portas lógicas ----------
const EXPRS = [
  ['(A E B) OU C', (a, b, c) => (a && b) || c],
  ['A E (NÃO B)', (a, b) => a && !b],
  ['(A OU B) E (NÃO C)', (a, b, c) => (a || b) && !c],
  ['NÃO (A E B) E C', (a, b, c) => !(a && b) && c],
  ['(A XOU B) E C', (a, b, c) => (a !== b) && c],
  ['A E B E (NÃO C)', (a, b, c) => a && b && !c],
];

export function logic(root, api) {
  const list = shuffle(EXPRS).slice(0, 3);
  let round = 0;
  const next = () => {
    if (round >= 3) { api.complete(); return; }
    const [label, fn] = list[round];
    let s = [false, false, false];
    // Estado inicial sempre com a saída desligada.
    do { s = [Math.random() < 0.5, Math.random() < 0.5, Math.random() < 0.5]; } while (fn(...s));
    root.innerHTML = `<div class="logic"><div class="expr">S = ${label}</div><div class="switches"></div><div class="lamp">S</div></div>`;
    const sw = root.querySelector('.switches');
    const lamp = root.querySelector('.lamp');
    ['A', 'B', 'C'].forEach((n, i) => {
      const b = document.createElement('button');
      b.className = `toggle ${s[i] ? 'on' : ''}`;
      b.innerHTML = `<span>${n}</span><b>${s[i] ? '1' : '0'}</b>`;
      b.addEventListener('click', () => {
        if (lamp.classList.contains('on')) return;
        s[i] = !s[i];
        b.classList.toggle('on', s[i]); b.querySelector('b').textContent = s[i] ? '1' : '0';
        api.audio.click();
        if (fn(...s)) {
          lamp.classList.add('on'); round++; api.audio.progress();
          api.setStatus(`Circuitos resolvidos: ${round}/3`, 'ok');
          setTimeout(next, 650);
        }
      });
      sw.appendChild(b);
    });
  };
  api.setStatus('Circuitos resolvidos: 0/3');
  next();
}

// ---------- Sequência (diários, livros, lanche) ----------
export function sequence(root, api) {
  let items, prompt;
  if (api.variant === 'cantina_lanche') {
    const ing = [['🍞', 'Pão'], ['🥬', 'Alface'], ['🍅', 'Tomate'], ['🧀', 'Queijo'], ['🍔', 'Hambúrguer'], ['🥓', 'Bacon']];
    const order = shuffle(ing).slice(0, 5);
    items = order.map(([ico, name], i) => ({ label: ico, sub: name, order: i }));
    prompt = `Pedido da mesa 4: ${order.map(([ico, n]) => `${ico} ${n}`).join(' → ')}`;
  } else if (api.variant === 'exp_pedido') {
    const steps = [['📦', 'Montar a caixa'], ['🫧', 'Plástico-bolha'], ['🎁', 'Produto'], ['🧾', 'Nota fiscal'], ['🩹', 'Fechar com fita'], ['🏷️', 'Etiqueta']];
    items = steps.map(([ico, name], i) => ({ label: ico, sub: name, order: i }));
    prompt = `Embale na ordem: ${steps.map(([, n]) => n).join(' → ')}`;
  } else if (api.variant === 'pint_cores') {
    const order = shuffle([['🔵', 'Azul'], ['🟡', 'Amarelo'], ['⚪', 'Branco'], ['🔴', 'Vermelho'], ['⚫', 'Preto']]);
    items = order.map(([ico, name], i) => ({ label: ico, sub: name, order: i }));
    prompt = `Receita da tinta: ${order.map(([, n]) => n).join(' → ')}`;
  } else if (api.variant === 'biblio_livros') {
    const codes = shuffle([621.3, 4.6, 670.4, 629.8, 530.1, 658.5, 510.2]).slice(0, 6).sort((a, b) => a - b);
    items = codes.map((c, i) => ({ label: '📘', sub: c.toFixed(1).padStart(5, '0'), order: i }));
    prompt = 'Devolva os livros em ordem crescente de código (CDD).';
  } else {
    const turmas = shuffle(['Mecânica', 'Eletrônica', 'Automação', 'Informática', 'Logística', 'Edificações']);
    items = turmas.map((t, i) => ({ label: '📒', sub: `${i + 1}º - ${t}`, order: i }));
    prompt = 'Organize os diários de classe pela ordem numérica (1º ao 6º).';
  }
  root.innerHTML = `<div class="sequence"><p class="seq-prompt">${prompt}</p><div class="seq-grid"></div></div>`;
  const grid = root.querySelector('.seq-grid');
  let next = 0;
  for (const it of shuffle(items)) {
    const b = document.createElement('button');
    b.className = 'seq-item';
    b.innerHTML = `<span>${it.label}</span><small>${it.sub}</small>`;
    b.addEventListener('click', () => {
      if (b.classList.contains('done')) return;
      if (it.order === next) {
        b.classList.add('done'); next++; api.audio.progress();
        api.setStatus(`${next}/${items.length}`);
        if (next === items.length) api.complete();
      } else { api.fail('Fora de ordem! Recomeçando.'); next = 0; grid.querySelectorAll('.seq-item').forEach((x) => x.classList.remove('done')); }
    });
    grid.appendChild(b);
  }
  api.setStatus(`0/${items.length}`);
}

// ---------- Teclado numérico (matrícula / reinicialização) ----------
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

export { pick };
