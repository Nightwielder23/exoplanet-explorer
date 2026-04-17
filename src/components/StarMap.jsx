import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getPlanetColor, getHabitabilityZone } from '../utils/planetClassifier';

const HABITABILITY_COLORS = {
  'Optimistic HZ': '#00ff88',
  'Too Hot': '#ff4466',
  'Too Cold': '#00d4ff',
  Unknown: '#3d6080',
};

function StarMap({ planets, onPlanetClick, colorMode = 'type' }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const draggingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      sizeRef.current = { width, height };
      render();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (svgRef.current && zoomBehaviorRef.current) {
        d3.select(svgRef.current).on('.zoom', null);
      }
    };
  }, []);

  useEffect(() => {
    render();
  }, [planets, colorMode]);

  const render = () => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;

    const { width, height } = sizeRef.current;
    if (!width || !height || !planets || planets.length === 0) {
      svg.selectAll('*').remove();
      return;
    }

    svg.attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const colorFor = (p) => {
      if (colorMode === 'habitability') {
        return HABITABILITY_COLORS[getHabitabilityZone(p)] ?? HABITABILITY_COLORS.Unknown;
      }
      return getPlanetColor(p);
    };

    const uniqueColors = Array.from(new Set(planets.map((p) => colorFor(p))));
    uniqueColors.forEach((color, idx) => {
      const filterId = `glow-${idx}`;
      const filter = defs
        .append('filter')
        .attr('id', filterId)
        .attr('x', '-100%')
        .attr('y', '-100%')
        .attr('width', '300%')
        .attr('height', '300%');
      filter
        .append('feGaussianBlur')
        .attr('stdDeviation', '2.5')
        .attr('result', 'coloredBlur');
      const flood = filter
        .append('feFlood')
        .attr('flood-color', color)
        .attr('flood-opacity', '0.9');
      flood.attr('result', 'glowColor');
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
    const colorToFilterId = new Map(uniqueColors.map((c, idx) => [c, `glow-${idx}`]));

    const xScale = d3.scaleLinear().domain([0, 360]).range([0, width]);
    const yScale = d3.scaleLinear().domain([-90, 90]).range([height, 0]);

    const zoomGroup = svg.append('g').attr('class', 'zoom-group');

    const gridGroup = zoomGroup.append('g').attr('class', 'grid');
    const decLines = [-60, -30, 0, 30, 60];
    const raLines = [60, 120, 180, 240, 300];
    gridGroup
      .selectAll('line.dec')
      .data(decLines)
      .enter()
      .append('line')
      .attr('class', 'dec')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#1a3a6b')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.4);
    gridGroup
      .selectAll('line.ra')
      .data(raLines)
      .enter()
      .append('line')
      .attr('class', 'ra')
      .attr('y1', 0)
      .attr('y2', height)
      .attr('x1', (d) => xScale(d))
      .attr('x2', (d) => xScale(d))
      .attr('stroke', '#1a3a6b')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.4);

    const tooltip = d3.select(tooltipRef.current);

    const dots = zoomGroup
      .selectAll('circle.planet')
      .data(planets.filter((p) => p.ra != null && p.dec != null))
      .enter()
      .append('circle')
      .attr('class', (d) => {
        const inHZ = getHabitabilityZone(d) === 'Optimistic HZ';
        return `planet${colorMode === 'type' && inHZ ? ' planet-hz-pulse' : ''}`;
      })
      .attr('cx', (d) => xScale(d.ra))
      .attr('cy', (d) => yScale(d.dec))
      .attr('r', 3)
      .attr('fill', (d) => colorFor(d))
      .attr('filter', (d) => `url(#${colorToFilterId.get(colorFor(d))})`)
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
        if (onPlanetClick) onPlanetClick(d);
      });

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

    dots.raise();
  };

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
