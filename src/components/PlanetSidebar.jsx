import { useEffect, useRef, useState } from 'react';
import {
  getPlanetType,
  getPlanetColor,
  getHabitabilityZone,
} from '../utils/planetClassifier';

const PLANET_VIZ = {
  'Hot Jupiter': { radius: 32, swirl: true },
  'Jupiter-like': { radius: 28 },
  'Neptune-like': { radius: 22 },
  'Super Earth': { radius: 18 },
  'Earth-like': { radius: 18, centerTint: '#7ec8ff' },
  'Sub Earth': { radius: 14 },
  Unknown: { radius: 12 },
};

function shiftColor(hex, amount) {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  if (amount >= 0) {
    r = Math.round(r + (255 - r) * amount);
    g = Math.round(g + (255 - g) * amount);
    b = Math.round(b + (255 - b) * amount);
  } else {
    const f = 1 + amount;
    r = Math.round(r * f);
    g = Math.round(g * f);
    b = Math.round(b * f);
  }
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function PlanetGlyph({ type, color }) {
  const viz = PLANET_VIZ[type] ?? PLANET_VIZ.Unknown;
  const { radius, swirl, centerTint } = viz;
  const idSuffix = type.replace(/\W+/g, '-').toLowerCase();
  const gradId = `planet-grad-${idSuffix}`;
  const glowId = `planet-glow-${idSuffix}`;
  const light = centerTint ?? shiftColor(color, 0.45);
  const dark = shiftColor(color, -0.35);
  const swirlColor = shiftColor(color, 0.3);

  return (
    <svg viewBox="0 0 100 100" className="h-24 w-24" aria-hidden="true">
      <defs>
        <radialGradient id={gradId} cx="38%" cy="34%" r="68%">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
        <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill={color}
        opacity="0.55"
        filter={`url(#${glowId})`}
      />
      <circle cx="50" cy="50" r={radius} fill={`url(#${gradId})`} />
      {swirl && (
        <g
          stroke={swirlColor}
          strokeOpacity="0.45"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
        >
          <path
            d={`M ${50 - radius * 0.85} ${50 - radius * 0.25} Q 50 ${50 - radius * 0.4}, ${50 + radius * 0.85} ${50 - radius * 0.25}`}
          />
          <path
            d={`M ${50 - radius * 0.95} ${50 + radius * 0.05} Q 50 ${50 + radius * 0.2}, ${50 + radius * 0.95} ${50 + radius * 0.05}`}
          />
          <path
            d={`M ${50 - radius * 0.8} ${50 + radius * 0.35} Q 50 ${50 + radius * 0.5}, ${50 + radius * 0.8} ${50 + radius * 0.35}`}
          />
        </g>
      )}
    </svg>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 px-2 py-2 transition-colors duration-150 hover:bg-surface-elevated">
      <span className="text-xs uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <span className="text-right font-body text-sm text-text-primary">
        {value}
      </span>
    </div>
  );
}

function PlanetSidebar({ planet, onClose, featuredPlanet }) {
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

  const typeLabel = p ? getPlanetType(p) : 'Unknown';
  const typeColor = p ? getPlanetColor(p) : '#3d6080';
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
      className={`fixed right-0 top-0 z-40 flex h-full w-[360px] flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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
          {featuredPlanet && p === featuredPlanet && (
            <div
              className="featured-badge-pulse mb-3 inline-flex self-start rounded border border-accent-amber bg-accent-amber/10 px-2 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-accent-amber"
              style={{ textShadow: '0 0 8px rgba(255, 170, 0, 0.6)' }}
            >
              ★ Featured Today
            </div>
          )}
          <div className="mb-2 flex justify-center">
            <PlanetGlyph type={typeLabel} color={typeColor} />
          </div>
          <h2
            className="pr-10 font-display text-2xl font-bold tracking-widest text-accent-cyan"
            style={
              habitability === 'Optimistic HZ'
                ? { textShadow: '0 0 12px rgba(0, 255, 136, 0.7), 0 0 4px rgba(0, 255, 136, 0.5)' }
                : undefined
            }
          >
            {p.name ?? 'Unknown'}
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className="badge-fade-in rounded border px-2 py-1 font-display text-xs uppercase tracking-widest"
              style={{ color: typeColor, borderColor: typeColor }}
            >
              {typeLabel}
            </span>
            <span className="badge-fade-in rounded border border-border px-2 py-1 font-display text-xs uppercase tracking-widest text-text-secondary">
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

          {p.name && (
            <a
              href={`https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(p.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex cursor-pointer items-center justify-center gap-1.5 self-start rounded border border-accent-cyan bg-surface-elevated px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-widest text-accent-cyan transition-colors hover:bg-accent-cyan hover:text-background"
            >
              <span>View on NASA Archive</span>
              <span>↗</span>
            </a>
          )}
        </div>
      )}
    </aside>
  );
}

export default PlanetSidebar;
