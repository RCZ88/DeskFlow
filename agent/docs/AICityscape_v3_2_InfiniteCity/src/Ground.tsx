/* ============================================================================
 * Ground.tsx — v3.2 INFINITE ground. Fixes the "floating diamond slab" by:
 *
 *   1. INFINITE FADE — a big CIRCULAR disc whose color fades to the void/fog
 *      color at the rim (no visible edge). Same trick the three.js community
 *      uses: dissolve the floor into the background color -> reads as endless.
 *   2. ART — the disc isn't blank: concentric energy rings + radial spokes +
 *      faint tech noise + a soft glow pool under the downtown core.
 *   3. WET REFLECTIONS — a central reflective disc (drei MeshReflectorMaterial),
 *      cheap because the skyline is one draw call. Circular, so no hard corners.
 *
 * Combined with fog (CityLighting) + a void horizon (SkyDome), the corners and
 * edges sink into darkness = the requested infinite-space feel.
 * ========================================================================== */
import * as THREE from 'three'
import { useMemo } from 'react'
import { MeshReflectorMaterial } from '@react-three/drei'
import { PALETTE } from './palette'

/** Big art+fade disc. Opaque; color dissolves to void at the rim. */
function InfiniteFloor({ radius, coreGlow = PALETTE.violet, grid = PALETTE.cyan, spokes = 8 }: {
  radius: number; coreGlow?: string; grid?: string; spokes?: number
}) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    fog: false,
    uniforms: {
      uVoid: { value: new THREE.Color(PALETTE.void) },
      uGrid: { value: new THREE.Color(grid) },
      uGlow: { value: new THREE.Color(coreGlow) },
      uMaxR: { value: radius },
      uSpokes: { value: spokes },
    },
    vertexShader: `
      varying vec2 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform vec3 uVoid; uniform vec3 uGrid; uniform vec3 uGlow;
      uniform float uMaxR; uniform float uSpokes;
      varying vec2 vWorld;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float aline(float v, float period){
        float x = v / period; float d = abs(fract(x - 0.5) - 0.5) / fwidth(x);
        return 1.0 - min(d, 1.0);
      }
      void main(){
        float r = length(vWorld);
        float ang = atan(vWorld.y, vWorld.x);
        vec3 col = uVoid;
        // faint tech noise so it isn't a blank plane
        col += uGrid * 0.02 * hash(floor(vWorld * 0.12));
        // concentric energy rings + brighter majors
        float rings = aline(r, 30.0) * 0.05 + aline(r, 120.0) * 0.12;
        // radial spokes (fade in away from center)
        float spoke = aline(ang, 6.2831853 / uSpokes) * smoothstep(20.0, 160.0, r) * 0.08;
        col += uGrid * (rings + spoke);
        // soft light pool under the downtown core
        col += uGlow * (1.0 - smoothstep(0.0, 260.0, r)) * 0.22;
        // dissolve to pure void toward the rim -> infinite
        float fade = 1.0 - smoothstep(uMaxR * 0.32, uMaxR * 0.85, r);
        col = mix(uVoid, col, fade);
        gl_FragColor = vec4(col, 1.0);
      }`,
  }), [radius, coreGlow, grid, spokes])

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0} material={material} frustumCulled={false}>
      <circleGeometry args={[radius, 96]} />
    </mesh>
  )
}

export function Ground({
  maxRadius,
  spokes = 8,
  reflections = true,
  reflectionResolution = 256,
}: {
  maxRadius: number; spokes?: number; reflections?: boolean; reflectionResolution?: number
}) {
  const floorR = maxRadius * 4.0
  const reflectR = maxRadius * 1.5
  return (
    <group>
      <InfiniteFloor radius={floorR} spokes={spokes} />
      {reflections && reflectionResolution > 0 && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.02} receiveShadow>
          <circleGeometry args={[reflectR, 96]} />
          <MeshReflectorMaterial
            key={reflectionResolution}
            resolution={reflectionResolution}
            mixBlur={1.4}
            mixStrength={4}
            blur={[500, 150]}
            roughness={0.9}
            depthScale={1.1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color={PALETTE.void}
            metalness={0.75}
            mirror={0.35}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
    </group>
  )
}

// back-compat alias for earlier imports
export const TronGround = Ground
