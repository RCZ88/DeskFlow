# CONTEXT_BUNDLE.md — AiPage Focus/Plan/Reflect Redesign

> Self-contained context for Architect AI. Contains all codebase context needed to design the complete solution.

---

## 1. Problem Statement

The Focus (DailyPlanCard), Plan (MyPlanCard + LongTermPlanCard), and Reflect (TopicDigestCard + GoalHistoryCard) sections of the AiPage are implemented as five separate card components that are cramped, poorly laid out, visually inconsistent, and lacking proper UX hierarchy. The user describes them as "look like shit" with a layout that "doesn't make sense." These 5 cards need a full visual and structural redesign using the project's design system, external MCP-sourced components, and all 6 frontend design skills.

---

## 2. Current Architecture

### AiPage (`src/pages/AiPage.tsx`)
- Page-level layout with sticky header, two-column grid (chat + context rail), then three sections stacked vertically: **Focus**, **Plan**, **Reflect**
- State management: local `useState` for all data (goals, suggestions, digests, plan items, providers)
- All data loaded via IPC calls (`window.deskflowAPI!`)

### Section Layout (current pseudocode)
```
Header (sticky, backdrop-blur)
└── Two-column grid
    ├── Right (col-span-8): AiChat
    └── Left (col-span-4): SummaryGrid + Connectors

Focus section
└── DailyPlanCard (365 lines, in GlassCard)

Plan section
└── Grid (1 col → 2 col md+)
    ├── MyPlanCard (158 lines, in GlassCard)
    └── LongTermPlanCard (604 lines, in GlassCard)

Reflect section
└── Stack
    ├── TopicDigestCard (155 lines, in GlassCard)
    └── GoalHistoryCard (153 lines, in GlassCard)

Footer
```

---

## 3. Existing Card Components (Full Source)

### 3a. DailyPlanCard (`src/components/DailyPlanCard.tsx` — 376 lines)

**Props:** goals, mode (morning|in-progress|review), suggestions, planGoals, review, loading, suggesting, saving, error, callbacks (onToggle, onSuggest, onAccept, onDismiss, onFeedback, onConfigure)

**States handled:** loading (skeleton), empty (brain icon + "Plan your day"), error (red banner), populated (pending goals + completed section + review metrics + feedback input)

**UI elements:**
- Header with Brain icon, title, progress ring SVG, mode badge, Suggest button, Configure provider
- "From your plan" section (small checklist items with time estimates)
- AI Suggestions section (sparkle items with Accept/Dismiss)
- Pending goals list (checkable circles, category badges, time estimates)
- Completed goals (collapsible checkmark section)
- Review mode (2-grid metrics: goals completed + carry over)
- Review summary banner (pink accent)
- Feedback input (text field + send button)

**Key visual issues:** Overly dense, poor whitespace, cramped categories, SVG progress ring is custom (not using any library), inconsistent use of ring-1 borders

### 3b. MyPlanCard (`src/components/MyPlanCard.tsx` — 158 lines)

**Props:** onPlanningSaved

**States handled:** loading (skeleton), ready (edit mode / preview mode + add-item UI), error (retry with reload)

**UI elements:**
- SectionHead with edit/preview toggle
- Editing mode: textarea for markdown
- Preview mode: monospace content display + Add item button
- Add item: inline input + Save/Cancel

**Key design issues:** Bare-bones textarea in a card, no rich editing, no visual hierarchy, feels like debug UI

### 3c. LongTermPlanCard (`src/components/LongTermPlanCard.tsx` — 604 lines)

**Props:** none (self-loading via IPC)

**States handled:** loading (skeleton), empty (flag icon + "No long-term goals"), error (retry), ready (two modes: manual + bulk)

**UI elements — MANUAL MODE:**
- SectionHead with Manual/Bulk toggle pills
- Add goal button (+ icon)
- Add form (title input, description textarea, category select, Add Goal button)
- Goal list (pending items with category dots, drag-like up/down reorder, delete)
- Completed section (collapsible, line-through style)

**UI elements — BULK MODE:**
- Textarea for brain-dumping goals
- "Analyze with AI" button → calls `parseGoalDump` IPC
- Loading state (pulsing brain icon)
- Error state (red banner + retry)
- Parsed goals preview (checkable items with title/category/description)
- "Import N goals" button
- Success toast

**IPC calls:** `getLongtermGoals()`, `saveGoal()`, `deleteGoal()`, `saveGoalsBatch()`, `parseGoalDump()`

### 3d. TopicDigestCard (`src/components/TopicDigestCard.tsx` — 155 lines)

**Props:** topics, loading, error, reason, onRefresh, onConfigure, providerBadge

**States handled:** loading (skeleton), empty (book icon + "No research topics"), error (retry), ready (topic accordion list)

