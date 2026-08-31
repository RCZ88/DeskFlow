/**
 * renderPartition — Database topology (Nearside)
 * Voronoi-like cell regions that shift with phase.
 */
import type { TopologyRenderer } from '../../components/CurrentCanvas';

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}

export const renderPartition: TopologyRenderer = (ctx, phase, width, height, accent) => {
  const { r, g, b } = hexToRgb(accent);
  const seeds = 8;
  const points: [number, number][] = [];

  for (let i = 0; i < seeds; i++) {
    const angle = (i / seeds) * Math.PI * 2 + phase * 0.3;
    const dist = 0.2 + (i % 3) * 0.1;
    points.push([
      width * (0.5 + Math.cos(angle) * dist),
      height * (0.5 + Math.sin(angle) * dist),
    ]);
  }

  // Draw cell boundaries (simplified Voronoi — connect nearby seeds)
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[j][0] - points[i][0];
      const dy = points[j][1] - points[i][1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const threshold = Math.min(width, height) * 0.35;
      if (dist < threshold) {
        const alpha = 0.06 * (1 - dist / threshold);
        ctx.beginPath();
        ctx.moveTo(points[i][0], points[i][1]);
        ctx.lineTo(points[j][0], points[j][1]);
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  // Seed dots
  for (const [x, y] of points) {
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},0.2)`;
    ctx.fill();
  }
};
