# DeskFlow — Terminal Fixes (apply + rebuild)

**FROM:** Architect (Notion AI)  **TO:** opencode (Hands & Eyes)  **VIA:** CZ (Relay)
**TYPE:** \*\*\* CODE CHANGES ONLY — DO NOT TEST. CZ tests by hand. \*\*\*

These fixes are ALREADY written into the two files shipped alongside this doc.
Your job: put each file in the right place, make sure it type-checks and builds,
then hand back to CZ. Do NOT run the app or "test" it yourself.

## Files in this package

| File in package | Goes to (repo-relative) | Layer |
|---|---|---|
| `src/components/TerminalWindow.tsx` | `src/components/TerminalWindow.tsx` | Renderer |
| `main.ts` | your Electron **main-process** entry (the file that defines `ipcMain.handle('spawn-terminal', ...)` and `terminalManager` — e.g. `src/main.ts` or `electron/main.ts`) | Main process |

> If your repo already has these files, apply the three changes below instead of
> overwriting, so you don't lose unrelated local edits. Every change is marked in
> code with a `[INPUT-FIX]`, `[PUSHDOWN-FIX]`, or `[SESSION-FIX]` comment.

---

## FIX 1 — Can't type in the terminal (green cursor, keystrokes swallowed)
**File:** `src/components/TerminalWindow.tsx` — inside `TerminalPane`, the
`useEffect` that registers `onTerminalData` / `onTerminalExit` / `onTerminalReady`.

**Why:** Input is gated behind a module-level `terminalReadyStates` map. That flag
is only flipped `true` by the one-shot `terminal:ready` IPC event. If that event
is missed (listener registered after it fired) or never fires, every keystroke is
pushed into `inputBuffers` forever — output still renders, so you see the green
cursor but nothing you type lands.

**Change A** — unlock + flush the moment ANY real PTY output arrives (output proves
the shell is alive), inside the `onTerminalData` handler:
```ts
const cleanupData = window.deskflowAPI.onTerminalData?.((id, data) => {
  if (id === terminalId && terminalRef.current) {
    terminalRef.current.write(data);
    // [INPUT-FIX] Output = proof the shell can accept input. Unlock + flush now,
    // so a missed/absent one-shot 'ready' event can't trap keystrokes forever.
    if (!terminalReadyStates.get(terminalId)) {
      terminalReadyStates.set(terminalId, true);
      const pending = inputBuffers.get(terminalId) || [];
      pending.forEach((bufferedData) => {
        window.deskflowAPI?.terminalWriteRaw?.(terminalId, bufferedData);
      });
      inputBuffers.set(terminalId, []);
    }
  }
});
```

**Change B** — last-resort safety net so input can NEVER stay locked; add before the
effect's `return () => {...}` cleanup, and clear it in cleanup:
```ts
// [INPUT-FIX] If neither 'ready' nor any output arrives in 2.5s, unlock anyway.
const inputUnlockFallback = setTimeout(() => {
  if (!terminalReadyStates.get(terminalId)) {
    terminalReadyStates.set(terminalId, true);
    const pending = inputBuffers.get(terminalId) || [];
    pending.forEach((bufferedData) => {
      window.deskflowAPI?.terminalWriteRaw?.(terminalId, bufferedData);
    });
    inputBuffers.set(terminalId, []);
  }
}, 2500);

return () => {
  clearTimeout(inputUnlockFallback);
  cleanupData?.();
  cleanupExit?.();
  cleanupReady?.();
};
```

---

## FIX 2 — opencode UI "pushed down" / squashed
**File:** `src/components/TerminalWindow.tsx` — `TerminalLayout` (`handleTerminalReady`
and the empty-state "+ Open Terminal" button) + a new module-level helper.

**Why:** Both spawn paths sized the PTY from `terminalRef.current`, but that ref
does NOT exist in `TerminalLayout`'s scope — so cols/rows ALWAYS fell back to
`80x24`. opencode's full-screen TUI draws into 80x24, then the later resize forces
a scroll-region redraw → the content "pushes down". (This is a known xterm.js +
full-screen-TUI interaction; spawning at the correct size removes the main trigger.)

