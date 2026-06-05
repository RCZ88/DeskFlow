# CONTEXT_BUNDLE.md — Sidebar Session Bugs

## Bug 1: "Invisible Button" — Session GlassCard opens wrong detail panel

### Location
`src/pages/TerminalPage.tsx` around line 2786

### Problem
Each session card `<GlassCard>` had an `onClick={() => setSelectedSessionDetail(session.id)}` which opened `SessionDetailsPanel` — a different detail view than the explicit "Details" button (which opens `SessionEditDialog`). The user expected clicking the card to do nothing (only the visible buttons), but instead it opened a mystery panel that was different from the proper edit dialog.

### The Card Rendering (line 2786-2799)
```tsx
<GlassCard key={session.id}
  className="group p-3 hover:bg-zinc-700/50 transition-colors"
  onContextMenu={(e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, session });
  }}
  draggable
  onDragStart={(e) => {
    setDraggedSessionId(session.id);
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: session.id, agent: session.agent, topic: session.topic, resume_id: session.resume_id }));
    e.dataTransfer.effectAllowed = 'move';
  }}
  onDragEnd={() => setDraggedSessionId(null)}
>
```

### The "Details" button (line 2846-2852)
```tsx
<button
  onClick={() => setSessionToEdit(session)}
  title="View and edit session details"
  className="px-1.5 py-1 bg-zinc-700/50 hover:bg-zinc-600 text-zinc-300 text-[10px] font-medium rounded-md transition-colors duration-150 active:scale-95"
>
  Details
</button>
```

### The "Focus"/"Open" button (line 2853-2866)
```tsx
<button
  onClick={async () => {
    if (terminalInfo) {
      setActiveTerminalId(session.terminal_id!);
      window.dispatchEvent(new CustomEvent('focus-terminal', { detail: { terminalId: session.terminal_id } }));
    } else {
      handleResumeSession(session);
    }
  }}
>
  {terminalInfo ? 'Focus' : 'Open'}
</button>
```

### The problem state (line 233)
```ts
const [selectedSessionDetail, setSelectedSessionDetail] = useState<string | null>(null);
```

### The "Messages" button (line 2867-2874)
```tsx
<button
  onClick={async () => {
    const result = await window.deskflowAPI?.getSessionMessages?.(session.id, session.agent);
    if (result?.success) {
      setSessionMessages(result.data || []);
      setShowMessagesViewer(session.id);
    }
  }}
>
  Messages
</button>
```

### Fix Applied
Removed the `onClick={() => setSelectedSessionDetail(session.id)}` from `<GlassCard>`. The card no longer opens any panel on click. Only the explicit "Details", "Focus/Open", and "Messages" buttons are interactive.

---

## Bug 2: Drag-Drop Not Working

### Location
`src/pages/TerminalPage.tsx` lines 2792-2798, context menu lines 4000-4032

### Problem
The same `onClick` that caused Bug 1 also interfered with HTML5 native drag-and-drop. When the user clicked on a session card to start dragging, the `onClick` fired first (opening the detail panel), and the `draggable` behavior never completed because click-to-drag requires the mousedown to not trigger a full click event.

### The drag state (line ~282)
```ts
const [contextMenu, setContextMenu] = useState<{ x: number; y: number; session: Session } | null>(null);
const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
```

### The context menu (lines 4001-4032)
```tsx
{contextMenu && (
  <>
    <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
    <div className="fixed z-50 bg-zinc-900 border border-zinc-700/50 rounded-lg shadow-2xl py-1 min-w-[180px]"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      <div className="px-2.5 py-1.5 text-[10px] text-zinc-500 border-b border-zinc-800/50">Open in Terminal</div>
      {Object.entries(terminalTabs).map(([tid, tab]) => {
        const hasSession = sessions.some(s => s.terminal_id === tid);
        return (
          <button key={tid} onClick={() => {
            handleOpenSessionInTerminal(contextMenu.session, tid);
            setContextMenu(null);
          }}>
            <span className={`w-1.5 h-1.5 rounded-full ${hasSession ? 'bg-amber-400' : 'bg-green-400'}`} />
            {tab.name}
            {hasSession && <span className="text-[9px] text-amber-400">occupied</span>}
          </button>
        );
      })}
    </div>
  </>
)}
```

### Fix Applied
Same fix as Bug 1 — removing the `onClick` from GlassCard allowed native drag-start to fire without interference.

---

## Bug 3: New Session Creation Broken

### Location
`src/pages/TerminalPage.tsx` — `handleCreateNewSession` at line 825

### Problem
The old `handleCreateNewSession` skipped the terminal initialization pipeline:

**Old code (broken):**
```ts
const handleCreateNewSession = useCallback(async (name, summary, prompt) => {
  const proj = projects.find(p => p.id === selectedProject);
  const newSessionId = `session-${Date.now()}`;
  const newTerminalId = `term-${Date.now()}`;
  if (window.deskflowAPI?.spawnTerminal) {
    await window.deskflowAPI.spawnTerminal(newTerminalId, { cwd: proj?.path || undefined });
  }
  await window.deskflowAPI?.saveTerminalSession?.({
    id: newSessionId, projectId: selectedProject, agent: 'claude',
    terminalId: newTerminalId, topic: name,
    workingDirectory: proj?.path || '', description: summary, autoNamed: 1,
  });
  if (prompt) {
    await window.deskflowAPI?.terminalWrite?.(newTerminalId, prompt + '\n');
  }
  loadSessions();
  return newTerminalId;
}, [projects, selectedProject, loadSessions]);
```

