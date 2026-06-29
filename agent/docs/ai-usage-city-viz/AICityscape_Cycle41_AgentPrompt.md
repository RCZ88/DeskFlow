# AICityscape — Cycle 41 Fix Spec & Agent Prompt

**Purpose:** Fix proportions, car logic, asset usage, roads, signs, and performance.
**Source of truth:** Every model below was measured from the actual GLB files (bounding box, model units). Trust these numbers.

---

## MEASURED MODEL DIMENSIONS (bounding box, in model units)

| Model | size X | size Y (height) | size Z | Notes |
|---|---|---|---|---|
| car-1 | 2.67 | 1.87 | 5.66 | meters, OK. forward = +Z |
| car-2 | 230 | 117 | 489 | **CENTIMETERS — ~100x too big. DROP (high poly).** |
| car-3 | 2.11 | 1.53 | 4.21 | meters, OK |
| car-4 | 1.78 | 1.24 | 3.73 | meters, OK |
| car-5 | 1.79 | 1.27 | 4.32 | meters, OK |
| car-6 | 2.52 | 2.92 | 6.50 | pivot sunk 1.33 below base (normalizer fixes) |
| car-7 | 230 | 117 | 489 | **CENTIMETERS — same model as car-2. DROP.** |
| StreetLight-1 | 0.27 | 0.96 | 0.07 | too small / low detail |
| StreetLight-2 | 1.45 | 5.19 | 0.34 | correct ~5m lamppost. PREFER THIS |
| Bench-1 | 0.32 | 0.47 | 0.72 | small |
| Bench-2 | 2.51 | 1.62 | 1.23 | OK |
| Tree-1 | 308 | 509 | 324 | **CENTIMETERS — ~100x too big** |
| Tree-2 | 1.89 | 2.48 | 2.77 | small tree |
| Tree-3 | 5.80 | 10.24 | 5.37 | big tree (high poly, 2.2MB) |
| building-low-a | 0.84 | 1.29 | 0.90 | small units, scale UP |
| building-low-b | 0.97 | 1.29 | 0.94 | small units |
| building-med-a | 0.88 | 1.29 | 1.01 | small units |
| building-med-b | 0.84 | 1.69 | 1.03 | small units |
| building-tall-a | 1.28 | 5.47 | 1.39 | small units |
| building-tall-b | 1.36 | 4.48 | 1.36 | small units |
| building-tall-c | 1.28 | 4.08 | 1.39 | small units |
| road.glb | 1.00 | 0.02 | 1.00 | flat 1x1 tile, OK for tiling |

**Key facts**
- All cars' LONG axis = Z, so model forward = **+Z**.
- Models are in **MIXED unit systems** (some meters, some centimeters). Never assume a uniform scale.
- The current normalizer scales by `max(sizeX, sizeZ)` (footprint) for everything — this is why the lamppost is ~12 units tall (footprint 1.45 normalized to 3.5 = 2.4x, height 5.19*2.4). Vertical objects MUST normalize by HEIGHT.
- Car heading code currently has X-lane and Z-lane rotations SWAPPED → cars drive sideways.
- The pink/white diagonal striped ground = the procedural `NeonGround` shader grid (not a road texture).
- The `3c` lane texture has lane lines along its U (horizontal) axis; on cross-axis roads they get rotated 90deg and run across the road = wrong direction.

---

## AGENT PROMPT (paste everything below)

TASK: Fix proportions, car logic, asset usage, roads, and performance in AICityscape. Use the EXACT measured model dimensions in this document. Keep the instanced box buildings for DATA (activity window lighting) but use the GLB buildings for the surrounding skyline.

### FIX 1 — Normalize by the CORRECT axis (root cause of all proportion chaos)
The current normalizedClone uses max(sizeX,sizeZ) for everything — wrong for tall objects. Add an axis parameter:

