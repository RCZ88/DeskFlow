import { useState, useEffect } from 'react';

function FooterClock() {
  const [time, setTime] = useState(() => new Date());
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  const h = String(time.getHours()).padStart(2, '0');
  const m = String(time.getMinutes()).padStart(2, '0');
  const s = String(time.getSeconds()).padStart(2, '0');

  return (
    <span className="font-mono text-2xl tabular-nums text-amber tracking-wider">
      {h}:{m}:{s}
    </span>
  );
}

export function Footer() {
  return (
    <footer className="relative bg-bg border-t border-raised">
      {/* Wave SVG at top edge */}
      <div className="absolute top-0 left-0 right-0 h-16 overflow-hidden">
        <svg
          viewBox="0 0 1400 60"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <path
            d="M0,30 Q175,10 350,30 T700,30 T1050,30 T1400,30 L1400,0 L0,0 Z"
            fill="rgba(251,191,36,0.06)"
          />
        </svg>
      </div>

      <div className="max-w-[1200px] mx-auto px-8 py-16 flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Brand + Clock */}
        <div>
          <div className="text-text font-extrabold text-xl tracking-tight mb-1">RHEO</div>
          <div className="text-text-muted text-sm mb-3">Your time, visualized.</div>
          <FooterClock />
        </div>

        {/* Links */}
        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <a href="#features" className="text-text-secondary hover:text-amber transition-colors">Features</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-amber transition-colors">GitHub</a>
          <a href="#docs" className="text-text-secondary hover:text-amber transition-colors">Docs</a>
          <a href="#roadmap" className="text-text-secondary hover:text-amber transition-colors">Roadmap</a>
        </nav>

        {/* CTA + meta */}
        <div className="text-right">
          <button className="px-5 py-2.5 rounded-lg bg-amber text-[#1a1300] font-bold text-sm border-none cursor-pointer hover:bg-gold transition-colors mb-3">
            Download RHEO
          </button>
          <div className="text-text-muted text-xs font-mono">
            v1.0.0 · macOS 14+ · Windows 11 · Linux
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-raised px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-text-muted">
        <span>© 2026 RHEO. Open source under MIT.</span>
        <span>Your data never leaves your machine.</span>
      </div>
    </footer>
  );
}
