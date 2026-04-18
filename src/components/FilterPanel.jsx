import { useEffect, useMemo, useRef, useState } from 'react';
import { getPlanetType, getPlanetColor } from '../utils/planetClassifier';
import { playClick, playOpen } from '../utils/sounds';

const PLANET_TYPE_OPTIONS = [
  'all',
  'Hot Jupiter',
  'Jupiter-like',
  'Neptune-like',
  'Super Earth',
  'Earth-like',
  'Sub Earth',
  'Unknown',
];

const HABITABILITY_OPTIONS = [
  'all',
  'Optimistic HZ',
  'Too Hot',
  'Too Cold',
  'Unknown',
];

const DISCOVERY_METHOD_OPTIONS = [
  'all',
  'Transit',
  'Radial Velocity',
  'Direct Imaging',
  'Microlensing',
  'Other',
];

const DEFAULTS = {
  planetType: 'all',
  habitability: 'all',
  discoveryMethod: 'all',
  minDistance: 0,
  maxDistance: 30000,
  searchQuery: '',
};

function Label({ children }) {
  return (
    <label className="mb-1 block font-display text-[10px] uppercase tracking-widest text-text-secondary">
      {children}
    </label>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onClick={() => playOpen()}
      onChange={(e) => onChange(e.target.value)}
      className="w-full cursor-pointer rounded border border-border bg-surface-elevated px-2 py-1.5 font-body text-sm text-text-primary focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt === 'all' ? 'All' : opt}
        </option>
      ))}
    </select>
  );
}

const DistanceSlider = ({ minVal, maxVal, onChange }) => {
  const trackRef = useRef(null);
  const MIN = 0;
  const MAX = 30000;

  const getPercent = (val) => ((val - MIN) / (MAX - MIN)) * 100;

  const handleDrag = (e, handle) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawVal = Math.round((percent * (MAX - MIN) + MIN) / 100) * 100;

    if (handle === 'min') {
      onChange('minDistance', Math.min(rawVal, maxVal - 100));
    } else {
      onChange('maxDistance', Math.max(rawVal, minVal + 100));
    }
  };

  const startDrag = (handle) => (e) => {
    e.preventDefault();
    const move = (ev) => handleDrag(ev, handle);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', up);
  };

  const leftPercent = getPercent(minVal);
  const rightPercent = getPercent(maxVal);

  return (
    <div style={{ padding: '12px 8px' }}>
      <div ref={trackRef} style={{ position: 'relative', height: '4px', background: '#0c2038', borderRadius: '2px', margin: '10px 8px' }}>
        <div style={{
          position: 'absolute',
          left: leftPercent + '%',
          width: (rightPercent - leftPercent) + '%',
          height: '100%',
          background: '#00d4ff',
          borderRadius: '2px'
        }} />
        <div
          onMouseDown={startDrag('min')}
          onTouchStart={startDrag('min')}
          style={{
            position: 'absolute',
            left: leftPercent + '%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: '#00d4ff',
            boxShadow: '0 0 6px rgba(0,212,255,0.6)',
            cursor: 'grab',
            zIndex: 2
          }}
        />
        <div
          onMouseDown={startDrag('max')}
          onTouchStart={startDrag('max')}
          style={{
            position: 'absolute',
            left: rightPercent + '%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: '#00d4ff',
            boxShadow: '0 0 6px rgba(0,212,255,0.6)',
            cursor: 'grab',
            zIndex: 2
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'IBM Plex Mono', color: '#284060' }}>
        <span>{minVal.toLocaleString()} pc</span>
        <span>{maxVal.toLocaleString()} pc</span>
      </div>
    </div>
  );
};

