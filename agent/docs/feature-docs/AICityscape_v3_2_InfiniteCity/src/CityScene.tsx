/* ============================================================================
 * CityScene.tsx — v3.2 top-level composition. Mount THIS.
 * RADIAL neon metropolis + procedural interior-mapped facades + INFINITE wet
 * ground (dissolves into darkness) + gradient sky + orbit cars + contact-shadow
 * grounding + bloom + click-to-stats + graphics settings.
 *
 * Deps: three, @react-three/fiber, @react-three/drei, @react-three/postprocessing
 * ========================================================================== */
import * as THREE from 'three'
import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import { generateMetropolis, type HeroInput, type Tower } from './metropolis'
import { InstancedSkyline } from './InstancedSkyline'
import { HeroOverlays } from './HeroOverlays'
import { Ground } from './Ground'
import { SkyDome } from './SkyDome'
import { CityLighting } from './CityLighting'
import { CityPostFX } from './CityPostFX'
import { CityCars } from './CityCars'
import { StatsPanel } from './StatsPanel'
import { GraphicsMenu } from './GraphicsMenu'
import { PRESETS, loadQuality, saveQuality, type QualityTier } from './graphicsPresets'

export interface CitySceneProps {
  heroes: HeroInput[]           // your real agent data (see dataAdapter.ts)
  seed?: string
  rings?: number                // radial density (default 10 concentric rings)
  quality?: QualityTier         // initial graphics preset (default: saved or 'high')
  showGraphicsMenu?: boolean    // show the in-scene quality picker (default true)
  hdrFile?: string              // optional IBL for reflections (NOT background)
}

const WRAP_STYLE: React.CSSProperties = { position: 'relative', width: '100%', height: '100%' }
const SHADOW_COLOR = '#04060c'

export function CityScene({
  heroes, seed = 'deskflow', rings = 10, quality, showGraphicsMenu = true, hdrFile,
}: CitySceneProps) {
  const city = useMemo(() => generateMetropolis(heroes, { seed, rings }), [heroes, seed, rings])
  const heroTowers = useMemo(() => city.towers.filter(t => t.isHero), [city])
  const [selected, setSelected] = useState<Tower | null>(null)
  const [tier, setTier] = useState<QualityTier>(() => quality ?? loadQuality())
  const gfx = PRESETS[tier]
  const setQuality = (t: QualityTier) => { setTier(t); saveQuality(t) }

  const maxR = city.bounds.maxRadius
  const cameraCfg = { position: [maxR * 1.05, maxR * 0.8, maxR * 1.05] as [number, number, number], fov: 50, far: 8000 }
  const glCfg = { antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }

  return (
    <div style={WRAP_STYLE}>
      <Canvas
        shadows={gfx.shadows}
        dpr={[1, gfx.dpr]}
        camera={cameraCfg}
        gl={glCfg}
      >
        <SkyDome radius={maxR * 4} stars={gfx.stars} />
        <CityLighting hdrFile={hdrFile} />
        <Ground maxRadius={maxR} spokes={city.spokes.length} reflections={gfx.reflections} reflectionResolution={gfx.reflectionResolution} />
        {gfx.contactShadows && (
          <ContactShadows
            position={[0, 0.15, 0]}
            scale={maxR * 2.4}
            resolution={1024}
            far={maxR}
            blur={2.6}
            opacity={0.75}
            color={SHADOW_COLOR}
            frames={1}
          />
        )}
        <InstancedSkyline towers={city.towers} onSelect={(t) => { if (t?.isHero) setSelected(t) }} />
        <HeroOverlays heroes={heroTowers} />
        <CityCars rings={city.rings} innerRadius={city.bounds.innerRadius} maxRadius={maxR} count={gfx.carCount} />
        <OrbitControls enableDamping maxPolarAngle={Math.PI * 0.49} minDistance={40} maxDistance={maxR * 3.2} target={[0, 20, 0]} />
        <group key={`fx-${gfx.bloom}-${gfx.bloomIntensity}`}>
          <CityPostFX enabled={gfx.bloom} intensity={gfx.bloomIntensity} />
        </group>
      </Canvas>
      {showGraphicsMenu && <GraphicsMenu value={tier} onChange={setQuality} />}
      <StatsPanel tower={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
