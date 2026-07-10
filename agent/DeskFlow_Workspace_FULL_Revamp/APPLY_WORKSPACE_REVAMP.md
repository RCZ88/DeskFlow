# DeskFlow Terminal Workspace — FULL Frontend Revamp (Batches 1–7)

One design system across every `/terminal` sidebar page, feature, and dialog.
Copy all files into the repo at the SAME relative paths (root: repo `/src`). These are RENDERER files.

## ⚠️ Build note (read first)
After copying, **rebuild the renderer bundle** (`npm run build` / vite). A stale bundle shows the OLD UI
even though source is new — this has bitten us before. Confirm the dist timestamp changed before testing.

## Files in this bundle
### Shared design language
- `src/components/workspace/_ds/controls.tsx` (NEW) — `INPUT_CLS`, `BTN_PRIMARY`, `BTN_GHOST`,
  `filterChipCls`, `accentVars`, `dotStyle`, `Pill`, `ModalShell`. All driven by `--page-accent`.

### Work group (emerald)
- `ProblemsTab.tsx`, `RequestsTab.tsx` — full rebuild (chips, cards, status pills, skeleton/empty, ModalShell).

### Studio group
- `PromptsWorkspace.tsx` (violet, full rebuild), `FilesTab.tsx` (yellow), `SkillsTab.tsx` (indigo). PromptHistoryTab already compliant.

### Insights group (green)
- `IssuesWorkspace.tsx`, `AnalyticsDashboard.tsx`, `BugReportPanel.tsx` — primary buttons + decorative stat colors on accent.

### Context group (amber)
- `PageContextPanel.tsx`, `ContextSidebar.tsx`. ContextMaintenanceTab already compliant.

### Shared chrome
- `workspace/WorkspaceShell.tsx`, `workspace/SubTabBar.tsx` — accent maps completed (BUG FIX: emerald/violet/yellow/rose/cyan/teal groups were falling back to gray).

### Dialogs
- `SessionEditDialog.tsx`, `NewSessionDialog.tsx`, `GeneralistDialog.tsx`, `InitializeProgressModal.tsx` — all selects normalized to one neutral DS input.

### Core terminal chrome
- `TerminalWindow.tsx` — (from earlier) input-unlock + pushdown fixes, PLUS unchanged DS.
- `TerminalMiniMap.tsx`, `MapEditor.tsx` — drag-ghost chips aligned to DS rounding/shadow. TerminalTab already used `--page-accent`.

## TerminalPage.tsx — apply this ONE-LINE patch by hand (do NOT overwrite the whole orchestrator)
BEFORE: `<div key={preset.id} className="rounded-lg border border-zinc-800/60 bg-zinc-900 p-2 group">`
AFTER:  `<div key={preset.id} className="rounded-lg border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm p-2 group hover:border-zinc-700 transition-colors">`

## Design decisions (do NOT "fix" these — they are intentional)
- **Semantic colors kept:** status pills, error reds, init-success greens, read/write direction,
  problem=purple / request=blue entity distinction, and per-feature identity colors in the config toggles.
  Flattening those to one accent destroys meaning.
- **Dialogs kept their working overlay/layout** rather than being force-migrated to `ModalShell` (risk).

## Still open (functional, NOT pure-frontend — flagged, not done here)
- Map drag-between-groups (carousel → all-groups board) and terminal header dedup.
- Perf/lag pass (TerminalPage localStorage debounce / memoize / virtualize).
- Auth-detection + TUI-interference blocking banner (main.ts).

## MANUAL TEST (CZ)
Walk all 5 groups; confirm each shows its accent (no gray trunks/pills), tabs share one card/pill/input/modal
language, dropdowns match, and Work Problems/Requests + Studio Prompts render with the new look.
