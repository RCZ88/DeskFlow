import { useState, useEffect } from 'react'
import { Wand2, Copy, Check, ExternalLink, ChevronDown, ChevronRight, Sparkles, Zap } from 'lucide-react'
import { AmberButton, Card, GhostButton, TextArea, toast } from './ui'
import { cn } from '@/lib/utils'
import { PromptSectionToggle, getSectionsForPromptType, type PromptSection } from './PromptSectionToggle'
import DynamicPromptPreview from '@/components/DynamicPromptPreview'

const api = () => (window as any).deskflowAPI?.contentEngine

interface PromptBuilderProps {
  episodeId?: number
  thought?: string
  templateIds?: string[]
  frameMode?: 'strict' | 'flexible'
  promptType: 'classify' | 'synthesize' | 'script' | 'gates' | 'seo' | 'analytics' | 'lessons' | 'reflection' | 'frameworks'
  onImport?: (rawJson: string) => void
  className?: string
}

const PROMPT_LABELS: Record<string, { label: string; description: string }> = {
  classify: { label: 'Classify Thought', description: 'Route a raw thought to the right destination' },
  synthesize: { label: 'Synthesize Ideas', description: 'Generate 3 content ideas from context' },
  script: { label: 'Generate Script', description: 'Write frames with retention evidence' },
  gates: { label: 'Validate Gates', description: 'Check scroll-stop, hard-cut, asset-ready' },
  seo: { label: 'Inject SEO', description: 'Generate hidden keyword phrases' },
  analytics: { label: 'Analytics Insights', description: 'Analyze performance data' },
  lessons: { label: 'Extract Lessons', description: 'Pull durable rules from performance' },
  reflection: { label: 'Reflection Analysis', description: 'Analyze creator intuition vs data' },
  frameworks: { label: 'Framework Update', description: 'Extract new framework rules' },
}

