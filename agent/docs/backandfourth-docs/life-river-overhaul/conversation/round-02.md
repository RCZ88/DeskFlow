# Round 02 — Project Owner provides 3 requested files

## Specialist asked for:
1. phase-form-dialog.tsx — full source for voice input integration and draft status system
2. VoiceInputWrapper.tsx — exact wrapper implementation (ALREADY PROVIDED IN ROUND 01)
3. PhaseCard.tsx — full source for lens-driven rendering design

## We provided:

---

### CONTEXT: src/components/life-river/phase-form-dialog.tsx (1001 lines, full)

```tsx
"use client"
import * as React from 'react'
import { useEffect, useMemo, useReducer, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack, SliderValue } from '@/components/ui/slider'
import { MAGNITUDE_LABELS, MONTHS, PHASE_CATEGORIES, PHASE_MOOD_TAGS, getContrastColor, lighten, sortPhases, uid, type LifePhase, type LifePhaseMilestone, type LifePhasePerson, type PhaseMoodTag } from '@/lib/riverMath'
import { cn } from '@/lib/utils'
import { LoaderCircle, Sparkles, X } from 'lucide-react'

const api = () => window.deskflowAPI

/* ── Draft state (useReducer) ─────────────────────────────── */
interface Draft extends Omit<LifePhase, 'id' | 'reflection' | 'eraTrends'> {
  reflection: string
  eraTrends: string
}

type Action =
  | { type: 'set'; patch: Partial<Draft> }
  | { type: 'addMilestone' }
  | { type: 'updateMilestone'; index: number; patch: Partial<LifePhaseMilestone> }
  | { type: 'removeMilestone'; index: number }
  | { type: 'addPerson' }
  | { type: 'updatePerson'; index: number; patch: Partial<LifePhasePerson> }
  | { type: 'removePerson'; index: number }
  | { type: 'toggleMoodTag'; tag: PhaseMoodTag }
  | { type: 'toggleConnection'; targetPhaseId: string }
  | { type: 'setConnectionNote'; targetPhaseId: string; note: string }
  | { type: 'reset'; draft: Draft }

function freshDraft(initial: LifePhase | null, now: Date): Draft {
  return {
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? 'growth',
    startMonth: initial?.startMonth ?? now.getMonth() + 1,
    startYear: initial?.startYear ?? now.getFullYear(),
    endMonth: initial?.endMonth ?? null,
    endYear: initial?.endYear ?? null,
    magnitude: initial?.magnitude ?? 50,
    color: initial?.color ?? null,
    reflection: initial?.reflection ?? '',
    eraTrends: initial?.eraTrends ?? '',
    impactNotes: initial?.impactNotes ?? '',
    milestones: initial?.milestones ?? [],
    connections: initial?.connections ?? [],
    people: initial?.people ?? [],
    moodStart: initial?.moodStart ?? null,
    moodEnd: initial?.moodEnd ?? null,
    moodTags: initial?.moodTags ?? [],
    feelingsNote: initial?.feelingsNote ?? null,
    lessonsLearned: initial?.lessonsLearned ?? null,
    headerImageMemoryId: initial?.headerImageMemoryId ?? null,
    colorSource: initial?.colorSource ?? 'category',
    reflectionSource: initial?.reflectionSource ?? null,
    reflectionGeneratedAt: initial?.reflectionGeneratedAt ?? null,
  }
}

function draftReducer(state: Draft, action: Action): Draft {
  switch (action.type) {
    case 'set': return { ...state, ...action.patch }
    case 'addMilestone': return { ...state, milestones: [...state.milestones, { id: uid('ms'), date: '', label: '', note: null, photoMemoryId: null }] }
    case 'updateMilestone': return { ...state, milestones: state.milestones.map((m, i) => (i === action.index ? { ...m, ...action.patch } : m)) }
    case 'removeMilestone': return { ...state, milestones: state.milestones.filter((_, i) => i !== action.index) }
    case 'addPerson': return { ...state, people: [...(state.people ?? []), { id: uid('person'), name: '', role: '' }] }
    case 'updatePerson': return { ...state, people: (state.people ?? []).map((p, i) => (i === action.index ? { ...p, ...action.patch } : p)) }
    case 'removePerson': return { ...state, people: (state.people ?? []).filter((_, i) => i !== action.index) }
    case 'toggleMoodTag': return { ...state, moodTags: state.moodTags?.includes(action.tag) ? state.moodTags.filter(t => t !== action.tag) : [...(state.moodTags ?? []), action.tag].slice(0, 5) }
    case 'toggleConnection': {
      const exists = state.connections.some(c => c.targetPhaseId === action.targetPhaseId)
      return { ...state, connections: exists ? state.connections.filter(c => c.targetPhaseId !== action.targetPhaseId) : [...state.connections, { targetPhaseId: action.targetPhaseId, note: null }] }
    }
    case 'setConnectionNote': {
      const note = action.note.trim() ? action.note : null
      return { ...state, connections: state.connections.map(c => c.targetPhaseId === action.targetPhaseId ? { ...c, note } : c) }
    }
    case 'reset': return action.draft
    default: return state
  }
}

/* ── Steps ────────────────────────────────────────────────── */
const STEPS = [
  { id: 'basics', label: 'The Chapter' },
  { id: 'story', label: 'The Story' },
  { id: 'moments', label: 'Key Moments' },
  { id: 'people', label: 'The People' },
  { id: 'feelings', label: 'Feelings & Mood' },
  { id: 'lessons', label: 'Lessons & Impact' },
  { id: 'color', label: 'Color & Preview' },
  { id: 'connections', label: 'Connections' },
  { id: 'review', label: 'Review & Reflect' },
] as const

type StepId = (typeof STEPS)[number]['id']

interface PhaseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: LifePhase | null
  allPhases?: LifePhase[]
  onSave: (phase: LifePhase) => void
}

export function PhaseFormDialog({ open, onOpenChange, initial, allPhases = [], onSave }: PhaseFormDialogProps) {
  const [step, setStep] = useState<StepId>('basics')
  const [draft, dispatch] = useReducer(draftReducer, null, () => freshDraft(initial ?? null, new Date()))
  const [assistQuestions, setAssistQuestions] = useState<string[] | null>(null)
  const [assistLoading, setAssistLoading] = useState(false)
  const [reflectionLoading, setReflectionLoading] = useState(false)

  const otherPhases = useMemo(() => sortPhases(allPhases.filter(p => p.id !== initial?.id)), [allPhases, initial?.id])
  const stepIndex = STEPS.findIndex(s => s.id === step)
  const isLast = stepIndex === STEPS.length - 1

  useEffect(() => {
    if (!open) return
    dispatch({ type: 'reset', draft: freshDraft(initial ?? null, new Date()) })
    setStep('basics')
    setAssistQuestions(null)
  }, [open, initial])

  const yearNum = (s: string) => { const n = parseInt(s, 10); return Number.isFinite(n) ? n : 0 }
  const [syStr, setSyStr] = useState('')
  const [eyStr, setEyStr] = useState('')

  const color = draft.color || PHASE_CATEGORIES.find(c => c.id === draft.category)?.color || '#fbbf24'

  const stepValid = useMemo(() => {
    switch (step) {
      case 'basics': {
        const sy = draft.startYear; const ey = draft.endYear
        if (!draft.title.trim() || sy < 1900 || sy > 2100) return false
        if (ey != null && ey > 0 && (ey < sy || ey > 2200)) return false
        return true
      }
      case 'moments': return draft.milestones.every(m => !(m.label.trim() && !m.date.trim()))
      default: return true
    }
  }, [step, draft])

  const canGoNext = stepValid
  const canGoBack = stepIndex > 0

  const next = () => {
    if (!canGoNext) return
    if (isLast) { saveNow(); return }
    setStep(STEPS[stepIndex + 1].id)
  }
  const back = () => { if (stepIndex > 0) setStep(STEPS[stepIndex - 1].id) }

  const runAssist = async () => {
    setAssistLoading(true); setAssistQuestions(null)
    try {
      const res = await api().lifePhaseAiAssist({ kind: 'lessons', context: { story: draft.description, feelingsNote: draft.feelingsNote ?? undefined, milestones: draft.milestones, people: draft.people, lessonsLearned: draft.lessonsLearned ?? undefined } })
      setAssistQuestions(res.ok ? (res.data?.questions ?? []) : null)
    } catch { setAssistQuestions(null) } finally { setAssistLoading(false) }
  }

  const generateReflection = async () => {
    setReflectionLoading(true)
    try {
      const res = await api().lifePhaseAiReflect({
        phaseId: initial?.id ?? 'draft', title: draft.title, category: draft.category, story: draft.description,
        milestones: draft.milestones, people: draft.people, moodStart: draft.moodStart, moodEnd: draft.moodEnd,
        moodTags: draft.moodTags ?? [], feelingsNote: draft.feelingsNote, lessonsLearned: draft.lessonsLearned, impactNotes: draft.impactNotes,
      })
      if (res.ok && res.data?.reflection) {
        dispatch({ type: 'set', patch: { reflection: res.data.reflection, reflectionSource: 'ai', reflectionGeneratedAt: new Date().toISOString() } })
      }
    } catch { /* keep existing reflection */ } finally { setReflectionLoading(false) }
  }

  // KEY: saveNow builds a full LifePhase and calls onSave — same as "Save as draft" button
  const saveNow = () => {
    const phase: LifePhase = {
      id: initial?.id ?? uid('phase'),
      title: draft.title.trim(), description: draft.description.trim(), category: draft.category,
      startMonth: draft.startMonth, startYear: draft.startYear, endMonth: draft.endMonth, endYear: draft.endYear,
      magnitude: draft.magnitude, color: draft.color, reflection: draft.reflection,
      eraTrends: draft.eraTrends || initial?.eraTrends || '', impactNotes: draft.impactNotes,
      milestones: draft.milestones, connections: draft.connections, people: draft.people,
      moodStart: draft.moodStart, moodEnd: draft.moodEnd, moodTags: draft.moodTags,
      feelingsNote: draft.feelingsNote, lessonsLearned: draft.lessonsLearned,
      headerImageMemoryId: draft.headerImageMemoryId, colorSource: draft.colorSource,
      reflectionSource: draft.reflectionSource, reflectionGeneratedAt: draft.reflectionGeneratedAt,
      updatedAt: new Date().toISOString(),
    }
    onSave(phase)
  }

  /* ── Per-step renderers ─────────────────────────────────── */

  const renderBasics = () => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fp-title">Title</Label>
        <Input id="fp-title" value={draft.title} onChange={e => dispatch({ type: 'set', patch: { title: e.target.value } })}
          placeholder="e.g. University, First startup, Parenthood" autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <div className="flex flex-wrap gap-1.5">
          {PHASE_CATEGORIES.map(c => (
            <button key={c.id} onClick={() => dispatch({ type: 'set', patch: { category: c.id } })}
              className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11.5px] transition-all',
                draft.category === c.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300')}
              style={draft.category === c.id ? { backgroundColor: `${c.color}26`, borderColor: `${c.color}66` } : { borderColor: 'rgba(63,63,70,0.6)' }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />{c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Starts</Label>
          <div className="flex gap-1.5">
            <select value={draft.startMonth} onChange={e => dispatch({ type: 'set', patch: { startMonth: Number(e.target.value) } })}
              className="h-8 rounded-lg border border-border bg-background px-1.5 text-sm text-foreground outline-none">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <Input value={syStr || String(draft.startYear)} onChange={e => { setSyStr(e.target.value.replace(/[^\d]/g, '')); const n = parseInt(e.target.value.replace(/[^\d]/g, ''), 10); if (Number.isFinite(n)) dispatch({ type: 'set', patch: { startYear: n } }) }}
              onBlur={() => setSyStr('')} inputMode="numeric" maxLength={4} className="w-20" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Ends</Label>
          <div className="flex gap-1.5">
            <select value={draft.endMonth ?? 12} onChange={e => dispatch({ type: 'set', patch: { endMonth: Number(e.target.value) } })}
              disabled={!draft.endYear} className="h-8 rounded-lg border border-border bg-background px-1.5 text-sm text-foreground outline-none disabled:opacity-40">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <Input value={eyStr || (draft.endYear ? String(draft.endYear) : '')} onChange={e => { setEyStr(e.target.value.replace(/[^\d]/g, '')); const n = parseInt(e.target.value.replace(/[^\d]/g, ''), 10); dispatch({ type: 'set', patch: { endYear: Number.isFinite(n) ? n : null } }) }}
              onBlur={() => setEyStr('')} inputMode="numeric" maxLength={4} className="w-20" placeholder="Ongoing" />
          </div>
          <p className="text-[10.5px] text-zinc-600">Leave empty if this chapter is still open.</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Magnitude — how much did this chapter reshape you?</Label>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 pt-3 pb-2">
          <Slider value={draft.magnitude} onValueChange={v => dispatch({ type: 'set', patch: { magnitude: v } })} min={0} max={100} step={1} className="grow">
            <SliderControl><SliderTrack><SliderIndicator className="transition-colors" style={{ width: `${draft.magnitude}%`, backgroundColor: color }} /></SliderTrack><SliderThumb /></SliderControl>
            <SliderValue />
          </Slider>
        </div>
        <p className="font-display text-[15px] text-amber-200/90">
          {(() => { const m10 = Math.max(1, Math.min(10, Math.round(draft.magnitude / 10))); const bucket = Math.ceil(m10 / 2); return MAGNITUDE_LABELS[`${bucket * 2 - 1}-${bucket * 2}`] ?? 'Quiet' })()}
        </p>
      </div>
    </div>
  )

  const renderStory = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="fp-story">The story</Label>
        <Textarea id="fp-story" value={draft.description} onChange={e => dispatch({ type: 'set', patch: { description: e.target.value } })}
          placeholder="What was this time actually like? Where were you, who was around, what filled the days…" rows={6} autoFocus />
        <p className="text-[10.5px] text-zinc-600">Write it like you'd tell a friend who has an hour.</p>
      </div>
    </div>
  )

  const renderMoments = () => (
    <div className="space-y-3">
      <p className="text-[12px] text-zinc-500">A few dates that held the turning points.</p>
      {draft.milestones.length === 0 && <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-center text-[11.5px] italic text-zinc-600">Not every chapter has a clean list of dates. Skip this if it doesn't fit.</p>}
      {draft.milestones.map((m, i) => (
        <div key={m.id} className="flex items-start gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-2.5">
          <div className="flex-1 space-y-1.5">
            <Input value={m.label} onChange={e => dispatch({ type: 'updateMilestone', index: i, patch: { label: e.target.value } })} placeholder="What happened?" className="text-[13px]" />
            <div className="flex items-center gap-2">
              <Input value={m.date} onChange={e => dispatch({ type: 'updateMilestone', index: i, patch: { date: e.target.value } })} placeholder="YYYY-MM or YYYY" className="w-32 font-mono text-[12px]" />
              <Input value={m.note ?? ''} onChange={e => dispatch({ type: 'updateMilestone', index: i, patch: { note: e.target.value } })} placeholder="Note (optional)" className="flex-1 text-[12px]" />
            </div>
          </div>
          <button onClick={() => dispatch({ type: 'removeMilestone', index: i })} className="mt-1 rounded-md p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300"><X size={13} /></button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'addMilestone' })}>+ Add a key moment</Button>
    </div>
  )

  const renderPeople = () => (
    <div className="space-y-3">
      {draft.people && draft.people.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {draft.people.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 rounded-full bg-zinc-800/60 border border-zinc-700/50 px-2 py-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-semibold text-zinc-300">{p.name.charAt(0).toUpperCase() || '?'}</span>
              <span className="text-[11.5px] text-zinc-300">{p.name}</span>
              <span className="text-[10px] text-zinc-500">{p.role}</span>
              <button onClick={() => dispatch({ type: 'removePerson', index: draft.people!.indexOf(p) })} className="ml-0.5 text-zinc-600 hover:text-zinc-300"><X size={11} /></button>
            </div>
          ))}
        </div>
      )}
      {(draft.people ?? []).slice(0, 8).length < 8 && (
        <AddPersonForm onAdd={(name, role) => { if (!name.trim()) return; dispatch({ type: 'addPerson' }); const idx = (draft.people ?? []).length; dispatch({ type: 'updatePerson', index: idx, patch: { name: name.trim(), role: role.trim() } }) }} />
      )}
      {draft.people && draft.people.length >= 8 && <p className="text-[11px] text-zinc-600">Max 8 people per chapter.</p>}
      <p className="text-[10.5px] text-zinc-600">People can repeat across chapters — that's the point.</p>
    </div>
  )

  const renderFeelings = () => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>How it felt at the start → how it felt at the end</Label>
        <MoodPair start={draft.moodStart} end={draft.moodEnd} onChange={(start, end) => dispatch({ type: 'set', patch: { moodStart: start, moodEnd: end } })} />
      </div>
      <div className="space-y-1.5">
        <Label>Mood tags (max 5)</Label>
        <div className="flex flex-wrap gap-1.5">
          {PHASE_MOOD_TAGS.map(tag => {
            const on = draft.moodTags?.includes(tag)
            return <button key={tag} onClick={() => dispatch({ type: 'toggleMoodTag', tag })}
              className={cn('rounded-full border px-2.5 py-1 text-[11px] transition-all', on ? 'border-amber-400/50 bg-amber-400/10 text-amber-200' : 'border-zinc-700/50 text-zinc-500 hover:text-zinc-300')}>{tag}</button>
          })}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fp-feelings">Day to day…</Label>
        <Textarea id="fp-feelings" value={draft.feelingsNote ?? ''} onChange={e => dispatch({ type: 'set', patch: { feelingsNote: e.target.value } })}
          placeholder="How did this chapter actually feel, day to day?" rows={3} />
      </div>
    </div>
  )

  const renderLessons = () => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="fp-lessons">What did it teach you?</Label>
          <button onClick={runAssist} disabled={assistLoading}
            className="flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10.5px] text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50">
            {assistLoading ? <LoaderCircle size={11} className="animate-spin" /> : <Sparkles size={11} />}Help me find the words
          </button>
        </div>
        <Textarea id="fp-lessons" value={draft.lessonsLearned ?? ''} onChange={e => dispatch({ type: 'set', patch: { lessonsLearned: e.target.value } })}
          placeholder="A line or two that the younger you needed to hear…" rows={3} />
        {assistQuestions && assistQuestions.length > 0 && (
          <div className="mt-1 space-y-1 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-amber-400/70">Try answering these:</p>
            {assistQuestions.map((q, i) => <p key={i} className="text-[12px] italic text-amber-100/80">"{q}"</p>)}
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fp-impact">How are you different now than before?</Label>
        <Textarea id="fp-impact" value={draft.impactNotes} onChange={e => dispatch({ type: 'set', patch: { impactNotes: e.target.value } })}
          placeholder="What did this chapter change about you?" rows={3} />
      </div>
    </div>
  )

  const renderColor = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['category', 'custom'] as const).map(mode => (
          <button key={mode} onClick={() => dispatch({ type: 'set', patch: { colorSource: mode } })}
            className={cn('flex-1 rounded-lg border px-3 py-2 text-[12px] transition-colors',
              (draft.colorSource ?? 'category') === mode ? 'border-amber-400/40 bg-amber-400/10 text-amber-200' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300')}>
            {mode === 'category' ? 'Use category color' : 'Custom color'}
          </button>
        ))}
      </div>
      {draft.colorSource === 'custom' && (
        <div className="grid grid-cols-6 gap-2">
          {CUSTOM_SWATCHES.map(hex => (
            <button key={hex} onClick={() => dispatch({ type: 'set', patch: { color: hex } })}
              className={cn('aspect-square rounded-lg transition-transform hover:scale-105', draft.color === hex && 'ring-2 ring-white/60')}
              style={{ backgroundColor: hex }} />
          ))}
        </div>
      )}
      <div><Label>Live preview</Label><div className="mt-1.5 origin-top-left scale-[0.62]"><PhaseCardPreview draft={draft} color={color} /></div></div>
    </div>
  )

  const renderConnections = () => (
    <div className="space-y-3">
      {otherPhases.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-5 text-center text-[12px] text-zinc-600">This is your first chapter — nothing to connect to yet.</p>
      ) : (
        <>
          <p className="text-[12px] text-zinc-500">Which chapters did this one flow into?</p>
          <div className="max-h-56 space-y-1 overflow-auto ws-scroll pr-1">
            {otherPhases.map(op => {
              const conn = draft.connections.find(c => c.targetPhaseId === op.id)
              const opColor = op.color || PHASE_CATEGORIES.find(c => c.id === op.category)?.color || '#a1a1aa'
              return (
                <div key={op.id} className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-2">
                  <button onClick={() => dispatch({ type: 'toggleConnection', targetPhaseId: op.id })} className="flex w-full items-center gap-2.5 text-left">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: opColor }} />
                    <span className="flex-1 truncate text-[12.5px] text-zinc-300">{op.title}</span>
                    <span className="text-[10px] text-zinc-600">{op.startYear}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] transition-colors', conn ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50')}>{conn ? 'Connected' : 'Connect'}</span>
                  </button>
                  {conn && <Input value={conn.note ?? ''} onChange={e => dispatch({ type: 'setConnectionNote', targetPhaseId: op.id, note: e.target.value })} placeholder="How does this connect? (optional)" className="mt-1.5 ml-6 h-7 text-[11px]" />}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )

  const renderReview = () => (
    <div className="space-y-4">
      <div><Label>Final preview</Label><div className="mt-1.5 max-h-72 overflow-auto ws-scroll rounded-lg border border-zinc-800/60"><PhaseCardPreview draft={draft} color={color} full /></div></div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="fp-reflection">Reflection</Label>
          <button onClick={generateReflection} disabled={reflectionLoading}
            className="flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10.5px] text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50">
            {reflectionLoading ? <LoaderCircle size={11} className="animate-spin" /> : <Sparkles size={11} />}Generate reflection
          </button>
        </div>
        <Textarea id="fp-reflection" value={draft.reflection} onChange={e => dispatch({ type: 'set', patch: { reflection: e.target.value, reflectionSource: draft.reflectionSource === 'ai' ? 'ai-edited' : 'manual' } })}
          placeholder="A reflection will appear here — or write your own." rows={4} />
        <p className="text-[10.5px] text-zinc-600">AI frames with what you wrote. Accept it, edit it, or discard it.</p>
      </div>
    </div>
  )

  const renderStep = () => {
    switch (step) {
      case 'basics': return renderBasics(); case 'story': return renderStory(); case 'moments': return renderMoments()
      case 'people': return renderPeople(); case 'feelings': return renderFeelings(); case 'lessons': return renderLessons()
      case 'color': return renderColor(); case 'connections': return renderConnections(); case 'review': return renderReview()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-lifephase="phase-form-dialog" className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-[15px] text-zinc-100">{initial ? 'Edit this chapter' : 'Add a chapter'}</DialogTitle>
          <DialogDescription>{STEPS[stepIndex].label} · step {stepIndex + 1} of {STEPS.length}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1">
          {STEPS.map((s, i) => <button key={s.id} onClick={() => i <= stepIndex && setStep(s.id)} title={s.label}
            className={cn('h-1 flex-1 rounded-full transition-all', i <= stepIndex ? 'bg-amber-400/80' : 'bg-white/10 hover:bg-white/20')} disabled={i > stepIndex} />)}
        </div>
        <div className="min-h-[320px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
        <DialogFooter className="mt-2">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              {canGoBack && <Button variant="ghost" size="sm" onClick={back}>Back</Button>}
              <DialogClose render={<Button variant="ghost" size="sm">Cancel</Button>} />
            </div>
            <div className="flex items-center gap-2">
              {!isLast && <Button variant="ghost" size="sm" onClick={saveNow} data-lifephase="save-draft">Save as draft</Button>}
              <Button variant="default" size="sm" disabled={!canGoNext} onClick={next} data-lifephase="step-next">
                {isLast ? 'Save this chapter' : 'Continue'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Sub-components ───────────────────────────────────────── */
const CUSTOM_SWATCHES = ['#6fb38f', '#38bdf8', '#f472b6', '#a1a1aa', '#fbbf24', '#a78bfa', '#2dd4bf', '#e8866b', '#f87171', '#4ade80', '#fb923c', '#818cf8']

function AddPersonForm({ onAdd }: { onAdd: (name: string, role: string) => void }) {
  const [name, setName] = useState(''); const [role, setRole] = useState('')
  return (
    <div className="flex items-center gap-2">
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="flex-1 text-[13px]" />
      <Input value={role} onChange={e => setRole(e.target.value)} placeholder="Role (mentor, partner…)" className="flex-1 text-[13px]" />
      <Button variant="outline" size="sm" disabled={!name.trim()} onClick={() => { onAdd(name, role); setName(''); setRole('') }}>+ Add</Button>
    </div>
  )
}

function MoodPair({ start, end, onChange }: { start: number | null; end: number | null; onChange: (start: number | null, end: number | null) => void }) {
  const moodVal = (v: number | null) => v ?? 0
  const barW = ((moodVal(end) - moodVal(start)) / 6) * 100; const barLeft = ((moodVal(start) + 3) / 6) * 100
  return (
    <div className="space-y-2.5">
      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-red-500/60 via-amber-400/60 to-emerald-400/60">
        <div className="absolute h-3 w-3 -top-[3px] rounded-full bg-white/90 shadow ring-2" style={{ left: `calc(${((moodVal(start) + 3) / 6) * 100}% - 6px)`, boxShadow: '0 0 8px rgba(255,255,255,0.4)' }} />
        <div className="absolute h-3 w-3 -top-[3px] rounded-full bg-white ring-2 ring-amber-300" style={{ left: `calc(${((moodVal(end) + 3) / 6) * 100}% - 6px)` }} />
        <div className="absolute -top-[2px] h-[2px] bg-white/70" style={{ left: `${barLeft}%`, width: `${barW}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Slider value={moodVal(start)} onValueChange={v => onChange(v, end)} min={-3} max={3} step={1}><SliderControl><SliderTrack><SliderIndicator style={{ width: `${((moodVal(start) + 3) / 6) * 100}%` }} /></SliderTrack><SliderThumb /></SliderControl></Slider>
        <Slider value={moodVal(end)} onValueChange={v => onChange(start, v)} min={-3} max={3} step={1}><SliderControl><SliderTrack><SliderIndicator style={{ width: `${((moodVal(end) + 3) / 6) * 100}%` }} /></SliderTrack><SliderThumb /></SliderControl></Slider>
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600"><span>Struggling</span><span>Thriving</span></div>
    </div>
  )
}

