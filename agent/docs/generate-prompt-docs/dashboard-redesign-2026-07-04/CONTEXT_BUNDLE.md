# CONTEXT_BUNDLE.md — Dashboard Redesign (2026-07-04)

> Self-contained reference for the Architect AI. All code is real, from `src/`.

---

## 1. Current Dashboard Layout (DashboardPage.tsx, 3375 lines)

The dashboard is a single massive component at `src/pages/DashboardPage.tsx`. Sections in order:

### Section order (top to bottom):
```
1.  Header "Lock-In" + date
2.  Hero band (3-column grid):
    - Stopwatch timer (giant HH:MM:SS)
    - FunFactHero (daily AI insight)
    - GoalRing (focus % ring)
3.  Stats Cards Row (6 cards)
4.  Pinned Activities (collapsible grid of external activity buttons)
5.  "At a Glance" summary strip (4 SummaryCards)
6.  Focus Sessions (best today/week/all-time + session history)
7.  Two-column layout:
    - Left: Weekly Heatmap (productivity chart)
    - Right: App Ecosystem Solar System (OrbitSystem)
8.  Deep Focus card (FocusSessionCard) — alone in a 3-col grid
9.  Expanded Modals (heatmap fullscreen, solar system fullscreen, day detail)
10. Recent Sessions (activity feed list)
```

### Problem identification:
- 43 `useState`, 34 `useEffect`, 7 `setInterval` — state management nightmare
- Deep Focus (FocusSessionCard) is tacked on at the bottom in a grid by itself — looks disconnected
- Hero layout has tag issues (just fixed: stopwatch was `lg:col-span-2` taking 2/3 width, now 1/3)
- No integrated Deep Focus presence — the timer shows productive minutes but the Focus timer is separate
- At-a-Glance strip exists but has no sparklines, no trends, no module integration
- 7 intervals polling continuously: 1s stopwatch tick + 1s elapsed tick + 5s data refetch + periodic full refetch

---

## 2. Hero Section Components

### Stopwatch timer (DashboardPage.tsx ~line 2280-2445)
```tsx
// Core timer rendering
<div className="text-center space-y-6">
  {/* Status indicator */}
  <motion.div className="flex items-center justify-center gap-3">
    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ... }} />
    <span>Locked In / Paused / Distracting / Idle</span>
  </motion.div>
  
  {/* Giant timer */}
  <div className="font-mono font-bold" style={{
    fontSize: '120px', lineHeight: '1',
    color: green/red/blue based on tier,
    textShadow: 'glow effect when active'
  }}>
    {formatDuration(displayTime.ms)}  // "HH:MM:SS"
  </div>
  
  {/* Current activity name */}
  <div>App name / website title / "Switch to another app..."</div>
  
  {/* Helpful message */}
  <div className="text-xs text-zinc-600">
    Productive work detected / No productive activity detected...
  </div>
</div>
```

### FunFactHero (src/components/insights/FunFactHero.tsx, 86 lines)
- Calls `window.deskflowAPI.getDailyFunFact()` → `insights:daily-fun-fact`
- Shows domain-tinted card with headline + subtext + trend arrow
- Has loading skeleton state, null state (no fact = renders nothing)
- Domains: apps, browser, productivity, sleep, git, ai, external, focus
- Each domain has gradient bg and accent color

### GoalRing (src/components/insights/GoalRing.tsx, 49 lines)
- SVG donut chart: 100px × 100px, strokeWidth=6, radius=44
- Props: `current`, `goal`, `unit`, `label`
- Animates stroke-dashoffset on mount
- Shows "67%" center + "Today's Focus" label + "80/120min" subtitle

---

## 3. Deep Focus System

### FocusSessionCard (src/components/focus/FocusSessionCard.tsx, 134 lines)
A standalone card that lives ALONE in a 3-column grid at the bottom of the dashboard:
```tsx
// Current placement (DashboardPage.tsx ~3134)
<div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-12">
  <FocusSessionCard />
</div>
```

