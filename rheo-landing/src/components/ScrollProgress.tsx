import { useEffect, useState } from 'react';

// Thin gradient progress bar pinned to the very top of the viewport,
// driven by native scroll position.
export function ScrollProgress() {
  const [p, setP] = useState(0);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 z-[100] h-[3px] w-full bg-transparent">
      <div
        className="h-full origin-left bg-gradient-to-r from-terracotta via-amber to-gold"
        style={{ transform: `scaleX(${p})`, transition: 'transform 0.1s linear' }}
      />
    </div>
  );
}
