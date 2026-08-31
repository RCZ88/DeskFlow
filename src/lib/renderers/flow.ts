/**
 * renderFlow — Finance topology (Headway / Freeboard)
 * Main stream splits into income (top) and expense (bottom).
 */
import type { TopologyRenderer } from '../../components/CurrentCanvas';

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}

export const renderFlow: TopologyRenderer = (ctx, phase, width, height, accent) => {
  const { r, g, b } = hexToRgb(accent);
  const midX = width * 0.5;
  const midY = height * 0.5;

  // Main horizontal flow
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(width, midY);
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  grad.addColorStop(0.3, `rgba(${r},${g},${b},0.2)`);
  grad.addColorStop(0.7, `rgba(${r},${g},${b},0.2)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Income streams (flowing down from top)
  const incomeCount = 3;
  for (let i = 0; i < incomeCount; i++) {
    const x = width * (0.2 + (i / (incomeCount - 1 || 1)) * 0.6);
    const startY = height * 0.1;
    const alpha = 0.12 + 0.08 * Math.sin(phase * Math.PI * 2 + i);
    const wave = Math.sin(phase * Math.PI * 4 + i * 2) * 8;

    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.quadraticCurveTo(x + wave, midY * 0.5, midX, midY);
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Expense streams (flowing down to bottom)
  const expenseCount = 3;
  for (let i = 0; i < expenseCount; i++) {
    const x = width * (0.2 + (i / (expenseCount - 1 || 1)) * 0.6);
    const endY = height * 0.9;
    const alpha = 0.12 + 0.08 * Math.sin(phase * Math.PI * 2 + i + 3);
    const wave = Math.sin(phase * Math.PI * 4 + i * 2 + 3) * 8;

    ctx.beginPath();
    ctx.moveTo(midX, midY);
    ctx.quadraticCurveTo(x + wave, midY + (endY - midY) * 0.5, x, endY);
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Pulse at center
  const pulse = 3 + Math.sin(phase * Math.PI * 2) * 1;
  ctx.beginPath();
  ctx.arc(midX, midY, pulse * 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r},${g},${b},0.06)`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(midX, midY, pulse, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r},${g},${b},0.25)`;
  ctx.fill();
};
