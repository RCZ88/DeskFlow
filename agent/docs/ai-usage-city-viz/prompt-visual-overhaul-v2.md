# Architect AI Prompt — AI Usage Cityscape: Complete Visual Overhaul (v2)

> **Target:** Architect AI (Notion AI) — research, design, and plan a complete visual overhaul.
> **Sender:** opencode (Hands & Eyes) on behalf of CZ (human).
> **Priority:** HIGH — user is frustrated with current visual quality.

---

## Your Mission

Research and design a **complete visual overhaul** of the 3D city visualization that represents AI coding agent usage data (tokens, costs, agents, models) in the DeskFlow Electron app.

The current implementation is technically functional but visually unappealing:
- Buildings on a spiral layout (not a real city grid)
- No roads, no vehicles
- All buildings look identical
- A uniform procedural grid on the ground that "looks weird"
- Generic cyberpunk neon theme with no distinct identity

**Goal:** Transform it into a **Gotham City meets Cyberpunk** aesthetic with a unique, distinctive style. It doesn't need to copy existing IPs exactly — the simplicity should make it stand out and be recognizably *our own* style.

---

## What We Need From You

We need you to **research** and **produce**:

### A. Visual References & Design Direction
Research and document reference material for each aspect below. For each reference, note what specific technique or visual element is relevant and how it could be adapted.

1. **Gotham City / Dark Deco aesthetic** — tall spires, dramatic silhouettes, art deco elements mixed with gothic, moody atmosphere
2. **Cyberpunk aesthetics** — Blade Runner, Ghost in the Shell, Akira, Altered Carbon — neon signage, rain-slicked streets, vertical sprawl, contrast between dark and bright neon
3. **Procedural city generation in Three.js** — search for and analyze these specific projects:
   - "SynthCity" by Jeff Beene (infinite procedural cyberpunk city in Three.js — known for noise-based district generation, texture swapping for building variety, road grids, flying cars, traffic systems)
   - Procedural city generators using InstancedMesh + noise for architectural variation
   - Road/street generation algorithms (grid-based, radial, or hybrid)
4. **Reference games/films** for atmosphere and mood:
   - Batman: Arkham series (Gotham City design)
   - Cyberpunk 2077 (neon architecture, street-level detail)
   - Blade Runner 2049 (atmosphere, color palette, scale)
   - Mirror's Edge (clean geometry, stark contrasts, building styles)

### B. Technical Research

Investigate feasible approaches for each component within our constraints (InstancedMesh only, procedural generation in code, no external assets, single draw call for buildings):

1. **Building variety** — How can 80-200 InstancedMesh buildings look different from each other?
   - Varied heights (current: spiral-based)
   - Varied footprints (current: uniform)
   - Varied roof styles (flat, peaked, stepped, spired)
   - Varied window patterns (current: `aWin` uniform texture)
   - Varied colors/materials (current: agent-palette based)
   - Setbacks, ledges, architectural detailing via geometry
   - How to encode all of this in InstancedBufferAttributes?

2. **Road network** — Feasible approaches for a procedural road grid:
   - Grid-based streets (Manhattan style)
   - Radial streets (Paris/DC style)
   - Organic/district-based (noise-driven like SynthCity)
   - Road markings, lane lines, crosswalks
   - Procedural curb/sidewalk geometry
   - How many draw calls for the road system?

3. **Vehicles** — Low-poly animated traffic:
   - How to render 20-50 cars as InstancedMesh along road paths?
   - Car geometry (single shared box with slight variation via attributes)
   - Traffic light animation flow
   - Brake lights, headlights as point lights / emissive
   - Flying vehicles / air taxis above street level

4. **Lighting & Atmosphere** — Dramatic mood:
   - Volumetric fog / mist with color variation
   - Animated neon signage (billboards, holographic ads)
   - Streetlights with cone-of-light effects
   - Rain system (current: 1400 particle points — improve?)
   - Ground reflections (wet road look)
   - Skyline silhouette layering
   - Color grading / LUT for the dark cyberpunk palette

5. **District / Zoning** — City segmentation:
   - Residential vs commercial vs industrial vs downtown districts
   - How to communicate zoning through building style + color + density
   - Transition zones between districts

### C. Implementation Plan

Produce a **detailed, ordered plan** for implementation. Each phase should specify:

- **Files to create/modify** (relative to `src/components/`)
- **What new InstancedBufferAttribute(s) are needed** and their per-instance data shape
- **What shader changes are needed** (onBeforeCompile or new ShaderMaterial)
- **Performance budget** (estimated draw calls, vertices, shader complexity)
- **Data flow** — how does the AI usage data map to each visual dimension?

Phases should be ordered so that the most impactful changes come first, and the system is visually testable at each step.

Example phase structure (you may redefine entirely):

