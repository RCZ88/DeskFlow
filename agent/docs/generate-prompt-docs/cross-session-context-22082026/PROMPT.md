# Cross-Session Context Awareness — Auto-Injection

## Raw Request

"IMPLEMENT WHATS MISSING... IF U DONT KNOW HOW TO MAKE THE BEST VERSION GENERATE PROMPT... HOW IS THE CONTEXT AWARENESS OF THE OTHER SESSIONS... HAS IT BEEN IMPLEMENTED AND HOW DO I SET IT UP"

## Problem Statement

Sessions are blind to each other. `/sync` is manual. The agent doesn't know what other sessions are working on unless the human manually types `/sync`. There's no auto-injection, no real-time activity stream, no session message sharing. The context-changed events only notify about problems/requests — not file edits, terminal messages, or page navigation.

**What exists:**
- `/sync` command (manual, compiles terminal_bindings + touched_files + locks)
- `context-changed` events (notifications only for problems/requests)
- File conflict detection
- Touched files tracking (10s refresh)
- `crossSessionSyncEnabled` toggle (ON by default)

**What's missing:**
1. Auto-injection of other sessions' context at session start
2. Real-time activity stream of other sessions' work
3. Session message history sharing
4. Cross-session page context

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` in the same directory — VERBATIM source code for all affected files.

---

## Engineering Tasks

### Task A — Cross-Session Context Block in assemble-context

Extend the `assemble-context` IPC handler (main.ts:15399) to include a NEW block between Block 4 (page context) and Block 5 (user context profile):

```typescript
// [CROSS-SESSION] Inject other sessions' context
if (data.sessionId) {
  try {
    const otherBindings = db.prepare(`
      SELECT tb.terminal_id, tb.session_id, tb.active_problem_id, tb.session_context,
             ts.topic, ts.description, ts.agent, ts.status
      FROM terminal_bindings tb
      LEFT JOIN terminal_sessions ts ON ts.id = tb.session_id
      WHERE tb.terminal_id != ? AND tb.status != 'closed'
      ORDER BY ts.updated_at DESC LIMIT 5
    `).all(/* current terminalId */) as any[];

    if (otherBindings.length > 0) {
      const remainingBudget = maxChars - totalChars - 200;
      if (remainingBudget > 100) {
        const crossLines = ['## Other Active Sessions'];
        for (const b of otherBindings) {
          const topic = b.topic || 'Untitled';
          const desc = b.description ? b.description.slice(0, 100) : 'No summary';
          crossLines.push(`- **${topic}** (${b.agent || 'unknown'}) — ${desc}`);
          if (b.active_problem_id) {
            const prob = db.prepare('SELECT title FROM workspace_problems WHERE id = ?').get(b.active_problem_id) as any;
            if (prob) crossLines.push(`  Working on: ${prob.title}`);
          }
        }
        // Recent file changes by other sessions
        const otherFiles = db.prepare(`
          SELECT DISTINCT file_path, terminal_id, MAX(timestamp) as last_touched
          FROM touched_files WHERE terminal_id != ?
          GROUP BY file_path ORDER BY last_touched DESC LIMIT 5
        `).all(/* current terminalId */) as any[];
        if (otherFiles.length > 0) {
          crossLines.push('\n**Recent changes by other sessions:**');
          for (const f of otherFiles) {
            crossLines.push(`- ${f.file_path} (by ${f.terminal_id})`);
          }
        }
        const crossMd = crossLines.join('\n');
        if (totalChars + crossMd.length <= maxChars) {
          parts.push(crossMd);
          totalChars += crossMd.length;
        }
      }
    }
  } catch (e) {
    console.warn('[assemble-context] Cross-session injection failed (non-fatal):', e);
  }
}
```

**Problem:** The handler needs the current terminalId to filter "other" sessions, but the `assemble-context` IPC only receives `sessionId`, not `terminalId`. Fix: look up the terminalId from the sessionId via `terminal_bindings`:

```typescript
const currentBinding = db.prepare('SELECT terminal_id FROM terminal_bindings WHERE session_id = ?').get(data.sessionId) as any;
const currentTerminalId = currentBinding?.terminal_id || '';
```

### Task B — Real-Time Activity Stream via context-changed

Extend the `context-changed` event system to fire on MORE events:
- **File edits** — when `touched_files` gets a new entry, fire `context-changed` with `type: 'file_edit'`
- **Terminal messages** — when `save-terminal-message` saves a user message, fire `context-changed` with `type: 'terminal_message'`
- **Page navigation** — already done (from previous cycle)

In main.ts `save-terminal-message` handler, after saving:
```typescript
if (mainWindow && data.role === 'user') {
  mainWindow.webContents.send('context-changed', {
    type: 'terminal_message',
    action: 'broadcast',
    source: terminalId,  // look up from sessionId
    entity: { sessionId: data.sessionId, preview: data.content.slice(0, 100) },
  });
}
```

### Task C — Auto-Sync on Session Start

When a new session is created (TerminalPage `handleCreateSession`), automatically inject cross-session context into the init content:

```typescript
// After assemble-context call, before initializeTerminal:
if (selectedProject && sessionName.length > 1) {
  try {
    const syncResult = await (window.deskflowAPI as any).compileSyncSummary?.(targetTerminalId);
    if (syncResult?.success && syncResult.summary && syncResult.summary.length > 50) {
      initContent += `\n\n${syncResult.summary}`;
    }
  } catch (e) {
    console.warn('[NewSession] Cross-session sync failed (non-fatal):', e);
  }
}
```

### Task D — Activity Stream UI Component

Create `src/components/SessionActivityFeed.tsx` — a compact real-time feed showing what OTHER sessions are doing:

```tsx
interface ActivityEntry {
  type: 'file_edit' | 'terminal_message' | 'page_nav' | 'problem_created';
  sessionName: string;
  preview: string;
  timestamp: number;
}

// Shows last 10 activities from other sessions
// Uses onContextChanged listener
// Compact list with icons per type
// Auto-scrolls, max height 200px
```

Wire into TerminalPage sidebar (under the session list or in the Work > Files tab).

### Task E — Session Message History Sharing

Add a new IPC `get-recent-session-messages` that returns the last N messages from OTHER sessions:

```typescript
ipcMain.handle('get-recent-session-messages', async (_event, data: { excludeSessionId: string; limit?: number }) => {
  const messages = db.prepare(`
    SELECT tm.session_id, tm.role, tm.content, tm.created_at, ts.topic
    FROM terminal_messages tm
    JOIN terminal_sessions ts ON ts.id = tm.session_id
    WHERE tm.session_id != ? AND tm.role = 'user'
    ORDER BY tm.created_at DESC LIMIT ?
  `).all(data.excludeSessionId, data.limit || 20) as any[];
  
  return messages.map(m => ({
    session: m.topic || 'Untitled',
    role: m.role,
    content: m.content.slice(0, 200),
    timestamp: m.created_at,
  }));
});
```

Add preload bridge. Use in assemble-context or `/sync` to show what other sessions' users have been asking.

### Task F — Cross-Session Context Toggle in ContextSidebar

Extend the ContextSidebar "Pages" tab (just built) to include cross-session settings:
- Auto-inject on session start (toggle)
- Activity stream visibility (toggle)
- Message history depth (slider: 0-50 messages)

---

## Constraints

- No new npm dependencies
- All cross-session injection is BEST-EFFORT (never crashes)
- Token budget is hard-capped
- Cross-session context respects `crossSessionSyncEnabled` toggle
- No circular: compileSyncSummary must NOT trigger context-changed events
- File locks stay in-memory only (no DB writes for locks)
