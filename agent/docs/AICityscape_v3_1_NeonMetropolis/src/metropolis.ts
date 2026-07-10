/* ============================================================================
 * metropolis.ts — v3.1 RADIAL city generator. Buildings are arranged in
 * concentric rings around a downtown core (a "sunburst" / radial-concentric
 * topology like Paris/Moscow) instead of a square grid. Each tower is ORIENTED
 * tangentially so the whole skyline curves around the center.
 *
 * Height falls off with radius => tall glowing core, thinning to the edges.
 * Heroes (real agents) are promoted onto the tallest, most-central lots.
 *
 * Still deterministic, cheap, pure (no three.js) => node-testable.
 * ========================================================================== */
import { NEON_RAMP, DECO_NEON, decoEmissiveIntensity, heroEmissiveIntensity, PALETTE } from './palette'

export interface HeroInput {
  id: string
  label: string
  height01: number      // 0..1 relative usage -> tower height
  activity01?: number   // 0..1 recent activity -> window glow / lit density
  active?: boolean
  tokens?: number
  sessions?: number
  cost?: number
  color?: string        // optional override neon
}

export type Tier = 'low' | 'mid' | 'tall'

export interface Tower {
  id: string
  x: number; z: number         // center on ground plane
  w: number; d: number         // footprint (w = tangential, d = radial)
  height: number               // world units
  rotationY: number            // radians, orients the box around the ring
  floors: number
  tier: Tier
  neon: string                 // hex glow color
  emissive: number             // emissive intensity
  litDensity: number           // 0..1 fraction of windows lit
  isHero: boolean
  agentId?: string
  label?: string
  tokens?: number
  sessions?: number
  cost?: number
  active?: boolean
}

export interface Lane {
  // kept for compatibility; radial spoke centerlines
  x1: number; z1: number; x2: number; z2: number
  axis: 'x' | 'z'
}

