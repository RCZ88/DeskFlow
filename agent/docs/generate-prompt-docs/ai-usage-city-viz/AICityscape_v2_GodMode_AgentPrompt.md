# AICityscape v2 — “God Mode” Overhaul — Agent Implementation Prompt

> Paste this into opencode (or your coding agent) as the task brief. It is the
> authoritative spec. The Notion master plan page has the rationale, asset
> decisions, and human task pool; THIS file is the build instruction set.

## 0. Mission

Replace the current grid-based, box-building cityscape with a **procedurally
generated organic cyberpunk city** that:

1. Uses the **real building GLB models** (currently never loaded) — not boxes.
2. Generates an **organic road network** (highway → arterial → street → alley)
   with irregular blocks, **connected superblocks** (no internal roads), parks,
   and gentle terrain relief — NOT a uniform √N grid.
3. Renders buildings as a **dark PBR shell + emissive window layer** from the
   `2a–2h` night-window textures (drop `1a/1b/1c` photo walls).
4. Shows the **equirectangular sky** (`7a`) and/or `night_sky.hdr` as the actual
   360° background — kill the camera-facing rotating sprite.
5. Cars **follow the road graph and turn at intersections** with simple
   car-following (no overlaps); **traffic lights** at intersections gate them.
6. Utilizes the unused assets (traffic light `8b`, billboards, lane markings
   `3c`, sidewalk `3b`, wet asphalt `3a`).

## 1. Drop-in module: `cityGen.ts`

A tested, framework-agnostic generator is provided (`/cityscape_v2/cityGen.ts`).
It is deterministic (seeded) and returns a `CityLayout`:

```ts
interface CityLayout {
  bounds: { w:number; d:number }
  roads: RoadSegment[]        // {a,b,width,klass,elevated,dir,length}
  buildings: CityBuilding[]   // {id,x,z,y,w,d,rot,height,tier,modelType,dataIndex,blockId,abuts}
  parks: ParkLot[]
  intersections: Vec2[]
  heroIds: string[]
  terrainHeightAt: (x,z)=>number
}
```

Wire it in `cityscape.utils.ts::buildCityModel`: map each AI-usage data row to a
`HeroInput { id, height01, weight }` (height01 = normalized metric, weight =
importance), call `generateCity({ seed, heroes })`, and translate `CityLayout`
into the render model. Keep the seed stable per dataset so the city is
reproducible but reshuffles when data changes.

**Verify first:** `npx tsx cityGen.ts` prints a sanity report. Confirm you see
4 road classes, 3 building tiers, some abutting buildings, parks, terrain range.

## 2. Buildings — use the GLBs (Phase A, highest priority)

- Add a `BUILDING_MODELS` array and **preload** all 7:
  `building-low-a/b`, `building-med-a/b`, `building-tall-a/b/c`. These are
  ground-aligned (minY=0), footprint ~1 unit, height baked in
  (tall-a is 5.47 units). They were missing from `ALL_MODEL_URLS` — that is the
  bug behind “I have seen NO buildings.”
- Render with **one InstancedMesh per GLB sub-mesh+material** (R3F: traverse the
  cloned scene, collect meshes, make an `InstancedMesh` per unique geometry).
  Do NOT use `<primitive>` per building (kills perf + no instancing).
- **Fit to lot:** scale each instance so its footprint = `building.w × building.d`
  and its height ≈ `building.height`. Because the GLB has baked massing
  (setbacks, roof detail), non-uniform scale is acceptable here; clamp the
  vertical scale ratio to avoid grotesque stretch (e.g. 0.6–1.8× of native
  proportion; pick the GLB whose native height is closest, then scale).
- `modelType` from `cityGen` already chooses tier-appropriate GLBs.
- **Superblock abutting:** when `building.abuts`, footprint fills the lot
  (gap=0) so towers share walls → connected megastructure look.
- Keep a lightweight **instanced box fallback** only for `quality:performance`.

## 3. Building facades — emissive windows (Phase B)

