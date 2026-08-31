import { useEffect, useRef } from 'react';
import { createNoise2D } from 'simplex-noise';

// Logical weave field (matches the SVG / design coordinate space).
const W = 1400;
const H = 800;
const WARP_N = 24; // point-masses per warp rope
const WEFT_N = 40; // point-masses on the weft rope
const GRAVITY = 0.28;
const DAMPING = 0.94;
const STIFF = 0.92; // distance-constraint relaxation strength
const ITER = 6; // constraint iterations per frame

interface Point { x: number; y: number; ox: number; oy: number; }
interface Rope { pts: Point[]; ax: number; ay: number; bx: number; by: number; color: string; }

export interface LiveLoomCanvasProps {
  /** index of the currently-highlighted warp, or null / -1 / undefined for none */
  activeWarpIndex?: number | null;
  /** per-warp anchor stiffness 0..1 (1 = fully taut); empty/undefined = ambient */
  warpStiffness?: (number | null | undefined)[];
  /** weft tension multiplier (Shuttle: AI pulling toward a warp) */
  weftTension?: number;
  /** honor reduced motion (also auto-detected if omitted) */
  reducedMotion?: boolean;
  className?: string;
}

function makeRopePoints(ax: number, ay: number, bx: number, by: number, n: number, color: string): Rope {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    pts.push({ x, y, ox: x, oy: y });
  }
  return { pts, ax, ay, bx, by, color };
}

const WARPS_X = [100, 300, 500, 700, 900, 1100, 1300];

