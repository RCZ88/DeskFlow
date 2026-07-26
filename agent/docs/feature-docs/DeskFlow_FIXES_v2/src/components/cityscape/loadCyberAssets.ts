import * as THREE from 'three'
import { CYBER_ASSETS, assetUrl, isAdditive, shouldTile, type LoadedTextures } from './cyberAssets'
import { tryLoadTexture, loadCheckerboardAsAlpha } from './cyberTextureUtils'

export async function loadCyberAssets(): Promise<LoadedTextures> {
  const result: LoadedTextures = {}

  const tasks = Object.values(CYBER_ASSETS).map(async (spec) => {
    const url = assetUrl(spec.id)
    if (!url) return

    if (spec.bg === 'checkerboard') {
      result[spec.id] = await loadCheckerboardAsAlpha(url) as any
      return
    }

    const tex = await tryLoadTexture(url, shouldTile(spec.id))
    if (tex) result[spec.id] = tex
  })

  await Promise.all(tasks)
  return result
}

export function* bucketEntries(
  textures: LoadedTextures,
  bucket: string,
): Generator<[string, THREE.Texture]> {
  for (const spec of Object.values(CYBER_ASSETS)) {
    if (spec.bucket !== bucket) continue
    const tex = textures[spec.id]
    if (tex) yield [spec.id, tex]
  }
}
