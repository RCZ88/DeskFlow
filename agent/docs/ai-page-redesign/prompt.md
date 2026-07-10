# PROMPT — AI Assistant Page Full UI/UX Revamp

## Raw Request

"YOU MADE TEH UI WORSE.OMFGGGGGG i need you to generate prompt skill to revamp teh entire ui ux of the AI ASSISTANT PAGE. ALL OF THE CARDS AND ALL OF HTE CONTENTS AND DESING AND ALLIGNMENTS OF THE AI PAGE NEEDS TO BE REVAMPED. tell the agent (Trhough the prompt ) to use all frontend skill slike impeccable frontend design taste mmotion and everything. also use all the mcps (you use them) to provide with elements and stuff. inside the prompt"

---

## Context & Problem

The AI Assistant page (`/ai`) in DeskFlow has been redesigned and the user rejected it as worse than before. The current implementation suffers from:

- **Visual blandness** — cards look generic, no personality, no differentiation between sections
- **Poor alignment** — elements don't form a cohesive visual hierarchy
- **Missing character** — the page feels like a wireframe, not a polished product
- **Daily Digest buried** — a first-class feature hidden inside Reflect
- **Cards lack content** — empty states dominate, no visual richness when data exists
- **No visual rhythm** — sections blend together without distinct identity

The user demands a COMPLETE revamp of ALL cards, ALL contents, ALL design, and ALL alignments. Every section must be redesigned with character and polish.

---

## Mandate

You are the Lead Designer and Engineer for the DeskFlow AI Assistant page. Your job is to produce a comprehensive, high-fidelity design specification that transforms this page from a bland wireframe into a polished, character-rich, alive AI assistant surface.

**You must:**
1. Read `CONTEXT_BUNDLE.md` first — it contains all code, tokens, IPC endpoints, and architecture
2. Read `RESULT_NEW.md` — it contains the existing design spec (773 lines) that serves as your baseline
3. Use ALL frontend design skills (see §Required Skills below) to generate world-class design
4. Use ALL available MCPs (see §Required MCPs below) to source real components, animations, and icons
5. Produce a single `RESULT.md` with pixel-level specs for every component

---

## Scope — What Must Be Revamped

**EVERYTHING on the AiPage.** No exceptions. Specifically:

### Primary (must be spectacular)
1. **AiPage.tsx** — page layout, header, background, section rhythm, responsive breakpoints
2. **DailyDigestBoard.tsx** — must be a hero section, not buried; daily digest is first-class
3. **FocusBoard.tsx** — metric cards, goal rows, mode indicator, suggestions, review panel
4. **PlanBoard.tsx** — weekly plan pane, long-term goals pane, bulk import dialog
5. **ReflectFeed.tsx** — timeline, digest cards, history cards, filter tabs

### Secondary (must be polished)
6. **AiChat.tsx** — chat shell, header, message bubbles, empty state, thinking indicator
7. **ChatInput.tsx** — textarea, send button, voice button, char count ring
8. **ConnectorsPanel.tsx** — connector cards, sync progress, item list, filter bar
9. **SummaryGrid.tsx** — 4 metric cards (TodayOverview, AiUsage, ProjectStatus, ContextSummary)
10. **Shared primitives** — GlassCard, SectionHead, StatusDot, IconButton, StateShell

---

## Non-Negotiable Constraints

```
Tailwind v4 only
p-5 max card padding
rounded-xl (12px) max border radius
NO box-shadow — depth via border brightness + glass layers
Animate transform + opacity ONLY
Easing: cubic-bezier(0.16, 1, 0.3, 1)
Durations: 150ms / 250ms / 400ms
NO spring physics
Every localStorage access in try/catch
CRLF preserved
Renderer-first fixes only
React + framer-motion + lucide-react only
shadcn via npx shadcn@latest add
Dark mode only — strip any light-mode variants
Geist/Inter 13px body, JetBrains Mono for code/numbers
```

**Liveliness Level: L2 — Responsive.** Micro-interactions + smooth state transitions + exactly one restrained ambient accent (breathing status dot on chat header). No scroll choreography, no parallax, no particle fields.