- **Drop `1a/1b/1c`** as diffuse (they are low-res photos of plain walls → mush).
- Material = dark PBR shell (`baseColor #0a0c14`, `metalness 0.6`,
  `roughness 0.35`) + **emissive window map** from `2a–2h` (high-res lit-window
  towers). Map `2x` to the emissive channel, tiled **per floor vertically**
  (repeat.y = floors, repeat.x = bays), NOT a tiny 0.3 UV.
- Vary which `2x` each building uses (hash by id) so towers differ; vary
  emissive intensity by a per-building “lit ratio” (some towers darker).
- Optional: subtle fresnel rim for glass. No box-shadow analog; rely on bloom
  (postprocessing) for the glow, keep bloom threshold high so only windows bloom.
- If you want true depth without modeling: add a cheap **parallax/normal** from
  the window map’s luminance so facades read as recessed glass.

## 4. Sky & background (Phase B)

- Remove the `HorizonBand`/`Moon` **sprites** (they face the camera → the
  “rotating 2D city”). 
- Set the scene background to a real 360° env:
  - Preferred: `night_sky.hdr` via `<Environment files="night_sky.hdr"
    background />` (drei) — lights AND shows it.
  - Or load `7a` (equirect skyline) with `THREE.EquirectangularReflectionMapping`
    and assign `scene.background`. Keep HDR for lighting if you split them.
- Add a far distance fog matching the sky’s horizon color so towers fade in.

## 5. Roads (Phase C)

- Build road **ribbons** from `CityLayout.roads`: for each segment, create a
  plane oriented along `dir`, length=`length`, width=`width`.
- **Texture orientation:** the V axis of the lane texture (`3c`, neon lane
  markings) must run **along** the segment direction. Set `repeat.y =
  length / tileLength` and rotate UV so dashes flow with the road. Give EACH
  segment its own material/UV (the current code mutates one shared texture →
  all roads identical — that’s the “wrong direction / all the same” bug).
- Use `3a` wet-asphalt as the road base, `3c` as the lane overlay, `3b`
  sidewalk on the block-inset border. Highways (`elevated:true`) get pillars +
  a raised deck (y from `terrainHeightAt` + clearance).
- Intersections: lay a junction quad; place a **traffic light** (`8b` on a
  `StreetLight` pole or a quad) at each `CityLayout.intersections` point.

## 6. Cars that turn (Phase D)

- Build a **road graph**: nodes = intersections, edges = segments. Each car gets
  a route (random walk over edges). Position = lerp along current edge; at the
  end node, pick a next edge (prefer straight/right) → the car **turns**.
- Heading: `rotation.y = Math.atan2(velX, velZ)` (already correct convention).
- **No overlaps:** 1-D car-following per edge (keep a min headway to the car
  ahead; clamp speed). Stop if the next intersection light is red.
- Widen lanes: cars ride the lane offset of their segment (segment width now
  comes from `cityGen`, much wider than the old 2.2).
- Drop broken GLBs: `car-2`, `car-7` (wrong scale / duplicate). Use
  `car-1/3/4/5`. Optionally scale cars down if “skyscrapers as highlight” mode.

## 7. Props / FX (Phase E)

- Place `StreetLight-2` along arterials; benches + `Tree-2/Tree-3` in parks
  and sidewalks (DROP `Tree-1` — 308-unit scale bug). Billboards (`5b`) on
  tall building faces (anchor to a facade, not floating). Neon arrows `5c` at
  ramps. Keep rain/ember/fog as procedural or use `6a/6b/6c`, `10a/10b/10c`.

## 8. Phasing & acceptance

Implement in order A→E; each phase independently visible:
- **A** GLB buildings + cityGen layout → *real 3D buildings, organic blocks.*
- **B** Emissive window facades + HDR/equirect sky → *no more mush, no rotating bg.*
- **C** Road ribbons w/ correct orientation + sidewalks + intersections.
- **D** Graph-routed cars that turn + traffic lights + no overlap.
- **E** Props, billboards anchored, parks, FX, polish + LOD.

Electron rule reminder: cityGen/material/scene changes are renderer-only (Vite
HMR). If you touch any `ipcMain`/preload bridge, do a FULL electron restart and
rebuild preload.
