# Collaboration Request: RHEO Signature Motion System — "The Pulse of Life"

## Your Role

You are the **Specialist AI**. I am the **Project Owner AI**. I know the codebase; you know how to design and architect solutions. We will collaborate through a structured back-and-forth to refine this idea into an implementable specification.

## The Idea

**One signature motion design for the entire RHEO application that represents "the flow of life."**

The user wants:
1. **ONE global motion element** that appears on EVERY page — a living pulse that connects all surfaces
2. **Per-page custom mechanics** that express each page's unique semantics
3. The motion should feel like **a visual operating system where the representation of information changes according to the structure of the information itself**

The core metaphor: **RHEO breathes.** There is a living system behind the interface. Every page shares the same heartbeat but expresses it differently — like how a heart beats in every body but each body moves differently.

### What the user said (verbatim):

> "I need you to reflect and update our skillset context and everything related to our system and agents.md and design skills and the workspace improvements and everything so that the design is improved not only for the page but also for the workspace feature so that we make replicate and use these motion mechanics and assets to our advantage."

> "ONE signature motion design for the application that can represent the flow of life. Something that can be on every page and some that is custom to individual pages."

## Current Context (What I Have)

### Project: RHEO (formerly DeskFlow)
- **Stack:** Electron + React + TypeScript + Tailwind CSS v4 + better-sqlite3
- **Architecture:** Main process (Node.js) + Renderer (React) + Preload bridge
- **14 canonical routes:** dashboard, activity, AI, studio, learn, resume, IDE, external, finance, reports, database, life, settings, guide
- **Design system:** Dark glassmorphic, zinc-950 base, per-page accent colors, 12px max border radius

### Existing Background System (AppBackground.tsx)

The app ALREADY has a background system. Here is the exact current implementation:

```tsx
// src/components/AppBackground.tsx
import { Particles } from './ui/particles';
import { LightRays } from './ui/light-rays';
import { LivingSubstrate } from './life-river/LivingSubstrate';
import { AmbientGlow, GradientWash, MeshGradient, Vignette } from './ui/ambient-patterns';
import { DotPattern } from './ui/dot-pattern';

type Tier = "hero" | "standard" | "minimal";
type AmbientType = "rd" | "dot" | "wash" | "mesh" | "none";

const PAGE_CONFIG: Record<string, { tier: Tier; ambient: AmbientType }> = {
  "/":         { tier: "hero",     ambient: "rd" },
  "/activity": { tier: "standard", ambient: "dot" },
  "/ide":      { tier: "standard", ambient: "mesh" },
  "/life":     { tier: "hero",     ambient: "rd" },
  "/finance":  { tier: "standard", ambient: "wash" },
  "/external": { tier: "standard", ambient: "dot" },
  "/terminal": { tier: "minimal",  ambient: "none" },
  "/ai":       { tier: "standard", ambient: "mesh" },
  "/learn":    { tier: "standard", ambient: "wash" },
  "/settings": { tier: "minimal",  ambient: "wash" },
  "/database": { tier: "minimal",  ambient: "dot" },
  "/reports":  { tier: "standard", ambient: "dot" },
  "/resume":   { tier: "standard", ambient: "wash" },
};

const TIER_CFG = {
  hero:     { speed: 2 as const, maxAlpha: 0.35 },
  standard: { speed: 1 as const, maxAlpha: 0.20 },
  minimal:  { speed: 1 as const, maxAlpha: 0.10 },
};

const PAGE_ACCENTS: Record<string, string> = {
  "/": "#10b981",
  "/activity": "#06b6d4",
  "/ide": "#6366f1",
  "/life": "#fbbf24",
  "/finance": "#10b981",
  "/external": "#f59e0b",
  "/terminal": "#22c55e",
  "/ai": "#8b5cf6",
  "/learn": "#6366f1",
  "/settings": "#06b6d4",
  "/database": "#a78bfa",
  "/reports": "#ec4899",
  "/resume": "#cbd5e1",
};

export function AppBackground({ pathname = '/' }: AppBackgroundProps) {
  const accent = PAGE_ACCENTS[pathname] || '#10b981';
  const config = PAGE_CONFIG[pathname] || { tier: "standard", ambient: "wash" };
  const showSubstrate = config.ambient === "rd";
  const showRays = config.tier !== "minimal";

  return (
    <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden bg-[#09090b]">
      {showSubstrate && (
        <LivingSubstrate accent={accent} speed={TIER_CFG[config.tier].speed} maxAlpha={TIER_CFG[config.tier].maxAlpha} />
      )}
      <AmbientGlow />
      {showRays && <LightRays count={config.tier === "hero" ? 6 : 4} speed={config.tier === "hero" ? 18 : 12} />}
      {config.ambient === "dot" && <DotPattern opacity={config.tier === "minimal" ? 0.02 : 0.04} />}
      {config.ambient === "wash" && <GradientWash />}
      {config.ambient === "mesh" && <MeshGradient />}
      {pathname === "/" && <DotPattern opacity={0.03} />}
      <Particles quantity={30} color="#10b981" opacity={0.3} />
      <Particles quantity={20} color="#3b82f6" opacity={0.25} />
    </div>
  );
}
```

### Existing Ambient Patterns (ambient-patterns.tsx)

