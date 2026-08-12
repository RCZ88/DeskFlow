"use client"

import * as React from 'react'
import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import { categoryOf, sortPhases, type LifePhase } from '@/lib/riverMath'
import type { LongTermGoal } from '@/components/dashboard/types'

export type LensId = 'phases' | 'covenant' | 'gold' | 'memories'

interface RingCanvasProps {
  phases: LifePhase[]
  lens: LensId
  grainByPhase: Record<string, number>          // covenant completion rate 0..1 per phase
  todayCompletions: number                        // covenant completions today
  memoriesByPhase: Record<string, number>         // memory count per phase
  ltgsByPhase: Record<string, LongTermGoal[]>     // long-term goals per phase
  selectedPhaseId: string | null
  onPhaseClick: (phaseId: string) => void
  onOpenMemory: (phaseId: string) => void
}

/** Deterministic PRNG from a string seed — dots stay stable across renders. */
function seededRand(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return ((h >>> 0) % 10000) / 10000
  }
}

const VIEW = 420
const C = VIEW / 2
const INNER_R = 54
const STEP = 26

interface RingGeom {
  phase: LifePhase
  r: number
  thickness: number
  color: string
}

function ringGeometry(phases: LifePhase[]): RingGeom[] {
  return sortPhases(phases).map((phase, i) => ({
    phase,
    r: INNER_R + STEP * i + (phase.magnitude ?? 50) / 100 * 10,
    thickness: 7 + (phase.magnitude ?? 50) / 100 * 14,
    color: phase.color || categoryOf(phase.category).color,
  }))
}

