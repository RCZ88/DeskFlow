# IMPLEMENTATION ADVISORY — DeskFlow Terminal TUI/CLI Fixes
## For the AI Coding Agent Implementing the Research Report

You have received a `TUI_CLI_RESEARCH_REPORT.md` from a research agent. This advisory tells you HOW to read it, WHAT to prioritize, and HOW to implement without breaking the existing terminal workspace.

---

## ⚠️ CRITICAL: Read This Before Touching Any Code

### Rule 1: Do NOT Implement Everything at Once

The research report likely contains 15-30 recommendations. Implement them in **3 waves**:

**Wave 1 — The "It Must Work" Fixes (do these first, test after each)**
1. Fix prompt delivery (TerminalPage.tsx line ~1071)
2. Add missing agent configs (main.ts AGENT_CONFIGS)
3. Fix terminal dimension measurement (TerminalWindow.tsx measureSpawnSize)

**Wave 2 — Robustness Improvements**
4. Fix ResizeObserver to call terminalResize IPC (not just fitAddon.fit)
5. Increase agent ready timeout from 1.5s to 5s
6. Add post-spawn dimension verification

**Wave 3 — Architecture Improvements (only after Waves 1-2 are stable)**
7. Headless mode detection per agent
8. Session management improvements
9. TUI state detection enhancements

**NEVER** mix Wave 1 and Wave 3 changes in the same commit.

---

## Rule 2: The Research Report Is a Design Target, Not Code

The research agent does NOT know your exact file structure. It may say:
- "Change line 1071 in TerminalPage.tsx" → VERIFY this is still line 1071
- "Add a function called X" → Check if X already exists elsewhere
- "Use channel Y" → Check if Y exists in preload.ts and main.ts

**Before implementing ANY change:**
1. Open the actual file in the codebase
2. Find the exact line/function
3. Verify the research report's assumption matches reality
4. If there's a mismatch, ADAPT the fix — don't blindly copy

---

## Rule 3: Backup Before Every Change

```bash
# Before modifying ANY file:
cp src/pages/TerminalPage.tsx src/pages/TerminalPage.tsx.bak.$(date +%Y%m%d-%H%M%S)
cp src/main.ts src/main.ts.bak.$(date +%Y%m%d-%H%M%S)
cp src/components/TerminalWindow.tsx src/components/TerminalWindow.tsx.bak.$(date +%Y%m%d-%H%M%S)
cp src/preload.ts src/preload.ts.bak.$(date +%Y%m%d-%H%M%S)
```

If a change breaks the terminal, revert immediately. Do not "fix forward."

---

## Rule 4: Test After EVERY Wave

After Wave 1:
1. `npm run build` → must succeed with zero errors
2. Open the app
3. Create a new session with OpenCode
4. Verify: the prompt appears in the TUI input field
5. Verify: the TUI fills the terminal (not pushed down)
6. Verify: you can type and the TUI responds

If ANY of these fail, STOP. Do not proceed to Wave 2.

---

## 🔥 WAVE 1: The Critical Fixes (Detailed Instructions)

### Fix 1A: Prompt Delivery — Use agentSend Instead of terminalWriteRaw

**File:** `src/pages/TerminalPage.tsx`
**Location:** Inside `initializeTerminal()`, around the prompt-sending block (currently uses `terminalWriteRaw`)

**What the research report probably says:** "Use `agentSend` instead of `terminalWriteRaw` for the initial prompt."

**Why:** `terminalWriteRaw` writes directly to PTY stdin immediately. If the TUI hasn't finished starting, the text goes into the shell buffer and gets overwritten when the TUI renders. `agentSend` goes through the agent state machine which QUEUES the prompt if the agent is still `launching`, then flushes it when `markAgentReady()` fires (after the TUI prompt is detected).

**Exact change:**
```typescript
// BEFORE (broken):
if (parts.length > 0 && window.deskflowAPI?.terminalWriteRaw) {
  const combined = parts.join('

');
  const payload = '[200~' + combined + '[201~';
  const sendResult = await window.deskflowAPI.terminalWriteRaw(terminalId, payload);
  // ...
}

// AFTER (fixed):
if (parts.length > 0 && window.deskflowAPI?.agentSend) {
  const combined = parts.join('

');
  // agentSend handles bracketed paste, queuing, and DB recording automatically
  const sendResult = await window.deskflowAPI.agentSend(terminalId, combined, agent);
  if (!sendResult?.success) {
    showError('Failed to send initialization prompt to terminal', 'error');
  } else {
    const mode = sendResult?.queued ? 'queued (waiting for agent ready)' : 'sent immediately';
    console.log('[TerminalPage] Sent initialization prompt via agentSend:', combined.length, 'chars,', mode);
  }
}
```

**CRITICAL WARNING:** Do NOT change the `launchCommand` send (the `cd /project && opencode` part) — that MUST stay as `terminalWriteRaw` because it's a shell command, not an agent message. Only change the prompt delivery.

