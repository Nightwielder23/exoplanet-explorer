import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as d3 from 'd3';
import { getPlanetColor, getHabitabilityZone } from '../utils/planetClassifier';
import { CONSTELLATIONS } from '../data/constellations';

const HABITABILITY_COLORS = {
  'Optimistic HZ': '#00ff88',
  'Too Hot': '#ff4466',
  'Too Cold': '#00d4ff',
  Unknown: '#3d6080',
};

const DEC_LINES = [-60, -30, 0, 30, 60];
const RA_LINES = [60, 120, 180, 240, 300];

function getStarConfig() {
  const isMobile =
    window.innerWidth < 768 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  return isMobile
    ? {
        isMobile: true,
        maxStars: 70,
        spawnPerFrame: 1,
        radiusMin: 0.4,
        radiusMax: 1.2,
        highIntensity: { fadeIn: [50, 80], hold: [120, 200], fadeOut: [50, 80] },
        mediumIntensity: {
          fadeIn: [80, 130],
          hold: [200, 350],
          fadeOut: [80, 130],
        },
        lowIntensity: {
          fadeIn: [120, 200],
          hold: [350, 550],
          fadeOut: [120, 200],
        },
      }
    : {
        isMobile: false,
        maxStars: 330,
        spawnPerFrame: 5,
        radiusMin: 0.3,
        radiusMax: 0.9,
        highIntensity: { fadeIn: [8, 15], hold: [25, 45], fadeOut: [8, 18] },
        mediumIntensity: { fadeIn: [15, 25], hold: [50, 80], fadeOut: [15, 25] },
        lowIntensity: { fadeIn: [25, 40], hold: [90, 150], fadeOut: [25, 40] },
      };
}