export function RingCanvas({
  phases,
  lens,
  grainByPhase,
  todayCompletions,
  memoriesByPhase,
  ltgsByPhase,
  selectedPhaseId,
  onPhaseClick,
  onOpenMemory,
}: RingCanvasProps) {
  const reducedMotion = useReducedMotion()
  const rings = useMemo(() => ringGeometry(phases), [phases])
  if (rings.length === 0) return null

  const maxR = Math.max(...rings.map(g => g.r + g.thickness / 2)) + 6
  const scale = (VIEW / 2 - 8) / maxR
  const todayEdgeR = Math.min((maxR + 14) * scale, VIEW / 2 - 6)

  // Branches (Gold lens): LTG with a deadline year → outward branch at deterministic angle.
  const branches = useMemo(() => {
    const out: { phaseId: string; x1: number; y1: number; x2: number; y2: number; progress: number; title: string }[] = []
    for (const g of rings) {
      const ltgs = ltgsByPhase[g.phase.id] || []
      if (ltgs.length === 0) continue
      const rand = seededRand(g.phase.id)
      const baseAngle = 0.6 + rand() * Math.PI * 0.8
      ltgs.slice(0, 2).forEach((ltg, i) => {
        const a = baseAngle + i * 0.42
        const r1 = (g.r + g.thickness / 2 + 4) * scale
        const r2 = Math.min(VIEW / 2 - 6, r1 + 26 + (ltg.progress ?? 0) * 34)
        out.push({
          phaseId: g.phase.id,
          x1: C + Math.cos(a) * r1,
          y1: C + Math.sin(a) * r1,
          x2: C + Math.cos(a) * r2,
          y2: C + Math.sin(a) * r2,
          progress: ltg.progress ?? 0,
          title: ltg.title,
        })
      })
    }
    return out
  }, [rings, ltgsByPhase])

  // Grain flecks + amber memory pockets per ring, deterministic positions.
  const flecks = useMemo(() => {
    const out: { id: string; x: number; y: number; r: number; amber: boolean; phaseId: string }[] = []
    for (const g of rings) {
      const rand = seededRand(`${g.phase.id}-grain`)
      const rate = grainByPhase[g.phase.id] ?? 0
      const count = Math.round(26 * rate)
      const mCount = Math.min(4, memoriesByPhase[g.phase.id] ?? 0)
      for (let i = 0; i < count; i++) {
        const a = rand() * Math.PI * 2
        const rr = g.r * scale + (rand() - 0.5) * g.thickness * scale * 0.8
        out.push({
          id: `${g.phase.id}-f${i}`,
          x: C + Math.cos(a) * rr,
          y: C + Math.sin(a) * rr,
          r: 1.1 + rand() * 1.3,
          amber: false,
          phaseId: g.phase.id,
        })
      }
      for (let i = 0; i < mCount; i++) {
        const a = rand() * Math.PI * 2
        out.push({
          id: `${g.phase.id}-m${i}`,
          x: C + Math.cos(a) * (g.r * scale),
          y: C + Math.sin(a) * (g.r * scale),
          r: 3.4,
          amber: true,
          phaseId: g.phase.id,
        })
      }
    }
    return out
  }, [rings, grainByPhase, memoriesByPhase, scale])

  // Today's edge: flecks for today's completions.
  const todayFlecks = useMemo(() => {
    const rand = seededRand('today-edge')
    return Array.from({ length: Math.min(14, todayCompletions) }).map((_, i) => {
      const a = rand() * Math.PI * 2
      return { id: `t${i}`, x: C + Math.cos(a) * todayEdgeR, y: C + Math.sin(a) * todayEdgeR, r: 1.4 + rand() * 1.1 }
    })
  }, [todayCompletions, todayEdgeR])

  const dimLayer = (active: boolean) => (active ? 1 : 0.16)

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="h-full w-full"
      role="img"
      aria-label="Life phases as tree rings — oldest at the center, most recent at the edge"
    >
      <defs>
        <filter id="df-ring-grain" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={10} />
        </filter>
      </defs>

      {/* ── Branch layer (Gold) — behind rings, recedes in other lenses ── */}
      <g opacity={dimLayer(lens === 'gold')} style={{ transition: 'opacity 0.5s ease' }}>
        {branches.map((b, i) => (
          <g key={`${b.phaseId}-${i}`}>
            <motion.line
              x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
              stroke="#fbbf24"
              strokeWidth={lens === 'gold' ? 2.6 : 1.4}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: lens === 'gold' ? 1 : 0.35 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
            <circle
              cx={b.x2} cy={b.y2} r={lens === 'gold' ? 4.5 : 3}
              fill="#fbbf24"
              style={{ transition: 'r 0.4s ease' }}
            />
            {lens === 'gold' && (
              <title>{`${b.title} — ${Math.round(b.progress)}%`}</title>
            )}
          </g>
        ))}
      </g>

      {/* ── Ring layer ── */}
      <g filter={lens === 'covenant' ? 'url(#df-ring-grain)' : undefined}>
        {rings.map((g, i) => {
          const active = lens === 'phases' || lens === 'covenant'
          const selected = selectedPhaseId === g.phase.id
          const opacity = selected ? 1 : dimLayer(active)
          return (
            <motion.g
              key={g.phase.id}
              data-lifephase="ring"
              data-phase-id={g.phase.id}
              onClick={() => onPhaseClick(g.phase.id)}
              className="cursor-pointer"
              style={selected ? { filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.35))' } : undefined}
              animate={{ opacity }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <circle
                cx={C} cy={C}
                r={g.r * scale}
                fill="none"
                stroke={g.color}
                strokeWidth={g.thickness * scale}
                opacity={0.88}
                strokeLinecap="round"
                strokeDasharray={undefined}
              />
              {i === rings.length - 1 && g.phase.endYear == null && (
                <circle
                  cx={C} cy={C}
                  r={g.r * scale}
                  fill="none"
                  stroke={g.color}
                  strokeWidth={g.thickness * scale}
                  strokeDasharray="3 7"
                  opacity={0.35}
                />
              )}
              <title>{`${g.phase.title} (${g.phase.startYear}–${g.phase.endYear || 'now'})`}</title>
            </motion.g>
          )
        })}
      </g>

      {/* ── Grain flecks (Covenant) — brightens in covenant lens ── */}
      <g opacity={dimLayer(lens === 'covenant')} style={{ transition: 'opacity 0.5s ease' }}>
        {flecks.filter(f => !f.amber).map(f => (
          <circle
            key={f.id}
            cx={f.x} cy={f.y} r={f.r}
            fill="#a8a29e"
            opacity={lens === 'covenant' ? 0.85 : 0.4}
          />
        ))}
      </g>

      {/* ── Amber memory pockets (Memories) ── */}
      <g opacity={dimLayer(lens === 'memories')} style={{ transition: 'opacity 0.5s ease' }}>
        {flecks.filter(f => f.amber).map(f => (
          <circle
            key={f.id}
            cx={f.x} cy={f.y} r={lens === 'memories' ? f.r + 1.8 : f.r}
            fill="#fbbf24"
            className="cursor-pointer"
            onClick={() => onOpenMemory(f.phaseId)}
            style={{ transition: 'r 0.35s ease' }}
          >
            <title>Memories from this period</title>
          </circle>
        ))}
      </g>

      {/* ── Today's Edge — living, breathing outer edge ── */}
      <g opacity={dimLayer(true)}>
        <circle
          cx={C} cy={C} r={todayEdgeR}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={2.2}
          strokeDasharray="1 10"
          strokeLinecap="round"
          opacity={0.5}
          className="df-edge-breath"
          style={reducedMotion ? { opacity: 0.45 } : undefined}
        />
        {todayFlecks.map(f => (
          <circle key={f.id} cx={f.x} cy={f.y} r={f.r} fill="#fbbf24" opacity={0.7} />
        ))}
      </g>

      {/* Center grain */}
      <circle cx={C} cy={C} r={3} fill="#52525b" opacity={0.8} />
    </svg>
  )
}
