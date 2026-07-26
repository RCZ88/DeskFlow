/* ============================================================================
 * TronGround.tsx — dark ground + neon grid via a cheap shader (no texture).
 * Roads are NOT modeled; the grid IS the road hint. Fades into fog at distance.
 * ========================================================================== */
import * as THREE from 'three'
import { useMemo } from 'react'
import { PALETTE } from './palette'

export function TronGround({ size = 900, spacing = 30, color = PALETTE.cyan }: { size?: number; spacing?: number; color?: string }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uBase: { value: new THREE.Color(PALETTE.void) },
      uSpacing: { value: spacing },
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
      uniform vec3 uColor; uniform vec3 uBase; uniform float uSpacing; uniform float uFade;
      varying vec2 vWorld;
      float gridLine(vec2 p, float s) {
        vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s);
        float l = min(g.x, g.y);
        return 1.0 - min(l, 1.0);
      }
      void main() {
        float fine = gridLine(vWorld, uSpacing);
        float major = gridLine(vWorld, uSpacing * 5.0);
        float g = max(fine * 0.5, major);
        float dist = length(vWorld);
        float fade = clamp(1.0 - dist / uFade, 0.0, 1.0);
        vec3 col = mix(uBase, uColor, g);
        float alpha = (0.25 + g) * fade;
        gl_FragColor = vec4(col, alpha);
      }`,
  }), [color, spacing, size])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={material}>
      <planeGeometry args={[size, size]} />
    </mesh>
  )
}
