// render.js — draws the world: sky, sun, clouds, the valley floor, the
// river, the city, the runway and the gold rings, from a chase camera
// tucked behind the aircraft. Plain Canvas 2D, one projected quad at a time.

import { CONFIG } from './config.js';
import { groundHeight, groundColour, CITY, CLOUDS, RUNWAY } from './terrain.js';

const C = CONFIG;
const DEG = Math.PI / 180;

// A camera that trails the plane and looks where it is going.
function cameraFor(p) {
  const back = 30;
  const cx = p.x - Math.sin(p.course) * back;
  const cz = p.z + Math.cos(p.course) * back;
  return {
    x: cx, y: p.y + 8, z: cz,
    course: p.course,
    pitch: p.pitch * 0.45 * DEG,
    roll: -p.bank * 0.55 * DEG,
    focal: 760,
  };
}

// Project a world point to screen space. Returns null behind the camera.
function project(cam, x, y, z, W, H) {
  const dx = x - cam.x;
  const dy = y - cam.y;
  const dz = z - cam.z;
  const sinC = Math.sin(cam.course);
  const cosC = Math.cos(cam.course);
  // Forward is (sin c, 0, -cos c); right is (cos c, 0, sin c).
  let fwd = dx * sinC - dz * cosC;
  let right = dx * cosC + dz * sinC;
  let up = dy;
  // Camera pitch: rotate the forward/up plane.
  const sp = Math.sin(cam.pitch);
  const cp = Math.cos(cam.pitch);
  const f2 = fwd * cp - up * sp;
  const u2 = fwd * sp + up * cp;
  fwd = f2; up = u2;
  if (fwd < 6) return null;
  const s = cam.focal / fwd;
  let sx = W / 2 + right * s;
  let sy = H * 0.46 - up * s;
  // Roll the whole view around the screen centre.
  if (cam.roll !== 0) {
    const cx = W / 2; const cy = H * 0.46;
    const rx = sx - cx; const ry = sy - cy;
    const cr = Math.cos(cam.roll); const sr = Math.sin(cam.roll);
    sx = cx + rx * cr - ry * sr;
    sy = cy + rx * sr + ry * cr;
  }
  return { x: sx, y: sy, d: fwd };
}

function quad(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
}

