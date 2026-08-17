import { ShieldCheck, ShieldX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScoreBar } from './ui'

const CRITERION_COLORS: Record<string, string> = {
  hook: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]',
  curiosity: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]',
  pattern_interrupt: 'border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff]',
  attention_anchor: 'border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff]',
  curiosity_gap: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]',
  retention: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  clarity: 'border-violet-500/25 bg-violet-500/10 text-violet-400',
  emotion: 'border-rose-500/25 bg-rose-500/10 text-rose-400',
}

function criterionClass(id: string) {
  return CRITERION_COLORS[id] || CRITERION_COLORS.retention
}

export function RetentionPanel({ retention }: { retention?: any }) {
  const criteria: string[] = Array.isArray(retention?.criteria) ? retention.criteria : []
  const mechanism: string = retention?.mechanism || ''
  const evidence: string = retention?.evidence || ''
  const score = typeof retention?.score === 'number' ? retention.score : 0
  const hasData = criteria.length > 0 || mechanism || evidence

  if (!hasData) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] text-zinc-600">
        No retention analysis for this frame yet — run “Validate Evidence (AI)” to get one.
      </div>
    )
  }

  const pass = score >= 0.6
  const scoreColor = score < 0.6 ? 'text-rose-400' : score <= 0.8 ? 'text-[#f5c518]' : 'text-emerald-400'

  return (
    <div className="rounded-lg border border-[#f5c518]/15 bg-[#f5c518]/[0.04] p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold tracking-wider text-[#f5c518] uppercase">Retention Evidence</div>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-bold tabular-nums', scoreColor)}>{score.toFixed(2)}</span>
          <span className={cn(
            'inline-flex rotate-[-8deg] rounded border-2 px-1.5 py-0.5 text-[9px] font-black tracking-widest uppercase',
            pass ? 'border-emerald-500/60 text-emerald-400' : 'border-rose-500/60 text-rose-400',
          )}>
            {pass ? 'PASS' : 'REJECT'}
          </span>
        </div>
      </div>
      {criteria.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1">
          {criteria.map((c) => (
            <span key={c} className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium', criterionClass(c))}>
              {c.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
      {mechanism && (
        <div className="mb-1.5">
          <div className="text-[9px] tracking-wider text-zinc-500 uppercase">Mechanism</div>
          <div className="text-[11px] text-zinc-200">{mechanism}</div>
        </div>
      )}
      {evidence && (
        <div className="mb-2.5">
          <div className="text-[9px] tracking-wider text-zinc-500 uppercase">Evidence</div>
          <div className="text-[11px] text-zinc-400">{evidence}</div>
        </div>
      )}
      <ScoreBar score={score} />
      <div className="mt-1 text-right text-[9px] text-zinc-600">threshold 0.60</div>
    </div>
  )
}