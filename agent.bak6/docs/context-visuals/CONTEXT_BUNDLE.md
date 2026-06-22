# CONTEXT_BUNDLE: Context Systems Visual Feedback

## Overview

Self-contained code reference for the "visual feedback for context systems" feature. The backend (`main.ts`) discovers context systems on disk; the frontend (`NewSessionDialog.tsx`) displays them as toggle cards with hardcoded, stale metadata that never refreshes. The goal is to turn these into live-status cards with health indicators, real file/node counts, last-synced timestamps, and verify/sync buttons.

---

## 1. Backend — IPC Handler (`src/main.ts:8134`)

The `get-context-systems` IPC handler discovers systems by scanning files on disk:

```typescript
// src/main.ts:8134-8178
electron_1.ipcMain.handle('get-context-systems', async (_event, projectPath?: string) => {
    const projPath = projectPath || (global as any).__projectPath || '';
    if (!projPath) return { success: false, data: [] };
    const systems: any[] = [];

    // LLM Wiki — counts .md files in agent/
    const agentDir = path_1.default.join(projPath, 'agent');
    if (fs_1.default.existsSync(agentDir)) {
        const mdFiles = fs_1.default.readdirSync(agentDir).filter((f: string) => f.endsWith('.md'));
        systems.push({ id: 'llm_wiki', name: 'LLM Wiki', itemCount: mdFiles.length, itemLabel: 'files', available: true });
    }

    // Obsidian Skills — counts subdirectories in agent/skills/
    const skillsDir = path_1.default.join(agentDir, 'skills');
    if (fs_1.default.existsSync(skillsDir)) {
        const skillDirs = fs_1.default.readdirSync(skillsDir, { withFileTypes: true }).filter((d: any) => d.isDirectory());
        systems.push({ id: 'obsidian_skills', name: 'Obsidian Skills', itemCount: skillDirs.length, itemLabel: 'skills', available: true });
    }

    // Graphify — reads graph.json, returns node/edge counts
    const graphifyDir = path_1.default.join(projPath, 'graphify-out');
    if (fs_1.default.existsSync(graphifyDir)) {
        const graphFile = path_1.default.join(graphifyDir, 'graph.json');
        let nodeCount = 0, edgeCount = 0;
        if (fs_1.default.existsSync(graphFile)) {
            try {
                const g = JSON.parse(fs_1.default.readFileSync(graphFile, 'utf-8'));
                nodeCount = g.nodes?.length || 0;
                edgeCount = g.edges?.length || 0;
            } catch {}
        }
        systems.push({ id: 'graphify', name: 'Graphify', itemCount: nodeCount, itemLabel: `${nodeCount} nodes · ${edgeCount} edges`, available: true });
    }

    // PARA — counts subdirectories in CZVault/
    const paraDir = path_1.default.join(projPath, 'CZVault');
    if (fs_1.default.existsSync(paraDir)) {
        const areas = fs_1.default.readdirSync(paraDir, { withFileTypes: true }).filter((d: any) => d.isDirectory());
        systems.push({ id: 'para', name: 'PARA', itemCount: areas.length, itemLabel: 'areas', available: true });
    }

    // QMD — counts .qmd files in agent/templates/
    const templatesDir = path_1.default.join(agentDir, 'templates');
    if (fs_1.default.existsSync(templatesDir)) {
        const qmdFiles = fs_1.default.readdirSync(templatesDir).filter((f: string) => f.endsWith('.qmd'));
        systems.push({ id: 'qmd', name: 'QMD Templates', itemCount: qmdFiles.length, itemLabel: 'templates', available: true });
    }

    return { success: true, data: systems };
});
```

**Response shape:**
```typescript
{ success: true, data: Array<{
  id: string;       // 'llm_wiki' | 'obsidian_skills' | 'graphify' | 'para' | 'qmd'
  name: string;
  itemCount: number;
  itemLabel: string;
  available: boolean;
}> }
```

Also available:
- `get-session-summaries` (`src/main.ts:8181`) — reads `agent/context/session-summaries.json`
- `get-deep-memory` (`src/main.ts:8195`) — reads `agent/context/deep-memory.json`
- `get-rag-stats` (`src/main.ts:8205`) — reads `.apptracker/context/rag-index.sqlite`

