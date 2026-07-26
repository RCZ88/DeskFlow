# CONTEXT_BUNDLE.md — AI Tools Top Section Fix

## Problem Summary

The AI Tools tab (`/ide` → AI Tools) has a broken top section:

1. **Two redundant bar charts**: "Tokens by Tool" and "Sessions by Agent" show the SAME data split by the SAME dimension. One is vertical bars for tokens, the other is vertical bars for sessions — both grouped by tool/agent. This wastes space and shows no new information.

2. **Model Usage Timeline broken**: The `hasModelData` check at line 2274-2278 requires `Object.keys(modelDaily).length > 1` — if a tool only has 1 model, the ENTIRE chart is hidden. Also the `all` period calculation depends on `selectedAgentDetail?.id` which is null unless a tool is clicked, so the chart shows nothing in the default state.

3. **KPI cards lack visual impact**: The number cards at the top don't feel bold or premium compared to the detailed charts below.

4. **Data not loading from all tools**: `deriveStats.ts` computes `sessionsByAgent` from terminal `sessions` table (agent field), not from AI usage data. This means the "Sessions by Agent" chart shows terminal session counts, not AI tool usage sessions — mismatched with "Tokens by Tool" which comes from `ai_usage` table.

## Files Involved

### `src/components/stats/StatsDashboard.tsx` (full source)
```tsx
import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Tooltip, Legend,
} from 'chart.js';
import { motion, useReducedMotion } from 'framer-motion';
import { BarChart3, Loader2, AlertCircle } from 'lucide-react';
import { KpiRow, type KpiData } from './KpiRow';
import { deriveStats, type AnalyticsRawData, type DerivedStats } from './deriveStats';
import { cn } from '../../lib/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const CHART_COLORS = [
  'rgba(168, 85, 247, 0.85)', 'rgba(34, 211, 238, 0.85)', 'rgba(52, 211, 153, 0.85)',
  'rgba(251, 113, 133, 0.85)', 'rgba(245, 158, 11, 0.85)', 'rgba(96, 165, 250, 0.85)',
  'rgba(129, 140, 248, 0.85)', 'rgba(251, 146, 60, 0.85)',
];

const CHART_BORDERS = [
  'rgba(168, 85, 247, 1)', 'rgba(34, 211, 238, 1)', 'rgba(52, 211, 153, 1)',
  'rgba(251, 113, 133, 1)', 'rgba(245, 158, 11, 1)', 'rgba(96, 165, 250, 1)',
  'rgba(129, 140, 248, 1)', 'rgba(251, 146, 60, 1)',
];

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: 'easeOutQuart' as const },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(9, 9, 11, 0.95)',
      titleColor: '#f4f4f5',
      bodyColor: '#a1a1aa',
      borderColor: 'rgba(39, 39, 42, 0.8)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: { top: 10, bottom: 10, left: 14, right: 14 },
      titleFont: { weight: '600' as const, size: 13 },
      bodyFont: { size: 12 },
      displayColors: true,
      boxPadding: 4,
    },
  },
  scales: {
    x: {
      ticks: { color: '#71717a', font: { size: 11, weight: '500' as const }, maxRotation: 0 },
      grid: { color: 'rgba(113,113,122,0.06)' },
      border: { color: 'rgba(113,113,122,0.12)' },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#71717a', font: { size: 10 }, padding: 8 },
      grid: { color: 'rgba(113,113,122,0.06)' },
      border: { color: 'rgba(113,113,122,0.12)' },
    },
  },
};

interface StatsDashboardProps {
  rawData?: AnalyticsRawData | null;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function StatsDashboard({ rawData, loading, error, onRetry }: StatsDashboardProps) {
  const stats = useMemo(() => {
    if (!rawData) return null;
    return deriveStats(rawData);
  }, [rawData]);

  const isEmpty = !loading && !error && stats && !stats.hasData;

  const kpiData: KpiData = {
    totalTokens: stats?.totalTokens || '—',
    totalCost: stats?.totalCost || '—',
    activeSessions: stats?.activeSessions || '—',
    toolsModels: stats?.toolsModels || '—',
    totalTokensNum: stats?.totalTokensNum || 0,
    totalCostNum: stats?.totalCostNum || 0,
    activeSessionsNum: stats?.activeSessionsNum || 0,
    toolsModelsNum: stats?.toolsModelsNum || 0,
    loading,
    empty: isEmpty,
    error,
    onRetry,
  };

  const tokenChartData = useMemo(() => {
    if (!stats || !stats.tokensByTool.labels.length) return null;
    return {
      labels: stats.tokensByTool.labels,
      datasets: [{
        data: stats.tokensByTool.values,
        backgroundColor: stats.tokensByTool.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderColor: stats.tokensByTool.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]),
        borderWidth: 1.5,
        borderRadius: { topLeft: 6, topRight: 6 },
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      }],
    };
  }, [stats]);

  const sessionChartData = useMemo(() => {
    if (!stats || !stats.sessionsByAgent.labels.length) return null;
    return {
      labels: stats.sessionsByAgent.labels,
      datasets: [{
        data: stats.sessionsByAgent.values,
        backgroundColor: stats.sessionsByAgent.labels.map((_, i) => CHART_COLORS[(i + 1) % CHART_COLORS.length]),
        borderColor: stats.sessionsByAgent.labels.map((_, i) => CHART_BORDERS[(i + 1) % CHART_BORDERS.length]),
        borderWidth: 1.5,
        borderRadius: { topLeft: 6, topRight: 6 },
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      }],
    };
  }, [stats]);

  return (
    <div className="space-y-3">
      <KpiRow data={kpiData} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <BarChartCard title="Tokens by Tool" loading={loading} empty={isEmpty} error={error} onRetry={onRetry} chartData={tokenChartData} delay={0.2} />
        <BarChartCard title="Sessions by Agent" loading={loading} empty={isEmpty} error={error} onRetry={onRetry} chartData={sessionChartData} delay={0.25} />
      </div>
    </div>
  );
}
```

