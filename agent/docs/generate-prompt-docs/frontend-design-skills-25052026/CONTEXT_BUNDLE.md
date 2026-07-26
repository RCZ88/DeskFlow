# Context Bundle: Frontend Design Skills System

## Project: DeskFlow

Electron desktop app (React 19, TypeScript, Tailwind v4, Vite 7, Framer Motion, Three.js, Lucide React) with an **AI Agent Workspace** (Tracker Mind) that manages terminal sessions with AI agents and context assembly.

---

## Relevant Source Code

### 1. ContextConfig.ts — `src/services/ContextConfig.ts`

The config schema for all context systems. Each system has `enabled: boolean` and `max_tokens: number`. 6 existing systems.

**Full file (27 lines):**
```typescript
export interface ContextConfig {
  total_token_budget: number;
  systems: {
    llm_wiki: { enabled: boolean; files: string[]; max_tokens: number };
    obsidian_skills: { enabled: boolean; skills: string[]; max_tokens: number };
    graphify: { enabled: boolean; include_graph: boolean; include_summary: boolean; max_tokens: number };
    para: { enabled: boolean; areas: string[]; max_tokens: number };
    qmd: { enabled: boolean; templates: string[]; max_tokens: number };
    automations: { enabled: boolean; max_tokens: number };
  };
  summarization: { enabled: boolean; message_threshold: number; max_recent_messages: number; summary_style: 'brief' | 'detailed' };
  deep_memory: { enabled: boolean; pattern_detection: boolean; max_patterns: number; retention_days: number };
}

export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  total_token_budget: 7000,
  systems: {
    llm_wiki: { enabled: true, files: [], max_tokens: 2000 },
    obsidian_skills: { enabled: true, skills: [], max_tokens: 500 },
    graphify: { enabled: true, include_graph: false, include_summary: true, max_tokens: 500 },
    para: { enabled: false, areas: [], max_tokens: 300 },
    qmd: { enabled: true, templates: [], max_tokens: 200 },
    automations: { enabled: false, max_tokens: 100 },
  },
  summarization: { enabled: true, message_threshold: 10, max_recent_messages: 5, summary_style: 'brief' },
  deep_memory: { enabled: true, pattern_detection: true, max_patterns: 20, retention_days: 90 },
};
```

### 2. ContextService.ts — `src/services/ContextService.ts`

**`assembleContext()`** (lines 126-162) — main entry point, calls each builder:

```typescript
export async function assembleContext(projectPath: string, config: ContextConfig, sessionId?: string): Promise<string> {
  const budget = config.total_token_budget || 7000;
  let prompt = '';
  let usedTokens = 0;

  const add = async (content: string) => {
    const tokens = estimateTokens(content);
    if (usedTokens + tokens <= budget) {
      prompt += content;
      usedTokens += tokens;
    }
  };

  if (config.systems.llm_wiki.enabled) {
    await add(await buildLLMWikiContext(projectPath, config));
  }
  if (config.systems.obsidian_skills.enabled) {
    await add(await buildSkillIndex(projectPath, config));
  }
  // ... graphify, para, qmd, automations, deep_memory ...

  return prompt;
}
```

**`buildSkillIndex()`** (lines 197-216) — pattern for reading skills:

```typescript
async function buildSkillIndex(projectPath: string, config: ContextConfig): Promise<string> {
  const maxTokens = config.systems.obsidian_skills.max_tokens || 500;
  const enabledSkills = config.systems.obsidian_skills.skills;
  let content = '## Available Skills\n';
  const skillDirs = await listDir(projectPath, 'agent/skills');
  for (const skillDir of skillDirs) {
    if (!skillDir || skillDir.endsWith('.md')) continue;
    const skillContent = await readFile(projectPath, `agent/skills/${skillDir}/SKILL.md`);
    if (!skillContent) continue;
    const parsed = parseSkillFrontmatter(skillContent);
    if (enabledSkills.length > 0 && !enabledSkills.includes(parsed.name)) continue;
    const entry = `- **${parsed.name}** (${parsed.category}): ${parsed.description || 'No description'}\n`;
    if (estimateTokens(content + entry) > maxTokens) break;
    content += entry;
  }
  return content;
}
```

**`readFile()` helper** (line 39):
```typescript
async function readFile(projectPath: string, relativePath: string): Promise<string> {
  try {
    const result = await (window as any).deskflowAPI?.readProjectFile?.(relativePath, projectPath);
    if (result?.success && result.data) return result.data as string;
  } catch {}
  return '';
}
```

**`listDir()` helper** (line 47):
```typescript
async function listDir(projectPath: string, relativePath: string): Promise<string[]> {
  try {
    const result = await (window as any).deskflowAPI?.listDirectory?.(projectPath, relativePath);
    if (result?.success && result.data) return result.data as string[];
  } catch {}
  return [];
}
```