export function renderWorld(ctx, p, rings, W, H) {
  const cam = cameraFor(p);

  // --- Sky ---
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  sky.addColorStop(0, C.skyTop);
  sky.addColorStop(0.75, C.skyHorizon);
  sky.addColorStop(1, '#dfe9d8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.62 + 2);
  // Ground base colour below the horizon line.
  ctx.fillStyle = '#6d8a4e';
  ctx.fillRect(0, H * 0.62, W, H * 0.38);

  // Sun, fixed high in the sky ahead-left, clear of the instruments.
  const sun = project(cam, cam.x - 1600, cam.y + 700, cam.z - 2400, W, H);
  if (sun) {
    ctx.fillStyle = C.sunColour;
    ctx.beginPath(); ctx.arc(sun.x, Math.max(30, sun.y), 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,243,196,0.25)';
    ctx.beginPath(); ctx.arc(sun.x, Math.max(30, sun.y), 58, 0, Math.PI * 2); ctx.fill();
  }

  // Distant ridge silhouette, drawn as a skyline across the horizon.
  ctx.fillStyle = '#7d94a8';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.46);
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const ridge = Math.sin(t * 21.3 + 2) * 26 + Math.sin(t * 47.7) * 14 + Math.sin(t * 9.1 + 5) * 30;
    ctx.lineTo(t * W, H * 0.46 - 34 - ridge);
  }
  ctx.lineTo(W, H * 0.46);
  ctx.closePath();
  ctx.fill();

  // --- Clouds (far to near) ---
  const cloudPts = CLOUDS.map((c) => ({ c, pt: project(cam, c.x, c.y, c.z, W, H) }))
    .filter((o) => o.pt).sort((a, b) => b.pt.d - a.pt.d);
  for (const { c, pt } of cloudPts) {
    const r = Math.max(4, (c.r / pt.d) * cam.focal);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y, r, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(pt.x - r * 0.4, pt.y + r * 0.08, r * 0.6, r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Terrain: grid cells, far to near ---
  const cell = C.cellSize;
  const rows = Math.ceil(C.viewDistance / cell);
  const cols = 11;
  const cells = [];
  const z0 = Math.floor((cam.z - C.viewDistance) / cell) * cell;
  const x0 = Math.floor((cam.x - cols * cell / 2) / cell) * cell;
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      const x = x0 + q * cell;
      const z = z0 + r * cell;
      const cxm = x + cell / 2;
      const czm = z + cell / 2;
      const fwd = (cxm - cam.x) * Math.sin(cam.course) - (czm - cam.z) * Math.cos(cam.course);
      cells.push({ x, z, fwd });
    }
  }
  cells.sort((a, b) => b.fwd - a.fwd);
  for (const { x, z } of cells) {
    const h00 = groundHeight(x, z);
    const h10 = groundHeight(x + cell, z);
    const h11 = groundHeight(x + cell, z + cell);
    const h01 = groundHeight(x, z + cell);
    const p00 = project(cam, x, h00, z, W, H);
    const p10 = project(cam, x + cell, h10, z, W, H);
    const p11 = project(cam, x + cell, h11, z + cell, W, H);
    const p01 = project(cam, x, h01, z + cell, W, H);
    if (!p00 || !p10 || !p11 || !p01) continue;
    const hm = (h00 + h10 + h11 + h01) / 4;
    ctx.fillStyle = groundColour(x + cell / 2, z + cell / 2, hm);
    quad(ctx, [p00, p10, p11, p01]);
  }

  // --- Runway: dark strip with centreline, threshold bars, edge lights ---
  const segLen = 60;
  for (let z = RUNWAY.zStart; z < RUNWAY.zEnd; z += segLen) {
    const a = project(cam, RUNWAY.x - RUNWAY.width / 2, 1.2, z, W, H);
    const b = project(cam, RUNWAY.x + RUNWAY.width / 2, 1.2, z, W, H);
    const c2 = project(cam, RUNWAY.x + RUNWAY.width / 2, 1.2, z + segLen, W, H);
    const d = project(cam, RUNWAY.x - RUNWAY.width / 2, 1.2, z + segLen, W, H);
    if (!a || !b || !c2 || !d) continue;
    ctx.fillStyle = C.runwayColour;
    quad(ctx, [a, b, c2, d]);
    // Centreline dash.
    const dash = Math.floor((z - RUNWAY.zStart) / segLen) % 2 === 0;
    if (dash) {
      const m1 = project(cam, RUNWAY.x - 1.6, 1.6, z + 12, W, H);
      const m2 = project(cam, RUNWAY.x + 1.6, 1.6, z + 12, W, H);
      const m3 = project(cam, RUNWAY.x + 1.6, 1.6, z + segLen - 12, W, H);
      const m4 = project(cam, RUNWAY.x - 1.6, 1.6, z + segLen - 12, W, H);
      if (m1 && m2 && m3 && m4) { ctx.fillStyle = '#e8e8e8'; quad(ctx, [m1, m2, m3, m4]); }
    }
  }
  // Threshold bars at the near end.
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const t1 = project(cam, RUNWAY.x + i * 5 - 2, 1.6, RUNWAY.zEnd - 34, W, H);
    const t2 = project(cam, RUNWAY.x + i * 5 + 2, 1.6, RUNWAY.zEnd - 34, W, H);
    const t3 = project(cam, RUNWAY.x + i * 5 + 2, 1.6, RUNWAY.zEnd - 8, W, H);
    const t4 = project(cam, RUNWAY.x + i * 5 - 2, 1.6, RUNWAY.zEnd - 8, W, H);
    if (t1 && t2 && t3 && t4) { ctx.fillStyle = '#f2f2f2'; quad(ctx, [t1, t2, t3, t4]); }
  }
  // Runway number "27" painted near the threshold.
  const num = project(cam, RUNWAY.x, 2, RUNWAY.zEnd - 60, W, H);
  if (num && num.d < 1600) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `bold ${Math.max(10, Math.round(2600 / num.d))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('27', num.x, num.y);
  }

  // --- City blocks (far to near) ---
  const blocks = CITY.map((b) => {
    const pt = project(cam, b.x, 0, b.z, W, H);
    return { b, d: pt ? pt.d : -1, pt };
  }).filter((o) => o.d > 0).sort((a, b) => b.d - a.d);
  for (const { b } of blocks) {
    const hw = b.w / 2; const hd = b.d / 2;
    const base = groundHeight(b.x, b.z);
    const corners = [
      [b.x - hw, base, b.z - hd], [b.x + hw, base, b.z - hd],
      [b.x + hw, base, b.z + hd], [b.x - hw, base, b.z + hd],
    ];
    const tops = corners.map(([x, y, z]) => [x, y + b.h, z]);
    const pb = corners.map(([x, y, z]) => project(cam, x, y, z, W, H));
    const pt = tops.map(([x, y, z]) => project(cam, x, y, z, W, H));
    if (pb.some((q) => !q) || pt.some((q) => !q)) continue;
    const tone = 0.75 + b.tone * 0.5;
    ctx.fillStyle = `rgb(${Math.round(139 * tone)},${Math.round(152 * tone)},${Math.round(168 * tone)})`;
    quad(ctx, [pb[0], pb[1], pt[1], pt[0]]); // south face
    ctx.fillStyle = `rgb(${Math.round(110 * tone)},${Math.round(122 * tone)},${Math.round(138 * tone)})`;
    quad(ctx, [pb[1], pb[2], pt[2], pt[1]]); // east face
    ctx.fillStyle = C.cityRoof;
    quad(ctx, [pt[0], pt[1], pt[2], pt[3]]); // roof
  }

  // --- Gold rings ---
  for (const ring of rings) {
    if (ring.taken) continue;
    const pts = [];
    let ok = true;
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const pt = project(cam, ring.x + Math.cos(a) * ring.r, ring.y + Math.sin(a) * ring.r, ring.z, W, H);
      if (!pt) { ok = false; break; }
      pts.push(pt);
    }
    if (!ok) continue;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const pt of pts) ctx.lineTo(pt.x, pt.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,201,60,0.14)';
    ctx.fill();
    ctx.strokeStyle = C.ringColour;
    ctx.lineWidth = Math.max(2, 900 / Math.max(60, pts[0].d));
    ctx.stroke();
    // Ring label: distance in metres.
    const mid = project(cam, ring.x, ring.y + ring.r + 8, ring.z, W, H);
    if (mid && mid.d < 1500) {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(mid.d)} m`, mid.x, mid.y);
    }
  }

  drawAircraft(ctx, p, W, H);
  return cam;
}

