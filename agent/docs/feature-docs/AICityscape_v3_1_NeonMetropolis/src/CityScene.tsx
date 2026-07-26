/* ============================================================================
 * CityScene.tsx — v3.1 top-level composition. Mount THIS.
 * RADIAL neon metropolis + glowing hero towers + wet reflective ground +
 * gradient sky + orbiting cars + bloom + click-to-stats.
 *
 * Deps: three, @react-three/fiber, @react-three/drei, @react-three/postprocessing
 * ========================================================================== */
import * as THREE from 'three'
import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { generateMetropolis, type HeroInput, type Tower } from './metropolis'
import { InstancedSkyline } from './InstancedSkyline'
import { HeroOverlays } from './HeroOverlays'
import { Ground } from './Ground'
import { SkyDome } from './SkyDome'
import { CityLighting } from './CityLighting'
import { CityPostFX } from './CityPostFX'
import { CityCars } from './CityCars'
import { StatsPanel } from './StatsPanel'

export interface CitySceneProps {
  heroes: HeroInput[]           // your real agent data (see dataAdapter.ts)
  seed?: string
  rings?: number                // radial density (default 10 concentric rings)
  reflections?: boolean         // wet-floor reflections (default true)
  hdrFile?: string              // optional IBL for reflections (NOT background)
}

const WRAP_STYLE: React.CSSProperties = { position: 'relative', width: '100%', height: '100%' }

export function CityScene({ heroes, seed = 'deskflow', rings = 10, reflections = true, hdrFile }: CitySceneProps) {
  const city = useMemo(() => generateMetropolis(heroes, { seed, rings }), [heroes, seed, rings])
  const heroTowers = useMemo(() => city.towers.filter(t => t.isHero), [city])
  const [selected, setSelected] = useState<Tower | null>(null)

  const maxR = city.bounds.maxRadius
  const cameraCfg = { position: [maxR * 1.05, maxR * 0.8, maxR * 1.05] as [number, number, number], fov: 50, far: 6000 }
  const glCfg = { antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }

  return (
    <div style={WRAP_STYLE}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={cameraCfg}
        gl={glCfg}
      >
        <SkyDome radius={maxR * 4} />
        <CityLighting hdrFile={hdrFile} />
        <Ground size={maxR * 2.6} ringSpacing={30} spokes={city.spokes.length} reflections={reflections} />
        <InstancedSkyline towers={city.towers} onSelect={(t) => { if (t?.isHero) setSelected(t) }} />
        <HeroOverlays heroes={heroTowers} />
        <CityCars rings={city.rings} innerRadius={city.bounds.innerRadius} maxRadius={maxR} count={70} />
        <OrbitControls enableDamping maxPolarAngle={Math.PI * 0.49} minDistance={40} maxDistance={maxR * 3.2} target={[0, 20, 0]} />
        <CityPostFX intensity={1.0} />
      </Canvas>
      <StatsPanel tower={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