The card itself uses `<GlassCard variant="default" accent="pink" className="col-span-full lg:col-span-1">` which means it takes only 1/3 of the page width — making it look like a random sidebar widget in the middle of the page.

**Card states:**
- **Idle**: 3 preset buttons (25m / 50m / 90m), strict-mode checkbox, "Start N-min focus" button
- **Active**: Countdown timer (text-4xl bold), "Distracting apps will prompt you" text, "End session" button
- **History**: Up to 5 recent sessions with outcome icons (checkmark/x/alert) and "broke on" labels

**Hook: useFocusSession** (src/hooks/useFocusSession.ts, 48 lines)
```ts
interface FocusPublicState {
  active: boolean;
  endsAt: number | null;
  remainingSec: number;
  strictness: string;
  paused: boolean;
}
```
- Calls IPC `focus:start`, `focus:end`, `focus:get-state`, `focus:history`
- Listens to `focus:state` and `focus:ended` events from main process
- History limit: 50 sessions

### Deep Focus DB Schema (src/domains/focus/focusSchema.ts)
```sql
CREATE TABLE deep_focus_sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at    TEXT NOT NULL,
  ended_at      TEXT,
  planned_sec   INTEGER NOT NULL,
  actual_sec    INTEGER,
  outcome       TEXT NOT NULL DEFAULT 'active',  -- 'active'|'completed'|'failed'|'aborted'
  strictness    TEXT NOT NULL DEFAULT 'distracting',  -- 'distracting'|'non_allowed'
  broke_on_type TEXT,
  broke_on_name TEXT,
  return_count  INTEGER NOT NULL DEFAULT 0,
  allowed_json  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE deep_focus_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL REFERENCES deep_focus_sessions(id) ON DELETE CASCADE,
  ts          TEXT NOT NULL,
  kind        TEXT NOT NULL,  -- 'distraction_shown'|'broke'|'returned'|'completed'|'aborted'
  target_type TEXT,
  target_name TEXT
);
```

### FocusManager (src/domains/focus/focusManager.ts, 200 lines)
- Manages session lifecycle: start → overlay on distraction → return/break → complete
- IPC handlers: `focus:start`, `focus:end`, `focus:get-state`, `focus:history`
- Events pushed to renderer: `focus:state`, `focus:ended`
- Distraction overlay: fullscreen BrowserWindow on top of everything
- Token-gated HTTP endpoints: `/focus-state`, `/focus-web-activity`, `/focus-break`

### Preload bindings (src/preload.ts ~1034)
```ts
focus: {
  start: (cfg: any) => ipcRenderer.invoke('focus:start', cfg),
  end: (outcome?: string) => ipcRenderer.invoke('focus:end', outcome),
  getState: () => ipcRenderer.invoke('focus:get-state'),
  history: (opts?: { limit?: number }) => ipcRenderer.invoke('focus:history', opts),
  onState: (h: (s: any) => void) => {
    ipcRenderer.on('focus:state', h);
    return () => { ipcRenderer.removeListener('focus:state', h); };
  },
  onEnded: (h: (d: any) => void) => {
    ipcRenderer.on('focus:ended', h);
    return () => { ipcRenderer.removeListener('focus:ended', h); };
  },
}
```

---

## 4. Summary Strip (Band 2 — partially implemented)

### SummaryCard (src/components/insights/SummaryCard.tsx, 50 lines)
```tsx
interface SummaryCardProps {
  title: string;      // "Activity", "Finance", "Learn", "External"
  value: string;      // "45min focus", "$12,500", "3 due", "420min sleep"
  subtitle: string;   // "72% productive", "2 wallets", "Ready for review"
  icon: React.ReactNode;
  accentColor: string;  // gradient string like "from-emerald-500/10 to-emerald-600/5"
  onClick?: () => void;
  masked?: boolean;    // for finance when locked
  trend?: { direction: 'up' | 'down' | 'flat'; label: string };
}
```
Renders as a clickable card with icon, title, value (or masked), subtitle, optional trend arrow.

