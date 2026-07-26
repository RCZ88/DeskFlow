# CONTEXT_BUNDLE.md — Skill DSL Generation

## Overview

The DSL generation feature enables per-skill "Generate DSL UI" buttons that send skill content + SKILL_DSL_GUIDE.md to OpenRouter AI, generates YAML frontmatter, and writes it to the skill's SKILL.md file.

## Relevant Source Code

### IPC Handler (`src/main.ts` — lines 11558-11730)

```typescript
ipcMain.handle('generate-skill-dsl', async (_, data: {
  skillId: string;
  skillName: string;
  skillDescription: string;
  skillContent: string;
  projectPath?: string;
  instructions?: string;
  terminalId?: string;
}) => { ... });
```

Handler:
1. Reads `agent/skills/SKILL_DSL_GUIDE.md` as reference spec
2. Reads last 20 messages from terminal_messages DB if terminalId provided
3. Calls OpenRouter API with system prompt + user prompt
4. Extracts JSON `{ frontmatter: string (YAML), analysis: string }` from response
5. Strips old `inputs:`/`outputs:` lines from existing SKILL.md, inserts new frontmatter
6. Acquires file lock, writes file, broadcasts `context-changed` to all windows

### Preload Bridge (`src/preload.ts`)

```typescript
generateSkillDSL: (data: {
  skillId: string;
  skillName: string;
  skillDescription: string;
  skillContent: string;
  projectPath?: string;
  instructions?: string;
  terminalId?: string;
}) => ipcRenderer.invoke('generate-skill-dsl', data),
```

### UI — DSL Button & Modal (`src/pages/TerminalPage.tsx`)

- **DSL button** on each skill card (after skill description, before "Edit" button): `<button onClick={() => openDSLModal(skill)} className="...">DSL</button>`
- **DSL generation modal** with:
  - Progress steps: Read Guide ✅ → AI Generate (pending) → Apply → Done
  - Terminal picker dropdown (select from open terminals)
  - Custom instructions textarea
  - Error display
  - Result preview (frontmatter YAML + analysis)
- State vars: `dslSkill`, `dslStage`, `dslProgressMsg`, `dslInstructions`, `dslTerminalId`, `dslResult`, `dslError`

### DSL Parser (`src/services/SkillDSLParser.ts` — line 187)

```typescript
// .trimStart() before frontmatter regex to handle leading blank lines
```

### Skills Service (`src/services/SkillsService.ts` — line 104)

```typescript
// Same .trimStart() fix
```

### Enhanced Frontmatter Example (`agent/skills/generate-prompt/SKILL.md`)

14 inputs across 8 DSL widget types (select, radio, textarea, file, slider, tags, checkbox, switch) in 3 groups (Basic, Content, Advanced). 3 outputs (Design Prompt, Component Breakdown, Context Bundle). 5 components.

## Data Structures

### OpenRouter API Config

```
OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions'
OPENROUTER_MODELS[0] = 'liquid/lfm-2.5-1.2b-instruct:free'
```

API key priority: localStorage `openrouter_api_key` → env `OPENROUTER_API_KEY` → `settings` DB table.

### AI Response Format

```json
{
  "frontmatter": "inputs:\n  - name: Example\n    type: text\n    ...",
  "analysis": "Generated 3 inputs: prompt type, context, and output format"
}
```

### Skill File Format (SKILL.md)

```markdown
---
id: skill-id
name: Skill Name
description: Skill description
inputs:
  - name: Input Name
    type: enum|textarea|file|number|boolean|multienum
    ...
outputs:
  - name: Output Name
    type: markdown|list|file
    ...
---
# Skill Content...
```

### File Lock System (`src/main.ts` — line 6322-6378)

```typescript
const fileLocks = new Map<string, { heldBy: string; acquiredAt: number }>();
const LOCK_TTL = 60000; // 60 seconds

function acquireLock(filePath: string, holderId: string, ...) { ... }
function releaseLock(filePath: string, holderId: string) { ... }
```

### Cross-Session Broadcast (`src/main.ts` — line 13261-13277)

```typescript
ipcMain.handle('broadcast-context-delta', async (_, data) => {
  const windows = require('electron').BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('context-changed', {
        type: data.type, action: 'broadcast',
        source: data.terminalId, payload: data.payload,
        timestamp: Date.now(),
      });
    }
  }
});
```

## IPC Endpoints

| Channel | Direction | Payload | Response |
|---------|-----------|---------|----------|
| `generate-skill-dsl` | Renderer → Main | `{ skillId, skillName, skillDescription, skillContent, projectPath?, instructions?, terminalId? }` | `{ success, data?: { frontmatter, analysis }, error? }` |
| `get-terminal-sessions` | Renderer → Main | — | `{ sessions: [{ id, name, status }] }` |
| `broadcast-context-delta` | Renderer → Main | `{ terminalId, type, payload }` | `{ success, sentCount }` |

## Design Tokens

- Buttons: `bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-medium`
- Success: `bg-emerald-500/20 text-emerald-300 border-emerald-500/30`
- Error: `bg-red-500/20 text-red-300 border-red-500/30`
- Progress steps: `text-indigo-400` (active), `text-emerald-400` (done), `text-gray-500` (pending)
- Modal: `bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-2xl`
- Terminal picker: `<select>` with `bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm`

## Architecture Notes

**Data flow:**
1. User clicks "DSL" button on skill card → `openDSLModal(skill)` sets `dslSkill`
2. Modal renders 4 progress stages with current stage highlighted
3. "Generate DSL" button → calls `deskflowAPI.generateSkillDSL(data)`
4. Main process loads SKILL_DSL_GUIDE.md → calls OpenRouter → parses JSON response
5. Response is written to SKILL.md (lock acquired, broadcast sent)
6. Modal shows "Complete" with result preview
7. UI auto-refreshes via 10s skills polling

**File paths:**
- Project skills: `{projectPath}/agent/skills/{skillId}.md`
- User skills: `{userDataPath}/agent/skills/{skillId}.md`
- DSL guide: `{projectPath}/agent/skills/SKILL_DSL_GUIDE.md`
