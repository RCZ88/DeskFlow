# Bundle E — UI Polish & Context Sharpening

> **Implementation order:** FIFTH and last — after Bundle D (Terminal UX & Layout)
> **Steps:** 25-31 + 36-37 (Fixes 22, 23, 6.5, 6.6, 6.7, 6.8, 6.9, 24, 7.4)
> **Dependencies:** All previous bundles
> **Build verification:** `npm run build` must pass after each step

## Required Context

This bundle targets `src/pages/TerminalPage.tsx`, `src/components/ProblemDetailModal.tsx`, `src/components/RequestDetailModal.tsx`, `src/main.ts`, `src/preload.ts`.

Read `CONTEXT_BUNDLE.md` for full architectural context. Key points:

- **`TerminalPage.tsx`** — ProblemsTab section renders problem list, FilesTab renders file content
- **`ProblemDetailModal.tsx`** — modal for viewing/editing problem details, "Assign to Terminal" button
- **`STATUS_COLORS`** — color mapping for problem status badges: `{ 'open': red, 'in-progress': amber, 'resolved': emerald, 'closed': zinc }`
- **`PRIORITY_INDICATORS`** — `{ 'high': '🔴', 'medium': '🟡', 'low': '🟢' }`
- **`CategoryBadge`** — component or pattern for rendering category tags
- **Existing zinc theme** — `bg-zinc-800/90`, `border-zinc-700/50`, `text-zinc-300/400/500`, `cyan-500` accent

---

## Step 26 — Problem List Redesign

**Source:** RESULT.md Fix 22

**File:** `src/pages/TerminalPage.tsx` — ProblemsTab section

