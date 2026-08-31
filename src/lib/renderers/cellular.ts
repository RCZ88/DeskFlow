/**
 * renderCellular — AI topology (Quorum)
 * Grid of cells that pulse and evolve with phase.
 */
import type { TopologyRenderer } from '../../components/CurrentCanvas';

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}

export const renderCellular: TopologyRenderer = (ctx, phase, width, height, accent) => {
  const { r, g, b } = hexToRgb(accent);
  const cols = 12;
  const rows = 8;
  const cellW = width / cols;
  const cellH = height / rows;
  const pad = 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellW + pad;
      const y = row * cellH + pad;
      const w = cellW - pad * 2;
      const h = cellH - pad * 2;

      // Deterministic "alive" pattern based on phase + position
      const dist = Math.sqrt(Math.pow(col - cols / 2, 2) + Math.pow(row - rows / 2, 2));
      const wave = Math.sin(phase * Math.PI * 2 - dist * 0.5);
      const alive = wave > 0.3;

      if (alive) {
        const alpha = 0.08 + 0.12 * ((wave - 0.3) / 0.7);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fillRect(x, y, w, h);
      }
    }
  }

  // Central pulse
  const pulse = 3 + Math.sin(phase * Math.PI * 2) * 1.5;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, pulse * 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r},${g},${b},0.08)`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, pulse, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r},${g},${b},0.2)`;
  ctx.fill();
};
