# DeskFlow Full Frontend Revamp — Design Specification

## Role

You are the **Lead Product Designer and Frontend Engineer** for DeskFlow, a dark-themed developer productivity tracking desktop app (Electron + React + TypeScript + Tailwind v4). You are responsible for producing an exhaustive, actionable specification that a single engineer can implement over 12-18 sessions.

**This is NOT a menu of options. Produce ONE comprehensive solution with complete CSS values, component signatures, and migration paths for every page.**

---

## Raw Request

Consolidate and implement the full frontend visual revamp of DeskFlow across all 10 pages, terminal workspace, 15 modals, App.tsx shell, and 6 recent features — following the DESIGN_SYSTEM.md specification and all frontend design skills. The revamp has 10 phases (CSS foundation → shared components → page layouts → shell → terminal → inline tokens → modals → charts → motion → brand polish) plus a retrofit phase for recent additions.

---

## Context

Read `agent/docs/frontend-revamp/CONTEXT_BUNDLE.md` for:
- `agent/docs/DESIGN_SYSTEM.md` (1048-line comprehensive design spec)
- `agent/skills/frontend-design/SKILL.md` (v3.0.0 — core UI/UX principles, DeskFlow patterns)
- `agent/skills/design-taste/SKILL.md` (v1.1.0 — master aggregator, Variance=5, Motion=5, Density=7)
- `agent/skills/impeccable/SKILL.md` (7 design domains, 27 anti-patterns)
- `agent/skills/ui-ux-pro-max/SKILL.md` (dev tool industry rules)
- `agent/skills/taste-skill/SKILL.md` (tunable knob definitions)
- `agent/docs/FULL_FRONTEND_REVAMP_PLAN.md` (detailed phased plan)
- The actual source files in `src/pages/`, `src/components/`, `src/App.tsx`

---

## Requirements

### Requirement 1: CSS Foundation (`src/index.css`)

