// physics.js — the flight model for Skyline Approach. A small arcade model
// with real trade-offs: throttle feeds speed, speed feeds lift, bank turns
// the nose, pitch trades speed for altitude, and fuel is the clock.

import { CONFIG } from './config.js';
import { groundHeight, RUNWAY } from './terrain.js';

const C = CONFIG;
const DEG = Math.PI / 180;

export function freshPlane() {
  return {
    // Course space: the plane starts out at +z and flies toward -z.
    x: 0,
    y: C.startAltitude,
    z: C.startDistance,
    heading: 270, // HUD heading in degrees (runway 27)
    course: 0, // internal course angle, radians; 0 = flying down -z
    pitch: 0, // degrees, positive = nose up
    bank: 0, // degrees, positive = right wing down
    speed: C.startSpeed,
    throttle: C.cruiseThrottle,
    verticalSpeed: 0,
    fuel: C.fuelCapacity,
    damage: 0,
    score: 0,
    ringsTaken: 0,
    time: 0,
    state: 'title', // title | flying | landed | crashed | outoffuel
    message: '',
    messageUntil: 0,
    gearDown: false,
    flaps: false,
  };
}

// One fixed step. `ctl` is { pitch: -1..1, roll: -1..1, throttle: -1..1,
// brake: bool }. Returns an event string ('ring', 'landed', 'crashed',
// 'stalled', 'outoffuel') or ''.
export function stepPlane(p, ctl, dt) {
  if (p.state !== 'flying') return '';
  p.time += dt;

  // Throttle and drag.
  p.throttle = clamp(p.throttle + ctl.throttle * dt * 0.55, 0, 1);
  const drag = 0.028 + (p.flaps ? 0.05 : 0);
  const thrust = p.throttle * 46;
  p.speed += (thrust - drag * p.speed - Math.sin(p.pitch * DEG) * 9.8 * 1.9) * dt;
  if (ctl.brake) p.speed -= 26 * dt;
  p.speed = clamp(p.speed, 0, C.maxSpeed + 20);

  // Roll toward the commanded bank, then turn with the bank.
  const targetBank = ctl.roll * C.maxBank;
  p.bank += (targetBank - p.bank) * Math.min(1, dt * 3.2);
  const turn = Math.tan(p.bank * DEG) * 9.8 / Math.max(p.speed, 20) / DEG;
  p.course += turn * DEG * dt * 0.9;
  p.heading = (270 + p.course / DEG + 360) % 360;

  // Pitch: the stick commands a pitch angle; lift follows speed.
  const targetPitch = ctl.pitch * C.maxPitch;
  p.pitch += (targetPitch - p.pitch) * Math.min(1, dt * 2.6);
  const liftFactor = clamp(p.speed / 70, 0.15, 1.25);
  p.verticalSpeed = Math.sin(p.pitch * DEG) * p.speed * liftFactor;
  // Below stall speed the wing gives up and the nose drops.
  if (p.speed < C.minSpeed) {
    p.verticalSpeed -= (C.minSpeed - p.speed) * 0.55;
    if (p.speed < C.minSpeed - 6) return 'stalled';
  }
  p.y += p.verticalSpeed * dt;

  // Move along the course.
  const forward = p.speed * dt;
  p.z -= Math.cos(p.course) * forward;
  p.x += Math.sin(p.course) * forward;

  // Fuel: the clock that makes every sortie a decision.
  p.fuel -= (0.12 + p.throttle * C.fuelBurn) * dt;
  if (p.fuel <= 0) {
    p.fuel = 0;
    p.state = 'outoffuel';
    return 'outoffuel';
  }

  // Terrain collision.
  const ground = groundHeight(p.x, p.z);
  if (p.y <= ground + 2) {
    // On the runway strip, a gentle touchdown is a landing.
    const onStrip = Math.abs(p.x - RUNWAY.x) < RUNWAY.width / 2 - 4
      && p.z > RUNWAY.zStart && p.z < RUNWAY.zEnd;
    if (onStrip && p.speed <= C.safeTouchdownSpeed && p.verticalSpeed > -C.safeSink && p.gearDown) {
      p.y = ground + 2;
      p.state = 'landed';
      p.score += C.landingScore + Math.max(0, Math.round((120 - p.time) * C.timeBonusPerSecond));
      return 'landed';
    }
    if (onStrip && p.verticalSpeed > -C.safeSink * 2.2 && p.gearDown && p.speed <= C.safeTouchdownSpeed + 14) {
      p.damage += 18; // a hard bounce: survivable, costly
      p.y = ground + 2;
      p.verticalSpeed = 2;
      p.speed *= 0.82;
      p.message = 'HARD LANDING — check the gear';
      p.messageUntil = p.time + 2.5;
      if (p.damage >= 100) { p.state = 'crashed'; return 'crashed'; }
      return 'bounce';
    }
    p.y = ground + 2;
    p.state = 'crashed';
    return 'crashed';
  }

  // Flying past the far end or far off course ends the sortie.
  if (p.z < RUNWAY.zStart - 700 || Math.abs(p.x) > 3200) {
    p.state = 'crashed';
    return 'crashed';
  }
  return '';
}

// Ring pickup: the plane's nose passes through the gold hoop.
export function checkRings(p, rings) {
  for (const ring of rings) {
    if (ring.taken) continue;
    const dz = p.z - ring.z;
    if (Math.abs(dz) > 26) continue;
    const dx = p.x - ring.x;
    const dy = p.y - ring.y;
    if (Math.hypot(dx, dy) < ring.r) {
      ring.taken = true;
      p.ringsTaken += 1;
      p.score += C.ringScore;
      p.fuel = Math.min(C.fuelCapacity, p.fuel + C.fuelPerRing);
      p.message = `RING ${p.ringsTaken}/${C.ringCount}  +${C.ringScore}  ·  fuel +${C.fuelPerRing}`;
      p.messageUntil = p.time + 2.5;
      return ring;
    }
  }
  return null;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
