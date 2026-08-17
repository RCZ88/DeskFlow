# Context Gaps — Reaction-Diffusion Life Design

> What the Specialist does NOT have yet, and how the Project Owner will obtain it.

| # | Context Needed | Status | Location | How to Obtain |
|---|----------------|--------|----------|---------------|
| 1 | Exact GLSL source: `glsl/simulationFrag.glsl` + `glsl/displayFrag.glsl` + uniform declarations | ❌ Missing | jasonwebb/reaction-diffusion-playground (GitHub) | Specialist REQUESTs → Owner fetches raw file from GitHub and pastes |
| 2 | Ping-pong render target setup & sim passes/frame from `entry.js` / `renderTargets.js` / `materials.js` | ❌ Missing | same repo | Specialist REQUESTs → Owner fetches and pastes |
| 3 | AppBackground internals (fixed layer? z-index? per-page accent?) in App.tsx | ⚠️ Partial | `src/App.tsx` (~L3274 area) | Specialist REQUESTs → Owner pastes exact lines |
| 4 | Full RingCanvas.tsx SVG structure (how a behind-canvas reacts to its 460px stage) | ❌ Missing | `src/components/life-river/RingCanvas.tsx` (289 lines) | Specialist REQUESTs → Owner pastes |
| 5 | Full PhaseCard expanded structure (if card-surface textures wanted) | ❌ Missing | `src/components/life-river/PhaseCard.tsx` | Specialist REQUESTs → Owner pastes |
| 6 | RiverMap / TimelineView SVG details (if they should sit ON a living canvas) | ❌ Missing | `src/components/life-river/RiverMap.tsx` / `TimelineView.tsx` | Specialist REQUESTs → Owner pastes |
| 7 | Mode-toggle bar exact markup (where a background would sit under it) | ✅ Have | LifePage.tsx L412-474 | Already embedded in CONTEXT_BUNDLE.md |
| 8 | Whether shader-based WebGL is safe under app CSP | ✅ Have | CSP allows `'unsafe-eval'`; WebGL shaders don't need eval | No action |

**Rule:** The Specialist must REQUEST missing context explicitly (`REQUEST: <path>`); the Owner fetches and pastes REAL code, never fabrications. Round log: `conversation/round-XX.md`.