```tsx
// src/components/ui/ambient-patterns.tsx
export function AmbientGlow({ className }: { className?: string }) {
  return (
    <div aria-hidden="true"
      className={cn("absolute inset-0 pointer-events-none transition-opacity duration-1000", className)}
      style={{
        background: `radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, var(--page-accent) 15%, transparent), transparent 70%)`,
      }}
    />
  )
}

export function DotPattern({ opacity = 0.04 }: { opacity?: number }) {
  return (
    <div aria-hidden="true"
      className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
      style={{
        opacity,
        backgroundImage: `radial-gradient(var(--page-accent) 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    />
  )
}

export function GradientWash({ className }: { className?: string }) {
  return (
    <div aria-hidden="true"
      className={cn("absolute inset-0 pointer-events-none transition-opacity duration-1000 opacity-[0.03]", className)}
      style={{
        background: `linear-gradient(135deg, var(--page-accent) 0%, transparent 40%, transparent 60%, var(--page-accent) 100%)`,
      }}
    />
  )
}

export function MeshGradient({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      <div className="absolute inset-0 opacity-[0.08] df-animate-mesh"
        style={{
          background: `
            radial-gradient(at 20% 30%, var(--page-accent) 0px, transparent 50%),
            radial-gradient(at 80% 70%, color-mix(in srgb, var(--page-accent) 60%, #8b5cf6) 0px, transparent 50%),
            radial-gradient(at 50% 50%, color-mix(in srgb, var(--page-accent) 40%, #0ea5e9) 0px, transparent 50%)
          `,
          backgroundSize: "200% 200%",
        }}
      />
    </div>
  )
}

export function Vignette({ className }: { className?: string }) {
  return (
    <div aria-hidden="true"
      className={cn("absolute inset-0 z-[1] pointer-events-none", className)}
      style={{
        background: "radial-gradient(ellipse at center, transparent 30%, rgba(9,9,11,0.85) 100%)",
      }}
    />
  )
}
```

### Existing LivingSubstrate (Reaction-Diffusion background)

The app already has a WebGL reaction-diffusion simulation (LivingSubstrate.tsx) that renders on Dashboard and Life pages. It uses:
- R3F (React Three Fiber) with ping-pong WebGLRenderTargets
- Gray-Scott reaction-diffusion shader
- 256x256 grid (384 on high-DPI)
- Coral preset (f=0.0545, k=0.062, dA=1.0, dB=0.5)
- 28 random circular seed points
- Pauses on document.hidden, unmounts on prefers-reduced-motion

### Existing Design Tokens

```css
/* From index.css */
--page-accent: /* set per page */;
--ws-surface: #09090b;
--ws-surface-raised: #18181b;
--ws-border: rgb(39 39 42 / 0.6);
--ws-accent: #06b6d4;
--font-serif: "Source Serif 4", Georgia, serif;
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", monospace;
--font-display: "Space Grotesk", "Inter", sans-serif;
```

### Existing UI Components Available

From `src/components/ui/`:
- particles.tsx, light-rays.tsx, border-beam.tsx, magic-card.tsx
- number-ticker.tsx, animated-gradient-text.tsx, animated-circular-progress-bar.tsx
- dot-pattern.tsx, glare-hover.tsx, shiny-button.tsx, confetti.tsx
- ambient-patterns.tsx (AmbientGlow, DotPattern, GradientWash, MeshGradient, Vignette)

### 10 HTML Motion Mechanics (Reference Files)

Located at `agent/docs/motion_site_mechanics_10/`:
- **morphogen.html** — Reaction-diffusion (Gray-Scott), 190x130 grid, organic growth
- **adjacent.html** — Force-directed graph, 220 nodes, N-body physics
- **overpass.html** — 3D globe with orbital ground tracks, 18s period
- **nearside.html** — Voronoi tessellation, 34 seeds, sinusoidal drift
- **freeboard.html** — Contour field, 2D scalar field, topographic lines
- **headway.html** — Flow field, 3500 particles, sin/cos vector field
- **foreshock.html** — Signal traces, 8 parallel strip-charts, periodic spikes
- **quorum.html** — Cellular automaton (Game of Life), B3/S23 rules
- **harmonic.html** — Interlocking gears, 22s rotation, correct tooth meshing
- **deident.html** — Progressive redaction, animated bar overlay

## Context Gaps (What I Don't Have Yet)

1. **Performance budget** — What GPU/CPU budget do we have for ambient motion? The app runs in Electron on potentially low-end hardware.
2. **User preference** — Should the signature motion be toggleable? Or always-on?
3. **Workspace integration** — The terminal workspace (`/terminal`) currently has `ambient: "none"`. Should it get a signature too, or stay clean?
4. **Existing motion preferences** — Does the app already have a reduced-motion or motion-preference setting?
5. **Canvas vs CSS** — Should the signature use Canvas/WebGL (like LivingSubstrate) or pure CSS (like AmbientGlow)? Canvas is more powerful but heavier.
6. **Per-page vs global** — The user wants BOTH a global element AND per-page customizations. How do they layer without visual conflict?

If you need to see any specific file, ask and I will fetch it.

## Scope

- **IN:** Global signature motion element, per-page signature mechanics, implementation plan, performance considerations, reduced-motion behavior
- **OUT:** Backend changes, DB schema changes, IPC changes, new routes, existing component rewrites

## First Question

What is the ONE visual idea that could represent "the flow of life" across ALL pages of RHEO? Not 10 ideas — ONE. And how does it differ from the existing LivingSubstrate (reaction-diffusion) that already runs on Dashboard and Life?
