# CONTEXT_BUNDLE.md — RHEO Landing Page 3-Section Redundancy Fix

> Source-of-truth reference for the target AI. This file is self-contained: the
> receiving AI designs the solution from THIS, not from the codebase.
> Project: `rheo-landing/` — a standalone React 19 + Vite + Tailwind v4 app
> (NOT part of the Electron App Tracker build; it has its own `package.json`).

## 1. The Problem (verified from source)

The landing page introduces its subsystems **three times** with overlapping content:

| Section | File | What it shows | Lines |
|---------|------|---------------|-------|
| **Hero** | `src/sections/Hero.tsx` | 3 caption boxes (MONEY / LEARNING / TERMINAL) appear during scroll, each with tag + one-liner + connector line to the loom | 5-9, 118-165 |
| **Threads** | `src/sections/Threads.tsx` | ALL 7 warps individually highlighted: label (mono, amber when active) + mascot + desc card, one per scroll zone | 4-12, 64-125 |
| **Shuttle** | `src/sections/Shuttle.tsx` | SAME 3 captions (MONEY / LEARNING / TERMINAL) again — identical tag + text, bottom-anchored | 5-9, 62-93 |
| **ModuleStore** | `src/sections/ModuleStore.tsx` | Grid of all 12 subsystems (mascot + label + desc) | 1-14, 27-87 |

**The redundancy:** Hero captions and Shuttle captions are the *exact same 3 subsystems*
with the *exact same copy*. Threads then re-shows MONEY/LEARNING/TERMINAL inside the
all-7 pass. So a visitor sees MONEY/LEARNING/TERMINAL introduced in Hero, again in
Shuttle, and again inside Threads — three "feature showcase" moments with no distinct job.

**Section order in `App.tsx` (lines 38-58):**
```
<Hero />        (h-[420vh], sticky stage)
<Threads />     (min-h-[200vh], sticky stage)
<Shuttle />     (min-h-[100vh], sticky stage)
<Fabric />
<ModuleStore />
<Quiet />       (local-first / privacy beat)
<OpenSource />
<Footer />
```

## 2. Required messages the page MUST communicate (each once)

1. **Metaphor** — one shuttle, every thread (Hero headline already does this).
2. **AI-native, not bolted on** — the shuttle *acts on* subsystems (this is the
   intended job of the Shuttle beat, currently wasted on duplicate captions).
3. **Local-first / private** — nothing phones home (the `Quiet` section).
4. **What the subsystems actually are** — the reference list (Threads all-7, or ModuleStore).
5. **Open-source / download CTA** — `OpenSource` + `Footer`.

## 3. WARPS data model (single source of truth)

### `src/components/LoomSVG.tsx` (lines 7-21):
```ts
interface WarpDef { x: number; label: string; over: boolean; }

const WARPS: WarpDef[] = [
  { x: 100,  label: 'TIME',     over: true  },
  { x: 300,  label: 'MONEY',    over: false },
  { x: 500,  label: 'FOCUS',    over: true  },
  { x: 700,  label: 'LEARNING', over: false },
  { x: 900,  label: 'CHAT',     over: true  },
  { x: 1100, label: 'TERMINAL', over: false },
  { x: 1300, label: 'TIMELINE', over: true  },
];
```
Note: index mapping used elsewhere — MONEY=1, LEARNING=3, TERMINAL=5.

## 4. Affected source — Hero.tsx (lines 1-169, full)

