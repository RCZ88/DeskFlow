import * as THREE from 'three'

export type Bg = 'clean' | 'black' | 'checkerboard' | 'skip'

export type Bucket = 'glow' | 'opaque' | 'texture'

export interface AssetSpec {
  id: string
  file: string
  bucket: Bucket
  bg: Bg
  tile?: boolean
  note: string
}

export const BASE = '/cyber_assets'

export const CYBER_ASSETS: Record<string, AssetSpec> = {
  '1a': { id:'1a', file:'1a.jpg', bucket:'texture', bg:'clean', tile:true, note:'Base facade' },
  '1b': { id:'1b', file:'1b.jpg', bucket:'texture', bg:'clean', tile:true, note:'Tall facade' },
  '1c': { id:'1c', file:'1c.jpg', bucket:'texture', bg:'clean', tile:true, note:'Low facade' },
  '2a': { id:'2a', file:'2a.png', bucket:'texture', bg:'clean', note:'Pattern 0' },
  '2b': { id:'2b', file:'2b.png', bucket:'texture', bg:'clean', note:'Pattern 1 (best)' },
  '2c': { id:'2c', file:'2c.png', bucket:'texture', bg:'clean', note:'Pattern 2' },
  '2d': { id:'2d', file:'2d.png', bucket:'texture', bg:'clean', note:'Lit 80%' },
  '2e': { id:'2e', file:'2e.png', bucket:'texture', bg:'clean', note:'Lit 60%' },
  '2f': { id:'2f', file:'2f.png', bucket:'texture', bg:'clean', note:'Lit 40%' },
  '2g': { id:'2g', file:'2g.png', bucket:'texture', bg:'clean', note:'Lit 20%' },
  '2h': { id:'2h', file:'2h.png', bucket:'texture', bg:'clean', note:'Lit 5%' },
  '3a': { id:'3a', file:'3a.png', bucket:'texture', bg:'clean', tile:true, note:'Asphalt base' },
  '3b': { id:'3b', file:'3b.png', bucket:'texture', bg:'clean', tile:true, note:'Sidewalk' },
  '3c': { id:'3c', file:'3c.png', bucket:'glow', bg:'black', tile:true, note:'Neon lane markings' },
  '4a': { id:'4a', file:'4a.png', bucket:'opaque', bg:'clean', note:'Car A' },
  '4b': { id:'4b', file:'4b.png', bucket:'opaque', bg:'clean', note:'Car B' },
  '4c': { id:'4c', file:'4c.png', bucket:'opaque', bg:'clean', note:'Truck' },
  '5a': { id:'5a', file:'5a.png', bucket:'glow', bg:'black', note:'Neon sign base' },
  '5b': { id:'5b', file:'5b.png', bucket:'glow', bg:'clean', note:'Holo billboard' },
  '5c': { id:'5c', file:'5c.png', bucket:'glow', bg:'clean', note:'Neon arrow' },
  '6a': { id:'6a', file:'6a.png', bucket:'glow', bg:'skip', note:'Rain -> makeRadialGlow' },
  '6b': { id:'6b', file:'6b.png', bucket:'glow', bg:'skip', note:'Ember -> makeRadialGlow' },
  '6c': { id:'6c', file:'6c.png', bucket:'glow', bg:'skip', note:'Fog -> makeRadialGlow' },
  '7a': { id:'7a', file:'7a.png', bucket:'texture', bg:'clean', note:'Equirect sky' },
  '7b': { id:'7b', file:'7b.png', bucket:'texture', bg:'clean', note:'Horizon band' },
  '8a': { id:'8a', file:'8a.png', bucket:'opaque', bg:'clean', note:'Lamppost' },
  '8b': { id:'8b', file:'8b.png', bucket:'opaque', bg:'clean', note:'Traffic light' },
  '8c': { id:'8c', file:'8c.png', bucket:'opaque', bg:'clean', note:'Bench' },
  '9a': { id:'9a', file:'9a.png', bucket:'opaque', bg:'clean', note:'Tree' },
  '9b': { id:'9b', file:'9b.png', bucket:'opaque', bg:'clean', note:'Planter' },
  '10a': { id:'10a', file:'10a.png', bucket:'glow', bg:'black', note:'Lens flare' },
  '10b': { id:'10b', file:'10b.png', bucket:'glow', bg:'checkerboard', tile:true, note:'Rain streak overlay' },
  '10c': { id:'10c', file:'10c.png', bucket:'glow', bg:'black', tile:true, note:'Smoke wisps' },
}

export type LoadedTextures = Partial<Record<string, THREE.Texture>>

export function assetUrl(id: string): string | null {
  const spec = CYBER_ASSETS[id]
  if (!spec || spec.bg === 'skip') return null
  return `${BASE}/${spec.file}`
}

export function isAdditive(id: string): boolean {
  const spec = CYBER_ASSETS[id]
  return spec ? spec.bg === 'black' : false
}

export function shouldTile(id: string): boolean {
  const spec = CYBER_ASSETS[id]
  return spec ? !!spec.tile : false
}
