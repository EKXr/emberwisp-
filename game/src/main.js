// Emberwisp — boot, the frame loop, and the phase machine (title, play,
// upgrade picks, pause, game over, victory). The simulation is world.js;
// the drawing is render.js; this file only wires them together.

import { VIEW } from './config.js';
import { World, PHASE } from './world.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const world = new World(20261118);
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const sound = new SoundBank();

// Read-only handle for local play-testing (does not affect the game).
window.__emberwisp = world;

let paused = false;
let shotMode = null;

// Fit the 960x600 view into the window, letterboxed, at device pixel
// ratio, and keep the input mapping in step.
function fit() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const scale = Math.min(window.innerWidth / VIEW.w, window.innerHeight / VIEW.h);
  const cssW = Math.round(VIEW.w * scale);
  const cssH = Math.round(VIEW.h * scale);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.style.left = `${Math.round((window.innerWidth - cssW) / 2)}px`;
  canvas.style.top = `${Math.round((window.innerHeight - cssH) / 2)}px`;
  renderer.resize(VIEW.w, VIEW.h, dpr * scale);
  // The canvas is centered with CSS left/top, so the mouse mapping uses
  // the canvas's own bounding box; the transform only needs the scale.
  input.setTransform(scale, 0, 0);
}
window.addEventListener('resize', fit);
fit();

// Screenshot mode: ?shot=start|play|storm|end|win freezes a staged scene.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  shotMode = shot;
  applyShot(world, shot);
  // Let the staged scene settle for a few frames (trails, particles),
  // then hold it still: the screenshot is a frozen frame.
  let settle = 0;
  const settleLoop = () => {
    if (settle < 12) {
      world.update(1 / 60, input, null);
      settle++;
      requestAnimationFrame(settleLoop);
    }
  };
  settleLoop();
  window.__emberwispShotReady = true;
}

function onFirstGesture() {
  sound.ensure();
}

function handlePhaseInput() {
  if (input.wasPressed('m')) {
    sound.ensure();
    sound.toggleMute();
  }
  if (input.wasPressed('p', 'escape')) {
    if (world.phase === PHASE.PLAYING || paused) {
      paused = !paused;
    }
  }
  if (world.phase === PHASE.TITLE) {
    if (input.wasPressed('enter') || input.clicked) {
      onFirstGesture();
      sound.click();
      world.startGame();
    }
    return;
  }
  if (world.phase === PHASE.UPGRADE) {
    if (input.wasPressed('1', '2', '3')) {
      const i = Number(input.pressed.has('1') ? 0 : input.pressed.has('2') ? 1 : 2);
      onFirstGesture();
      if (world.chooseUpgrade(i)) sound.upgrade();
      return;
    }
    if (input.clicked) {
      const cw = 250, ch = 190, gap = 26;
      const total = cw * 3 + gap * 2;
      const x0 = (VIEW.w - total) / 2;
      const y0 = 190;
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * (cw + gap);
        if (input.mouseX >= x && input.mouseX <= x + cw && input.mouseY >= y0 && input.mouseY <= y0 + ch) {
          onFirstGesture();
          if (world.chooseUpgrade(i)) sound.upgrade();
          return;
        }
      }
    }
    return;
  }
  if (world.phase === PHASE.GAMEOVER || world.phase === PHASE.VICTORY) {
    if (input.wasPressed('r', 'enter') || input.clicked) {
      onFirstGesture();
      sound.click();
      world.startGame();
    }
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  handlePhaseInput();
  if (!paused && !shotMode) {
    world.update(dt, input, sound);
  } else if (shotMode) {
    // Frozen frame: only the clock moves, so twinkles keep shimmering
    // while nothing plays. A screenshot takes one still frame.
    world.time += dt;
  }
  renderer.draw(world, input);
  if (paused) {
    const ctx = renderer.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 8, 22, 0.55)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.fillText('PAUSED', VIEW.w / 2, VIEW.h / 2 - 8);
    ctx.fillStyle = '#f2ead8';
    ctx.font = '17px Georgia, serif';
    ctx.fillText('Press P to keep playing', VIEW.w / 2, VIEW.h / 2 + 28);
    ctx.restore();
  }
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