**Taste knobs:** `DESIGN_VARIANCE = 5`, `MOTION_INTENSITY = 6`, `VISUAL_DENSITY = 7`

**Industry style:** Dark Glass / dev-tool. Zinc base, single pink accent for AI/chat, monospace for numbers and code. High info density, command-palette affordances, fast (150ms) feedback, no bounce.

---

## Required Frontend Skills

You MUST load and follow ALL of these skills. Each teaches a different dimension of design excellence:

| Skill | What It Teaches | Why It Matters |
|-------|----------------|----------------|
| **frontend-design** | DeskFlow-specific UI patterns, component specs, page layouts | Project-specific patterns |
| **impeccable** | Typography, color, motion, spatial, interaction design (6 pillars) | Design quality fundamentals |
| **humancentred-UIUX** | State coverage, clarity, progressive disclosure, 4-state contract | Never show blank boxes or raw errors |
| **ui-ux-pro-max** | Industry style application, density control, professional polish | Dev-tool aesthetic |
| **motion-alive** | L2 motion budget, micro-interactions, entrance choreography | Page feels alive without performing |
| **taste-skill** | Master aggregator — references all design sub-skills | Design coherence |
| **frontend-external-infra** | Source routing table, MCP server connections, anti-slop checklist | Real component inventory |

---

## Required MCPs

You MUST use these MCPs to source real components, animations, and icons. Never invent from zero.

| MCP Server | What to Pull | When to Use |
|------------|-------------|-------------|
| **shadcn** (`npx shadcn@latest mcp`) | Standard UI blocks: buttons, cards, dialogs, tabs, tooltips, skeletons, progress, scroll-area, avatar, separator, dropdown-menu | Any standard UI element |
| **magicui** (`@magicuidesign/mcp`) | Animated components: number-ticker, typing-animation, animated-list, bento-grid, magic-card, border-beam, particles, meteors, confetti, text animations | Animated effects, text animations, card hover effects |
| **lucide** (`lucide-icons-mcp`) | 1500+ SVG icons: search by keyword, get import code | Any icon need |
| **@21st-dev/magic** | Prompt-to-component: describe what you need, get polished React component | Unique component variations not in shadcn/Magic UI |
| **motion-dev** (community MCP) | Offline Motion.dev docs + animation codegen | High-quality motion beyond simple fade/slide |
| **unsplash** (`unsplash-smart-mcp-server`) | Stock photography with auto-attribution | Hero backgrounds, section illustrations (if needed) |
| **reactbits** (`reactbits-dev-mcp-server`) | 135+ animated React components | Text animations, particle effects, background effects, hover interactions |
| **iconify** (`better-icons-mcp`) | 200,000+ icons across 200+ sets | When lucide lacks the icon you need |

---

## Anti-Slop Checklist (must pass for every component)

- [ ] **Type**: Geist body, JetBrains Mono code. No third font.
- [ ] **Color**: NOT purple/indigo gradient-on-everything. Use DeskFlow's defined tokens.
- [ ] **Geometry**: radius + padding from DeskFlow's scale (`rounded-xl`, `p-5`), not source values.
- [ ] **Hero**: no tiny uppercase eyebrow pill + oversized headline + lone CTA cliché.
- [ ] **Sections**: no repeated tracked-uppercase kicker label above every heading.
- [ ] **Motion**: real micro-interactions on key actions; respects `prefers-reduced-motion`.
- [ ] **Imagery**: matches the actual product; no filler glow/blobs.
- [ ] **Empty/loading/error states**: exist and are styled using DeskFlow patterns.
- [ ] **Icons**: all from lucide-react. No emoji as UI icons.
- [ ] **Accessibility**: focus-visible rings use DeskFlow's `--page-accent` pattern.

---

## Design Requirements (specific to each section)

### AiPage Layout
- Two-column xl shell: context rail (col-span-4) + chat (col-span-8)
- Sticky header (h-14) with title, day label, mode pill, Settings/Features
- Mount choreography: stagger entrance < 400ms total
- Mobile: single column, accordion sections

