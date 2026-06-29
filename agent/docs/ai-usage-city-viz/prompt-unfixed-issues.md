## Raw Request

> "THE ERROR IS STIL THERE" (PCFSoftShadowMap warning)
> "THERE ARE NO STATS SHOWN ON THE TOWERS!"
> "Make different colors, smaller buildings"
> "Performance is laggy, there is no performance button"
> "is it meant to represent a globe? it doesnt work beacuse it doesnt have that 3D shape yet. it still is flat."
> "it still looks like a piece of shit. it doesnt have cars, it doesnt have roads. all the building look the same, theres this weird grid line thing. it just still looks terrible. i want it to be like gotham city, but like in cyber punk style or something."
> "fix them"

## Context

Read `agent/docs/ai-usage-city-viz/CONTEXT_BUNDLE_VISUAL_OVERHAUL.md` section 2 (Still-Broken Issues) first. That document contains the full codebase context including architecture, available libraries, invariants, and the exact lines/files for every component.

### Already Fixed (do NOT redo)

The following were already handled by the Hands & Eyes agent — these work:
- PCFSoftShadowMap deprecation warning: silenced via console.warn patch
- Performance overlay: `PerformanceMonitor` component shows FPS badge + expanded panel (frame time, draw calls, triangles, vertices, heap, quality mode)
- Ground platform: `circleGeometry(54,64)` with cyan + violet glow rings replaces infinite plane
- Empty-click deselect: `onPointerMissed={() => setSelectedBuilding(null)}` on Canvas
- Quality toggle: Performance mode removes all post-processing, shadows, drops particles to 200

## The Mandate

Design a comprehensive fix for the remaining 3 issues. You are the Lead Designer and Engineer — own the full solution from data processing logic to pixel-level visual spec. Return a RESULT.md with the following sections:

## Engineering Tasks

### 1. Building Click → DetailPanel
Debug why clicking a building shows no stats in the real app. The R3F `onClick` handler and `DetailPanel` slide-in component exist in source but don't render. Ensure: click opens panel with tokens/cost/messages/sessions, panel renders on top (correct z-index), and a subtle first-visit hint guides the user.

### 2. Visual Variety
Design the math for: power-law height distribution mapping log(token count) to building height, agent-palette color assignment with brightness variance, footprint scaling (0.5–2.0), roof geometry variation (flat/pyramid/antenna), and window pattern diversity per agent type. Determine whether the single-InstancedMesh draw call constraint can be maintained or should be relaxed.

### 3. Performance Optimization
Design a real LOD system: GPU tier detection via drei `useDetectGPU`, instance reduction (skip bottom 50% in perf mode), window atlas resolution scaling (512→128), draw call merging where possible, and `useFrame` rate throttling. Quantify the expected draw call and triangle reduction for each strategy.

## Design Task

Provide pixel-level visual specs for:
- A cyberpunk-but-unique city style (Gotham-inspired, neon accents, own identity)
- Road grid layout (not spiral phyllotaxis) with glowing street lines + animated traffic flows
- Building visual variety: color distribution, height silhouette, roof styles, window illumination patterns
- Ground/platform design (circular data disk exists — does it need buildings on top, or should it become a globe/hemisphere?)
- Camera composition: framing the city as a deliberate diorama, ideal initial camera angle and distance

## UX Task

Design the interaction flow for:
- Click building → DetailPanel slide-in animation + content layout
- Empty-space click → deselect (already wired, ensure it works with your click handler)
- Quality mode switch → visual confirmation (toast or badge) + persist choice
- First visit → subtle tooltip/hint to click a building
- Hover state transitions

## Constraints

- InstancedMesh should remain as single draw call for building bodies where possible
- No external binary assets — everything procedurally generated (three.js primitives + shaders)
- Renderer-side fixes only — no main.ts/preload.ts changes
- The `onPointerMissed` handler for deselect is already in place — build on it
- Three.js r183, @react-three/fiber, @react-three/drei, @react-three/postprocessing
- TypeScript strict, CRLF line endings

## Output Format

Return a RESULT.md with:
- **Phase 1: Fixes** — one section per fix (click interaction, visual variety, performance), each with the exact math/logic and pixel-level visual spec
- **Phase 2: Integrity check** — what invariants are preserved (single draw call? event order?) and what changed
- **Implementation notes** — which file(s) and approximate line ranges for each change, using the line numbers from the CONTEXT BUNDLE as reference
