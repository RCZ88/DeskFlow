# DeskFlow Frontend Revamp — Spec Patch

## Context

Read `agent/docs/frontend-revamp/FIX.md` (the current spec) and `agent/docs/frontend-revamp/GAP_ANALYSIS.md` (the audit findings).

## Task

Update `agent/docs/frontend-revamp/FIX.md` by applying the following additions and corrections. Do NOT regenerate the whole file — patch it in-place, keeping every line that isn't explicitly listed below.

---

## Additions

### A. Phase 0 — Update Deviation Counts

Replace the Phase 0 audit table with actual grep-verified counts:

| Anti-Pattern | Dashboard | Productivity | Stats | Browser | IDE | External | Insights | Database | Settings | Tutorial | Terminal | App.tsx | Modals | OrbitSystem | IDEHelpPage |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `rounded-2xl`/`rounded-3xl` | 1+1 | 11+0 | 0+9 | 0+9 | 0+18 | 0+5 | 1+0 | 2+0 | 0+12 | 0+3 | 0+1 | 0+5 | 8+5 | 0+3 | 1+0 |
| `p-6`/`p-8` | 0+12 | 0+11 | 0+10 | 3+0 | 0+20 | 0+15 | 0+6 | 2+0 | 0+0 | 0+2 | 0+8 | 10+0 | 5+1 | 0+0 | 0+1 |
| `shadow-lg`/`xl`/`2xl` | 1+0+0 | 1+0+0 | 2+0+0 | 0 | 1+0+7 | 2+2+3 | 0+1+0 | 0 | 1+1+2 | 0 | 2+7+2 | 1+0+1 | 2+4+7 | 0+0+2 | 0 |
| Gradient buttons | 0 | 1 | 1 | 0 | 5 | 1 | 3 | 0 | 2 | 0 | 7+ | 3 | 4 | 0 | 0 |
| `text-3xl`/`4xl` | 0+1 | 1+0 | 2+0 | 3+0 | 1+0 | 0+2 | 0+0 | 0 | 0 | 0 | 0 | 1+1 | 0 | 0 | 0 |
| Spring physics | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 0 |
| `transition-all` | 12 | 12 | 12 | 4 | 20 | 15 | 10 | 2 | 40 | 0 | 30 | 4 | 0 | 0 | 0 |
| Arbitrary z-index | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 1 | 0 | 2 | 5 | 5 | 0 | 0 |
| `whileHover` | 3 | 0 | 1 | 0 | 3 | 5 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 |