### 3. NewSessionDialog.tsx — `src/components/NewSessionDialog.tsx`

**System toggle colors** (lines 68-83) — each system gets unique accent:

```typescript
const toggleColors = {
  llm_wiki: { on: 'bg-blue-500/40', off: 'bg-zinc-700' },
  obsidian_skills: { on: 'bg-purple-500/40', off: 'bg-zinc-700' },
  graphify: { on: 'bg-cyan-500/40', off: 'bg-zinc-700' },
  para: { on: 'bg-teal-500/40', off: 'bg-zinc-700' },
  qmd: { on: 'bg-amber-500/40', off: 'bg-zinc-700' },
  automations: { on: 'bg-rose-500/40', off: 'bg-zinc-700' },
};
const dotColors = {
  llm_wiki: { on: 'left-3.5 bg-blue-400', off: 'left-0.5 bg-zinc-500' },
  obsidian_skills: { on: 'left-3.5 bg-purple-400', off: 'left-0.5 bg-zinc-500' },
  // ... same pattern for others
};
```

**SessionConfig interface** (lines 14-38):
```typescript
export interface SessionConfig {
  id: string; name: string; agentType: string;
  terminalMode: 'create' | 'select';
  selectedTerminal: string;
  resumeId?: string; initializeFile?: string;
  customSystemPrompt?: string;
  includeDefaultInit: boolean; initContent?: string;
  contextConfig?: {
    total_token_budget: number;
    systems: {
      llm_wiki: { enabled: boolean; max_tokens: number };
      obsidian_skills: { enabled: boolean; max_tokens: number };
      graphify: { enabled: boolean; include_summary: boolean; max_tokens: number };
      para: { enabled: boolean; max_tokens: number };
      qmd: { enabled: boolean; max_tokens: number };
      automations: { enabled: boolean; max_tokens: number };
    };
    summarization: { enabled: boolean; message_threshold: number };
    deep_memory: { enabled: boolean; pattern_detection: boolean };
  };
}
```

**State variables for toggles** (lines 219-228):
```typescript
const [ctxLLMWiki, setCtxLLMWiki] = useState(true);
const [ctxSkills, setCtxSkills] = useState(true);
const [ctxGraphify, setCtxGraphify] = useState(true);
const [ctxPara, setCtxPara] = useState(false);
const [ctxQMD, setCtxQMD] = useState(true);
const [ctxAutomations, setCtxAutomations] = useState(false);
const [ctxSummarization, setCtxSummarization] = useState(true);
const [ctxDeepMemory, setCtxDeepMemory] = useState(true);
```

**Context systems array** (lines 534-542) — where toggle cards are defined:
```typescript
const systems: SystemInfo[] = [
  { id: 'llm_wiki', name: 'LLM Wiki', icon: BookOpen, accentColor: 'text-blue-400', itemCount: ..., itemLabel: 'files', lastBuilt: null, maxTokens: 2000, enabled: ctxLLMWiki, onToggle: () => setCtxLLMWiki(!ctxLLMWiki) },
  { id: 'obsidian_skills', name: 'Obsidian Skills', icon: Zap, accentColor: 'text-purple-400', itemCount: ..., itemLabel: 'skills', lastBuilt: null, maxTokens: 500, enabled: ctxSkills, onToggle: () => setCtxSkills(!ctxSkills) },
  // ... graphify (Network, cyan), para (FolderTree, teal), qmd (FileText, amber), automations (Bot, rose)
];
```

**Context map SVG nodes** (lines 115-122) — each system has a position in the visual:
```typescript
const nodes: Record<string, { x: number; y: number }> = {
  llm_wiki: { x: 60, y: 40 },
  obsidian_skills: { x: 220, y: 40 },
  graphify: { x: 60, y: 130 },
  para: { x: 220, y: 130 },
  qmd: { x: 60, y: 220 },
  automations: { x: 220, y: 220 },
};
```

**Context map accent colors** (lines 131-138):
```typescript
const accentHex: Record<string, string> = {
  llm_wiki: '#3b82f6',
  obsidian_skills: '#a855f7',
  graphify: '#22d3ee',
  para: '#14b8a6',
  qmd: '#f59e0b',
  automations: '#f43f5e',
};
```

