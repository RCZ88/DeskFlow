# D1 Diagnostic Report — opencode PTY Input Pipeline

> Captured 2026-06-30 via probe_open + manual reproduction.

---

## Q1 (code): How is opencode launched? Real PTY or pipe?

**REAL PTY.** opencode is launched via node-pty (`pty.spawn`) with:
- shell: `process.env.COMSPEC || 'powershell.exe'` (Windows → cmd.exe)
- env: `process.env` (full environment)
- cols/rows from renderer xterm terminal (default 80x24)
- name: `'xterm-256color'`
- No custom `handleFlowControl` option (defaults to false)

Evidence from runtime main console:
```
[TerminalManager] spawn called: term-1782813691103
[TerminalManager] spawning shell: C:\WINDOWS\system32\cmd.exe in C:\Users\cleme
[TerminalManager] PTY spawned, pid: 62900
```

Answer: **It IS a real PTY. The default shell on this system is `cmd.exe` (not powershell.exe).**

---

## Q2 (code): Can user type into the same terminal? Is opencode rendered inside xterm.js?

**YES.** The terminal is rendered in an xterm.js instance inside the Electron renderer process (TerminalWindow.tsx). The user can type directly into it:

- User input flow: `term.onData` → `terminalWriteRaw` IPC → main process `pty.write(data)`
- PTY output flow: `pty.onData` → `broadcast('terminal:data', ...)` → `term.write(data)` in renderer
- Agents also write to the same PTY (not a separate terminal)

Answer: **YES — user type and agent send share the same PTY through the same write path.**

---

## Q3 (runtime): Is opencode's content pushed down by something?

**Not yet confirmed for agent send.** The `agentSend` IPC was not testable in this session because:
1. No active opencode agent session existed (plain PTY with cmd.exe only)
2. The InstructionPanel send button was disabled because probe_type sets DOM value without firing React onChange
3. The `Initialize` button to start an agent session did not open a visible dialog

**Confirmed for manual typing:** Characters typed into the xterm textarea are sent individually (length=1) through the pipeline:
- `h` → ONDATA → RAWWRITE → pty.write → echoed back
- `i` → ONDATA → RAWWRITE → pty.write → echoed back

Timing: each character ~2ms apart (SEQ 105→108). No batching.

---

## P1 — Spawn info

Already answered in Q1. From runtime:
```
[TerminalManager] P1 spawn: PTY spawned, pid: 62900, shell: cmd.exe, cols: ?, rows: ?
```
Note: P1 probe was NOT added to source code. The above is from the existing `[TerminalManager]` log.

**Missing probe: P1 was not instrumented.** No `[D1] SPAWN` log exists.

---

## P2 — agent:send IPC handler

**Probe location:** main.ts line 8843-8844 (dist-electron/main.cjs line 8843-8844)

**Result: NOT FIRED.** The `agent:send` IPC handler was never reached because:
- The InstructionPanel "Send to Terminal" button was disabled via React attribute
- `hasSelection` was false because probe_type doesn't fire React onChange
- No problems/requests/skills were selected
- The disabled button intercepts the click before `onClick` fires

**Root cause for P2 failure:** The test setup requires either:
1. A properly initialized opencode agent session (via "Initialize" dialog)
2. Typing text via React-compatible methods (not probe_type)

---

## P3 — onData (renderer) + terminalWriteRaw (main)

**Probe locations:**
- Renderer: TerminalWindow.tsx line `term.onData` handler → `[D1] ONDATA_HEX` + `[D1] ONDATA_RAW`
- Main: main.ts `terminal:write-raw` handler → `[D1] RAWWRITE_HEX` + `[D1] RAWWRITE_RAW`

**Result: FIRED multiple times.** Raw logs in chronological order:

| # | Level | Timestamp | Log |
|---|-------|-----------|-----|
| 44 | RENDERER | T+0ms | `[D1] ONDATA_HEX 1b 5b 49` |
| 45 | RENDERER | T+0ms | `[D1] ONDATA_RAW "\u001b[I"` |
| 78 | MAIN | T+0ms | `[D1] RAWWRITE_HEX 1b5b49` |
| 79 | MAIN | T+0ms | `[D1] RAWWRITE_RAW "\u001b[I"` |
| 48 | RENDERER | T+40s | `[D1] ONDATA_HEX 1b 5b 4f` |
| 49 | RENDERER | T+40s | `[D1] ONDATA_RAW "\u001b[O"` |
| 85 | MAIN | T+40s | `[D1] RAWWRITE_HEX 1b5b4f` |
| 86 | MAIN | T+40s | `[D1] RAWWRITE_RAW "\u001b[O"` |
| 54 | RENDERER | T+120s | `[D1] ONDATA_HEX 1b 5b 49` |
| 55 | RENDERER | T+120s | `[D1] ONDATA_RAW "\u001b[I"` |
| 99 | MAIN | T+120s | `[D1] RAWWRITE_HEX 1b5b49` |
| 100 | MAIN | T+120s | `[D1] RAWWRITE_RAW "\u001b[I"` |
| 56 | RENDERER | T+179s | `[D1] ONDATA_HEX 68` → "h" |
| 57 | RENDERER | T+179s | `[D1] ONDATA_RAW "h"` |
| 105 | MAIN | T+179s | `[D1] RAWWRITE_HEX 68` |
| 106 | MAIN | T+179s | `[D1] RAWWRITE_RAW "h"` |
| 58 | RENDERER | T+179s | `[D1] ONDATA_HEX 69` → "i" |
| 59 | RENDERER | T+179s | `[D1] ONDATA_RAW "i"` |
| 108 | MAIN | T+179s | `[D1] RAWWRITE_HEX 69` |
| 109 | MAIN | T+179s | `[D1] RAWWRITE_RAW "i"` |

