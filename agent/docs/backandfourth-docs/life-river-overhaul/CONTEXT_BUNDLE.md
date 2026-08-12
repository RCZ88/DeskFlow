# Context Bundle — Life River Feature Overhaul

## Problem Summary
The Life Page River mode has 6 missing features. Code changes exist in source files but the user sees NO visual difference in the app. The console log `[LifePage] v2.0 loaded` appears, proving the new code runs, but visual elements (lens indicator, quick-add toolbar, data previews, drafts section) are not rendering or not visible.

## Architecture
- **Stack:** Electron + React + TypeScript + Tailwind + Framer Motion + better-sqlite3
- **Page:** `src/features/warmth/LifePage.tsx` (670 lines) — orchestrates River mode
- **Components:** CoreSample (ring vis), PhaseCard (phase display), PhaseFormDialog (9-step wizard), RiverCanvas (SVG river), RiverMap (SVG path)
- **Data hooks:** useLifePhases, useCovenant, useMemories, getGoals/getLongtermGoals IPC

---

## File: src/lib/riverMath.ts (LifePhase interface)

```typescript
// Lines 28-59
export interface LifePhase {
  id: string
  title: string
  description: string
  category: string
  startMonth: number
  startYear: number
  endMonth?: number | null
  endYear?: number | null
  magnitude: number          // 1–10
  color: string
  reflection: string
  eraTrends: string
  impactNotes: string
  milestones: LifePhaseMilestone[]
  connections: LifePhaseConnection[]
  people?: LifePhasePerson[] | null
  moodStart?: number | null         // -3 (struggling) … +3 (thriving)
  moodEnd?: number | null
  moodTags?: PhaseMoodTag[] | null
  feelingsNote?: string | null
  lessonsLearned?: string | null
  headerImageMemoryId?: string | null
  colorSource?: 'category' | 'custom' | null
  reflectionSource?: 'manual' | 'ai' | 'ai-edited' | null
  reflectionGeneratedAt?: string | null
  status?: 'draft' | 'complete'
  updatedAt?: string
}
```

---

## File: src/components/life-river/CoreSample.tsx (FULL - 126 lines)

```tsx
"use client"
import * as React from 'react'
import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LifePhase } from '@/lib/riverMath'
import type { LongTermGoal } from '@/components/dashboard/types'
import { RingCanvas, type LensId } from './RingCanvas'
import { cn } from '@/lib/utils'
import { Images, Layers, Sparkles, Target } from 'lucide-react'

const LENSES: { id: LensId; label: string; icon: typeof Layers; blurb: string }[] = [
  { id: 'phases', label: 'Phases', icon: Layers, blurb: 'Each ring is a chapter — oldest at the center.' },
  { id: 'covenant', label: 'Covenant', icon: Sparkles, blurb: 'Grain is practice kept.' },
  { id: 'gold', label: 'Gold', icon: Target, blurb: 'Branches reach toward long-term goals.' },
  { id: 'memories', label: 'Memories', icon: Images, blurb: 'Amber pockets hold what you kept.' },
]

interface CoreSampleProps {
  phases: LifePhase[]
  covenant: {
    completions: { commitmentId: string; date: string }[]
    commitments: { id: string }[]
  }
  memoriesByPhase: Record<string, number>
  ltgsByPhase: Record<string, LongTermGoal[]>
  selectedPhaseId: string | null
  onPhaseClick: (phaseId: string) => void
  onOpenMemories: (phaseId: string) => void
  lens: LensId
  onLensChange: (lens: LensId) => void
}

export function CoreSample({
  phases, covenant, memoriesByPhase, ltgsByPhase,
  selectedPhaseId, onPhaseClick, onOpenMemories, lens, onLensChange,
}: CoreSampleProps) {
  const grainByPhase = useMemo(() => {
    const out: Record<string, number> = {}
    const now = new Date().getFullYear()
    for (const p of phases) {
      const start = `${p.startYear}-01-01`
      const endY = p.endYear && p.endYear > 0 ? p.endYear : now
      const end = `${endY}-12-31`
      const inRange = covenant.completions.filter(c => c.date >= start && c.date <= end)
      const days = new Set(inRange.map(c => c.date)).size
      const possible = covenant.commitments.length
      out[p.id] = possible === 0 || days === 0 ? 0 : Math.min(1, inRange.length / (possible * days))
    }
    return out
  }, [phases, covenant.completions, covenant.commitments])

  const todayCompletions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return covenant.completions.filter(c => c.date === today).length
  }, [covenant.completions])

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/30" data-lifephase="core-sample">
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(251,191,36,0.08), transparent 60%)' }} />
      <div className="flex flex-col items-center px-6 pt-5 pb-4">
        <div className="relative h-52 w-52 sm:h-64 sm:w-64">
          <RingCanvas phases={phases} lens={lens} grainByPhase={grainByPhase}
            todayCompletions={todayCompletions} memoriesByPhase={memoriesByPhase}
            ltgsByPhase={ltgsByPhase} selectedPhaseId={selectedPhaseId}
            onPhaseClick={onPhaseClick} onOpenMemory={onOpenMemories} />
        </div>
        {/* Lens switcher */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1 rounded-lg bg-zinc-800/50 p-0.5">
          {LENSES.map(l => (
            <button key={l.id} onClick={() => onLensChange(l.id)}
              className={cn('relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] transition-colors min-h-[30px]',
                lens === l.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300')}>
              {lens === l.id && <motion.div layoutId="core-sample-lens" className="absolute inset-0 rounded-md bg-zinc-700/80 border border-white/10" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <l.icon className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10 font-medium">{l.label}</span>
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.p key={lens} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }} className="mt-2.5 max-w-md text-center font-serif text-[12.5px] italic text-zinc-500">
            {LENSES.find(l => l.id === lens)?.blurb}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
```