```tsx
type RefAxis = 'height' | 'length' | 'footprint'
function normalizedClone(scene: THREE.Object3D, target: number, ref: RefAxis = 'footprint') {
  const clone = scene.clone(true)
  const box = new THREE.Box3().setFromObject(clone)
  const size = new THREE.Vector3(); box.getSize(size)
  const center = new THREE.Vector3(); box.getCenter(center)
  const dim = ref === 'height' ? size.y
            : ref === 'length' ? Math.max(size.x, size.z)
            : Math.max(size.x, size.z)
  const s = target / Math.max(dim, 1e-4)
  clone.scale.setScalar(s)
  clone.position.set(-center.x * s, -box.min.y * s, -center.z * s) // recenter X/Z, base on y=0
  const g = new THREE.Group(); g.add(clone); return g
}
```

Apply with REAL-WORLD targets (meters):
- Cars: normalizedClone(scene, 4.5, 'length')   // ~4.5m long regardless of source unit
- Trees: normalizedClone(scene, 6.0, 'height')  // ~6m tall
- Street lights: normalizedClone(scene, 5.0, 'height')  // PREFER StreetLight-2; StreetLight-1 is too low-detail when blown up
- Benches: normalizedClone(scene, 1.8, 'length')
- Decorative buildings: normalizedClone(scene, tierHeight, 'height')  // low=9, med=15, tall=26

This auto-corrects the centimeter models (car-2, car-7, Tree-1). After applying, log each placed object's world-space bounding-box height and confirm: lamp (~5m) < tree (~6m) < buildings.

### FIX 2 — Car direction + real traffic logic
2a. HEADING IS SWAPPED. Cars are long along +Z. Replace per-lane rotation with velocity-based heading so it can never be wrong:
```
const heading = Math.atan2(velX, velZ)   // velX/velZ = this frame's movement vector; forward is +Z
child.rotation.y = heading
```
If a car visibly drives backwards, add Math.PI to that model's heading offset (per-model constant, default 0).

2b. Build a real lane network (not orbiting/random):
- Roads = grid mid-lines (pitch 11). Each road has 2 lanes (one per direction), offset to the right-hand side (lane offset ~ +/-1.0 from centerline). Cars drive on the correct side.
- Each car has { roadId, dir, distance }. distance += speed*dt; wrap at grid extent.
- CAR-FOLLOWING (no overlaps/collisions): per lane, sort cars by distance. Each car computes gap to the car ahead. Use a simple IDM-style rule:
  a = max(-bMax, min(aMax, accel * (1 - (v/vCruise)^4 - (safeGap/gap)^2)))
  with safeGap ~ carLength*1.6. Decelerate when gap small, accelerate toward cruise otherwise.
- INTERSECTIONS + RED LIGHTS: at each grid crossing keep an intersection cell. A global signal phase flips N-S vs E-W every ~6s (+1s all-red). A car within stopping distance of an intersection whose phase is RED, or whose intersection cell is occupied, sets target speed 0. Release when green and clear.
- Spawn cars spaced out along lanes (deterministic, no two at same distance) so none spawn on top of each other.

### FIX 3 — Use the GLB buildings + stop square data-boxes
3a. SURROUNDING SKYLINE: place a field/ring of decorative GLB buildings (building-low-a/b, building-med-a/b, building-tall-a/b/c) OUTSIDE the data city, on the same pitch grid, normalized by height to tiers (low 9 / med 15 / tall 26), random rotation in 90deg steps, deterministic model pick by cell hash. INSTANCE them (see FIX 6) — do not Clone 100 scenes.
3b. DATA BOXES are all square (footprint = f for width and depth). Give them rectangular footprints: derive width and depth separately, e.g. w = f * (0.7..1.3 by hash), d = f * (0.7..1.3 by a different hash), then dummy.scale.set(w, height, d). Vary so blocks look like real lots, not cubes.

