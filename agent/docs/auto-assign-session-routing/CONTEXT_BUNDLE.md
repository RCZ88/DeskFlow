# CONTEXT_BUNDLE: Auto-Assign Session Routing

## Project Overview
Desktop Electron app (React + TypeScript + Tailwind v4) with AI agent terminal workspace ("Tracker Mind"). Users create AI agent sessions in terminals. Currently sessions are manually assigned to terminals. This feature adds **auto-assignment based on prompt content** using AI-generated session summaries.

## Key Files

### 1. SessionConfig Interface + Session Creation
**File:** `src/components/NewSessionDialog.tsx:16-70`
```typescript
export interface SessionConfig {
  id: string;
  name: string;
  agentType: string;
  terminalMode: 'create' | 'select';
  selectedTerminal: string;   // empty string = no terminal assigned
  resumeId?: string;
  initializeFile?: string;
  customSystemPrompt?: string;
  includeDefaultInit: boolean;
  initContent?: string;
  problemIds?: string[];
  requestIds?: string[];
  modelTier?: 'top' | 'mid' | 'low';
  contextConfig?: {
    total_token_budget: number;
    model_tier: 'top' | 'mid' | 'low';
    systems: { /* 6 system toggles */ };
    summarization: { enabled: boolean; message_threshold: number };
    deep_memory: { enabled: boolean; pattern_detection: boolean };
  };
}
```

### 2. Session Creation in TerminalPage (onCreate handler)
**File:** `src/pages/TerminalPage.tsx:2293-2365`

Flow:
- User clicks "New Session" → NewSessionDialog opens
- User picks: agent type (claude/openai/gemini), session name, terminal mode (create new / use existing)
- On submit (`onCreate`):
  1. Resolves init content (INITIALIZE.md, custom init file, problem/request context)
  2. If `terminalMode === 'select' && selectedTerminal`: writes init content + system prompt to that terminal
  3. If `terminalMode === 'create'`: spawns new terminal, initializes it
  4. Saves session via `saveTerminalSession({ id, projectId, agent, terminalId, topic, workingDirectory })`
  5. On success: saves session config, reloads session list, shows info toast

Key code (line 2326-2365):
```typescript
let targetTerminalId = '';
if (config.terminalMode === 'select' && config.selectedTerminal) {
  targetTerminalId = config.selectedTerminal;
  setActiveTerminalId(targetTerminalId);
  if (initContent) {
    await window.deskflowAPI?.terminalWrite?.(targetTerminalId, initContent + '\n');
    await new Promise(r => setTimeout(r, 500));
  }
  if (systemPrompt) {
    await window.deskflowAPI?.terminalWrite?.(targetTerminalId, systemPrompt + '\n');
    await new Promise(r => setTimeout(r, 500));
  }
} else {
  targetTerminalId = `term-${Date.now()}`;
  // ... spawn new terminal tab, initializeTerminal()
}

const sessionResult = await window.deskflowAPI?.saveTerminalSession?.({
  id: config.id, projectId: selectedProject, agent,
  terminalId: targetTerminalId, topic: sessionName,
  workingDirectory: proj?.path || '',
});
```

### 3. Terminal Session Storage (IPC + DB)
**File:** `src/main.ts:6452-6493`

`save-terminal-session` IPC handler:
- Table: `terminal_sessions`
- Columns: id, project_id, agent, resume_id, topic, working_directory, terminal_id, total_tokens, total_cost, category, status, product_area, description, auto_tags, category_confirmed, created_at, updated_at
- UPSERT pattern: INSERT if new, UPDATE if existing (matched by id)
- Session object shape: `{ id, projectId, agent, terminalId, topic, workingDirectory, totalTokens, totalCost, category, status, productArea, description, autoTags, categoryConfirmed, resumeId }`

### 4. Session List Display (Sidebar Sessions Tab)
**File:** `src/pages/TerminalPage.tsx:1783-1902`

The Sessions tab shows:
- "New Session" button + "Save Layout" / "Load Layout" buttons
- Category filter pills (All, Bug Fix, Feature, Refactor, Research, Review, Other)
- Session list items (line ~1903): topic, agent badge, status dot, date, category chip, click to detail

