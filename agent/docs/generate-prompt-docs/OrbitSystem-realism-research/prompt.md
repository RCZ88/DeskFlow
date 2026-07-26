## Raw Request

> generate an AI prompt to research and improve design/realism of the orbit system / solar system visualization — focusing on realism, accuracy, aesthetics, and overall simulation quality

---

## Context

Read `agent/docs/OrbitSystem-realism-research/CONTEXT_BUNDLE.md` first. This document contains the full architecture, configuration constants, current state, and design tokens for the OrbitSystem solar system visualization in the DeskFlow app tracker.

The codebase lives at `src/components/OrbitSystem.tsx` (~3580 lines). Below are the key relevant code sections.

### Orbit Configuration (lines ~551-570)
```typescript
const ORBIT_CONFIG = {
  minOrbitRadius: 14,
  maxOrbitRadius: 90,
  baseAngularSpeed: 2.0,
  visualBalanceFactor: 0.65,
  sunRadius: 5,
  sunGlowSize: 6,
  eccentricityRange: { min: 0.01, max: 0.08 },
  inclinationRange: { min: 0, max: 5 },
};
```

### Planet Creation — `computePlanets` (lines ~620-830)
- `orbitRadius` computed via `calculateOrbitRadiusLogarithmic`
- `eccentricity` = random in `[0.01, 0.08]` (near-circular)
- `inclination` = random in `[0, 5]` degrees (near-zero)
- `planetRadius = Math.max(0.5, Math.sqrt(time / maxTime) * 1.5)`
- `color = getPlanetColorByOrbit(orbitRadius, min, max)` — gradient from warm (sun-like) to cool (blue-purple)

### Sun Component (lines ~888-1100)
- Multi-layer: sphere geometry + additive blending glow sprites + lens flare sprite
- Orbit ring rendered as `Ring` geometry with dashed material
- Category sun configs: `SUN_CONFIGS`, `WEBSITE_SUN_CONFIGS` — each has `{ color, emissive, sizeRange }`

### SolarSystemView (lines ~2420-2560)
- Positions category systems in a grid
- Each system gets: sun, n planets (up to 10), orbit rings, trails
- Planet click → detail panel with app name, category, time, sessions

---

## The Mandate

Act as a **Lead Designer and Engineer** for 3D data visualization. Your job is to **design and implement** a comprehensive improvement plan for the OrbitSystem solar system visualization. Do not just research or recommend — you must produce the actual creative design decisions, visual specifications, and implementation details that make this look stunning.

The goal: make it dramatically more realistic, more aesthetically compelling, and more informative — while keeping all changes within the existing codebase structure (no new dependencies). Make creative visual decisions. Pick colors, effects, animations. Define exactly how it should look and feel.

You must produce a **single, complete, well-reasoned solution**. Do not present multiple options.

## Requirements

### 1. Realism Research & Implementation

Research real solar system properties and propose concrete changes to the configuration to better match:

- **Kepler's laws** — current logarithmic spacing is visually driven. Would Titius-Bode law or actual AU scaling work better? What's the tradeoff?
- **Orbital speeds** — current `baseAngularSpeed + visualBalanceFactor` is a hack. Can you compute proper Keplerian orbital velocities?
- **Eccentricities** — currently near-zero (0.01–0.08). Real planets range from 0.007 (Venus) to 0.21 (Mercury). Should some orbits be visibly elliptical?
- **Inclinations** — currently 0–5°. Real range is 0.03° (Uranus) to 7° (Mercury). Should inclinations vary by orbit distance?
- **Planet sizes** — real solar system has a massive Sun (109× Earth) and tiny planets. Current ratio is ~3.6 sun : 1.5 planet max. What's the right visual compromise between realism and visibility?
- **Orbit spacing** — real solar system inner planets are tightly packed (0.39–1.52 AU), outer ones are far apart (5.2–30 AU). Does logarithmic spacing approximate this well?
- **Colors** — real planets have distinct hues. Current color scheme is a radial gradient. Should each planet type get a distinct color based on its app category?

### 2. Creative Animations & Transitions (MUST INCLUDE)

Focus on making the user *feel* like they're navigating a real solar system. Design these animations with exact timing, easing curves, and visual effects:

- **Zoom-in to solar system** — when clicking a category sun in galaxy view, animate the camera zooming *into* that system. Should feel like approaching a star: stars streak past, the target system grows, surrounding systems fade out. Define the animation curve, duration, camera path, and any particle/lighting effects during transit.
- **Zoom-out to galaxy** — reverse animation when exiting: camera pulls back, the system shrinks, surrounding stars/nebula reappear, a subtle warp/distortion effect as you exit. Define the full reverse spec.
- **Travel mode between systems** — a UI feature where instead of jumping directly, you can enter "travel mode." Show a directional arrow/compass pointing toward the next system. The camera flies toward it with a hyperspace/warp effect (star streaks, speed lines, tunnel vision). Design the UI indicator, the animation, and how the user triggers/interacts with it.
- **Spaceship / traversal aesthetic** — optional: represent the viewer's position as a small spaceship or probe. When traveling, show engine trails, a slight camera shake, or a warp tunnel shader. Be creative — this is the wow factor.
- **System entry portal** — when arriving at a new system, a subtle ring/portal effect as you cross into its gravity well. Brief flash, particles, or ripple.
- **Category switching animation** — when toggling between app categories, animate the transition. Old planets shrink/orbit away, new ones grow in. Not a hard cut.
- **Period change animation** — when switching Today/Week/Month/All, animate the planets growing/shrinking as their data changes, or new planets spawning in from the sun.

