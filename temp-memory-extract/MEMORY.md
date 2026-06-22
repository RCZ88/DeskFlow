# MEMORY.md — DeskFlow Durable Memory

> Auto-loaded into every opencode prompt via opencode.json "instructions".
> This is long-term memory. Append durable lessons (Section rules in AGENTS.md #4).
> Format: `- [YYYY-MM-DD] <one-line durable lesson>`
> Transient/current state does NOT go here — it goes in agent/state.md.

## PIPELINE ROLE (never forget)
- [2026-06-21] This is a two-AI relay pipeline. Architect (Notion AI) patches + ships ZIP + FIX PACKET; I (opencode) build, verify in the real app, and reply in CYCLE REPORT format. CZ relays. NEVER treat a session as standalone.
- [2026-06-21] On startup ALWAYS read agent/state.md to recover cycle # and open packet before doing anything. "What did we do so far?" is answered from state.md + this file, NOT by asking CZ.
- [2026-06-21] After ANY source change, RE-ZIP src and hand it back. Stale src.zip caused multiple false "your fix doesn't work" reports.

## RESPONSE FORMAT (corrected repeatedly — stop forgetting)
- [2026-06-21] Final responses MUST use the CYCLE REPORT format in AGENTS.md #3. Do not freeform. CZ corrected this 4+ times; the cost of forgetting is high.

## TESTING (avoid false PASS)
- [2026-06-21] IPC probe success ≠ feature works. Verdict PASS needs the actual layer: UI = real clicks (no programmatic React input — onChange won't fire), Terminal = read [TERMINAL_DEBUG] C2 data callback FIRED logs.

## BUILD / DEBUG GOTCHAS
- [2026-06-21] All-data-shows-0 → preload.cjs was not rebuilt. Rebuild preload separately with esbuild after build.mjs.
- [2026-06-21] "Cannot access 'z' before initialization" = TDZ / circular import.
- [2026-06-21] "symbol X already declared" = duplicate const.
- [2026-06-21] Exit code -1073741510 = STATUS_CONTROL_C_EXIT (Ctrl-C / terminated), not a code bug.
- [2026-06-21] PTY event order is sacred: mark-spawned → spawn → created → initialize. Never reorder.

## CODEBASE FACTS
- [2026-06-21] Workspace persistence backend is COMPLETE (workspace:save/load/list/delete in main.ts; saveWorkspace/loadWorkspace/listWorkspaces/deleteWorkspace in preload). UI surfaces it via the Work group "Workspaces" subtab.
- [2026-06-21] Resume fix: verifyAgent is a false-negative for opencode (cmd.exe prompt matches SHELL_PROMPT_REGEXES) — warn-and-proceed, don't early-return. Launch uses terminalWriteRaw to bypass the queue.
