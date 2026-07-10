import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface ConstellationHeroProps {
  dates: string[];
  milestone?: number | null;
  children?: ReactNode;
  className?: string;
  height?: number;
}

const STAR_WARM = [
  [247, 243, 238],
  [240, 168, 146],
  [251, 191, 36],
  [232, 134, 107],
];

function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function shiftDate(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentStreakDates(sorted: string[]): string[] {
  if (sorted.length === 0) return [];
  const set = new Set(sorted);
  const out: string[] = [];
  let cursor = sorted[sorted.length - 1];
  while (set.has(cursor)) {
    out.unshift(cursor);
    cursor = shiftDate(cursor, -1);
  }
  return out;
}

interface Star {
  date: string;
  x: number;
  y: number;
  base: number;
  amp: number;
  phase: number;
  speed: number;
  size: number;
  color: number[];
  inStreak: boolean;
}

export function ConstellationHero({ dates, milestone, children, className = '', height = 172 }: ConstellationHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; date: string } | null>(null);

  const stars = useMemo<Star[]>(() => {
    const sorted = [...new Set(dates)].sort();
    const streakSet = new Set(currentStreakDates(sorted));
    const n = sorted.length;
    return sorted.map((date, i) => {
      const hx = hash01(date + 'x');
      const hy = hash01(date + 'y');
      const hs = hash01(date + 's');
      const x = n <= 1 ? 0.5 : 0.06 + (i / (n - 1)) * 0.88 + (hx - 0.5) * 0.05;
      const y = 0.16 + hy * 0.68;
      return {
        date,
        x: Math.max(0.03, Math.min(0.97, x)),
        y,
        base: 0.45 + hs * 0.4,
        amp: 0.15 + hash01(date + 'a') * 0.25,
        phase: hash01(date + 'p') * Math.PI * 2,
        speed: 0.6 + hash01(date + 'v') * 0.8,
        size: 1.1 + hs * 1.9,
        color: STAR_WARM[Math.floor(hash01(date + 'c') * STAR_WARM.length)],
        inStreak: streakSet.has(date),
      };
    });
  }, [dates]);

  const starsRef = useRef<Star[]>(stars);
  starsRef.current = stars;
  const screenPosRef = useRef<Array<{ sx: number; sy: number; date: string }>>([]);
  const milestoneRef = useRef<number | null | undefined>(milestone);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    interface Shooting { x: number; y: number; vx: number; vy: number; life: number; }
    let shooting: Shooting | null = null;
    const spawnShooting = () => {
      shooting = { x: w * 0.15, y: h * 0.2, vx: w * 0.55, vy: h * 0.28, life: 1 };
    };

    const drawStar = (s: Star, alpha: number) => {
      const px = s.x * w;
      const py = s.y * h;
      const [r, g, b] = s.color;
      const glow = ctx.createRadialGradient(px, py, 0, px, py, s.size * 4);
      glow.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      glow.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.35})`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, s.size * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, alpha + 0.2)})`;
      ctx.beginPath();
      ctx.arc(px, py, s.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawThread = () => {
      const streak = starsRef.current.filter(s => s.inStreak);
      if (streak.length < 2) return;
      ctx.strokeStyle = 'rgba(240,168,146,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      streak.forEach((s, i) => {
        const px = s.x * w, py = s.y * h;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
    };

    const render = (time: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      drawThread();
      const positions: Array<{ sx: number; sy: number; date: string }> = [];
      for (const s of starsRef.current) {
        const tw = prefersReduced ? 0 : Math.sin(time * 0.001 * s.speed + s.phase) * s.amp;
        drawStar(s, Math.max(0.1, s.base + tw));
        positions.push({ sx: s.x * w, sy: s.y * h, date: s.date });
      }
      screenPosRef.current = positions;
      if (shooting) {
        const st = shooting;
        const tailX = st.x - st.vx * 0.06;
        const tailY = st.y - st.vy * 0.06;
        const grad = ctx.createLinearGradient(tailX, tailY, st.x, st.y);
        grad.addColorStop(0, 'rgba(247,243,238,0)');
        grad.addColorStop(1, `rgba(247,243,238,${st.life})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(st.x, st.y);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    if (prefersReduced) {
      render(0);
      const onResize = () => { resize(); render(0); };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    let rafId = 0;
    let last = performance.now();
    let running = false;
    const frame = (now: number) => {
      const dt = Math.min(now - last, 32) / 1000;
      last = now;
      if (shooting) {
        shooting.x += shooting.vx * dt;
        shooting.y += shooting.vy * dt;
        shooting.life -= dt * 0.9;
        if (shooting.life <= 0) shooting = null;
      }
      render(now);
      rafId = requestAnimationFrame(frame);
    };
    const start = () => { if (!running) { running = true; last = performance.now(); rafId = requestAnimationFrame(frame); } };
    const stop = () => { running = false; cancelAnimationFrame(rafId); };

    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.05 });
    io.observe(wrap);
    const onVis = () => { last = performance.now(); };
    document.addEventListener('visibilitychange', onVis);
    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    (wrap as any).__spawnShooting = spawnShooting;

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
    };
  }, [stars.length]);

  useEffect(() => {
    if (milestone && milestone !== milestoneRef.current) {
      (wrapRef.current as any)?.__spawnShooting?.();
    }
    milestoneRef.current = milestone;
  }, [milestone]);

  const onMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let nearest: { sx: number; sy: number; date: string } | null = null;
    let best = 18 * 18;
    for (const p of screenPosRef.current) {
      const d2 = (p.sx - mx) ** 2 + (p.sy - my) ** 2;
      if (d2 < best) { best = d2; nearest = p; }
    }
    setHover(nearest ? { x: mx, y: my, date: nearest.date } : null);
  };

  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden rounded-xl border border-[#e8866b]/20 bg-gradient-to-b from-[#1a1512] to-[#0f0c0b] ${className}`}
      style={{ height }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="relative z-10 h-full">{children}</div>
      {hover && (
        <div
          className="pointer-events-none absolute z-20 px-2 py-1 rounded-md bg-zinc-950/90 border border-zinc-700/60 text-[10px] text-zinc-200 whitespace-nowrap"
          style={{ left: Math.min(hover.x + 12, 240), top: Math.max(hover.y - 8, 4) }}
        >
          {fmtDate(hover.date)} · practiced
        </div>
      )}
    </div>
  );
}