**Grand total: ~312 deviations across ~45 files** (keep this line — it's accurate)

### B. Phase 3 — Add Missing Pages

#### 3.11 IDEHelpPage — Pattern A, Accent: emerald (#34d399)
- 323 lines, simple card layout
- Standard `rounded-3xl→rounded-xl`, `p-6→p-5` replacements
- Uses `bg-gradient-to-b from-zinc-900 to-black` header → `bg-zinc-950`

#### 3.12 DesignWorkspacePage — Inline tab (no wrapper accent)
- 188 lines, embedded inside TerminalPage as a tab
- Already uses some rounded-xl — verify
- Contains TasteKnobs, ColorPicker, DesignComposeOutlet, StyleDescription, StyleReferences
- Skip page-level accent (it inherits from terminal context)

### C. Phase 5 — Add AnalyticsDashboard Notes

AnalyticsDashboard.tsx (631 lines) is embedded in both TerminalPage and IDEProjectsPage. It contains:
- Private `StatCard` component (line 63) — should be replaced with shared StatCard
- Private `ChartCard` component (line 81) — should be replaced with ChartContainer
- Inline `CHART_COLORS` + `CHART_BORDERS` (lines 18-38) — should use CategoryColors
- Uses `.glass` CSS class directly

**Migration:** When Phase 2 creates StatCard and ChartContainer, update AnalyticsDashboard to import and use them instead of its private versions. Add this as a sub-task of Phase 5.

### D. Phase 7 — Add Missing Modals

Append to the Modal Migration Table:

| Modal | File | Changes |
|-------|------|---------|
| DayDetailPopup | DayDetailPopup.tsx | `rounded-xl` already, verify tokens, `bg-black/85 backdrop-blur` inline style → `var(--bg-glass-heavy)`, verify category colors |
| DSLGenerationModal | DSLGenerationModal.tsx | `rounded-xl` already, `shadow-2xl`→remove, wrap in `<ModalOverlay>`, `z-50`→`z-[var(--z-modal)]` |
| PromptDesignDialog | PromptDesignDialog.tsx | `rounded-2xl`→`rounded-xl`, no p-* (uses m-4), `z-50`→`z-[var(--z-modal)]`, add `<ModalOverlay>` |
| RoutingDisambiguationDialog | RoutingDisambiguationDialog.tsx | `rounded-xl` keep, `p-5` keep, `z-[60]`→`z-[var(--z-modal)]`, `shadow-2xl`→remove |

### E. Phase 7 — Note Dual-Location Modals

The following modals exist in BOTH `TerminalPage.tsx` AND `IssuesWorkspace.tsx`:

| Modal | TerminalPage line | IssuesWorkspace line |
|-------|------------------|---------------------|
| ProblemDetailModal | ~4152 | ~356 |
| RequestDetailModal | ~5417 | ~491 |
| NewProblemDialog | ~4270 | ~623 |
| NewRequestDialog | ~5521 | ~676 |

Both copies must be migrated identically. Add a note to Phase 7: "For each dual-location modal, migrate BOTH copies."

### F. Phase 8 — Add AnalyticsDashboard Chart Colors

The AnalyticsDashboard has 3 separate color arrays (lines 18-38):
- `CHART_COLORS` + `CHART_BORDERS` — Chart.js palette
- `STATUS_COLORS` — status-to-color mapping

Add to Phase 8: "Consolidate AnalyticsDashboard's CHART_COLORS, CHART_BORDERS, and STATUS_COLORS into CategoryColors"

---

## Corrections

### 1. Modal z-index: `z-[var(--z-modal)]` → `z-[var(--z-overlay)]`

**Every modal overlay should use `z-[var(--z-overlay)]` (30), NOT `z-[var(--z-modal)]` (40).**
- `--z-overlay`: 30 — the backdrop/dim layer
- `--z-modal`: 40 — the modal card itself
- `--z-toast`: 50 — toasts sit above modals

Current code uses `z-50` for overlays. Using `z-[var(--z-modal)]`=40 for the overlay is wrong — it should be 30.

### 2. SettingsPage already uses p-5

SettingsPage has 12 instances of `glass rounded-3xl p-5` — padding is already correct. Phase 3.6 migration for SettingsPage only needs `rounded-3xl→rounded-xl`, NOT p-6→p-5 changes.

### 3. Three modals already use rounded-xl

WorkspaceSettingsDialog, InitializeProgressModal, and GeneralistDialog already use `rounded-xl`. Update Phase 7 to note they only need z-index and shadow fixes, not radius changes.

### 4. ImportSessionsDialog uses CLR pattern

This component defines all class names as constants at the top (lines 11-30). Migration must update the CLR constants, not inline class strings. Add to Phase 7: "ImportSessionsDialog — update CLR constants at lines 11-30, not inline className strings."

### 5. ColorPicker path

ColorPicker lives at `src/components/workspace/ColorPicker.tsx`, not `src/components/ColorPicker.tsx`. Update Phase 7 table.

### 6. ColorPicker uses inline `zIndex: 2147483647`

This is the maximum integer value, used via inline style (not Tailwind). Must be changed to use a CSS variable. Add to Phase 7 row for ColorPicker.

---

## Output

Return the complete updated `agent/docs/frontend-revamp/FIX.md` with all additions inserted and corrections applied. Do not change any line that isn't explicitly mentioned above.