---

## File: src/features/warmth/LifePage.tsx (Key sections)

### State declarations (lines 56-84):
```tsx
export default function LifePage() {
  const { phases, loading, error, savePhase, reflect } = useLifePhases()
  const covenant = useCovenant()
  const memories = useMemories()

  console.log('%c[LifePage] v2.0 loaded', 'color: #fbbf24; font-weight: bold')

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem('life-view-mode') as ViewMode) || 'river' } catch { return 'river' }
  })
  const [pageTab, setPageTab] = useState<PageTab>('covenant')
  const [lens, setLens] = useState<LensId>('phases')
  const [zoomStop, setZoomStop] = useState('Life')
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editingPhase, setEditingPhase] = useState<LifePhase | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [ltgs, setLtgs] = useState<LongTermGoal[]>([])
  const [viewing, setViewing] = useState<LoadedMemory | null>(null)
  const [inlineModal, setInlineModal] = useState<null | 'covenant' | 'gold' | 'memory'>(null)
  const [inlineModalPhaseId, setInlineModalPhaseId] = useState<string | undefined>(undefined)
  // ...
```

### River mode JSX structure (lines 343-552):
The river mode renders:
1. Vital Thread (glowing line)
2. Apex Map: CoreSample + TimelineView + RiverMap
3. Scrollable content with:
   - TodayTributary
   - Lens indicator bar (NEW)
   - Quick-add toolbar (NEW)
   - Data preview cards (NEW)
   - Always-visible drafts section (NEW)
   - PhaseCards list
4. PhaseFormDialog (adding)
5. PhaseFormDialog (editingPhase)
6. MemoryLightbox
7. Inline modals (NEW)

### Inline modal rendering (lines 620-666):
```tsx
{inlineModal === 'covenant' && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setInlineModal(null)}>
    <div className="w-full max-w-md bg-zinc-900/95 border border-rose-500/20 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center"><Sparkles className="w-4 h-4 text-rose-400" /></div>
          <div><h3 className="text-base font-semibold text-zinc-100">New Covenant</h3><p className="text-[11px] text-zinc-600">A commitment to yourself</p></div>
        </div>
        <button onClick={() => setInlineModal(null)} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
      </div>
      <InlineCovenantForm phaseId={inlineModalPhaseId} onClose={() => setInlineModal(null)} />
    </div>
  </div>
)}
```

---

## File: src/components/life-river/PhaseCard.tsx (Props + key sections)

### Interface (lines 64-81):
```tsx
interface PhaseCardProps {
  phase: LifePhase
  active: boolean
  allPhases?: LifePhase[]
  memories: LoadedMemory[]
  longTermGoals: LongTermGoal[]
  onActiveChange: (id: string | null) => void
  onSave: (phase: LifePhase) => void
  onReflect: (phase: LifePhase, answers: string[], variation?: string) => Promise<AiReflectResult | null>
  onKeepReflection: (phase: LifePhase, text: string) => void
  onOpenMemory: (memory: LoadedMemory) => void
  onJump?: (phaseId: string) => void
  lens: LensId
  onAddMemory?: () => void
  onAddGoal?: () => void
  onAddCovenant?: () => void
  onEditPhase?: () => void
}
```

### sectionOpacity helper (line 131):
```tsx
const sectionOpacity = (sectionLens: LensId) => lens === 'phases' || lens === sectionLens ? 'opacity-100 transition-opacity duration-300' : 'opacity-30 transition-opacity duration-300'
```

### Draft styling (line 142):
```tsx
phase.status === 'draft' && 'opacity-60 border border-dashed border-zinc-600'
```

