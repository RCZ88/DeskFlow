import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { makeUnderglow } from './proceduralTextures'
import { NEON_RAMP } from './palette'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()
const GLOW_FLAT = new THREE.Euler(-Math.PI / 2, 0, 0)

type Car =
  | { kind: 'orbit'; radius: number; angle: number; angVel: number; y: number; color: THREE.Color }
  | { kind: 'radial'; angle: number; t: number; dir: 1 | -1; vel: number; y: number; color: THREE.Color }

export function CityCars({
  rings,
  innerRadius,
  maxRadius,
  count = 70,
  linearSpeed = 26,
}: {
  rings: number[]
  innerRadius: number
  maxRadius: number
  count?: number
  linearSpeed?: number
}) {
  const bodyRef = useRef<THREE.InstancedMesh>(null!)
  const glowRef = useRef<THREE.InstancedMesh>(null!)
  const glowTex = useMemo(() => makeUnderglow(), [])

  const bodyGeo = useMemo(() => new THREE.BoxGeometry(2.2, 1.1, 4.4), [])
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x0b0e18, roughness: 0.45, metalness: 0.5 }), [])
  const glowGeo = useMemo(() => new THREE.PlaneGeometry(7, 11), [])
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
    map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }), [glowTex])

  const cars = useMemo<Car[]>(() => {
    if (!rings.length) return []
    const list: Car[] = []
    const nRadial = Math.round(count * 0.18)
    const nOrbit = count - nRadial
    for (let i = 0; i < nOrbit; i++) {
      const ringR = rings[1 + (i % Math.max(1, rings.length - 1))]
      const laneSide = (i % 2 === 0 ? 1 : -1) * 3.2
      const radius = ringR + laneSide
      const dir = i % 2 === 0 ? 1 : -1
      list.push({
        kind: 'orbit', radius,
        angle: Math.random() * Math.PI * 2,
        angVel: (dir * linearSpeed) / radius * (0.75 + Math.random() * 0.5),
        y: 1.0,
        color: new THREE.Color(NEON_RAMP[i % NEON_RAMP.length]),
      })
    }
    for (let i = 0; i < nRadial; i++) {
      list.push({
        kind: 'radial',
        angle: (i / Math.max(1, nRadial)) * Math.PI * 2,
        t: Math.random(),
        dir: Math.random() > 0.5 ? 1 : -1,
        vel: (linearSpeed * (0.7 + Math.random() * 0.5)) / (maxRadius - innerRadius),
        y: 1.0,
        color: new THREE.Color(NEON_RAMP[(i + 2) % NEON_RAMP.length]),
      })
    }
    return list
  }, [rings, innerRadius, maxRadius, count, linearSpeed])

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05)
    const body = bodyRef.current, glow = glowRef.current
    if (!body || !glow || !cars.length) return

    cars.forEach((c, i) => {
      let x: number, z: number, heading: number
      if (c.kind === 'orbit') {
        c.angle += c.angVel * step
        x = Math.cos(c.angle) * c.radius
        z = Math.sin(c.angle) * c.radius
        const sign = c.angVel >= 0 ? 1 : -1
        heading = Math.atan2(-Math.sin(c.angle) * sign, Math.cos(c.angle) * sign)
      } else {
        c.t += c.dir * c.vel * step
        if (c.t > 1) { c.t = 1; c.dir = -1 } else if (c.t < 0) { c.t = 0; c.dir = 1 }
        const rr = innerRadius + (maxRadius - innerRadius) * c.t
        x = Math.cos(c.angle) * rr
        z = Math.sin(c.angle) * rr
        heading = Math.atan2(Math.cos(c.angle) * c.dir, Math.sin(c.angle) * c.dir)
      }
      _p.set(x, c.y, z); _e.set(0, heading, 0); _q.setFromEuler(_e); _s.set(1, 1, 1)
      _m.compose(_p, _q, _s); body.setMatrixAt(i, _m); body.setColorAt(i, c.color)
      _p.set(x, 0.14, z); _q.setFromEuler(GLOW_FLAT)
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
