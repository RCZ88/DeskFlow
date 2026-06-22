## Raw Request

> "properly visualized — textures, roads, etc."
> "i want it to feel alive"
> "the buildings are just black"
> "neon, textures, roads, everything. make it look like a proper visualization not a black void"
> cyberpunk-style aesthetic, make it feel alive

## Context Bundle

Read `agent/docs/ai-usage-city-viz/CONTEXT_BUNDLE_VISUAL_OVERHAUL.md` first. It contains the current source code, data shapes, and all implementation details.

## Problem Statement

The AI Usage Cityscape works structurally — buildings render at correct heights, layout follows golden-angle spiral, view modes switch, hover/click work. But visually it's dead: buildings are solid dark boxes (`#0a0e18`) with no surface detail, the ground is a featureless dark plane, and there's no sense of a living city. The canvas-generated window texture pool exists in `cityscape.utils.ts` but is never applied. The scene lacks neon accents, roads, emissive trim, particle effects, and any cyberpunk atmosphere that would make the data visualization feel like a real place.

## Engineering Task

Design a complete visual overhaul for the AICityscape component. You are the Lead Designer and Engineer. Propose a single comprehensive solution.

### Data Processing Pipeline
- How to apply `getWindowTexture(litRatio, tint)` to building faces — suggest geometry approach (face-level UV mapping on boxGeometry, custom MeshPhysicalMaterial with emissive map, or replacing boxGeometry with BufferGeometry that has per-face UVs)
- How to generate road network geometry between buildings (simple grid based on spiral layout bounds? Voronoi? manual lanes?)
- Lit ratio per building: map `active` flag or metric value to window illumination density (0.1–0.9 range)
- Building neon edge trim: how to add thin emissive strips to building edges (extra geometry? custom shader on the instancedMesh?)
- Performance budget: InstancedMesh must stay as single draw call. Road geometry can be separate merged geometry. Particles in a single Points instance.

### Visual Specification
- **Building materials:** Replace `meshStandardMaterial({ color: '#0a0e18' })` with a material that shows surface detail. Propose exact hex codes, metalness/roughness values, emissive colors, and emissiveIntensity.
- **Window textures:** Wire `getWindowTexture()` into the scene. Describe where and how (custom geometry with UVs? ShaderMaterial uniform? Post-processing overlay?)
- **Roads:** Design road geometry — color (#____?), lane markings (dashed lines via separate geometry?), glow effect on lanes. Positioned as grid or organic flow between building clusters.
- **Neon accents:** Building edge trim color/intensity, rooftop neon signs, ground grid lines. Exact hex codes and emissive values.
- **Ground plane:** Replace `meshStandardMaterial({ color: '#04060c' })` with reflective/emissive ground. Grid lines? Wet reflection? Hex values.
- **Atmosphere:** Fog density/color adjustment. Additional particles (rain? smog with glow? floating data particles?).
- **Post-processing:** Current Bloom+Vignette+ToneMapping. Should luminanceThreshold/intensity change? Add ChromaticAberration? Add Scanlines or Grid overlay?

### Interaction Flow
- Hover highlight: currently 1.2x instanceColor — should building emit more glow on hover instead?
- Click selection: currently 1.4x instanceColor + DetailPanel — should selected building have animated pulse or emissive highlight?
- View mode switch: currently full rebuild of all instances. Could animate transition?
- Time-lapse: currently instant swap. Could morph building heights smoothly?

## Constraints

- Must stay in `AICityscape.tsx` (R3F component) and `cityscape.utils.ts` (pure utils) — no changes to IDEProjectsPage.tsx or any app-level files
- All Three.js objects created in JSX — R3F handles dispose lifecycle automatically
- Canvas performance: locked to 60fps on integrated GPU. InstancedMesh must stay as single draw call. Additional geometry must use merged/instanced approaches
- No external texture files — all textures must be canvas-generated (like `getWindowTexture`)
- No external NPM packages — only `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`
- Files are CRLF, preserve line endings
- Import path for utils: `'./cityscape.utils'`

## Output Format

Return a single markdown document with:

1. **Architecture changes** — what changes in each file, line numbers
2. **Material spec** — exact THREE.js material configs for each element (buildings, roads, ground, neon trim)
3. **Texture strategy** — how window textures and any generated textures connect to geometry
4. **Road geometry** — generation approach, positioning math
5. **Atmosphere spec** — fog/particles/post-processing config
6. **Interaction polish** — hover/click animation enhancements
7. **Code blocks** — exact code for every changed function/component, with imports