---

## 2. Preload Bridge (`src/preload.ts:342`)

```typescript
// src/preload.ts:342
getContextSystems: (projectPath?: string) => ipcRenderer.invoke('get-context-systems', projectPath),
getSessionSummaries: (opts?: { limit?: number; offset?: number }) => ipcRenderer.invoke('get-session-summaries', opts),
getDeepMemory: () => ipcRenderer.invoke('get-deep-memory'),
getRAGStats: (projectPath?: string) => ipcRenderer.invoke('get-rag-stats', projectPath),
```

---

## 3. Frontend — NewSessionDialog.tsx

### 3.1 Types (`src/components/NewSessionDialog.tsx:57-68`)

```typescript
interface SystemInfo {
  id: string;
  name: string;
  icon: any;         // Lucide component reference
  accentColor: string; // Tailwind class, e.g. 'text-blue-400'
  itemCount: number;
  itemLabel: string;   // 'files', 'skills', 'nodes', 'areas', 'templates', 'automations', 'design skills'
  lastBuilt: string | null;  // ISO timestamp — always null currently
  maxTokens: number;
  enabled: boolean;
  onToggle: () => void;
}
```

### 3.2 infraStatus state (`src/components/NewSessionDialog.tsx:258`)

```typescript
const [infraStatus, setInfraStatus] = useState({ graphifyAvailable: false, qmdAvailable: false, skillsCount: 0 });
```

### 3.3 Current checkInfra function (`src/components/NewSessionDialog.tsx:383-400`)

```typescript
const checkInfra = async () => {
    if (!projectPath) return;
    try {
      const dapi = (window as any).deskflowAPI;
      if (!dapi) return;

      const graphifyResult = await dapi.readProjectFile?.('graphify-out/GRAPH_REPORT.md', projectPath);
      const graphifyExists = !!(graphifyResult?.success && graphifyResult.data);

      const qmdResult = await dapi.listAgentDirFiles?.(projectPath);
      const qmdExists = qmdResult?.success && (qmdResult.data || []).length > 0;

      const skillsResult = await dapi.getSkills?.(projectPath);
      const skillsCount = skillsResult?.success ? (skillsResult.data?.length || 0) : 0;

      setInfraStatus({ graphifyAvailable: graphifyExists, qmdAvailable: qmdExists, skillsCount });
    } catch {}
};
```

Problems:
- Only checks 3 systems (graphify, qmd, skills) — not all 7
- Uses `readProjectFile`/`listAgentDirFiles`/`getSkills` individually instead of `getContextSystems`
- Items counts are mostly hardcoded (e.g., graphify shows `1` node or `0` nodes, not real count)
- `lastBuilt` is always `null`
- Never refreshes after mount

### 3.4 Systems array construction (`src/components/NewSessionDialog.tsx:666-674`)

