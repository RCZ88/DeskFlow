## Raw Request
"The AI Tools tab has no data display — just a header bar. The Analytics tab has ugly stat cards (a grid with Most Active / Most Efficient / Export CSV) that are poorly styled. I want a unified redesign where the AI Tools tab shows proper stats and the Analytics data is integrated into the AI Tools tab. The per-agent AI agent list must remain separated and visible. Do NOT implement directly. Generate a high-fidelity design specification (RESULT.md) with exact visual specs, component layout, measurements, colors, and interaction flow. Use ALL the frontend design skills (frontend-design/impeccable/taste-skill/ui-ux-pro-max/design-taste) to make it the best looking possible."

## Context Bundle Reference
See `agent/docs/ui-redesign-analytics-ai-tools/CONTEXT_BUNDLE.md` for complete technical context including:
- Current AI Tools tab code (IDEProjectsPage.tsx:1518–) — only a summary bar, NO stats
- Current Analytics tab code (IDEProjectsPage.tsx:2675–) — renders AnalyticsDashboard with ugly stat cards
- Data fetching useEffect (IDEProjectsPage.tsx:304–327) — 5 concurrent IPC calls
- AnalyticsDashboard component internals — stat grid with Most Active/Most Efficient/Export CSV
- IPC endpoints: getAIUsageSummary, getProblems, getRequests, getTerminalSessions, getPromptHistory
- Full design system tokens: colors (pink-500 primary, violet-500 page accent), spacing (p-5 cards, 8px grid), typography (Geist + JetBrains Mono), animations (250ms ease-out)
- All 5 design skill references with their unique contributions

## Engineering Task: Data Pipeline for Unified AI + Analytics Tab
Design a data processing architecture that:

1. When the AI Tools tab becomes active, fetches workspace analytics data (AI usage summary, sessions, problems, requests, prompt history) in parallel — same data currently fetched only by the Analytics tab's useEffect
2. Computes derived statistics from the raw data:
   - Total tokens consumed (all-time + period-filtered)
   - Total cost (all-time + period-filtered)
   - Active session count, total session count
   - Per-agent breakdowns from the sessions data
   - Trends (7-day, 30-day token/cost change)
3. Caches the analytics response in a ref or lightweight state so switching between AI Tools and Analytics tabs doesn't re-fetch
4. Passes the same data to both the new AI Tools tab stats display AND the AnalyticsDashboard component when Analytics tab is active (shared data source)
5. Handles loading states (initial fetch) and empty states (no usage data yet) gracefully
6. Preserves the per-agent card list below the stats area — these must remain fully visible and separately scrollable

### Data Flow Spec
```
AI Tools tab activated
  → fetch workspace analytics (5 IPC calls in parallel)
  → cache in ref state
  → render: [Summary Bar] [Stats Grid/Dashboard] [Per-Agent Cards]
  → switching to Analytics tab uses cached data, no re-fetch
```

## Design Task: High-Fidelity Visual Specification for Unified UI

Create an exact visual specification that defines every pixel of the redesigned AI Tools tab. The design MUST follow ALL five frontend design skills simultaneously.

### What to Design

The AI Tools tab content area should contain three zones, top to bottom:

**Zone 1 — Compact Header Bar** (already exists, may be refined)
- "AI Agents" title with active count badge
- Sync AI button (already exists)
- Show/Hide Details toggle (already exists)
- Optional: period selector (Today / 7d / 30d / All) if stats are period-aware

**Zone 2 — Stats Dashboard** (currently MISSING — this is the main deliverable)
This replaces what's currently in the Analytics tab stat cards AND the AnalyticsDashboard component. Design a compact, information-rich stats area that shows:
- **KPI Row**: 3-4 key metrics in a horizontal row (not the current ugly 3-column grid). Suggested metrics:
  - Total Tokens (formatted: 25.4B)
  - Total Cost (formatted: $12.34)
  - Active Sessions (count)
  - Model Count / Tool Count
  Each KPI should be a compact card with: icon + label + value + optional trend indicator (up/down arrow with % change)
- **Charts Section**: Below the KPI row, one or two compact chart cards:
  - Token usage by tool (bar chart) — keep compact, not full-width
  - Sessions by agent (bar chart) — compact
  Charts should use the project's glass card containers, NOT the current AnalyticsDashboard styling

**Zone 3 — Per-Agent Cards** (already exists, must be preserved)
The existing per-agent listing with name, status, tokens, messages, cost, model, files — must remain visually separated and fully functional.

### Visual Specification Format

For each component, specify:
- **Name and purpose**
- **Container styling**: exact Tailwind classes, glass variant, border radius, padding
- **Typography**: font family, size, weight, color for each text element
- **Icon**: lucide-react icon name, size, color
- **Spacing**: margin, padding, gap values (in px/Tailwind units)
- **States**: default, hover, active, loading, empty, error
- **Animations**: framer-motion variants (entrance, exit, hover) — duration, delay, easing

### Explicit Design Skill Requirements

