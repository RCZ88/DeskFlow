/**
 * CurrentCanvas — Per-page canvas for "The Current" visual.
 * Renders INSIDE the page container (absolute inset-0), NOT global overlay.
 */

import { useRef, useEffect, useCallback } from 'react';
import { getPhase, onPhaseTick } from '../lib/currentPhase';

export type TopologyRenderer = (
  ctx: CanvasRenderingContext2D,
  phase: number,
  width: number,
  height: number,
  accent: string
) => void;

interface CurrentCanvasProps {
  accent: string;
  render: TopologyRenderer;
  opacity?: number;
  className?: string;
}

export function CurrentCanvas({ accent, render, opacity = 0.08, className = '' }: CurrentCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const MAX_DIM = 4096;
      const w = Math.min(canvas.offsetWidth, MAX_DIM);
      const h = Math.min(canvas.offsetHeight, MAX_DIM);
      if (w === 0 || h === 0) return;

      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      ctx.clearRect(0, 0, w, h);
      render(ctx, getPhase(), w, h, accent);
    } catch (e) {
      console.warn('[CurrentCanvas] render error:', e);
    }
  }, [render, accent]);

  useEffect(() => {
    const unsub = onPhaseTick(draw);
    draw();
    return unsub;
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ opacity, maxWidth: '100%', maxHeight: '100%' }}
    />
  );
}
