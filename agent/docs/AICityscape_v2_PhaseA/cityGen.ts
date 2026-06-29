/**
 * cityGen.ts — deterministic, framework-agnostic procedural city generator
 * for the AICityscape v2 "God Mode" overhaul.
 *
 * Zero external imports so it can be unit-tested under `npx tsx cityGen.ts`
 * AND imported by the R3F renderer. It returns a pure-data `CityLayout`;
 * mapping that layout to three.js meshes happens in buildScene.ts.
 *
 * Algorithm (per the God Mode plan):
 *   seeded mulberry32 RNG
 *   -> recursive BSP block subdivision (each split lays a road; depth -> class)
 *   -> ~12% blocks = parks, ~22% = superblocks (abutting), rest normal
 *   -> recursive parcel subdivision into lots
 *   -> data-driven hero towers on the largest / most-central lots
 *   -> sine-sum terrain heightfield + elevated ring highway
 *   -> per-building GLB tier assignment (low/med/tall)
 *   -> emit intersections for traffic-light placement
 */

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface Vec2 {
	x: number
	z: number
}

export type RoadClass = "highway" | "arterial" | "street" | "alley"
export type BuildingTier = "low" | "med" | "tall"
export type BlockRole = "normal" | "super" | "park"

export interface RoadSegment {
	id: string
	a: Vec2
	b: Vec2
	class: RoadClass
	width: number
	/** unit vector a->b, precomputed for UV orientation + traffic routing */
	dir: Vec2
	length: number
	elevated: boolean
}

export interface BuildingLot {
	id: string
	center: Vec2
	width: number
	depth: number
	/** Y-rotation in radians (blocks are axis-aligned per split, jittered slightly) */
	rotation: number
	tier: BuildingTier
	height: number
	footprintArea: number
	role: BlockRole
	/** present when this lot hosts a data-driven hero tower */
	heroId?: string
	/** centrality 0..1 (1 = plot center) used for tiering + hero ranking */
	centrality: number
}

export interface Park {
	id: string
	center: Vec2
	width: number
	depth: number
}

export interface Intersection {
	id: string
	position: Vec2
	roadIds: string[]
}

export interface CityBounds {
	minX: number
	maxX: number
	minZ: number
	maxZ: number
	width: number
	depth: number
}

export interface CityLayout {
	bounds: CityBounds
	roads: RoadSegment[]
	buildings: BuildingLot[]
	parks: Park[]
	intersections: Intersection[]
	heroIds: string[]
	/** smooth sine-sum terrain sampler; deterministic for a given seed */
	terrainHeightAt: (x: number, z: number) => number
}

/** A data-driven hero tower (e.g. a top AI model / agent by usage weight). */
export interface HeroSpec {
	id: string
	weight: number
}

export interface CityGenOptions {
	seed?: number
	/** data-driven hero towers; the largest/most-central lots are assigned to these */
	heroes?: HeroSpec[]
	/** square plot size in world units (default 160) */
	size?: number
	/** max BSP recursion depth; higher = denser road network (default 5) */
	maxDepth?: number
	/** stop splitting a block once both sides would fall below this (default 22) */
	minBlock?: number
	parkRatio?: number
	superRatio?: number
	terrainAmplitude?: number
}

