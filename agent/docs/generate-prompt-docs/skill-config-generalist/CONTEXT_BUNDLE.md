# Context Bundle: Skill Config Format + Generalist Page

## Architecture Overview

Skills are loaded server-side (main process) via SkillsService, served to renderer through IPC channel `get-skills`, and displayed in the Terminal sidebar's Skills tab. Each skill is a markdown file at `agent/skills/<skill-name>/SKILL.md` with YAML frontmatter.

The goal is twofold:
1. **Extend the SKILL.md frontmatter** with `inputs`, `outputs`, `components` fields so each skill can declare its configurable parts
2. **Create a Generalist page** — a filtered/grid dialog that browses ALL skills with their expanded configs, accessible from the sidebar header

## Current SkillsService (`src/services/SkillsService.ts`)

```typescript
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  filePath: string;
}

export class SkillsService {
  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(process.cwd());
    this.skillsDir = path.join(this.baseDir, 'agent', 'skills');
  }

  getSkills(): Skill[] {
    // reads agent/skills/<dir>/SKILL.md or agent/skills/*.md
    // parses frontmatter for name, description, category
    // returns Skill[]
  }

  // Parses ---frontmatter--- via regex:
  //   nameMatch = content.match(/^#\s+(.+?)\n/m) || content.match(/^name:\s*(.+?)$/m)
  //   descMatch = content.match(/description:\s*(.+?)$/m)
  //   catMatch  = content.match(/category:\s*(.+?)$/m)
}
```

## Current SKILL.md Frontmatter Format

All skills use standard YAML frontmatter between `---` markers. Observed format:

```yaml
---
id: generate-prompt
name: Generate Prompt
category: design
applicable_to: [prompts, design-specs]
version: 1.2.0
created: 2026-04-19
tags: [prompts, design, engineering]
---
```

Other fields observed across skills:
- `category`: design | testing | ... (string)
- `applicable_to`: [...]
- `tags`: [...]

## IPC Layer

In `src/preload.ts` (line 418):
```typescript
getSkills: (projectPath?: string) => ipcRenderer.invoke('get-skills', { projectPath }),
```

Used in renderer as `window.deskflowAPI?.getSkills()` — returns `Skill[]`.

## Terminal Sidebar Structure (`src/pages/TerminalPage.tsx`)

### Tab Definitions (line 1626):
```typescript
{ key: 'presets', icon: Zap, label: 'Presets', color: 'green' },
{ key: 'sessions', icon: Clock, label: 'Sessions', color: 'green' },
{ key: 'map', icon: Monitor, label: 'Map', color: 'green' },
{ key: 'analytics', icon: PieChart, label: 'Analytics', color: 'green' },
{ key: 'issues', icon: ListChecks, label: 'Issues', color: 'emerald' },
{ key: 'files', icon: Folder, label: 'Files', color: 'yellow' },
{ key: 'skills', icon: Sparkles, label: 'Skills', color: 'indigo' },
{ key: 'design', icon: Palette, label: 'Design', color: 'pink' },
{ key: 'configs', icon: Settings, label: 'Configs', color: 'orange' },
{ key: 'history', icon: RefreshCw, label: 'History', color: 'rose' },
{ key: 'context', icon: Settings2, label: 'Context', color: 'amber' },
{ key: 'context-maintenance', icon: Database, label: 'Maintenance', color: 'violet' },
```

### Tab Rendering (line 1639-1672):
```typescript
const colorMap: Record<string, string> = {
  green: 'text-green-400 border-green-500 shadow-[0_0_6px_rgba(34,197,94,0.25)]',
  emerald: 'text-emerald-400 border-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.25)]',
  yellow: 'text-yellow-400 border-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.25)]',
  indigo: 'text-indigo-400 border-indigo-500 shadow-[0_0_6px_rgba(102,51,153,0.25)]',
  pink: 'text-pink-400 border-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.25)]',
  orange: 'text-orange-400 border-orange-500 shadow-[0_0_6px_rgba(251,146,60,0.25)]',
  rose: 'text-rose-400 border-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.25)]',
  violet: 'text-violet-400 border-violet-500 shadow-[0_0_6px_rgba(168,85,247,0.25)]',
  amber: 'text-amber-400 border-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.25)]',
};
```

