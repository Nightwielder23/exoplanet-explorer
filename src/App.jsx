import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useExoplanets } from './hooks/useExoplanets';
import StarMap from './components/StarMap';
import PlanetSidebar from './components/PlanetSidebar';
import FilterPanel from './components/FilterPanel';
import MapControls from './components/MapControls';
import StatsPanel from './components/StatsPanel';
import MiniMap from './components/MiniMap';
import ComparePanel from './components/ComparePanel';
import { getPlanetType, getHabitabilityZone } from './utils/planetClassifier';
import { setSfxEnabled as setSfxEnabledModule, setSfxVolume as setSfxVolumeModule, playClick, playOpen } from './utils/sounds';
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
const MAX_TWINKLE_STARS = 120;

let portraitDismissedThisSession = false;

function MobileStatsSheet({ planets, onClose, isOpen, onExport, onResetZoom }) {
  const summary = useMemo(() => {
    const typeCounts = new Map();
    const methodCounts = new Map();
    let distSum = 0;
    let distCount = 0;
    let hzCount = 0;
    let minYear = Infinity;

    for (const p of planets) {
      const type = getPlanetType(p);
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);

      const method = p.discoveryMethod || 'Unknown';
      methodCounts.set(method, (methodCounts.get(method) || 0) + 1);

      if (p.distance != null && Number.isFinite(p.distance)) {
        distSum += p.distance;
        distCount += 1;
      }
      if (getHabitabilityZone(p) === 'Optimistic HZ') hzCount += 1;
      if (p.discoveryYear != null && p.discoveryYear < minYear) {
        minYear = p.discoveryYear;
      }
    }

    let mostCommonType = '—';
    let maxCount = 0;
    for (const [type, count] of typeCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonType = type;
      }
    }

    const topMethods = [...methodCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      mostCommonType,
      avgDistance: distCount > 0 ? distSum / distCount : null,
      hzCount,
      earliestYear: minYear === Infinity ? null : minYear,
      topMethods,
    };
  }, [planets]);

  const avgDistanceLabel =
    summary.avgDistance != null
      ? `${summary.avgDistance.toLocaleString(undefined, { maximumFractionDigits: 1 })} pc`
      : '—';

  const tile = (label, value) => (
    <div className="rounded border border-border bg-surface-elevated px-2 py-2">
      <div className="font-display text-[9px] uppercase tracking-widest text-text-muted">
        {label}
      </div>
      <div className="mt-0.5 truncate font-body text-sm text-text-primary">
        {value}
      </div>
    </div>
  );

  const maxMethod = summary.topMethods[0]?.[1] ?? 1;

  return (
    <div
      className={`fixed left-0 right-0 z-40 flex max-h-[75vh] flex-col overflow-y-auto border-t border-border bg-surface md:hidden transition-transform duration-300 ease-out ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ bottom: 60 }}
      aria-hidden={!isOpen}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="font-display text-xs font-bold uppercase tracking-widest text-accent-cyan">
          Statistics ({planets.length.toLocaleString()})
        </span>
        <button
          type="button"
          onClick={() => { playClick(); onClose(); }}
          className="font-display text-lg text-text-secondary hover:text-accent-cyan"
          aria-label="Close statistics"
        >
          ×
        </button>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          {tile('Most Common', summary.mostCommonType)}
          {tile('Avg Distance', avgDistanceLabel)}
          {tile('Habitable Zone', summary.hzCount.toLocaleString())}
          {tile('Earliest', summary.earliestYear ?? '—')}
        </div>

        <div className="rounded border border-border bg-surface-elevated p-3">
          <div className="mb-2 font-display text-[10px] uppercase tracking-widest text-text-muted">
            Discovery Methods (Top 5)
          </div>
          <ul className="flex flex-col gap-1.5">
            {summary.topMethods.map(([method, count]) => (
              <li key={method} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate font-body text-[11px] text-text-secondary">
                  {method}
                </span>
                <span className="relative h-2 flex-1 overflow-hidden rounded bg-border/40">
                  <span
                    className="absolute inset-y-0 left-0 bg-accent-cyan"
                    style={{ width: `${(count / maxMethod) * 100}%`, opacity: 0.85 }}
                  />
                </span>
                <span className="w-10 shrink-0 text-right font-body text-[11px] text-text-primary">
                  {count.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="my-1 border-t border-border" />

        <button
          type="button"
          onClick={() => {
            playClick();
            onExport?.();
            onClose();
          }}
          className="flex min-h-[44px] items-center justify-center rounded border border-border bg-surface-elevated px-3 py-2 font-display text-xs font-bold uppercase tracking-widest text-accent-cyan transition-colors hover:border-accent-cyan"
        >
          Export PNG
        </button>
        <button
          type="button"
          onClick={() => {
            playClick();
            onResetZoom?.();
            onClose();
          }}
          className="flex min-h-[44px] items-center justify-center rounded border border-border bg-surface-elevated px-3 py-2 font-display text-xs font-bold uppercase tracking-widest text-accent-cyan transition-colors hover:border-accent-cyan"
        >
          Reset Zoom
        </button>

        <div className="rounded border border-border bg-surface-elevated p-3">
          <div className="mb-2 font-display text-[10px] uppercase tracking-widest text-text-muted">
            Keyboard Shortcuts
          </div>
          <ul className="space-y-1 font-body text-[11px] text-text-secondary">
            <li><span className="text-accent-cyan">Esc</span> — close panels</li>
            <li><span className="text-accent-cyan">F</span> — focus search</li>
            <li><span className="text-accent-cyan">R</span> — reset filters</li>
            <li><span className="text-accent-cyan">C</span> — toggle constellations</li>
            <li><span className="text-accent-cyan">H</span> — toggle heatmap</li>
            <li><span className="text-accent-cyan">M</span> — toggle compare mode</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const TYPE_LEGEND_MOBILE = [
  { label: 'Hot Jupiter', color: '#ff4466' },
  { label: 'Jupiter-like', color: '#ffaa00' },
  { label: 'Neptune-like', color: '#aa44ff' },
  { label: 'Super Earth', color: '#00d4ff' },
  { label: 'Earth-like', color: '#00ff88' },
  { label: 'Sub Earth', color: '#7ba7c9' },
  { label: 'Unknown', color: '#3d6080' },
];

const HABITABILITY_LEGEND_MOBILE = [
  { label: 'Optimistic HZ', color: '#00ff88' },
  { label: 'Too Hot', color: '#ff4466' },
  { label: 'Too Cold', color: '#00d4ff' },
  { label: 'Unknown', color: '#3d6080' },
];

function MobileControlsSheet({
  isOpen,
  onClose,
  colorMode,
  onColorModeChange,
  highlightHZ,
  onHighlightHZChange,
  heatmapMode,
  onHeatmapChange,
  showConstellations,
  onConstellationsChange,
}) {
  const legend =
    colorMode === 'habitability' ? HABITABILITY_LEGEND_MOBILE : TYPE_LEGEND_MOBILE;

  const toggleBtn = (active, onClick, children, variant = 'cyan') => {
    const activeClass =
      variant === 'teal'
        ? 'bg-accent-teal text-background shadow-[0_0_10px_rgba(0,255,136,0.6)]'
        : 'bg-accent-cyan text-background';
    return (
      <button
        type="button"
        onClick={() => { playClick(); onClick(); }}
        className={`flex-1 min-h-[44px] px-2 py-2 font-display text-[11px] font-bold uppercase tracking-widest transition-colors ${
          active
            ? activeClass
            : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
        }`}
      >
        {children}
      </button>
    );
  };

  return (
    <div
      className={`fixed left-0 right-0 z-40 flex max-h-[75vh] flex-col overflow-y-auto border-t border-border bg-surface md:hidden transition-transform duration-300 ease-out ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ bottom: 60 }}
      aria-hidden={!isOpen}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="font-display text-xs font-bold uppercase tracking-widest text-accent-cyan">
          Controls
        </span>
        <button
          type="button"
          onClick={() => { playClick(); onClose(); }}
          className="font-display text-lg text-text-secondary hover:text-accent-cyan"
          aria-label="Close controls"
        >
          ×
        </button>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex overflow-hidden rounded border border-border">
          {toggleBtn(colorMode === 'type', () => onColorModeChange('type'), 'By Type')}
          {toggleBtn(
            colorMode === 'habitability',
            () => onColorModeChange('habitability'),
            'By Habitability',
          )}
        </div>

        <div className="flex overflow-hidden rounded border border-border">
          {toggleBtn(highlightHZ, () => onHighlightHZChange(!highlightHZ), 'Highlight HZ', 'teal')}
        </div>

        <div className="flex overflow-hidden rounded border border-border">
          {toggleBtn(heatmapMode, () => onHeatmapChange(!heatmapMode), 'Heatmap')}
        </div>

        <div className="flex overflow-hidden rounded border border-border">
          {toggleBtn(
            showConstellations,
            () => onConstellationsChange(!showConstellations),
            'Constellations',
          )}
        </div>

        <ul className="flex flex-col gap-1.5 rounded border border-border bg-surface-elevated p-3">
          {legend.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 font-body text-xs text-text-secondary"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: item.color,
                  boxShadow: `0 0 6px ${item.color}, 0 0 2px ${item.color}`,
                }}
              />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

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
  const [showConstellations, setShowConstellations] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [displayCount, setDisplayCount] = useState(0);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [statsSheetOpen, setStatsSheetOpen] = useState(false);
  const [controlsSheetOpen, setControlsSheetOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.15);
  const [sfxVolume, setSfxVolume] = useState(0.35);
  const audioRef = useRef(null);

  useEffect(() => {
    setSfxEnabledModule(sfxEnabled);
  }, [sfxEnabled]);

  useEffect(() => {
    setSfxVolumeModule(sfxVolume);
  }, [sfxVolume]);

  const toggleSfx = useCallback(() => {
    setSfxEnabled((prev) => !prev);
  }, []);

  const showToast = useCallback((message, color = 'cyan') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    const id = Date.now() + Math.random();
    setToast({ id, message, color });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((cur) => (cur && cur.id === id ? null : cur));
      toastTimerRef.current = null;
    }, 2500);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const audio = new Audio('/ambient.mp3');
    audio.loop = true;
    audio.volume = 0.15;
    audioRef.current = audio;
    console.log('[Music] Audio element created, src:', audio.src);
    audio.addEventListener('error', (e) => console.log('[Music] Audio error:', e, audio.error));
    audio.addEventListener('canplaythrough', () => console.log('[Music] Audio ready to play'));
    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = musicVolume;
  }, [musicVolume]);

  const toggleMusic = useCallback(() => {
    console.log('[Music] Button clicked, musicEnabled:', musicEnabled, 'audioRef:', audioRef.current);
    console.log('[Music] Audio src:', audioRef.current?.src);
    console.log('[Music] Audio readyState:', audioRef.current?.readyState);
    const audio = audioRef.current;
    if (!audio) return;
    if (!musicEnabled) {
      const playPromise = audio.play();
      if (playPromise) {
        playPromise
          .then(() => console.log('[Music] Playing successfully'))
          .catch((e) => console.log('[Music] Play failed:', e));
      }
      setMusicEnabled(true);
    } else {
      audio.pause();
      setMusicEnabled(false);
    }
  }, [musicEnabled]);

  const [showPortraitWarning, setShowPortraitWarning] = useState(false);
  const [isClosingPortrait, setIsClosingPortrait] = useState(false);
  const [portraitFadingOut, setPortraitFadingOut] = useState(false);
  const [loadingOverlayVisible, setLoadingOverlayVisible] = useState(true);

  useEffect(() => {
    if (!loading) {
      const isPortrait = window.innerHeight > window.innerWidth
      const isMobile = window.innerWidth < 768 || /iPhone|iPad|Android/i.test(navigator.userAgent)

      if (isMobile && isPortrait && !portraitDismissedThisSession) {
        setShowPortraitWarning(true)
        setLoadingOverlayVisible(false)
      } else {
        setTimeout(() => setLoadingOverlayVisible(false), 100)
      }
    }
  }, [loading])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > window.innerHeight) {
        setShowPortraitWarning(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const hasAnimatedCountRef = useRef(false);
  const countAnimationDoneRef = useRef(false);

  const handlePlanetClick = (planet) => {
    playClick();
    if (compareMode) {
      setComparePlanets((prev) => {
        if (prev.some((p) => p.name === planet.name)) {
          return prev.filter((p) => p.name !== planet.name);
        }
        if (prev.length >= 2) return [prev[1], planet];
        return [...prev, planet];
      });
    } else {
      wasRandomRef.current = false;
      setSelectedPlanet(planet);
    }
  };

  const exitCompareMode = () => {
    setComparePlanets([]);
    setCompareMode(false);
  };

  const handleExport = () => {
    const sourceCanvas = starMapRef.current?.getCanvas?.();
    if (!sourceCanvas) return;
    const out = document.createElement('canvas');
    out.width = sourceCanvas.width;
    out.height = sourceCanvas.height;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(sourceCanvas, 0, 0);

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.font = "bold 14px Orbitron, 'IBM Plex Mono', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const cssW = out.width / dpr;
    const cssH = out.height / dpr;
    const watermarkText = 'EXOPLANET EXPLORER | NASA Archive';
    const textWidth = ctx.measureText(watermarkText).width;
    const x = cssW - textWidth - 16;
    const y = cssH - 16;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - 8, y - 14, textWidth + 16, 20);
    ctx.fillStyle = 'rgba(0, 212, 255, 0.9)';
    ctx.fillText(watermarkText, x, y);
    ctx.restore();

    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `exoplanet-explorer-${date}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');

    showToast('Exported!', 'teal');
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast('Copied link!', 'cyan');
    } catch {
      showToast('Copy failed', 'amber');
    }
  };

  const settersRef = useRef({
    setSelectedPlanet,
    setFilterOpen,
    setFilters,
    setCompareMode,
    setComparePlanets,
    setShowConstellations,
    setHeatmapMode,
    setStatsSheetOpen,
    setControlsSheetOpen,
    showToast,
  });
  settersRef.current = {
    setSelectedPlanet,
    setFilterOpen,
    setFilters,
    setCompareMode,
    setComparePlanets,
    setShowConstellations,
    setHeatmapMode,
    setStatsSheetOpen,
    setControlsSheetOpen,
    showToast,
  };

  const resetZoomRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const starMapRef = useRef(null);
  const wasRandomRef = useRef(false);
  const twinkleContainerRef = useRef(null);
  const twinkleStarsRef = useRef(new Set());
  const portraitTwinkleContainerRef = useRef(null);
  const portraitTwinkleStarsRef = useRef(new Set());

  useEffect(() => {
    if (!loading) return;
    const container = twinkleContainerRef.current;
    if (!container) return;

    let cancelled = false;

    const spawn = (withDelay) => {
      if (cancelled) return;
      if (twinkleStarsRef.current.size >= MAX_TWINKLE_STARS) return;
      const star = document.createElement('div');
      const size = 1 + Math.random() * 3;
      const color =
        TWINKLE_COLORS[Math.floor(Math.random() * TWINKLE_COLORS.length)];
      const duration = 2.5 + Math.random() * 2;
      const delay = withDelay ? -Math.random() * duration : 0;
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
      star.style.animation = `loadingStar ${duration}s ease-in-out ${delay}s forwards`;
      const handleEnd = () => {
        star.removeEventListener('animationend', handleEnd);
        twinkleStarsRef.current.delete(star);
        star.remove();
        spawn(false);
      };
      star.addEventListener('animationend', handleEnd);
      twinkleStarsRef.current.add(star);
      container.appendChild(star);
    };

    for (let i = 0; i < 60; i += 1) spawn(true);
    const intervalId = window.setInterval(() => spawn(false), 200);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      for (const star of twinkleStarsRef.current) {
        star.remove();
      }
      twinkleStarsRef.current.clear();
    };
  }, [loading]);

  useEffect(() => {
    if (!showPortraitWarning) return;
    const container = portraitTwinkleContainerRef.current;
    if (!container) return;

    let cancelled = false;

    const spawn = (withDelay) => {
      if (cancelled) return;
      if (portraitTwinkleStarsRef.current.size >= MAX_TWINKLE_STARS) return;
      const star = document.createElement('div');
      const size = 1 + Math.random() * 3;
      const color =
        TWINKLE_COLORS[Math.floor(Math.random() * TWINKLE_COLORS.length)];
      const duration = 2.5 + Math.random() * 2;
      const delay = withDelay ? -Math.random() * duration : 0;
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
      star.style.animation = `loadingStar ${duration}s ease-in-out ${delay}s forwards`;
      const handleEnd = () => {
        star.removeEventListener('animationend', handleEnd);
        portraitTwinkleStarsRef.current.delete(star);
        star.remove();
        spawn(false);
      };
      star.addEventListener('animationend', handleEnd);
      portraitTwinkleStarsRef.current.add(star);
      container.appendChild(star);
    };

    for (let i = 0; i < 60; i += 1) spawn(true);
    const intervalId = window.setInterval(() => spawn(false), 200);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      for (const star of portraitTwinkleStarsRef.current) {
        star.remove();
      }
      portraitTwinkleStarsRef.current.clear();
    };
  }, [showPortraitWarning]);

  useEffect(() => {
    if (!data || data.length === 0) return;
    const now = new Date();
    const idx = (now.getDate() + now.getMonth() * 31) % data.length;
    setFeaturedPlanet(data[idx]);
  }, [data]);

  useEffect(() => {
    if (!data || data.length === 0 || hasAnimatedCountRef.current) return;
    hasAnimatedCountRef.current = true;
    const target = data.length;
    const duration = 1500;
    const startTime = performance.now();
    const intervalId = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayCount(Math.round(eased * target));
      if (t >= 1) {
        window.clearInterval(intervalId);
        countAnimationDoneRef.current = true;
      }
    }, 16);
    return () => window.clearInterval(intervalId);
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
        settersRef.current.setStatsSheetOpen(false);
        settersRef.current.setControlsSheetOpen(false);
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
        settersRef.current.showToast('Filters reset', 'cyan');
      } else if (key === 'c' || key === 'C') {
        e.preventDefault();
        settersRef.current.setShowConstellations((v) => !v);
      } else if (key === 'h' || key === 'H') {
        e.preventDefault();
        settersRef.current.setHeatmapMode((v) => !v);
      } else if (key === 'm' || key === 'M') {
        e.preventDefault();
        settersRef.current.setCompareMode((v) => {
          if (v) {
            settersRef.current.setComparePlanets([]);
            return false;
          }
          settersRef.current.setSelectedPlanet(null);
          return true;
        });
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

  useEffect(() => {
    if (countAnimationDoneRef.current) {
      setDisplayCount(filteredPlanets.length);
    }
  }, [filteredPlanets.length]);

  const isMobileDevice = /iPhone|iPad|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

  const getErrorInfo = (error) => {
    const status = error?.response?.status
    const message = error?.message?.toLowerCase() || ''
    const code = status ? String(status) : 'ERR'

    if (status === 502 || status === 503 || status === 504) {
      return { code, title: "NASA's servers are down", detail: "The NASA Exoplanet Archive is temporarily unavailable. This happens occasionally and usually resolves within a few minutes. Try refreshing." }
    }
    if (status === 500) {
      return { code, title: "Server error", detail: "NASA's archive server encountered an internal error. This is on their end, not yours. Try again in a few minutes." }
    }
    if (status === 404) {
      return { code, title: "Endpoint not found", detail: "The NASA archive API endpoint could not be found. The URL may have changed. Please report this." }
    }
    if (status === 403) {
      return { code, title: "Access denied", detail: "The NASA archive refused the request. This may be a temporary block. Try again shortly." }
    }
    if (status === 429) {
      return { code, title: "Rate limited", detail: "Too many requests were made to NASA's archive. Wait a minute then try refreshing." }
    }
    if (status === 401) {
      return { code, title: "Unauthorized", detail: "The request was rejected due to missing credentials. This is a configuration issue." }
    }
    if (!navigator.onLine || message.includes('network')) {
      return { code: 'ERR', title: "No internet connection", detail: "You appear to be offline. Check your connection and try refreshing the page." }
    }
    if (message.includes('timeout') || message.includes('etimedout')) {
      return { code: 'ERR', title: "Request timed out", detail: "NASA's archive took too long to respond. Their servers may be busy. Try refreshing." }
    }
    if (message.includes('cors')) {
      return { code: 'ERR', title: "Connection blocked", detail: "A CORS error prevented the request. This is likely a configuration issue with the proxy." }
    }
    if (message.includes('econnrefused') || message.includes('enotfound')) {
      return { code: 'ERR', title: "Could not connect", detail: "The connection to NASA's archive was refused. Check your internet and try again." }
    }
    return { code: status ? String(status) : 'ERR', title: "Something went wrong", detail: error?.message || "An unexpected error occurred. Try refreshing the page." }
  }

  return (
    <div className="flex h-screen w-screen flex-col font-body text-text-primary" style={{ backgroundColor: '#000306' }}>
      {isMobileDevice && showPortraitWarning && (
        <div style={{
          position: 'fixed', inset: 0,
          zIndex: 9998,
          opacity: portraitFadingOut ? 0 : 1,
          transition: portraitFadingOut ? 'opacity 0.4s ease-out' : 'none',
          pointerEvents: showPortraitWarning ? 'all' : 'none',
          background: 'rgba(0,0,0,0.97)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '2rem',
        }}>
          <div
            ref={portraitTwinkleContainerRef}
            className="absolute inset-0 overflow-hidden pointer-events-none z-0"
          />
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem', color: '#00d4ff' }}>↻</div>
            <h1 style={{ fontFamily: 'Orbitron', color: '#00d4ff', fontSize: '1.5rem', letterSpacing: '0.2em', marginBottom: '1rem', textShadow: '0 0 20px rgba(0,212,255,0.8)' }}>
              ROTATE DEVICE
            </h1>
            <p style={{ fontFamily: 'IBM Plex Mono', color: '#7ba7c9', fontSize: '0.875rem', marginBottom: '2rem', maxWidth: '280px', lineHeight: '1.6' }}>
              Exoplanet Explorer is best viewed in landscape mode
            </p>
            <button
              onClick={() => {
                portraitDismissedThisSession = true;
                setPortraitFadingOut(true);
                window.setTimeout(() => {
                  setShowPortraitWarning(false);
                  setPortraitFadingOut(false);
                }, 400);
              }}
              style={{ fontFamily: 'Orbitron', color: '#7ba7c9', border: '1px solid #1a3a6b', background: 'transparent', padding: '0.5rem 1.5rem', fontSize: '0.75rem', cursor: 'pointer', letterSpacing: '0.1em' }}
            >
              CONTINUE ANYWAY
            </button>
          </div>
        </div>
      )}
      <header id="app-header" className={`header-scan-bar relative z-[300] ${loading ? 'hidden' : 'flex'} items-center justify-between border-b border-border bg-background px-3 py-2 md:px-6 md:py-4`} style={{ backgroundColor: '#060d1a', visibility: (loadingOverlayVisible || showPortraitWarning || portraitFadingOut) ? 'hidden' : 'visible' }}>
        <div className="flex flex-col">
          <h1
            className="font-display text-base md:text-2xl font-bold tracking-[0.15em] md:tracking-[0.2em] text-accent-cyan"
            style={{ textShadow: '0 0 10px rgba(0, 212, 255, 0.6), 0 0 3px rgba(0, 212, 255, 0.4)' }}
          >
            EXOPLANET EXPLORER
          </h1>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-xs uppercase tracking-widest text-text-secondary">
              NASA Confirmed Exoplanet Archive
            </span>
            {featuredPlanet && featuredPlanet.name && (
              <button
                type="button"
                onClick={() => { playClick(); setSelectedPlanet(featuredPlanet); }}
                title="View today's featured planet"
                className="hidden md:inline-flex cursor-pointer font-display text-[10px] font-bold uppercase tracking-widest text-accent-amber transition-colors hover:text-accent-amber hover:underline"
                style={{ textShadow: '0 0 8px rgba(255, 170, 0, 0.6)' }}
              >
                Today: {featuredPlanet.name} <span className="star-pulse">★</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button
            type="button"
            onClick={() => {
              playClick();
              if (compareMode) {
                exitCompareMode();
              } else {
                setCompareMode(true);
                setSelectedPlanet(null);
              }
            }}
            title={compareMode ? 'Exit compare mode' : 'Select two planets to compare'}
            className={`control-btn hidden md:inline-flex rounded border px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest transition-colors ${
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
            onClick={() => { playClick(); handleExport(); }}
            title="Download a PNG snapshot of the current sky map"
            className="control-btn hidden md:inline-flex rounded border border-border bg-surface px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest text-accent-cyan transition-colors"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => { playClick(); handleShare(); }}
            title="Copy a shareable link to the current view"
            className="control-btn hidden md:inline-flex rounded border border-border bg-surface px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest text-accent-cyan transition-colors"
          >
            Share
          </button>
          <button
            type="button"
            onClick={() => { playClick(); toggleMusic(); }}
            title={musicEnabled ? 'Disable ambient music' : 'Enable ambient music'}
            aria-pressed={musicEnabled}
            className={`control-btn hidden md:inline-flex items-center gap-1.5 rounded border bg-surface px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest transition-colors ${
              musicEnabled
                ? 'border-accent-cyan text-accent-cyan'
                : 'border-border text-accent-cyan'
            }`}
          >
            {musicEnabled ? (
              <span className="music-eq" aria-hidden="true">
                <span /><span /><span />
              </span>
            ) : (
              <span aria-hidden="true">♪</span>
            )}
            <span>{musicEnabled ? 'On' : 'Off'}</span>
          </button>
          {musicEnabled && (
            <input
              type="range"
              min={0}
              max={0.4}
              step={0.01}
              value={musicVolume}
              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
              title="Music volume"
              aria-label="Music volume"
              className="hidden md:inline-block music-volume-slider"
            />
          )}
          <button
            type="button"
            onClick={() => { playClick(); toggleSfx(); }}
            title={sfxEnabled ? 'Disable sound effects' : 'Enable sound effects'}
            aria-pressed={sfxEnabled}
            className={`control-btn hidden md:inline-flex items-center gap-1.5 rounded border bg-surface px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest transition-colors ${
              sfxEnabled
                ? 'border-accent-cyan text-accent-cyan'
                : 'border-border text-accent-cyan'
            }`}
          >
            <span aria-hidden="true">{sfxEnabled ? '🔊' : '♪'}</span>
            <span>SFX {sfxEnabled ? 'On' : 'Off'}</span>
          </button>
          {sfxEnabled && (
            <input
              type="range"
              min={0}
              max={0.7}
              step={0.01}
              value={sfxVolume}
              onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
              title="SFX volume"
              aria-label="SFX volume"
              className="hidden md:inline-block music-volume-slider"
            />
          )}
          <button
            type="button"
            onClick={() => {
              playClick();
              if (filteredPlanets.length === 0) return;
              const idx = Math.floor(Math.random() * filteredPlanets.length);
              const planet = filteredPlanets[idx];
              if (compareMode) exitCompareMode();
              setSelectedPlanet(planet);
              starMapRef.current?.saveTransform();
              wasRandomRef.current = true;
              starMapRef.current?.focusPlanet(planet);
            }}
            title="Jump to a random planet"
            className="hidden md:inline-flex ml-2 cursor-pointer font-display text-[11px] font-bold uppercase tracking-widest text-text-secondary transition-colors hover:text-accent-cyan hover:underline"
          >
            ⚄ Random
          </button>
          <div className="flex flex-col items-end">
            <span className="hidden md:inline text-xs uppercase tracking-widest text-text-muted">
              Planets Loaded
            </span>
            <span
              key={loading ? 'loading' : 'loaded'}
              className={`font-display text-sm md:text-xl font-bold text-accent-teal ${
                loading ? '' : 'count-fade-in'
              }`}
            >
              {loading ? 'Loading...' : displayCount.toLocaleString()}
            </span>
            {!loading && data && (
              <span className="hidden md:inline text-[10px] uppercase tracking-widest text-text-muted">
                (of {data.length.toLocaleString()} total)
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="relative flex w-full h-full flex-1 items-center justify-center" style={{ visibility: (loadingOverlayVisible || showPortraitWarning || portraitFadingOut) ? 'hidden' : 'visible' }}>
        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-3 text-center max-w-md px-6">
            {(() => {
              const { code, title, detail } = getErrorInfo(error)
              return (
                <>
                  <span className="font-display text-6xl font-bold text-accent-red" style={{ textShadow: '0 0 20px rgba(255,68,102,0.5)' }}>{code}</span>
                  <span className="font-display text-lg uppercase tracking-widest text-accent-red">{title}</span>
                  <p className="font-body text-sm text-text-secondary leading-relaxed">{detail}</p>
                  <button
                    onClick={() => { playClick(); window.location.reload(); }}
                    className="mt-2 font-display text-xs tracking-widest uppercase border border-accent-red text-accent-red px-6 py-2 hover:bg-accent-red hover:text-background transition-colors duration-200"
                  >
                    Refresh
                  </button>
                </>
              )
            })()}
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
            heatmapMode={heatmapMode}
            showConstellations={showConstellations}
            sidebarOpen={selectedPlanet !== null}
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
        heatmapMode={heatmapMode}
        onHeatmapChange={setHeatmapMode}
        showConstellations={showConstellations}
        onConstellationsChange={setShowConstellations}
        isOpen={controlsOpen}
        onToggle={() => setControlsOpen((v) => !v)}
      />

      <MiniMap
        planets={filteredPlanets}
        transform={transformState}
        canvasWidth={canvasSize.width}
        canvasHeight={canvasSize.height}
      />

      <div className="relative z-40" style={{ visibility: (loadingOverlayVisible || showPortraitWarning || portraitFadingOut) ? 'hidden' : 'visible' }}>
        <FilterPanel
          filters={filters}
          onFilterChange={(key, val) =>
            setFilters((prev) => ({ ...prev, [key]: val }))
          }
          totalCount={data?.length ?? 0}
          filteredCount={filteredPlanets.length}
          isOpen={filterOpen}
          onToggle={() => setFilterOpen((v) => !v)}
          planets={data ?? []}
        />
      </div>

      <div className="fixed bottom-4 right-4 z-40 hidden md:flex md:flex-row items-end gap-2" style={{ visibility: (loadingOverlayVisible || showPortraitWarning || portraitFadingOut) ? 'hidden' : 'visible' }}>
        <button
          type="button"
          onClick={() => { playClick(); starMapRef.current?.resetZoom(); }}
          title="Reset map to full sky view"
          className="control-btn flex items-center gap-2 rounded border border-border bg-surface px-2 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-accent-cyan transition-colors hover:bg-surface-elevated md:px-3 md:py-1.5 md:text-xs"
        >
          Reset Zoom
        </button>
        <StatsPanel planets={filteredPlanets} />
        <div className="group relative">
          <button
            type="button"
            className="control-btn flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-full border border-border bg-surface font-display text-xs md:text-sm text-text-secondary transition-colors hover:border-accent-cyan hover:text-accent-cyan"
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
            <div>
              <span className="text-accent-cyan">C</span> — toggle constellations
            </div>
            <div>
              <span className="text-accent-cyan">H</span> — toggle heatmap
            </div>
            <div>
              <span className="text-accent-cyan">M</span> — toggle compare mode
            </div>
          </div>
        </div>
      </div>

      {!loading && !showPortraitWarning && (
      <div
        className="fixed bottom-0 left-0 right-0 flex items-stretch md:hidden"
        style={{
          height: 60,
          zIndex: 9999,
          background: '#0a1628',
          borderTop: '1px solid #1a3a6b',
        }}
      >
        <button
          type="button"
          onClick={() => {
            playClick();
            setStatsSheetOpen(false);
            setControlsSheetOpen(false);
            setSelectedPlanet(null);
            setFilterOpen((v) => !v);
          }}
          className={`flex min-h-[44px] flex-1 items-center justify-center font-display text-xs font-bold uppercase tracking-widest transition-colors ${
            filterOpen ? 'bg-accent-cyan text-background' : 'text-accent-cyan'
          }`}
        >
          Filters
        </button>
        <button
          type="button"
          onClick={() => {
            playClick();
            setFilterOpen(false);
            setControlsSheetOpen(false);
            setSelectedPlanet(null);
            setStatsSheetOpen((v) => !v);
          }}
          className={`flex min-h-[44px] flex-1 items-center justify-center border-l border-border font-display text-xs font-bold uppercase tracking-widest transition-colors ${
            statsSheetOpen ? 'bg-accent-cyan text-background' : 'text-accent-cyan'
          }`}
        >
          Stats
        </button>
        <button
          type="button"
          onClick={() => {
            playClick();
            setFilterOpen(false);
            setStatsSheetOpen(false);
            setSelectedPlanet(null);
            setControlsSheetOpen((v) => !v);
          }}
          className={`flex min-h-[44px] flex-1 items-center justify-center border-l border-border font-display text-xs font-bold uppercase tracking-widest transition-colors ${
            controlsSheetOpen ? 'bg-accent-cyan text-background' : 'text-accent-cyan'
          }`}
        >
          Controls
        </button>
      </div>
      )}

      <MobileStatsSheet
        planets={filteredPlanets}
        isOpen={statsSheetOpen}
        onClose={() => setStatsSheetOpen(false)}
        onExport={handleExport}
        onResetZoom={() => starMapRef.current?.resetZoom()}
      />

      <MobileControlsSheet
        isOpen={controlsSheetOpen}
        onClose={() => setControlsSheetOpen(false)}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        highlightHZ={highlightHZ}
        onHighlightHZChange={setHighlightHZ}
        heatmapMode={heatmapMode}
        onHeatmapChange={setHeatmapMode}
        showConstellations={showConstellations}
        onConstellationsChange={setShowConstellations}
      />

      {!loading && selectedPlanet && (
        <PlanetSidebar
          planet={selectedPlanet}
          featuredPlanet={featuredPlanet}
          onClose={() => {
            setSelectedPlanet(null);
            if (wasRandomRef.current) {
              wasRandomRef.current = false;
              starMapRef.current?.restoreTransform();
            }
          }}
          data={data ?? []}
          onSelectPlanet={(planet) => {
            wasRandomRef.current = false;
            setSelectedPlanet(planet);
          }}
        />
      )}

      {toast && (
        <div
          key={toast.id}
          className="toast-anim fixed top-20 left-1/2 z-[9998] -translate-x-1/2 rounded border border-border bg-surface px-4 py-2 font-body text-sm shadow-lg"
          style={{
            color:
              toast.color === 'teal'
                ? '#00ff88'
                : toast.color === 'amber'
                  ? '#ffaa00'
                  : '#00d4ff',
            textShadow:
              toast.color === 'teal'
                ? '0 0 10px rgba(0, 255, 136, 0.7)'
                : toast.color === 'amber'
                  ? '0 0 10px rgba(255, 170, 0, 0.7)'
                  : '0 0 10px rgba(0, 212, 255, 0.7)',
          }}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}

      <ComparePanel planets={comparePlanets} onClose={exitCompareMode} />

      {(() => {
        const isPortraitMobile = (window.innerWidth < 768 || /iPhone|iPad|Android/i.test(navigator.userAgent)) && window.innerHeight > window.innerWidth
        return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9997,
          opacity: loadingOverlayVisible ? 1 : 0,
          transition: isPortraitMobile ? 'none' : 'opacity 0.6s ease-out',
          pointerEvents: loadingOverlayVisible ? 'all' : 'none',
          backgroundColor: '#000306',
        }}
        aria-hidden={!loadingOverlayVisible}
      >
          <div ref={twinkleContainerRef} className="absolute inset-0" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6">
            <h1
              className="title-pulse font-display text-4xl font-black uppercase tracking-[0.28em] text-accent-cyan sm:text-5xl md:text-6xl"
              style={{
                textShadow:
                  '0 0 24px rgba(0, 212, 255, 0.9), 0 0 12px rgba(0, 212, 255, 0.7), 0 0 4px rgba(0, 212, 255, 0.5)',
              }}
            >
              Exoplanet Explorer
            </h1>
            <p
              className="font-body text-[11px] uppercase tracking-[0.35em] text-text-secondary sm:text-xs"
              style={{ fontFamily: 'IBM Plex Mono, monospace' }}
            >
              NASA Confirmed Exoplanet Archive
            </p>
            <div className="mt-2 h-[3px] w-80 max-w-full overflow-hidden rounded-full bg-surface-elevated">
              <div className="load-bar-fill h-full rounded-full" />
            </div>
            <p className="font-body text-[10px] uppercase tracking-[0.3em] text-text-muted sm:text-xs">
              Loading 6,000+ confirmed exoplanets
            </p>
          </div>
      </div>
        )
      })()}

    </div>
  );
}

export default App;
