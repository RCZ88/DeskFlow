# CONTEXT_BUNDLE.md — AI Agent Parser Data Formats

> Research compilation of actual data formats for all AI agent plugins in DeskFlow.
> Machine: Windows 11, user `cleme`.

---

## 1. Plugin Architecture

### Parser Interface (`src/main.ts:324-335`)
```typescript
interface AIAgentPlugin {
    id: string;
    name: string;
    color: string;
    detect(): Promise<boolean>;
    getStoragePaths(): string[];
    parse(filePath: string): Promise<ParsedSession[]>;
    parseDir(dirPath: string): Promise<ParsedSession[]>;
    extractTokensFromRow?: (row: any) => { inputTokens; outputTokens; cacheReadTokens?; cacheWriteTokens? };
    parseSQLite?: (dbPath: string) => Promise<ParsedSession[]>;
    parseJson?: (filePath: string) => Promise<ParsedSession[]>;
}
```

### Registered plugins (`src/main.ts:1434-1443`)
```typescript
const AI_AGENT_PLUGINS = [
    ClaudeCodePlugin, CursorPlugin, OpenCodePlugin,
    GeminiPlugin, CodexPlugin, KiloCodePlugin, QwenPlugin, AiderPlugin,
];
```

### ParsedSession Interface (`src/main.ts:309-322`)
```typescript
interface ParsedSession {
    sessionId: string;
    timestamp: Date;
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    reasoningTokens?: number;
    model?: string;
    provider?: string;
    durationMs?: number;
    projectPath?: string;
    messageCount?: number;
    cost?: number;
}
```

### Sync flow (`src/main.ts:1481-1554`)
1. Runs `plugin.detect()` — if false, skips entire plugin
2. Gets `plugin.getStoragePaths()` — iterates each path
3. `getDirDataSignature()` computes `{ fileCount, latestMtime }` — skips if unchanged from cache
4. Calls `parseDir()` (directory) or `parse()` (file)
5. Inserts/updates sessions in SQLite `ai_sessions` table

---

## 2. Working Parsers (Verified)

### OpenCode (`src/main.ts:512-614`)
- **Detection**: `~/.local/share/opencode/opencode.db` exists
- **Format**: SQLite, `session` table + `message` table with JSON `data` column
- **Token extraction**: `msg.data.tokens.input`, `msg.data.tokens.output`, `msg.data.tokens.cache.read`, `msg.data.tokens.cache.write`, `msg.data.tokens.reasoning`
- **Status**: ✅ Working

### Codex CLI (`src/main.ts:827-1058`)
- **Detection**: `~/.codex` directory exists
- **Format**: `logs_2.sqlite` with `logs` table, `feedback_log_body` containing `response.completed` events
- **Token extraction**: JSON format `{"usage": {"input_tokens": N, "output_tokens": N}}` or key=value format `input_token_count=N output_token_count=N`
- **Status**: ✅ Working (was fixed in v4.56)

---

## 3. NON-Working Parsers — With Actual Data

### Claude Code Plugin (`src/main.ts:368-510`)

**Parser expectations:**
- `detect()`: `~/.claude/projects/` must exist ✅ (DOES exist)
- `parse()`: Reads `.jsonl` files, looks for `type: "assistant"` entries, extracts `message.usage.input_tokens` / `message.usage.output_tokens`
- Falls back to `entry.usage` / `entry.tokenUsage` / `entry.tokens` for non-assistant entries
- `parseDir()`: Walks `~/.claude/projects/` recursively for `.jsonl` files

**Actual data path:** `~/.claude/projects/C--Users-cleme-Documents-COMPUTAH-SAYENCE-App-Tracker/<uuid>.jsonl`
- Multiple files exist with varying UUID filenames

**Actual JSONL structure:**
```json
{"parentUuid":"...","isSidechain":false,"type":"user","uuid":"...","timestamp":"...","message":{"id":"...","content":[...],"role":"user"}}
{"parentUuid":"...","isSidechain":false,"type":"assistant","uuid":"...","timestamp":"...","message":{"id":"...","container":null,"model":"<synthetic>","role":"assistant","stop_reason":"stop_sequence","stop_sequence":"","type":"message","usage":{"input_tokens":0,"output_tokens":0,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"server_tool_use":{...},"service_tier":null,"cache_creation":{"ephemeral_1h_input_tokens":0,"ephemeral_5m_input_tokens":0}}}}
```

**Key findings:**
1. `type: "assistant"` → `message.usage` EXISTS with correct structure, but ALL values are 0 (for `<synthetic>` model)
2. Some files have `type: "assistant"` entries where `message.usage` doesn't exist at all
3. Non-assistant entries have token data scattered — some `type: "user"` entries have no token data at all
4. The `entry.message.model` is `"<synthetic>"` — not a real model name → parser falls back to empty string

**Real issue hypothesis:** Claude Code stores token data differently — the JSONL lines might record usage data in entries with a DIFFERENT type or structure than what the parser expects. The `type: "assistant"` entries with tokens=0 suggest token usage is tracked elsewhere in the file (maybe in entries with `container.feedbackLoop` or similar).

