# Context Bundle — Focus Session Relocation & Redesign

## Problem Statement
The Deep Focus feature exists in 3 places with different UIs, and the user finds it:
1. **Too disturbing on ProductivityPage** — the full FocusSection (timer + stats + history + insights) takes up too much space and disrupts the productivity view
2. **Ugly on DashboardPage** — the compact FocusSessionCard is visually unpolished

The user wants a prompt generated that asks the Architect AI to decide the best placement and redesign.

---

## 1. App Page Map (all routes + key sub-areas)

| Route | Component | Key Sub-Areas | Notes |
|---|---|---|---|
| `/` | DashboardPage | 3D orbit, heatmap, weekly overview, timer, **FocusSessionCard** | Main entry point |
| `/activity` | ActivityPage | 3 tabs: Apps / Websites / **Productivity** | Unified tabbed page |
| `/activity?tab=productivity` | ProductivityPage (lazy) | Productivity score, donut/bar/line charts, **FocusSection** | Deep Focus section lives here |
| `/ai` | AiPage | Brief cards, daily plan, topic digest, goals, **FocusBoard** | AI assistant page |
| `/finance` | FinancePage | Wallets, transactions, subscriptions, crypto | — |
| `/ide` | IDEProjectsPage | Project grid, AI Tools subpage | — |
| `/external` | ExternalPage | Activity grid, sleep tracking, comparison | — |
| `/reports` | InsightsPage | Day / Weekly / Activities tabs | — |
| `/terminal` | TerminalPage | 5-group sidebar, panes, sessions, map | — |
| `/database` | DatabasePage | Table browser + SQL queries | — |
| `/settings` | SettingsPage | All app settings | — |
| `/life` | LifePage (lazy) | Life tracking | Lazy loaded |
| `/learn` | LearnPage | Lesson library, reader, tutor | — |
| `/subscriptions` | SubscriptionsPage | Full subscription management | Not in sidebar |
| `/guide` | GuidePage | User guide | — |

---

## 2. Current Focus Implementation (3 locations)

### A. `src/features/focus/` — Full system (7 files, used on ProductivityPage)
| File | Purpose |
|---|---|
| `FocusSection.tsx` | Orchestrator — renders FocusTimer + FocusStats + FocusHistory + FocusInsights |
| `FocusTimer.tsx` | 167 lines — timer with circular progress bar (AnimatedCircularProgressBar), 6 presets (5/10/15/25/50/90 min), strict mode toggle, Particles background, NumberTicker remaining display |
| `FocusStats.tsx` | 63 lines — 4-card grid: focus today (seconds), session count, completion rate (%), streak (days). Uses NumberTicker |
| `FocusHistory.tsx` | 101 lines — scrollable session list with outcome icons (completed/failed/aborted/active), confetti celebration |
| `FocusInsights.tsx` | 70 lines — weekly trend line chart (Chart.js), best focus hour, avg session length |
| `focusHelpers.ts` | 119 lines — pure functions: fmtClock, fmtDuration, computeTodayStats, computeStreak, computeWeeklyTrend, computeBestHour, computeAvgSessionLength |
| `focusConfetti.ts` | 46 lines — canvas-confetti celebration with localStorage dedup |

**Rendered at:** `ProductivityPage.tsx:914` — `<FocusSection />` before the main score card. This is the full-featured version with timer + stats grid + history list + insights chart.

### B. `src/components/focus/` — Compact card (1 file, used on DashboardPage)
| File | Purpose |
|---|---|
| `FocusSessionCard.tsx` | 134 lines — compact timer with 3 presets (25/50/90 min), strict mode checkbox, active/idle states, recent 5 sessions list |

**Rendered at:** `DashboardPage.tsx:3136` — `<FocusSessionCard />` in a `grid grid-cols-1 lg:grid-cols-3 gap-5 mb-12` wrapper. This is a minimal/compact version.

