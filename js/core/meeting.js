// Reuniões, discussão e votação (lógica pura; a UI apenas observa este estado).
export class MeetingSystem {
  constructor(game) {
    this.game = game;
    this.state = null;
  }

  get active() { return !!this.state; }

  start(kind, caller, body) {
    const game = this.game;
    const s = this.game.settings;
    this.state = {
      kind, caller, body,
      victim: body && !body.dummy ? game.playerById(body.playerId) : null,
      room: body ? body.room : null,
      t: 0,
      phase: 'discussion',
      discussionEnd: s.discussionTime,
      votingEnd: s.discussionTime + s.votingTime,
      votes: {},
      chat: [],
      accusations: {},
      scheduled: [],
      voteTimes: {},
      result: null,
      phaseT: 0,
    };
    const st = this.state;
    for (const p of game.players) {
      if (!p.alive || !p.isBot) continue;
      p.brain.onMeetingStart(st);
    }
    for (const p of game.players) {
      if (!p.alive || !p.isBot) continue;
      for (const msg of p.brain.meetingStatements(st)) st.scheduled.push({ ...msg, speaker: p });
      st.voteTimes[p.id] = p.brain.voteTime(st);
    }
    st.scheduled.sort((a, b) => a.delay - b.delay);
    game.emit('meetingStart', st);
  }

  aliveVoters() { return this.game.players.filter((p) => p.alive); }

  say(speaker, text, effect = null) {
    const st = this.state;
    if (!st || !speaker.alive || st.phase === 'results' || st.phase === 'eject') return;
    st.chat.push({ id: speaker.id, name: speaker.name, text, t: st.t });
    if (effect && effect.target != null) {
      st.accusations[effect.target] = (st.accusations[effect.target] || 0) + effect.strength;
      for (const p of this.game.players) {
        if (p.alive && p.isBot && p !== speaker) p.brain.hearStatement(speaker, effect.target, effect.strength);
      }
    }
    this.game.emit('chat', { speaker, text });
  }

  // Falas rápidas do jogador humano (afetam a desconfiança dos bots).
  humanSay(kind, targetId) {
    const st = this.state;
    const me = this.game.local;
    if (!st || !me.alive) return;
    const target = targetId != null ? this.game.playerById(targetId) : null;
    const lastRoom = this.game.roomName(me.lastRoomId);
    switch (kind) {
      case 'where': this.say(me, `Eu estava no(a) ${lastRoom}.`); break;
      case 'sus': if (target) this.say(me, `Estou desconfiado(a) de ${target.name}.`, { target: target.id, strength: 18 }); break;
      case 'saw': if (target) this.say(me, `Eu vi ${target.name} perto do corpo!`, { target: target.id, strength: 40 }); break;
      case 'trust': if (target) this.say(me, `${target.name} estava comigo, é confiável.`, { target: target.id, strength: -20 }); break;
      case 'notme': this.say(me, 'Não fui eu! Eu estava fazendo minhas tarefas.', { target: me.id, strength: -10 }); break;
      case 'skip': this.say(me, 'Sem provas, melhor pular.'); break;
    }
  }

  castVote(voter, target) {
    const st = this.state;
    if (!st || st.phase !== 'voting' || !voter.alive || voter.id in st.votes) return false;
    if (target !== 'skip') {
      const tp = this.game.playerById(target);
      if (!tp || !tp.alive) return false;
    }
    st.votes[voter.id] = target;
    voter.stats.votesCast++;
    this.game.emit('vote', { voter, target });
    return true;
  }

  update(dt) {
    const st = this.state;
    if (!st) return;
    st.t += dt;
    st.phaseT += dt;
    while (st.scheduled.length && st.scheduled[0].delay <= st.t) {
      const m = st.scheduled.shift();
      this.say(m.speaker, m.text, m.effect);
    }
    if (st.phase === 'discussion' && st.t >= st.discussionEnd) { st.phase = 'voting'; st.phaseT = 0; this.game.emit('votingStart', st); }
    if (st.phase === 'voting') {
      for (const p of this.game.players) {
        if (p.alive && p.isBot && !(p.id in st.votes) && st.t >= st.voteTimes[p.id]) {
          this.castVote(p, p.brain.decideVote(st));
        }
      }
      const everyone = this.aliveVoters().every((p) => p.id in st.votes);
      if (everyone || st.t >= st.votingEnd) this.tally();
    } else if (st.phase === 'results' && st.phaseT >= 4.5) {
      st.phase = 'eject'; st.phaseT = 0; this.game.emit('eject', st.result);
    } else if (st.phase === 'eject' && st.phaseT >= 5) {
      this.finish();
    }
  }

  tally() {
    const st = this.state;
    const counts = {};
    let skip = 0;
    for (const target of Object.values(st.votes)) {
      if (target === 'skip') skip++;
      else counts[target] = (counts[target] || 0) + 1;
    }
    let max = skip, top = [], skipTop = skip > 0;
    for (const [id, n] of Object.entries(counts)) {
      if (n > max) { max = n; top = [Number(id)]; skipTop = false; }
      else if (n === max) top.push(Number(id));
    }
    let ejected = null, tie = false;
    if (max > 0 && !skipTop && top.length === 1) ejected = this.game.playerById(top[0]);
    else if (max > 0 && (top.length > 1 || (skipTop && top.length > 0))) tie = true;

    st.result = { counts, skip, ejected, tie, votes: { ...st.votes }, noVote: this.aliveVoters().filter((p) => !(p.id in st.votes)).map((p) => p.id) };
    for (const [voter, target] of Object.entries(st.votes)) {
      if (target === 'skip') continue;
      const tp = this.game.playerById(target);
      if (tp && tp.isImpostor) this.game.playerById(Number(voter)).stats.votesCorrect++;
    }
    st.phase = 'results';
    st.phaseT = 0;
    this.game.emit('votingEnd', st.result);
  }

  finish() {
    const st = this.state;
    const ejected = st.result?.ejected;
    if (ejected) this.game.ejectPlayer(ejected);
    for (const p of this.game.players) if (p.isBot) p.brain.onMeetingEnd(st);
    this.state = null;
    this.game.afterMeeting(st);
  }
}
