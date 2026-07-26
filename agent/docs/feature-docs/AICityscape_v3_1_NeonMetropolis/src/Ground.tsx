/* ============================================================================
 * Ground.tsx — v3.1 ground. Two parts, both matched to the RADIAL city:
 *
 *   1. ReflectiveGround: a wet asphalt floor via drei <MeshReflectorMaterial>.
 *      Cheap here because the whole skyline is ONE draw call. reflectionResolution
 *      (from graphics settings) scales cost; reflections={false} disables it.
 *
 *   2. RadialGrid: a shader overlay drawing CONCENTRIC RINGS + RADIAL SPOKES
 *      (the "roads" hint) that echoes the city shape and fades into fog.
 *
 * Exports Ground (compose both) and keeps a TronGround alias for back-compat.
 * ========================================================================== */
import * as THREE from 'three'
import { useMemo } from 'react'
import { MeshReflectorMaterial } from '@react-three/drei'
import { PALETTE } from './palette'

function RadialGrid({ size, ringSpacing = 30, spokes = 8, color = PALETTE.cyan }: {
  size: number; ringSpacing?: number; spokes?: number; color?: string
}) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uSpacing: { value: ringSpacing },
      uSpokes: { value: spokes },
      uFade: { value: size * 0.5 },
    },
    vertexShader: `
      varying vec2 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uSpacing; uniform float uSpokes; uniform float uFade;
      varying vec2 vWorld;
      float aaLine(float v, float period) {
        float x = v / period;
        float d = abs(fract(x - 0.5) - 0.5) / fwidth(x);
        return 1.0 - min(d, 1.0);
      }
      void main() {
        float rad = length(vWorld);
        float ang = atan(vWorld.y, vWorld.x);
        float rings = aaLine(rad, uSpacing);
        float major = aaLine(rad, uSpacing * 4.0);
        float spoke = aaLine(ang, 6.2831853 / uSpokes) * smoothstep(20.0, 120.0, rad);
        float g = max(max(rings * 0.5, major), spoke * 0.6);
        float fade = clamp(1.0 - rad / uFade, 0.0, 1.0);
        gl_FragColor = vec4(uColor, (0.06 + g) * fade);
      }`,
  }), [color, ringSpacing, spokes, size])

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.05} material={material} frustumCulled={false}>
      <planeGeometry args={[size, size]} />
    </mesh>
  )
}

export function Ground({
  size = 1200,
  ringSpacing = 30,
  spokes = 8,
  reflections = true,
  reflectionResolution = 256,
}: {
  size?: number; ringSpacing?: number; spokes?: number; reflections?: boolean; reflectionResolution?: number
}) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
        <planeGeometry args={[size, size]} />
        {reflections && reflectionResolution > 0 ? (
          <MeshReflectorMaterial
            key={reflectionResolution}
            resolution={reflectionResolution}
            mixBlur={1.2}
            mixStrength={5}
            blur={[400, 120]}
            roughness={0.92}
            depthScale={1.1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.3}
            color={PALETTE.void}
            metalness={0.7}
            mirror={0.4}
          />
        ) : (
          <meshStandardMaterial color={PALETTE.void} roughness={0.9} metalness={0.3} />
        )}
      </mesh>
      <RadialGrid size={size} ringSpacing={ringSpacing} spokes={spokes} />
    </group>
  )
}

// back-compat: earlier files imported TronGround
export const TronGround = Ground
export { RadialGrid }
