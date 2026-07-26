# CONTEXT_BUNDLE.md — NewSessionDialog UI Revamp

## Overview

The `NewSessionDialog` is a modal dialog used for creating new AI agent sessions in the DeskFlow terminal workspace. It serves 3 modes:
- `create` — basic session creation (name, agent, terminal selection)
- `new-agent` — full agent setup with context systems configuration
- `setup` — workspace initialization with all context systems visible

The dialog is 1201 lines of inline JSX with no component decomposition. It works but looks like a form dump — no visual hierarchy, no step flow, no progressive disclosure beyond one "Advanced Configuration" toggle.

## Current File: `src/components/NewSessionDialog.tsx`

### Props Interface (lines 91-104):
```typescript
interface NewSessionDialogProps {
  open: boolean;
  mode?: 'create' | 'new-agent' | 'setup';
  onClose: () => void;
  onCreate: (config: SessionConfig) => void;
  projectPath: string;
  projectId?: string;
  projectPrompt?: string;
  terminalTabs: Record<string, { name: string; agent: string }>;
  defaultAgent: string;
  initialTerminalMode?: 'create' | 'select';
  initialSelectedTerminal?: string;
  defaultName?: string;
}
```

### SessionConfig Interface (lines 18-57):
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
  initContent?: string;
  problemIds?: string[];
  requestIds?: string[];
  modelTier?: 'top' | 'mid' | 'low';
  contextConfig?: {
    total_token_budget: number;
    model_tier: 'top' | 'mid' | 'low';
    systems: {
      llm_wiki: { enabled: boolean; max_tokens: number };
      obsidian_skills: { enabled: boolean; max_tokens: number };
      graphify: { enabled: boolean; include_summary: boolean; max_tokens: number };
      para: { enabled: boolean; max_tokens: number };
      qmd: { enabled: boolean; max_tokens: number };
      automations: { enabled: boolean; max_tokens: number };
      design_skills: {
        enabled: boolean; max_tokens: number; skills: string[];
        levels: { design_variance: number; motion_intensity: number; visual_density: number };
        include_references: boolean;
      };
    };
    summarization: { enabled: boolean; message_threshold: number };
    deep_memory: { enabled: boolean; pattern_detection: boolean };
  };
}
```

### Supported Agents (lines 10-16):
```typescript
const SUPPORTED_AGENTS = [
  { id: 'claude', name: 'Claude Code' },
  { id: 'opencode', name: 'OpenCode' },
  { id: 'aider', name: 'Aider' },
  { id: 'codex', name: 'Codex CLI' },
  { id: 'gemini', name: 'Gemini CLI' },
];
```

### Current State Variables (lines 413-458):
40+ useState hooks managing: name, agentType, terminalMode, selectedTerminal, includeDefaultInit, customInitFile, customSystemPrompt, generalAdditions, initFiles, agentFiles, selectedAgentFiles, agentsMdContent, loadingAgentsMd, includeAgentsMd, includeGraphify, includeQMD, includeSkills, showPreview, previewContent, totalBudget, ctxLLMWiki, ctxSkills, ctxGraphify, ctxPara, ctxQMD, ctxAutomations, ctxSummarization, ctxDeepMemory, showAdvanced, ctxSystemData, ctxLastSynced, ctxLoadFailed, refreshingId, verifySignal, ctxShowMap, resumeSessionId, resumeSession, resumeError, resumeChecking, resumeCliResult, ctxDesignSkills, modelTier

### Current Rendering Structure (lines 703-1200):
```
<div className="fixed inset-0 bg-black/70 backdrop-blur-md">  // Backdrop
  <div className="bg-zinc-900/95 backdrop-blur-xl rounded-xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto">  // Dialog
    // Header (title + close button)
    // Session Name input
    // AI Agent select
    // Model Tier select
    // Terminal selection (create new / use existing)
    // --- Divider ---
    // Resume Session ID (create mode only)
    // Advanced Configuration toggle
    // Context Systems toggle cards (setup/new-agent modes)
    // Design Skills section
    // Context Map Visualization
    // Behavior toggles
    // Agent files selection
    // Preview Init Content button
    // --- Divider ---
    // System Prompt section (always visible)
    // Cancel / Create buttons
  </div>
</div>
```

### Key Sub-components (inline, not extracted):
- `SystemToggleCard` (lines 140-306) — toggle card for each context system with health dots, verify buttons
- `ContextMapVisualization` (lines 317-397) — SVG visualization of context system connections
- `formatRelTime` (lines 308-315) — relative time formatter
- `staleClass` (lines 115-121) — CSS class for stale data
- `deriveHealth` (lines 106-113) — derives health status from backend system data

### Design Tokens Currently Used:
```
Background:     bg-zinc-900/95 (dialog), bg-zinc-900/80 (inputs), bg-zinc-900/70 (sections)
Border:         border-zinc-700/50 (dialog), border-zinc-800/50 (sections)
Accent:         cyan-500 (primary action), amber-600/orange-600 (setup mode)
Text:           text-white (headings), text-zinc-300 (body), text-zinc-400 (secondary), text-zinc-500 (labels)
Rounded:        rounded-xl (dialog), rounded-lg (inputs/cards), rounded-md (small elements)
Font:           text-sm (inputs), text-xs (labels), text-[10px] (micro labels), text-[9px] (tags)
```

### IPC Endpoints Used:
- `getPreferences` — loads saved preferences (system prompts, token budget, workspace config)
- `getContextSystems` — fetches backend system status (health, item counts, last built)
- `listInitFiles` — lists available init files in project
- `listAgentDirFiles` — lists files in agent/ directory
- `readAgentFileContent` — reads specific agent file content
- `getTerminalSessionById` — looks up session by ID for resume
- `checkSessionExists` — CLI check for session existence

### How Dialog Is Opened (from TerminalPage.tsx):
```typescript
// Three trigger paths:
1. "New Session" button → mode='create', opens dialog
2. "New Agent" button → mode='new-agent' (called 'initialize' internally)
3. "Provision" button → mode='setup' (called 'setup' internally)
```

## Design System Reference

### Color Palette:
- Primary: pink-500 (page accent varies per page)
- Info: cyan-400
- Success: emerald-400
- Warning: amber-400
- Error: red-400
- Background: zinc-950 (base), zinc-900 (elevated), zinc-900/50 (glass)

### Typography:
- Font family: Geist (sans) + JetBrains Mono (code)
- Scale: 12, 14, 16, 18px (modular 1.25 ratio)
- Weight: 400 (body), 500 (labels), 600 (headings)

### Component Patterns:
- Glass cards: `bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-xl`
- Inputs: `bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-white text-sm`
- Buttons: gradient backgrounds with hover glow effects
- Toggle switches: custom CSS toggles with accent colors

## Known Issues with Current Design:
1. **No step flow** — everything is shown at once in a scrollable modal
2. **No visual hierarchy** — all sections look equally important
3. **40+ state variables** — complex internal state makes refactoring hard
4. **No loading skeleton** — context systems show "..." while loading
5. **No empty state design** — when no systems are configured, just shows empty grid
6. **Context Map SVG is decorative** — doesn't provide actionable information
7. **System Prompt section is always visible** — takes up space even in create mode
8. **No keyboard navigation** — can't tab through fields logically
9. **No mobile responsiveness** — fixed max-w-lg, no breakpoint adjustments
10. **Advanced Configuration toggle is buried** — users might miss important settings