```tsx
import { useRef, useEffect, useState, useMemo } from 'react';
import { WARPS } from '../components/LoomSVG';
import { LiveLoomCanvas } from '../components/LiveLoomCanvas';

const CAPTIONS = [
  { warp: 'MONEY', tag: 'Finance', text: 'Flags a subscription you forgot.' },
  { warp: 'LEARNING', tag: 'Learning', text: 'Drafts your next lesson.' },
  { warp: 'TERMINAL', tag: 'Terminal', text: 'Reads your terminal output.' },
];

const WEFT_Y = 380; const AMP = 26; const FREQ = 2.6; const SVG_W = 1400;
function weftAtX(x: number): number { return WEFT_Y + AMP * Math.sin((x / SVG_W) * Math.PI * FREQ); }

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [activeWarp, setActiveWarp] = useState<string | null>(null);
  const [heroVisible, setHeroVisible] = useState(false);
  const [activeCaption, setActiveCaption] = useState<number | null>(null);
  const [warpStiffness, setWarpStiffness] = useState<(number | null)[]>([]);

  const captionDots = useMemo(() => CAPTIONS.map(cap => {
    const warp = WARPS.find(w => w.label === cap.warp);
    if (!warp) return null;
    const dotY = weftAtX(warp.x);
    return { x: warp.x, y: dotY, pctX: (warp.x / SVG_W) * 100 };
  }).filter(Boolean), []);

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 300);
    const update = () => {
      const el = containerRef.current; if (!el) return;
      const distance = Math.max(1, el.offsetHeight - window.innerHeight);
      const p = Math.max(0, Math.min(1, (window.scrollY - el.offsetTop) / distance));
      if (p < 0.34) { setActiveWarp(null); setActiveCaption(null); setWarpStiffness([]); }
      else if (p < 0.9) {
        const shuttleProgress = (p - 0.34) / 0.56;
        if (shuttleProgress < 0.33) { setActiveWarp('MONEY'); setActiveCaption(0); setWarpStiffness([null,1.0,null,null,null,null,null]); }
        else if (shuttleProgress < 0.66) { setActiveWarp('LEARNING'); setActiveCaption(1); setWarpStiffness([null,null,null,1.0,null,null,null]); }
        else { setActiveWarp('TERMINAL'); setActiveCaption(2); setWarpStiffness([null,null,null,null,null,1.0,null]); }
      } else { setActiveWarp(null); setActiveCaption(null); setWarpStiffness([]); }
    };
    let raf = 0; const loop = () => { update(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', update);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); window.removeEventListener('resize', update); };
  }, []);

  return (
    <div ref={containerRef} className="relative h-[420vh]">
      <div ref={stageRef} className="sticky top-0 relative w-full h-screen flex items-center justify-center overflow-hidden">
        <LiveLoomCanvas activeWarpIndex={WARPS.findIndex(w => w.label === activeWarp)} warpStiffness={warpStiffness} weftTension={activeWarp !== null ? 1.5 : 0.5} reducedMotion={false} className="absolute inset-0 w-full h-full" />
        <div className="relative z-10 text-center max-w-[800px] px-8 transition-all duration-700" style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(16px)' }}>
          <h1 className="text-[clamp(3rem,8vw,6rem)] font-display font-bold tracking-[-0.03em] leading-[0.95] mb-6 text-text [text-shadow:0_0_38px_rgba(251,191,36,0.35),0_0_12px_rgba(251,191,36,0.25)] [font-optical-sizing:auto]">
            One shuttle.<br />Every thread.
          </h1>
          <p className="text-[clamp(1rem,2vw,1.25rem)] text-text-secondary max-w-[50ch] mx-auto">
            AI doesn&apos;t sit in a chat window. It runs through everything you track.
          </p>
          <span className="block mt-12 text-[0.72rem] tracking-[0.18em] text-text-muted uppercase font-mono">Scroll ↓</span>
        </div>
        {/* Connector lines SVG overlay — lines 118-142 */}
        {/* Caption boxes — lines 144-165 */}
      </div>
    </div>
  );
}
```
**KEY POINT for the redesign:** The Hero's `CAPTIONS` array + connector-line SVG + caption-box
JSX (lines 5-9, 28-35, 118-165) is the redundant pass that duplicates Shuttle. The Hero's
job should be the *metaphor only* (headline + living loom). Remove the per-subsystem
captions from Hero.

## 5. Affected source — Shuttle.tsx (lines 1-96, full)

```tsx
import { useRef, useEffect, useState } from 'react';
import { WARPS } from '../components/LoomSVG';
import { LiveLoomCanvas } from '../components/LiveLoomCanvas';

const SHUTTLE_CAPTIONS = [
  { warp: 'MONEY', tag: 'Finance', text: 'Flags a subscription you forgot.', alt: 'Money mascot' },
  { warp: 'LEARNING', tag: 'Learning', text: 'Drafts your next lesson.', alt: 'Learning mascot' },
  { warp: 'TERMINAL', tag: 'Terminal', text: 'Reads your terminal output.', alt: 'Terminal mascot' },
];

export function Shuttle() {
  // ...scroll math maps progress → warpIndex (MONEY=1, LEARNING=3, TERMINAL=5)...
  return (
    <section ref={sectionRef} className="relative min-h-[100vh] bg-bg">
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <LiveLoomCanvas activeWarpIndex={activeWarpIndex} weftTension={weftTension} warpStiffness={activeWarpIndex !== null ? [null,null,null,null,null,null,null] : []} reducedMotion={false} />
        {SHUTTLE_CAPTIONS.map((cap, i) => {
          // bottom-anchored caption box, text only (no mascot here — that's Threads' job)
          // lines 62-93
        })}
      </div>
    </section>
  );
}
```
**KEY POINT:** Shuttle's intended distinct job is "the AI *acts on* a subsystem" — show the
shuttle passing through one warp and *doing something* (e.g. a representative micro-action
or a distinct "acting" state), NOT re-listing the subsystem's name + one-liner. The current
captions are a feature-list, which is Threads'/ModuleStore's job.

