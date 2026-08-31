import { useState } from 'react'
import { Check, ExternalLink, ClipboardPaste, Zap, SkipForward, Edit3, ChevronDown, ChevronRight, Sparkles, FileText, FileSearch, BarChart3, GraduationCap, Layers, Brain, ShieldCheck, ArrowRight } from 'lucide-react'
import { AmberButton, Card, Chip, GhostButton, TextArea, toast } from './ui'
import { cn } from '@/lib/utils'

const api = () => (window as any).deskflowAPI?.contentEngine

interface PipelineStep {
  id: string
  label: string
  icon: React.ReactNode
  buildPrompt: () => Promise<{ ok: boolean; prompt?: string; error?: string }>
  importResponse: (rawJson: string) => Promise<{ ok: boolean; error?: string; data?: any }>
  accepts: 'json' | 'text'
  outputLabel: string
}

interface PipelineViewProps {
  episodeId?: number
  onStepComplete?: (stepId: string, data: any) => void
}

const STEPS: Omit<PipelineStep, 'buildPrompt' | 'importResponse'>[] = [
  { id: 'script', label: 'Script Generation', icon: <FileText size={14} />, accepts: 'json', outputLabel: 'frames' },
  { id: 'gates', label: 'Gate Validation', icon: <ShieldCheck size={14} />, accepts: 'json', outputLabel: 'gates' },
  { id: 'seo', label: 'SEO Injection', icon: <FileSearch size={14} />, accepts: 'json', outputLabel: 'SEO metadata' },
  { id: 'analytics', label: 'Analytics Insights', icon: <BarChart3 size={14} />, accepts: 'json', outputLabel: 'insights' },
  { id: 'lessons', label: 'Lesson Extraction', icon: <GraduationCap size={14} />, accepts: 'json', outputLabel: 'lessons' },
  { id: 'reflection', label: 'Reflection Analysis', icon: <Brain size={14} />, accepts: 'json', outputLabel: 'analysis' },
  { id: 'frameworks', label: 'Framework Update', icon: <Layers size={14} />, accepts: 'json', outputLabel: 'rule' },
]

type StepStatus = 'pending' | 'ai-sending' | 'ai-waiting' | 'ai-pasted' | 'ai-importing' | 'manual' | 'accepted' | 'skipped'

