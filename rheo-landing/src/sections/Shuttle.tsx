import { useRef, useEffect, useState } from 'react';
import { WARPS } from '../components/LoomSVG';
import { LiveLoomCanvas } from '../components/LiveLoomCanvas';

const SHUTTLE_CAPTIONS = [
  { warp: 'MONEY', tag: 'Finance', text: 'Flags a subscription you forgot.', alt: 'Money mascot' },
  { warp: 'LEARNING', tag: 'Learning', text: 'Drafts your next lesson.', alt: 'Learning mascot' },
  { warp: 'TERMINAL', tag: 'Terminal', text: 'Reads your terminal output.', alt: 'Terminal mascot' },
];

export function Shuttle() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeWarpIndex, setActiveWarpIndex] = useState<number | null>(null);
  const [weftTension, setWeftTension] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const distance = Math.max(1, el.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / distance));

      // Map progress to active warp index (WARPS array positions)
      // MONEY=1, LEARNING=3, TERMINAL=5 in WARPS
      const warpIndex = progress < 0.33 ? 1 : // MONEY
                        progress < 0.66 ? 3 :   // LEARNING
                        5;                        // TERMINAL

      setActiveWarpIndex(warpIndex);
      // Weft tension peaks when each caption is active, then eases
      const zone = Math.floor(progress * 3);
      const local = (progress * 3) - zone;
      const peakTension = Math.max(0, 1 - Math.abs(local - 0.5) * 4);
      setWeftTension(peakTension * 2);
      setVisible(progress > 0.05);
    };

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    requestAnimationFrame(update);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative min-h-[100vh] bg-bg">
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {/* Live loom simulation — weft pulls toward active warp */}
        <LiveLoomCanvas
          activeWarpIndex={activeWarpIndex}
          weftTension={weftTension}
          warpStiffness={activeWarpIndex !== null ? [null, null, null, null, null, null, null] : []}
          reducedMotion={false}
        />

        {/* Captions — text only, no icon+label pairing (that's Threads' job) */}
        {SHUTTLE_CAPTIONS.map((cap, i) => {
          const warp = WARPS.find(w => w.label === cap.warp);
          if (!warp) return null;
          const isActive = activeWarpIndex === i;
          const pctX = (warp.x / 1400) * 100;

          return (
            <div
              key={cap.warp}
              className="absolute bottom-12 group transition-all duration-500"
              style={{
                left: `${pctX}%`,
                opacity: visible && isActive ? 1 : 0,
                transform: visible && isActive
                  ? 'translateX(-50%) translateY(0)'
                  : 'translateX(-50%) translateY(20px)',
              }}
            >
              {/* Text alternative for screen readers — no visual icon here */}
              <span className="sr-only">{cap.alt}</span>
              <div className="bg-surface/80 backdrop-blur-md border border-amber/20 rounded-xl p-4 w-[240px] transition-all duration-300">
                <span className="block text-[0.65rem] tracking-[0.13em] text-amber uppercase mb-1.5 font-mono">
                  {cap.tag}
                </span>
                <p className="text-text text-sm leading-relaxed">
                  {cap.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}