Replace the plain list with styled cards:
```tsx
const STATUS_COLORS: Record<string, string> = {
  'open': 'bg-red-500/15 text-red-400 border-red-500/20',
  'in-progress': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'resolved': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'closed': 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
};

function ProblemCard({ problem, onClick }: { problem: Problem; onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="px-3 py-2 border-b border-zinc-700/20 hover:bg-zinc-700/10 cursor-pointer transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-[10px]">{PRIORITY_INDICATORS[problem.priority || 'medium']}</span>
        <span className="text-[11px] text-zinc-300 truncate flex-1">{problem.title}</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[problem.status]}`}>
          {problem.status}
        </span>
      </div>
      {problem.category && (
        <div className="flex items-center gap-2 mt-1 ml-5">
          <CategoryBadge category={problem.category} />
          {problem.terminal_id && (
            <span className="text-[9px] text-zinc-600">Terminal {problem.terminal_id.slice(0, 6)}</span>
          )}
        </div>
      )}
    </div>
  );
}
```

Each card should be clickable → opens ProblemDetailModal.

**Build:** `npm run build`

---

## Step 27 — Rich File Display

**Source:** RESULT.md Fix 23

**File:** `src/pages/TerminalPage.tsx` — FilesTab section

For AI infrastructure files (`agent/*.md`, `graphify-out/*.md`), render markdown as styled HTML instead of raw text:

```typescript
function BasicMarkdownViewer({ content }: { content: string }) {
  const html = useMemo(() => {
    return content
      .replace(/^### (.+)$/gm, '<h3 class="text-[12px] text-zinc-300 font-medium mt-3 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-[13px] text-zinc-200 font-semibold mt-4 mb-1">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-[14px] text-cyan-400 font-bold mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-200">$1</strong>')
      .replace(/`(.+?)`/g, '<code class="bg-zinc-800 px-1 py-0.5 rounded text-[10px] text-cyan-400">$1</code>')
      .replace(/^- (.+)$/gm, '<li class="text-[11px] text-zinc-400 ml-3">$1</li>')
      .replace(/\n/g, '<br/>');
  }, [content]);

  return <div className="p-3 text-[11px] text-zinc-400" dangerouslySetInnerHTML={{ __html: html }} />;
}
```

If a file is in the `agent/` directory → use `BasicMarkdownViewer`. If it's a regular source code file → keep the current `pre`/`code` raw display.

**Build:** `npm run build`

---

## Step 28 — Fix Closing Session Blinking

**Source:** SECOND_RESULT.md Fix 6.5

**File:** `src/pages/TerminalPage.tsx`

The blink happens because `closeTerminal()` triggers multiple state updates causing cascade re-renders:

```typescript
// FIXED — batch all updates, compute new state before any setState:
const closeTerminal = useCallback((terminalId: string) => {
  const newTabs = { ...terminalTabs };
  delete newTabs[terminalId];
  const newLayout = terminalLayout ? removePane(terminalLayout, terminalId) : null;
  const remainingIds = Object.keys(newTabs);
  const newActiveId = activeTerminalId === terminalId ? (remainingIds[0] || null) : activeTerminalId;

  React.startTransition(() => {
    setTerminalTabs(newTabs);
    setTerminalLayout(newLayout);
    setActiveTerminalId(newActiveId);
  });

  // Non-urgent: async update session status
  deskflowAPI.saveTerminalSession({
    id: sessions.find(s => s.terminal_id === terminalId)?.id,
    status: 'completed',
  }).then(() => loadSessions());
}, [terminalTabs, terminalLayout, activeTerminalId, sessions]);
```

Also wrap terminal tab in `React.memo`:
```typescript
const TerminalTab = React.memo(({ terminalId, agent, isActive, onSelect, onClose }: ...) => {
  // ... rendering
}, (prev, next) => prev.terminalId === next.terminalId && prev.isActive === next.isActive);
```

**Build:** `npm run build`

---

## Step 29 — Add Product Area / Category as Visible Tags

**Source:** SECOND_RESULT.md Fix 6.6

**File:** `src/pages/TerminalPage.tsx` — session list rendering

Add tags to session cards:
```tsx
<div className="flex items-center gap-1 mt-1">
  {session.category && <CategoryBadge category={session.category} />}
  {session.product_area && (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/20">
      {session.product_area}
    </span>
  )}
</div>
```

Add filter pills in the session list header:
```tsx
<div className="flex gap-1 mb-2">
  {['all', 'bug-fix', 'feature', 'refactor', 'research', 'review'].map(cat => (
    <button key={cat}
      className={`text-[9px] px-1.5 py-0.5 rounded-full
        ${sessionFilter === cat ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-500'}`}
      onClick={() => setSessionFilter(cat)}>
      {cat === 'all' ? 'All' : cat}
    </button>
  ))}
</div>
```

**Build:** `npm run build`

---

## Step 30 — Add Problem-Request Linking UI

**Source:** SECOND_RESULT.md Fix 6.7

**File:** `src/components/ProblemDetailModal.tsx`

Add a "Related Requests" section:
```tsx
<div className="mt-3 border-t border-zinc-700/30 pt-2">
  <div className="text-[10px] text-zinc-500 mb-1">Related Requests</div>
  {linkedRequests.map(req => (
    <div key={req.id} className="flex items-center gap-2 text-[10px] py-0.5">
      <LinkIcon className="w-2.5 h-2.5 text-zinc-600" />
      <span className="text-zinc-400">{req.title}</span>
      <span className="text-zinc-600">#{req.id}</span>
      <button onClick={() => unlink(problem.id, req.id)} className="text-red-500/50 hover:text-red-400 ml-auto">
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  ))}
  <select onChange={(e) => { if (e.target.value) linkProblemToRequest(problem.id, e.target.value); e.target.value = ''; }}
    className="mt-1 bg-zinc-900/50 border border-zinc-700/50 rounded px-2 py-0.5 text-[9px] text-zinc-500 w-full">
    <option value="">Link a request...</option>
    {unlinkedRequests.map(req => <option key={req.id} value={req.id}>{req.title}</option>)}
  </select>
</div>
```

**Build:** `npm run build`

---

## Step 31 — Fix Problem/Request Modal Styling

**Source:** SECOND_RESULT.md Fix 6.8

**Files:** `src/components/ProblemDetailModal.tsx`, `src/components/RequestDetailModal.tsx`

Apply consistent zinc/dark theme styling:
```tsx
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
  <div className="bg-zinc-800 border border-zinc-700/50 rounded-xl w-[480px] max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
    {/* Header */}
    <div className="flex items-center justify-between p-4 border-b border-zinc-700/30">
      <h3 className="text-[13px] text-zinc-200 font-medium font-syne">Problem Details</h3>
      <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400"><X className="w-4 h-4" /></button>
    </div>
    {/* Content */}
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[problem.status]}`}>{problem.status}</span>
        <span className="text-[10px]">{PRIORITY_INDICATORS[problem.priority || 'medium']}</span>
        {problem.category && <CategoryBadge category={problem.category} />}
      </div>
      <div className="text-[12px] text-zinc-300">{problem.title}</div>
      {problem.description && <div className="text-[11px] text-zinc-400">{problem.description}</div>}
      {problem.root_cause && (
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2">
          <div className="text-[9px] text-amber-500/70">Root Cause</div>
          <div className="text-[10px] text-amber-400/80">{problem.root_cause}</div>
        </div>
      )}
      <div className="flex gap-2 pt-2 border-t border-zinc-700/30">
        <button className="flex-1 py-1.5 bg-cyan-500/15 text-cyan-400 text-[10px] rounded-lg hover:bg-cyan-500/25">Assign to Terminal</button>
        <button className="py-1.5 px-3 bg-zinc-700/30 text-zinc-400 text-[10px] rounded-lg hover:bg-zinc-700/50">Edit</button>
      </div>
    </div>
  </div>
</div>
```

