# Bundle B — Session System

> **Implementation order:** SECOND — after Bundle A (Core Flows)
> **Steps:** 9-14 (Fixes 6, 2.5, 2.6, 2.7, 2.8, 2.9)
> **Dependencies:** Bundle A (depends on new unified context assembly + onSend)
> **Build verification:** `npm run build` must pass after each step

## Required Context

This bundle targets `src/pages/TerminalPage.tsx`, `src/components/NewSessionDialog.tsx`, `src/main.ts`.

Read `CONTEXT_BUNDLE.md` for full architectural context. Key points:

- **`TerminalPage.tsx`** ~5000 lines — all session management, terminal creation, `loadSessions()`, `handleCreateSession`
- **`NewSessionDialog.tsx`** — the dialog with `mode` prop, 6 toggle cards, agent selector
- **`main.ts`** — `tracker-mind-setup` IPC handler (~line 9895), `get-terminal-sessions` handler
- **`generateTerminalId()`** — `\`term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}\``
- **`getDefaultAgent()`** — currently from `localStorage.getItem('terminal-defaultAgent') || 'claude'`
- **`AGENT_LAUNCH_COMMANDS`** — map of agent names to CLI commands

---

## Step 9 — Wire tracker-mind-setup into Setup Dialog

**Source:** This is already done in Bundle A Step 2 — the call `deskflowAPI.trackerMindSetup('init-all', undefined, agent)` should be the first thing in `handleCreateSession`. If it wasn't done in Bundle A for any reason, add it now.

**File:** `src/pages/TerminalPage.tsx` — `handleCreateSession`

```typescript
// First thing in handleCreateSession:
try {
  await deskflowAPI.trackerMindSetup('init-all', undefined, agent);
} catch (e) {
  console.warn('tracker-mind-setup failed (files may already exist):', e);
}
```
This ensures AGENTS.md, INITIALIZE.md, PROBLEMS.md exist before `assembleContext()` reads them. Idempotent — skips if files already exist.

**Build:** `npm run build`

---

## Step 10 — Init vs Setup Mode Distinction

**Source:** SECOND_RESULT.md Fix 2.5

**File:** `src/components/NewSessionDialog.tsx`

**Two modes:**

| Aspect | `'initialize'` (Quick Init) | `'setup'` (Full Setup) |
|--------|---------------------------|------------------------|
| Shows | Agent selector + Initialize button | Everything — toggles, editor, preview |
| Hides | All 6 toggle cards, file selectors, system prompt editor, prompt preview | N/A |
| Config | `DEFAULT_CONTEXT_CONFIG` | User-customized `contextConfig` |
| Button label | "Initialize" | "Create Session" |
| Dialog title | "Quick Initialize" | "Setup Agent Workspace" |

**Which button opens which mode:**
- Header "Setup" button → `mode='setup'`
- New "Quick Init" button → `mode='initialize'`
- "+" tab button → `mode='initialize'`
- Session list "Resume" → skips dialog entirely

```tsx
const isQuickMode = mode === 'initialize';
// Conditionally render toggle cards, file selectors, preview:
{!isQuickMode && (
  <ContextToggleCards config={contextConfig} onToggle={handleToggle} />
  <PromptPreviewButton onClick={buildPromptPreview} />
)}
```

**Wiring in TerminalPage.tsx:**
```typescript
<button onClick={() => setShowNewSessionDialog({ mode: 'setup' })}>Setup</button>
<button onClick={() => setShowNewSessionDialog({ mode: 'initialize' })}>Quick Init</button>
```

**Build:** `npm run build`

---

## Step 11 — Agent Selection Defaults Unification

**Source:** SECOND_RESULT.md Fix 2.6

**File:** `src/pages/TerminalPage.tsx`

Add a utility function at the top:
```typescript
function getDefaultAgent(): string {
  return localStorage.getItem('terminal-defaultAgent') || 'claude';
}
function setDefaultAgent(agent: string): void {
  localStorage.setItem('terminal-defaultAgent', agent);
}
```

