import { useState } from 'react'
import { Wand2, FileText, Layers, Zap, Search, Type, Clock, ShieldCheck, Check } from 'lucide-react'
import { AmberButton, Card, GhostButton, LoadingBlock, ErrorState, toast } from './ui'
import { cn } from '@/lib/utils'

const api = () => (window as any).deskflowAPI?.contentEngine

const ELEMENTS = [
  { id: 'script_frames', label: 'Script Frames + Retention Evidence', icon: <FileText size={12} /> },
  { id: 'hook_stack', label: 'Hook Stack (Frame 0–3s Architecture)', icon: <Zap size={12} /> },
  { id: 'curiosity_gaps', label: 'Curiosity Gap Bridges', icon: <Layers size={12} /> },
  { id: 'keywords_seo', label: 'Keywords / Hidden SEO', icon: <Search size={12} /> },
  { id: 'caption', label: 'Caption + Pinned Comment', icon: <Type size={12} /> },
  { id: 'timeline', label: 'Frame-by-Frame Timeline', icon: <Clock size={12} /> },
  { id: 'gates', label: '3-Gate Validation', icon: <ShieldCheck size={12} /> },
]

interface PlanningModeSelectorProps {
  episodeId: number
  onPlanGenerated?: () => void
}

export function PlanningModeSelector({ episodeId, onPlanGenerated }: PlanningModeSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(ELEMENTS.map(e => e.id)))
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<'success' | 'error' | null>(null)

  const allSelected = selected.size === ELEMENTS.length

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(ELEMENTS.map(e => e.id)))
    }
  }

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }

  const generate = async () => {
    if (generating || selected.size === 0) return
    setGenerating(true)
    setError(null)
    setLastResult(null)
    try {
      const res = await api()?.episodePlanFull({
        episodeId,
        elements: allSelected ? ['all'] : Array.from(selected),
      })
      if (res?.ok) {
        setLastResult('success')
        toast('Full plan generated — all panels populated')
        onPlanGenerated?.()
      } else {
        setLastResult('error')
        setError(res?.error || 'Generation failed')
      }
    } catch (e: any) {
      setLastResult('error')
      setError(e?.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 size={14} className="text-[#f5c518]" />
          <span className="text-xs font-semibold text-zinc-200">Generate Full Plan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <GhostButton onClick={toggleAll} className="h-6 px-2 text-[10px]">
            {allSelected ? 'Deselect All' : 'Select All'}
          </GhostButton>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {ELEMENTS.map(el => (
          <button
            key={el.id}
            onClick={() => toggle(el.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg border p-2.5 text-left text-[11px] transition-all',
              selected.has(el.id)
                ? 'border-[#f5c518]/30 bg-[#f5c518]/5 text-zinc-200'
                : 'border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:border-white/[0.12]',
            )}
          >
            <div className={cn(
              'flex h-4 w-4 items-center justify-center rounded-sm border transition-colors',
              selected.has(el.id) ? 'border-[#f5c518] bg-[#f5c518]' : 'border-zinc-600 bg-transparent',
            )}>
              {selected.has(el.id) && <Check size={10} className="text-black" />}
            </div>
            {el.icon}
            <span className="font-medium">{el.label}</span>
          </button>
        ))}
      </div>

      {generating && <LoadingBlock label="Generating full plan — this takes ~15s…" />}
      {error && <ErrorState message={error} onRetry={generate} />}
      {lastResult === 'success' && (
        <div className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-2.5 text-[11px] text-emerald-400">
          ✓ Full plan generated successfully. All panels below are now populated.
        </div>
      )}

      <AmberButton onClick={generate} disabled={generating || selected.size === 0} className="w-full">
        <Wand2 size={13} />
        {generating ? 'Generating…' : `Generate Full Plan (${selected.size} elements)`}
      </AmberButton>
    </Card>
  )
}
