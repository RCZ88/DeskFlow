/* ============================================================================
 * graphicsPresets.ts — simple graphics quality settings. Four presets scale the
 * expensive levers (resolution, reflections, contact shadows, bloom, shadows,
 * car count) so the scene runs on anything from a laptop iGPU to a desktop GPU.
 * Choice persists to localStorage. Pure module (no three.js) — node-safe.
 * ========================================================================== */

export type QualityTier = 'low' | 'medium' | 'high' | 'ultra'

export interface GraphicsSettings {
  label: string
  dpr: number                   // max device pixel ratio
  shadows: boolean              // real-time shadow map (directional key)
  contactShadows: boolean       // soft grounding shadow under the city
  reflections: boolean          // wet-floor reflections
  reflectionResolution: number  // reflection render-target size
  bloom: boolean                // neon glow post-process
  bloomIntensity: number
  carCount: number              // number of traffic cars
  stars: boolean                // sky-dome stars
}

export const QUALITY_ORDER: QualityTier[] = ['low', 'medium', 'high', 'ultra']

export const PRESETS: Record<QualityTier, GraphicsSettings> = {
  low: {
    label: 'Low', dpr: 1, shadows: false, contactShadows: false, reflections: false,
    reflectionResolution: 0, bloom: true, bloomIntensity: 0.7, carCount: 28, stars: false,
  },
  medium: {
    label: 'Medium', dpr: 1.25, shadows: false, contactShadows: true, reflections: true,
    reflectionResolution: 128, bloom: true, bloomIntensity: 0.9, carCount: 50, stars: true,
  },
  high: {
    label: 'High', dpr: 1.5, shadows: true, contactShadows: true, reflections: true,
    reflectionResolution: 256, bloom: true, bloomIntensity: 1.0, carCount: 70, stars: true,
  },
  ultra: {
    label: 'Ultra', dpr: 2, shadows: true, contactShadows: true, reflections: true,
    reflectionResolution: 512, bloom: true, bloomIntensity: 1.15, carCount: 100, stars: true,
  },
}

export const DEFAULT_QUALITY: QualityTier = 'high'
const STORAGE_KEY = 'aicityscape.quality'

export function loadQuality(fallback: QualityTier = DEFAULT_QUALITY): QualityTier {
  if (typeof window === 'undefined' || !window.localStorage) return fallback
  const v = window.localStorage.getItem(STORAGE_KEY)
  return v && (QUALITY_ORDER as string[]).includes(v) ? (v as QualityTier) : fallback
}

export function saveQuality(tier: QualityTier): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  window.localStorage.setItem(STORAGE_KEY, tier)
}
