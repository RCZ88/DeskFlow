/**
 * renderInflow — External topology (Headway incoming streams)
 * Streams flowing inward from edges toward center.
 */
import type { TopologyRenderer } from '../../components/CurrentCanvas';

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}

export const renderInflow: TopologyRenderer = (ctx, phase, width, height, accent) => {
  const { r, g, b } = hexToRgb(accent);
  const cx = width / 2;
  const cy = height / 2;
  const streams = 8;

  for (let i = 0; i < streams; i++) {
    const angle = (i / streams) * Math.PI * 2;
    const startDist = Math.max(width, height) * 0.6;
    const sx = cx + Math.cos(angle) * startDist;
    const sy = cy + Math.sin(angle) * startDist;
    const alpha = 0.08 + 0.06 * Math.sin(phase * Math.PI * 2 + i);
    const wave = Math.sin(phase * Math.PI * 4 + i * 1.5) * 10;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(
      cx + Math.cos(angle) * startDist * 0.3 + wave,
      cy + Math.sin(angle) * startDist * 0.3 + wave,
      cx, cy
    );
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Center collection point
  const pulse = 3 + Math.sin(phase * Math.PI * 2) * 1;
  ctx.beginPath();
  ctx.arc(cx, cy, pulse * 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r},${g},${b},0.06)`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r},${g},${b},0.2)`;
  ctx.fill();
};
