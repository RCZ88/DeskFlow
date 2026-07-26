/* ============================================================================
 * HeroOverlays.tsx — things drawn ONLY for the few hero towers (cheap):
 *  - a neon roofline frame (additive edges -> bloom makes it glow)
 *  - a floating billboard label: model name + token count + live dot
 * Decoration towers get none of this (keeps the scene fast + readable).
 * ========================================================================== */
import * as THREE from 'three'
import { useMemo } from 'react'
import { Billboard, Text } from '@react-three/drei'
import type { Tower } from './metropolis'
import { makeLineNeon } from './cityMaterials'

function fmt(n?: number) {
  if (n == null) return ''
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'
  return String(n)
}

function Roofline({ t }: { t: Tower }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(t.w * 1.02, t.height * 1.01, t.d * 1.02)), [t])
  const mat = useMemo(() => makeLineNeon(t.neon), [t.neon])
  return <lineSegments geometry={geo} material={mat} position={[t.x, t.height / 2, t.z]} />
}

export function HeroOverlays({ heroes }: { heroes: Tower[] }) {
  return (
    <group>
      {heroes.map((t) => (
        <group key={t.id}>
          <Roofline t={t} />
          <Billboard position={[t.x, t.height + 10, t.z]}>
            <Text fontSize={5} color={t.neon} anchorX="center" anchorY="bottom" outlineWidth={0.15} outlineColor="#05070d">
              {t.label ?? t.agentId ?? ''}
            </Text>
            <Text position={[0, -1.2, 0]} fontSize={3.4} color="#cfe8ff" anchorX="center" anchorY="top">
              {`${fmt(t.tokens)} tok${t.active ? '  ● live' : ''}`}
            </Text>
          </Billboard>
        </group>
      ))}
    </group>
  )
}
