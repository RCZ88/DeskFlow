/* ============================================================================
 * cityGen.ts  (v3 — "God Mode")  Procedural downtown skyscraper district.
 * ----------------------------------------------------------------------------
 * Framework-agnostic, deterministic (seeded). Zero imports. Run with tsx to
 * print a sanity report and dump /data/v2/layout.json for the debug renderer.
 *
 * Design goals (answering the brief):
 *   - DOWNTOWN CORE: real skyscrapers clustered in the centre, height encodes
 *     AI-model usage; the periphery tapers to low/mid blocks (decoration).
 *   - ROADS ARE THE GAPS between blocks (axis-aligned), so a building can NEVER
 *     sit in a road. A final carve pass guarantees it.
 *   - ELEVATED RING is a rectangular VIADUCT that follows a reserved corridor
 *     (its footprint is carved free of buildings) and has ramps down to grade.
 *     Surface traffic never routes onto it.
 *   - Emits everything the renderer needs from ONE source of truth: buildings
 *     (with data binding), roads, sidewalks, intersections (+signal flag),
 *     furniture anchors (trees/lights on real sidewalks), parking spots, and a
 *     surface car-routing graph.
 * ========================================================================== */

export interface Vec2 { x: number; z: number }
export type RoadClass = 'highway' | 'arterial' | 'street' | 'alley'
export type BuildingTier = 'low' | 'med' | 'tall'

export interface RoadSegment {
  id: string
  a: Vec2; b: Vec2
  klass: RoadClass
  width: number
  elevated: boolean
  y: number               // deck height (0 at grade)
  dir: Vec2               // unit a->b
  length: number
  horizontal: boolean     // axis-aligned orientation flag
}

export interface Ramp {
  id: string
  a: Vec2; b: Vec2        // a = ground end, b = deck end
  width: number
  yA: number; yB: number
  dir: Vec2; length: number
}

export interface CityBuilding {
  id: string
  x: number; y: number; z: number   // base centre (y = terrain height)
  w: number; d: number              // footprint after inset
  rot: number
  height: number
  floors: number
  tier: BuildingTier
  modelType: string
  blockId: number
  abuts: boolean
  centrality: number                // 0 edge .. 1 core
  // ---- data binding (heroes only; filler buildings leave these undefined) --
  heroId?: string
  dataIndex?: number
  label?: string
  metricValue?: number
  color?: string
  active?: boolean
}

export interface ParkLot { id: string; cx: number; cz: number; w: number; d: number }
export interface Intersection { id: string; x: number; z: number; roadIds: string[]; signal: boolean }
export interface FurnitureAnchor { x: number; z: number; rotationY: number; kind: 'tree' | 'light' }
export interface ParkingSpot { x: number; z: number; rotationY: number }
export interface CarNode { id: string; x: number; z: number }
export interface CarEdge { roadId: string; from: string; to: string; klass: RoadClass; length: number }

export interface CityLayout {
  bounds: { w: number; d: number; half: number; coreR: number }
  roads: RoadSegment[]
  ramps: Ramp[]
  buildings: CityBuilding[]
  parks: ParkLot[]
  intersections: Intersection[]
  furniture: FurnitureAnchor[]
  parking: ParkingSpot[]
  carGraph: { nodes: CarNode[]; edges: CarEdge[] }
  heroIds: string[]
  terrainHeightAt: (x: number, z: number) => number
}

export interface HeroInput { id: string; height01: number; weight: number; label?: string; color?: string; active?: boolean; metricValue?: number }
export interface CityGenOptions {
  seed?: number | string
  heroes: HeroInput[]
  size?: number
  density?: number
  terrainAmplitude?: number
  parkRatio?: number
  superRatio?: number
}

