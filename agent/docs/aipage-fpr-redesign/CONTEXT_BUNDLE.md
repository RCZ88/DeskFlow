# CONTEXT_BUNDLE — AiPage Focus/Plan/Reflect Redesign

> Self-contained context for the Architect AI. This file + RESULT_NEW.md are the
> complete reference. Do not read the codebase directly — everything is here.

---

## 1. Architecture Overview

DeskFlow is an Electron + React + TypeScript + Tailwind (v4) desktop productivity tracker.
The AiPage at route `/ai` is divided into six sections in a vertical stack:

```
AiPage (min-h-screen bg-zinc-950)
├─ Header (sticky, backdrop-blur, h-14)
├─ Two-column grid (xl: 12-col)
│   ├─ Left rail (xl: col-span-4, mobile: below) — SummaryGrid + ConnectorsPanel
│   └─ Right column (xl: col-span-8, mobile: above) — AiChat
├─ Focus section (ai.focus)
│   ├─ SectionHead accent="pink" "Focus" "What needs your attention today"
│   └─ GlassCard > DailyPlanCard
├─ Plan section (ai.plan)
│   ├─ SectionHead accent="emerald" "Plan" "Your milestones and objectives"
│   └─ 2-col grid: MyPlanCard + LongTermPlanCard
└─ Reflect section (ai.reflect)
    ├─ SectionHead accent="amber" "Reflect" "Patterns and discoveries"
    └─ vertical stack: TopicDigestCard + GoalHistoryCard
```

**State management:** All card state is local (useState/useCallback in AiPage).
Data flows through `window.deskflowAPI!` (preload-exposed IPC).
The page uses `motion.div` with `STAGGER_VARIANTS` for mount choreography.

---

## 2. Design Tokens & Primitives (shared with RESULT_NEW.md)

### Tokens — `src/components/ai/tokens.ts`
```ts
export const SURFACE = {
  base:     'bg-zinc-950',
  card:     'bg-zinc-900/40',
  cardHi:   'bg-zinc-900/60',
  inset:    'bg-zinc-950/60',
} as const

export const RING = {
  base:   'ring-1 ring-zinc-800/60',
  hover:  'ring-zinc-700',
  active: 'ring-zinc-600',
  focus:  'focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:outline-none',
} as const

export const TEXT = {
  primary:   'text-zinc-100',
  secondary: 'text-zinc-400',
  muted:     'text-zinc-500',
  disabled:  'text-zinc-600',
} as const

export const ACCENT = {
  pink:    { dot:'bg-pink-400',    bar:'bg-pink-500',    pill:'bg-pink-500/10 text-pink-300 ring-pink-500/20',    hex:'#f472b6' },
  emerald: { dot:'bg-emerald-400', bar:'bg-emerald-500', pill:'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20', hex:'#10b981' },
  amber:   { dot:'bg-amber-400',   bar:'bg-amber-500',   pill:'bg-amber-500/10 text-amber-300 ring-amber-500/20',   hex:'#f59e0b' },
  violet:  { dot:'bg-violet-400',  bar:'bg-violet-500',  pill:'bg-violet-500/10 text-violet-300 ring-violet-500/20', hex:'#a78bfa' },
  red:     { dot:'bg-red-400',     bar:'bg-red-500',     pill:'bg-red-500/10 text-red-300 ring-red-500/20',       hex:'#f87171' },
} as const

export const MOTION = {
  fast: 0.15, normal: 0.25, slow: 0.40,
  ease: [0.16, 1, 0.3, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
  stagger: 0.05,
} as const
```

### Primitives in `src/components/ai/`

| Primitive | Purpose |
|---|---|
| `GlassCard` | `rounded-xl p-5 bg-zinc-900/40 ring-1 ring-zinc-800/60`; optional `accent` left 2px bar; `whileHover={{y:-2}}` |
| `SectionHead` | Accent bar + title (text-sm font-semibold) + desc (text-xs text-zinc-500) + optional right slot |
| `StatusDot` | Colored dot (h-1.5 w-1.5 rounded-full) + label (text-[11px] text-zinc-400); optional `breathe` |
| `StateShell<T>` | 4-state: loading | empty | error(message+retry) | ready(data) — 150ms opacity crossfade |
| `IconButton` | 32×32 visual / 44px hit-area icon button with tooltip, focus ring |
| `MetricCard` | GlassCard variant: icon tile + label + big number (count-up) + footer + loading/error/stale |
| `Skeleton` | Re-exported from shadcn `ui/skeleton` |

