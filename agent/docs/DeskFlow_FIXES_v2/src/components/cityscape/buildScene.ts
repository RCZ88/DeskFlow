/* ============================================================================
 * buildScene.ts (v2) — map the framework-agnostic CityLayout to render-ready
 * instance data for the R3F layer. Pure + deterministic + Node-testable.
 *
 * Key differences vs the broken version:
 *  - Carries the FULL data binding onto hero buildings (label / metricValue /
 *    color / active) so the renderer can show token stats per skyscraper.
 *  - Emits elevated viaduct ribbons + ramps + support-pillar positions, so the
 *    highway visibly goes UP (bridge) instead of being painted flat.
 *  - Emits furniture (trees/lights) and parking from real sidewalk anchors.
 *  - Ships ASSET_META measured from the real GLBs, incl. the per-model up-axis
 *    fix so cars never spawn facing/standing the wrong way, and the broken
 *    assets (car-2/car-7/Tree-1) are excluded.
 * ========================================================================== */
import type {
  CityLayout, BuildingTier, RoadSegment, Ramp, Intersection,
  FurnitureAnchor, ParkingSpot, ParkLot,
} from './cityGen'

const MODEL_DIR = '/cyber_assets/models'

const BUILDING_MODELS: Record<BuildingTier, string[]> = {
  low: ['building-low-a', 'building-low-b'],
  med: ['building-med-a', 'building-med-b'],
  tall: ['building-tall-a', 'building-tall-b', 'building-tall-c'],
}
export const ALL_BUILDING_MODEL_URLS: string[] = Object.values(BUILDING_MODELS)
  .flat().map(n => `${MODEL_DIR}/${n}.glb`)

export function buildingUrl(modelType: string): string { return `${MODEL_DIR}/${modelType}.glb` }

/* --- ASSET METADATA (measured from the real GLBs via glTF accessor bounds) ---
 * size = native bounding-box [w,h,d]; baseY = native min.y; forwardAxis tells
 * the renderer which local axis is the model's “nose” so we can rotate it onto
 * +Z (three.js forward). Cars exported Z-up (length on Y) get rotX = -PI/2.
 * `use:false` = broken/oversized asset that must NOT be spawned. */
export interface AssetMeta { size: [number, number, number]; baseY: number; rotX?: number; use: boolean; note?: string }
export const ASSET_META: Record<string, AssetMeta> = {
  'car-1': { size: [2.67, 5.66, 2.30], baseY: -2.94, rotX: -Math.PI / 2, use: true, note: 'Z-up: length on Y -> lay flat' },
  'car-2': { size: [230.2, 117.6, 489.4], baseY: 0.04, use: false, note: 'broken: ~100x oversize' },
  'car-3': { size: [2.11, 1.53, 4.21], baseY: -0.02, use: true },
  'car-4': { size: [1.78, 1.24, 3.73], baseY: -0.02, use: true },
  'car-5': { size: [1.24, 4.32, 3.02], baseY: -2.15, rotX: -Math.PI / 2, use: true, note: 'Z-up' },
  'car-6': { size: [3.29, 6.15, 2.53], baseY: -2.26, rotX: -Math.PI / 2, use: true, note: 'Z-up' },
  'car-7': { size: [230.2, 117.6, 489.4], baseY: 0.04, use: false, note: 'broken duplicate of car-2' },
  'Tree-1': { size: [308.4, 509.1, 323.7], baseY: 0, use: false, note: 'broken: ~100x oversize' },
  'Tree-2': { size: [1.89, 2.77, 2.48], baseY: -1.60, use: true },
  'Tree-3': { size: [5.80, 10.24, 5.37], baseY: -0.24, use: true },
  'StreetLight-1': { size: [0.27, 0.96, 0.07], baseY: 0, use: true, note: 'small bollard; scale up' },
  'StreetLight-2': { size: [1.45, 0.34, 5.19], baseY: -0.17, rotX: -Math.PI / 2, use: true, note: 'authored lying down -> stand up' },
}
export const CAR_MODELS = ['car-1', 'car-3', 'car-4', 'car-5', 'car-6'].filter(m => ASSET_META[m].use)
export const TREE_MODELS = ['Tree-2', 'Tree-3']
export const LIGHT_MODEL = 'StreetLight-1'