### Qwen Plugin (`src/main.ts:1060-1194`)

**Parser expectations:**
- `detect()`: `~/.qwen/projects/` exists ✅
- `parse()`: Reads `.jsonl` files in `chats/` subdirectories
- Two token extraction paths:
  1. `type === "system" && subtype === "ui_telemetry"` → `entry.systemPayload.uiEvent.input_token_count` / `output_token_count`
  2. `type === "assistant" && entry.usageMetadata` → `usageMetadata.promptTokenCount` / `candidatesTokenCount`

**Actual data path:** `~/.qwen/projects/c--users-cleme-documents-computah-sayence-app-tracker/chats/<uuid>.jsonl`

**Actual JSONL structure — `type: "system", subtype: "ui_telemetry"`:**
```json
{"uuid":"...","parentUuid":"...","sessionId":"...","timestamp":"...","type":"system","cwd":"...","version":"0.11.1","gitBranch":"main","subtype":"ui_telemetry","systemPayload":{"uiEvent":{"event.name":"qwen-code.api_response","event.timestamp":"...","response_id":"chatcmpl-..."}}}
```
- Note: `uiEvent` has `event.name` and `response_id`, but NO token count fields like `input_token_count` or `output_token_count`. The parser's first path hits the `if (uiEvent)` check, but then `uiEvent.input_token_count` evaluates to 0 for every entry.

**Actual JSONL structure — `type: "assistant"`:**
```json
{"uuid":"...","parentUuid":"...","sessionId":"...","timestamp":"...","type":"assistant","cwd":"...","version":"0.11.1","gitBranch":"main","model":"coder-model","usageMetadata":{"promptTokenCount":13472,"candidatesTokenCount":101,"thoughtsTokenCount":24,"totalTokenCount":13573,"cachedContentTokenCount":0}}
```
- This path WORKS correctly — `usageMetadata` exists with the expected field names
- **But:** Only assistant lines have usageMetadata. For a session with 34 lines, there are ~17 assistant lines with data, and ~17 `ui_telemetry` lines that contribute 0 tokens.

**Count issue at line 1159:** `Math.floor(vals.messageCount / 2)` — divides by 2 to estimate user+assistant pairs, but `messageCount` already only counts `type: 'user'` and `type: 'assistant'` lines (line 1123-1125). So it's dividing an already-correct count by 2, which underestimates messages.
  - If there are 17 user + 17 assistant = 34 counted messages, it reports 34/2 = 17
  - Correct would be: either don't divide, or count differently

**Data summary:**
| File | Lines | Assistant lines with usageMetadata | Total promptTokens | Total candidatesTokens |
|------|-------|------------------------------------|--------------------|----------------------|
| `1990b0bc-...jsonl` | 34 | ~17 | ~290K | ~2.5K |
| Other files | varies | varies | varies | varies |

**Total data by project folder:**
- `app-tracker/`: 1 chat file, 34 lines
- Other projects (Vault, ...): MASSIVE files (up to 58MB, thousands of lines)

### KiloCode Plugin (`src/main.ts:1357-1431`)

**Parser expectations:**
- `detect()`: `~/.kilocode/globalStorage/kilo code.kilo-code/tasks` must exist ✅ (DOES exist)
- `parse()`: Reads files as JSON, looks for `task.tokens.promptTokens` / `task.tokens.completionTokens` / `task.tokens.input` / `task.tokens.output`
- `parseDir()`: Walks directory recursively looking for files

**Actual path structure:**
```
~/.kilocode/globalStorage/kilo code.kilo-code/tasks/
├── 019cd173-f301-721d-8c06-7f93c4e410bc/        ← DIR
│   ├── api_conversation_history.json              (24KB)
│   └── ui_messages.json                           (1KB)
├── 019cd175-819e-724d-83c9-3ff5c4cf54dd/        ← DIR
│   ├── api_conversation_history.json              (13KB)
│   └── ui_messages.json                           (6KB)
└── 019cd177-ed03-71a3-aea3-0fdca80381d9/        ← DIR
    ├── api_conversation_history.json              (36KB)
    └── ui_messages.json                           (8KB)
```

**Actual file formats:**
- `api_conversation_history.json`: **Flat array** `[{role: "user"|"assistant", content: [...], ts: number}]` — NO tokens field exists
- `ui_messages.json`: **Object** `{type, text, say, images, ts}` — NO tokens field exists

**Key findings:**
1. `detect()` returns `true` ✅ — the `tasks/` directory exists
2. The UUID items inside `tasks/` are **DIRECTORIES**, not files. `parseDir()` at line 1409-1430 does `fs.readdirSync(dirPath)`, recurses into subdirectories (line 1417-1419), and calls `parse()` on each file found.
3. **MAJOR FORMAT MISMATCH**: The parser expects `{tokens: {promptTokens, completionTokens, ...}}` (line 1387-1388). The actual files contain **no token data at all**. Neither `api_conversation_history.json` nor `ui_messages.json` has any token/cost/usage field. KiloCode likely tracks token usage server-side.
4. Permission denied (EACCES) when KiloCode is running — files locked by the KiloCode process.
5. **No token data in local files** = No sessions will ever be parsed, even if the format check is fixed. The parser would need to either: (a) scrape token info from the conversation text content (e.g., "Current Cost" in environment_details), or (b) count messages and estimate.

