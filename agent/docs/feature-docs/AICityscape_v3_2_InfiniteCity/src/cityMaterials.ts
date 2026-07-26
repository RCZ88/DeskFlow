/* ============================================================================
 * cityMaterials.ts — v3.2 building material. The whole facade is now PROCEDURAL
 * inside one instanced MeshStandardMaterial (still ONE draw call), giving real
 * close-up quality without geometry or texture files:
 *
 *   1. PARALLAX INTERIOR WINDOWS — a tangent-space view ray fakes 3D room depth
 *      behind each lit window (Joost van Dongen "interior mapping" family +
 *      the ProcWin procedural-window-lighting paper). Rooms have a bright back
 *      wall, darker side walls, and a floor gradient, and shift as you move.
 *   2. SURFACE RELIEF — window frames are bump-recessed (derivative cotangent
 *      frame) so the moon key light + IBL actually catch the facade up close.
 *   3. MATERIAL VARIATION — glass = smooth + metallic (reflects neon/IBL),
 *      concrete = rough + matte. No more flat plastic boxes.
 *   4. WORLD-UNIT TILING — windows are a consistent real size on every tower
 *      (via per-instance aSize), so big towers don't get stretched windows.
 *   5. Keeps v3.1: vertical gradient, GPU hero pulse (uTime), fresnel rim.
 *
 * Instanced attributes: aNeon(vec3) aEmis(float) aHero(float) aPhase(float)
 *                       aSize(vec3 = world w,h,d)
 * Live uniform uTime is stored on material.userData.shader (see InstancedSkyline).
 * ========================================================================== */
import * as THREE from 'three'
import { PALETTE } from './palette'

type PatchableShader = {
  uniforms: Record<string, { value: unknown }>
  vertexShader: string
  fragmentShader: string
}

export function makeBuildingMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTE.deep),
    roughness: 0.8,
    metalness: 0.1,
    emissive: new THREE.Color(0xffffff), // overwritten per-fragment by our code
    emissiveIntensity: 1.0,
  })
  mat.defines = { USE_UV: '' }

  mat.onBeforeCompile = (shader: PatchableShader) => {
    shader.uniforms.uTime = { value: 0 }

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aNeon;
        attribute float aEmis;
        attribute float aHero;
        attribute float aPhase;
        attribute vec3 aSize;
        varying vec3 vNeon; varying float vEmis; varying float vHero;
        varying float vPhase; varying vec3 vSize; varying float vH01;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vNeon = aNeon; vEmis = aEmis; vHero = aHero; vPhase = aPhase;
        vSize = aSize; vH01 = position.y + 0.5;`)

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        varying vec3 vNeon; varying float vEmis; varying float vHero;
        varying float vPhase; varying vec3 vSize; varying float vH01;
        float aline(float v, float period) {
          float x = v / period; float d = abs(fract(x - 0.5) - 0.5) / fwidth(x);
          return 1.0 - min(d, 1.0);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 nrm = normalize(normal);
          vec3 an = abs(nrm);
          float roof = step(0.6, an.y);

          // world-unit tiling: consistent ~3.4m x 4.2m window cells
          float faceW = an.x > an.z ? vSize.z : vSize.x;
          vec2 reps = vec2(max(1.0, floor(faceW / 3.4)), max(1.0, floor(vSize.y / 4.2)));
          vec2 uvw = vUv * reps;
          vec2 cell = floor(uvw);
          vec2 f = fract(uvw);

          vec2 w0 = vec2(0.16, 0.14), w1 = vec2(0.86, 0.90);
          float inWin = step(w0.x, f.x) * step(f.x, w1.x) * step(w0.y, f.y) * step(f.y, w1.y);
          inWin *= (1.0 - roof);

          // cotangent frame (Schuler) for parallax + bump
          vec3 p = -vViewPosition;
          vec3 dp1 = dFdx(p), dp2 = dFdy(p);
          vec2 du1 = dFdx(vUv), du2 = dFdy(vUv);
          vec3 dp2p = cross(dp2, nrm), dp1p = cross(nrm, dp1);
          vec3 T = dp2p * du1.x + dp1p * du2.x;
          vec3 B = dp2p * du1.y + dp1p * du2.y;
          float invmax = inversesqrt(max(dot(T, T), dot(B, B)));
          T *= invmax; B *= invmax;

          vec3 Vd = normalize(vViewPosition);
          vec2 vts = vec2(dot(Vd, T), dot(Vd, B)) * reps;
          float vz = max(abs(dot(Vd, nrm)), 0.25);

          // per-window lit state (stable per tower via phase)
          float rnd = fract(sin(dot(cell + vPhase, vec2(12.9898, 78.233))) * 43758.5453);
          float lit = step(0.42, rnd);

          // parallax interior -> fake room depth
          vec2 luv = clamp((f - w0) / (w1 - w0), 0.0, 1.0);
          vec2 iuv = clamp(luv - (vts / vz) * 0.35, 0.0, 1.0);
          vec2 dd = abs(iuv - 0.5) * 2.0;
          float back = smoothstep(1.15, 0.1, max(dd.x, dd.y)); // bright back wall
          float interior = back * mix(0.45, 1.0, iuv.y);       // darker toward floor

          vec3 winCol = vNeon * (interior * (0.5 + 0.9 * lit));
          winCol += vNeon * 0.04 * (1.0 - lit); // unlit glass faint tint

          float grad = mix(0.35, 1.15, smoothstep(0.0, 1.0, vH01));
          float pulse = mix(1.0, 0.82 + 0.18 * sin(uTime * 2.5 + vPhase), vHero);

          // rooftop trim line near the crown
          float trim = aline(vH01, 1.0) * 0.0; // reserved

          totalEmissiveRadiance = winCol * vEmis * grad * pulse * inWin;
          totalEmissiveRadiance += vNeon * 0.05 * roof * grad; // faint roof glow

          float fres = pow(1.0 - abs(dot(Vd, nrm)), 3.0);
          totalEmissiveRadiance += fres * vNeon * (0.18 + 0.5 * vHero);

          // material relief: glass vs concrete
          roughnessFactor = mix(0.82, 0.18, inWin);
          metalnessFactor = mix(0.08, 0.55, inWin);

          // bump: recess glass so frames catch the key light
          float height = 1.0 - inWin;
          normal = normalize(nrm - (T * dFdx(height) + B * dFdy(height)) * 1.4);
        }`)

    mat.userData.shader = shader
  }
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
