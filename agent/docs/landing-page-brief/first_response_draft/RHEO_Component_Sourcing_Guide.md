# RHEO Landing Page — Component Sourcing Guide

> Where to get every component, effect, and animation. No building from zero.

---

## Animation & Motion Libraries

### 1. Motion.dev (Framer Motion successor)
**Install:** `npm install motion`

| Feature | Usage in RHEO | API |
|---------|--------------|-----|
| Spring animations | Button hovers, card interactions | `type: "spring"` |
| Layout animations | Store price flip, card reorder | `layout` prop |
| Gestures | Hero mouse ripple, card hover | `whileHover`, `whileTap` |
| Scroll-linked | Section fade-ins | `useScroll`, `useTransform` |
| AnimatePresence | Section transitions | `AnimatePresence` wrapper |

**Key imports:**
```tsx
import { motion, useScroll, useTransform, AnimatePresence } from "motion"
```

### 2. GSAP + ScrollTrigger
**Install:** `npm install gsap`

| Feature | Usage in RHEO | Plugin |
|---------|--------------|--------|
| Pinned sections | AI Depths section | ScrollTrigger |
| Text reveals | All headlines | SplitText (premium) |
| Scrub animations | Hero scroll velocity | ScrollTrigger `scrub` |
| Timeline sequences | Load animation | gsap.timeline() |
| Counter animation | Stats count-up | ScrollTrigger + tween |

**Key setup:**
```tsx
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText" // premium
gsap.registerPlugin(ScrollTrigger, SplitText)
```

### 3. Lenis Smooth Scroll
**Install:** `npm install lenis`

```tsx
import { ReactLenis } from "lenis/react"
import "lenis/dist/lenis.css"

function SmoothScroll({ children }) {
  return (
    <ReactLenis root options={{ lerp: 0.1, syncTouch: true }}>
      {children}
    </ReactLenis>
  )
}
```

---

## MCP Component Sources

### shadcn-ui-mcp (Connected ✓)
**What to pull:**
- `Button` — Primary/secondary CTAs
- `Card` — Feature cards base
- `Badge` — Labels, version tags
- `Switch` — Admin toggle in store
- `Separator` — Section dividers
- `Tooltip` — Icon explanations

**Install pattern:**
```bash
npx shadcn@latest add button card badge switch separator tooltip
```

### magicui (Connected ✓)
**What to pull:**
- `AnimatedBeam` — Connection lines between features
- `Particles` — Ambient background particles
- `BorderBeam` — Glowing card borders
- `Shine` — Button shine effect
- `RetroGrid` — Background grid pattern
- `TextReveal` — Scroll-triggered text

**Install pattern:**
```bash
npx shadcn@latest add @magicui/particles
npx shadcn@latest add @magicui/animated-beam
```

### reactbits (Connected ✓)
**What to pull:**
- `Aurora` — Background aurora effect
- `Text animations` — Various text effects
- `Background patterns` — Grid, dot patterns

**Install pattern:**
```bash
npx shadcn@latest add @react-bits/Aurora-TS-TW
```

### lucide (MCP error — use npm)
**Install:** `npm install lucide-react`

**Icons needed:**
| Feature | Icon Name |
|---------|-----------|
| AI Chat | `MessageSquare` |
| Content | `PenTool` |
| Focus | `Target` |
| Learn | `GraduationCap` |
| Finance | `Wallet` |
| Life | `Calendar` |
| Terminal | `Terminal` |
| Brain | `Brain` |
| Local | `HardDrive` |
| Private | `Shield` |
| Open | `Key` |
| Download | `Download` |
| GitHub | `Github` |

---

## Custom Components to Build

These don't exist in libraries and must be custom:

### 1. WebGLBackground (Hero)
**Base:** React Three Fiber + custom shader
**Reference:** RHEO's existing Morphogen reaction-diffusion
**Files:**
- `src/shaders/flowField.frag` — Fragment shader
- `src/components/WebGLBackground.tsx` — R3F canvas wrapper

**Shader concept:**
```glsl
// Flow field + reaction-diffusion hybrid
// Particles flow along Perlin noise field
// Mouse interaction creates ripples
// Scroll speed affects flow velocity
```

### 2. ASCIIDecode (Philosophy)
**Base:** Custom React component
**Reference:** Matrix rain + decode effect
**Files:**
- `src/components/ASCIIDecode.tsx`

**Logic:**
- Render random characters falling
- On trigger, characters "resolve" to target text
- Use monospace font for alignment
- Stagger character resolution

### 3. BentoCard (Features)
**Base:** shadcn Card + custom animations
**Files:**
- `src/components/BentoCard.tsx`

**Features:**
- Glass morphism styling
- Hover lift + shadow
- Micro-animation slot (passed as prop)
- Responsive sizing

### 4. PriceFlip (Store)
**Base:** CSS 3D transforms
**Files:**
- `src/components/PriceFlip.tsx`

**Features:**
- `transform-style: preserve-3d`
- Front: price text
- Back: "Included" text
- GSAP timeline for coordinated flip

### 5. AnimatedCounter (Landscape)
**Base:** GSAP + ScrollTrigger
**Files:**
- `src/components/AnimatedCounter.tsx`

**Features:**
- Count from 0 to target
- ScrollTrigger start
- Customizable duration, easing
- Suffix support ("+", "∞")