```typescript
const systems: SystemInfo[] = [
  { id: 'llm_wiki', name: 'LLM Wiki', icon: BookOpen, accentColor: 'text-blue-400',
    itemCount: agentFiles.filter(f => !f.path.includes('skills') && !f.path.includes('templates')).length,
    itemLabel: 'files', lastBuilt: null, maxTokens: 2000, enabled: ctxLLMWiki, onToggle: () => setCtxLLMWiki(!ctxLLMWiki) },
  { id: 'obsidian_skills', name: 'Obsidian Skills', icon: Zap, accentColor: 'text-purple-400',
    itemCount: infraStatus.skillsCount, itemLabel: 'skills', lastBuilt: null, maxTokens: 500, enabled: ctxSkills, onToggle: () => setCtxSkills(!ctxSkills) },
  { id: 'graphify', name: 'Graphify', icon: Network, accentColor: 'text-cyan-400',
    itemCount: infraStatus.graphifyAvailable ? 1 : 0, itemLabel: infraStatus.graphifyAvailable ? 'nodes' : 'not configured', lastBuilt: null, maxTokens: 500, enabled: ctxGraphify, onToggle: () => setCtxGraphify(!ctxGraphify) },
  { id: 'para', name: 'PARA', icon: FolderTree, accentColor: 'text-teal-400',
    itemCount: 0, itemLabel: 'areas', lastBuilt: null, maxTokens: 300, enabled: ctxPara, onToggle: () => setCtxPara(!ctxPara) },
  { id: 'qmd', name: 'QMD Templates', icon: FileText, accentColor: 'text-amber-400',
    itemCount: infraStatus.qmdAvailable ? 1 : 0, itemLabel: infraStatus.qmdAvailable ? 'templates' : 'none', lastBuilt: null, maxTokens: 200, enabled: ctxQMD, onToggle: () => setCtxQMD(!ctxQMD) },
  { id: 'automations', name: 'Automations', icon: Bot, accentColor: 'text-rose-400',
    itemCount: 0, itemLabel: 'automations', lastBuilt: null, maxTokens: 100, enabled: ctxAutomations, onToggle: () => setCtxAutomations(!ctxAutomations) },
  { id: 'design_skills', name: 'Design Skills', icon: Palette, accentColor: 'text-pink-400',
    itemCount: infraStatus.skillsCount, itemLabel: 'design skills', lastBuilt: null, maxTokens: 800, enabled: ctxDesignSkills, onToggle: () => setCtxDesignSkills(!ctxDesignSkills) },
];
```

Problems:
- Item counts are stale — only computed on mount, never from live backend response
- `itemLabel` for graphify mentions "nodes" but count is always 0 or 1
- PARA and automations always show `0` items
- No health status field
- No `lastChecked` or `lastSynced` field

### 3.5 SystemToggleCard component (`src/components/NewSessionDialog.tsx:84-137`)

```typescript
function SystemToggleCard({ system }: { system: SystemInfo }) {
  const toggleColors = {
    llm_wiki: { on: 'bg-blue-500/40', off: 'bg-zinc-700' },
    obsidian_skills: { on: 'bg-purple-500/40', off: 'bg-zinc-700' },
    graphify: { on: 'bg-cyan-500/40', off: 'bg-zinc-700' },
    para: { on: 'bg-teal-500/40', off: 'bg-zinc-700' },
    qmd: { on: 'bg-amber-500/40', off: 'bg-zinc-700' },
    automations: { on: 'bg-rose-500/40', off: 'bg-zinc-700' },
    design_skills: { on: 'bg-pink-500/40', off: 'bg-zinc-700' },
  };
  const dotColors = {
    llm_wiki: { on: 'left-3.5 bg-blue-400', off: 'left-0.5 bg-zinc-500' },
    obsidian_skills: { on: 'left-3.5 bg-purple-400', off: 'left-0.5 bg-zinc-500' },
    graphify: { on: 'left-3.5 bg-cyan-400', off: 'left-0.5 bg-zinc-500' },
    para: { on: 'left-3.5 bg-teal-400', off: 'left-0.5 bg-zinc-500' },
    qmd: { on: 'left-3.5 bg-amber-400', off: 'left-0.5 bg-zinc-500' },
    automations: { on: 'left-3.5 bg-rose-400', off: 'left-0.5 bg-zinc-500' },
    design_skills: { on: 'left-3.5 bg-pink-400', off: 'left-0.5 bg-zinc-500' },
  };
  const c = toggleColors[system.id as keyof typeof toggleColors];
  const d = dotColors[system.id as keyof typeof dotColors];
  return (
    <div className={`border rounded-xl p-3 transition-all duration-200 ${
      system.enabled
        ? 'bg-zinc-800/40 border-zinc-600/40 shadow-[0_1px_4px_rgba(0,0,0,0.1)]'
        : 'bg-zinc-900/30 border-zinc-700/30 opacity-60 hover:opacity-80'
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded-md ${system.enabled ? 'bg-zinc-800/60' : 'bg-zinc-800/20'}`}>
            <system.icon className={`w-3.5 h-3.5 ${system.accentColor}`} />
          </div>
          <span className="text-[11px] text-zinc-300 font-medium">{system.name}</span>
        </div>
        <button onClick={system.onToggle}
          className={`w-8 h-4 rounded-full transition-all duration-200 relative ${
            system.enabled ? c.on : 'bg-zinc-700'
          }`}>
          <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200 shadow-sm ${
            system.enabled ? d.on : 'left-0.5 bg-zinc-400'
          }`} />
        </button>
      </div>
      <div className="text-[9px] text-zinc-500 leading-relaxed">
        {system.itemCount > 0 ? `${system.itemCount} ${system.itemLabel}` : system.itemLabel}
        <span className="text-zinc-600 mx-1">·</span>
        ~{system.maxTokens} tokens
        {system.lastBuilt ? <span className="text-zinc-600"> · Built {formatRelTime(system.lastBuilt)}</span> : ''}
      </div>
    </div>
  );
}
```

### 3.6 ContextMapVisualization (`src/components/NewSessionDialog.tsx:148-240`)

SVG-based node graph showing systems as circles with edges. Hardcoded positions and connections. Active systems glow, inactive are dimmed. Shows token usage bar.

### 3.7 Advanced Configuration default (`src/components/NewSessionDialog.tsx:273`)

```typescript
const [showAdvanced, setShowAdvanced] = useState(true);  // open by default
```

---

## 4. WorkspaceSettingsDialog.tsx

### 4.1 SystemCardDef type and SYSTEM_CARDS (`src/components/WorkspaceSettingsDialog.tsx:9-83`)

```typescript
interface SystemCardDef {
  key: string;
  name: string;
  desc: string;
  icon: any;
  colorBg: string;    // e.g. 'bg-emerald-500/10'
  colorText: string;   // e.g. 'text-emerald-400'
  defaultTokens: number;
}

