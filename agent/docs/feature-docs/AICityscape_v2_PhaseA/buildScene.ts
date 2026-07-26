/**
 * buildScene.ts — Phase A core mapper.
 *
 * Pure, framework-agnostic transform: CityLayout (from cityGen.ts) -> a
 * serializable SceneModel of instance transforms the R3F layer can consume
 * directly (one InstancedMesh per GLB submesh, road ribbons, traffic lights,
 * parks). No three.js import here, so it stays Node-testable.
 *
 * The R3F components (InstancedBuildings.tsx, Roads.tsx, Traffic.tsx) read
 * this model; buildCityModel() in AICityscape.tsx is rewritten to call
 * generateCity() -> buildScene().
 */

import {
	generateCity,
	type BuildingTier,
	type CityGenOptions,
	type CityLayout,
	type RoadClass,
} from "./cityGen"

// ----------------------------------------------------------------------------
// GLB asset registry (Phase A: the 7 building models that were never loaded)
// ----------------------------------------------------------------------------

const MODEL_DIR = "/cyber_assets/models"

export const BUILDING_MODELS: Record<BuildingTier, string[]> = {
	low: [`${MODEL_DIR}/building-low-a.glb`, `${MODEL_DIR}/building-low-b.glb`],
	med: [`${MODEL_DIR}/building-med-a.glb`, `${MODEL_DIR}/building-med-b.glb`],
	tall: [
		`${MODEL_DIR}/building-tall-a.glb`,
		`${MODEL_DIR}/building-tall-b.glb`,
		`${MODEL_DIR}/building-tall-c.glb`,
	],
}

/** Flat list for `ALL_MODEL_URLS` / `useGLTF.preload`. */
export const ALL_BUILDING_MODEL_URLS: string[] = [
	...BUILDING_MODELS.low,
	...BUILDING_MODELS.med,
	...BUILDING_MODELS.tall,
]

// Native GLB sizes are intentionally NOT hard-coded here. The R3F layer
// (InstancedBuildings.tsx) measures each model's real bounding box with
// Box3().setFromObject once at load and fits it to the `fit` dimensions
// emitted below. That keeps this mapper independent of authored model scale.

// ----------------------------------------------------------------------------
// Output types
// ----------------------------------------------------------------------------

export interface BuildingInstance {
	id: string
	modelUrl: string
	/** world position of the lot center; y sits on the terrain (base offset
	 * is applied in the R3F layer from the measured bounding box) */
	position: [number, number, number]
	rotationY: number
	/** desired FINAL world-space dimensions [width, height, depth]; the R3F
	 * layer divides these by the measured GLB box to get the actual scale */
	fit: [number, number, number]
	tier: BuildingTier
	height: number
	/** target window rows so the material pass can tile 2a–2h per floor */
	floors: number
	heroId?: string
}

export interface RoadRibbon {
	id: string
	class: RoadClass
	/** ribbon center (midpoint of the segment) */
	center: [number, number, number]
	length: number
	width: number
	/** Y rotation so the ribbon's local +Z runs along the segment (UV V-axis) */
	rotationY: number
	elevated: boolean
}

export interface TrafficLightPlacement {
	id: string
	position: [number, number, number]
	roadIds: string[]
}

export interface ParkPlacement {
	id: string
	center: [number, number, number]
	width: number
	depth: number
}

export interface SceneModel {
	buildings: BuildingInstance[]
	roads: RoadRibbon[]
	trafficLights: TrafficLightPlacement[]
	parks: ParkPlacement[]
	bounds: CityLayout["bounds"]
	heroIds: string[]
	/** kept so downstream phases (terrain mesh, props) can resample */
	terrainHeightAt: (x: number, z: number) => number
}

export interface BuildSceneOptions {
	/** lot fill fraction so buildings don't touch the road (default 0.88) */
	lotMargin?: number
	/** floor height in world units, for window-row count (default 3.2) */
	floorHeight?: number
	/** highway deck height above ground (default 6) */
	highwayDeckHeight?: number
}

// ----------------------------------------------------------------------------
// Deterministic helper (stable model pick per building id)
// ----------------------------------------------------------------------------

function hashStr(s: string): number {
	let h = 2166136261 >>> 0
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i)
		h = Math.imul(h, 16777619)
	}
	return h >>> 0
}

// ----------------------------------------------------------------------------
// Mapper
// ----------------------------------------------------------------------------