export interface Metropolis {
  towers: Tower[]
  lanes: Lane[]
  rings: number[]              // ring radii (cars orbit these; ground echoes them)
  spokes: number[]             // radial avenue angles (radians)
  heroIds: string[]
  bounds: { half: number; innerRadius: number; maxRadius: number }
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

export interface MetropolisOptions {
  seed?: string
  rings?: number         // number of concentric ring roads (default 10)
  blocks?: number        // LEGACY alias -> rings (kept so old calls still work)
  innerRadius?: number   // radius of the innermost ring
  ringGap?: number       // distance between rings
  arc?: number           // target tangential lot size (smaller => denser rings)
  maxHeight?: number     // tallest downtown tower
  falloff?: number       // downtown steepness
  gapChance?: number     // chance a lot is an empty plaza
  spokeCount?: number    // number of radial avenues
}

export function generateMetropolis(heroes: HeroInput[], opts: MetropolisOptions = {}): Metropolis {
  const {
    seed = 'deskflow',
    innerRadius = 46,
    ringGap = 30,
    arc = 26,
    maxHeight = 150,
    falloff = 1.5,
    gapChance = 0.10,
    spokeCount = 8,
  } = opts
  const rings = opts.rings ?? (opts.blocks ? Math.max(6, Math.round(opts.blocks * 0.7)) : 10)
  const rand = mulberry32(hashSeed(seed))

  const ringRadii: number[] = []
  for (let r = 0; r < rings; r++) ringRadii.push(innerRadius + r * ringGap)
  const maxRadius = innerRadius + (rings - 1) * ringGap + ringGap
  const half = maxRadius

  const towers: Tower[] = []
  const candidates: Tower[] = []
  let n = 0

  // ---- central landmark spire (anchors the glowing core) ----
  candidates.push({
    id: `t${n++}`, x: 0, z: 0, w: 16, d: 16,
    height: maxHeight * 0.92, rotationY: Math.PI / 4,
    floors: Math.round(maxHeight * 0.92 / 4), tier: 'tall',
    neon: PALETTE.cyan, emissive: 0.5, litDensity: 0.4, isHero: false,
  })

  // ---- towers arranged on concentric rings ----
  for (let r = 0; r < rings; r++) {
    const radius = ringRadii[r]
    const circumference = 2 * Math.PI * radius
    const sectors = Math.max(6, Math.round(circumference / arc))
    for (let s = 0; s < sectors; s++) {
      if (rand() < gapChance) continue
      const baseAngle = (s / sectors) * Math.PI * 2
      const angle = baseAngle + (rand() - 0.5) * (Math.PI * 2 / sectors) * 0.35
      const rr = radius + (rand() - 0.5) * ringGap * 0.28
      const x = Math.cos(angle) * rr
      const z = Math.sin(angle) * rr
      const norm = rr / maxRadius                 // 0 core -> 1 edge
      const downtown = Math.pow(Math.max(0, 1 - norm), falloff)
      const jitter = 0.6 + rand() * 0.8
      const height = Math.max(6, (4 + downtown * maxHeight) * jitter)
      const tangential = Math.min(26, Math.max(6, (circumference / sectors) * 0.62))
      const w = tangential * (0.82 + rand() * 0.2)
      const d = ringGap * (0.42 + rand() * 0.34)
      const floors = Math.max(3, Math.round(height / 4))
      const tier: Tier = height > maxHeight * 0.55 ? 'tall' : height > maxHeight * 0.25 ? 'mid' : 'low'
      const rv = rand()
      candidates.push({
        id: `t${n++}`, x, z, w, d, height,
        rotationY: angle + Math.PI / 2,          // width wraps tangentially, depth points at core
        floors, tier,
        neon: DECO_NEON[Math.floor(rv * DECO_NEON.length)],
        emissive: decoEmissiveIntensity(rv),
        litDensity: 0.12 + rv * 0.28,
        isHero: false,
      })
    }
  }

  // ---- promote tallest, most-central lots to hero towers ----
  const ranked = [...candidates].filter(t => t.id !== 't0').sort((a, b) => {
    const ca = a.height * (1 - Math.hypot(a.x, a.z) / maxRadius)
    const cb = b.height * (1 - Math.hypot(b.x, b.z) / maxRadius)
    return cb - ca
  })
  const heroIds: string[] = []
  const used = new Set<string>()
  heroes.forEach((hero, i) => {
    const spot = ranked.find(t => !used.has(t.id) &&
      ![...used].some(uid => {
        const u = candidates.find(c => c.id === uid)!
        return Math.hypot(u.x - t.x, u.z - t.z) < ringGap * 1.6
      }))
    const t = spot ?? ranked[i] ?? ranked[0]
    used.add(t.id)
    const active = hero.active ?? true
    const activity = hero.activity01 ?? (active ? 0.8 : 0.2)
    t.isHero = true
    t.height = Math.max(t.height, 46 + hero.height01 * (maxHeight * 1.25))
    t.floors = Math.max(6, Math.round(t.height / 4))
    t.tier = 'tall'
    t.neon = hero.color ?? NEON_RAMP[i % NEON_RAMP.length]
    t.emissive = heroEmissiveIntensity(active, activity)
    t.litDensity = 0.45 + activity * 0.5
    t.agentId = hero.id
    t.label = hero.label
    t.tokens = hero.tokens
    t.sessions = hero.sessions
    t.cost = hero.cost
    t.active = active
    heroIds.push(t.id)
  })

  // ---- radial avenues (spokes) as compatibility lanes ----
  const spokes: number[] = []
  const lanes: Lane[] = []
  for (let k = 0; k < spokeCount; k++) {
    const a = (k / spokeCount) * Math.PI * 2
    spokes.push(a)
    lanes.push({
      x1: Math.cos(a) * innerRadius, z1: Math.sin(a) * innerRadius,
      x2: Math.cos(a) * maxRadius, z2: Math.sin(a) * maxRadius,
      axis: Math.abs(Math.cos(a)) > 0.5 ? 'x' : 'z',
    })
  }

  towers.push(...candidates)
  return { towers, lanes, rings: ringRadii, spokes, heroIds, bounds: { half, innerRadius, maxRadius } }
}

// --- node self-test ---
if (typeof process !== 'undefined' && process.argv[1] && /metropolis\.ts$/.test(process.argv[1])) {
  const heroes: HeroInput[] = [
    { id: 'claude', label: 'claude-sonnet', height01: 1.0, tokens: 1_000_000, sessions: 42, active: true, activity01: 0.95 },
    { id: 'gpt', label: 'gpt-4o', height01: 0.6, tokens: 513_000, sessions: 20, active: true, activity01: 0.5 },
    { id: 'gemini', label: 'gemini-2.5', height01: 0.4, tokens: 340_000, sessions: 11, active: false, activity01: 0.1 },
    { id: 'codex', label: 'codex', height01: 0.15, tokens: 0, sessions: 2, active: false, activity01: 0 },
  ]
  const m = generateMetropolis(heroes, { seed: 'deskflow-test' })
  const heroTowers = m.towers.filter(t => t.isHero)
  console.log('towers    :', m.towers.length, 'rings:', m.rings.length, 'spokes:', m.spokes.length)
  console.log('radius    : inner', m.bounds.innerRadius, 'max', m.bounds.maxRadius)
  console.log('tiers     :', ['low', 'mid', 'tall'].map(k => k + '=' + m.towers.filter(t => t.tier === k).length).join(' '))
  console.log('heroes    :', heroTowers.length, '->', heroTowers.map(t => `${t.label} h=${t.height.toFixed(0)} rot=${t.rotationY.toFixed(2)} neon=${t.neon}`).join(' | '))
  const maxH = Math.max(...m.towers.map(t => t.height))
  const centerHero = heroTowers.every(t => Math.hypot(t.x, t.z) < m.bounds.maxRadius * 0.85)
  const rotated = m.towers.some(t => Math.abs(t.rotationY) > 0.01)
  console.log('maxHeight :', maxH.toFixed(0), '| heroes near center:', centerHero ? 'PASS' : 'CHECK', '| tangential rotation:', rotated ? 'PASS' : 'FAIL')
}