const SYSTEM_CARDS: SystemCardDef[] = [
  { key: 'llm_wiki', name: 'LLM Wiki', desc: 'Agent workspace files (state.md, context.md, patterns.md)',
    icon: BookOpen, colorBg: 'bg-emerald-500/10', colorText: 'text-emerald-400', defaultTokens: 800 },
  { key: 'obsidian_skills', name: 'Skills', desc: 'SKILL.md frontmatter from agent/skills/',
    icon: Sparkles, colorBg: 'bg-purple-500/10', colorText: 'text-purple-400', defaultTokens: 400 },
  { key: 'graphify', name: 'Graphify', desc: 'Knowledge graph communities from graphify-out/',
    icon: Network, colorBg: 'bg-blue-500/10', colorText: 'text-blue-400', defaultTokens: 400 },
  { key: 'para', name: 'PARA', desc: 'Projects, Areas, Resources, Archives',
    icon: FolderTree, colorBg: 'bg-amber-500/10', colorText: 'text-amber-400', defaultTokens: 400 },
  { key: 'qmd_templates', name: 'QMD Templates', desc: 'Quick markup templates from agent/templates/',
    icon: FileCode, colorBg: 'bg-cyan-500/10', colorText: 'text-cyan-400', defaultTokens: 400 },
  { key: 'automations', name: 'Automations', desc: 'Automation rules from agent/automations/',
    icon: Zap, colorBg: 'bg-orange-500/10', colorText: 'text-orange-400', defaultTokens: 300 },
  { key: 'design_skills', name: 'Design Skills', desc: 'Frontend design intelligence, taste knobs, references',
    icon: Palette, colorBg: 'bg-pink-500/10', colorText: 'text-pink-400', defaultTokens: 800 },
];
```

**Key difference:** WorkspaceSettings uses `key: 'qmd_templates'` but NewSessionDialog uses `id: 'qmd'` — different naming for the same system.

### 4.2 WorkspaceConfig type (`src/components/WorkspaceSettingsDialog.tsx:102-133`)

```typescript
interface WorkspaceConfig {
  systems: Record<string, SystemConfig | DesignSkillsConfig>;
  behaviors: { summarization: boolean; deep_memory: boolean };
}

