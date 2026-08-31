/**
 * renderSignal — Activity topology (Foreshock)
 * Parallel horizontal trace lines with wave deviations.
 */
import type { TopologyRenderer } from '../../components/CurrentCanvas';

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}

export const renderSignal: TopologyRenderer = (ctx, phase, width, height, accent) => {
  const { r, g, b } = hexToRgb(accent);
  const traces = 5;
  const traceSpacing = height / (traces + 1);

  for (let t = 0; t < traces; t++) {
    const baseY = traceSpacing * (t + 1);
    const alpha = 0.1 + 0.08 * Math.sin(phase * Math.PI * 2 + t * 0.8);
    const amplitude = 8 + t * 3;

    ctx.beginPath();
    for (let x = 0; x < width; x += 2) {
      const progress = x / width;
      const wave = Math.sin(progress * Math.PI * 4 + phase * Math.PI * 2 + t * 1.5) * amplitude;
      const envelope = Math.sin(progress * Math.PI); // fade at edges
      const y = baseY + wave * envelope;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Vertical scan line
  const scanX = (phase * width * 1.5) % width;
  const scanGrad = ctx.createLinearGradient(scanX - 20, 0, scanX, 0);
  scanGrad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  scanGrad.addColorStop(1, `rgba(${r},${g},${b},0.15)`);
  ctx.beginPath();
  ctx.moveTo(scanX - 20, 0);
  ctx.lineTo(scanX, 0);
  ctx.lineTo(scanX, height);
  ctx.lineTo(scanX - 20, height);
  ctx.closePath();
  ctx.fillStyle = scanGrad;
  ctx.fill();
};
