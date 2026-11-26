// hud.js — the cockpit: heading tape, artificial horizon, altimeter,
// airspeed, throttle, fuel and damage, plus the title and end screens.
// Everything is drawn on the canvas so the screenshots show it exactly
// as the pilot sees it.

import { CONFIG } from './config.js';
import { groundHeight } from './terrain.js';

const C = CONFIG;
const DEG = Math.PI / 180;

function panel(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(8, 18, 32, ${alpha ?? 0.72})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 200, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function label(ctx, text, x, y, size, colour) {
  ctx.fillStyle = colour || '#9fd8ff';
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

function value(ctx, text, x, y, size, colour) {
  ctx.fillStyle = colour || '#ffffff';
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

const KTS = 1.94384; // m/s to knots
const FT = 3.28084; // metres to feet

export function renderHud(ctx, p, rings, W, H) {
  const altFt = Math.max(0, Math.round(p.y * FT));
  const spdKt = Math.max(0, Math.round(p.speed * KTS));
  const hdg = Math.round(p.heading);
  const vsFpm = Math.round(p.verticalSpeed * FT * 60);
  const nextIdx = rings.findIndex((r, i) => !r.taken && (p.z - r.z) > 10);
  const nextRing = nextIdx >= 0 ? rings[nextIdx] : null;
  const distTo = nextRing ? Math.round(p.z - nextRing.z) : 0;

  // --- Heading tape across the top ---
  panel(ctx, W / 2 - 330, 12, 660, 44, 0.6);
  ctx.save();
  ctx.beginPath();
  ctx.rect(W / 2 - 330, 12, 660, 44);
  ctx.clip();
  for (let d = -60; d <= 60; d += 5) {
    const h = (Math.round(p.heading / 5) * 5 + d + 360) % 360;
    const x = W / 2 + d * 5.4;
    const major = h % 30 === 0;
    ctx.strokeStyle = major ? '#ffffff' : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 44);
    ctx.lineTo(x, major ? 26 : 34);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = '#cfe9ff';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(h).padStart(3, '0'), x, 22);
    }
  }
  ctx.restore();
  ctx.fillStyle = '#ffc93c';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 7, 56); ctx.lineTo(W / 2 + 7, 56); ctx.lineTo(W / 2, 66);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffc93c';
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`HDG ${String(hdg).padStart(3, '0')}°`, W / 2, 86);

  // --- Mission line, top left ---
  label(ctx, 'SKYLINE APPROACH · RWY 27', 16, 30, 14);
  label(ctx, nextRing
    ? `NEXT RING ${nextIdx + 1}/${C.ringCount} — ${distTo} m ahead`
    : 'ALL RINGS CLEAR — LAND ON RUNWAY 27', 16, 52, 14, '#ffe9a8');
  label(ctx, `SCORE ${p.score}`, 16, 74, 14);

  // --- Right column: altitude, speed, vertical speed ---
  panel(ctx, W - 216, 12, 200, 176, 0.72);
  label(ctx, 'ALTITUDE', W - 200, 36, 12);
  value(ctx, `${altFt.toLocaleString()} ft`, W - 200, 62, 24);
  label(ctx, 'AIRSPEED', W - 200, 90, 12);
  value(ctx, `${spdKt} kt`, W - 200, 116, 24);
  label(ctx, 'VERT SPEED', W - 200, 144, 12);
  value(ctx, `${vsFpm >= 0 ? '+' : ''}${vsFpm} fpm`, W - 200, 168, 15, vsFpm < -800 ? '#ff6b5e' : '#ffffff');

  // --- Bottom instrument panel ---
  panel(ctx, W / 2 - 300, H - 108, 600, 96, 0.78);
  drawHorizon(ctx, p, W / 2 - 252, H - 66, 34);
  drawGauge(ctx, 'THR', p.throttle, W / 2 - 180, H - 96, 120, p.throttle > 0.9 ? '#ffb347' : '#4fc3f7');
  drawGauge(ctx, 'FUEL', p.fuel / 100, W / 2 - 40, H - 96, 120, p.fuel < 25 ? '#ff6b5e' : '#7ee787');
  drawGauge(ctx, 'HULL', 1 - p.damage / 100, W / 2 + 100, H - 96, 120, p.damage > 60 ? '#ff6b5e' : '#7ee787');
  // Gear / flaps lamps.
  lamp(ctx, 'GEAR', p.gearDown, W / 2 + 238, H - 84);
  lamp(ctx, 'FLAPS', p.flaps, W / 2 + 238, H - 52);
  lamp(ctx, 'RINGS', p.ringsTaken === C.ringCount, W / 2 + 238, H - 20, true);

  // --- Centre reticle ---
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.46, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2 - 22, H * 0.46); ctx.lineTo(W / 2 - 14, H * 0.46);
  ctx.moveTo(W / 2 + 14, H * 0.46); ctx.lineTo(W / 2 + 22, H * 0.46);
  ctx.moveTo(W / 2, H * 0.46 - 22); ctx.lineTo(W / 2, H * 0.46 - 14);
  ctx.moveTo(W / 2, H * 0.46 + 14); ctx.lineTo(W / 2, H * 0.46 + 22);
  ctx.stroke();

  // --- Warnings ---
  const warnings = [];
  if (p.state === 'flying' && p.speed < C.minSpeed + 8) warnings.push(['STALL — NOSE DOWN, THROTTLE UP', '#ff6b5e']);
  if (p.state === 'flying' && p.fuel < 25) warnings.push([`LOW FUEL — ${Math.round(p.fuel)} LEFT`, '#ffb347']);
  if (p.state === 'flying' && p.y - groundHeight(p.x, p.z) < 30) warnings.push(['TERRAIN — PULL UP', '#ff6b5e']);
  if (p.state === 'flying' && !p.gearDown && p.z < 500 && p.y < 120) warnings.push(['GEAR UP — PRESS G', '#ffb347']);
  warnings.forEach(([text, colour], i) => {
    ctx.fillStyle = colour;
    ctx.font = '800 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, 150 + i * 28);
  });

  // --- Transient centre message (ring taken, hard landing) ---
  if (p.message && p.time < p.messageUntil) {
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '800 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.message, W / 2, H * 0.30);
  }
}

