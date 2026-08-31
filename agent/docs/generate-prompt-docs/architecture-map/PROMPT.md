# PROMPT.md — Architecture Map: Full Codebase Scan with Code References

## ⚠️ CRITICAL: External AI has NO file access

You are an external AI (ChatGPT, Claude, etc.) with NO access to the project files.
The context bundle (`CONTEXT_BUNDLE.md`) contains ALL the code you need verbatim.
Do NOT say "I need to read the file" — the code is already in the context bundle.
Do NOT say "I don't have access" — everything is embedded.
Generate the architecture doc FROM THE EMBEDDED CODE ONLY.

## Instructions

Read `CONTEXT_BUNDLE.md` — it contains verbatim source code from:
- `src/App.tsx` (routes section)
- `src/pages/DashboardPage.tsx` (imports section)
- `src/preload.ts` (bridge pattern)
- `src/main.ts` (IPC handler patterns)
- `src/main/archMap/scanner.ts` (scanner logic)
- Full file structure
- IPC channel inventory

Using ONLY the embedded code, generate `ARCHITECTURE.md` with:

### 1. App Stats
Count from the file structure: total pages (39), components (125+), services, hooks, IPC handlers (300+), total lines.

### 2. Route Map
Table: | Route | Page Component | File | Lines |
Extract every Route from the App.tsx embed. Map to page files from the file structure.

### 3. Per-Page Architecture
For each page, document:
- **File path and line count** (from file structure)
- **Imports** — categorize each import as: UI component, hook, service, lib, feature module, store
- **State variables** — every useState/useReducer, with line numbers from the embed
- **Effects** — every useEffect, with line numbers
- **IPC calls** — every window.deskflowAPI.* or ipcRenderer.invoke, with line numbers
- **Features detected** — which of: state-management, lifecycle, event-handlers, data-fetching, performance, animation, database, navigation, storage, error-handling, modal, visualization
- **Child components** — every <ComponentName> rendered, with line numbers

### 4. IPC Handler Map
Table: | Channel | Handler Location | Purpose | Called By |
Use the IPC channel inventory from the context bundle. For each channel, identify which page component calls it.

### 5. Feature Matrix
Table: | Feature | Files | Line References |
For each feature type (state-management, animation, database, etc.), list every file that has it with file:line.

### 6. Connection Graph
Text diagram showing:
- Import edges: `DashboardPage → GlassCard (import)`
- Render edges: `DashboardPage → HeroBand (renders, line 8)`
- IPC edges: `DashboardPage → getLogs (IPC, line 39)`

## Output Format

Write the complete architecture doc as `ARCHITECTURE.md`. Use markdown tables, code blocks, and hierarchical headings. Every claim must have file:line evidence.
