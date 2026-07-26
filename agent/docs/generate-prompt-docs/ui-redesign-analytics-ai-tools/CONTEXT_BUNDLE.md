# Context Bundle: AI Tools + Analytics Tab Redesign

## Overview
This bundle contains current source code context for the AI Tools tab and Analytics tab within **IDEProjectsPage.tsx** (the main IDE Projects page). The user wants a unified redesign of both tabs — the AI Tools tab currently has NO stats display, and the Analytics tab's stat cards are considered ugly.

## Key Files
- `src/pages/IDEProjectsPage.tsx` — Both tabs live here (~3975 lines total)
- `src/components/AnalyticsDashboard.tsx` — The analytics dashboard rendered in the Analytics tab
- `src/pages/AiPage.tsx` — Separate /ai route page (goal planning, digest, etc.)
- `src/services/AIService.ts` — Backend AI service for token/session data

## Current State

### AI Tools Tab (IDEProjectsPage.tsx:1518–)
Currently shows ONLY a summary bar:
- Header: "AI Agents" with active count (e.g., "3 active")
- Buttons: "Sync AI" (import usage data), "Show Details" (toggle debug panel)
- NO stats display at all — no tokens, no sessions, no cost, no metrics
- Below the summary bar: agent debug panel (togglable) and agent cards

### Analytics Tab (IDEProjectsPage.tsx:2675–)
Shows:
- Header: "Workspace Analytics" with subtitle
- Renders `<AnalyticsDashboard>` component which contains:
  - **Stat card grid** (`grid grid-cols-1 md:grid-cols-3`) with:
    - "Most Active" card: shows top agent name + token count
    - "Most Efficient" card: shows top agent name + tokens/msg
    - "Export CSV" button card
  - Various charts via Chart.js (bar, pie, line)
  - Glass card containers with `bg-zinc-900/75 backdrop-blur-xl border border-zinc-800/50`

### Data Fetching (IDEProjectsPage.tsx:304–327)
useEffect fires when activeTab === 'analytics'. Five concurrent IPC calls:
1. `getAIUsageSummary('month')` — token/cost by tool
2. `getProblems()` — reads JSON files
3. `getRequests()` — reads JSON files
4. `getTerminalSessions(undefined, 500)` — DB query
5. `getPromptHistory({ limit: 2000 })` — DB query

### Per-Agent Cards
Below the summary bar in the AI Tools tab, there's a full per-agent listing with:
- Agent name, status, last active time
- Token counts, message counts, cost
- Model info, file counts, session info
- These must remain as a separate, visible section

## Data Structures
```typescript
// IDEProjectsPage state
const [aiAgents, setAiAgents] = useState<any[]>([]);
const [aiLastSyncAt, setAiLastSyncAt] = useState<string | null>(null);
const [syncingAI, setSyncingAI] = useState(false);
const [showAgentDebug, setShowAgentDebug] = useState(false);
const [agentDebugInfo, setAgentDebugInfo] = useState<any>(null);
const [workspaceAnalytics, setWorkspaceAnalytics] = useState<{
  aiUsage: any; sessions: any[]; problems: any[]; requests: any[]; promptHistory: any[]
} | null>(null);
const [analyticsLoading, setAnalyticsLoading] = useState(false);

// IPC responses
getAIUsageSummary('month') returns: { byTool: Array<{tool, total_tokens, total_cost}>, summary: { totalTokens, totalCost, totalSessions, byModel } }
getTerminalSessions returns: Array<{id, agent_type, status, started_at, ended_at, ...}>
getPromptHistory returns: Array<{id, content, response, created_at, ...}>
```

## Design System Tokens
The project uses a strict design system defined across 5 skills:

