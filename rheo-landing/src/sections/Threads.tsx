import { useRef, useEffect, useState, useMemo } from 'react';
import { LiveLoomCanvas } from '../components/LiveLoomCanvas';

const THREADS = [
  { label: 'TIME', desc: 'Tracks every app, every website, every minute.', x: 100 },
  { label: 'MONEY', desc: 'Wallets, subscriptions, income, expenses — all in one view.', x: 300 },
  { label: 'FOCUS', desc: 'Strict timer with app blocking, daily goals, and streaks.', x: 500 },
  { label: 'LEARNING', desc: 'Hierarchical lessons with AI-powered mastery levels.', x: 700 },
  { label: 'CHAT', desc: 'Multi-provider AI that knows your entire local context.', x: 900 },
  { label: 'TERMINAL', desc: 'Multi-pane terminal with AI agents that read your codebase.', x: 1100 },
  { label: 'TIMELINE', desc: 'Visual phases of your life — past, present, and emerging.', x: 1300 },
];

export function Threads() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const warpStiffness = useMemo(() => {
    const arr: (number | null)[] = new Array(7).fill(null);
    for (let i = 0; i <= activeIndex; i++) {
      arr[i] = i === activeIndex ? 1 : 0.5;
    }
    return arr;
  }, [activeIndex]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const distance = Math.max(1, el.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / distance));
      const idx = Math.floor(progress * THREADS.length);
      setActiveIndex(Math.min(idx, THREADS.length - 1));
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
    <section
      ref={sectionRef}
      className="relative min-h-[200vh] bg-bg"
    >
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {/* Live verlet rope simulation — continuous, never resets */}
        <LiveLoomCanvas
          activeWarpIndex={activeIndex >= 0 ? activeIndex : null}
          weftTension={activeIndex >= 0 ? 1 : 0}
          warpStiffness={warpStiffness}
          reducedMotion={false}
        />

        {/* Labels overlaid on top of canvas */}
        <div className="absolute inset-0 pointer-events-none">
          {THREADS.map((thread, i) => {
            const isActive = i <= activeIndex;
            const isCurrent = i === activeIndex;
            return (
              <div
                key={thread.label}
                className="absolute flex flex-col items-center pointer-events-none transition-all duration-500"
                style={{
                  left: `${(thread.x / 1400) * 100}%`,
                  top: '752px',
                  transform: 'translateX(-50%)',
                  opacity: isActive ? 1 : 0.15,
                }}
              >
                <span
                  className="text-[12px] font-mono tracking-[2.5px] uppercase transition-colors duration-300"
                  style={{
                    color: isCurrent ? '#fbbf24' : (isActive ? '#fbbf24' : 'var(--color-text-secondary)'),
                    fontSize: isCurrent ? '14px' : '12px',
                  }}
                >
                  {thread.label}
                </span>
                {/* Mascot patch — fades in when this thread becomes active */}
                {isCurrent && (
                  <img
                    src={`/assets/mascots/mascot-${thread.label === 'FOCUS' ? 'time' : thread.label.toLowerCase()}.png`}
                    alt={`${thread.label} mascot`}
                    width={56}
                    height={56}
                    className="mt-2 rounded transition-all duration-500"
                    style={{
                      opacity: 1,
                      filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.3))',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Copy overlay — appears beside active thread */}
        {activeIndex >= 0 && activeIndex < THREADS.length && (
          <div
            className="relative z-10 max-w-[340px] px-8 transition-all duration-500"
            style={{
              marginLeft: `${(THREADS[activeIndex].x / 1400) * 100}%`,
              transform: 'translateX(-50%)',
              marginTop: '25vh',
            }}
          >
            <div className="bg-surface/80 backdrop-blur-md border border-amber/20 rounded-xl p-5">
              <span className="block text-[0.65rem] tracking-[0.13em] text-amber uppercase mb-2 font-mono">
                {THREADS[activeIndex].label}
              </span>
              <p className="text-text text-sm leading-relaxed">
                {THREADS[activeIndex].desc}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}