### `src/components/stats/deriveStats.ts` (full source)
```ts
export interface AnalyticsRawData {
  aiUsage?: {
    totalTokens?: number;
    totalCost?: number;
    byTool?: Record<string, { tokens?: number; cost?: number; sessions?: number }>;
  } | null;
  sessions?: Array<{ agent?: string; status?: string }>;
}

export interface DerivedStats {
  totalTokens: string;
  totalCost: string;
  activeSessions: string;
  toolsModels: string;
  totalTokensNum: number;
  totalCostNum: number;
  activeSessionsNum: number;
  toolsModelsNum: number;
  tokensByTool: { labels: string[]; values: number[] };
  sessionsByAgent: { labels: string[]; values: number[] };
  hasData: boolean;
}

const fmtNum = (n: number) => {
  if (n >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(1) + 'T';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
};

const fmtCost = (n: number) => {
  if (n >= 1) return '$' + n.toFixed(2);
  if (n >= 0.01) return '$' + n.toFixed(3);
  if (n > 0) return '$' + n.toFixed(4);
  return '$0.00';
};

export function deriveStats(raw: AnalyticsRawData): DerivedStats {
  const aiUsage = raw.aiUsage;
  const sessions = raw.sessions || [];

  const totalTokens = aiUsage?.totalTokens || 0;
  const totalCost = aiUsage?.totalCost || 0;
  const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'running').length;
  const toolsModels = aiUsage?.byTool ? Object.keys(aiUsage.byTool).length : 0;

  const byTool = aiUsage?.byTool || {};
  const tokenEntries = Object.entries(byTool)
    .map(([tool, data]) => ({ tool, tokens: data?.tokens || 0 }))
    .sort((a, b) => b.tokens - a.tokens);

  const sessionCounts: Record<string, number> = {};
  for (const s of sessions) {
    const agent = s.agent || 'Unknown';
    sessionCounts[agent] = (sessionCounts[agent] || 0) + 1;
  }
  const sessionEntries = Object.entries(sessionCounts).sort((a, b) => b[1] - a[1]);

  return {
    totalTokens: fmtNum(totalTokens),
    totalCost: fmtCost(totalCost),
    activeSessions: String(activeSessions),
    toolsModels: String(toolsModels),
    totalTokensNum: totalTokens,
    totalCostNum: totalCost,
    activeSessionsNum: activeSessions,
    toolsModelsNum: toolsModels,
    tokensByTool: { labels: tokenEntries.map(e => e.tool), values: tokenEntries.map(e => e.tokens) },
    sessionsByAgent: { labels: sessionEntries.map(e => e[0]), values: sessionEntries.map(e => e[1]) },
    hasData: totalTokens > 0 || sessions.length > 0,
  };
}
```

