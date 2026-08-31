import { useState, useEffect } from 'react';

/**
 * Fixed right-edge vertical spine with 24h day-ruler ticks.
 * Playhead follows scroll progress. Live readout shows current time.
 * Reduced motion: static line with playhead at current time position.
 */
export function RheoLineSpine() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reducedMotion) return;
    const update = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH > 0) {
        setScrollProgress(Math.min(1, window.scrollY / docH));
      }
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Playhead Y position: scroll progress maps to the spine height
  const playheadY = scrollProgress * 100;

  // Day ruler: 24 ticks, one per hour
  const ticks = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    y: (i / 23) * 100,
    label: i % 6 === 0 ? `${String(i).padStart(2, '0')}` : null,
  }));

  return (
    <div
      className="fixed right-6 top-0 bottom-0 z-[150] pointer-events-none hidden lg:block"
      style={{ width: 48 }}
      aria-hidden="true"
    >
      {/* Spine line */}
      <div
        className="absolute right-[11px] top-[10vh] bottom-[10vh] w-px"
        style={{ background: 'rgba(161,161,170,0.3)' }}
      />

      {/* Day ruler ticks */}
      {ticks.map((tick) => (
        <div
          key={tick.hour}
          className="absolute right-[7px] flex items-center gap-1.5"
          style={{ top: `calc(10vh + ${tick.y}% * 0.8)` }}
        >
          {/* Tick mark */}
          <div
            className="w-[8px] h-px"
            style={{
              background: tick.label
                ? 'rgba(251,191,36,0.5)'
                : 'rgba(161,161,170,0.25)',
            }}
          />
          {/* Hour label (only every 6h) */}
          {tick.label && (
            <span
              className="text-[9px] font-mono tabular-nums"
              style={{ color: 'rgba(161,161,170,0.5)' }}
            >
              {tick.label}
            </span>
          )}
        </div>
      ))}

      {/* Playhead */}
      <div
        className="absolute right-[8px] transition-all"
        style={{
          top: `calc(10vh + ${playheadY * 0.8}%)`,
          transition: reducedMotion ? 'none' : 'top 0.15s ease-out',
        }}
      >
        {/* Dot */}
        <div
          className="w-[8px] h-[8px] rounded-full -ml-[3px] -mt-[3px]"
          style={{
            background: '#fbbf24',
            boxShadow: '0 0 8px rgba(251,191,36,0.6)',
          }}
        />
        {/* Readout */}
        <div
          className="absolute right-4 top-1/2 -translate-y-1/2 whitespace-nowrap"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: '#fbbf24',
            letterSpacing: '0.05em',
            opacity: 0.8,
          }}
        >
          {timeStr}
        </div>
      </div>
    </div>
  );
}