Each tab renders as:
```tsx
<button onClick={() => setActiveTab(tab.key)}
  className={`flex items-center gap-1.5 px-2 py-2 text-xs font-medium transition-all duration-150 relative ${isActive ? colorMap[tab.color] + ' border-b-2' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>
  <tab.icon className="w-3 h-3 shrink-0" />
  <span className="hidden sm:inline">{tab.label}</span>
</button>
```

### Sidebar Header (line 1605-1623):
```tsx
<div className="flex items-center justify-between px-2 py-2 border-b border-zinc-800/70">
  <span className="text-xs text-zinc-500 font-medium">Terminal</span>
  <div className="flex items-center gap-1">
    <button onClick={() => setShowFeaturesDialog(true)}
      className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-cyan-300"
      title="Workspace Features">
      <Info className="w-3.5 h-3.5" />
    </button>
    <button onClick={() => setSidebarOpen(false)}
      className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300">
      <PanelLeftClose className="w-3.5 h-3.5" />
    </button>
  </div>
</div>
```

## Existing Dialog Pattern: FeaturesDialog (line 4215)

```tsx
function FeaturesDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-800 rounded-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-zinc-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Workspace Features</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">✕</button>
        </div>
        <p className="text-xs text-zinc-400 mb-6">...</p>
        <div className="grid grid-cols-2 gap-4">
          {FEATURES.map((group) => (
            <div key={group.category} className={`bg-zinc-900/50 rounded-lg p-3 border-l-2 ${categoryColors[group.color]}`}>
              <h3 className="text-sm font-semibold text-white mb-3">{group.category}</h3>
              <div className="space-y-2">...</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## FEATURES Constant & categoryColors

```typescript
const FEATURES = [
  { category: 'Terminal', color: 'green', items: [...] },
  { category: 'Presets', color: 'green', items: [...] },
  { category: 'Sessions', color: 'green', items: [...] },
  { category: 'Analytics', color: 'emerald', items: [...] },
  { category: 'Issues', color: 'emerald', items: [...] },
  { category: 'Files', color: 'yellow', items: [...] },
  { category: 'Skills', color: 'indigo', items: [...] },
  { category: 'Design', color: 'pink', items: [...] },
  { category: 'Context', color: 'amber', items: [...] },
  { category: 'History', color: 'rose', items: [...] },
];

const categoryColors: Record<string, string> = {
  green: 'border-green-500/30 text-green-400',
  emerald: 'border-emerald-500/30 text-emerald-400',
  yellow: 'border-yellow-500/30 text-yellow-400',
  indigo: 'border-indigo-500/30 text-indigo-400',
  pink: 'border-pink-500/30 text-pink-400',
  // ... etc
};
```

## Design Tokens & Patterns

- **Background:** zinc-900 (sidebar), zinc-800 (cards), zinc-900/50 (dialog cards), black/60 backdrop-blur-sm (overlay)
- **Text:** white (headings), zinc-200 (primary), zinc-400 (secondary), zinc-500 (tertiary), zinc-600 (muted)
- **Borders:** zinc-700 (dialog), zinc-800 (sidebar panels), zinc-800/70 (dividers)
- **Accents:** cyan-400/500 (primary interactive), per-tab colors (indigo, pink, amber, etc.)
- **Glass cards:** `bg-zinc-900/50 rounded-lg p-3 border-l-2` with color-coded left border
- **Grid layout:** `grid grid-cols-2 gap-4` for dialog content
- **Font sizes:** text-xs (most UI), text-sm (card titles), text-lg (dialog headers)
- **Icons:** lucide-react (16 library)
- **Spacing:** 8px/2-unit grid (p-2, p-3, p-6, gap-4, gap-1)

## All Skills (17 total)

Skills are stored at `agent/skills/<id>/SKILL.md`:

| id | name | category |
|----|------|----------|
| generate-prompt | Generate Prompt | design |
| design-taste | Design Taste | design |
| taste-skill | Taste Skill | design |
| ui-ux-pro-max | UI/UX Pro Max | design |
| impeccable | Impeccable | design |
| frontend-design | Frontend Design | design |
| agent-reflect | Agent Reflect | general |
| google-stitch | Google Stitch | general |
| recursive-playwright | Recursive Playwright | testing |
| sqlite-js-migration | SQLite JS Migration | development |
| readme-generator | README Generator | writing |
| maintain-context | Maintain Context | general |
| commit | Commit | general |
| generate-problem | Generate Problem | general |
| deep-research-prompt | Deep Research Prompt | research |
| fix-problems | Fix Problems | development |
| deep-research | Deep Research | research |

## State Variables Pattern (TerminalPage.tsx line ~155-190)

```typescript
const [showFeaturesDialog, setShowFeaturesDialog] = useState(false);
const [selectedSessionDetail, setSelectedSessionDetail] = useState<string | null>(null);
const [sessionMessages, setSessionMessages] = useState<any[]>([]);
```

## Import Pattern

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, X, Monitor, Play, Trash2, Clock, FolderOpen, Zap, ... } from 'lucide-react';
```

## Requirements

1. **Extended SKILL.md frontmatter** — Parse new fields `inputs`, `outputs`, `components` in `loadSkillFromFile`. Each is a YAML list block.

   Proposed format:
   ```yaml
   ---
   id: generate-prompt
   name: Generate Prompt
   category: design
   inputs:
     - name: User Request
       type: text
       description: The user's original verbatim request
       required: true
     - name: Context Bundle
       type: file
       description: CONTEXT_BUNDLE.md reference
       required: true
   outputs:
     - name: Design Prompt
       type: markdown
       description: High-fidelity design prompt
   components:
     - name: Raw Request
       description: User's verbatim request block
       source: user
     - name: Context Bundle Reference
       description: CONTEXT_BUNDLE.md as source of truth
       source: system
   ---
   ```

2. **Generalist Dialog** — Modal dialog (matching FeaturesDialog pattern) that:
   - Loads all skills via `getSkills()`
   - Shows them in a filterable grid with search + category filter
   - Expands to show `inputs`, `outputs`, `components` per skill
   - Accessible via button in sidebar header (alongside the existing Features ℹ️ button)

3. **No removal of existing functionality** — Skills tab stays as-is. Generalist page is additive.
