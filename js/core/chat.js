// Chat livre: limpeza do texto e leitura simples para que os bots entendam acusações, defesas e perguntas.
import { PLAYER_COLORS } from '../config.js';

export const CHAT_MAX = 140;

const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function sanitizeChat(text) {
  return String(text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
}

// Encontra jogadores citados pelo nome (primeiro nome basta) ou pela cor do uniforme.
export function mentionedPlayers(game, speaker, text) {
  const t = ` ${norm(text).replace(/[^a-z0-9 ]/g, ' ')} `;
  const found = [];
  for (const p of game.players) {
    if (p === speaker) continue;
    const first = norm(p.name).split(' ')[0];
    const color = PLAYER_COLORS.find((c) => c.id === p.look.color);
    if ((first.length >= 3 && t.includes(` ${first} `)) || t.includes(` ${norm(p.name)} `) || (color && t.includes(` ${norm(color.name)} `))) {
      found.push(p);
    }
  }
  return found;
}

// Devolve o efeito da mensagem sobre a desconfiança dos bots.
export function parseChat(game, speaker, text) {
  const t = ` ${norm(text)} `;
  const names = mentionedPlayers(game, speaker, text).filter((p) => p.alive);
  const res = { effect: null, question: null };
  const isQuestion = t.includes('?') || /\b(onde|cade|qual|quem)\b/.test(t);
  if (!names.length) {
    if (/(nao fui eu|sou inocente|nao sou (o |a )?impostor|eu sou aluno|confiem em mim)/.test(t)) res.effect = { target: speaker.id, strength: -10 };
    return res;
  }
  const target = names[0];
  if (isQuestion && target.isBot) res.question = target;
  const distrust = /(nao confio|mentir|mentindo|mentiroso|mentirosa)/.test(t);
  const trust = !distrust && /(confi|inocente|limpo|limpa|safe|estava comigo|tava comigo|e aluno|nao foi (el|o |a )|fez o exame|escaneou|vi fazendo|vi .* fazendo)/.test(t);
  const strong = /\b(vi|matou|eliminou|derrubou|duto|vent|ventilacao|flagrei|pegou)\b/.test(t);
  const accuse = distrust || /(foi (el|o |a )?|impostor|\bsus\b|suspeit|votem|vota |votar|estranho|estranha|culpad|esquisit|e ele|e ela)/.test(t) || / foi /.test(t);
  if (trust) res.effect = { target: target.id, strength: -18 };
  else if (strong && accuse) res.effect = { target: target.id, strength: 42 };
  else if (strong) res.effect = { target: target.id, strength: 30 };
  else if (accuse) res.effect = { target: target.id, strength: 22 };
  return res;
}
