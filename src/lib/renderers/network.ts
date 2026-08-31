/**
 * renderNetwork — Life topology (Morphogen / Adjacent)
 * Central node with branching relationships. Branches pulse with phase.
 */
import type { TopologyRenderer } from '../../components/CurrentCanvas';

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}

export const renderNetwork: TopologyRenderer = (ctx, phase, width, height, accent) => {
  const { r, g, b } = hexToRgb(accent);
  const cx = width * 0.5;
  const cy = height * 0.5;
  const branches = 6;
  const maxLen = Math.min(width, height) * 0.35;

  for (let i = 0; i < branches; i++) {
    const angle = (i / branches) * Math.PI * 2 + phase * Math.PI * 0.5;
    const len = maxLen * (0.6 + 0.4 * Math.sin(phase * Math.PI * 2 + i * 1.2));
    const ex = cx + Math.cos(angle) * len;
    const ey = cy + Math.sin(angle) * len;
    const alpha = 0.15 + 0.1 * Math.sin(phase * Math.PI * 2 + i);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Sub-branches
    for (let j = 0; j < 2; j++) {
      const subAngle = angle + (j === 0 ? 0.4 : -0.4);
      const subLen = len * 0.4;
      const sx = ex + Math.cos(subAngle) * subLen;
      const sy = ey + Math.sin(subAngle) * subLen;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.5})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Node at end
    ctx.beginPath();
    ctx.arc(ex, ey, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 1.5})`;
    ctx.fill();
  }

  // Center node
  const pulse = 4 + Math.sin(phase * Math.PI * 2) * 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, pulse * 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r},${g},${b},0.08)`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r},${g},${b},0.3)`;
  ctx.fill();
};