**KEY FINDINGS:**
1. ONDATA → RAWWRITE is 1:1 for every character/sequence
2. Escape sequences `\u001b[I` (ESC [ I = focus-in) and `\u001b[O` (ESC [ O = focus) are sent to PTY
3. REAL user input "hi" is sent character-by-character (hex 68, 69), length=1 each
4. Total transparency: ONDATA hex matches RAWWRITE hex character-for-character

---

## P4 — OpenCode first output capture

**Probe location:** main.ts lines 9348-9355 and 9454-9459

**Result: NOT FIRED.** No `[D1] OC_OUT` log in any console.

**Analysis:**
- The P4 probe captures the first ~1KB of PTY output per terminal ID
- Terminal `term-1782813691103` did receive data (SEQ 75-77 show C2 callback firing with 16+97+82 bytes)
- The P4 probe is registered via `terminalManager.getDataHandler(id, callback)` — a separate callback path
- This path is set up during agent session creation (when `agentStates` entries exist), NOT for plain PTY terminals
- Since we opened a plain PTY without agent initialization, the P4 callback was never registered

**Root cause:** P4 only fires for agent-initialized terminals, not plain shells.

---

## P5 — PTY size on resize

**Probe location:** TerminalWindow.tsx line 256

**Result: NOT FIRED.** No `[D1] PTY_SIZE` log in any console.

**Analysis:**
- The resize handler is in a `useEffect` with a `ResizeObserver`
- It fires when the terminal container element resizes
- The initial `fitAddon.fit()` call happens in the terminal ready handler, not the resize observer
- No resize event occurred during the test session

**P5 requires a window resize or container size change to trigger.**

---

## P6 — Local echo check

**Result: NO local echo.** Confirmed by code reading:
- The `term.onData` handler does NOT call `term.write(data)`
- ONDATA → RAWWRITE → pty.write → PTY echoes back naturally
- All characters echoed through the standard PTY output path, not client-side

---

## P7 — Write timing for agent send

**Result: INCONCLUSIVE** (agent send was not testable).

From code reading:
- Agent send writes the ENTIRE prompt in ONE `terminalManager.write(id, payload)` call
- No chunking, no setTimeout
- BUT there IS a `pendingWrites` array that buffers writes during launch phase
- Pending writes are flushed in one go when terminal becomes ready

---

## Problems Encountered

1. **"Send to Terminal" button disabled** — probe_type doesn't fire React onChange, so `customInstruction` state remained empty and `hasSelection` was false. The disabled HTML attribute prevents onClick from firing.

2. **"Initialize" dialog not opening** — clicking the "Initialize" button in the terminal toolbar did not produce a visible dialog in the snapshot. Possible causes:
   - Dialog rendered off-screen
   - Dialog requires preconditions (provision step first)
   - Dialog is hidden behind the snapshot viewport cap

3. **No active opencode agent session** — only a plain cmd.exe PTY was running. The agent session flow requires multiple steps (Initialize → set agent → submit) that need real user interaction.

4. **P4 only fires for agent-initialized terminals** — the probe location is in the agent-state-initialization code path, not in the plain terminal spawn path.

---

## Raw Log Annex

### Full main console log (all 110 entries)
See D1_REPORT_RAW_MAIN.md (if needed)

### Full renderer console log (all 59 entries)
See D1_REPORT_RAW_RENDERER.md (if needed)

---

## STATUS: Diagnostic Captured — PARTIAL

**PASS:** P3 (ONDATA + RAWWRITE), P6 (no local echo)
**FAIL:** P2 (agent send not testable), P4 (wrong code path), P5 (no resize event)
**NOT TESTED:** P7 (no agent send happened)

The pipeline from user keyboard → ONDATA → terminalWriteRaw → pty.write is fully instrumented and verified. The agent send path could not be tested because no opencode agent session was active and the test interface (InstructionPanel) requires React-native input methods.

**Recommended follow-up:** Test with a real opencode agent session (run `opencode` manually in a terminal) to verify the agent send → pty.write path and observe the "push-down" behavior the Architect suspects.