/* ----------------------------- PRNG -------------------------------------- */
function hashSeed(s: number | string): number {
  if (typeof s === 'number') return s >>> 0
  let h = 1779033703 ^ s.length
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
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

/* ----------------------------- terrain ----------------------------------- */
function makeTerrain(seed: number, amp: number) {
  const r = mulberry32(seed ^ 0x9e3779b9)
  const waves = Array.from({ length: 5 }, () => ({ fx: (r() - 0.5) * 0.05, fz: (r() - 0.5) * 0.05, ph: r() * Math.PI * 2, a: 0.35 + r() * 0.65 }))
  const norm = waves.reduce((s, w) => s + w.a, 0) || 1
  return (x: number, z: number) => { let h = 0; for (const w of waves) h += w.a * Math.sin(x * w.fx + z * w.fz + w.ph); return (h / norm) * amp }
}

/* ----------------------------- geometry ---------------------------------- */
interface Rect { x: number; z: number; w: number; d: number } // centre + size
function rectsOverlap(a: Rect, b: Rect, margin = 0): boolean {
  return Math.abs(a.x - b.x) * 2 < (a.w + b.w + margin * 2) &&
         Math.abs(a.z - b.z) * 2 < (a.d + b.d + margin * 2)
}
// AABB of an axis-aligned road segment (incl. its width)
function roadRect(r: { a: Vec2; b: Vec2; width: number; horizontal: boolean }): Rect {
  if (r.horizontal) return { x: (r.a.x + r.b.x) / 2, z: r.a.z, w: Math.abs(r.b.x - r.a.x), d: r.width }
  return { x: r.a.x, z: (r.a.z + r.b.z) / 2, w: r.width, d: Math.abs(r.b.z - r.a.z) }
}

const ROAD_WIDTH: Record<RoadClass, number> = { highway: 10, arterial: 6.5, street: 3.8, alley: 2.4 }
function classForDepth(depth: number): RoadClass {
  if (depth <= 1) return 'arterial'
  if (depth <= 3) return 'street'
  return 'alley'
}

/* ---------------------- recursive block subdivision ---------------------- */
function subdivideBlocks(plot: Rect, rng: () => number, minBlock: number, maxDepth: number) {
  const blocks: Rect[] = []
  const roads: RoadSegment[] = []
  let rid = 0
  function pushRoad(a: Vec2, b: Vec2, klass: RoadClass, horizontal: boolean) {
    const dx = b.x - a.x, dz = b.z - a.z
    const len = Math.hypot(dx, dz) || 1
    roads.push({ id: `r${rid++}`, a, b, klass, width: ROAD_WIDTH[klass], elevated: false, y: 0, dir: { x: dx / len, z: dz / len }, length: len, horizontal })
  }
  function recurse(rect: Rect, depth: number) {
    const tooSmall = rect.w < minBlock || rect.d < minBlock
    const stopChance = depth >= 3 ? (depth - 3) * 0.3 : 0
    if (depth >= maxDepth || tooSmall || rng() < stopChance) { blocks.push(rect); return }
    const splitX = rect.w > rect.d ? rng() < 0.85 : rng() < 0.15
    const klass = classForDepth(depth)
    const rw = ROAD_WIDTH[klass]
    const t = 0.5 + (rng() - 0.5) * 0.34
    if (splitX) {
      const cut = rect.x - rect.w / 2 + rect.w * t
      const leftW = (cut - rw / 2) - (rect.x - rect.w / 2)
      const rightW = (rect.x + rect.w / 2) - (cut + rw / 2)
      if (leftW < minBlock * 0.5 || rightW < minBlock * 0.5) { blocks.push(rect); return }
      pushRoad({ x: cut, z: rect.z - rect.d / 2 }, { x: cut, z: rect.z + rect.d / 2 }, klass, false)
      recurse({ x: rect.x - rect.w / 2 + leftW / 2, z: rect.z, w: leftW, d: rect.d }, depth + 1)
      recurse({ x: cut + rw / 2 + rightW / 2, z: rect.z, w: rightW, d: rect.d }, depth + 1)
    } else {
      const cut = rect.z - rect.d / 2 + rect.d * t
      const topD = (cut - rw / 2) - (rect.z - rect.d / 2)
      const botD = (rect.z + rect.d / 2) - (cut + rw / 2)
      if (topD < minBlock * 0.5 || botD < minBlock * 0.5) { blocks.push(rect); return }
      pushRoad({ x: rect.x - rect.w / 2, z: cut }, { x: rect.x + rect.w / 2, z: cut }, klass, true)
      recurse({ x: rect.x, z: rect.z - rect.d / 2 + topD / 2, w: rect.w, d: topD }, depth + 1)
      recurse({ x: rect.x, z: cut + rw / 2 + botD / 2, w: rect.w, d: botD }, depth + 1)
    }
  }
  recurse(plot, 0)
  return { blocks, roads, nextRid: rid }
}

/* --------------------------- parcel subdivision -------------------------- */
function subdivideParcels(block: Rect, rng: () => number, gap: number, minLot: number): Rect[] {
  const out: Rect[] = []
  function rec(rect: Rect, depth: number) {
    const tooSmall = rect.w < minLot * 1.7 || rect.d < minLot * 1.7
    if (depth >= 4 || tooSmall || (depth >= 1 && rng() < 0.34)) { out.push(rect); return }
    const splitX = rect.w > rect.d ? rng() < 0.72 : rng() < 0.28
    const t = 0.5 + (rng() - 0.5) * 0.36
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
function tierForHeight(h: number): BuildingTier { if (h >= 16) return 'tall'; if (h >= 7) return 'med'; return 'low' }
function pickModel(tier: BuildingTier, r: number): string { const arr = MODELS[tier]; return arr[Math.floor(r * arr.length) % arr.length] }

/* ================================ main =================================== */
export function generateCity(opts: CityGenOptions): CityLayout {
  const seed = hashSeed(opts.seed ?? 'neo-kyoto')
  const rng = mulberry32(seed)
  const heroes = opts.heroes ?? []
  const density = opts.density ?? 0.96
  const amp = opts.terrainAmplitude ?? 2.2
  const parkRatio = opts.parkRatio ?? 0.1
  const superRatio = opts.superRatio ?? 0.2

  const targetLots = Math.max(48, heroes.length * 7)
  const half = opts.size ?? Math.max(70, Math.sqrt(targetLots) * 12)
  const coreR = half * 0.42
  const plot: Rect = { x: 0, z: 0, w: half * 2, d: half * 2 }
  const terrainHeightAt = makeTerrain(seed, amp)

  // 1) blocks + surface roads (roads are the gaps)
  const minBlock = 13
  const sub = subdivideBlocks(plot, rng, minBlock, 6)
  const roads: RoadSegment[] = sub.roads
  let rid = sub.nextRid

  // plot-boundary arterials (so the edge reads as a street, not a void)
  const B = half
  const boundary: Array<[Vec2, Vec2, boolean]> = [
    [{ x: -B, z: -B }, { x: B, z: -B }, true],
    [{ x: -B, z: B }, { x: B, z: B }, true],
    [{ x: -B, z: -B }, { x: -B, z: B }, false],
    [{ x: B, z: -B }, { x: B, z: B }, false],
  ]
  for (const [a, b, h] of boundary) {
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1
    roads.push({ id: `r${rid++}`, a, b, klass: 'arterial', width: ROAD_WIDTH.arterial, elevated: false, y: 0, dir: { x: dx / len, z: dz / len }, length: len, horizontal: h })
  }

  // 2) ELEVATED VIADUCT LOOP — rectangle at radius R, axis-aligned, with ramps.
  const R = half * 0.66
  const deckY = 7
  const hwW = ROAD_WIDTH.highway
  const loopCorners: Vec2[] = [ { x: -R, z: -R }, { x: R, z: -R }, { x: R, z: R }, { x: -R, z: R } ]
  const elevatedRoads: RoadSegment[] = []
  for (let i = 0; i < 4; i++) {
    const a = loopCorners[i], b = loopCorners[(i + 1) % 4]
    const horizontal = Math.abs(b.x - a.x) > Math.abs(b.z - a.z)
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1
    const seg: RoadSegment = { id: `hw${i}`, a, b, klass: 'highway', width: hwW, elevated: true, y: deckY, dir: { x: dx / len, z: dz / len }, length: len, horizontal }
    elevatedRoads.push(seg); roads.push(seg)
  }
  // ramps at two opposite corners, angling down to grade just inside the loop
  const ramps: Ramp[] = []
  const rampSpecs: Array<[Vec2, Vec2]> = [
    [{ x: -R + 18, z: -R }, { x: -R, z: -R }],
    [{ x: R - 18, z: R }, { x: R, z: R }],
  ]
  rampSpecs.forEach(([g, d], i) => {
    const dx = d.x - g.x, dz = d.z - g.z, len = Math.hypot(dx, dz) || 1
    ramps.push({ id: `ramp${i}`, a: g, b: d, width: hwW * 0.7, yA: 0, yB: deckY, dir: { x: dx / len, z: dz / len }, length: len })
  })

  // 3) classify blocks + collect candidate lots
  interface Cand { lot: Rect; blockId: number; abuts: boolean; centrality: number }
  const cands: Cand[] = []
  const parks: ParkLot[] = []
  let pid = 0
  sub.blocks.forEach((block, bi) => {
    const dist = Math.min(1, Math.hypot(block.x, block.z) / half)
    const centrality = 1 - dist
    const roll = rng()
    if (roll < parkRatio * (0.4 + dist)) { // parks bias to the edges
      parks.push({ id: `park${pid++}`, cx: block.x, cz: block.z, w: block.w * 0.88, d: block.d * 0.88 }); return
    }
    const isSuper = rng() < superRatio
    const gap = isSuper ? 0 : 1.8 + rng() * 1.6
    const lots = subdivideParcels({ x: block.x, z: block.z, w: block.w - 2.2, d: block.d - 2.2 }, rng, gap, 4)
    for (const lot of lots) cands.push({ lot, blockId: bi, abuts: isSuper, centrality })
  })

  // 4) build all candidate buildings with filler heights (no heroes yet)
  const proto: CityBuilding[] = []
  cands.forEach((c, ci) => {
    if (rng() > density) return
    const lot = c.lot
    const footW = Math.max(3, lot.w * (c.abuts ? 0.98 : 0.84))
    const footD = Math.max(3, lot.d * (c.abuts ? 0.98 : 0.84))
    const base = 3 + Math.pow(c.centrality, 1.4) * 22          // smooth falloff => downtown core, mid ring, low edge
    const height = Math.max(3, base * (0.6 + rng() * 1.0))
    const tier = tierForHeight(height)
    proto.push({
      id: `fill-${ci}`, x: lot.x, y: terrainHeightAt(lot.x, lot.z), z: lot.z,
      w: footW, d: footD, rot: 0, height, floors: Math.max(1, Math.round(height / 3.2)),
      tier, modelType: pickModel(tier, rng()), blockId: c.blockId, abuts: c.abuts, centrality: c.centrality,
    })
  })

  // 5) CARVE — remove any building intersecting a road / viaduct / ramp corridor.
  //    Applied BEFORE hero assignment so a hero can never land under a road.
  const corridors: Rect[] = []
  for (const r of roads) corridors.push(roadRect(r))
  for (const rm of ramps) corridors.push(roadRect({ a: rm.a, b: rm.b, width: rm.width, horizontal: Math.abs(rm.b.x - rm.a.x) > Math.abs(rm.b.z - rm.a.z) }))
  const buildings = proto.filter(b => {
    const br: Rect = { x: b.x, z: b.z, w: b.w, d: b.d }
    for (const c of corridors) if (rectsOverlap(br, c, 0.5)) return false
    return true
  })

  // 6) assign heroes to the most-central + largest SURVIVING lots (height ∝ usage)
  const heroIds: string[] = []
  const heroOrder = [...heroes].sort((a, b) => b.weight - a.weight)
  const ranked = buildings.map((b, i) => ({ i, score: b.w * b.d * (0.3 + b.centrality * 1.4) })).sort((a, b) => b.score - a.score)
  for (let h = 0; h < heroOrder.length && h < ranked.length; h++) {
    const b = buildings[ranked[h].i]
    const hh = heroOrder[h]
    b.heroId = hh.id; b.dataIndex = heroes.indexOf(hh); b.label = hh.label ?? hh.id
    b.metricValue = hh.metricValue; b.color = hh.color; b.active = hh.active
    b.height = 20 + Math.pow(hh.height01 ?? 0.5, 0.8) * 42      // hero towers: 20..62
    b.floors = Math.max(1, Math.round(b.height / 3.2))
    b.tier = tierForHeight(b.height)
    b.modelType = pickModel(b.tier, (h * 0.137 + 0.11) % 1)
    heroIds.push(hh.id)
  }

  // 7) intersections (axis-aligned crossings of surface roads)
  const verts = roads.filter(r => !r.elevated && !r.horizontal)
  const horis = roads.filter(r => !r.elevated && r.horizontal)
  const intersections: Intersection[] = []
  const iseen = new Set<string>()
  let iid = 0
  for (const v of verts) {
    const vzmin = Math.min(v.a.z, v.b.z), vzmax = Math.max(v.a.z, v.b.z)
    for (const h of horis) {
      const hxmin = Math.min(h.a.x, h.b.x), hxmax = Math.max(h.a.x, h.b.x)
      if (v.a.x >= hxmin - 0.5 && v.a.x <= hxmax + 0.5 && h.a.z >= vzmin - 0.5 && h.a.z <= vzmax + 0.5) {
        const key = `${Math.round(v.a.x / 2)},${Math.round(h.a.z / 2)}`
        if (iseen.has(key)) continue
        iseen.add(key)
        const signal = (v.klass === 'arterial' || h.klass === 'arterial')
        intersections.push({ id: `ix${iid++}`, x: v.a.x, z: h.a.z, roadIds: [v.id, h.id], signal })
      }
    }
  }

  // 8) furniture anchors (trees + lights) along real sidewalks; skip near intersections
  const furniture: FurnitureAnchor[] = []
  const parking: ParkingSpot[] = []
  const nearIx = (x: number, z: number, d: number) => intersections.some(ix => Math.abs(ix.x - x) < d && Math.abs(ix.z - z) < d)
  for (const r of roads) {
    if (r.elevated || r.klass === 'alley') continue
    const curb = r.width / 2
    const treeGap = r.klass === 'arterial' ? 11 : 9
    const steps = Math.max(1, Math.floor(r.length / treeGap))
    for (let s = 1; s < steps; s++) {
      const t = s / steps
      const px = r.a.x + (r.b.x - r.a.x) * t
      const pz = r.a.z + (r.b.z - r.a.z) * t
      if (nearIx(px, pz, 6)) continue
      // perpendicular offset to each curb
      const nx = r.horizontal ? 0 : 1
      const nz = r.horizontal ? 1 : 0
      for (const side of [-1, 1]) {
        const ox = px + nx * (curb + 1.4) * side
        const oz = pz + nz * (curb + 1.4) * side
        const kind: 'tree' | 'light' = (s % 2 === 0) ? 'tree' : 'light'
        furniture.push({ x: ox, z: oz, rotationY: Math.atan2(r.dir.x, r.dir.z), kind })
      }
      // parking strip (closer to the lane than the trees); alleys already skipped above
      if (s % 2 === 0) {
        for (const side of [-1, 1]) {
          parking.push({ x: px + nx * (curb + 0.9) * side, z: pz + nz * (curb + 0.9) * side, rotationY: Math.atan2(r.dir.x, r.dir.z) })
        }
      }
    }
  }

  // 9) surface car-routing graph (nodes at road endpoints + intersections)
  const nodes: CarNode[] = []
  const nodeKey = new Map<string, string>()
  let nid = 0
  const nodeAt = (x: number, z: number) => {
    const key = `${Math.round(x / 2)},${Math.round(z / 2)}`
    let id = nodeKey.get(key)
    if (!id) { id = `n${nid++}`; nodeKey.set(key, id); nodes.push({ id, x, z }) }
    return id
  }
  const edges: CarEdge[] = []
  for (const r of roads) {
    if (r.elevated) continue
    const from = nodeAt(r.a.x, r.a.z), to = nodeAt(r.b.x, r.b.z)
    if (from !== to) edges.push({ roadId: r.id, from, to, klass: r.klass, length: r.length })
  }

  return {
    bounds: { w: plot.w, d: plot.d, half, coreR },
    roads, ramps, buildings, parks, intersections, furniture, parking,
    carGraph: { nodes, edges }, heroIds, terrainHeightAt,
  }
}

/* ------------------------------ self-test -------------------------------- */
declare const process: any
const isMain = typeof process !== 'undefined' && process.argv && /cityGen(\.v3)?\.ts$/.test(process.argv[1] || '')
if (isMain) {
  const names = ['claude-sonnet','gpt-4o','gemini-2.5','claude-opus','o3','qwen-coder','deepseek','grok','llama-3','mistral','codestral','phi-4']
  const heroes: HeroInput[] = names.map((id, i) => ({ id, label: id, height01: Math.pow(0.7, i), weight: 1000 * Math.pow(0.7, i), metricValue: Math.round(1e6 * Math.pow(0.7, i)), color: '#'+((i*1234567)&0xffffff).toString(16).padStart(6,'0'), active: i < 4 }))
  const city = generateCity({ seed: 'deskflow-agent-tokens', heroes })
  const byTier = city.buildings.reduce((m: any, b) => (m[b.tier] = (m[b.tier]||0)+1, m), {})
  const byClass = city.roads.reduce((m: any, r) => (m[r.klass] = (m[r.klass]||0)+1, m), {})
  // overlap audit: how many buildings still intersect any road corridor?
  const corridors = city.roads.map(r => roadRect(r))
  let bad = 0
  for (const b of city.buildings) { const br = { x: b.x, z: b.z, w: b.w, d: b.d }; if (corridors.some(c => rectsOverlap(br, c, 0))) bad++ }
  console.log('half/coreR :', city.bounds.half.toFixed(1), city.bounds.coreR.toFixed(1))
  console.log('roads      :', city.roads.length, byClass)
  console.log('buildings  :', city.buildings.length, 'tiers:', byTier)
  console.log('heroes     :', city.heroIds.length, '/', heroes.length)
  console.log('parks      :', city.parks.length, ' intersections:', city.intersections.length, '(signals', city.intersections.filter(i=>i.signal).length+')')
  console.log('furniture  :', city.furniture.length, ' parking:', city.parking.length)
  console.log('carGraph   :', city.carGraph.nodes.length, 'nodes', city.carGraph.edges.length, 'edges')
  console.log('ramps      :', city.ramps.length)
  const hs = city.buildings.map(b => b.height)
  console.log('heights    :', Math.min(...hs).toFixed(1), '..', Math.max(...hs).toFixed(1))
  console.log('BUILDINGS-IN-ROAD:', bad, bad === 0 ? 'PASS' : 'FAIL')
  const fs = require('fs')
  fs.writeFileSync('/data/v2/layout.json', JSON.stringify({
    bounds: city.bounds, roads: city.roads, ramps: city.ramps,
    buildings: city.buildings.map(b => ({ x: b.x, z: b.z, w: b.w, d: b.d, height: b.height, tier: b.tier, hero: !!b.heroId, centrality: b.centrality })),
    parks: city.parks, intersections: city.intersections, furniture: city.furniture, parking: city.parking,
  }))
  console.log('wrote /data/v2/layout.json')
}