### Covenant section (lens === 'covenant'):
```tsx
{lens === 'covenant' && (
  <div className={sectionOpacity('covenant')}>
    <p className="mb-2 text-[10.5px] uppercase tracking-wider text-rose-400/70">Covenant</p>
    {phaseLtgs.length > 0 ? (
      <ul className="space-y-1.5">
        {phaseLtgs.slice(0, 3).map(ltg => (
          <li key={ltg.id} className="flex items-center gap-2 text-[12px] text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400/60 shrink-0" />
            <span className="truncate">{ltg.title}</span>
          </li>
        ))}
      </ul>
    ) : (
      <button onClick={onAddCovenant} className="text-[11px] text-rose-400/50 hover:text-rose-400 transition-colors">
        + Add covenant commitment
      </button>
    )}
  </div>
)}
```

### Memories section (lens === 'memories'):
```tsx
{lens === 'memories' && (
  <div className={sectionOpacity('memories')}>
    <p className="mb-2 text-[10.5px] uppercase tracking-wider text-emerald-400/70">Memories</p>
    {phaseMemories.length > 0 ? (
      <div className="flex gap-1.5">
        {phaseMemories.slice(0, 4).map(m => (
          <button key={m.meta.id} onClick={() => onOpenMemory(m)}
            className="w-12 h-12 rounded-lg overflow-hidden border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
            <img src={m.url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    ) : (
      <button onClick={onAddMemory} className="text-[11px] text-emerald-400/50 hover:text-emerald-400 transition-colors">
        + Add memory
      </button>
    )}
  </div>
)}
```

---

## File: src/components/life-river/phase-form-dialog.tsx (saveNow function)

```tsx
// Lines 289-320
const saveNow = (status: 'draft' | 'complete' = 'complete') => {
  const phase: LifePhase = {
    id: initial?.id ?? uid('phase'),
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category,
    startMonth: draft.startMonth,
    startYear: draft.startYear,
    endMonth: draft.endMonth,
    endYear: draft.endYear,
    magnitude: draft.magnitude,
    color: draft.color,
    reflection: draft.reflection,
    eraTrends: draft.eraTrends || initial?.eraTrends || '',
    impactNotes: draft.impactNotes,
    milestones: draft.milestones,
    connections: draft.connections,
    people: draft.people,
    moodStart: draft.moodStart,
    moodEnd: draft.moodEnd,
    moodTags: draft.moodTags,
    feelingsNote: draft.feelingsNote,
    lessonsLearned: draft.lessonsLearned,
    headerImageMemoryId: draft.headerImageMemoryId,
    colorSource: draft.colorSource,
    reflectionSource: draft.reflectionSource,
    reflectionGeneratedAt: draft.reflectionGeneratedAt,
    status,
    updatedAt: new Date().toISOString(),
  }
  onSave(phase)
}
```

---

## What's Actually Implemented vs What User Sees

| Feature | In Source? | In Bundle? | Visible? | Why Not Visible |
|---------|-----------|------------|----------|-----------------|
| VoiceInputWrapper on textareas | ✅ Yes | ✅ Yes | ❌ No | Only visible when dialog is open |
| saveNow('draft') | ✅ Yes | ✅ Yes | ❌ No | Only visible when saving as draft |
| Lens state lifted to LifePage | ✅ Yes | ✅ Yes | ❌ No | Lens indicator below scroll area |
| PhaseCard lens opacity | ✅ Yes | ✅ Yes | ❌ No | No data to show opacity effect |
| Draft list section | ✅ No drafts to show | ✅ Yes | ❌ No | No draft phases exist |
| Add buttons per lens | ✅ Yes | ✅ Yes | ❌ No | Only visible when lens is switched |
| Empty states per lens | ✅ Yes | ✅ Yes | ❌ No | Only visible when lens is switched |
| Ring click opens edit | ✅ Yes | ✅ Yes | ❌ No | Only visible when clicking a ring |
| River canvas height 420 | ✅ Yes | ✅ Yes | ❌ No | May be cached or not noticeable |

## Root Cause Analysis

The changes are ALL in the source code and bundle. The issue is:
1. **All changes are interactive-only** — they only appear when the user performs specific actions
2. **No changes are visible by default** — the user must switch lens, open dialog, or have draft data
3. **Electron may be caching old chunks** — even with cache cleared, old chunks may persist

## What Needs to Happen

The Architect needs to design a solution where:
1. **Lens indicator bar** is ALWAYS visible (not just when lens is switched)
2. **Quick-add toolbar** is ALWAYS visible with all 4 buttons
3. **Data preview cards** show on default lens (Covenant/Goals/Memories counts)
4. **Drafts section** is ALWAYS visible (with empty state if no drafts)
5. **Voice badge** appears on the Add Phase button
6. **Inline add modals** open WITHOUT navigating away from River mode
7. **Ring clicks** open the edit dialog
8. **River canvas** is visibly taller

## Design Tokens
- Dark mode: zinc-900/950 backgrounds
- Amber (#fbbf24) for gold/warmth
- Emerald for memories
- Rose for covenant
- Glass cards: bg-zinc-900/30 backdrop-blur
- Fonts: Geist (body), JetBrains Mono (code)
- Rounded: max rounded-xl (12px)
- Padding: p-5 (20px)
