import { useRef, useEffect, useCallback } from 'react';

const RAMP = ' .·:;+=×#@';
const CELL_PX = 12;
const REPULSOR_RADIUS = 90;
const SPRING_TAU = 1.2; // seconds
const BASE_ENERGY = 0.15;
const SCROLL_MULTIPLIER = 0.9;
const MAX_DESKTOP_GLYPHS = 1500;
const MAX_MOBILE_GLYPHS = 500;
const DPR_CAP = 1.5;

interface ASCIIFlowFieldProps {
  className?: string;
}

export function ASCIIFlowField({ className = '' }: ASCIIFlowFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    cols: 0,
    rows: 0,
    grid: [] as number[],       // energy per cell 0-1
    velocity: 0,
    lastScroll: 0,
    lastTime: 0,
    mouseX: -9999,
    mouseY: -9999,
    pointerActive: false,
    energyDecay: 0,             // spring accumulator
    isVisible: true,
    raf: 0,
    reducedMotion: false,
    maxGlyphs: MAX_DESKTOP_GLYPHS,
  });

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const initGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    s.cols = Math.floor(rect.width / CELL_PX);
    s.rows = Math.floor(rect.height / CELL_PX);
    s.maxGlyphs = window.innerWidth < 768 ? MAX_MOBILE_GLYPHS : MAX_DESKTOP_GLYPHS;

    const total = s.cols * s.rows;
    s.grid = new Array(total);
    // Seed with noise
    for (let i = 0; i < total; i++) {
      s.grid[i] = Math.random() * 0.3;
    }
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    s.reducedMotion = reducedMotion;

    // IntersectionObserver — pause when offscreen
    const observer = new IntersectionObserver(
      ([entry]) => { s.isVisible = entry.isIntersecting; },
      { threshold: 0 }
    );
    observer.observe(canvas);

    // Pointer tracking
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      s.mouseX = e.clientX - rect.left;
      s.mouseY = e.clientY - rect.top;
      s.pointerActive = true;
    };
    const onLeave = () => { s.pointerActive = false; };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    // Scroll velocity
    const onScroll = () => {
      const now = performance.now();
      const dt = (now - s.lastTime) / 1000;
      if (dt > 0) {
        s.velocity = Math.abs(window.scrollY - s.lastScroll) / dt;
        s.lastScroll = window.scrollY;
        s.lastTime = now;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    s.lastScroll = window.scrollY;
    s.lastTime = performance.now();

    initGrid();

    const resizeObs = new ResizeObserver(() => initGrid());
    resizeObs.observe(canvas.parentElement || document.body);

    return () => {
      observer.disconnect();
      resizeObs.disconnect();
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(s.raf);
    };
  }, [initGrid, reducedMotion]);

  // Animation loop
  useEffect(() => {
    if (reducedMotion) return;
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = (now: number) => {
      s.raf = requestAnimationFrame(tick);
      if (!s.isVisible) return;

      const dt = Math.min((now - (s.lastTime || now)) / 1000, 0.05);
      s.lastTime = now;

      // Spring energy decay when scrolling stops
      const scrollEnergy = Math.min(1, s.velocity * SCROLL_MULTIPLIER / 800);
      s.velocity *= 0.92; // decay velocity

      // Spring recovery: energy decays toward base with tau ~1.2s
      const targetEnergy = BASE_ENERGY + scrollEnergy;
      const alpha = 1 - Math.exp(-dt / SPRING_TAU);
      s.energyDecay += (targetEnergy - s.energyDecay) * alpha;

      const energy = s.energyDecay;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Update grid
      const total = s.cols * s.rows;
      for (let i = 0; i < total; i++) {
        const col = i % s.cols;
        const row = Math.floor(i / s.cols);
        const cx = col * CELL_PX + CELL_PX / 2;
        const cy = row * CELL_PX + CELL_PX / 2;

        // Base noise drift
        let val = s.grid[i] + (Math.random() - 0.5) * 0.08;

        // Pointer repulsor
        if (s.pointerActive) {
          const dx = cx - s.mouseX;
          const dy = cy - s.mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < REPULSOR_RADIUS) {
            const falloff = 1 - dist / REPULSOR_RADIUS;
            val -= falloff * 0.6;
          }
        }

        // Energy modulation
        val = val * (0.4 + energy * 0.6);

        s.grid[i] = Math.max(0, Math.min(1, val));
      }

      // Batched render: group by brightness level
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${CELL_PX}px 'JetBrains Mono', monospace`;
      ctx.textBaseline = 'top';

      const levelBuckets: { chars: string[]; x: number[]; y: number[] }[] = [];
      for (let l = 0; l < RAMP.length; l++) {
        levelBuckets.push({ chars: [], x: [], y: [] });
      }

      for (let i = 0; i < total; i++) {
        const val = s.grid[i];
        const level = Math.min(RAMP.length - 1, Math.floor(val * RAMP.length));
        if (level === 0) continue; // skip empty

        const col = i % s.cols;
        const row = Math.floor(i / s.cols);
        const ch = RAMP[Math.min(level, RAMP.length - 1)] || RAMP[1];

        levelBuckets[level].chars.push(ch);
        levelBuckets[level].x.push(col * CELL_PX);
        levelBuckets[level].y.push(row * CELL_PX);
      }

      // Draw each brightness level in one batch
      for (let l = 1; l < RAMP.length; l++) {
        const bucket = levelBuckets[l];
        if (bucket.chars.length === 0) continue;
        const brightness = l / (RAMP.length - 1);
        const alpha = 0.15 + brightness * 0.65;
        ctx.fillStyle = `rgba(251, 191, 36, ${alpha.toFixed(2)})`;
        for (let i = 0; i < bucket.chars.length; i++) {
          ctx.fillText(bucket.chars[i], bucket.x[i], bucket.y[i]);
        }
      }
    };

    s.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(s.raf);
  }, [reducedMotion]);

  // Reduced-motion: draw static noise once on mount
  useEffect(() => {
    if (!reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cols = Math.floor(rect.width / CELL_PX);
    const rows = Math.floor(rect.height / CELL_PX);
    const maxGlyphs = window.innerWidth < 768 ? MAX_MOBILE_GLYPHS : MAX_DESKTOP_GLYPHS;
    const total = cols * rows;
    const limit = Math.min(total, maxGlyphs);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.font = `${CELL_PX}px 'JetBrains Mono', monospace`;
    ctx.textBaseline = 'top';

    for (let i = 0; i < limit; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const level = Math.floor(Math.random() * RAMP.length);
      if (level === 0) continue;
      const ch = RAMP[level];
      const brightness = level / (RAMP.length - 1);
      const a = 0.15 + brightness * 0.65;
      ctx.fillStyle = `rgba(251, 191, 36, ${a.toFixed(2)})`;
      ctx.fillText(ch, col * CELL_PX, row * CELL_PX);
    }
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <div className={className}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.4 }}
        />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
    />
  );
}
