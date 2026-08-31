import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { GraphNode, GraphLink } from './types'

const edgeVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const edgeFragment = `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uTime;
uniform float uSpeed;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  float normalizedDist = vUv.x;
  vec3 color = mix(uColorA, uColorB, normalizedDist);
  float flow = fract(normalizedDist * 3.0 - uTime * uSpeed);
  float pulse = smoothstep(0.0, 0.2, flow) * smoothstep(0.8, 0.6, flow);
  float finalAlpha = (0.08 + pulse * 0.6) * uOpacity;
  gl_FragColor = vec4(color, finalAlpha);
}
`

interface GraphEdgeProps {
  link: GraphLink
  nodeMap: Map<string, GraphNode>
  isDimmed: boolean
  isHighlighted: boolean
}

export function GraphEdge({ link, nodeMap, isDimmed, isHighlighted }: GraphEdgeProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const geoRef = useRef<THREE.TubeGeometry | null>(null)

  const sId = typeof link.source === 'string' ? link.source : (link.source as any).id
  const tId = typeof link.target === 'string' ? link.target : (link.target as any).id
  const from = nodeMap.get(sId)
  const to = nodeMap.get(tId)

  const colorHex = isHighlighted ? '#8b5cf6' : '#3f3f46'

  const uniforms = useMemo(() => ({
    uColorA: { value: new THREE.Color(colorHex) },
    uColorB: { value: new THREE.Color(colorHex).multiplyScalar(1.4) },
    uTime: { value: 0 },
    uSpeed: { value: 0.5 },
    uOpacity: { value: isDimmed ? 0.05 : isHighlighted ? 1.0 : 0.5 },
  }), [colorHex, isDimmed, isHighlighted])

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
    }
  })

  const geometry = useMemo(() => {
    if (!from || !to) return null
    const start = new THREE.Vector3(from.x, from.y, from.z)
    const end = new THREE.Vector3(to.x, to.y, to.z)
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    const curve = new THREE.CatmullRomCurve3([start, mid, end])
    return new THREE.TubeGeometry(curve, 20, 0.02, 8, false)
  }, [from?.x, from?.y, from?.z, to?.x, to?.y, to?.z])

  useEffect(() => {
    return () => { geoRef.current?.dispose() }
  }, [geometry])

  if (!geometry || !from || !to) return null

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={edgeVertex}
        fragmentShader={edgeFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