function FilterPanel({
  filters,
  onFilterChange,
  totalCount,
  filteredCount,
  isOpen,
  onToggle,
  planets = [],
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchWrapRef = useRef(null);
  const countRef = useRef(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const el = countRef.current;
    if (!el) return;
    el.classList.remove('count-flash');
    void el.offsetWidth;
    el.classList.add('count-flash');
    const timer = setTimeout(() => {
      el.classList.remove('count-flash');
    }, 400);
    return () => clearTimeout(timer);
  }, [filteredCount]);

  const suggestions = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    if (!query) return [];
    const out = [];
    for (const p of planets) {
      if (!p.name) continue;
      const idx = p.name.toLowerCase().indexOf(query);
      if (idx !== -1) {
        out.push({ planet: p, matchStart: idx, matchLen: query.length });
        if (out.length >= 6) break;
      }
    }
    return out;
  }, [planets, filters.searchQuery]);

  useEffect(() => {
    if (!showSuggestions) return;
    const handlePointer = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showSuggestions]);

  const handleReset = () => {
    playClick();
    Object.entries(DEFAULTS).forEach(([key, value]) => {
      onFilterChange(key, value);
    });
  };

  let activeCount = 0;
  if (filters.planetType !== 'all') activeCount++;
  if (filters.habitability !== 'all') activeCount++;
  if (filters.discoveryMethod !== 'all') activeCount++;
  if (filters.searchQuery !== '') activeCount++;
  if (filters.minDistance !== 0 || filters.maxDistance !== 30000) activeCount++;
  const hasActiveFilters = activeCount > 0;

  return (
    <>
      <div
        className={`fixed z-40 transition-transform duration-300 ease-out bottom-[60px] left-0 right-0 w-full md:bottom-auto md:right-auto md:left-0 md:top-1/2 md:w-auto md:z-30 md:duration-300 md:ease-in-out ${
          isOpen
            ? 'translate-y-0 md:translate-x-0 md:-translate-y-1/2'
            : 'translate-y-full md:-translate-x-[220px] md:-translate-y-1/2'
        }`}
      >
        <div className="relative">
          <div className="flex max-h-[75vh] md:h-[560px] md:max-h-none w-full md:w-[220px] flex-col border-t md:border-t-0 md:border-r border-border bg-surface p-4 shadow-2xl">
          <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-accent-cyan">
            Filters
          </h2>

          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            <div>
              <Label>Search</Label>
              <div ref={searchWrapRef} className="relative">
                <input
                  id="search-input"
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) => {
                    onFilterChange('searchQuery', e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Planet name..."
                  autoComplete="off"
                  className="w-full rounded border border-border bg-surface-elevated px-2 py-1.5 font-body text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="suggestions-fade-in absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded border border-border bg-surface-elevated shadow-lg">
                    {suggestions.map(({ planet: sp, matchStart, matchLen }) => {
                      const name = sp.name;
                      const before = name.slice(0, matchStart);
                      const match = name.slice(matchStart, matchStart + matchLen);
                      const after = name.slice(matchStart + matchLen);
                      const type = getPlanetType(sp);
                      const typeColor = getPlanetColor(sp);
                      return (
                        <li key={name}>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              onFilterChange('searchQuery', name);
                              setShowSuggestions(false);
                            }}
                            className="group flex w-full items-center justify-between gap-2 border-l-2 border-transparent px-2 py-1.5 text-left font-body text-sm transition-colors hover:border-accent-cyan hover:bg-background"
                          >
                            <span className="truncate">
                              <span className="text-text-secondary">{before}</span>
                              <span className="text-accent-cyan">{match}</span>
                              <span className="text-text-secondary">{after}</span>
                            </span>
                            <span
                              className="shrink-0 rounded border px-1.5 py-0.5 font-display text-[9px] uppercase tracking-widest"
                              style={{ color: typeColor, borderColor: typeColor }}
                            >
                              {type}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <Label>Planet Type</Label>
              <Select
                value={filters.planetType}
                onChange={(v) => onFilterChange('planetType', v)}
                options={PLANET_TYPE_OPTIONS}
              />
            </div>

            <div>
              <Label>Habitability</Label>
              <Select
                value={filters.habitability}
                onChange={(v) => onFilterChange('habitability', v)}
                options={HABITABILITY_OPTIONS}
              />
            </div>

            <div>
              <Label>Discovery Method</Label>
              <Select
                value={filters.discoveryMethod}
                onChange={(v) => onFilterChange('discoveryMethod', v)}
                options={DISCOVERY_METHOD_OPTIONS}
              />
            </div>

            <div>
              <Label>Distance (Parsecs)</Label>
              <DistanceSlider
                minVal={filters.minDistance}
                maxVal={filters.maxDistance}
                onChange={onFilterChange}
              />
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="mt-2 w-full rounded border border-border bg-surface-elevated px-2 py-1.5 font-display text-xs uppercase tracking-widest text-text-secondary transition-colors hover:border-accent-cyan hover:text-accent-cyan"
            >
              Reset Filters
            </button>
          </div>

          <div className="mt-4 border-t border-border pt-3 text-center font-body text-xs text-text-muted">
            <span ref={countRef}>{filteredCount.toLocaleString()}</span>
            {' / '}
            {totalCount.toLocaleString()} planets
          </div>
        </div>

          <button
            type="button"
            onClick={() => { playOpen(); onToggle(); }}
            className="absolute bottom-auto left-full top-1/2 hidden h-24 w-8 -translate-y-1/2 items-center justify-center border border-l-0 border-border bg-surface text-accent-cyan transition-colors hover:bg-surface-elevated md:flex"
            aria-label={isOpen ? 'Collapse filters' : 'Expand filters'}
          >
            <span className="block rotate-90 whitespace-nowrap font-display text-xs font-bold uppercase tracking-widest">
              Filters
            </span>
            {!isOpen && activeCount > 0 && (
              <span
                className="absolute -right-2 -top-2 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent-cyan font-display text-[10px] font-bold text-background"
                style={{ boxShadow: '0 0 8px rgba(0, 212, 255, 0.9)' }}
                aria-label={`${activeCount} active filter${activeCount === 1 ? '' : 's'}`}
              >
                {activeCount > 9 ? '9+' : activeCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default FilterPanel;
