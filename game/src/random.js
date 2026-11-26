// random.js — a tiny seeded generator so the valley, the city and the
// screenshots are the same on every run with the same seed.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth value noise in one dimension: deterministic, cheap, good enough
// for rolling hills. `table` holds the random control points.
export function makeNoise1D(seed, points) {
  const rand = mulberry32(seed);
  const table = new Float64Array(points);
  for (let i = 0; i < points; i++) table[i] = rand() * 2 - 1;
  return function noise(x) {
    const i = Math.floor(x);
    const f = x - i;
    const a = table[((i % points) + points) % points];
    const b = table[(((i + 1) % points) + points) % points];
    const s = f * f * (3 - 2 * f); // smoothstep between control points
    return a + (b - a) * s;
  };
}

// Two-dimensional value noise built from two 1D noises, for the heightmap.
export function makeNoise2D(seed) {
  const nx = makeNoise1D(seed, 64);
  const nz = makeNoise1D(seed ^ 0x9e3779b9, 64);
  return function noise(x, z) {
    return (nx(x * 0.7 + nz(z) * 1.3) + nz(z * 0.7 + nx(x) * 1.3)) * 0.5;
  };
}
