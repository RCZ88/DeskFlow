# Fix: Terminal Prompt History Shows Fake "Processing" Entries for Every Keystroke

## Raw Request

> "the list of prompts doenst work since there are promtps from 7h that shows its still on processing. also, those prompts are fake and its not working since i didnt i havent yet sent anything. fix the error"

## Context — Why This Matters

The PromptHistoryTab component (Terminal Page → History tab) shows a list of "prompts" sent to AI agents. Every entry has a status badge: Pending, Processing, Completed, or Failed.

Currently it's flooded with entries that:
- Show "Processing" (cyan) from hours ago (7h+)
- Are NOT real prompts — they're individual keystrokes the user typed in the terminal
- The user NEVER sent anything to AI, yet there are dozens of fake "Processing" entries

This makes the prompt history feature completely unusable and misleading.

## Current Codebase Architecture

### IPC Handlers (main.ts)

**Handler 1: `terminal:write-old-format`** (line ~5872)
```typescript
electron_1.ipcMain.handle('terminal:write-old-format', async (_event, terminalId: string, data: string) => {
    const success = terminalManager.write(terminalId, data);
    if (success && db && data && data.trim()) {
        pendingCompletions.add(terminalId);
        const result = db.prepare('INSERT INTO terminal_messages (session_id, role, content, status) VALUES (?, ?, ?, ?)').run(terminalId, 'user', data, 'in_progress');
        // Broadcast: ai-task:updated with in_progress
    }
    return { success };
});
```

This handler is called for EVERY terminal write — including individual keystrokes. It ALWAYS inserts with `role='user', status='in_progress'`. A single "a" typed becomes a prompt stuck as Processing forever.

**Handler 2: `terminal:write-raw`** (line ~5833) — NEW, added as attempted fix
```typescript
electron_1.ipcMain.handle('terminal:write-raw', async (_event, terminalId: string, data: string) => {
    const success = terminalManager.write(terminalId, data);
    return { success };
});
```
Writes to PTY without DB recording. Used for system init messages. Attempted to use for keystrokes but it caused terminal behavior issues (newline/Enter pushing content down).

**Handler 3: `write-terminal`** (line ~5838)
Same as `terminal:write-old-format` — inserts into terminal_messages.

### Query Handler: `get-prompt-history`** (line ~6435)
```sql
SELECT tm.*, ts.*, tb.* FROM terminal_messages tm
LEFT JOIN terminal_sessions ts ON ts.terminal_id = tm.session_id
LEFT JOIN terminal_bindings tb ON tb.terminal_id = tm.session_id
WHERE tm.role = 'user'
ORDER BY tm.created_at DESC LIMIT ?
```
Returns ALL user-role messages. No filtering, no cleanup of stale records.

### Query Handler: `get-prompt-status`** (line ~9920)
Returns all terminal_messages with role='user'. Used by PromptHistoryTab for live status.

### Frontend (TerminalWindow.tsx)
```typescript
// onData handler — fires for EVERY keystroke
terminal.onData((data) => {
    if (isReady) {
        window.deskflowAPI?.terminalWrite?.(terminalId, data); // → terminal:write-old-format
    } else {
        // buffer until ready
    }
});
```

### Frontend (TerminalPage.tsx)
```typescript
// System init writes (launch command, system prompt, init content)
await window.deskflowAPI?.terminalWriteRaw?.(terminalId, launchCommand);
await window.deskflowAPI?.terminalWriteRaw?.(terminalId, mergedPrompt + '\n');
```
System init uses terminalWriteRaw (no DB). Keystrokes use terminalWrite (records to DB).