const DEFAULT_CONFIG: WorkspaceConfig = {
  systems: {
    llm_wiki: { enabled: true, max_tokens: 800 },
    obsidian_skills: { enabled: true, max_tokens: 400 },
    graphify: { enabled: true, max_tokens: 400 },
    para: { enabled: true, max_tokens: 400 },        // NewSessionDialog default: false
    qmd_templates: { enabled: true, max_tokens: 400 },
    automations: { enabled: true, max_tokens: 300 },
    design_skills: { enabled: true, max_tokens: 800, skills: [...], levels: {...}, include_references: true },
  },
  behaviors: { summarization: true, deep_memory: false },
};
```

PARA is `true` in WorkspaceSettings but `false` in NewSessionDialog — a known mismatch.

---

## 5. Design Tokens & Patterns

### Dark Glassmorphic UI
- Card bg: `bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/50`
- Active state: `bg-zinc-800/40 border-zinc-600/40 shadow-[0_1px_4px_rgba(0,0,0,0.1)]`
- Inactive state: `bg-zinc-900/30 border-zinc-700/30 opacity-60`
- Text colors: `text-zinc-300` (primary), `text-zinc-500` (secondary), `text-zinc-600` (tertiary)
- System accent colors:
  - LLM Wiki: `text-blue-400`, `bg-blue-500/40`
  - Obsidian Skills: `text-purple-400`, `bg-purple-500/40`
  - Graphify: `text-cyan-400`, `bg-cyan-500/40`
  - PARA: `text-teal-400`, `bg-teal-500/40`
  - QMD: `text-amber-400`, `bg-amber-500/40`
  - Automations: `text-rose-400`, `bg-rose-500/40`
  - Design Skills: `text-pink-400`, `bg-pink-500/40`
- Toggle switch: `w-8 h-4 rounded-full` with `w-3 h-3` sliding dot
- Section header: `w-1 h-3 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500` + `text-[10px] font-semibold text-zinc-400 uppercase tracking-wider`
- Token budget bar: gradient from `from-cyan-500 to-teal-500`
- Grid layout: `grid grid-cols-2 gap-2` for 2-column card grid
- SVG heatmap: hardcoded `{ x, y }` positions, accent colors as hex values

### Icons Used
- `BookOpen` — LLM Wiki
- `Zap` — Obsidian Skills, Automations (WSD)
- `Network` — Graphify
- `FolderTree` — PARA
- `FileText` / `FileCode` — QMD Templates
- `Bot` — Automations
- `Palette` — Design Skills
- `Sparkles` — Skills (WSD)
- `ChevronRight` — collapse/expand toggle
- `ChevronDown` — unused

---

## 6. Data Flow

```
User opens NewSessionDialog
  → checkInfra() called (on mount only)
    → dapi.readProjectFile('graphify-out/GRAPH_REPORT.md') — checks if graphify exists
    → dapi.listAgentDirFiles(projectPath) — checks if QMD templates exist
    → dapi.getSkills(projectPath) — gets skills count
  → systems array built from infraStatus + agentFiles.length
  → User toggles systems on/off → contextConfig built → preview shown via assembleContext()
  → On create → contextConfig sent to terminal as part of session setup

ALSO: getContextSystems() IPC handler exists but is NEVER CALLED from current frontend
```

---

## 7. Files Map

| File | Lines | Purpose |
|------|-------|---------|
| `src/main.ts` | 8134-8178 | `get-context-systems` IPC handler (backend discovery) |
| `src/preload.ts` | 342 | Preload bridge for `getContextSystems` |
| `src/components/NewSessionDialog.tsx` | 57-68 | `SystemInfo` interface |
| `src/components/NewSessionDialog.tsx` | 84-137 | `SystemToggleCard` component |
| `src/components/NewSessionDialog.tsx` | 148-240 | `ContextMapVisualization` SVG component |
| `src/components/NewSessionDialog.tsx` | 258 | `infraStatus` state |
| `src/components/NewSessionDialog.tsx` | 383-400 | `checkInfra()` function |
| `src/components/NewSessionDialog.tsx` | 666-674 | `systems` array construction |
| `src/components/WorkspaceSettingsDialog.tsx` | 9-17 | `SystemCardDef` interface |
| `src/components/WorkspaceSettingsDialog.tsx` | 19-83 | `SYSTEM_CARDS` definitions |
| `src/components/WorkspaceSettingsDialog.tsx` | 102-133 | `WorkspaceConfig` / `DEFAULT_CONFIG` |