**UI elements:**
- SectionHead with Refresh button + Provider badge
- Topic accordion items (click to expand/collapse with chevron animation)
- Expanded: summary text + source links (external link icon)

### 3e. GoalHistoryCard (`src/components/GoalHistoryCard.tsx` — 153 lines)

**Props:** none (self-loading via `getGoals()` for last 7 days)

**States handled:** loading (skeleton), empty (calendar icon + "No goal history"), error (retry), ready (date-grouped accordion)

**UI elements:**
- SectionHead "Goal History" with "Last 7 days" desc
- Date-grouped rows (click to expand)
- Expanded: goal list with status icons (CheckCircle2 for completed, X for dismissed, Circle for pending, Clock for in-progress)
- Review summary per date (pink accent banner)

---

## 4. Design System (`src/components/ai/`)

### Tokens (`tokens.ts`)
```typescript
export const SURFACE = {
  base:     'bg-zinc-950',
  card:     'bg-zinc-900/40',
  cardHi:   'bg-zinc-900/60',
  inset:    'bg-zinc-950/60',
}
export const RING = {
  base:   'ring-1 ring-zinc-800/60',
  hover:  'ring-zinc-700',
  active: 'ring-zinc-600',
  focus:  'focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:outline-none',
}
export const TEXT = {
  primary:   'text-zinc-100',
  secondary: 'text-zinc-400',
  muted:     'text-zinc-500',
  disabled:  'text-zinc-600',
}
export const ACCENT = {
  pink:    { dot:'bg-pink-400',    bar:'bg-pink-500',    pill:'bg-pink-500/10 text-pink-300 ring-pink-500/20',    hex:'#f472b6' },
  emerald: { dot:'bg-emerald-400', bar:'bg-emerald-500', pill:'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20', hex:'#10b981' },
  amber:   { dot:'bg-amber-400',   bar:'bg-amber-500',   pill:'bg-amber-500/10 text-amber-300 ring-amber-500/20',   hex:'#f59e0b' },
  violet:  { dot:'bg-violet-400',  bar:'bg-violet-500',  pill:'bg-violet-500/10 text-violet-300 ring-violet-500/20', hex:'#a78bfa' },
  red:     { dot:'bg-red-400',     bar:'bg-red-500',     pill:'bg-red-500/10 text-red-300 ring-red-500/20',       hex:'#f87171' },
}
export const MOTION = {
  fast: 0.15, normal: 0.25, slow: 0.40,
  ease: [0.16, 1, 0.3, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
  stagger: 0.05,
}
```

### GlassCard (`GlassCard.tsx`)
- `bg-zinc-900/40 ring-1 ring-zinc-800/60 hover:ring-zinc-700 hover:bg-zinc-900/60`
- Optional accent bar on left (0.5rem wide)
- `rounded-xl p-5` with `whileHover={{ y: -2 }}`

### SectionHead (`SectionHead.tsx`)
- Accent bar + title + description + optional right slot
- 28px fixed height bar, rounded-full

### StateShell (`StateShell.tsx`)
- Generic state machine: `loading | empty | error | ready`
- `AnimatePresence` transitions between states
- Error shows red icon + message + retry button

### IconButton (`IconButton.tsx`)
- 32×32 grid button with hover/disabled/focus states
- Lucide icon, `min-w-[44px] min-h-[44px]` for accessibility

### StatusDot (`StatusDot.tsx`)
- 6px dot + label text
- Optional `animate-breathe` class for pulsing

---

## 5. Project Conventions

- **Dark mode only** — all backgrounds are `zinc-950`, cards `zinc-900/40`
- **Tailwind v4** (or v3 — check `postcss.config.js`). Uses `zinc-*` palette
- **Framer Motion** for all animations (imported as `motion`)
- **Lucide React** for all icons
- **CRLF** line endings — preserve, don't mass-reformat
- Every data-driven component must handle: loading, empty, error, and populated states
- All `localStorage` access wrapped in try/catch
- Prefer renderer-side fixes; read FULL IPC handler before editing `main.ts`

---

## 6. Re-Skin Rules (for MCP-sourced components)

When pulling components from shadcn/Magic UI/ReactBits:

1. **Colors**: Replace source colors with DeskFlow tokens (`--bg-primary`, etc.)
2. **Border radius**: Max `rounded-xl` (12px). Never `rounded-2xl` or `rounded-3xl`
3. **Card padding**: Use `p-5` (20px). Never `p-6` or `p-8`
4. **Fonts**: Body = Geist/Inter (13px). Mono = JetBrains Mono. Headings use weight (600)
5. **Dark mode only**: Strip any light-mode variants
6. **Glass layer**: Use `glass` or `glass-heavy` classes where depth is needed
7. **Animation**: Respect `prefers-reduced-motion`

### Anti-Slop Checklist (run after re-skinning every sourced component)

