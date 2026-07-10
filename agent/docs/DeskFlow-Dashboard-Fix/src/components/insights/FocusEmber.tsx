import { useEffect, useRef } from 'react';

interface FocusEmberProps {
  /** 0..1 focus progress toward the daily goal. Drives flame size/heat. */
  intensity: number;
  /** Deep Focus session active -> the ember roars regardless of goal progress. */
  boost?: boolean;
  /** Square canvas size in CSS px. */
  size?: number;
  className?: string;
}

/**
 * FocusEmber - the DeskFlow "Lock-In" signature element.
 *
 * Concept: your focus fuels the fire. A living emerald->amber flame that grows
 * as today's focus climbs toward the goal, roars during a Deep Focus session,
 * and settles to a cold ember at zero. Rendered behind the GoalRing so it
 * amplifies the focal point (Today's Focus) without touching usability.
 *
 * Motion-engineering rules honored:
 *  - Canvas additive blending; only transform/opacity conceptually (no layout).
 *  - dt-driven rAF loop, clamped, visibility-aware; IntersectionObserver gates it.
 *  - devicePixelRatio capped at 2; particle count capped and scaled by intensity.
 *  - prefers-reduced-motion -> single settled frame, no loop.
 */
export function FocusEmber({ intensity, boost = false, size = 100, className = '' }: FocusEmberProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(intensity);
  const boostRef = useRef(boost);
  intensityRef.current = intensity;
  boostRef.current = boost;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = size;
    const cssH = size;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.scale(dpr, dpr);

    const cx = cssW / 2;
    const baseY = cssH * 0.72; // emit from lower-center, inside the ring

    type P = { x: number; y: number; vx: number; vy: number; life: number; r: number };
    let particles: P[] = [];
    let smooth = 0; // eased intensity so changes glide instead of jump

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const effIntensity = () => {
      const raw = boostRef.current ? Math.max(intensityRef.current, 0.85) : intensityRef.current;
      return Math.max(0, Math.min(1, raw || 0));
    };

    const spawn = (i: number) => {
      const n = Math.round(1 + i * 5); // capped by intensity
      for (let k = 0; k < n; k++) {
        particles.push({
          x: cx + (Math.random() - 0.5) * (10 + i * 10),
          y: baseY,
          vx: (Math.random() - 0.5) * 14,
          vy: -(20 + Math.random() * 42) * (0.5 + i),
          life: 1,
          r: 3 + Math.random() * 7 * (0.5 + i),
        });
      }
    };

    const drawFlame = (i: number, dt: number) => {
      ctx.clearRect(0, 0, cssW, cssH);
      if (i > 0.02) spawn(i);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 22 * dt; // slight gravity so tall flames arc
        p.life -= dt * 1.3;
        const t = Math.max(p.life, 0);
        const rr = Math.max(p.r, 0.1);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        g.addColorStop(0.0, `rgba(209,250,229,${0.8 * t})`); // hot near-white mint core
        g.addColorStop(0.35, `rgba(52,211,153,${0.5 * t})`); // emerald-400 body
        g.addColorStop(0.75, `rgba(245,158,11,${0.28 * t})`); // amber-500 licks
        g.addColorStop(1.0, 'rgba(245,158,11,0)'); // transparent edge
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      particles = particles.filter((p) => p.life > 0 && p.y > -10);
      if (particles.length > 220) particles.splice(0, particles.length - 220); // hard perf cap
    };

    const drawEmber = () => {
      // zero / settled state: a single cool ember so absence still reads as "fire out"
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, 8);
      g.addColorStop(0, 'rgba(113,113,122,0.5)'); // zinc ember
      g.addColorStop(1, 'rgba(113,113,122,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, baseY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    };

    let raf = 0;
    let last = performance.now();
    let running = false;

    const frame = (now: number) => {
      const dt = Math.min(now - last, 32) / 1000; // clamp ~2 frames
      last = now;
      const target = effIntensity();
      smooth += (target - smooth) * Math.min(1, dt * 3);
      if (smooth < 0.02 && particles.length === 0) drawEmber();
      else drawFlame(smooth, dt);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onVis = () => {
      last = performance.now();
      if (document.hidden) stop();
      else if (!prefersReduced) start();
    };
    document.addEventListener('visibilitychange', onVis);

    if (prefersReduced) {
      // settled frame only: warm the flame to its resting size, no loop
      const i = effIntensity();
      if (i < 0.02) drawEmber();
      else {
        for (let s = 0; s < 40; s++) spawn(i);
        drawFlame(i, 0.4);
      }
      return () => {
        stop();
        document.removeEventListener('visibilitychange', onVis);
      };
    }

    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? start() : stop()),
      { threshold: 0.1 }
    );
    io.observe(canvas);

    return () => {
      io.disconnect();
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style= width: size, height: size 
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
