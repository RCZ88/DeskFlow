# Bundle D — Terminal UX & Layout

> **Implementation order:** FOURTH — after Bundle C (IPC & Verification)
> **Steps:** 18-24 (Fixes 15, 4.5, 16, 17, 18, 19, 20, 21)
> **Dependencies:** Bundle A (needs unified context assembly), Bundle B (needs session fixes)
> **Build verification:** `npm run build` must pass after each step

## Required Context

This bundle targets `src/pages/TerminalPage.tsx`, `src/components/TerminalWindow.tsx`, `src/components/InstructionPanel.tsx`.

Read `CONTEXT_BUNDLE.md` for full architectural context. Key points:

- **`TerminalWindow.tsx`** — split-pane terminal renderer with `PaneNode` tree, xterm.js, drag-drop
- **`PaneNode` type:** `{ type: 'leaf', terminalId, ... } | { type: 'split', direction: 'vertical'|'horizontal', children: PaneNode[], sizes: number[] }`
- **Layout mutations:** `insertIntoLayout`, `splitPane`, `removePane`, `swapLeavesInTree`
- **`DEFAULT_SYSTEM_PROMPT`** — ~280 lines from `src/lib/defaults.ts`
- **`estimateTokens(text)`** — utility function for token counting (simple: `text.length / 4`)
- **`@term` routing** — quick-input bar parses `@term-xxx` prefix to route to specific terminal
- **Agent signatures:** `agent:ready` detected by regex match on terminal output

---

## Step 18 — Fix Prompt Preview

**Source:** RESULT.md Fix 15

**File:** `src/pages/TerminalPage.tsx`

The prompt preview should show the **complete merged prompt** with section labels and token counts:

```typescript
const [showPromptPreview, setShowPromptPreview] = useState(false);
const [mergedPromptPreview, setMergedPromptPreview] = useState('');

const buildPromptPreview = useCallback(async () => {
  const agent = getDefaultAgent();
  const prefs = await deskflowAPI.getPreferences();
  const projectPath = computedProjectPath;
  const projectId = projects.find(p => p.path === projectPath)?.id;

  const sections = [
    { label: 'DEFAULT_SYSTEM_PROMPT (always prepended)', content: DEFAULT_SYSTEM_PROMPT, tokens: estimateTokens(DEFAULT_SYSTEM_PROMPT) },
    { label: 'Project Additions', content: projectId ? (prefs.projectPrompts?.[projectId] || '(empty)') : '(no project)', tokens: 0 },
    { label: 'General Additions', content: prefs.systemPrompts?.[agent] || '(empty)', tokens: 0 },
  ];

  try {
    const contextContent = await assembleContext(projectPath, contextConfig);
    if (contextContent) sections.push({ label: 'Assembled Context (6 systems)', content: contextContent, tokens: estimateTokens(contextContent) });
  } catch (e) {
    sections.push({ label: 'Assembled Context', content: '(failed to assemble)', tokens: 0 });
  }

  const totalTokens = sections.reduce((sum, s) => sum + s.tokens, 0);
  setMergedPromptPreview(
    sections.map(s => `═══ ${s.label} [~${s.tokens} tokens] ═══\n${s.content}`).join('\n\n') +
    `\n\n═══ TOTAL: ~${totalTokens} tokens ═══`
  );
  setShowPromptPreview(true);
}, [computedProjectPath, projects, contextConfig]);
```

Wire to a "Preview" button in the Setup dialog and a "Review Prompt" button in the header toolbar. Display in a modal with monospace font, scrollable.

**Build:** `npm run build`

---

## Step 19 — Delta Context Messages (Always-Updating Context)

**Source:** SECOND_RESULT.md Fix 4.5

**Files:** `src/pages/TerminalPage.tsx`, `src/main.ts`

After Bundle A Step 3 added `context-changed` events, enhance the handler to write meaningful delta messages to the active terminal:

**In TerminalPage.tsx — the `onContextChanged` handler:**
```typescript
useEffect(() => {
  const cleanup = deskflowAPI.onContextChanged(async (data) => {
    // Refresh local data
    if (data.type === 'problems') await loadProblems();
    if (data.type === 'requests') await loadRequests();
    if (data.type === 'checklists') await loadChecklists();

    // Notify active terminal agent
    if (activeTerminalId && agentReadyRef.current.get(activeTerminalId)) {
      let deltaMessage = '';
      switch (data.type) {
        case 'problems':
          deltaMessage = data.entity
            ? `[SYSTEM: Problem #${data.entity.id} "${data.entity.title}" status changed to "${data.entity.status}"]`
            : `[SYSTEM: Problem list updated — ${data.action}]`;
          break;
        case 'requests':
          deltaMessage = data.entity
            ? `[SYSTEM: Request #${data.entity.id} "${data.entity.title}" status changed to "${data.entity.status}"]`
            : `[SYSTEM: Request list updated — ${data.action}]`;
          break;
        case 'checklists':
          deltaMessage = `[SYSTEM: Checklist updated — ${data.action}]`;
          break;
      }
      if (deltaMessage) deskflowAPI.terminalWriteRaw(activeTerminalId, deltaMessage + '\r');
    }
  });
  return cleanup;
}, [activeTerminalId]);
```

**In main.ts — enhance `context-changed` events to include entity data:**
```typescript
win.webContents.send('context-changed', {
  type: 'problems',
  action: 'created',
  entity: { id: newProblemId, title, status },
});
```

**Build:** `npm run build`

---

## Step 20 — Enlarge Compose Area

**Source:** RESULT.md Fix 16

**File:** `src/components/InstructionPanel.tsx`

Replace the cramped textarea with a larger, resizable one:
```tsx
<textarea
  value={instruction}
  onChange={(e) => setInstruction(e.target.value)}
  placeholder="Write your instruction here..."
  className="w-full min-h-[120px] max-h-[300px] bg-zinc-900/50 border border-zinc-700/50 
             rounded-lg p-3 text-[12px] text-zinc-300 resize-y
             placeholder:text-zinc-600 focus:border-cyan-500/50 focus:outline-none font-mono"
  rows={6}
