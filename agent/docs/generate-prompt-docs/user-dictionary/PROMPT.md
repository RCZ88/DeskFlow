# PROMPT.md — User Dictionary Manager

## ⚠️ CRITICAL: You have NO file access

You are an external AI (opencode, claude, etc.) running in a terminal.
The user's project is a DeskFlow/RHEO Electron app.
You can call IPC tools via `window.deskflowAPI` — but you are inside the TERMINAL,
not the renderer. The user will paste your output into the app, or you write to
`agent/actions.json` for the main process to execute.

## What This Prompt Does

Lets the user manage their **User Dictionary** — custom terminology that gets
injected into every AI agent's system prompt. When the user says "workspace means
X", the dictionary stores that so every future agent session knows what "workspace"
means to this user.

## IPC Interface (embedded — do NOT try to read files)

```typescript
// List all terms
window.deskflowAPI.userDictionary.list()
// Returns: { ok: boolean, entries: { id, term, definition, context, aliases, created_at }[] }

// Add or update a term
window.deskflowAPI.userDictionary.add({ term: string, definition: string, context?: string, aliases?: string[] })
// Returns: { ok: boolean, error?: string }
// If term already exists, it UPDATES the definition.

// Update a term by ID
window.deskflowAPI.userDictionary.update({ id: number, term?: string, definition?: string, context?: string, aliases?: string[] })
// Returns: { ok: boolean }

// Delete a term
window.deskflowAPI.userDictionary.delete(id: number)
// Returns: { ok: boolean }

// Export as markdown
window.deskflowAPI.userDictionary.export()
// Returns: { ok: boolean, markdown: string, count: number }

// Import entries
window.deskflowAPI.userDictionary.import(entries: Array<{ term: string, definition: string, context?: string, aliases?: string[] }>)
// Returns: { ok: boolean, imported: number }
```

## DB Schema

```sql
CREATE TABLE user_dictionary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL UNIQUE,
  definition TEXT NOT NULL,
  context TEXT DEFAULT '',
  aliases TEXT DEFAULT '[]',  -- JSON array of strings
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);
```

## How to Use

When the user says any of these, generate the corresponding action:

### Add a term
User: "add term: workspace = the terminal workspace at /terminal"
User: "workspace means the terminal area, not the app sidebar"
User: "when I say 'ws' I mean workspace"

Generate:
```
## Actions
- [user-dictionary-add] term: workspace | definition: the terminal workspace at /terminal, not the app sidebar | context: navigation | aliases: ws
```

### List terms
User: "show my dictionary"
User: "what terms do I have"

Generate:
```
## Actions
- [user-dictionary-list]
```

### Update a term
User: "update workspace definition to include the 5 subtabs"
User: "change the alias for workspace"

Generate:
```
## Actions
- [user-dictionary-update] id: <id> | definition: <new definition>
```

### Delete a term
User: "remove the term 'foo' from my dictionary"
User: "delete term foo"

Generate:
```
## Actions
- [user-dictionary-delete] id: <id>
```

### Export
User: "export my dictionary"
User: "download my terms"

Generate:
```
## Actions
- [user-dictionary-export]
```

### Import
User: "import these terms: ..." (followed by a list)

Generate:
```
## Actions
- [user-dictionary-import] entries: [{ term: "...", definition: "..." }, ...]
```

## Rules

1. **Term names are case-insensitive** — "Workspace" and "workspace" are the same
2. **Context is optional** — but helps the AI know WHEN to apply the term
   - "navigation" = the term refers to a place/route in the app
   - "action" = the term refers to something the user does
   - "data" = the term refers to a data structure or concept
3. **Aliases are optional** — alternative names for the same term
4. **The dictionary is injected into every agent's system prompt** via `assemble-context`
   — so define terms that future AI sessions should know about
5. **Define terms that the AI keeps getting wrong** — if you keep correcting the AI
   about what "workspace" means, add it to the dictionary

## Examples of Good Terms

| Term | Definition | Context | Aliases |
|------|-----------|---------|---------|
| workspace | The terminal workspace at /terminal with 5-group sidebar (Setup/Work/Insights/Studio/Context), NOT the app sidebar | navigation | ws, terminal-ws |
| conductor | Multi-agent orchestration system in Work > Swarm subtab | navigation | swarm, mission |
| provision | One-click setup that creates AGENTS.md, INITIALIZE.md, etc. | action | setup, init |
| content engine | Content creation pipeline in Overlay Studio | navigation | ce, pipeline |
| rd | Reaction-diffusion morphogen background on Life page | data | morphogen, living-substrate |
