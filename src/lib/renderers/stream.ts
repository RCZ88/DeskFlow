/**
 * renderStream — Dashboard topology for "The Current"
 * 
 * A horizontal stream flowing left-to-right with:
 * - A glowing pulse marker at the current phase position
 * - Subtle deviation nodes where events occurred
 * - Trail glow behind the pulse
 */

import type { TopologyRenderer } from '../../components/CurrentCanvas';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export const renderStream: TopologyRenderer = (ctx, phase, width, height, accent) => {
  const { r, g, b } = hexToRgb(accent);
  const midY = height * 0.5;
  const streamY = midY;

  // Main stream line (subtle horizontal gradient)
  ctx.beginPath();
  ctx.moveTo(0, streamY);
  ctx.lineTo(width, streamY);
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  grad.addColorStop(0.2, `rgba(${r},${g},${b},0.3)`);
  grad.addColorStop(0.8, `rgba(${r},${g},${b},0.3)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Pulse position along the stream
  const pulseX = phase * width;

  // Trail glow behind pulse
  const trailLen = width * 0.15;
  const trailGrad = ctx.createLinearGradient(pulseX - trailLen, 0, pulseX, 0);
  trailGrad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  trailGrad.addColorStop(1, `rgba(${r},${g},${b},0.15)`);
  ctx.beginPath();
  ctx.moveTo(pulseX - trailLen, streamY);
  ctx.lineTo(pulseX, streamY);
  ctx.strokeStyle = trailGrad;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Event deviation nodes (deterministic from phase)
  const nodeCount = 5;
  for (let i = 0; i < nodeCount; i++) {
    const t = ((i + 0.5) / nodeCount);
    const nx = t * width;
    const deviation = Math.sin(t * Math.PI * 2 + phase * Math.PI * 4) * 20;
    const ny = streamY + deviation;
    const alpha = 0.15 + 0.1 * Math.sin(phase * Math.PI * 2 + i);
    const nodeRadius = 2 + Math.sin(phase * Math.PI * 2 + i * 0.7) * 1;

    ctx.beginPath();
    ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fill();

    // Faint connecting line to stream
    ctx.beginPath();
    ctx.moveTo(nx, streamY);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.5})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Pulse marker (glowing dot)
  const pulseRadius = 4 + Math.sin(phase * Math.PI * 2) * 1.5;
  const pulseAlpha = 0.6 + 0.2 * Math.sin(phase * Math.PI * 2);

  // Outer glow
  ctx.beginPath();
  ctx.arc(pulseX, streamY, pulseRadius * 3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r},${g},${b},${pulseAlpha * 0.1})`;
  ctx.fill();

  // Inner glow
  ctx.beginPath();
  ctx.arc(pulseX, streamY, pulseRadius * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r},${g},${b},${pulseAlpha * 0.2})`;
  ctx.fill();

  // Core
  ctx.beginPath();
  ctx.arc(pulseX, streamY, pulseRadius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r},${g},${b},${pulseAlpha})`;
  ctx.fill();
};