// ----------------------------------------------------------------------------
// RNG — mulberry32 (seeded, deterministic, fast)
// ----------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
	let a = seed >>> 0
	return function () {
		a |= 0
		a = (a + 0x6d2b79f5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

// ----------------------------------------------------------------------------
// Internal geometry helpers
// ----------------------------------------------------------------------------

interface Rect {
	x: number // min x
	z: number // min z
	w: number
	d: number
}

interface Block extends Rect {
	depth: number
	role: BlockRole
}

const ROAD_WIDTH: Record<RoadClass, number> = {
	highway: 7.0,
	arterial: 5.0,
	street: 3.4,
	alley: 2.2,
}

function classForDepth(depth: number): RoadClass {
	if (depth <= 1) return "arterial"
	if (depth <= 3) return "street"
	return "alley"
}

function makeRoad(
	id: string,
	a: Vec2,
	b: Vec2,
	cls: RoadClass,
	elevated = false,
): RoadSegment {
	const dx = b.x - a.x
	const dz = b.z - a.z
	const length = Math.hypot(dx, dz) || 1
	return {
		id,
		a,
		b,
		class: cls,
		width: ROAD_WIDTH[cls],
		dir: { x: dx / length, z: dz / length },
		length,
		elevated,
	}
}

// ----------------------------------------------------------------------------
// Generator
// ----------------------------------------------------------------------------

export function generateCity(options: CityGenOptions = {}): CityLayout {
	const {
		seed = 1337,
		heroes = [],
		size = 160,
		maxDepth = 5,
		minBlock = 20,
		parkRatio = 0.12,
		superRatio = 0.22,
		terrainAmplitude = 2.3,
	} = options

	const rng = mulberry32(seed)
	const half = size / 2

	const roads: RoadSegment[] = []
	let roadCounter = 0
	const addRoad = (a: Vec2, b: Vec2, cls: RoadClass, elevated = false) => {
		roads.push(makeRoad(`road-${roadCounter++}`, a, b, cls, elevated))
	}

	// --- 1. Recursive BSP subdivision -> blocks + roads ----------------------
	const blocks: Block[] = []

	const subdivide = (rect: Rect, depth: number) => {
		const canSplitW = rect.w > minBlock * 2
		const canSplitD = rect.d > minBlock * 2
		if (depth >= maxDepth || (!canSplitW && !canSplitD)) {
			blocks.push({ ...rect, depth, role: "normal" })
			return
		}

		// choose split axis: prefer the longer side, with some jitter
		let splitVertical: boolean
		if (canSplitW && canSplitD) {
			const bias = rect.w / (rect.w + rect.d)
			splitVertical = rng() < bias
		} else {
			splitVertical = canSplitW
		}

		const cls = classForDepth(depth)
		const roadW = ROAD_WIDTH[cls]
		// jittered split fraction -> irregular blocks (never a clean grid)
		const f = 0.36 + rng() * 0.28

		if (splitVertical) {
			const splitX = rect.x + rect.w * f
			addRoad(
				{ x: splitX, z: rect.z },
				{ x: splitX, z: rect.z + rect.d },
				cls,
			)
			const left: Rect = {
				x: rect.x,
				z: rect.z,
				w: splitX - roadW / 2 - rect.x,
				d: rect.d,
			}
			const right: Rect = {
				x: splitX + roadW / 2,
				z: rect.z,
				w: rect.x + rect.w - (splitX + roadW / 2),
				d: rect.d,
			}
			subdivide(left, depth + 1)
			subdivide(right, depth + 1)
		} else {
			const splitZ = rect.z + rect.d * f
			addRoad(
				{ x: rect.x, z: splitZ },
				{ x: rect.x + rect.w, z: splitZ },
				cls,
			)
			const near: Rect = {
				x: rect.x,
				z: rect.z,
				w: rect.w,
				d: splitZ - roadW / 2 - rect.z,
			}
			const far: Rect = {
				x: rect.x,
				z: splitZ + roadW / 2,
				w: rect.w,
				d: rect.z + rect.d - (splitZ + roadW / 2),
			}
			subdivide(near, depth + 1)
			subdivide(far, depth + 1)
		}
	}

	subdivide({ x: -half, z: -half, w: size, d: size }, 0)

	// --- 2. Assign block roles ---------------------------------------------
	for (const block of blocks) {
		const r = rng()
		if (r < parkRatio) block.role = "park"
		else if (r < parkRatio + superRatio) block.role = "super"
		else block.role = "normal"
	}

	// --- 3. Terrain sampler (sine-sum heightfield) -------------------------
	const p1 = rng() * Math.PI * 2
	const p2 = rng() * Math.PI * 2
	const p3 = rng() * Math.PI * 2
	const terrainHeightAt = (x: number, z: number): number => {
		const v =
			Math.sin(x * 0.018 + p1) * 0.6 +
			Math.sin(z * 0.022 + p2) * 0.5 +
			Math.sin((x + z) * 0.013 + p3) * 0.4
		return (v / 1.5) * terrainAmplitude
	}

	// --- 4. Parcel subdivision -> building lots ----------------------------
	const parks: Park[] = []
	const buildings: BuildingLot[] = []
	let parkCounter = 0
	let bldCounter = 0
	const maxCentralityDist = Math.hypot(half, half)

	const centralityOf = (cx: number, cz: number) =>
		1 - Math.min(1, Math.hypot(cx, cz) / maxCentralityDist)

	const pushLot = (lot: Rect, role: BlockRole) => {
		if (lot.w < 3 || lot.d < 3) return
		const cx = lot.x + lot.w / 2
		const cz = lot.z + lot.d / 2
		const centrality = centralityOf(cx, cz)
		buildings.push({
			id: `bld-${bldCounter++}`,
			center: { x: cx, z: cz },
			width: lot.w,
			depth: lot.d,
			rotation: (rng() - 0.5) * 0.05, // subtle, keeps faces road-aligned
			tier: "low", // assigned in step 6
			height: 0, // assigned in step 6
			footprintArea: lot.w * lot.d,
			role,
			centrality,
		})
	}

	// recursively split a block into parcels; superblocks abut (gap = 0)
	const parcelize = (rect: Rect, role: BlockRole, depth: number) => {
		const gap = role === "super" ? 0 : 1.4
		const targetLot = role === "super" ? 14 : 11
		const canW = rect.w > targetLot * 2
		const canD = rect.d > targetLot * 2
		if (depth >= 3 || (!canW && !canD)) {
			pushLot(rect, role)
			return
		}
		const vertical = canW && canD ? rng() < rect.w / (rect.w + rect.d) : canW
		const f = 0.4 + rng() * 0.2
		if (vertical) {
			const sx = rect.x + rect.w * f
			parcelize(
				{ x: rect.x, z: rect.z, w: sx - gap / 2 - rect.x, d: rect.d },
				role,
				depth + 1,
			)
			parcelize(
				{ x: sx + gap / 2, z: rect.z, w: rect.x + rect.w - (sx + gap / 2), d: rect.d },
				role,
				depth + 1,
			)
		} else {
			const sz = rect.z + rect.d * f
			parcelize(
				{ x: rect.x, z: rect.z, w: rect.w, d: sz - gap / 2 - rect.z },
				role,
				depth + 1,
			)
			parcelize(
				{ x: rect.x, z: sz + gap / 2, w: rect.w, d: rect.z + rect.d - (sz + gap / 2) },
				role,
				depth + 1,
			)
		}
	}

	for (const block of blocks) {
		if (block.w < 4 || block.d < 4) continue
		if (block.role === "park") {
			parks.push({
				id: `park-${parkCounter++}`,
				center: { x: block.x + block.w / 2, z: block.z + block.d / 2 },
				width: block.w,
				depth: block.d,
			})
			continue
		}
		parcelize(block, block.role, 0)
	}

	// --- 5. Hero placement (largest, most central lots) --------------------
	const heroIds: string[] = []
	if (heroes.length > 0) {
		const ranked = [...buildings].sort((a, b) => {
			const sa = a.footprintArea * (0.5 + a.centrality)
			const sb = b.footprintArea * (0.5 + b.centrality)
			return sb - sa
		})
		const sortedHeroes = [...heroes].sort((a, b) => b.weight - a.weight)
		const n = Math.min(sortedHeroes.length, ranked.length)
		for (let i = 0; i < n; i++) {
			ranked[i].heroId = sortedHeroes[i].id
			heroIds.push(sortedHeroes[i].id)
		}
	}

	// --- 6. Per-building tier + height assignment --------------------------
	for (const b of buildings) {
		const score = b.centrality * 0.7 + (b.heroId ? 0.5 : 0) + rng() * 0.25
		let tier: BuildingTier
		if (b.heroId || score > 0.72) tier = "tall"
		else if (score > 0.45) tier = "med"
		else tier = "low"
		b.tier = tier
		const base =
			tier === "tall" ? 16 + rng() * 14 : tier === "med" ? 8 + rng() * 8 : 2 + rng() * 6
		// heroes get a guaranteed boost so the downtown core reads tall
		b.height = b.heroId ? Math.max(base, 20 + rng() * 10) : base
	}

	// --- 7. Elevated ring highway -----------------------------------------
	const ringR = half * 0.92
	const ringSegs = 28
	let prev: Vec2 | null = null
	let firstRing: Vec2 | null = null
	for (let i = 0; i <= ringSegs; i++) {
		const t = (i / ringSegs) * Math.PI * 2
		// rounded-rectangle-ish ring via superellipse-flavored radius
		const rx = ringR * (0.85 + 0.15 * Math.abs(Math.cos(t)))
		const rz = ringR * (0.85 + 0.15 * Math.abs(Math.sin(t)))
		const pt: Vec2 = { x: Math.cos(t) * rx, z: Math.sin(t) * rz }
		if (prev) addRoad(prev, pt, "highway", true)
		else firstRing = pt
		prev = pt
	}
	if (prev && firstRing) addRoad(prev, firstRing, "highway", true)

	// --- 8. Intersections (geometric crossings of perpendicular roads) -----
	// BSP roads are axis-aligned; a child road's endpoint sits on the parent
	// road that bounds its block -> T-junction. Detect every vertical x
	// horizontal crossing (incl. endpoint-on-segment) and cluster coincident
	// hits so each junction is emitted once with all roads that meet there.
	// Child roads are inset from their parent road by ~parentWidth/2, so a
	// T-junction leaves a small gap; tolerate up to the widest splitter
	// half-width (arterial = 5 -> 2.5) plus margin.
	const EPS = 3.5
	const isVertical = (r: RoadSegment) => Math.abs(r.dir.x) < 1e-6
	const verticals = roads.filter((r) => r.class !== "highway" && isVertical(r))
	const horizontals = roads.filter(
		(r) => r.class !== "highway" && !isVertical(r),
	)
	const ixKey = (x: number, z: number) =>
		`${Math.round(x / 2)}:${Math.round(z / 2)}`
	const ixMap = new Map<
		string,
		{ sum: Vec2; n: number; roadIds: Set<string> }
	>()
	for (const v of verticals) {
		const vx = v.a.x
		const vzMin = Math.min(v.a.z, v.b.z)
		const vzMax = Math.max(v.a.z, v.b.z)
		for (const h of horizontals) {
			const hz = h.a.z
			const hxMin = Math.min(h.a.x, h.b.x)
			const hxMax = Math.max(h.a.x, h.b.x)
			if (
				vx >= hxMin - EPS &&
				vx <= hxMax + EPS &&
				hz >= vzMin - EPS &&
				hz <= vzMax + EPS
			) {
				const key = ixKey(vx, hz)
				let c = ixMap.get(key)
				if (!c) {
					c = { sum: { x: 0, z: 0 }, n: 0, roadIds: new Set() }
					ixMap.set(key, c)
				}
				c.sum.x += vx
				c.sum.z += hz
				c.n++
				c.roadIds.add(v.id)
				c.roadIds.add(h.id)
			}
		}
	}
	const intersections: Intersection[] = []
	let ixCounter = 0
	for (const c of ixMap.values()) {
		intersections.push({
			id: `ix-${ixCounter++}`,
			position: { x: c.sum.x / c.n, z: c.sum.z / c.n },
			roadIds: [...c.roadIds],
		})
	}

	const bounds: CityBounds = {
		minX: -half,
		maxX: half,
		minZ: -half,
		maxZ: half,
		width: size,
		depth: size,
	}

	return {
		bounds,
		roads,
		buildings,
		parks,
		intersections,
		heroIds,
		terrainHeightAt,
	}
}

// ----------------------------------------------------------------------------
// Self-test — runs only under `npx tsx cityGen.ts` (skipped in the browser)
// ----------------------------------------------------------------------------

function selfTest() {
	const heroes: HeroSpec[] = Array.from({ length: 9 }, (_, i) => ({
		id: `model-${i + 1}`,
		weight: 100 - i * 7,
	}))
	const layout = generateCity({ seed: 20260629, heroes })

	const byClass = (c: RoadClass) => layout.roads.filter((r) => r.class === c).length
	const byTier = (t: BuildingTier) =>
		layout.buildings.filter((b) => b.tier === t).length
	const superCount = layout.buildings.filter((b) => b.role === "super").length
	const heights = layout.buildings.map((b) => b.height)
	let minY = Infinity
	let maxY = -Infinity
	const step = 8
	for (let x = layout.bounds.minX; x <= layout.bounds.maxX; x += step) {
		for (let z = layout.bounds.minZ; z <= layout.bounds.maxZ; z += step) {
			const y = layout.terrainHeightAt(x, z)
			if (y < minY) minY = y
			if (y > maxY) maxY = y
		}
	}

	const f = (n: number) => n.toFixed(1)
	console.log("AICityscape v2 — cityGen self-test")
	console.log(
		`plot      : ${f(layout.bounds.width)} x ${f(layout.bounds.depth)}`,
	)
	console.log(
		`roads     : ${layout.roads.length}  { highway: ${byClass(
			"highway",
		)}, arterial: ${byClass("arterial")}, street: ${byClass(
			"street",
		)}, alley: ${byClass("alley")} }`,
	)
	console.log(
		`buildings : ${layout.buildings.length}  tiers: { low: ${byTier(
			"low",
		)}, med: ${byTier("med")}, tall: ${byTier("tall")} }`,
	)
	console.log(`superblock: ${superCount} abutting buildings`)
	console.log(`heroes    : ${layout.heroIds.length} placed`)
	console.log(`parks     : ${layout.parks.length}     intersections: ${layout.intersections.length}`)
	console.log(
		`terrain y : ${f(minY)} .. ${f(maxY)}     heights: ${f(
			Math.min(...heights),
		)} .. ${f(Math.max(...heights))}`,
	)

	// Determinism check: same seed -> identical layout fingerprint
	const a = generateCity({ seed: 42, heroes })
	const b = generateCity({ seed: 42, heroes })
	const fp = (l: CityLayout) =>
		`${l.roads.length}|${l.buildings.length}|${l.buildings
			.map((x) => x.height.toFixed(3))
			.join(",")}`
	console.log(
		`determinism: ${fp(a) === fp(b) ? "PASS (seed 42 reproducible)" : "FAIL"}`,
	)
	const c = generateCity({ seed: 99, heroes })
	console.log(
		`seed variance: ${fp(a) !== fp(c) ? "PASS (different seed -> different city)" : "FAIL"}`,
	)
}

// Guarded so it never runs inside the Vite/browser bundle.
declare const process: any
if (
	typeof process !== "undefined" &&
	process.argv &&
	/cityGen\.ts$/.test(process.argv[1] || "")
) {
	selfTest()
}