---

### Fix 1B: Add Missing Agent Configs

**File:** `src/main.ts`
**Location:** `AGENT_CONFIGS` constant (around line 10022)

**What the research report probably says:** "Add configs for codex and gemini."

**Current state:**
```typescript
const AGENT_CONFIGS: Record<string, AgentConfig> = {
  opencode: { ... },
  claude: { ... },
  // codex and gemini are MISSING
};
```

**What to do:**
1. Check the research report's recommendations for `codex` and `gemini` configs
2. If the report says "codex does not use a TUI" → set `bracketedPaste: false`
3. If the report says "gemini uses a simple stdin interface" → set `bracketedPaste: false`
4. If the report says "both use TUIs" → set `bracketedPaste: true` and provide `readyRegex`
5. If the report says "RESEARCH NEEDED" → use conservative defaults:
   ```typescript
   codex: {
     binaryCandidates: ['codex', 'codex.cmd', 'codex.exe'],
     readyRegex: /^[A-Za-z0-9_-]*\s*>\s*$/,
     installHint: 'Install Codex CLI from OpenAI',
     bracketedPaste: false, // conservative default
   },
   gemini: {
     binaryCandidates: ['gemini', 'gemini.cmd', 'gemini.exe'],
     readyRegex: /^[A-Za-z0-9_-]*\s*>\s*$/,
     installHint: 'Install Gemini CLI from Google',
     bracketedPaste: false, // conservative default
   },
   ```

**Why this matters:** Without configs, `getAgentConfig('codex')` falls back to the `DEFAULT_AGENT` (opencode) config. This means codex gets opencode's `readyRegex` and `bracketedPaste` settings, which are probably wrong.

---

### Fix 1C: Fix Terminal Dimension Measurement

**File:** `src/components/TerminalWindow.tsx`
**Location:** `measureSpawnSize()` and `handleTerminalReady()`

**What the research report probably says:** "The TUI gets wrong dimensions because xterm.js hasn't finished measuring fonts when you call `measureSpawnSize`."

**Current state:**
```typescript
function measureSpawnSize(terminalId: string): { cols: number; rows: number } {
  // ... tries to read .xterm-char-measure-element ...
  // fallback: 80x24
}
```

**The problem:** If `measureSpawnSize` returns 80×24 but the container is actually 140×45, the PTY spawns at 80×24. The TUI (OpenCode) queries PTY size, gets 80×24, clears 24 rows, and draws its interface. But xterm.js shows 45 rows, so rows 25-45 still contain old shell output. The TUI appears "pushed down."

**What to do:**
1. Check if the research report provides a `waitForXtermMeasurement` implementation
2. If yes, adapt it to your codebase
3. If no, implement this:
   ```typescript
   function waitForXtermMeasurement(terminalId: string, timeout = 3000): Promise<boolean> {
     return new Promise((resolve) => {
       const start = Date.now();
       const check = () => {
         const el = document.querySelector(`[data-terminal-id="${terminalId}"]`) as HTMLElement | null;
         if (!el) return false;
         const measure = el.querySelector('.xterm-char-measure-element') as HTMLElement | null;
         const row = el.querySelector('.xterm-rows > div') as HTMLElement | null;
         return !!(measure && row && measure.offsetWidth > 0 && row.offsetHeight > 0);
       };
       if (check()) { resolve(true); return; }
       const timer = setInterval(() => {
         if (check() || Date.now() - start > timeout) {
           clearInterval(timer);
           resolve(check());
         }
       }, 50);
     });
   }
   ```
4. Call `await waitForXtermMeasurement(terminalId)` BEFORE `measureSpawnSize()` in `handleTerminalReady()`

---

## 🔧 WAVE 2: Robustness Improvements

### Fix 2A: ResizeObserver Must Call terminalResize IPC

**File:** `src/components/TerminalWindow.tsx`
**Location:** TerminalPane mount effect, ResizeObserver callback

**Current state:**
```typescript
const ro = new ResizeObserver(debounce(() => {
  if (terminalRef.current && containerRef.current) {
    try { fitAddon.fit(); } catch {}
    // ❌ MISSING: terminalResize IPC call
  }
}, 150));
```

**Fix:**
```typescript
const ro = new ResizeObserver(debounce(() => {
  if (terminalRef.current && containerRef.current) {
    try { fitAddon.fit(); } catch {}
    // CRITICAL: Also resize the PTY so the TUI knows the new dimensions
    try {
      window.deskflowAPI?.terminalResize?.(terminalId, terminalRef.current.cols, terminalRef.current.rows);
    } catch {}
  }
}, 150));
```

**Why:** `fitAddon.fit()` changes xterm.js's internal dimensions, but the PTY (node-pty) doesn't know about it until you call `terminalResize()`. Without this, the TUI renders for the old dimensions.

---

### Fix 2B: Increase Agent Ready Timeout

