const COLOR_TERRESTRIAL = '#00ff88';
const COLOR_SUPER_EARTH = '#00d4ff';
const COLOR_NEPTUNE = '#aa44ff';
const COLOR_GAS_GIANT = '#ffaa00';
const COLOR_UNKNOWN = '#7ba7c9';

export function getPlanetType(planet) {
  const r = planet?.radius;
  if (r == null || Number.isNaN(r)) return 'unknown';
  if (r < 1.25) return 'terrestrial';
  if (r < 2) return 'super-earth';
  if (r < 6) return 'neptune';
  return 'gas-giant';
}

export function getPlanetColor(planet) {
  switch (getPlanetType(planet)) {
    case 'terrestrial':
      return COLOR_TERRESTRIAL;
    case 'super-earth':
      return COLOR_SUPER_EARTH;
    case 'neptune':
      return COLOR_NEPTUNE;
    case 'gas-giant':
      return COLOR_GAS_GIANT;
    default:
      return COLOR_UNKNOWN;
  }
}

export function getHabitabilityZone(planet) {
  const t = planet?.equilibriumTemp;
  if (t == null || Number.isNaN(t)) return 'Unknown';
  if (t < 200) return 'Too Cold';
  if (t <= 320) return 'Habitable Zone';
  return 'Too Hot';
}
