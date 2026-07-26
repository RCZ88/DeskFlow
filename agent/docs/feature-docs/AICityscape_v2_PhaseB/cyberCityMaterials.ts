/* ============================================================================
 * cyberCityMaterials.ts — build the cyberpunk building/road materials from the
 * 2D texture pack (the assets that were going unused).
 *
 * ROOT CAUSE of “silver buildings”: the GLB buildings reference an EXTERNAL
 * `Textures/colormap.png` that is NOT shipped in the asset pack, so GLTFLoader
 * loads no baseColor map and the mesh renders as bare grey. Rather than depend
 * on that missing atlas we build the data-bearing skyline from TEXTURED BOXES
 * using the real 2D textures (facade 1a-1c + emissive windows 2a-2h). This is
 * full control: per-floor window tiling, per-hero neon tint, lit-window density
 * by activity — and it gives clean separation between hero (data) towers and
 * decoration buildings.
 * ========================================================================== */
import * as THREE from 'three'
import type { LoadedTextures } from './cyberAssets'
import type { BuildingTier } from './cityGen'

const FACADE_BY_TIER: Record<BuildingTier, string> = { low: '1c', med: '1a', tall: '1b' }
// window-grid overlays ordered dense -> sparse (more lit = more “active”)
const WINDOWS_DENSE = '2b'
const WINDOWS_MED = '2d'
const WINDOWS_SPARSE = '2h'

function tiled(src: THREE.Texture | undefined, rx: number, ry: number, srgb = true): THREE.Texture | null {
  if (!src) return null
  const t = src.clone()
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rx, ry)
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.needsUpdate = true
  return t
}

export interface BuildingMatOpts {
  tier: BuildingTier
  floors: number
  widthUnits: number
  active?: boolean
  isHero?: boolean
  tint?: string // hero color, e.g. '#f97316'
}

/** One MeshStandardMaterial per building (cheap: ~12 heroes + a few tiers). */
export function makeBuildingMaterial(tx: LoadedTextures, o: BuildingMatOpts): THREE.MeshStandardMaterial {
  // ~1 facade module per 4 world-units wide, ~1 window row per ~3.2u tall floor.
  const rx = Math.max(1, Math.round(o.widthUnits / 4))
  const ry = Math.max(1, Math.round(o.floors / 4))
  const facade = tiled(tx[FACADE_BY_TIER[o.tier]] as THREE.Texture, rx, ry)
  const winId = o.isHero ? WINDOWS_DENSE : o.active ? WINDOWS_MED : WINDOWS_SPARSE
  const windows = tiled(tx[winId] as THREE.Texture, rx, ry, true)

  const tint = o.tint ? new THREE.Color(o.tint) : new THREE.Color('#9fb4d6')
  const mat = new THREE.MeshStandardMaterial({
    map: facade ?? null,
    color: facade ? new THREE.Color('#ffffff') : new THREE.Color('#1b2233'),
    metalness: 0.15,
    roughness: 0.62,
    emissiveMap: windows ?? null,
    emissive: o.isHero ? tint : new THREE.Color('#ffb347'),
    // heroes glow with their model color; decoration windows are a dim warm.
    emissiveIntensity: o.isHero ? (o.active ? 2.4 : 1.3) : 0.7,
  })
  if (!facade && !windows) {
    // hard fallback so we are NEVER silver, even if textures fail to load
    mat.color = new THREE.Color('#161d2b')
    mat.emissive = o.isHero ? tint : new THREE.Color('#22304a')
    mat.emissiveIntensity = o.isHero ? 1.6 : 0.35
  }
  return mat
}

/** Road surface material: tiled asphalt, with optional additive neon lane overlay. */
export function makeAsphaltMaterial(tx: LoadedTextures, lengthUnits: number): THREE.MeshStandardMaterial {
  const map = tiled(tx['3a'] as THREE.Texture, Math.max(1, Math.round(lengthUnits / 6)), 1)
  return new THREE.MeshStandardMaterial({ map: map ?? null, color: map ? '#ffffff' : '#0d1018', roughness: 0.5, metalness: 0.2 })
}
export function makeNeonLaneMaterial(tx: LoadedTextures, lengthUnits: number): THREE.MeshBasicMaterial | null {
  const t = tiled(tx['3c'] as THREE.Texture, Math.max(1, Math.round(lengthUnits / 6)), 1, false)
  if (!t) return null
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 })
}
export function makeSidewalkMaterial(tx: LoadedTextures): THREE.MeshStandardMaterial {
  const map = tiled(tx['3b'] as THREE.Texture, 2, 2)
  return new THREE.MeshStandardMaterial({ map: map ?? null, color: map ? '#ffffff' : '#20242e', roughness: 0.8, metalness: 0.05 })
}
