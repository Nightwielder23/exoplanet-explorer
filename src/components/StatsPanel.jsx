import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getPlanetType, getHabitabilityZone } from '../utils/planetClassifier';

const METHOD_LABEL_OVERRIDES = {
  'Transit Timing Variations': 'Transit Timing',
};

const shortMethod = (name) => METHOD_LABEL_OVERRIDES[name] ?? name;

function StatCard({ label, value }) {
  return (
    <div className="rounded border border-border bg-surface-elevated px-2 py-1.5">
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

    for (const p of planets) {
      const type = getPlanetType(p);
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);

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

    return {
      mostCommonType,
      avgDistance: distCount > 0 ? distSum / distCount : null,
      hzCount,
      earliestYear: minYear === Infinity ? null : minYear,
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

  const avgDistanceLabel =
    summary.avgDistance != null
      ? `${summary.avgDistance.toLocaleString(undefined, { maximumFractionDigits: 1 })} pc`
      : '—';

  const isFiltered = planets.length < 6160;

  return (
    <div className="flex flex-col items-end">
      <div
        className="w-80 overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
        style={{
          maxHeight: isOpen ? '500px' : '0px',
          opacity: isOpen ? 1 : 0,
        }}
        aria-hidden={!isOpen}
      >
        <div className="mb-2 rounded border border-border bg-surface p-3 shadow-2xl">
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
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 rounded border border-border bg-surface px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest text-accent-cyan transition-colors hover:bg-surface-elevated"
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
