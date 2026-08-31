import { useState } from 'react'
import { Wand2, Sparkles, Zap, Brain, Target, FileText, ShieldCheck, Search, BarChart3, GraduationCap, Layers, Type, Clock, ChevronDown, ChevronRight, Check, ExternalLink, ClipboardPaste, LoaderCircle } from 'lucide-react'
import { AmberButton, Card, GhostButton, TextArea, EmptyState, ErrorState, toast } from './ui'
import { cn } from '@/lib/utils'

const api = () => (window as any).deskflowAPI?.contentEngine

interface PipelineStep {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  handler: (input: string, context: any) => Promise<{ ok: boolean; data?: any; error?: string }>
  requiresEpisode?: boolean
}

interface DynamicPipelineProps {
  episodeId?: number
  onStepResult?: (stepId: string, data: any) => void
}

export function DynamicPipeline({ episodeId, onStepResult }: DynamicPipelineProps) {
  const [input, setInput] = useState('')
  const [selectedSteps, setSelectedSteps] = useState<Set<string>>(new Set(['classify', 'script', 'gates', 'seo']))
  const [running, setRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, { ok: boolean; data?: any; error?: string }>>({})
  const [expanded, setExpanded] = useState(true)
  const [allDone, setAllDone] = useState(false)

  const steps: PipelineStep[] = [
    {
      id: 'classify',
      label: 'Classify Thought',
      icon: <Brain size={12} />,
      description: 'Route to correct destination (idea/framework/analytics/thought)',
      handler: async (text) => {
        const res = await api()?.externalBuildClassifyPrompt({ thought: text, templateIds: [], frameMode: 'strict' })
        if (!res?.ok) return { ok: false, error: res?.error }
        // For local processing, we call the internal classify
        const classifyRes = await api()?.brainstormClassify({ thought: text })
        return classifyRes
      },
    },
    {
      id: 'script',
      label: 'Generate Script',
      icon: <FileText size={12} />,
      description: 'Write frames with retention evidence (requires episode)',
      requiresEpisode: true,
      handler: async (_text, ctx) => {
        const res = await api()?.scriptGenerate({ episodeId: ctx.episodeId })
        return res
      },
    },
    {
      id: 'gates',
      label: 'Validate Gates',
      icon: <ShieldCheck size={12} />,
      description: 'Check scroll-stop, hard-cut, asset-ready (requires episode with script)',
      requiresEpisode: true,
      handler: async (_text, ctx) => {
        const res = await api()?.validateGates({ episodeId: ctx.episodeId })
        return res
      },
    },
    {
      id: 'seo',
      label: 'Inject SEO',
      icon: <Search size={12} />,
      description: 'Generate hidden keyword phrases (requires episode)',
      requiresEpisode: true,
      handler: async (_text, ctx) => {
        const res = await api()?.injectSeo({ episodeId: ctx.episodeId })
        return res
      },
    },
    {
      id: 'evidence',
      label: 'Validate Evidence',
      icon: <Target size={12} />,
      description: 'Re-verify all frame retention evidence (requires episode)',
      requiresEpisode: true,
      handler: async (_text, ctx) => {
        const res = await api()?.validateScriptEvidence({ episodeId: ctx.episodeId })
        return res
      },
    },
    {
      id: 'ideas',
      label: 'Synthesize Ideas',
      icon: <Sparkles size={12} />,
      description: 'Generate 3 new content ideas from context',
      handler: async (text) => {
        const res = await api()?.synthesizeIdeas({ note: text, count: 3 })
        return res
      },
    },
    {
      id: 'insights',
      label: 'Analytics Insights',
      icon: <BarChart3 size={12} />,
      description: 'Analyze performance data (requires episode with analytics)',
      requiresEpisode: true,
      handler: async (_text, ctx) => {
        const res = await api()?.analyticsInsight({ episodeId: ctx.episodeId })
        return res
      },
    },
    {
      id: 'lessons',
      label: 'Extract Lessons',
      icon: <GraduationCap size={12} />,
      description: 'Pull durable rules from performance (requires episode)',
      requiresEpisode: true,
      handler: async (_text, ctx) => {
        const res = await api()?.lessonExtract({ videoId: ctx.episodeId })
        return res
      },
    },
    {
      id: 'reflection',
      label: 'Analyze Reflection',
      icon: <Zap size={12} />,
      description: 'Analyze creator intuition vs data (requires episode)',
      requiresEpisode: true,
      handler: async (_text, ctx) => {
        const res = await api()?.reflectionAnalyze({ episodeId: ctx.episodeId })
        return res
      },
    },
    {
      id: 'frameworks',
      label: 'Update Frameworks',
      icon: <Layers size={12} />,
      description: 'Extract new framework rules from confirmed lessons',
      handler: async () => {
        const res = await api()?.externalBuildFrameworksPrompt({})
        return res
      },
    },
    {
      id: 'fullplan',
      label: 'Full Plan (All at Once)',
      icon: <Wand2 size={12} />,
      description: 'Generate script + hook + gates + seo + caption + timeline in ONE call',
      requiresEpisode: true,
      handler: async (_text, ctx) => {
        const res = await api()?.episodePlanFull({ episodeId: ctx.episodeId, elements: ['all'] })
        return res
      },
    },
  ]

  const toggleStep = (id: string) => {
    const next = new Set(selectedSteps)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedSteps(next)
  }

  const selectAll = () => {
    const available = steps.filter(s => !s.requiresEpisode || episodeId)
    setSelectedSteps(new Set(available.map(s => s.id)))
  }

  const runPipeline = async () => {
    if (running || selectedSteps.size === 0) return
    if (!input.trim() && !episodeId) { toast('Enter a thought or topic first', 'error'); return }

    setRunning(true)
    setAllDone(false)
    setResults({})
    const ctx = { episodeId }

    for (const stepId of Array.from(selectedSteps)) {
      const step = steps.find(s => s.id === stepId)
      if (!step) continue
      if (step.requiresEpisode && !episodeId) {
        setResults(prev => ({ ...prev, [stepId]: { ok: false, error: 'Requires an open episode' } }))
        continue
      }

      setCurrentStep(stepId)
      try {
        const result = await step.handler(input.trim(), ctx)
        setResults(prev => ({ ...prev, [stepId]: result }))
        onStepResult?.(stepId, result)
        if (!result.ok) {
          toast(`${step.label} failed: ${result.error}`, 'error')
        }
      } catch (e: any) {
        setResults(prev => ({ ...prev, [stepId]: { ok: false, error: e?.message || 'Failed' } }))
        toast(`${step.label} error: ${e?.message}`, 'error')
      }
    }

    setCurrentStep(null)
    setRunning(false)
    setAllDone(true)
    toast('Pipeline complete — all panels populated')
  }

  const availableSteps = steps.filter(s => !s.requiresEpisode || episodeId)
  const completedCount = Object.keys(results).length
  const successCount = Object.values(results).filter(r => r.ok).length

  return (
    <Card className="overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.03]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#f5c518]/15">
            <Wand2 size={12} className="text-[#f5c518]" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-200">Dynamic Pipeline</div>
            <div className="text-[10px] text-zinc-500">
              {running ? `Running: ${currentStep}…` : allDone ? `${successCount}/${completedCount} steps completed` : 'Select steps → AI fills everything'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {running && <LoaderCircle size={12} className="animate-spin text-[#f5c518]" />}
          {expanded ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-3 space-y-3">
          {/* Input */}
          <div>
            <div className="mb-1 text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">
              Input — topic, thought, or idea
            </div>
            <TextArea
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={episodeId ? "Optional context note — the episode already has data…" : "What should the AI process? (e.g. '3 mistakes killing your ML progress')"}
            />
          </div>

          {/* Step selector */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">Steps to process</span>
              <GhostButton onClick={selectAll} className="h-5 px-1.5 text-[9px]">Select All</GhostButton>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {availableSteps.map(step => {
                const isSelected = selectedSteps.has(step.id)
                const result = results[step.id]
                return (
                  <button key={step.id} onClick={() => toggleStep(step.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-2 text-left text-[10px] transition-all',
                      result?.ok ? 'border-emerald-500/30 bg-emerald-500/5' :
                      result && !result.ok ? 'border-rose-500/30 bg-rose-500/5' :
                      isSelected ? 'border-[#f5c518]/30 bg-[#f5c518]/5' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]',
                    )}>
                    <div className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-sm border transition-colors shrink-0',
                      isSelected ? 'border-[#f5c518] bg-[#f5c518]' : 'border-zinc-600 bg-transparent',
                    )}>
                      {result?.ok ? <Check size={10} className="text-emerald-400" /> :
                       result && !result.ok ? <span className="text-[8px] text-rose-400">✗</span> :
                       isSelected && <Check size={10} className="text-black" />}
                    </div>
                    <span className="text-[#f5c518]">{step.icon}</span>
                    <span className="font-medium text-zinc-300">{step.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Run button */}
          <AmberButton onClick={runPipeline} disabled={running || selectedSteps.size === 0} className="w-full">
            {running ? <LoaderCircle size={13} className="animate-spin" /> : <Wand2 size={13} />}
            {running ? `Processing: ${currentStep}…` : `Run Pipeline (${selectedSteps.size} steps)`}
          </AmberButton>

          {/* Results summary */}
          {allDone && (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase mb-2">Results</div>
              <div className="space-y-1">
                {Object.entries(results).map(([stepId, res]) => {
                  const step = steps.find(s => s.id === stepId)
                  return (
                    <div key={stepId} className="flex items-center gap-2 text-[10px]">
                      {res.ok ? <Check size={10} className="text-emerald-400" /> : <span className="text-rose-400">✗</span>}
                      <span className="text-zinc-400">{step?.label}</span>
                      {res.ok && <span className="text-emerald-400">✓</span>}
                      {res.error && <span className="text-rose-400 truncate">{res.error}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