**buildPreview** (lines 327-343) — builds the preview context config:
```typescript
const previewContextConfig = {
  total_token_budget: totalBudget,
  systems: {
    llm_wiki: { enabled: ctxLLMWiki, files: [], max_tokens: 2000 },
    obsidian_skills: { enabled: ctxSkills, skills: [], max_tokens: 500 },
    graphify: { enabled: ctxGraphify, include_graph: false, include_summary: true, max_tokens: 500 },
    para: { enabled: ctxPara, areas: [], max_tokens: 300 },
    qmd: { enabled: ctxQMD, templates: [], max_tokens: 200 },
    automations: { enabled: ctxAutomations, max_tokens: 100 },
  },
  summarization: { enabled: ctxSummarization, message_threshold: 10, max_recent_messages: 5, summary_style: 'brief' as const },
  deep_memory: { enabled: ctxDeepMemory, pattern_detection: true, max_patterns: 20, retention_days: 90 },
};
```

**handleCreate** (lines 346-383) — builds final SessionConfig with contextConfig:
```typescript
config.contextConfig = {
  total_token_budget: totalBudget,
  systems: {
    llm_wiki: { enabled: ctxLLMWiki, max_tokens: 2000 },
    obsidian_skills: { enabled: ctxSkills, max_tokens: 500 },
    graphify: { enabled: ctxGraphify, include_summary: true, max_tokens: 500 },
    para: { enabled: ctxPara, max_tokens: 300 },
    qmd: { enabled: ctxQMD, max_tokens: 200 },
    automations: { enabled: ctxAutomations, max_tokens: 100 },
  },
  summarization: { enabled: ctxSummarization, message_threshold: 10 },
  deep_memory: { enabled: ctxDeepMemory, pattern_detection: true },
};
```

