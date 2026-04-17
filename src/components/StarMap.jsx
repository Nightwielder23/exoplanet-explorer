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

const HABITABILITY_COLORS = {
  'Optimistic HZ': '#00ff88',
  'Too Hot': '#ff4466',
  'Too Cold': '#00d4ff',
  Unknown: '#3d6080',
};

const DEC_LINES = [-60, -30, 0, 30, 60];
const RA_LINES = [60, 120, 180, 240, 300];

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
  },
  ref,
) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const tooltipRef = useRef(null);
  const coordDisplayRef = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const transformRef = useRef(d3.zoomIdentity);
  const initialTransformRef = useRef(null);
  const draggingRef = useRef(false);
  const interactingRef = useRef(false);
  const hoveredPlanetRef = useRef(null);
  const [cursorMode, setCursorMode] = useState('grab');
  const planetsRef = useRef([]);
  const colorByPlanetRef = useRef(new Map());
  const hzByPlanetRef = useRef(new Map());
  const highlightHZRef = useRef(highlightHZ);
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
  const zoomRef = useRef(null);

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

    const tooltip = d3.select(tooltipRef.current);

    const redraw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const { width, height } = sizeRef.current;
      if (!width || !height) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const t = transformRef.current;
      const xScale = xScaleRef.current;
      const yScale = yScaleRef.current;
      const validPlanets = planetsRef.current;
      const colors = colorByPlanetRef.current;
      const useGlow = !interactingRef.current;

      ctx.shadowBlur = 0;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.k, t.k);

      const dotR = 3 / t.k;
      const hoverR = 5 / t.k;
      const lineW = 0.8 / t.k;

      ctx.strokeStyle = '#2a5a9b';
      ctx.lineWidth = lineW;
      ctx.globalAlpha = 0.6;
      ctx.shadowBlur = 3 / t.k;
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
      ctx.shadowBlur = 8 / t.k;
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
      ctx.shadowBlur = 6 / t.k;
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

      ctx.font = `bold ${18 / t.k}px IBM Plex Mono`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 1;
      const labelText = 'OBSERVABLE SKY BOUNDARY';
      const labelX = xScale(180);
      const labelY = y0 - 8 / t.k;
      const labelMetrics = ctx.measureText(labelText);
      const bgPadX = 12 / t.k;
      const bgPadY = 6 / t.k;
      const bgW = labelMetrics.width + bgPadX * 2;
      const bgH = 18 / t.k + bgPadY * 2;
      const bgX = labelX - bgW / 2;
      const bgY = labelY - bgH / 2;
      const bgRadius = 4 / t.k;

      ctx.fillStyle = 'rgba(0, 15, 30, 0.85)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bgX, bgY, bgW, bgH, bgRadius);
      } else {
        ctx.rect(bgX, bgY, bgW, bgH);
      }
      ctx.fill();

      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '2px';
      }
      ctx.fillStyle = '#00d4ff';
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 10 / t.k;
      ctx.fillText(labelText, labelX, labelY);
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

      const stableByColor = new Map();
      const enteringByColor = new Map();
      for (const p of validPlanets) {
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

      const baseAlpha = hzHighlight ? 0.2 : 1;
      const drawBatch = (byColorMap, alpha) => {
        if (alpha <= 0) return;
        ctx.globalAlpha = baseAlpha * alpha;
        for (const [color, group] of byColorMap) {
          ctx.fillStyle = color;
          if (!hzHighlight && useGlow) {
            ctx.shadowBlur = 6;
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
        ctx.shadowBlur = 12 / t.k;
        ctx.shadowColor = '#00ff88';
        for (const p of hzPlanets) {
          const x = xScale(p.ra);
          const y = yScale(p.dec);
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
        if (useGlow) {
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
        ctx.shadowBlur = 8 / t.k;
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

      ctx.restore();
      ctx.shadowBlur = 0;
    };
    redrawRef.current = redraw;

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

      const coordEl = coordDisplayRef.current;
      if (coordEl) {
        const t = transformRef.current;
        const dataX = (mx - t.x) / t.k;
        const dataY = (my - t.y) / t.k;
        const ra = xScaleRef.current.invert(dataX);
        const dec = yScaleRef.current.invert(dataY);
        coordEl.textContent = `RA ${ra.toFixed(1)}°  Dec ${dec >= 0 ? '+' : ''}${dec.toFixed(1)}°`;
        coordEl.style.opacity = '1';
        coordEl.style.visibility = 'visible';
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
      if (coordDisplayRef.current) {
        coordDisplayRef.current.style.opacity = '0';
        coordDisplayRef.current.style.visibility = 'hidden';
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

    let hasFitInitial = false;
    const observer = new ResizeObserver(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (!width || !height) return;
      sizeRef.current = { width, height };
      const dpr = window.devicePixelRatio || 1;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = Math.max(1, Math.floor(width * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      if (!hasFitInitial) {
        hasFitInitial = true;
        const k = Math.min(width / 360, height / 180) * 0.9;
        const tx = (width - 360 * k) / 2;
        const ty = (height - 180 * k) / 2;
        zoom.scaleExtent([k * 0.5, 20]);
        const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(k);
        initialTransformRef.current = initialTransform;
        d3overlay.call(zoom.transform, initialTransform);
        if (resetZoomRef) {
          resetZoomRef.current = () => {
            const target = initialTransformRef.current;
            if (!target) return;
            d3overlay
              .transition()
              .duration(750)
              .call(zoom.transform, target);
          };
        }
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
      redrawRef.current = null;
      if (resetZoomRef) resetZoomRef.current = null;
      zoomRef.current = null;
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
    const headerEl = document.getElementById('app-header');
    const headerHeight = headerEl ? headerEl.offsetHeight + 'px' : '70px';
    if (coordDisplayRef.current) {
      coordDisplayRef.current.style.top = headerHeight;
    }

    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.top = headerHeight;
    el.style.right = '16px';
    el.style.zIndex = '99999';
    el.style.pointerEvents = 'none';
    el.style.background = 'rgba(10, 22, 40, 0.85)';
    el.style.border = '1px solid #1a3a6b';
    el.style.borderTop = 'none';
    el.style.borderRadius = '0 0 6px 6px';
    el.style.color = '#7ba7c9';
    el.style.fontFamily = 'IBM Plex Mono, monospace';
    el.style.fontSize = '11px';
    el.style.padding = '6px 10px';
    el.style.opacity = '0';
    el.style.visibility = 'hidden';
    el.style.transition = 'opacity 0.15s';
    document.body.appendChild(el);

    const handleMove = (event) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const { clientX, clientY } = event;
      const inside =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;
      if (!inside) {
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
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
      el.style.visibility = 'visible';
      el.style.opacity = '1';
    };

    window.addEventListener('mousemove', handleMove);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 block" />
      <div ref={overlayRef} className={`absolute inset-0 z-10 cursor-${cursorMode}`} />
      <div
        id="coord-display"
        ref={coordDisplayRef}
        style={{
          position: 'fixed',
          top: '72px',
          right: '16px',
          left: 'auto',
          bottom: 'auto',
          transform: 'none',
          background: 'rgba(10, 22, 40, 0.85)',
          border: '1px solid #1a3a6b',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          color: '#7ba7c9',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '11px',
          paddingTop: '6px',
          paddingBottom: '6px',
          paddingLeft: '10px',
          paddingRight: '10px',
          pointerEvents: 'none',
          zIndex: 99999,
          display: 'block',
          opacity: '0',
          visibility: 'hidden',
          transition: 'opacity 0.15s',
        }}
      />
      <div
        ref={tooltipRef}
        className="pointer-events-none fixed z-50 rounded border border-border bg-surface px-2 py-1 font-body text-xs text-text-primary opacity-0 transition-opacity"
      />
    </div>
  );
});

export default StarMap;
