# CONTINUATION_PROMPT.md — Cross-App Design System (Living Substrate + Per-Page Visual Identity)

## Context
The previous prompt (`cross-app-living-substrate`) upgraded the RD substrate to be accent-driven and global. This continuation extends the design system to **every page** in the app, establishing a repeatable framework for generating page-specific visual identity.

## What This Prompt Produces
A **design generation framework** — not just one page's design, but a method the agent can apply to ANY page to produce consistent, beautiful, non-generic visuals.

---

## Part 1: The Design Layer Stack (applies to ALL pages)

Every page in DeskFlow gets these layers, in order from back to front:

| Layer | Z-Index | What | Always Present? |
|-------|---------|------|-----------------|
| 1. Living Substrate | z-[0] | RD coral tinted to page accent | Yes (hero/standard/minimal tier) |
| 2. Ambient Glow | z-[0] | Radial gradient from accent color | Yes (always, even with RD) |
| 3. Light Rays | z-[0] | Subtle directional light streaks | Yes (kept from AppBackground) |
| 4. Vignette | z-[1] | Darkens edges for text contrast | Yes (mandatory) |
| 5. Glass Content | z-[10] | Cards, panels, interactive elements | Yes |
| 6. Floating UI | z-[50] | Modals, tooltips, dropdowns | When needed |

### Page Tier Assignment

| Tier | Pages | RD Resolution | Sim Passes | Alpha | Speed |
|------|-------|---------------|------------|-------|-------|
| **Hero** | Dashboard, Life | 384 (high-DPI) | 2 | 0.35 | 1.0 |
| **Standard** | Activity, IDE, Finance, External, AI, Learn, Resume, Insights | 256 | 1 | 0.20 | 0.6 |
| **Minimal** | Settings, Database, Terminal, Guide | 256 | 1 | 0.10 | 0.3 |

---

## Part 2: Per-Page Design Generation Framework

For each page, the agent must determine:

### A. Color Identity
- **Primary accent:** from `--page-accent` CSS variable
- **Secondary accent:** complementary or analogous color (not random)
- **Tertiary accent:** used only for data visualization, never for UI chrome

### B. Ambient Pattern
Choose ONE ambient pattern per page (never combine):

| Pattern | When to Use | Example Pages |
|---------|-------------|---------------|
| **Living Substrate** (RD coral) | Hero pages, organic feel | Dashboard, Life |
| **Dot Pattern** | Data-heavy pages, structured feel | Activity, Stats, Database |
| **Gradient Wash** | Clean pages, minimal feel | Settings, Guide |
| **Mesh Gradient** | Creative pages, fluid feel | AI, Feature Studio |
| **None** | Terminal (text-dominant) | Terminal |

### C. Card Treatment
All glass cards use: `bg-zinc-900/75 backdrop-blur-xl border border-zinc-800/50 rounded-xl p-5`

Hero cards may add:
- BorderBeam (conditional, only when state is active)
- MagicCard (mouse-following gradient for interactive cards)
- DotPattern overlay at 0.04 opacity

### D. Typography Accent
- Page title: `text-2xl font-serif` with gradient text in accent color
- Section headers: use `<SectionHeader>` component with `--page-accent`
- Body: `text-[13px] text-zinc-300` (Geist/Inter)
- Mono: `font-mono text-[12px]` (JetBrains Mono)

### E. Motion Profile
- Page transitions: `crossfade` (opacity + y-offset, 0.2s)
- Card hover: `hover:-translate-y-0.5 hover:border-zinc-700/50`
- List items: staggered entrance (0.03s per item, max 0.3s)
- Data updates: NumberTicker for counts, smooth fade for lists

---

## Part 3: Page-Specific Design Specs

### Dashboard (`/`) — Hero Tier
- **RD accent:** `#ec4899` (pink)
- **Hero element:** MomentumOrb (large, centered, animated)
- **Ambient:** Living Substrate at full alpha + DotPattern overlay
- **Cards:** GoalsCard (magic card), DeadlinesCard (border beam on urgent), QuickFocusCard, LongestFocusCard
- **Special:** Top bar with LIVE badge, timer with tier-colored glow

### Activity (`/activity`) — Standard Tier
- **RD accent:** `#22d3ee` (cyan)
- **Ambient:** DotPattern at 0.05 opacity (data-dense, needs structure)
- **Cards:** AppUsageTable, WebsiteGrid, ProductivityScore, DailyTimeline
- **Special:** Tab bar with animated pill indicator

### IDE Projects (`/ide`) — Standard Tier
- **RD accent:** `#8b5cf6` (violet)
- **Ambient:** Living Substrate at reduced alpha
- **Cards:** ProjectGrid, AIUsageTimeline, CodeActivityHeatmap
- **Special:** AI Tools subpage with model/tool usage charts

### Life (`/life`) — Hero Tier
- **RD accent:** `#fbbf24` (amber) — the ORIGINAL, now global
- **Ambient:** Living Substrate at full alpha (the Aether)
- **River mode:** Substrate behind PhaseCards, Vital Thread over it
- **Pages mode:** Substrate excluded per spec (focused tasks)
- **Self tab:** Violet theme, stat strip, SectionHeaders

