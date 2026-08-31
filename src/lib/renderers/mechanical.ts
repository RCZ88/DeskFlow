/**
 * renderMechanical — IDE topology (Harmonic)
 * Rotating gear-like geometry with concentric rings.
 */
import type { TopologyRenderer } from '../../components/CurrentCanvas';

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}

export const renderMechanical: TopologyRenderer = (ctx, phase, width, height, accent) => {
  const { r, g, b } = hexToRgb(accent);
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) * 0.4;

  // Concentric rings
  const rings = 4;
  for (let i = 0; i < rings; i++) {
    const radius = maxR * ((i + 1) / rings);
    const alpha = 0.06 + 0.04 * Math.sin(phase * Math.PI * 2 + i);
    const rotation = phase * Math.PI * 2 * (i % 2 === 0 ? 1 : -1);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    // Gear teeth
    const teeth = 8 + i * 4;
    ctx.beginPath();
    for (let t = 0; t < teeth; t++) {
      const angle = (t / teeth) * Math.PI * 2;
      const innerR = radius - 3;
      const outerR = radius + 3;
      ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
    }
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Ring circle
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.6})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore();
  }

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r},${g},${b},0.3)`;
  ctx.fill();
};
