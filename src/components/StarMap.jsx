import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { getPlanetColor, getHabitabilityZone } from '../utils/planetClassifier';

const HABITABILITY_COLORS = {
  'Optimistic HZ': '#00ff88',
  'Too Hot': '#ff4466',
  'Too Cold': '#00d4ff',
  Unknown: '#3d6080',
};

const ALL_COLORS = [
  '#ff4466',
  '#ffaa00',
  '#aa44ff',
  '#00d4ff',
  '#00ff88',
  '#7ba7c9',
  '#3d6080',
];

const DEC_LINES = [-60, -30, 0, 30, 60];
const RA_LINES = [60, 120, 180, 240, 300];

function StarMap({ planets, onPlanetClick, colorMode = 'type' }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const zoomGroupRef = useRef(null);
  const gridGroupRef = useRef(null);
  const dotsGroupRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const draggingRef = useRef(false);
  const onPlanetClickRef = useRef(onPlanetClick);
  const xScaleRef = useRef(d3.scaleLinear().domain([0, 360]));
  const yScaleRef = useRef(d3.scaleLinear().domain([-90, 90]));

  useEffect(() => {
    onPlanetClickRef.current = onPlanetClick;
  }, [onPlanetClick]);

  const filterIdByColor = useMemo(() => {
    const m = new Map();
    ALL_COLORS.forEach((c, i) => m.set(c, `glow-${i}`));
    return m;
  }, []);

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
    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    if (!container || !svg.node()) return;

    const defs = svg.append('defs');
    ALL_COLORS.forEach((color, idx) => {
      const filter = defs
        .append('filter')
        .attr('id', `glow-${idx}`)
        .attr('x', '-100%')
        .attr('y', '-100%')
        .attr('width', '300%')
        .attr('height', '300%');
      filter
        .append('feGaussianBlur')
        .attr('stdDeviation', '2.5')
        .attr('result', 'coloredBlur');
      filter
        .append('feFlood')
        .attr('flood-color', color)
        .attr('flood-opacity', '0.9')
        .attr('result', 'glowColor');
      filter
        .append('feComposite')
        .attr('in', 'glowColor')
        .attr('in2', 'coloredBlur')
        .attr('operator', 'in')
        .attr('result', 'softGlow');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'softGlow');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    const zoomGroup = svg.append('g').attr('class', 'zoom-group');
    const gridGroup = zoomGroup.append('g').attr('class', 'grid');
    const dotsGroup = zoomGroup.append('g').attr('class', 'dots');
    zoomGroupRef.current = zoomGroup;
    gridGroupRef.current = gridGroup;
    dotsGroupRef.current = dotsGroup;

    gridGroup
      .selectAll('line.dec-line')
      .data(DEC_LINES)
      .enter()
      .append('line')
      .attr('class', 'dec-line')
      .attr('stroke', '#1a3a6b')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.4);
    gridGroup
      .selectAll('line.ra-line')
      .data(RA_LINES)
      .enter()
      .append('line')
      .attr('class', 'ra-line')
      .attr('stroke', '#1a3a6b')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.4);

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 20])
      .on('start', (event) => {
        if (event.sourceEvent && event.sourceEvent.type === 'mousedown') {
          draggingRef.current = false;
        }
      })
      .on('zoom', (event) => {
        if (event.sourceEvent && event.sourceEvent.type === 'mousemove') {
          draggingRef.current = true;
        }
        zoomGroup.attr('transform', event.transform);
      })
      .on('end', () => {
        setTimeout(() => {
          draggingRef.current = false;
        }, 50);
      });
    zoomBehaviorRef.current = zoom;
    svg.call(zoom).on('dblclick.zoom', null);

    const layout = () => {
      const { width, height } = sizeRef.current;
      if (!width || !height) return;
      svg.attr('width', width).attr('height', height);
      xScaleRef.current.range([0, width]);
      yScaleRef.current.range([height, 0]);

      gridGroup
        .selectAll('line.dec-line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', (d) => yScaleRef.current(d))
        .attr('y2', (d) => yScaleRef.current(d));
      gridGroup
        .selectAll('line.ra-line')
        .attr('y1', 0)
        .attr('y2', height)
        .attr('x1', (d) => xScaleRef.current(d))
        .attr('x2', (d) => xScaleRef.current(d));

      dotsGroup
        .selectAll('circle.planet')
        .attr('cx', (d) => xScaleRef.current(d.ra))
        .attr('cy', (d) => yScaleRef.current(d.dec));
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      sizeRef.current = { width, height };
      layout();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      svg.on('.zoom', null);
      svg.selectAll('*').remove();
      zoomGroupRef.current = null;
      gridGroupRef.current = null;
      dotsGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const dotsGroup = dotsGroupRef.current;
    if (!dotsGroup) return;

    const tooltip = d3.select(tooltipRef.current);
    const xScale = xScaleRef.current;
    const yScale = yScaleRef.current;
    const validPlanets = planets.filter((p) => p.ra != null && p.dec != null);

    const sel = dotsGroup
      .selectAll('circle.planet')
      .data(validPlanets, (d, i) => d.name ?? i);

    sel.exit().remove();

    const entered = sel
      .enter()
      .append('circle')
      .attr('r', 3)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).transition().duration(120).attr('r', 5);
        tooltip
          .style('opacity', 1)
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY + 12}px`)
          .text(d.name ?? 'Unknown');
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY + 12}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).transition().duration(120).attr('r', 3);
        tooltip.style('opacity', 0);
      })
      .on('click', function (event, d) {
        if (draggingRef.current) return;
        event.stopPropagation();
        if (onPlanetClickRef.current) onPlanetClickRef.current(d);
      });

    entered
      .merge(sel)
      .attr('cx', (d) => xScale(d.ra))
      .attr('cy', (d) => yScale(d.dec))
      .attr('class', (d) =>
        `planet${colorMode === 'type' && hzByPlanet.get(d) ? ' planet-hz-pulse' : ''}`
      )
      .attr('fill', (d) => colorByPlanet.get(d))
      .attr('filter', (d) => `url(#${filterIdByColor.get(colorByPlanet.get(d))})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planets]);

  useEffect(() => {
    const dotsGroup = dotsGroupRef.current;
    if (!dotsGroup) return;
    dotsGroup
      .selectAll('circle.planet')
      .attr('fill', (d) => colorByPlanet.get(d))
      .attr('filter', (d) => `url(#${filterIdByColor.get(colorByPlanet.get(d))})`)
      .attr('class', (d) =>
        `planet${colorMode === 'type' && hzByPlanet.get(d) ? ' planet-hz-pulse' : ''}`
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorMode]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <svg ref={svgRef} className="block h-full w-full bg-transparent" />
      <div
        ref={tooltipRef}
        className="pointer-events-none fixed z-50 rounded border border-border bg-surface px-2 py-1 font-body text-xs text-text-primary opacity-0 transition-opacity"
      />
    </div>
  );
}

export default StarMap;
