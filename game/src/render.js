// Emberwisp — all drawing. One canvas, no images: every sprite is drawn
// from paths, arcs and gradients, in the game's own palette.

import { VIEW, LANTERN, PLAYER, WAVES, COLORS } from './config.js';
import { PHASE } from './world.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  resize(cssW, cssH, dpr) {
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(world, input) {
    const ctx = this.ctx;
    const t = world.time;
    ctx.save();
    if (world.shake > 0) {
      ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
    }
    this.drawSky(ctx, world, t);
    this.drawLantern(ctx, world, t);
    this.drawDrops(ctx, world, t);
    this.drawMoths(ctx, world, t);
    this.drawBolts(ctx, world);
    if (world.phase === PHASE.PLAYING || world.phase === PHASE.UPGRADE) this.drawPlayer(ctx, world, input, t);
    this.drawParticles(ctx, world);
    this.drawFloaters(ctx, world);
    ctx.restore();
    if (world.flash > 0) {
      ctx.fillStyle = `rgba(255, 90, 90, ${world.flash * 0.35})`;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    }
    this.drawHud(ctx, world);
    if (world.phase === PHASE.TITLE) this.drawTitle(ctx, world, t);
    if (world.phase === PHASE.UPGRADE) this.drawUpgrades(ctx, world, input);
    if (world.phase === PHASE.GAMEOVER) this.drawEnd(ctx, world, false);
    if (world.phase === PHASE.VICTORY) this.drawEnd(ctx, world, true);
    if (world.waveBanner > 0 && world.phase === PHASE.PLAYING) this.drawWaveBanner(ctx, world);
  }

  drawSky(ctx, world, t) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
    g.addColorStop(0, COLORS.skyTop);
    g.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    // Twinkling stars.
    for (const s of world.stars) {
      const a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#e8e4ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Soft moon glow, upper right.
    const mg = ctx.createRadialGradient(830, 70, 4, 830, 70, 90);
    mg.addColorStop(0, 'rgba(240, 235, 255, 0.5)');
    mg.addColorStop(0.25, 'rgba(220, 214, 255, 0.16)');
    mg.addColorStop(1, 'rgba(220, 214, 255, 0)');
    ctx.fillStyle = mg;
    ctx.fillRect(720, -20, 220, 200);
    ctx.fillStyle = '#f4f0ff';
    ctx.beginPath();
    ctx.arc(830, 70, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(190, 182, 230, 0.7)';
    ctx.beginPath();
    ctx.arc(822, 64, 5, 0, Math.PI * 2);
    ctx.arc(838, 78, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Ground: a soft hill the lantern stands on.
    ctx.fillStyle = '#141b33';
    ctx.beginPath();
    ctx.moveTo(0, VIEW.h);
    ctx.quadraticCurveTo(VIEW.w / 2, VIEW.h - 96, VIEW.w, VIEW.h);
    ctx.lineTo(VIEW.w, VIEW.h);
    ctx.closePath();
    ctx.fill();
  }

  drawLantern(ctx, world, t) {
    const { x, y } = LANTERN;
    const lightFrac = world.light / LANTERN.maxLight;
    const flicker = 0.92 + 0.08 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
    const glowR = 150 + world.lanternPulse * 60;
    const glow = ctx.createRadialGradient(x, y, 10, x, y, glowR);
    glow.addColorStop(0, `rgba(255, 214, 120, ${0.5 * flicker * (0.25 + 0.75 * lightFrac)})`);
    glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2);
    // Post.
    ctx.strokeStyle = '#3a2c1c';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y + 22);
    ctx.lineTo(x, y + 78);
    ctx.stroke();
    // Base.
    ctx.fillStyle = '#2c2114';
    ctx.beginPath();
    ctx.ellipse(x, y + 82, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cage.
    ctx.fillStyle = '#241a10';
    ctx.beginPath();
    ctx.moveTo(x - 26, y - 18);
    ctx.lineTo(x - 18, y - 34);
    ctx.lineTo(x + 18, y - 34);
    ctx.lineTo(x + 26, y - 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 28, y - 20, 56, 6);
    // Flame: bright while the light lasts, a dying ember when it does not.
    const core = ctx.createRadialGradient(x, y - 4, 2, x, y - 4, 26);
    if (lightFrac > 0.25) {
      core.addColorStop(0, '#fff8dc');
      core.addColorStop(0.5, COLORS.lanternCore);
      core.addColorStop(1, 'rgba(247, 183, 51, 0.15)');
    } else {
      core.addColorStop(0, '#ffb37a');
      core.addColorStop(0.6, '#c65a3a');
      core.addColorStop(1, 'rgba(120, 40, 20, 0.1)');
    }
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 15 + 4 * flicker * lightFrac, 20 + 5 * flicker * lightFrac, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cage bars.
    ctx.strokeStyle = 'rgba(20, 12, 6, 0.85)';
    ctx.lineWidth = 2.5;
    for (const off of [-16, 0, 16]) {
      ctx.beginPath();
      ctx.moveTo(x + off, y - 32);
      ctx.lineTo(x + off * 0.7, y + 2);
      ctx.stroke();
    }
  }

  drawDrops(ctx, world, t) {
    for (const d of world.drops) {
      const bob = Math.sin(t * 4 + d.x) * 2;
      if (d.kind === 'dew') {
        ctx.fillStyle = COLORS.dew;
        ctx.beginPath();
        ctx.arc(d.x, d.y + bob, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(d.x - 1.5, d.y + bob - 1.5, 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = COLORS.ember;
        ctx.beginPath();
        ctx.arc(d.x, d.y + bob, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        ctx.arc(d.x, d.y + bob, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawMoths(ctx, world, t) {
    for (const m of world.moths) {
      const flap = Math.sin(t * 14 + m.wobble * 3) * 0.55;
      const facing = Math.atan2(LANTERN.y - m.y, LANTERN.x - m.x);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(facing);
      // Wings, flapping.
      ctx.fillStyle = m.def.wing;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.rotate(side * flap * 0.5);
        ctx.beginPath();
        ctx.ellipse(side * 2, -m.radius * 0.55, m.radius * 0.9, m.radius * 0.55, side * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // Body.
      ctx.fillStyle = m.hitFlash > 0 ? '#ffffff' : m.def.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, m.radius * 0.75, m.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes: two dim dots that glow in the dark.
      ctx.fillStyle = '#ff5a6e';
      ctx.beginPath();
      ctx.arc(m.radius * 0.45, -3, 1.8, 0, Math.PI * 2);
      ctx.arc(m.radius * 0.45, 3, 1.8, 0, Math.PI * 2);
      ctx.fill();
      // Antennae: two thin feelers, so the shape reads as a moth.
      ctx.strokeStyle = m.def.wing;
      ctx.lineWidth = 1.5;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(m.radius * 0.6, side * 4);
        ctx.quadraticCurveTo(m.radius * 1.1, side * 9, m.radius * 1.4, side * 12);
        ctx.stroke();
      }
      // Bulwark shell ring.
      if (m.kind === 'bulwark') {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, m.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      // HP pips for tough moths.
      if (m.def.hp > 2 && m.hp < m.def.hp) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(m.x - 14, m.y - m.radius - 10, 28, 4);
        ctx.fillStyle = '#ff8fa3';
        ctx.fillRect(m.x - 14, m.y - m.radius - 10, 28 * (m.hp / m.def.hp), 4);
      }
    }
  }

  drawBolts(ctx, world) {
    for (const b of world.bolts) {
      const ang = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(ang);
      ctx.fillStyle = 'rgba(255, 226, 122, 0.35)';
      ctx.beginPath();
      ctx.ellipse(-8, 0, 12, b.radius + 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.bolt;
      ctx.beginPath();
      ctx.ellipse(0, 0, b.radius + 5, b.radius, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(2, 0, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawPlayer(ctx, world, input, t) {
    const p = world.player;
    // Trail.
    for (const tr of p.trail) {
      if (tr.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, tr.life / 0.28) * 0.35;
      ctx.fillStyle = COLORS.wispTrail;
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, 7 * (tr.life / 0.28), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Aim line, faint, only while playing.
    if (world.phase === PHASE.PLAYING) {
      ctx.strokeStyle = 'rgba(255, 227, 122, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.aim) * 46, p.y + Math.sin(p.aim) * 46);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Glow.
    const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 34);
    glow.addColorStop(0, 'rgba(255, 243, 196, 0.55)');
    glow.addColorStop(1, 'rgba(255, 243, 196, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - 34, p.y - 34, 68, 68);
    // Body: a little flame-wisp with a tail.
    ctx.fillStyle = COLORS.wisp;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(p.aim) * 8, p.y - Math.sin(p.aim) * 8);
    ctx.quadraticCurveTo(
      p.x - Math.cos(p.aim) * 26 + Math.sin(t * 9) * 4,
      p.y - Math.sin(p.aim) * 26 + Math.cos(t * 9) * 4,
      p.x - Math.cos(p.aim) * 20, p.y - Math.sin(p.aim) * 20,
    );
    ctx.closePath();
    ctx.fill();
    // Face: two eyes looking where you aim.
    ctx.fillStyle = '#2b2118';
    const ex = Math.cos(p.aim) * 3;
    const ey = Math.sin(p.aim) * 3;
    ctx.beginPath();
    ctx.arc(p.x - 4 + ex, p.y - 3 + ey, 2.2, 0, Math.PI * 2);
    ctx.arc(p.x + 4 + ex, p.y - 3 + ey, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawParticles(ctx, world) {
    for (const pt of world.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawFloaters(ctx, world) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px Georgia, serif';
    for (const f of world.floaters) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  drawHud(ctx, world) {
    if (world.phase === PHASE.TITLE) return;
    ctx.save();
    // Top bar.
    ctx.fillStyle = COLORS.hudPanel;
    roundRect(ctx, 10, 10, VIEW.w - 20, 46, 10);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 17px Georgia, serif';
    ctx.fillText(`Wave ${Math.min(world.wave, WAVES)} / ${WAVES}`, 24, 33);
    ctx.font = '16px Georgia, serif';
    ctx.fillText(`Score ${world.score.toLocaleString('en-US')}`, 150, 33);
    ctx.fillText(`Dew ${world.dew}`, 300, 33);
    if (world.combo > 1) {
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 16px Georgia, serif';
      ctx.fillText(`Combo x${Math.min(world.combo, 5)}`, 400, 33);
    }
    // Lantern light bar, right side.
    const bx = VIEW.w - 260;
    const bw = 180;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, bx, 22, bw, 14, 7);
    ctx.fill();
    const frac = world.light / LANTERN.maxLight;
    ctx.fillStyle = frac > 0.5 ? '#ffd76a' : frac > 0.25 ? '#ff9d5c' : '#ff6b6b';
    if (frac > 0) {
      roundRect(ctx, bx, 22, bw * frac, 14, 7);
      ctx.fill();
    }
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '13px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Lantern ${Math.ceil(world.light)}`, VIEW.w - 24, 29);
    ctx.textAlign = 'left';
    ctx.font = '12px Georgia, serif';
    ctx.fillStyle = 'rgba(242, 234, 216, 0.75)';
    ctx.fillText('WASD move · mouse aim · hold click / Space to shoot · P pause · M mute', 24, 74);
    ctx.restore();
  }

  drawWaveBanner(ctx, world) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, world.waveBanner);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText(`Wave ${world.wave}`, VIEW.w / 2, 150);
    ctx.fillStyle = 'rgba(242, 234, 216, 0.9)';
    ctx.font = '17px Georgia, serif';
    ctx.fillText(world.wave === WAVES ? 'The last wave — hold the light!' : 'The moths are coming…', VIEW.w / 2, 182);
    ctx.restore();
  }

  panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(8, 10, 28, 0.78)';
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 106, 0.45)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, 14);
    ctx.stroke();
  }

  drawTitle(ctx, world, t) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 8, 22, 0.55)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillText('EMBERWISP', VIEW.w / 2, 168);
    ctx.fillStyle = '#f2ead8';
    ctx.font = 'italic 21px Georgia, serif';
    ctx.fillText('Guard the last lantern through ten waves of night.', VIEW.w / 2, 206);
    this.panel(ctx, VIEW.w / 2 - 260, 240, 520, 132);
    ctx.fillStyle = '#f2ead8';
    ctx.font = '16px Georgia, serif';
    ctx.fillText('WASD / arrows — drift your wisp', VIEW.w / 2, 272);
    ctx.fillText('Mouse — aim · hold click or Space — shoot light', VIEW.w / 2, 300);
    ctx.fillText('Moths that reach the lantern drain its light.', VIEW.w / 2, 328);
    ctx.fillText('Gather dew for score. Between waves, pick an upgrade.', VIEW.w / 2, 352);
    const pulse = 0.75 + 0.25 * Math.sin(t * 4);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('Click or press Enter to begin', VIEW.w / 2, 424);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(242, 234, 216, 0.8)';
    ctx.font = '14px Georgia, serif';
    ctx.fillText(world.best > 0 ? `Best score: ${world.best.toLocaleString('en-US')}` : 'No lantern has fallen yet — make it stay that way.', VIEW.w / 2, 462);
    ctx.fillStyle = 'rgba(242, 234, 216, 0.55)';
    ctx.font = '13px Georgia, serif';
    ctx.fillText('An original game — art and sound drawn and synthesized in code.', VIEW.w / 2, 556);
    ctx.restore();
  }

  drawUpgrades(ctx, world, input) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 8, 22, 0.6)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText(`Wave ${world.wave} clear!`, VIEW.w / 2, 108);
    ctx.fillStyle = '#f2ead8';
    ctx.font = '18px Georgia, serif';
    ctx.fillText('Choose one blessing for the lantern:', VIEW.w / 2, 142);
    const cw = 250, ch = 190, gap = 26;
    const total = cw * 3 + gap * 2;
    const x0 = (VIEW.w - total) / 2;
    const y0 = 190;
    world.upgradeChoices.forEach((card, i) => {
      const x = x0 + i * (cw + gap);
      const hover = input.mouseX >= x && input.mouseX <= x + cw && input.mouseY >= y0 && input.mouseY <= y0 + ch;
      ctx.fillStyle = hover ? 'rgba(40, 34, 70, 0.95)' : 'rgba(14, 16, 40, 0.92)';
      roundRect(ctx, x, y0, cw, ch, 12);
      ctx.fill();
      ctx.strokeStyle = hover ? '#ffd76a' : 'rgba(255, 215, 106, 0.4)';
      ctx.lineWidth = hover ? 2.5 : 1.5;
      roundRect(ctx, x, y0, cw, ch, 12);
      ctx.stroke();
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 15px Georgia, serif';
      ctx.fillText(`Press ${i + 1}`, x + cw / 2, y0 + 30);
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 21px Georgia, serif';
      ctx.fillText(card.name, x + cw / 2, y0 + 66);
      ctx.fillStyle = '#f2ead8';
      ctx.font = '15px Georgia, serif';
      this.wrapText(ctx, card.blurb, x + cw / 2, y0 + 100, cw - 36, 22);
    });
    ctx.fillStyle = 'rgba(242, 234, 216, 0.75)';
    ctx.font = '14px Georgia, serif';
    ctx.fillText('Click a card or press 1, 2 or 3.', VIEW.w / 2, 430);
    ctx.restore();
  }

  wrapText(ctx, text, cx, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, cx, yy);
        line = w;
        yy += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, cx, yy);
  }

  drawEnd(ctx, world, won) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 8, 22, 0.62)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.textAlign = 'center';
    if (won) {
      ctx.fillStyle = '#ffe27a';
      ctx.font = 'bold 52px Georgia, serif';
      ctx.fillText('DAWN BREAKS', VIEW.w / 2, 150);
      ctx.fillStyle = '#f2ead8';
      ctx.font = 'italic 20px Georgia, serif';
      ctx.fillText('Ten waves held. The lantern still burns.', VIEW.w / 2, 190);
    } else {
      ctx.fillStyle = '#ff8fa3';
      ctx.font = 'bold 52px Georgia, serif';
      ctx.fillText('THE LIGHT WENT OUT', VIEW.w / 2, 150);
      ctx.fillStyle = '#f2ead8';
      ctx.font = 'italic 20px Georgia, serif';
      ctx.fillText(`The moths reached the lantern on wave ${world.wave}.`, VIEW.w / 2, 190);
    }
    this.panel(ctx, VIEW.w / 2 - 220, 226, 440, 168);
    ctx.fillStyle = '#f2ead8';
    ctx.font = '17px Georgia, serif';
    ctx.fillText(`Score: ${world.score.toLocaleString('en-US')}`, VIEW.w / 2, 264);
    ctx.fillText(`Best: ${world.best.toLocaleString('en-US')}`, VIEW.w / 2, 294);
    ctx.fillText(`Moths turned back: ${world.kills}`, VIEW.w / 2, 324);
    const acc = world.shotsFired > 0 ? Math.round((world.shotsHit / world.shotsFired) * 100) : 0;
    ctx.fillText(`Accuracy: ${acc}%  ·  Dew gathered: ${world.dew}`, VIEW.w / 2, 354);
    const pulse = 0.75 + 0.25 * Math.sin(world.time * 4);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('Press R or click to play again', VIEW.w / 2, 448);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