### C. `src/components/ai/focus/` — AI context focus board (2 files, used on AiPage)
| File | Purpose |
|---|---|
| `FocusBoard.tsx` | AI-context focus metrics display |
| `GoalRow.tsx` | Goal row component |

**Used at:** AiPage lines 432/439 with `focusMetrics` data.

### D. Shared hook: `src/hooks/useFocusSession.ts` (48 lines)
```typescript
export interface FocusPublicState {
  active: boolean;
  endsAt: number | null;
  remainingSec: number;
  strictness: string;
  paused: boolean;
}

export function useFocusSession() {
  const [state, setState] = useState<FocusPublicState | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  // Provides: { state, history, start, stop, refreshHistory }
}
```
All 3 focus component groups use this same hook. It talks to `deskflowAPI.focus` (IPC bridge).

---

## 3. How Focus Renders in Each Location

### DashboardPage (`/`)
```
<div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-12">
  <FocusSessionCard />  {/* compact card, 1/3 width */}
</div>
```
Line 3134-3137. Sits between the weekly overview sections and the heatmap modal.

### ProductivityPage (`/activity?tab=productivity`)
```tsx
{/* Deep Focus Section */}
<FocusSection />   {/* full 3-column layout: timer (1/3) + stats/history/insights (2/3) */}

{/* Main Score Card */}
<GlassCard> ... </GlassCard>
```
Lines 913-914. Takes up ~600px+ of vertical space above the productivity score card.

### AiPage (`/ai`)
FocusBoard is part of the AI context panels, alongside daily brief, topic digest, goals.

---

## 4. Design System Reference
- **GlassCard** — `src/components/GlassCard.tsx` (primary container, supports `variant`, `accent` props)
- **Badge** — `src/components/ui/badge.tsx` (variants: default, secondary, destructive, outline)
- **SectionHeader** — `src/components/SectionHeader.tsx`
- **EmptyState** — `src/components/EmptyState.tsx`
- **LoadingState** — `src/components/LoadingState.tsx`
- **Colors used:** pink accent (`#ec4899`, `rgba(236,72,153,0.15)`), emerald for active/green states (`#34d399`, `#10b981`), rose for destructive (`#f43f5e`), amber for warnings (`#f59e0b`)
- **Typography:** tabular-nums + font-mono for numbers/times, text-[10px]/[11px]/[12px]/[13px]/sm for body
- **Layout:** `space-y-4`, `grid grid-cols-1 lg:grid-cols-3 gap-5`, `p-4`, `rounded-lg`/`rounded-xl`
- **Background:** `bg-zinc-900/20 backdrop-blur-md`, `bg-zinc-800/60`, `bg-zinc-950/95`
- **Borders:** `border-zinc-800/50`, `border-zinc-700`
- **Icons:** lucide-react (Focus, Play, Square, Clock, CheckCircle2, XCircle, AlertTriangle, Target, TrendingUp, Flame, Eye, etc.)

---

## 5. Backend Completeness
- **IPC channels:** `deskflowAPI.focus` — exists with methods `getState()`, `onState()`, `onEnded()`, `start()`, `end()`, `history()`
- **DB tables:** `deep_focus_sessions`, `deep_focus_events` — columns: id, start_time, end_time, planned_duration, actual_duration, outcome, strictness, broke_on_type, broke_on_name, return_count
- **Service layer:** `focusManager.ts` at `src/domains/focus/focusManager.ts` + `focusSchema.ts`
- **Status: COMPLETE** — all backend infrastructure is fully implemented

---

## 6. Current Visual Issues (per user)
1. **ProductivityPage FocusSection** — too large, too visually dominant, "disturbing" and "destroying" the productivity page
2. **DashboardPage FocusSessionCard** — "ugly", visually unpolished, no animated elements or visual sophistication

The full FocusSection takes up roughly the top 40-50% of the ProductivityPage viewport before any actual productivity data (score, charts, app breakdown) is visible.
