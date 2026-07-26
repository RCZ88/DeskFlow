/* ============================================================================
 * metropolis.ts — SIMPLE, ROBUST dense-city generator (replaces the fragile
 * ring/viaduct layout). Manhattan-style block grid + radial downtown falloff so
 * you get a real skyline with a tall core, thinning to the edges. Heroes (real
 * agents) are placed on the tallest central lots and highlighted.
 *
 * Design goals: deterministic, cheap, hundreds of towers, ZERO circle artifact,
 * street lanes for cars. Pure module (no three.js) — node-testable.
 * ========================================================================== */
import { NEON_RAMP, DECO_NEON, decoEmissiveIntensity, heroEmissiveIntensity } from './palette'

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
  w: number; d: number         // footprint
  height: number               // world units
  floors: number               // for window texture tiling
  tier: Tier
  neon: string                 // hex glow color
  emissive: number             // emissive intensity
  litDensity: number           // 0..1 fraction of windows lit
  isHero: boolean
  // hero-only data:
  agentId?: string
  label?: string
  tokens?: number
  sessions?: number
  cost?: number
  active?: boolean
}

export interface Lane {
  // a straight street centerline segment (for cars + tron accent)
  x1: number; z1: number; x2: number; z2: number
  axis: 'x' | 'z'
}

export interface Metropolis {
  towers: Tower[]
  lanes: Lane[]
  heroIds: string[]
  bounds: { half: number }
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
  blocks?: number        // grid is blocks x blocks (default 14 -> dense)
  block?: number         // block size (world units)
  street?: number        // street width
  lotsPerBlock?: number  // subdivisions per block axis (2 => up to 4 lots)
  maxHeight?: number     // tallest downtown tower
  falloff?: number       // downtown steepness
}

export function generateMetropolis(heroes: HeroInput[], opts: MetropolisOptions = {}): Metropolis {
  const {
    seed = 'deskflow', blocks = 14, block = 22, street = 8,
    lotsPerBlock = 2, maxHeight = 120, falloff = 1.6,
  } = opts
  const rand = mulberry32(hashSeed(seed))
  const cell = block + street
  const half = (blocks * cell) / 2
  const towers: Tower[] = []
  const lanes: Lane[] = []

  // ---- street lanes (grid centerlines) ----
  for (let i = 0; i <= blocks; i++) {
    const p = -half + i * cell + street / 2 - cell
    const c = -half + i * cell
    lanes.push({ x1: c, z1: -half, x2: c, z2: half, axis: 'z' })
    lanes.push({ x1: -half, z1: c, x2: half, z2: c, axis: 'x' })
  }

  // ---- towers on lots ----
  let n = 0
  const candidates: Tower[] = []
  for (let bx = 0; bx < blocks; bx++) {
    for (let bz = 0; bz < blocks; bz++) {
      const blockX = -half + bx * cell + street
      const blockZ = -half + bz * cell + street
      const lot = (block - (lotsPerBlock - 1) * 3) / lotsPerBlock
      for (let lx = 0; lx < lotsPerBlock; lx++) {
        for (let lz = 0; lz < lotsPerBlock; lz++) {
          if (rand() < 0.12) continue // occasional gap / plaza
          const cx = blockX + lx * (lot + 3) + lot / 2
          const cz = blockZ + lz * (lot + 3) + lot / 2
          const dist = Math.hypot(cx, cz) / half // 0 center -> 1 edge
          const downtown = Math.pow(Math.max(0, 1 - dist), falloff)
          const jitter = 0.6 + rand() * 0.8
          const height = Math.max(6, (4 + downtown * maxHeight) * jitter)
          const w = lot * (0.7 + rand() * 0.25)
          const d = lot * (0.7 + rand() * 0.25)
          const floors = Math.max(3, Math.round(height / 4))
          const tier: Tier = height > maxHeight * 0.55 ? 'tall' : height > maxHeight * 0.25 ? 'mid' : 'low'
          const r = rand()
          candidates.push({
            id: `t${n++}`, x: cx, z: cz, w, d, height, floors, tier,
            neon: DECO_NEON[Math.floor(r * DECO_NEON.length)],
            emissive: decoEmissiveIntensity(r),
            litDensity: 0.12 + r * 0.28,
            isHero: false,
          })
        }
      }
    }
  }

  // ---- promote the tallest, most-central lots to hero towers ----
  const ranked = [...candidates].sort((a, b) => {
    const ca = a.height * (1 - Math.hypot(a.x, a.z) / half)
    const cb = b.height * (1 - Math.hypot(b.x, b.z) / half)
    return cb - ca
  })
  const heroIds: string[] = []
  const used = new Set<string>()
  heroes.forEach((hero, i) => {
    // pick a prominent lot not adjacent to an already-chosen hero
    const spot = ranked.find(t => !used.has(t.id) &&
      ![...used].some(uid => {
        const u = candidates.find(c => c.id === uid)!
        return Math.hypot(u.x - t.x, u.z - t.z) < cell * 1.5
      }))
    const t = spot ?? ranked[i]
    used.add(t.id)
    const active = hero.active ?? true
    const activity = hero.activity01 ?? (active ? 0.8 : 0.2)
    t.isHero = true
    t.height = Math.max(t.height, 40 + hero.height01 * (maxHeight * 1.3)) // heroes dominate
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

  towers.push(...candidates)
  return { towers, lanes, heroIds, bounds: { half } }
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
  console.log('towers    :', m.towers.length, 'lanes:', m.lanes.length)
  console.log('tiers     :', ['low', 'mid', 'tall'].map(k => k + '=' + m.towers.filter(t => t.tier === k).length).join(' '))
  console.log('heroes    :', heroTowers.length, '->', heroTowers.map(t => `${t.label} h=${t.height.toFixed(0)} neon=${t.neon} tok=${t.tokens}`).join(' | '))
  const maxH = Math.max(...m.towers.map(t => t.height))
  const centerHero = heroTowers.every(t => Math.hypot(t.x, t.z) < m.bounds.half * 0.8)
  console.log('maxHeight :', maxH.toFixed(0), '| heroes near center:', centerHero ? 'PASS' : 'CHECK')
}