const StarMap = forwardRef(function StarMap(
  {
    planets,
    onPlanetClick,
    colorMode = 'type',
    selectedPlanet = null,
    highlightHZ = false,
    resetZoomRef,
    onTransformChange,
    compareMode = false,
    comparePlanets = [],
    heatmapMode = false,
    showConstellations = false,
    sidebarOpen = false,
  },
  ref,
) {
  const isMobile =
    window.innerWidth < 768 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  const starConfig = isMobile
    ? {
        maxStars: 45,
        spawnPerFrame: 1,
        radiusMin: 0.2,
        radiusMax: 0.5,
        highIntensity: { fadeIn: [50, 80], hold: [120, 200], fadeOut: [50, 80] },
        mediumIntensity: {
          fadeIn: [80, 130],
          hold: [200, 350],
          fadeOut: [80, 130],
        },
        lowIntensity: {
          fadeIn: [120, 200],
          hold: [350, 550],
          fadeOut: [120, 200],
        },
      }
    : {
        maxStars: 220,
        spawnPerFrame: 5,
        radiusMin: 0.3,
        radiusMax: 0.9,
        highIntensity: { fadeIn: [8, 15], hold: [25, 45], fadeOut: [8, 18] },
        mediumIntensity: { fadeIn: [15, 25], hold: [50, 80], fadeOut: [15, 25] },
        lowIntensity: { fadeIn: [25, 40], hold: [90, 150], fadeOut: [25, 40] },
      };

  // eslint-disable-next-line no-console
  console.log('[StarMap] init isMobile:', isMobile, window.innerWidth);

  const starConfigRef = useRef(null);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const starsCanvasRef = useRef(null);
  const overlayRef = useRef(null);
  const tooltipRef = useRef(null);
  const coordDisplayRef = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const transformRef = useRef(d3.zoomIdentity);
  const initialTransformRef = useRef(null);
  const draggingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const interactingRef = useRef(false);
  const hoveredPlanetRef = useRef(null);
  const [cursorMode, setCursorMode] = useState('grab');
  const planetsRef = useRef([]);
  const colorByPlanetRef = useRef(new Map());
  const hzByPlanetRef = useRef(new Map());
  const highlightHZRef = useRef(highlightHZ);
  const showConstellationsRef = useRef(showConstellations);
  const xScaleRef = useRef(d3.scaleLinear().domain([0, 360]).range([0, 360]));
  const yScaleRef = useRef(d3.scaleLinear().domain([-90, 90]).range([180, 0]));
  const onPlanetClickRef = useRef(onPlanetClick);
  const onTransformChangeRef = useRef(onTransformChange);
  const redrawRef = useRef(null);
  const selectedPlanetRef = useRef(selectedPlanet);
  const rafRef = useRef(null);
  const transitionRef = useRef(null);
  const transitionRafRef = useRef(null);
  const compareModeRef = useRef(compareMode);
  const comparePlanetsRef = useRef(comparePlanets);
  const heatmapModeRef = useRef(heatmapMode);
  const sidebarOpenRef = useRef(sidebarOpen);
  const zoomRef = useRef(null);
  const heatmapGridRef = useRef(null);
  const hasFitInitialRef = useRef(false);
  const offscreenHeatmapCanvasRef = useRef(null);
  const starsRef = useRef([]);
  const starsAnimRafRef = useRef(null);
  const starsInitializedRef = useRef(false);

  const colorByPlanet = useMemo(() => {
    const m = new Map();
    for (const p of planets) {
      const c =
        colorMode === 'habitability'
          ? HABITABILITY_COLORS[getHabitabilityZone(p)] ?? HABITABILITY_COLORS.Unknown
          : getPlanetColor(p);
      m.set(p, c);
    }
    return m;
  }, [planets, colorMode]);

  const hzByPlanet = useMemo(() => {
    const m = new Map();
    for (const p of planets) {
      m.set(p, getHabitabilityZone(p) === 'Optimistic HZ');
    }
    return m;
  }, [planets]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const container = containerRef.current;
    if (!canvasRef.current || !overlay || !container) return;

    const starsCs = getComputedStyle(starsCanvasRef.current);
    const mainCs = getComputedStyle(canvasRef.current);
    const containerCs = getComputedStyle(container);
    // eslint-disable-next-line no-console
    console.log('[StarMap] canvas layering', {
      starsCanvas: {
        zIndex: starsCs.zIndex,
        backgroundColor: starsCs.backgroundColor,
      },
      mainCanvas: {
        zIndex: mainCs.zIndex,
        backgroundColor: mainCs.backgroundColor,
      },
      container: {
        backgroundColor: containerCs.backgroundColor,
      },
    });

    const tooltip = d3.select(tooltipRef.current);


    const getBoundary = () => {
      const t = transformRef.current;
      if (!t) return null;
      const bLeft = t.x;
      const bRight = t.x + 360 * t.k;
      const bTop = t.y;
      const bBottom = t.y + 180 * t.k;
      return { bLeft, bRight, bTop, bBottom };
    };

    const sampleRange = ([min, max]) => min + Math.random() * (max - min);

    const buildStarProps = () => {
      starConfigRef.current = getStarConfig();
      const colorRoll = Math.random();
      let color;
      if (colorRoll < 0.6) color = '#ffffff';
      else if (colorRoll < 0.8) color = '#ddeeff';
      else if (colorRoll < 0.9) color = '#fff8ee';
      else color = '#aaaaaa';
      const cfg = starConfigRef.current;
      const intensityRoll = Math.random();
      let twinkleIntensity;
      let bucket;
      if (intensityRoll < 0.2) {
        twinkleIntensity = 0.7 + Math.random() * 0.3;
        bucket = cfg.highIntensity;
      } else if (intensityRoll < 0.5) {
        twinkleIntensity = 0.4 + Math.random() * 0.3;
        bucket = cfg.mediumIntensity;
      } else {
        twinkleIntensity = 0.3 + Math.random() * 0.1;
        bucket = cfg.lowIntensity;
      }
      const maxOpacity = 0.7 + Math.random() * 0.3;
      return {
        color,
        twinkleIntensity,
        inDur: sampleRange(bucket.fadeIn),
        holdDur: sampleRange(bucket.hold),
        outDur: sampleRange(bucket.fadeOut),
        r:
          cfg.radiusMin +
          Math.random() * (cfg.radiusMax - cfg.radiusMin),
        maxOpacity,
      };
    };

    let spawnLogCount = 0;
    const spawnStar = (randomPhase = false) => {
      const { width, height } = sizeRef.current;
      if (!width || !height) return null;
      const b = getBoundary();
      if (!b) return null;
      const isOut = (x, y) =>
        x < b.bLeft || x > b.bRight || y < b.bTop || y > b.bBottom;
      let sx;
      let sy;
      let tries = 0;
      do {
        sx = Math.random() * width;
        sy = Math.random() * height;
        tries++;
      } while (!isOut(sx, sy) && tries < 50);
      if (tries >= 50) return null;
      const props = buildStarProps();
      if (spawnLogCount < 10) {
        spawnLogCount++;
        // eslint-disable-next-line no-console
        console.log(
          '[spawn] isMobile:',
          isMobile,
          'maxStars:',
          starConfigRef.current.maxStars,
          'fadeIn:',
          props.inDur,
        );
      }
      let phase = 'in';
      let age = 0;
      if (randomPhase) {
        const phaseRoll = Math.random();
        if (phaseRoll < 0.4) {
          phase = 'hold';
          age = Math.random() * props.holdDur;
        } else if (phaseRoll < 0.7) {
          phase = 'out';
          age = Math.random() * props.outDur;
        } else {
          phase = 'in';
          age = Math.random() * props.inDur;
        }
      }
      return {
        x: sx,
        y: sy,
        opacity: 0,
        phase,
        age,
        ...props,
      };
    };

    const redraw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const { width, height } = sizeRef.current;
      if (!width || !height) return;
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        window.innerWidth < 768 ? 1.5 : 3,
      );
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const t = transformRef.current;
      const xScale = xScaleRef.current;
      const yScale = yScaleRef.current;
      const validPlanets = planetsRef.current;
      const colors = colorByPlanetRef.current;
      const isMobile = window.innerWidth < 768;
      const isDragging = isDraggingRef.current;
      const useGlow = !interactingRef.current && !isMobile && !isDragging;

      ctx.shadowBlur = 0;

      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.k, t.k);

      const dotR = (isMobile ? 2 : 2.5) / t.k;
      const hoverR = (isMobile ? 4 : 5) / t.k;
      const lineW = 0.8 / t.k;

      ctx.strokeStyle = '#2a5a9b';
      ctx.lineWidth = lineW;
      ctx.globalAlpha = 0.6;
      ctx.shadowBlur = isMobile ? 0 : 3 / t.k;
      ctx.shadowColor = '#1a4a8b';
      for (const dec of DEC_LINES) {
        const y = yScale(dec);
        ctx.beginPath();
        ctx.moveTo(xScale(0), y);
        ctx.lineTo(xScale(360), y);
        ctx.stroke();
      }
      for (const ra of RA_LINES) {
        const x = xScale(ra);
        ctx.beginPath();
        ctx.moveTo(x, yScale(90));
        ctx.lineTo(x, yScale(-90));
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      const x0 = xScale(-2);
      const x1 = xScale(362);
      const y0 = yScale(92);
      const y1 = yScale(-92);

      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#1a4a8b';
      ctx.lineWidth = 1 / t.k;
      ctx.shadowBlur = isMobile ? 0 : 8 / t.k;
      ctx.shadowColor = '#00d4ff';
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      ctx.shadowBlur = 0;

      const cornerLen = 12 / t.k;
      ctx.strokeStyle = '#2a5a9b';
      ctx.lineWidth = 1 / t.k;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(x0 + cornerLen, y0);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x0, y0 + cornerLen);
      ctx.moveTo(x1 - cornerLen, y0);
      ctx.lineTo(x1, y0);
      ctx.lineTo(x1, y0 + cornerLen);
      ctx.moveTo(x0 + cornerLen, y1);
      ctx.lineTo(x0, y1);
      ctx.lineTo(x0, y1 - cornerLen);
      ctx.moveTo(x1 - cornerLen, y1);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1, y1 - cornerLen);
      ctx.stroke();

      ctx.fillStyle = '#00d4ff';
      ctx.shadowBlur = isMobile ? 0 : 6 / t.k;
      ctx.shadowColor = '#00d4ff';
      const cornerDotR = 3 / t.k;
      const cornerPts = [
        [x0, y0],
        [x1, y0],
        [x0, y1],
        [x1, y1],
      ];
      for (const [cx, cy] of cornerPts) {
        ctx.beginPath();
        ctx.arc(cx, cy, cornerDotR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      const labelText = 'OBSERVABLE SKY BOUNDARY';
      const fontSize = 18 / t.k;
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '2px';
      }
      ctx.font = `bold ${fontSize}px IBM Plex Mono`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
      const textMetrics = ctx.measureText(labelText);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;

      const rectX = xScale(180) - textWidth / 2 - 16 / t.k;
      const rectY = yScale(90) - textHeight - 14 / t.k;
      const rectW = textWidth + 32 / t.k;
      const rectH = textHeight + 10 / t.k;
      ctx.fillStyle = 'rgba(0, 10, 25, 0.9)';
      ctx.fillRect(rectX, rectY, rectW, rectH);

      ctx.fillStyle = '#00d4ff';
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = isMobile ? 0 : 10 / t.k;
      ctx.fillText(labelText, xScale(180), yScale(90) - 8 / t.k);
      ctx.shadowBlur = 0;
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '0px';
      }

      ctx.font = `${9 / t.k}px IBM Plex Mono`;
      ctx.fillStyle = '#3d6080';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const raLabelOffset = 4 / t.k;
      for (const ra of [0, 60, 120, 180, 240, 300, 360]) {
        ctx.fillText(`${ra}°`, xScale(ra), y0 + raLabelOffset);
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const decLabelOffset = 4 / t.k;
      for (const dec of [-60, -30, 0, 30, 60]) {
        ctx.fillText(`${dec}°`, x0 + decLabelOffset, yScale(dec));
      }

      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';

      const hzHighlight = highlightHZRef.current;
      const hzMap = hzByPlanetRef.current;
      const transition = transitionRef.current;

      let leavingOpacity = 0;
      let enteringOpacity = 1;
      if (transition) {
        const elapsed = Date.now() - transition.startTime;
        leavingOpacity = Math.max(0, 1 - elapsed / 200);
        enteringOpacity = Math.max(0, Math.min(1, (elapsed - 200) / 200));
      }
      const enteringNames = transition?.enteringNames ?? null;

      const cullMargin = 20;
      const visDataMinX = (-cullMargin - t.x) / t.k;
      const visDataMaxX = (width + cullMargin - t.x) / t.k;
      const visDataMinY = (-cullMargin - t.y) / t.k;
      const visDataMaxY = (height + cullMargin - t.y) / t.k;
      const isInView = (x, y) =>
        x >= visDataMinX &&
        x <= visDataMaxX &&
        y >= visDataMinY &&
        y <= visDataMaxY;

      const stableByColor = new Map();
      const enteringByColor = new Map();
      for (const p of validPlanets) {
        if (isMobile) {
          const x = xScale(p.ra);
          const y = yScale(p.dec);
          if (!isInView(x, y)) continue;
        }
        const color = colors.get(p) ?? '#3d6080';
        const isEntering = enteringNames && p.name && enteringNames.has(p.name);
        const target = isEntering ? enteringByColor : stableByColor;
        let group = target.get(color);
        if (!group) {
          group = [];
          target.set(color, group);
        }
        group.push(p);
      }

      const useShadow = !isMobile && useGlow;
      const baseAlpha = hzHighlight ? 0.2 : 1;
      const drawBatch = (byColorMap, alpha) => {
        if (alpha <= 0) return;
        ctx.globalAlpha = baseAlpha * alpha;
        for (const [color, group] of byColorMap) {
          ctx.fillStyle = color;
          if (!hzHighlight && useShadow) {
            ctx.shadowBlur = 4;
            ctx.shadowColor = color;
          } else {
            ctx.shadowBlur = 0;
          }
          ctx.beginPath();
          for (const p of group) {
            const x = xScale(p.ra);
            const y = yScale(p.dec);
            ctx.moveTo(x + dotR, y);
            ctx.arc(x, y, dotR, 0, Math.PI * 2);
          }
          ctx.fill();
        }
      };

      if (heatmapModeRef.current && !isDragging) {
        const grid = heatmapGridRef.current;
        if (grid) {
          const { cols, rows, data } = grid;
          let off = offscreenHeatmapCanvasRef.current;
          if (!off) {
            off = document.createElement('canvas');
            offscreenHeatmapCanvasRef.current = off;
          }
          if (off.width !== canvas.width || off.height !== canvas.height) {
            off.width = canvas.width;
            off.height = canvas.height;
          }
          const offCtx = off.getContext('2d');
          offCtx.setTransform(1, 0, 0, 1, 0, 0);
          offCtx.clearRect(0, 0, off.width, off.height);
          offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          offCtx.translate(t.x, t.y);
          offCtx.scale(t.k, t.k);

          const cellW = 360 / cols;
          const cellH = 180 / rows;
          const bandColor = (v) => {
            if (v >= 200) return 'rgba(200, 240, 255, 0.68)';
            if (v >= 51) return 'rgba(100, 220, 255, 0.55)';
            if (v >= 21) return 'rgba(0, 200, 255, 0.42)';
            if (v >= 6) return 'rgba(0, 150, 255, 0.28)';
            if (v >= 1) return 'rgba(0, 100, 255, 0.15)';
            return null;
          };

          for (let gy = 0; gy < rows; gy++) {
            for (let gx = 0; gx < cols; gx++) {
              const v = data[gy * cols + gx];
              if (v < 1) continue;
              const fill = bandColor(v);
              if (!fill) continue;
              offCtx.fillStyle = fill;
              offCtx.fillRect(gx * cellW, gy * cellH, cellW + 0.5, cellH + 0.5);
            }
          }

          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.filter = 'blur(8px)';
          ctx.drawImage(off, 0, 0);
          ctx.filter = 'none';
          ctx.restore();
        }
      }

      drawBatch(stableByColor, 1);
      if (transition) {
        drawBatch(enteringByColor, enteringOpacity);
        const leavingByColor = new Map();
        for (const p of transition.leaving) {
          const color = transition.leavingColors.get(p) ?? '#3d6080';
          let group = leavingByColor.get(color);
          if (!group) {
            group = [];
            leavingByColor.set(color, group);
          }
          group.push(p);
        }
        drawBatch(leavingByColor, leavingOpacity);
      }
      ctx.globalAlpha = hzHighlight ? 0.2 : 1;

      if (hzHighlight) {
        ctx.globalAlpha = 1;
        const hzPlanets = validPlanets.filter(
          (p) => getHabitabilityZone(p) === 'Optimistic HZ',
        );
        const hzR = 4 / t.k;
        ctx.fillStyle = '#00ff88';
        ctx.shadowBlur = useShadow ? 12 / t.k : 0;
        ctx.shadowColor = '#00ff88';
        for (const p of hzPlanets) {
          const x = xScale(p.ra);
          const y = yScale(p.dec);
          if (isMobile && !isInView(x, y)) continue;
          ctx.beginPath();
          ctx.arc(x, y, hzR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      const hovered = hoveredPlanetRef.current;
      if (hovered) {
        const color = colors.get(hovered) ?? '#3d6080';
        const hx = xScale(hovered.ra);
        const hy = yScale(hovered.dec);
        ctx.fillStyle = color;
        if (useShadow) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = color;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.arc(hx, hy, hoverR, 0, Math.PI * 2);
        ctx.fill();
      }

      const compareList = comparePlanetsRef.current;
      if (compareList && compareList.length > 0) {
        ctx.shadowBlur = isMobile ? 0 : 8 / t.k;
        ctx.shadowColor = '#ffaa00';
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 1.75 / t.k;
        ctx.globalAlpha = 0.95;
        for (const cp of compareList) {
          if (cp.ra == null || cp.dec == null) continue;
          const cx = xScale(cp.ra);
          const cy = yScale(cp.dec);
          ctx.beginPath();
          ctx.arc(cx, cy, 11 / t.k, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      const selected = selectedPlanetRef.current;
      if (selected && selected.ra != null && selected.dec != null) {
        const color = colors.get(selected) ?? '#3d6080';
        const sx = xScale(selected.ra);
        const sy = yScale(selected.dec);
        const pulse = Math.sin(Date.now() / 300);
        const outerR = (14 + pulse * 2) / t.k;

        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / t.k;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(sx, sy, 10 / t.k, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = color;
        ctx.lineWidth = 0.75 / t.k;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(sx, sy, outerR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 1;
      }

      if (showConstellationsRef.current && !isDragging) {
        ctx.save();
        ctx.strokeStyle = 'rgba(180, 220, 255, 0.85)';
        ctx.lineWidth = 2 / t.k;
        ctx.globalAlpha = 1;
        ctx.shadowBlur = isMobile ? 0 : 6 / t.k;
        ctx.shadowColor = 'rgba(150, 200, 255, 0.9)';
        for (const constellation of CONSTELLATIONS) {
          const coords = constellation.coords;
          if (!coords || coords.length < 2) continue;
          ctx.beginPath();
          for (let i = 0; i < coords.length; i++) {
            const [ra, dec] = coords[i];
            const px = xScale(ra);
            const py = yScale(dec);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

        const fontSize = 12 / t.k;
        ctx.font = `${fontSize}px IBM Plex Mono`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 1;
        const offset = 15 / t.k;
        for (const constellation of CONSTELLATIONS) {
          const coords = constellation.coords;
          if (!coords || coords.length === 0) continue;
          let sumRa = 0;
          let sumDec = 0;
          for (const [ra, dec] of coords) {
            sumRa += ra;
            sumDec += dec;
          }
          const cRa = sumRa / coords.length;
          const cDec = sumDec / coords.length;
          const lx = xScale(cRa) + offset;
          const ly = yScale(cDec) + offset;
          const metrics = ctx.measureText(constellation.name);
          const padX = 6 / t.k;
          const padY = 3 / t.k;
          const bgW = metrics.width + padX * 2;
          const bgH = fontSize + padY * 2;
          ctx.fillStyle = 'rgba(0, 10, 25, 0.85)';
          ctx.fillRect(lx - bgW / 2, ly - bgH / 2, bgW, bgH);
          ctx.fillStyle = '#aaddff';
          ctx.fillText(constellation.name, lx, ly);
        }
        ctx.restore();
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      ctx.shadowBlur = 0;
    };
    redrawRef.current = redraw;

    let frameCount = 0;
    const drawStars = () => {
      const sCanvas = starsCanvasRef.current;
      if (!sCanvas) {
        starsAnimRafRef.current = requestAnimationFrame(drawStars);
        return;
      }
      const { width, height } = sizeRef.current;
      if (!width || !height) {
        starsAnimRafRef.current = requestAnimationFrame(drawStars);
        return;
      }
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        window.innerWidth < 768 ? 1.5 : 3,
      );
      const sCtx = sCanvas.getContext('2d');
      sCtx.setTransform(1, 0, 0, 1, 0, 0);
      sCtx.clearRect(0, 0, sCanvas.width, sCanvas.height);
      sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const stars = starsRef.current;
      const b = getBoundary();

      frameCount++;
      if (frameCount % 120 === 0 && b) {
        // eslint-disable-next-line no-console
        console.log(
          '[Stars] alive:',
          starsRef.current.length,
          'phases:',
          starsRef.current.reduce((acc, s) => {
            acc[s.phase] = (acc[s.phase] || 0) + 1;
            return acc;
          }, {}),
        );
        // eslint-disable-next-line no-console
        console.log(
          '[Stars] maxStars cap:',
          starConfigRef.current.maxStars,
          'current alive:',
          starsRef.current.length,
        );
        // eslint-disable-next-line no-console
        console.log('[Stars] boundary:', {
          bL: b.bLeft,
          bR: b.bRight,
          bT: b.bTop,
          bB: b.bBottom,
          screenW: window.innerWidth,
          screenH: window.innerHeight,
        });
      }

      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        if (
          b &&
          s.x >= b.bLeft &&
          s.x <= b.bRight &&
          s.y >= b.bTop &&
          s.y <= b.bBottom
        ) {
          stars.splice(i, 1);
          continue;
        }
        s.age++;
        if (s.phase === 'in') {
          s.opacity = (s.age / s.inDur) * s.maxOpacity;
          if (s.age >= s.inDur) {
            s.phase = 'hold';
            s.age = 0;
          }
        } else if (s.phase === 'hold') {
          s.opacity = s.maxOpacity;
          if (s.age >= s.holdDur) {
            s.phase = 'out';
            s.age = 0;
          }
        } else {
          s.opacity = (1 - s.age / s.outDur) * s.maxOpacity;
          if (s.age >= s.outDur) {
            stars.splice(i, 1);
            continue;
          }
        }
      }

      if (!starsInitializedRef.current) {
        starsInitializedRef.current = true;
        while (stars.length < starConfigRef.current.maxStars) {
          const s = spawnStar(true);
          if (!s) break;
          stars.push(s);
        }
      }

      if (frameCount % 120 === 0) {
        // eslint-disable-next-line no-console
        console.log(
          '[Stars] using maxStars:',
          starConfigRef.current.maxStars,
          'innerWidth:',
          window.innerWidth,
        );
      }
      const frameSpawnLimit = getStarConfig().spawnPerFrame;
      let spawned = 0;
      while (
        starsRef.current.length < getStarConfig().maxStars &&
        spawned < frameSpawnLimit
      ) {
        const s = spawnStar(false);
        if (!s) break;
        stars.push(s);
        spawned++;
      }

      sCtx.shadowBlur = 2;
      sCtx.shadowColor = '#ffffff';
      for (const s of stars) {
        const op = Math.max(0, Math.min(1, s.opacity));
        if (op <= 0) continue;
        sCtx.globalAlpha = op;
        sCtx.fillStyle = s.color;
        sCtx.beginPath();
        sCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        sCtx.fill();
      }
      sCtx.globalAlpha = 1;
      sCtx.shadowBlur = 0;

      starsAnimRafRef.current = requestAnimationFrame(drawStars);
    };
    starsAnimRafRef.current = requestAnimationFrame(drawStars);

    const findNearest = (mx, my) => {
      const t = transformRef.current;
      const xScale = xScaleRef.current;
      const yScale = yScaleRef.current;
      const list = planetsRef.current;
      let nearest = null;
      let minDistSq = 64;
      for (const p of list) {
        const x = t.applyX(xScale(p.ra));
        const y = t.applyY(yScale(p.dec));
        const dx = x - mx;
        const dy = y - my;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          nearest = p;
        }
      }
      return nearest;
    };

    const handleMouseMove = (event) => {
      const rect = overlay.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const nearest = findNearest(mx, my);
      if (nearest !== hoveredPlanetRef.current) {
        hoveredPlanetRef.current = nearest;
        redraw();
      }
      if (!draggingRef.current) {
        if (compareModeRef.current) {
          setCursorMode('crosshair');
        } else {
          setCursorMode(nearest ? 'crosshair' : 'grab');
        }
      }
      if (nearest) {
        tooltip
          .style('opacity', 1)
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY + 12}px`)
          .text(nearest.name ?? 'Unknown');
      } else {
        tooltip.style('opacity', 0);
      }
    };

    const handleMouseLeave = () => {
      if (hoveredPlanetRef.current) {
        hoveredPlanetRef.current = null;
        redraw();
      }
      tooltip.style('opacity', 0);
      if (!draggingRef.current) {
        setCursorMode(compareModeRef.current ? 'crosshair' : 'grab');
      }
    };

    const handleClick = (event) => {
      if (draggingRef.current) return;
      const rect = overlay.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const nearest = findNearest(mx, my);
      if (nearest && onPlanetClickRef.current) {
        onPlanetClickRef.current(nearest);
      }
    };

    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('mouseleave', handleMouseLeave);
    overlay.addEventListener('click', handleClick);

    const d3overlay = d3.select(overlay);
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 20])
      .filter((event) => {
        if (event.type && event.type.startsWith('touch')) return false;
        if (event.pointerType === 'touch') return false;
        return !event.ctrlKey && !event.button;
      })
      .on('start', (event) => {
        interactingRef.current = true;
        if (event.sourceEvent && event.sourceEvent.type === 'mousedown') {
          draggingRef.current = false;
        }
      })
      .on('zoom', (event) => {
        if (event.sourceEvent && event.sourceEvent.type === 'mousemove') {
          draggingRef.current = true;
          setCursorMode('grabbing');
        }
        transformRef.current = event.transform;
        redraw();
        const { width, height } = sizeRef.current;
        onTransformChangeRef.current?.(event.transform, width, height);
      })
      .on('end', () => {
        interactingRef.current = false;
        redraw();
        setTimeout(() => {
          draggingRef.current = false;
          if (compareModeRef.current) {
            setCursorMode('crosshair');
          } else {
            setCursorMode(hoveredPlanetRef.current ? 'crosshair' : 'grab');
          }
        }, 50);
      });
    d3overlay.call(zoom).on('dblclick.zoom', null);
    zoomRef.current = zoom;

    let touchStartMid = { x: 0, y: 0 };
    let touchStartDist = 0;
    let touchStartTransform = null;
    let touchMoved = false;
    let touchSingleStart = { x: 0, y: 0, clientX: 0, clientY: 0, time: 0 };

    const touchDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const touchMidpoint = (touches, rect) => ({
      x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
      y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top,
    });

    const handleTouchStart = (event) => {
      event.preventDefault();
      interactingRef.current = true;
      isDraggingRef.current = true;
      touchMoved = false;
      touchStartTransform = transformRef.current;
      const rect = overlay.getBoundingClientRect();
      if (event.touches.length === 1) {
        const t = event.touches[0];
        touchSingleStart = {
          x: t.clientX - rect.left,
          y: t.clientY - rect.top,
          clientX: t.clientX,
          clientY: t.clientY,
          time: Date.now(),
        };
      } else if (event.touches.length === 2) {
        touchStartDist = touchDistance(event.touches);
        touchStartMid = touchMidpoint(event.touches, rect);
      }
    };

    const handleTouchMove = (event) => {
      event.preventDefault();
      if (!touchStartTransform) return;
      const rect = overlay.getBoundingClientRect();
      if (event.touches.length === 1) {
        const t = event.touches[0];
        const dx = t.clientX - touchSingleStart.clientX;
        const dy = t.clientY - touchSingleStart.clientY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) touchMoved = true;
        const nt = d3.zoomIdentity
          .translate(touchStartTransform.x + dx, touchStartTransform.y + dy)
          .scale(touchStartTransform.k);
        d3overlay.call(zoom.transform, nt);
      } else if (event.touches.length === 2 && touchStartDist > 0) {
        touchMoved = true;
        const newDist = touchDistance(event.touches);
        const factor = newDist / touchStartDist;
        const rawK = touchStartTransform.k * factor;
        const [minK, maxK] = zoom.scaleExtent();
        const newK = Math.max(minK, Math.min(maxK, rawK));
        const pivotDataX = (touchStartMid.x - touchStartTransform.x) / touchStartTransform.k;
        const pivotDataY = (touchStartMid.y - touchStartTransform.y) / touchStartTransform.k;
        const currentMid = touchMidpoint(event.touches, rect);
        const newX = currentMid.x - pivotDataX * newK;
        const newY = currentMid.y - pivotDataY * newK;
        const nt = d3.zoomIdentity.translate(newX, newY).scale(newK);
        d3overlay.call(zoom.transform, nt);
      }
    };

    const handleTouchEnd = (event) => {
      event.preventDefault();
      if (event.touches.length === 0) {
        interactingRef.current = false;
        isDraggingRef.current = false;
        if (!touchMoved && touchStartTransform) {
          const nearest = findNearest(touchSingleStart.x, touchSingleStart.y);
          if (nearest && onPlanetClickRef.current) {
            onPlanetClickRef.current(nearest);
          }
        }
        touchStartTransform = null;
        touchStartDist = 0;
        redraw();
      } else if (event.touches.length === 1) {
        const t = event.touches[0];
        const rect = overlay.getBoundingClientRect();
        touchSingleStart = {
          x: t.clientX - rect.left,
          y: t.clientY - rect.top,
          clientX: t.clientX,
          clientY: t.clientY,
          time: Date.now(),
        };
        touchStartTransform = transformRef.current;
        touchStartDist = 0;
      }
    };

    overlay.addEventListener('touchstart', handleTouchStart, { passive: false });
    overlay.addEventListener('touchmove', handleTouchMove, { passive: false });
    overlay.addEventListener('touchend', handleTouchEnd, { passive: false });
    overlay.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    const observer = new ResizeObserver(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (!width || !height) return;
      sizeRef.current = { width, height };
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        window.innerWidth < 768 ? 1.5 : 3,
      );
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = Math.max(1, Math.floor(width * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      const starsCanvas = starsCanvasRef.current;
      if (starsCanvas) {
        starsCanvas.width = Math.max(1, Math.floor(width * dpr));
        starsCanvas.height = Math.max(1, Math.floor(height * dpr));
        starsCanvas.style.width = `${width}px`;
        starsCanvas.style.height = `${height}px`;
      }

      const zoomBehavior = zoomRef.current;
      if (zoomBehavior) {
        const k = Math.min(width / 360, height / 180) * 0.7;
        const tx = (width - 360 * k) / 2;
        const ty = (height - 180 * k) / 2;
        const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(k);
        initialTransformRef.current = initialTransform;
        zoomBehavior.scaleExtent([k * 0.5, 20]);
        d3.select(overlayRef.current).call(zoomBehavior.transform, initialTransform);
      }

      redraw();
      onTransformChangeRef.current?.(transformRef.current, width, height);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      d3overlay.on('.zoom', null);
      overlay.removeEventListener('mousemove', handleMouseMove);
      overlay.removeEventListener('mouseleave', handleMouseLeave);
      overlay.removeEventListener('click', handleClick);
      overlay.removeEventListener('touchstart', handleTouchStart);
      overlay.removeEventListener('touchmove', handleTouchMove);
      overlay.removeEventListener('touchend', handleTouchEnd);
      overlay.removeEventListener('touchcancel', handleTouchEnd);
      redrawRef.current = null;
      if (resetZoomRef) resetZoomRef.current = null;
      zoomRef.current = null;
      if (starsAnimRafRef.current) {
        cancelAnimationFrame(starsAnimRafRef.current);
        starsAnimRafRef.current = null;
      }
    };
  }, [resetZoomRef]);

  useImperativeHandle(
    ref,
    () => ({
      focusPlanet: (planet) => {
        const zoom = zoomRef.current;
        const overlay = overlayRef.current;
        if (!zoom || !overlay || !planet) return;
        if (planet.ra == null || planet.dec == null) return;
        const { width, height } = sizeRef.current;
        if (!width || !height) return;
        const k = 4;
        const tx = width / 2 - xScaleRef.current(planet.ra) * k;
        const ty = height / 2 - yScaleRef.current(planet.dec) * k;
        const target = d3.zoomIdentity.translate(tx, ty).scale(k);
        d3.select(overlay)
          .transition()
          .duration(800)
          .ease(d3.easeCubicInOut)
          .call(zoom.transform, target);
      },
      getCanvas: () => canvasRef.current,
      resetZoom: () => {
        const zoom = zoomRef.current;
        const overlay = overlayRef.current;
        const target = initialTransformRef.current;
        if (!zoom || !overlay || !target) return;
        d3.select(overlay)
          .transition()
          .duration(750)
          .call(zoom.transform, target);
      },
    }),
    [],
  );

  useEffect(() => {
    onPlanetClickRef.current = onPlanetClick;
  }, [onPlanetClick]);

  useEffect(() => {
    onTransformChangeRef.current = onTransformChange;
  }, [onTransformChange]);

  useEffect(() => {
    compareModeRef.current = compareMode;
    if (compareMode) {
      setCursorMode('crosshair');
    } else if (!hoveredPlanetRef.current && !draggingRef.current) {
      setCursorMode('grab');
    }
    redrawRef.current?.();
  }, [compareMode]);

  useEffect(() => {
    comparePlanetsRef.current = comparePlanets;
    redrawRef.current?.();
  }, [comparePlanets]);

  useEffect(() => {
    heatmapModeRef.current = heatmapMode;
    redrawRef.current?.();
  }, [heatmapMode]);

  useEffect(() => {
    if (!heatmapMode) {
      heatmapGridRef.current = null;
      redrawRef.current?.();
      return;
    }

    const cols = 200;
    const rows = 100;
    const bandwidth = 15;
    const cellW = 360 / cols;
    const cellH = 180 / rows;
    const data = new Float32Array(cols * rows);

    const kernelRadiusData = bandwidth * 3;
    const b2 = 2 * bandwidth * bandwidth;

    for (const p of planets) {
      if (p.ra == null || p.dec == null) continue;
      const px = p.ra;
      const py = 90 - p.dec;
      const gxMin = Math.max(0, Math.floor((px - kernelRadiusData) / cellW));
      const gxMax = Math.min(cols - 1, Math.ceil((px + kernelRadiusData) / cellW));
      const gyMin = Math.max(0, Math.floor((py - kernelRadiusData) / cellH));
      const gyMax = Math.min(rows - 1, Math.ceil((py + kernelRadiusData) / cellH));
      for (let gy = gyMin; gy <= gyMax; gy++) {
        const cy = (gy + 0.5) * cellH;
        const dyv = cy - py;
        for (let gx = gxMin; gx <= gxMax; gx++) {
          const cx = (gx + 0.5) * cellW;
          const dxv = cx - px;
          data[gy * cols + gx] += Math.exp(-(dxv * dxv + dyv * dyv) / b2);
        }
      }
    }

    heatmapGridRef.current = { cols, rows, data };
    redrawRef.current?.();
  }, [heatmapMode, planets]);

  useEffect(() => {
    sidebarOpenRef.current = sidebarOpen;
    if (sidebarOpen && coordDisplayRef.current) {
      coordDisplayRef.current.style.display = 'none';
    }
  }, [sidebarOpen]);

  useEffect(() => {
    selectedPlanetRef.current = selectedPlanet;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (selectedPlanet) {
      const tick = () => {
        redrawRef.current?.();
        if (selectedPlanetRef.current) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      redrawRef.current?.();
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [selectedPlanet]);

  useEffect(() => {
    const valid = planets.filter((p) => p.ra != null && p.dec != null);
    const oldPlanets = planetsRef.current;
    const oldColors = colorByPlanetRef.current;

    const oldNames = new Set();
    for (const p of oldPlanets) if (p.name) oldNames.add(p.name);
    const newNames = new Set();
    for (const p of valid) if (p.name) newNames.add(p.name);

    const leaving = oldPlanets.filter(
      (p) => p.name && !newNames.has(p.name),
    );
    const enteringNames = new Set();
    for (const p of valid) {
      if (p.name && !oldNames.has(p.name)) enteringNames.add(p.name);
    }

    planetsRef.current = valid;
    colorByPlanetRef.current = colorByPlanet;
    hzByPlanetRef.current = hzByPlanet;

    const hasChanges = leaving.length > 0 || enteringNames.size > 0;
    const isFirstLoad = oldPlanets.length === 0;

    if (hasChanges && !isFirstLoad) {
      if (transitionRafRef.current) {
        cancelAnimationFrame(transitionRafRef.current);
        transitionRafRef.current = null;
      }

      const leavingColors = new Map();
      for (const p of leaving) {
        leavingColors.set(p, oldColors.get(p) ?? '#3d6080');
      }
      transitionRef.current = {
        oldPlanets,
        newPlanets: valid,
        leaving,
        leavingColors,
        enteringNames,
        startTime: Date.now(),
      };

      const tick = () => {
        const tr = transitionRef.current;
        if (!tr) {
          transitionRafRef.current = null;
          return;
        }
        const elapsed = Date.now() - tr.startTime;
        if (elapsed >= 400) {
          transitionRef.current = null;
          transitionRafRef.current = null;
          redrawRef.current?.();
          return;
        }
        redrawRef.current?.();
        transitionRafRef.current = requestAnimationFrame(tick);
      };
      transitionRafRef.current = requestAnimationFrame(tick);
    } else if (!transitionRef.current) {
      redrawRef.current?.();
    }
  }, [planets, colorByPlanet, hzByPlanet]);

  useEffect(() => {
    return () => {
      if (transitionRafRef.current) {
        cancelAnimationFrame(transitionRafRef.current);
        transitionRafRef.current = null;
      }
      transitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    highlightHZRef.current = highlightHZ;
    redrawRef.current?.();
  }, [highlightHZ]);

  useEffect(() => {
    showConstellationsRef.current = showConstellations;
    redrawRef.current?.();
  }, [showConstellations]);

  useEffect(() => {
    if (!resetZoomRef) return;
    resetZoomRef.current = () => {
      const zoom = zoomRef.current;
      const overlay = overlayRef.current;
      const target = initialTransformRef.current;
      if (!zoom || !overlay || !target) return;
      d3.select(overlay)
        .transition()
        .duration(750)
        .call(zoom.transform, target);
    };
    return () => {
      if (resetZoomRef) resetZoomRef.current = null;
    };
  }, [resetZoomRef]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const header = document.getElementById('app-header');
    const overlay = overlayRef.current;
    if (!overlay) return;

    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.right = '0px';
    el.style.left = 'auto';
    el.style.background = 'rgba(10, 22, 40, 0.95)';
    el.style.border = '1px solid #1a3a6b';
    el.style.borderTop = 'none';
    el.style.borderRight = 'none';
    el.style.borderRadius = '0 0 0 6px';
    el.style.color = '#7ba7c9';
    el.style.fontFamily = 'IBM Plex Mono, monospace';
    el.style.fontSize = '11px';
    el.style.padding = '4px 10px';
    el.style.zIndex = '10';
    el.style.pointerEvents = 'none';
    el.style.display = 'none';
    document.body.appendChild(el);
    coordDisplayRef.current = el;

    const updatePosition = () => {
      const headerBottom = header
        ? header.getBoundingClientRect().bottom
        : 0;
      el.style.top = `${headerBottom}px`;
      el.style.right = '0px';
      el.style.left = 'auto';
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);

    const updateFromPoint = (clientX, clientY) => {
      if (sidebarOpenRef.current) {
        el.style.display = 'none';
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const inside =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;
      if (!inside) {
        el.style.display = 'none';
        return;
      }
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const t = transformRef.current;
      const dataX = (mx - t.x) / t.k;
      const dataY = (my - t.y) / t.k;
      const ra = xScaleRef.current.invert(dataX);
      const dec = yScaleRef.current.invert(dataY);
      el.textContent = `RA ${ra.toFixed(1)}°  Dec ${dec >= 0 ? '+' : ''}${dec.toFixed(1)}°`;
      el.style.display = 'block';
    };

    const handleMove = (event) => {
      updateFromPoint(event.clientX, event.clientY);
    };

    const handleTouchMove = (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      updateFromPoint(touch.clientX, touch.clientY);
    };

    const handleLeave = () => {
      el.style.display = 'none';
    };

    overlay.addEventListener('mousemove', handleMove);
    overlay.addEventListener('mouseleave', handleLeave);
    overlay.addEventListener('touchmove', handleTouchMove, { passive: true });
    overlay.addEventListener('touchend', handleLeave);
    overlay.addEventListener('touchcancel', handleLeave);

    return () => {
      overlay.removeEventListener('mousemove', handleMove);
      overlay.removeEventListener('mouseleave', handleLeave);
      overlay.removeEventListener('touchmove', handleTouchMove);
      overlay.removeEventListener('touchend', handleLeave);
      overlay.removeEventListener('touchcancel', handleLeave);
      window.removeEventListener('resize', updatePosition);
      if (el.parentNode) el.parentNode.removeChild(el);
      if (coordDisplayRef.current === el) coordDisplayRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0">
      <canvas
        ref={starsCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          width: '100%',
          height: '100%',
          zIndex: 0,
          backgroundColor: '#020818',
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          width: '100%',
          height: '100%',
          zIndex: 1,
          backgroundColor: 'transparent',
        }}
      />
      <div
        ref={overlayRef}
        className={`absolute inset-0 z-10 cursor-${cursorMode}`}
        style={{ touchAction: 'none' }}
      />
      <div
        ref={tooltipRef}
        className="pointer-events-none fixed z-50 rounded border border-border bg-surface px-2 py-1 font-body text-xs text-text-primary opacity-0 transition-opacity"
      />
    </div>
  );
});

export default StarMap;