For all animations, specify: exact duration (ms), easing function, camera path (if applicable), particle effects, and what the user sees at each phase (0%, 25%, 50%, 75%, 100% of animation).

### 3. Data-Driven Enhancements

- **Planet rings** — Saturn-style rings for apps with very high usage (prestige indicator)?
- **Moons** — smaller apps within the same category could orbit as moons around the main planet?
- **Activity indicators** — glowing aura around recently-active planets?
- **Size fidelity** — current planet sizing uses `sqrt(time/maxTime)`. Would a different curve (log, linear-clamped) be more truthful?
- **Time display** — planet details show seconds. Could they show human-readable format (e.g., "2h 34m")?

### 4. Interactive UX

- **Hover preview** — show app name + time on hover without clicking?
- **Click vs select** — differentiate brief click (select) from sustained click (detail panel)?
- **Filtering** — could planets be filtered by min usage threshold?
- **Search/zoom to planet** — type to find and zoom to a specific app planet?
- **Tooltip** — floating tooltip on hover showing key stats?

## Constraints

1. **No new npm dependencies.** Everything must use Three.js (already loaded via R3F), @react-three/fiber, @react-three/drei, or custom GLSL.
2. **No R3F hooks outside Canvas.** Components rendered outside `<Canvas>` must use vanilla React hooks.
3. **Keep within ~3580 line OrbitSystem.tsx** — or split into sub-components under `src/components/` if needed.
4. **Build must pass.** No TypeScript errors.
5. **Performance budget.** The solar system view should maintain 30+ FPS on a mid-range machine with 10+ planets visible.

## CRITICAL: You Must Design and Implement, Not Just Analyze

For every visual improvement you propose, you **must**:

1. **Make a specific creative visual decision** — e.g., "add a cyan atmospheric glow ring around every planet with opacity 0.3" not just "consider adding atmospheres"
2. **Provide exact implementation details** — Three.js/R3F code snippets, shader math, geometry parameters, animation curves
3. **Define colors, sizes, opacity, timing** — use hex codes, pixel values, seconds, easing functions
4. **State what the user will SEE differently** — before/after visual description

Do NOT leave things open-ended like "could add stars" — instead say "add a particle starfield with 2000 stars at random positions r=200–400, size 0.5–2.0, using THREE.Points with a star texture"

## Output Format

Return a structured **design & implementation specification** with these sections:

### A. Research Findings & Design Decisions
For each axis (spacing, speeds, eccentricity, inclination, sizing, colors):
- What real solar system physics says
- What the current code does
- **The exact change you're making** (config values, math formula, color hex codes)
- **What it will look like** — describe the visual impact
- Tradeoffs

### B. Visual Enhancements & Animations — Complete Design Spec
For each visual change, provide:
- **Creative decision** — what you chose and why
- **Implementation spec** — exact Three.js/R3F code, geometry parameters, material config, shader snippets
- **Animation spec** — duration (ms), easing function, camera path, 4-phase breakdown (0%/25%/50%/75%/100%)
- **Look & feel** — describe what the user will see
- **Files touched** — which lines/functions to modify
- **Complexity** — trivial / moderate / complex

You must include concrete specs for ALL of these (not a subset — tackle every one):
- **Zoom-in to solar system** (camera flight path, duration, easing, star streaks, system growth, surroundings fade)
- **Zoom-out to galaxy** (reverse flight, warp/distortion effect spec)
- **Travel mode between systems** (directional compass UI, hyperspace effect, speed lines, camera path)
- **Spaceship/probe representation** (mesh design, engine trails, camera shake)
- **System entry portal** (ring geometry, flash, particle burst)
- **Category switch** (old planets out, new planets in — exact animation per planet)
- **Period change** (planet resize, spawn from sun — grow animation)
- **Atmospheres** — glow, size, color, opacity per planet or by category
- **Starfield background** — particle count, distribution, size range, parallax or not
- **Camera controls** — OrbitControls implementation, limits, damping
- **Planet textures** — procedural texture code or material config
- **Sun lighting** — point light or emissive? shadows or not? intensity, color
- **Particle systems** — asteroids, comets, dust — particle count, behavior, visual
- **Labels** — sprite-based or HTML? font, size, color, distance scaling behavior

### C. Data-Driven Features — Complete Design Spec
Same format as B, with concrete specs for:
- Planet rings for high-usage apps (ring geometry, size, color, threshold)
- Activity glow on recent planets (pulsing animation parameters)
- Time display format (exact string format)
- Any other data-visualization ideas you design

### D. Interactive UX
Exact interaction specs:
- Hover behavior (delay, tooltip content, position)
- Click behavior (selection highlight, panel animation)
- Filter controls (UI placement, behavior)
- Search/zoom (input style, animation)

### E. Implementation Roadmap
Phase 1 (must-do), Phase 2 (should-do), Phase 3 (nice-to-have).
For each phase: exact files to modify, approximate lines changed, risk level.

### F. Performance Budget
For each Phase 1 change: estimated FPS impact, draw calls added, mitigation strategy.
