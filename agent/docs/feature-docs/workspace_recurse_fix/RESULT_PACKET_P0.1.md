PACKET P0.1 RESULT
DIFF: src/main.ts (4 hunks), src/pages/TerminalPage.tsx (2 hunks), src/components/FeatureSpecPanel.tsx (3 hunks), src/pages/IDEProjectsPage.tsx (1 hunk)
TYPECHECK: pass (renderer + preload + main built clean)
BUILD: pass | main.cjs (19240 lines) | index.js (built in 1m6s) | preload.cjs (1.57s)
UI CHECK: Pending — real app launch needed to verify opencode prompt delivery
STATUS: AI Attempted Fix

--- SECTION A: TERMINAL INPUT ENCODING (THE BLOCKER) ---
CHANGE: Rewrote buildAgentInputPayload to remove bracketed paste wrapping.
  - Normalizes all CR/LF to LF, trims trailing whitespace
  - Returns body + single \r (CR = submit) — no \x1b[200~ / \x1b[201~
  - Interior \n stays as 0x0A (Ctrl+J = newline-insert in opencode)
  - Removed normalizeTerminalPasteText (inlined into buildAgentInputPayload)
VERIFIED: dist-electron/main.cjs line 8052 — function body is `normalized + "\r"` only

--- SECTION B: LAUNCH FRESH, GATE READY ---
CHANGE:
  - B1: Only pass -s flag when resumeId is non-empty AND explicitly provided
  - B3: Added 350ms settle delay after agent ready before first flush
  - B2/B4: Pending writes already queue via agentSend when launching (no premature writes)
VERIFIED: TerminalPage.tsx initializeTerminal has settle delay + fresh launch logic

--- SECTION C: DECOUPLE PLAIN TERMINAL FROM AGENT SESSION ---
CHANGE:
  - spawn-terminal + terminal:create: only create agent state when agentType is provided
  - Plain terminals (no agentType) skip: agentStates, startAgentTimeout, readiness detection
  - Data handler already guards with `if (!st) return;` — plain terminals unaffected
VERIFIED: main.cjs spawn-terminal handler checks `if (agentType && agentType.trim().length > 0)`

--- SECTION D: PROJECT-SCOPED SPECS ---
CHANGE:
  - FeatureSpecPanel accepts projectPath prop
  - On mount, reads <projectPath>/agent/FEATURE_SPECS.md via readProjectFile IPC
  - Empty state: "No specs yet" + "Generate specs" button (dispatches create-terminal)
  - Found state: shows raw markdown content with copy button
  - GuidePage (noShell) still uses static FEATURE_SPECS
VERIFIED: index.js line 80227 — projectSpecs state + empty state rendering

--- SECTION E: UI REVAMP ---
STATUS: NOT YET IMPLEMENTED — deferred to follow-up packet
  - E1: Session sidebar status badges (needs session.project_id join for project info)
  - E2: Replace window.confirm with readiness panel (needs new modal component)
  - E3: Header dedupe (needs layout audit)

NOTES/CONFIRMATIONS:
  - Section D: The init step creates <projectPath>/agent/ directory + AGENTS.md,
    but does NOT create FEATURE_SPECS.md. The empty state + Generate CTA is correct.
  - Section A: Bracketed paste config still exists in AGENT_CONFIGS but is no longer
    used by buildAgentInputPayload. Could be cleaned up later.
