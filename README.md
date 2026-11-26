# skyline-approach-flight-game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Naivexyz/skyline-approach-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Naivexyz/skyline-approach-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Skyline Approach is an original flight game: fly a little jet down a river valley, thread five gold rings, mind your fuel, then put her down gently on runway 27 at Skyline Field. Chase view over recognisable terrain — river, city, ridges — with a lit instrument panel and a full HUD (altitude, speed, heading, vertical speed, throttle, fuel, hull).

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — every file the game loads lives under `game/`.

## How to fly

- Arrows / WASD — pitch and bank; the mouse steers toward the pointer too
- Shift / Ctrl — throttle up / down; mouse wheel trims the throttle
- G — landing gear, F — flaps, Space — brake, P — pause, R — restart
- Gold rings pay 250 points and 14 fuel. A clean landing (gear down, under 78 kt, gentle sink) pays 1000 plus a time bonus. Fuel is the clock: stall it, run dry, or kiss the terrain and the sortie is over.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `buildDossier`. Screenshots are real renders of the game, taken in a headless browser from the deterministic `?shot=` scenes in `game/src/shots.js` (see `shots.json`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