// The player's jet, seen from behind and slightly above, rolled with the
// bank so the pilot feels the turn in the airframe itself.
function drawAircraft(ctx, p, W, H) {
  const cx = W / 2;
  const cy = H * 0.56;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(p.bank * DEG * 0.85);
  const s = 1.0;
  // Wings.
  ctx.fillStyle = '#c8d2dc';
  ctx.beginPath();
  ctx.moveTo(-14 * s, 6 * s); ctx.lineTo(-118 * s, 34 * s); ctx.lineTo(-112 * s, 46 * s); ctx.lineTo(-12 * s, 18 * s);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14 * s, 6 * s); ctx.lineTo(118 * s, 34 * s); ctx.lineTo(112 * s, 46 * s); ctx.lineTo(12 * s, 18 * s);
  ctx.closePath(); ctx.fill();
  // Tailplane and fin.
  ctx.fillStyle = '#9fb0bf';
  ctx.beginPath();
  ctx.moveTo(-8 * s, 34 * s); ctx.lineTo(-52 * s, 52 * s); ctx.lineTo(-48 * s, 60 * s); ctx.lineTo(-6 * s, 42 * s);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8 * s, 34 * s); ctx.lineTo(52 * s, 52 * s); ctx.lineTo(48 * s, 60 * s); ctx.lineTo(6 * s, 42 * s);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e2543e';
  ctx.beginPath();
  ctx.moveTo(-4 * s, 30 * s); ctx.lineTo(0, -6 * s); ctx.lineTo(4 * s, 30 * s);
  ctx.closePath(); ctx.fill();
  // Fuselage.
  const body = ctx.createLinearGradient(-16, 0, 16, 0);
  body.addColorStop(0, '#7e93a8');
  body.addColorStop(0.5, '#e8eef4');
  body.addColorStop(1, '#7e93a8');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 12 * s, 15 * s, 52 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Canopy glint.
  ctx.fillStyle = '#2c4d6e';
  ctx.beginPath();
  ctx.ellipse(0, -16 * s, 8 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-3 * s, -22 * s, 3 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Engine glow.
  ctx.fillStyle = p.throttle > 0.7 ? '#ffb347' : '#8fa3b5';
  ctx.beginPath(); ctx.ellipse(-8 * s, 62 * s, 4 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(8 * s, 62 * s, 4 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
  // Navigation lights: red port, green starboard.
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath(); ctx.arc(-118 * s, 40 * s, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#34d17b';
  ctx.beginPath(); ctx.arc(118 * s, 40 * s, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