### Database Schema (main.ts line ~1729)
```sql
CREATE TABLE IF NOT EXISTS terminal_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    role TEXT DEFAULT 'user',
    content TEXT,
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Completion Marking (main.ts line ~5629)
```typescript
function markTaskCompleted(terminalId: string) {
    db.prepare(`UPDATE terminal_messages SET status = 'completed' WHERE session_id = ? AND status = 'in_progress'`).run(terminalId);
}
```
This marks ALL in_progress as completed for a terminal — but it fires on terminal exit/completion, not per-message.

### Frontend Component: PromptHistoryTab.tsx
- Loads entries via `getPromptHistory({ projectId, limit: 200 })`
- Loads live statuses via `getPromptStatus()`
- Displays status badges with colors: `in_progress` = cyan "Processing"
- Subscribes to `onAiTaskUpdated` IPC for live updates
- Grouped by session_id, shows topic, agent, timestamp

## The Problem — Root Cause Analysis

1. **Every keystroke creates a DB record** — `terminal:write-old-format` fires for each char typed in xterm. Single characters like "a", "b", Enter, backspace all get inserted as separate `role='user'` entries with `status='in_progress'`.

2. **These never complete** — `markTaskCompleted()` fires when the terminal session ends, not per-message. If the terminal stays open for hours, those entries stay `in_progress` forever.

3. **No distinction between keystrokes and real prompts** — The InstructionPanel sends a full constructed prompt (hundreds of chars) via `queueOrSend` → `terminalWrite`. Individual keystrokes ALSO go through `terminalWrite`. Both are treated identically by the DB.

4. **Prompt history UI is unusable** — Shows 50+ entries, most are single chars stuck as "Processing" from hours ago. Real prompts are buried.

5. **The auto-settle fix is a band-aid** — Adding `UPDATE ... WHERE created_at < now - 15min` in the query handler is reactive, not proactive. It doesn't stop the problem at the source.

## What Needs to Happen — Design the Complete Solution

You are the Lead Designer and Engineer. Design a comprehensive solution that:

### Data Processing Pipeline

1. **Distinguish keystrokes from real prompts** — Design a mechanism where only actual user-intent messages are recorded in terminal_messages. Individual keystrokes should NOT create DB records.

2. **Proper completion tracking** — When AI finishes responding to a real prompt, that specific message (not all in_progress messages) should be marked completed. The current approach marks ALL in_progress for a terminal, which is wrong.

3. **Message ID tracking** — Each recorded prompt needs a unique ID that the AI completion can reference, so only that specific message is marked completed.

4. **Stale record handling** — Design a cleanup mechanism (background task, query-time filter, or periodic job) that handles orphaned in_progress records.

### Visual Specifications

5. **PromptHistoryTab filtering** — The UI should NOT show entries shorter than N characters (keystroke noise). It should only show entries that are actual prompts (reasonable length).

6. **Status accuracy** — A prompt should only show "Processing" when an AI is actually working on it, not when it's been stuck for hours.

7. **Empty state** — When user has never sent a prompt, show a clear "No prompts sent yet" — not a loading spinner or fake entries.

### Interaction Flow

8. **Send flow** — When user sends a prompt via InstructionPanel, it should:
   - Be recorded as in_progress
   - Show Processing badge
   - Get marked completed when AI responds

9. **Keystroke flow** — When user types in terminal:
   - Should work normally (no latency, no newlines)
   - Should NOT create any prompt history entries

10. **Terminal exit flow** — When terminal exits, only real prompts should be marked completed, not keystroke records.

## Constraints

- **Must use existing SQLite database** — `terminal_messages` table, no schema changes if possible
- **Must work with existing IPC infrastructure** — `onAiTaskUpdated`, `getPromptHistory`, `getPromptStatus`
- **Must NOT break terminal typing behavior** — individual keystrokes must flow to PTY normally, no lag, no extra newlines
- **Must work with both `terminalWrite` (preload line 205 → `terminal:write-old-format`) and the new `terminalWriteRaw` approach
- **PromptHistoryTab.tsx is the UI — design the fix at the data layer, not by hacking the UI
- **The `pendingCompletions` Set mechanism in main.ts must be preserved or properly replaced

## Files to Modify

- `src/main.ts` — IPC handlers for terminal write, prompt history query, completion marking
- `src/preload.ts` — IPC bridges (may need new bridge)
- `src/components/TerminalWindow.tsx` — Keystroke handler (onData)
- `src/pages/TerminalPage.tsx` — System init writes, send flow
- `src/components/PromptHistoryTab.tsx` — May need filtering logic