### Colors (from frontend-design.skill)
- Base: zinc-950 (#09090b)
- Elevated: zinc-900 (#18181b)
- Glass: zinc-900/50 + backdrop-blur-xl
- Primary accent: pink-500 (#ec4899) — **NOT** violet
- Secondary: cyan-400 (#22d3ee)
- Success: emerald-400, Warning: amber-400, Error: red-400
- Primary text: zinc-100, Secondary: zinc-400, Muted: zinc-600
- Borders: zinc-800 (subtle), zinc-700 (active)

### IDE Projects Page accent: violet-500 (#8b5cf6)

### Spacing
- Card padding: `p-5` (20px) — NEVER p-6 or p-8
- Grid: 8px base (4px micro-adjustments only)
- Section gaps: 24px (space-y-6)

### Typography
- Page title: 18px/600
- Section h2: 15px/600
- Card title: 13px/600
- Body: 13px/400
- Stat values: 14px/400
- Meta/timestamps: 12px/400
- Badge: 11px/500
- Font: Geist (UI) + JetBrains Mono (code/data)

### Border Radius
- ALL cards/containers: `rounded-xl` (12px) — NEVER rounded-2xl or rounded-3xl

### GlassCard Variants
- Default: `bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5 hover:border-zinc-700/60 transition-colors duration-150`
- Elevated: `bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.3)]`
- Interactive: Default + `hover:border-accent-primary/30 cursor-pointer`

### Animations
- Fast: 150ms, Normal: 250ms, Slow: 400ms
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)`
- ONLY animate transform and opacity — NEVER layout properties

### Status Colors
- Active: emerald, Idle: amber, Completed: green, Error: red, Cancelled: zinc

## Design Skill References (MUST INCORPORATE ALL)

### 1. frontend-design (v3.0.0)
- Glass as structure, not decoration
- Density without clutter (8px grid)
- Motion as feedback (150-300ms)
- Type as UI (weight + color temperature hierarchy)
- Page-specific accent colors
- TabBar pattern, SectionHeader pattern, Modal pattern
- Complete component patterns (GlassCard, StatCard, ChartCard)
- Z-index scale, animation tokens
- Anti-patterns: no box-shadow, no pure black, no animating layout properties

### 2. impeccable (v1.0.0) — 7 Domains, 27 Anti-Patterns
- Typography: modular scale 1.25, line-height 1.5 body/1.2 headings
- Color: hsl() for systematic adjustment, ONE primary + ONE secondary + ONE semantic accent max
- Spatial: 8px grid, density zones (4-8px high, 12-16px medium, 24-48px low)
- Motion: never animate layout, never `transition: all`
- Interaction: every element MUST have hover state, 44px touch targets
- Responsive: container queries, never hide content on mobile
- UX Writing: direct, action-oriented, error format "[Thing] failed because [reason]"

### 3. taste-skill (v1.0.0) — Three Tunable Knobs
- DESIGN_VARIANCE: 5 (balanced — mix of safe and bold)
- MOTION_INTENSITY: 5 (moderate — 250ms, no physics)
- VISUAL_DENSITY: 7 (dense — power-user oriented, information-rich)
- Anti-repetition rules: vary font, color, shape every 5th component

### 4. ui-ux-pro-max (v1.0.0) — Industry Rules
- Developer Tool aesthetic: dark chrome, monospace, high density, command palette patterns
- Typography: Geist (UI) + JetBrains Mono (code/data)
- Motion: fast (100-150ms), linear or ease-out, NO bounces
- Anti-pattern: rounded corners > 12px on serious tools, excessive whitespace, decorative gradients
- Pre-delivery checklist: contrast ratios, touch targets, reduced motion, empty/loading/error states

### 5. design-taste (v1.1.0) — Master Aggregator
- Decision tree: product type → component purpose → user-facing? → knob values → anti-repetition → anti-pattern check
- Inspiration: Linear (ultra-minimal, purple accent), Vercel (black/white precision), Raycast (sleek dark chrome)

## Known Issues to Solve
1. AI Tools tab has NO stats display — just a summary bar with agent count
2. Analytics tab stat cards are visually unappealing (grid of 3 cards: Most Active, Most Efficient, Export CSV)
3. Data is fetched in 5 concurrent IPC calls with no caching
4. Both tabs are in the same IDE Projects page but styled inconsistently
5. Per-agent cards must remain separated and visible at all times
6. The overall layout lacks visual hierarchy and coherence

## Constraints
- Tailwind v4 ONLY (`@import "tailwindcss"` in index.css)
- TypeScript + React 19
- Electron/preload IPC architecture (renderer has NO Node access)
- framer-motion for animations
- lucide-react for icons
- Chart.js via react-chartjs-2 for charts
- NO git commands for state management
- All card padding is p-5 (20px), max rounded-xl (12px)
- Use glass card pattern (`bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5`)
