## Focus Groups — Design Revamp + IPC + Detection Fix
Status: in-progress (design shipped, build done, detection fix next)

### What changed
- `FocusSection.tsx` — 12-col grid: groups left sidebar, timer hero center, stacked stats/goals/insights/leaderboard/distractions/history on right; clay/amber accent, no pink gradient headers, no particles noise
- `FocusTimer.tsx` — radial clock centerpiece (172px), ambient glow on active, preset pills + duration drag + strictness toggle, group chips integrated; stop button rose-toned; ShinyButton uses rose accent for stop, clay for start
- `FocusGroupsPanel.tsx` — compact sidebar rows with accent-dot + checkbox + meta chips + hover action buttons; no MagicCard glow, no glare-hover
- `FocusGroupEditor.tsx` — dialog with clay focus ring on inputs, warm-toned field labels, no pink accent throughout
- `FocusStats.tsx` — 4-up compact stat strip with glow-dot accents instead of GlareHover cards; numbers not monument-sized
- `FocusGoals.tsx` — two side-by-side inline progress rings (lenient/strict) in one card, no separate ModeCards; editable via dialog with clay/amber focus rings
- `FocusHistory.tsx` — timeline grouped by day with date headers and compact rows: icon dot + duration + progress bar + time + meta
- `FocusInsights.tsx` — hand-rolled SVG sparkline (no Chart.js dependency) + two metric chips; removed React Chart.js dependency
- `FocusLeaderboard.tsx` — period tabs + ranked list with rank icons + mode badges
- `FocusDistractionLog.tsx` — compact collapsible log with mini stat strip (total/apps/sites) + type icons

### Build state
- `main.cjs` 1.47MB, `get-table-foreign-keys` registered ONCE (was 2x → IPC "second handler" crash)
- 4 renderer chunks in `dist/assets/`
- `FocusGoals.tsx` had `if (no open)` typo → fixed to `if (!open)`
- `FocusSection.tsx` had unused `Zap` import → removed

### What's next
- Fix focus group website detection: `onWebActivity` in `handleBrowserData` must check the active group's `allowed_domains` in addition to the main focusManager domain list
