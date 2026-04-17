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
      className="w-full rounded border border-border bg-surface-elevated px-2 py-1.5 font-body text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt === 'all' ? 'All' : opt}
        </option>
      ))}
    </select>
  );
}

function FilterPanel({ filters, onFilterChange, totalCount, filteredCount, isOpen, onToggle }) {
  const handleReset = () => {
    Object.entries(DEFAULTS).forEach(([key, value]) => {
      onFilterChange(key, value);
    });
  };

  return (
    <div
      className={`fixed left-0 top-1/2 z-30 -translate-y-1/2 transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : '-translate-x-[220px]'
      }`}
    >
      <div className="relative">
        <div className="flex h-[560px] w-[220px] flex-col border-r border-border bg-surface p-4 shadow-2xl">
          <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-accent-cyan">
            Filters
          </h2>

          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            <div>
              <Label>Search</Label>
              <input
                id="search-input"
                type="text"
                value={filters.searchQuery}
                onChange={(e) => onFilterChange('searchQuery', e.target.value)}
                placeholder="Planet name..."
                className="w-full rounded border border-border bg-surface-elevated px-2 py-1.5 font-body text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan focus:outline-none"
              />
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
            {filteredCount.toLocaleString()} / {totalCount.toLocaleString()} planets
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="absolute left-full top-1/2 flex h-24 w-8 -translate-y-1/2 items-center justify-center border border-l-0 border-border bg-surface text-accent-cyan transition-colors hover:bg-surface-elevated"
          aria-label={isOpen ? 'Collapse filters' : 'Expand filters'}
        >
          <span className="block rotate-90 whitespace-nowrap font-display text-xs font-bold uppercase tracking-widest">
            Filters
          </span>
        </button>
      </div>
    </div>
  );
}

export default FilterPanel;
