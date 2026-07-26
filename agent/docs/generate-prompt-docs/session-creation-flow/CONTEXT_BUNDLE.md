# CONTEXT_BUNDLE.md — Session Creation & Prompt Sending Flow

## Overview

There are **two code paths** for creating a new terminal session:

1. **Path A (main user flow):** `NewSessionDialog` → `onCreate` handler inline in `TerminalPage.tsx:3640`
2. **Path B (auto-route flow):** `handleCreateNewSession` at `TerminalPage.tsx:825`

---

## Interface: SessionConfig

**File:** `src/components/NewSessionDialog.tsx:16-55`

```typescript
export interface SessionConfig {
  id: string;
  name: string;
  agentType: string;
  terminalMode: 'create' | 'select';
  selectedTerminal: string;
  resumeId?: string;
  initializeFile?: string;
  customSystemPrompt?: string;
  includeDefaultInit: boolean;
  initContent?: string;           // <-- user's typed prompt goes here
  problemIds?: string[];
  requestIds?: string[];
  modelTier?: 'top' | 'mid' | 'low';
  contextConfig?: { ... };
}
```

---

## Path A: NewSessionDialog → onCreate (MAIN USER FLOW)

### Step 1 — Dialog handleCreate()

**File:** `src/components/NewSessionDialog.tsx:429-476`

```typescript
const handleCreate = async () => {
  const config: SessionConfig = {
    id: sessionId,
    name: sessionName,
    agentType,
    terminalMode,
    selectedTerminal,
    resumeId: resumeSession?.resume_id || resumeSessionId || undefined,
    initializeFile: customInitFile || undefined,
    customSystemPrompt: customSystemPrompt || undefined,
    initContent: generalAdditions || undefined,    // <-- was MISSING, FIXED
    includeDefaultInit: mode === 'create' ? includeDefaultInit : false,
    problemIds: [],
    requestIds: [],
  };
  // ... contextConfig for setup/new-agent modes
  onCreate(config);
  onClose();
};
```

### Step 2 — TerminalPage onCreate handler

**File:** `src/pages/TerminalPage.tsx:3640-3712`

```typescript
onCreate={async (config: SessionConfig) => {
  const proj = projects.find(p => p.id === selectedProject);
  const cwd = proj?.path || '';
  const agent = config.agentType;
  const sessionName = config.name.trim() || `Session ${sessions.length + 1}`;
  setShowNewSessionDialog(false);

  // Resolve init content from config
  let initContent = config.initContent || '';
  if (!config.resumeId && !config.initContent) {
    // Load from INITIALIZE.md, custom init file, problems, requests...
    if (config.includeDefaultInit) {
      const dflt = await window.deskflowAPI?.readProjectFile?.('INITIALIZE.md', cwd);
      if (dflt?.success && dflt.data) initContent = dflt.data;
    }
    if (config.initializeFile) {
      const cust = await window.deskflowAPI?.readInitFile?.(config.initializeFile, cwd);
      if (cust?.success && cust.data) {
        initContent = initContent ? `${initContent}\n\n${cust.data}` : cust.data;
      }
    }
    if (config.problemIds?.length) {
      initContent += `\n## Context: Problems\n${config.problemIds.map(...)}\n`;
    }
    if (config.requestIds?.length) {
      initContent += `\n## Context: Requests\n${config.requestIds.map(...)}\n`;
    }
  }

  if (config.terminalMode === 'select' && config.selectedTerminal) {
    // Write to EXISTING terminal
    targetTerminalId = config.selectedTerminal;
    if (initContent) {
      await window.deskflowAPI?.terminalWrite?.(targetTerminalId, initContent + '\n');
      await new Promise(r => setTimeout(r, 500));
    }
    if (systemPrompt) {
      await window.deskflowAPI?.terminalWrite?.(targetTerminalId, systemPrompt + '\n');
      await new Promise(r => setTimeout(r, 500));
    }
  } else {
    // Create NEW terminal
    targetTerminalId = `term-${Date.now()}`;
    setTerminalTabs(...);
    setActiveTerminalId(targetTerminalId);
    // layout insertion...
    saveLayout(updatedLayout);
    await initializeTerminal(targetTerminalId, agent, undefined, initContent, systemPrompt);
  }

  // ⚠️ BUG: immediately saves session — NO opencode session ID capture
  const sessionResult = await window.deskflowAPI?.saveTerminalSession?.({
    id: config.id,              // auto-generated session-{Date.now()}
    projectId: selectedProject,
    agent,
    terminalId: targetTerminalId,
    topic: sessionName,
    workingDirectory: proj?.path || '',
    // ❌ MISSING: resumeId (never set)
    // ❌ MISSING: description, autoNamed fields
  });
  if (sessionResult?.success) {
    await window.deskflowAPI?.saveSessionConfig?.(config.id, config, proj?.path);
    loadSessions();
  }
}}
```

---

## Path B: handleCreateNewSession (Auto-route/Disambiguation Flow)

**File:** `src/pages/TerminalPage.tsx:825-860`

```typescript
const handleCreateNewSession = useCallback(async (
  name: string, summary: string, prompt: string
) => {
  const proj = projects.find(p => p.id === selectedProject);
  const newTerminalId = `term-${Date.now()}-new`;
  const cwd = proj?.path || '';
  // Create terminal tab + layout
  setTerminalTabs(...);
  setActiveTerminalId(newTerminalId);
  const updatedLayout = insertIntoLayout(terminalLayout, newTerminalId);
  setTerminalLayout(updatedLayout);
  saveLayout(updatedLayout);
  // Spawn, register, init
  if (!window.deskflowAPI?.spawnTerminal) return null;
  await window.deskflowAPI.spawnTerminal(newTerminalId, { cwd });
  await registerTerminal(newTerminalId);
  await initializeTerminal(newTerminalId, 'claude', undefined, summary || undefined);
  // Write prompt
  if (prompt) {
    await window.deskflowAPI?.terminalWrite?.(newTerminalId, prompt + '\n');
  }
  // Wait for opencode to create session
  await new Promise(r => setTimeout(r, 2000));
  const opencodeId = await resolveOpencodeSessionId(cwd);
  const sessionId = opencodeId || `session-${Date.now()}`;
  // Save with resumeId
  await window.deskflowAPI?.saveTerminalSession?.({
    id: sessionId,
    projectId: selectedProject,
    agent: 'claude',
    terminalId: newTerminalId,
    topic: name,
    workingDirectory: cwd,
    description: summary,
    autoNamed: 1,
    resumeId: opencodeId || undefined,
  });
  loadSessions();
  return newTerminalId;
}, [projects, selectedProject, terminalLayout, loadSessions,
    registerTerminal, initializeTerminal, saveLayout, resolveOpencodeSessionId]);
