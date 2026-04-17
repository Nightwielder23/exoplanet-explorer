import { useEffect, useMemo, useRef, useState } from 'react';
import { useExoplanets } from './hooks/useExoplanets';
import StarMap from './components/StarMap';
import PlanetSidebar from './components/PlanetSidebar';
import FilterPanel from './components/FilterPanel';
import MapControls from './components/MapControls';
import StatsPanel from './components/StatsPanel';
import { getPlanetType, getHabitabilityZone } from './utils/planetClassifier';
import './App.css';

const KNOWN_DISCOVERY_METHODS = new Set([
  'transit',
  'radial velocity',
  'direct imaging',
  'microlensing',
]);

const DEFAULT_FILTERS = {
  planetType: 'all',
  habitability: 'all',
  discoveryMethod: 'all',
  minDistance: 0,
  maxDistance: 30000,
  searchQuery: '',
};

function App() {
  const { data, loading, error } = useExoplanets();
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [colorMode, setColorMode] = useState('type');
  const [highlightHZ, setHighlightHZ] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const settersRef = useRef({ setSelectedPlanet, setFilterOpen, setFilters });
  settersRef.current = { setSelectedPlanet, setFilterOpen, setFilters };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;
      const target = e.target;
      const isEditable =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (key === 'Escape') {
        settersRef.current.setSelectedPlanet(null);
        settersRef.current.setFilterOpen(false);
        if (isEditable) target.blur();
        return;
      }

      if (isEditable) return;

      if (key === 'f' || key === 'F') {
        e.preventDefault();
        settersRef.current.setFilterOpen(true);
        setTimeout(() => {
          document.getElementById('search-input')?.focus();
        }, 0);
      } else if (key === 'r' || key === 'R') {
        e.preventDefault();
        settersRef.current.setFilters(DEFAULT_FILTERS);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredPlanets = useMemo(() => {
    if (!data) return [];
    const query = filters.searchQuery.trim().toLowerCase();
    const methodFilter = filters.discoveryMethod;

    return data.filter((p) => {
      if (filters.planetType !== 'all' && getPlanetType(p) !== filters.planetType) {
        return false;
      }
      if (
        filters.habitability !== 'all' &&
        getHabitabilityZone(p) !== filters.habitability
      ) {
        return false;
      }
      if (methodFilter !== 'all') {
        const raw = (p.discoveryMethod || '').toLowerCase();
        const bucket = KNOWN_DISCOVERY_METHODS.has(raw)
          ? p.discoveryMethod
          : 'Other';
        if (bucket.toLowerCase() !== methodFilter.toLowerCase()) return false;
      }
      if (p.distance != null) {
        if (p.distance < filters.minDistance) return false;
        if (p.distance > filters.maxDistance) return false;
      }
      if (query) {
        const name = String(p.name ?? '').toLowerCase();
        if (!name.includes(query)) return false;
      }
      return true;
    });
  }, [data, filters]);

  return (
    <div className="flex h-screen w-screen flex-col bg-background font-body text-text-primary">
      <header className="relative z-50 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div className="flex flex-col">
          <h1
            className="font-display text-2xl font-bold tracking-[0.2em] text-accent-cyan"
            style={{ textShadow: '0 0 10px rgba(0, 212, 255, 0.6), 0 0 3px rgba(0, 212, 255, 0.4)' }}
          >
            EXOPLANET EXPLORER
          </h1>
          <span className="text-xs uppercase tracking-widest text-text-secondary">
            NASA Confirmed Exoplanet Archive
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs uppercase tracking-widest text-text-muted">
            Planets Loaded
          </span>
          <span className="font-display text-xl font-bold text-accent-teal">
            {loading ? 'Loading...' : filteredPlanets.length.toLocaleString()}
          </span>
          {!loading && data && (
            <span className="text-[10px] uppercase tracking-widest text-text-muted">
              (of {data.length.toLocaleString()} total)
            </span>
          )}
        </div>
      </header>

      <main className="relative flex w-full h-full flex-1 items-center justify-center bg-background">
        {loading && (
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-accent-cyan" />
        )}
        {!loading && error && (
          <div className="max-w-md text-center">
            <p className="mb-2 font-display text-lg uppercase tracking-widest text-accent-red">
              Connection Error
            </p>
            <p className="text-sm text-text-secondary">
              {error.message || 'Failed to load exoplanet data.'}
            </p>
          </div>
        )}
        {!loading && !error && data && (
          <StarMap
            planets={filteredPlanets}
            onPlanetClick={(planet) => setSelectedPlanet(planet)}
            colorMode={colorMode}
            selectedPlanet={selectedPlanet}
            highlightHZ={highlightHZ}
          />
        )}
      </main>

      <MapControls
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        highlightHZ={highlightHZ}
        onHighlightHZChange={(val) => setHighlightHZ(val)}
      />

      <div className="relative z-40">
        <FilterPanel
          filters={filters}
          onFilterChange={(key, val) =>
            setFilters((prev) => ({ ...prev, [key]: val }))
          }
          totalCount={data?.length ?? 0}
          filteredCount={filteredPlanets.length}
          isOpen={filterOpen}
          onToggle={() => setFilterOpen((v) => !v)}
        />
      </div>

      <div className="fixed bottom-4 right-4 z-40 flex items-end gap-2">
        <StatsPanel planets={filteredPlanets} />
        <div className="group relative">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface font-display text-sm text-text-secondary transition-colors hover:border-accent-cyan hover:text-accent-cyan"
            aria-label="Show keyboard shortcuts"
          >
            ?
          </button>
          <div className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded border border-border bg-surface px-3 py-2 font-body text-[11px] text-text-secondary opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            <div className="mb-1 font-display text-[10px] uppercase tracking-widest text-text-muted">
              Shortcuts
            </div>
            <div>
              <span className="text-accent-cyan">Esc</span> — close panels
            </div>
            <div>
              <span className="text-accent-cyan">F</span> — focus search
            </div>
            <div>
              <span className="text-accent-cyan">R</span> — reset filters
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-50">
        <PlanetSidebar
          planet={selectedPlanet}
          onClose={() => setSelectedPlanet(null)}
        />
      </div>
    </div>
  );
}

export default App;
