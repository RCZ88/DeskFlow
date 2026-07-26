/* ============================================================================
 * CityPostFX.tsx — the single most important cyberpunk lever: BLOOM.
 * Only bright/additive emissive stuff (windows, neon edges, car underglow)
 * crosses the luminance threshold and glows. Controlled by graphics settings.
 *
 * Requires: @react-three/postprocessing (npm i @react-three/postprocessing)
 * Render this INSIDE <Canvas>, once, after the scene.
 * ========================================================================== */
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing'

export function CityPostFX({ enabled = true, intensity = 1.0 }: { enabled?: boolean; intensity?: number }) {
  if (!enabled) return null
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
