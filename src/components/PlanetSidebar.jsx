import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getPlanetType,
  getPlanetColor,
  getHabitabilityZone,
  getConstellation,
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

function PlanetSidebar({ planet, onClose, featuredPlanet, data = [], onSelectPlanet }) {
  const lastPlanetRef = useRef(planet);
  const [displayPlanet, setDisplayPlanet] = useState(planet);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  );

  useEffect(() => {
    if (planet) {
      lastPlanetRef.current = planet;
      setDisplayPlanet(planet);
    }
  }, [planet]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isOpen = Boolean(planet);
  const p = displayPlanet;

  const typeLabel = p ? getPlanetType(p) : 'Unknown';
  const typeColor = p ? getPlanetColor(p) : '#3d6080';
  const habitability = p ? getHabitabilityZone(p) : 'Unknown';
  const constellation = p ? getConstellation(p) : null;

  const fmt = (val, suffix, digits) => {
    if (val == null || Number.isNaN(val)) return 'Unknown';
    return typeof val === 'number' ? `${val.toFixed(digits)}${suffix}` : `${val}${suffix}`;
  };

  const coords =
    p && p.ra != null && p.dec != null
      ? `RA ${p.ra.toFixed(2)}°, Dec ${p.dec.toFixed(2)}°`
      : 'Unknown';

  const similar = useMemo(() => {
    if (!p || !Array.isArray(data) || data.length === 0) return [];
    const targetType = getPlanetType(p);
    const targetR = p.radius;
    if (targetR == null || Number.isNaN(targetR)) return [];
    const matches = [];
    for (const other of data) {
      if (!other || other === p) continue;
      if (other.name && p.name && other.name === p.name) continue;
      if (other.radius == null || Number.isNaN(other.radius)) continue;
      if (getPlanetType(other) !== targetType) continue;
      matches.push(other);
    }
    matches.sort(
      (a, b) => Math.abs(a.radius - targetR) - Math.abs(b.radius - targetR),
    );
    return matches.slice(0, 3);
  }, [p, data]);

  const outerStyle = isMobile
    ? {
        position: 'fixed',
        bottom: 60,
        left: 0,
        right: 0,
        height: '75vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0a1628',
        borderTop: '1px solid #1a3a6b',
        zIndex: 500,
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }
    : {
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100vh',
        width: '360px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0a1628',
        borderLeft: '1px solid #1a3a6b',
        zIndex: 500,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      };

  return (
    <div style={outerStyle} aria-hidden={!isOpen}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close planet details"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 32,
          width: 32,
          borderRadius: 4,
          border: '1px solid #1a3a6b',
          backgroundColor: 'rgba(10, 22, 40, 0.8)',
          color: '#8a9cb8',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
      {p && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '20px',
            paddingBottom: '40px',
            paddingLeft: '24px',
            paddingRight: '24px',
          }}
        >
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
            <Row label="Constellation" value={constellation || 'Unknown'} />
            <Row label="Coordinates" value={coords} />
          </div>

          {similar.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 font-display text-[10px] uppercase tracking-widest text-text-secondary">
                Similar Planets
              </div>
              <div className="flex flex-col gap-1.5">
                {similar.map((sp) => {
                  const spType = getPlanetType(sp);
                  const spColor = getPlanetColor(sp);
                  return (
                    <button
                      key={sp.name ?? `${sp.ra}-${sp.dec}-${sp.radius}`}
                      type="button"
                      onClick={() => onSelectPlanet?.(sp)}
                      className="flex flex-col gap-1 rounded border border-border bg-surface-elevated px-2 py-1.5 text-left transition-colors hover:border-accent-cyan"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-body text-sm text-text-primary">
                          {sp.name ?? 'Unknown'}
                        </span>
                        <span className="whitespace-nowrap font-body text-[11px] text-text-muted">
                          {fmt(sp.distance, ' pc', 1)}
                        </span>
                      </div>
                      <span
                        className="self-start rounded border px-1.5 py-0.5 font-display text-[9px] uppercase tracking-widest"
                        style={{ color: spColor, borderColor: spColor }}
                      >
                        {spType}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
    </div>
  );
}

export default PlanetSidebar;