### `src/components/ai/AIToolsTab.tsx` — Model Usage Timeline (lines 2269-2410)
```tsx
{/* Model Usage Timeline */}
{(() => {
  const activeAgents = aiAgents.filter(
    (a) => a.status !== 'inactive' && a.tokens > 0
  )
  const hasModelData = activeAgents.some((a) => {
    const modelDaily =
      overview?.aiUsage?.byTool?.[a.id]?.modelDaily || {}
    return Object.keys(modelDaily).length > 1  // BUG: hides chart if tool has only 1 model
  })
  if (!hasModelData) return null

  let numDays =
    effectiveAiPeriod === 'week'
      ? 7
      : effectiveAiPeriod === 'month'
        ? 30
        : 7
  if (effectiveAiPeriod === 'all') {
    // BUG: depends on selectedAgentDetail?.id which is null by default
    const allDaily =
      overview?.aiUsage?.byTool?.[
        selectedAgentDetail?.id || ''
      ]?.daily || {}
    const dateStrs = Object.keys(allDaily)
    if (dateStrs.length > 0) {
      const sorted = dateStrs.sort()
      const span =
        Math.ceil(
          (new Date(sorted[sorted.length - 1]).getTime() -
            new Date(sorted[0]).getTime()) /
            86400000
        ) + 30
      numDays = Math.min(180, Math.max(span, 60))
    } else {
      numDays = 60
    }
  }
  // ... builds datasets from allModels array
  // Each model gets its own dataset with daily data points
})()}
```

### Data source: `overview.aiUsage.byTool[toolId].modelDaily`
Structure:
```ts
{
  "claude-code": {
    tokens: 3000000000,
    cost: 9351.60,
    daily: { "2026-07-26": { tokens: 500000, cost: 15.20, ... } },
    modelDaily: {
      "claude-sonnet-4-20250514": {
        "2026-07-26": { tokens: 300000, cost: 10.00, tokens_in: 50000, tokens_out: 250000, messageCount: 45, sessions: 3 }
      },
      "claude-haiku-3-5-20241022": {
        "2026-07-26": { tokens: 200000, cost: 5.20, ... }
      }
    },
    modelBreakdown: [
      { model: "claude-sonnet-4-20250514", tokens: 2000000000, cost: 6000 },
      { model: "claude-haiku-3-5-20241022", tokens: 1000000000, cost: 3351.60 }
    ]
  }
}
```

### Design tokens (from `src/components/ai/tokens.ts`)
```ts
SURFACE = { base: "bg-zinc-950", card: "bg-zinc-900/40", cardHi: "bg-zinc-900/60", inset: "bg-zinc-950/60" }
RING = { base: "ring-1 ring-zinc-800/60", hover: "ring-zinc-700", focus: "focus-visible:ring-2 focus-visible:ring-zinc-500/60" }
TEXT = { primary: "text-zinc-100", secondary: "text-zinc-400", muted: "text-zinc-500", disabled: "text-zinc-600" }
MOTION = { fast: 0.15, normal: 0.25, slow: 0.4, ease: [0.16, 1, 0.3, 1] }
```