### 6. WaveSVG (Footer)
**Base:** SVG + CSS animation
**Files:**
- `src/components/WaveSVG.tsx`

**Features:**
- Animated path using `animate`
- Subtle undulation
- Color: amber at 10% opacity

---

## 3D/WebGL Strategy

### Hero Shader Architecture

```
WebGLBackground
├── Canvas (R3F)
│   ├── OrthographicCamera
│   ├── Plane (full-screen quad)
│   │   └── ShaderMaterial
│   │       ├── vertexShader: pass-through
│   │       └── fragmentShader: flowField.frag
│   └── Mouse tracking (uniforms)
└── Scroll velocity (uniforms)
```

### Shader Uniforms
| Uniform | Type | Source |
|---------|------|--------|
| `uTime` | float | `clock.getElapsedTime()` |
| `uMouse` | vec2 | Mouse position (normalized) |
| `uScroll` | float | Scroll velocity |
| `uResolution` | vec2 | Viewport size |

### Mobile Fallback
```tsx
const isMobile = useMediaQuery("(max-width: 768px)")

return isMobile ? <StaticGradient /> : <WebGLBackground />
```

---

## Scroll Animation Architecture

### Global Scroll Setup

```tsx
// App.tsx
import { ReactLenis } from "lenis/react"
import { useGSAP } from "@gsap/react"

gsap.registerPlugin(ScrollTrigger)

function App() {
  return (
    <ReactLenis root options={{ lerp: 0.1 }}>
      <Hero />
      <Philosophy />
      <Features />
      <AIDepths />
      <Landscape />
      <Store />
      <Download />
      <Footer />
    </ReactLenis>
  )
}
```

### Per-Section ScrollTrigger Pattern

```tsx
// Example: Philosophy section
useGSAP(() => {
  gsap.from(".pillar-card", {
    y: 60,
    opacity: 0,
    stagger: 0.15,
    scrollTrigger: {
      trigger: ".philosophy-section",
      start: "top 80%",
      end: "top 30%",
      scrub: 1,
    }
  })
}, { scope: sectionRef })
```

### Pinned Section (AI Depths)

```tsx
useGSAP(() => {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".ai-section",
      pin: true,
      start: "top top",
      end: "+=300%",
      scrub: 1,
    }
  })

  tl.to(".graph", { morphSVG: "#cluster1" })
    .to(".feature-1", { opacity: 1, y: 0 })
    .to(".graph", { morphSVG: "#cluster2" })
    .to(".feature-2", { opacity: 1, y: 0 })
    .to(".graph", { morphSVG: "#cluster3" })
    .to(".feature-3", { opacity: 1, y: 0 })
}, { scope: sectionRef })
```

---

## Performance Budget

| Metric | Target | How |
|--------|--------|-----|
| First Contentful Paint | < 1.5s | Inline critical CSS, lazy load shader |
| Largest Contentful Paint | < 2.5s | Preload hero font, optimize images |
| Time to Interactive | < 3.5s | Defer non-critical JS |
| Cumulative Layout Shift | < 0.1 | Fixed aspect ratios, font-display: swap |
| Lighthouse Performance | > 90 | Above + code splitting |

### Code Splitting

```tsx
// Lazy load heavy sections
const WebGLBackground = lazy(() => import("./components/WebGLBackground"))
const AIDepths = lazy(() => import("./sections/AIDepths"))

// Suspense fallback
<Suspense fallback={<div className="h-screen bg-void" />}>
  <WebGLBackground />
</Suspense>
```

---

## Asset Checklist

| Asset | Format | Size Target | Source |
|-------|--------|-------------|--------|
| RHEO logo | SVG | < 5KB | Custom design |
| Feature icons | SVG (Lucide) | < 1KB each | `lucide-react` |
| App screenshots | WebP | < 100KB each | Capture from app |
| Shader code | GLSL | < 10KB | Custom |
| Fonts | WOFF2 | < 50KB each | Google Fonts / Geist |

---

## MCP Quick Reference

| MCP | Status | Best For |
|-----|--------|----------|
| shadcn-ui-mcp | ✓ Connected | UI primitives, blocks |
| magicui | ✓ Connected | Animated effects, particles |
| reactbits | ✓ Connected | Backgrounds, text effects |
| google-design-mcp | ✓ Connected | Material icons, fonts |
| stitch | ✓ Connected | Mockup generation |
| lucide | ✗ Error | Use `npm install lucide-react` |
| iconify | ✗ Error | Use `npm install @iconify/react` |
| unsplash | ✗ Error | Use `https://unsplash.com` directly |

---

## Implementation Order

1. **Setup** — Project, Tailwind, fonts, Lenis
2. **Primitives** — Button, Card, GlassCard (reusable)
3. **Hero** — WebGL shader + text animation
4. **Philosophy** — ASCII decode + pillar cards
5. **Features** — Bento grid + 8 cards
6. **Landscape** — Contour lines + counters
7. **AI Depths** — Pinned graph section
8. **Store** — Price flip + toggle
9. **Download** — Converging particles + CTA
10. **Footer** — Wave + links
11. **Polish** — Responsive, reduced motion, perf

---

*This guide ensures every component has a source. No building from zero. No generic output.*
