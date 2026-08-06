"use client"

import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'
import {
  MONTHS,
  categoryOf,
  zoomStops,
  type LifePhase,
} from '@/lib/riverMath'
import { ZoomIn, ZoomOut } from 'lucide-react'

const RIVER_H = 240
const BASELINE = RIVER_H - 52
const PAD_X = 30
const MAX_HEIGHT = 116

const TRIBUTARY_COLORS = ['#38bdf8', '#a78bfa', '#2dd4bf', '#f472b6']

interface RiverCanvasProps {
  phases: LifePhase[]
  selectedId?: string | null
  onSelect: (phase: LifePhase) => void
  className?: string
}

export function RiverCanvas({ phases, selectedId, onSelect, className }: RiverCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0
      setWidth(w)
    })
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const now = useMemo(() => new Date(), [])
  const dataMin = useMemo(
    () => Math.min(now.getFullYear() - 1, ...phases.map(p => p.startYear)),
    [phases, now]
  )
  const dataMax = useMemo(
    () => Math.max(now.getFullYear() + 1, ...phases.map(p => (p.endYear && p.endYear > 0 ? p.endYear : now.getFullYear()))),
    [phases, now]
  )

  const view = useMemo(
    () => zoomStops(zoom, Math.min(dataMin, dataMax - 2), Math.max(dataMax, dataMin + 2)),
    [zoom, dataMin, dataMax]
  )

  const innerW = Math.max(320, width - PAD_X * 2)
  const toX = (year: number, month: number) => {
    const t = (year + (month - 1) / 12 - view.minYear) / view.yearSpan
    return PAD_X + Math.min(1, Math.max(0, t)) * innerW
  }

  const nowX = toX(now.getFullYear(), now.getMonth() + 1)

  const tickYears = useMemo(() => {
    const span = view.yearSpan
    const step = span <= 20 ? 1 : span <= 40 ? 2 : span <= 60 ? 5 : 10
    const ticks: number[] = []
    for (let y = Math.ceil(view.minYear / step) * step; y <= view.maxYear; y += step) {
      ticks.push(y)
    }
    return ticks
  }, [view])

  const geo = useMemo(() => {
    return phases.map(p => {
      const x1 = toX(p.startYear, p.startMonth || 1)
      const x2 = p.endYear && p.endYear > 0
        ? toX(p.endYear, p.endMonth || 12)
        : nowX
      const w = Math.max(18, Math.min(innerW, x2 - x1))
      const h = Math.max(10, (Math.min(100, Math.max(0, p.magnitude)) / 100) * MAX_HEIGHT)
      const x = Math.max(PAD_X, Math.min(innerW + PAD_X - w, (x1 + x2) / 2 - w / 2))
      return { p, x, w, h }
    })
  }, [phases, nowX, innerW, toX]) // eslint-disable-line react-hooks/exhaustive-deps

  const drift = reduceMotion
    ? undefined
    : { y: [0, -3, 0] as number[], transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' as const } }


  return (
    <div
      ref={containerRef}
      data-lifephase="river-canvas"
      className={cn('relative w-full overflow-hidden', className)}
      style={{ height: RIVER_H }}
    >
      {width > 0 && (
        <svg
          width={width}
          height={RIVER_H}
          viewBox={`0 0 ${width} ${RIVER_H}`}
          className="block"
          role="img"
          aria-label="River of years timeline"
        >
          <defs>
            <linearGradient id="river-open-water" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* open water — the future, past the "now" marker */}
          {nowX < innerW + PAD_X - 8 && (
            <g data-lifephase="open-water">
              <rect
                x={nowX}
                y={BASELINE - 96}
                width={Math.max(0, innerW + PAD_X - nowX)}
                height={118}
                rx={10}
                fill="url(#river-open-water)"
              />
              {Array.from({ length: 8 }).map((_, i) => {
                const y = BASELINE - 78 + ((i * 37) % 80)
                const x = nowX + 26 + i * 64
                if (x > innerW + PAD_X - 14) return null
                return (
                  <g key={i} data-lifephase="open-water-plus" opacity={0.4}>
                    <path d={`M ${x - 3} ${y} H ${x + 3} M ${x} ${y - 3} V ${y + 3}`} stroke="#7dd3fc" strokeWidth={1.2} />
                  </g>
                )
              })}
            </g>
          )}

          {/* tributary arcs between connected phases */}
          {phases.map((p, i) => {
            const g = geo[i]
            if (!g) return null
            return p.connections.map((targetId, cIdx) => {
              const tIdx = phases.findIndex(q => q.id === targetId)
              if (tIdx < 0) return null
              const tg = geo[tIdx]
              const fromX = g.x + g.w
              const toX2 = tg.x
              if (toX2 <= fromX + 6) return null
              const color = TRIBUTARY_COLORS[(i + cIdx) % TRIBUTARY_COLORS.length]
              const midY = BASELINE + 34 + ((i + cIdx) % 3) * 10
              return (
                <motion.path
                  key={`${p.id}-${targetId}`}
                  data-lifephase="tributary"
                  d={`M ${fromX} ${BASELINE - 2} Q ${(fromX + toX2) / 2} ${midY} ${toX2} ${BASELINE - 2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.6}
                  strokeDasharray="5 5"
                  strokeOpacity={0.65}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 2.4, delay: i * 0.12, ease: 'easeInOut' }}
                />
              )
            })
          })}

          {/* the river reaches */}
          <motion.g
            animate={drift}
            style={{ transformOrigin: '50% 0%' }}
          >
            {geo.map(({ p, x, w, h }, i) => {
              const cat = categoryOf(p.category)
              const base = p.color || cat.color
              const y = BASELINE - h
              const selected = selectedId === p.id
              return (
                <g
                  key={p.id}
                  data-lifephase="reach"
                  data-phase-id={p.id}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer"
                  onClick={() => onSelect(p)}
                >
                  <motion.rect
                    rx={Math.min(14, h / 2)}
                    width={w}
                    height={h}
                    fill={base}
                    fillOpacity={selected ? 0.5 : 0.3}
                    stroke={base}
                    strokeOpacity={selected ? 0.95 : 0.55}
                    strokeWidth={1.4}
                    animate={{ y: [0, i % 2 === 0 ? -2.5 : 2, 0] }}
                    transition={reduceMotion
                      ? { duration: 0 }
                      : { duration: 2.2 + (i % 3) * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.18 }}
                    whileHover={{ fillOpacity: 0.55, scaleX: 1.015 }}
                    style={{ transformOrigin: 'center' }}
                  />
                  {/* crest highlight */}
                  <path
                    d={`M 2 ${h * 0.32} Q ${w * 0.25} ${h * 0.12} ${w * 0.5} ${h * 0.32} T ${w - 2} ${h * 0.32}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth={1.2}
                    strokeOpacity={0.7}
                  />
                  {/* branch pulse at the source */}
                  {!reduceMotion && (
                    <motion.circle
                      cx={4}
                      cy={h * 0.5}
                      r={4}
                      fill="none"
                      stroke={base}
                      strokeWidth={1.4}
                      initial={{ opacity: 0.6, scale: 1 }}
                      animate={{ opacity: 0, scale: 2.2 }}
                      transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.35, ease: 'easeOut' }}
                      style={{ transformOrigin: '4px 50%' }}
                    />
                  )}
                  <title>{`${p.title} — ${MONTHS[(p.startMonth || 1) - 1]} ${p.startYear}`}</title>
                </g>
              )
            })}
          </motion.g>

          {/* now marker */}
          <g data-lifephase="now-marker">
            <line x1={nowX} y1={BASELINE - 118} x2={nowX} y2={BASELINE + 14} stroke="#fbbf24" strokeWidth={1.4} strokeDasharray="3 4" strokeOpacity={0.8} />
            <circle cx={nowX} cy={BASELINE - 118} r={3.5} fill="#fbbf24" />
            <text x={nowX + 6} y={BASELINE - 121} fontSize={11} fill="#fbbf24" fontWeight={600} fontFamily="Space Grotesk, sans-serif">
              now
            </text>
          </g>

          {/* ruler */}
          <g data-lifephase="ruler">
            <line x1={PAD_X} y1={BASELINE + 6} x2={innerW + PAD_X} y2={BASELINE + 6} stroke="rgba(255,255,255,0.14)" strokeWidth={1} />
            {tickYears.map(y => {
              const x = toX(y, 1)
              return (
                <g key={y}>
                  <line x1={x} y1={BASELINE + 6} x2={x} y2={BASELINE + 11} stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
                  <text x={x} y={BASELINE + 24} fontSize={10.5} fill="rgba(255,255,255,0.42)" textAnchor="middle" fontFamily="Space Grotesk, sans-serif">
                    {y}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      )}

      {/* mini-map ribbon */}
      {phases.length > 1 && (
        <div
          data-lifephase="minimap"
          className="absolute left-3 top-3 flex h-1.5 w-40 items-stretch gap-[2px] overflow-hidden rounded-full bg-white/5"
          aria-hidden
        >
          {phases.map(p => {
            const cat = categoryOf(p.category)
            const dur = Math.max(1, (p.endYear && p.endYear > 0 ? p.endYear : now.getFullYear()) - p.startYear + 1)
            return (
              <div
                key={p.id}
                title={p.title}
                className="rounded-full"
                style={{ flexGrow: dur, background: p.color || cat.color, opacity: 0.85 }}
              />
            )
          })}
        </div>
      )}

      {/* zoom controls */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1" data-lifephase="zoom-controls">
        <button
          onClick={() => setZoom(z => Math.max(0, z - 1))}
          disabled={zoom <= 0}
          className="flex size-6 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-35"
          aria-label="Zoom out"
          title="Zoom out"
        >
          <ZoomOut size={12} />
        </button>
        <button
          onClick={() => setZoom(z => Math.min(4, z + 1))}
          disabled={zoom >= 4}
          className="flex size-6 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-35"
          aria-label="Zoom in"
          title="Zoom in"
        >
          <ZoomIn size={12} />
        </button>
      </div>
    </div>
  )
}