### Imports from `src/components/ai/index.ts`
```ts
export { GlassCard, SectionHead, StatusDot, IconButton, StateShell } from '../components/ai';
export type { ViewState } from '../components/ai';
export { SURFACE, RING, TEXT, ACCENT, MOTION } from '../components/ai';
export { Skeleton } from '../components/ui/skeleton';
```

### Invariants (binding)
- Tailwind v4 only · `p-5` max card padding · `rounded-xl` max · **no box-shadow** · animate **transform + opacity only** · easing `cubic-bezier(0.16,1,0.3,1)` · durations 150/250/400ms · no spring · every `localStorage` in try/catch · CRLF preserved · renderer-first, no new IPC channels unless specified · React + framer-motion + lucide-react only.

---

## 3. Focus Section — DailyPlanCard (`src/components/DailyPlanCard.tsx`)

### Props
```ts
interface DailyPlanCardProps {
  goals: Goal[];                           // from GoalStore
  mode: 'morning' | 'in-progress' | 'review';
  suggestions?: Array<{ title: string; category: GoalCategory }>;
  planGoals?: Array<{ title: string; targetSeconds?: number }>;
  review?: string | null;
  loading?: boolean;
  suggesting?: boolean;
  saving?: boolean;
  error?: string | null;
  onToggle: (goal: Goal) => void;
  onSuggest: () => void;
  onAccept: (suggestion: { title: string; category: GoalCategory }) => void;
  onDismiss: (suggestion: { title: string; category: GoalCategory }) => void;
  onFeedback: (message: string) => void;   // review/summary
  onConfigure?: () => void;
  providerBadge?: { label: string; color: string } | null;
}
```

### Current internal features (must ALL be preserved)
- **Mode pill**: morning (amber, Sparkles) / in-progress (emerald, Circle) / review (pink, TrendingUp)
- **Header**: Brain icon 40×40, "Daily Plan" title, mode pill, provider badge, SVG progress ring (40×40, stroke-dashoffset), Configure (Cpu icon), Suggest button (Sparkles)
- **Suggestions section**: "AI Suggestions" header, pink-tinted rows with category dots/badges, Accept/Dismiss buttons
- **From your plan section**: "From your plan" list from planning.md, each item with ring and optional time badge
- **Pending goals**: Circle toggle buttons, category dot + badge, optional targetSeconds display
- **Completed goals**: collapsible accordion (show/hide), check icons, line-through, emerald tint
- **Review mode metrics**: 2-col grid showing goals completed + carry over numbers
- **Review summary**: pink-tinted block with brain icon + AI review text
- **Feedback input**: text input + Send button (pink), Enter to submit
- **Loading state**: 3 Skeleton rows
- **Error state**: red-tinted error box
- **Empty state**: centered Brain icon, "Plan your day" title, Suggest button
- **Animations**: framer-motion entrance with stagger (y:6, opacity), AnimatePresence for completed section

### Data flow
- `goals` → `window.deskflowAPI!.getGoals(today)` → `GoalDay { goals, reviewSummary }`
- `suggestions` → `window.deskflowAPI!.suggestGoals(today, context)` → AI suggestion
- `onToggle` → calls `window.deskflowAPI!.saveGoal(...)` to toggle completion
- `onFeedback` → calls `window.deskflowAPI!.saveGoalReview(today, msg)`
- `planGoals` → `window.deskflowAPI!.readPlanningMd()` → parseChecklist

### Types imported
```ts
import type { Goal, GoalCategory } from '../services/GoalStore';
// Goal: { id, title, description?, category, target, period, status, date, source, links, progressSeconds?, createdAt, completedAt? }
// GoalCategory: 'work' | 'personal' | 'health' | 'learning'
```

### Category accent map
```
work     → violet (dot: bg-violet-500,  badge: bg-violet-500/10 text-violet-300 ring-violet-500/20)
personal → cyan   (dot: bg-cyan-500,    badge: bg-cyan-500/10 text-cyan-300 ring-cyan-500/20)
health   → emerald(dot: bg-emerald-500, badge: bg-emerald-500/10 text-emerald-300 ring-emerald-500/20)
learning → amber  (dot: bg-amber-500,   badge: bg-amber-500/10 text-amber-300 ring-amber-500/20)
```

---

## 4. Plan Section — MyPlanCard (`src/components/MyPlanCard.tsx`)

### Props
```ts
interface MyPlanCardProps {
  onPlanningSaved?: () => void;
}
```