**Change** — add this module-level helper (e.g. just above `export function TerminalLayout`):
```ts
// [PUSHDOWN-FIX] Measure the real on-screen pane size so the PTY spawns at the
// correct cols/rows from the first byte instead of 80x24-then-resize.
function measureSpawnSize(terminalId: string): { cols: number; rows: number } {
  try {
    const el = document.querySelector(`[data-terminal-id="${terminalId}"]`) as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      let cellW = 8.43; // Consolas 14px fallback metrics
      let cellH = 17;
      const measureEl = el.querySelector('.xterm-char-measure-element') as HTMLElement | null;
      if (measureEl) { const mw = measureEl.getBoundingClientRect().width; if (mw > 0) cellW = mw; }
      const rowEl = el.querySelector('.xterm-rows > div') as HTMLElement | null;
      if (rowEl) { const rh = rowEl.getBoundingClientRect().height; if (rh > 0) cellH = rh; }
      if (rect.width > 8 && rect.height > 8) {
        const cols = Math.max(40, Math.floor((rect.width - 8) / cellW));
        const rows = Math.max(10, Math.floor((rect.height - 8) / cellH));
        return { cols, rows };
      }
    }
  } catch { /* fall through */ }
  return { cols: 80, rows: 24 };
}
```
Then REPLACE the broken size reads (there are two — in `handleTerminalReady` and
in the empty-state button):
```ts
// BEFORE (both spots):
const t = terminalRef.current;
const cols = t?.cols || 80;
const rows = t?.rows || 24;

// AFTER — in handleTerminalReady:
const { cols, rows } = measureSpawnSize(terminalId);
// AFTER — in the "+ Open Terminal" button:
const { cols, rows } = measureSpawnSize(newId);
```

---

## FIX 3 — "session doesn't exist" on resume
**File:** Electron **main process** (`main.ts`) — handlers
`capture-opencode-session-id` and `list-opencode-sessions`.

**Why:** The launch/resume logic in `src/pages/TerminalPage.tsx` is already correct
(new sessions launch plain `opencode` with NO `-s`; resume only uses `-s <id>` after
validating with `check-session-exists`). The real bug was the lookup in `opencode.db`:
it compared `directory = ?` EXACTLY, but opencode stores its own resolved path. On
Windows that differs by separator (`\\` vs `/`), drive-letter case, or trailing
slash — so the query matched nothing and resume silently failed.

**Change** — normalize the directory on both sides before comparing.

In `capture-opencode-session-id`, replace the exact-match query block with:
```ts
// [SESSION-FIX] Normalize paths; opencode's stored `directory` may differ from cwd.
const normDir = (p: any) => String(p || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
const targetDir = normDir(workspaceDir);
const sinceISO = sinceTimestamp ? new Date(sinceTimestamp).toISOString() : null;
const candidates = odb.prepare('SELECT id, directory, time_created FROM session ORDER BY time_created DESC').all();
let row = candidates.find((r: any) => normDir(r.directory) === targetDir && (!sinceISO || String(r.time_created) >= sinceISO));
// Bounded fallback: if we know when this launch happened but still can't path-match,
// accept the most recent session created after this launch.
if (!row && sinceISO) {
  row = candidates.find((r: any) => String(r.time_created) >= sinceISO);
}
```

In `list-opencode-sessions`, replace the exact-match query with:
```ts
const normDir = (p: any) => String(p || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
const targetDir = normDir(workspaceDir);
const allRows = odb.prepare('SELECT id, directory, time_created FROM session ORDER BY time_created DESC').all();
const rows = allRows.filter((r: any) => normDir(r.directory) === targetDir);
```
(`check-session-exists` is by id only — leave it unchanged.)

---

## DONE WHEN (hand back to CZ — do NOT test yourself)
- Both files in place; all three `[*-FIX]` markers present.
- TYPECHECK passes, BUILD passes (report bundle sizes), DIFF listed.
- **CRITICAL:** confirm the **renderer bundle is actually rebuilt** and the running
  app loads the NEW build — earlier fixes appeared to have "no effect" because the
  app may have been running a stale bundle. State exactly which build command you ran.
- STATUS: AI Attempted Fix

## MANUAL TEST — for CZ, by hand (not opencode)
1. Open an EMPTY terminal, type `dir` + Enter → letters should appear (Fix 1).
2. Launch opencode → its box should fill the pane, not get pushed down (Fix 2).
3. Close + reopen a session → it resumes the real session, or starts fresh cleanly —
   never "session doesn't exist" (Fix 3).
