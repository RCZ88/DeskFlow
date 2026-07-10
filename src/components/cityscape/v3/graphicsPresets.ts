export type QualityTier = 'low' | 'medium' | 'high' | 'ultra'

export interface GraphicsSettings {
  label: string
  dpr: number
  shadows: boolean
  contactShadows: boolean
  reflections: boolean
  reflectionResolution: number
  bloom: boolean
  bloomIntensity: number
  carCount: number
  stars: boolean
  useHdr: boolean
}

export const QUALITY_ORDER: QualityTier[] = ['low', 'medium', 'high', 'ultra']

export const PRESETS: Record<QualityTier, GraphicsSettings> = {
  low: {
    label: 'Low', dpr: 1, shadows: false, contactShadows: false, reflections: false,
    reflectionResolution: 0, bloom: true, bloomIntensity: 0.7, carCount: 28, stars: false, useHdr: false,
  },
  medium: {
    label: 'Medium', dpr: 1.25, shadows: false, contactShadows: true, reflections: true,
    reflectionResolution: 128, bloom: true, bloomIntensity: 0.9, carCount: 50, stars: true, useHdr: true,
  },
  high: {
    label: 'High', dpr: 1.5, shadows: true, contactShadows: true, reflections: true,
    reflectionResolution: 256, bloom: true, bloomIntensity: 1.0, carCount: 70, stars: true, useHdr: true,
  },
  ultra: {
    label: 'Ultra', dpr: 2, shadows: true, contactShadows: true, reflections: true,
    reflectionResolution: 512, bloom: true, bloomIntensity: 1.15, carCount: 100, stars: true, useHdr: true,
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
