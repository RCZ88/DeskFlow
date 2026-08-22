# Context Bundle — RHEO Signature Motion System

> This is the self-contained codebase reference for the Specialist AI. All source code is embedded inline — the external AI has zero file access.

---

## File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/AppBackground.tsx` | 82 | Current background system — tier/ambient routing per page |
| `src/components/ui/ambient-patterns.tsx` | 74 | AmbientGlow, DotPattern, GradientWash, MeshGradient, Vignette |
| `src/components/life-river/LivingSubstrate.tsx` | 304 | WebGL reaction-diffusion simulation (R3F) |
| `src/index.css` | 227 | Design tokens, keyframes, CSS utilities |
| `src/App.tsx` | 3372 | Main app shell, routing, sidebar, all page imports |
| `src/pages/DashboardPage.tsx` | 2828 | Dashboard with HeroBand, SummaryStrip, OrbitSystem |
| `src/pages/FinancePage.tsx` | 1643 | Finance with 9 tabs, AuroraBackground |
| `src/features/warmth/LifePage.tsx` | 1040 | Life page with river, phases, memories, covenant |
| `agent/docs/motion_site_mechanics_10/*.html` | 10 files | Visual mechanic references (Morphogen, Adjacent, etc.) |

---

## Key Architecture Points

### Background Layer Stack (z-index order)

```
z-[0]  — AppBackground (fixed, pointer-events-none)
         ├── LivingSubstrate (WebGL canvas, only on "rd" ambient pages)
         ├── AmbientGlow (radial gradient from --page-accent)
         ├── LightRays (SVG rays, count varies by tier)
         ├── DotPattern / GradientWash / MeshGradient (per-page ambient)
         ├── Particles (floating dots, always present)
         └── bg-[#09090b] (solid dark base)
z-[1]  — Page content (relative)
z-[10] — Elevated cards, sticky headers
z-[20] — Dropdowns, tooltips
z-[30] — Modals
z-[50] — Backdrops
z-[100] — App sidebar
z-[200] — Workspace overlay
```

### Per-Page Accent Colors

```tsx
const PAGE_ACCENTS: Record<string, string> = {
  "/": "#10b981",        // emerald — brand default
  "/activity": "#06b6d4", // cyan — data/monitoring
  "/ide": "#6366f1",      // indigo — code/IDE
  "/life": "#fbbf24",     // amber — warmth/life
  "/finance": "#10b981",  // emerald — money/growth
  "/external": "#f59e0b", // amber — timer/activity
  "/terminal": "#22c55e", // green — terminal
  "/ai": "#8b5cf6",       // violet — AI/intelligence
  "/learn": "#6366f1",    // indigo — learning/knowledge
  "/settings": "#06b6d4", // cyan — config/clarity
  "/database": "#a78bfa", // violet — data/authority
  "/reports": "#ec4899",  // pink — insights/analysis
  "/resume": "#cbd5e1",   // slate — professional
};
```

### Page Tier System

```
"hero"     → Full background treatment (LivingSubstrate + LightRays + ambient)
"standard" → Moderate treatment (LightRays + ambient pattern)
"minimal"  → Bare treatment (no rays, low-opacity ambient only)
```

Currently:
- **hero:** Dashboard (`/`), Life (`/life`)
- **standard:** Activity, IDE, External, AI, Learn, Reports, Resume
- **minimal:** Terminal, Settings, Database

### Existing CSS Keyframes

```css
/* Life breathing */
@keyframes df-edge-breath {
  0%, 100% { opacity: 0.28; }
  50% { opacity: 0.6; }
}

/* Sidebar logo shine */
@keyframes sidebarShine {
  0% { background-position: 150% 0, 0 0 }
  45% { background-position: -70% 0, 0 0 }
  100% { background-position: -70% 0, 0 0 }
}

/* Aurora gradient */
@keyframes aurora {
  0% { background-position: 0% 50%; transform: rotate(-5deg) scale(0.9); }
  25% { background-position: 50% 100%; transform: rotate(5deg) scale(1.1); }
  50% { background-position: 100% 50%; transform: rotate(-3deg) scale(0.95); }
  75% { background-position: 50% 0%; transform: rotate(3deg) scale(1.05); }
  100% { background-position: 0% 50%; transform: rotate(-5deg) scale(0.9); }
}

/* Resume score pulse */
@keyframes scorePulse {
  0%, 100% { filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.3)); }
  50% { filter: drop-shadow(0 0 12px rgba(99, 102, 241, 0.6)); }
}
```

### LivingSubstrate Technical Details

- **Resolution:** 256x256 grid (384 when devicePixelRatio > 1.5)
- **Renders:** 2 simulation passes per frame
- **Seed:** 28 random circular points with B-gradient falloff
- **Display:** Premultiplied alpha (vec4(color*alpha, alpha))
- **Ramp:** B=0 → #09090b/a0, B=0.5 → #b45309/a0.15, B=1 → #fbbf24/a0.40
- **Shaders:** rd-simulation.glsl + rd-display.glsl (GLSL1 style)
- **Error boundary:** Falls back to null on WebGL failure (never black screen)
- **Performance:** Pauses on document.hidden, unmounts on prefers-reduced-motion

---

## What the Signature Motion System Needs to Do

The concept is called **The Current** — a persistent directional pulse moving through a continuous visual field.

1. **The Current is NOT a background effect** — it is a persistent visual entity that survives route changes
2. **LivingSubstrate stays** as the ambient environmental layer ("RHEO is alive")
3. **The Current** is the semantic layer ("RHEO is moving") — each page interprets the same Current according to its information structure
4. **The pulse phase persists** across navigation — geometry changes, phase doesn't
5. **The 10 mechanics become semantic renderers** — `<RheoCurrent mode="network" />` not `<AdjacentBackground />`
6. **Performance:** must stay under 5% GPU in Electron on low-end hardware
7. **Reduced motion:** static visible state, never disappear
8. **Primitives:** Pulse, Stream, Node, Edge, Branch, Orbit, Field, Contour, Signal, Mask — composable in workspace