From **frontend-design**:
- Use glass card containers (`bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5`)
- Page accent is violet-500 (IDE Projects page)
- Card padding is ALWAYS p-5 (20px), NEVER p-6 or p-8
- Border radius is ALWAYS rounded-xl (12px), NEVER rounded-2xl or rounded-3xl
- Animation durations: fast 150ms, normal 250ms, slow 400ms
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` — NO spring physics
- Type as UI: use weight and color temperature, not just size
- Progressive disclosure: show summary KPIs first, expandable charts on demand

From **impeccable** (7 domains + 27 anti-patterns):
- Typography: modular scale (base 13px body), line-height 1.5 body / 1.2 headings
- Color: ONE primary accent (violet-500) + ONE secondary (pink-500 for AI accent) — max 3 accents per view
- Spatial: 8px grid, 44px minimum touch targets
- Motion: NEVER animate layout properties (width, height, margin)
- Interaction: EVERY interactive element MUST have a hover state (minimum: opacity-80)
- Anti-patterns to AVOID: opacity-50 on text (use dedicated color tokens), pure black backgrounds, font-thin on dark bg, cards without clear boundaries, `transition: all`, loading spinners without progress for >3s ops
- UX writing: action-oriented button labels ("Sync AI" not "Synchronize"), direct error messages

From **taste-skill** (knobs):
- DESIGN_VARIANCE: 5 (balanced — one distinctive element per component)
- MOTION_INTENSITY: 5 (moderate — 250ms, no physics, fade/slide/scale)
- VISUAL_DENSITY: 7 (dense — information-rich, power-user oriented)
- Anti-repetition: if last design used pink accent, this one uses violet; vary border radius subtly (8-12px range)

From **ui-ux-pro-max** (industry rules):
- Developer Tool aesthetic: dark chrome, high information density, command-palette feel
- ANTI-PATTERNS for dev tools: NO consumer-grade rounded corners (>12px), NO excessive whitespace, NO decorative gradients on functional elements
- Typography: Geist for UI headings + body, JetBrains Mono for data/numbers/tokens
- Motion: fast (100-150ms), linear or ease-out — NO bounces in serious tools
- Empty/Loading/Error states MUST be designed (not just "No data")
- Color: deep zinc base (#09090b), ONE vibrant accent per view

From **design-taste** (master aggregator):
- Decision flow: product type = developer tool → purpose = AI usage data → knob values = 5/5/7 → anti-repetition check → anti-pattern verification
- Unified vocabulary: canvas (content area), palette (stats zone), gutter (spacing between zones)
- Inspiration reference: Linear (minimal, clean data display), Raycast (sleek dark chrome), Vercel (precision)
- Pre-generation checklist: knob values set, industry rules applied, anti-repetition check done, no anti-pattern violations, component patterns from frontend-design selected

## UX Task: Interaction Flow

1. **Tab switching**: When user switches from AI Tools to Analytics tab, the analytics data is already cached — NO loading spinner, instant display
2. **Stats interaction**: Hovering a KPI card shows a brief tooltip with the period the stat covers. Clicking a KPI could expand related charts
3. **Chart interaction**: Hover on chart bars shows tooltip with exact values. Clicking a bar filters the per-agent cards below
4. **Period filtering**: Optional period selector affects ALL stats simultaneously (not individual)
5. **Empty state**: When no usage data exists, show a friendly empty state explaining what WOULD appear here (e.g., "AI usage stats will appear after your first agent session")
6. **Loading state**: Initial fetch shows skeleton placeholders matching the KPI card dimensions, not a full-page spinner
7. **Error state**: If data fetch fails, show inline error within each failed card section with a retry button (not a full-page error)

## Constraints

1. MUST use Tailwind v4 syntax only (`@import "tailwindcss"` in index.css)
2. MUST use TypeScript with React 19
3. MUST work within Electron IPC architecture (renderer has NO Node.js access)
4. MUST use framer-motion for all animations
5. MUST use lucide-react for all icons
6. MUST use Chart.js (via react-chartjs-2) for charts
7. Card padding is ALWAYS p-5 (20px), border radius is ALWAYS rounded-xl (12px)
8. Glass card containers are ALWAYS `bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5`
9. Per-agent cards section MUST remain separated and fully visible below the stats area
10. NEVER use git commands for state management or file operations
11. ALL color choices must use the project's existing design system tokens
12. The Analytics tab should re-use the same AnalyticsDashboard component but with the NEW styling (not the current ugly stat cards)

## Output Format

Produce a single **RESULT.md** file containing:

1. **Combined/Separate Decision**: Clear recommendation with reasoning. Likely: stats are integrated into the AI Tools tab, Analytics tab stays as the detailed/deep-dive view using same component.

2. **Component Tree**: Full component hierarchy for the redesigned AI Tools tab:
   ```
   IDEProjectsPage
     └── AI Tools Tab (activeTab === 'ai')
           ├── HeaderBar (existing, refined)
           ├── StatsDashboard (NEW — replaces AnalyticsDashboard stats)
           │     ├── KpiRow (3-4 compact metric cards)
           │     └── ChartsSection (compact token + session charts)
           └── PerAgentCards (existing, preserved)
   ```

3. **Visual Specification**: For EVERY component in the tree — exact Tailwind classes, colors (hex), sizes (px), spacing (Tailwind units), typography (font/size/weight/color), icons (lucide-react name/size/color), animation framer-motion variants, and all states (default/hover/active/loading/empty/error).

4. **Data Flow**: How data is fetched, cached, and shared between AI Tools and Analytics tabs.

5. **Interaction Spec**: Hover, click, focus behavior for every interactive element.

6. **Migration Path**: Step-by-step implementation plan:
   - Phase 1: Create StatsDashboard component with KPI row + chart section
   - Phase 2: Wire data fetching + caching
   - Phase 3: Refine Analytics tab to use shared data + new styling
   - Phase 4: Remove old AnalyticsDashboard stat cards

7. **Skill Compliance Checklist**: Verify that every requirement from all 5 design skills is met. List each skill's specific rules and check the design against them.
