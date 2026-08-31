import { useEffect, useRef } from 'react';

// Layered atmospheric background: gradient wash, drifting glow orbs,
// floating dust, film grain, and a vignette. All purely decorative and
// disabled under prefers-reduced-motion.
export function Atmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    const N = 40;
    const parts = Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.015,
      vy: (Math.random() - 0.5) * 0.015,
      a: 0.06 + Math.random() * 0.22,
    }));

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251,191,36,${p.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div aria-hidden className="atmosphere fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, rgba(251,191,36,0.10), transparent 60%), radial-gradient(90% 60% at 80% 110%, rgba(59,130,246,0.08), transparent 55%)',
        }}
      />
      <div
        className="absolute -left-32 top-1/4 h-[40vmax] w-[40vmax] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(251,191,36,0.10), transparent 70%)',
          filter: 'blur(40px)',
          animation: 'drift 24s var(--ease-premium) infinite',
        }}
      />
      <div
        className="absolute -right-40 bottom-0 h-[36vmax] w-[36vmax] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.10), transparent 70%)',
          filter: 'blur(40px)',
          animation: 'drift 30s var(--ease-premium) infinite reverse',
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-60" />
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </div>
  );
}
