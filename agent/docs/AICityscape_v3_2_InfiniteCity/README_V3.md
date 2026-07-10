# AICityscape v3.2 — Neon Cyberpunk RADIAL Metropolis (drop-in package)

Stylized, not realistic — dark buildings whose only color is **neon glow**, driven
by **bloom**. v3.2 fixes the two things that still looked off in v3.1: the
**floating flat slab** and the **flat, low-detail buildings up close**. Everything
is still procedural (no image/model files) and connects to nothing.

## What changed from v3.1 -> v3.2
| Problem in v3.1 | Fix in v3.2 |
| --- | --- |
| Ground was a flat square slab with a hard edge — looked like it floated | **Infinite ground**: circular disc that **dissolves to the void/fog color** at the rim; matched fog + void horizon so edges sink into darkness (endless-space feel) |
| Ground had no art | **Energy rings + radial spokes + tech noise + a glow pool** under the downtown core |
| City looked ungrounded | **Contact-shadow grounding** plants the city on the floor |
| Buildings were flat boxes up close | **Parallax interior windows** (fake 3D rooms), **surface relief** (bump-recessed frames), **glass vs concrete material split** |
| Windows stretched on big towers | **World-unit window tiling** (consistent real window size everywhere) |

---

## The advanced techniques used (researched) and WHY they fit our budget
All of these are shader-only or single-pass, so they add detail **without** the
realism-version fragility (no GLB models, no unique geometry, no asset pipeline).

1. **Parallax interior mapping** (Joost van Dongen's "interior mapping" + the
   *Procedural Window Lighting Effects for Real-Time City Rendering* paper).
   A tangent-space view ray fakes room depth behind each lit window — bright back
   wall, darker side walls, floor gradient — and parallax-shifts as you orbit.
   Entirely in the fragment shader, so the whole city stays **one draw call**.
2. **Derivative cotangent-frame relief (bump)** — window frames are recessed so the
   moon key light + IBL catch the facade; no normal-map texture needed.
3. **Per-material split** — glass = smooth + metallic (reflects neon/IBL), concrete
   = rough + matte. Surfaces now respond to light instead of looking like plastic.
4. **Infinite ground via color dissolve** — the community-standard trick: fade the
   floor into the fog/background color so there's no visible edge.
5. **Contact shadows** (drei) — cheap soft grounding, rendered once (`frames=1`).
6. **Fog + void horizon** — far skyline and ground melt into darkness = depth.

**Still OUT (the realism trap):** SSR beyond the wet floor, volumetric god-rays,
real GI, per-building unique geometry / GLB models, tessellated displacement,
cubemap interior textures, anything needing asset files or a connector.

> Want even more crevice darkness later? Add SSAO/N8AO as a single post pass
> gated to Ultra — it's the one extra lever documented for future headroom.

---

## Graphics settings (Low / Medium / High / Ultra)
A small **GRAPHICS** menu (top-left) switches presets; the choice persists to
`localStorage`.

| Preset | DPR | Shadows | Contact shadow | Reflections | Bloom | Cars | Stars |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Low | 1.0 | off | off | off | 0.7 | 28 | off |
| Medium | 1.25 | off | on | 128px | 0.9 | 50 | on |
| High (default) | 1.5 | on | on | 256px | 1.0 | 70 | on |
| Ultra | 2.0 | on | on | 512px | 1.15 | 100 | on |

```tsx
<CityScene heroes={heroes} />                                  // menu shown, saved preset
<CityScene heroes={heroes} quality="low" showGraphicsMenu={false} /> // force + hide menu
```

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
proceduralTextures.ts  canvas car underglow sprite (no asset files)
cityMaterials.ts       procedural facade: interior windows + relief + material split
InstancedSkyline.tsx   whole city in ONE InstancedMesh + click picking + uTime + aSize
HeroOverlays.tsx       neon roofline (rotated) + floating labels for heroes
Ground.tsx             INFINITE circular ground: fade-to-void + art + wet reflection
SkyDome.tsx            gradient night sky (void horizon) + stars
CityLighting.tsx       tuned fog + cool key + capped neon point lights + IBL
CityPostFX.tsx         UnrealBloom + vignette + SMAA (toggle/intensity from settings)
CityCars.tsx           ORBIT traffic + code-generated underglow
StatsPanel.tsx         DOM stats card on hero click
graphicsPresets.ts     quality presets + localStorage load/save
GraphicsMenu.tsx       in-scene Low/Medium/High/Ultra picker
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
// optional IBL reflections from your HDR (NOT background):
// <CityScene heroes={heroes} hdrFile="/cyber_assets/hdri/night_sky.hdr" />
```

## 3) DELETE the old system
Remove/stop rendering the realism build: `InstancedBuildings.tsx` (silver-GLB bug),
old `RoadNetwork`/viaduct/ramps/pillars, `RooftopSigns`/`NeonSigns` reading
`model.buildings`, `HorizonBand`/`Moon`, and any `<Environment ... background>`.
`CityScene` replaces all of it.

---

## Tuning knobs
- **Quality:** GRAPHICS menu / `quality` prop / edit `graphicsPresets.ts`.
- **Infinite fade:** `Ground.tsx` — `floorR` (disc size) and the `fade` smoothstep.
- **Fog depth:** `CityLighting.tsx` `fogDensity` (0.0012 clearer – 0.0022 moodier).
- **Window size / interior depth:** `cityMaterials.ts` — the `3.4`/`4.2` cell sizes
  and the `0.35` parallax depth scale.
- **Density / size:** `<CityScene rings={10} />` (try 8–14).
- **Glow:** preset `bloomIntensity` + `luminanceThreshold` in `CityPostFX.tsx`.

## Build order (each independently verifiable)
1. `palette` + `cityMaterials` -> one dark tower: lit windows with **parallax room
   depth**, recessed frames catching the key light, glass specular. Orbit it — the
   window interiors should shift.
2. `metropolis` + `InstancedSkyline` -> full RADIAL city, ~1–3 draw calls, 60fps.
3. `SkyDome` + `Ground` + `CityLighting` -> **no visible ground edge**; corners
   sink into darkness; glow pool under the core; wet reflection in the center.
4. `ContactShadows` -> city is planted, not floating.
5. `CityPostFX` + `GraphicsMenu` -> bloom; presets change cost live.
6. `HeroOverlays` + `StatsPanel` + `CityCars` -> labels, click stats, orbit traffic.

See `concept_frame.png` (target look) and `concept_board.png` (palette + textures).

## Connectors / cost
**None. Everything is free and offline.** Only npm add is `@react-three/postprocessing` (MIT).
