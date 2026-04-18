import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getPlanetType,
  getPlanetColor,
  getHabitabilityZone,
} from '../utils/planetClassifier';
import { playClick } from '../utils/sounds';

const EARTH_EQ_TEMP = 255;

function pickWinner(aVal, bVal, rule) {
  if (aVal == null || bVal == null) return null;
  if (Number.isNaN(aVal) || Number.isNaN(bVal)) return null;
  if (aVal === bVal) return null;
  if (rule === 'higher') return aVal > bVal ? 'a' : 'b';
  return aVal < bVal ? 'a' : 'b';
}

function pickCloserTo(aVal, bVal, target) {
  if (aVal == null || bVal == null) return null;
  if (Number.isNaN(aVal) || Number.isNaN(bVal)) return null;
  const aDist = Math.abs(aVal - target);
  const bDist = Math.abs(bVal - target);
  if (aDist === bDist) return null;
  return aDist < bDist ? 'a' : 'b';
}

function fmt(val, suffix, digits) {
  if (val == null || Number.isNaN(val)) return 'Unknown';
  return typeof val === 'number'
    ? `${val.toFixed(digits)}${suffix}`
    : `${val}${suffix}`;
}

function Row({ label, aValue, bValue, winner }) {
  const winClass = 'text-accent-teal font-bold';
  const baseClass = 'text-text-primary';
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded border-b border-border/40 px-2 py-2 transition-colors duration-150 hover:bg-surface-elevated">
      <span
        className={`text-right font-body text-sm ${
          winner === 'a' ? winClass : baseClass
        }`}
      >
        {aValue}
      </span>
      <span className="whitespace-nowrap px-2 font-display text-[10px] uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <span
        className={`text-left font-body text-sm ${
          winner === 'b' ? winClass : baseClass
        }`}
      >
        {bValue}
      </span>
    </div>
  );
}

function PlanetHeading({ planet, align }) {
  if (!planet) return null;
  const type = getPlanetType(planet);
  const typeColor = getPlanetColor(planet);
  const hz = getHabitabilityZone(planet);
  const alignClass =
    align === 'right' ? 'items-end text-right' : 'items-start text-left';
  return (
    <div className={`flex flex-col gap-2 ${alignClass}`}>
      <h3 className="font-display text-xl font-bold tracking-widest text-accent-cyan">
        {planet.name ?? 'Unknown'}
      </h3>
      <div
        className={`flex flex-wrap gap-2 ${
          align === 'right' ? 'justify-end' : 'justify-start'
        }`}
      >
        <span
          className="badge-fade-in rounded border px-2 py-1 font-display text-[10px] uppercase tracking-widest"
          style={{ color: typeColor, borderColor: typeColor }}
        >
          {type}
        </span>
        <span className="badge-fade-in rounded border border-border px-2 py-1 font-display text-[10px] uppercase tracking-widest text-text-secondary">
          {hz}
        </span>
      </div>
    </div>
  );
}

function ComparePanel({ planets, onClose }) {
  const [a, b] = planets;
  const [isClosing, setIsClosing] = useState(false);
  const isOpen = Boolean(a && b) && !isClosing;

  const handleClose = () => {
    if (isClosing) return;
    playClick();
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const rows = useMemo(() => {
    if (!a || !b) return [];
    return [
      {
        label: 'Host Star',
        a: a.starType || 'Unknown',
        b: b.starType || 'Unknown',
        winner: null,
      },
      {
        label: 'Distance',
        a: fmt(a.distance, ' pc', 1),
        b: fmt(b.distance, ' pc', 1),
        winner: pickWinner(a.distance, b.distance, 'lower'),
      },
      {
        label: 'Mass',
        a: fmt(a.mass, ' M⊕', 2),
        b: fmt(b.mass, ' M⊕', 2),
        winner: pickWinner(a.mass, b.mass, 'higher'),
      },
      {
        label: 'Radius',
        a: fmt(a.radius, ' R⊕', 2),
        b: fmt(b.radius, ' R⊕', 2),
        winner: pickWinner(a.radius, b.radius, 'higher'),
      },
      {
        label: 'Orbital Period',
        a: fmt(a.orbitalPeriod, ' days', 1),
        b: fmt(b.orbitalPeriod, ' days', 1),
        winner: pickWinner(a.orbitalPeriod, b.orbitalPeriod, 'higher'),
      },
      {
        label: 'Eq. Temperature',
        a: a.equilibriumTemp != null ? `${a.equilibriumTemp} K` : 'Unknown',
        b: b.equilibriumTemp != null ? `${b.equilibriumTemp} K` : 'Unknown',
        winner: pickCloserTo(a.equilibriumTemp, b.equilibriumTemp, EARTH_EQ_TEMP),
      },
      {
        label: 'Discovery Method',
        a: a.discoveryMethod || 'Unknown',
        b: b.discoveryMethod || 'Unknown',
        winner: null,
      },
      {
        label: 'Discovery Year',
        a: a.discoveryYear ?? 'Unknown',
        b: b.discoveryYear ?? 'Unknown',
        winner: pickWinner(a.discoveryYear, b.discoveryYear, 'lower'),
      },
    ];
  }, [a, b]);

  return (
    <aside
      className={`fixed bottom-0 left-0 right-0 z-40 hidden md:block border-t border-border bg-surface shadow-2xl ${
        isClosing
          ? 'translate-y-0 compare-slide-out'
          : a && b
            ? 'translate-y-0 compare-slide-in'
            : 'translate-y-full'
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        onClick={handleClose}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded border border-border text-text-secondary transition-colors hover:border-accent-cyan hover:text-accent-cyan"
        aria-label="Close comparison"
      >
        ×
      </button>
      {a && b && (
        <div className="px-8 py-6">
          <div className="mb-3 text-center font-display text-[10px] uppercase tracking-widest text-text-muted">
            Planet Comparison
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 border-b border-border/60 pb-4 pr-12">
            <PlanetHeading planet={a} align="right" />
            <span className="font-display text-sm font-bold uppercase tracking-widest text-accent-amber">
              VS
            </span>
            <PlanetHeading planet={b} align="left" />
          </div>
          <div className="mt-2 max-h-[40vh] overflow-y-auto">
            {rows.map((row) => (
              <Row
                key={row.label}
                label={row.label}
                aValue={row.a}
                bValue={row.b}
                winner={row.winner}
              />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

export default ComparePanel;
