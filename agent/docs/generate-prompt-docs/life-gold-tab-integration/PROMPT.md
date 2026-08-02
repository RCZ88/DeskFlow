# Gold/Goals Tab — Life Page Integration

## Raw Request

> "Add a Gold/Goals tab to the Life page. It should be a third tab alongside Covenant and Memories. The tab should let users create, edit, delete, and track daily goals with a calendar strip, category system, time tracking, streak display, and focus session integration. It should use the warmth design system (WarmCard, warmth tokens) and fit inside the existing LifePage tab pattern."

---

## Context Bundle Reference

**Read `CONTEXT_BUNDLE.md` first.** It contains the complete source code for every file listed below. You have no codebase access — the context bundle IS your codebase.

**Files referenced in this prompt:**
- `src/features/warmth/LifePage.tsx` (111 lines) — tab system with `?tab=` URL state
- `src/features/warmth/WarmCard.tsx` (18 lines) — reusable warm-themed card wrapper
- `src/features/warmth/warmth-tokens.css` (109 lines) — design tokens (aurora, shimmer, easing)
- `src/components/dashboard/types.ts` (lines 1-97) — Goal, LongTermGoal, GoalTarget, GoalCategory, GoalPeriod, GoalStatus, GoalLink types
- `src/components/goals/GoalCard.tsx` (237 lines) — goal card with toggle/delete/edit, streak, detection, confetti
- `src/components/goals/CalendarStrip.tsx` (100 lines) — horizontal date picker with week shift
- `src/components/goals/CriteriaBuilder.tsx` (250 lines) — goal creation/edit form with CriteriaForm type
- `src/hooks/useFocusGoals.ts` (154 lines) — focus session goal tracking hook
- `src/pages/GoalsPage.tsx` (422 lines) — existing goals page (full CRUD reference)
- `src/main.ts` goals DDL (lines 2744-2780) — goals table + reminders table schema
- `src/main.ts` goals IPC (lines 16121-16563) — all goal + reminder handlers
- `src/preload.ts` (lines 889-930) — goal/reminder method bindings
- `src/components/ui/confetti.ts` — confetti utility

---

## Embedded Skills

The following skills are embedded in this prompt because you have no skill system. Follow them exactly.

### 1. Frontend Design (DeskFlow-specific)

**Core Principles:**
1. Progressive Disclosure — Show what matters, hide complexity. Use tabs, sections, accordions, "Advanced" toggles.
2. Density Without Clutter — 8px grid, tight spacing, visual hierarchy through color weight.
3. Glass as Structure — `backdrop-filter: blur()` for spatial depth. Dark glass cards: `bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50`.
4. Motion as Feedback — 150-300ms transitions. Never animate width/height/top/left. Use transform and opacity only.
5. Type as UI — Typography carries 60% of visual hierarchy. Use weight and color temperature.

**Anti-Patterns (NEVER):**
- NEVER use `box-shadow` for elevation in dark themes
- NEVER use pure black (`#000`) backgrounds — always `zinc-950` or `slate-950`
- NEVER use more than 2 font families in a single view
- NEVER animate `width`, `height`, `top`, `left` — triggers layout recalculation
- NEVER use default browser focus rings
- NEVER place interactive elements closer than 44px touch targets
- NEVER use `rounded-2xl` (16px) or `rounded-3xl` (24px) — max is `rounded-xl` (12px)
- NEVER use spring physics in developer tools — use cubic-bezier easing

**Color System:**
```
Background:     zinc-950 (base), zinc-900 (elevated), zinc-900/50 (glass)
Primary:        pink-500 (accent), pink-400 (hover), pink-600 (active)
Secondary:      cyan-400 (info), emerald-400 (success), amber-400 (warning)
Text:           zinc-100 (primary), zinc-400 (secondary), zinc-600 (disabled)
Border:         zinc-800 (subtle), zinc-700 (active), zinc-600/50 (glass edge)
```

