// input.js — keyboard and mouse. Arrows/WASD fly, Shift/Ctrl work the
// throttle, G drops the gear, F the flaps, Space brakes, R restarts, P
// pauses. The mouse steers too: hold the pointer off-centre and the plane
// banks and pitches toward it; the wheel trims the throttle.

import { clamp } from './physics.js';

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, active: false, wheel: 0 };
  let wheelDelta = 0;

  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ShiftLeft: 'throttleUp', ShiftRight: 'throttleUp',
    ControlLeft: 'throttleDown', ControlRight: 'throttleDown',
    Space: 'brake',
  };

  function onKeyDown(e) {
    const name = KEYMAP[e.code];
    if (name) { keys.add(name); e.preventDefault(); }
    if (e.code === 'KeyG') keys.add('gearToggle');
    if (e.code === 'KeyF') keys.add('flapsToggle');
    if (e.code === 'KeyR') keys.add('restart');
    if (e.code === 'KeyP') keys.add('pauseToggle');
    if (e.code === 'Enter') keys.add('start');
  }
  function onKeyUp(e) {
    const name = KEYMAP[e.code];
    if (name) keys.delete(name);
  }
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) / rect.width - 0.5;
    mouse.y = (e.clientY - rect.top) / rect.height - 0.5;
    mouse.active = true;
  }
  function onWheel(e) {
    wheelDelta += e.deltaY < 0 ? 1 : -1;
    e.preventDefault();
  }
  function onMouseDown() { mouse.active = true; keys.add('start'); }
  function onMouseLeave() { mouse.active = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseleave', onMouseLeave);

  // Read the current control state for one physics step. Edge-triggered
  // keys (gear, flaps, restart, pause, start) are consumed here.
  function read() {
    let pitch = 0;
    let roll = 0;
    if (keys.has('up')) pitch += 1;
    if (keys.has('down')) pitch -= 1;
    if (keys.has('left')) roll -= 1;
    if (keys.has('right')) roll += 1;
    if (mouse.active && (Math.abs(mouse.x) > 0.06 || Math.abs(mouse.y) > 0.06)) {
      roll += clamp(mouse.x * 2.4, -1, 1);
      pitch += clamp(-mouse.y * 2.0, -1, 1);
    }
    let throttle = 0;
    if (keys.has('throttleUp')) throttle += 1;
    if (keys.has('throttleDown')) throttle -= 1;
    throttle += wheelDelta * 0.12;
    wheelDelta = 0;
    const ctl = {
      pitch: clamp(pitch, -1, 1),
      roll: clamp(roll, -1, 1),
      throttle: clamp(throttle, -1, 1),
      brake: keys.has('brake'),
      gear: take('gearToggle'),
      flaps: take('flapsToggle'),
      restart: take('restart'),
      pause: take('pauseToggle'),
      start: take('start'),
    };
    return ctl;
  }

  function take(name) {
    if (keys.has(name)) { keys.delete(name); return true; }
    return false;
  }

  return { read, keys };
}
