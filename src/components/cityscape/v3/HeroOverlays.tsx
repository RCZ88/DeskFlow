import * as THREE from 'three'
import { useMemo } from 'react'
import { Html } from '@react-three/drei'
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
  return <lineSegments geometry={geo} material={mat} position={[t.x, t.height / 2, t.z]} rotation={[0, t.rotationY ?? 0, 0]} />
}

function HeroLabel({ t }: { t: Tower }) {
  return (
    <Html
      position={[t.x, t.height + 10, t.z]}
      center
      distanceFactor={120}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div style={{
        textAlign: 'center',
        whiteSpace: 'nowrap',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        textShadow: '0 0 8px #05070d, 0 0 16px #05070d',
        lineHeight: 1.2,
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: t.neon }}>
          {t.label ?? t.agentId ?? ''}
        </div>
        <div style={{ fontSize: 16, color: '#cfe8ff' }}>
          {`${fmt(t.tokens)} tok${t.active ? '  ● live' : ''}`}
        </div>
      </div>
    </Html>
  )
}

export function HeroOverlays({ heroes }: { heroes: Tower[] }) {
  return (
    <group>
      {heroes.map((t) => (
        <group key={t.id}>
          <Roofline t={t} />
          <HeroLabel t={t} />
        </group>
      ))}
    </group>
  )
}
