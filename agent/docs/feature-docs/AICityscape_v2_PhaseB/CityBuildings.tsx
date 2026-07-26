/* ============================================================================
 * CityBuildings.tsx — renders the skyline from textured boxes.
 *  - Hero towers (the AI models): individual meshes, per-hero neon tint,
 *    brighter lit windows, and a floating HeroLabel (model name + tokens).
 *  - Decoration buildings: instanced per tier, dimmer, neutral — visually
 *    subordinate so the data towers read as the subject.
 * Replaces the old InstancedBuildings (which drew bare/silver GLBs).
 * ========================================================================== */
import * as THREE from 'three'
import { useMemo } from 'react'
import { Billboard, Text } from '@react-three/drei'
import type { BuildingInstance } from './buildScene'
import type { LoadedTextures } from './cyberAssets'
import { makeBuildingMaterial } from './cyberCityMaterials'

const BOX = new THREE.BoxGeometry(1, 1, 1)

function fmt(n?: number): string {
  if (n == null) return ''
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

function HeroTower({ b, tx }: { b: BuildingInstance; tx: LoadedTextures }) {
  const mat = useMemo(
    () => makeBuildingMaterial(tx, { tier: b.tier, floors: b.floors, widthUnits: b.fit[0], active: b.active, isHero: true, tint: b.color }),
    [tx, b.tier, b.floors, b.fit, b.active, b.color],
  )
  const [w, h, d] = b.fit
  const [x, gy, z] = b.position
  const color = b.color ?? '#67e8f9'
  return (
    <group position={[x, gy, z]} rotation={[0, b.rotationY, 0]}>
      <mesh geometry={BOX} material={mat} position={[0, h / 2, 0]} scale={[w, h, d]} castShadow receiveShadow />
      {/* neon roof crown so the data tower pops */}
      <mesh position={[0, h + 0.4, 0]}>
        <boxGeometry args={[w * 1.02, 0.8, d * 1.02]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <Billboard position={[0, h + 6, 0]}>
        <Text fontSize={3.2} color={color} anchorX="center" anchorY="bottom" outlineWidth={0.12} outlineColor="#000" maxWidth={40}>
          {b.label ?? b.heroId ?? ''}
        </Text>
        <Text position={[0, -0.4, 0]} fontSize={2.1} color="#e5f2ff" anchorX="center" anchorY="top" outlineWidth={0.08} outlineColor="#000">
          {fmt(b.metricValue)} tok{b.active ? '  ● live' : ''}
        </Text>
      </Billboard>
    </group>
  )
}

function DecoTier({ tier, items, tx }: { tier: BuildingInstance['tier']; items: BuildingInstance[]; tx: LoadedTextures }) {
  // shared material per tier; one InstancedMesh keeps draw calls low
  const avgW = items.reduce((s, b) => s + b.fit[0], 0) / Math.max(1, items.length)
  const avgF = Math.round(items.reduce((s, b) => s + b.floors, 0) / Math.max(1, items.length))
  const mat = useMemo(() => makeBuildingMaterial(tx, { tier, floors: avgF, widthUnits: avgW, isHero: false }), [tx, tier, avgF, avgW])
  const ref = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const v = new THREE.Vector3()
    items.forEach((b, i) => {
      const [w, h, d] = b.fit; const [x, gy, z] = b.position
      q.setFromEuler(new THREE.Euler(0, b.rotationY, 0))
      m.compose(new THREE.Vector3(x, gy + h / 2, z), q, v.set(w, h, d))
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
  }
  return <instancedMesh ref={ref} args={[BOX, mat, items.length]} castShadow receiveShadow />
}

export function CityBuildings({ buildings, textures }: { buildings: BuildingInstance[]; textures: LoadedTextures }) {
  const heroes = buildings.filter(b => b.heroId)
  const deco = buildings.filter(b => !b.heroId)
  const tiers: BuildingInstance['tier'][] = ['low', 'med', 'tall']
  return (
    <group>
      {tiers.map(t => {
        const items = deco.filter(b => b.tier === t)
        return items.length ? <DecoTier key={t} tier={t} items={items} tx={textures} /> : null
      })}
      {heroes.map(b => <HeroTower key={b.id} b={b} tx={textures} />)}
    </group>
  )
}
