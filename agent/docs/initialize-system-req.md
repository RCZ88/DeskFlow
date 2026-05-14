# Terminal Workspace Complete Implementation

## IMPORTANT: Read This First

You are implementing features for an Electron/React/TypeScript app called DeskFlow. The user has reported that previous implementations claim to be "complete" but nothing actually works. You MUST verify each step by actually running and testing the code.

## Before You Start

1. Read these files to understand the project structure:
   - `src/pages/TerminalPage.tsx` - Main terminal workspace page
   - `src/components/TerminalWindow.tsx` - Terminal pane and layout components
   - `src/main.ts` - IPC handlers (search for `terminal:` and `get-problems`)
   - `src/services/ProblemsService.ts` - Problem management
   - `src/services/RequestsService.ts` - Request management

2. Check if these files exist and have content. If any are empty or missing, report back.

---

## Part 1: Fix Terminal Display Bug

### Problem
Terminals are not showing/displaying properly.

### Steps

1. Open `src/preload.ts` and find the `onTerminalData` callback. Verify it looks like this:

```typescript
onTerminalData: (callback: (terminalId: string, data: string) => void) => {
  const handler = (_event: any, id: string, data: string) => callback(id, data);
  ipcRenderer.on('terminal:data', handler);
  return () => ipcRenderer.removeListener('terminal:data', handler);
},
```

2. Open `src/main.ts` and find where `terminal:data` is sent. Verify it sends TWO arguments:

```typescript
// Correct:
mainWindow.webContents.send('terminal:data', terminalId, data);

// Wrong (causes silent failure):
mainWindow.webContents.send('terminal:data', { terminalId, data });
```

3. Find the `terminal:create` or `spawn-terminal` handler. Verify it sends `terminal:data` events when PTY outputs data:

```typescript
pty.onData((data: string) => {
  mainWindow?.webContents.send('terminal:data', id, data);
});
```

4. In `src/components/TerminalWindow.tsx`, find the `TerminalPane` component. Verify it listens for `terminal:data`:

```typescript
useEffect(() => {
  const unsubscribe = window.deskflowAPI?.onTerminalData((id, data) => {
    if (id === terminalId && terminalRef.current) {
      terminalRef.current.write(data);
    }
  });
  return () => unsubscribe?.();
}, [terminalId]);
```

### Verification
- Create a terminal
- Type `echo hello`
- Verify "hello" appears in the terminal
- If not working, check browser console for errors

---

## Part 2: Initialize Button with Session Selection

### Current Behavior
Initialize button exists but doesn't do anything useful.

### Required Behavior
1. Click "Initialize" button
2. Popup appears asking: "Which terminal/session to use for initialization?"
3. Options: "Create new session" or "Select existing session"
4. If "Create new session": ask for session name and AI agent type (Claude/OpenCode)
5. After selection, read `agent/Initialize.md` and send to selected terminal
6. AI agent initializes the project

### Implementation

**File: src/pages/TerminalPage.tsx**

Add state:

```typescript
const [showInitDialog, setShowInitDialog] = useState(false);
const [initStep, setInitStep] = useState<'select' | 'configure' | 'running'>('select');
const [initSelectedSession, setInitSelectedSession] = useState<string | null>(null);
const [initNewSessionName, setInitNewSessionName] = useState('');
const [initAgentType, setInitAgentType] = useState<'claude' | 'opencode'>('opencode');
const [initProgress, setInitProgress] = useState<string[]>([]);
```

Initialize button click handler:

```typescript
const handleInitializeClick = () => {
  setShowInitDialog(true);
  setInitStep('select');
  setInitSelectedSession(null);
  setInitNewSessionName('');
  setInitProgress([]);
};
```

Execute initialization:

```typescript
const executeInitialization = async (terminalId: string, sessionName: string) => {
  setInitStep('running');
  setInitProgress(['Reading Initialize.md...']);

  try {
    const initializeContent = await window.deskflowAPI?.readProjectFile?.(projectId, 'Initialize.md');

    if (!initializeContent) {
      setInitProgress(prev => [...prev, 'Error: Initialize.md not found']);
      return;
    }

    setInitProgress(prev => [...prev, 'Initialize.md loaded']);

    await new Promise(resolve => setTimeout(resolve, 2000));

    await window.deskflowAPI?.terminalWrite?.(terminalId, initializeContent + '\n');
    setInitProgress(prev => [...prev, 'Initialize.md sent to terminal']);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const agentCommand = initAgentType === 'claude' ? 'claude\n' : 'opencode\n';
    await window.deskflowAPI?.terminalWrite?.(terminalId, agentCommand);
    setInitProgress(prev => [...prev, `Launching ${initAgentType}...`]);

    await window.deskflowAPI?.saveTerminalSession?.({
      id: `session-${Date.now()}`,
      name: sessionName,
      terminal_id: terminalId,
      agent: initAgentType,
      topic: 'Project Initialization'
    });

    setInitProgress(prev => [...prev, 'Session saved']);
    setInitProgress(prev => [...prev, 'Initialization complete!']);

    setTimeout(() => {
      setShowInitDialog(false);
      loadSessions();
    }, 2000);

  } catch (error: any) {
    setInitProgress(prev => [...prev, `Error: ${error.message}`]);
  }
};
```

Dialog JSX:

```tsx
{showInitDialog && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-zinc-800 rounded-lg p-6 w-full max-w-md">
      <h2 className="text-xl font-bold mb-4">Initialize Project</h2>

      {initStep === 'select' && (
        <>
          <p className="text-gray-400 mb-4">Select a session to use for initialization:</p>

          <div className="space-y-2 mb-4">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => setInitSelectedSession(session.id)}
                className={`w-full p-3 rounded text-left ${
                  initSelectedSession === session.id
                    ? 'bg-purple-600'
                    : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
              >
                <div className="font-medium">{session.topic || session.name}</div>
                <div className="text-sm text-gray-400">{session.agent}</div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setInitStep('configure')}
            className="w-full bg-green-600 hover:bg-green-700 p-3 rounded mb-2"
          >
            + Create New Session
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setShowInitDialog(false)}
              className="flex-1 bg-zinc-700 hover:bg-zinc-600 p-2 rounded"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const session = sessions.find(s => s.id === initSelectedSession);
                if (session?.terminal_id) {
                  executeInitialization(session.terminal_id, session.name);
                }
              }}
              disabled={!initSelectedSession}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-600 p-2 rounded"
            >
              Initialize
            </button>
          </div>
        </>
      )}

      {initStep === 'configure' && (
        <>
          <p className="text-gray-400 mb-4">Configure new session for initialization:</p>

          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Session Name</label>
              <input
                type="text"
                value={initNewSessionName}
                onChange={(e) => setInitNewSessionName(e.target.value)}
                className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2"
                placeholder="Project Initialization"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">AI Agent</label>
              <select
                value={initAgentType}
                onChange={(e) => setInitAgentType(e.target.value as any)}
                className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2"
              >
                <option value="opencode">OpenCode</option>
                <option value="claude">Claude Code</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setInitStep('select')}
              className="flex-1 bg-zinc-700 hover:bg-zinc-600 p-2 rounded"
            >
              Back
            </button>
            <button
              onClick={async () => {
                const newTerminalId = `term-${Date.now()}`;
                window.dispatchEvent(new CustomEvent('create-terminal', {
                  detail: { terminalId: newTerminalId, cwd: projectPath }
                }));
                await new Promise(resolve => setTimeout(resolve, 3000));
                executeInitialization(newTerminalId, initNewSessionName || 'Initialization');
              }}
              className="flex-1 bg-purple-600 hover:bg-purple-700 p-2 rounded"
            >
              Create & Initialize
            </button>
          </div>
        </>
      )}

      {initStep === 'running' && (
        <>
          <p className="text-gray-400 mb-4">Initializing...</p>

          <div className="bg-zinc-900 rounded p-3 max-h-48 overflow-y-auto font-mono text-sm">
            {initProgress.map((msg, i) => (
              <div key={i} className="text-green-400">{msg}</div>
            ))}
          </div>
        </>
      )}
    </div>
  </div>
)}
```

### Verification
1. Click Initialize button
2. Select "Create New Session"
3. Enter session name
4. Select AI agent
5. Click "Create & Initialize"
6. Verify terminal opens
7. Verify Initialize.md content appears in terminal
8. Verify AI agent launches

---

## Part 3: File Tab - Agent Directory Only

### Problem
Files tab shows wrong directory or doesn't work.

### Fix

**File: src/pages/TerminalPage.tsx**

Find the FilesTab component and fix the path:

```typescript
// Files tab content
{activeTab === 'files' && (
  <FilesTab
    projectPath={projectPath ? `${projectPath}/agent` : undefined}
  />
)}
```

FilesTab component:

```typescript
const FilesTab: React.FC<{ projectPath?: string }> = ({ projectPath }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  useEffect(() => {
    if (projectPath) loadFiles();
  }, [projectPath]);

  const loadFiles = async () => {
    const result = await window.deskflowAPI?.listAgentFiles?.(projectPath);
    if (result?.success) setFiles(result.data || []);
  };

  const handleFileClick = async (filename: string) => {
    setSelectedFile(filename);
    const result = await window.deskflowAPI?.readAgentFile?.(projectPath, filename);
    if (result?.success) setFileContent(result.data || '');
  };

  const handleUseInPrompt = () => {
    if (selectedFile && fileContent) {
      setInstructionInput(prev => prev + `\n\n---\n${selectedFile}:\n\`\`\`\n${fileContent}\n\`\`\`\n`);
    }
  };

  return (
    <div className="h-full flex">
      <div className="w-48 border-r border-zinc-700 overflow-y-auto">
        {files.map(file => (
          <button
            key={file}
            onClick={() => handleFileClick(file)}
            className={`w-full text-left px-2 py-1 text-sm hover:bg-zinc-700 ${
              selectedFile === file ? 'bg-zinc-600' : ''
            }`}
          >
            {file}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {selectedFile ? (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{selectedFile}</span>
              <button
                onClick={handleUseInPrompt}
                className="text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded"
              >
                Use in Prompt
              </button>
            </div>
            <pre className="text-xs bg-zinc-900 p-2 rounded overflow-auto">
              {fileContent}
            </pre>
          </>
        ) : (
          <p className="text-gray-500 text-sm">Select a file to view</p>
        )}
      </div>
    </div>
  );
};
```

### Verification
1. Open Files tab
2. Verify files listed are from `{projectPath}/agent/` directory
3. Click a file
4. Verify content displays
5. Click "Use in Prompt"
6. Verify content added to instruction input

---

## Part 4: System Prompt Customization

### Create Settings UI

**File: src/pages/SettingsPage.tsx**

Add a new tab for "System Prompts":

```typescript
// Add to state
const [activeSettingsTab, setActiveSettingsTab] = useState('general');

// In the tabs array, add:
{ id: 'prompts', label: 'System Prompts', icon: MessageSquare },

// In the content area, add:
{activeSettingsTab === 'prompts' && (
  <SystemPromptsSettings />
)}
```

SystemPromptsSettings component:

```typescript
const SystemPromptsSettings: React.FC = () => {
  const [systemPrompts, setSystemPrompts] = useState({
    claude: '',
    opencode: '',
    global: ''
  });

  useEffect(() => { loadPrompts(); }, []);

  const loadPrompts = async () => {
    const prefs = await window.deskflowAPI?.getPreferences?.();
    if (prefs?.systemPrompts) setSystemPrompts(prefs.systemPrompts);
  };

  const savePrompts = async () => {
    await window.deskflowAPI?.setPreference?.('systemPrompts', systemPrompts);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">System Prompts</h3>
        <p className="text-sm text-gray-400 mb-4">
          These prompts are automatically inserted at the beginning of every session.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Global System Prompt (applies to all agents)
        </label>
        <textarea
          value={systemPrompts.global}
          onChange={(e) => setSystemPrompts(prev => ({ ...prev, global: e.target.value }))}
          className="w-full h-32 bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm"
          placeholder="Enter instructions that apply to all AI agents..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Claude Code System Prompt
        </label>
        <textarea
          value={systemPrompts.claude}
          onChange={(e) => setSystemPrompts(prev => ({ ...prev, claude: e.target.value }))}
          className="w-full h-32 bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm"
          placeholder="Additional instructions for Claude Code..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          OpenCode System Prompt
        </label>
        <textarea
          value={systemPrompts.opencode}
          onChange={(e) => setSystemPrompts(prev => ({ ...prev, opencode: e.target.value }))}
          className="w-full h-32 bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm"
          placeholder="Additional instructions for OpenCode..."
        />
      </div>

      <button
        onClick={savePrompts}
        className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
      >
        Save System Prompts
      </button>
    </div>
  );
};
```

### Apply System Prompts in Terminal Initialization

```typescript
const getSystemPromptForAgent = async (agentType: string): Promise<string> => {
  const prefs = await window.deskflowAPI?.getPreferences?.();
  const prompts = prefs?.systemPrompts || {};

  let prompt = prompts.global || '';

  if (agentType === 'claude' && prompts.claude) {
    prompt += '\n\n' + prompts.claude;
  }
  if (agentType === 'opencode' && prompts.opencode) {
    prompt += '\n\n' + prompts.opencode;
  }

  return prompt;
};
```

---

## Part 5: Progress Tracking JSON

### Create Progress File

When initialization runs, create `agent/.init-progress.json`:

```typescript
interface InitProgress {
  startedAt: string;
  status: 'running' | 'complete' | 'error';
  currentStep: string;
  completedSteps: string[];
  filesCreated: string[];
  filesModified: string[];
  errors: string[];
}

const updateProgress = async (progress: InitProgress, projectPath: string) => {
  const progressPath = path.join(projectPath, 'agent', '.init-progress.json');
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
};

const getProgress = async (projectPath: string): Promise<InitProgress | null> => {
  const progressPath = path.join(projectPath, 'agent', '.init-progress.json');
  if (fs.existsSync(progressPath)) {
    return JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
  }
  return null;
};
```

---

## Part 6: Session Save/Load Fix

### Fix Session Saving

```typescript
// In main.ts - save-terminal-session handler
ipcMain.handle('save-terminal-session', async (_, session) => {
  const db = getDb();

  const existing = await db.get(
    'SELECT * FROM terminal_sessions WHERE id = ?',
    [session.id]
  );

  if (existing) {
    await db.run(
      `UPDATE terminal_sessions
       SET name = ?, agent = ?, terminal_id = ?, topic = ?, updated_at = ?
       WHERE id = ?`,
      [session.name, session.agent, session.terminal_id, session.topic, new Date().toISOString(), session.id]
    );
  } else {
    await db.run(
      `INSERT INTO terminal_sessions
       (id, name, agent, terminal_id, topic, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [session.id, session.name, session.agent, session.terminal_id, session.topic, new Date().toISOString()]
    );
  }

  return { success: true };
});
```

---

## Final Verification Checklist

Run through each item and verify it works:

1. [ ] Click Initialize button → Dialog opens
2. [ ] Select "Create New Session" → Configuration form appears
3. [ ] Enter name, select agent → "Create & Initialize" works
4. [ ] Terminal opens → Shows Initialize.md content
5. [ ] AI agent launches
6. [ ] Files tab shows only files from `{projectPath}/agent/`
7. [ ] Click file → Content displays
8. [ ] "Use in Prompt" → Adds to instruction input
9. [ ] Settings → System Prompts tab exists
10. [ ] Save system prompts → Persists
11. [ ] Session saves correctly
12. [ ] Session loads on restart

---

## If Something Doesn't Work

1. Check browser console for errors
2. Check terminal output for IPC errors
3. Verify file paths are correct
4. Verify IPC handlers exist in main.ts
5. Verify preload.ts exposes the API

Report back with:
- Exact error message
- Which step failed
- What you tried to fix it
