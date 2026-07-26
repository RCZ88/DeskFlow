/* ============================================================================
 * TrafficSystem.tsx — moving + parked cars that face the right way, stay on the
 * road graph, and don't float or land on trees.
 *
 * Fixes:
 *  - Wrong facing / standing up: each GLB is wrapped so the OUTER group sets
 *    travel heading (rotationY) and an INNER group applies ASSET_META.rotX
 *    (car-1/5/6 are authored Z-up — lay them flat). One transform can’t do both,
 *    which is why cars were vertical/backwards before.
 *  - Insane speed / circling: speed is clamped and cars traverse the SURFACE
 *    carGraph edges only (the elevated viaduct is excluded from the graph).
 *  - Cars on trees / floating: positions come from carGraph nodes (road
 *    centerlines) and parking anchors, with y pinned to ground.
 *  - Broken assets car-2/car-7 are never spawned (see ASSET_META.use).
 * ========================================================================== */
import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { SceneModel, ParkingInstance } from './buildScene'
import { ASSET_META, CAR_MODELS } from './buildScene'

const MODEL_URL = (m: string) => `/cyber_assets/models/${m}.glb`
const CAR_SPEED = 7 // world units / sec (clamped — no more rocket cars)
const GROUND_LIFT = 0.05

/** Clone a car GLB and turn head/tail lights emissive for night. */
function useCarScene(model: string) {
  const { scene } = useGLTF(MODEL_URL(model)) as any
  return useMemo(() => {
    const root = scene.clone(true) as THREE.Object3D
    root.traverse((o: any) => {
      if (!o.isMesh) return
      o.castShadow = true
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      for (const m of mats) {
        if (!m) continue
        const n = (m.name || '').toLowerCase()
        if (n.includes('headlight')) { m.emissive = new THREE.Color('#fff4d6'); m.emissiveIntensity = 3 }
        else if (n.includes('taillight')) { m.emissive = new THREE.Color('#ff2a2a'); m.emissiveIntensity = 3 }
        else if (n.includes('window')) { m.emissive = new THREE.Color('#39c6ff'); m.emissiveIntensity = 0.6 }
      }
    })
    return root
  }, [scene, model])
}

/** Wraps a car so heading (Y) and the model's up-axis fix (X) compose correctly. */
function Car({ model, position, headingY }: { model: string; position: [number, number, number]; headingY: number }) {
  const obj = useCarScene(model)
  const rotX = ASSET_META[model]?.rotX ?? 0
  return (
    <group position={position} rotation={[0, headingY, 0]}>
      <group rotation={[rotX, 0, 0]}>
        <primitive object={obj} />
      </group>
    </group>
  )
}

interface Mover { model: string; edge: number; t: number; speed: number; dir: 1 | -1 }

export function MovingCars({ scene, count = 26 }: { scene: SceneModel; count?: number }) {
  const edges = scene.carGraph.edges
  const nodeById = useMemo(() => {
    const m = new Map<string, { x: number; z: number }>()
    for (const n of scene.carGraph.nodes) m.set(n.id, n)
    return m
  }, [scene])
  const movers = useRef<Mover[]>(
    Array.from({ length: Math.min(count, Math.max(1, edges.length * 2)) }, (_, i) => ({
      model: CAR_MODELS[i % CAR_MODELS.length],
      edge: i % Math.max(1, edges.length),
      t: (i * 0.137) % 1,
      speed: CAR_SPEED * (0.8 + 0.4 * ((i * 0.31) % 1)),
      dir: i % 2 ? 1 : -1,
    })),
  )
  const groups = useRef<(THREE.Group | null)[]>([])

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05)
    movers.current.forEach((mv, i) => {
      const e = edges[mv.edge]; if (!e) return
      const a = nodeById.get(e.from), b = nodeById.get(e.to); if (!a || !b) return
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1
      mv.t += (mv.speed * step) / len
      if (mv.t >= 1) { // hop to a connected edge at the node we arrived at
        mv.t = 0
        const arrived = mv.dir > 0 ? e.to : e.from
        const next = edges.findIndex((ed, j) => j !== mv.edge && (ed.from === arrived || ed.to === arrived))
        mv.edge = next >= 0 ? next : (mv.edge + 1) % edges.length
      }
      const A = mv.dir > 0 ? a : b, B = mv.dir > 0 ? b : a
      const x = A.x + (B.x - A.x) * mv.t, z = A.z + (B.z - A.z) * mv.t
      const g = groups.current[i]
      if (g) {
        g.position.set(x, scene.terrainHeightAt(x, z) + GROUND_LIFT, z)
        g.rotation.y = Math.atan2(B.x - A.x, B.z - A.z)
      }
    })
  })

  return (
    <group>
      {movers.current.map((mv, i) => {
        const rotX = ASSET_META[mv.model]?.rotX ?? 0
        const obj = useCarScene(mv.model)
        return (
          <group key={i} ref={(r) => (groups.current[i] = r)}>
            <group rotation={[rotX, 0, 0]}><primitive object={obj} /></group>
          </group>
        )
      })}
    </group>
  )
}

export function ParkedCars({ parking }: { parking: ParkingInstance[] }) {
  return (
    <group>
      {parking.map((p, i) => (
        <Car key={i} model={p.modelType} position={p.position} headingY={p.rotationY} />
      ))}
    </group>
  )
}

CAR_MODELS.forEach(m => useGLTF.preload(MODEL_URL(m)))
