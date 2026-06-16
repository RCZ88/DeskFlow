# DeskFlow Diagnostic - Fix Memory (Rounds 1-6)

PURPOSE: This file is a memory of every expected fix, mapped to the workspace
part and exact code location. NOTHING here has been applied to the codebase yet
- all rounds are DIAGNOSED only. Use this as the reference when applying fixes
and when reporting back which fixes worked, which did not, and what problems
remain.

=============================================================================
TWO SYSTEMIC ROOT CAUSES (fix these and most symptoms collapse)
=============================================================================

ROOT 1 - Scaffolding never writes the agent/ tree (origin: Round 1).
  runInitAll creates dirs but does not write the files the app later reads
  (RULES_COMPACT.md, state.md, patterns.md, problems.json, 18x SKILL.md,
  graph.json, *.qmd, agent/context/). Confirmed downstream by Round 6: context
  assembly + skills silently return empty, so agents launch blind with no error.

ROOT 2 - Raw terminalWrite fragmentation (recurs in R2, R4, R5, R6).
  Multi-line content written to a raw PTY via terminalWrite submits each
  embedded newline as its own line. Affects init content, /sync summaries, and
  routed sends. Fix class: route multi-line payloads through agentSend /
  bracketed paste, never raw terminalWrite.

=============================================================================
PER-AREA EXPECTED FIXES
=============================================================================

--- R1: Initialize / Provisioning ---  (log: 01 not yet written; see note)
Workspace part: project bootstrap, InitializeProgressModal, IDEProjectsPage.
Expected fixes:
  - Make runInitAll (main.ts:14230-15645) actually WRITE every file, not just
    create empty dirs.
  - Fix baseDir cwd-fallback bug (main.ts:15651-15658) so files land in the
    real project path, not cwd.
  - Implement tracker-mind-generate (TODO at main.ts:15647).
Severity: CRITICAL (keystone - blocks context + skills).

--- R2: Terminal spawn + agent readiness ---  (log: 02-terminal-spawn-agent-readiness.md)
Workspace part: spawnTerminal, initializeTerminal, agent status machine.
Expected fixes (A-J in the log):
  - spawnTerminal wrapper drops 3rd arg agentType (TerminalPage.tsx:1442) ->
    agentStates seeds 'opencode' -> wrong readyRegex. Forward agentType.
  - No init timeout on initializeTerminal -> hangs forever. Add timeout.
  - terminal:exit name mismatch in preload (preload.ts:276 'terminal-exit').
  - Fake terminal:ready fires before agent is actually ready.
Severity: HIGH.

--- R3: Save/Load workspace + configs + move-to-group ---  (log: 03-workspace-save-load-configs-move.md)
Workspace part: workspace:save/load, terminal_layouts, MiniMap.
Expected fixes (A-G in the log):
  - workspace:save drops 5/10 fields (main.ts:8527): layout, openFiles,
    activeTerminalId, todos, presets.
  - handleLoadWorkspace (TerminalPage.tsx:1397) ignores terminal tabs/layout.
  - Empty catch swallows save errors (TerminalPage.tsx:1383).
  - MiniMap cross-group move missing (TerminalMiniMap.tsx:120).
  - DB: add state_json TEXT to workspace_state.
Severity: HIGH.

--- R4: Compose / Quick Send -> agent routing ---  (log: 04-compose-quicksend-routing.md)
Workspace part: send pipeline, agent:send queue, completion detection.
Expected fixes (A-H in the log):
  - Inconsistent channels: @mention/default use terminalWrite (1137); only
    auto-assign uses agentSend. Unify on agentSend.
  - Double \r\n on queued old-format sends.
  - failPendingWrites only fails newest row (main.ts:8003, LIMIT 1 bug).
  - markTaskCompleted all-or-nothing (7507/7511).
  - Completion gated on promptSeen can stick forever (7847).
  - handleInstructionPanelSend ignores panel agent (914).
Severity: HIGH.

