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
    emissive: new THREE.Color(0xffffff),
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

          float faceW = an.x > an.z ? vSize.z : vSize.x;
          vec2 reps = vec2(max(1.0, floor(faceW / 3.4)), max(1.0, floor(vSize.y / 4.2)));
          vec2 uvw = vUv * reps;
          vec2 cell = floor(uvw);
          vec2 f = fract(uvw);

          vec2 w0 = vec2(0.16, 0.14), w1 = vec2(0.86, 0.90);
          float inWin = step(w0.x, f.x) * step(f.x, w1.x) * step(w0.y, f.y) * step(f.y, w1.y);
          inWin *= (1.0 - roof);

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

          float rnd = fract(sin(dot(cell + vPhase, vec2(12.9898, 78.233))) * 43758.5453);
          float lit = step(0.42, rnd);

          vec2 luv = clamp((f - w0) / (w1 - w0), 0.0, 1.0);
          vec2 iuv = clamp(luv - (vts / vz) * 0.35, 0.0, 1.0);
          vec2 dd = abs(iuv - 0.5) * 2.0;
          float back = smoothstep(1.15, 0.1, max(dd.x, dd.y));
          float interior = back * mix(0.45, 1.0, iuv.y);

          vec3 winCol = vNeon * (interior * (0.5 + 0.9 * lit));
          winCol += vNeon * 0.04 * (1.0 - lit);

          float grad = mix(0.35, 1.15, smoothstep(0.0, 1.0, vH01));
          float pulse = mix(1.0, 0.82 + 0.18 * sin(uTime * 2.5 + vPhase), vHero);

          totalEmissiveRadiance = winCol * vEmis * grad * pulse * inWin;
          totalEmissiveRadiance += vNeon * 0.05 * roof * grad;

          float fres = pow(1.0 - abs(dot(Vd, nrm)), 3.0);
          totalEmissiveRadiance += fres * vNeon * (0.18 + 0.5 * vHero);

          roughnessFactor = mix(0.82, 0.18, inWin);
          metalnessFactor = mix(0.08, 0.55, inWin);

          float height = 1.0 - inWin;
          normal = normalize(nrm - (T * dFdx(height) + B * dFdy(height)) * 1.4);
        }`)

    mat.userData.shader = shader
  }
  return mat
}

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