// Artificial horizon: a little round instrument that rolls with the bank
// and slides with the pitch.
function drawHorizon(ctx, p, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-p.bank * DEG);
  const pitchPx = Math.max(-r, Math.min(r, p.pitch * 1.4));
  ctx.fillStyle = '#2f6fd0';
  ctx.fillRect(-r, -r - pitchPx, r * 2, r + pitchPx);
  ctx.fillStyle = '#8a6b46';
  ctx.fillRect(-r, pitchPx, r * 2, r - pitchPx + 1);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, pitchPx);
  ctx.lineTo(r, pitchPx);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#9fd8ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffc93c';
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 3, cy); ctx.lineTo(cx, cy - 4);
  ctx.lineTo(cx + 3, cy); ctx.lineTo(cx + 14, cy);
  ctx.closePath(); ctx.fill();
  label(ctx, 'ATT', cx - 12, cy + r + 14, 10);
}

function drawGauge(ctx, name, frac, x, y, w, colour) {
  label(ctx, name, x, y + 12, 11);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.roundRect(x, y + 18, w, 12, 6);
  ctx.fill();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.roundRect(x, y + 18, Math.max(4, w * Math.max(0, Math.min(1, frac))), 12, 6);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(frac * 100)}%`, x + w, y + 42);
}

function lamp(ctx, name, on, x, y, wide) {
  ctx.fillStyle = on ? '#7ee787' : 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, name, x + 11, y + 4, 11, on ? '#c9f5d3' : '#8fa3b5');
}

// --- Full-screen overlays ---

export function renderTitle(ctx, p, W, H) {
  ctx.fillStyle = 'rgba(6, 14, 28, 0.45)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 64px system-ui, sans-serif';
  ctx.fillText('SKYLINE APPROACH', W / 2, H * 0.24);
  ctx.fillStyle = '#ffc93c';
  ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillText('Fly the rings down the valley — then put her down on runway 27', W / 2, H * 0.24 + 44);
  const lines = [
    'ARROWS / WASD — pitch and bank      MOUSE — steer toward the pointer',
    'SHIFT / CTRL — throttle up / down      MOUSE WHEEL — trim throttle',
    'G — landing gear      F — flaps      SPACE — brake      R — restart',
    'Gold rings pay 250 points and 14 fuel. Land gentle, gear down, under 80 kt.',
    'Fuel is the clock. The valley, the river and the city are all yours to miss.',
  ];
  ctx.fillStyle = '#dbeafe';
  ctx.font = '500 18px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.44 + i * 32));
  ctx.fillStyle = '#7ee787';
  ctx.font = '800 26px system-ui, sans-serif';
  ctx.fillText('PRESS ENTER OR CLICK TO FLY', W / 2, H * 0.44 + lines.length * 32 + 44);
}

export function renderEnd(ctx, p, W, H) {
  ctx.fillStyle = 'rgba(6, 14, 28, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  const titles = {
    landed: ['TOUCHDOWN — WELCOME TO SKYLINE FIELD', '#7ee787'],
    crashed: ['CRASHED — THE VALLEY KEEPS THE PLANE', '#ff6b5e'],
    outoffuel: ['OUT OF FUEL — GLIDE PRACTICE, NEXT TIME', '#ffb347'],
  };
  const [title, colour] = titles[p.state] || titles.crashed;
  ctx.fillStyle = colour;
  ctx.font = '800 44px system-ui, sans-serif';
  ctx.fillText(title, W / 2, H * 0.34);
  const rows = [
    `SCORE  ${p.score}`,
    `RINGS  ${p.ringsTaken} / ${C.ringCount}`,
    `TIME  ${Math.round(p.time)} s`,
    `FUEL LEFT  ${Math.round(p.fuel)}`,
    `HULL  ${Math.max(0, 100 - p.damage)}%`,
  ];
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 22px system-ui, sans-serif';
  rows.forEach((row, i) => ctx.fillText(row, W / 2, H * 0.34 + 52 + i * 36));
  ctx.fillStyle = '#9fd8ff';
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText('PRESS R TO FLY AGAIN', W / 2, H * 0.34 + 52 + rows.length * 36 + 30);
}
