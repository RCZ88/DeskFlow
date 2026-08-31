/**
 * renderBranching — Learn topology (Harmonic knowledge tree)
 * Tree structure growing upward with branching knowledge paths.
 */
import type { TopologyRenderer } from '../../components/CurrentCanvas';

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}

export const renderBranching: TopologyRenderer = (ctx, phase, width, height, accent) => {
  const { r, g, b } = hexToRgb(accent);
  const baseY = height * 0.85;
  const trunkX = width * 0.5;

  // Trunk
  const trunkLen = height * 0.5 * (0.8 + 0.2 * Math.sin(phase * Math.PI * 2));
  ctx.beginPath();
  ctx.moveTo(trunkX, baseY);
  ctx.lineTo(trunkX, baseY - trunkLen);
  ctx.strokeStyle = `rgba(${r},${g},${b},0.15)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Branches
  const levels = 3;
  const branchesAtLevel = [2, 4, 6];
  for (let level = 0; level < levels; level++) {
    const y = baseY - trunkLen * ((level + 1) / (levels + 1));
    const count = branchesAtLevel[level];
    const spread = width * 0.3 * ((level + 1) / levels);

    for (let i = 0; i < count; i++) {
      const t = (i / (count - 1 || 1)) - 0.5;
      const endX = trunkX + t * spread;
      const wave = Math.sin(phase * Math.PI * 2 + level + i) * 5;
      const alpha = 0.08 + 0.06 * Math.sin(phase * Math.PI * 2 + i);

      ctx.beginPath();
      ctx.moveTo(trunkX, y);
      ctx.lineTo(endX + wave, y - 15 - level * 5);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Leaf dot
      ctx.beginPath();
      ctx.arc(endX + wave, y - 15 - level * 5, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 1.5})`;
      ctx.fill();
    }
  }
};
