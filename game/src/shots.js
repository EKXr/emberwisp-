// Emberwisp — deterministic screenshot setups. A `?shot=` query puts the
// game into a fixed, attractive state and freezes it there, so the
// screenshots are real renders of the game code and repeatable:
//   ?shot=start  title screen, moths drifting in the dark
//   ?shot=play   mid-wave action with a full HUD
//   ?shot=storm  a later, heavier wave for the cover
//   ?shot=end    the game-over screen with a score
//   ?shot=win    the victory screen
// `&seed=` picks the random seed. Nothing here is used by normal play.

import { PHASE } from './world.js';
import { MOTHS } from './config.js';

function placeMoth(world, kind, x, y) {
  const def = MOTHS[kind];
  world.moths.push({
    kind, def, x, y, hp: def.hp, speed: def.speed,
    wobble: world.rng() * 6.28, wobbleSpeed: 2.4, radius: def.radius, hitFlash: 0,
  });
}

function stagePlay(world, opts) {
  world.phase = PHASE.PLAYING;
  world.wave = opts.wave;
  world.score = opts.score;
  world.dew = opts.dew;
  world.kills = opts.kills;
  world.light = opts.light;
  world.combo = opts.combo || 0;
  world.comboTimer = opts.combo ? 2 : 0;
  world.waveActive = true;
  world.waveBanner = 0;
  world.player.x = opts.px;
  world.player.y = opts.py;
  world.player.aim = opts.aim;
  for (const m of opts.moths) placeMoth(world, m[0], m[1], m[2]);
  for (const b of opts.bolts || []) {
    world.bolts.push({ x: b[0], y: b[1], vx: b[2], vy: b[3], radius: 6, damage: 1, pierce: 0, life: 0.8, hitSet: new Set() });
  }
  for (const d of opts.drops || []) {
    world.drops.push({ kind: d[0], x: d[1], y: d[2], vx: 0, vy: 0, life: 8 });
  }
  world.burst(opts.px + 60, opts.py - 40, '#ffe27a', 10, 120);
}

export function applyShot(world, name) {
  if (name === 'start') {
    world.phase = PHASE.TITLE;
    world.best = 2450;
    // A few moths drifting past the lantern, as the attract mode shows.
    const spots = [[180, 120, 'dusky'], [700, 160, 'swift'], [820, 420, 'dusky'], [140, 460, 'splitter'], [620, 480, 'dusky']];
    for (const [x, y, kind] of spots) placeMoth(world, kind, x, y);
    return true;
  }
  if (name === 'play') {
    stagePlay(world, {
      wave: 4, score: 1250, dew: 18, kills: 23, light: 74, combo: 3,
      px: 330, py: 400, aim: -0.5,
      moths: [
        ['dusky', 560, 150], ['swift', 700, 260], ['dusky', 220, 180],
        ['splitter', 820, 380], ['bulwark', 640, 90], ['dusky', 120, 320],
        ['swift', 880, 200], ['mite', 480, 110],
      ],
      bolts: [[420, 350, 500, -300], [450, 330, 520, -260], [390, 370, 470, -330]],
      drops: [['dew', 520, 300], ['ember', 300, 250], ['dew', 660, 330]],
    });
    return true;
  }
  if (name === 'storm') {
    stagePlay(world, {
      wave: 7, score: 3420, dew: 41, kills: 58, light: 52, combo: 5,
      px: 300, py: 430, aim: -0.9,
      moths: [
        ['bulwark', 600, 130], ['dusky', 720, 200], ['swift', 180, 140],
        ['splitter', 840, 320], ['dusky', 90, 380], ['swift', 760, 480],
        ['bulwark', 420, 90], ['mite', 540, 220], ['mite', 580, 250],
        ['dusky', 880, 120], ['splitter', 150, 480], ['swift', 660, 420],
      ],
      bolts: [[400, 380, 480, -380], [430, 360, 500, -340], [370, 400, 450, -400], [460, 340, 520, -300]],
      drops: [['dew', 500, 280], ['dew', 620, 300], ['ember', 250, 300]],
    });
    return true;
  }
  if (name === 'end') {
    world.phase = PHASE.GAMEOVER;
    world.wave = 6;
    world.score = 2870;
    world.dew = 33;
    world.kills = 47;
    world.shotsFired = 210;
    world.shotsHit = 148;
    world.light = 0;
    world.best = 3120;
    return true;
  }
  if (name === 'win') {
    world.phase = PHASE.VICTORY;
    world.wave = 10;
    world.score = 9840;
    world.dew = 96;
    world.kills = 142;
    world.shotsFired = 640;
    world.shotsHit = 512;
    world.light = 41;
    world.best = 9840;
    return true;
  }
  return false;
}