**Build:** `npm run build`

---

## Step 32 — Remove Cross-Group Sidebar Drag

**Source:** SECOND_RESULT.md Fix 6.9

**File:** `src/pages/TerminalPage.tsx` — sidebar section headers

Remove any `draggable` attributes or `onDragStart`/`onDragOver` handlers from sidebar section headers. Keep only the expand/collapse click handler:

```typescript
// KEEP: expand/collapse click handler
<button onClick={() => toggleSection(sectionId)}>
  <ChevronRight className={expanded ? 'rotate-90' : ''} />
  {sectionTitle}
</button>

// REMOVE from sidebar headers:
// draggable={true} / onDragStart={...} / onDragOver={...}
```

**Build:** `npm run build`

---

## Step 33 — Context Sharpening / Deep Memory

**Source:** RESULT.md Fix 24

**Files:** `src/main.ts`, `src/preload.ts`

**In main.ts** — add a session summarization handler:
```typescript
ipcMain.handle('summarize-session', async (_event, sessionId: string) => {
  const db = getDatabase();
  if (!db) return null;

  const lastMsg = db.prepare(`SELECT content FROM terminal_messages WHERE session_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 1`).get(sessionId) as any;
  const firstMsg = db.prepare(`SELECT content FROM terminal_messages WHERE session_id = ? AND role = 'user' ORDER BY created_at ASC LIMIT 1`).get(sessionId) as any;

  const summary = `Started: ${(firstMsg?.content || '').slice(0, 80)}. Ended: ${(lastMsg?.content || '').slice(0, 80)}`;

  // Save to agent/context/session-summaries.json
  const projectPath = getProjectPath();
  const summariesPath = path.join(projectPath, 'agent', 'context', 'session-summaries.json');
  let summaries: any[] = [];
  try { summaries = JSON.parse(fs.readFileSync(summariesPath, 'utf-8')).summaries || []; } catch {}
  summaries.push({ id: sessionId, summary, endedAt: new Date().toISOString() });
  if (summaries.length > 50) summaries = summaries.slice(-50);
  fs.mkdirSync(path.dirname(summariesPath), { recursive: true });
  fs.writeFileSync(summariesPath, JSON.stringify({ summaries }, null, 2));
  return { summary };
});
```

**In preload.ts:**
```typescript
summarizeSession: (sessionId: string) => ipcRenderer.invoke('summarize-session', sessionId),
```

**Build:** `npm run build`

---

## Step 34 — Defer Smart Task Routing

**Source:** SECOND_RESULT.md Fix 7.4

**No code changes.** Add a TODO comment in `src/pages/TerminalPage.tsx`:
```typescript
// TODO: Smart task routing — classify user input (bug fix / feature / research)
// and auto-route to matching session or create new one.
// Requires: AI classification API call, session affinity scoring, auto-creation logic.
// Deferred to future implementation.
```

**Build:** `npm run build`

---

## Final Build Verification

After ALL steps in ALL bundles:
```bash
npm run build
```
Must pass without errors. Test the following manually:
1. Open Setup dialog → configure toggles → create session → terminal appears with system prompt + context
2. Open InstructionPanel → type → click Send → text appears in terminal
3. Click terminal → type → characters route to PTY
4. Problem list shows styled cards with badges
5. File viewer renders markdown as HTML
6. Split terminal → both panes visible with resize handles
7. Close terminal → no blinking
