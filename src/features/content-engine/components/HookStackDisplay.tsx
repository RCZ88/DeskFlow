import { useState, useEffect } from 'react'
import { Sparkles, Zap, Target, Clock, Eye, MessageSquare } from 'lucide-react'
import type { ContentEpisode } from '@/types/deskflow-api'
import { Card, Chip, EmptyState, ErrorState, LoadingBlock, SectionHeader } from './ui'

const HOOK_FRAMEWORK_MAP: Record<string, string> = {
  visual_hook: 'Visual Hook',
  verbal_hook: 'Verbal Hook',
  hook_at_3_4s: 'Hook at 3-4s',
  specific_pain: 'Specific Pain',
  pattern_interrupt: 'Pattern Interrupt',
  curiosity_gap: 'Curiosity Gap',
  attention_anchor: 'Attention Anchor',
  value_speed: 'Value Speed',
  stakes_first: 'Stakes First',
}

interface HookStackDisplayProps {
  episode: ContentEpisode
}

export function HookStackDisplay({ episode }: HookStackDisplayProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const script = Array.isArray(episode.script) ? episode.script : []
  const frame0 = script[0]
  const frame1 = script[1]
  const frame2 = script[2]

  if (loading) return <LoadingBlock label="Loading hook stack…" />
  if (error) return <ErrorState message={error} onRetry={() => setError(null)} />
  if (!frame0) {
    return (
      <EmptyState
        icon={<Sparkles size={28} />}
        title="No script yet"
        hint="Generate a script first to see the hook stack architecture."
      />
    )
  }

  // Derive hook framework from frame0's retention criteria
  const criteria = Array.isArray(frame0.retention?.criteria) ? frame0.retention.criteria : []
  const hookFramework = criteria
    .map((c: string) => HOOK_FRAMEWORK_MAP[c] || c.replace(/_/g, ' '))
    .join(' + ') || 'Not classified'

  return (
    <Card className="p-5">
      <SectionHeader
        label="HOOK STACK"
        title="Frame 0–3s Architecture"
        icon={<Zap size={14} className="text-[#f5c518]" />}
      />

      <div className="mt-4 space-y-3">
        {/* Visual Trigger */}
        <Row
          icon={<Eye size={12} />}
          label="Visual Trigger (0–0.5s)"
          value={frame0.visual || 'No visual description'}
          accent="#00d4ff"
        />

        {/* On-Screen Text */}
        <Row
          icon={<MessageSquare size={12} />}
          label="On-Screen Text"
          value={frame0.text}
          accent="#f5c518"
          mono
        />

        {/* Verbal Promise */}
        <Row
          icon={<Zap size={12} />}
          label="Verbal Promise (0.5–1.5s)"
          value={frame0.frame_type === 'hook' ? frame0.text : '(Frame 0 is not a hook type)'}
          accent="#f5c518"
        />

        {/* Hook Framework */}
        <div className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="mt-0.5 text-[#f5c518]"><Target size={12} /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] tracking-wider text-zinc-500 uppercase">Hook Framework</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {criteria.map((c: string) => (
                <Chip key={c} className="border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518] text-[9px]">
                  {HOOK_FRAMEWORK_MAP[c] || c.replace(/_/g, ' ')}
                </Chip>
              ))}
              {criteria.length === 0 && (
                <span className="text-[10px] text-zinc-500">No criteria mapped — run Validate Evidence</span>
              )}
            </div>
          </div>
        </div>

        {/* Context Lock */}
        <Row
          icon={<Clock size={12} />}
          label="Context Lock (1.5–3s)"
          value={frame1?.text || '(No frame 2 — add more frames)'}
          accent="#10b981"
          dim={!frame1}
        />

        {/* Quick Win */}
        <Row
          icon={<Sparkles size={12} />}
          label="Quick Win (3–10s)"
          value={frame2?.text || '(No frame 3 — add more frames)'}
          accent="#8b5cf6"
          dim={!frame2}
        />
      </div>
    </Card>
  )
}

function Row({ icon, label, value, accent, mono, dim }: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
  mono?: boolean
  dim?: boolean
}) {
  return (
    <div className={cn(
      'flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3',
      dim && 'opacity-40',
    )}>
      <div className="mt-0.5" style={{ color: accent }}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] tracking-wider text-zinc-500 uppercase">{label}</div>
        <p className={cn(
          'mt-0.5 text-[12px] leading-relaxed',
          mono ? 'font-mono text-[14px] text-zinc-100' : 'text-zinc-300',
        )}>
          {value}
        </p>
      </div>
    </div>
  )
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
