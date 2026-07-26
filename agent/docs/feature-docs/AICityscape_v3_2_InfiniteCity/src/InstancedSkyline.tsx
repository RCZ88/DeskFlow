/* ============================================================================
 * InstancedSkyline.tsx — v3.2. The WHOLE city in ONE InstancedMesh (1 draw call).
 * Per-instance transform (footprint + height + TANGENTIAL ROTATION) and
 * per-instance neon / emissive / hero-flag / pulse-phase / SIZE (for world-unit
 * window tiling in the procedural facade). Drives uTime for the hero pulse.
 * ========================================================================== */
import * as THREE from 'three'
import { useMemo, useRef, useLayoutEffect } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import type { Tower } from './metropolis'
import { makeBuildingMaterial } from './cityMaterials'
import { hexToRgb } from './palette'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()

export function InstancedSkyline({
  towers,
  onSelect,
  onHover,
}: {
  towers: Tower[]
  onSelect?: (t: Tower | null) => void
  onHover?: (t: Tower | null) => void
}) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const material = useMemo(() => makeBuildingMaterial(), [])
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])

  useLayoutEffect(() => {
    const mesh = ref.current
    const count = towers.length
    const neon = new Float32Array(count * 3)
    const emis = new Float32Array(count)
    const hero = new Float32Array(count)
    const phase = new Float32Array(count)
    const size = new Float32Array(count * 3)

    towers.forEach((t, i) => {
      _p.set(t.x, t.height / 2, t.z)
      _e.set(0, t.rotationY ?? 0, 0)
      _q.setFromEuler(_e)
      _s.set(t.w, t.height, t.d)
      _m.compose(_p, _q, _s)
      mesh.setMatrixAt(i, _m)
      const [r, g, b] = hexToRgb(t.neon)
      neon[i * 3] = r; neon[i * 3 + 1] = g; neon[i * 3 + 2] = b
      emis[i] = t.emissive
      hero[i] = t.isHero ? 1 : 0
      phase[i] = (i * 0.618) % (Math.PI * 2)
      size[i * 3] = t.w; size[i * 3 + 1] = t.height; size[i * 3 + 2] = t.d
    })

    geometry.setAttribute('aNeon', new THREE.InstancedBufferAttribute(neon, 3))
    geometry.setAttribute('aEmis', new THREE.InstancedBufferAttribute(emis, 1))
    geometry.setAttribute('aHero', new THREE.InstancedBufferAttribute(hero, 1))
    geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1))
    geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 3))
    mesh.instanceMatrix.needsUpdate = true
    mesh.count = count
    mesh.computeBoundingSphere()
  }, [towers, geometry])

  // drive the GPU hero pulse
  useFrame((state) => {
    const shader = (material.userData as { shader?: { uniforms: { uTime: { value: number } } } }).shader
    if (shader) shader.uniforms.uTime.value = state.clock.elapsedTime
  })

  const pick = (e: ThreeEvent<PointerEvent>, cb?: (t: Tower | null) => void) => {
    if (e.instanceId == null) return
    cb?.(towers[e.instanceId] ?? null)
  }

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, towers.length]}
      castShadow
      receiveShadow
      frustumCulled={false}
      onClick={(e) => { e.stopPropagation(); pick(e, onSelect) }}
      onPointerMove={(e) => { e.stopPropagation(); pick(e, onHover) }}
      onPointerOut={() => onHover?.(null)}
    />
  )
}
