import { useEffect, useMemo, useRef, useState } from 'react';

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
    const onEnd = () => {
      el.classList.remove('count-flash');
      el.removeEventListener('animationend', onEnd);
    };
    el.addEventListener('animationend', onEnd);
    return () => el.removeEventListener('animationend', onEnd);
  }, [filteredCount]);

  const suggestions = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    if (!query) return [];
    const out = [];
    for (const p of planets) {
      if (!p.name) continue;
      if (p.name.toLowerCase().includes(query)) {
        out.push(p.name);
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
    Object.entries(DEFAULTS).forEach(([key, value]) => {
      onFilterChange(key, value);
    });
  };

  const hasActiveFilters =
    filters.planetType !== 'all' ||
    filters.habitability !== 'all' ||
    filters.discoveryMethod !== 'all' ||
    filters.searchQuery !== '' ||
    filters.minDistance !== 0 ||
    filters.maxDistance !== 30000;

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
                  <ul className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded border border-border bg-surface-elevated shadow-lg">
                    {suggestions.map((name) => (
                      <li key={name}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onFilterChange('searchQuery', name);
                            setShowSuggestions(false);
                          }}
                          className="block w-full truncate px-2 py-1.5 text-left font-body text-sm text-text-primary transition-colors hover:bg-background"
                        >
                          {name}
                        </button>
                      </li>
                    ))}
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
              <div className="dual-range">
                <input
                  type="range"
                  min={0}
                  max={30000}
                  step={100}
                  value={filters.minDistance}
                  onChange={(e) => {
                    const v = Math.min(Number(e.target.value), filters.maxDistance);
                    onFilterChange('minDistance', v);
                  }}
                  className="cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                />
                <input
                  type="range"
                  min={0}
                  max={30000}
                  step={100}
                  value={filters.maxDistance}
                  onChange={(e) => {
                    const v = Math.max(Number(e.target.value), filters.minDistance);
                    onFilterChange('maxDistance', v);
                  }}
                  className="cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                />
              </div>
              <div className="mt-1 font-body text-xs text-text-muted">
                {filters.minDistance.toLocaleString()} pc — {filters.maxDistance.toLocaleString()} pc
              </div>
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
            onClick={onToggle}
            className="absolute bottom-auto left-full top-1/2 hidden h-24 w-8 -translate-y-1/2 items-center justify-center border border-l-0 border-border bg-surface text-accent-cyan transition-colors hover:bg-surface-elevated md:flex"
            aria-label={isOpen ? 'Collapse filters' : 'Expand filters'}
          >
            <span className="block rotate-90 whitespace-nowrap font-display text-xs font-bold uppercase tracking-widest">
              Filters
            </span>
            {!isOpen && hasActiveFilters && (
              <span
                className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent-cyan"
                style={{ boxShadow: '0 0 8px rgba(0, 212, 255, 1)' }}
                aria-label="Filters active"
              />
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default FilterPanel;