/* ------------------------------- output types ---------------------------- */
export interface BuildingInstance {
  id: string; modelUrl: string
  position: [number, number, number]; rotationY: number
  fit: [number, number, number]               // final world dims [w,h,d]
  tier: BuildingTier; height: number; floors: number
  heroId?: string; dataIndex?: number
  label?: string; metricValue?: number; color?: string; active?: boolean
}
export interface RoadRibbon { id: string; klass: string; center: [number, number, number]; length: number; width: number; rotationY: number; elevated: boolean }
export interface PillarSpot { position: [number, number, number]; height: number }
export interface RampRibbon { id: string; center: [number, number, number]; length: number; width: number; rotationY: number; yA: number; yB: number }
export interface SignalPlacement { id: string; position: [number, number, number]; signal: boolean }
export interface FurnitureInstance { modelType: string; position: [number, number, number]; rotationY: number; kind: 'tree' | 'light' }
export interface ParkingInstance { modelType: string; position: [number, number, number]; rotationY: number }
export interface ParkPatch { id: string; center: [number, number, number]; width: number; depth: number }

export interface SceneModel {
  buildings: BuildingInstance[]
  roads: RoadRibbon[]
  ramps: RampRibbon[]
  pillars: PillarSpot[]
  signals: SignalPlacement[]
  furniture: FurnitureInstance[]
  parking: ParkingInstance[]
  parks: ParkPatch[]
  carGraph: CityLayout['carGraph']
  bounds: CityLayout['bounds']
  heroIds: string[]
  terrainHeightAt: (x: number, z: number) => number
}

export interface BuildSceneOptions { lotMargin?: number; deckHeight?: number }

export function buildSceneFromLayout(layout: CityLayout, opts: BuildSceneOptions = {}): SceneModel {
  const lotMargin = opts.lotMargin ?? 0.92
  const deckY = opts.deckHeight ?? 7

  const buildings: BuildingInstance[] = layout.buildings.map(b => ({
    id: b.id, modelUrl: buildingUrl(b.modelType),
    position: [b.x, b.y, b.z], rotationY: b.rot,
    fit: [b.w * lotMargin, b.height, b.d * lotMargin],
    tier: b.tier, height: b.height, floors: b.floors,
    heroId: b.heroId, dataIndex: b.dataIndex,
    label: b.label, metricValue: b.metricValue, color: b.color, active: b.active,
  }))

  const surface = layout.roads.filter(r => !r.elevated)
  const elevated = layout.roads.filter(r => r.elevated)
  const ribbon = (r: RoadSegment): RoadRibbon => ({
    id: r.id, klass: r.klass,
    center: [(r.a.x + r.b.x) / 2, r.elevated ? r.y : layout.terrainHeightAt((r.a.x + r.b.x) / 2, (r.a.z + r.b.z) / 2) + 0.02, (r.a.z + r.b.z) / 2],
    length: r.length + r.width, width: r.width, rotationY: Math.atan2(r.dir.x, r.dir.z), elevated: r.elevated,
  })
  const roads: RoadRibbon[] = [...surface.map(ribbon), ...elevated.map(ribbon)]

  // support pillars under the elevated loop every ~14u
  const pillars: PillarSpot[] = []
  for (const r of elevated) {
    const n = Math.max(2, Math.floor(r.length / 14))
    for (let i = 1; i < n; i++) {
      const t = i / n
      const x = r.a.x + (r.b.x - r.a.x) * t, z = r.a.z + (r.b.z - r.a.z) * t
      const g = layout.terrainHeightAt(x, z)
      pillars.push({ position: [x, g, z], height: deckY - g })
    }
  }

  const ramps: RampRibbon[] = layout.ramps.map(rm => ({
    id: rm.id, center: [(rm.a.x + rm.b.x) / 2, (rm.yA + rm.yB) / 2, (rm.a.z + rm.b.z) / 2],
    length: rm.length, width: rm.width, rotationY: Math.atan2(rm.dir.x, rm.dir.z), yA: rm.yA, yB: rm.yB,
  }))

  const signals: SignalPlacement[] = layout.intersections.map(ix => ({
    id: ix.id, position: [ix.x, layout.terrainHeightAt(ix.x, ix.z), ix.z], signal: ix.signal,
  }))

  // furniture: alternate the two tree GLBs deterministically; lights use the bollard
  const furniture: FurnitureInstance[] = layout.furniture.map((f: FurnitureAnchor, i) => ({
    modelType: f.kind === 'tree' ? TREE_MODELS[i % TREE_MODELS.length] : LIGHT_MODEL,
    position: [f.x, layout.terrainHeightAt(f.x, f.z), f.z], rotationY: f.rotationY, kind: f.kind,
  }))

  const parking: ParkingInstance[] = layout.parking.map((p: ParkingSpot, i) => ({
    modelType: CAR_MODELS[i % CAR_MODELS.length],
    position: [p.x, layout.terrainHeightAt(p.x, p.z), p.z], rotationY: p.rotationY,
  }))

  const parks: ParkPatch[] = layout.parks.map((p: ParkLot) => ({
    id: p.id, center: [p.cx, layout.terrainHeightAt(p.cx, p.cz), p.cz], width: p.w, depth: p.d,
  }))

  return { buildings, roads, ramps, pillars, signals, furniture, parking, parks, carGraph: layout.carGraph, bounds: layout.bounds, heroIds: layout.heroIds, terrainHeightAt: layout.terrainHeightAt }
}