### getHomeSummary IPC (src/main.ts ~23404)
```ts
// Returns from one round-trip:
{
  focusMinutes: number;    // today's focus from daily_rollup
  walletCount: number;     // non-deleted wallets
  totalBalance: number;    // sum of fiat wallet balances
  dueReviews: number;      // learn progress items due for review
  sleepSeconds: number;    // today's sleep from external_sessions
  financeLocked: boolean;  // global finance lock state
}
```

---

## 5. IPC Endpoints (dashboard-related)

| Channel | Direction | Purpose | Exists? |
|---------|-----------|---------|---------|
| `dashboard:home-summary` | invoke | Single round-trip for Band 2 data | ✅ Real |
| `insights:daily-fun-fact` | invoke | Daily insight for FunFactHero | ✅ Real (templates only, no LLM) |
| `insights:build-rollup` | invoke | Build daily_rollup for a date | ✅ Real |
| `focus:start` | invoke | Start deep focus session | ✅ Real |
| `focus:end` | invoke | End deep focus session | ✅ Real |
| `focus:get-state` | invoke | Get current focus state | ✅ Real |
| `focus:history` | invoke | Get focus session history | ✅ Real |
| `focus:state` | event (main→renderer) | Focus state changed | ✅ Real |
| `focus:ended` | event (main→renderer) | Focus session ended | ✅ Real |
| `getDashboardAggregates` | invoke | Dashboard aggregate data (legacy) | ✅ Real |
| `getProductivitySessions` | invoke | Focus session data for rankings | ✅ Real |
| `getCurrentForeground` | invoke | Current app info | ✅ Real |

---

## 6. Design Tokens & Conventions

### Color System (from frontend-design skill)
```
Background:     zinc-950 (base), zinc-900 (elevated), zinc-900/50 (glass)
Primary:        pink-500 (accent), pink-400 (hover), pink-600 (active)
Secondary:      cyan-400 (info), emerald-400 (success), amber-400 (warning)
Text:           zinc-100 (primary), zinc-400 (secondary), zinc-600 (disabled)
Border:         zinc-800 (subtle), zinc-700 (active), zinc-600/50 (glass edge)
```

### Page Accent
- Dashboard uses pink-500 as its accent (set via `--page-accent`)

### Spacing
```
xs: 4px | sm: 8px | md: 12px | lg: 16px | xl: 24px | 2xl: 32px
```

### Card Standard
```
ALL cards: p-5 padding, rounded-xl (12px) max
Glass: bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50
```

### Typography
```
Badge:      11px/500    — status badges, category pills
Meta:       12px/400    — timestamps, secondary info
Body:       13px/400    — default body text
Body+:      14px/400    — stat values, card content
Card title: 13px/600    — section headings within cards
Section h2: 15px/600    — section titles
Page title: 18px/600    — ALL page h1 titles
Display:    24-32px/700 — timer values, hero score badges
```

### Animation
```
fast:    150ms (hover states, toggles)
normal:  250ms (modals, dropdowns)
slow:    400ms (page transitions)
ease-out: cubic-bezier(0.16, 1, 0.3, 1) (standard motion)
```

---

## 7. GlassCard Component (src/components/GlassCard.tsx)

```tsx
type Accent = 'pink' | 'amber' | 'emerald' | 'none';

interface GlassCardProps {
  variant?: 'default' | 'compact' | 'subtle' | 'notebook' | 'bordered' | 'elevated' | 'interactive';
  accent?: Accent;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}
```
Variants:
- `default`: `bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50` (glass card)
- `compact`: `bg-zinc-900/50 backdrop-blur-md border border-zinc-800/40 p-3`
- `subtle`: `bg-zinc-900/30 border border-zinc-800/30`
- `notebook`: `bg-zinc-950/70 backdrop-blur-lg border-l-2` (left accent rail)
- `bordered`: `bg-transparent border-[1.5px]`
- `elevated`: `bg-zinc-800/70 backdrop-blur-2xl border border-zinc-600/40`
- `interactive`: clickable with hover lift effect

