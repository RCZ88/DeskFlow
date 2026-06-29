# AICityscape v2 — Phase A drop-in (cityGen + GLB buildings)

Three new files under `src/components/cityscape/`. The first two are
**Node-tested and `tsc --strict` clean**; the third is reviewed R3F reference
code that needs in-app verification (no GPU/three in the build sandbox).

| File | Status | Role |
|------|--------|------|
| `cityGen.ts` | ✅ tested in Node | seeded BSP city layout generator (pure data) |
| `buildScene.ts` | ✅ tested in Node | maps `CityLayout` → instance transforms (`SceneModel`) |
| `InstancedBuildings.tsx` | ⚠️ needs in-app check | renders the 7 building GLBs as GPU instances |

Verify the generators yourself:
```bash
npx tsx src/components/cityscape/cityGen.ts
npx tsx src/components/cityscape/buildScene.ts
```

## Self-test output (seed 20260629, 9 hero towers)
```
roads     : 52  { highway: 29, arterial: 3, street: 12, alley: 8 }
buildings : 72  tiers: { low: 40, med: 21, tall: 11 }
parks     : 2     intersections: 31     heroes: 9
terrain y : -1.6 .. 2.0     heights: 2.2 .. 29.8
determinism: PASS    seed variance: PASS
```
Tune via `generateCity({ seed, size, maxDepth, minBlock, parkRatio, superRatio, terrainAmplitude, heroes })`.

## Wiring into AICityscape.tsx (Phase A)

**1. Register the building GLBs** (root cause #1 — they were never loaded).
Add to the model URL list:
```ts
import { ALL_BUILDING_MODEL_URLS } from "./cityscape/buildScene"
const ALL_MODEL_URLS = [
  ...CAR_MODELS, ...BENCH_MODELS, ...LIGHT_MODELS, ...TREE_MODELS,
  ...ALL_BUILDING_MODEL_URLS, // <-- add
]
```

**2. Rewrite `buildCityModel`** to use the generator instead of `layoutGrid()`:
```ts
import { buildScene } from "./cityscape/buildScene"
// derive hero towers from your real AI-usage data (top models by weight):
const heroes = topModels.map((m, i) => ({ id: m.id, weight: m.weight ?? 100 - i }))
const scene = buildScene({ seed, heroes }) // SceneModel
```
Feed `scene.buildings` to `<InstancedBuildings>`, and (later phases)
`scene.roads` → Roads, `scene.trafficLights` → lights, `scene.parks` → Props.

**3. Replace the BoxGeometry `InstanceBuildings`** in `CityScene` with:
```tsx
import InstancedBuildings from "./cityscape/InstancedBuildings"
<AssetBoundary><Suspense fallback={null}>
  <InstancedBuildings buildings={scene.buildings} />
</Suspense></AssetBoundary>
```

**4. Delete the perfect-grid path** (root cause #2): stop calling `layoutGrid()`
and stop drawing a road per gridline in `RoadGrid`. Roads come from
`scene.roads` in Phase C.

## Notes / boundaries
- `InstancedBuildings` measures each GLB's real `Box3` and fits it to the
  lot's `fit = [w, h, d]`, grounding the base on the terrain. So it's robust
  to whatever the authored GLB scale is — no hard-coded native sizes.
- Tall towers are reached by Y-scaling a single GLB; the `floors` field on each
  instance lets the Phase B window-tiling hide vertical stretch. If stretch
  looks bad, switch to floor-stacking in Phase B.
- Confirm the 7 GLBs exist at `/cyber_assets/models/building-{low,med,tall}-*.glb`.
  If any 404s, that model's group just renders nothing (boundary-safe).
- Phases B–E (emissive windows + HDR sky, per-segment roads, traffic graph,
  props/FX/LOD) are unchanged from the plan and build on `SceneModel`.