### Chart.js components already registered
Line, Bar, Doughnut from react-chartjs-2. CategoryScale, LinearScale, LogarithmicScale, PointElement, BarElement, LineElement, ArcElement, Tooltip, Legend, Filler.

### IPC endpoints providing data
- `get-ai-usage-summary` → `{ totalTokens, totalCost, byTool: { [toolId]: { tokens, cost, sessions, models, daily, modelDaily, modelBreakdown } } }`
- `get-ide-projects-overview` → richer data including daily breakdowns per tool

---

## PART 2: DESIGN SKILLS (MUST FOLLOW)

### Human-Centric UX — 6 Pillars

1. **Clarity Over Cleverness** — User should never decode the interface. Plain language labels. Primary action obvious in 1 second.
2. **Progressive Disclosure** — Show what matters now, hide complexity. Tabs, accordions, "Advanced" toggles. Default to common case.
3. **Visual Hierarchy** — Humans scan, don't read. Guide eye with weight, color temperature, spacing. One focal point per view.
4. **Complete State Coverage** — EVERY data component must have: Empty (icon + CTA), Loading (skeleton), Error (plain language + retry), Populated. This is the #1 anti-slop rule.
5. **Feedback & Micro-interactions** — Every interactive element has hover/focus/active/disabled. State changes animate 150-300ms. Submit gives immediate feedback.
6. **Forgiveness & Affordance** — Clickable things look clickable. Touch targets ≥ 44px. Inline validation. Keyboard nav works.

### Frontend Design — Core Principles

1. **Progressive Disclosure** — opacity/scale/height transitions to reveal complexity gradually
2. **Density Without Clutter** — 8px grid, visual hierarchy through color weight not just size
3. **Glass as Structure** — `backdrop-filter: blur()` as spatial depth cues, not decoration
4. **Motion as Feedback** — 150-300ms micro-interactions. Never animate width/height/top/left.
5. **Type as UI** — In dark dashboards, typography carries 60% of visual hierarchy. Weight + color temperature, not just size.

### Frontend Design — Anti-Patterns (NEVER)

- NO `box-shadow` for elevation — use border brightness + glass layers
- NO pure black (`#000`) backgrounds — always zinc-950
- NO more than 2 font families in a view
- NO animating width/height/top/left — layout recalculation jank
- NO default browser focus rings — use brand accent ring
- NO interactive elements closer than 44px
- NO `rounded-2xl` or `rounded-3xl` — max `rounded-xl`
- NO spring physics in developer tools — use cubic-bezier

### Frontend Design — Typography Scale

```
Badge:      11px/500     — status badges, pills
Meta:       12px/400     — timestamps, secondary info
Body:       13px/400     — default body text
Body+:      14px/400     — stat values, card content
Card title: 13px/600     — section headings within cards
Section h2: 15px/600     — section titles
Page title: 18px/600     — ALL page h1 titles
Display:    24-32px/700  — timer values, hero score badges
```

### Frontend Design — Spacing Scale

```
xs: 4px   (icon padding, tight inline)
sm: 8px   (component internal padding)
md: 12px  (card padding, list items)
lg: 16px  (section gaps)
xl: 24px  (page sections)
2xl: 32px (major divisions)
```

### Impeccable — 7 Design Dimensions

1. **Typography**: Modular scale 1.25 ratio. Line height 1.5 body, 1.2 headings. 45-75 chars/line. Weight hierarchy: 400 body, 500 labels, 600 headings, 700 hero.
2. **Color**: HSL for dark themes. Build depth through opacity layers, not new hex values. One primary accent, one secondary, one semantic. Max 3 accent colors per view.
3. **Spatial**: 8px grid. High density 4-8px gaps, medium 12-16px, low 24-48px.
4. **Motion**: 120-200ms micro, 200-300ms normal, 300-500ms slow. Ease-out for UI feedback, ease-in-out for symmetric.
5. **Interaction**: Every element has hover/focus/active/disabled. Loading = spinner + opacity. Disabled = opacity-40 + cursor-not-allowed.
6. **Responsive**: Mobile-first, 4 breakpoints (sm/md/lg/xl). Container queries for component-level.
7. **UX Writing**: Direct, concise, action-oriented. Error format: "[Thing] [verb] because [reason]. [Action to fix]."

