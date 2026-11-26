// shots.js — the scripted scenes behind the entry's screenshots. Opening
// the game with ?shot=start|play|rings|land&seed=1 freezes a chosen moment
// of the sortie so the screenshots are real renders of the game's own code,
// taken the same way every time.

import { CONFIG } from './config.js';
import { freshPlane } from './physics.js';
import { freshRings } from './terrain.js';

const C = CONFIG;

// Returns { plane, rings, paused } for a ?shot= name, or null when there is
// no such scene (normal play).
export function shotScene(name) {
  if (!name) return null;
  const rings = freshRings();
  const plane = freshPlane();
  plane.state = 'flying';
  switch (name) {
    case 'start': {
      // On the threshold, engines lit, ready to roll: the cover.
      plane.state = 'title';
      plane.x = 0;
      plane.y = 26;
      plane.z = 60;
      plane.speed = 0;
      plane.throttle = 0.55;
      return { plane, rings, paused: true };
    }
    case 'play': {
      // Mid-valley, banking toward the second ring over the river.
      plane.x = -160;
      plane.y = 205;
      plane.z = 1650;
      plane.course = 0.16;
      plane.heading = 279;
      plane.bank = -24;
      plane.pitch = -4;
      plane.speed = 104;
      plane.throttle = 0.78;
      plane.fuel = 71;
      plane.score = 250;
      rings[0].taken = true;
      plane.ringsTaken = 1;
      return { plane, rings, paused: true };
    }
    case 'rings': {
      // Nose-on with the third ring, city and river below.
      plane.x = 118;
      plane.y = 148;
      plane.z = 1060;
      plane.course = -0.1;
      plane.heading = 264;
      plane.bank = 12;
      plane.pitch = -6;
      plane.speed = 96;
      plane.throttle = 0.66;
      plane.fuel = 58;
      plane.score = 500;
      rings[0].taken = true;
      rings[1].taken = true;
      plane.ringsTaken = 2;
      plane.message = 'RING 2/5  +250  ·  fuel +14';
      plane.messageUntil = 999;
      return { plane, rings, paused: true };
    }
    case 'land': {
      // Short final: gear down, flaps out, runway 27 filling the view.
      plane.x = -6;
      plane.y = 52;
      plane.z = 420;
      plane.course = 0.02;
      plane.heading = 271;
      plane.bank = -3;
      plane.pitch = -5;
      plane.speed = 40;
      plane.throttle = 0.34;
      plane.gearDown = true;
      plane.flaps = true;
      plane.fuel = 31;
      plane.score = 1250;
      plane.verticalSpeed = -3.0;
      rings.forEach((r) => { r.taken = true; });
      plane.ringsTaken = C.ringCount;
      return { plane, rings, paused: true };
    }
    default:
      return null;
  }
}
