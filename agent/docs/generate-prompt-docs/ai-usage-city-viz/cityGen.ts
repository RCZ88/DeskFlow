/* ============================================================================
 * cityGen.ts — Procedural cyberpunk city layout generator
 * ----------------------------------------------------------------------------
 * Framework-agnostic & deterministic (seeded). Produces an organic city:
 *   - road hierarchy (highway -> arterial -> street -> alley) via recursive
 *     OBB block subdivision (CityEngine-style), NOT a uniform grid
 *   - irregular blocks of varied size; some are "superblocks" (buildings abut,
 *     no internal roads) and some are parks/plazas
 *   - parcels (lots) inside each block; one building per lot
 *   - data-driven HERO towers placed on the largest, most central lots
 *   - gentle terrain relief + an elevated ring highway
 *   - intersection list (for traffic lights) and per-building GLB model choice
 *
 * The renderer consumes CityLayout; it never needs to know how it was built.
 * Run directly (tsx cityGen.ts) to print a sanity report.
 * ========================================================================== */

export interface Vec2 { x: number; z: number }

export type RoadClass = 'highway' | 'arterial' | 'street' | 'alley'

export interface RoadSegment {
  a: Vec2
  b: Vec2
  width: number
  klass: RoadClass
  elevated: boolean
  /** unit direction a->b, precomputed for car routing */
  dir: Vec2
  length: number
}

export type BuildingTier = 'low' | 'med' | 'tall'

export interface CityBuilding {
  id: string
  x: number; z: number; y: number      // y = terrain height at the base
  w: number; d: number                  // footprint (already inset from lot)
  rot: number                           // y-rotation (radians)
  height: number                        // world units
  tier: BuildingTier
  modelType: string                     // e.g. 'building-tall-a'
  dataIndex: number | null              // index into heroes[] when this is a hero
  blockId: number
  abuts: boolean                        // part of a connected (no-gap) superblock
}

export interface ParkLot { cx: number; cz: number; w: number; d: number; rot: number }

export interface CityLayout {
  bounds: { w: number; d: number }
  roads: RoadSegment[]
  buildings: CityBuilding[]
  parks: ParkLot[]
  intersections: Vec2[]
  heroIds: string[]
  terrainHeightAt: (x: number, z: number) => number
}

export interface HeroInput { id: string; height01: number; weight: number }

export interface CityGenOptions {
  seed?: number | string
  heroes: HeroInput[]
  /** half-extent target of the city plot (world units). default scales w/ count */
  size?: number
  /** 0..1 fraction of lots that actually receive a building. default 0.82 */
  density?: number
  /** vertical relief amplitude. default 3.5 */
  terrainAmplitude?: number
  /** fraction of blocks turned into parks. default 0.12 */
  parkRatio?: number
  /** fraction of blocks that become connected superblocks. default 0.22 */
  superRatio?: number
}

