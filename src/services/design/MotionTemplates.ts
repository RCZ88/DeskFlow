export interface MotionTemplate {
  id: string;
  name: string;
  framework: 'GSAP' | 'Lenis' | 'Vanta';
  code: string;
  description: string;
}

const TEMPLATES: MotionTemplate[] = [
  {
    id: 'lenis-smooth-scroll',
    name: 'Lenis Smooth Scroll',
    framework: 'Lenis',
    description: 'Inertial smooth scrolling with Lenis. Add to your root layout component.',
    code: `import { useEffect } from 'react';
import Lenis from 'lenis';

export function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);
}
`,
  },
  {
    id: 'gsap-fade-in',
    name: 'GSAP Fade In On Scroll',
    framework: 'GSAP',
    description: 'Fade and slide elements in as they scroll into view.',
    code: `import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useGsapFadeIn<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    gsap.fromTo(el,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );

    return () => { ScrollTrigger.getAll().forEach(t => t.kill()); };
  }, []);

  return ref;
}
`,
  },
  {
    id: 'gsap-stagger-children',
    name: 'GSAP Stagger Children',
    framework: 'GSAP',
    description: 'Stagger-animate a list of children elements on mount.',
    code: `import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function useGsapStagger<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const children = containerRef.current.children;
    if (!children.length) return;

    gsap.fromTo(children,
      { opacity: 0, y: 20, scale: 0.95 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
      }
    );
  }, []);

  return containerRef;
}
`,
  },
  {
    id: 'vanta-waves',
    name: 'Vanta.js Waves',
    framework: 'Vanta',
    description: 'Animated ocean waves background using Three.js + Vanta.',
    code: `import { useEffect, useRef } from 'react';
import WAVES from 'vanta/dist/vanta.waves.min';

export function useVantaWaves() {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || effectRef.current) return;

    effectRef.current = WAVES({
      el: containerRef.current,
      mouseControls: true,
      touchControls: true,
      color: 0x06b6d4,
      shininess: 30,
      waveHeight: 20,
      waveSpeed: 0.7,
      zoom: 0.8,
    });

    return () => {
      if (effectRef.current) {
        effectRef.current.destroy();
        effectRef.current = null;
      }
    };
  }, []);

  return containerRef;
}
`,
  },
  {
    id: 'vanta-birds',
    name: 'Vanta.js Birds',
    framework: 'Vanta',
    description: 'Animated flocking birds background.',
    code: `import { useEffect, useRef } from 'react';
import BIRDS from 'vanta/dist/vanta.birds.min';

export function useVantaBirds() {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || effectRef.current) return;

    effectRef.current = BIRDS({
      el: containerRef.current,
      mouseControls: true,
      touchControls: true,
      backgroundColor: 0x09090b,
      color1: 0x06b6d4,
      color2: 0xd946ef,
      colorMode: 'variance',
      birdSize: 1.5,
      wingSpan: 30,
      speedLimit: 4,
      separation: 50,
      alignment: 50,
      cohesion: 50,
    });

    return () => {
      if (effectRef.current) {
        effectRef.current.destroy();
        effectRef.current = null;
      }
    };
  }, []);

  return containerRef;
}
`,
  },
  {
    id: 'vanta-fog',
    name: 'Vanta.js Fog',
    framework: 'Vanta',
    description: 'Animated fog/mist background effect.',
    code: `import { useEffect, useRef } from 'react';
import FOG from 'vanta/dist/vanta.fog.min';

export function useVantaFog() {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || effectRef.current) return;

    effectRef.current = FOG({
      el: containerRef.current,
      mouseControls: true,
      touchControls: true,
      highlightColor: 0x06b6d4,
      midtoneColor: 0x09090b,
      lowlightColor: 0x18181b,
      baseColor: 0x09090b,
      speed: 1.2,
      zoom: 0.8,
    });

    return () => {
      if (effectRef.current) {
        effectRef.current.destroy();
        effectRef.current = null;
      }
    };
  }, []);

  return containerRef;
}
`,
  },
  {
    id: 'gsap-text-reveal',
    name: 'GSAP Text Reveal',
    framework: 'GSAP',
    description: 'Character-by-character text reveal animation.',
    code: `import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function useGsapTextReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return;
    const text = ref.current.textContent || '';
    ref.current.textContent = '';

    [...text].forEach((char) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\\u00A0' : char;
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      ref.current!.appendChild(span);
    });

    gsap.to(ref.current.children, {
      opacity: 1,
      y: 0,
      duration: 0.4,
      stagger: 0.02,
      ease: 'power2.out',
    });
  }, []);

  return ref;
}
`,
  },
  {
    id: 'gsap-parallax',
    name: 'GSAP Parallax Scroll',
    framework: 'GSAP',
    description: 'Parallax scrolling effect on scroll.',
    code: `import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useGsapParallax(speed: number = 0.5) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    gsap.to(el, {
      y: () => speed * 100,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    return () => { ScrollTrigger.getAll().forEach(t => t.kill()); };
  }, [speed]);

  return ref;
}
`,
  },
];

export function getTemplate(id: string): MotionTemplate | undefined {
  return TEMPLATES.find(t => t.id === id);
}

export function listTemplates(): MotionTemplate[] {
  return [...TEMPLATES];
}

export function getTemplatesByFramework(framework: MotionTemplate['framework']): MotionTemplate[] {
  return TEMPLATES.filter(t => t.framework === framework);
}