- [ ] **Type**: Is the component appropriate for the role? (e.g. bento-grid for metrics, not for a form)
- [ ] **Color**: All colors replaced with DeskFlow tokens? No source colors leaking?
- [ ] **Geometry**: Max rounded-xl, max p-5? No rounded-2xl/3xl or p-6/8?
- [ ] **Hero pattern**: Not using a generic hero/landing layout for an app component?
- [ ] **Section labels**: Clear hierarchy with SectionHead pattern?
- [ ] **Motion**: Spring easing uses DeskFlow MOTION tokens, respects reduced-motion?
- [ ] **Imagery**: No decorative-only images unless specifically designed?
- [ ] **Empty states**: Every data component has an empty state with icon + message?
- [ ] **Icons**: Using Lucide icons (not Heroicons, not FontAwesome)?
- [ ] **Accessibility**: Interactive elements are keyboard-focusable, have aria labels?

---

## 7. Available MCP Components — Full Source & API (Self-Contained)

> The Architect AI cannot call MCP tools. All component source code, props interfaces, install commands, and usage patterns are inlined below. Adapt these to DeskFlow tokens using the re-skin rules in §6.

---

### Magic UI: AnimatedList

**Install:** `npx shadcn@latest add "https://magicui.design/r/animated-list.json"`

**Source:** Uses `motion/react` (framer-motion) `AnimatePresence` + `motion.div`.

```tsx
export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode
  delay?: number   // ms between items, default 1000
}

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations: MotionProps = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: "spring", stiffness: 350, damping: 40 },
  }
  return <motion.div {...animations} layout className="mx-auto w-full">{children}</motion.div>
}

export const AnimatedList = React.memo(({ children, className, delay = 1000 }: AnimatedListProps) => {
  const [index, setIndex] = useState(0)
  const childrenArray = React.Children.toArray(children)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null)
  useEffect(() => {
    // cycles setIndex, revealing items one by one
    intervalRef.current = setInterval(() => setIndex((prev) => prev + 1), delay)
    return () => clearInterval(intervalRef.current)
  }, [childrenArray.length, delay])
  const itemsToShow = childrenArray.slice(0, index + 1).reverse()
  return (
    <div className={cn(`flex flex-col items-center gap-4`, className)}>
      <AnimatePresence>
        {itemsToShow.map((item) => <AnimatedListItem key={...}>{item}</AnimatedListItem>)}
      </AnimatePresence>
    </div>
  )
})
```

**Re-skin:** Replace `gap-4` with `gap-1.5`. Use DeskFlow tokens on list items.

---

### Magic UI: NumberTicker

**Install:** `npx shadcn@latest add "https://magicui.design/r/number-ticker.json"`

**Source:** Uses `useMotionValue` + `useSpring` + `useInView` from framer-motion.

```tsx
export interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number          // default 0
  direction?: "up" | "down"   // default up
  delay?: number               // seconds delay, default 0
  decimalPlaces?: number       // default 0
}

export function NumberTicker({ value, startValue = 0, direction = "up", delay = 0, className, decimalPlaces = 0 }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(direction === "down" ? value : startValue)
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 })
  const isInView = useInView(ref, { once: true, margin: "0px" })
  useEffect(() => {
    // on inView, animate from startValue → value
    if (isInView) {
      setTimeout(() => motionValue.set(direction === "down" ? startValue : value), delay * 1000)
    }
  }, [motionValue, isInView, delay, value, direction, startValue])
  // springValue.on("change", latest) → ref.current.textContent = Intl format
  return <span ref={ref} className={cn("inline-block tracking-wider tabular-nums", className)}>{startValue}</span>
}
```

**Re-skin:** Remove `text-black dark:text-white`. Use `text-zinc-100 tabular-nums`. `tracking-wider` is fine.

---

### Magic UI: BentoGrid + BentoCard

**Install:** `npx shadcn@latest add "https://magicui.design/r/bento-grid.json"`

**Source:**
```tsx
interface BentoGridProps {
  children: ReactNode
  className?: string
}
// Default grid: grid w-full auto-rows-[22rem] grid-cols-3 gap-4

interface BentoCardProps {
  name: string
  className: string          // col-span-3 lg:col-span-1 etc
  background: ReactNode      // content behind the card
  Icon: React.ElementType
  description: string
  href?: string
  cta?: string
}
```

**Re-skin:** Replace `bg-background dark:[box-shadow:...]` with `bg-zinc-900/40 ring-1 ring-zinc-800/60`. Strip CTA landing-page patterns. Use for Focus overview: 2-3 metrics.

---

### ReactBits: AnimatedContent (GSAP)