/* ----------------------------- PRNG (mulberry32) -------------------------- */
function hashSeed(s: number | string): number {
  if (typeof s === 'number') return s >>> 0
  let h = 1779033703 ^ s.length
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------- terrain --------------------------------- */
// Deterministic, smooth, cheap value-noise-ish heightfield (sum of sines).
function makeTerrain(seed: number, amp: number) {
  const r = mulberry32(seed ^ 0x9e3779b9)
  const waves = Array.from({ length: 5 }, () => ({
    fx: (r() - 0.5) * 0.06,
    fz: (r() - 0.5) * 0.06,
    ph: r() * Math.PI * 2,
    a: (0.35 + r() * 0.65),
  }))
  const norm = waves.reduce((s, w) => s + w.a, 0) || 1
  return (x: number, z: number) => {
    let h = 0
    for (const w of waves) h += w.a * Math.sin(x * w.fx + z * w.fz + w.ph)
    // bias the very center slightly lower so downtown reads as a basin of light
    return (h / norm) * amp
  }
}

/* ------------------------------- blocks ---------------------------------- */
interface Rect { x: number; z: number; w: number; d: number } // center x,z + size

const ROAD_WIDTH: Record<RoadClass, number> = {
  highway: 9.0, arterial: 6.0, street: 3.6, alley: 2.2,
}
function classForDepth(depth: number): RoadClass {
  if (depth <= 0) return 'arterial'   // first cuts are wide boulevards
  if (depth === 1) return 'arterial'
  if (depth <= 3) return 'street'
  return 'alley'
}

/* Recursively split the plot into irregular blocks; each split lays a road. */
function subdivideBlocks(
  plot: Rect, rng: () => number,
  minBlock: number, maxDepth: number,
) {
  const blocks: Rect[] = []
  const roads: RoadSegment[] = []

  function pushRoad(a: Vec2, b: Vec2, klass: RoadClass) {
    const dx = b.x - a.x, dz = b.z - a.z
    const len = Math.hypot(dx, dz) || 1
    roads.push({ a, b, width: ROAD_WIDTH[klass], klass, elevated: false,
      dir: { x: dx / len, z: dz / len }, length: len })
  }

  function recurse(rect: Rect, depth: number) {
    const area = rect.w * rect.d
    const tooSmall = rect.w < minBlock || rect.d < minBlock
    // stop with a probability that grows with depth -> varied block sizes
    const stopChance = depth >= 2 ? (depth - 2) * 0.28 : 0
    if (depth >= maxDepth || tooSmall || (area < minBlock * minBlock * 3.2 && rng() < 0.5) || rng() < stopChance) {
      blocks.push(rect); return
    }
    // choose split axis: bias toward splitting the longer side (keeps lots sane)
    const splitX = rect.w > rect.d ? rng() < 0.82 : rng() < 0.18
    const klass = classForDepth(depth)
    const rw = ROAD_WIDTH[klass]
    // split position jittered around the middle (0.5 +/- 0.18) -> uneven blocks
    const t = 0.5 + (rng() - 0.5) * 0.36
    if (splitX) {
      const cut = rect.x - rect.w / 2 + rect.w * t
      const leftW = (cut - rw / 2) - (rect.x - rect.w / 2)
      const rightW = (rect.x + rect.w / 2) - (cut + rw / 2)
      if (leftW < minBlock * 0.5 || rightW < minBlock * 0.5) { blocks.push(rect); return }
      pushRoad({ x: cut, z: rect.z - rect.d / 2 }, { x: cut, z: rect.z + rect.d / 2 }, klass)
      recurse({ x: rect.x - rect.w / 2 + leftW / 2, z: rect.z, w: leftW, d: rect.d }, depth + 1)
      recurse({ x: cut + rw / 2 + rightW / 2, z: rect.z, w: rightW, d: rect.d }, depth + 1)
    } else {
      const cut = rect.z - rect.d / 2 + rect.d * t
      const topD = (cut - rw / 2) - (rect.z - rect.d / 2)
      const botD = (rect.z + rect.d / 2) - (cut + rw / 2)
      if (topD < minBlock * 0.5 || botD < minBlock * 0.5) { blocks.push(rect); return }
      pushRoad({ x: rect.x - rect.w / 2, z: cut }, { x: rect.x + rect.w / 2, z: cut }, klass)
      recurse({ x: rect.x, z: rect.z - rect.d / 2 + topD / 2, w: rect.w, d: topD }, depth + 1)
      recurse({ x: rect.x, z: cut + rw / 2 + botD / 2, w: rect.w, d: botD }, depth + 1)
    }
  }
  recurse(plot, 0)
  return { blocks, roads }
}

/* ------------------------------- parcels --------------------------------- */
// Subdivide a block into lots. gap = alley/setback between lots (0 => abutting).
function subdivideParcels(block: Rect, rng: () => number, gap: number, minLot: number): Rect[] {
  const out: Rect[] = []
  function rec(rect: Rect, depth: number) {
    const tooSmall = rect.w < minLot * 1.6 || rect.d < minLot * 1.6
    if (depth >= 4 || tooSmall || (depth >= 1 && rng() < 0.32)) { out.push(rect); return }
    const splitX = rect.w > rect.d ? rng() < 0.75 : rng() < 0.25
    const t = 0.5 + (rng() - 0.5) * 0.4
    if (splitX) {
      const aw = rect.w * t - gap / 2, bw = rect.w * (1 - t) - gap / 2
      if (aw < minLot || bw < minLot) { out.push(rect); return }
      rec({ x: rect.x - rect.w / 2 + aw / 2, z: rect.z, w: aw, d: rect.d }, depth + 1)
      rec({ x: rect.x + rect.w / 2 - bw / 2, z: rect.z, w: bw, d: rect.d }, depth + 1)
    } else {
      const ad = rect.d * t - gap / 2, bd = rect.d * (1 - t) - gap / 2
      if (ad < minLot || bd < minLot) { out.push(rect); return }
      rec({ x: rect.x, z: rect.z - rect.d / 2 + ad / 2, w: rect.w, d: ad }, depth + 1)
      rec({ x: rect.x, z: rect.z + rect.d / 2 - bd / 2, w: rect.w, d: bd }, depth + 1)
    }
  }
  rec(block, 0)
  return out
}

/* --------------------------- model selection ----------------------------- */
const MODELS: Record<BuildingTier, string[]> = {
  low: ['building-low-a', 'building-low-b'],
  med: ['building-med-a', 'building-med-b'],
  tall: ['building-tall-a', 'building-tall-b', 'building-tall-c'],
}
function tierForHeight(h: number): BuildingTier {
  if (h >= 9) return 'tall'
  if (h >= 4.5) return 'med'
  return 'low'
}
function pickModel(tier: BuildingTier, r: number): string {
  const arr = MODELS[tier]
  return arr[Math.floor(r * arr.length) % arr.length]
}

/* ------------------------------- main ------------------------------------ */
export function generateCity(opts: CityGenOptions): CityLayout {
  const seed = hashSeed(opts.seed ?? 'neo-kyoto')
  const rng = mulberry32(seed)
  const heroes = opts.heroes ?? []
  const density = opts.density ?? 0.82
  const amp = opts.terrainAmplitude ?? 3.5
  const parkRatio = opts.parkRatio ?? 0.12
  const superRatio = opts.superRatio ?? 0.22

  // Plot size scales with how many lots we need (heroes + filler headroom).
  const targetLots = Math.max(40, heroes.length * 6)
  const half = opts.size ?? Math.max(60, Math.sqrt(targetLots) * 11)
  const plot: Rect = { x: 0, z: 0, w: half * 2, d: half * 2 }
  const terrainHeightAt = makeTerrain(seed, amp)

  // 1) blocks + roads
  const minBlock = 14
  const { blocks, roads } = subdivideBlocks(plot, rng, minBlock, 6)

  // 2) elevated ring highway around downtown core (radius ~ 0.58 of plot)
  const ringR = half * 0.62
  const ringSteps = 28
  const ringPts: Vec2[] = []
  for (let i = 0; i < ringSteps; i++) {
    const a = (i / ringSteps) * Math.PI * 2
    const wob = 1 + Math.sin(a * 3 + seed) * 0.06
    ringPts.push({ x: Math.cos(a) * ringR * wob, z: Math.sin(a) * ringR * wob })
  }
  for (let i = 0; i < ringSteps; i++) {
    const a = ringPts[i], b = ringPts[(i + 1) % ringSteps]
    const dx = b.x - a.x, dz = b.z - a.z
    const len = Math.hypot(dx, dz) || 1
    roads.push({ a, b, width: ROAD_WIDTH.highway, klass: 'highway',
      elevated: true, dir: { x: dx / len, z: dz / len }, length: len })
  }

  // 3) classify blocks: park / superblock / normal (center-biased: taller core)
  const buildings: CityBuilding[] = []
  const parks: ParkLot[] = []
  const heroIds: string[] = []

  // collect candidate lots with metadata first, then assign heroes to best lots
  interface Cand { lot: Rect; blockId: number; abuts: boolean; centrality: number }
  const cands: Cand[] = []

  blocks.forEach((block, bi) => {
    const dist = Math.hypot(block.x, block.z) / half  // 0 center -> 1 edge
    const roll = rng()
    // more parks toward the edges; superblocks anywhere
    const isPark = roll < parkRatio * (0.5 + dist)
    if (isPark) {
      parks.push({ cx: block.x, cz: block.z, w: block.w * 0.9, d: block.d * 0.9, rot: 0 })
      return
    }
    const isSuper = rng() < superRatio
    const gap = isSuper ? 0 : 1.6 + rng() * 1.4
    const lots = subdivideParcels(
      { x: block.x, z: block.z, w: block.w - 2.4, d: block.d - 2.4 }, // inset = sidewalk
      rng, gap, 4.5,
    )
    for (const lot of lots) {
      cands.push({ lot, blockId: bi, abuts: isSuper, centrality: 1 - dist })
    }
  })

  // 4) assign heroes to the largest * most-central lots
  const scored = cands
    .map((c, i) => ({ i, score: (c.lot.w * c.lot.d) * (0.4 + c.centrality) }))
    .sort((a, b) => b.score - a.score)
  const heroLotIdx = new Set<number>()
  const heroOrder = [...heroes].sort((a, b) => b.weight - a.weight)
  for (let h = 0; h < heroOrder.length && h < scored.length; h++) heroLotIdx.add(scored[h].i)

  // map hero rank -> candidate index
  const heroByCand = new Map<number, number>() // candIdx -> heroes[] index
  {
    let h = 0
    for (const s of scored) {
      if (h >= heroOrder.length) break
      heroByCand.set(s.i, heroes.indexOf(heroOrder[h]))
      h++
    }
  }

  // 5) build buildings
  cands.forEach((c, ci) => {
    const isHero = heroByCand.has(ci)
    if (!isHero && rng() > density) return // leave some empty lots (realism)
    const lot = c.lot
    const footW = Math.max(2.5, lot.w * (c.abuts ? 0.98 : 0.82))
    const footD = Math.max(2.5, lot.d * (c.abuts ? 0.98 : 0.82))
    let height: number
    let dataIndex: number | null = null
    if (isHero) {
      const hi = heroByCand.get(ci)!
      dataIndex = hi
      const h01 = heroes[hi]?.height01 ?? 0.5
      height = 6 + Math.pow(h01, 0.85) * 26     // hero towers: 6..32
      heroIds.push(heroes[hi].id)
    } else {
      // downtown (central) taller; falloff to the edges + noise
      const base = 2 + c.centrality * 14
      height = Math.max(2, base * (0.6 + rng() * 0.9))
    }
    const tier = tierForHeight(height)
    const rot = (Math.round(rng() * 1) ) * 0 // keep lot-aligned (0); abutting rows share orientation
    buildings.push({
      id: isHero ? heroes[dataIndex!].id : `fill-${ci}`,
      x: lot.x, z: lot.z, y: terrainHeightAt(lot.x, lot.z),
      w: footW, d: footD, rot,
      height, tier, modelType: pickModel(tier, rng()),
      dataIndex, blockId: c.blockId, abuts: c.abuts,
    })
  })

  // 6) intersections = road endpoints snapped to a small grid & de-duped
  const seen = new Set<string>()
  const intersections: Vec2[] = []
  for (const r of roads) {
    if (r.klass === 'highway') continue
    for (const p of [r.a, r.b]) {
      const key = `${Math.round(p.x / 2)},${Math.round(p.z / 2)}`
      if (seen.has(key)) { continue }
      seen.add(key); intersections.push({ x: p.x, z: p.z })
    }
  }

  return {
    bounds: { w: plot.w, d: plot.d },
    roads, buildings, parks, intersections, heroIds, terrainHeightAt,
  }
}

/* ------------------------------ self-test -------------------------------- */
// Run: tsx cityGen.ts   (prints a sanity report; not imported in the app)
// @ts-ignore - import.meta is fine under tsx/esm
const isMain = typeof process !== 'undefined' && process.argv && /cityGen\.ts$/.test(process.argv[1] || '')
if (isMain) {
  const heroes: HeroInput[] = Array.from({ length: 9 }, (_, i) => ({
    id: ['claude-code','cursor','opencode','gemini','codex','qwen','aider','kilocode','windsurf'][i],
    height01: Math.random(),
    weight: Math.random(),
  }))
  const city = generateCity({ seed: 'neo-kyoto', heroes })
  const byTier = city.buildings.reduce((m: any, b) => { m[b.tier] = (m[b.tier]||0)+1; return m }, {})
  const byClass = city.roads.reduce((m: any, r) => { m[r.klass] = (m[r.klass]||0)+1; return m }, {})
  console.log('plot      :', city.bounds)
  console.log('roads     :', city.roads.length, byClass)
  console.log('blocks→bld:', city.buildings.length, 'tiers:', byTier)
  console.log('superblock:', city.buildings.filter(b=>b.abuts).length, 'abutting buildings')
  console.log('heroes set:', city.heroIds.length, city.heroIds)
  console.log('parks     :', city.parks.length)
  console.log('intersect :', city.intersections.length)
  const ys = city.buildings.map(b=>b.y)
  console.log('terrain y :', Math.min(...ys).toFixed(2), '..', Math.max(...ys).toFixed(2))
  const hs = city.buildings.map(b=>b.height)
  console.log('heights   :', Math.min(...hs).toFixed(1), '..', Math.max(...hs).toFixed(1))
}
