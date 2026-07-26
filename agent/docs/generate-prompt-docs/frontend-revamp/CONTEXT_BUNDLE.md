# Frontend Revamp — Context Bundle

> Auto-generated design context consolidating DESIGN_SYSTEM.md + 5 frontend skills + FULL_FRONTEND_REVAMP_PLAN.md + recent feature additions.

---

## 1. Product Type & Design Identity

**Product:** DeskFlow — Desktop productivity tracking app (Electron + React + TypeScript + SQLite)  
**Industry:** Developer Tools (per ui-ux-pro-max skill)  
**Design Style:** Dark Glass + Terminal Chic — deep zinc base, glass cards with backdrop-blur, monospace data, single vibrant accent  
**Current Knobs:** Variance=5 (Balanced), Motion=5 (Moderate), Density=7 (Dense)  
**Design References:** Vercel (precision) + Raycast (premium dark) + Linear (minimalism)

### Key Identity Rules (ui-ux-pro-max):
- Dark chrome, monospace dominance, high information density
- Deep slate/zinc base, ONE vibrant accent (pink), syntax-highlighted code blocks
- Geist for UI, JetBrains Mono for code at 13-14px base
- 4-8px grid, fast motion (100-150ms), no bounces
- Patterns: tree views, split panes, tab bars, command palettes

---

## 2. Active Design Configuration (design-taste + taste-skill)

| Knob | Value | Meaning |
|------|-------|---------|
| DESIGN_VARIANCE | 5 | Balanced — mix of safe and bold, one distinctive element per component |
| MOTION_INTENSITY | 5 | Moderate — 250ms standard transitions, fade/slide/scale, no physics |
| VISUAL_DENSITY | 7 | Dense — tight packing, information-rich, power-user oriented |

### Aesthetic Matrix Result:
Mid variance + Mid motion + High density = **Balanced SaaS with dense data** (Stripe, Notion, Linear territory)

---

## 3. Design Foundation (DESIGN_SYSTEM.md + index.css target)

### Colors
```css
--bg-primary:       #09090b      /* zinc-950 */
--bg-secondary:     #18181b      /* zinc-900 */
--bg-tertiary:      #27272a      /* zinc-800 */
--bg-glass:         rgba(24,24,27,0.8)
--text-primary:     #f4f4f5      /* zinc-100 */
--text-secondary:   #a1a1aa      /* zinc-400 */
--text-muted:       #52525b      /* zinc-600 */
--accent-primary:   #ec4899      /* pink-500 */
--accent-hover:     #db2777      /* pink-600 */
--accent-secondary: #22d3ee      /* cyan-400 */
--success:          #34d399      /* emerald-400 */
--warning:          #fbbf24      /* amber-400 */
--error:            #f87171      /* red-400 */
--border-subtle:    #27272a      /* zinc-800 */
--border-active:    #3f3f46      /* zinc-700 */
```

### Per-Page Accent Colors
| Page | Accent | CSS Value |
|------|--------|-----------|
| Dashboard | pink | `var(--accent-primary)` |
| Productivity | pink | `var(--accent-primary)` |
| Stats | cyan | `#22d3ee` |
| Browser | sky | `#38bdf8` |
| IDE Projects | violet | `#8b5cf6` |
| External | amber | `#fbbf24` |
| Insights | pink | `var(--accent-primary)` |
| Database | violet | `#a78bfa` |
| Settings | cyan | `#22d3ee` |
| Tutorial | emerald | `#34d399` |

### Terminal 12 Tabs Colors (keep per-tab)
presets/green, sessions/green, map/green, analytics/green, issues/emerald, files/yellow, skills/indigo, design/pink, configs/orange, history/rose, context/amber, maintenance/violet

### Typography Scale
| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Badge | 11px | 500 | status badges, category pills |
| Meta | 12px | 400 | timestamps, secondary info |
| Body | 13px | 400 | default body text |
| Card title | 13px | 600 | section headings in cards |
| Section h2 | 15px | 600 | section titles |
| Page title | 18px | 600 | ALL page h1 titles |
| Display | 24-32px | 700 | timer values, hero scores |

### Spacing
- ALL card padding: `p-5` (20px) — NO exceptions
- Border radius max: `rounded-xl` (12px) — NO `rounded-2xl`/`rounded-3xl`
- No box-shadow elevation — use border brightness + glass layers

### Z-Index Scale
base=0, elevated=10, dropdown=20, modal=30, toast=40, overlay=50, max=100

---

## 4. Component Architecture (16 components to create)

