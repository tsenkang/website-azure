# SENAI: SUSPEITOS 🎮

Jogo de dedução social ambientado numa escola técnica fictícia inspirada no SENAI. Os **alunos** completam tarefas pela escola e tentam descobrir quem está sabotando tudo. Os **impostores** fingem ser alunos, sabotam sistemas e eliminam colegas, sempre dentro da ficção e sem nada gráfico.

> Projeto escolar/de fã, **sem vínculo oficial com o SENAI**. Não usa logotipos. Personagens, mapa, arte e sons são originais e gerados por código.

## Como executar

O jogo é estático (HTML + CSS + JavaScript ES modules) e **não tem dependências**. Como usa módulos ES, ele precisa ser servido por HTTP. Abrir o `index.html` direto do disco não funciona.

```bash
# opção 1 (Python 3)
python3 -m http.server 8080
# opção 2 (Node.js)
npx serve -l 8080 .
```

Depois é só abrir **http://localhost:8080** no navegador (Chrome, Edge, Firefox ou Safari atuais).

Para publicar, basta copiar a pasta para qualquer hospedagem estática (Azure Static Web Apps, GitHub Pages, Netlify…). Não há etapa de build.

## Controles

| Tecla | Ação |
|---|---|
| `W A S D` / setas | Andar |
| `E` | Usar: fazer tarefa, consertar sabotagem, apertar o sinal de emergência, ver câmeras |
| `R` | Reportar aluno desacordado |
| `M` / `Tab` | Mapa da escola |
| `Q` | Eliminar (impostor) |
| `F` | Painel de sabotagem (impostor) |
| `V` | Duto de ventilação (impostor) |
| `Esc` | Fechar janela / pausar |

No celular, arraste o dedo no lado esquerdo da tela para andar e use os botões à direita.

## Regras

- **Os alunos vencem** quando completam todas as tarefas da turma ou encaminham todos os impostores à coordenação.
- **Os impostores vencem** quando ficam em igualdade numérica com os alunos vivos, ou quando a sabotagem crítica (sobrecarga na subestação) não é resolvida a tempo.
- **Reuniões:** reporte um corpo ou aperte o sinal de emergência no Pátio (1 vez por jogador). Há uma fase de discussão (com falas rápidas) e depois a votação. Empate, ou "pular" com o mesmo número de votos que o mais votado, não expulsa ninguém.
- **Eliminados** viram espectros: atravessam paredes e podem terminar as próprias tarefas, mas não votam nem reportam.

## Funcionalidades implementadas

**Mapa (13 salas + 4 corredores):** entrada/recepção, sala de aula, laboratório de informática, oficina mecânica, laboratório de eletrônica, oficina de automação, almoxarifado (mais escuro, com estantes que bloqueiam a visão), pátio e cantina, área de manutenção, sala dos professores, laboratório técnico especial e biblioteca técnica. Tem portas, móveis com colisão, sinalização das salas, piso tátil nos corredores e 9 dutos de ventilação em 3 redes.

**Visual:** vista de cima em 2.5D desenhada em Canvas. Paredes com face frontal, iluminação ambiente por sala e máquinas animadas (braços robóticos, esteira, torno, impressoras 3D, racks de servidor, consoles). Os personagens têm uniforme com faixa refletiva, 12 cores e 7 acessórios (capacete, óculos de proteção, boné, fone, touca, jaleco…), com animação de caminhada, ociosidade e piscada.

**Visão realista:** campo de visão calculado por raycasting. Paredes e estantes bloqueiam a vista, e só aparece quem está no seu campo de visão.

**12 minijogos funcionais:**
- conectar cabos (arrastar)
- circuito com peças giratórias
- painel de ferramentas
- calibrar braço robótico
- medidor (parar o ponteiro na faixa certa)
- prova / inspeção NR‑10 / catálogo técnico
- diagnóstico de PC
- portas lógicas
- sequências (lanche, diários, livros)
- teclado de matrícula
- separar itens (componentes, peças da esteira, reciclagem)
- processos com espera

**5 sabotagens**, cada uma com efeito visual, duração e forma de resolver:
- **Apagão:** a visão diminui.
- **GPS offline:** o minimapa cai.
- **Pane nas máquinas:** as tarefas de máquina ficam travadas.
- **Portas trancadas:** as portas de uma sala ficam bloqueadas por 10 s.
- **Sobrecarga na subestação:** sabotagem crítica com alarme e cronômetro; é preciso resolver dois consoles distantes.

