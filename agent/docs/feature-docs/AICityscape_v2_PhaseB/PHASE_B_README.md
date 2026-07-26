# AICityscape v2 — Phase B: textures, lighting, cars, labels (CYCLE 79 input)

This package fixes the issues from CYCLE 78: silver/untextured buildings, dark
scene, photo-HDR backdrop, broken cars, no data labels, and lingering “streets
through buildings / floating / cars on trees”.

## The real root causes (verified against the actual assets, not guessed)
| Symptom | Real cause | Fix |
|--------|-----------|-----|
| Buildings **silver / no texture** | The building GLBs reference an **external `Textures/colormap.png` that is NOT in the asset pack** (`textures/` is empty). GLTFLoader loads no map → bare grey material. `setColorAt` was never the issue. | Build the skyline from **textured boxes** using the real 2D textures (facade `1a-1c` + emissive windows `2a-2h`). See `cyberCityMaterials.ts` + `CityBuildings.tsx`. |
| **Very dark / not cyberpunk** | Only the HDR lit the scene; no neon, no bloom. | `CityEnvironment.tsx`: hemisphere + moon key + colored fills, **Bloom**, ACES exposure 1.25. |
| **Photo HDR as backdrop** | `night_sky.hdr` is a real night-plaza photo — wrong as a literal sky. | Use HDR for **IBL only** (`background=false`); show the cyberpunk equirect `7a` on a back-side sphere. |
| **Cars wrong-facing / standing / circling / insane speed** | `car-1/5/6` are authored **Z-up** and need an X-rotation that a single transform can’t combine with heading; cars were also routed onto the ring. | `TrafficSystem.tsx`: outer group = heading (Y), inner group = `ASSET_META.rotX`; clamp speed; traverse SURFACE `carGraph` only; drop `car-2/car-7`. |
| **No data vs decoration / no labels** | Hero data never reached the renderer as text. | `CityBuildings.tsx` hero towers carry neon tint + crown + **billboard label (model name + token count + live dot)**; decoration is dimmer/instanced. |
| **Streets into buildings / floating / cars on trees** | Leftover OLD systems still rendering (`layoutGrid()`/`model.buildings`, old `RoadNetwork`, furniture on a √N grid). The new generator self-audits `BUILDINGS-IN-ROAD: 0 PASS`. | Render EVERYTHING from `cityLayout → buildSceneFromLayout`. **Delete** the old building/road/furniture render paths (see below). |

## Files (drop into `src/components/cityscape/`)
- `cyberCityMaterials.ts` — facade + emissive-window + road materials.
- `CityBuildings.tsx` — replaces `InstancedBuildings.tsx`.
- `CityEnvironment.tsx` — `CitySky`, `CityLighting`, `CityIBL`, `CityPostFX`.
- `TrafficSystem.tsx` — `MovingCars`, `ParkedCars` (replaces TrafficCarsV2).
- `RoadNetwork.tsx` — textured surface roads + viaduct deck + pillars + ramps.

## CityScene wiring
```tsx
const tx = useLoadedCyberTextures()      // from loadCyberAssets()
const scene = useMemo(() => buildSceneFromLayout(cityLayout), [cityLayout])
return (<>
  <CitySky textures={tx} />
  <CityLighting />
  <CityIBL />
  <RoadNetwork scene={scene} textures={tx} />
  <CityBuildings buildings={scene.buildings} textures={tx} />
  <SidewalkFurniture furniture={scene.furniture} />   {/* anchors, y = ground */}
  <TrafficLights signals={scene.signals} />
  <MovingCars scene={scene} count={26} />
  <ParkedCars parking={scene.parking} />
</>)
// <CityPostFX/> at the <Canvas> root (or inside, once).
// <Canvas gl= toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.25  shadows>
```

## MUST DELETE (these cause the remaining “mess”)
- Any render of `model.buildings` / `layoutGrid()` (RooftopSigns/NeonSigns/old buildings).
- The previous `InstancedBuildings` GLB path (silver) and the old flat `RoadNetwork`.
- `HorizonBand` / `Moon` sprites and `background={true}` on `<Environment>`.
- Furniture/cars placed on a √N grid — use `scene.furniture` / `scene.parking` only.

## Deps
`@react-three/drei` (Text, Billboard, Environment, useGLTF) and
`@react-three/postprocessing` (Bloom, Vignette). Both are standard R3F deps.

## Optional follow-up
If you want the low-poly GLB buildings back as decoration, ship a
`public/cyber_assets/models/Textures/colormap.png` (the KayKit palette atlas the
GLBs expect) — then they’ll texture instead of rendering silver.