| Component | Variants | Key Styling |
|-----------|----------|-------------|
| GlassCard | default, elevated, interactive | `bg-zinc-900/80 backdrop-blur-xl border-zinc-800/60 rounded-xl p-5` |
| PageShell | default, sticky-header, dashboard | Entrance animation: 250ms cubic-bezier(0.16,1,0.3,1) |
| StickyHeader | — | `h-14 backdrop-blur bar` |
| SectionHeader | — | Icon in `w-9 h-9 rounded-lg bg-[var(--page-accent)]/15` |
| TabBar | pills | `bg-zinc-900/50 p-1 rounded-xl inline-flex` |
| StatCard | — | Glass card + value + trend |
| ChartContainer | — | Single Chart.register(), dark tooltips |
| CategoryColors | — | 6 categories → color mapping |
| EmptyState | — | Centered icon + title + CTA |
| LoadingState | skeleton | `animate-pulse bg-zinc-800 rounded` |
| ConfirmDialog | danger | ModalOverlay pattern |
| ModalOverlay | — | `bg-black/70 backdrop-blur-sm`, entrance/exit motion |
| TerminalTab | colored | `border-b-2 border-[var(--tab-accent)]` |
| SessionCard | — | StatusDot + metadata |
| SystemCard | toggle | Switch + description |
| KnobSlider | — | Range + label + value |

---

## 5. Hard Constraints (Anti-Patterns — NEVER violate)

From **impeccable** (27 anti-patterns), **frontend-design** (8 NEVER rules), **ui-ux-pro-max** (dev tool rules):

### Visual
- NEVER use `rounded-2xl` (16px) or `rounded-3xl` (24px) — max is `rounded-xl` (12px)
- NEVER use `box-shadow` for elevation — use border brightness + glass layers
- NEVER use pure black (`#000`) — always `zinc-950`
- NEVER use `p-6` or `p-8` — standard is `p-5`
- NEVER use more than 2 font families per view
- NEVER use `font-thin` (100) on dark backgrounds — minimum `font-normal` (400)
- NEVER use `opacity-50` on text — use `text-zinc-500` token
- NEVER use `text-3xl` or `text-4xl` for page titles — use `text-lg font-semibold` (18px)
- NEVER exceed 3 accent colors in a single view
- NEVER use gradient buttons (`from-`/`to-`) for primary actions — use `bg-[var(--accent-primary)]`

### Motion
- NEVER use spring physics (`type: 'spring'`) — only cubic-bezier
- NEVER animate `width`, `height`, `top`, `left` — only `transform` and `opacity`
- NEVER use `transition: all` — specify exact properties
- NEVER use `whileHover={{ x: 4 }}` — `transition-colors` only
- NEVER exceed 400ms duration — standard is 250ms
- NEVER use `duration > 0.4` for UI transitions

### Interaction
- NEVER use default browser focus rings — use `ring-2 ring-pink-500/50`
- NEVER place interactive elements closer than 44px touch targets
- NEVER use decorative illustrations that reduce data density

### Z-Index
- NEVER use arbitrary z-index (`z-[*]`) — use `var(--z-*)` scale

---

## 6. Page Layout Patterns

### Pattern A — Inline Header (Stats, Browser, Productivity)
```
PageShell → SectionHeader → GlassCard → StatCard grid
```

### Pattern B — Sticky Header + Tabs (IDE, Settings, Insights)
```
PageShell(sticky-header) → StickyHeader → TabBar → tab-switched GlassCards
```

### Pattern C — Sticky Header + Scroll (External, Database, Tutorial)
```
PageShell(sticky-header) → StickyHeader → scrollable p-5 space-y-4
```

### Pattern D — Dashboard (Hero)
```
PageShell(dashboard) → hero timer → stat grid → two-column content
```

---

## 7. Recent Features Needing Retrofit

Features added after DESIGN_SYSTEM.md was authored — need visual alignment:

1. **Cross-Session Sync Controls** — Configs tab, amber theme, toggle + TTL + broadcast + conflict mode + /sync
2. **Live Context Viewer** — Configs tab below sync, shows locks + edits + conflicts
3. **Skill DSL Components** — GeneralistDialog, SkillWidgetFactory (10 widgets), SkillsTab inline CRUD
4. **InitializeProgressModal** — Grouped directory views, expandable previews, error retry
5. **Conflict Toasts** — Fixed-position toasts, amber theme
6. **Lock Badges** — Amber badges on terminal tabs showing locked file count
7. **Thought Process Toggle** — Configs tab, toggle + injection
8. **Session Routing UI** — RoutingToast, RoutingDisambiguationDialog

---

## 8. Implementation Phases (Ordered)

| Phase | Description | Files |
|-------|-------------|-------|
| 0 | Audit every deviation (rounded-3xl, p-6, springs, gradient buttons, z-arbitrary) | — |
| 1 | CSS variables in index.css + glass utility + reduced motion | 1 |
| 2 | Create 16 shared components (GlassCard, TabBar, etc.) | 16 new |
| 3 | Apply components to all 10 pages + per-page accent color | ~10 |
| 4 | App.tsx sidebar + top bar (pink accent, no springs, per-page accents) | 1 |
| 5 | Terminal workspace (remove tab glow, pink buttons, glass cards) | 2 |
| 6 | Dashboard + External inline styles → tokens | 2 |
| 7 | Standardize all 15 modals with ModalOverlay pattern | ~15 |
| 8 | Consolidate Chart.js + CategoryColors (remove 6+ duplicates) | ~10 |
| 9 | Remove spring physics, standardize motion everywhere | sweep |
| 10 | Logo gradient + brand polish | 2 |
| R | Retrofit recent features (DSL, sync, viewer, badges) | ~6 |

