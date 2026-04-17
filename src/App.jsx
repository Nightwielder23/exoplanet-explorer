import { useEffect, useMemo, useRef, useState } from 'react';
import { useExoplanets } from './hooks/useExoplanets';
import StarMap from './components/StarMap';
import PlanetSidebar from './components/PlanetSidebar';
import FilterPanel from './components/FilterPanel';
import MapControls from './components/MapControls';
import StatsPanel from './components/StatsPanel';
import MiniMap from './components/MiniMap';
import ComparePanel from './components/ComparePanel';
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

const TWINKLE_COLORS = ['#ffffff', '#00d4ff', '#00ff88', '#ffaa00', '#aa44ff'];
const MAX_TWINKLE_STARS = 40;

function App() {
  const { data, loading, error } = useExoplanets();
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [colorMode, setColorMode] = useState('type');
  const [highlightHZ, setHighlightHZ] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [transformState, setTransformState] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [featuredPlanet, setFeaturedPlanet] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePlanets, setComparePlanets] = useState([]);
  const [skeletonMounted, setSkeletonMounted] = useState(true);

  useEffect(() => {
    if (loading) setSkeletonMounted(true);
  }, [loading]);

  const handlePlanetClick = (planet) => {
    if (compareMode) {
      setComparePlanets((prev) => {
        if (prev.some((p) => p.name === planet.name)) {
          return prev.filter((p) => p.name !== planet.name);
        }
        if (prev.length >= 2) return [prev[1], planet];
        return [...prev, planet];
      });
    } else {
      setSelectedPlanet(planet);
    }
  };

  const exitCompareMode = () => {
    setComparePlanets([]);
    setCompareMode(false);
  };

  const settersRef = useRef({
    setSelectedPlanet,
    setFilterOpen,
    setFilters,
    setCompareMode,
    setComparePlanets,
  });
  settersRef.current = {
    setSelectedPlanet,
    setFilterOpen,
    setFilters,
    setCompareMode,
    setComparePlanets,
  };

  const resetZoomRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const starMapRef = useRef(null);
  const twinkleContainerRef = useRef(null);
  const twinkleStarsRef = useRef(new Set());

  useEffect(() => {
    if (!loading) return;
    const container = twinkleContainerRef.current;
    if (!container) return;

    const spawn = () => {
      if (twinkleStarsRef.current.size >= MAX_TWINKLE_STARS) return;
      const star = document.createElement('div');
      const size = 1 + Math.random() * 3;
      const color =
        TWINKLE_COLORS[Math.floor(Math.random() * TWINKLE_COLORS.length)];
      const duration = 0.8 + Math.random() * 1.7;
      star.style.position = 'absolute';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.borderRadius = '50%';
      star.style.backgroundColor = color;
      star.style.boxShadow = `0 0 ${size * 2}px ${color}`;
      star.style.opacity = '0';
      star.style.pointerEvents = 'none';
      star.style.animation = `fadeInOut ${duration}s ease-in-out forwards`;
      const handleEnd = () => {
        twinkleStarsRef.current.delete(star);
        star.remove();
      };
      star.addEventListener('animationend', handleEnd);
      twinkleStarsRef.current.add(star);
      container.appendChild(star);
    };

    const intervalId = window.setInterval(spawn, 200);
    spawn();

    return () => {
      window.clearInterval(intervalId);
      for (const star of twinkleStarsRef.current) {
        star.remove();
      }
      twinkleStarsRef.current.clear();
    };
  }, [loading]);

  useEffect(() => {
    if (!data || data.length === 0) return;
    const now = new Date();
    const idx = (now.getDate() + now.getMonth() * 31) % data.length;
    setFeaturedPlanet(data[idx]);
  }, [data]);

  useEffect(() => {
    if (!data || data.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const planetName = params.get('planet');
    if (!planetName) {
      hasLoadedRef.current = true;
      return;
    }
    const decoded = decodeURIComponent(planetName);
    const match = data.find(
      (p) => p.name && p.name.toLowerCase() === decoded.toLowerCase(),
    );
    if (match) {
      setSelectedPlanet(match);
      hasLoadedRef.current = true;
    } else {
      hasLoadedRef.current = true;
    }
  }, [data]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const url = new URL(window.location.href);
    if (selectedPlanet && selectedPlanet.name) {
      url.searchParams.set('planet', selectedPlanet.name);
    } else {
      url.searchParams.delete('planet');
    }
    window.history.replaceState({}, '', url);
  }, [selectedPlanet]);

  useEffect(() => {
    if (selectedPlanet && selectedPlanet.name) {
      document.title = `${selectedPlanet.name} | Exoplanet Explorer`;
    } else {
      document.title = 'Exoplanet Explorer';
    }
  }, [selectedPlanet]);

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
        settersRef.current.setComparePlanets([]);
        settersRef.current.setCompareMode(false);
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
      <header id="app-header" className="header-scan-bar relative z-50 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div className="flex flex-col">
          <h1
            className="font-display text-2xl font-bold tracking-[0.2em] text-accent-cyan"
            style={{ textShadow: '0 0 10px rgba(0, 212, 255, 0.6), 0 0 3px rgba(0, 212, 255, 0.4)' }}
          >
            EXOPLANET EXPLORER
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-text-secondary">
              NASA Confirmed Exoplanet Archive
            </span>
            {featuredPlanet && featuredPlanet.name && (
              <button
                type="button"
                onClick={() => setSelectedPlanet(featuredPlanet)}
                title="View today's featured planet"
                className="cursor-pointer font-display text-[10px] font-bold uppercase tracking-widest text-accent-amber transition-colors hover:text-accent-amber hover:underline"
                style={{ textShadow: '0 0 8px rgba(255, 170, 0, 0.6)' }}
              >
                Today: {featuredPlanet.name} <span className="star-pulse">★</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (compareMode) {
                exitCompareMode();
              } else {
                setCompareMode(true);
                setSelectedPlanet(null);
              }
            }}
            title={compareMode ? 'Exit compare mode' : 'Select two planets to compare'}
            className={`control-btn rounded border px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest transition-colors ${
              compareMode
                ? 'border-accent-amber bg-accent-amber/10 text-accent-amber'
                : 'border-border bg-surface text-accent-cyan'
            }`}
          >
            {compareMode
              ? `Compare (${comparePlanets.length}/2)`
              : 'Compare'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (filteredPlanets.length === 0) return;
              const idx = Math.floor(Math.random() * filteredPlanets.length);
              const planet = filteredPlanets[idx];
              if (compareMode) exitCompareMode();
              setSelectedPlanet(planet);
              starMapRef.current?.focusPlanet(planet);
            }}
            title="Jump to a random planet"
            className="ml-2 cursor-pointer font-display text-[11px] font-bold uppercase tracking-widest text-text-secondary transition-colors hover:text-accent-cyan hover:underline"
          >
            ⚄ Random
          </button>
          <div className="flex flex-col items-end">
            <span className="text-xs uppercase tracking-widest text-text-muted">
              Planets Loaded
            </span>
            <span
              key={loading ? 'loading' : 'loaded'}
              className={`font-display text-xl font-bold text-accent-teal ${
                loading ? '' : 'count-fade-in'
              }`}
            >
              {loading ? 'Loading...' : filteredPlanets.length.toLocaleString()}
            </span>
            {!loading && data && (
              <span className="text-[10px] uppercase tracking-widest text-text-muted">
                (of {data.length.toLocaleString()} total)
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="relative flex w-full h-full flex-1 items-center justify-center bg-background">
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
            ref={starMapRef}
            planets={filteredPlanets}
            onPlanetClick={handlePlanetClick}
            colorMode={colorMode}
            selectedPlanet={selectedPlanet}
            highlightHZ={highlightHZ}
            resetZoomRef={resetZoomRef}
            compareMode={compareMode}
            comparePlanets={comparePlanets}
            onTransformChange={(transform, width, height) => {
              setTransformState(transform);
              setCanvasSize((prev) =>
                prev.width === width && prev.height === height
                  ? prev
                  : { width, height },
              );
            }}
          />
        )}
      </main>

      <MapControls
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        highlightHZ={highlightHZ}
        onHighlightHZChange={(val) => setHighlightHZ(val)}
      />

      <MiniMap
        planets={filteredPlanets}
        transform={transformState}
        canvasWidth={canvasSize.width}
        canvasHeight={canvasSize.height}
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

      <button
        type="button"
        onClick={() => resetZoomRef.current?.()}
        title="Reset map to full sky view"
        className="control-btn fixed bottom-16 right-4 z-40 flex items-center gap-2 rounded border border-border bg-surface px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest text-accent-cyan transition-colors hover:bg-surface-elevated"
      >
        Reset Zoom
      </button>

      <div className="fixed bottom-4 right-4 z-40 flex items-end gap-2">
        <StatsPanel planets={filteredPlanets} />
        <div className="group relative">
          <button
            type="button"
            className="control-btn flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface font-display text-sm text-text-secondary transition-colors hover:border-accent-cyan hover:text-accent-cyan"
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
          featuredPlanet={featuredPlanet}
          onClose={() => setSelectedPlanet(null)}
        />
      </div>

      <ComparePanel planets={comparePlanets} onClose={exitCompareMode} />

      {skeletonMounted && (
        <div
          className={`pointer-events-none fixed inset-0 z-40 overflow-hidden bg-background transition-opacity duration-500 ease-out ${
            loading ? 'opacity-100' : 'opacity-0'
          }`}
          onTransitionEnd={(e) => {
            if (e.propertyName === 'opacity' && !loading) {
              setSkeletonMounted(false);
            }
          }}
          aria-hidden={!loading}
        >
          <div ref={twinkleContainerRef} className="absolute inset-0" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
            <h2
              className="font-display text-xl font-bold uppercase tracking-[0.3em] text-accent-cyan"
              style={{
                textShadow:
                  '0 0 14px rgba(0, 212, 255, 0.7), 0 0 4px rgba(0, 212, 255, 0.5)',
              }}
            >
              Scanning Exoplanet Archive...
            </h2>
            <div className="h-1 w-80 max-w-full overflow-hidden rounded bg-surface-elevated">
              <div className="skeleton-progress h-full" />
            </div>
            <p className="font-body text-xs uppercase tracking-widest text-text-muted">
              Loading 6,000+ confirmed exoplanets from NASA archive
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
