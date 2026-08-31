import { useRef, useEffect, useState, useMemo } from 'react';
import { WARPS } from '../components/LoomSVG';
import { LiveLoomCanvas } from '../components/LiveLoomCanvas';

export function Fabric() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  const [canvasOpacity, setCanvasOpacity] = useState(1);
  const rafRef = useRef(0);

  // All 7 warp stiffnesses go to null (release) as we scroll through Fabric
  const warpStiffness = useMemo(() => {
    const p = scrollProgress;
    // Ease: start stiff at top of section, release to null by mid-scroll
    const release = Math.max(0, 1 - p * 2.5);
    return WARPS.map(() => release > 0 ? release : null);
  }, [scrollProgress]);

  // Weft tension decreases as the whole system goes slack
  const weftTension = useMemo(() => {
    return Math.max(0, 1.5 - scrollProgress * 3);
  }, [scrollProgress]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let running = true;
    const update = () => {
      if (!running) return;
      const rect = el.getBoundingClientRect();
      const distance = Math.max(1, el.offsetHeight - window.innerHeight);
      const p = Math.max(0, Math.min(1, -rect.top / distance));

      // Update state so useMemo recalculates warpStiffness/weftTension each frame.
      setScrollProgress(p);
      // Scroll-driven: zoom goes from 1x (full view) toward 0.3x (zoom out)
      // The grid visually recedes as you scroll — fabric pulling back
      setZoom(1 - p * 0.7);
      // Canvas fades as grid recedes
      setCanvasOpacity(Math.max(0, 1 - p * 2));
      // Text overlay fades IN at the end of the zoom-out
      setOverlayOpacity(Math.max(0, (p - 0.4) * 2.5));

      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);

    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[150vh] bg-bg overflow-hidden"
    >
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {/* Live loom simulation — all warps release tension, canvas zooms out */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `scale(${zoom})`,
            opacity: canvasOpacity,
            transition: 'none',
          }}
        >
          <LiveLoomCanvas
            warpStiffness={warpStiffness}
            weftTension={weftTension}
            reducedMotion={false}
            className="w-full h-full"
          />
        </div>

        {/* Text overlay — appears as the zoom-out completes */}
        <div
          className="relative z-10 text-center px-8"
          style={{
            opacity: overlayOpacity,
          }}
        >
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-display font-bold tracking-tight text-text mb-4">
            The fabric emerges.
          </h2>
          <p className="text-text-secondary max-w-[48ch] mx-auto text-lg">
            Fifteen subsystems. One thread running through all of them.
            The pattern was always there — you just couldn&apos;t see it until now.
          </p>
        </div>
      </div>
    </section>
  );
}
