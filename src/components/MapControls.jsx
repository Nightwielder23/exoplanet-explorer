import { getPlanetColor } from '../utils/planetClassifier';

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

function ToggleButton({ active, onClick, children, variant = 'cyan' }) {
  const activeClass =
    variant === 'teal'
      ? 'bg-accent-teal text-background shadow-[0_0_10px_rgba(0,255,136,0.6)]'
      : 'bg-accent-cyan text-background';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-widest transition-colors ${
        active
          ? activeClass
          : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function MapControls({ colorMode, onColorModeChange, highlightHZ, onHighlightHZChange }) {
  const legend = colorMode === 'habitability' ? HABITABILITY_LEGEND : TYPE_LEGEND;

  return (
    <div className="fixed bottom-4 left-4 z-40 w-[200px] rounded border border-border bg-surface/90 p-3 shadow-2xl backdrop-blur">
      <div className="flex overflow-hidden rounded border border-border">
        <ToggleButton
          active={colorMode === 'type'}
          onClick={() => onColorModeChange('type')}
        >
          By Type
        </ToggleButton>
        <ToggleButton
          active={colorMode === 'habitability'}
          onClick={() => onColorModeChange('habitability')}
        >
          By Habitability
        </ToggleButton>
      </div>

      <div className="mt-2 flex overflow-hidden rounded border border-border">
        <ToggleButton
          variant="teal"
          active={highlightHZ}
          onClick={() => onHighlightHZChange(!highlightHZ)}
        >
          Highlight HZ
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
  );
}

export default MapControls;
