# AICityscape v3.1 — Neon Cyberpunk RADIAL Metropolis (drop-in package)

Stylized, not realistic — dark buildings whose only color is **neon glow**, driven
by **bloom** (the Git City / SynthCity look). v3.1 keeps that winning approach and
adds the quality that was missing, **without** the fragility that sank the realism
version. All 2D assets are generated in code (canvas). You ship no image files and
connect nothing.

## What changed from v3 -> v3.1
| Area | v3 | v3.1 |
| --- | --- | --- |
| Layout | square block grid | **RADIAL** concentric rings; buildings **oriented tangentially** around a downtown core |
| Shaders | flat emissive windows | **fresnel rim light** + **vertical gradient** + **GPU hero pulse** (all still 1 draw call) |
| Ground | grid lines | **wet reflective floor** (MeshReflectorMaterial) + **radial** ring/spoke grid |
| Sky | flat color | **gradient sky dome** + faint stars + horizon glow |
| Cars | lane-following (buggy) | **orbit traffic** — pure angular motion, zero flipped/stuck cars |

---

## The complexity boundary (why this won't repeat the realism problem)
**IN (cheap, high-impact, hard to break):**
- Radial layout — pure trig, deterministic, node-tested.
- Fresnel + gradient + hero pulse — a few lines of GLSL inside the SAME instanced
  material, so the whole skyline is still **one draw call**.
- Reflections — cheap here precisely because the skyline is 1 draw call, at 256px + blur.
- Sky dome — one unlit sphere + one shader.
- Orbit cars — angular math, so cars physically cannot end up upside-down or stuck.

**OUT (deliberately excluded — this is the trap that killed realism):**
- ❌ SSR / real reflections beyond the floor  ❌ volumetric god-rays
- ❌ real GI / baked lightmaps               ❌ per-building unique geometry or GLB models
- ❌ depth-of-field                          ❌ anything that needs asset files or a connector

If you ever need more, raise `rings` and bloom — not geometry complexity.

---

## 0) Install the one dependency
```bash
npm i @react-three/postprocessing
# three, @react-three/fiber, @react-three/drei should already be present
```

## 1) Drop in `src/`
Copy to `src/components/cityscape/v3/`:
```
palette.ts             color truth + data->neon mapping
metropolis.ts          RADIAL city generator (rings, tangential orientation)
proceduralTextures.ts  canvas window mask + car underglow (no assets)
cityMaterials.ts       instanced neon material + fresnel + gradient + pulse
InstancedSkyline.tsx   whole city in ONE InstancedMesh + click picking + uTime
HeroOverlays.tsx       neon roofline (rotated) + floating labels for heroes
Ground.tsx             reflective wet floor + radial ring/spoke grid
SkyDome.tsx            gradient night sky + stars
CityLighting.tsx       fog + cool key + capped neon point lights + IBL(reflection only)
CityPostFX.tsx         UnrealBloom + vignette + SMAA
CityCars.tsx           ORBIT traffic + code-generated underglow
StatsPanel.tsx         DOM stats card on hero click
dataAdapter.ts         map overview.aiUsage.byTool -> HeroInput[]
CityScene.tsx          top-level composition (mount THIS)
index.ts               barrel exports
```

## 2) Mount it
```tsx
import { CityScene, toHeroes } from '@/components/cityscape/v3'

const heroes = toHeroes(overview.aiUsage.byTool.map(r => ({
  id: r.id, label: r.label, tokens: r.tokens,
  sessions: r.sessions, cost: r.cost, active: r.active,
})))

<CityScene heroes={heroes} seed="deskflow" rings={10} />
// weak GPU? -> <CityScene heroes={heroes} reflections={false} />
// optional IBL reflections from your HDR (NOT background):
// <CityScene heroes={heroes} hdrFile="/cyber_assets/hdri/night_sky.hdr" />
```

## 3) DELETE the old system
Remove/stop rendering: `InstancedBuildings.tsx` (silver-GLB bug), old `RoadNetwork`/
viaduct/ramps/pillars, `RooftopSigns`/`NeonSigns` reading `model.buildings`,
`HorizonBand`/`Moon`, and any `<Environment ... background>`. v3.1 `CityScene`
replaces all of it.

---

## Tuning knobs
- **Density / size:** `<CityScene rings={10} />` (try 8–14).
- **Glow:** `CityPostFX intensity` (0.8–1.3) + `luminanceThreshold`.
- **Reflections:** `reflections={false}` to disable; or raise `resolution` in `Ground.tsx` for sharper (costlier) reflections.
- **Layout shape:** `metropolis.ts` opts — `ringGap`, `arc` (lot size), `falloff` (core steepness), `spokeCount`.
- **Hero dominance:** the `46 + height01 * maxHeight*1.25` line in `metropolis.ts`.

## Build order (each independently verifiable)
1. `palette` + `proceduralTextures` + `cityMaterials` -> one dark tower, glowing windows, fresnel edge.
2. `metropolis` + `InstancedSkyline` -> full RADIAL city, ~1–3 draw calls, 60fps (bloom off). Confirm rings, not a grid.
3. `SkyDome` + `Ground` + `CityLighting` + `CityPostFX` -> matches concept frame; reflections in the floor; >=45fps.
4. `HeroOverlays` + `StatsPanel` + picking -> labels + click-to-stats.
5. `CityCars` -> smooth glowing traffic rings, no upside-down cars.

See `concept_frame.png` (target look) and `concept_board.png` (palette + code-
generated textures).

## Connectors / cost
**None. Everything is free and offline.** Only npm add is `@react-three/postprocessing` (MIT).