**File:** `src/pages/TerminalPage.tsx`
**Location:** The `onAgentReady` wait inside `initializeTerminal()`

**Current:** `setTimeout(..., 1500)` — too short for cold starts
**Fix:** `setTimeout(..., 5000)` — gives OpenCode/Claude time to boot

**Why:** The timeout is a safety net. If the agent becomes ready before the timeout, the promise resolves early. Making it longer doesn't slow down fast starts, but prevents premature resolution on slow machines.

---

### Fix 2C: Post-Spawn Dimension Verification

**File:** `src/components/TerminalWindow.tsx`
**Location:** `handleTerminalReady()`

After spawning the terminal, re-measure and resize if dimensions changed:
```typescript
// After: const result = await spawnTerminal(...)
// Add:
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const { cols: newCols, rows: newRows } = measureSpawnSize(terminalId);
    if (newCols !== finalCols || newRows !== finalRows) {
      console.log(`[FIT] Post-spawn resize: ${finalCols}x${finalRows} → ${newCols}x${newRows}`);
      terminalResize(terminalId, newCols, newRows);
    }
  });
});
```

---

## 🏗️ WAVE 3: Architecture (Only If Waves 1-2 Are Stable)

### Fix 3A: Headless Mode Detection

If the research report says "OpenCode has `opencode serve`" or "Claude has `claude -p`", consider:
- Adding a preference/setting for "Use headless mode when available"
- In `initializeTerminal()`, check if headless mode is enabled
- If yes, spawn the CLI with headless flags and parse structured output
- If no, fall back to TUI mode

This is a MAJOR change. Do not do this in Wave 1.

---

## 🧪 Testing Protocol After Each Wave

### Build Test
```bash
npm run build
```
Must succeed with zero TypeScript errors.

### Manual Test: OpenCode
1. Open DeskFlow
2. Create new session with OpenCode
3. **Check console logs:**
   - `[FIT] Measured: 140x45` (NOT 80x24)
   - `[TerminalPage] Sent initialization prompt via agentSend: 1245 chars, queued (waiting for agent ready)`
   - `[main] Agent ready detected for term-xxx`
4. **Visual check:** TUI fills the entire terminal, no old shell output above it
5. **Functional check:** The prompt text appears in OpenCode's input field
6. **Functional check:** Press Enter in the TUI, OpenCode processes the prompt

### Manual Test: Claude Code
Same as above but with Claude Code agent.

### Manual Test: User Typing
1. Click in the terminal
2. Type some characters
3. Verify they appear in the TUI's input field
4. Press Enter
5. Verify the TUI processes the input

---

## 🚨 Common Mistakes to Avoid

1. **Don't change `terminalWriteRaw` for the launch command.** The `cd /project && opencode` part MUST stay as `terminalWriteRaw` — it's a shell command, not an agent message. Only the prompt delivery changes.

2. **Don't remove the `terminal:write-raw` handler.** It's still needed for user typing and shell commands.

3. **Don't change `buildAgentInputPayload` unless the research report explicitly says to.** It already handles bracketed paste correctly.

4. **Don't assume the research report's line numbers are exact.** Open the file and search for the function name.

5. **Don't implement headless mode in Wave 1.** It's an architecture change, not a bug fix.

6. **Don't forget to test user typing after fixing prompt delivery.** The input flow (`terminal.onData` → `terminalWriteRaw`) must still work.

---

## 📋 Quick Reference: What Each IPC Channel Does

| Channel | Direction | What It Does | When to Use |
|---------|-----------|--------------|-------------|
| `terminal:write-raw` | Renderer → Main → PTY | Direct passthrough to PTY stdin | User typing, shell commands |
| `terminal:write` | Renderer → Main → PTY | Direct passthrough (alias?) | Check if different from write-raw |
| `terminal:write-display` | Renderer → Main → Renderer | Broadcasts to xterm.js, NOT PTY | Banner text, status messages |
| `agent:send` | Renderer → Main → PTY (queued) | Queued, state-tracked, DB-recorded, bracketed-paste-wrapped | Agent prompts, agent messages |
| `terminal:resize` | Renderer → Main → PTY | Resizes node-pty, sends SIGWINCH | Container resize, post-spawn fix |

**Rule:** For agent prompts, always use `agent:send`. For shell commands and user typing, use `terminalWriteRaw`.

---

## 📝 Final Checklist Before Declaring Victory

- [ ] `npm run build` succeeds
- [ ] OpenCode TUI renders full-screen (not pushed down)
- [ ] Initial prompt appears in OpenCode's input field
- [ ] OpenCode processes the prompt and responds
- [ ] User can type in the terminal and TUI responds
- [ ] Claude Code works the same way
- [ ] Terminal resize works (drag window corner, TUI redraws correctly)
- [ ] No console errors from terminal/IPC code

If all checkboxes are ticked, Waves 1-2 are complete. Only then proceed to Wave 3.
