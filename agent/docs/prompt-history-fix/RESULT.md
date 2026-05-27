# RESULT: Terminal Prompt History Fix

## Root Cause

`terminal:write-old-format` (main.ts line ~5872) inserts EVERY terminal write into `terminal_messages` as `role='user', status='in_progress'`. This fires for:
- Individual keystrokes: "a", "b", "\r", "\n"
- System init messages: launch commands, system prompts
- Actual user prompts from InstructionPanel

Keystrokes are never "completed" because no AI responds to them. They accumulate as stuck "Processing" entries.

## Solution — Three-Layer Fix

### Layer 1: Source Filtering (main.ts — `terminal:write-old-format`)

Only record writes that look like actual prompts, not keystrokes:

```typescript
electron_1.ipcMain.handle('terminal:write-old-format', async (_event, terminalId: string, data: string) => {
    const success = terminalManager.write(terminalId, data);
    // Only record content that looks like a real prompt (not keystrokes)
    // Keystrokes are 1-5 chars. Real prompts are 20+ chars.
    if (success && db && data && data.trim().length >= 20) {
        try {
            pendingCompletions.add(terminalId);
            const result = db.prepare('INSERT INTO terminal_messages (session_id, role, content, status) VALUES (?, ?, ?, ?)').run(terminalId, 'user', data, 'in_progress');
            const { BrowserWindow } = require('electron');
            const windows = BrowserWindow.getAllWindows();
            for (const win of windows) {
                if (!win.isDestroyed()) {
                    win.webContents.send('ai-task:updated', { terminalId, status: 'in_progress', messageId: result.lastInsertRowid });
                }
            }
        } catch (_e) { /* silent */ }
    }
    return { success };
});
```

**Threshold: 20 characters.** This catches:
- ✅ InstructionPanel prompts (hundreds of chars)
- ✅ Session resume commands (short but > 20)
- ✅ Problem assignment prompts
- ❌ Individual keystrokes (1-3 chars)
- ❌ System init messages (use terminalWriteRaw, already no DB)
- ❌ Short shell commands typed directly in terminal (< 20 chars)

**Tradeoff:** Short shell commands typed directly (< 20 chars) won't appear in prompt history. This is acceptable — they're not prompts sent to AI agents.

### Layer 2: Query-Time Cleanup (main.ts — `get-prompt-history` + `get-prompt-status`)

Already implemented: auto-settle stale `in_progress` records older than 15 minutes. Keep this as defense-in-depth.

### Layer 3: UI Filter (PromptHistoryTab.tsx)

Add a minimum content length filter in the `useMemo` that processes entries:

```typescript
const filteredEntries = useMemo(() => {
    return entries.filter(e => e.prompt && e.prompt.length >= 20);
}, [entries]);
```

This is redundant with Layer 1 but provides a safety net.

## Files Changed

| File | Change |
|------|--------|
| `src/main.ts` | Add `data.trim().length >= 20` guard in `terminal:write-old-format` |
| `src/components/PromptHistoryTab.tsx` | Add `.filter(e => e.prompt?.length >= 20)` in entry processing |

## Why This Works

1. **Keystrokes never reach the DB** — The 20-char threshold filters them at the IPC handler level. No DB bloat. No stuck records.
2. **Terminal behavior unchanged** — The PTY write happens unconditionally. Only the DB logging is conditional.
3. **Real prompts still tracked** — InstructionPanel sends full prompts (100-5000 chars). They get recorded, marked in_progress, and marked completed when AI responds.
4. **No schema changes** — Uses existing table structure.
5. **No new IPC handlers** — Reuses existing infrastructure.
6. **Defense-in-depth** — Three layers (source filter + stale cleanup + UI filter) ensure the problem can't recur.

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| User types "ls" in terminal | Not recorded (< 20 chars) — correct, not a prompt |
| User sends prompt via InstructionPanel | Recorded (100+ chars), tracked as in_progress → completed |
| System init writes | Use terminalWriteRaw (no DB) — already implemented |
| Terminal exits with pending prompts | markTaskCompleted sets them to completed |
| AI crashes mid-response | Stale in_progress auto-settles after 15 min |
