interface MotionTemplate {
  id: string;
  name: string;
  framework: string;
  code: string;
  description: string;
}

const TEMPLATES: MotionTemplate[] = [
  {
    id: 'lenis-smooth-scroll',
    name: 'Lenis Smooth Scroll',
    framework: 'Lenis',
    description: 'Inertial smooth scrolling',
    code: `import { useEffect } from 'react';\nimport Lenis from 'lenis';\n\nexport function useSmoothScroll() {\n  useEffect(() => {\n    const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });\n    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }\n    requestAnimationFrame(raf);\n    return () => lenis.destroy();\n  }, []);\n}`,
  },
  {
    id: 'gsap-fade-in',
    name: 'GSAP Fade In',
    framework: 'GSAP',
    description: 'Fade and slide in on scroll',
    code: `import { useEffect, useRef } from 'react';\nimport gsap from 'gsap';\nimport { ScrollTrigger }ongs 'gsap/ScrollTrigger';\ngsap.registerPlugin(ScrollTrigger);\n\nexport function useGsapFadeIn() {\n  const ref = useRef(null);\n  useEffect(() => {\n    if (!ref.current) return;\n    gsap.fromTo(ref.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: ref.current, start: 'top 85%' } });\n    return () => ScrollTrigger.getAll().forEach(t => t.kill());\n  }, []);\n  return ref;\n}`,
  },
  {
    id: 'vanta-waves',
    name: 'Vanta Waves',
    framework: 'Vanta',
    description: 'Animated ocean waves background',
    code: `import { useEffect, useRef } from 'react';\nimport WAVES from 'vanta/dist/vanta.waves.min';\n\nexport function useVantaWaves() {\n  const ref = useRef(null);\n  const effect = useRef(null);\n  useEffect(() => {\n    if (!ref.current || effect.current) return;\n    effect.current = WAVES({ el: ref.current, mouseControls: true, color: 0x06b6d4, waveHeight: 20, waveSpeed: 0.7 });\n    return () => { effect.current?.destroy(); effect.current = null; };\n  }, []);\n  return ref;\n}`,
  },
  {
    id: 'vanta-birds',
    name: 'Vanta Birds',
    framework: 'Vanta',
    description: 'Animated flocking birds',
    code: `import { useEffect, useRef } from 'react';\nimport BIRDS from 'vanta/dist/vanta.birds.min';\n\nexport function useVantaBirds() {\n  const ref = useRef(null);\n  const effect = useRef(null);\n  useEffect(() => {\n    if (!ref.current || effect.current) return;\n    effect.current = BIRDS({ el: ref.current, backgroundColor: 0x09090b, color1: 0x06b6d4, color2: 0xd946ef });\n    return () => { effect.current?.destroy(); effect.current = null; };\n  }, []);\n  return ref;\n}`,
  },
  {
    id: 'vanta-fog',
    name: 'Vanta Fog',
    framework: 'Vanta',
    description: 'Animated fog/mist',
    code: `import { useEffect, useRef } from 'react';\nimport FOG from 'vanta/dist/vanta.fog.min';\n\nexport function useVantaFog() {\n  const ref = useRef(null);\n  const effect = useRef(null);\n  useEffect(() => {\n    if (!ref.current || effect.current) return;\n    effect.current = FOG({ el: ref.current, highlightColor: 0x06b6d4, baseColor: 0x09090b });\n    return () => { effect.current?.destroy(); effect.current = null; };\n  }, []);\n  return ref;\n}`,
  },
];

export function getMotionSetup(id: string): string {
  const template = TEMPLATES.find(t => t.id === id);
  if (!template) return JSON.stringify({ error: `Template "${id}" not found. Available: ${TEMPLATES.map(t => t.id).join(', ')}` });
  return JSON.stringify(template, null, 2);
}

export function listMotionTemplates(): string {
  return JSON.stringify(TEMPLATES.map(t => ({ id: t.id, name: t.name, framework: t.framework, description: t.description })), null, 2);
}