**SystemToggleCard** component (lines 67-102):
```tsx
function SystemToggleCard({ system }: { system: SystemInfo }) {
  const toggleColors = { ... };
  const dotColors = { ... };
  const c = toggleColors[system.id as keyof typeof toggleColors];
  const d = dotColors[system.id as keyof typeof dotColors];
  return (
    <div className={`border rounded-lg p-3 transition-colors ${system.enabled ? 'bg-zinc-800/40 border-zinc-600/50' : 'bg-zinc-900/30 border-zinc-700/30 opacity-70'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <system.icon className={`w-3.5 h-3.5 ${system.accentColor}`} />
          <span className="text-[11px] text-zinc-300 font-medium">{system.name}</span>
        </div>
        <button onClick={system.onToggle} className={`w-8 h-4 rounded-full transition-colors relative ${system.enabled ? c.on : c.off}`}>
          <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${system.enabled ? d.on : d.off}`} />
        </button>
      </div>
      <div className="text-[9px] text-zinc-500">
        {system.itemCount > 0 ? `${system.itemCount} ${system.itemLabel}` : system.itemLabel} · ~{system.maxTokens} tokens
        {system.lastBuilt ? ` · Built ${formatRelTime(system.lastBuilt)}` : ''}
      </div>
    </div>
  );
}
```

**Imports** (line 2):
```typescript
import { ChevronRight, BookOpen, Zap, Network, FolderTree, FileText, Bot, ChevronDown } from 'lucide-react';
```

### 4. SkillsService.ts — `src/services/SkillsService.ts`

**Skill interface** (lines 4-11):
```typescript
export interface Skill {
  id: string; name: string; description: string;
  category: string; content: string; filePath: string;
}
```

**How skills are loaded** (lines 32-57):
```typescript
getSkills(): Skill[] {
  this.ensureSkillsDir();
  const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillPath = path.join(this.skillsDir, entry.name, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const skill = this.loadSkillFromFile(entry.name, skillPath);
        if (skill) skills.push(skill);
      }
    }
  }
  return skills;
}
```

**Frontmatter parsing** (lines 59-90) — extracts `name`, `description`, `category` from YAML frontmatter via regex:
```typescript
const nameMatch = content.match(/^#\s+(.+?)\n/m) || content.match(/^name:\s*(.+?)$/m);
const descMatch = content.match(/description:\s*(.+?)$/m);
const catMatch = content.match(/category:\s*(.+?)$/m);
```

---

## Data Structures

### ContextConfig (existing shape)
```typescript
{
  total_token_budget: number;    // default 7000
  systems: {
    llm_wiki:          { enabled: boolean, files: string[], max_tokens: number };
    obsidian_skills:   { enabled: boolean, skills: string[], max_tokens: number };
    graphify:          { enabled: boolean, include_graph: boolean, include_summary: boolean, max_tokens: number };
    para:              { enabled: boolean, areas: string[], max_tokens: number };
    qmd:               { enabled: boolean, templates: string[], max_tokens: number };
    automations:       { enabled: boolean, max_tokens: number };
  };
  summarization: { enabled: boolean, message_threshold: number, max_recent_messages: number, summary_style: 'brief' | 'detailed' };
  deep_memory:   { enabled: boolean, pattern_detection: boolean, max_patterns: number, retention_days: number };
}
```

### SessionConfig (contextConfig subset used in handleCreate)
```typescript
contextConfig?: {
  total_token_budget: number;
  systems: {
    llm_wiki:        { enabled: boolean; max_tokens: number };
    obsidian_skills: { enabled: boolean; max_tokens: number };
    graphify:        { enabled: boolean; include_summary: boolean; max_tokens: number };
    para:            { enabled: boolean; max_tokens: number };
    qmd:             { enabled: boolean; max_tokens: number };
    automations:     { enabled: boolean; max_tokens: number };
  };
  summarization: { enabled: boolean; message_threshold: number };
  deep_memory:   { enabled: boolean; pattern_detection: boolean };
};
```

### Skill interface
```typescript
interface Skill { id: string; name: string; description: string; category: string; content: string; filePath: string; }
```

---

## Design Tokens & Patterns

### UI Colors
- **Backgrounds**: `zinc-800` card bg, `zinc-900/50` for section bg, `zinc-900` for inputs
- **Borders**: `zinc-700` (normal), `zinc-700/30` (subtle), `zinc-600/50` (active)
- **Text**: `white` for headings, `zinc-300` for body, `zinc-400` for labels, `zinc-500` for hints
- **Accent per system**: blue (LLM Wiki), purple (Skills), cyan (Graphify), teal (PARA), amber (QMD), rose (Automations)
- **Toggle toggle**: `w-8 h-4 rounded-full bg-zinc-700` (off), `bg-<color>-500/40` (on), with `w-3 h-3 rounded-full` dot sliding `left-0.5` to `left-3.5`
- **Active card**: `bg-zinc-800/40 border-zinc-600/50`, inactive: `bg-zinc-900/30 border-zinc-700/30 opacity-70`
- **Gradient buttons**: `bg-gradient-to-r from-cyan-600 to-teal-600` (create), `from-amber-600 to-orange-600` (setup)

### Component Patterns
- **Cards**: `border rounded-lg p-3`, text `text-[11px]`, labels `text-[10px] uppercase tracking-wider`
- **Checkboxes**: `accent-cyan-500` or `accent-amber-500`
- **Select/input**: `w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm`
- **Section wrapper**: `bg-zinc-900/50 rounded border border-zinc-700/50 p-3`
- **Range sliders**: Not currently in the codebase — would need custom styling matching the dark theme (zinc bg, accent-colored thumb)

### Icon Usage (Lucide React)
- LLM Wiki: `BookOpen`, blue
- Obsidian Skills: `Zap`, purple
- Graphify: `Network`, cyan
- PARA: `FolderTree`, teal
- QMD: `FileText`, amber
- Automations: `Bot`, rose
- Existing imports: `ChevronRight, BookOpen, Zap, Network, FolderTree, FileText, Bot, ChevronDown`

---

## Architecture Notes

### Data Flow
```
User toggles Design Skills in NewSessionDialog
  → state: ctxDesignSkills, setCtxDesignSkills
  → handleCreate builds contextConfig with design_skills: { enabled: bool, ... }
  → SessionConfig stored, passed to TerminalPage
  → assembleContext() called with config
  → buildDesignSkillsContext() reads agent/skills/<name>/SKILL.md files
  → Returns string appended to system prompt
```

### Skill Loading
```
SkillsService.getSkills() scans agent/skills/*/SKILL.md
  → Each directory = one skill (e.g., agent/skills/impeccable/SKILL.md)
  → Parses frontmatter: name, description, category
  → Category "design" is NOT currently used but SkillsService supports it
```

### Context Token Budget
- Total budget: 7000 tokens (default, configurable in prefs)
- LLM Wiki: 2000 | Skills: 500 | Graphify: 500 | PARA: 300 | QMD: 200 | Automations: 100
- Remaining for design skills: ~400-600 tokens (configurable)
- Each builder checks `usedTokens + tokens <= budget` before adding

### Existing Skill Files in agent/skills/
```
agent-reflect/  commit/  deep-research/  deep-research-prompt/
fix-problems/  frontend-design/  generate-problem/  generate-prompt/
google-stitch/  maintain-context/  readme-generator/  recursive-playwright/
sqlite-js-migration/
```
Only `frontend-design/` has `category: design`.

---

## Naming Conventions & Patterns

- **State variables**: `ctx<Name>` pattern (e.g., `ctxLLMWiki`, `ctxDesignSkills`)
- **State setters**: `setCtx<Name>` pattern
- **Config keys**: `snake_case` in config objects, `camelCase` in TypeScript
- **CSS classes**: Tailwind v4 utility classes only (no custom CSS), dark theme with `zinc` palette
- **Flexbox**: `items-center gap-2` for horizontal labels, `space-y-2` for vertical stacks
