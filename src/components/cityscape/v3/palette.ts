export const PALETTE = {
  void:    '#0a0e1a',
  deep:    '#0f1b3d',
  cobalt:  '#1b3a8f',
  cyan:    '#00e5ff',
  aqua:    '#2de2e6',
  violet:  '#7b2ff7',
  magenta: '#ff2fb9',
  amber:   '#ff9e00',
} as const

export const NEON_RAMP = [
  PALETTE.cyan,
  PALETTE.magenta,
  PALETTE.violet,
  PALETTE.amber,
  PALETTE.aqua,
] as const

export const DECO_NEON = [PALETTE.cobalt, PALETTE.cyan, PALETTE.violet] as const

export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

export function neonForIndex(i: number): string {
  return NEON_RAMP[i % NEON_RAMP.length]
}

export function heroEmissiveIntensity(active: boolean, activity01 = 1): number {
  const base = active ? 1.6 : 0.9
  return base + activity01 * 1.2
}

export function decoEmissiveIntensity(seedRand: number): number {
  return 0.18 + seedRand * 0.35
}
