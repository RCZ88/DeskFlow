# CONTEXT_BUNDLE.md — StatsPage & BrowserActivityPage Redesign

> Self-contained reference for the target AI. This replaces direct codebase access.
> All file paths are relative to the project root.

---

## 1. Project Overview

DeskFlow is an Electron + React + TypeScript + Tailwind CSS desktop productivity tracker. The app runs in dark mode only (zinc-based palette), uses a glassmorphic design language with `GlassCard` as the universal container, `framer-motion` for animations, `chart.js` / `react-chartjs-2` for all charts, and `lucide-react` for icons.

---

## 2. Pages to Redesign

### 2a. StatsPage (`src/pages/StatsPage.tsx` — 1431 lines)

**Route:** `/stats`
**Title:** "Applications"
**Purpose:** Shows tracked desktop application usage with live tracking, charts, per-app details, and session management.

**Features preserved (DO NOT REMOVE):**
- Live tracking indicator (pulsing green dot, app name, elapsed timer, category)
- Live Detection panel (terminal-style log viewer with timestamps, INFO badges, app names)
- App Time Distribution pie chart (with category-colored slices)
- Top Applications list (top 6 by usage time, generic Monitor icon with category-colored background badge, time, percentage)
- Summary Cards (4 animated cards: Total Time, Total Sessions, Avg Session, Active Apps)
- Hourly Distribution / Daily Usage Trend chart (toggleable Bar/Line, adapts to period)
- Category Breakdown grid (progress bars per category)
- Application Statistics grid (clickable per-app cards with hover animation)
- **App Detail Modal** (full-screen overlay with):
  - App icon + name + category header
  - Key Metrics grid (4 cards: Total Time, Sessions, Peak Hour, Longest Session)
  - Period selector (Today/Week/7 Day/Month/30 Day/All + chevron navigation)
  - Daily Usage bar chart (period-aware)
  - Hourly Activity bar chart (with current-hour highlight)
  - First Seen / Last Seen info cards
  - Productivity Estimate score bar (category-based with gradient fill)
  - Sessions list with inline edit (datetime-local inputs) and delete (with confirmation)
- Time Lock toggle (locks to All Time view)
- Scroll position preservation (saves/restores scroll position across period changes)
- Focus mode filtering (`timeMode === 'focus'` shows only productive-tier apps)
- `data-tutorial` attributes on header controls (`stats.period`), hourly chart (`stats.charts`), app grid (`stats.list`)
- `liveActivityLogs` prop sync (live logs come from parent App.tsx via prop, not direct IPC)

### 2b. BrowserActivityPage (`src/pages/BrowserActivityPage.tsx` — 1126 lines)

**Route:** `/browser`
**Title:** "Browser Activity"
**Purpose:** Shows tracked browsing habits by domain and category across configured browsers.

**Features preserved (DO NOT REMOVE):**
- Tracking Browser selector dropdown (dynamic list of browsers from DB with ★ for extension browser)
- Summary Cards (3 cards: Total Browsing Time, Unique Domains, Browsing Sessions — NOT framer-motion animated, unlike StatsPage)
- Live Detection panel (terminal-style with timestamps, level badges, domains, SAVE button; has `isLiveMode` state but no UI toggle for play/pause)
- Hourly/Daily Activity chart (toggleable Bar/Line, period-aware)
- Time by Category pie chart (with custom legend showing duration via `generateLabels`)
- Top Domains vertical bar chart (top 10, color-coded by category)
- Recent Activity accordion list (expandable per-domain with session details, timestamps)
- Domain Breakdown grid (clickable per-domain cards with category badges)
- **Domain Detail Modal** (full-screen overlay with):
  - Domain icon + name + category header
  - Key Metrics grid (4 cards: Total Time, Sessions, Avg Session, First Seen)
  - Period selector (same Today/Week/.../All pattern)
  - Daily Usage bar chart (period-aware)
- Refresh button
- Category editing functions (`handleCategoryChange`, `startEditCategory`) wired but inline dropdown UI NOT rendered in JSX — exists in intent only
- Auto-refresh every 10 seconds (skipped for 'all' period)
- Live log save-to-file feature (`handleSaveLogs` downloads `.txt`)
- Full-page error state with retry button (AlertCircle icon, red message, retry button)
- Full-page loading state (LoadingState spinner)
- Page visibility set/unset (`setPageVisibility('browser', true/false)`)
- `data-tutorial` attributes on browser selector (`browser.selector`), chart toggle (`browser.toggle`), domain grid (`browser.domains`)
- `Play`/`Pause` icons imported but unused in current JSX — reserved for planned live-mode toggle