### Motion — L2 Responsive Level

- **Allowed**: hover lift/glow, press/tap scale, toggle/switch, enter/exit, tab swap, accordion, skeleton→content, list stagger, layout animation
- **Timing**: 150-300ms, ease cubic-bezier(0.16,1,0.3,1)
- **Stagger**: children 0.04-0.06s, cap total entrance under 0.4s
- **Distance**: entrance offsets small: y/x 4-12px, scale 0.96-1.0
- **Ambient**: at most ONE ambient accent at L2 (slow gradient drift, breathing dot)

### frontend-external-infra — Source Routing

| You need… | Use… |
|-----------|------|
| Standard UI block (form, table, dialog, card) | shadcn MCP |
| Animated effect (beam, particles, text animation) | Magic UI MCP |
| An icon | Lucide MCP |
| Animated component variant | React Bits MCP |
| Real photography | Unsplash MCP |
| An icon lucide doesn't have | Iconify MCP |

### frontend-external-infra — Re-Skin Rules

1. Colors → DeskFlow CSS vars
2. Max `rounded-xl`, `p-5` padding
3. Dark mode only
4. Geist + JetBrains Mono fonts
5. Glass layer (`bg-zinc-900/80 backdrop-blur-xl`)

### frontend-external-infra — Anti-Slop Checklist

- [ ] NOT default Inter/Geist-only — check font pairing
- [ ] NOT purple/indigo gradient-on-everything
- [ ] radius + padding from DeskFlow scale
- [ ] NO hero cliché (tiny eyebrow + headline + CTA)
- [ ] NO repeated tracked-uppercase kicker labels
- [ ] Real micro-interactions on key actions
- [ ] Matches actual product imagery
- [ ] Empty/loading/error states styled
- [ ] All icons from lucide-react
- [ ] Focus-visible rings use brand accent

---

## PART 3: MCP COMPONENT SOURCES

### shadcn — Card
```tsx
// Standard glass card pattern
<div className="rounded-xl border bg-card text-card-foreground shadow-sm">
  {/* content */}
</div>
// DeskFlow adaptation: bg-zinc-900/80 backdrop-blur-xl border-zinc-800/50 rounded-xl
```

### Magic UI — Number Ticker
```tsx
// Animated counter that counts up to target value
// Already in project: src/components/ui/number-ticker.tsx
// Uses framer-motion useMotionValue + useSpring
```

### Magic UI — Animated Beam
```tsx
// Animated light beam traveling along a path
// Good for: connecting related elements visually
// Use case: linking tool → model → session in detail view
```

### Lucide Icons (relevant to this feature)
- Bot, Code2, Sparkles, Activity, BarChart3, Layers, TrendingUp, DollarSign, Wrench
- Clock, Hash, Coins, FolderOpen, Monitor, Loader2, AlertCircle
- Grid3X3 (for heatmap), Flame (for heatmap intensity)

### Design System Reference

Cards: `rounded-xl p-5 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50`
Glass: `bg-zinc-900/60 backdrop-blur-xl`
Big numbers: `text-2xl font-bold font-mono tracking-tight text-white`
Labels: `text-[11px] font-medium uppercase tracking-widest text-zinc-500`
Animation: framer-motion, `initial={{ opacity: 0, y: 12 }}`, `ease: [0.16, 1, 0.3, 1]`
Status dots: `w-1.5 h-1.5 rounded-full bg-emerald-400` (active), `bg-amber-400` (idle), `bg-red-400` (error)
