/* ============================================================================
 * palette.ts — the ONE source of cyberpunk color truth.
 * Buildings are always DARK. Color lives only in neon glow (windows/edges/cars).
 * Data maps onto this ramp — never random RGB.
 * Pure module, no three.js import, safe to unit-test in node.
 * ========================================================================== */

export const PALETTE = {
  void:    '#0a0e1a', // fog / sky base
  deep:    '#0f1b3d', // building body
  cobalt:  '#1b3a8f', // building body accent / dim decoration neon
  cyan:    '#00e5ff', // primary neon
  aqua:    '#2de2e6',
  violet:  '#7b2ff7',
  magenta: '#ff2fb9',
  amber:   '#ff9e00', // hottest / most active
} as const

/** Neon options used to color agent hero towers, in a pleasing order. */
export const NEON_RAMP = [
  PALETTE.cyan,
  PALETTE.magenta,
  PALETTE.violet,
  PALETTE.amber,
  PALETTE.aqua,
] as const

/** Dim neons for the decorative skyline (kept low-sat / low-intensity). */
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

/** Deterministic agent -> neon assignment (stable across renders). */
export function neonForIndex(i: number): string {
  return NEON_RAMP[i % NEON_RAMP.length]
}

/** Map a 0..1 activity value to an emissive intensity for hero towers. */
export function heroEmissiveIntensity(active: boolean, activity01 = 1): number {
  const base = active ? 1.6 : 0.9
  return base + activity01 * 1.2
}

/** Decoration towers glow faintly so the skyline reads dense but not busy. */
export function decoEmissiveIntensity(seedRand: number): number {
  return 0.18 + seedRand * 0.35
}
