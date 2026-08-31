import { useRef, useEffect, useState, useMemo } from 'react';
import { WARPS } from '../components/LoomSVG';
import { ASCIIFlowField } from '../components/ASCIIFlowField';

const CAPTIONS = [
  { warp: 'MONEY', tag: 'Finance', text: 'Flags a subscription you forgot.' },
  { warp: 'LEARNING', tag: 'Learning', text: 'Drafts your next lesson.' },
  { warp: 'TERMINAL', tag: 'Terminal', text: 'Reads your terminal output.' },
];

const WEFT_Y = 380;
const AMP = 26;
const FREQ = 2.6;
const SVG_W = 1400;

function weftAtX(x: number): number {
  return WEFT_Y + AMP * Math.sin((x / SVG_W) * Math.PI * FREQ);
}

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);
  const [activeCaption, setActiveCaption] = useState<number | null>(null);

  const captionDots = useMemo(() => {
    return CAPTIONS.map(cap => {
      const warp = WARPS.find(w => w.label === cap.warp);
      if (!warp) return null;
      const dotY = weftAtX(warp.x);
      return { x: warp.x, y: dotY, pctX: (warp.x / SVG_W) * 100 };
    }).filter(Boolean);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 300);

    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      const distance = Math.max(1, el.offsetHeight - window.innerHeight);
      const p = Math.max(0, Math.min(1, (window.scrollY - el.offsetTop) / distance));

      if (p < 0.34) {
        setActiveCaption(null);
      } else if (p < 0.9) {
        const shuttleProgress = (p - 0.34) / 0.56;
        if (shuttleProgress < 0.33) {
          setActiveCaption(0);
        } else if (shuttleProgress < 0.66) {
          setActiveCaption(1);
        } else {
          setActiveCaption(2);
        }
      } else {
        setActiveCaption(null);
      }
    };

    let raf = 0;
    const loop = () => { update(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', update);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-[420vh]">
      <div
        ref={stageRef}
        className="sticky top-0 relative w-full h-screen flex items-center justify-center overflow-hidden"
      >
        {/* ASCII flow field — runs untouched by scroll at Hero */}
        <ASCIIFlowField className="absolute inset-0 w-full h-full" />

        {/* Hero copy - centered, fades in on mount */}
        <div
          className="relative z-10 text-center max-w-[800px] px-8 transition-all duration-700"
          style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(16px)',
          }}
        >
          <h1 className="text-[clamp(3rem,8vw,6rem)] font-display font-bold tracking-[-0.03em] leading-[0.95] mb-6 text-text [text-shadow:0_0_38px_rgba(251,191,36,0.35),0_0_12px_rgba(251,191,36,0.25)] [font-optical-sizing:auto]">
            One shuttle.<br />Every thread.
          </h1>
          <p className="text-[clamp(1rem,2vw,1.25rem)] text-text-secondary max-w-[50ch] mx-auto">
            AI doesn&apos;t sit in a chat window. It runs through everything you track.
          </p>
          <span className="block mt-12 text-[0.72rem] tracking-[0.18em] text-text-muted uppercase font-mono">
            Scroll ↓
          </span>
        </div>

        {/* Connector lines SVG overlay */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-15"
          viewBox="0 0 1400 800"
          preserveAspectRatio="xMidYMid slice"
        >
          {captionDots.map((dot, i) => {
            if (!dot) return null;
            const captionTop = 800 * 0.62;
            return (
              <line
                key={`conn-${i}`}
                x1={dot.x}
                y1={dot.y}
                x2={dot.x}
                y2={captionTop}
                stroke="#fbbf24"
                strokeWidth={0.8}
                strokeOpacity={activeCaption === i ? 0.5 : 0}
                strokeDasharray="4 3"
                style={{ transition: 'stroke-opacity 0.3s' }}
              />
            );
          })}
        </svg>

        {/* Caption boxes */}
        {CAPTIONS.map((cap, i) => {
          const dot = captionDots[i];
          if (!dot) return null;
          return (
            <div
              key={cap.warp}
              className="absolute z-20 w-[220px] bg-surface/80 backdrop-blur-md border border-amber/20 rounded-xl p-4 text-sm text-text transition-opacity duration-300 pointer-events-none"
              style={{
                left: `${dot.pctX}%`,
                top: '62%',
                transform: 'translateX(-50%)',
                opacity: activeCaption === i ? 1 : 0,
              }}
            >
              <span className="block text-[0.65rem] tracking-[0.13em] text-terracotta uppercase mb-1.5 font-mono">
                {cap.tag}
              </span>
              {cap.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
