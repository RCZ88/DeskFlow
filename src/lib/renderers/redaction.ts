/**
 * renderRedaction — Settings topology (Deident)
 * Horizontal masking bars that reveal/hide with phase.
 */
import type { TopologyRenderer } from '../../components/CurrentCanvas';

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}

export const renderRedaction: TopologyRenderer = (ctx, phase, width, height, accent) => {
  const { r, g, b } = hexToRgb(accent);
  const bars = 6;
  const barH = height / (bars + 1);

  for (let i = 0; i < bars; i++) {
    const y = barH * (i + 1) - 1;
    const revealProgress = Math.sin(phase * Math.PI * 2 + i * 0.8);
    const revealWidth = width * (0.3 + 0.4 * (revealProgress + 1) / 2);
    const startX = (width - revealWidth) / 2;
    const alpha = 0.04 + 0.06 * Math.abs(revealProgress);

    // Redacted bar
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fillRect(0, y, width, 2);

    // Revealed portion (lighter)
    const revealAlpha = 0.08 + 0.1 * Math.abs(revealProgress);
    ctx.fillStyle = `rgba(${r},${g},${b},${revealAlpha})`;
    ctx.fillRect(startX, y - 1, revealWidth, 4);
  }
};