```

---

## initializeTerminal Function

**File:** `src/pages/TerminalPage.tsx:442-525`

This function:
1. Waits for terminal ready signal (8s timeout)
2. Launches AI agent (`claude`, `opencode`, etc.) via `terminalWrite`
3. Waits 500ms for agent to init
4. Writes system prompt (from preferences or passed as arg)
5. Writes thought process instruction if enabled
6. **Writes `initContent` if provided** (line 506-508):
   ```typescript
   if (initContent) {
     await window.deskflowAPI?.terminalWrite?.(terminalId, initContent + '\n');
   } else {
     // falls back to INITIALIZE.md
   }
   ```
7. Returns (no session ID capture)

---

## resolveOpencodeSessionId

**File:** `src/pages/TerminalPage.tsx:630-649`

```typescript
const resolveOpencodeSessionId = async (cwd?: string): Promise<string | null> => {
  const result = await window.deskflowAPI?.executeCommand?.('opencode session list', cwd || undefined);
  if (result?.error) return null;
  const stdout = result?.stdout?.trim();
  if (!stdout) return null;
  const lines = stdout.split('\n').filter((l: string) => l.trim());
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const idMatch = line.match(/^([a-f0-9\-]{8,})/i);
    if (idMatch) return idMatch[1];
  }
  return null;
};
```

---

## Problems Summary

### Problem 1: Prompt not reaching terminal (FIXED)
`NewSessionDialog.handleCreate()` never set `initContent` on config. The user's "Session Additions" text (`generalAdditions` state var, line 251) was silently dropped. **Fixed** by adding `initContent: generalAdditions || undefined` to config.

### Problem 2: TDZ crash in handleCreateNewSession (FIXED)
Dep array referenced `spawnTerminal` defined at line 1257 (AFTER line 825), causing `ReferenceError`. **Fixed** by inlining raw `window.deskflowAPI.spawnTerminal` call and removing `spawnTerminal` from deps.

### Problem 3 (REMAINING): No opencode session ID capture in Path A
The `onCreate` handler at line 3698 saves the session with an auto-generated `session-{Date.now()}` ID and **never** sets `resumeId`. After writing `initContent` to the terminal (via `initializeTerminal` or direct `terminalWrite`), it should:
1. Wait for opencode to create its session (~2s)
2. Call `resolveOpencodeSessionId(cwd)` to get the real opencode session ID
3. Save the session with `resumeId` set to the real opencode ID
4. Also save `description` and `autoNamed` fields

### Problem 4 (REMAINING): saveTerminalSession payload incomplete in Path A
Missing fields compared to Path B: `description`, `autoNamed`, `resumeId`.

---

## State Variables Used

| Variable | Type | Source |
|----------|------|--------|
| `showNewSessionDialog` | `boolean` | `useState(false)` at line 180 |
| `terminalLayout` | `PaneNode` | Layout tree state |
| `terminalTabs` | `Record<string, {name, agent, modelTier}>` | Terminal tab registry |
| `projects` | `Project[]` | From project context |
| `selectedProject` | `string` | Current project ID |
| `sessions` | `any[]` | Session list from `loadSessions()` |
| `allProblems` | `Problem[]` | Loaded from `getProblems` |
| `allRequests` | `Request[]` | Loaded from `getRequests` |

## IPC Endpoints Used

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `spawnTerminal` | renderer→main | Create PTY process |
| `terminalWrite` | renderer→main | Write text to terminal |
| `registerTerminal` | renderer→main | Bind xterm listeners |
| `saveTerminalSession` | renderer→main | Persist session to DB |
| `saveSessionConfig` | renderer→main | Save dialog config to DB |
| `readProjectFile` | renderer→main | Read INITIALIZE.md from project |
| `readInitFile` | renderer→main | Read custom init file |
| `executeCommand` | renderer→main | Run shell command (for `opencode session list`) |
| `onTerminalReady` | main→renderer | Event: terminal PTY ready |

## Call Sites

- `handleCreateNewSession` called from:
  - Line 898: auto-assign routing `result.action === 'create_new'`
  - Line 987: disambiguation dialog "Create New" button
- `onCreate` (Path A) called from:
  - Line 3640: NewSessionDialog's onCreate prop — triggered by dialog's create button
