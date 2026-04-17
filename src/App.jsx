import { useMemo, useState } from 'react';
import { useExoplanets } from './hooks/useExoplanets';
import StarMap from './components/StarMap';
import PlanetSidebar from './components/PlanetSidebar';
import FilterPanel from './components/FilterPanel';
import MapControls from './components/MapControls';
import { getPlanetType, getHabitabilityZone } from './utils/planetClassifier';
import './App.css';

const KNOWN_DISCOVERY_METHODS = new Set([
  'transit',
  'radial velocity',
  'direct imaging',
  'microlensing',
]);

function App() {
  const { data, loading, error } = useExoplanets();
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [colorMode, setColorMode] = useState('type');
  const [filters, setFilters] = useState({
    planetType: 'all',
    habitability: 'all',
    discoveryMethod: 'all',
    minDistance: 0,
    maxDistance: 30000,
    searchQuery: '',
  });

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
          />
        )}
      </main>

      <MapControls colorMode={colorMode} onColorModeChange={setColorMode} />

      <div className="relative z-40">
        <FilterPanel
          filters={filters}
          onFilterChange={(key, val) =>
            setFilters((prev) => ({ ...prev, [key]: val }))
          }
          totalCount={data?.length ?? 0}
          filteredCount={filteredPlanets.length}
        />
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
