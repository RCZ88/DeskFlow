<!-- SESSION: opencode-term-1-hmap -->
<!-- AGENT: opencode | TERMINAL: term-1 | PROJECT: C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker -->

# Agent State — opencode-term-1-hmap

> **STATUS:** completed | **UPDATED:** 2026-08-09T04:20:00.000Z

---

## CURRENT CYCLE (1)
**ROLE:** Hands & Eyes — fix AI Tools heatmap empty on All Time + All Tools (garbage codex dates)
**STATUS:** completed
**IN FLIGHT:**
- (none — fix implemented, built, harness-verified, DB cleaned; awaiting user's app relaunch + confirm)
**COMPLETED:**
- Verified AIToolsTab.tsx is NOT corrupted (byte-identical to sourcemap-recovered original)
- Root-caused: 15 codex ai_usage rows with year-58462 dates (+058462-06-04) from CodexPlugin.parseSQLite ms×1000 (main.ts); isNaN guard insufficient (valid extended-ISO dates)
- Renderer fix: isSaneDay() year guard at all 6 date-math sites in AIToolsTab.tsx (heatmap, Model/Tool Usage Timelines, Multi-Agent Comparison, tool-detail modal, model lastUsed maps, agentChartsData)
- Parser fix: ts normalized to ms end-to-end in main.ts (rawTs > 1e11 ? rawTs : rawTs*1000; jsonl path defensive)
- DB-replay harness: heatmap weeks 0 → 27, timelines 60d → 196d
- Build OK (vite 2m11s, preload 99KB, main.cjs 1.3MB), tsc clean, dist/index.html checks pass
- DB cleanup (user-approved): backup agent/backups/20260809-111620-db-pre/ (integrity ok, 15 rows preserved), then DELETE date LIKE '+%' → ai_usage 2146→2131
- Persisted: PROBLEMS.md P1 section + problems.json #184 (re-appended once — a concurrent session rewrote the json mid-session)
**NEXT ACTION:** user relaunches app → visual confirm → user confirms fixed → exhaustive commit (only this session's files: AIToolsTab.tsx, main.ts, PROBLEMS.md, problems.json; OTHER pre-existing uncommitted files in tree: finance/*, HierarchyGuide.tsx, grid.ts — NOT mine)
**NOTES:** Runtime NOT LAUNCHED (user chose to skip runtime verification; app not running — Probe is attach-only, never launch manually). problems.json gets REWRITTEN by a concurrent session (verify before commit). src.zip NOT re-zipped (zip-src.mjs hangs — tar -T method if Architect needs it).

---

## HISTORY

### Cycle 0 — 2026-08-09 (session start)
**ROLE:** recover state from Hub/spokes
**STATUS:** completed
**COMPLETED:**
- Identified active investigation: AI tools heatmap all-time bug
**NEXT ACTION:** continue investigation (done in cycle 1)
