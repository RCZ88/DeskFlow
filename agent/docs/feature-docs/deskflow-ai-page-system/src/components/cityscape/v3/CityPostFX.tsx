/* ============================================================================
 * CityPostFX.tsx — the single most important cyberpunk lever: BLOOM.
 * Only bright/additive emissive stuff (windows, neon edges, car underglow,
 * tron grid) crosses the luminance threshold and glows. Keep it cheap.
 *
 * Requires: @react-three/postprocessing (npm i @react-three/postprocessing)
 * Render this INSIDE <Canvas>, once, after the scene.
 * ========================================================================== */
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing'

export function CityPostFX({ intensity = 1.0 }: { intensity?: number }) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={intensity}
        luminanceThreshold={0.55}
        luminanceSmoothing={0.2}
        mipmapBlur
        radius={0.75}
      />
      <Vignette offset={0.28} darkness={0.72} />
      <SMAA />
    </EffectComposer>
  )
}
