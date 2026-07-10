/* ============================================================================
 * CityEnvironment.tsx — sky + lighting + post. Fixes “too dark / not cyberpunk”
 * and the “why is a photo HDR the background” problem.
 *
 * Strategy:
 *  - HDR drives REFLECTIONS / ambient only (background=false). The night_sky.hdr
 *    is a real night plaza photo — great as a light probe, wrong as a literal
 *    backdrop.
 *  - The visible sky is the cyberpunk equirect (7a) on a big back-side sphere,
 *    plus exponential fog for depth.
 *  - Layered lights (hemisphere + cool moon key + warm fill) lift it out of the
 *    dark, and Bloom makes the neon windows/signs actually glow.
 *
 * Put <CityEnvironment/> inside <Canvas>. Wrap your scene contents in
 * <CityPostFX> (or render <EffectComposer> at the Canvas root).
 * Requires: @react-three/drei, @react-three/postprocessing.
 * ========================================================================== */
import * as THREE from 'three'
import { useMemo } from 'react'
import { Environment } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import type { LoadedTextures } from './cyberAssets'

export function CitySky({ textures, radius = 600 }: { textures: LoadedTextures; radius?: number }) {
  const tex = textures['7a'] as THREE.Texture | undefined
  const mat = useMemo(() => {
    if (tex) {
      tex.mapping = THREE.EquirectangularReflectionMapping
      tex.colorSpace = THREE.SRGBColorSpace
      return new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, toneMapped: false })
    }
    // gradient fallback so the sky is never a flat void / random photo
    return new THREE.MeshBasicMaterial({ color: '#0a0e1a', side: THREE.BackSide })
  }, [tex])
  return (
    <mesh material={mat} scale={[-1, 1, 1]}>
      <sphereGeometry args={[radius, 40, 24]} />
    </mesh>
  )
}

export function CityLighting() {
  return (
    <group>
      {/* fog gives the skyline depth and hides the world edge */}
      <fogExp2 attach="fog" args={[0x0a0e1a, 0.0016]} />
      <hemisphereLight args={[0x3a5a8c, 0x1a0f2e, 0.6]} />
      <ambientLight intensity={0.25} color={0x223049} />
      {/* cool moon key from up/behind for rim light on towers */}
      <directionalLight position={[120, 200, -80]} intensity={1.1} color={0x9fc4ff} castShadow shadow-mapSize={[2048, 2048]} />
      {/* warm city fill near the core */}
      <pointLight position={[0, 30, 0]} intensity={0.8} distance={260} decay={1.4} color={0xff8a3c} />
      <pointLight position={[60, 18, 60]} intensity={0.5} distance={160} decay={1.6} color={0xff3da6} />
      <pointLight position={[-60, 18, -40]} intensity={0.5} distance={160} decay={1.6} color={0x35e6ff} />
    </group>
  )
}

/** HDR-as-IBL only (no background). */
export function CityIBL() {
  return <Environment files="/cyber_assets/hdri/night_sky.hdr" background={false} environmentIntensity={0.7} />
}

/** Bloom is what makes it read as “neon cyberpunk”. Render once near Canvas root. */
export function CityPostFX() {
  return (
    <EffectComposer>
      <Bloom intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.2} mipmapBlur radius={0.8} />
      <Vignette eskil={false} offset={0.25} darkness={0.75} />
    </EffectComposer>
  )
}

/* gl recommendation (set on <Canvas gl=...>):
 *   toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.25,
 *   outputColorSpace: THREE.SRGBColorSpace
 */
