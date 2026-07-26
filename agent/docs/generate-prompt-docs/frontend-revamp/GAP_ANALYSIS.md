# DeskFlow Frontend Revamp — Gap Analysis

> Cross-check of `agent/docs/frontend-revamp/FIX.md` against actual codebase audit. Produced 2026-06-02.

---

## 1. Files Missing From Spec

| File | Lines | Type | Missing Section |
|------|-------|------|-----------------|
| `src/pages/IDEHelpPage.tsx` | 323 | Page (routed at `/ide-help`) | Phase 3 |
| `src/pages/DesignWorkspacePage.tsx` | 188 | Page (inline tab in Terminal) | Phase 3 (note) |
| `src/components/DayDetailPopup.tsx` | 783 | Modal overlay | Phase 7 |
| `src/components/DSLGenerationModal.tsx` | 261 | Modal | Phase 7 |
| `src/components/PromptDesignDialog.tsx` | 183 | Modal | Phase 7 |
| `src/components/RoutingDisambiguationDialog.tsx` | 89 | Modal | Phase 7 |
| `src/components/AnalyticsDashboard.tsx` | 631 | Chart dashboard | Phase 5 + 8 |
| `src/components/OrbitSystem.tsx` | 3563 | 3D visualization | None (needs `rounded-3xl` fix at 3 instances, CSS var for `z-50`) |

## 2. Dual-Location Modals (TerminalPage + IssuesWorkspace)

| Modal | TerminalPage | IssuesWorkspace |
|-------|-------------|-----------------|
| ProblemDetailModal | ~line 4152 | line 356 |
| RequestDetailModal | ~line 5417 | line 491 |
| NewProblemDialog | ~line 4270 | line 623 |
| NewRequestDialog | ~line 5521 | line 676 |

Both copies must be migrated identically. Spec only lists IssuesWorkspace.

## 3. Inaccurate Spec Claims

| Spec Says | Reality | Fix |
|-----------|---------|-----|
| ~90 `rounded-3xl` instances | **75** actual | Update Phase 0 table |
| ~60 `p-6`/`p-8` instances | **68** actual (p-6: 52, p-8: 16) | Minor adjustment |
| Spring physics "sweep needed" | Only **2 uses** (Dashboard heatmap, Settings bottom bar) | Downgrade to "spot fix" |
| `whileHover={{ x: }}` "sweep needed" | Only **App.tsx** uses x-slide; 6 files use `whileHover={{ scale }}` | Clarify — target scale, not x |
| All modals need `rounded-3xl→rounded-xl` | 3 already use `rounded-xl` (WorkspaceSettingsDialog, InitializeProgressModal, GeneralistDialog) | Set correct z-index |
| SettingsPage needs `p-6→p-5` | Already uses `p-5` on all 12 glass cards | Only need radius change |
| ColorPicker at `src/components/ColorPicker.tsx` | Lives at `src/components/workspace/ColorPicker.tsx` | Fix path |
| `z-[var(--z-modal)]` for overlays | `--z-modal` = 40, but current `z-50` overlays need `--z-overlay` (30) | Use `--z-overlay` for backdrop |
| 15 modals | Actual: **19+** (including 4 unlisted, 4 dual-location) | Expand table |

## 4. Actual Deviation Counts (Grep-Verified)

Total `rounded-3xl` across codebase: **75 instances**
- ProductivityPage: 11 (heaviest)
- IDEProjectsPage: 18 (heaviest)
- SettingsPage: 12 (all `rounded-3xl p-5`)
- App.tsx: 5
- ExternalPage: 5
- StatsPage: 9
- BrowserActivityPage: 9
- Others: <5 each

Total `p-8`: **16 instances**
- DashboardPage: p-8 top padding
- IDEProjectsPage: 6
- App.tsx: 4 (modals)
- ExternalPage: 2
- StatsPage: 4

SettingsPage uses 0 instances of p-6 or p-8 — already at `p-5` standard.

## 5. Component Existence Check

| Planned Component | Exists? | Notes |
|-------------------|---------|-------|
| GlassCard | CSS class only | `.glass` in index.css — 75+ inline usages |
| PageShell | No | Each page has own wrapper |
| StickyHeader | 3 inline variants | Different styles per page |
| SectionHeader | No (private) | One in ContextSidebar — not exported |
| TabBar | No | 2 inline tab bar variants |
| StatCard | 2 private variants | AnalyticsDashboard + DayDetailPopup |
| ChartContainer | No (private) | ChartCard in AnalyticsDashboard |
| CategoryColors | No | 5+ separate mappings, all different |
| EmptyState | No | 3+ inline implementations |
| LoadingState | No | 5+ inline spinners |
| ConfirmDialog | No | 1 full inline + native confirm() |
| ModalOverlay | No | 19+ identical inline backdrops |
| TerminalTab | No | Inline in TerminalPage |
| SessionCard | No | Complex ~90 line inline in TerminalPage |
| SystemCard | No | Inline in WorkspaceSettingsDialog |
| KnobSlider | 3 private variants | WorkspaceSettingsDialog, TasteKnobs, ContextSidebar |

None of the 16 planned components exist as reusable exports. Confirmed.

## 6. Key Migration Notes

- **Chart.js v2** (react-chartjs-2) is the charting library — not recharts
- **Framer Motion** is already installed and used in ~50% of files
- **ImportSessionsDialog** uses unique CLR (constant lookup reference) pattern — class names stored as constants at top of file
- **ColorPicker** uses inline `zIndex: 2147483647` via style prop (not Tailwind)
- **DayDetailPopup** uses inline `style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}` — needs CSS variable
- **OrbitSystem** (3563 lines, Three.js) has 3 `rounded-3xl` instances and 2 `z-50` instances — lowest priority for revamp