export function PromptBuilder({ episodeId, thought, templateIds = [], frameMode = 'strict', promptType, onImport, className }: PromptBuilderProps) {
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [paste, setPaste] = useState('')
  const [importing, setImporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastImport, setLastImport] = useState<'success' | 'error' | null>(null)

  const sections = getSectionsForPromptType(promptType)
  const [enabledSections, setEnabledSections] = useState<Set<string>>(
    () => new Set(sections.filter(s => s.defaultEnabled).map(s => s.id))
  )

  const config = PROMPT_LABELS[promptType]

  const buildPrompt = async () => {
    setGenerating(true)
    setError(null)
    try {
      let res: any
      switch (promptType) {
        case 'classify': res = await api()?.externalBuildClassifyPrompt({ templateIds, frameMode }); break
        case 'synthesize': res = await api()?.externalBuildSynthesizePrompt({ count: 3, templateIds, frameMode }); break
        case 'script': res = await api()?.externalBuildScriptPrompt({ episodeId, templateIds, frameMode, sections: Array.from(enabledSections) }); break
        case 'gates': res = await api()?.externalBuildGatesPrompt({ episodeId }); break
        case 'seo': res = await api()?.externalBuildSeoPrompt({ episodeId }); break
        case 'analytics': res = await api()?.externalBuildAnalyticsPrompt({ episodeId }); break
        case 'lessons': res = await api()?.externalBuildLessonsPrompt({ episodeId }); break
        case 'reflection': res = await api()?.externalBuildReflectionPrompt({ episodeId }); break
        case 'frameworks': res = await api()?.externalBuildFrameworksPrompt({}); break
      }
      if (res?.ok && res.prompt) {
        setPrompt(res.prompt)
      } else {
        setError(res?.error || 'Failed to build prompt')
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to build prompt')
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    if (!prompt) return
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast('Prompt copied — paste into any AI')
  }

  const sendToAI = async () => {
    if (!prompt) return
    // Try extension injection first — sends prompt directly to active AI chat
    try {
      const extApi = (window as any).deskflowAPI?.extensionQueueCommand
      if (extApi) {
        const res = await extApi({
          type: 'CONTENT_ENGINE_INJECT',
          promptType,
          text: prompt,
          episodeId
        })
        if (res?.ok) {
          toast('Prompt sent to AI chat')
          return
        }
      }
    } catch {}
    // Fallback: clipboard + open new tab
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    window.open('https://chatgpt.com', '_blank')
    toast('Prompt copied — paste into ChatGPT/Claude')
  }

  const importResponse = async () => {
    if (!paste.trim()) { toast('Paste the AI response first', 'error'); return }
    setImporting(true)
    setLastImport(null)
    try {
      let res: any
      switch (promptType) {
        case 'classify': res = await api()?.externalImportClassify({ rawJson: paste.trim() }); break
        case 'synthesize': res = await api()?.externalImportSynthesize({ rawJson: paste.trim() }); break
        case 'script': res = await api()?.externalImportScript({ episodeId, rawJson: paste.trim() }); break
        case 'gates': res = await api()?.externalImportGates({ episodeId, rawJson: paste.trim() }); break
        case 'seo': res = await api()?.externalImportSeo({ episodeId, rawJson: paste.trim() }); break
        case 'analytics': res = await api()?.externalImportAnalytics({ episodeId, rawJson: paste.trim() }); break
        case 'lessons': res = await api()?.externalImportLessons({ episodeId, rawJson: paste.trim() }); break
        case 'reflection': res = await api()?.externalImportReflection({ episodeId, rawJson: paste.trim() }); break
        case 'frameworks': res = await api()?.externalImportFrameworks({ rawJson: paste.trim() }); break
      }
      if (res?.ok) {
        setLastImport('success')
        setPaste('')
        toast('Response imported successfully')
        onImport?.(paste.trim())
      } else {
        setLastImport('error')
        setError(res?.error || 'Import failed')
      }
    } catch (e: any) {
      setLastImport('error')
      setError(e?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#f5c518]/15">
            <Wand2 size={12} className="text-[#f5c518]" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-200">{config.label}</div>
            <div className="text-[10px] text-zinc-500">{config.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!prompt && !generating && (
            <AmberButton onClick={buildPrompt} className="h-6 px-2 text-[10px]">
              <Zap size={10} /> Build Prompt
            </AmberButton>
          )}
          {prompt && (
            <>
              <GhostButton onClick={copyToClipboard} className="h-6 px-1.5 text-[10px]">
                {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                {copied ? 'Copied' : 'Copy'}
              </GhostButton>
              <GhostButton onClick={sendToAI} className="h-6 px-1.5 text-[10px]">
                <ExternalLink size={10} /> Send
              </GhostButton>
            </>
          )}
          {expanded ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-3 space-y-3">
          {/* Prompt editor */}
          {generating && (
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#f5c518] border-t-transparent" />
              <span className="text-[11px] text-zinc-400">Building prompt…</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-[11px] text-rose-400">
              {error}
            </div>
          )}

          {/* Section toggles */}
          {sections.length > 0 && (
            <PromptSectionToggle
              sections={sections}
              enabled={enabledSections}
              onChange={setEnabledSections}
            />
          )}

          {prompt && !generating && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">
                  Prompt — edit before copying
                </span>
                <span className="text-[9px] text-zinc-600">{prompt.length} chars</span>
              </div>
              <TextArea
                rows={10}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="font-mono text-[11px] leading-relaxed"
              />
              <p className="mt-1 text-[9px] text-zinc-600">
                Edit the prompt above to add custom instructions, remove elements, or change the format. Then copy or send.
              </p>
              <DynamicPromptPreview
                prompt={prompt}
                title={`${config.label} (live)`}
                dynamicSections={[
                  { id: 'based', label: 'leverages conversation', detect: 'contains', match: 'Based on our conversation', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
                  { id: 'schema', label: 'JSON schema', detect: 'contains', match: 'Return ONLY this JSON', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
                  { id: 'style', label: 'style directive', detect: 'contains', match: 'TONE:', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
                  { id: 'series', label: 'series rules', detect: 'contains', match: 'SERIES RULES', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
                  ...Array.from(enabledSections).map((sid, i) => ({
                    id: sid, label: `section: ${sid}`, detect: 'contains' as const, match: sid,
                    color: ['bg-pink-500/20 text-pink-300 border-pink-500/30','bg-blue-500/20 text-blue-300 border-blue-500/30','bg-orange-500/20 text-orange-300 border-orange-500/30'][i % 3],
                  })),
                ]}
              />
            </div>
          )}

          {/* Paste area */}
          {prompt && !generating && (
            <div>
              <div className="mb-1 text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">
                Paste AI Response
              </div>
              <TextArea
                rows={6}
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder="Paste the JSON output from ChatGPT/Claude here…"
              />
              <div className="mt-2 flex items-center gap-2">
                <AmberButton onClick={importResponse} disabled={!paste.trim() || importing} className="h-7 text-[11px]">
                  {importing ? <Zap size={12} className="animate-pulse" /> : <Sparkles size={12} />}
                  {importing ? 'Importing…' : 'Import Response'}
                </AmberButton>
                {lastImport === 'success' && (
                  <span className="text-[10px] text-emerald-400">✓ Imported</span>
                )}
              </div>
            </div>
          )}

          {/* Quick build if no prompt yet */}
          {!prompt && !generating && (
            <div className="rounded-lg border border-dashed border-white/[0.08] p-4 text-center">
              <div className="text-[11px] text-zinc-500">
                Click &ldquo;Build Prompt&rdquo; to generate the format instruction for this step.
              </div>
              <AmberButton onClick={buildPrompt} className="mt-3 h-7 text-[11px]">
                <Zap size={12} /> Build Prompt
              </AmberButton>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
