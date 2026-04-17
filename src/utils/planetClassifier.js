import { CONSTELLATIONS } from '../data/constellations';

const COLOR_HOT_JUPITER = '#ff4466';
const COLOR_JUPITER = '#ffaa00';
const COLOR_NEPTUNE = '#aa44ff';
const COLOR_SUPER_EARTH = '#00d4ff';
const COLOR_EARTH = '#00ff88';
const COLOR_SUB_EARTH = '#7ba7c9';
const COLOR_UNKNOWN = '#3d6080';

export function getPlanetType(planet) {
  const r = planet?.radius;
  if (r == null || Number.isNaN(r)) return 'Unknown';
  if (r < 0.8) return 'Sub Earth';
  if (r < 1.25) return 'Earth-like';
  if (r < 2) return 'Super Earth';
  if (r < 6) return 'Neptune-like';
  const period = planet?.orbitalPeriod;
  if (period != null && !Number.isNaN(period) && period < 10) return 'Hot Jupiter';
  return 'Jupiter-like';
}

export function getPlanetColor(planet) {
  switch (getPlanetType(planet)) {
    case 'Hot Jupiter':
      return COLOR_HOT_JUPITER;
    case 'Jupiter-like':
      return COLOR_JUPITER;
    case 'Neptune-like':
      return COLOR_NEPTUNE;
    case 'Super Earth':
      return COLOR_SUPER_EARTH;
    case 'Earth-like':
      return COLOR_EARTH;
    case 'Sub Earth':
      return COLOR_SUB_EARTH;
    default:
      return COLOR_UNKNOWN;
  }
}

export function getHabitabilityZone(planet) {
  const t = planet?.equilibriumTemp;
  if (t == null || Number.isNaN(t)) return 'Unknown';
  if (t < 200) return 'Too Cold';
  if (t <= 320) return 'Optimistic HZ';
  return 'Too Hot';
}

export function getConstellation(planet) {
  if (!planet || planet.ra == null || planet.dec == null) return null;
  const { ra, dec } = planet;
  for (const constellation of CONSTELLATIONS) {
    const coords = constellation.coords;
    if (!coords || coords.length === 0) continue;
    let minRa = Infinity;
    let maxRa = -Infinity;
    let minDec = Infinity;
    let maxDec = -Infinity;
    for (const [cRa, cDec] of coords) {
      if (cRa < minRa) minRa = cRa;
      if (cRa > maxRa) maxRa = cRa;
      if (cDec < minDec) minDec = cDec;
      if (cDec > maxDec) maxDec = cDec;
    }
    if (ra >= minRa && ra <= maxRa && dec >= minDec && dec <= maxDec) {
      return constellation.name;
    }
  }
  return null;
}