```tsx
interface AnimatedContentProps {
  children: React.ReactNode
  distance?: number       // default 100
  direction?: 'vertical' | 'horizontal'
  reverse?: boolean
  duration?: number       // default 0.8
  ease?: string           // default "power3.out"
  initialOpacity?: number // default 0
  scale?: number          // default 1
  threshold?: number      // default 0.1
  delay?: number          // seconds
}
```

GSAP + ScrollTrigger based. Check if `gsap` is in package.json before using. Fallback: framer-motion `useInView` + `motion.div` with `initial={{ opacity: 0, y: 20 }}` + `whileInView={{ opacity: 1, y: 0 }}`.

### ReactBits: GlareHover
Tracks cursor position on hover, renders a glare overlay. Re-skin colors.

### ReactBits: Magnet
Magnetic pull effect on buttons. Subtle — use sparingly.

---

### shadcn/ui Components

All use `@radix-ui/*` under the hood. Each is a wrapper with DeskFlow-styled defaults.

**Progress** — `npx shadcn@latest add @shadcn/progress`
```tsx
// Uses @radix-ui/react-progress
// Re-skin: indicator bg = accent color, track bg = zinc-800/60
```

**Collapsible** — `npx shadcn@latest add @shadcn/collapsible`
```tsx
// Uses @radix-ui/react-collapsible
// <Collapsible> → <CollapsibleTrigger>chevron</CollapsibleTrigger> → <CollapsibleContent>body</CollapsibleContent>
// Replaces current custom AnimatePresence accordion patterns
```

**Dialog** — `npx shadcn@latest add @shadcn/dialog`
```tsx
// Uses @radix-ui/react-dialog
// Re-skin: DialogContent bg-zinc-900 ring-1 ring-zinc-800/60 rounded-xl p-5
// Overlay: bg-black/50 backdrop-blur-sm
```

**AlertDialog** — `npx shadcn@latest add @shadcn/alert-dialog`
```tsx
// Uses @radix-ui/react-alert-dialog
// Same re-skin as Dialog
```

---

## 8. IPC Endpoints (Backend Infrastructure)

| Channel | Purpose | Status |
|---------|---------|--------|
| `getGoals(date)` | Fetch goals for a specific day | ✅ Real |
| `saveGoal(date, goal)` | Save/create goal | ✅ Real |
| `deleteGoal(id)` | Delete goal by ID | ✅ Real |
| `saveGoalsBatch(batch)` | Bulk save goals | ✅ Real |
| `getLongtermGoals()` | Fetch all longterm goals | ✅ Real |
| `getGoalContext()` | Return context stats for suggestion | ✅ Real |
| `suggestGoals(date, context)` | AI-generated goal suggestions | ✅ Real |
| `saveGoalReview(date, msg)` | Save daily review summary | ✅ Real |
| `readPlanningMd()` | Read planning.md content | ✅ Real |
| `writePlanningMd(text)` | Write planning.md content | ✅ Real |
| `parseGoalDump(text)` | AI: parse brain dump into goals | ✅ Real |
| `getTopicDigest(opts?)` | Fetch research topics | ✅ Real |
| `isDigestGenerating()` | Check if digest generating | ✅ Real |
| `onDigestGenerationComplete(cb)` | Event: digest done | ✅ Real |

---

## 9. Data Types

```typescript
type GoalCategory = 'work' | 'personal' | 'health' | 'learning' | 'finance' | 'relationships';
type Mode = 'morning' | 'in-progress' | 'review';

interface GoalTarget {
  type: 'time' | 'completion';
  targetSeconds?: number;
  matchCategory?: string;
  done?: boolean;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  target: GoalTarget;
  period: string;
  status: string;
  date: string;
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

---

## 10. Design Skills (All Must Be Applied)

| Skill | Focus | File Location |
|-------|-------|--------------|
| `frontend-external-infra` | Component sourcing from MCP servers | `agent/skills/frontend-external-infra/SKILL.md` |
| `frontend-design` | DeskFlow-specific UI patterns | (file-based, check codebase) |
| `humancentred-UIUX` | State coverage, clarity, progressive disclosure | `agent/skills/humancentred-UIUX/SKILL.md` |
| `impeccable` | Typography, color, motion, spatial, interaction | `agent/skills/impeccable/SKILL.md` |
| `motion-alive` | Motion design for interfaces | (file-based) |
| `ui-ux-pro-max` | Advanced interaction patterns | (file-based) |

---

## 11. Layout Requirements

- **Must work at typical 1280px+ width** (the AiPage max-w-6xl container)
- **Responsive**: single-column mobile → multi-column desktop
- **Section order on AiPage**: Focus → Plan → Reflect (top to bottom)
- **Plan section** currently uses `md:grid-cols-2` for MyPlanCard + LongTermPlanCard side by side
- **Reflect section** currently stacks TopicDigestCard above GoalHistoryCard
- **All 3 sections** have mobile accordion collapse (click on SectionHead toggles visibility)
