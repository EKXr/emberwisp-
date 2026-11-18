// Emberwisp — tuning, balance and content tables.
// One file, one job: every number the game balances on lives here.

export const VIEW = { w: 960, h: 600 };

export const LANTERN = {
  x: VIEW.w / 2,
  y: VIEW.h / 2,
  radius: 34,
  maxLight: 100,
  startLight: 100,
};

export const PLAYER = {
  radius: 13,
  accel: 2600,
  maxSpeed: 330,
  friction: 0.86,
  fireInterval: 0.16,
  boltSpeed: 640,
  boltRadius: 5,
  boltDamage: 1,
  boltLife: 0.9,
};

// Moth kinds: hp, speed (px/s), radius, damage to the lantern, score, tint.
export const MOTHS = {
  dusky:   { hp: 1, speed: 42, radius: 13, damage: 6,  score: 50,  color: '#8d7fb8', wing: '#b7a8e0' },
  swift:   { hp: 1, speed: 92, radius: 10, damage: 5,  score: 80,  color: '#6f9fd8', wing: '#a8c8f0' },
  bulwark: { hp: 5, speed: 26, radius: 20, damage: 14, score: 200, color: '#b0708a', wing: '#d8a0b8' },
  splitter:{ hp: 2, speed: 55, radius: 15, damage: 8,  score: 120, color: '#7fb890', wing: '#a8e0b8' },
  mite:    { hp: 1, speed: 70, radius: 7,  damage: 3,  score: 30,  color: '#c8a878', wing: '#e8d0a0' },
};

export const WAVES = 10;

// Wave composition: how many of each kind, and the spawn gap in seconds.
export function wavePlan(wave) {
  const n = (base, per) => Math.round(base + per * (wave - 1));
  const plan = [];
  const push = (kind, count, gap) => { if (count > 0) plan.push({ kind, count, gap }); };
  push('dusky', n(5, 2.2), 0.95);
  push('swift', wave >= 2 ? n(0, 1.6) : 0, 0.8);
  push('splitter', wave >= 3 ? n(0, 1.1) : 0, 1.1);
  push('bulwark', wave >= 4 ? n(0, 0.8) : 0, 1.6);
  push('mite', wave >= 6 ? n(0, 2.0) : 0, 0.45);
  return plan;
}

// Upgrade cards offered between waves. `apply` mutates the run's stats.
export const UPGRADES = [
  {
    id: 'rapid', name: 'Rapid Wick', blurb: 'Fire 25% faster.',
    apply: (s) => { s.fireInterval *= 0.75; },
  },
  {
    id: 'twin', name: 'Twin Flame', blurb: 'Shoot two bolts at once.',
    apply: (s) => { s.bolts += 1; },
  },
  {
    id: 'wide', name: 'Wide Glow', blurb: 'Bolts are bigger and pierce one moth.',
    apply: (s) => { s.boltRadius += 3; s.pierce += 1; },
  },
  {
    id: 'swift', name: 'Swift Wisp', blurb: 'Move 25% faster.',
    apply: (s) => { s.maxSpeed *= 1.25; },
  },
  {
    id: 'mend', name: 'Lantern Mend', blurb: 'Restore 35 lantern light now.',
    apply: (s, run) => { run.light = Math.min(LANTERN.maxLight, run.light + 35); },
  },
  {
    id: 'thorn', name: 'Thorn Light', blurb: 'Moths touching you take damage.',
    apply: (s) => { s.thorns += 1; },
  },
  {
    id: 'heavy', name: 'Heavy Ember', blurb: 'Bolts deal +1 damage.',
    apply: (s) => { s.boltDamage += 1; },
  },
  {
    id: 'magnet', name: 'Dew Magnet', blurb: 'Dew flies to you from farther away.',
    apply: (s) => { s.magnet += 120; },
  },
];

export const SCORE = {
  dewValue: 10,
  emberHeal: 6,
  waveClearBonus: (wave) => 100 * wave,
  comboWindow: 2.5,
  comboMax: 5,
};

export const COLORS = {
  skyTop: '#0b1026',
  skyBottom: '#1c1440',
  groundGlow: '#f7c948',
  lanternCore: '#ffe9a8',
  lanternRing: '#f7b733',
  wisp: '#fff3c4',
  wispTrail: '#ffd76a',
  bolt: '#ffe27a',
  dew: '#7fe0c3',
  ember: '#ff9d5c',
  hudPanel: 'rgba(8, 10, 28, 0.72)',
  hudText: '#f2ead8',
  danger: '#ff6b6b',
};