Replace ALL hardcoded agent defaults:
- Header "Open Terminal" → `getDefaultAgent()` (was `localStorage.getItem(...) || 'claude'`)
- `initializeSession` → `getDefaultAgent()` (was `config.agentType || 'claude'`)
- NewSessionDialog mount → `useState(getDefaultAgent())`
- Agent change in dialog → `handleAgentChange` calls `setDefaultAgent(agent)`

**Build:** `npm run build`

---

## Step 12 — Agent Selection Dropdown Population

**Source:** SECOND_RESULT.md Fix 2.7

**File:** `src/components/NewSessionDialog.tsx`

Add a supported agents list:
```typescript
const SUPPORTED_AGENTS = [
  { id: 'claude', name: 'Claude Code', command: 'claude' },
  { id: 'opencode', name: 'OpenCode', command: 'opencode' },
  { id: 'aider', name: 'Aider', command: 'aider' },
  { id: 'codex', name: 'Codex CLI', command: 'codex' },
  { id: 'gemini', name: 'Gemini CLI', command: 'gemini' },
];
```

Replace any hardcoded `<select>` or empty dropdown with:
```tsx
<select value={selectedAgent} onChange={(e) => handleAgentChange(e.target.value)}
  className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-3 py-1.5 text-[11px] text-zinc-300">
  {SUPPORTED_AGENTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
</select>
```

Also use `SUPPORTED_AGENTS` in Settings page agent selector (same list, same source). If Settings page has no agent selector, skip — it's handled by the dialog now.

**Build:** `npm run build`

---

## Step 13 — Existing Session ID Input

**Source:** SECOND_RESULT.md Fix 2.8

**File:** `src/components/NewSessionDialog.tsx`

Add an optional "Resume Session ID" input field:
```tsx
<div className="mt-3">
  <label className="text-[10px] text-zinc-500">Resume Session ID (optional)</label>
  <input type="text" value={resumeSessionId}
    onChange={(e) => setResumeSessionId(e.target.value)}
    placeholder="Paste session ID to resume..."
    className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-3 py-1.5 
               text-[11px] text-zinc-300 placeholder:text-zinc-700 focus:border-cyan-500/50"
  />
  {resumeSessionId && (
    <button onClick={async () => {
      const sessions = await deskflowAPI.getTerminalSessions(undefined, 100);
      const session = sessions.find(
        (s: any) => s.id === resumeSessionId || s.id.startsWith(resumeSessionId)
      );
      if (session) { setSelectedAgent(session.agent || 'claude'); setResumeSession(session); }
      else { setError('Session not found'); }
    }} className="mt-1 text-[9px] text-cyan-400">Lookup session</button>
  )}
</div>
```

**In `handleCreateSession`:**
If `resumeSessionId && resumeSession`:
- Create terminal, dispatch `create-terminal`, queue resume command with `getAgentLaunchCommand(agent, resumeId)`
- Update the existing session's `terminal_id` and `status = 'active'`
- Do NOT create a new session

Otherwise: existing flow (create new session).

**Build:** `npm run build`

---

## Step 14 — Session List Audit

**Source:** SECOND_RESULT.md Fix 2.9

**Files:** `src/pages/TerminalPage.tsx`, `src/main.ts`

**In TerminalPage.tsx — `loadSessions()`:**
```typescript
const allSessions = await deskflowAPI.getTerminalSessions(selectedProjectId || undefined, 500);
setSessions(allSessions || []);  // No filtering — show everything
```

**In main.ts — `get-terminal-sessions` handler:**
Ensure the SQL query returns ALL sessions without date/session-type filters:
```typescript
db.prepare(`
  SELECT * FROM terminal_sessions
  ${projectId ? `WHERE project_id = '${projectId}'` : ''}
  ORDER BY updated_at DESC, created_at DESC
  ${limit ? `LIMIT ${limit}` : ''}
`).all();
```

**Build:** `npm run build`

---

## Build Verification

After ALL steps in this bundle:
```bash
npm run build
```
Must pass. Then proceed to Bundle C.
