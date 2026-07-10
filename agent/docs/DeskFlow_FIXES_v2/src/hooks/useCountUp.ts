import { useState, useEffect, useRef } from 'react';

export function useCountUp(end: number, duration = 400, enabled = true) {
  const [value, setValue] = useState(enabled ? 0 : end);
  const prevEndRef = useRef(end);

  useEffect(() => {
    if (!enabled) { setValue(end); return; }
    const start = prevEndRef.current;
    const delta = end - start;
    if (Math.abs(delta) < 1) { setValue(end); return; }
    const startTime = performance.now();

    let rafId: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + delta * eased));
      if (progress < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    prevEndRef.current = end;
    return () => cancelAnimationFrame(rafId);
  }, [end, duration, enabled]);

  return value;
}
