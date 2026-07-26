# Context Bundle: Prompt Entry Fix

## Problem Statement

Three fundamental issues with how the DEFAULT_SYSTEM_PROMPT enters the instruction panel text box, gets sent, and how session UIDs are saved:

1. **Prompt not entering text box** — `DEFAULT_SYSTEM_PROMPT` (700+ line constant in `src/lib/defaults.ts`) is display-only. It appears in Settings page preview and NewSessionDialog preview, but NEVER gets written into the instruction panel textarea or sent to the terminal.

2. **Prompt not sending properly** — `InstructionPanel.generatePrompt()` builds from skill + problems + requests + checklists + agent files + custom instruction. No system prompt layer. The `handleInstructionPanelSend` in TerminalPage.tsx writes the prompt to terminal but the session record gets a generic topic like `"Instruction: 0p 0r"`.

3. **Session UID not saved with real opencode session ID** — Sessions are created with `session-${Date.now()}` generated in the renderer. Needs to call `opencode session list` CLI command to get the actual latest session ID instead.

---

## Relevant Files

### 1. `src/lib/defaults.ts` (lines 9-717)

```typescript
export const DEFAULT_SYSTEM_PROMPT = `# DeskFlow AI Agent Instructions
... (700+ lines)
`;
```

### 2. `src/components/NewSessionDialog.tsx` (lines 429-476, 863-903)

**handleCreate (line 429):**
```typescript
const handleCreate = async () => {
    const sessionId = `session-${Date.now()}`;  // ❌ Fake session ID
    const config: SessionConfig = {
        id: sessionId,
        name: sessionName,
        agentType,
        terminalMode,
        selectedTerminal,
        resumeId: resumeSession?.resume_id || resumeSessionId || undefined,
        initializeFile: customInitFile || undefined,
        customSystemPrompt: customSystemPrompt || undefined,  // Session additions textarea
        includeDefaultInit: mode === 'create' ? includeDefaultInit : false,
        problemIds: [],
        requestIds: [],
    };
    if (mode !== 'create') {
        config.contextConfig = { ... };  // Workspace context config
    }
    onCreate(config);
    onClose();
};
```

**Prompt preview (line 863):**
```typescript
const parts: { label: string; color: string; content: string }[] = [];
parts.push({ label: 'Default', color: 'text-cyan-400', content: DEFAULT_SYSTEM_PROMPT });
if (generalAdditions) parts.push({ label: 'General', color: 'text-blue-400', content: generalAdditions });
if (projectPrompt) parts.push({ label: 'Project', color: 'text-purple-400', content: projectPrompt });
if (customSystemPrompt) parts.push({ label: 'Session', color: 'text-amber-400', content: customSystemPrompt });
```

**Session Additions textarea (line 897):**
```typescript
<textarea
    value={customSystemPrompt}
    onChange={(e) => setCustomSystemPrompt(e.target.value)}
    placeholder="Extra instructions for this specific session..."
/>
```

### 3. `src/pages/TerminalPage.tsx` (lines 372-435, 527-587)

**initializeTerminal (line 372):**
```typescript
const initializeTerminal = useCallback(async (terminalId: string, agent: string, resumeId?: string, initContent?: string, systemPrompt?: string) => {
    // Wait for terminal ready signal
    // small pause
    // Write system prompt
    if (systemPrompt) {
        await window.deskflowAPI?.terminalWrite?.(terminalId, systemPrompt + '\n');  // From dialog customSystemPrompt
    } else {
        const prefs = await window.deskflowAPI?.getPreferences?.();
        const prompts = prefs?.systemPrompts || {};
        const prompt = prompts[agent] || prompts['claude'] || '';  // From Settings page
        if (prompt && window.deskflowAPI?.terminalWrite) {
            await window.deskflowAPI.terminalWrite(terminalId, prompt + '\n');
        }
    }
    // Write init content (INITIALIZE.md)
    // Launch agent command
});
```

**handleInstructionPanelSend (line 527):**
```typescript
const handleInstructionPanelSend = useCallback(async (config: { problems: string[]; requests: string[]; skill?: string; instruction: string; prompt: string }) => {
    // Resolve target terminal
    // /sync check
    const result = await window.deskflowAPI.terminalWrite(resolvedTargetId, config.prompt + '\n');
    // Save session with fake ID
    const session = sessions.find(s => s.terminal_id === resolvedTargetId || s.id === resolvedTargetId);
    await window.deskflowAPI.saveTerminalSession?.({
        id: session?.id || `session-${Date.now()}`,  // ❌ Fake session ID
        projectId: selectedProject,
        agent: session?.agent || 'claude',
        terminalId: resolvedTargetId,
        topic: `Instruction: ${config.problems.length}p ${config.requests.length}r${config.skill ? ` + ${config.skill}` : ''}`,  // ❌ Generic topic
        workingDirectory: proj?.path || '',
    });
    // Update terminal binding
});
```

### 4. `src/components/InstructionPanel.tsx` (lines 183-264, 517-524)

