/* ============================================================================
 * RoadNetwork.tsx — textured roads + the viaduct that actually goes UP.
 *  - Surface roads: tiled asphalt (3a) plane at ground, with an additive neon
 *    lane overlay (3c) on arterials/highways. Uses the road TEXTURES that were
 *    going unused.
 *  - Elevated loop: BoxGeometry deck at seg.y, support pillars beneath, and
 *    sloped ramp decks — so the highway visibly rises (“bridge / road goes up”).
 *  - Render surface roads slightly above terrain to avoid z-fighting; never
 *    route cars onto the elevated set (handled in TrafficSystem / carGraph).
 * ========================================================================== */
import * as THREE from 'three'
import { useMemo } from 'react'
import type { SceneModel, RoadRibbon, RampRibbon, PillarSpot } from './buildScene'
import type { LoadedTextures } from './cyberAssets'
import { makeAsphaltMaterial, makeNeonLaneMaterial } from './cyberCityMaterials'

const PLANE = new THREE.PlaneGeometry(1, 1)
const BOX = new THREE.BoxGeometry(1, 1, 1)
const NEON_CLASSES = new Set(['highway', 'arterial'])

function SurfaceRoad({ r, tx }: { r: RoadRibbon; tx: LoadedTextures }) {
  const asphalt = useMemo(() => makeAsphaltMaterial(tx, r.length), [tx, r.length])
  const neon = useMemo(() => (NEON_CLASSES.has(r.klass) ? makeNeonLaneMaterial(tx, r.length) : null), [tx, r.klass, r.length])
  const [x, y, z] = r.center
  return (
    <group position={[x, y, z]} rotation={[-Math.PI / 2, 0, -r.rotationY]}>
      <mesh geometry={PLANE} material={asphalt} scale={[r.width, r.length, 1]} receiveShadow />
      {neon && <mesh geometry={PLANE} material={neon} scale={[r.width, r.length, 1]} position={[0, 0, 0.02]} />}
    </group>
  )
}

function ViaductDeck({ r, tx }: { r: RoadRibbon; tx: LoadedTextures }) {
  const mat = useMemo(() => makeAsphaltMaterial(tx, r.length), [tx, r.length])
  const [x, y, z] = r.center
  return (
    <group position={[x, y, z]} rotation={[0, r.rotationY, 0]}>
      <mesh geometry={BOX} material={mat} scale={[r.width, 0.6, r.length]} castShadow receiveShadow />
      {/* glowing edge rails */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[(r.width / 2) * s, 0.5, 0]}>
          <boxGeometry args={[0.2, 0.5, r.length]} />
          <meshBasicMaterial color={'#35e6ff'} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function Ramp({ r, tx }: { r: RampRibbon; tx: LoadedTextures }) {
  const mat = useMemo(() => makeAsphaltMaterial(tx, r.length), [tx, r.length])
  const slope = Math.atan2(r.yB - r.yA, r.length) // rise over run
  const [x, y, z] = r.center
  return (
    <group position={[x, y, z]} rotation={[0, r.rotationY, 0]}>
      <group rotation={[-slope, 0, 0]}>
        <mesh geometry={BOX} material={mat} scale={[r.width, 0.5, r.length / Math.cos(slope)]} castShadow receiveShadow />
      </group>
    </group>
  )
}

function Pillars({ pillars }: { pillars: PillarSpot[] }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#10141d', roughness: 0.9, metalness: 0.1 }), [])
  return (
    <group>
      {pillars.map((p, i) => (
        <mesh key={i} material={mat} position={[p.position[0], p.position[1] + p.height / 2, p.position[2]]}>
          <cylinderGeometry args={[0.9, 1.1, p.height, 8]} />
        </mesh>
      ))}
    </group>
  )
}

export function RoadNetwork({ scene, textures }: { scene: SceneModel; textures: LoadedTextures }) {
  const surface = scene.roads.filter(r => !r.elevated)
  const elevated = scene.roads.filter(r => r.elevated)
  return (
    <group>
      {surface.map(r => <SurfaceRoad key={r.id} r={r} tx={textures} />)}
      <Pillars pillars={scene.pillars} />
      {elevated.map(r => <ViaductDeck key={r.id} r={r} tx={textures} />)}
      {scene.ramps.map(r => <Ramp key={r.id} r={r} tx={textures} />)}
    </group>
  )
}
