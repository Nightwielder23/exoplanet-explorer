import { useEffect, useRef } from 'react';
import { getPlanetColor } from '../utils/planetClassifier';

const MAP_W = 180;
const MAP_H = 90;

function MiniMap({ planets, transform, canvasWidth, canvasHeight }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = MAP_W * dpr;
    canvas.height = MAP_H * dpr;
    canvas.style.width = `${MAP_W}px`;
    canvas.style.height = `${MAP_H}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, MAP_W, MAP_H);

    for (const p of planets) {
      if (p.ra == null || p.dec == null) continue;
      const x = (p.ra / 360) * MAP_W;
      const y = ((90 - p.dec) / 180) * MAP_H;
      ctx.fillStyle = getPlanetColor(p);
      ctx.fillRect(x, y, 1, 1);
    }

    if (transform && canvasWidth > 0 && canvasHeight > 0 && transform.k) {
      const skyX0 = -transform.x / transform.k;
      const skyX1 = (canvasWidth - transform.x) / transform.k;
      const skyY0 = -transform.y / transform.k;
      const skyY1 = (canvasHeight - transform.y) / transform.k;

      let rx0 = (skyX0 / 360) * MAP_W;
      let ry0 = (skyY0 / 180) * MAP_H;
      let rx1 = (skyX1 / 360) * MAP_W;
      let ry1 = (skyY1 / 180) * MAP_H;

      rx0 = Math.max(0, Math.min(MAP_W, rx0));
      rx1 = Math.max(0, Math.min(MAP_W, rx1));
      ry0 = Math.max(0, Math.min(MAP_H, ry0));
      ry1 = Math.max(0, Math.min(MAP_H, ry1));

      const rw = rx1 - rx0;
      const rh = ry1 - ry0;
      if (rw > 0 && rh > 0) {
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;
        ctx.strokeRect(rx0 + 0.5, ry0 + 0.5, rw - 1, rh - 1);
        ctx.fillStyle = 'rgba(0, 212, 255, 0.12)';
        ctx.fillRect(rx0, ry0, rw, rh);
      }
    }
  }, [planets, transform, canvasWidth, canvasHeight]);

  return (
    <div
      className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center origin-bottom transition-transform duration-200 ease-out hover:scale-150"
      style={{ opacity: 0.8 }}
    >
      <div className="mb-1 font-display text-[9px] uppercase tracking-widest text-text-muted">
        Overview
      </div>
      <canvas
        ref={canvasRef}
        className="block rounded border border-border bg-surface"
      />
    </div>
  );
}

export default MiniMap;