### Current internal features (must ALL be preserved)
- **Header**: BookOpen emerald icon (32×32), "My Plan" title, edit/preview toggle button (Edit3/Eye), save state indicator (unsaved/saving/saved/idle)
- **Edit mode**: textarea with debounced auto-save (1s), monospace font, focus ring emerald
- **Preview mode**: whitespace-pre-wrap rendering of markdown content, "Add item" button → inline input form
- **Loading**: 3 skeleton bars
- **Error**: red-tinted error box
- **Default content**: `# My Plan\n\n## Today's Focus\n- [ ] Plan your day\n\n## Notes\n\n`
- **Data**: `window.deskflowAPI!.readPlanningMd()` / `writePlanningMd(text)`

---

## 5. Plan Section — LongTermPlanCard (`src/components/LongTermPlanCard.tsx`)

### Props: none (self-contained)

### Current internal features (must ALL be preserved)
- **Header**: Flag amber icon (32×32), "Long-term Plan" title, "N active · M done" subtitle
- **Mode toggle**: segmented toggle (Manual / Bulk) in bg-zinc-800/60 capsule
- **Manual mode**:
  - Add goal form: title input, description textarea, category select (work/personal/health/learning/finance/relationships), Add Goal button
  - Goal list: pending rows with circle toggle (ring-2), category dot, title, description, priority arrows (up/down), delete (Trash2)
  - Completed: collapsible accordion, emerald checkmarks, line-through
  - Empty state: Flag icon centered, "No long-term goals yet" message
- **Bulk mode** (AI import):
  - Textarea for brain dump, character counter, "Analyze with AI" button
  - Analyzing state: Brain icon with ping animation, loading dots
  - Error state: AlertCircle + retry link
  - Parsed goals preview: selectable goal cards with checkboxes (CheckSquare/Square), category badges
  - Import button ("Import N goals")
  - Success toast: emerald banner with checkmark, dismiss (X)
- **Loading**: 3 skeleton rows
- **Error**: red-tinted error box
- **Data**: `getLongtermGoals()`, `saveGoal()`, `deleteGoal()`, `parseGoalDump()`, `saveGoalsBatch()`
- **Category config**: work(violet), personal(cyan), health(emerald), learning(amber), finance(rose), relationships(pink)

---

## 6. Reflect Section — TopicDigestCard (`src/components/TopicDigestCard.tsx`)

### Props
```ts
interface TopicDigestCardProps {
  topics: TopicDigestItem[];   // { topic, summary, sources?: [{ title, url }] }
  loading: boolean;
  error?: string;
  reason?: string;
  onRefresh: () => void;
  onConfigure?: () => void;
  providerBadge?: { label: string; color: string } | null;
}
```

### Current internal features (must ALL be preserved)
- **Header**: Brain cyan icon (36×36), "Research Digest" title, provider badge, Configure (Cpu), Refresh button (RefreshCw + spinner)
- **Topic list**: expandable accordion items per topic, Sparkles icon, chevron rotate, summary text, source links (ExternalLink)
- **Loading**: 3 skeleton rows with icon square + text lines
- **Error**: red-tinted box
- **Empty**: BookOpen icon + "No research topics" + reason (from settings)
- **Data**: `getTopicDigest({ force?: true })`, `onDigestGenerationComplete` event, polling interval for generating case

---

## 7. Reflect Section — GoalHistoryCard (`src/components/GoalHistoryCard.tsx`)

### Props: none (self-contained)

### Current internal features (must ALL be preserved)
- **Header**: History zinc icon (32×32), "Goal History" title, "Last 7 days" subtitle
- **Day list**: expandable accordion per day, formatted date (Today/Yesterday/weekday), completion count (M/N), chevron
- **Expanded goals**: per-goal rows with status icon (CheckCircle2/X/Circle/Clock) + color, title, category badge, truncated
- **Review summary**: optional Brain pink-tinted block per day
- **Loading**: 4 skeleton bars
- **Error**: red-tinted box
- **Empty**: Calendar icon + "No goal history" message
- **Data**: `getGoals(date)` for last 7 days (individual calls per day)

---

## 8. AiPage Layout Details (how cards are composed)

