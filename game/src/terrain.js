// terrain.js — the valley of Skyline Field: a seeded heightmap, a river, a
// small city of blocky buildings, the runway, and the ring course down the
// approach path. Everything is pure data; render.js draws it.

import { CONFIG } from './config.js';
import { makeNoise2D, mulberry32 } from './random.js';

const C = CONFIG;

// The runway lies along the z axis: threshold at z = 0, far end at z = -900
// (the plane flies toward -z... no: the plane starts at +z and flies toward
// decreasing z, landing heading 270 means it travels toward -x in world
// terms. To keep the math simple the world is built in "course space":
// the approach runs down the -z axis, the runway is centred on x = 0, and
// the heading shown on the HUD is course-corrected to 270 at touchdown.
export const RUNWAY = {
  x: 0,
  zStart: -C.runwayLength, // far end
  zEnd: 60, // threshold overrun
  width: C.runwayWidth,
  heading: C.runwayHeading,
};

const noise = makeNoise2D(C.worldSeed);

// Ground height at a world point. Flat near the runway and the river so the
// strip reads as a real airfield, rolling hills further out, rising to
// ridges on both flanks of the valley.
export function groundHeight(x, z) {
  const dzOut = z < -900 ? -900 - z : z > 600 ? z - 600 : 0;
  const nearRunway = Math.max(0, 1 - Math.abs(x) / 260) * Math.max(0, 1 - dzOut / 400);
  const inRiver = Math.max(0, 1 - Math.abs(x - C.riverX) / (C.riverHalfWidth + 60));
  const n = noise(x / 340, z / 340);
  const flank = Math.min(1, Math.abs(x) / 1500);
  const ridge = Math.max(0, noise(x / 900 + 40, z / 900) - 0.15) * 2.2;
  let h = (n * 0.5 + 0.5) * C.hillHeight * (0.25 + 0.75 * flank) + ridge * C.hillHeight * 0.5;
  h *= 1 - Math.max(nearRunway, inRiver * 0.9);
  return Math.max(0, h);
}

export function isWater(x) {
  return Math.abs(x - C.riverX) < C.riverHalfWidth;
}

// Seeded city: flat-roofed blocks east of the runway, clear of the strip.
function buildCity() {
  const rand = mulberry32(C.worldSeed ^ 0x51ab);
  const blocks = [];
  let guard = 0;
  while (blocks.length < 46 && guard++ < 400) {
    const angle = rand() * Math.PI * 2;
    const dist = 90 + rand() * C.cityRadius;
    const x = C.cityCentreX + Math.cos(angle) * dist;
    const z = C.cityCentreZ + Math.sin(angle) * dist * 0.8;
    if (Math.abs(x) < 150 && z > -1000 && z < 400) continue; // keep the strip clear
    if (isWater(x)) continue;
    if (groundHeight(x, z) > 40) continue; // only on the flat valley floor
    const w = 26 + rand() * 34;
    const d = 26 + rand() * 34;
    const h = 14 + rand() * rand() * 58;
    blocks.push({ x, z, w, d, h, tone: rand() });
  }
  return blocks;
}

// Seeded clouds: soft ellipses the renderer draws high above the valley.
function buildClouds() {
  const rand = mulberry32(C.worldSeed ^ 0xc10d);
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({
      x: (rand() * 2 - 1) * 2600,
      y: 420 + rand() * 260,
      z: -1400 + rand() * 4200,
      r: 90 + rand() * 160,
    });
  }
  return clouds;
}

// The ring course: five rings stepping down the valley toward the runway.
function buildRings() {
  const rings = [];
  for (let i = 0; i < C.ringCount; i++) {
    const t = i / (C.ringCount - 1);
    const z = C.startDistance * (1 - t) + 120 * t;
    const sway = Math.sin(i * 1.7) * 170;
    rings.push({
      x: sway,
      y: 60 + (C.startAltitude - 60) * (1 - t) + 26,
      z,
      r: C.ringRadius,
      taken: false,
    });
  }
  return rings;
}

export const CITY = buildCity();
export const CLOUDS = buildClouds();

export function freshRings() {
  return buildRings().map((r) => ({ ...r }));
}

// Terrain colour for a ground cell, from height and position.
export function groundColour(x, z, h) {
  if (isWater(x)) return C.waterColour;
  if (Math.abs(x - C.riverX) < C.riverHalfWidth + 26) return C.sandColour;
  if (h > 150) return C.rockColour;
  if (h > 85) return C.hillColour;
  const t = Math.min(1, Math.max(0, h / 85));
  return shade(C.grassLow, C.grassHigh, t);
}

// Blend two #rrggbb colours by t (0..1).
export function shade(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}
