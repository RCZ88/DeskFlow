# AICityscape v2 — God Mode rebuild (Phase A: verified generator + scene model)

This package replaces the broken generator with a new, **visually-verified**
procedural city and the scene mapper that feeds the renderer. The top-down
proof render is `city_map.png` (roads, viaduct loop, skyscraper core, sidewalk
trees/lights, parking, signals).

## Files
| File | Status | Drop-in name |
|------|--------|--------------|
| `cityGen.ts` | ✅ Node-verified (`BUILDINGS-IN-ROAD: 0 PASS`) | `src/components/cityscape/cityGen.ts` |
| `buildScene.ts` | ✅ Node-verified (data binding works) | `src/components/cityscape/buildScene.ts` |
| `city_map.png` | top-down proof of the layout | — |

Verify locally: `npx tsx src/components/cityscape/cityGen.ts` and
`npx tsx src/components/cityscape/buildScene.ts`.

## What the new algorithm fixes (and how)
- **No buildings in roads / no “circle through buildings”:** roads are the GAPS
  from recursive block subdivision; a final CARVE pass deletes any footprint
  overlapping a road/viaduct/ramp corridor (audited every run, must be 0).
- **Real skyline:** hero towers (the AI models) are placed on the largest, most
  central surviving lots; height ∝ usage (`height01`). Periphery tapers to
  low/mid blocks + parks. The core reads as downtown.
- **The viaduct goes UP:** the elevated loop is a rectangular corridor at
  radius ~0.66×half with `deckY=7`, **support pillars** every ~14u and **ramps**
  to grade at two corners. Surface traffic never routes onto it.
- **Trees/lights/parking on real sidewalks:** emitted as anchors offset to each
  curb of real road segments (not a √N grid).
- **Signals:** intersections are true axis-aligned road crossings; arterials get
  signals.
- **One source of truth:** `buildScene` carries `label/metricValue/color/active`
  onto hero buildings so the renderer can show token stats per skyscraper.

## AICityscape.tsx integration (Phase A)
1. `buildCityModel` already builds `heroInputs` from real usage — keep that, it
   now drives tower heights. Stop using `layoutGrid()` / `model.buildings` for
   placement; everything comes from `cityLayout` → `buildSceneFromLayout`.
2. Register building GLBs: `import { ALL_BUILDING_MODEL_URLS } from './cityscape/buildScene'`
   and spread into `ALL_MODEL_URLS`.
3. Feed `scene.buildings` to `<InstancedBuildings>`, `scene.roads`/`ramps`/
   `pillars` to the road layer, `scene.signals` to traffic lights,
   `scene.furniture`/`parking` to props, `scene.parks` to parks.

## Remaining R3F work (Phase B–D) — needs in-app verification (no GPU in sandbox)
These are the rendering bugs diagnosed in your current `AICityscape.tsx`:
- **Green buildings:** `InstancedBuildings` draws each GLB with its raw shared
  `colormap` atlas and never attaches `useBuildingMaterial()`. Fix: apply the
  emissive-window material (or at least per-instance tint from `color`), and
  drive lit windows from `floors`. The flat green = unlit shared atlas.
- **HDR sky:** `<Environment files="night_sky.hdr" background={false}>` — set
  `background` true (or render the 7a equirect on a large back-sphere) and
  DELETE the camera-facing `HorizonBand`/`Moon` sprites (the “square rotating”).
- **Cars wrong-way/standing:** use `ASSET_META` in `buildScene.ts` — apply each
  model’s `rotX` (car-1/5/6 are Z-up), drop car-2/car-7, clamp speed, and route
  on `scene.carGraph` (surface only). Add parked cars from `scene.parking`.
- **Torch lights:** `StreetLight-2` is authored lying down (`rotX:-PI/2`); use
  `StreetLight-1` upright for sidewalk lights.
- **Road textures:** map 3a asphalt + 3c neon lanes (V along segment) + 3b
  sidewalk per `RoadRibbon`; build the viaduct deck as extruded geometry at
  `center.y` with the pillars beneath.
