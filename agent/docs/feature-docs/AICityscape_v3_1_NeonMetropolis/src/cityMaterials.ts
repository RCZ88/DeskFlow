/* ============================================================================
 * cityMaterials.ts — v3.1 building material. Dark body + emissive window mask,
 * with PER-INSTANCE neon color/intensity, PLUS three quality upgrades that all
 * stay inside the single instanced draw call (so they cost almost nothing):
 *
 *   1. FRESNEL RIM LIGHT  — tower silhouettes catch a neon edge glow.
 *   2. VERTICAL GRADIENT  — dim base, brighter crown (reads as real massing).
 *   3. GPU HERO PULSE     — hero towers breathe via a uTime uniform (no CPU cost).
 *
 * Instanced attributes read by the shader:
 *   aNeon (vec3)  glow color   | aEmis (float) emissive intensity
 *   aHero (float) 1=hero,0=deco | aPhase(float) per-tower pulse phase
 * The live uniform is stored on material.userData.shader (update uTime in a
 * useFrame). See InstancedSkyline.tsx.
 * ========================================================================== */
import * as THREE from 'three'
import { PALETTE } from './palette'

type PatchableShader = {
  uniforms: Record<string, { value: unknown }>
  vertexShader: string
  fragmentShader: string
}

export function makeBuildingMaterial(windowMask: THREE.Texture): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTE.deep),
    roughness: 0.6,
    metalness: 0.15,
    emissive: new THREE.Color(0xffffff), // white base, tinted per-instance by aNeon
    emissiveMap: windowMask,
    emissiveIntensity: 1.0,
  })

  mat.onBeforeCompile = (shader: PatchableShader) => {
    shader.uniforms.uTime = { value: 0 }

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aNeon;
        attribute float aEmis;
        attribute float aHero;
        attribute float aPhase;
        varying vec3 vNeon;
        varying float vEmis;
        varying float vHero;
        varying float vPhase;
        varying float vH01;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vNeon = aNeon; vEmis = aEmis; vHero = aHero; vPhase = aPhase;
        vH01 = position.y + 0.5;`)

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        varying vec3 vNeon;
        varying float vEmis;
        varying float vHero;
        varying float vPhase;
        varying float vH01;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // vertical gradient: dim base, brighter crown
        float grad = mix(0.35, 1.15, smoothstep(0.0, 1.0, vH01));
        // GPU hero pulse (deco towers pass through unchanged)
        float pulse = mix(1.0, 0.82 + 0.18 * sin(uTime * 2.5 + vPhase), vHero);
        totalEmissiveRadiance *= vNeon * vEmis * grad * pulse;
        // fresnel rim light -> routed through emissive so bloom catches the edge
        float fres = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0);
        totalEmissiveRadiance += fres * vNeon * (0.22 + 0.5 * vHero);`)

    mat.userData.shader = shader
  }
  mat.defines = { USE_UV: '' }
  return mat
}

/** Additive neon material for hero roofline edges and car underglow. */
export function makeAdditiveNeon(color: string, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
}

export function makeLineNeon(color: string): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
}