### FIX 4 — Streets: kill the checkerboard, fix road texture direction
4a. The pink/white diagonal striped ground is the NeonGround procedural shader grid. Turn it OFF or down to near-black: base #06070d, grid-line contribution <= 0.05, no pink/yellow traffic colors on the full plane. Ground should read as dark pavement.
4b. Build the road network from road.glb tiles (1x1 flat) laid along grid mid-lines and at intersections, normalized to road width (~3.5). Non-stretched, correct roads.
4c. If using textured plane strips instead: the 3c lane texture has lane lines along its U (horizontal) axis. Lines MUST run ALONG travel direction. For roads running along Z, rotate the texture 90deg (or swap repeat.x/repeat.y) so lanes run lengthwise. Set tex.wrapS=wrapT=RepeatWrapping, tex.anisotropy=8, repeat ONLY along road length (repeat = [1, length/roadWidth]). CLONE the texture per orientation so the two directions don't fight over one repeat setting.

### FIX 5 — Signs flush on walls (no floating arrows)
Mount each sign flat against a building's actual wall face: position = building center + faceNormal * (halfWidthOnThatAxis + 0.05), at a height within the building's height range, rotation.y = the wall normal's yaw. Use the building's REAL (rectangular) footprint half-extent for the offset so the sign sits ON the wall, not floating. Arrows (5c) sit on a wall or a pole, never mid-air.

### FIX 6 — Performance (currently 5 FPS — the big one)
Root causes: ~74 full GLB scene CLONES (no instancing), high-poly models (car-2/car-7 1.8MB each in cm, Tree-3 2.2MB, car-6 2.2MB), frustumCulled={false} everywhere, volumetric <Clouds>, MeshReflectorMaterial, 2048 shadow maps, Bloom — all on at once with quality tiers that do nothing.
6a. INSTANCE everything repeated: THREE.InstancedMesh (or drei <Instances>/<Merged>) per model — one mesh per car model, per tree model, per building tier. For moving cars, keep an InstancedMesh and write each car's matrix in useFrame (setMatrixAt + instanceMatrix.needsUpdate). Replaces ~74 draw calls with ~10.
6b. DROP the centimeter high-poly duplicates: car-2 and car-7 are the same 489-unit Lambo. Exclude from the car pool (use car-1,3,4,5). Huge poly counts for no benefit.
6c. Remove frustumCulled={false} so off-screen objects cull.
6d. Make quality tiers REAL and gate the expensive stuff:
- performance: no shadows, no <Clouds>, no MeshReflectorMaterial, Bloom off, dpr=1, fewer cars (12) + fewer decorative buildings.
- balanced: shadows 1024, light bloom, dpr<=1.5, no reflector.
- cinematic: shadows 2048, clouds, reflector, full bloom, dpr<=2.
Wire these to actually mount/unmount components, and cap renderer DPR via <Canvas dpr={...}>.
6e. Dispose cloned geometries/materials on unmount to stop leaks.

### WHAT THE AGENT MUST REPORT IF STILL WRONG
The only thing not determinable from the files is whether a given car model's forward is +Z or -Z (bounding box is symmetric). Default to +Z; if a car drives in reverse, add Math.PI to that model's heading offset. Report which models needed the flip.

### VERIFY (all must pass)
1. Lamp (~5m) < tree (~6m) < buildings; cars ~4.5m long. No giant lambo, no giant tree.
2. Cars face the direction they move; they queue with gaps, stop at red lights, never overlap.
3. GLB skyline buildings visibly surround the data boxes; data boxes have rectangular (non-square) footprints.
4. Ground is dark pavement with road.glb roads whose lane lines run ALONG travel direction. No pink/white checkerboard.
5. Signs flush on walls, no floating arrows.
6. FPS: report cinematic vs performance FPS — they must differ, and performance must be smooth.

---

## OPTIONAL (only if time) — extra cyberpunk flavor
Quaternius Downtown City MegaKit and Cyberpunk Game Kit (both CC0). Pick 1-2 extra buildings/props, drop into models/, and route through normalizedClone('height') like the others. Skip if short on time — the fixes above are what matter.