function PhaseCardPreview({ draft, color, full = false }: { draft: Draft; color: string; full?: boolean }) {
  const contrast = getContrastColor(color)
  const moodVal = (v: number | null) => v ?? 0
  const moodBar = (start: number | null, end: number | null) => {
    if (start == null && end == null) return null
    const left = ((moodVal(start) + 3) / 6) * 100; const width = Math.abs(((moodVal(end) ?? moodVal(start)) + 3) / 6 * 100 - left)
    return { left, width }
  }
  const span = draft.endYear ? `${MONTHS[(draft.startMonth || 1) - 1]} ${draft.startYear} – ${MONTHS[(draft.endMonth || 12) - 1]} ${draft.endYear}` : `${MONTHS[(draft.startMonth || 1) - 1]} ${draft.startYear} – present`
  const bar = moodBar(draft.moodStart, draft.moodEnd)
  return (
    <div className={cn('pointer-events-none w-[480px] overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/60', !full && 'scale-100')}>
      <div className="relative h-32 overflow-hidden" style={{ backgroundColor: color }}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 30% 30%, ${lighten(color, 20)}, transparent 60%)` }} />
        <span className="absolute right-4 top-2 font-display text-6xl text-white/10 select-none leading-none">{draft.magnitude}</span>
        <div className="absolute bottom-3 left-4">
          <h3 className="warmth-serif text-2xl" style={{ color: contrast }}>{draft.title || 'Untitled chapter'}</h3>
          <p className="font-mono text-[11px] opacity-80" style={{ color: contrast }}>{span}</p>
        </div>
      </div>
      <div className="space-y-2.5 p-4">
        {draft.description && <p className="warmth-serif text-[12.5px] leading-relaxed text-zinc-300 line-clamp-3">{draft.description}</p>}
        {draft.milestones.length > 0 && <div><p className="mb-1 text-[9px] uppercase tracking-wider text-zinc-600">Key Moments</p>{draft.milestones.slice(0, 2).map(m => <p key={m.id} className="text-[11px] text-zinc-400"><span className="font-mono text-zinc-500">{m.date || '—'}</span> · {m.label || '(unnamed)'}</p>)}</div>}
        {draft.people && draft.people.length > 0 && <p className="text-[11px] text-zinc-500">{draft.people.map(p => p.name).filter(Boolean).join(', ')}</p>}
        {bar && <div className="relative h-1 rounded-full bg-zinc-800"><div className="absolute h-full rounded-full bg-gradient-to-r from-red-500/70 to-emerald-400/70" style={{ left: `${bar.left}%`, width: `${bar.width}%` }} /></div>}
        {draft.lessonsLearned && <blockquote className="warmth-serif italic text-[12px] text-zinc-300 border-l-2 pl-3 line-clamp-2" style={{ borderColor: color }}>{draft.lessonsLearned}</blockquote>}
      </div>
    </div>
  )
}
```

---

### CONTEXT: src/components/VoiceInputWrapper.tsx

**ALREADY PROVIDED IN ROUND 01** — see conversation/round-01.md. Key patterns:
- `cloneElement(children, { ref: ..., className: ...pr-10 })` — wraps any input/textarea
- Mic button positioned `absolute right-1.5 top-1/2 -translate-y-1/2 z-10`
- `insertText()` uses native value setter + `dispatchEvent(new Event('input', { bubbles: true }))` — works with React controlled inputs
- Portal panel at `document.body` via `createPortal`
- `if (!supported) return <>{children}</>` — gracefully degrades

---

### CONTEXT: src/components/life-river/PhaseCard.tsx (456 lines, full)

```tsx
"use client"
import * as React from 'react'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { WarmCard } from '../../features/warmth/WarmCard'
import { MemoryCard } from '../../features/memories/MemoryCard'
import type { LoadedMemory } from '../../features/memories/useMemories'
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar'
import type { LongTermGoal } from '@/components/dashboard/types'
import { categoryOf, getContrastColor, lighten, memoryUrl, phaseSpanLabel, type LifePhase, type LifePhaseMilestone, type LifePhasePerson, type PhaseMoodTag, type LifePhaseConnection } from '@/lib/riverMath'
import { cn } from '@/lib/utils'
import { Pencil, Sparkles, Users, BookOpen, Quote } from 'lucide-react'
import { PhaseFormDialog } from './phase-form-dialog'
import { ReflectionFlow, type AiReflectResult } from './reflection-flow'
import { ConnectionDataStrip } from './ConnectionDataStrip'

const MOOD_COLORS: Record<number, string> = { [-3]: '#ef4444', [-2]: '#f97316', [-1]: '#eab308', [0]: '#a1a1aa', [1]: '#84cc16', [2]: '#22c55e', [3]: '#fbbf24' }
function moodPosition(val: number | null): number { if (val == null) return 50; return ((val + 3) / 6) * 100 }

function Ring({ pct, size = 32 }: { pct: number; size?: number }) {
  return (<div className="relative shrink-0"><AnimatedCircularProgressBar value={Math.min(100, pct)} size={size} strokeWidth={3} gaugePrimaryColor="#fbbf24" gaugeSecondaryColor="rgba(63,63,70,0.5)" />
    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-zinc-300 tabular-nums">{Math.round(pct)}</span></div>)
}

interface PhaseCardProps {
  phase: LifePhase; active: boolean; allPhases?: LifePhase[]; memories: LoadedMemory[]; longTermGoals: LongTermGoal[]
  onActiveChange: (id: string | null) => void; onSave: (phase: LifePhase) => void
  onReflect: (phase: LifePhase, answers: string[], variation?: string) => Promise<AiReflectResult | null>
  onKeepReflection: (phase: LifePhase, text: string) => void; onOpenMemory: (memory: LoadedMemory) => void; onJump?: (phaseId: string) => void
}

export function PhaseCard({ phase, active, allPhases = [], memories, longTermGoals, onActiveChange, onSave, onReflect, onKeepReflection, onOpenMemory, onJump }: PhaseCardProps) {
  const [editing, setEditing] = useState(false)
  const [reflecting, setReflecting] = useState(false)
  const [storyExpanded, setStoryExpanded] = useState(false)

  const now = new Date().getFullYear()
  const color = phase.color || categoryOf(phase.category).color
  const contrast = getContrastColor(color)

  // Per-phase memory filter — by year range
  const phaseMemories = useMemo(() => {
    const endY = phase.endYear && phase.endYear > 0 ? phase.endYear : now
    return memories.filter(m => { const y = parseInt((m.meta.date || '').slice(0, 4), 10); return Number.isFinite(y) && y >= phase.startYear && y <= endY })
  }, [memories, phase.startYear, phase.endYear, now])

  // Per-phase LTG filter — by year range
  const phaseLtgs = useMemo(() => {
    const endY = phase.endYear && phase.endYear > 0 ? phase.endYear : now
    const yearOf = (s?: string | null) => { if (!s) return NaN; const y = parseInt(String(s).slice(0, 4), 10); return Number.isFinite(y) ? y : NaN }
    return longTermGoals.filter(ltg => { const y = yearOf(ltg.deadline) || yearOf(ltg.createdAt); return Number.isFinite(y) && y >= phase.startYear && y <= endY })
  }, [longTermGoals, phase.startYear, phase.endYear, now])

  const handleKeep = (text: string) => { onKeepReflection(phase, text); setReflecting(false) }
  const people = phase.people || []; const moodTags = phase.moodTags || []; const milestones = phase.milestones || []

  return (
    <motion.div data-lifephase="phase-card" data-phase-id={phase.id}
      className={cn('overflow-hidden rounded-xl transition-shadow duration-300',
        active ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.14),0_25px_50px_-12px_rgba(0,0,0,0.7)]' : 'shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]')}>

      {/* h-64 color header — click to activate */}
      <button onClick={() => onActiveChange(phase.id)} data-lifephase="phase-band"
        className="relative flex h-64 w-full items-end gap-4 rounded-t-xl p-6 text-left overflow-hidden"
        style={{ backgroundColor: color, boxShadow: `0 25px 50px -12px ${color}40` }}>
        {phase.headerImageMemoryId && <img src={memoryUrl(memories, phase.headerImageMemoryId) ?? ''} alt="" className="absolute inset-0 h-full w-full object-cover mix-blend-luminosity opacity-60" />}
        {phase.headerImageMemoryId && <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: color, opacity: 0.7 }} />}
        <motion.div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 30% 30%, ${lighten(color, 20)}, transparent 60%)` }}
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }} transition={{ duration: 26, repeat: Infinity, repeatType: 'mirror', ease: 'linear' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.15) 100%)` }} />
        <span className="absolute right-5 top-3 font-display text-8xl text-white/10 select-none leading-none">{phase.magnitude}</span>
        <div className="relative z-10 flex-1 min-w-0">
          <h2 className="warmth-serif text-3xl font-medium leading-tight truncate" style={{ color: contrast }}>{phase.title}</h2>
          <p className="font-mono text-sm mt-1.5 opacity-80" style={{ color: contrast }}>{phaseSpanLabel(phase)}</p>
        </div>
      </button>

      {/* Dark glass body — 8 sections */}
      <WarmCard className="rounded-t-none border-t-0 relative overflow-hidden p-6 space-y-6">
        {/* 1. Memory Pearls */}
        {phaseMemories.length > 0 && (
          <div><div className="relative" style={{ minHeight: Math.min(phaseMemories.length, 6) > 3 ? '160px' : '90px' }}>
            {phaseMemories.slice(0, 6).map((m, i) => {
              const rotation = (i % 3 === 0 ? -4 : i % 3 === 1 ? 3 : -2); const offsetX = i * 55; const offsetY = i % 2 === 0 ? 0 : 18
              return (<motion.div key={m.meta.id} className="absolute w-28 h-28 rounded-lg overflow-hidden border-2 border-zinc-800 shadow-xl cursor-pointer"
                style={{ left: `${offsetX}px`, top: `${offsetY}px`, rotate: `${rotation}deg`, zIndex: i }}
                whileHover={{ scale: 1.12, rotate: 0, zIndex: 50, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                onClick={() => onOpenMemory(m)}>
                <MemoryCard idPrefix={`phase-${phase.id}`} memory={m} onOpen={() => onOpenMemory(m)} />
              </motion.div>)
            })}
          </div></div>
        )}

        {/* 2. Story */}
        {phase.description && (<div><p className={cn('warmth-serif text-base leading-relaxed text-zinc-300', !storyExpanded && 'line-clamp-5')}>{phase.description}</p>
          {phase.description.length > 200 && <button onClick={() => setStoryExpanded(!storyExpanded)} className="text-[12px] text-zinc-500 hover:text-zinc-300 mt-1 transition-colors">{storyExpanded ? 'Show less' : 'Read more'}</button>}</div>)}

        {/* 3. Key Moments — vertical timeline */}
        {milestones.length > 0 && (<div><p className="mb-2 text-[10.5px] uppercase tracking-wider text-zinc-600">Key Moments</p>
          <div className="border-l border-zinc-700 pl-4 space-y-3">
            {milestones.map((m, i) => (<motion.div key={m.id} className="relative" initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-zinc-800" style={{ backgroundColor: color }} />
              <p className="font-mono text-xs text-zinc-500">{m.date}</p><p className="text-sm text-zinc-200">{m.label}</p>
              {m.note && <p className="text-[12px] text-zinc-500 mt-0.5">{m.note}</p>}
            </motion.div>))}
          </div></div>)}

        {/* 4. People — avatar chips */}
        {people.length > 0 && (<div><p className="mb-2 text-[10.5px] uppercase tracking-wider text-zinc-600">The People</p>
          <div className="flex flex-wrap gap-2">
            {people.map(p => (<div key={p.id} className="flex items-center gap-2 rounded-full bg-zinc-800/60 border border-zinc-700/50 px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-semibold text-zinc-300">{p.name.charAt(0).toUpperCase()}</div>
              <div><span className="text-[12px] text-zinc-300">{p.name}</span><span className="text-[10px] text-zinc-500 ml-1">{p.role}</span></div>
            </div>))}
          </div></div>)}

        {/* 5. Mood — gradient bar + tags */}
        {(phase.moodStart != null || phase.moodEnd != null) && (<div><p className="mb-2 text-[10.5px] uppercase tracking-wider text-zinc-600">Mood</p>
          <div className="relative h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div className="absolute h-full rounded-full" style={{ left: `${moodPosition(phase.moodStart)}%`, width: `${Math.abs(moodPosition(phase.moodEnd) - moodPosition(phase.moodStart))}%`, background: `linear-gradient(90deg, ${MOOD_COLORS[phase.moodStart ?? 0]}, ${MOOD_COLORS[phase.moodEnd ?? 0]})` }} />
          </div>
          <div className="flex justify-between mt-1"><span className="text-[9px] text-zinc-600">Struggling</span><span className="text-[9px] text-zinc-600">Thriving</span></div>
          {moodTags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{moodTags.map(tag => <span key={tag} className="px-2 py-0.5 rounded-full bg-zinc-800/60 text-[10px] text-zinc-400 border border-zinc-700/50">{tag}</span>)}</div>}
        </div>)}

        {/* 6. Lessons — pull-quote */}
        {phase.lessonsLearned && (<div className="relative"><Quote size={32} className="absolute -left-1 -top-1 text-zinc-800/40" />
          <blockquote className="warmth-serif italic text-xl text-zinc-300 leading-relaxed border-l-2 pl-6" style={{ borderColor: color }}>{phase.lessonsLearned}</blockquote></div>)}

        {/* 7. Impact Notes */}
        {phase.impactNotes && (<div><p className="mb-1 text-[10.5px] uppercase tracking-wider text-zinc-600">Impact</p><p className="text-[13px] text-zinc-400 leading-relaxed">{phase.impactNotes}</p></div>)}

        {/* 8. Feelings */}
        {phase.feelingsNote && (<div><p className="mb-1 text-[10.5px] uppercase tracking-wider text-zinc-600">How it felt</p><p className="warmth-serif italic text-[13px] text-zinc-400 leading-relaxed">{phase.feelingsNote}</p></div>)}

        {/* Long-term goals attached to this era */}
        {phaseLtgs.length > 0 && (<div><p className="mb-2 text-[10.5px] uppercase tracking-wider text-zinc-600">Long-term goals</p>
          <ul className="space-y-1.5">{phaseLtgs.map(ltg => (<li key={ltg.id} className="flex items-center gap-2.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-2.5 py-2">
            <Ring pct={ltg.progress ?? 0} /><span className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-300">{ltg.title}</span>
          </li>))}</ul></div>)}

        {/* Connections */}
        {phase.connections.length > 0 && (<div><p className="mb-2 text-[10.5px] uppercase tracking-wider text-zinc-600">Connected to</p>
          <div className="flex flex-wrap gap-1.5">{phase.connections.map((conn, i) => {
            const target = allPhases.find(p => p.id === conn.targetPhaseId)
            return <button key={i} onClick={() => onJump?.(conn.targetPhaseId)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800/60 text-[11px] text-zinc-300 border border-zinc-700/50 transition-all hover:bg-zinc-800 hover:border-zinc-600 hover:ring-1 hover:ring-zinc-500">→ {target?.title ?? conn.targetPhaseId.slice(0, 8)}{conn.note && <span className="text-zinc-500">({conn.note})</span>}</button>
          })}</div></div>)}

        {/* Connection data strip */}
        <ConnectionDataStrip phaseId={phase.id} startYear={phase.startYear} endYear={phase.endYear} memories={memories} />

        {/* Reflection */}
        {reflecting ? (<ReflectionFlow phase={phase} onBack={() => setReflecting(false)} onSubmit={onReflect} onKeep={handleKeep} />)
          : (phase.reflection && <blockquote className="warmth-serif italic text-lg text-amber-100/80 leading-relaxed border-l-2 border-amber-400/30 pl-4">{phase.reflection}</blockquote>)}

        {/* Actions — Reflect + Edit buttons */}
        <div className="flex items-center gap-2 border-t border-zinc-800/50 pt-4">
          <button onClick={() => setReflecting(true)} className="flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[12px] font-medium text-amber-300 transition-colors hover:bg-amber-500/20"><Sparkles size={13} /> Reflect</button>
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-lg border border-zinc-700/60 bg-zinc-800/40 px-3 py-2 text-[12px] font-medium text-zinc-300 transition-colors hover:bg-zinc-800/70"><Pencil size={13} /> Edit</button>
        </div>
      </WarmCard>

      {/* Edit dialog — opens full 9-step wizard */}
      <PhaseFormDialog open={editing} onOpenChange={setEditing} initial={phase} allPhases={allPhases} onSave={p => { onSave(p); setEditing(false) }} />
    </motion.div>
  )
}
```

**Key for lens-driven rendering:** PhaseCard currently receives NO lens prop. To alter rendering per lens:
- `phases` lens: show all 8 sections as-is (current behavior)
- `covenant` lens: highlight ConnectionDataStrip's covenant completion section, dim other sections
- `gold` lens: expand Long-term goals section, add progress rings, dim other sections
- `memories` lens: expand Memory Pearls section, add "Add memory" button, dim other sections
- The Edit button (line 435-440) opens PhaseFormDialog — this is the current "edit from card" flow
- PhaseCard already has `onOpenMemory` callback for clicking memory photos

---

## Decisions made:
- None yet — waiting for Specialist to produce RESULT.md after reviewing these files.

## Convergence status: ongoing