### Daily Digest (must be prominent)
- FIRST-CLASS section, not buried
- Hero card with Calendar icon, "Daily Digest" title, "AI-curated" badge
- TopicCard with collapsible summary + sources
- Empty states: no topics configured vs ready to generate
- Provider badge, refresh, configure buttons

### Focus Board
- 3 metric cards with NumberTicker animation
- Mode indicator (Morning/In-Progress/Review) with accent pill + icon
- Goal rows: CheckCircle, category dot, target seconds
- AI suggestions with Accept/Dismiss actions
- Review panel (evening mode): completion stats, feedback input
- Empty state: "Plan your day" with Suggest goals CTA

### Plan Board
- Two-pane xl layout (WeekPane + LongTermPane side by side)
- WeekPane: Planning.md viewer/editor
- LongTermPane: goal list with add, reorder, delete, bulk import
- BulkImportDialog: AI text-to-goals

### Reflect Feed
- Filter tabs: All, Research, Goals (with counts)
- Timeline with vertical gradient line
- Digest cards: collapsible topic + summary + sources
- History cards: collapsible day + goal status icons
- Empty states per filter

### Chat Interface
- GlassCard shell with pink accent bar
- ChatHeader: StatusDot (breathing when ready), provider badge, reset/configure
- MessageBubble: user (pink) vs assistant (zinc), avatars, timestamps, copy button
- TypewriterText: streaming caret for latest assistant message
- AgentProgressBar: round/tool progress with scaleX animation
- ThinkingIndicator: 3 dots, staggered opacity
- ChatInput: auto-resize textarea, CharCountRing, VoiceInputButton, SendButton
- ChatEmptyState: greeting + suggestion chips
- 4 states: loading (skeleton bubbles), empty, error (inline retry), populated

### Connectors Panel
- ConnectorCard: TypeIcon, name, StatusDot, actions (sync/test/remove/expand)
- Sync progress: indeterminate bar + "Syncing..." label
- Expanded ConnectorItemList: ItemFilterBar (All/Email/Event + search + unread)
- ConnectorItemRow: unread dot, type glyph, subject, summary, date
- LoadMoreButton for pagination
- Empty state: "No connectors yet" with Add CTA

### Summary Cards (4-card grid)
- MetricCard shell: icon tile, label, big number (ticker), footer
- TodayOverviewCard (pink): total seconds, session count, top app
- AiUsageCard (violet): token count, cost, tool count, mini bar chart
- ProjectStatusCard (emerald): project count, recent project, language badge
- ContextSummaryCard (amber): completion ring (SVG donut), pending/done counts
- 60s refresh cycle, stale indicator, manual refresh per card

---

## Expected Deliverables

1. **RESULT.md** — Complete design specification with:
   - Pixel-level specs for every component
   - Exact Tailwind classes for every element
   - Animation specs (property, duration, easing)
   - State transitions (loading/empty/error/populated)
   - Responsive breakpoint behavior
   - Accessibility requirements

2. **Component tree** for each section showing exact props interfaces

3. **Animation summary table** for each section

4. **MCP component mapping** — which components come from which MCP server

5. **Self-audit checklist** — must pass before shipping

---

## Verification Steps

After implementation, verify:
1. `node scripts/build.mjs` completes without errors
2. Reload Electron app, navigate to `/#/ai`
3. No console errors in renderer or main
4. Daily Digest is prominent and visible
5. All sections have character and polish
6. Responsive at 390px, 768px, 1024px, 1440px
7. Reduced-motion: no animation loops, opacity-only transitions
8. All 4 states (loading/empty/error/populated) render correctly for each component

---

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` for:
- All relevant source code with file paths and line numbers
- IPC endpoint definitions and payload shapes
- Design token constants
- Architecture notes
- Backup location

Read `RESULT_NEW.md` for:
- Existing design spec (773 lines) — use as baseline, improve upon it
- Design system tokens
- Component specs
- Implementation order
- Self-audit checklist
