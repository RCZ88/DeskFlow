# RESULT: Bidirectional Agent Visibility Architecture

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        RENDERER (React)                          │
│                                                                  │
│  ┌─────────────────────┐  ┌───────────────────────────────────┐  │
│  │   TerminalPage.tsx   │  │  Agent Inspector Panel (NEW)      │  │
│  │  + TerminalWindow    │  │  - Current model + config         │  │
│  │  + InstructionPanel  │  │  - Real-time token/cost           │  │
│  │  + Sidebar (sessions)│  │  - Chat export button             │  │
│  │                     │  │  - Model switcher                  │  │
│  └─────────┬───────────┘  │  - Slash command history           │  │
│            │              └───────────────┬───────────────────┘  │
│            │                              │                      │
│            └──────────┬───────────────────┘                      │
│                       │ preload.ts IPC bridge                    │
├───────────────────────┼──────────────────────────────────────────┤
│            MAIN (Electron)                                       │
│                       │                                          │
│  ┌────────────────────┴──────────────────────────────────────┐   │
│  │                    main.ts                                  │   │
│  │                                                           │   │
│  │  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐  │   │
│  │  │TerminalManager│  │ AIAgentPlugin[]  │  │AgentInspector│  │   │
│  │  │ (node-pty)    │  │ (7 plugins)      │  │ (NEW)        │  │   │
│  │  └──────┬───────┘  └────────┬────────┘  │              │  │   │
│  │         │                    │           │ - Storage    │  │   │
│  │         │  PTY data stream  │           │   watchers   │  │   │
│  │         │  + AGENT_SIGS     │           │ - IPC to     │  │   │
│  │         │                   │           │   renderer   │  │   │
│  │         │                   │           │ - Agent cmd  │  │   │
│  │         │                   │           │   injector   │  │   │
│  │         v                   v           └──────┬───────┘  │   │
│  │  ┌──────────────────────────────────────────────┘          │   │
│  │  │ Database (SQLite)                                       │   │
│  │  │  - terminal_messages  - ai_usage  - terminal_sessions   │   │
│  │  │  - agent_models(NEW)  - chat_exports(NEW)              │   │
│  │  └─────────────────────────────────────────────────────────┘   │
│  └───────────────────────────────────────────────────────────────┘
│                        │
│                       PTY (node-pty)
│                        │
│              ┌─────────┴─────────┐
│              │   Shell (bash/zsh) │
│              │         │          │
│              │   ┌─────┴─────┐    │
│              │   │ CLI Agent  │    │
│              │   │ (opencode, │    │
│              │   │  claude...)│    │
│              │   └───────────┘    │
│              └───────────────────┘
│
│  Agent Storage (filesystem):
│    ~/.local/share/opencode/opencode.db  ─── OpenCodePlugin ──┐
│    ~/.claude/projects/*.jsonl           ─── ClaudeCodePlugin │
│    ~/.gemini/tmp/*                      ─── GeminiPlugin    ├── ai_usage table
│    ~/.codex/                            ─── CodexPlugin     │
│    ...                                  ─── Qwen/Aider/... ─┘
└──────────────────────────────────────────────────────────────────┘
```

## 2. Approach Analysis

### Approach A: Backend Storage Reads (Passive) — ALREADY 65% DONE

**Current state:** The `AIAgentPlugin` system (line 309, `main.ts`) reads agent storage but only during explicit sync. It extracts token counts, model names, session IDs, and project paths. Data lands in `ai_usage` table.

**What's implemented:**
- OpenCode SQLite parser reads `session` and `message` tables, extracts `tokens.input/output`, `modelID`, `providerID`, `cost`
- Claude Code JSONL parser reads per-line entries, aggregates `usage`, detects `model`, counts messages
- 5 other plugins for Gemini, Codex, Qwen, Aider, Cursor
- `syncAllAIAgents()` at line 1117 with mtime caching for incremental sync
- `getDirDataSignature()` for recursive file detection
- `MODEL_PRICING` lookup table at line 322 for cost calculation

**What's missing:**
- No real-time file watchers on storage directories — sync is only on-demand or periodic
- No live model detection — `ai_usage` stores historical model per-record, not current agent state
- No chat content reading — plugins only extract token counts, not message content
- No config/instruction reading — agent custom instructions remain invisible
- No writes to agent storage (model switching, config changes)

**Cost to fill gaps:**
- File watchers: Low (Node.js `fs.watch` or chokidar on agent storage dirs)
- Live model detection: Low (poll OpenCode DB's most recent `message` row for latest `modelID`)
- Chat content reading: Medium (OpenCode DB stores full message data as JSON blob)
- Config reads: Low (OpenCode has `settings` table or JSON config file)
- Storage writes: High (risk of corruption, agent may overwrite, SQLite locking)

### Approach B: PTY Data Stream Interception (Active) — ALREADY 40% DONE

**Current state:** All PTY data flows through `terminalManager.getDataHandler()` (line 5665, `main.ts`). Data is forwarded to renderer and saved to `terminal_messages`. Agent readiness is detected via `AGENT_SIGNATURES` regex.

**What's implemented:**
- Full PTY data capture in `terminal:create` handler (line 5685-5706)
- Both user input and assistant output saved to `terminal_messages` table
- Agent readiness detection with `startAgentTimeout` / `clearAgentTimeout`
- `retry-agent-init` handler (line 5753) for re-binding data handlers

**What's missing:**
- No structured parsing of PTY output — model names, cost summaries, status markers all buried in raw text
- No slash command detection — `/model`, `/compact`, `/cost` commands and their results invisible
- No way to distinguish user input vs agent output at the main process level (both arrive as PTY data)
- No injection point for programmatic commands (model switching, export)
- Fragile — output formatting changes between agent versions

**Cost to fill gaps:**
- Structured output parsing: Medium (add regex/parser layer in data handler)
- Slash command detection: Low-Medium (detect `/\w+` patterns in user input stream)
- Command injection: Low (use existing `terminalManager.write()` from IPC handler)
- User-vs-agent distinction: Low (track writes vs incoming data via separate flags)
- Agent-specific parsers: Medium-High (each agent outputs differently)

### Approach C: System Prompt Injection (Cooperative) — ALREADY 50% DONE

**Current state:** The `DEFAULT_SYSTEM_PROMPT` (270+ lines in `defaults.ts`) instructs agents on DeskFlow integration. `parseSessionMetadata()` extracts structured metadata. `parseMessageContent()` extracts decisions/action items. `parseAndExecuteActions()` handles structured action blocks.

**What's implemented:**
- `## Session Metadata` block parsed for `title`, `description`, `status`, `productArea`, `category`
- `## Actions` block parsed for `[create-problem]`, `[update-problem]`, `[complete-checklist]`
- Decision/action item/status change extraction from free text
- Session updates written when metadata arrives in assistant messages

**What's missing:**
- No metadata for model, cost, tokens, or slash commands
- No prompt instructions for agent to self-report state transitions
- No mechanism to request specific metadata (agent informs DeskFlow of model change)
- No validation — agent may ignore or provide inaccurate data

**Cost to fill gaps:**
- Extend metadata contract: Low (add `Model`, `Cost`, `Tokens`, `SlashCommand`, `SlashResult` keys)
- Add self-reporting instructions to system prompt: Low (3-5 lines)
- Validation layer: Medium (cross-reference with storage reads)
- Fallback when agent ignores: Already covered by Approach A

### Approach D: Plugin/MCP Bridge (Advanced) — 0% DONE

**Current state:** No MCP server or agent plugin exists.

**What's possible:**
- OpenCode has plugin SDK — could write a plugin that exposes model, config, and chat export
- Claude Code has hooks and MCP support — could connect to DeskFlow MCP server
- MCP protocol is standardized — tools like `get_current_model()`, `export_chat()`, `switch_model()` could be MCP tools
- DeskFlow could run an MCP server that agent connects to

**Cost to fill gaps:**
- MCP server in Electron main process: Medium (new module, MCP SDK integration)
- Per-agent plugin development: High (each agent needs its own plugin)
- Testing across agent versions: High
- Overengineering risk: MCP provides bidirectional control but at significant complexity

### Approach E: Hybrid (Recommended)

Combine approaches for maximum coverage with minimum cost:

```
Visibility Layer:
  ├── Storage Reads (A) → model, tokens, costs, sessions (historical)
  ├── PTY Stream (B)    → live status, slash commands, agent output (real-time)
  └── Prompt Injection (C) → structured self-reports, metadata (enrichment)

Control Layer:
  ├── Command Injection (B) → model switching, slash commands
  └── MCP Bridge (D)        → future bidirectional IPC (phase 2)
```

## 3. Implementation Plan — Phase 1 (High Value, Low Cost)

### Phase 1a: Real-Time Agent State (1-2 days)

**Goal:** Show current model, token usage, and enriched agent status in real-time.

#### Step 1: File Watchers on Agent Storage

New module: `src/agent-inspector.ts` (in Electron main process space)

```typescript
// AgentInspector — watches agent storage for real-time state changes
class AgentInspector {
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private pollTimers: Map<string, NodeJS.Timeout> = new Map();
  private currentState: Map<string, AgentState> = new Map();

  // Register a terminal with its agent type
  registerTerminal(terminalId: string, agentType: string, projectPath?: string) {
    const plugin = AI_AGENT_PLUGINS.find(p => p.id === agentType);
    if (!plugin) return;

    const paths = plugin.getStoragePaths();
    for (const storagePath of paths) {
      this.startWatcher(terminalId, storagePath);
      this.startPolling(terminalId, storagePath, plugin);
    }
  }

  // Poll for latest model/token state (every 5s when agent is active)
  private async pollAgentState(terminalId: string, storagePath: string, plugin: AIAgentPlugin) {
    const latest = await this.readLatestState(storagePath, plugin);
    if (latest && this.hasChanged(terminalId, latest)) {
      this.currentState.set(terminalId, latest);
      this.notifyRenderer(terminalId, latest);
    }
  }

  // For OpenCode: query most recent message's modelID
  private async readLatestStateOpenCode(dbPath: string): Promise<AgentState | null> {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare(`
      SELECT data FROM message ORDER BY rowid DESC LIMIT 1
    `).get() as any;
    db.close();
    if (!row) return null;
    const data = JSON.parse(row.data);
    return {
      model: data.modelID,
      provider: data.providerID,
      tokens: data.tokens,
      cost: data.cost,
      timestamp: Date.now(),
    };
  }
}
```

#### Step 2: Extend agentStatuses State

Current: `'spawning' | 'waiting' | 'ready' | 'timeout'`
New: Add enrichment layer:

```typescript
interface AgentDetailedStatus {
  basic: 'spawning' | 'waiting' | 'ready' | 'timeout';
  model?: string;
  provider?: string;
  tokens?: { input: number; output: number; cacheRead?: number; cacheWrite?: number };
  cost?: number;
  lastActivity?: number;
  // Derived from PTY pattern matching
  subStatus?: 'generating' | 'idle' | 'running_command' | 'has_changes' | 'error';
}

const [agentDetails, setAgentDetails] = useState<Record<string, AgentDetailedStatus>>({});
```

#### Step 3: New IPC Handlers

```typescript
// preload.ts additions:
getAgentState: (terminalId: string) => ipcRenderer.invoke('agent:get-state', terminalId),
onAgentStateUpdate: (callback: (data: AgentStateUpdate) => void) => {
  const handler = (_event: any, data: AgentStateUpdate) => callback(data);
  ipcRenderer.on('agent:state-update', handler);
  return () => ipcRenderer.removeListener('agent:state-update', handler);
},

// main.ts additions:
ipcMain.handle('agent:get-state', async (_event, terminalId: string) => {
  return agentInspector.getCurrentState(terminalId);
});

// Agent inspector pushes updates:
mainWindow.webContents.send('agent:state-update', {
  terminalId,
  model: 'claude-sonnet-4-20250514',
  tokens: { input: 1500, output: 3200 },
  cost: 0.052,
  subStatus: 'generating',
});
```

#### Step 4: Extend System Prompt for Self-Reporting

Add to `DEFAULT_SYSTEM_PROMPT`:

```markdown
## Agent State Reporting

When your model changes, cost updates significantly, or you process a slash command,
include a machine-parseable metadata block in your response:

## Agent Status
- Model: claude-sonnet-4-20250514
- Tokens: 1500 input / 3200 output
- Cost: $0.052
- Status: generating | idle | waiting
- SlashCommand: /model
- SlashResult: Switched to claude-sonnet-4-20250514

This helps DeskFlow display accurate agent state without parsing terminal output.
```

Extend `parseSessionMetadata()` to handle `## Agent Status`:

```typescript
function parseAgentStatus(content: string): {
  model?: string; tokens?: string; cost?: string; status?: string;
  slashCommand?: string; slashResult?: string;
} | null {
  if (!content.includes('## Agent Status')) return null;
  // Same pattern as parseSessionMetadata
  const meta: any = {};
  const lines = content.split('\n');
  let inMeta = false;
  for (const line of lines) {
    if (line.trim() === '## Agent Status') { inMeta = true; continue; }
    if (!inMeta) continue;
    if (line.startsWith('#')) break;
    const m = line.match(/-\s*(\w+)\s*:\s*(.+)/);
    if (m) {
      const key = m[1].replace(/\s+/g, '').toLowerCase();
      const val = m[2].trim();
      if (key === 'model') meta.model = val;
      if (key === 'tokens') meta.tokens = val;
      if (key === 'cost') meta.cost = val;
      if (key === 'status') meta.status = val;
      if (key === 'slashcommand') meta.slashCommand = val;
      if (key === 'slashresult') meta.slashResult = val;
    }
  }
  return Object.keys(meta).length ? meta : null;
}
```

### Phase 1b: Chat Export (1 day)

#### Step 1: Export IPC Handler

```typescript
// main.ts
ipcMain.handle('agent:export-chat', async (_event, sessionId: string, format: 'md' | 'json' | 'txt') => {
  if (!db) return { success: false, error: 'No database' };
  try {
    const messages = db.prepare(
      'SELECT * FROM terminal_messages WHERE session_id = ? ORDER BY created_at ASC'
    ).all(sessionId) as any[];

    const session = db.prepare(
      'SELECT * FROM terminal_sessions WHERE id = ?'
    ).get(sessionId) as any;

    let output: string;
    switch (format) {
      case 'json':
        output = JSON.stringify({ session, messages }, null, 2);
        break;
      case 'txt':
        output = messages.map((m: any) =>
          `[${m.role.toUpperCase()}] ${m.content}`
        ).join('\n\n---\n\n');
        break;
      case 'md':
      default:
        output = `# Chat Export: ${session?.topic || sessionId}\n\n`;
        output += messages.map((m: any) =>
          `### ${m.role === 'user' ? '👤 User' : m.role === 'assistant' ? '🤖 Assistant' : '⚙️ System'}\n\n${m.content}\n`
        ).join('\n---\n\n');
        break;
    }

    return { success: true, data: output, session: { topic: session?.topic, agent: session?.agent } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});
```

#### Step 2: Enrich Storage Plugin for Message Content

For OpenCode, extend the plugin to optionally read message content:

```typescript
// In OpenCodePlugin, add method:
async readSessionMessages(sessionId: string): Promise<Array<{ role: string; content: string }>> {
  const homedir = require('os').homedir();
  const dbPath = path.join(homedir, '.local', 'share', 'opencode', 'opencode.db');
  const Database = require('better-sqlite3');
  const db = new Database(dbPath, { readonly: true });
  const rows = db.prepare(
    'SELECT data FROM message WHERE session_id = ? ORDER BY rowid ASC'
  ).all(sessionId) as any[];
  db.close();
  return rows.map((r: any) => {
    const data = JSON.parse(r.data);
    return { role: data.role || 'assistant', content: data.content || '' };
  });
}
```

### Phase 1c: Slash Command Awareness (2 days)

#### Step 1: Detect Slash Commands in User Input

In the `write-terminal` handler (line 5778):

```typescript
ipcMain.handle('write-terminal', async (_event, terminalId: string, data: string) => {
  const success = terminalManager.write(terminalId, data);

  // Detect slash commands
  const trimmed = data?.trim() || '';
  const slashMatch = trimmed.match(/^\/(\w+)(?:\s+(.*))?$/);
  if (slashMatch) {
    const command = slashMatch[1];
    const args = slashMatch[2] || '';
    console.log(`[DeskFlow] Slash command detected: /${command} ${args}`);

    // Store in new slach_commands table
    if (db) {
      db.prepare(
        'INSERT INTO agent_slash_commands (terminal_id, command, args, created_at) VALUES (?, ?, ?, datetime(\'now\'))'
      ).run(terminalId, command, args);
    }

    // Notify renderer
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('agent:slash-command', { terminalId, command, args });
      }
    }
  }

  // Existing persistence logic...
});
```

#### Step 2: New DB Table

```sql
CREATE TABLE IF NOT EXISTS agent_slash_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  terminal_id TEXT NOT NULL,
  session_id TEXT,
  command TEXT NOT NULL,
  args TEXT DEFAULT '',
  result TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Step 3: Detect Slash Command Results

In the PTY data handler, add patterns for common slash command results:

```typescript
// Patterns for known slash command outputs
const SLASH_RESULT_PATTERNS: Record<string, RegExp> = {
  model: /current model:?\s*(\S+)/i,
  cost: /total cost:?\s*\$?([\d.]+)/i,
  compact: /compacted|cleared|reset/i,
};

function detectSlashResult(data: string, command: string): string | null {
  const pattern = SLASH_RESULT_PATTERNS[command];
  if (!pattern) return null;
  const match = data.match(pattern);
  return match ? match[0] : null;
}
```

### Phase 1d: Model Switching (2-3 days)

#### Step 1: Read Available Models

For OpenCode, read the model configuration from its DB:

```typescript
ipcMain.handle('agent:get-available-models', async (_event, agentType: string) => {
  const plugin = AI_AGENT_PLUGINS.find(p => p.id === agentType);
  if (!plugin) return { success: false, models: [] };

  // Agent-specific model enumeration
  switch (agentType) {
    case 'opencode': {
      const homedir = require('os').homedir();
      const configPath = path.join(homedir, '.config', 'opencode', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return { success: true, models: config.availableModels || [] };
      }
      // Fallback: known OpenCode models
      return {
        success: true,
        models: [
          'claude-sonnet-4-20250514',
          'claude-sonnet-4-20250514-thinking',
          'claude-opus-4-20250514',
          'gemini-2.5-pro',
          'gpt-4o',
        ]
      };
    }
    case 'claude': {
      // Claude Code reads model from project config or env
      return { success: true, models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'] };
    }
    default: return { success: false, models: [] };
  }
});
```

#### Step 2: Inject Model Change Command

```typescript
ipcMain.handle('agent:switch-model', async (_event, terminalId: string, model: string) => {
  const terminal = terminalManager.terminals.get(terminalId);
  if (!terminal) return { success: false, error: 'Terminal not found' };

  // For OpenCode: send /model command
  // For Claude Code: send /model command
  terminal.pty.write(`/model ${model}\n`);
  return { success: true };
});
```

#### Step 3: Persist Model Preference

New table:

```sql
CREATE TABLE IF NOT EXISTS agent_model_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT,
  agent_type TEXT NOT NULL,
  model TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, agent_type)
);
```

## 4. New IPC Handlers Summary

| Handler | Direction | Purpose |
|---------|-----------|---------|
| `agent:get-state` | invoke | Get current agent state (model, tokens, cost) |
| `agent:state-update` | event (push) | Real-time state changes from watcher |
| `agent:export-chat` | invoke | Export chat in md/json/txt |
| `agent:get-available-models` | invoke | List available models for agent type |
| `agent:switch-model` | invoke | Switch agent model via command injection |
| `agent:get-slash-commands` | invoke | Get slash command history for terminal |
| `agent:slash-command` | event (push) | Real-time slash command detection |
| `agent:current-config` | invoke | Read agent config (instructions, temperature) |

## 5. Storage Schema — New Tables

```sql
-- Agent model preferences (per-project, per-agent)
CREATE TABLE IF NOT EXISTS agent_model_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT,
  agent_type TEXT NOT NULL,
  model TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, agent_type)
);

-- Slash command history
CREATE TABLE IF NOT EXISTS agent_slash_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  terminal_id TEXT NOT NULL,
  session_id TEXT,
  command TEXT NOT NULL,
  args TEXT DEFAULT '',
  result TEXT,
  result_detected_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chat exports (cached/archived)
CREATE TABLE IF NOT EXISTS chat_exports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('md', 'json', 'txt')),
  content TEXT NOT NULL,
  file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent state snapshots (for historical tracking)
CREATE TABLE IF NOT EXISTS agent_state_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  terminal_id TEXT,
  session_id TEXT,
  model TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  cache_write_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  sub_status TEXT,
  provider TEXT,
  snapshot_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 6. UI Placement Mockups

### Terminal Tab Header (model badge + status)

```
┌─────────────────────────────────────────────────────────────────┐
│ [term-abc]  ● Active  │  [term-xyz]  ● Generating  │  [+]      │
│  ┌─────────────────────┤  ┌──────────────────────────┤           │
│  │ claude-opus-4       │  │ claude-sonnet-4          │           │
│  │ $0.052 • 4.7k tok   │  │ $0.018 • 3.2k tok       │           │
│  └─────────────────────┘  └──────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Terminal Pane — Agent Status Bar (bottom of pane)

```
┌───────────────────────────────────────┐
│                                       │
│         [terminal output]             │
│                                       │
│                                       │
├───────────────────────────────────────┤
│ ◉ claude-sonnet-4  │  ⟳ 1.5k tok    │
│ $0.052             │  ⚡ Generating   │
│ [Switch Model ▼]   │  [Export ▼]      │
└───────────────────────────────────────┘
```

### Sidebar — Agent Inspector Panel (new tab, right of Sessions)

```
┌────────────────────────────────┐
│ Sessions │ History │ Agent  ◉  │
├────────────────────────────────┤
│                                │
│ ┌─ Agent: opencode ──────────┐ │
│ │ Model: claude-sonnet-4     │ │
│ │ Provider: Anthropic        │ │
│ │ [Switch Model...]          │ │
│ ├────────────────────────────┤ │
│ │ Tokens: 1,520 in / 3,281   │ │
│ │ Cost: $0.052 this session  │ │
│ │ Est. total: $0.184         │ │
│ ├────────────────────────────┤ │
│ │ Status: ⚡ Generating      │ │
│ │ Slash commands: /model 2   │ │
│ │                /compact 1  │ │
│ ├────────────────────────────┤ │
│ │ [Export Chat ▼] [Share]    │ │
│ └────────────────────────────┘ │
│                                │
│ ┌─ Available Models ─────────┐ │
│ │ ○ claude-sonnet-4 (current)│ │
│ │ ○ claude-opus-4            │ │
│ │ ○ gemini-2.5-pro           │ │
│ │ ○ gpt-4o                   │ │
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

### Chat Export Dialog

```
┌──────────────────────────────────────┐
│  Export Chat: "Fixed API bug"        │
│                                      │
│  Format:                             │
│  ○ Markdown (readable, with headers) │
│  ● JSON (structured data)           │
│  ○ Plain Text                        │
│                                      │
│  Include:                            │
│  ☑ System prompts                    │
│  ☑ Token usage                       │
│  ☐ Agent configuration               │
│                                      │
│  [Cancel]  [Export & Download]       │
└──────────────────────────────────────┘
```

## 7. Priority-Ranked Feature List

| Priority | Feature | Approach | Risk | Timeline |
|----------|---------|----------|------|----------|
| P0 | Real-time model display | A (watcher) + C (prompt) | Low | 1 day |
| P0 | Live token/cost tracking | A (poll watcher) | Low | 1 day |
| P0 | Chat export (from terminal_messages) | B (DB read) | Low | 0.5 day |
| P1 | Enriched agent status (generating/idle/etc) | B (PTY patterns) | Medium | 1 day |
| P1 | Slash command detection | B (input intercept) | Medium | 1 day |
| P1 | Slash command result detection | B + C (output patterns) | Medium | 1 day |
| P2 | Model switching from UI | B (command injection) | Medium | 1 day |
| P2 | Available model listing | A (storage read) | Low | 0.5 day |
| P2 | Per-session model persistence | A (DB table) | Low | 0.5 day |
| P3 | Chat history search | B (FTS on terminal_messages) | Medium | 1 day |
| P3 | Agent config display | A (storage read) | Medium | 1 day |
| P4 | MCP bridge for bidirectional IPC | D | High | 5+ days |
| P4 | Agent plugin development | D | High | 5+ days |

## 8. Data Flow Diagrams

### Real-Time State Update Flow

```
OpenCode DB ──fs.watch──┐
                         v
              AgentInspector.pollAgentState()
                         │
                    hasChanged? ──no──→ skip
                         │ yes
                         v
              mainWindow.send('agent:state-update')
                         │
                  ┌──────┴──────┐
                  v              v
           preload.ts      TerminalPage.tsx
        (ipcRenderer)    (setAgentDetails)
                  │              │
                  └──────┬───────┘
                         v
                  React Component
                 (AgentStatusBar)
```

### Chat Export Flow

```
User clicks Export
         │
         v
TerminalPage calls deskflowAPI.exportChat(sessionId, 'md')
         │
         v
main.ts: agent:export-chat handler
         │
         ├── query terminal_messages WHERE session_id = ?
         ├── query terminal_sessions WHERE id = ?
         └── format output as md/json/txt
         │
         v
Renderer receives { data, session }
         │
         v
Show preview dialog → User clicks Download
         │
         v
deskflowAPI.saveFile() → Electron dialog.showSaveDialog()
```

### Model Switch Flow

```
User selects model in Sidebar
         │
         v
TerminalPage calls deskflowAPI.switchModel(terminalId, 'claude-opus-4')
         │
         v
main.ts: agent:switch-model handler
         │
         ├── terminalManager.write(terminalId, '/model claude-opus-4\n')
         ├── INSERT INTO agent_model_preferences (project_id, agent_type, model)
         └── Notify renderer of command sent
         │
         v
Agent receives `/model claude-opus-4` in PTY
         │
         v
Agent switches model (internal)
         │
         v
Agent outputs confirmation → detected by PTY data handler
         │
         v
AgentInspector polls storage → sees new model
         │
         v
agent:state-update pushed to renderer
```

## 9. Fallback Behavior

| Scenario | Fallback |
|----------|----------|
| Agent storage file locked/inaccessible | Show "Unknown" with warning badge. Fall back to PTY parsing (Approach B) |
| Agent doesn't support self-reporting (Approach C) | Agent Status block simply never appears. No error. Storage reads still work. |
| PTY output format changed (Approach B) | Pattern matching fails silently. Fall back to storage reads (Approach A) |
| File watcher error (permission denied) | Log warning, fall back to periodic polling (30s interval) |
| Model switch command not supported by agent | Inject `/model` anyway. If no response within 10s, notify user. |
| Agent DB schema changes (OpenCode SQLite) | Try/catch around all queries. Return partial data. Log schema mismatch. |

## 10. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Reading agent storage files | Read-only mode (`better-sqlite3` with `{ readonly: true }`). Never write to agent DBs. |
| Agent config contains API keys | Never read or transmit config blobs. Only read specific keys (model, temperature). |
| Command injection via model switch | Only inject commands through existing PTY write path. Never construct shell commands. |
| File watcher DoS | Debounce file change events (500ms). Max 1 poll per 5s per agent storage path. |
| Cross-agent data leakage | Agent state is scoped to terminalId. Never mix state between terminals. |
| Electron process privilege | Agent storage reading runs in main process (no sandbox). Validate all file paths are within expected agent directories. |

## 11. Code Integration Points

### Files to Create

```
src/agent-inspector.ts        — AgentInspector class (watchers, pollers, state)
```

### Files to Modify

```
src/main.ts                    — Add new IPC handlers, import AgentInspector
src/preload.ts                 — Add new IPC bridges
src/pages/TerminalPage.tsx     — Add agent detail state, status bar component
src/components/TerminalWindow.tsx — Add AgentStatusBar to pane bottom
src/lib/defaults.ts            — Extend system prompt with agent self-reporting
```

### New IPC Handlers (in main.ts)

Insert after line 5775 (after `terminal:create` block):

```typescript
// === Agent Inspector IPC ===
ipcMain.handle('agent:get-state', ...)
ipcMain.handle('agent:export-chat', ...)
ipcMain.handle('agent:get-available-models', ...)
ipcMain.handle('agent:switch-model', ...)
ipcMain.handle('agent:get-slash-commands', ...)
ipcMain.handle('agent:current-config', ...)
```

### Integration with Existing Flow

The `terminal:create` handler (line 5675) is the natural integration point — register the terminal with `AgentInspector` right after spawning:

```typescript
// After successful spawn (line 5728), add:
if (agentType) {
  agentInspector.registerTerminal(id, agentType, cwd);
}
```

## 12. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Agent DB schema changes | Medium | High | Try/catch all queries, per-agent version detection |
| File watcher perf on large dirs | Low | Medium | Only watch immediate child files, not recursive |
| PTY parsing false positives | Medium | Low | Always cross-ref with storage reads for verification |
| User runs unknown agent | High | Low | All features degrade gracefully to "Unknown" state |
| Electron memory from state history | Low | Low | Keep last 100 snapshots per terminal, GC older |
| Agent ignores system prompt | High | Medium | Never depend solely on Approach C; A + B are always available |
| npm dependency conflicts (chokidar) | Low | Low | Use Node.js built-in `fs.watch` for storage dirs |

## 13. Summary

**The single highest-ROI change** is adding file watchers + polling to the existing `AIAgentPlugin` system (Approach A). This alone unlocks:
- Real-time model display (read OpenCode DB's latest message for `modelID`)
- Live token/cost (already parsed but not pushed to renderer in real-time)
- Agent config visibility (read OpenCode settings or Claude project config)

**Second highest:** Extend the system prompt (Approach C) with `## Agent Status` metadata contract. Zero code complexity, works with any agent that respects system prompts.

**PTY parsing (Approach B)** should be used sparingly — only for things storage can't provide (live "generating" status, slash command detection). The `terminal_messages` table already stores everything; the gap is structured extraction from that unstructured data.

**MCP bridge (Approach D)** is phase 2 material. The hybrid approach (A + B + C) covers 80% of requirements with 20% of the implementation cost.