Accent colors render a left rail stripe + subtle background tint.

---

## 8. ALL Mandatory Design Skills (Architect MUST use every single one)

The Architect MUST load and apply ALL of these skills in order. None are optional for this task.

### Skill Loading Order (mandatory)
1. **`frontend-external-infra`** — MCP Source Routing: connect to every MCP server and pull real components (shadcn, Magic UI, 21st.dev, React Bits). NEVER design from zero. Re-skin all sourced components to DeskFlow tokens per re-skin rules. Run the Anti-Slop Checklist before shipping any component.

2. **`humancentred-UIUX`** — Every data-driven component MUST have all 4 states: Empty (icon + message + CTA, never blank), Loading (skeleton placeholders matching content shape, not just spinner), Error (plain-language cause + retry action, never raw JSON), Populated (normal state). Every interactive element has hover/focus/active/disabled states. Progressive disclosure: show what matters now, hide complexity until needed.

3. **`frontend-design`** — Appl strictly: max rounded-xl (12px), p-5 padding, Geist body + JetBrains Mono code, zinc-950 backgrounds, pink-500 primary accent. NEVER pure black, NEVER box-shadow for elevation, NEVER spring physics in developer tools. Use glass layers (bg-zinc-900/60 backdrop-blur-xl) for depth.

4. **`impeccable`** — Apply all 7 design dimensions: typography (DeskFlow scale), color (DeskFlow tokens, not purple gradients), spatial (8px grid, p-5 cards), motion (150-300ms transitions, cubic-bezier easing), interaction (44px touch targets, visible feedback), responsive (mobile-first grid collapse), UX writing (plain language, never system tokens). Run the 27 anti-pattern check.

5. **`motion-alive`** — Pick a Liveliness Level (L2 Responsive minimum). Apply motion taxonomy: state-change micro-interactions (150ms), attention-directing animations (250ms), narrative sequences (300-400ms). Every interactive element has hover/focus/active transitions. Respect prefers-reduced-motion.

6. **`ui-ux-pro-max`** — Apply industry-specific design rules for developer tools (data-dense, glassmorphic, keyboard-friendly) and financial UIs (masked values, lock states, confirmation flows). Use the style library for component inspiration.

7. **`design-taste`** (master aggregator) — Apply design variance knobs so sections don't look identical. Anti-repetition rules: don't use the same card pattern for different types of content. Vary rhythm, accent usage, and visual weight across bands.

8. **`frontend-external-infra` Anti-Slop Checklist** (final gate before shipping any UI):
- [ ] Type: Geist body + JetBrains Mono code only
- [ ] Color: DeskFlow tokens (--bg-primary, --accent-primary, etc.) NOT purple/indigo gradients
- [ ] Geometry: rounded-xl max, p-5 padding
- [ ] Hero: no tiny uppercase eyebrow + oversized headline + lone CTA cliché
- [ ] Sections: no repeated tracked-uppercase kicker above every heading
- [ ] Motion: real micro-interactions, respects prefers-reduced-motion
- [ ] Imagery: matches actual product, no filler glow/blobs
- [ ] Empty/loading/error states: exist per humancentred-UIUX skill
- [ ] Icons: all from lucide-react, no emoji as UI icons
- [ ] Accessibility: focus-visible rings use DeskFlow's --page-accent

