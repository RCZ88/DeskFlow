<!-- SESSION: opencode-term-1-brainchat -->
<!-- AGENT: opencode | TERMINAL: term-1 | PROJECT: C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker -->

# Agent State — opencode-term-1-brainchat

> **STATUS:** completed | **UPDATED:** 2026-08-19T10:15:00.000Z

---

## CURRENT CYCLE (4)
**ROLE:** Hands & Eyes — Learn → Context Brain bridge (user-approved): Lyceum mastery feeds the Brain + assemble-context
**STATUS:** completed
**IN FLIGHT:**
- (none)
**COMPLETED:**
- writeLearnEpisode in src/main/ai/episodeWriters.ts (source 'learn' added to EXTRACTION_SOURCES; episode + upsertEntity('concept', title) + addFact has_mastery_level / mastered_at when L2+)
- Fired from ProgressService.updateMastery (services/learn/services/progress.service.ts) ONLY on level change (previousLevel !== newLevel incl. first evidence) — single choke point (updateMastery is the only upsertProgress caller; 3 ProgressService instantiations all covered)
- assemble-context (main.ts, before parts.join) injects '## Learner Knowledge (mastered)' (L2–L5 LIMIT 15) + '(in progress)' (L0/L1 last 30d LIMIT 10) via learn_progress JOIN learn_nodes, budget-gated (remaining-200), sqlite_master table guard
- Build: per-file esbuild episodeWriters.js + progress.service.js (OK, node --check clean) + rebuild-main.mjs (main.cjs 1390KB; also recompiles ALL dist-electron/main/ai/*.js — those ARE runtime files, main.cjs treats them as EXTERNAL requires)
- Verified: writeLearnEpisode in both per-file outputs + progress.service.js call site; 'Learner Knowledge' in main.cjs; main.ts normalized pure CRLF after edit
- src snapshot: dist/src-zip-new.zip (2244 entries, 5.6MB, ASCII tar-list — includes main.ts + both changed files) — dist/src.zip is LOCKED by running RHEO/Explorer (couldn't replace; stale 32211-entry zip)
**NEXT ACTION:** CZ: close whatever holds dist/src.zip (Explorer preview?) → delete it → rename src-zip-new.zip → src.zip. User: restart RHEO, complete a Learn lesson (quiz/review) → check Context Brain (AI page brain stats / ProfileTab) for 'learn' episodes; new terminal sessions get Learner Knowledge in assemble-context
**NOTES:** Runtime NOT LAUNCHED (attach limitation; RHEO running but no debug port). No renderer/vite/preload changes. zip-src.mjs avoided (hangs); lock lesson: if dist/src.zip is held, emit dist/src-zip-new.zip + tell CZ to free the handle.

---

## HISTORY (previous 2 cycles, oldest first)

### Cycle 3 — 2026-08-19
**ROLE:** Hands & Eyes — AI Context Viewer = FULL-PAGE SUBPAGE of AI page (user: "WHERE'S THE PROPER UI??") + extension sendMessage crash fix
**STATUS:** completed
**IN FLIGHT:**
- (none)
**COMPLETED:**
- Root-caused "Cannot read properties of undefined (reading 'sendMessage')" at focusOverlay.js:51 — ONLY focusOverlay.js (isolated world) had unguarded chrome.runtime; hardened with `rt = chrome?.runtime` + `send()` helper; manifest 1.2.0 → 1.2.1
- AiPage.tsx: Suspense branch `contextOpen ? <AiContextPanel open onClose> : brainOpen ? <BrainChatPanel open onClose> : compositions/deck` — subpages REPLACE canvas (flex:1 minHeight:0); removed fixed bottom-right mounts (Vault popup kept)
- AiContextPanel + BrainChatPanel: `fixed bottom-4 right-4` popup roots → `h-full flex flex-col` full-page with title header + capture count + X close (explicit close only)
- Build: vite OK 47.8s (index.CFIRNdLq.js 14.26MB); bundle verified; dist/index.html → new hash
**NEXT ACTION:** User: restart RHEO → AI page topbar → Context button = full-page viewer; reload extension in Comet for v1.2.1
**NOTES:** Runtime NOT LAUNCHED (attach limitation). Deployed extension in Comet likely stale — crash was in the OLD snapshot's line 51.

### Cycle 2 — 2026-08-18
**ROLE:** Hands & Eyes — fix "DB Migration partial/already applied: duplicate column name: nickname" startup error
**STATUS:** completed
**IN FLIGHT:**
- (none)
**COMPLETED:**
- Root-caused: ai_context_captures migration (src/main.ts ~2446) ran 6 ALTERs in ONE try — first duplicate aborted the rest; fixed with PRAGMA table_info → Set → per-column guard
- `node scripts/rebuild-main.mjs` OK; verified compiled main.cjs (1.42 MB) contains PRAGMA guard + idx_aic_group
**NEXT ACTION:** User restarts the app → warning gone; group/pin features self-heal if columns were missing
**NOTES:** Renderer untouched — no vite rebuild. Runtime NOT LAUNCHED.