--- R5: Sessions tab + cross-session sync ---  (log: 05-sessions-cross-session-sync.md)
Workspace part: terminal_sessions, /sync, resume, delete.
Expected fixes:
  - PRIMARY: /sync writes multi-line markdown via terminalWrite
    (TerminalPage.tsx:863) -> fragmentation. Route via agentSend. (ROOT 2)
  - No cascade delete (main.ts:8296): orphans terminal_messages,
    terminal_bindings, session_parsed_items. Add cascade.
  - Resume inherits R2 agentType bug + unverified resumeId (saved as
    openCodeSessionId at init:1682). Validate before -s ${resumeId}.
  - No restart reconstruction / no drift reconciliation (ties R3).
  - Perf: auto_tags regenerated every send (main.ts:7486).
Severity: LOW-MED (/sync fragmentation is the standout correctness bug).

--- R6: Context assembly + Skills + Files ---  (log: 06-context-skills-files.md)
Workspace part: ContextService, Skills tab, Files tab.
Expected fixes (A-F in the log):
  - A: Scaffolding (ROOT 1 dependency) - write the files assembleContext reads.
  - B: assembleContext (ContextService.ts:128-216) returns missingLayers; warn
    visibly instead of launching blind.
  - C: init content injected via agentSend, not terminalWrite
    (TerminalPage.tsx:3911). (ROOT 2)
  - D: Compose skill picker is a no-op (833-963) - concatenate composeSkills
    SKILL.md content like handleUse (4941-4960).
  - E: cache assembleContext (no cache today); invalidate on write-project-file
    + setPreference.
  - F: Files tab projectPath/selector + load-error surfacing
    (PROBLEMS.md:239-244).
Severity: PRIMARY symptom HIGH (blind launches); individual fixes LOW-MED.

=============================================================================
RECOMMENDED FIX SEQUENCE
=============================================================================
1. ROOT 1 - R1 scaffolding + baseDir. (Unblocks context + skills.)
2. ROOT 2 - replace raw terminalWrite with agentSend everywhere multi-line
   content is sent: R6 init (3911), R5 /sync (863), R4 routed sends (1137).
3. R2 spawn/readiness (agentType forward + init timeout + exit name + real ready).
4. R4 routing correctness (queue, failPendingWrites, completion gating).
5. R3 save/load (state_json, restore tabs/layout).
6. R5 cascade delete + resume validation + reconciliation.
7. R6 B/D/E/F (completeness warning, skill picker, cache, Files tab).

=============================================================================
VERIFICATION CHECKLIST (fill in as you test)
=============================================================================
[ ] Fresh provision writes real files (RULES_COMPACT, state, patterns,
    problems.json, SKILL.md x N, graph.json, *.qmd).
[ ] assembleContext returns non-empty multi-layer string; missingLayers empty.
[ ] Init content arrives as ONE message (no fragmented lines in PTY).
[ ] Non-opencode agents reach 'ready' (no wrong readyRegex).
[ ] initializeTerminal times out instead of hanging.
[ ] Save then Load restores tabs + layout + open files.
[ ] @mention/default sends use agentSend; no double newlines.
[ ] /sync arrives as one message to the right terminal.
[ ] Deleting a session removes its messages/bindings/parsed items.
[ ] Compose-picked skills appear in the sent prompt.
[ ] Repeated sends do not re-read the whole agent/ tree.
[ ] Files tab lists real files; clear message when no project selected.

=============================================================================
TESTING LOG (to be filled after applying fixes)
=============================================================================
Fix / Round | Applied? | Works? | Remaining problem
------------|----------|--------|------------------
(R1)        |          |        |
(R2)        |          |        |
(R3)        |          |        |
(R4)        |          |        |
(R5)        |          |        |
(R6)        |          |        |

NOTE: Round 1 standalone log (01-initialize.md) was diagnosed in chat but may
not have a standalone file. Ask to backfill if you want the complete folder.
