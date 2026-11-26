// config.js — every tunable number for Skyline Approach in one place.
// Units: metres, metres per second, degrees. The world is a valley with a
// river, a small city and one runway; the sortie is a ring run ending in a
// landing on runway 27 at Skyline Field.

export const CONFIG = {
  // Canvas the game draws into (screenshots are taken at this size).
  viewWidth: 1280,
  viewHeight: 720,

  // Flight model.
  startAltitude: 260, // metres above the valley floor
  startSpeed: 92, // m/s
  startDistance: 2400, // metres out from the runway threshold
  minSpeed: 30, // below this the wing stalls
  maxSpeed: 148,
  cruiseThrottle: 0.62,
  climbRate: 26, // m/s at full pull and full throttle
  sinkRate: 18,
  turnRate: 26, // deg/s at full bank
  maxBank: 52, // degrees of roll
  maxPitch: 24,
  fuelCapacity: 100,
  fuelBurn: 0.55, // per second at full throttle
  fuelPerRing: 14,
  damagePerHit: 34,
  safeTouchdownSpeed: 41, // m/s, about 80 kt: slower to land without damage
  safeSink: 6.5, // m/s of vertical speed or gentler to land cleanly

  // The course: five gold rings strung down the valley to the runway.
  ringCount: 5,
  ringRadius: 26,
  ringScore: 250,
  landingScore: 1000,
  timeBonusPerSecond: 8,

  // Terrain.
  worldSeed: 20261126,
  cellSize: 120, // metres per terrain grid cell
  viewDistance: 2100, // metres of terrain drawn ahead
  valleyFloor: 0,
  hillHeight: 190,
  riverX: -420, // the river runs north-south along this x
  riverHalfWidth: 55,
  cityCentreX: 300,
  cityCentreZ: 900,
  cityRadius: 520,
  runwayLength: 900,
  runwayWidth: 42,
  runwayHeading: 270, // landing heading, degrees (runway 27)

  // Look.
  skyTop: '#2f6fd0',
  skyHorizon: '#bcd9ef',
  sunColour: '#fff3c4',
  grassLow: '#5d8a3c',
  grassHigh: '#7fae56',
  hillColour: '#6b7f5e',
  rockColour: '#8a8f96',
  waterColour: '#3f7fb8',
  sandColour: '#c9b078',
  cityRoof: '#5b6b7d',
  cityWall: '#8b98a8',
  runwayColour: '#33373d',
  ringColour: '#ffc93c',
};
