import { useEffect, useMemo, useRef, useState } from 'react';
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

function StarMap({
  planets,
  onPlanetClick,
  colorMode = 'type',
  selectedPlanet = null,
  highlightHZ = false,
  resetZoomRef,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const tooltipRef = useRef(null);
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
  const redrawRef = useRef(null);
  const selectedPlanetRef = useRef(selectedPlanet);
  const rafRef = useRef(null);

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
      const lineW = 0.5 / t.k;

      ctx.strokeStyle = '#1a3a6b';
      ctx.lineWidth = lineW;
      ctx.globalAlpha = 0.4;
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

      const byColor = new Map();
      for (const p of validPlanets) {
        const color = colors.get(p) ?? '#3d6080';
        let group = byColor.get(color);
        if (!group) {
          group = [];
          byColor.set(color, group);
        }
        group.push(p);
      }

      if (hzHighlight) {
        ctx.globalAlpha = 0.2;
        ctx.shadowBlur = 0;
      }

      for (const [color, group] of byColor) {
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
        setCursorMode(nearest ? 'crosshair' : 'grab');
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
      if (!draggingRef.current) setCursorMode('grab');
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
      })
      .on('end', () => {
        interactingRef.current = false;
        redraw();
        setTimeout(() => {
          draggingRef.current = false;
          setCursorMode(hoveredPlanetRef.current ? 'crosshair' : 'grab');
        }, 50);
      });
    d3overlay.call(zoom).on('dblclick.zoom', null);

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
    };
  }, [resetZoomRef]);

  useEffect(() => {
    onPlanetClickRef.current = onPlanetClick;
  }, [onPlanetClick]);

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
    planetsRef.current = valid;
    colorByPlanetRef.current = colorByPlanet;
    hzByPlanetRef.current = hzByPlanet;
    redrawRef.current?.();
  }, [planets, colorByPlanet, hzByPlanet]);

  useEffect(() => {
    highlightHZRef.current = highlightHZ;
    redrawRef.current?.();
  }, [highlightHZ]);

  return (
    <div ref={containerRef} className="fixed inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 block" />
      <div ref={overlayRef} className={`absolute inset-0 z-10 cursor-${cursorMode}`} />
      <div
        ref={tooltipRef}
        className="pointer-events-none fixed z-50 rounded border border-border bg-surface px-2 py-1 font-body text-xs text-text-primary opacity-0 transition-opacity"
      />
    </div>
  );
}

export default StarMap;