function PipelineStepCard({ step, status, setStatus, result, setResult, episodeId, onStepComplete }: {
  step: PipelineStep
  status: StepStatus
  setStatus: (s: StepStatus) => void
  result: any
  setResult: (r: any) => void
  episodeId?: number
  onStepComplete?: (stepId: string, data: any) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [paste, setPaste] = useState('')
  const [expanded, setExpanded] = useState(false)

  const sendToAI = async () => {
    setStatus('ai-sending')
    try {
      const res = await step.buildPrompt()
      if (res.ok && res.prompt) {
        setPrompt(res.prompt)
        setStatus('ai-waiting')
        await navigator.clipboard.writeText(res.prompt)
        window.open('https://chatgpt.com', '_blank')
        toast('Prompt copied — paste into your AI conversation')
      } else {
        toast(res.error || 'Failed to build prompt', 'error')
        setStatus('pending')
      }
    } catch (e: any) {
      toast(e.message || 'Failed', 'error')
      setStatus('pending')
    }
  }

  const copyPromptOnly = async () => {
    try {
      const res = await step.buildPrompt()
      if (res.ok && res.prompt) {
        setPrompt(res.prompt)
        setStatus('ai-waiting')
        await navigator.clipboard.writeText(res.prompt)
        toast('Prompt copied — paste into any AI, then paste response below')
      } else {
        toast(res.error || 'Failed to build prompt', 'error')
      }
    } catch (e: any) {
      toast(e.message || 'Failed', 'error')
    }
  }

  const importResponse = async () => {
    if (!paste.trim()) { toast('Paste the AI response first', 'error'); return }
    setStatus('ai-importing')
    try {
      const res = await step.importResponse(paste.trim())
      if (res.ok) {
        setResult(res.data || { imported: true })
        setStatus('accepted')
        setPaste('')
        setPrompt('')
        toast(`${step.outputLabel} imported`)
        onStepComplete?.(step.id, res.data)
      } else {
        toast(res.error || 'Import failed', 'error')
        setStatus('ai-pasted')
      }
    } catch (e: any) {
      toast(e.message || 'Import failed', 'error')
      setStatus('ai-pasted')
    }
  }

  const isDone = status === 'accepted' || status === 'skipped'
  const isAiActive = status === 'ai-waiting' || status === 'ai-pasted' || status === 'ai-importing'

  return (
    <div className={cn('rounded-xl border overflow-hidden transition-all',
      isDone ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02]')}>
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg',
          isDone ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.05] text-zinc-400')}>
          {isDone ? <Check size={14} /> : step.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-zinc-200">{step.label}</div>
          <div className="text-[10px] text-zinc-500">
            {status === 'pending' && 'Not started'}
            {status === 'ai-sending' && 'Building prompt…'}
            {status === 'ai-waiting' && 'Prompt copied — paste AI response below'}
            {status === 'ai-pasted' && 'Response ready — click Import'}
            {status === 'ai-importing' && 'Importing…'}
            {status === 'accepted' && `✓ ${step.outputLabel} imported`}
            {status === 'skipped' && 'Skipped'}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {status === 'accepted' && <Chip className="border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-[9px]">Done</Chip>}
          {status === 'skipped' && <Chip className="bg-zinc-500/10 text-zinc-400 text-[9px]">Skipped</Chip>}
          {expanded ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && !isDone && (
        <div className="border-t border-white/[0.06] px-4 py-3 space-y-3">
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <AmberButton onClick={sendToAI} disabled={status === 'ai-sending' || status === 'ai-importing'} className="h-7 text-[11px]">
              {status === 'ai-sending' ? <Zap size={12} className="animate-pulse" /> : <ExternalLink size={12} />}
              {status === 'ai-sending' ? 'Building…' : 'Send to External AI'}
            </AmberButton>
            <GhostButton onClick={copyPromptOnly} disabled={status === 'ai-sending'} className="h-7 text-[11px]">
              <ClipboardPaste size={12} /> Copy Prompt
            </GhostButton>
            <GhostButton onClick={() => { setStatus('manual'); setExpanded(false) }} className="h-7 text-[11px]">
              <Edit3 size={12} /> Manual
            </GhostButton>
            <GhostButton onClick={() => { setStatus('skipped'); setExpanded(false) }} className="h-7 text-[11px]">
              <SkipForward size={12} /> Skip
            </GhostButton>
          </div>

          {/* AI prompt preview */}
          {prompt && (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
              <div className="mb-1 text-[9px] tracking-wider text-zinc-500 uppercase">Prompt (copied to clipboard)</div>
              <pre className="max-h-24 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed text-zinc-400">{prompt}</pre>
            </div>
          )}

          {/* Paste area */}
          {isAiActive && (
            <>
              <TextArea rows={3} value={paste} onChange={(e) => setPaste(e.target.value)}
                placeholder="Paste the JSON output from your AI here…" />
              <AmberButton onClick={importResponse} disabled={!paste.trim() || status === 'ai-importing'} className="h-7 text-[11px]">
                <ClipboardPaste size={12} />
                {status === 'ai-importing' ? 'Importing…' : 'Import Response'}
              </AmberButton>
            </>
          )}
        </div>
      )}

      {/* Result preview when accepted */}
      {expanded && isDone && result && (
        <div className="border-t border-white/[0.06] px-4 py-3">
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-[10px] text-zinc-400">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export function PipelineView({ episodeId, onStepComplete }: PipelineViewProps) {
  const [stepStates, setStepStates] = useState<Record<string, StepStatus>>({})
  const [stepResults, setStepResults] = useState<Record<string, any>>({})

  const buildStep = (stepDef: Omit<PipelineStep, 'buildPrompt' | 'importResponse'>): PipelineStep => {
    const apiFn = api()
    switch (stepDef.id) {
      case 'script':
        return { ...stepDef, buildPrompt: () => apiFn.externalBuildScriptPrompt({ episodeId }), importResponse: (r) => apiFn.externalImportScript({ episodeId, rawJson: r }) }
      case 'gates':
        return { ...stepDef, buildPrompt: () => apiFn.externalBuildGatesPrompt({ episodeId }), importResponse: (r) => apiFn.externalImportGates({ episodeId, rawJson: r }) }
      case 'seo':
        return { ...stepDef, buildPrompt: () => apiFn.externalBuildSeoPrompt({ episodeId }), importResponse: (r) => apiFn.externalImportSeo({ episodeId, rawJson: r }) }
      case 'analytics':
        return { ...stepDef, buildPrompt: () => apiFn.externalBuildAnalyticsPrompt({ episodeId }), importResponse: (r) => apiFn.externalImportAnalytics({ episodeId, rawJson: r }) }
      case 'lessons':
        return { ...stepDef, buildPrompt: () => apiFn.externalBuildLessonsPrompt({ episodeId }), importResponse: (r) => apiFn.externalImportLessons({ episodeId, rawJson: r }) }
      case 'reflection':
        return { ...stepDef, buildPrompt: () => apiFn.externalBuildReflectionPrompt({ episodeId }), importResponse: (r) => apiFn.externalImportReflection({ episodeId, rawJson: r }) }
      case 'frameworks':
        return { ...stepDef, buildPrompt: () => apiFn.externalBuildFrameworksPrompt({}), importResponse: (r) => apiFn.externalImportFrameworks({ rawJson: r }) }
      default:
        return { ...stepDef, buildPrompt: async () => ({ ok: false, error: 'Unknown step' }), importResponse: async () => ({ ok: false, error: 'Unknown step' }) }
    }
  }

  const steps = STEPS.map(buildStep)
  const completedCount = Object.values(stepStates).filter(s => s === 'accepted' || s === 'skipped').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-zinc-200">Pipeline Steps</div>
          <div className="text-[10px] text-zinc-500">{completedCount}/{steps.length} completed — choose External AI, Manual, or Skip for each</div>
        </div>
        <div className="flex items-center gap-1.5">
          {steps.map((s, i) => {
            const st = stepStates[s.id]
            return (
              <div key={s.id} className={cn('h-1.5 w-6 rounded-full transition-colors',
                st === 'accepted' ? 'bg-emerald-400' : st === 'skipped' ? 'bg-zinc-600' : 'bg-white/[0.08]')} />
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        {steps.map(step => (
          <PipelineStepCard
            key={step.id}
            step={step}
            status={stepStates[step.id] || 'pending'}
            setStatus={(s) => setStepStates(prev => ({ ...prev, [step.id]: s }))}
            result={stepResults[step.id]}
            setResult={(r) => setStepResults(prev => ({ ...prev, [step.id]: r }))}
            episodeId={episodeId}
            onStepComplete={onStepComplete}
          />
        ))}
      </div>
    </div>
  )
}
