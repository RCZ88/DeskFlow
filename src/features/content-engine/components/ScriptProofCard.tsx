import { useState } from 'react'
import { CheckCircle2, RefreshCw, XCircle, AlertTriangle, Wand2 } from 'lucide-react'
import type { ScriptFrame, ScoringSchemeInfo } from '@/types/deskflow-api'
import { cn } from '@/lib/utils'
import { Card, GhostButton, AmberButton, TextArea, FieldLabel } from './ui'

console.log('%c[ContentEngine] vX.2 loaded', 'color:#f5c518;font-weight:bold')

const FRAME_TYPE_COLORS: Record<string, string> = {
  hook: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]',
  value: 'border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff]',
  transition: 'border-violet-500/25 bg-violet-500/10 text-violet-400',
  call_to_action: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  visual_only: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400',
}

const CRITERION_COLORS: Record<string, string> = {
  hook: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]',
  curiosity: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]',
  pattern_interrupt: 'border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff]',
  attention_anchor: 'border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff]',
  curiosity_gap: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]',
  retention: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  clarity: 'border-violet-500/25 bg-violet-500/10 text-violet-400',
  emotion: 'border-rose-500/25 bg-rose-500/10 text-rose-400',
  specific_pain: 'border-rose-500/25 bg-rose-500/10 text-rose-400',
  value_loop: 'border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff]',
  three_cs: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]',
  visual_hook: 'border-violet-500/25 bg-violet-500/10 text-violet-400',
  verbal_hook: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
  context_lock: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  hook_at_3_4s: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]',
  value_speed: 'border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff]',
  specific_paint: 'border-rose-500/25 bg-rose-500/10 text-rose-400',
}

function criterionClass(id: string) {
  return CRITERION_COLORS[id] || 'border-white/[0.08] bg-white/[0.04] text-zinc-400'
}

function fmtSec(s?: number | null) {
  if (s == null || !Number.isFinite(s)) return '—'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function parseEvidenceLines(evidence: string): Array<{ quote: string; criterion: string }> {
  if (!evidence) return []
  const lines = evidence.split('\n').filter((l) => l.trim())
  return lines.map((line) => {
    const quoteMatch = line.match(/QUOTE:\s*"?([^"→]+?)"?\s*→/)
    const critMatch = line.match(/→\s*proves\s+(\w+)/i)
    return {
      quote: quoteMatch?.[1]?.trim() ?? line.trim(),
      criterion: critMatch?.[1]?.trim() ?? '',
    }
  })
}

interface ScriptProofCardProps {
  frame: ScriptFrame
  scheme: ScoringSchemeInfo
  rubricVersion: string
  onAccept: () => void
  onReject: () => void
  onRegenerate: (instruction: string) => void
  isRejected: boolean
}