### Finance (`/finance`) — Standard Tier
- **RD accent:** `#10b981` (emerald)
- **Ambient:** Gradient wash (clean, financial feel)
- **Cards:** NetFlowCard, BudgetBreakdown, SubscriptionBurden, WalletHealth
- **Special:** Currency formatting, privacy mask pattern

### External (`/external`) — Standard Tier
- **RD accent:** `#fbbf24` (amber)
- **Ambient:** DotPattern (time-grid feel)
- **Cards:** ActivityMosaic, SleepPatterns, GapDetection, ManualTime
- **Special:** Mosaic grid with treemap algorithm

### Terminal (`/terminal`) — Minimal Tier
- **RD accent:** Dynamic per workspace group
- **Ambient:** None (text-dominant, substrate would distract)
- **Special:** Workspace groups with accent colors, terminal panes

### AI Assistant (`/ai`) — Standard Tier
- **RD accent:** `#8b5cf6` (violet)
- **Ambient:** Mesh gradient (fluid, creative feel)
- **Cards:** ChatHistory, DailyPlan, TopicDigest, GoalHistory
- **Special:** Canvas mode with draggable cards

### Learn (`/learn`) — Standard Tier
- **RD accent:** `#6366f1` (indigo)
- **Ambient:** Gradient wash (educational, calm)
- **Cards:** LessonTree, ProgressRings, Flashcards
- **Special:** Hierarchy visualization with colored levels

### Settings (`/settings`) — Minimal Tier
- **RD accent:** `#22d3ee` (cyan)
- **Ambient:** Gradient wash (minimal, clean)
- **Cards:** CategoryCards, ToggleGroups, ColorPickers
- **Special:** Organized by concern (General, Tracking, Prompts, Colors)

### Database (`/database`) — Minimal Tier
- **RD accent:** `#a78bfa` (light violet)
- **Ambient:** DotPattern at 0.03 (data-grid feel)
- **Cards:** TableBrowser, QueryEditor, SchemaViewer
- **Special:** Monospace-heavy, minimal chrome

### Insights (`/reports`) — Standard Tier
- **RD accent:** `#ec4899` (pink)
- **Ambient:** DotPattern (analytical feel)
- **Cards:** WeeklyReport, DailyBreakdown, ActivityTimeline
- **Special:** Charts with accent-colored axes

---

## Part 4: Anti-Slop Checklist (per page)

Before shipping any page design:
- [ ] RD tint matches page accent (not generic purple)
- [ ] Vignette ensures text contrast (WCAG AA)
- [ ] Glass cards use `bg-zinc-900/75` (not `/30` or `/40`)
- [ ] Cards have consistent padding (`p-5`) and radius (`rounded-xl`)
- [ ] Typography hierarchy: serif title → semibold section → regular body
- [ ] Icons from lucide-react only (no emoji, no inline SVG)
- [ ] Empty/loading/error states styled with page accent
- [ ] Motion respects `prefers-reduced-motion`
- [ ] No purple gradient-on-everything (use page-specific accent)
- [ ] Focus rings use `--page-accent` color

---

## Part 5: Generation Workflow (for any page)

When asked to design a new page or update an existing one:

1. **Identify page tier** (hero/standard/minimal)
2. **Read `--page-accent`** from CSS or route definition
3. **Choose ambient pattern** from the table in Part 2B
4. **Apply glass standard** to all cards
5. **Set typography accent** using page accent color
6. **Choose motion profile** based on page density
7. **Run anti-slop checklist** before shipping
8. **Verify** with Probe MCP (runtime visual check)

---

## Part 6: Implementation Priority

### Phase 1: Global RD (already spec'd in cross-app-living-substrate)
- Shader upgrade (accentColor uniform)
- Component upgrade (props)
- Global mounting (AppBackground)
- Per-page tier assignment

### Phase 2: Glass Standardization
- Audit ALL pages for `bg-zinc-900/30` or `/40`
- Replace with `bg-zinc-900/75 backdrop-blur-xl`
- Verify contrast passes WCAG AA

### Phase 3: Typography Unification
- All page titles use serif + gradient text
- All section headers use `<SectionHeader>` component
- All body text uses `text-zinc-300` (not `/400` or `/500`)

### Phase 4: Motion Pass
- Page transitions: crossfade
- Card hover: subtle lift
- List entrance: stagger
- Data updates: NumberTicker

### Phase 5: Per-Page Ambient Patterns
- Dashboard: RD hero + DotPattern overlay
- Activity: DotPattern
- IDE: RD standard
- Finance: Gradient wash
- External: DotPattern
- Terminal: None
- AI: Mesh gradient
- Learn: Gradient wash
- Settings: Gradient wash
- Database: DotPattern
- Insights: DotPattern

---

## Files to Create/Modify

### New Files
- `src/components/ui/ambient-patterns.tsx` — reusable ambient pattern components
- `agent/docs/design-specs/per-page-design-tokens.md` — per-page token reference

### Modified Files
- `src/shaders/rd-display.glsl` — accentColor uniform
- `src/components/life-river/LivingSubstrate.tsx` — props
- `src/components/AppBackground.tsx` — global mounting + tier logic
- `src/index.css` — RD token variables
- `src/App.tsx` — data-rd-tier per route
- Every page component — glass standardization + typography pass