Session detail view (line 1794-1861) shows:
- Header: StatusDot + topic + agent badge
- Grid: status, category, date, terminal, cost, tokens, resume_id, description, product_area
- "Focus Terminal" or "Open in Terminal" button
- Messages section (load/refresh)

Session type from DB query:
```typescript
// Fields available on each session object:
id: string
project_id: string | null
agent: string
resume_id: string | null
topic: string | null
working_directory: string | null
terminal_id: string | null
total_tokens: number
total_cost: number
category: string
status: string
product_area: string | null
description: string | null
auto_tags: string | null (JSON array)
category_confirmed: number (boolean)
created_at: string
updated_at: string
```

### 5. Existing Summarize Infrastructure
**File:** `src/main.ts:7311-7360` (`summarize-session` handler)

Already implemented: reads all messages for a session from `terminal_messages` table, returns:
```typescript
{
  sessionId, agent, topic,
  totalMessages, userCount, assistantCount,
  totalChars, durationSeconds,
  firstMessageAt, lastMessageAt,
  truncated: messages.slice(-10).map(m => ({ role, preview: content.substring(0, 200) })),
  summarizedAt: ISO string
}
```
Also persists to `agent/context/session-summaries.json` (keeps last 50).

**Preload bridge:** `src/preload.ts:290`
```typescript
summarizeSession: (sessionId: string, projectPath?: string) => ipcRenderer.invoke('summarize-session', sessionId, projectPath),
```

### 6. LLM Summarization Endpoint
**File:** `src/main.ts:8292-8344` (`summarize-with-llm` handler)

Calls OpenRouter API with system prompt:
```typescript
content: `You are a technical session summarizer for a developer tool. Produce concise, structured markdown summaries of development sessions. Focus on:
- Key decisions made
- Changes implemented
- Problems encountered and their resolution status
- Outstanding items or next steps