Missing steps:
1. No `setTerminalTabs()` — no tab registered in the UI
2. No `setActiveTerminalId()` — no active terminal set
3. No `insertIntoLayout()` — no layout update
4. No `saveLayout()` — layout not persisted
5. No `registerTerminal()` — terminal not registered with event system
6. No `initializeTerminal()` — opencode was never started / system prompt never sent
7. Writing prompt to terminal before opencode was initialized
8. No `resolveOpencodeSessionId()` call after writing prompt — the real opencode session ID was never captured and saved as `resumeId`

### The working reference: `handleResumeSession` (lines 1515-1572)
```ts
// Sets terminalTabs, activeTerminalId, updates layout, spawns, registers, initializes, then resumes
setTerminalTabs(prev => ({ ...prev, [resolvedTerminalId]: { name, agent, modelTier } }));
setActiveTerminalId(resolvedTerminalId);
const updatedLayout = insertIntoLayout(terminalLayout, resolvedTerminalId);
setTerminalLayout(updatedLayout);
saveLayout(updatedLayout);
const spawned = await spawnTerminal(resolvedTerminalId, cwd);
if (!spawned) return;
await registerTerminal(resolvedTerminalId);
await initializeTerminal(resolvedTerminalId, agent, resumeId, initContent, systemPrompt);
```

### Terminal pipeline functions

**`spawnTerminal` (line 1257)** — creates pty process, returns boolean
```ts
const spawnTerminal = useCallback(async (terminalId: string, cwd?: string) => { ... });
```

**`registerTerminal` (line 600)** — registers terminal with xterm.js and event system
```ts
const registerTerminal = useCallback(async (terminalId: string) => { ... });
```

**`initializeTerminal` (line 442)** — starts opencode CLI in the terminal
```ts
const initializeTerminal = useCallback(async (terminalId: string, agent: string, resumeId?: string, initContent?: string, systemPrompt?: string) => { ... });
```

**`insertIntoLayout`** — imported from `TerminalWindow`, adds a terminal pane to the layout tree

**`saveLayout` (line 430)** — persists layout to preference storage
```ts
const saveLayout = useCallback((layout: PaneNode | null) => { ... });
```

### Fix Applied

**New code:**
```ts
const handleCreateNewSession = useCallback(async (name, summary, prompt) => {
  ...
  await registerTerminal(newTerminalId);
  await initializeTerminal(newTerminalId, 'claude', undefined, summary || undefined);
  // Write prompt first so opencode processes it and creates a session
  if (prompt) {
    await window.deskflowAPI?.terminalWrite?.(newTerminalId, prompt + '\n');
  }
  // Wait for opencode to create its session, then capture the real ID
  await new Promise(r => setTimeout(r, 2000));
  const opencodeId = await resolveOpencodeSessionId(cwd);
  const sessionId = opencodeId || `session-${Date.now()}`;
  const savePayload = { id: sessionId, ..., resumeId: opencodeId };
  await window.deskflowAPI?.saveTerminalSession?.(savePayload);
  loadSessions();
  return newTerminalId;
}, [...deps, resolveOpencodeSessionId]);
```

### IPC Channels Used (all confirmed real in preload.ts + main.ts)
| Channel | preload.ts | main.ts | Status |
|---------|-----------|---------|--------|
| `spawnTerminal` | ✅ | ✅ pty spawn | Real |
| `saveTerminalSession` | ✅ | ✅ SQLite insert | Real |
| `terminalWrite` | ✅ | ✅ pty write | Real |
| `registerTerminal` | ✅ | ✅ event registration | Real |
| `initializeTerminal` | ✅ | ✅ CLI spawn + system prompt | Real |

---

## Architecture Notes

### Data Flow for Session Creation
```
User clicks "New Session" → NewSessionDialog → handleCreateNewSession()
  → setTerminalTabs() [create tab UI]
  → setActiveTerminalId() [switch to tab]
  → insertIntoLayout() [add pane to terminal layout]
  → saveLayout() [persist layout]
  → spawnTerminal() [create PTY process]
  → registerTerminal() [connect xterm.js + events]
  → initializeTerminal() [start opencode + send system prompt]
  → terminalWrite() [send user's initial prompt — opencode processes and creates a session]
  → setTimeout(2000) [brief wait for opencode to finish session creation]
  → resolveOpencodeSessionId() [run `opencode session list`, parse real session ID]
  → saveTerminalSession() [persist session to DB with real opencode ID as resumeId]
  → loadSessions() [refresh session list]
```

### Data Flow for Session Drag-Drop
```
mousedown on GlassCard → HTML5 dragstart fires
  → setDraggedSessionId(session.id)
  → e.dataTransfer.setData('text/plain', JSON.stringify(session data))
→ dragover on terminal pane → highlights target
→ drop → handleOpenSessionInTerminal(session, terminalId)
  → if terminal has existing session → confirmation dialog
  → spawn + register + initialize for target terminal
```

### Data Flow for Session Context Menu
```
right-click on GlassCard → onContextMenu fires
  → e.preventDefault() [suppress native menu]
  → setContextMenu({ x, y, session })
→ backdrop overlay click → setContextMenu(null) [dismiss]
→ terminal picker button click → handleOpenSessionInTerminal()
```

### Design Tokens (TerminalPage sidebar)
- Tab accent colors: Sessions tab = green-600, Files tab = yellow-600, Maintenance = violet-600
- GlassCard: rounded-xl, bg-zinc-900/40, border-zinc-800/50, backdrop-blur-sm
- Buttons: bg-zinc-700/50 secondary, bg-green-600/60 primary, bg-rose-600/50 destructive
- Text scale: 10px badges, 11px meta, 12px body