**Bots com IA:**
- Andam pelo mapa com A* e fazem tarefas com durações variadas.
- Observam quem viram e onde, testemunham eliminações e uso de dutos, e reportam corpos.
- Consertam sabotagens e se dividem entre os dois consoles da sabotagem crítica.
- Como impostores, caçam alunos isolados, checam se há testemunhas, fogem pelos dutos, sabotam e às vezes se reportam.
- Nas reuniões, falam com base no que realmente viram (álibis, acusações, defesas) e votam pela desconfiança acumulada. Os impostores mentem.
- 3 níveis de dificuldade.
- Todos os bots aparecem como **[BOT]**.

**Reuniões e votação:** a lógica de votação é real. Tem discussão e votação com cronômetro, falas rápidas do jogador (que influenciam os bots), tratamento de empates, revelação dos votos e uma animação de "encaminhado à coordenação" que revela (ou não, se você desligar) o papel de quem saiu.

**Interface:**
- Menu e lobby (personalização, regras da partida, troca de bots).
- Revelação do papel.
- HUD com barra de tarefas da turma, lista de tarefas, minimapa e botões de ação com tempo de recarga.
- Dicas de interação e setas até os objetivos.
- Mapa grande e painel de sabotagem com seleção de sala.
- Câmeras de segurança ao vivo na sala dos professores.
- Pausa com volume e opção de silenciar.
- Tela final com estatísticas por jogador e linha do tempo da partida, com revanche.

**Extras:**
- Tutorial interativo de 6 passos.
- Eventos aleatórios (piso molhado, hora do lanche, Wi‑Fi caiu).
- Sons procedurais com Web Audio: passos, sinal da escola, alarme, eliminação, dutos, conclusão de tarefa e ambiente que muda conforme a sala.
- Preferências salvas no navegador.
- Joystick virtual para toque.

## Estrutura do código

```
index.html            página e HUD
css/style.css         identidade visual e telas
js/config.js          constantes, cores, acessórios e dificuldade
js/core/              lógica da partida (sem DOM: roda no navegador e no Node)
  map.js              salas, portas, móveis, estações, dutos e grade de colisão
  physics.js          colisão círculo×tiles, raycasting e linha de visão
  pathfinding.js      A* com suavização
  player.js           entidade jogador
  game.js             estado da partida, ações, regras e vitória
  ai.js               IA dos bots (tarefas, observação, impostor, reuniões)
  sabotage.js         sabotagens
  meeting.js          reuniões e votação
  events.js           eventos aleatórios
js/render/            renderização em Canvas (mundo, móveis, personagens, minimapa)
js/ui/                HUD, telas, reunião, tutorial e minijogos (js/ui/games/)
js/audio.js           sons procedurais
js/input.js           teclado e joystick virtual
js/main.js            controlador: telas, loop e ligação entre os módulos
tests/                simulação headless e testes no navegador
```

## Testes

```bash
npm test                     # valida o mapa e roda 12 partidas completas só com bots (Node)
npm start                    # em outro terminal, para os testes de navegador:
npm run test:browser         # Playwright: fluxo completo + resolve cada minijogo pela interface
```

`tests/smoke.mjs` percorre o menu, o lobby, o movimento, a abertura de tarefas, o mapa, as sabotagens, uma reunião com voto, o fim de partida, o tutorial, uma partida como impostor (com eliminação) e o layout de celular. `tests/minigames.mjs` resolve os 12 minijogos e as 4 sabotagens consertáveis com cliques e arrastes reais e confere se cada um ficou registrado na partida.

## Pendências (transparência)

- **Multiplayer online (Fase 4): não implementado.** Hoje o jogo é single-player contra bots. A lógica em `js/core/` já não depende do DOM e roda no Node (os testes headless provam isso), então o próximo passo seria um servidor WebSocket/Socket.IO que rode `Game` de forma autoritativa: papéis secretos, eliminações, tarefas e votos ficariam no servidor, e os clientes enviariam só a entrada de controle. Ainda faltam salas, sincronização, validação no servidor e reconexão.
- Os sons são sintetizados, sem trilha musical.
- O balanceamento foi ajustado com simulações só de bots. Partidas com pessoas podem pedir mais ajuste (tempo de recarga, número de tarefas).
- Chat livre por texto nas reuniões não existe. As falas são rápidas e pré-definidas, porque os bots não interpretam texto livre.
