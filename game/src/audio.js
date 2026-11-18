// Emberwisp — every sound is synthesized with WebAudio. No audio files,
// no network: oscillators and filtered noise, mixed quietly under the game.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  // Browsers require a user gesture before audio starts; call from the
  // first click or keypress. Safe to call repeatedly.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startMusic();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol || 0.15, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise(dur, vol, filterFreq) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.12, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  shoot() { this.tone(880, 0.07, 'square', 0.05, 520); }
  hit() { this.tone(320, 0.05, 'triangle', 0.08, 180); }
  mothDown() { this.tone(520, 0.18, 'sine', 0.12, 140); this.noise(0.08, 0.05, 2400); }
  split() { this.tone(700, 0.12, 'sine', 0.1, 220); }
  lanternHit() { this.tone(140, 0.3, 'sawtooth', 0.16, 60); this.noise(0.2, 0.1, 500); }
  dew() { this.tone(1320, 0.09, 'sine', 0.07, 1760); }
  ember() { this.tone(660, 0.15, 'sine', 0.1, 990); }
  waveClear() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'sine', 0.12), i * 90)); }
  upgrade() { [784, 988, 1175].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'triangle', 0.1), i * 70)); }
  gameOver() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'sawtooth', 0.09), i * 180)); }
  victory() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.11), i * 110)); }
  click() { this.tone(990, 0.05, 'sine', 0.08); }

  // A slow, quiet two-note pad that drifts under the game.
  startMusic() {
    if (this.musicTimer) return;
    const roots = [220, 174.61, 196, 146.83];
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const root = roots[this.musicStep % roots.length];
      this.musicStep++;
      this.tone(root, 1.6, 'sine', 0.035);
      this.tone(root * 1.5, 1.6, 'sine', 0.02);
      if (this.musicStep % 4 === 0) this.tone(root * 2, 0.9, 'sine', 0.018);
    }, 900);
  }
}
