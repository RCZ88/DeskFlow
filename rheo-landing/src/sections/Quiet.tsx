import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function Quiet() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: 'top 70%',
        onEnter: () => setVisible(true),
      },
    });

    return () => { tl.kill(); };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[90vh] flex flex-col items-center justify-center bg-bg px-8"
    >
      {/* Subtle vertical line accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-[15%] top-0 bottom-0 w-px bg-amber/10" />
        <div className="absolute right-[15%] top-0 bottom-0 w-px bg-terracotta/10" />
      </div>

      <div
        className="relative z-10 max-w-[900px] text-center transition-all duration-1000 delay-200"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(40px)',
        }}
      >
        <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-extrabold tracking-tight leading-[1.05] text-text mb-8">
          Nothing on this page<br />
          has phoned home.<br />
          Neither will the app.
        </h2>
        <p className="text-text-muted font-mono text-sm tracking-wider">
          {new Date().toISOString().split('T')[0]} — no requests sent.
        </p>
      </div>
    </section>
  );
}
