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