**Per-Page Accent Colors:**
| Page | Accent |
|------|--------|
| Dashboard | pink-500 |
| Stats | cyan-400 |
| Browser | sky-400 |
| IDE Projects | violet-500 |
| External | amber-400 |
| **Life/Gold** | **amber-400 (#fbbf24)** |

**Spacing Scale:**
```
xs: 4px   (icon padding, tight inline)
sm: 8px   (component internal padding)
md: 12px  (card padding, list items)
lg: 16px  (section gaps)
xl: 24px  (page sections)
2xl: 32px (major divisions)
```

**Animation Tokens:**
```
fast:    150ms (hover states, toggles)
normal:  250ms (modals, dropdowns)
slow:    400ms (page transitions)
ease-out: cubic-bezier(0.16, 1, 0.3, 1)
```

**Typography Scale:**
```
Badge:      11px/500     — status badges, category pills
Meta:       12px/400     — timestamps, secondary info
Body:       13px/400     — default body text
Body+:      14px/400     — stat values, card content
Card title: 13px/600     — section headings within cards
Section h2: 15px/600     — section titles
Page title: 18px/600     — ALL page h1 titles
Display:    24-32px/700  — timer values, hero score badges
```

**Card Padding Standard:** ALL card padding → `p-5` (20px). Never `p-6` or `p-8`.
**Border Radius Maximum:** ALL cards, modals, containers → `rounded-xl` (12px). Never `rounded-2xl` or `rounded-3xl`.

**Component Patterns:**

*GlassCard (Default):*
```tsx
<div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5 hover:border-zinc-700/60 transition-colors duration-150">
```

*SectionHeader:*
```tsx
// Icon container: w-9 h-9 rounded-lg bg-[var(--page-accent)]/15
// Icon: w-4.5 h-4.5 text-[var(--page-accent)]
// Title: text-lg font-semibold
```

*EmptyState:*
```tsx
// Centered flex-col with icon, title, description, optional CTA button
// text-zinc-500, icon at opacity-30
```

*LoadingState:*
```tsx
// Skeleton pattern: animate-pulse bg-zinc-800 rounded
// NOT just a spinner — pulse containers matching content shape
```

*Status Badge:*
```tsx
// px-2 py-0.5 rounded-full text-xs font-medium bg-{color}/10 text-{color} border-{color}/20
```

### 2. Human-Centric UX

**The 6 Pillars:**

1. **Clarity Over Cleverness** — Every label, button, tooltip, placeholder, error in plain human language. Primary action obvious within 1 second. Icons never alone for non-universal actions.

2. **Progressive Disclosure** — Show what matters now; hide complexity. Use tabs, sections, accordions, "Advanced" toggles. Default to common case.

3. **Visual Hierarchy** — Guide the eye with weight, color temperature, spacing. Most important = highest contrast. Metadata = muted.

4. **Complete State Coverage (THE #1 ANTI-SLOP RULE):**
   - **Empty** — icon + friendly one-line explanation + clear CTA. Never blank box.
   - **Loading** — skeleton placeholders matching content shape. Not spinner.
   - **Error** — plain-language cause + recovery action. Never raw JSON.
   - **Populated** — normal state.
   - **Partial / Overflow** — long text truncation, large lists paginated.

5. **Feedback & Micro-interactions** — Every interactive element has hover, focus, active, disabled states. 150-300ms transitions. Destructive actions require confirmation. Immediate feedback on submit.

6. **Forgiveness & Affordance** — Clickable vs static obvious. Touch targets ≥ 44px. Inputs validate inline. Keyboard navigation works.

**Anti-Patterns (NEVER):**
- NEVER expose raw system identifiers or stack traces
- NEVER render data view without Empty/Loading/Error states
- NEVER present flat wall of equally-weighted elements
- NEVER dump every setting/field/action onto one screen
- NEVER trigger silent action with no feedback
- NEVER destroy user input without confirmation or undo
- NEVER rely on color alone to convey meaning
- NEVER use icon-only buttons for non-obvious actions without label/tooltip
- NEVER prioritize "cool" visual at cost of comprehension

### 3. Frontend External Infrastructure (MCP Source Routing)

**Connected MCP Servers:**

| Server | What it gives | When to use |
|--------|--------------|-------------|
| **shadcn** | 61 Tailwind v4+React components: accordion, alert, badge, button, calendar, card, chart, checkbox, collapsible, combobox, command, dialog, drawer, dropdown-menu, form, hover-card, input, label, popover, progress, radio-group, scroll-area, select, separator, sheet, skeleton, slider, switch, table, tabs, textarea, toggle, tooltip | Standard UI blocks |
| **magicui** | 247 animated components: animated-beam, border-beam, number-ticker, particles, confetti, shimmer-button, magic-card, bento-grid, blur-fade, dock, dot-pattern, flickering-grid, glare-hover, globe, highlighter, marquee, meteors, neon-gradient-card, ripple, scroll-progress, animated-circular-progress-bar | Animated effects |
| **lucide** | 1500+ clean SVG icons | Any icon need |
| **@21st-dev/magic** | Prompt-to-component generation | Specific component variations |
| **reactbits** | 135+ animated React components (CSS + Tailwind) | Text animations, particle effects |
| **iconify** | 200,000+ icons across 200+ sets | When lucide lacks the icon |

**Source Routing (what to reach for):**
| You need… | Use… |
|-----------|------|
| Standard UI block (form, table, dialog, card, nav) | shadcn MCP |
| Animated effect (beam, particles, confetti, text animation) | magicui MCP |
| An icon | lucide MCP |
| A specific component from text description | @21st-dev/magic |
| Animated component variant | reactbits MCP |
| An icon lucide doesn't have | iconify MCP |

**Re-Skin Rules (MANDATORY after pulling from any source):**
1. Colors → DeskFlow CSS vars (`--bg-primary`, `--accent-primary`, etc.)
2. Border radius → Max `rounded-xl` (12px)
3. Card padding → `p-5` (20px)
4. Fonts → Body = Geist/Inter (13px), Mono = JetBrains Mono
5. Dark mode only — strip light-mode variants
6. Glass layer → `bg-zinc-900/60 backdrop-blur-xl` instead of opaque backgrounds
7. Animation respects reduced motion

### 4. Warmth Design System (Life Page Specific)

**Tokens:**
```css
--warmth-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--warmth-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--warmth-dur-fast: 120ms;
--warmth-dur-base: 220ms;
--warmth-dur-slow: 420ms;
```

**Classes:**
- `.warmth-serif` — Source Serif 4 font
- `.warmth-aurora` — radial-gradient overlay (green + warm tones)
- `.warmth-shimmer` — shimmer sweep animation

**WarmCard:**
```tsx
<div className={`relative rounded-xl border border-zinc-800/50 p-4 ${ambient ? 'bg-zinc-900/20' : 'bg-zinc-900/60'} ${className}`}>
  {ambient && <div className="warmth-aurora" />}
  <div className="relative z-10">{children}</div>
</div>
```

**Goal Card Styles:**
- Container: `bg-[rgba(24,24,27,0.55)] backdrop-blur-xl border border-[rgba(63,63,70,0.40)]`
- Top gradient: `bg-gradient-to-r from-violet-500/20 via-violet-500/5 to-transparent`
- Category colors: work=pink, personal=violet, health=emerald, learning=cyan, finance=amber, relationships=rose
- Toggle done: `bg-emerald-500 border-emerald-500`
- Progress bar: `bg-gradient-to-r from-violet-500 to-violet-400`

**CalendarStrip Styles:**
- Selected: `bg-violet-500/15 text-violet-300 border border-violet-500/25`
- Today: `bg-zinc-800/40 text-zinc-300 border border-zinc-700/30`
- Default: `bg-zinc-900/40 text-zinc-500 border border-transparent`

**LifePage Tab Pill:**
- Inactive: `text-zinc-500 hover:text-zinc-300`
- Active pill: `{ background: '${accent}22', border: '1px solid ${accent}40' }`
- Spring transition: `{ type: 'spring', stiffness: 400, damping: 32 }`

---

## Engineering Task

### 1. Create `GoldPage.tsx`

**Location:** `src/features/warmth/gold/GoldPage.tsx`

**State management (adapt from GoalsPage.tsx):**
```tsx
const [selectedDate, setSelectedDate] = useState(todayStr());
const [goals, setGoals] = useState<Goal[]>([]);
const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [isAdding, setIsAdding] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);
const [editForm, setEditForm] = useState<Partial<Goal>>({});
const [newCriteria, setNewCriteria] = useState<CriteriaForm>(defaultCriteria);
const [showCompleted, setShowCompleted] = useState(false);
const [reminders, setReminders] = useState<Reminder[]>([]);
const [showReminders, setShowReminders] = useState(false);
const [newReminder, setNewReminder] = useState('');
const [reviewSummary, setReviewSummary] = useState<string | null>(null);
```

**API calls (all via `window.deskflowAPI`):**
```tsx
const api = window.deskflowAPI;
// Load goals for date
const result = await api.getGoals(date);        // returns { goals: Goal[] }
// Load long-term goals
const result = await api.getLongtermGoals();     // returns { goals: LongTermGoal[] }
// Save goal (upsert)
await api.saveGoal(date, goal);
// Delete goal
await api.deleteGoal(goalId);
// Save review
await api.saveGoalReview(date, summary);
// Get review
const result = await api.getGoalReview(date);    // returns { review: { summary } }
// AI suggestion
await api.saveGoalSuggestion(data);
// Reminders
const result = await api.getReminders();          // returns { reminders: Reminder[] }
await api.createReminder({ text, dueDate, goalId });
await api.updateReminder(id, { done: !done });
await api.deleteReminder(id);
```

**CRUD operations:**
- **Add:** `CriteriaBuilder` form → `api.saveGoal(date, goal)` → optimistic update
- **Edit:** Inline edit on GoalCard → `api.saveGoal(date, { ...goal, ...patch })`
- **Delete:** Two-click confirm on GoalCard → `api.deleteGoal(goalId)`
- **Toggle:** Click checkbox → `api.saveGoal(date, { ...goal, status: newStatus })` + confetti
- **Long-term:** Load via `api.getLongtermGoals()`, display in sidebar, toggle/delete

**Focus integration:**
```tsx
const { focusState, activeGoalIds, getAccumulatedSeconds } = useFocusGoals(goals as any);
```
- Display focus state indicator when active
- Show real-time progress accumulation on time-based goals

**Layout:**
```
┌──────────────────────────────────────────────────┐
│  CalendarStrip (horizontal date picker)          │
├──────────────────────────────────────────────────┤
│  ┌─── Stats Sidebar ───┐  ┌─── Goal List ──────┐ │
│  │ Active/Completed    │  │ Date label + Add   │ │
│  │ Streak count        │  │ GoalCard list      │ │
│  │ In Focus count      │  │ GoalCardSkeleton   │ │
│  │ Long-term goals     │  │ GoalEmptyState     │ │
│  │ Reminders           │  │ GoalErrorState     │ │
│  └─────────────────────┘  │ Completed section  │ │
│                           │ Review summary     │ │
│                           └────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 2. Modify `LifePage.tsx`

**Add to TABS array:**
```tsx
{ key: 'gold', label: 'Gold', icon: Target, accent: '#fbbf24' }
```

**Add import:**
```tsx
import GoldPage from './gold/GoldPage';
```

**Add render block:**
```tsx
{activeTab === 'gold' && (
  <motion.div
    key="gold"
    initial={crossfade.initial}
    animate={crossfade.animate}
    exit={crossfade.exit}
    transition={crossfade.transition}
    className="max-w-5xl mx-auto"
  >
    <GoldPage />
  </motion.div>
)}
```

**Update useState initializer:**
```tsx
if (tab === 'memories' || tab === 'gold') return tab as TabKey;
```

---

## Design Task

### Visual Spec

**Tab pill:** Amber accent (`#fbbf24`). Pill background: `rgba(251,191,36,0.13)`. Pill border: `1px solid rgba(251,191,36,0.25)`.

**CalendarStrip:** Reuse existing component exactly. No visual changes.

**Goal Cards:** Reuse `GoalCard` component exactly. Wrap in `WarmCard` with `ambient` prop for the aurora glow effect.

**Stats sidebar cards:**
- Use `WarmCard` with `ambient` prop
- Streak display: amber flame icon (`Flame` from lucide) + count
- Active/Completed counts: emerald for completed, zinc for active
- Long-term goals: checkmark list with toggle
- Focus indicator: violet badge when focus session active

**Reminders sidebar:**
- Use `WarmCard` with amber accent border (`border-amber-500/20`)
- Input: amber-tinted focus ring (`focus:border-amber-500/50`)
- Reminder items: checkbox + text + delete on hover

**Empty state:** Use `GoalEmptyState` with amber accent ("No goals yet — start building your streak")

**Loading:** Use `GoalCardSkeleton` (pulse animation)

**Error:** Use `GoalErrorState` with retry button

### Color Palette

| Element | Color | CSS |
|---------|-------|-----|
| Tab accent | `#fbbf24` | amber-400 |
| Tab pill bg | `rgba(251,191,36,0.13)` | `bg-amber-400/[0.13]` |
| Tab pill border | `rgba(251,191,36,0.25)` | `border-amber-400/[0.25]` |
| Goal card bg | `rgba(24,24,27,0.55)` | `bg-[rgba(24,24,27,0.55)]` |
| Goal card border | `rgba(63,63,70,0.40)` | `border-[rgba(63,63,70,0.40)]` |
| Toggle done | emerald-500 | `bg-emerald-500` |
| Progress bar | violet gradient | `from-violet-500 to-violet-400` |
| Streak flame | amber-400 | `text-amber-400` |
| Reminder border | amber-500/20 | `border-amber-500/20` |
| Category: work | pink-500/10 | `bg-pink-500/10 text-pink-400 border-pink-500/20` |
| Category: personal | violet-500/10 | `bg-violet-500/10 text-violet-400 border-violet-500/20` |
| Category: health | emerald-500/10 | `bg-emerald-500/10 text-emerald-400 border-emerald-500/20` |
| Category: learning | cyan-500/10 | `bg-cyan-500/10 text-cyan-400 border-cyan-500/20` |
| Category: finance | amber-500/10 | `bg-amber-500/10 text-amber-400 border-amber-500/20` |
| Category: relationships | rose-500/10 | `bg-rose-500/10 text-rose-400 border-rose-500/20` |

### Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Goal title | 13px | 400 | zinc-200 |
| Goal title (done) | 13px | 400 | zinc-500 line-through |
| Goal description | 11px | 400 | zinc-600 |
| Category badge | 10px | 500 | per-category color |
| Stats labels | 11px | 400 | zinc-500 |
| Stats values | 13px | 600 | zinc-300 or emerald-400 |
| Section headers | 12px | 500 | zinc-400 |
| Date label | 14px | 500 | zinc-300 |
| Add button | 12px | 500 | violet-300 |
| Reminder text | 12px | 400 | zinc-300 |
| Reminder done | 12px | 400 | zinc-600 line-through |
| Streak count | 20px | 700 | zinc-100 tabular-nums |

### Spacing

| Element | Padding | Gap | Radius |
|---------|---------|-----|--------|
| WarmCard | p-4 | — | rounded-xl |
| Goal card | p-4 | gap-3 (icon to content) | rounded-xl |
| CalendarStrip | p-3 | gap-1 (between days) | rounded-xl |
| Stats section | p-4 | space-y-3 | rounded-xl |
| Reminder input | px-2.5 py-1.5 | gap-1.5 | rounded-lg |
| Reminder item | py-1 px-1.5 | gap-2 | rounded-lg |
| Add form | p-4 | space-y-3 | rounded-xl |
| Completed section | p-4 | space-y-1.5 | rounded-xl |

---

## UX Task

### Interaction Flow

1. **Tab switch:** Click "Gold" pill → crossfade animation → GoldPage mounts → loads goals for today
2. **Date change:** Click CalendarStrip date → goals reload with crossfade
3. **Add goal:** Click "Add Goal" → CriteriaBuilder slides open → fill form → press Enter or click Save → goal appears with confetti → form closes
4. **Edit goal:** Hover goal → click Edit icon → inline title edit → press Enter or click Save
5. **Delete goal:** Hover goal → click Delete icon → button turns red ("Click again to confirm") → 3s timeout → confirm → goal removed
6. **Toggle complete:** Click checkbox → confetti burst → progress bar fills → status updates
7. **Focus tracking:** When focus session active → matching goals show real-time progress → auto-complete at target
8. **Add reminder:** Type in reminder input → press Enter → reminder appears in list
9. **Toggle reminder:** Click checkbox → strikethrough text → done state
10. **Delete reminder:** Hover → click delete icon → removed

### Empty States

| State | Component | Message |
|-------|-----------|---------|
| No goals for date | `GoalEmptyState` | "No goals for this day — add one or check another date" |
| No long-term goals | Text | "No long-term goals yet" |
| No reminders | Text | "No reminders" |
| Loading | `GoalCardSkeleton` | Pulse animation |
| Error | `GoalErrorState` | Error message + retry button |
| No completed | Hidden | Section hidden entirely |

### Edge Cases

| Case | Behavior |
|------|----------|
| Date with no goals | Show empty state, not error |
| Rapid CRUD | Optimistic updates (update local state immediately, revert on error) |
| Long load (>300ms) | Skeleton |
| IPC failure | Error state with retry |
| Focus session active | Show indicator, accumulate progress, persist on tab switch |
| Very long goal title | Truncate with `truncate` class |
| Many goals (>20) | Scroll within main content area |
| Calendar past dates | Goals load normally, review summary shows if available |
| Calendar future dates | Goals load normally (allow planning ahead) |

---

## Constraints

1. **NO backend changes.** All IPC, DB, and preload already exist. Build on them.
2. **NO new components.** Reuse CalendarStrip, GoalCard, CriteriaBuilder, GoalCardSkeleton, GoalEmptyState, GoalErrorState, WarmCard, confetti.
3. **NO new IPC channels.** Use existing: get-goals, save-goal, delete-goal, get-longterm-goals, save-goal-review, get-goal-review, save-goal-suggestion, create-reminder, get-reminders, update-reminder, delete-reminder.
4. **Follow warmth design system.** Use WarmCard, warmth tokens, amber accent for Gold tab.
5. **Follow LifePage tab pattern.** Exact same TABS array + AnimatePresence + crossfade structure.
6. **Full CRUD required.** Add, edit, delete, toggle complete — all must work.
7. **Focus integration required.** Import and use useFocusGoals hook.
8. **Reminders required.** Show in sidebar, create/toggle/delete.
9. **Chart axes in minutes/hours.** Never raw seconds.
10. **Dark mode only.** No light mode support needed.
11. **Re-skin all MCP components.** Apply DeskFlow tokens after pulling from any source.
12. **Empty/Loading/Error states mandatory.** Every data-driven component must have all 4 states.
13. **Accessible.** Focus rings, keyboard nav, aria labels on interactive elements.
14. **Reduced motion.** Wrap animations in `@media (prefers-reduced-motion: reduce)`.
15. **No AI slop.** No purple gradients on everything, no generic hero sections, no stock imagery.

---

## MCP Inventory

### shadcn (61 components available)

| Component | Source | Use for in Gold Tab |
|-----------|--------|---------------------|
| `Input` | shadcn | Goal title, description, reminder input, search |
| `Select` | shadcn | Category dropdown, period dropdown, target type |
| `Switch` | shadcn | Detection toggle, advanced settings toggle |
| `Badge` | shadcn | Category badges, status indicators |
| `Button` | shadcn | Add goal, save, cancel, delete actions |
| `Progress` | shadcn | Goal progress bar (alternative to custom) |
| `Skeleton` | shadcn | Loading states (alternative to GoalCardSkeleton) |
| `Separator` | shadcn | Visual dividers between sections |
| `Tooltip` | shadcn | Hover hints on icon buttons |
| `Card` | shadcn | Container (but prefer WarmCard) |
| `Dialog` | shadcn | Confirmation dialogs for destructive actions |
| `ScrollArea` | shadcn | Scrollable goal list if many goals |
| `Collapsible` | shadcn | Advanced settings accordion |
| `Tabs` | shadcn | Sub-tabs within Gold tab (if needed) |

### Magic UI (247 components available)

| Component | Source | Use for in Gold Tab |
|-----------|--------|---------------------|
| `NumberTicker` | Magic UI | Animated streak count, goal count |
| `BorderBeam` | Magic UI | Glow effect on active focus goal card |
| `Particles` | Magic UI | Background effect behind stats section |
| `Confetti` | Magic UI | Already using custom confetti — keep as-is |
| `ShimmerButton` | Magic UI | "Add Goal" button shimmer effect |
| `MagicCard` | Magic UI | Mouse-following gradient on stats cards |
| `AnimatedCircularProgressBar` | Magic UI | Circular progress for daily completion % |
| `BlurFade` | Magic UI | Fade-in animation for goal cards |
| `DotPattern` | Magic UI | Subtle background texture |
| `Ripple` | Magic UI | Click ripple on goal cards |

### Lucide Icons (1500+ available)

| Icon | Use for |
|------|---------|
| `Target` | Gold tab icon, empty state, goal type indicator |
| `Flame` | Streak display, review section header |
| `Clock` | Time targets, period indicator |
| `CheckCircle2` | Completed goals, long-term goal toggle |
| `Plus` | Add goal button, add reminder button |
| `Edit3` | Edit goal button (hover reveal) |
| `Trash2` | Delete goal button (hover reveal), delete reminder |
| `RefreshCw` | Period indicator, undo completed |
| `Monitor` | Detection indicator |
| `AlertCircle` | Error state icon |
| `ArrowRight` | Parent goal link |
| `Bell` | Reminders section header |
| `ChevronDown/Up` | Collapsible sections, completed toggle |
| `TrendingUp` | Momentum/stats section header |
| `Calendar` | Date-related elements |
| `HeartHandshake` | Covenant tab (existing) |
| `Images` | Memories tab (existing) |
| `Search` | Detection keywords input icon |
| `X` | Clear input, close buttons |
| `Sparkles` | AI suggestion indicator |
| `Star` | Achievement indicator |
| `Award` | Streak milestone indicator |
| `Zap` | Quick action indicator |
| `Eye` | Detection enabled indicator |
| `Lock` | Goal locked/completed indicator |

---

## Anti-Slop Checklist

After building, verify EVERY item:

- [ ] **Re-skin to warmth tokens** — use `bg-[rgba(24,24,27,0.55)]`, `border-[rgba(63,63,70,0.40)]`, amber accent `#fbbf24`
- [ ] **Max rounded-xl** — no `rounded-2xl` or higher anywhere
- [ ] **p-5 padding** on containers, p-4 on cards
- [ ] **Dark mode only** — no light mode support
- [ ] **Geist + JetBrains Mono** fonts (already system-wide)
- [ ] **Glass layer** — `bg-zinc-900/60 backdrop-blur-xl` on cards
- [ ] **No generic purple gradients** — use amber accent, violet only for progress bars
- [ ] **No stock hero sections** — this is a data-driven goals page
- [ ] **Consistent with existing tabs** — Covenant and Memories use WarmCard, crossfade, same tab pill pattern
- [ ] **No placeholder content** — all data comes from real IPC calls
- [ ] **Empty states exist** — GoalEmptyState with friendly copy
- [ ] **Loading states exist** — GoalCardSkeleton pulse
- [ ] **Error states exist** — GoalErrorState with retry
- [ ] **Hover states on all interactive elements** — opacity transitions
- [ ] **Focus rings visible** — use amber accent for focus rings
- [ ] **Touch targets ≥ 44px** — buttons, checkboxes, icons
- [ ] **No icon-only buttons without labels/tooltips** — pair icons with text
- [ ] **Animations 150-300ms** — no jarring snaps
- [ ] **Reduced motion respected** — wrap in `@media (prefers-reduced-motion: reduce)`
- [ ] **No raw system tokens visible** — all labels in plain language
- [ ] **Destructive actions confirmed** — two-click delete
- [ ] **Form input preserved on error** — don't wipe on失败
- [ ] **Keyboard navigation works** — Enter to submit, Escape to cancel
- [ ] **Chart axes in minutes/hours** — never raw seconds
- [ ] **Truncation on long text** — `truncate` class
- [ ] **Category colors consistent** — work=pink, personal=violet, health=emerald, learning=cyan, finance=amber, relationships=rose

---

## Component Specification

### GoldPage.tsx — Full Component Spec

**Imports:**
```tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Flame, Clock, CheckCircle2, Plus, Edit3, Trash2,
  RefreshCw, Bell, ChevronDown, ChevronUp, TrendingUp
} from 'lucide-react';
import { CalendarStrip } from '../../../components/goals/CalendarStrip';
import { GoalCard, GoalCardSkeleton, GoalEmptyState, GoalErrorState } from '../../../components/goals/GoalCard';
import { CriteriaBuilder, type CriteriaForm } from '../../../components/goals/CriteriaBuilder';
import { WarmCard } from '../WarmCard';
import { useFocusGoals } from '../../../hooks/useFocusGoals';
import { confetti } from '../../../components/ui/confetti';
import type { Goal, LongTermGoal, GoalCategory, GoalPeriod, GoalTarget } from '../../../components/dashboard/types';
```

**Helper functions:**
```tsx
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
```

**Default criteria:**
```tsx
const defaultCriteria: CriteriaForm = {
  title: '', description: '', category: 'work', period: 'daily',
  targetType: 'completion', targetHours: 0, targetMinutes: 30,
  matchCategory: '', detectionEnabled: false, detectionMode: 'positive',
  detectionKeywords: '', detectionMinMinutes: 10,
  parentId: '', links: [],
};
```

**Reminder interface:**
```tsx
interface Reminder {
  id: string;
  text: string;
  due_date?: string;
  goal_id?: string;
  done: boolean;
}
```

**Component structure:**
```tsx
export default function GoldPage() {
  // State declarations (see State management section)
  // API reference
  const api = window.deskflowAPI;

  // Callbacks: loadGoals, loadLongTerm, loadReminders, loadReview
  // Effects: load on date change, load long-term + reminders on mount
  // Memos: activeGoals, completedGoals, goalDateSet, dateReminders
  // Handlers: handleAdd, handleToggle, handleDelete, handleUpdate
  //           handleLongTermToggle, handleLongTermDelete
  //           handleAddReminder, handleToggleReminder, handleDeleteReminder

  return (
    <div className="space-y-4">
      {/* Calendar Strip */}
      <WarmCard ambient>
        <CalendarStrip selectedDate={selectedDate} onDateChange={setSelectedDate} goalDates={goalDateSet} />
      </WarmCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Sidebar */}
        <div className="space-y-3">
          {/* Streak Summary — WarmCard with ambient */}
          {/* Long-term Goals — WarmCard */}
          {/* Reminders — WarmCard with amber border */}
        </div>

        {/* Main Goal List */}
        <div className="lg:col-span-2 space-y-3">
          {/* Date Label + Add Button */}
          {/* Add Form (AnimatePresence) */}
          {/* Goal List (loading/error/empty/populated) */}
          {/* Completed Goals Section */}
          {/* Review Summary */}
        </div>
      </div>
    </div>
  );
}
```

### GoalCard Integration

The existing GoalCard component handles:
- Checkbox toggle with confetti
- Title display with done state (line-through)
- Description display
- Parent goal link display
- Category badge
- Period indicator
- Target type indicator
- Time progress display (formatted as Xh Xm / Yh Zm)
- Detection indicator (auto badge)
- Streak display (flame icon + count)
- Progress bar (animated)
- Detection keywords display
- Completed date display
- Edit button (hover reveal)
- Delete button with two-click confirm (hover reveal)

**No modifications needed to GoalCard.** Use as-is.

### CriteriaBuilder Integration

The existing CriteriaBuilder handles:
- Title input
- Description input
- Category selector (work/personal/health/learning/finance/relationships)
- Period selector (daily/weekly/monthly)
- Target type (complete it / spend time)
- Time inputs (hours/minutes) with live conversion
- Match category selector (IDE/AI Tools/Browser/Productivity/Communication/Design/Entertainment/Education)
- Long-term goal parent selector
- Advanced section: detection toggle, positive/avoidance mode, keywords input, min minutes

**No modifications needed to CriteriaBuilder.** Use as-is.

### CalendarStrip Integration

The existing CalendarStrip handles:
- Horizontal date display (±14 days)
- Week shift buttons (left/right)
- Selected state (violet accent)
- Today indicator (dot + badge)
- Goal date indicators (dots below dates)

**No modifications needed to CalendarStrip.** Use as-is.

---

## Verification Checklist

After implementation, verify:

1. **Tab appears:** Gold tab visible in LifePage with amber accent
2. **Tab switch works:** Click Gold → crossfade animation → GoldPage renders
3. **Calendar loads:** CalendarStrip shows with today selected
4. **Goals load:** Goals for today appear in list
5. **Add goal works:** Click Add Goal → form slides open → fill → Save → goal appears
6. **Edit goal works:** Hover → Edit icon → inline edit → Save
7. **Delete goal works:** Hover → Delete icon → red confirm → click again → removed
8. **Toggle complete works:** Click checkbox → confetti → status updates
9. **Long-term goals load:** Sidebar shows long-term goals
10. **Reminders work:** Add reminder → appears → toggle → delete
11. **Loading state shows:** Skeleton during load
12. **Empty state shows:** When no goals for date
13. **Error state shows:** On IPC failure + retry works
14. **Review shows:** For past dates with reviews
15. **Focus integration works:** When focus session active, matching goals show progress
16. **URL updates:** `?tab=gold` in URL bar
17. **Build passes:** `npm run build` succeeds
18. **No type errors:** `npx tsc --noEmit` passes for GoldPage