### ALL MCP Servers Required (Architect MUST query every single one)
| Order | MCP Server | What to search for | Re-skin rule |
|-------|-----------|-------------------|--------------|
| 1 | **shadcn** (`npx shadcn@latest mcp`) | Search `@shadcn` for: card variants, dialog, tabs, progress, slider, separator, tooltip, badge, avatar, button, input, dropdown-menu | Replace colors with DeskFlow tokens, max rounded-xl, p-5 |
| 2 | **Magic UI** (`@magicuidesign/mcp`) | Fetch https://magicui.design/docs/components/ for: Animated Beam, Border Beam, Number Ticker, Particles, Meteors, Confetti, Blur Fade, Word Rotate, Grid Pattern, Ripple, Bento Grid, Shine Border, Orbiting Circles | DeskFlow colors, dark mode only, no purple gradients |
| 3 | **@21st-dev/magic** | Generate unique variations for: focus timer card, sparkline chart, circular progress, compact summary widget | Re-skin all output to DeskFlow tokens |
| 4 | **Lucide** (`lucide-icons-mcp`) | Search icons: Focus, Target, Brain, BrainCircuit, Clock, Timer, Wallet, GraduationCap, ExternalLink, BarChart, Sparkles, Trophy, Zap, Flame, GitBranch, BookOpen, Lock, Bell, Repeat, History, TrendingUp, Activity, Circle, CheckCircle2, XCircle, AlertTriangle | All icons from lucide-react, no inline SVG duplicates |
| 5 | **React Bits** (`reactbits-dev-mcp-server`) | Search 135+ components for: animated text, particle backgrounds, hover card effects, magnetic buttons, scroll animations | DeskFlow tokens, max rounded-xl, dark mode |
| 6 | **Iconify** (`better-icons-mcp`) | Fallback for any icon Lucide doesn't have | Must be from known icon set, not custom SVG |
| 7 | **Unsplash** (`unsplash-smart-mcp-server`) | Photography for any hero background or section illustration (only if needed) | Requires API key, auto-attribution |

---

## 9. Doc 08 Design Spec (Existing Plan)

The existing spec in `agent/docs/deskflow-audit-updated/08-Dashboard-Redesign-Spec.md` prescribes:

### Band 1 — Hero: "Today, so far" + the one changing thing
- Left: live stopwatch / current focus session
- Center: AI daily fun-fact (the always-changing element) — one sentence from template library
- Right: day's headline metric ring (focus time vs goal)

### Band 2 — Cross-Module Summary Strip
- 4 compact summary cards (Activity, Finance, Learn, External)
- Each shows: number + tiny sparkline + one-line takeaway
- Clicks through to its page
- Finance shows masked state when locked

### Band 3 — Rewind + Recent Context
- Rewind entry (week/month recap, expandable modal)
- Recent sessions (condensed)
- Pinned external activity (keep)
- **Cut/Demote**: full heatmap → click-through from Activity card, solar system → click-through from App card
- **Collapse**: focus session rankings → one card with period toggle (not three stats)

### What's implemented vs pending:
| Feature | Status |
|---------|--------|
| Hero 3-column layout | ✅ Layout exists but looks bad (just fixed col-span-2 bug) |
| FunFactHero in hero | ✅ Exists and works |
| GoalRing in hero | ✅ Exists and works |
| getHomeSummary IPC | ✅ Single round-trip handler exists |
| Summary strip | ✅ 4 cards rendered but no sparklines/trends |
| Deep Focus card on dashboard | ❌ Placed alone in bottom grid, looks tacked-on |
| Rewind entry | ❌ Not implemented |
| Demote heatmap/solar | ❌ Still full-size in dashboard |
| Focus session rankings consolidated | ❌ Still 3 separate stats |
| Sparklines on summary cards | ❌ SummaryCard has no sparkline prop |
| Trends on summary cards | ✅ Has `trend` prop but not populated from data |
| Refactor into useHomeSummary hook | ❌ homeSummary state still manually managed |
| Kill polling storm | ❌ 7 intervals still running |
