# CONTEXT_BUNDLE — AI Usage Cityscape Visual Overhaul v2

> Codebase context for Architect AI to research & design a complete city visual overhaul.
> Date: 2026-06-25

---

## 0. User Complaint (verbatim)

> "it still looks like a piece of shit. it doesnt have cars, it doesnt have roads. i the building all look the same, theres this weird grid line thing. it just still looks terrible. i want it to be like gotham city, but like in cyber punk style or something. i need you to use the generate prompt skill and make the prompt so that it ensures the ai research everything related to the looks and the contents and like the everything. like teh visuals , the roads, the cities, everything in between. even if the style is not like exactly the same, the simplicity made on it should still stand out and be unique and we should have our own style. it should plan everything"

---

## 1. What Currently Exists (current implementation)

All in `src/components/AICityscape.tsx` (730 lines) and `src/components/cityscape.utils.ts` (300 lines).

### AICityscape.tsx — Main component
- **InstanceBuildings**: Single `InstancedMesh` with custom `BoxGeometry` and 4 `InstancedBufferAttribute`s (`aWin`, `aTile`, `aState`, `aEmis`). ~80-200 buildings positioned via spiral phyllotaxis.
- **useBuildingMaterial**: `onBeforeCompile` shader patch on `MeshStandardMaterial` — window atlas sampling, neon edge trim, hover/select emissive pulse (`sin(uTime*4.0)`).
- **NeonGround**: `ShaderMaterial` plane — procedural cyan square grid + violet radial streets + pink animated data pulses. `fwidth` anti-aliased grids.
- **Atmosphere**: `Points` (1400 particles, 78% rain / 22% embers), GPU-animated entirely in vertex shader via `aKind` attribute.
- **RoofGlow**: Second instanced mesh for emissive roof lights.
- **Morph system**: `morphCur`/`morphTgt` refs — height, footprint, position lerp at 0.12 factor per frame. View-mode switch and time-lapse tween instead of snap.
- **Post-processing**: `ChromaticAberration`, `Noise` (film grain), `SMAA`, `Bloom (threshold 0.95)`.
- **Fog**: `exp2(#0a0c18, 0.025)`.
- **Controls**: `OrbitControls` with `maxPolarAngle`, damping.
- **UI overlay**: Mode pills (Agent/Model/Time-lapse), scrubber with play/pause, detail panel slide-in on click.
- **Color palette**: Dark navy (#0a0c18) background, cyan/teal buildings, violet accents, pink data highlights.

### cityscape.utils.ts — Data layer
- `buildCityModel(data)`: Transforms AI usage data into city model (buildings array, date range, metrics).
- `extractDateRange(buildings)`: Min/max dates.
- `formatMetricValue(value)`: Token/cost formatting with K/M/B suffixes.
- `AGENT_PALETTE`: 6 agent color schemes.
- Spiral phyllotaxis layout (no road grid).
- Log/sqrt metric scaling.

### Where it lives
- **Route**: `/ide` → IDEProjectsPage.tsx → lazy-imported under "AI Tools" tab.
- **Toggle**: City/Charts toggle in trend header.
- **Data**: Fed by `get-ai-usage-summary` and `get-ide-projects-overview` IPC endpoints.

---

## 2. Available Libraries (everything already in package.json proven to work with Three.js)

- `three` (r150+)
- `@react-three/fiber` (R3F)
- `@react-three/drei` (OrbitControls, Environment, Lightformer, Html, Text, etc.)
- `@react-three/postprocessing` (Bloom, ChromaticAberration, Noise, SMAA, ToneMapping, Vignette)
- `three-stdlib` (for utilities)
- `framer-motion` (UI animations)
- Chart.js, react-chartjs-2
- Tailwind CSS + glass morphism patterns
- TypeScript strict mode
- Electron (main.ts + preload.ts IPC bridge)

---

## 2. Still-Broken Issues (Cycles 25c–28 — NOT fixed, need Architect)

These are the bugs / missing features the user is actively complaining about:

### A. Building click → no stats shown
- The `DetailPanel` component and `onClick` handler exist in code but clicking a building does NOT show the stat panel in the real app.
- Root cause unknown — possibly R3F event propagation, z-fighting with ground plane, or the DetailPanel being hidden behind another element.
- Fix must ensure clicking any building opens the slide-in DetailPanel with tokens/cost/messages/sessions.
- Clicking empty space must deselect.

### B. No visual variety (all buildings look the same)
- All buildings use the same custom BoxGeometry with identical aWin/aTile attributes. No variation in:
  - Height distribution (most are medium, no extreme skyscrapers or small huts)
  - Color (agent-based palette exists but is subtle)
  - Roof style (all flat box roofs)
  - Window patterns (all same atlas)
  - Width/footprint (all same footprint size)
- User wants: "different colors and smaller buildings" — variety in size, color, shape.

### C. Performance is laggy (quality toggle not aggressive enough)
- On integrated GPUs the city struggles to maintain 60fps.
- Current quality toggle (Cinematic/Balanced/Performance) gates:
  - Wet reflective ground (Cinematic only)
  - Smog clouds (Cinematic only)
  - Atmosphere particles (200 perf / 1400 cinematic)
  - ChromaticAberration (disabled in performance)
  - EffectComposer entire post-processing (disabled in perf mode)
  - Shadow mapping (disabled in perf mode)
- Still missing: LOD system for distant buildings, texture resolution scaling, draw-call count reduction, simpler geometry in perf mode.

### D. PCFSoftShadowMap warning in console
- console.warn about PCFSoftShadowMap deprecation fires on every frame.
- FIXED: console.warn patch at top of AICityscape.tsx suppresses the warning globally. THREE handles the deprecation internally.

---

## 3. Data Shape (what the 3D city represents)

From `get-ai-usage-summary` and `get-ide-projects-overview`:

```typescript
interface BuildingData {
  id: string;
  agentTool: string;        // 'claude', 'opencode', etc.
  model: string;            // 'claude-sonnet-4-20250514'
  tokens: number;           // total tokens (0–100M+)
  tokensIn: number;         // input tokens
  tokensOut: number;        // output tokens
  cost: number;             // USD ($0–$100+)
  sessions: number;         // session count
  messageCount: number;
  date: string;             // YYYY-MM-DD
  daily: { [date: string]: { tokens, cost, sessions } };
  projects: Array<{ path, tokens }>;
}
```

---

## 4. Current Architecture & Design Problems (Architect AI needs to solve these)

1. **No roads** — buildings are placed on a spiral (phyllotaxis). No street grid, no road network. The ground plane has a procedural grid shader but it doesn't read as roads.
2. **No vehicles** — no cars, no flying vehicles, no traffic animation.
3. **Buildings look identical** — all use the same custom BoxGeometry with `aWin`/`aTile`. No varied architectural styles (no setbacks, no spires, no different roof styles, no varied window patterns).
4. **"Weird grid line thing"** — the `fwidth` procedural grid on NeonGround doesn't look like roads or city blocks. Likely too uniform/perfect.
5. **No distinct style** — partially cyberpunk neon but no cohesive visual identity.
6. **Bland atmosphere** — Atmosphere component is just rain + ember particles. No neon signs, no billboards, no fog color variation, no skyline glow.
7. **No ground detail** — no streetlights, no road markings, no sidewalks, no parked vehicles.
8. **No building labels** — towers don't show what AI model, provider, or agent they represent anywhere on the 3D scene. The only identification is via hover tooltip (floating `Html` label). There is no text on the buildings themselves — no rooftop signs, no holographic labels, no billboards with agent names.

---

## 5. Hard Technical Constraints

- **InstancedMesh must remain for performance** — cannot create individual meshes per building (80-200 buildings × unique geometry would destroy FPS).
- **Single draw call** — building body + neon trim + windows must remain one draw call. Separate roof glow as second instanced mesh is OK.
- **CRLF line endings** — don't mass-reformat.
- **No external binary assets** — everything procedurally generated in code. No textures loaded from disk (except base64-embedded small textures if absolutely necessary).
- **Window is Electron** — 1920×1080 typical, dark theme, WebGL2 capable.
- **Build command**: `node scripts/build.mjs` (Vite for renderer, esbuild for preload/ main).
- **No external npm packages** — only what's already in package.json. No new dependencies.
- **`localStorage` access must be wrapped in try/catch**.
- **Prefer renderer-side fixes** — avoid modifying main.ts unless necessary.

---

## 6. Current Code Structure (files to modify or replace)

| File | Purpose | Lines |
|------|---------|-------|
| `src/components/AICityscape.tsx` | Main R3F component (all scene logic) | ~730 |
| `src/components/cityscape.utils.ts` | Data transforms, palettes, layout math | ~300 |
| `src/pages/IDEProjectsPage.tsx` | Parent page, lazy import AICityscape | — |

---

## 7. Prior Work (what's been done to date)

- **Cycle 21 (2026-06-23)**: Initial cityscape implementation. Spiral phyllotaxis, basic InstancedMesh, Bloom+Vignette+ToneMapping, hover labels, detail panel.
- **Cycle 22 (2026-06-23)**: Cityscape Visual Overhaul prompt created (never implemented).
- **Cycle 25 (2026-06-25)**: Major overhaul — `useBuildingMaterial` shader patch, 4 instanced attributes (`aWin`/`aTile`/`aState`/`aEmis`), NeonGround procedural shader, Atmosphere Points, post-processing (ChromaticAberration, Noise, SMAA), morph system, roof glow.