```tsx
// ── Focus ──
<section data-section="ai.focus">
  <SectionHead accent="pink" title="Focus" desc="What needs your attention today"
    right={pill('pink', unfinishedCount > 0 ? `${unfinishedCount} active` : 'All clear')} />
  <GlassCard className="!p-0 overflow-hidden">
    <DailyPlanCard
      goals={goals} mode={mode} suggestions={suggestions} planGoals={planGoals} review={review}
      loading={goalsLoading} suggesting={suggesting} saving={savingGoal} error={goalsError}
      onToggle={handleToggle} onSuggest={handleSuggest} onAccept={handleAccept}
      onDismiss={handleDismiss} onFeedback={handleFeedback}
      onConfigure={() => setConfiguringFeature('goalAssistant')} providerBadge={goalsBadge} />
  </GlassCard>
</section>

// ── Plan ──
<section data-section="ai.plan">
  <SectionHead accent="emerald" title="Plan" desc="Your milestones and objectives"
    right={pill('emerald', planGoals.length > 0 ? `${planGoals.length} items` : 'Up to date')} />
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    <GlassCard className="!p-0 overflow-hidden">
      <MyPlanCard onPlanningSaved={handlePlanningSaved} />
    </GlassCard>
    <GlassCard>
      <LongTermPlanCard />
    </GlassCard>
  </div>
</section>

// ── Reflect ──
<section data-section="ai.reflect">
  <SectionHead accent="amber" title="Reflect" desc="Patterns and discoveries"
    right={<>{pill('amber', digestTopics.length > 0 ? `${digestTopics.length} topics` : 'No insights yet')}<DiagButton /></>} />
  <div className="space-y-4">
    <GlassCard className="!p-0 overflow-hidden"><TopicDigestCard ... /></GlassCard>
    <GlassCard className="!p-0 overflow-hidden"><GoalHistoryCard /></GlassCard>
  </div>
</section>
```

### AiPage state context (relevant to Focus/Plan/Reflect)
```ts
type Mode = 'morning' | 'in-progress' | 'review';
mode = determineMode(goals);  // morning (no goals), in-progress (daytime, not all done), review (≥20:00 or all done)

// computed from weekly batch:
unfinishedCount  // pending goals today
completedThisWeek // completed goals in last 7 days

// modeConfig:
morning:       { label: 'Morning Planning', accent: 'amber',  desc: 'Set your intentions' }
in-progress:   { label: 'In Progress',       accent: 'emerald',desc: 'Working through goals' }
review:        { label: 'Evening Review',    accent: 'pink',   desc: 'Reflect on your day' }
```

---

## 9. RESULT_NEW.md Design Language (must match visually)

The existing redesign (Chat, Connectors, Voice, Summary cards) set **Liveliness Level L2**:
- Dark Glass / dev-tool aesthetic (zinc base, pink accent for AI)
- **GlassCard**: rounded-xl, ring-1 borders, no shadows, optional accent left bar (2px)
- **SectionHead**: accent bar (h-8 w-1 rounded-full) + title (text-sm font-semibold) + desc (text-xs text-zinc-500) + right slot
- **StateShell**: 4-state loading/empty/error/ready with 150ms opacity crossfade
- **IconButton**: 32×32 / 44px hit area, tooltip, focus ring
- **StatusDot**: colored dot + label, optional `animate-breathe` ambient pulse
- **MOTION tokens**: fast 0.15 / normal 0.25 / slow 0.40; ease [0.16,1,0.3,1]; stagger 0.05
- **Reduced-motion guard**: global CSS `@media (prefers-reduced-motion: reduce)` collapse
- **p-5** max padding · **rounded-xl** max radius · **no box-shadow** · **transform+opacity only** for animation

Key RESULT_NEW.md excerpt for Focus/Plan/Reflect scope:
> "The remaining AiPage sections (Focus / Plan / Reflect) are out of scope for redesign but must keep their existing rhythm; new sections must visually match them."

---

## 10. IPC Endpoints Used by Focus/Plan/Reflect

| Channel | Usage | Returns |
|---|---|---|
| `getGoals(date)` | DailyPlanCard, GoalHistoryCard, AiPage (context) | `{ goals: Goal[], reviewSummary?: string }` |
| `saveGoal(date, goal)` | DailyPlanCard (toggle), LongTermPlanCard | void |
| `deleteGoal(id)` | LongTermPlanCard | void |
| `suggestGoals(today, context)` | DailyPlanCard (AI suggestions) | `{ success, suggestions: [{ title, category }] }` |
| `saveGoalReview(today, msg)` | DailyPlanCard (feedback) | `{ success }` |
| `getLongtermGoals()` | LongTermPlanCard | `{ success, goals: LongTermGoal[] }` |
| `saveGoalsBatch(goals[])` | LongTermPlanCard (bulk import) | void |
| `parseGoalDump(text)` | LongTermPlanCard (AI parsing) | `{ success, goals: [{ title, description?, category }] }` |
| `readPlanningMd()` | MyPlanCard, DailyPlanCard (planGoals) | `{ content?: string }` |
| `writePlanningMd(text)` | MyPlanCard | void |
| `getTopicDigest(opts?)` | TopicDigestCard | `{ success, topics, reason? }` |
| `onDigestGenerationComplete` | TopicDigestCard (event) | callback with data |
| `getGoalsBatch(start, end)` | AiPage (weekly context) | `{ success, days: GoalDay[] }` |
| `getGoalContext()` | DailyPlanCard (suggest context) | `{ success, last7dByCategory }` |

