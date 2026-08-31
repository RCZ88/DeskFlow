# CONTEXT: SlideRenderer.tsx — Complete Current Implementation

> This is the EXACT source code of `src/features/presentation/SlideRenderer.tsx` (328 lines).
> No summarization. No omissions. The full file as it exists on disk.

---

```tsx
// SlideRenderer — Renders structured JSON slides via React components
// Replaces iframe srcDoc for JSON-format presentations

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface SlideData {
  index: number
  frame: string
  group: string
  headline: string
  subheadline?: string
  body?: string
  equation?: string
  badge?: string
  recap?: string[]
  visual: { type: string; data: any }
  layout: string
  motion: { entry: string; emphasis: string; interaction: string }
}

interface SlideRendererProps {
  slide: SlideData
  theme: any
  isActive: boolean
}

// ─── Visual Primitives ───

function HeroNumber({ data }: { data: any }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!data?.value) return
    const target = Number(data.value) || 0
    const duration = 1200
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      setDisplay(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [data?.value])
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="text-6xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-header)', color: 'var(--accent)' }}>
        {data?.prefix || ''}{display.toLocaleString()}{data?.suffix || ''}
      </div>
      {data?.label && <div className="text-sm" style={{ color: 'var(--muted)' }}>{data.label}</div>}
    </div>
  )
}

function CodeBlock({ data }: { data: any }) {
  return (
    <pre className="rounded-xl border p-5 text-sm overflow-x-auto" style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'var(--border)', fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>
      <code>{data?.code || ''}</code>
    </pre>
  )
}

function Diagram({ data }: { data: any }) {
  const nodes = data?.nodes || []
  const edges = data?.edges || []
  return (
    <svg viewBox="0 0 600 400" className="w-full h-auto">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="var(--accent)" />
        </marker>
      </defs>
      {edges.map((e: any, i: number) => {
        const from = nodes.find((n: any) => n.id === e.from)
        const to = nodes.find((n: any) => n.id === e.to)
        if (!from || !to) return null
        return (
          <g key={i}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--accent)" strokeWidth="1.5" markerEnd="url(#arrow)" />
            {e.label && <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8} fill="var(--muted)" fontSize="11" textAnchor="middle">{e.label}</text>}
          </g>
        )
      })}
      {nodes.map((n: any, i: number) => (
        <g key={i}>
          <rect x={n.x - 60} y={n.y - 20} width="120" height="40" rx="10" fill="var(--surface)" stroke="var(--border)" />
          <text x={n.x} y={n.y + 4} fill="var(--fg)" fontSize="13" textAnchor="middle" fontFamily="var(--font-body)">{n.label}</text>
        </g>
      ))}
    </svg>
  )
}

function Chart({ data }: { data: any }) {
  const items = data?.data || []
  const maxVal = Math.max(...items.map((d: any) => d.value || 0), 1)
  return (
    <div className="flex items-end gap-2 h-48">
      {items.map((d: any, i: number) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-md transition-all duration-700"
            style={{ height: `${((d.value || 0) / maxVal) * 100}%`, background: data?.color || 'var(--accent)', minHeight: 4 }}
          />
          <span className="text-xs truncate w-full text-center" style={{ color: 'var(--muted)' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function ProgressRing({ data }: { data: any }) {
  const pct = data?.max ? Math.min((data.value / data.max) * 100, 100) : 0
  const circumference = 2 * Math.PI * 52
  const offset = circumference * (1 - pct / 100)
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 120 120" className="w-32 h-32">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)' }} />
        <text x="60" y="60" textAnchor="middle" dominantBaseline="central" fill="var(--fg)" fontSize="20" fontWeight="700">{Math.round(pct)}%</text>
      </svg>
      {data?.label && <span className="text-sm" style={{ color: 'var(--muted)' }}>{data.label}</span>}
    </div>
  )
}

function Comparison({ data }: { data: any }) {
  const left = data?.left || {}
  const right = data?.right || {}
  return (
    <div className="grid grid-cols-2 gap-4">
      {[left, right].map((side, i) => (
        <div key={i} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="text-sm font-semibold mb-2" style={{ color: i === 0 ? 'var(--accent)' : 'var(--accent-2)' }}>{side.title}</div>
          {(side.items || []).map((item: string, j: number) => (
            <div key={j} className="text-xs py-1" style={{ color: 'var(--fg)', borderBottom: '1px solid var(--border)' }}>{item}</div>
          ))}
        </div>
      ))}
    </div>
  )
}

function Timeline({ data }: { data: any }) {
  const events = data?.events || []
  return (
    <div className="flex flex-col gap-4 pl-6" style={{ borderLeft: '2px solid var(--border)' }}>
      {events.map((e: any, i: number) => (
        <div key={i} className="relative">
          <div className="absolute -left-8 top-1 w-3 h-3 rounded-full" style={{ background: 'var(--accent)' }} />
          <div className="text-xs font-mono mb-0.5" style={{ color: 'var(--muted)' }}>{e.time}</div>
          <div className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{e.title}</div>
          {e.description && <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{e.description}</div>}
        </div>
      ))}
    </div>
  )
}

function Quote({ data }: { data: any }) {
  return (
    <blockquote className="relative pl-6" style={{ borderLeft: '3px solid var(--accent)' }}>
      <div className="text-xl font-semibold leading-relaxed" style={{ fontFamily: 'var(--font-header)', color: 'var(--fg)' }}>"{data?.text || ''}"</div>
      <cite className="block mt-3 text-sm not-italic" style={{ color: 'var(--muted)' }}>— {data?.author || 'Unknown'}{data?.role ? `, ${data.role}` : ''}</cite>
    </blockquote>
  )
}

function IconGrid({ data }: { data: any }) {
  const items = data?.items || []
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item: any, i: number) => (
        <div key={i} className="rounded-xl border p-4 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="text-lg mb-1" style={{ color: 'var(--accent)' }}>{item.icon || '●'}</div>
          <div className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>{item.label}</div>
          {item.description && <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{item.description}</div>}
        </div>
      ))}
    </div>
  )
}

function DataTable({ data }: { data: any }) {
  const columns = data?.columns || []
  const rows = data?.rows || []
  return (
    <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr>{columns.map((c: string, i: number) => (
          <th key={i} className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>{c}</th>
        ))}</tr>
      </thead>
      <tbody>{rows.map((row: string[], i: number) => (
        <tr key={i}>{row.map((cell: string, j: number) => (
          <td key={j} className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)', color: 'var(--fg)' }}>{cell}</td>
        ))}</tr>
      ))}</tbody>
    </table>
  )
}

function StepThrough({ data }: { data: any }) {
  const [step, setStep] = useState(0)
  const states = data?.states || []
  const current = states[step] || states[0] || {}
  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{current.label || ''}</div>
      <div className="text-xs" style={{ color: 'var(--muted)' }}>{current.description || ''}</div>
      <div className="flex gap-2 mt-2">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="px-3 py-1 rounded text-xs border disabled:opacity-30" style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}>Prev</button>
        <span className="text-xs self-center" style={{ color: 'var(--muted)' }}>{step + 1} / {states.length}</span>
        <button onClick={() => setStep(Math.min(states.length - 1, step + 1))} disabled={step >= states.length - 1} className="px-3 py-1 rounded text-xs border disabled:opacity-30" style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}>Next</button>
      </div>
    </div>
  )
}

function InteractiveDemo({ data }: { data: any }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="text-sm font-semibold mb-2" style={{ color: 'var(--fg)' }}>Interactive Demo</div>
      <div className="text-xs" style={{ color: 'var(--muted)' }}>{data?.description || ''}</div>
    </div>
  )
}

// ─── Visual Router ───

function VisualRenderer({ type, data }: { type: string; data: any }) {
  switch (type) {
    case 'hero-number': return <HeroNumber data={data} />
    case 'code-block': return <CodeBlock data={data} />
    case 'diagram': return <Diagram data={data} />
    case 'chart': return <Chart data={data} />
    case 'progress-ring': return <ProgressRing data={data} />
    case 'comparison': return <Comparison data={data} />
    case 'timeline': return <Timeline data={data} />
    case 'quote': return <Quote data={data} />
    case 'icon-grid': return <IconGrid data={data} />
    case 'data-table': return <DataTable data={data} />
    case 'step-through': return <StepThrough data={data} />
    case 'interactive-demo': return <InteractiveDemo data={data} />
    default: return <div className="text-xs" style={{ color: 'var(--muted)' }}>No visual</div>
  }
}

// ─── Main Renderer ───

export function SlideRenderer({ slide, theme, isActive }: SlideRendererProps) {
  const isSplit = slide.layout === 'split-left' || slide.layout === 'split-right'
  const splitReversed = slide.layout === 'split-right'

  const content = (
    <div className="flex flex-col gap-3">
      {slide.badge && (
        <span className="self-start px-2 py-0.5 rounded-lg text-xs font-semibold uppercase tracking-wider" style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
          {slide.badge}
        </span>
      )}
      <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-header)', color: 'var(--fg)' }}>
        {slide.headline}
      </h2>
      {slide.subheadline && (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{slide.subheadline}</p>
      )}
      {slide.body && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>{slide.body}</p>
      )}
      {slide.equation && (
        <div className="rounded-lg px-4 py-2 text-base font-mono" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
          {slide.equation}
        </div>
      )}
      {slide.recap && slide.recap.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {slide.recap.map((r: string, i: number) => (
            <span key={i} className="px-2 py-1 rounded-lg text-xs" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}>{r}</span>
          ))}
        </div>
      )}
    </div>
  )

  const visual = (
    <div className={cn('rounded-xl border p-4', slide.visual.type !== 'none' && 'min-h-[200px]')} style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <VisualRenderer type={slide.visual.type} data={slide.visual.data} />
    </div>
  )

  if (isSplit) {
    return (
      <div className={cn('grid gap-6 h-full items-center p-8', splitReversed ? 'grid-cols-[1fr_1.5fr]' : 'grid-cols-[1.5fr_1fr]')}>
        {splitReversed ? <>{visual}{content}</> : <>{content}{visual}</>}
      </div>
    )
  }

  // full-bleed or minimal
  if (slide.visual.type !== 'none' && slide.layout === 'full-bleed') {
    return (
      <div className="relative h-full">
        <div className="absolute inset-0 p-8 flex items-center justify-center">{visual}</div>
        {slide.body && (
          <div className="absolute bottom-6 left-6 right-6 rounded-xl border p-3" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', borderColor: 'var(--border)' }}>
            <div className="text-xs" style={{ color: 'var(--fg)' }}>{slide.headline}</div>
          </div>
        )}
      </div>
    )
  }

  // minimal / transition
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center max-w-lg">
        <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-header)', color: 'var(--muted)' }}>
          {slide.headline || slide.body || ''}
        </h2>
      </div>
    </div>
  )
}

export default SlideRenderer
```

