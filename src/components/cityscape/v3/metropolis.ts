import { NEON_RAMP, DECO_NEON, decoEmissiveIntensity, heroEmissiveIntensity, PALETTE } from './palette'

export interface HeroInput {
  id: string
  label: string
  height01: number
  activity01?: number
  active?: boolean
  metricValue?: number
  metric?: 'tokens' | 'messages' | 'sessions' | 'cost'
  tokens?: number
  sessions?: number
  cost?: number
  color?: string
}

export type Tier = 'low' | 'mid' | 'tall'

export interface Tower {
  id: string
  x: number; z: number
  w: number; d: number
  height: number
  rotationY: number
  floors: number
  tier: Tier
  neon: string
  emissive: number
  litDensity: number
  isHero: boolean
  agentId?: string
  label?: string
  metricValue?: number
  metric?: 'tokens' | 'messages' | 'sessions' | 'cost'
  tokens?: number
  sessions?: number
  cost?: number
  active?: boolean
}

export interface Lane {
  x1: number; z1: number; x2: number; z2: number
  axis: 'x' | 'z'
}

export interface Metropolis {
  towers: Tower[]
  lanes: Lane[]
  rings: number[]
  spokes: number[]
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
  rings?: number
  blocks?: number
  innerRadius?: number
  ringGap?: number
  arc?: number
  maxHeight?: number
  falloff?: number
  gapChance?: number
  spokeCount?: number
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

  candidates.push({
    id: `t${n++}`, x: 0, z: 0, w: 16, d: 16,
    height: maxHeight * 0.92, rotationY: Math.PI / 4,
    floors: Math.round(maxHeight * 0.92 / 4), tier: 'tall',
    neon: PALETTE.cyan, emissive: 0.5, litDensity: 0.4, isHero: false,
  })

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
      const norm = rr / maxRadius
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
        rotationY: angle + Math.PI / 2,
        floors, tier,
        neon: DECO_NEON[Math.floor(rv * DECO_NEON.length)],
        emissive: decoEmissiveIntensity(rv),
        litDensity: 0.12 + rv * 0.28,
        isHero: false,
      })
    }
  }

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
    t.metricValue = hero.metricValue
    t.metric = hero.metric
    t.tokens = hero.tokens
    t.sessions = hero.sessions
    t.cost = hero.cost
    t.active = active
    heroIds.push(t.id)
  })

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
