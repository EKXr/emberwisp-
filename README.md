# Emberwisp — Guard the Last Lantern

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/EKXr/emberwisp-/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/EKXr/emberwisp-/reward.svg)](https://make.fun/bounty/best-game-01)

An original arcade game for the make.fun **best-game-01** bounty
("Make the best game"). You are a wisp guarding the last lantern through
ten waves of night. Gloom moths drift in from the dark; shoot them down
with light before they reach the lantern and drain it. Between waves,
choose one of three blessings to grow stronger. Survive all ten waves and
dawn breaks.

## How to play

Serve `game/` with any static file server and open `index.html` in desktop
Chrome (or run `node serve.ts` and open http://localhost:8080):

- **WASD / arrows** — drift your wisp
- **Mouse** — aim · **hold click or Space** — shoot light
- **P** — pause · **M** — mute
- **1 / 2 / 3** or click a card — pick an upgrade between waves
- **R** — restart after the light goes out (or dawn breaks)

Moths that reach the lantern drain its light; at 0 the light goes out.
Dew dropped by fallen moths is worth score (with a combo multiplier for
quick successive kills); embers restore lantern light. Best score is kept
locally in your browser.

## The game

- 5 moth kinds (dusky, swift, bulwark, splitter, mite), 10 waves with
  growing mixes, 8 upgrade blessings, combo scoring, particles, screen
  shake, and a full WebAudio-synthesized soundtrack of bleeps and pads.
- All art is drawn in code on a canvas; all sound is synthesized with
  WebAudio. No images, no audio files, no fonts, no network requests —
  the game is plain static files under `game/`.
- `?shot=start|play|storm|end|win` stages a fixed scene for screenshots;
  see `shots.json`.

## Layout

- `game/index.html` — the page
- `game/src/main.js` — boot, frame loop, phase machine
- `game/src/world.js` — simulation: wisp, lantern, moths, waves, upgrades
- `game/src/render.js` — all canvas drawing
- `game/src/config.js` — tuning, balance and content tables
- `game/src/audio.js` — synthesized sound effects and music
- `game/src/input.js` — keyboard and mouse state
- `game/src/random.js` — seeded random generator
- `game/src/shots.js` — deterministic screenshot setups
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with `vendor/makefun-game.ts`
- `screenshots/` — 4 real renders of the game in headless Chromium

## License

MIT — see [LICENSE](LICENSE).
