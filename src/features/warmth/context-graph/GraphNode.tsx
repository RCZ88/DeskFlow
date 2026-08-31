import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import type { GraphNode as GraphNodeType } from './types'
import { TYPE_COLORS, STATE_COLORS } from './types'

const nodeVertex = `
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`

const nodeFragment = `
uniform vec3 uColor;
uniform float uTime;
uniform float uPulseSpeed;
uniform float uEmissiveBoost;
uniform float uOpacity;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.5);
  float pulse = sin(uTime * uPulseSpeed) * 0.5 + 0.5;
  float coreIntensity = 0.2 + (pulse * 0.4) + uEmissiveBoost;
  vec3 core = uColor * coreIntensity;
  vec3 rim = uColor * fresnel * (1.5 + uEmissiveBoost);
  gl_FragColor = vec4(core + rim, uOpacity);
}
`

interface GraphNodeProps {
  node: GraphNodeType
  isSelected: boolean
  isMultiSelected: boolean
  isDimmed: boolean
  flash: boolean
  onClick: (event: any) => void
  onHover: (hovered: boolean) => void
}

export function GraphNodeMesh({ node, isSelected, isMultiSelected, isDimmed, flash, onClick, onHover }: GraphNodeProps) {
  const coreRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const colorHex = STATE_COLORS[node.state] || TYPE_COLORS[node.type] || TYPE_COLORS.default
  const color = useMemo(() => new THREE.Color(colorHex), [colorHex])
  const baseSize = 0.25 + Math.min(node.degree * 0.05, 0.4)
  const pulseSpeed = 0.5 + (node.facts.length * 0.1)
  const emissiveBoost = node.state === 'active' ? 0.4 : isSelected || isMultiSelected ? 0.3 : 0.0

  const uniforms = useMemo(() => ({
    uColor: { value: color },
    uTime: { value: 0 },
    uPulseSpeed: { value: pulseSpeed },
    uEmissiveBoost: { value: emissiveBoost },
    uOpacity: { value: isDimmed ? 0.25 : 1.0 },
  }), [colorHex, pulseSpeed, emissiveBoost, isDimmed])

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    uniforms.uTime.value = time
    uniforms.uEmissiveBoost.value = flash ? 2.0 : emissiveBoost
    uniforms.uOpacity.value = isDimmed ? 0.25 : 1.0

    if (coreRef.current) {
      coreRef.current.position.set(
        node.x,
        node.y + Math.sin(time * 0.5 + node.x) * 0.002,
        node.z
      )
      const targetScale = isDimmed ? 0.6 : hovered ? 1.2 : isSelected ? 1.15 : 1.0
      coreRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)
    }

    if (glowRef.current) {
      glowRef.current.position.copy(coreRef.current.position)
      const glowScale = baseSize * (1.4 + Math.sin(time * pulseSpeed) * 0.1)
      glowRef.current.scale.setScalar(glowScale)
    }

    if (ringRef.current) {
      ringRef.current.position.copy(coreRef.current.position)
      const ringScale = (isSelected || isMultiSelected || hovered) ? 1.8 + Math.sin(time * 2) * 0.2 : 0
      ringRef.current.scale.lerp(new THREE.Vector3(ringScale, ringScale, ringScale), 0.1)
      ringRef.current.lookAt(state.camera.position)
    }
  })

  return (
    <group>
      {/* Layer 1: Core Shard (Custom Shader) */}
      <mesh
        ref={coreRef}
        onClick={(e) => { e.stopPropagation(); onClick(e) }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover(true) }}
        onPointerOut={() => { setHovered(false); onHover(false) }}
      >
        <icosahedronGeometry args={[baseSize, 1]} />
        <shaderMaterial
          vertexShader={nodeVertex}
          fragmentShader={nodeFragment}
          uniforms={uniforms}
          transparent
        />
      </mesh>

      {/* Layer 2: Glow Shell (Additive Blending) */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[baseSize * 1.2, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isDimmed ? 0.02 : 0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Layer 3: Pulse Ring (Selection/Hover indicator) */}
      <mesh ref={ringRef}>
        <torusGeometry args={[baseSize * 1.5, 0.02, 16, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Label */}
      <Billboard position={[node.x, node.y + baseSize + 0.4, node.z]}>
        <Text
          fontSize={0.18}
          color={isDimmed ? '#3f3f46' : '#fafafa'}
          anchorX="center"
          anchorY="bottom"
          maxWidth={4}
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {node.name.length > 24 ? node.name.slice(0, 24) + '...' : node.name}
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