export function ScriptProofCard({
  frame,
  scheme,
  rubricVersion,
  onAccept,
  onReject,
  onRegenerate,
  isRejected,
}: ScriptProofCardProps) {
  const [regenMode, setRegenMode] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [regenLoading, setRegenLoading] = useState(false)

  const retention = frame.retention
  const score = retention?.score ?? 0
  const criteria: string[] = Array.isArray(retention?.criteria) ? retention.criteria : []
  const mechanism = retention?.mechanism ?? ''
  const evidence = retention?.evidence ?? ''
  const frameType = frame.frame_type || 'value'
  const pass = score >= 0.6
  const weight = scheme.weights?.value_loop ?? scheme.weights?.[criteria[0]] ?? 0
  const weighted = score * weight

  const rejected = isRejected || frame.rejected
  const reasons = frame.rejection_reasons ?? []
  const evidenceLines = parseEvidenceLines(evidence)

  const handleRegenerate = async () => {
    if (regenLoading || !instruction.trim()) return
    setRegenLoading(true)
    try {
      onRegenerate(instruction.trim())
      setRegenMode(false)
      setInstruction('')
    } finally {
      setRegenLoading(false)
    }
  }

  const scoreColor = score < 0.6 ? 'text-rose-400' : score <= 0.8 ? 'text-[#f5c518]' : 'text-emerald-400'
  const scorePct = Math.max(0, Math.min(1, score)) * 100
  const barColor = score < 0.6 ? 'bg-rose-500' : score <= 0.8 ? 'bg-[#f5c518]' : 'bg-emerald-500'

  return (
    <Card
      className={cn(
        'flex flex-col gap-3 p-5 transition-colors',
        rejected
          ? 'border-rose-500/30 bg-rose-950/20'
          : 'border-white/[0.06] bg-[rgba(24,24,27,0.60)]',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
            FRAME #{frame.index + 1}
          </span>
          <span className={cn(
            'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase',
            FRAME_TYPE_COLORS[frameType] || FRAME_TYPE_COLORS.value,
          )}>
            {frameType}
          </span>
          <span className="font-mono text-[10px] text-zinc-500">
            {fmtSec(frame.duration_seconds ?? frame.timestamp)}
          </span>
        </div>
        {rejected && (
          <div className="flex items-center gap-1 text-[10px] font-semibold text-rose-400">
            <AlertTriangle size={11} />
            REJECTED (score: {score.toFixed(2)})
          </div>
        )}
      </div>

      {/* Quote */}
      <div className={cn(
        'rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5',
        rejected && 'border-rose-500/20 bg-rose-500/[0.04]',
      )}>
        <p className={cn(
          'font-mono text-[14px] leading-relaxed text-zinc-100',
          rejected && 'text-zinc-500 line-through',
        )}>
          &ldquo;{frame.text}&rdquo;
        </p>
      </div>

      {/* Visual */}
      {frame.visual && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
          <span className="text-[9px] font-medium tracking-wider text-[#00d4ff] uppercase">Visual</span>
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">{frame.visual}</p>
        </div>
      )}

      {/* Retention Evidence Section */}
      {criteria.length > 0 || mechanism || evidence ? (
        <div className="space-y-2.5">
          <div className="text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">
            ─── Retention Evidence ───
          </div>

          {/* Criteria chips */}
          {criteria.length > 0 && (
            <div>
              <div className="mb-1 text-[9px] tracking-wider text-zinc-600 uppercase">Criteria</div>
              <div className="flex flex-wrap gap-1">
                {criteria.map((c) => (
                  <span
                    key={c}
                    className={cn(
                      'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                      criterionClass(c),
                    )}
                  >
                    {c.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Mechanism */}
          {mechanism && (
            <div>
              <div className="mb-0.5 text-[9px] tracking-wider text-zinc-600 uppercase">Mechanism</div>
              <p className="text-[12px] italic leading-relaxed text-zinc-300">{mechanism}</p>
            </div>
          )}

          {/* Evidence */}
          {evidence && (
            <div>
              <div className="mb-1 text-[9px] tracking-wider text-zinc-600 uppercase">Evidence</div>
              <div className="rounded-lg border-l-2 border-[#f5c518] bg-white/[0.03] p-3">
                {evidenceLines.length > 0 ? (
                  <ul className="space-y-1">
                    {evidenceLines.map((line, i) => (
                      <li key={i} className="font-mono text-[11px] leading-relaxed text-zinc-400">
                        <span className="text-[#f5c518]">QUOTE:</span>{' '}
                        <span className="text-zinc-300">&ldquo;{line.quote}&rdquo;</span>
                        {line.criterion && (
                          <> <span className="text-zinc-500">→ proves</span>{' '}
                            <span className="text-[#00d4ff]">{line.criterion}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-mono text-[11px] leading-relaxed text-zinc-400">{evidence}</p>
                )}
              </div>
            </div>
          )}

          {/* Score bar + weight */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', barColor)}
                    style={{ width: `${scorePct}%` }}
                  />
                </div>
              </div>
              <span className={cn('text-sm font-bold tabular-nums', scoreColor)}>
                {score.toFixed(2)}
              </span>
            </div>
            {weight > 0 && (
              <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                <span>
                  Scheme weight:{' '}
                  <span className="text-zinc-300">
                    {criteria[0] ?? '—'} = {weight.toFixed(2)} ({scheme.name})
                  </span>
                </span>
                <span>
                  Weighted:{' '}
                  <span className="font-mono text-zinc-300">
                    {score.toFixed(2)} × {weight.toFixed(2)} = {weighted.toFixed(3)}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] text-zinc-600">
          No retention analysis — run &ldquo;Validate Evidence (AI)&rdquo; to populate.
        </div>
      )}

      {/* Rejection reasons */}
      {rejected && reasons.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] font-semibold tracking-wider text-rose-400 uppercase">
            Rejection Reasons
          </div>
          {reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-rose-300/80">
              <XCircle size={11} className="mt-0.5 shrink-0 text-rose-500" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-white/[0.06] pt-3">
        <GhostButton
          className={cn(
            'h-7 px-2 text-[11px]',
            !rejected && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
          )}
          onClick={onAccept}
        >
          <CheckCircle2 size={12} /> Accept
        </GhostButton>
        <GhostButton
          className={cn(
            'h-7 px-2 text-[11px]',
            !rejected && 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20',
          )}
          onClick={onReject}
        >
          <XCircle size={12} /> Reject
        </GhostButton>
        <GhostButton
          className="h-7 px-2 text-[11px]"
          onClick={() => setRegenMode((v) => !v)}
        >
          <RefreshCw size={12} /> {regenMode ? 'Cancel' : 'Regenerate'}
        </GhostButton>
      </div>

      {/* Regenerate inline */}
      {regenMode && (
        <div className="rounded-lg border border-[#f5c518]/20 bg-[#f5c518]/[0.04] p-3">
          <FieldLabel>Regeneration instruction</FieldLabel>
          <TextArea
            rows={2}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Make it punchier, cut 3 words, open with a question…"
          />
          <div className="mt-2">
            <AmberButton onClick={handleRegenerate} disabled={regenLoading || !instruction.trim()}>
              <Wand2 size={13} /> {regenLoading ? 'Rewriting…' : 'Rewrite Frame'}
            </AmberButton>
          </div>
        </div>
      )}
    </Card>
  )
}