| Phase | Deliverable | Visual Impact |
|-------|-------------|---------------|
| 1 | Road grid + district layout (replace spiral) | Transform from "floating shapes" → actual city |
| 2 | Building variety (footprints, roofs, styles) | No more identical buildings |
| 3 | Vehicles (cars + air taxis) | Life, motion, scale |
| 4 | Atmosphere overhaul (fog, neon signs, streetlights) | Mood, identity, drama |
| 5 | Unique style pass (color grading, silhouettes) | Distinctive look |
| 6 | Polish (rain, reflections, details) | Professional quality |

### D. Create FIX PACKET

After your research and design is complete, produce a FIX PACKET containing:
1. **RESULT.md** — Full design document with references, color palettes, and visual direction notes
2. **PATCH** — Complete replacement source files for the modified components (`AICityscape.tsx`, `cityscape.utils.ts`, and any new files)
3. **Implementation notes** — Any build steps, configuration changes, or preload/IPC changes needed

---

## Codebase Constraints (Hard Rules)

### What we CAN do:
- Custom BoxGeometry with InstancedBufferAttribute (already done — `aWin`, `aTile`, `aState`, `aEmis`)
- Multiple InstancedMesh draw calls (current: buildings + roof glow)
- ShaderMaterial for ground/atmosphere (current: NeonGround uses ShaderMaterial)
- `onBeforeCompile` patches on MeshStandardMaterial (current: useBuildingMaterial)
- Three.js postprocessing (ChromaticAberration, Noise, SMAA, Bloom)
- Points geometry for particles
- OrbitControls
- R3F + drei components
- Framer Motion for UI overlay

### What we CANNOT do:
- ❌ No new npm packages
- ❌ No external texture files loaded from disk
- ❌ No individual mesh per building (must use InstancedMesh)
- ❌ No modification to main.ts or preload.ts (renderer-only changes preferred)
- ❌ No mass line-ending changes (CRLF must stay)

### What we MUST preserve:
- **Data-driven**: Building metrics (height, color, emissive) must derive from AI usage data
- **Interactive**: Click a building → show detail panel with agent metrics
- **Dual view**: Ability to toggle between "Agent mode" (colored by AI tool) and "Model mode" (colored by model name)
- **Time-lapse**: Scrubber to animate through dates
- **Hover labels**: Show tooltip with agent name + tokens on hover
- **Performance**: Must maintain 30+ FPS on a mid-range GPU (integrated Intel Iris Xe as baseline)

---

## Current Code Summary (for context — read CONTEXT_BUNDLE_VISUAL_OVERHAUL.md for full details)

### AICityscape.tsx (~730 lines)
Main scene component containing:
- `InstanceBuildings` — InstancedMesh with custom geometry + shader
- `NeonGround` — ShaderMaterial plane with procedural grid
- `Atmosphere` — Points (1400, rain + embers)
- `CityScene` wrapper — canvas, fog, post, lights
- Morph system for view switches
- UI overlay (mode pills, time-lapse, detail panel)

### cityscape.utils.ts (~300 lines)
- `buildCityModel()` — transforms IPC data → city layout
- AGENT_PALETTE — 6 color schemes
- Spiral phyllotaxis layout function (THIS MUST BE REPLACED with road-grid layout)

### IDEProjectsPage.tsx
- Lazy-imports AICityscape
- City/Charts toggle
- Feeds data via IPC calls

---

## Output Format

Please respond with **three sections**:

```
---
## SECTION A: RESEARCH SUMMARY
<Your research findings — references, techniques analyzed, what's feasible>
---

## SECTION B: DESIGN DIRECTION
<Color palette, visual style, mood board descriptions, unique identity>
---

## SECTION C: IMPLEMENTATION PLAN (FIX PACKET)
<Phased plan with files, changes, performance notes>
---
```

Then ship a FIX PACKET (ZIP) containing:
- `RESULT.md` — Full design + plan
- Patched source files
- `CONTEXT_BUNDLE_VISUAL_OVERHAUL.md` updated with any new constraints discovered

---

## Reference Starting Points (to accelerate your research)

- **SynthCity by Jeff Beene**: Three.js procedural cyberpunk city with noise-based districts, texture swapping, road grids, traffic
- **Three.js InstancedMesh examples**: https://threejs.org/examples/#webgl_instancing_mesh
- **Procedural generation**: Perlin/Simplex noise for district generation, building height variation, road layout
- **Color palettes**: Search "cyberpunk color palette" + "Gotham City color palette" + "dark deco color scheme" for unique hybrid
- **Road generation**: Search "procedural road network generation" — L-systems, tensor field, or grid-based approaches

---

## Communication Note

The human (CZ) relays messages between us. CZ is not a developer or designer — do not ask CZ subjective design questions. Make decisions based on your research and state them clearly. If truly blocked (e.g., a constraint prevents the design), state the constraint and the tradeoff clearly.