/>
```

**Build:** `npm run build`

---

## Step 21 — Add Target Terminal Indicator

**Source:** RESULT.md Fix 17

**Files:** `src/components/InstructionPanel.tsx`, `src/pages/TerminalPage.tsx`

In the InstructionPanel header and quick-input bar:
```tsx
<div className="flex items-center gap-2 mb-2">
  <span className="text-[9px] text-zinc-600">Sending to:</span>
  <span className="text-[10px] text-cyan-400 font-medium">
    {activeTerminalId ? `Terminal ${activeTerminalId.slice(0, 6)}` : 'No terminal selected'}
  </span>
  {agentReadyRef.current.get(activeTerminalId) ? (
    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
  ) : (
    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Agent not ready — will queue" />
  )}
</div>
```

**Build:** `npm run build`

---

## Step 22 — Fix @term Routing

**Source:** RESULT.md Fix 18

**File:** `src/pages/TerminalPage.tsx`

Replace or fix the `@term` parsing in the quick-input bar:
```typescript
const parseAtMention = (input: string): { targetTerminalId: string | null; cleanPrompt: string } => {
  const match = input.match(/^@(\S+)\s*(.*)/s);
  if (!match) return { targetTerminalId: null, cleanPrompt: input };

  const termRef = match[1];
  const cleanPrompt = match[2];

  // Try exact terminal ID match
  if (terminalTabs[termRef]) return { targetTerminalId: termRef, cleanPrompt };

  // Try partial match
  const matchingTerminal = Object.keys(terminalTabs).find(
    id => id.startsWith(termRef) || id.includes(termRef) || terminalTabs[id].agent?.includes(termRef)
  );
  if (matchingTerminal) return { targetTerminalId: matchingTerminal, cleanPrompt };

  // No match — route to active terminal with original input
  return { targetTerminalId: null, cleanPrompt: input };
};
```

Wire this into the quick-input bar's `onSend` so `@term-xxx` prefixes redirect to the specified terminal.

**Build:** `npm run build`

---

## Step 23 — Fix Drag-Drop Layout Mutation

**Source:** RESULT.md Fix 19

**File:** `src/components/TerminalWindow.tsx`

The `onDragEnd` handler must actually mutate the layout tree (currently only shows visual feedback):
```typescript
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  setTerminalLayout(prev => {
    if (!prev) return prev;
    const newLayout = JSON.parse(JSON.stringify(prev));  // Deep clone
    return swapLeavesInTree(newLayout, String(active.id), String(over.id));
  });
};
```

**Build:** `npm run build`

---

## Step 24 — Fix Split Pane Height

**Source:** RESULT.md Fix 20

**File:** `src/components/TerminalWindow.tsx`

Ensure `min-h-0` and `flex-1` propagate correctly at all nesting levels:
```tsx
// Root container
<div className="flex-1 min-h-0 flex flex-col">
  <div className="flex-shrink-0">...</div>  {/* Tab bar */}
  <div className="flex-1 min-h-0">          {/* Terminal area */}
    <TerminalLayout layout={terminalLayout} ... />
  </div>
</div>

// Split pane container
<div className={`flex ${direction === 'horizontal' ? 'flex-row' : 'flex-col'} flex-1 min-h-0 min-w-0`}>
  {children.map((child, i) => (
    <div key={i} style={{ flex: sizes[i] || 1 }} className="min-h-0 min-w-0">
      {child}
    </div>
  ))}
</div>
```

---

## Step 25 — Add Resize Handles

**Source:** RESULT.md Fix 21

**File:** `src/components/TerminalWindow.tsx`

Add a `ResizeHandle` component between split panes:
```tsx
function ResizeHandle({ direction, onResize }: { direction: 'horizontal' | 'vertical'; onResize: (delta: number) => void }) {
  const startPos = useRef(0);
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    const handleMouseMove = (e: MouseEvent) => {
      const delta = (direction === 'horizontal' ? e.clientX : e.clientY) - startPos.current;
      startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
      onResize(delta);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', () => {
      window.removeEventListener('mousemove', handleMouseMove);
    }, { once: true });
  };

  return (
    <div onMouseDown={handleMouseDown}
      className={`${direction === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
                  bg-zinc-700/50 hover:bg-cyan-500/30 transition-all flex-shrink-0`} />
  );
}
```

**Build:** `npm run build`

---

## Build Verification

After ALL steps in this bundle:
```bash
npm run build
```
Must pass. Then proceed to Bundle E.