## 6. Affected source — Threads.tsx (lines 1-128, full)

```tsx
const THREADS = [
  { label: 'TIME', desc: 'Tracks every app, every website, every minute.', x: 100 },
  { label: 'MONEY', desc: 'Wallets, subscriptions, income, expenses — all in one view.', x: 300 },
  { label: 'FOCUS', desc: 'Strict timer with app blocking, daily goals, and streaks.', x: 500 },
  { label: 'LEARNING', desc: 'Hierarchical lessons with AI-powered mastery levels.', x: 700 },
  { label: 'CHAT', desc: 'Multi-provider AI that knows your entire local context.', x: 900 },
  { label: 'TERMINAL', desc: 'Multi-pane terminal with AI agents that read your codebase.', x: 1100 },
  { label: 'TIMELINE', desc: 'Visual phases of your life — past, present, and emerging.', x: 1300 },
];
// sticky stage; LiveLoomCanvas; per-warp label + mascot + desc card (lines 62-125)
```
This is the natural "here are all the threads" reference. It should be the ONE place the
7 core warps are named + described.

## 7. Affected source — ModuleStore.tsx (lines 1-14, 27-87)

```tsx
const MODULES = [
  { slug: 'time', label: 'Time', desc: '...' },
  { slug: 'money', label: 'Money', desc: '...' },
  // ... 12 entries (the 7 core + goals, life-phases, agent-orchestration,
  //     content-creation, external, context-brain) ...
];
// grid of cards: mascot img + amber mono label + desc (lines 27-87)
```
This is the "spare threads you can add" reference — the 12-module catalog. Distinct job:
the *extended* catalog (beyond the 7 core warps). Keep, but ensure no copy duplicates Threads.

## 8. Design tokens (from `src/index.css`, lines 3-28)

```css
@theme {
  --color-void: #050505;  --color-deep: #0a0a0a;  --color-bg: #09090b;
  --color-surface: #18181b;  --color-raised: #27272a;
  --color-amber: #fbbf24;  --color-gold: #f59e0b;  --color-terracotta: #c2703d;
  --color-river: #3b82f6;  --color-teal: #14b8a6;  --color-coral: #fb7185;
  --color-text: #fafafa;  --color-text-secondary: #a1a1aa;  --color-text-muted: #71717a;
  --font-sans: 'Geist','Inter',system-ui,sans-serif;
  --font-display: 'Fraunces','Geist','Inter',system-ui,sans-serif;
  --font-mono: 'JetBrains Mono','SF Mono',Consolas,monospace;
  --ease-premium: cubic-bezier(0.16,1,0.3,1);
  --ease-spring: cubic-bezier(0.34,1.56,0.64,1);
  --ease-dramatic: cubic-bezier(0.7,0,0.2,1);
}
```
Fonts loaded in `index.html`: Fraunces (display) + JetBrains Mono (labels). Dark mode only.

## 9. Live loom canvas (shared through-line)

`src/components/LiveLoomCanvas.tsx` — a verlet-rope Canvas 2D simulation (simplex-noise),
props: `activeWarpIndex`, `warpStiffness`, `weftTension`, `reducedMotion`. The active warp
glows brighter + goes taut; the weft pulls toward the active warp. **This is the visual
through-line that should change ROLE per section, not be accompanied by duplicate text.**

## 10. Constraints (hard)

- Must keep the "Loom" motif + amber/terracotta palette + Fraunces/JetBrains Mono. No new visual language.
- Must keep `LiveLoomCanvas` as the through-line.
- Each subsystem must be NAMED exactly once in the scroll narrative (Threads all-7 OR a
  single merged reference). Duplication across Hero/Shuttle/Threads is the defect to eliminate.
- Pure frontend (no backend/IPC). All data is static arrays in the section files.
- Build = `npm run build` (tsc -b + vite build → outputs to `dist-tmp/`, NOT `dist/`).
- `tsconfig.app.json` has `noUnusedLocals`/`noUnusedParameters` — no dead vars after edits.
