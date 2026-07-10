/* ============================================================================
 * CityCars.tsx — stylized instanced cars with CODE-GENERATED neon underglow.
 * No GLB, no upside-down car bug. Two instanced meshes:
 *   - dark car bodies (boxes)
 *   - additive underglow planes (radial glow sprite) tinted neon, hovering just
 *     above the street; bloom turns these into the classic cyberpunk underglow.
 * Cars ride the street lanes, clamp speed, and face travel direction.
 * ========================================================================== */
import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Lane } from './metropolis'
import { makeUnderglow } from './proceduralTextures'
import { NEON_RAMP } from './palette'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()

interface CarState { lane: number; t: number; dir: 1 | -1; speed: number; color: THREE.Color; offset: number }

export function CityCars({ lanes, count = 60, speed = 22 }: { lanes: Lane[]; count?: number; speed?: number }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null!)
  const glowRef = useRef<THREE.InstancedMesh>(null!)
  const glowTex = useMemo(() => makeUnderglow(), [])

  const bodyGeo = useMemo(() => new THREE.BoxGeometry(2.2, 1.1, 4.4), [])
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x0b0e18, roughness: 0.5, metalness: 0.4 }), [])
  const glowGeo = useMemo(() => new THREE.PlaneGeometry(6, 9), [])
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
    map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }), [glowTex])

  const cars = useMemo<CarState[]>(() => {
    if (!lanes.length) return []
    return Array.from({ length: count }, (_, i) => ({
      lane: i % lanes.length,
      t: Math.random(),
      dir: Math.random() > 0.5 ? 1 : -1,
      speed: speed * (0.7 + Math.random() * 0.6),
      color: new THREE.Color(NEON_RAMP[i % NEON_RAMP.length]),
      offset: (Math.random() > 0.5 ? 1 : -1) * 2.2, // pick a side of the street
    }))
  }, [lanes, count, speed])

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05)
    const body = bodyRef.current, glow = glowRef.current
    if (!body || !glow) return
    cars.forEach((c, i) => {
      const ln = lanes[c.lane]
      const len = Math.hypot(ln.x2 - ln.x1, ln.z2 - ln.z1) || 1
      c.t += (c.speed * step) / len
      if (c.t > 1) { c.t = 0; c.lane = (c.lane + 7) % lanes.length }
      const tt = c.dir > 0 ? c.t : 1 - c.t
      let x = ln.x1 + (ln.x2 - ln.x1) * tt
      let z = ln.z1 + (ln.z2 - ln.z1) * tt
      // shift to a side of the lane so opposing traffic doesn't overlap
      if (ln.axis === 'z') x += c.offset; else z += c.offset
      const heading = ln.axis === 'z' ? 0 : Math.PI / 2
      // body
      _p.set(x, 0.8, z); _e.set(0, heading, 0); _q.setFromEuler(_e); _s.set(1, 1, 1)
      _m.compose(_p, _q, _s); body.setMatrixAt(i, _m); body.setColorAt(i, c.color)
      // underglow (flat on ground)
      _p.set(x, 0.12, z); _e.set(-Math.PI / 2, 0, heading); _q.setFromEuler(_e)
      _m.compose(_p, _q, _s); glow.setMatrixAt(i, _m); glow.setColorAt(i, c.color)
    })
    body.instanceMatrix.needsUpdate = true
    glow.instanceMatrix.needsUpdate = true
    if (body.instanceColor) body.instanceColor.needsUpdate = true
    if (glow.instanceColor) glow.instanceColor.needsUpdate = true
  })

  if (!cars.length) return null
  return (
    <group>
      <instancedMesh ref={bodyRef} args={[bodyGeo, bodyMat, cars.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={glowRef} args={[glowGeo, glowMat, cars.length]} frustumCulled={false} />
    </group>
  )
}
