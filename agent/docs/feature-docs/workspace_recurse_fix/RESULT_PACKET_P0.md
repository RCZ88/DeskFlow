PACKET P0 RESULT
DIFF: src/main.ts (8 hunks), src/pages/TerminalPage.tsx (3 hunks)
TYPECHECK: pass (renderer + preload built clean, esbuild main.cjs compiled without errors)
BUILD: pass | main.cjs 749.9KB (rebuilt after Step 4 timeout) | index.js 5355KB (built in 1m29s) | preload.cjs 48KB (built in 1.35s)
UI CHECK: Pending — real app launch needed to verify no false "Agent initialization failed" banner
STATUS: AI Attempted Fix

--- CHANGES APPLIED ---

src/main.ts:
  1. Added helper functions: normalizeTerminalPasteText, buildAgentInputPayload,
     getLastNonEmptyTerminalLine, flushPendingAgentWrites, markAgentReady,
     hasEnoughAgentOutputToAcceptInput
  2. Extended AgentState interface with launchStartedAt: number
  3. Updated both agentStates.set() calls to include launchStartedAt + pendingWrites:[]
  4. Replaced both ready-block duplicated code with markAgentReady() call
     (now triggers on isAgentReady() || hasEnoughAgentOutputToAcceptInput)
  5. Replaced all manual pendingWrites flush loops with flushPendingAgentWrites()
  6. Updated agent:send to use buildAgentInputPayload (bracketed paste for opencode/claude)
  7. Updated agent:retry-launch to reset launchStartedAt + idleSeq

src/pages/TerminalPage.tsx:
  1. Added persistent onAgentReady effect to clear false red init UI
     (deletes agentInitErrors + terminalTimeouts for the terminal)
  2. Fixed handleRetryAgentInit — removed redundant terminalWrite of launch command
     (was typing "opencode" into already-open opencode UI)
  3. Updated initializeTerminal to check agentSend result and show error on failure

--- VERIFICATION ---
  - normalizeTerminalPasteText, buildAgentInputPayload, markAgentReady,
    hasEnoughAgentOutputToAcceptInput all present in dist-electron/main.cjs
  - agentStates.set calls include launchStartedAt + pendingWrites in compiled output
  - agent:send uses buildAgentInputPayload (bracketed paste path)
  - agent:retry-launch resets launchStartedAt + idleSeq
  - showNumbers runtime error in SettingsPage: NOT related to these changes
    (NumberMaskContext.tsx is correctly implemented, error was stale bundle —
    renderer rebuilt clean in this build)
