/* ============================================================================
 * SkyDome.tsx — gradient night sky + faint procedural stars. The horizon is set
 * to the VOID/fog color so the infinite ground dissolves seamlessly into the sky
 * (no visible seam). `stars` toggles the star field (off on the Low preset).
 * ========================================================================== */
import * as THREE from 'three'
import { useMemo } from 'react'
import { PALETTE } from './palette'

export function SkyDome({ radius = 1600, stars = true }: { radius?: number; stars?: boolean }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color('#0c1226') },
      uHorizon: { value: new THREE.Color(PALETTE.void) }, // == fog color -> seamless
      uGlow: { value: new THREE.Color(PALETTE.violet) },
      uStars: { value: stars ? 1 : 0 },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uGlow; uniform float uStars;
      varying vec3 vDir;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(uHorizon, uTop, pow(h, 0.8));
        col += uGlow * pow(1.0 - h, 6.0) * 0.30; // faint horizon light pollution
        vec2 g = floor(vDir.xz * 220.0);
        float s = step(0.9975, hash(g)) * smoothstep(0.15, 0.5, vDir.y) * uStars;
        col += vec3(s) * 0.6;
        gl_FragColor = vec4(col, 1.0);
      }`,
  }), [stars])

  return (
    <mesh material={material} scale={radius} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 24]} />
    </mesh>
  )
}