---

## 11. Frontend Design Skills (mandatory to apply)

Every design decision must be filtered through these 6 skills:

### motion-alive (Liveliness L2)
- L2 = micro-interactions + smooth state transitions + **exactly one** restrained ambient accent
- Duration scale: 150/250/400ms · ease `cubic-bezier(0.16,1,0.3,1)` · no spring · no parallax/particles
- transform + opacity only · stagger 0.04-0.06, total entrance < 400ms · reduced-motion collapses all

### impeccable
- 8px grid · z-index discipline (10 cards / 20 dropdowns / 30 modals / 40 toasts / 50 overlays)
- Modular type scale · 45-75ch measure · Geist + JetBrains Mono
- Accent discipline: one primary (pink), one secondary, one semantic
- **Anti-patterns**: never `opacity-50` on text, never `font-thin` on dark, never `rounded-2xl`/`-3xl`

### humancentred-UIUX
- 6 pillars: Clarity, Progressive Disclosure, Visual Hierarchy, Feedback, Forgiveness, Accessibility
- Every data-driven component: loading/empty/error/populated (4-state contract)
- Plain-language copy always · no raw enums/stack traces · meaning never by color alone
- Destructive actions confirm · input never wiped on error · hit areas ≥ 44px

### ui-ux-pro-max (Developer Tools industry style)
- Dark chrome, monospace dominance, high info density
- Deep zinc base, ONE vibrant accent (pink), syntax-highlighted code blocks
- Motion: fast (100-150ms), linear or ease-out, no bounce in serious tools
- Patterns: status bars, inline editing, tree views, split panes

### frontend-design
- Progressive disclosure · glass as structure (bg-zinc-900/50, backdrop-blur)
- Motion as feedback · type as UI (weight+color, not just size)
- **Anti-patterns**: no box-shadow, no pure black (#000), no animate width/height, no spring physics

### frontend-external-infra (MCP source routing)
- Never design from zero → pull from connected MCP servers
- **shadcn**: standard UI blocks (button, card, badge, input, tabs, dialog, tooltip, skeleton, progress, scroll-area, avatar, separator, dropdown-menu)
- **magicui**: animated effects (number-ticker, typing-animation, magic-card, animated-list, bento-grid)
- **lucide**: icons (Bot, Mic, Mail, CalendarDays, RefreshCw, Loader2, AlertCircle, Check, Copy, Trash2, Play, ChevronDown, Zap, Clock, Target, FolderGit2, Sparkles, Settings, RotateCcw, Send, Search, Brain, Flag, BookOpen, Edit3, Eye, Plus, X, ListChecks, TrendingUp, Circle, History, ExternalLink, Upload, FileText, ArrowUp, ArrowDown, CheckSquare, Square, Cpu)
- **reactbits**: animated components (CountUp, AnimatedList, SpotlightCard, MagicBento)
- All sourced components must be **re-skinned** to DeskFlow tokens (zinc/pink, rounded-xl, p-5 max, no shadow)

---

## 12. Key Types

```ts
type GoalCategory = 'work' | 'personal' | 'health' | 'learning';

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  target: { type: 'time' | 'completion'; targetSeconds?: number; matchCategory?: string; done?: boolean };
  period: string;
  status: string;       // 'completed' | 'pending' | 'dismissed' | 'in-progress' | 'slipped'
  date: string;         // YYYY-MM-DD
  source: string;
  links: { label: string; url: string }[];
  progressSeconds?: number;
  createdAt: string;
  completedAt?: string;
}

interface GoalDay {
  date: string;
  goals: Goal[];
  reviewSummary?: string;
}

interface LongTermGoal {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  target_seconds?: number;
  priority: number;
}

interface TopicDigestItem {
  topic: string;
  summary: string;
  sources?: { title: string; url: string }[];
}
```
