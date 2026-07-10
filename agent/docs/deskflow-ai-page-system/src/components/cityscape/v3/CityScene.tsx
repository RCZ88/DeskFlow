/* ============================================================================
 * CityScene.tsx — top-level composition. THIS is what you mount in the app.
 * Dense metropolis + neon hero towers + tron ground + cars + bloom + click stats.
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
import { TronGround } from './TronGround'
import { CityLighting } from './CityLighting'
import { CityPostFX } from './CityPostFX'
import { CityCars } from './CityCars'
import { StatsPanel } from './StatsPanel'
import { PALETTE } from './palette'

export interface CitySceneProps {
  heroes: HeroInput[]           // your real agent data (see dataAdapter.ts)
  seed?: string
  blocks?: number               // metropolis density (14 default)
  hdrFile?: string              // optional: '/cyber_assets/hdri/night_sky.hdr' for IBL
}

const WRAP_STYLE: React.CSSProperties = { position: 'relative', width: '100%', height: '100%' }

export function CityScene({ heroes, seed = 'deskflow', blocks = 14, hdrFile }: CitySceneProps) {
  const city = useMemo(() => generateMetropolis(heroes, { seed, blocks }), [heroes, seed, blocks])
  const heroTowers = useMemo(() => city.towers.filter(t => t.isHero), [city])
  const [selected, setSelected] = useState<Tower | null>(null)

  const half = city.bounds.half
  const cameraCfg = { position: [half * 0.9, half * 0.7, half * 0.9] as [number, number, number], fov: 50, far: 4000 }
  const glCfg = { antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.25 }

  return (
    <div style={WRAP_STYLE}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={cameraCfg}
        gl={glCfg}
        onCreated={({ scene }) => { scene.background = new THREE.Color(PALETTE.void) }}
      >
        <CityLighting hdrFile={hdrFile} />
        <TronGround size={half * 3} />
        <InstancedSkyline towers={city.towers} onSelect={(t) => { if (t?.isHero) setSelected(t) }} />
        <HeroOverlays heroes={heroTowers} />
        <CityCars lanes={city.lanes} count={60} />
        <OrbitControls enableDamping maxPolarAngle={Math.PI * 0.49} minDistance={40} maxDistance={half * 3} />
        <CityPostFX intensity={1.0} />
      </Canvas>
      <StatsPanel tower={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