---

## 3. Shared Design System & Tokens

### Color Palette (all dark mode)
```
Base bg:       #0a0a0a (zinc-950)
Card bg:       #18181b (zinc-900) with 30-50% opacity via bg-zinc-900/50 or bg-zinc-900/30
Card border:   #27272a (zinc-800) with 50% opacity via border-zinc-800/50
Muted text:    #71717a (zinc-500)
Body text:     #a1a1aa (zinc-400)
Heading text:  #ffffff (white)
Accent primary:#6366f1 (indigo-500)
Accent alt:    #10b981 (emerald-400) for positive/green states
```

### GlassCard Component (`src/components/GlassCard.tsx`)
- Universal card wrapper with variants: `default`, `compact`, `subtle`, `notebook`, `bordered`, `elevated`, `interactive`
- Accent colors: `pink`, `amber`, `emerald` (passed via prop)
- Standard padding: `p-5` (20px) always
- Border radius: `rounded-xl` (12px) maximum
- Background: `bg-zinc-900/30 backdrop-blur-xl border border-zinc-800/50`

### SectionHeader Component (`src/components/SectionHeader.tsx`)
- Props: `title`, `icon` (ReactNode), `action` (ReactNode for right-side controls)

### PageShell Component (`src/components/PageShell.tsx`)
- Wraps every page with `data-page="stats"` or `data-page="browser"` attribute
- Standard page padding and enter animation

### Typography
- Heading: `text-3xl font-semibold tracking-tight` (page title)
- Cards: `text-xl font-semibold` (card title)
- Values: `text-3xl font-bold font-mono tabular-nums` (stat numbers)
- Labels: `text-sm text-zinc-500` (metadata/description)
- Timestamps: `font-mono text-xs`

### Animation Tokens (framer-motion)
```
Duration fast:    150ms
Duration normal:  250ms
Enter/exit:       opacity: [0,1], y: [20,0], scale: [0.95,1]
Easing:           cubic-bezier(0.16, 1, 0.3, 1) (ease-out-expo)
Stagger delay:    0.05s per item
```

### Z-Index Scale
```
Modals:        z-50
Dropdowns:     z-40
Sticky header: z-30
Content:       base
```

### Category Color Maps

**StatsPage** CATEGORY_COLORS:
```typescript
{
  'IDE': '#6366f1',           // indigo
  'AI Tools': '#8b5cf6',      // violet
  'Browser': '#3b82f6',       // blue
  'Entertainment': '#ec4899', // pink
  'Communication': '#14b8a6', // teal
  'Design': '#a855f7',        // purple
  'Productivity': '#10b981',  // emerald
  'Tools': '#f59e0b',         // amber
  'Other': '#64748b',         // slate
}
```

**BrowserActivityPage** CATEGORY_COLORS:
```typescript
{
  'Developer Tools': '#10b981',
  'AI Tools': '#8b5cf6',
  'Social Media': '#f97316',
  'Entertainment': '#ef4444',
  'News': '#eab308',
  'Shopping': '#ec4899',
  'Productivity': '#3b82f6',
  'Design': '#a855f7',
  'Search Engine': '#64748b',
  'Communication': '#14b8a6',
  'Education': '#06b6d4',
  'Uncategorized': '#78716c',
  'Other': '#78716c',
}
```

---

## 4. Data Structures

### AppStat (StatsPage)
```typescript
interface AppStat {
  app: string;
  category: string;
  total_ms: number;
  sessions: number;
  avg_session_ms: number;
  first_seen: string;  // ISO date
  last_seen: string;   // ISO date
}
```

### StatsPageProps
```typescript
interface StatsPageProps {
  appStats: AppStat[];
  logs: unknown[];
  allLogs?: unknown[];
  dailyStats?: unknown[];
  selectedPeriod?: Period;
  dateOffset?: number;
  onDateOffsetChange?: (offset: number) => void;
  timeMode?: 'focus' | 'total';
  tierAssignments?: { productive: string[]; neutral: string[]; distracting: string[] };
  liveActivityLogs?: Array<{
    id: string;
    timestamp: number;
    type: 'app' | 'browser' | 'ide';
    name: string;
    category?: string;
    title?: string;
    url?: string;
  }>;
}
```

### BrowserActivityPageProps
```typescript
interface BrowserActivityPageProps {
  selectedPeriod?: Period;
  dateOffset?: number;
  onDateOffsetChange?: (offset: number) => void;
  timeMode?: 'focus' | 'total';
  tierAssignments?: { productive: string[]; neutral: string[]; distracting: string[] };
  allLogs?: unknown[];
}
```