export function LiveLoomCanvas({ activeWarpIndex = -1, warpStiffness, weftTension = 0.6, reducedMotion = false, className }: LiveLoomCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ activeWarpIndex, warpStiffness, weftTension, reducedMotion });
  propsRef.current = { activeWarpIndex, warpStiffness, weftTension, reducedMotion };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const noise2D = createNoise2D();
    const ropes: Rope[] = WARPS_X.map((x, i) =>
      makeRopePoints(x, 40, x, 720, WARP_N, i % 2 === 0 ? '#fbbf24' : '#c2703d'),
    );
    const weft: Rope = makeRopePoints(0, H / 2, W, H / 2, WEFT_N, '#c2703d');
    const start = performance.now();
    let raf = 0;

    // Bulletproof sizing: read layout size (clientWidth/Height), never depend on a
    // first-paint race. Resyncs every frame if the element resized.
    const syncSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const toCanvas = (p: Point, cw: number, ch: number) => ({
      x: p.x * (cw / W),
      y: p.y * (ch / H),
    });

    const verlet = (rope: Rope, t: number, noiseAmp: number, anchorPull: number, gravityScale = 1) => {
      const pts = rope.pts;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const vx = (p.x - p.ox) * DAMPING;
        const vy = (p.y - p.oy) * DAMPING;
        p.ox = p.x;
        p.oy = p.y;
        // ambient simplex stir (continuous, never reset)
        const nx = noise2D(p.x * 0.004, t * 0.12 + i * 0.15);
        const ny = noise2D(p.y * 0.004 + 99, t * 0.12 + i * 0.15);
        p.x += vx + nx * noiseAmp;
        p.y += vy + ny * noiseAmp + GRAVITY * gravityScale;
      }
      // anchors
      pts[0].x = rope.ax; pts[0].y = rope.ay;
      pts[pts.length - 1].x = rope.bx; pts[pts.length - 1].y = rope.by;
      // stiffen endpoints when a warp is "taut"
      if (anchorPull > 0) {
        const k = anchorPull * 0.6;
        pts[1].x += (rope.ax - pts[1].x) * k;
        pts[1].y += (rope.ay - pts[1].y) * k;
        pts[pts.length - 2].x += (rope.bx - pts[pts.length - 2].x) * k;
        pts[pts.length - 2].y += (rope.by - pts[pts.length - 2].y) * k;
      }
      // distance constraints
      for (let it = 0; it < ITER; it++) {
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.0001;
          const rest = Math.hypot(rope.bx - rope.ax, rope.by - rope.ay) / (pts.length - 1);
          const diff = ((d - rest) / d) * STIFF * 0.5;
          const ox = dx * diff, oy = dy * diff;
          if (i !== 0) { a.x += ox; a.y += oy; }
          if (i + 1 !== pts.length - 1) { b.x -= ox; b.y -= oy; }
        }
        pts[0].x = rope.ax; pts[0].y = rope.ay;
        pts[pts.length - 1].x = rope.bx; pts[pts.length - 1].y = rope.by;
      }
    };

    const drawRope = (rope: Rope, cw: number, ch: number, glow: number, width: number, dim = 1) => {
      const sc = Math.min(cw / W, ch / H);
      const pts = rope.pts.map((p) => toCanvas(p, cw, ch));
      // 1) Outer bloom — wide, soft, additive-feel halo (the "premium" glow)
      if (glow > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.22 * dim;
        ctx.strokeStyle = rope.color;
        ctx.lineWidth = (width + glow * 0.5) * sc;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowBlur = glow * 1.6 * sc;
        ctx.shadowColor = rope.color;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.restore();
      }
      // 2) Mid glow pass
      ctx.save();
      ctx.globalAlpha = 0.5 * dim;
      ctx.strokeStyle = rope.color;
      ctx.lineWidth = width * sc;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (glow > 0) {
        ctx.shadowBlur = glow * sc;
        ctx.shadowColor = rope.color;
      }
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.restore();
      // 3) Bright core (crisp thread)
      ctx.save();
      ctx.globalAlpha = 0.95 * dim;
      ctx.strokeStyle = rope.color;
      ctx.lineWidth = Math.max(0.8, width * 0.55 * sc);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      // stitched dashes (embroidered feel)
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.4 * dim;
      ctx.lineWidth = Math.max(0.5, width * 0.3 * sc);
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    };

    // Lit stage: a soft radial glow behind the weave so the loom feels illuminated.
    const drawStage = (cw: number, ch: number, focusX: number) => {
      const g = ctx.createRadialGradient(
        focusX, ch * 0.5, 0,
        focusX, ch * 0.5, Math.max(cw, ch) * 0.7,
      );
      g.addColorStop(0, 'rgba(251,191,36,0.10)');
      g.addColorStop(0.4, 'rgba(194,112,61,0.05)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    };

    const draw = () => {
      syncSize();
      const cw = canvas.width, ch = canvas.height;
      if (cw < 2 || ch < 2) return;
      ctx.clearRect(0, 0, cw, ch);
      const { activeWarpIndex: aw, warpStiffness: ws, weftTension: wt } = propsRef.current;
      const focusX = aw != null && aw >= 0 && aw < WARPS_X.length
        ? (WARPS_X[aw] / W) * cw
        : cw * 0.5;
      drawStage(cw, ch, focusX);
      // base warps — ambient sway, active warp brightest + taut
      ropes.forEach((r, i) => {
        const isActive = i === aw;
        const stiff = ws && ws[i] != null ? Math.max(0, Math.min(1, ws[i] as number)) : 0;
        const lit = isActive || stiff > 0;
        const glow = isActive ? 40 : stiff > 0 ? 22 : 10;
        const width = isActive ? 3.2 : stiff > 0 ? 2.4 : 1.8;
        const dim = lit ? 1 : 0.78;
        drawRope(r, cw, ch, glow, width, dim);
      });
      // weft — physical pull toward the active warp when the shuttle acts
      let pullX = W / 2;
      if (aw != null && aw >= 0 && aw < WARPS_X.length) pullX = WARPS_X[aw];
      const k = (wt - 0.6) * 0.6;
      if (k > 0) weft.pts.forEach((p) => { p.x += (pullX - p.x) * k * 0.05; });
      drawRope(weft, cw, ch, wt > 1 ? 30 : 14, wt > 1 ? 2.8 : 1.8, 0.9);
    };

    // reduced motion: draw one settled frame, no loop
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = reducedMotion || mq.matches;

    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const { warpStiffness: ws } = propsRef.current;
      ropes.forEach((r, i) => {
        const stiff = ws && ws[i] != null ? Math.max(0, Math.min(1, ws[i] as number)) : 0;
        const noiseAmp = 1.1 + stiff * 0.5;
        const anchorPull = stiff;
        const gravityScale = 1 - stiff * 0.5; // taut rope hangs less
        verlet(r, t, noiseAmp, anchorPull, gravityScale);
      });
      verlet(weft, t, 0.4, 0, 1);
      draw();
      if (!reduced) raf = requestAnimationFrame(tick);
    };

    if (reduced) {
      // settle once then draw a static end-state
      for (let s = 0; s < 60; s++) {
        const t = s * 0.05;
        ropes.forEach((r) => verlet(r, t, 0.4, 0, 1));
        verlet(weft, t, 0.3, 0, 1);
      }
      draw();
    } else {
      raf = requestAnimationFrame(tick);
    }

    const ro = new ResizeObserver(() => syncSize());
    ro.observe(canvas);
    window.addEventListener('resize', syncSize);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', syncSize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block' }}
      aria-hidden="true"
    />
  );
}

export default LiveLoomCanvas;
