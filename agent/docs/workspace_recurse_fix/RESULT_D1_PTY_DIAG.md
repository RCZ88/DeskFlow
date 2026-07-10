# D1 PTY Pipeline Diagnostic — Result Report
> Captured 2026-06-30 via probe_open + manual reproduction in running Electron app.
> Supersedes: N/A (diagnostic, not a fix packet). Context for Architect to rule in/out "push-down" hypothesis.

## Summary

The D1 diagnostic instrumented the opencode PTY input pipeline with temporary console.log probes (P2-P5), launched the app via probe_open with inspectMain, and captured runtime evidence. Goal: provide the Architect with ground truth about how user input flows through ONDATA → RAWWRITE → pty.write, whether agent send works, and whether the "push-down" symptom is reproducible.

## Answers

**Q1 (code): How is opencode launched? Real PTY or pipe?**
REAL PTY. `pty.spawn` with shell=cmd.exe, full env, xterm-256color, default 80x24.
No handleFlowControl. Processes run in a genuine Windows console PTY.

**Q2 (code): Can user type into the same terminal? Is opencode rendered inside xterm.js?**
YES. User input and agent send share the same PTY through the same write path.
- User: `term.onData` → `terminalWriteRaw` IPC → `pty.write(data)`
- Agent: `agent:send` IPC handler → `buildAgentInputPayload()` → `terminalManager.write()` → `pty.write(data)`
- Output: `pty.onData` → `broadcast('terminal:data')` → `term.write(data)` in xterm.js

**Q3 (runtime): Is opencode's content pushed down by something?**
NOT CONFIRMED for agent send (no agent session was active to test).
CONFIRMED for manual typing: characters are sent individually (length=1, no batching).
Focus sequences (\u001b[I, \u001b[O) also pass through transparently.

## Probe Results

| Probe | Target | Status | Evidence |
|-------|--------|--------|----------|
| P1 | Spawn info | NOT INSTRUMENTED | Existing [TerminalManager] logs show pid:62900, shell:cmd.exe |
| P2 | agent:send IPC | FAIL — not testable | No active opencode agent session; InstructionPanel button disabled (probe_type doesn't fire React onChange) |
| P3 | ONDATA → RAWWRITE | **PASS** | 1:1 echo, chars sent individually, focus sequences pass through |
| P4 | OC_OUT (first output) | FAIL — wrong code path | Callback registered only for agentState-initialized terminals, not plain PTY spawns |
| P5 | PTY_SIZE (resize) | NOT TESTED | No resize event occurred during session |
| P6 | Local echo check | **PASS** | No client-side echo; all output goes through PTY |
| P7 | Write timing | INCONCLUSIVE | No agent send happened; code shows single write call, no chunking |

## Important Failures

1. **probe_type on React controlled inputs** — confirmed AGENTS.md §5: sets DOM value but doesn't fire onChange, so `customInstruction` state stayed empty, `hasSelection` stayed false, send button stayed disabled.
2. **No active opencode agent session** — only plain cmd.exe PTY existed. Full agent flow (Initialize → dialog → submit) needs real user interaction.
3. **P4 in wrong code branch** — output capture callback is registered in the agent-initialization path, not the plain spawn path.

## Raw Log Evidence

Full main console (110 entries) and renderer console (59 entries) captured. Key sequence:
```
SEQ 44-45  RENDERER: ONDATA_HEX 1b 5b 49  /  ONDATA_RAW "\u001b[I"   (focus-in)
SEQ 78-79  MAIN:     RAWWRITE_HEX 1b5b49   /  RAWWRITE_RAW "\u001b[I"
SEQ 48-49  RENDERER: ONDATA_HEX 1b 5b 4f  /  ONDATA_RAW "\u001b[O"   (focus)
SEQ 85-86  MAIN:     RAWWRITE_HEX 1b5b4f   /  RAWWRITE_RAW "\u001b[O"
SEQ 56-57  RENDERER: ONDATA_HEX 68         /  ONDATA_RAW "h"
SEQ 105-106 MAIN:    RAWWRITE_HEX 68        /  RAWWRITE_RAW "h"
SEQ 58-59  RENDERER: ONDATA_HEX 69         /  ONDATA_RAW "i"
SEQ 108-109 MAIN:    RAWWRITE_HEX 69        /  RAWWRITE_RAW "i"
```

## Verdict

DIAGNOSTIC CAPTURED — PARTIAL. The basic user-input pipeline (P3) is verified working. The agent-send path (P2/P7) requires a real agent session to test. The P4 probe location must be moved to the plain-spawn code path to capture opencode output.

## STATUS: Diagnostic Captured — PARTIAL

FILE(S): src/main.ts (probes removed), src/components/TerminalWindow.tsx (probes removed)
BUILD: OK | main.cjs 16:58:48 | preload.cjs (rebuilt after cleanup)
TYPECHECK: pass (renderer + preload + main built clean)
STATUS: Diagnostic Captured