### Period Type
```typescript
type Period = 'today' | 'week' | '7day' | 'month' | '30day' | 'all';
```

### Domain Stats (from IPC `getBrowserDomainStats`)
```typescript
{
  domain: string;
  category: string;
  total_ms: number;
  sessions: number;
  first_seen?: string;
  last_seen?: string;
}
```

### Category Stats (from IPC `getBrowserCategoryStats`)
```typescript
{
  category: string;
  total_ms: number;
}
```

---

## 5. IPC Endpoints & Preload API

### StatsPage uses:
| Method | Channel | Returns |
|--------|---------|---------|
| `updateAppLog(id, {timestamp, duration_ms})` | `update-app-log` | `{success: boolean}` |
| `deleteAppLog(id)` | `delete-app-log` | `{success: boolean}` |
| `onForegroundChange(callback)` | `foreground-changed` | Event: `{app, category, title}` |

### BrowserActivityPage uses:
| Method | Channel | Returns |
|--------|---------|---------|
| `getBrowserLogs(period, dateOffset)` | `get-browser-logs` | `[{timestamp, domain, duration_ms, title, url, category}]` |
| `getBrowserDomainStats(period, dateOffset)` | `get-browser-domain-stats` | `[{domain, category, total_ms, sessions}]` |
| `getBrowserCategoryStats(period, dateOffset)` | `get-browser-category-stats` | `[{category, total_ms}]` |
| `onBrowserTrackingEvent(callback)` | `browser-tracking-event` | Event: `{domain, url, title, type, timestamp}` |
| `getPreferences()` | `get-preferences` | `{browserWithExtension: string, ...}` |
| `setBrowserWithExtension(name)` | `set-browser-with-extension` | `void` |
| `getTrackedBrowsers()` | `get-tracked-browsers` | `string[]` |
| `setPageVisibility(page, visible)` | `set-page-visibility` | `void` |
| `setDomainCategory(domain, category)` | `set-domain-category` | `void` |

---

## 6. Existing Component Library (imported from MCP sources)

| Component | Path | Purpose |
|-----------|------|---------|
| `PageShell` | `src/components/PageShell.tsx` | Page layout wrapper |
| `GlassCard` | `src/components/GlassCard.tsx` | Universal card (7 variants) |
| `SectionHeader` | `src/components/SectionHeader.tsx` | Title + icon + action row |
| `LoadingState` | `src/components/LoadingState.tsx` | Spinner + skeleton variants |

### External Libraries Already Used
- `framer-motion` — animations (AnimatePresence, motion.div)
- `lucide-react` — icons (Clock, TrendingUp, Zap, Calendar, BarChart3, etc.)
- `chart.js` / `react-chartjs-2` — Bar, Line, Pie (with CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)
- `date-fns` — date formatting (format, subDays, eachDayOfInterval, startOfWeek, addWeeks)

---

## 7. Architecture Notes

### Data Flow
1. **StatsPage:** `App.tsx` computes `appStats` via IPC `getAppStats` and passes it as props. `logs` is already period-filtered by parent. Live events come via `onForegroundChange` IPC.
2. **BrowserActivityPage:** Fetches its own data via `getBrowserDomainStats`, `getBrowserCategoryStats`, `getBrowserLogs` IPC calls. Auto-refreshes every 10 seconds. Live events via `onBrowserTrackingEvent`.
3. Both pages receive `allLogs` prop for detail modals (cross-period queries).

### State Management
- Both pages use `useState` + `useMemo` for all derived data
- No global state store (Redux/Zustand) — all state is local or prop-drilled
- Scroll position saved via `useRef` + `scroll` event + `useLayoutEffect`
- StatsPage tracks chart instances via `useRef<Record<string, ChartJS | null>>` for cleanup (BrowserActivityPage does not) — preserve this difference

### Chart Patterns
- All chart data and options are `useMemo`-wrapped to prevent re-renders
- Chart.js registered globally once per module
- Pie charts use `position: 'bottom'` or `'right'` legends with custom label generators
- Tooltips consistently styled: dark background, border, duration formatting via `formatDuration()`
- Current-hour highlighting in hourly charts (emerald vs indigo)

### Duration Formatting
```typescript
formatDuration(seconds: number): string
// < 60s → "Xs"
// < 3600s → "Xm Ys" (or just "Xm")
// >= 3600s → "Xh Ym" (or just "Xh")
```

