import { useState } from 'react'
import { ClipboardPaste, Eye, Heart, MessageSquare, Share2, TrendingUp, X, Check } from 'lucide-react'
import { AmberButton, Card, GhostButton, LoadingBlock, toast } from './ui'
import type { AnalyticsCandidate } from '@/types/deskflow-api'

console.log('%c[ContentEngine] v4.0 loaded', 'color:#f5c518;font-weight:bold')

const api = () => (window as any).deskflowAPI?.contentEngine

function fmt(n?: number | null) {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function ConfidenceDot({ value }: { value: number | null }) {
  if (value == null) return null
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-[#f5c518]' : 'bg-rose-400'
  return (
    <span className="flex items-center gap-1 text-[10px] text-zinc-500">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />
      {pct}% conf
    </span>
  )
}

function DetectedField({ label, value, icon, confidence }: {
  label: string
  value: string | number | null
  icon: React.ReactNode
  confidence?: number | null
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-zinc-500">{icon}</span>
        <span className="text-[10px] tracking-wider text-zinc-500 uppercase">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-zinc-100">{value}</span>
        {confidence != null && <ConfidenceDot value={confidence} />}
      </div>
    </div>
  )
}

function RetentionPreview({ curve }: { curve: Array<{ t: number; pct: number }> }) {
  if (!curve.length) return null
  const maxPct = Math.max(...curve.map((c) => c.pct), 1)
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-2 text-[9px] tracking-wider text-zinc-500 uppercase">Retention curve detected</div>
      <div className="flex items-end gap-px" style={{ height: 48 }}>
        {curve.slice(0, 20).map((pt, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-[#00d4ff]/40"
            style={{ height: `${(pt.pct / maxPct) * 100}%`, minHeight: 2 }}
            title={`${pt.t}s: ${pt.pct.toFixed(0)}%`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-zinc-600">
        <span>0s</span>
        <span>{curve[curve.length - 1]?.t ?? 0}s</span>
      </div>
    </div>
  )
}

export function AnalyticsImportModal({ episodeId, open, onClose, onImported }: {
  episodeId?: number
  open: boolean
  onClose: () => void
  onImported?: () => void
}) {
  const [raw, setRaw] = useState('')
  const [step, setStep] = useState<'paste' | 'review' | 'done'>('paste')
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [candidate, setCandidate] = useState<AnalyticsCandidate | null>(null)
  const [platformOverride, setPlatformOverride] = useState('')

  if (!open) return null

  const parse = async () => {
    if (!raw.trim() || parsing) return
    setParsing(true)
    try {
      const res = await api()?.analyticsParseRaw({ raw: raw.trim() })
      if (res?.ok && res.candidate) {
        setCandidate(res.candidate)
        setStep('review')
      } else {
        toast(res?.error || 'Failed to parse analytics data', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Parse failed', 'error')
    } finally {
      setParsing(false)
    }
  }

  const confirm = async () => {
    if (!candidate || saving) return
    setSaving(true)
    try {
      const video: any = {
        title: `${candidate.platform || 'Unknown'} video — ${fmt(candidate.views)} views`,
        platform: platformOverride || candidate.platform || 'tiktok',
        views: candidate.views ?? 0,
        likes: candidate.likes ?? 0,
        comments: candidate.comments ?? 0,
        shares: candidate.shares ?? 0,
        saves: candidate.saves ?? 0,
        completion_pct: candidate.completion_pct ?? 0,
        published_at: candidate.published_at ?? null,
        retention_csv: candidate.retention_curve.length > 0
          ? candidate.retention_curve.map((p) => String(p.pct)).join(',')
          : undefined,
        audience_ages: candidate.audience?.ages
          ? candidate.audience.ages.map((a) => `${a.range}:${a.pct}`).join(',')
          : undefined,
        audience_countries: candidate.audience?.countries
          ? candidate.audience.countries.map((c) => `${c.code}:${c.pct}`).join(',')
          : undefined,
      }
      if (episodeId) video.episode_id = episodeId
      const res = await api()?.analyticsUpsertVideo(video)
      if (res?.ok) {
        toast('Analytics imported successfully')
        setStep('done')
        onImported?.()
      } else {
        toast(res?.error || 'Failed to save', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setRaw('')
    setStep('paste')
    setCandidate(null)
    setPlatformOverride('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step !== 'done' ? reset : onClose} />
      <div className="relative z-10 flex w-full max-w-lg flex-col gap-4">
        <Card className="max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardPaste size={16} className="text-[#f5c518]" />
              <span className="text-sm font-semibold text-zinc-100">
                {step === 'paste' && 'Import Raw Analytics'}
                {step === 'review' && 'Review Parsed Data'}
                {step === 'done' && 'Import Complete'}
              </span>
            </div>
            <button onClick={reset} className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300">
              <X size={14} />
            </button>
          </div>

          {/* Step indicator */}
          <div className="mb-4 flex items-center gap-2">
            {['paste', 'review', 'done'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  step === s ? 'bg-[#f5c518] text-black' :
                  ['paste', 'review', 'done'].indexOf(step) > i ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-white/[0.06] text-zinc-500'
                }`}>
                  {['paste', 'review', 'done'].indexOf(step) > i ? <Check size={10} /> : i + 1}
                </div>
                {i < 2 && <div className="h-px w-6 bg-white/[0.08]" />}
              </div>
            ))}
          </div>

          {/* STEP 1: Paste */}
          {step === 'paste' && (
            <div className="space-y-3">
              <p className="text-[11px] text-zinc-400">
                Paste raw analytics from Instagram, TikTok, YouTube, or any platform. The AI will extract metrics automatically.
              </p>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={8}
                placeholder={`Paste your analytics here...\n\nExample:\nViews: 12,450\nLikes: 834\nComments: 47\nShares: 12\nCompletion rate: 68%\nPublished: 2026-08-10\nRetention: 100, 85, 72, 65, 58, 50, 44, 40`}
                className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 font-mono text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#f5c518]/50"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">
                  {raw.length > 0 ? `${raw.length} chars` : 'Paste data to begin'}
                </span>
                <AmberButton onClick={parse} disabled={!raw.trim() || parsing}>
                  {parsing ? 'Parsing…' : 'Parse & Extract'}
                </AmberButton>
              </div>
            </div>
          )}

          {/* STEP 2: Review */}
          {step === 'review' && candidate && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <DetectedField label="Platform" value={candidate.platform || 'Unknown'} icon={<TrendingUp size={12} />} />
                <DetectedField label="Views" value={fmt(candidate.views)} icon={<Eye size={12} />} />
                <DetectedField label="Likes" value={fmt(candidate.likes)} icon={<Heart size={12} />} />
                <DetectedField label="Comments" value={fmt(candidate.comments)} icon={<MessageSquare size={12} />} />
                <DetectedField label="Shares" value={fmt(candidate.shares)} icon={<Share2 size={12} />} />
                <DetectedField label="Saves" value={fmt(candidate.saves)} icon={<Check size={12} />} />
                <DetectedField label="Completion" value={candidate.completion_pct != null ? `${candidate.completion_pct.toFixed(0)}%` : '—'} icon={<TrendingUp size={12} />} />
                <DetectedField label="Published" value={candidate.published_at ?? '—'} icon={<ClipboardPaste size={12} />} />
              </div>

              {candidate.retention_curve.length > 0 && <RetentionPreview curve={candidate.retention_curve} />}

              {candidate.audience && (
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="mb-1 text-[9px] tracking-wider text-zinc-500 uppercase">Audience</div>
                  {candidate.audience.ages.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {candidate.audience.ages.map((a, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-zinc-300">
                          {a.range}: {a.pct}%
                        </span>
                      ))}
                    </div>
                  )}
                  {candidate.audience.countries.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {candidate.audience.countries.slice(0, 6).map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-zinc-300">
                          {c.name}: {c.pct}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <GhostButton onClick={() => { setStep('paste'); setCandidate(null) }}>
                  Re-parse
                </GhostButton>
                <AmberButton onClick={confirm} disabled={saving}>
                  {saving ? 'Saving…' : 'Confirm Import'}
                </AmberButton>
              </div>
            </div>
          )}

          {/* STEP 3: Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                <Check size={20} className="text-emerald-400" />
              </div>
              <p className="text-sm text-zinc-200">Analytics data imported and saved.</p>
              <AmberButton onClick={reset}>Done</AmberButton>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
