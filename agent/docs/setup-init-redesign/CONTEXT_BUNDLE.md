# Setup vs Initialize — CONTEXT_BUNDLE

## 1. Current Architecture

There are TWO buttons in the IDE workspace header (`src/pages/IDEProjectsPage.tsx:3387-3411`):

**Button A (green, FolderTree, currently labeled "Setup"):**
- Dispatches `trigger-provision` custom event
- `TerminalPage.tsx:1005-1026` handles it → calls `trackerMindSetup('init-all', projectId, agent)`
- One-click, no dialog, just status text in a tiny span in FilesTab
- Creates AGENTS.md, INITIALIZE.md, PROBLEMS.md, REQUESTS.md, state.md, agent/ directory

**Button B (amber, Bot, currently labeled "Initialize"):**
- Dispatches `open-new-agent` custom event
- `TerminalPage.tsx:1028-1033` handles it → opens `NewSessionDialog` with `mode='initialize'`
- Full dialog with: session name, AI agent dropdown, terminal mode (create/select), resume session ID, advanced config (context system toggles for LLM Wiki/Graphify/Skills/QMD/PARA/Automations/Design Skills), behavior settings, init file selector, system prompt editor, context map visualization

## 2. Existing Design Doc

`agent/docs/setup-init-design/RESULT.md` proposed:
- **Setup** → **Provision** (green, infrastructure one-click)
- **Initialize** → **New Agent** (amber, dialog for new agent session)
This was NOT implemented.

## 3. User's Current Intent (verbatim from multiple messages)

- "intialize should jut setup the initial stuff for the infrastructure. things that have the agnets.md and like the stuff that is MANDATORY for the infrastructure workspace to work."
- "the setup should control everything. it should be like the settings of the workspace."
- "IT SHOULD BE THAT THE INITIALIZE SHOULD BE THE ONES WITH THE PROGRESS"
- "WE HAVE DISCUSSED THIS BEFORE" — referring to the fact that Setup = updatable config panel, Initialize = one-time infrastructure

## 4. Current Button Code (IDEProjectsPage.tsx:3395-3411)

```tsx
<button
  onClick={() => window.dispatchEvent(new CustomEvent('trigger-provision'))}
  disabled={provisionStatus === 'provisioning'}
  className="px-2 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded flex items-center gap-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
  title={provisionStatus === 'provisioned' ? 'Re-setup agent directory structure' : 'Setup agent directory structure'}
>
  <FolderTree className="w-3 h-3" />
  {provisionStatus === 'provisioned' ? 'Re-setup' : 'Setup'}
</button>
<button
  onClick={() => window.dispatchEvent(new CustomEvent('open-new-agent'))}
  className="px-2 py-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs rounded flex items-center gap-1 transition-all duration-200"
  title="Start a new AI agent session"
>
  <Bot className="w-3 h-3" />
  Initialize
</button>
```

## 5. Current Handler Code (TerminalPage.tsx:1005-1033)

```tsx
const handleTriggerProvision = async () => {
  const projId = selectedProject || propProjectId;
  const proj = projects.find(p => p.id === projId);
  const projPath = propProjectPath || proj?.path;
  if (!window.deskflowAPI) return;
  setInitStatus('checking');
  try {
    const agent = localStorage.getItem('terminal-defaultAgent') || 'claude';
    const result = await window.deskflowAPI.trackerMindSetup?.('init-all', projId || undefined, agent);
    if (result?.success) {
      setInitStatus('init-ok');
      showError(`Project files created`, 'info');
    } else {
      showError('Failed to create project files', 'error');
      setInitStatus('error');
    }
  } catch (e) {
    console.error('[TerminalPage] Provision failed:', e);
    showError('Failed to create project files', 'error');
    setInitStatus('error');
  }
};

const handleOpenNewAgent = () => {
  if (!selectedProject) { showError('Please select a project first', 'warning'); return; }
  setNewSessionMode('initialize');
  setNewSessionAgent(localStorage.getItem('terminal-defaultAgent') || 'claude');
  setShowNewSessionDialog(true);
};
```

## 6. NewSessionDialog (src/components/NewSessionDialog.tsx)

- Props: `mode: 'create' | 'new-agent' | 'setup'`
- When `mode='new-agent'` or `mode='setup'`, shows full context configuration:
  - 7 system toggle cards: LLM Wiki, Obsidian Skills, Graphify, PARA, QMD Templates, Automations, Design Skills
  - Behavior toggles: summarization, deep memory
  - Token budget slider
  - Context map visualization (SVG diagram)
  - Init file selector
  - System prompt editor
  - Agent files checkboxes
  - Design skills sliders (variance, motion, density)
- When `mode='create'`, shows simplified form: name, agent, terminal, resume session ID
- `Advanced Configuration` collapsible section (chevron toggle)
- `buildPreview()` assembles full context via `assembleContext()` from ContextService

## 7. trackerMindSetup IPC Handler (main.ts:10127-10430)

The `trackerMindSetup` handler accepts `(step, projectId, agentName)`:
- `'init-all'` runs ALL sub-steps sequentially:
  1. Creates `agent/` directory (+ skills subdirectory)
  2. Creates/updates `AGENTS.md` with file listing
  3. Creates `INITIALIZE.md` with setup guide
  4. Creates `PROBLEMS.md` with template structure
  5. Creates `REQUESTS.md` with template structure
  6. Creates `state.md` with initial state
  7. Creates `problems.json`, `requests.json`, `checklists.json` with empty arrays
  8. Creates `COMMITS.md`, `HUMAN_TEST_CHECKLIST.md`, `REQUESTS.md`
  9. Creates FEATURE_TRACKER.md, WORKSPACE_CONTEXT.md
  10. Sets up `graphify-out/` directory
  11. Creates SKILL.md templates
- Returns `{ success: true }` when complete

## 8. initStatus State

```tsx
const [initStatus, setInitStatus] = useState<'idle' | 'checking' | 'ready' | 'init-ok' | 'error'>('idle');
```
Currently only rendered as tiny text in FilesTab (TerminalPage.tsx:3469-3474). No modal, no progress, no visual feedback.

## 9. provisionStatus State (IDEProjectsPage.tsx:185)

```tsx
const [provisionStatus, setProvisionStatus] = useState<'idle' | 'provisioning' | 'provisioned'>('idle');
```
Used solely to disable the Setup button during provisioning. No UI otherwise.

## 10. Design Tokens & Patterns Used

- Buttons: `px-2 py-1 text-xs rounded flex items-center gap-1 transition-all duration-200`
- Glass modals: `bg-zinc-800 rounded-xl p-6 border border-zinc-700 shadow-2xl`
- Progress indicators: `h-1.5 bg-zinc-800 rounded-full overflow-hidden` with gradient fills
- Status dots: `w-1.5 h-1.5 rounded-full bg-{color}-500`
- Icon colors: green-700/600, amber-600/orange-600, gradient variants
- NewSessionDialog uses: `bg-zinc-800 rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto`

## 11. Files Involved

| File | Role |
|------|------|
| `src/pages/IDEProjectsPage.tsx` | Renders the two buttons, has provisionStatus |
| `src/pages/TerminalPage.tsx` | Handles `trigger-provision` and `open-new-agent` events |
| `src/components/NewSessionDialog.tsx` | The full dialog with context config (currently labeled Initialize) |
| `src/main.ts` | `trackerMindSetup` IPC handler (infrastructure creation) |
| `agent/docs/setup-init-design/RESULT.md` | Previous design (unimplemented) |
| `src/lib/defaults.ts` | Default agent, default system prompt |