---

## 8. Available Design Skills & MCP Tools

### Design Skills (all must be loaded)
1. **frontend-design** — DeskFlow-specific UI patterns, component specs, page layouts, design tokens
2. **humancentred-UIUX** — forces human-comprehension filter: empty/loading/error/populated states, 6 pillars, 9 anti-patterns
3. **impeccable** — 7 domain references (typography, color, spatial, motion, interaction, responsive, UX writing) + 23 commands + 27 anti-patterns
4. **ui-ux-pro-max** — industry-specific design rules (developer tools, analytics), 10 style references, color palette guide
5. **design-taste** — master aggregator, design variance (1-10), motion intensity (1-10), visual density (1-10) knobs
6. **taste-skill** — 3 tunable knobs (DESIGN_VARIANCE=5, MOTION_INTENSITY=5, VISUAL_DENSITY=7), anti-repetition rules
7. **motion-alive** — budgeted motion system: 3 liveliness levels, 4 motion families (reactive, transitional, ambient, narrative), 10 recipes, 14 anti-patterns
8. **frontend-external-infra** — bridges skills to MCP-connected libraries, anti-slop checklist, source routing table

### MCP Tools Available
| Server | What It Provides |
|--------|-----------------|
| **shadcn** | Browse/search/read thousands of shadcn-compatible Tailwind+React components |
| **Magic UI** | 150+ animated components: beams, particles, bento grids, text animations, device mocks |
| **Lucide** | Search 1500+ SVG icons — never guess icon names |
| **21st.dev Magic** | Prompt → polished React component generation (API key in .env) |
| **React Bits** | 135+ animated React components (CSS + Tailwind variants) |
| **Iconify** | 200,000+ icons across 200+ icon sets |
| **Unsplash** | Search stock photography with auto-attribution |

### Re-Skin Rules (when using MCP-sourced components)
- Replace source colors with DeskFlow CSS variables or direct hex values
- Max border radius: `rounded-xl` (12px)
- Standard padding: `p-5` (20px)
- Font: Geist/Inter for UI, JetBrains Mono for data/monospace
- Dark mode only
- Glass layers: `bg-zinc-900/30 backdrop-blur-xl`
- Respect `prefers-reduced-motion`

---

## 9. Layout Structure

### StatsPage Layout (top→bottom):
```
PageShell "stats"
├── Header row (title + Time Lock button + period label)
├── Live Tracking Indicator (conditional, glasscard)
├── Live Detection Panel (glasscard, terminal-style, h-48 scroll)
├── Two-column row:
│   ├── App Time Distribution Pie (glasscard, md:w-2/5, h-64)
│   └── Top Applications List (glasscard, flex-1, top 6)
├── Summary Cards (4-col grid of motion-animated glasscards)
├── Hourly Chart (glasscard, bar/line toggle, h-56)
├── Category Breakdown (glasscard, 2/3/4-col grid of progress bars)
├── Application Statistics Grid (glasscard, 2/3-col grid of clickable cards)
└── App Detail Modal (AnimatePresence overlay, max-w-3xl, scrollable)
```

### BrowserActivityPage Layout (top→bottom):
```
PageShell "browser"
├── Header row (title + period label + Tracking Browser selector + Refresh)
├── Summary Cards (3-col grid of glasscards)
├── Live Detection Panel (glasscard, terminal-style, h-48, Save button)
├── Hourly Activity Chart (glasscard, bar/line toggle, h-56)
├── Charts Row (2-col: Time by Category Pie + Top Domains Bar)
├── Recent Activity (glasscard, accordion list, top 6 domains)
├── Domain Breakdown Grid (glasscard, 2/3-col grid of clickable cards)
└── Domain Detail Modal (full-screen overlay, max-w-3xl)
```

---

## 10. Hard Constraints

1. **All existing features must remain** — nothing removed unless explicitly confirmed
2. **CRLF line endings** — preserve, don't mass-reformat
3. **Dark mode only** — no light mode support
4. **Max rounded-xl** (12px) on all corners
5. **p-5** (20px) standard card padding
6. **No box-shadow** in dark themes — use borders instead
7. **No pure black** (#000) — use zinc-950 (#0a0a0a) as darkest
8. **No animating layout properties** — only transform and opacity
9. **Min 44px touch targets** for interactive elements
10. **Wrap all localStorage access in try/catch**
11. **Prefer renderer-side fixes** — read full IPC handler before editing main.ts
12. **All chart data and options MUST be useMemo-wrapped**
13. **Scroll position must be preserved across period/view changes**