---

## 9. Files to Touch

**Pages (10):** DashboardPage, ProductivityPage, StatsPage, BrowserActivityPage, IDEProjectsPage, ExternalPage, InsightsPage, DatabasePage, SettingsPage, TutorialPage  
**Shell (1):** App.tsx  
**Terminal (2):** TerminalPage.tsx, TerminalWindow.tsx  
**Modals (15):** AfkPromptModal, PastSleepModal, ActivitySelection, ColorPicker, ProblemDetail, RequestDetail, NewProblem, NewRequest, NewSessionDialog, SessionEditDialog, WorkspaceSettingsDialog, InitializeProgressModal, GeneralistDialog, ImportSessionsDialog, TutorialOverlay  
**Shared (16 new):** All components listed in section 4  
**CSS (1):** index.css  

**Total:** ~90+ files, ~15,000+ lines estimated changed

---

## 10. Execution Strategy (Consultant's Plan)

### Recommended Execution Order

```
Phase 0  (Audit)         → 1 session, no code changes
Phase 1  (CSS foundation)→ 1 session, 1 file        [prerequisite for everything]
Phase 2  (Components)    → 2-3 sessions, 16 new files [prerequisite for Phase 3]
Phase 10 (Logo)          → 0.5 session               [can parallelize with Phase 4]
Phase 4  (App.tsx)       → 1-2 sessions, 1 file      [prerequisite for page accent routing]
Phase 7  (Modals)        → 1 session, 15 files        [search-replace, low risk, do early]
Phase 5  (Terminal)      → 1-2 sessions, 2 files      [highest risk — 5600+ lines, do with care]
Phase 3  (Pages)         → 3-4 sessions, 10 pages     [largest visible impact, order by simplicity]
Phase 6  (Dashboard + External) → 1-2 sessions        [most complex pages, save for end]
Phase 8  (Charts)        → 0.5 session, 10 files      [simple search-replace, any time]
Phase 9  (Motion)        → 0.5 session, sweep         [simple search-replace, any time]
Phase R  (Retrofit)      → 1 session, ~6 files        [last — depends on new tokens existing]
```

**Total estimate:** 12-18 implementation sessions, ~90+ files touched, ~15,000+ lines changed.

### Dependency Graph
```
Phase 1 (CSS vars) ─┬─→ Phase 2 (components) ──→ Phase 3 (pages)
                     ├─→ Phase 10 (logo) ───────→ Phase 4 (App.tsx)
                     ├─→ Phase 7 (modals)
                     ├─→ Phase 5 (terminal)
                     └─→ Phase 6 (dashboard/external)
Phase 8 (charts) and Phase 9 (motion): independent, any time after Phase 1
Phase R (retrofit): depends on Phase 1-4 being complete
```

### Risk Assessment

| Risk | Phase | Severity | Mitigation |
|------|-------|----------|-----------|
| TerminalPage.tsx (~5600 lines) | 5 | HIGH | Work in small batches, test every 5-10 changes, verify tab switching still works |
| DashboardPage.tsx (~1200 lines) | 6 | MEDIUM | Convert section by section, verify heatmap + timer + sessions each |
| ExternalPage.tsx (~1000 lines + 7 modals) | 6 | MEDIUM | Convert modals first (Phase 7), then page layout |
| Logo gradient side-effect | 10 | LOW | Single CSS change, easy to verify and revert |
| 16 shared components conflict | 2 | MEDIUM | Name uniquely, import carefully, no naming collisions |

### Backup Strategy (generate-prompt rule)
- **Before any deletion or major replacement**, create a backup of the original file
- After each phase completes, verify with `npm run build`
- If build fails, restore from backup and retry with smaller changes
- Components and modals can be added alongside existing code, then swapped after verified

### Verification Protocol

After each phase:
```
npm run build   — must pass
Dev server check — affected pages render correctly
Regression check — terminal tabs, modal open/close, charts, sidebar nav
```

### Per-File Compliance Checklist

Every changed file must pass:
- [ ] `--page-accent` set on wrapper
- [ ] No `rounded-3xl` or `rounded-2xl` — only `rounded-xl` or `rounded-lg`
- [ ] No `p-6` or `p-8` — only `p-5`
- [ ] No `shadow-lg` / `shadow-xl` — use border brightness or `shadow-[0_0_30px_rgba(0,0,0,0.3)]` for elevated
- [ ] No `text-3xl` / `text-4xl` (except timer display)
- [ ] No gradient buttons (`from-`/`to-`) for primary actions
- [ ] No spring physics
- [ ] No `transition: all`
- [ ] No `whileHover={{ x: }}`
- [ ] No arbitrary z-index (`z-[*]`)
- [ ] Uses CSS variables (not hardcoded hex) for brand colors
- [ ] Entrance animation matches PageShell pattern
- [ ] Build: ✅