Define all CSS custom properties:
- Base layers: `--bg-primary`, `--bg-secondary`, `--bg-glass`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`
- Accents: `--accent-primary` (#ec4899), `--accent-hover`, `--accent-secondary` (#22d3ee)
- Semantic: `--success`, `--warning`, `--error`
- Borders: `--border-subtle`, `--border-active`, `--border-glass`
- Z-index: `--z-base` through `--z-max` (0→100)
- Animation: `--ease-out`, `--ease-in`, `--fast`, `--normal`, `--slow`
- Per-page: `--page-accent` (defaults to `var(--accent-primary)`)
- Body: `font-family: "Geist"`, `font-size: 13px`, `background: var(--bg-primary)`
- Utility classes: `.glass`, `.hide-scrollbar`
- Reduced motion media query

**Critical:** Keep `@import "tailwindcss"` (v4 syntax). NEVER use `@tailwind base/components/utilities` (v3).

### Requirement 2: 16 Shared Components

Create each with complete TypeScript signatures, Tailwind classes, and 3 GlassCard variants. Every component must:
- Accept `className` prop for override
- Use CSS variables (no hardcoded hex for brand colors)
- Use `rounded-xl` (never `rounded-2xl`/`rounded-3xl`)
- Use `p-5` (never `p-6`/`p-8`)
- Use `transition-colors duration-150` (never `transition: all`)
- Use cubic-bezier only (no spring physics)

List: GlassCard, PageShell, StickyHeader, SectionHeader, TabBar, StatCard, ChartContainer, CategoryColors, EmptyState, LoadingState, ConfirmDialog, ModalOverlay, TerminalTab, SessionCard, SystemCard, KnobSlider

### Requirement 3: Page-Specific Migrations

For each page, specify:
1. Which layout pattern (A/B/C/D) to use
2. The `--page-accent` value to set on wrapper
3. Every `rounded-3xl` → `rounded-xl` replacement
4. Every `p-6`/`p-8` → `p-5` replacement
5. Every gradient button → `bg-[var(--accent-primary)]`
6. Every box-shadow → remove (use border brightness)
7. Every spring → cubic-bezier replacement
8. Every inline card → GlassCard replacement

**Pages in priority order:** Tutorial, Database, Browser, Productivity, Stats, Settings, Insights, External, IDE Projects, Dashboard

### Requirement 4: App.tsx Shell

- Sidebar: Pink logo gradient, `--page-accent` active states, no `whileHover` motion
- Top bar: Standard `h-14` mode + terminal variant, pill-based period/tracking UI
- Route transitions: AnimatePresence with PageShell entrance
- Per-page accent: Dynamic `--page-accent` based on route
- Footer: "Local SQLite • Zero Cloud • Privacy-First"

### Requirement 5: Terminal Workspace

- Tab bar: Remove shadow glow, use `border-b-2 border-[var(--tab-accent)]`
- Header: `bg-zinc-950` (no gradient)
- Action buttons: Pink instead of cyan/emerald gradient
- Session detail card: Pink left-border accent
- Cross-session sync controls: Keep amber (matches configs tab color)

### Requirement 6: Modal Standardization (15 modals)

Every modal must follow:
- Overlay: `fixed inset-0 bg-black/70 backdrop-blur-sm z-[var(--z-overlay)]`
- Card: GlassCard elevated variant, `max-w-[480px] max-h-[85vh]`
- Header: Icon + title pattern
- Entrance: 250ms cubic-bezier, opacity 0→1 scale 0.95→1
- Exit: 200ms ease-in, opacity 1→0 scale 1→0.95

### Requirement 7: Recent Feature Retrofit

Ensure these features added after DESIGN_SYSTEM.md use the new tokens:
- Cross-session sync controls (amber theme)
- Live Context Viewer (amber theme, GlassCard pattern)
- Skill DSL components (GeneralistDialog, SkillWidgetFactory)
- InitializeProgressModal (verify tokens)
- Conflict toasts (z-index → `var(--z-toast)`)
- Lock badges (rounded-lg, not plain `rounded`)

### Requirement 8: Execution Strategy (Consultant's Plan)

The RESULT.md MUST include a concrete execution plan, not just design specs. This is the roadmap the engineer will follow.

#### 8.1 Execution Order (with rationale)
```
Phase 0  (Audit)         → 1 session. NO code changes — just catalog every deviation.
Phase 1  (CSS foundation)→ 1 session. 1 file. MUST go first — everything depends on CSS vars existing.
Phase 2  (Components)    → 2-3 sessions. 16 new files. MUST go before Phase 3 — pages need components.
Phase 10 (Logo)          → 0.5 session. Independent of other phases, do anytime after Phase 1.
Phase 4  (App.tsx)       → 1-2 sessions. 1 file. Depends on Phase 10 (logo) for gradient.
Phase 7  (Modals)        → 1 session. 15 files. Low risk, mostly search-replace — do early to clear queue.
Phase 5  (Terminal)      → 1-2 sessions. 2 files. HIGHEST RISK (~5600 lines). Do with care, test every 5 changes.
Phase 3  (Pages)         → 3-4 sessions. 10 pages. Largest visible impact. Order by simplicity inside spec.
Phase 6  (Dashboard + External) → 1-2 sessions. Most complex pages. Do at end of page conversions.
Phase 8  (Charts)        → 0.5 session. 10 files. Search-replace, can do any time after Phase 1.
Phase 9  (Motion)        → 0.5 session. Sweep. Search-replace, can do any time.
Phase R  (Retrofit)      → 1 session. ~6 files. Do LAST — depends on new tokens existing.
```

#### 8.2 Session Count & File Estimate
- **Total sessions:** 12-18
- **Files touched:** ~90+ (16 new, 74+ modified)
- **Lines changed:** ~15,000+
- **Longest single file:** TerminalPage.tsx (~5600 lines)

#### 8.3 Risk Mitigation

| Risk Area | Phase | Severity | Mitigation |
|-----------|-------|----------|------------|
| TerminalPage.tsx (~5600 lines) | 5 | HIGH | Work in 10-line batches, verify tab switching + terminal creation after every 5 changes |
| DashboardPage.tsx (~1200 lines) | 6 | MEDIUM | Convert section by section (timer → stats → heatmap → sessions) |
| ExternalPage.tsx (~1000 lines + 7 modals) | 6 | MEDIUM | Convert modals first in Phase 7, then page layout in Phase 6 |
| 16 new components name collision | 2 | MEDIUM | Prefix with feature, import paths explicit, verify no existing component with same name |

#### 8.4 Backup & Rollback
- **Before any deletion** (old cards, old gradients, old shadows), create a backup of the original file
- **After every phase**: run `npm run build` — if it fails, restore from backup and retry with smaller changes
- **Components can be built alongside existing code**, swapped in after verified, then old code cleaned up
- **Never use git to revert** — fix manually (see AGENTS.md Critical Rules)

#### 8.5 Verification Protocol

After EACH phase:
1. `npm run build` → must pass with zero errors
2. Dev server → affected pages render correctly (no broken layouts, overflow, or missing accents)
3. Functional regression → terminal tabs, modal open/close, chart rendering, sidebar navigation all work
4. Visual regression → no rounded-3xl remnants, no p-6/p-8 remnants, no gradient buttons, correct accent colors

#### 8.6 Per-File Compliance Checklist

Specify this checklist in RESULT.md. Every changed file must pass:
- [ ] `--page-accent` set on wrapper
- [ ] No `rounded-3xl` or `rounded-2xl` — only `rounded-xl` or `rounded-lg`
- [ ] No `p-6` or `p-8` — only `p-5`
- [ ] No `shadow-lg`/`shadow-xl` — border brightness only
- [ ] No `text-3xl`/`text-4xl` (except timer display)
- [ ] No gradient buttons for primary actions
- [ ] No spring physics
- [ ] No `transition: all`
- [ ] No `whileHover={{ x: }}`
- [ ] No arbitrary z-index (`z-[*]`)
- [ ] Uses CSS variables for brand colors
- [ ] Entrance animation matches PageShell pattern
- [ ] Build: ✅

---

## Design Constraints (Hard Rules)

### Visual
- `rounded-xl` (12px) is the MAXIMUM border radius — NO exceptions
- `p-5` (20px) is the STANDARD card padding — NO exceptions
- `text-lg font-semibold` (18px) is the STANDARD page title — NO `text-3xl`/`text-4xl`
- Pink (#ec4899) is the PRIMARY brand accent — NOT emerald, NOT cyan
- NO `shadow-lg`/`shadow-xl` — use border brightness for depth
- NO `from-`/`to-` gradient buttons — use `bg-[var(--accent-primary)]`
- NO `font-thin` on dark backgrounds — minimum 400 weight
- NO `opacity-50` for text — use `text-zinc-500`

### Motion
- NO spring physics — ONLY cubic-bezier(0.16, 1, 0.3, 1)
- NO `width`/`height`/`top`/`left` animation — ONLY `transform` + `opacity`
- NO `transition: all` — specify exact properties
- NO `whileHover={{ x: 4 }}` — `transition-colors` only
- Standard duration is 250ms — NEVER exceed 400ms

### Z-Index
- NO arbitrary `z-[*]` values — use `var(--z-*)` scale exclusively
- Scale: base=0, elevated=10, dropdown=20, modal=30, toast=40, overlay=50, max=100

### Focus & Accessibility
- Replace ALL default browser focus rings with `ring-2 ring-[var(--page-accent)]/50`
- Minimum 44px touch targets for interactive elements
- `prefers-reduced-motion: reduce` support via CSS

---

## Output Format

Generate a single `agent/docs/frontend-revamp/RESULT.md` with these sections:

### 1. Phase 0: Audit Results
- Complete count of `rounded-3xl`, `p-6`, `p-8`, `shadow-lg`, gradient buttons, springs, z-arbitrary per file
- Quantified effort estimate

### 2. Phase 1: CSS Foundation
- Complete `index.css` code block ready to paste

### 3. Phase 2: Component Definitions
- 16 component interfaces and implementations as copy-paste-ready TypeScript

### 4. Phase 3-6: Per-Page Migration Specs
- Each page as a sub-section with exact search-replace pairs (old → new CSS classes)

### 5. Phase 7: Modal Migration Table
- 15 modals × required changes

### 6. Phase 8: Chart + Color Consolidation
- ChartContainer implementation
- CategoryColors mapping

### 7. Phase 9: Motion Sweep Pattern Catalog
- Every anti-pattern pattern and its replacement

### 8. Phase 10: Logo + Brand Polish
- Exact gradient, hex values

### 9. Phase R: Retrofit Specs
- Per-feature migration steps

### 10. Build Verification Protocol
- What to check after each phase

### 11. Execution Plan (Requirement 8)
- Dependency graph: Phase 1 → Phase 2 → Phase 3 → ... (with rationale per phase)
- Session estimate per phase with file counts
- Risk assessment per phase with mitigation strategies
- Backup & rollback procedure
- Per-file compliance checklist

---

## Edge Cases

- What if a page uses a component that doesn't exist yet? → Create the shared component first (Phase 2), then migrate the page (Phase 3)
- What if `--page-accent` is set on a page wrapper but a child needs the brand accent? → Use `var(--accent-primary)` explicitly in that child
- What if a modal has custom animations beyond the standard pattern? → Keep custom animation but use the new timing/easing tokens
- What if a page has custom z-index needs? → Use `var(--z-*)` closest fit, do NOT create arbitrary values

---

## Before You Begin

1. **Read ALL source files** for each page you're specifying changes for
2. **Verify** that every CSS variable proposed exists in the target index.css
3. **Flag** any feature that doesn't match the DESIGN_SYSTEM.md spec
4. **Surface** any gap between the design spec and actual code structure
5. **Ask** if anything is ambiguous BEFORE producing the spec
