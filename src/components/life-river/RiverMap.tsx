"use client"

import * as React from 'react'
import { useMemo } from 'react'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'
import { ZOOM_STOPS, type LifePhase } from '@/lib/riverMath'
import { Plus } from 'lucide-react'

import { EmptyRiver } from './empty-river'

interface RiverMapProps {
  phases: LifePhase[]
  zoomStop: string
  onZoomChange: (stop: string) => void
  activePhaseId: string | null
  onPhaseClick: (id: string) => void
  onAddPhase: () => void
}

export function RiverMap({
  phases,
  zoomStop,
  onZoomChange,
  activePhaseId,
  onPhaseClick,
  onAddPhase,
}: RiverMapProps) {
  const scrollToPhase = (id: string) => {
    try {
      document.getElementById(`phase-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } catch { /* ignore */ }
  }

  /* Map phase start/end years to X positions along the SVG curve */
  const { pathD, markers, nowX } = useMemo(() => {
    if (phases.length === 0) return { pathD: '', markers: [], nowX: 95 }

    const years = phases.flatMap(p => [p.startYear, p.endYear && p.endYear > 0 ? p.endYear : new Date().getFullYear()])
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years, new Date().getFullYear())
    const span = Math.max(maxYear - minYear, 1)
    const pad = 5
    const w = 100 - pad * 2
    const h = 80
    const cy = 50

    const yearToX = (y: number) => pad + ((y - minYear) / span) * w

    /* Build a smooth sweeping SVG path */
    const pts = phases
      .sort((a, b) => a.startYear - b.startYear)
      .map(p => {
        const x1 = yearToX(p.startYear)
        const x2 = yearToX(p.endYear && p.endYear > 0 ? p.endYear : new Date().getFullYear())
        const xm = (x1 + x2) / 2
        return { x1, x2, xm, phase: p }
      })

    let d = `M ${pad} ${cy}`
    pts.forEach((pt, i) => {
      const ctrlY = cy + (i % 2 === 0 ? -15 : 15)
      d += ` Q ${pt.x1 + 2} ${ctrlY}, ${pt.xm} ${cy}`
    })
    const lastPt = pts[pts.length - 1]
    if (lastPt) {
      const ctrlY = cy + (pts.length % 2 === 0 ? -15 : 15)
      d += ` Q ${lastPt.x2 - 2} ${ctrlY}, ${100 - pad} ${cy}`
    }

    const markers = pts.map(pt => ({
      id: pt.phase.id,
      x: pt.xm,
      y: cy,
      color: pt.phase.color || '#fbbf24',
      title: pt.phase.title,
      active: false,
    }))

    const nowX = yearToX(new Date().getFullYear())

    return { pathD: d, markers, nowX }
  }, [phases])

  return (
    <div
      data-lifephase="river-map"
      className="sticky top-0 z-40 bg-zinc-950/60 backdrop-blur-xl border-b border-zinc-800/50"
    >
      <div className="px-5 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="warmth-serif text-xs font-medium text-zinc-400 italic">Life River</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-800/50 p-0.5 rounded-lg">
              {ZOOM_STOPS.map(stop => (
                <button
                  key={stop.label}
                  onClick={() => onZoomChange(stop.label)}
                  data-lifephase={`zoom-${stop.label.toLowerCase()}`}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] transition-colors',
                    zoomStop === stop.label ? 'bg-zinc-700/80 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {stop.label}
                </button>
              ))}
            </div>
            <button
              onClick={onAddPhase}
              data-lifephase="add-phase"
              className="flex size-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10"
              aria-label="Add phase"
              title="Add phase"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {phases.length === 0 ? (
          <EmptyRiver onAdd={onAddPhase} />
        ) : (
          <div className="overflow-hidden rounded-lg">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-24"
              preserveAspectRatio="none"
            >
              {/* Background glow */}
              <defs>
                <linearGradient id="river-glow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#6fb38f" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Glow path */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#river-glow)"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#glow)"
              />

              {/* Main river path */}
              <path
                d={pathD}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="2 2"
              />

              {/* Phase markers */}
              {markers.map(m => (
                <g key={m.id} onClick={() => { scrollToPhase(m.id); onPhaseClick(m.id) }} className="cursor-pointer">
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={activePhaseId === m.id ? 4 : 3}
                    fill={m.color}
                    opacity={activePhaseId === m.id ? 1 : 0.7}
                    className="transition-all duration-300"
                  />
                  {activePhaseId === m.id && (
                    <circle
                      cx={m.x}
                      cy={m.y}
                      r="6"
                      fill="none"
                      stroke={m.color}
                      strokeWidth="1"
                      opacity="0.4"
                    >
                      <animate
                        attributeName="r"
                        values="4;7;4"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.4;0.1;0.4"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </g>
              ))}

              {/* "Now" pulsing amber star */}
              <g>
                <circle cx={nowX} cy={50} r="3" fill="#fbbf24">
                  <animate
                    attributeName="r"
                    values="2.5;4;2.5"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle cx={nowX} cy={50} r="6" fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.3">
                  <animate
                    attributeName="r"
                    values="5;8;5"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.3;0.05;0.3"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                </circle>
                <text
                  x={nowX}
                  y={68}
                  textAnchor="middle"
                  className="fill-zinc-500"
                  fontSize="4"
                  fontFamily="var(--font-mono, monospace)"
                >
                  now
                </text>
              </g>
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