**generatePrompt (line 183):**
```typescript
const generatePrompt = (): string => {
    const parts: string[] = [];
    if (selectedSkill) { /* skill content */ }
    if (selectedProblems.length > 0) { /* problems */ }
    if (selectedRequests.length > 0) { /* requests */ }
    if (selectedProblems.length > 0 || selectedRequests.length > 0) { /* checklists */ }
    if (selectedAgentFiles.length > 0) { /* agent files */ }
    if (customInstruction.trim()) {
        parts.push(`## Instructions\n\n${customInstruction.trim()}`);
    }
    return parts.join('\n---\n\n');
};
```

**Send button (line 517):**
```typescript
<button onClick={() => onSend({
    problems: selectedProblems,
    requests: selectedRequests,
    skill: selectedSkill,
    instruction: customInstruction,
    prompt: generatePrompt()  // ❌ No system prompt layer
})}>
```

### 5. `src/main.ts` (lines 6613-6693)

**electron:execute-command handler (line 6613):**
```typescript
ipcMain.handle('electron:execute-command', async (_event, command: string, cwd?: string) => {
    const { exec } = require('child_process');
    return new Promise((resolve) => {
        exec(command, { cwd: cwd || undefined, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            resolve({ stdout, stderr, error: error ? error.message : null, code: error?.code || 0 });
        });
    });
});
```

**save-terminal-session handler (line 6652):**
```typescript
ipcMain.handle('save-terminal-session', async (_event, session: any) => {
    const id = session.id || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const resumeId = session.resumeId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    // INSERT or UPDATE in terminal_sessions table
    return { success: true, id, resumeId };
});
```

### 6. `src/preload.ts` (lines 295, 314)

```typescript
saveTerminalSession: (session: any) => ipcRenderer.invoke('save-terminal-session', session),
executeCommand: (command: string, cwd?: string) => ipcRenderer.invoke('electron:execute-command', command, cwd),
```

---

## Data Structures

### terminal_sessions Table Schema (`src/main.ts:1682-1698`)
```sql
CREATE TABLE IF NOT EXISTS terminal_sessions (
  id TEXT PRIMARY KEY,
  preset_id TEXT,
  project_id TEXT,
  agent TEXT,
  resume_id TEXT,
  topic TEXT,
  working_directory TEXT,
  terminal_id TEXT,
  total_tokens INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Additional columns migrated: category, status, product_area, description, auto_tags, category_confirmed, auto_named
```

### terminal_bindings Table Schema (`src/main.ts:1754-1767`)
```sql
CREATE TABLE IF NOT EXISTS terminal_bindings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  terminal_id TEXT NOT NULL UNIQUE,
  project_id TEXT,
  agent_type TEXT,
  session_id TEXT,
  active_problem_id TEXT,
  active_request_id TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### terminal_messages Table Schema (`src/main.ts:1728-1738`)
```sql
CREATE TABLE IF NOT EXISTS terminal_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,  -- Note: this stores terminal_id, not session UUID
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## IPC Channels & Bridges

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `electron:execute-command` | renderer→main | Runs arbitrary shell command, returns { stdout, stderr, error, code } |
| `save-terminal-session` | renderer→main | INSERT/UPDATE in terminal_sessions table |
| `terminal:write` | renderer→main | Writes text to node-pty terminal |
| `get-base-system-prompt` | renderer→main | Reads userPreferences.systemPrompts[agent] |
| `save-base-system-prompt` | renderer→main | Writes userPreferences.systemPrompts[agent] |

---

## Flow Diagram

```
DEFAULT_SYSTEM_PROMPT (display only)
  │
  ├── SettingsPage → <pre> preview
  ├── NewSessionDialog → preview display + customSystemPrompt textarea
  └── ✗ NEVER enters instruction text box
  └── ✗ NEVER sent to terminal

Instruction Panel Send Flow:
  InstructionPanel.generatePrompt()
    ├── skill content (if selected)
    ├── problems (if selected)
    ├── requests (if selected)
    ├── checklists (if selected)
    ├── agent files (if selected)
    ├── custom instruction (from textarea)
    └── ✗ MISSING: system prompt layer
              │
              ▼
  handleInstructionPanelSend(config)
    ├── terminalWrite(prompt)
    ├── saveTerminalSession({ id: session-${Date.now()}, ... })  ← fake ID
    └── updateTerminalBinding(...)

NewSessionDialog Flow:
  handleCreate()
    ├── sessionId = `session-${Date.now()}`  ← fake ID
    ├── customSystemPrompt from textarea (optional)
    ├── onCreate(config) → initializeTerminal()
    └── initializeTerminal writes systemPrompt (from customSystemPrompt or prefs.systemPrompts)
```

---

## Required Fixes

### Fix 1: Enter the Prompt into Instruction Text Box
- `InstructionPanel.tsx` needs a system prompt layer: when the instruction panel opens, it should pre-populate or prepend the system prompt content
- Option A: Add a `systemPrompt` prop to `InstructionPanel` that gets shown as a read-only section in the prompt preview
- Option B: Have the parent (TerminalPage) pass the effective system prompt as prop, and InstructionPanel includes it in `generatePrompt()`
- Option C: Add a dropdown/checkbox in InstructionPanel to include/exclude the system prompt in the generated output

### Fix 2: Fix the Sending Flow
- `handleInstructionPanelSend` should use `opencode session list` to get the real session ID before saving
- The session topic should include the actual prompt content, not just "0p 0r"
- Consider saving the full session metadata (with proper opencode session ID) as part of the send flow

### Fix 3: Save Session UID from `opencode session list`
- Before `saveTerminalSession`, call `executeCommand('opencode session list')` 
- Parse the CLI output to get the latest session ID (first row after header)
- Store the real opencode session ID in `terminal_sessions` table (use `resume_id` or add a new `opencode_session_id` column)
- Fall back to generated ID if CLI fails
