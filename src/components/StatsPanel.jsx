import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getPlanetType, getHabitabilityZone } from '../utils/planetClassifier';
import { playClick, playOpen } from '../utils/sounds';

const METHOD_LABEL_OVERRIDES = {
  'Transit Timing Variations': 'Transit Timing',
};

const shortMethod = (name) => METHOD_LABEL_OVERRIDES[name] ?? name;

function StatCard({ label, value }) {
  return (
    <div className="rounded border border-border bg-surface-elevated px-2 py-1.5 transition-all duration-150 hover:-translate-y-0.5 hover:bg-surface">
      <div className="font-display text-[9px] uppercase tracking-widest text-text-muted">
        {label}
      </div>
      <div className="mt-0.5 truncate font-body text-sm text-text-primary">
        {value}
      </div>
    </div>
  );
}

function StatsPanel({ planets }) {
  const [isOpen, setIsOpen] = useState(false);
  const chartRef = useRef(null);
  const timelineRef = useRef(null);

  const yearCounts = useMemo(() => {
    const counts = new Map();
    for (const p of planets) {
      const y = p.discoveryYear;
      if (y == null || !Number.isFinite(y)) continue;
      counts.set(y, (counts.get(y) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year, count }));
  }, [planets]);

  const methodCounts = useMemo(() => {
    const counts = new Map();
    for (const p of planets) {
      const m = p.discoveryMethod || 'Unknown';
      counts.set(m, (counts.get(m) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [planets]);

  const summary = useMemo(() => {
    const typeCounts = new Map();
    let distSum = 0;
    let distCount = 0;
    let hzCount = 0;
    let minYear = Infinity;
    let closest = null;

    for (const p of planets) {
      const type = getPlanetType(p);
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);

      if (p.distance != null && Number.isFinite(p.distance)) {
        distSum += p.distance;
        distCount += 1;
        if (p.distance > 0 && (closest == null || p.distance < closest.distance)) {
          closest = p;
        }
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

    return {
      mostCommonType,
      avgDistance: distCount > 0 ? distSum / distCount : null,
      hzCount,
      earliestYear: minYear === Infinity ? null : minYear,
      closest,
    };
  }, [planets]);

  useEffect(() => {
    if (!chartRef.current) return;
    const svg = d3.select(chartRef.current);
    svg.selectAll('*').remove();

    const width = 272;
    const rowH = 20;
    const labelW = 96;
    const countW = 36;
    const barAreaW = width - labelW - countW;
    const height = methodCounts.length * rowH;

    svg.attr('width', width).attr('height', height);

    if (methodCounts.length === 0) return;

    const maxCount = methodCounts[0][1];
    const xScale = d3.scaleLinear().domain([0, maxCount]).range([0, barAreaW]);

    const rows = svg
      .selectAll('g')
      .data(methodCounts)
      .enter()
      .append('g')
      .attr('transform', (_, i) => `translate(0, ${i * rowH})`);

    rows
      .append('text')
      .attr('x', labelW - 6)
      .attr('y', rowH / 2 + 3)
      .attr('text-anchor', 'end')
      .attr('fill', '#7ba7c9')
      .attr('font-family', "'IBM Plex Mono', monospace")
      .attr('font-size', '10px')
      .text((d) => shortMethod(d[0]));

    rows
      .append('rect')
      .attr('x', labelW)
      .attr('y', 4)
      .attr('width', (d) => Math.max(1, xScale(d[1])))
      .attr('height', rowH - 8)
      .attr('fill', '#00d4ff')
      .attr('opacity', 0.85);

    rows
      .append('text')
      .attr('x', (d) => labelW + xScale(d[1]) + 4)
      .attr('y', rowH / 2 + 3)
      .attr('fill', '#e8f4fd')
      .attr('font-family', "'IBM Plex Mono', monospace")
      .attr('font-size', '10px')
      .text((d) => d[1].toLocaleString());
  }, [methodCounts]);

  useEffect(() => {
    if (!timelineRef.current) return;
    const svg = d3.select(timelineRef.current);
    svg.selectAll('*').remove();

    const width = 272;
    const height = 60;
    const margin = { top: 6, right: 8, bottom: 14, left: 8 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'none')
      .attr('width', '100%')
      .attr('height', height);

    if (yearCounts.length < 2) return;

    const minYear = yearCounts[0].year;
    const maxYear = yearCounts[yearCounts.length - 1].year;
    const maxCount = d3.max(yearCounts, (d) => d.count) ?? 1;

    const xScale = d3
      .scaleLinear()
      .domain([minYear, maxYear])
      .range([margin.left, margin.left + innerW]);
    const yScale = d3
      .scaleLinear()
      .domain([0, maxCount])
      .range([margin.top + innerH, margin.top]);

    const line = d3
      .line()
      .x((d) => xScale(d.year))
      .y((d) => yScale(d.count))
      .curve(d3.curveMonotoneX);

    const area = d3
      .area()
      .x((d) => xScale(d.year))
      .y0(margin.top + innerH)
      .y1((d) => yScale(d.count))
      .curve(d3.curveMonotoneX);

    svg
      .append('path')
      .datum(yearCounts)
      .attr('fill', '#00d4ff')
      .attr('opacity', 0.15)
      .attr('d', area);

    svg
      .append('path')
      .datum(yearCounts)
      .attr('fill', 'none')
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 1.25)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', line);

    const peak = yearCounts.reduce((best, d) =>
      d.count > best.count ? d : best,
    );

    const peakDot = svg
      .append('circle')
      .attr('cx', xScale(peak.year))
      .attr('cy', yScale(peak.count))
      .attr('r', 2.5)
      .attr('fill', '#ffaa00')
      .style('filter', 'drop-shadow(0 0 3px rgba(255, 170, 0, 0.8))');
    peakDot
      .append('title')
      .text(`PEAK: ${peak.year} (${peak.count.toLocaleString()} planets)`);

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', height - 2)
      .attr('fill', '#3d6080')
      .attr('font-family', "'IBM Plex Mono', monospace")
      .attr('font-size', '9px')
      .attr('text-anchor', 'start')
      .text(minYear);

    svg
      .append('text')
      .attr('x', margin.left + innerW)
      .attr('y', height - 2)
      .attr('fill', '#3d6080')
      .attr('font-family', "'IBM Plex Mono', monospace")
      .attr('font-size', '9px')
      .attr('text-anchor', 'end')
      .text(maxYear);
  }, [yearCounts]);

  const avgDistanceLabel =
    summary.avgDistance != null
      ? `${summary.avgDistance.toLocaleString(undefined, { maximumFractionDigits: 1 })} pc`
      : '—';

  const closestLabel = summary.closest
    ? `${summary.closest.name ?? 'Unknown'} — ${summary.closest.distance.toLocaleString(undefined, { maximumFractionDigits: 1 })} pc`
    : '—';

  const isFiltered = planets.length < 6160;

  return (
    <div className="hidden md:block relative">
      <div
        className="absolute bottom-full right-0 mb-2 flex w-80 flex-col justify-end overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isOpen ? '500px' : '0px',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        aria-hidden={!isOpen}
      >
        <div className="rounded border border-border bg-surface p-3 shadow-2xl">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="font-display text-sm font-bold uppercase tracking-widest text-accent-cyan">
              Statistics
            </h3>
            {isFiltered && (
              <span className="rounded border border-accent-teal/60 px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-widest text-accent-teal">
                Filtered
              </span>
            )}
          </div>

          <div className="mb-3">
            <div className="mb-1 font-display text-[10px] uppercase tracking-widest text-text-secondary">
              Discovery Methods (Top 5)
            </div>
            <svg ref={chartRef} />
          </div>

          <div className="mb-3">
            <div className="mb-1 font-display text-[10px] uppercase tracking-widest text-text-secondary">
              Discoveries By Year
            </div>
            <svg ref={timelineRef} className="block w-full" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Most Common" value={summary.mostCommonType} />
            <StatCard label="Avg Distance" value={avgDistanceLabel} />
            <StatCard
              label="Habitable Zone"
              value={summary.hzCount.toLocaleString()}
            />
            <StatCard
              label="Earliest"
              value={summary.earliestYear ?? '—'}
            />
            <div className="col-span-2 rounded border border-border bg-surface-elevated px-2 py-1.5 transition-all duration-150 hover:-translate-y-0.5 hover:bg-surface">
              <div className="font-display text-[9px] uppercase tracking-widest text-text-muted">
                Closest to Earth
              </div>
              <div className="mt-0.5 truncate font-body text-sm text-text-primary">
                {closestLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => { playOpen(); setIsOpen((v) => !v); }}
        className="control-btn flex items-center gap-2 rounded border border-border bg-surface px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest text-accent-cyan transition-colors hover:bg-surface-elevated"
        aria-label={isOpen ? 'Collapse stats' : 'Expand stats'}
      >
        <span>Stats</span>
        <span className="text-[10px] text-text-secondary">
          {isOpen ? '▾' : '▴'}
        </span>
      </button>
    </div>
  );
}

export default StatsPanel;
