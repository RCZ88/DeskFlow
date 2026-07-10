/* ============================================================================
 * cityMaterials.ts — the building material. Dark body + emissive window mask,
 * where the neon COLOR + INTENSITY are PER-INSTANCE (so one InstancedMesh /
 * one draw call renders the whole differently-colored skyline).
 *
 * We patch MeshStandardMaterial via onBeforeCompile to read two instanced
 * attributes:
 *   - aNeon  (vec3)  the glow color for this tower
 *   - aEmis  (float) the emissive intensity for this tower
 * and multiply them into totalEmissiveRadiance after the emissiveMap sample.
 * ========================================================================== */
import * as THREE from 'three'
import { PALETTE } from './palette'

export function makeBuildingMaterial(windowMask: THREE.Texture): THREE.MeshStandardMaterial {
  const bodyTop = new THREE.Color(PALETTE.deep)
  const mat = new THREE.MeshStandardMaterial({
    color: bodyTop,
    roughness: 0.62,
    metalness: 0.12,
    emissive: new THREE.Color(0xffffff), // acts as white base; tinted by aNeon
    emissiveMap: windowMask,
    emissiveIntensity: 1.0,
  })

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aNeon;
        attribute float aEmis;
        varying vec3 vNeon;
        varying float vEmis;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vNeon = aNeon;
        vEmis = aEmis;`)

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vNeon;
        varying float vEmis;`)
      // after the emissiveMap is applied to totalEmissiveRadiance, tint + scale it
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance *= vNeon * vEmis;`)
  }
  mat.defines = { USE_UV: '' } // ensure uv/emissiveMap path is compiled
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
    toneMapped: false, // keep neon hot so bloom catches it
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
