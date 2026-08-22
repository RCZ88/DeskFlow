<!-- SESSION: opencode-term-1-lerr -->
<!-- AGENT: opencode | TERMINAL: term-1 | PROJECT: C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker -->

# Agent State — opencode-term-1-lerr

> **STATUS:** completed | **UPDATED:** 2026-08-19T11:05:00.000Z

---

## CURRENT CYCLE (1)
**ROLE:** Hands & Eyes — root-cause + fix Learn lesson loading "internal system error"
**STATUS:** completed
**IN FLIGHT:**
- none
**COMPLETED:**
- Root-caused: `src/services/learn/services/progress.service.ts:6` imported `writeLearnEpisode` from `'../../main/ai/episodeWriters'` → from `src/services/learn/services/` that resolves to `src/services/main/ai/...` (does NOT exist; real file is `src/main/ai/episodeWriters.ts`)
- Because learn services are per-file compiled WITHOUT bundling, the bad path became a runtime `require("../../main/ai/episodeWriters")` in `dist-electron/services/learn/services/progress.service.js` → MODULE_NOT_FOUND at module load → `registerLearnHandlers` (index.ts:12 top-level import) throws → main.ts:3892 learn registration fails → ALL learn:* IPC unregistered → lesson load shows "internal system error"
- Verified: `node -e require(...)` THREW MODULE_NOT_FOUND before fix; after fix LOADED OK
- Fix: changed to `'../../../main/ai/episodeWriters'` + recompiled per-file (`npx esbuild ... --format=cjs --platform=node --target=node22` NO --bundle) + verified all other `../../` requires in dist learn files resolve (shared/learn/types.js + main/ai/episodeWriters.js exist)
- Confirmed `writeLearnEpisode` exists at src/main/ai/episodeWriters.ts:155
**NEXT ACTION:** User restarts RHEO → learn page lesson loading should work. If other learn actions still fail, check main console for registerLearnHandlers throw.
**NOTES:** No main.cjs / vite rebuild needed — only the one per-file learn service was broken. App must be restarted to pick up the fixed dist file.

---

## HISTORY (previous 2 cycles, oldest first)

### Cycle 0 — 2026-08-19
**ROLE:** (new session)
**STATUS:** completed
**IN FLIGHT:**
- none
**COMPLETED:**
- n/a
**NEXT ACTION:** n/a
