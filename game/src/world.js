// Emberwisp — the simulation: the wisp, the lantern, the moths, the dew,
// the waves and the upgrades. Rendering lives in render.js; this file
// only moves numbers around and decides what happened.

import { VIEW, LANTERN, PLAYER, MOTHS, WAVES, wavePlan, UPGRADES, SCORE, COLORS } from './config.js';
import { makeRng, pick, range, shuffle } from './random.js';

export const PHASE = {
  TITLE: 'title',
  PLAYING: 'playing',
  UPGRADE: 'upgrade',
  GAMEOVER: 'gameover',
  VICTORY: 'victory',
};

export function freshStats() {
  return {
    fireInterval: PLAYER.fireInterval,
    boltSpeed: PLAYER.boltSpeed,
    boltRadius: PLAYER.boltRadius,
    boltDamage: PLAYER.boltDamage,
    bolts: 1,
    pierce: 0,
    maxSpeed: PLAYER.maxSpeed,
    thorns: 0,
    magnet: 90,
  };
}

export class World {
  constructor(seed) {
    this.rng = makeRng(seed || 20261118);
    this.reset();
  }

  reset() {
    this.phase = PHASE.TITLE;
    this.time = 0;
    this.wave = 0;
    this.score = 0;
    this.dew = 0;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.light = LANTERN.startLight;
    this.combo = 0;
    this.comboTimer = 0;
    this.stats = freshStats();
    this.player = {
      x: VIEW.w / 2, y: VIEW.h / 2 + 130, vx: 0, vy: 0,
      aim: -Math.PI / 2, fireTimer: 0, trail: [],
    };
    this.moths = [];
    this.bolts = [];
    this.drops = [];
    this.particles = [];
    this.floaters = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveActive = false;
    this.waveBanner = 0;
    this.upgradeChoices = [];
    this.shake = 0;
    this.flash = 0;
    this.lanternPulse = 0;
    this.best = 0;
    try { this.best = Number(localStorage.getItem('emberwisp-best') || 0); } catch (e) { /* storage unavailable */ }
    this.stars = [];
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: this.rng() * VIEW.w, y: this.rng() * VIEW.h * 0.8,
        r: range(this.rng, 0.6, 1.8), tw: range(this.rng, 0.5, 2.2), ph: range(this.rng, 0, 6.28),
      });
    }
  }

  startGame() {
    this.reset();
    this.phase = PHASE.PLAYING;
    this.nextWave();
  }

  nextWave() {
    this.wave++;
    if (this.wave > WAVES) {
      this.phase = PHASE.VICTORY;
      return;
    }
    this.spawnQueue = [];
    for (const group of wavePlan(this.wave)) {
      for (let i = 0; i < group.count; i++) this.spawnQueue.push({ kind: group.kind, gap: group.gap });
    }
    this.spawnQueue = shuffle(this.rng, this.spawnQueue);
    this.spawnTimer = 0.6;
    this.waveActive = true;
    this.waveBanner = 2.4;
  }

  spawnMoth(kind) {
    const def = MOTHS[kind];
    const edge = Math.floor(this.rng() * 4);
    let x, y;
    if (edge === 0) { x = range(this.rng, 0, VIEW.w); y = -24; }
    else if (edge === 1) { x = range(this.rng, 0, VIEW.w); y = VIEW.h + 24; }
    else if (edge === 2) { x = -24; y = range(this.rng, 0, VIEW.h); }
    else { x = VIEW.w + 24; y = range(this.rng, 0, VIEW.h); }
    const speedJitter = range(this.rng, 0.85, 1.2);
    this.moths.push({
      kind, def, x, y,
      hp: def.hp,
      speed: def.speed * speedJitter,
      wobble: range(this.rng, 0, Math.PI * 2),
      wobbleSpeed: range(this.rng, 1.5, 3.5),
      radius: def.radius,
      hitFlash: 0,
    });
  }

  offerUpgrades() {
    const pool = shuffle(this.rng, UPGRADES.slice());
    this.upgradeChoices = pool.slice(0, 3);
    this.phase = PHASE.UPGRADE;
  }

  chooseUpgrade(i) {
    const card = this.upgradeChoices[i];
    if (!card) return false;
    card.apply(this.stats, this);
    this.upgradeChoices = [];
    this.phase = PHASE.PLAYING;
    this.nextWave();
    return true;
  }

  addScore(base, x, y, label) {
    const mult = Math.max(1, this.combo);
    const pts = base * mult;
    this.score += pts;
    if (label !== false) this.floaters.push({ x, y, text: `+${pts}`, life: 0.9, color: mult > 1 ? '#ffd76a' : '#f2ead8' });
    return pts;
  }

  burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const v = range(this.rng, 20, speed || 140);
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: range(this.rng, 0.3, 0.8), maxLife: 0.8, size: range(this.rng, 1.5, 3.5), color,
      });
    }
  }

  dropDew(x, y, kind) {
    const roll = this.rng();
    if (roll < 0.18) {
      this.drops.push({ kind: 'ember', x, y, vx: range(this.rng, -20, 20), vy: range(this.rng, -40, -10), life: 9 });
    } else {
      this.drops.push({ kind: 'dew', x, y, vx: range(this.rng, -20, 20), vy: range(this.rng, -40, -10), life: 9 });
    }
  }

  killMoth(moth, index) {
    const def = moth.def;
    this.moths.splice(index, 1);
    this.kills++;
    this.combo++;
    this.comboTimer = SCORE.comboWindow;
    this.burst(moth.x, moth.y, def.wing, 12, 160);
    this.burst(moth.x, moth.y, COLORS.bolt, 6, 110);
    this.addScore(def.score, moth.x, moth.y);
    this.dropDew(moth.x, moth.y, moth.kind);
    if (moth.kind === 'splitter') {
      for (let i = 0; i < 2; i++) {
        const mite = MOTHS.mite;
        this.moths.push({
          kind: 'mite', def: mite, x: moth.x + (i === 0 ? -14 : 14), y: moth.y,
          hp: 1, speed: mite.speed, wobble: this.rng() * 6.28, wobbleSpeed: 3,
          radius: mite.radius, hitFlash: 0,
        });
      }
    }
  }

  damageLantern(moth, index) {
    this.moths.splice(index, 1);
    this.light = Math.max(0, this.light - moth.def.damage);
    this.shake = 10;
    this.flash = 0.35;
    this.lanternPulse = 1;
    this.combo = 0;
    this.burst(moth.x, moth.y, COLORS.danger, 16, 180);
    this.floaters.push({ x: LANTERN.x, y: LANTERN.y - 52, text: `-${moth.def.damage}`, life: 1, color: COLORS.danger });
    if (this.light <= 0) this.endGame(false);
  }

  endGame(won) {
    this.phase = won ? PHASE.VICTORY : PHASE.GAMEOVER;
    this.waveActive = false;
    this.moths = [];
    this.bolts = [];
    if (this.score > this.best) {
      this.best = this.score;
      try { localStorage.setItem('emberwisp-best', String(this.best)); } catch (e) { /* ignore */ }
    }
  }

  fireBolt() {
    const p = this.player;
    const spread = this.stats.bolts > 1 ? 0.14 : 0;
    for (let i = 0; i < this.stats.bolts; i++) {
      const off = (i - (this.stats.bolts - 1) / 2) * spread;
      const a = p.aim + off;
      this.bolts.push({
        x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20,
        vx: Math.cos(a) * this.stats.boltSpeed, vy: Math.sin(a) * this.stats.boltSpeed,
        radius: this.stats.boltRadius, damage: this.stats.boltDamage,
        pierce: this.stats.pierce, life: PLAYER.boltLife, hitSet: new Set(),
      });
    }
    this.shotsFired += this.stats.bolts;
    p.fireTimer = this.stats.fireInterval;
  }

  update(dt, input, sound) {
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.4);
    if (this.lanternPulse > 0) this.lanternPulse = Math.max(0, this.lanternPulse - dt * 1.2);
    if (this.waveBanner > 0) this.waveBanner -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Particles and floaters always animate, in every phase.
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= 0.96; pt.vy *= 0.96;
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }

    if (this.phase === PHASE.TITLE) {
      // Attract mode: moths drift past the lantern, never hurting it.
      if (this.moths.length < 7 && this.rng() < dt * 1.2) this.spawnMoth(pick(this.rng, ['dusky', 'swift', 'splitter']));
      this.updateMoths(dt, true);
      return;
    }
    if (this.phase !== PHASE.PLAYING) return;

    const p = this.player;
    // Movement: WASD / arrows, smooth acceleration and friction.
    let ax = 0, ay = 0;
    if (input.down('w', 'arrowup')) ay -= 1;
    if (input.down('s', 'arrowdown')) ay += 1;
    if (input.down('a', 'arrowleft')) ax -= 1;
    if (input.down('d', 'arrowright')) ax += 1;
    if (ax !== 0 || ay !== 0) {
      const len = Math.hypot(ax, ay);
      p.vx += (ax / len) * PLAYER.accel * dt;
      p.vy += (ay / len) * PLAYER.accel * dt;
    }
    p.vx *= Math.pow(PLAYER.friction, dt * 60);
    p.vy *= Math.pow(PLAYER.friction, dt * 60);
    const spd = Math.hypot(p.vx, p.vy);
    if (spd > this.stats.maxSpeed) { p.vx *= this.stats.maxSpeed / spd; p.vy *= this.stats.maxSpeed / spd; }
    p.x = Math.max(18, Math.min(VIEW.w - 18, p.x + p.vx * dt));
    p.y = Math.max(18, Math.min(VIEW.h - 18, p.y + p.vy * dt));
    p.aim = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);
    p.trail.push({ x: p.x, y: p.y, life: 0.28 });
    if (p.trail.length > 14) p.trail.shift();
    for (const t of p.trail) t.life -= dt;

    // Firing.
    p.fireTimer -= dt;
    if (input.firing && p.fireTimer <= 0) {
      this.fireBolt();
      if (sound) sound.shoot();
    }

    // Spawning.
    if (this.waveActive) {
      if (this.spawnQueue.length > 0) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          const next = this.spawnQueue.shift();
          this.spawnMoth(next.kind);
          this.spawnTimer = next.gap;
        }
      } else if (this.moths.length === 0) {
        this.waveActive = false;
        this.score += SCORE.waveClearBonus(this.wave);
        this.floaters.push({ x: VIEW.w / 2, y: 150, text: `Wave ${this.wave} clear! +${SCORE.waveClearBonus(this.wave)}`, life: 1.6, color: '#ffe27a' });
        if (sound) sound.waveClear();
        if (this.wave >= WAVES) this.endGame(true);
        else this.offerUpgrades();
      }
    }

    this.updateMoths(dt, false, sound);
    this.updateBolts(dt, sound);
    this.updateDrops(dt, sound);
  }

  updateMoths(dt, harmless, sound) {
    for (let i = this.moths.length - 1; i >= 0; i--) {
      const m = this.moths[i];
      m.wobble += m.wobbleSpeed * dt;
      const dx = LANTERN.x - m.x;
      const dy = LANTERN.y - m.y;
      const d = Math.hypot(dx, dy) || 1;
      const wob = Math.sin(m.wobble) * 26;
      const px = -dy / d;
      const py = dx / d;
      m.x += (dx / d * m.speed + px * wob * 0.6) * dt;
      m.y += (dy / d * m.speed + py * wob * 0.6) * dt;
      if (m.hitFlash > 0) m.hitFlash -= dt * 4;
      // Thorn aura: touching the wisp burns the moth.
      if (!harmless && this.stats.thorns > 0) {
        const pd = Math.hypot(m.x - this.player.x, m.y - this.player.y);
        if (pd < m.radius + PLAYER.radius + 6) {
          m.hp -= this.stats.thorns * dt * 2;
          if (m.hp <= 0) { this.killMoth(m, i); if (sound) sound.mothDown(); continue; }
        }
      }
      if (d < LANTERN.radius + m.radius * 0.6) {
        if (harmless) { this.moths.splice(i, 1); this.burst(m.x, m.y, m.def.wing, 8, 90); }
        else { this.damageLantern(m, i); if (sound) sound.lanternHit(); }
      }
    }
  }

  updateBolts(dt, sound) {
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > VIEW.w + 20 || b.y < -20 || b.y > VIEW.h + 20) {
        this.bolts.splice(i, 1);
        continue;
      }
      for (let j = this.moths.length - 1; j >= 0; j--) {
        const m = this.moths[j];
        if (b.hitSet.has(m)) continue;
        const d = Math.hypot(m.x - b.x, m.y - b.y);
        if (d < m.radius + b.radius) {
          b.hitSet.add(m);
          this.shotsHit++;
          m.hp -= b.damage;
          m.hitFlash = 1;
          this.burst(b.x, b.y, COLORS.bolt, 4, 90);
          if (sound) sound.hit();
          if (m.hp <= 0) { this.killMoth(m, j); if (sound) sound.mothDown(); }
          if (b.pierce > 0) { b.pierce--; } else { this.bolts.splice(i, 1); }
          break;
        }
      }
    }
  }

  updateDrops(dt, sound) {
    const p = this.player;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      const dx = p.x - d.x;
      const dy = p.y - d.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < this.stats.magnet) {
        d.vx += (dx / dist) * 900 * dt;
        d.vy += (dy / dist) * 900 * dt;
      } else {
        d.vx *= 0.94; d.vy *= 0.94;
      }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
      if (d.life <= 0) { this.drops.splice(i, 1); continue; }
      if (dist < PLAYER.radius + 12) {
        this.drops.splice(i, 1);
        if (d.kind === 'dew') {
          this.dew++;
          this.addScore(SCORE.dewValue, d.x, d.y, false);
          if (sound) sound.dew();
        } else {
          this.light = Math.min(LANTERN.maxLight, this.light + SCORE.emberHeal);
          this.floaters.push({ x: d.x, y: d.y, text: `+${SCORE.emberHeal} light`, life: 0.9, color: COLORS.ember });
          if (sound) sound.ember();
        }
      }
    }
  }
}
