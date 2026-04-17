import { useEffect, useRef, useState } from 'react';
import {
  getPlanetType,
  getPlanetColor,
  getHabitabilityZone,
} from '../utils/planetClassifier';

const TYPE_LABELS = {
  terrestrial: 'Terrestrial',
  'super-earth': 'Super-Earth',
  neptune: 'Neptune-like',
  'gas-giant': 'Gas Giant',
  unknown: 'Unknown',
};

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 py-2">
      <span className="text-xs uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <span className="text-right font-body text-sm text-text-primary">
        {value}
      </span>
    </div>
  );
}

function PlanetSidebar({ planet, onClose }) {
  const lastPlanetRef = useRef(planet);
  const [displayPlanet, setDisplayPlanet] = useState(planet);

  useEffect(() => {
    if (planet) {
      lastPlanetRef.current = planet;
      setDisplayPlanet(planet);
    }
  }, [planet]);

  const isOpen = Boolean(planet);
  const p = displayPlanet;

  const type = p ? getPlanetType(p) : 'unknown';
  const typeColor = p ? getPlanetColor(p) : '#7ba7c9';
  const typeLabel = TYPE_LABELS[type] ?? 'Unknown';
  const habitability = p ? getHabitabilityZone(p) : 'Unknown';

  const fmt = (val, suffix, digits) => {
    if (val == null || Number.isNaN(val)) return 'Unknown';
    return typeof val === 'number' ? `${val.toFixed(digits)}${suffix}` : `${val}${suffix}`;
  };

  const coords =
    p && p.ra != null && p.dec != null
      ? `RA ${p.ra.toFixed(2)}°, Dec ${p.dec.toFixed(2)}°`
      : 'Unknown';

  return (
    <aside
      className={`fixed right-0 top-0 z-40 flex h-full w-[360px] flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded border border-border text-text-secondary transition-colors hover:border-accent-cyan hover:text-accent-cyan"
        aria-label="Close planet details"
      >
        ×
      </button>

      {p && (
        <div className="flex h-full flex-col overflow-y-auto px-6 py-6">
          <h2 className="pr-10 font-display text-2xl font-bold tracking-widest text-accent-cyan">
            {p.name ?? 'Unknown'}
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className="rounded border px-2 py-1 font-display text-xs uppercase tracking-widest"
              style={{ color: typeColor, borderColor: typeColor }}
            >
              {typeLabel}
            </span>
            <span className="rounded border border-border px-2 py-1 font-display text-xs uppercase tracking-widest text-text-secondary">
              {habitability}
            </span>
          </div>

          <div className="mt-6 flex flex-col">
            <Row label="Host Star" value={p.starType || 'Unknown'} />
            <Row label="Distance" value={fmt(p.distance, ' pc', 1)} />
            <Row label="Mass" value={fmt(p.mass, ' M⊕', 2)} />
            <Row label="Radius" value={fmt(p.radius, ' R⊕', 2)} />
            <Row label="Orbital Period" value={fmt(p.orbitalPeriod, ' days', 1)} />
            <Row
              label="Eq. Temperature"
              value={p.equilibriumTemp != null ? `${p.equilibriumTemp} K` : 'Unknown'}
            />
            <Row label="Discovery Method" value={p.discoveryMethod || 'Unknown'} />
            <Row label="Discovery Year" value={p.discoveryYear || 'Unknown'} />
            <Row label="Coordinates" value={coords} />
          </div>
        </div>
      )}
    </aside>
  );
}

export default PlanetSidebar;
