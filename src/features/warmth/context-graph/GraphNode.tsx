import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import type { GraphNode as GraphNodeType } from './types'
import { TYPE_COLORS, STATE_COLORS } from './types'

interface GraphNodeProps {
  node: GraphNodeType
  isSelected: boolean
  isDimmed: boolean
  onClick: () => void
  onHover: (hovered: boolean) => void
}

export function GraphNodeMesh({ node, isSelected, isDimmed, onClick, onHover }: GraphNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const color = STATE_COLORS[node.state] || TYPE_COLORS[node.type] || TYPE_COLORS.default
  const baseSize = 0.25 + Math.min(node.degree * 0.05, 0.4)

  useFrame(() => {
    if (meshRef.current) {
      // Position from physics
      meshRef.current.position.set(node.x, node.y, node.z)
      // Scale: hover > selected > normal, dimmed = 0.6x
      const targetScale = isDimmed ? 0.6 : hovered ? 1.25 : isSelected ? 1.15 : 1.0
      const s = meshRef.current.scale.x
      const newScale = s + (targetScale - s) * 0.12
      meshRef.current.scale.setScalar(newScale)
    }
  })

  const emissiveIntensity = node.state === 'active' ? 0.5 : node.state === 'blocked' ? 0.3 : 0.15
  const opacity = isDimmed ? 0.3 : 0.9

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[node.x, node.y, node.z]}
        onClick={(e) => { e.stopPropagation(); onClick() }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover(true) }}
        onPointerOut={() => { setHovered(false); onHover(false) }}
      >
        <sphereGeometry args={[baseSize, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.25}
          metalness={0.8}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Label — always visible */}
      <Billboard position={[node.x, node.y + baseSize + 0.3, node.z]}>
        <Text
          fontSize={0.18}
          color={isDimmed ? '#3f3f46' : '#a1a1aa'}
          anchorX="center"
          anchorY="bottom"
          maxWidth={4}
          font={undefined}
        >
          {node.name.length > 24 ? node.name.slice(0, 24) + '...' : node.name}
        </Text>
        <Text
          fontSize={0.12}
          color="#3f3f46"
          anchorX="center"
          anchorY="top"
          position={[0, -0.04, 0]}
        >
          {node.type}
        </Text>
      </Billboard>

      {/* Hover tooltip */}
      {hovered && !isDimmed && (
        <Html position={[node.x, node.y + baseSize + 0.6, node.z]} center distanceFactor={8}>
          <div style={{
            background: 'rgba(9,9,11,0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 11,
            color: '#a1a1aa',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            <div style={{ fontWeight: 600, color: '#fafafa', marginBottom: 2 }}>{node.name}</div>
            <div>{node.type} · {node.facts.length} facts</div>
          </div>
        </Html>
      )}
    </group>
  )
}
