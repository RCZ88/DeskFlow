# DeskFlow — Fundamentals batch (Features #1 + #2)

**This single zip contains BOTH features. Use only this one.** The two earlier zips
(`DeskFlow_Stats_Revamp.zip` and `DeskFlow_ModelSwitcher.zip`) were NOT cumulative —
each held only one feature and both edit the same 3 files, so applying one alone would
overwrite the other. This bundle merges them correctly.

## Apply (overwrite these 3 files)
1. `src/main.ts`
2. `src/preload.ts`
3. `src/pages/TerminalPage.tsx`

Built on top of your current source. Compiles clean (only one pre-existing, unrelated
`TS1345` at `main.ts:8151`).

## What's inside
- **Feature #1 — Per-session RAM / CPU / lag stats** (realtime badges in the sessions list).
  Details: `APPLY_STATS_REVAMP.md`.
- **Feature #2 — Per-session model switcher** (live `/model` re-inject + CLI model auto-detect).
  Details: `APPLY_MODEL_SWITCHER.md`.

Both apply-docs are included below for reference.