/* ------------------------------ self-test -------------------------------- */
declare const process: any
declare const require: any
const isMain = typeof process !== 'undefined' && process.argv && /buildScene(\.v2)?\.ts$/.test(process.argv[1] || '')
if (isMain) {
  const { generateCity } = require('./cityGen') as typeof import('./cityGen')
  const names = ['claude-sonnet','gpt-4o','gemini-2.5','claude-opus','o3','qwen-coder','deepseek','grok']
  const heroes = names.map((id, i) => ({ id, label: id, height01: Math.pow(0.72, i), weight: 1000 * Math.pow(0.72, i), metricValue: Math.round(1e6 * Math.pow(0.72, i)), color: ['#f97316','#a855f7','#22c55e','#38bdf8','#f43f5e','#eab308','#14b8a6','#fb7185'][i], active: i < 3 }))
  const layout = generateCity({ seed: 'deskflow-agent-tokens', heroes })
  const scene = buildSceneFromLayout(layout)
  const heroB = scene.buildings.filter(b => b.heroId)
  console.log('buildings   :', scene.buildings.length, '(heroes', heroB.length + ')')
  console.log('hero sample :', heroB.slice(0, 3).map(b => `${b.label} h=${b.height.toFixed(0)} floors=${b.floors} tok=${b.metricValue} ${b.color} active=${b.active}`))
  console.log('roads       :', scene.roads.length, '(elevated', scene.roads.filter(r => r.elevated).length + ')')
  console.log('pillars     :', scene.pillars.length, ' ramps:', scene.ramps.length)
  console.log('signals     :', scene.signals.length, '(lit', scene.signals.filter(s => s.signal).length + ')')
  console.log('furniture   :', scene.furniture.length, ' parking:', scene.parking.length)
  console.log('CAR_MODELS  :', CAR_MODELS, '(dropped car-2/car-7)')
  const tallest = scene.buildings.reduce((m, b) => b.height > m.height ? b : m)
  console.log('tallest     :', tallest.label || tallest.id, tallest.height.toFixed(1) + 'u', 'fit', tallest.fit.map(n => n.toFixed(1)))
  const allBound = scene.buildings.every(b => Math.abs(b.position[0]) <= scene.bounds.half && Math.abs(b.position[2]) <= scene.bounds.half)
  console.log('in-bounds   :', allBound ? 'PASS' : 'FAIL')
}
