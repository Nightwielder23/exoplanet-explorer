import { useEffect, useRef } from 'react';
import { getPlanetColor } from '../utils/planetClassifier';
import { playClick, playOpen } from '../utils/sounds';

const isMobile = window.innerWidth < 768 || /iPhone|iPad|Android/i.test(navigator.userAgent);

const TYPE_LEGEND = [
  { label: 'Hot Jupiter', sample: { radius: 12, orbitalPeriod: 3 } },
  { label: 'Jupiter-like', sample: { radius: 12, orbitalPeriod: 400 } },
  { label: 'Neptune-like', sample: { radius: 4 } },
  { label: 'Super Earth', sample: { radius: 1.5 } },
  { label: 'Earth-like', sample: { radius: 1.0 } },
  { label: 'Sub Earth', sample: { radius: 0.5 } },
  { label: 'Unknown', sample: {} },
].map((item) => ({ label: item.label, color: getPlanetColor(item.sample) }));

const HABITABILITY_LEGEND = [
  { label: 'Optimistic HZ', color: '#00ff88' },
  { label: 'Too Hot', color: '#ff4466' },
  { label: 'Too Cold', color: '#00d4ff' },
  { label: 'Unknown', color: '#3d6080' },
];

function LegendDot({ color }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{
        backgroundColor: color,
        boxShadow: `0 0 6px ${color}, 0 0 2px ${color}`,
      }}
    />
  );
}

function ToggleButton({ active, onClick, children, variant = 'cyan', title }) {
  const activeClass =
    variant === 'teal'
      ? 'bg-accent-teal text-background shadow-[0_0_10px_rgba(0,255,136,0.6)]'
      : 'bg-accent-cyan text-background';
  return (
    <button
      type="button"
      onClick={() => { playClick(); onClick(); }}
      title={title}
      className={`control-btn flex-1 px-1.5 py-1 md:px-3 md:py-1.5 font-display text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-colors ${
        active
          ? activeClass
          : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function MapControls({
  colorMode,
  onColorModeChange,
  highlightHZ,
  onHighlightHZChange,
  heatmapMode,
  onHeatmapChange,
  showConstellations,
  onConstellationsChange,
  isOpen,
  onToggle,
}) {
  const legend = colorMode === 'habitability' ? HABITABILITY_LEGEND : TYPE_LEGEND;

  const hasMounted = useRef(false);
  useEffect(() => {
    if (isMobile) {
      const timer = setTimeout(() => { hasMounted.current = true; }, 500);
      return () => clearTimeout(timer);
    } else {
      hasMounted.current = true;
    }
  }, []);

  return (
    <div
      className={`fixed bottom-4 left-0 z-30 hidden md:block ${
        isOpen ? 'translate-x-0' : '-translate-x-[200px]'
      }`}
      style={{ transition: hasMounted.current ? 'all 0.3s ease' : 'none' }}
    >
      <div className="relative">
        <div className="w-[200px] rounded-r border border-l-0 border-border bg-surface/90 p-3 shadow-2xl backdrop-blur">
          <div className="flex overflow-hidden rounded border border-border">
            <ToggleButton
              active={colorMode === 'type'}
              onClick={() => onColorModeChange('type')}
              title="Color planets by size category"
            >
              By Type
            </ToggleButton>
            <ToggleButton
              active={colorMode === 'habitability'}
              onClick={() => onColorModeChange('habitability')}
              title="Color planets by temperature zone"
            >
              By Habitability
            </ToggleButton>
          </div>

          <div className="mt-2 flex overflow-hidden rounded border border-border">
            <ToggleButton
              variant="teal"
              active={highlightHZ}
              onClick={() => onHighlightHZChange(!highlightHZ)}
              title="Highlight habitable zone planets"
            >
              Highlight HZ
            </ToggleButton>
          </div>

          <div className="mt-2 flex overflow-hidden rounded border border-border">
            <ToggleButton
              active={heatmapMode}
              onClick={() => onHeatmapChange(!heatmapMode)}
              title="Show star density heatmap overlay"
            >
              Heatmap
            </ToggleButton>
          </div>

          <div className="mt-2 flex overflow-hidden rounded border border-border">
            <ToggleButton
              active={showConstellations}
              onClick={() => onConstellationsChange(!showConstellations)}
              title="Overlay familiar constellation outlines"
            >
              Constellations
            </ToggleButton>
          </div>

          <ul className="mt-3 flex flex-col gap-1.5">
            {legend.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-2 font-body text-xs text-text-secondary"
              >
                <LegendDot color={item.color} />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => { playOpen(); onToggle(); }}
          className="absolute left-full top-1/2 flex h-24 w-8 -translate-y-1/2 items-center justify-center border border-l-0 border-border bg-surface text-accent-cyan transition-colors hover:bg-surface-elevated"
          aria-label={isOpen ? 'Collapse controls' : 'Expand controls'}
        >
          <span className="block rotate-90 whitespace-nowrap font-display text-xs font-bold uppercase tracking-widest">
            Controls
          </span>
        </button>
      </div>
    </div>
  );
}

export default MapControls;
