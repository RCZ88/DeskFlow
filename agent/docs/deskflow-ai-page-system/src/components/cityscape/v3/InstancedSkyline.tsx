/* ============================================================================
 * InstancedSkyline.tsx — the WHOLE city in ONE InstancedMesh (1 draw call).
 * Per-instance transform (footprint + height), per-instance neon color and
 * emissive intensity via instanced attributes. Click a tower -> onSelect.
 *
 * Dense metropolis friendly: handles hundreds/thousands of towers cheaply.
 * ========================================================================== */
import * as THREE from 'three'
import { useMemo, useRef, useLayoutEffect } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { Tower } from './metropolis'
import { makeBuildingMaterial } from './cityMaterials'
import { makeWindowMask } from './proceduralTextures'
import { hexToRgb } from './palette'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
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
  const mask = useMemo(() => makeWindowMask(), [])
  const material = useMemo(() => makeBuildingMaterial(mask), [mask])
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])

  useLayoutEffect(() => {
    const mesh = ref.current
    const count = towers.length
    const neon = new Float32Array(count * 3)
    const emis = new Float32Array(count)

    towers.forEach((t, i) => {
      _p.set(t.x, t.height / 2, t.z)
      _q.identity()
      _s.set(t.w, t.height, t.d)
      _m.compose(_p, _q, _s)
      mesh.setMatrixAt(i, _m)
      const [r, g, b] = hexToRgb(t.neon)
      neon[i * 3] = r; neon[i * 3 + 1] = g; neon[i * 3 + 2] = b
      emis[i] = t.emissive
    })

    geometry.setAttribute('aNeon', new THREE.InstancedBufferAttribute(neon, 3))
    geometry.setAttribute('aEmis', new THREE.InstancedBufferAttribute(emis, 1))
    // per-tower vertical tiling of the window mask so floors line up
    mesh.instanceMatrix.needsUpdate = true
    mesh.count = count
    mesh.computeBoundingSphere()
  }, [towers, geometry])

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
