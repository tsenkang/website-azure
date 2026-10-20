// Efeitos sonoros e ambiente gerados com Web Audio (sem arquivos externos).
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.7;
    this.muted = false;
    this.alarm = null;
    this.ambient = null;
    this.ambientRoom = null;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);
    this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = this.muted ? 0 : v; }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : this.volume; }

  tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0, attack = 0.005 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  noise(dur, { vol = 0.2, freq = 1000, q = 1, type = 'bandpass', delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  step() { this.noise(0.07, { vol: 0.07, freq: 600 + Math.random() * 300, q: 2 }); }
  click() { this.tone(900, 0.05, { type: 'square', vol: 0.06 }); }
  error() { this.tone(180, 0.18, { type: 'square', vol: 0.12 }); this.tone(140, 0.2, { type: 'square', vol: 0.12, delay: 0.1 }); }
  taskDone() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.18, delay: i * 0.08 })); }
  progress() { this.tone(660, 0.08, { type: 'triangle', vol: 0.12 }); }
  kill() {
    this.noise(0.35, { vol: 0.45, freq: 200, q: 0.8, type: 'lowpass' });
    this.tone(160, 0.35, { type: 'sawtooth', vol: 0.2, slide: -120 });
  }
  vent() { this.noise(0.5, { vol: 0.25, freq: 400, q: 0.6 }); this.tone(90, 0.4, { type: 'sine', vol: 0.2, slide: 60 }); }
  bell() {
    // Sinal da escola chamando para a reunião
    for (let i = 0; i < 6; i++) {
      this.tone(1180, 0.12, { type: 'square', vol: 0.08, delay: i * 0.14 });
      this.tone(880, 0.12, { type: 'square', vol: 0.06, delay: i * 0.14 + 0.07 });
    }
  }
  report() { this.tone(440, 0.15, { type: 'sawtooth', vol: 0.15 }); this.tone(330, 0.3, { type: 'sawtooth', vol: 0.15, delay: 0.15 }); this.bell(); }
  vote() { this.tone(520, 0.08, { type: 'triangle', vol: 0.15 }); this.tone(780, 0.12, { type: 'triangle', vol: 0.15, delay: 0.07 }); }
  eject() { this.noise(1.6, { vol: 0.25, freq: 800, q: 0.4, type: 'lowpass' }); this.tone(400, 1.4, { type: 'sine', vol: 0.15, slide: -340 }); }
  sabotage() { this.tone(220, 0.5, { type: 'sawtooth', vol: 0.18, slide: -100 }); this.tone(110, 0.6, { type: 'square', vol: 0.1, delay: 0.1 }); }
  lightsOff() { this.tone(300, 0.6, { type: 'sine', vol: 0.25, slide: -260 }); this.noise(0.2, { vol: 0.2, freq: 3000, delay: 0.05 }); }
  fixed() { this.tone(392, 0.12, { type: 'triangle', vol: 0.15 }); this.tone(587, 0.2, { type: 'triangle', vol: 0.15, delay: 0.1 }); }
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.4, { type: 'triangle', vol: 0.2, delay: i * 0.12 })); }
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.45, { type: 'sawtooth', vol: 0.12, delay: i * 0.18 })); }
  reveal(impostor) {
    if (impostor) { this.tone(110, 1.2, { type: 'sawtooth', vol: 0.18 }); this.tone(116, 1.2, { type: 'sawtooth', vol: 0.12 }); }
    else { this.tone(262, 0.5, { type: 'triangle', vol: 0.2 }); this.tone(392, 0.8, { type: 'triangle', vol: 0.2, delay: 0.2 }); }
  }

  startAlarm() {
    if (!this.ctx || this.alarm) return;
    const o = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    const g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 700;
    lfo.frequency.value = 1.6; lg.gain.value = 250;
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.value = 0.05;
    o.connect(g); g.connect(this.master);
    o.start(); lfo.start();
    this.alarm = { o, lfo, g };
  }

  stopAlarm() {
    if (!this.alarm) return;
    const { o, lfo } = this.alarm;
    o.stop(); lfo.stop();
    this.alarm = null;
  }

  // Som ambiente varia conforme a sala (oficinas mais barulhentas, pátio com passarinhos).
  setAmbientRoom(roomId) {
    if (!this.ctx || roomId === this.ambientRoom) return;
    this.ambientRoom = roomId;
    if (!this.ambient) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf; src.loop = true;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
      const g = this.ctx.createGain(); g.gain.value = 0;
      const hum = this.ctx.createOscillator(); hum.frequency.value = 60; hum.type = 'sine';
      const hg = this.ctx.createGain(); hg.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.master);
      hum.connect(hg); hg.connect(this.master);
      src.start(); hum.start();
      this.ambient = { f, g, hg };
    }
    const loud = { oficina: [0.09, 500, 0.025], automacao: [0.07, 700, 0.02], labtec: [0.06, 250, 0.05], manutencao: [0.07, 350, 0.03], info: [0.04, 1200, 0.008], eletronica: [0.03, 900, 0.015] };
    const [nv, nf, hv] = loud[roomId] || [0.02, 300, 0.004];
    const t = this.ctx.currentTime;
    this.ambient.g.gain.linearRampToValueAtTime(nv, t + 0.8);
    this.ambient.f.frequency.linearRampToValueAtTime(nf, t + 0.8);
    this.ambient.hg.gain.linearRampToValueAtTime(hv, t + 0.8);
  }

  ambientTick(roomId) {
    if (!this.ctx) return;
    if (roomId === 'patio' && Math.random() < 0.012) {
      const f = 2200 + Math.random() * 1200;
      this.tone(f, 0.08, { vol: 0.04, slide: 600 }); this.tone(f * 1.1, 0.08, { vol: 0.04, delay: 0.1, slide: -400 });
    }
    if ((roomId === 'oficina' || roomId === 'manutencao') && Math.random() < 0.01) this.noise(0.12, { vol: 0.12, freq: 2500, q: 6 });
    if (roomId === 'automacao' && Math.random() < 0.01) this.tone(180 + Math.random() * 80, 0.4, { type: 'square', vol: 0.03, slide: 120 });
  }

  stopAmbient() {
    if (this.ambient && this.ctx) {
      this.ambient.g.gain.value = 0; this.ambient.hg.gain.value = 0;
    }
    this.ambientRoom = null;
  }
}

export const audio = new AudioEngine();
