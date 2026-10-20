# SENAI: SUSPEITOS 🎮

Jogo de dedução social ambientado em escolas técnicas fictícias inspiradas no SENAI. Os **alunos** completam tarefas e tentam descobrir quem está sabotando tudo. Os **impostores** fingem ser alunos, sabotam sistemas e eliminam colegas, sempre dentro da ficção e sem nada gráfico.

Dá para jogar **sozinho contra bots** ou **online com amigos**, com salas por código.

> Projeto escolar/de fã, **sem vínculo oficial com o SENAI**. Não usa logotipos. Personagens, mapas, arte e sons são originais e gerados por código.

## Como executar

### Local (com o modo online)

```bash
npm install     # instala só o "ws" (WebSocket)
npm start       # http://localhost:8080
```

### Só o single-player (sem servidor)

Qualquer servidor estático serve, por exemplo `python3 -m http.server 8080`. Abrir o `index.html` direto do disco não funciona, porque o jogo usa módulos ES.

## Publicar online no Render.com

O repositório já vem com o `render.yaml`: um único Web Service serve o jogo e as partidas online, no mesmo endereço.

1. Entre em [render.com](https://render.com) e conecte sua conta do GitHub.
2. Clique em **New → Blueprint** e escolha este repositório e o branch que tem o jogo. O Render lê o `render.yaml` sozinho.
3. Confirme em **Apply**. Ele roda `npm install` e `npm start`. A checagem de saúde fica em `/healthz`.
4. Abra o endereço gerado, por exemplo `https://senai-suspeitos.onrender.com`. Clique em **Online → Criar sala** e mande o código de 4 letras para os amigos.

Se preferir não usar o Blueprint: **New → Web Service**, runtime Node, build `npm install`, start `npm start`.

No plano grátis, o serviço dorme depois de ~15 minutos sem uso. A primeira conexão depois disso leva cerca de 1 minuto, e o jogo avisa quando isso acontece.

Se o jogo estiver hospedado em outro lugar (outro site estático), dá para apontar para o servidor em **Online → Servidor** (`wss://seu-jogo.onrender.com/ws`) ou com `?server=wss://...` na URL.

## Controles

| Tecla | Ação |
|---|---|
| `W A S D` / setas | Andar |
| `E` | Usar: tarefa, conserto, sinal de emergência, câmeras e admin |
| `R` | Reportar aluno desacordado |
| `M` / `Tab` | Mapa |
| `Q` | Eliminar (impostor) |
| `F` | Painel de sabotagem (impostor) |
| `V` | Entrar ou sair do duto (impostor). Dentro dele, clique nas setas ou use `W A S D` para escolher a saída. |
| `Enter` | Escrever no chat da reunião |
| `Esc` | Fechar janela / pausar |

No celular, arraste no lado esquerdo da tela para andar e use os botões à direita.

## Regras

- **Os alunos vencem** quando completam todas as tarefas ou encaminham todos os impostores à coordenação.
- **Os impostores vencem** quando ficam em igualdade numérica com os alunos vivos, ou quando a sabotagem crítica não é resolvida a tempo.
- **Reuniões:** reporte um corpo ou aperte o sinal de emergência (1 vez por jogador). Há discussão com **chat livre**, depois a votação. Empate, ou "pular" empatado com o mais votado, não expulsa ninguém.
- **Eliminados** viram espectros: atravessam paredes e podem terminar as próprias tarefas.

## Funcionalidades

**3 mapas**, cada um com 20 a 26 tarefas, 9 dutos em 3 redes, enfermaria com escâner, painel de admin e câmeras:
- **Unidade Escolar:** oficinas, laboratórios, pátio com cantina, almoxarifado escuro, enfermaria e biblioteca.
- **Galpão de Logística:** armazém enorme e escuro cheio de estantes, doca de carga, câmara fria, refeitório e simulador de empilhadeira.
- **Fábrica-Escola Automotiva:** linha de montagem no centro, cabine de pintura, funilaria, laboratório de motores, controle de qualidade e subestação.

**Visual:** estilo cartoon com contorno escuro grosso, cores chapadas e sombras sólidas, em vista de cima 2.5D.
- Personagens: alunos com olhos grandes, uniforme com faixa refletiva, 12 cores e 7 acessórios.
- Interface robusta, com ícones próprios em SVG.
- O menu fica sobre uma partida de bots rodando ao vivo.

**Mecânicas de dedução:**
- **Duto com esconderijo:** o impostor entra, fica invisível, escolhe a saída pelas setas e sai quando quiser. Quem vê a entrada ou a saída fica sabendo.
- **Tarefas visuais** (escâner, torno, solda, gerador, lixo): quem estiver perto vê a animação. Impostor não consegue fazê-las. Os bots que veem passam a confiar e defendem você na reunião.
- **Painel de admin:** contagem anônima de pessoas por sala. Fica fora do ar com o GPS sabotado.
- **Câmeras de segurança:** imagens ao vivo de quatro pontos do mapa.
- **Chat livre:** os bots entendem acusações ("foi o Bruno", "vi a Camila no duto"), defesas ("confio na Sofia"), "não fui eu" e perguntas ("Diego, onde você estava?"), que eles respondem.

**13 tipos de minijogo funcionais**, com variações por mapa:
- cabos, circuito, painel de ferramentas, braço robótico, medidor
- provas (técnica, NR‑10, logística, qualidade, catálogo)
- diagnóstico de PC e de motor, portas lógicas
- sequências (lanche, diários, livros, embalagem, mistura de tinta)
- teclado, separação de itens, processos com espera, escâner médico

**5 sabotagens:** apagão, GPS offline, pane nas máquinas, portas trancadas e sobrecarga crítica, que tem dois consoles distantes.

**Bots com IA:**
- Andam com A* e lembram quem viram e onde.
- Testemunham eliminações, dutos e tarefas visuais.
- Consertam sabotagens.
- Como impostores, caçam alunos isolados, checam se há testemunhas, escondem-se nos dutos e esperam a saída ficar livre.
- Falam e votam com base no que viram.
- 3 níveis de dificuldade.

**Modo online (servidor autoritativo):**
- Salas com código, anfitrião que escolhe mapa e regras, bots para completar a sala e até 10 participantes.
- O servidor guarda papéis, tarefas, eliminações, votos e sabotagens.
- Cada jogador recebe só o que pode saber. Papéis alheios, quem está no duto e mortes não vistas nunca saem do servidor.
- O cliente prevê o próprio movimento para ficar suave. O servidor valida velocidade e colisão, recusando teletransporte, e aceita tarefa só com o minijogo aberto pelo tempo mínimo.
- Se alguém cair, um bot assume o lugar até a pessoa voltar. A reconexão é automática e devolve a mesma personagem.

**Extras:**
- Tutorial interativo.
- Eventos aleatórios.
- Sons procedurais com Web Audio, com ambiente por sala.
- Estatísticas e linha do tempo no fim da partida.
- Joystick de toque.
- Preferências salvas no navegador.

## Estrutura

```
index.html, css/style.css, favicon.svg
server/server.js        servidor HTTP + WebSocket (arquivos do jogo e partidas online)
server/rooms.js         salas, lobby, partida autoritativa, validação e reconexão
js/core/                lógica da partida (sem DOM: roda no navegador e no servidor)
  maps/                 definições dos 3 mapas (salas, portas, móveis, tarefas, dutos)
  map.js, physics.js, pathfinding.js, player.js, game.js, ai.js
  sabotage.js, meeting.js, chat.js, events.js
js/net/protocol.js      o que o servidor envia para cada jogador e como o cliente aplica
js/net/client.js        cliente WebSocket, cópia local da partida e reconexão
js/render/              renderização em Canvas (mundo, móveis, personagens, efeitos)
js/ui/                  HUD, telas, reunião, tutorial, ícones e minijogos
js/main.js              controlador: telas, loop e ações (local ou online)
tests/                  simulação headless, testes de navegador e do modo online
render.yaml             blueprint do Render.com
```

## Testes

```bash
npm test               # valida os 3 mapas e roda 12 partidas só com bots (Node)
npm start              # em outro terminal, para os testes abaixo
npm run test:online    # 2 clientes WebSocket: sala, partida, reunião, chat, votos, trapaças e reconexão
node tests/online-browser.mjs   # 2 janelas de navegador jogando online pela interface
npm run test:browser   # fluxo completo local + resolve os 13 minijogos pela interface
node tests/features.mjs         # duto, admin, tarefa visual, chat com resposta de bot e mapas
```

## Pendências

- Chat dos espectros entre si e chat no lobby online ainda não existem.
- Os sons são sintetizados, sem trilha musical.
- O balanceamento foi ajustado com simulações de bots. Partidas só com pessoas podem pedir ajuste de tempo de recarga e de número de tarefas.
- No plano grátis do Render a sala some se o servidor reiniciar ou dormir no meio da partida.