Use headers (##) and bullet points. Be factual and precise. Do not fabricate information.`
```
Config: model = OPENROUTER_MODELS[0], max_tokens = 800, temperature = 0.3

**Preload bridge:** `src/preload.ts:156-157`
```typescript
summarizeWithLLM: (prompt: string, options?: { maxTokens?: number; model?: string }) =>
  ipcRenderer.invoke('summarize-with-llm', prompt, options),
```

### 7. Terminal Write IPC
**File:** `src/main.ts:6343-6441`

Three handlers:
- `terminal:write-raw` (line 6343): writes to PTY stdin without DB record
- `terminal:write` (line 6412): writes to PTY stdin + creates `terminal_messages` record (role='user', status='in_progress')
- `terminal:write-old-format` (line 6391): legacy path, same as write but different format

**Preload bridges** (`src/preload.ts`):
```typescript
terminalWrite: (terminalId: string, data: string) => ipcRenderer.invoke('terminal:write', terminalId, data),
terminalWriteRaw: (terminalId: string, data: string) => ipcRenderer.invoke('terminal:write-raw', terminalId, data),
```

### 8. AI Metadata Parsing
**File:** `src/main.ts` — Functions: `parseSessionMetadata` and `parseAndExecuteActions`

- `parseSessionMetadata` — parses `## Session Metadata\n- Title: ...\n- Description: ...\n- Status: active|paused|completed\n- Product Area: ...\n- Category: bug-fix|feature|refactor|research|review` from AI output
- `parseAndExecuteActions` — parses `## Actions\n- [create-problem] ...` blocks and executes them
- Both called from `detectAgentPrompt` which processes each terminal output chunk
- Parsed metadata updates session via `saveTerminalSession` with fields: topic, description, status, category, product_area, auto_tags

### 9. @mention Routing in Instruction Input
**File:** `src/pages/TerminalPage.tsx:1449-1473`

The instruction input bar already has `@term` mention routing:
- Typing `@` opens dropdown of terminals with name, agent, session topic
- Selecting routes the instruction to that terminal
- This is the current manual routing — the auto-assign feature would use AI to auto-decide

### 10. Configs Tab Current Content
**File:** `src/pages/TerminalPage.tsx:2281-2360`

Currently shows:
- **Rules Re-injection** — slider (3-30), "Auto-inject RULES_COMPACT.md every N messages"
- **Default Model Tier** — top/mid/low buttons, "Context budget for new sessions"
- **Debug Mode** — toggle for verbose [SYSTEM] logging

This is where auto-assign toggle + cost display would go.

### 11. Preload Bridges (Full List of Relevant Ones)
**File:** `src/preload.ts`

```typescript
// Session management
saveTerminalSession: (session) => ipcRenderer.invoke('save-terminal-session', session),
getTerminalSessions: (projectId?, limit?) => ipcRenderer.invoke('get-terminal-sessions', projectId, limit),
getSessionMessages: (sessionId, agent?) => ipcRenderer.invoke('get-session-messages', sessionId, agent),
saveSessionConfig: (id, config, projectPath?) => ipcRenderer.invoke('save-session-config', id, config, projectPath),

// Summarization
summarizeSession: (sessionId, projectPath?) => ipcRenderer.invoke('summarize-session', sessionId, projectPath),
summarizeWithLLM: (prompt, options?) => ipcRenderer.invoke('summarize-with-llm', prompt, options),

// Terminal
terminalWrite: (terminalId, data) => ipcRenderer.invoke('terminal:write', terminalId, data),
terminalWriteRaw: (terminalId, data) => ipcRenderer.invoke('terminal:write-raw', terminalId, data),

// Model improvement stats (existing runtime counters)
getModelImprovementStats: (opts?) => ipcRenderer.invoke('get-model-improvement-stats', opts),
```

### 12. Window.deskflowAPI Interface
**File:** `src/App.tsx` — The full interface declaration for the preload bridge types.

## Design Tokens
- **Background**: zinc-900 (sidebar), zinc-800 (cards), zinc-900/80 (inputs)
- **Accent**: emerald-400/500 (success), cyan-500/600 (info/actions), orange-500 (configs tab)
- **Text**: white (headings), zinc-300 (body), zinc-500 (labels), zinc-600 (hints)
- **Border**: zinc-700 (default), zinc-700/50 (subtle)
- **Rounded**: rounded-lg (cards), rounded (buttons/inputs)
- **Font**: Inter (UI), JetBrains Mono (code)
- **Animations**: fast transitions (150-200ms), active:scale-95 on buttons

## IPC Data Flow
```
Renderer (React)                    Main Process (Electron)
     │                                      │
     │  invoke('summarize-session')          │
     │─────────────────────────────────────> │  reads terminal_messages
     │  { success, data }                    │  returns stats + truncated messages
     │<───────────────────────────────────── │
     │                                      │
     │  invoke('summarize-with-llm')         │
     │─────────────────────────────────────> │  calls OpenRouter API
     │  { success, summary }                 │  returns AI-generated summary
     │<───────────────────────────────────── │
     │                                      │
     │  invoke('save-terminal-session')      │
     │─────────────────────────────────────> │  UPSERT into terminal_sessions
     │  { success, id }                      │
     │<───────────────────────────────────── │
     │                                      │
     │  invoke('terminal:write', id, data)   │
     │─────────────────────────────────────> │  writes to PTY stdin
     │                                      │  + INSERT into terminal_messages
```

## Current Manual Routing (Instruction Input)
The instruction input at the bottom of the sidebar has a `@term` mention system:
- Typing `@` shows a dropdown of all terminals with their session topics
- Selecting one routes the instruction there
- The instruction input is the main way users send prompts to terminals

## Existing Session Categories
```typescript
const SESSION_CATEGORIES: Record<string, { label: string; color: string }> = {
  'bug-fix': { label: 'Bug Fix', color: 'rose' },
  'feature': { label: 'Feature', color: 'blue' },
  'refactor': { label: 'Refactor', color: 'amber' },
  'research': { label: 'Research', color: 'purple' },
  'review': { label: 'Review', color: 'cyan' },
  'other': { label: 'Other', color: 'zinc' },
};
```

## Infrastructure Notes
- OpenRouter API key stored in `deskflow-prefs.json` under `openrouterApiKey`
- Models defined as `OPENROUTER_MODELS` array in main.ts
- The `summarize-with-llm` handler already has the API key check + error handling
- Token estimation: can count from `totalChars` field in summarize-session response (rough: 1 token ≈ 4 chars)
- Cost tracking would need model-specific pricing per-token (currently not tracked per-model)
