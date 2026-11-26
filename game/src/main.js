// main.js — the game loop and its states: title, flying, landed, crashed,
// out of fuel. Fixed-step physics, pause, restart, and the deterministic
// ?shot= scenes used for the entry's screenshots.

import { CONFIG } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { freshPlane, stepPlane, checkRings } from './physics.js';
import { freshRings } from './terrain.js';
import { renderWorld } from './render.js';
import { renderHud, renderTitle, renderEnd } from './hud.js';
import { shotScene } from './shots.js';

const C = CONFIG;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = C.viewWidth;
const H = C.viewHeight;

const params = new URLSearchParams(location.search);
const shot = shotScene(params.get('shot'));

const input = createInput(canvas);
const audio = createAudio();

let plane = freshPlane();
let rings = freshRings();
let paused = false;
let frozenShot = null;
let lastWarnAt = 0;

if (shot) {
  plane = shot.plane;
  rings = shot.rings;
  frozenShot = shot;
  paused = true;
}

function restart() {
  plane = freshPlane();
  rings = freshRings();
  paused = false;
  plane.state = 'flying';
}

function startFlying() {
  if (plane.state === 'title') {
    plane.state = 'flying';
    audio.unlock();
  }
}

const STEP = 1 / 60;
let last = performance.now();
let acc = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const ctl = input.read();

  if (ctl.restart) restart();
  if (ctl.pause && plane.state === 'flying') paused = !paused;
  if (ctl.start) { audio.unlock(); startFlying(); }

  if (!paused && !frozenShot && plane.state === 'flying') {
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      if (ctl.gear) plane.gearDown = !plane.gearDown;
      if (ctl.flaps) plane.flaps = !plane.flaps;
      const event = stepPlane(plane, ctl, STEP);
      const ring = checkRings(plane, rings);
      if (ring) audio.ring();
      if (event === 'landed') audio.touchdown();
      if (event === 'crashed' || event === 'outoffuel') audio.crash();
      if (event === 'stalled' && now - lastWarnAt > 900) {
        audio.warning();
        lastWarnAt = now;
      }
      if (plane.state !== 'flying') break;
    }
    audio.engine(plane.throttle, plane.speed);
  }

  // --- Draw ---
  ctx.clearRect(0, 0, W, H);
  renderWorld(ctx, plane, rings, W, H);
  if (plane.state === 'title') {
    renderHud(ctx, plane, rings, W, H);
    renderTitle(ctx, plane, W, H);
  } else if (plane.state === 'flying') {
    renderHud(ctx, plane, rings, W, H);
    if (paused && !frozenShot) {
      ctx.fillStyle = 'rgba(6, 14, 28, 0.45)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 40px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED — PRESS P TO FLY ON', W / 2, H / 2);
    }
  } else {
    renderHud(ctx, plane, rings, W, H);
    renderEnd(ctx, plane, W, H);
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