---

## Key findings for the Specialist AI

1. **Types** — `SlideData` has: index, frame, group, headline, subheadline?, body?, equation?, badge?, recap?, visual: { type, data }, layout, motion: { entry, emphasis, interaction }. No separate ContentSpec/PresentationSpec split — it's a flat interface.

2. **Layout interpretation** — `isSplit = layout === 'split-left' || 'split-right'`. Split uses CSS grid `grid-cols-[1.5fr_1fr]` or `[1fr_1.5fr]`. Full-bleed uses absolute positioning. Minimal uses flexbox center.

3. **Visual dispatch** — `VisualRenderer` switch statement maps type string to React component. 12 visual types. Default returns "No visual" text.

4. **No `visual.html` field** — The renderer has NO `visual.html` handling. It only reads `visual.type` and `visual.data`. There is no `visual.html` in the `SlideData` interface. If the AI outputs `visual.html`, it would be ignored.

5. **Equation rendering** — Simple `<div>` with monospace font and accent color. No LaTeX/KaTeX rendering. Just displays the string.

6. **Theme tokens** — All colors/fonts via CSS custom properties (`var(--accent)`, `var(--font-header)`, etc.). No direct hex values. The `theme` prop is received but NOT used — all styling goes through CSS variables.

7. **Motion** — The `motion` field exists in `SlideData` but is NOT interpreted by the renderer. No animations are applied based on motion values. `isActive` prop is received but not used for motion.

8. **Responsive behavior** — None. No media queries, no aspect-ratio adaptation, no breakpoint handling. The renderer is fixed-width.

9. **Fallback behavior** — Each primitive defaults to empty data (`data?.field || ''`). VisualRenderer default case returns "No visual" text.

10. **No sanitization** — No HTML escaping, no DOMPurify, no SVG sanitization. The `body`, `equation`, `headline` fields are rendered as plain text (React auto-escapes).

11. **Interactive primitives** — StepThrough has Prev/Next buttons with local state. All others are static.

12. **Missing features vs the prompt's JSON schema** — The prompt defines 12 visual types with structured data models, but the renderer only handles basic cases. No `highlightLines` for code-block, no `direction` for diagram, no `kind` distinction for chart (bar/line/area), no `inputs/outputs` for interactive-demo.
