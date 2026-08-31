import { useEffect, useRef } from 'react';

// Custom cursor: a small amber dot that tracks the pointer 1:1 and a
// trailing ring that eases behind it and swells over interactive elements.
// Only active on fine pointers with motion enabled.
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let rx = 0;
    let ry = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    const move = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px)`;
      const target = e.target as HTMLElement | null;
      const interactive = target?.closest('a,button,[role="button"]');
      ring.classList.toggle('rheo-cursor--active', !!interactive);
    };

    let raf = 0;
    const loop = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', move);
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="rheo-cursor-ring" aria-hidden />
      <div ref={dotRef} className="rheo-cursor-dot" aria-hidden />
    </>
  );
}