export function buildSceneFromLayout(
	layout: CityLayout,
	opts: BuildSceneOptions = {},
): SceneModel {
	const { lotMargin = 0.88, floorHeight = 3.2, highwayDeckHeight = 6 } = opts

	const buildings: BuildingInstance[] = layout.buildings.map((b) => {
		const variants = BUILDING_MODELS[b.tier]
		const modelUrl = variants[hashStr(b.id) % variants.length]
		const groundY = layout.terrainHeightAt(b.center.x, b.center.z)

		return {
			id: b.id,
			modelUrl,
			position: [b.center.x, groundY, b.center.z],
			rotationY: b.rotation,
			// final world dims: XZ fill the lot (with margin), Y = target height
			fit: [b.width * lotMargin, b.height, b.depth * lotMargin],
			tier: b.tier,
			height: b.height,
			floors: Math.max(1, Math.round(b.height / floorHeight)),
			heroId: b.heroId,
		}
	})

	const roads: RoadRibbon[] = layout.roads.map((r) => {
		const cx = (r.a.x + r.b.x) / 2
		const cz = (r.a.z + r.b.z) / 2
		const y = r.elevated
			? highwayDeckHeight
			: layout.terrainHeightAt(cx, cz) + 0.02
		// local +Z should run along the segment -> rotate by the segment angle.
		// angle of dir relative to +Z axis = atan2(dir.x, dir.z)
		const rotationY = Math.atan2(r.dir.x, r.dir.z)
		return {
			id: r.id,
			class: r.class,
			center: [cx, y, cz],
			// extend by width so perpendicular ribbons overlap cleanly at junctions
			length: r.length + r.width,
			width: r.width,
			rotationY,
			elevated: r.elevated,
		}
	})

	const trafficLights: TrafficLightPlacement[] = layout.intersections.map(
		(ix) => ({
			id: ix.id,
			position: [
				ix.position.x,
				layout.terrainHeightAt(ix.position.x, ix.position.z),
				ix.position.z,
			],
			roadIds: ix.roadIds,
		}),
	)

	const parks: ParkPlacement[] = layout.parks.map((p) => ({
		id: p.id,
		center: [
			p.center.x,
			layout.terrainHeightAt(p.center.x, p.center.z),
			p.center.z,
		],
		width: p.width,
		depth: p.depth,
	}))

	return {
		buildings,
		roads,
		trafficLights,
		parks,
		bounds: layout.bounds,
		heroIds: layout.heroIds,
		terrainHeightAt: layout.terrainHeightAt,
	}
}

/** Convenience: generate + map in one call (what buildCityModel will use). */
export function buildScene(
	genOpts: CityGenOptions = {},
	sceneOpts: BuildSceneOptions = {},
): SceneModel {
	return buildSceneFromLayout(generateCity(genOpts), sceneOpts)
}

// ----------------------------------------------------------------------------
// Self-test — runs only under `npx tsx buildScene.ts`
// ----------------------------------------------------------------------------

function selfTest() {
	const heroes = Array.from({ length: 9 }, (_, i) => ({
		id: `model-${i + 1}`,
		weight: 100 - i * 7,
	}))
	const scene = buildScene({ seed: 20260629, heroes })

	// Invariant checks
	const finite3 = (a: number[]) => a.every((n) => Number.isFinite(n))
	let bad = 0
	for (const b of scene.buildings) {
		if (!finite3(b.position) || !finite3(b.fit)) bad++
		if (b.fit[0] <= 0 || b.fit[1] <= 0 || b.fit[2] <= 0) bad++
		if (!ALL_BUILDING_MODEL_URLS.includes(b.modelUrl)) bad++
	}
	for (const r of scene.roads) if (!finite3(r.center)) bad++

	const heroInstances = scene.buildings.filter((b) => b.heroId)
	const byTier = (t: BuildingTier) =>
		scene.buildings.filter((b) => b.tier === t).length
	const tallestFit = Math.max(...scene.buildings.map((b) => b.fit[1]))
	const sample = scene.buildings.find((b) => b.heroId) || scene.buildings[0]

	console.log("AICityscape v2 — buildScene self-test")
	console.log(
		`buildings : ${scene.buildings.length}  (low ${byTier(
			"low",
		)} / med ${byTier("med")} / tall ${byTier("tall")})`,
	)
	console.log(`heroes    : ${heroInstances.length} instances carry a heroId`)
	console.log(`roads     : ${scene.roads.length} ribbons`)
	console.log(`lights    : ${scene.trafficLights.length} traffic lights`)
	console.log(`parks     : ${scene.parks.length}`)
	console.log(`tallest   : ${tallestFit.toFixed(1)}u target height`)
	console.log(
		`sample    : ${sample.id} ${sample.tier}${
			sample.heroId ? ` [${sample.heroId}]` : ""
		} url=${sample.modelUrl.split("/").pop()} pos=[${sample.position
			.map((n) => n.toFixed(1))
			.join(",")}] fit=[${sample.fit
			.map((n) => n.toFixed(1))
			.join(",")}] floors=${sample.floors}`,
	)
	console.log(`invariants: ${bad === 0 ? "PASS (all transforms finite & valid)" : `FAIL (${bad} issues)`}`)
}

declare const process: any
if (
	typeof process !== "undefined" &&
	process.argv &&
	/buildScene\.ts$/.test(process.argv[1] || "")
) {
	selfTest()
}