### Gemini CLI Plugin (`src/main.ts:617-825`)

**Parser expectations:**
- `detect()`: `~/.gemini/tmp/` or `~/.gemini/history/` exists ✅
- `parseDir()`: Walks `tmp/<project_hash>/chats/` for `.json`/`.jsonl` files, OR checks `tmp/<project_hash>/logs.json`

**Actual data:**
- `~/.gemini/tmp/app-tracker/chats/logs.json` — **DOES NOT EXIST** (I may have misread earlier or it was cleaned up)
- `.gemini` directory exists, `tmp/` exists

**JSONL format (if it exists):**
- Lines with `$set` type (MongoDB-style) — parser skips these
- Lines with `type === "gemini"` — parser processes these
- Token data: `entry.tokens.input`, `entry.tokens.output`, `entry.tokens.cached`
- Session header line: first line with `sessionId` and no `type` field

### Cursor Plugin (`src/main.ts:1247-1352`)

**Parser expectations:**
- `detect()`: `%APPDATA%/Cursor/User/globalStorage/state.vscdb` must exist
- `parse()`: Opens SQLite, queries `cursorDiskKV` table for `bubbleId:%` entries

**Actual data:**
- `C:\Users\cleme\AppData\Roaming\Cursor\` — **DOES NOT EXIST** on this machine
- `%APPDATA%=C:\Users\cleme\AppData\Roaming`
- Cursor is simply not installed here. Plugin correctly shows nothing.
- If Cursor were installed, the `state.vscdb` SQLite file would need a `cursorDiskKV` table with `key` (like `bubbleId:<uuid>`) and `value` columns.

### Aider Plugin (`src/main.ts:1196-1245`)

**Parser expectations:**
- `detect()`: `~/.oobo/aider-analytics.jsonl` must exist
- `parse()`: Reads JSONL, looks for `event: "message_send"` or `event: "api_call"`

**Actual data:**
- `~/.oobo/` — DOES NOT EXIST on this machine
- Aider may not be installed

### GitHub Copilot

- No parser plugin exists in DeskFlow
- No local data directory known (Copilot is cloud-based)

---

## 4. Cache Invalidation

### `getDirDataSignature()` (`src/main.ts:1451-1478`)
```typescript
const RELEVANT_EXTS = new Set(['.jsonl', '.json', '.db', '.sqlite']);
```
- Walks the plugin storage path recursively
- Counts files with relevant extensions and tracks latest mtime
- If unchanged from previous sync → skips the plugin entirely
- **Impact**: If a plugin's directory exists but its files haven't changed -> plugin is SKIPPED even if parser is broken. If files change AND parser is broken -> empty results get saved. But the first detection might have saved zero sessions, and subsequent runs are skipped if files didn't change.

### Sync state persistence (`src/main.ts:1481-1554`)
- `loadAISyncState()` loads previous `{ mtime, fileCount }` per plugin per path
- If current signature matches previous → `continue` (skip entire plugin)
- **Caveat on first run**: Always runs because `prevState` is undefined

---

## Summary Table

| Plugin | detect() | Has Data? | Root Cause | Fix Needed? |
|--------|----------|-----------|------------|-------------|
| **OpenCode** | ✅ | ✅ Working | — | No |
| **Codex CLI** | ✅ | ✅ Working | — | No |
| **Gemini CLI** | ✅ | ❓ `logs.json` not found at expected path | Wrong path or file format changed | Investigate path |
| **Claude Code** | ✅ | ✅ JSONL exists, tokens are all 0 | `<synthetic>` model ID entries have 0 tokens; real data may be in diff entry types | Yes — find correct entry type |
| **Qwen CLI** | ✅ | ✅ JSONL exists, tokens in `usageMetadata` | Parser checks `input_token_count` (wrong field); actual field is `usageMetadata.promptTokenCount`; also messageCount/2 is wrong | Yes — field name + message count |
| **KiloCode** | ✅ | ✅ Files exist, no token data anywhere | Local files (`api_conversation_history.json`, `ui_messages.json`) contain no token/cost fields; tokens are server-side | Major — different approach needed |
| **Cursor** | ❌ | ❌ Cursor not installed | Tool not on this machine | Install Cursor to test |
| **Aider** | ❌ | ❌ Aider not installed | Tool not on this machine | Install Aider to test |
| **GitHub Copilot** | N/A | N/A | No parser exists | Needs new plugin created |

## 5. Frontend: IDEProjectsPage.tsx AGENT_CONFIG

The visible agent cards are built from two sources:
1. Agents found in the database (real sessions)
2. Agents listed in `AGENT_CONFIG` (shown as "inactive" if no DB data)

All 8 plugins are in AGENT_CONFIG. If `syncAllAIAgents()` returns 0 sessions for a plugin, the card shows "No data" / "inactive" state.
