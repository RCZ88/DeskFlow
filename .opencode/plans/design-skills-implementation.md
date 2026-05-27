# Implementation Plan: Design Skills System

## Overview
Implement the Design Skills System from `RESULT.md` into the DeskFlow codebase. **Surgical edits only** — no file replacements. 6 work units, processed sequentially. Build verification after each unit.

---

## Work Unit 1: Skill Files (agent/skills/)

Copy 5 SKILL.md directories from RESULT → project.

**Source:** `agent/docs/frontend-design-skills-25052026/UI UX Workspace Infrastructure/Skills/<name>/SKILL.md`

**Actions:**
1. **frontend-design/SKILL.md** — Replace existing (42→102 lines). Enhanced with DeskFlow conventions, component patterns, stricter anti-patterns.
2. **impeccable/SKILL.md** — NEW. 167 lines. 7 domain refs, 23 commands, 27 anti-patterns.
3. **ui-ux-pro-max/SKILL.md** — NEW. 156 lines. Industry rules, 67 styles, color palettes.
4. **taste-skill/SKILL.md** — NEW. 111 lines. 3 knobs, aesthetic matrix, anti-repetition rules.
5. **design-taste/SKILL.md** — NEW. 135 lines. Master aggregator, decision tree, unified vocabulary.

**Frontmatter format** (matches existing SkillsService parser):
```yaml
id: <name>
name: <Display Name>
version: 1.0.0
category: design
tags: [design-system, typography, ...]
```

**Verify:** `SkillsService.getSkills()` returns 5 design-category skills

---

## Work Unit 2: Design References (agent/design-references/)

Create `agent/design-references/` with 8 DESIGN.md + README.

**Source:** `.../UI UX Workspace Infrastructure/Design References/`

**Structure:**
```
agent/design-references/
├── README.md
├── claude/DESIGN.md
├── linear/DESIGN.md
├── vercel/DESIGN.md
├── stripe/DESIGN.md
├── supabase/DESIGN.md
├── sentry/DESIGN.md
├── posthog/DESIGN.md
└── raycast/DESIGN.md
```

**Verify:** `listDir(projectPath, 'agent/design-references')` returns 8 subdirs

---

## Work Unit 3: ContextConfig.ts

**File:** `src/services/ContextConfig.ts` (27 lines)
**Type:** Surgical addition (3 lines to interface, 9 lines to defaults)

### Add to interface (after automations):
```typescript
    design_skills: {
      enabled: boolean;
      max_tokens: number;
      skills: string[];
      levels: {
        design_variance: number;
        motion_intensity: number;
        visual_density: number;
      };
      include_references: boolean;
    };
```

### Add to DEFAULT_CONTEXT_CONFIG (after automations defaults):
```typescript
    design_skills: {
      enabled: true,
      max_tokens: 800,
      skills: ['frontend-design', 'impeccable', 'ui-ux-pro-max', 'taste-skill'],
      levels: { design_variance: 5, motion_intensity: 5, visual_density: 7 },
      include_references: true,
    },
```

**Ripple:** `SessionConfig.contextConfig.systems` must also gain `design_skills` field (Unit 5)

---

## Work Unit 4: ContextService.ts

**File:** `src/services/ContextService.ts` (321 lines)
**Type:** Surgical addition — 1 call in assembleContext + 1 new builder function

### 4a. Add call in assembleContext() (after automations block, before deep_memory):
```typescript
  if (config.systems.design_skills?.enabled) {
    await add(await buildDesignSkillsContext(projectPath, config));
  }
```

### 4b. Add buildDesignSkillsContext() after buildDeepMemoryContext():
```typescript
async function buildDesignSkillsContext(
  projectPath: string, config: ContextConfig
): Promise<string> {
  const ds = config.systems.design_skills;
  if (!ds?.enabled) return '';
  const maxTokens = ds.max_tokens || 800;
  const enabledSkills = ds.skills || [];
  const levels = ds.levels || { design_variance: 5, motion_intensity: 5, visual_density: 7 };
  const includeRefs = ds.include_references ?? true;
  let content = '## Design Skills System\n';
  content += `DESIGN_VARIANCE: ${levels.design_variance} (1=Conservative, 10=Experimental)\n`;
  content += `MOTION_INTENSITY: ${levels.motion_intensity} (1=Static, 10=Cinematic)\n`;
  content += `VISUAL_DENSITY: ${levels.visual_density} (1=Airy, 10=Maximal)\n\n`;
  const designSkillDirs = ['frontend-design', 'impeccable', 'ui-ux-pro-max', 'taste-skill', 'design-taste'];
  let skillEntries = '', skillCount = 0;
  for (const skillDir of designSkillDirs) {
    if (enabledSkills.length > 0 && !enabledSkills.includes(skillDir)) continue;
    const skillContent = await readFile(projectPath, `agent/skills/${skillDir}/SKILL.md`);
    if (!skillContent) continue;
    const parsed = parseSkillFrontmatter(skillContent);
    const excerpt = skillContent.slice(0, 1200).replace(/---[\s\S]*?---/, '').trim();
    const entry = `\n### ${parsed.name}\n${parsed.description}\n${excerpt.slice(0, 600)}\n`;
    if (estimateTokens(content + skillEntries + entry) > maxTokens) break;
    skillEntries += entry; skillCount++;
  }
  content += `Active Skills: ${skillCount}\n${skillEntries}`;
  const tasteContent = await readFile(projectPath, 'agent/skills/design-taste/SKILL.md');
  if (tasteContent && estimateTokens(content + tasteContent.slice(0, 400)) <= maxTokens) {
    content += `\n### Design Taste Master\n${tasteContent.replace(/---[\s\S]*?---/, '').slice(0, 400).trim()}\n`;
  }
  if (includeRefs) {
    const refDirs = await listDir(projectPath, 'agent/design-references');
    const refs = refDirs.filter(d => !d.endsWith('.md') && d !== 'README.md');
    if (refs.length > 0 && estimateTokens(content + 'refs') <= maxTokens) {
      content += `\n### Design References Available\n`;
      for (const ref of refs.slice(0, 8)) content += `- ${ref}: agent/design-references/${ref}/DESIGN.md\n`;
    }
  }
  content += `\n[END DESIGN SKILLS CONTEXT]\n\n`;
  return content;
}
```

**Critical:** Do NOT touch any existing builders. Reuse existing `estimateTokens`, `readFile`, `listDir`, `parseSkillFrontmatter` helpers.

---

## Work Unit 5: NewSessionDialog.tsx

**File:** `src/components/NewSessionDialog.tsx` (739 lines)
**Type:** Surgical additions — 5 insertion points, no deletions

### 5a. Add imports (line 2):
```typescript
import { Palette, Sparkles, SlidersHorizontal, Layers, Paintbrush, Wand2, Eye, CheckCircle2 } from 'lucide-react';
import DesignSkillsPanel from './DesignSkillsPanel';
```

### 5b. Extend SessionConfig interface (after automations in contextConfig.systems):
Add `design_skills` field matching ContextConfig schema.

### 5c. Add state (after line 228, after `ctxShowMap` and `resumeError`):
```typescript
const [ctxDesignSkills, setCtxDesignSkills] = useState(true);
const [designVariance, setDesignVariance] = useState(5);
const [motionIntensity, setMotionIntensity] = useState(5);
const [visualDensity, setVisualDensity] = useState(7);
```

### 5d. Add to reset useEffect (after line 257):
```typescript
setCtxDesignSkills(true);
setDesignVariance(5);
setMotionIntensity(5);
setVisualDensity(7);
```

### 5e. Extend buildPreview contextConfig (add design_skills block same as Unit 3):
```typescript
design_skills: {
  enabled: ctxDesignSkills,
  max_tokens: 800,
  skills: ['frontend-design', 'impeccable', 'ui-ux-pro-max', 'taste-skill'],
  levels: { design_variance: designVariance, motion_intensity: motionIntensity, visual_density: visualDensity },
  include_references: true,
},
```

### 5f. Extend handleCreate contextConfig (same addition as 5e):
Only difference: `enabled: ctxDesignSkills` (the initialization check is optional)

### 5g. Add Design Skills section to UI (after context systems grid, before behavior toggles):
```tsx
{/* Design Intelligence */}
<div className="mt-3 border-t border-pink-500/20 pt-3">
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <div className="w-1 h-4 bg-gradient-to-b from-pink-500 to-rose-500 rounded-full" />
      <h4 className="text-[10px] font-semibold text-pink-400 uppercase tracking-wider">Design Intelligence</h4>
    </div>
    <button onClick={() => setCtxDesignSkills(!ctxDesignSkills)}
      className={`w-8 h-4 rounded-full transition-colors relative ${ctxDesignSkills ? 'bg-pink-500/40' : 'bg-zinc-700'}`}>
      <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${ctxDesignSkills ? 'left-3.5 bg-pink-400' : 'left-0.5 bg-zinc-500'}`} />
    </button>
  </div>
  {ctxDesignSkills && (
    <div className="space-y-2">
      <DesignSkillsPanel
        config={{
          enabled: ctxDesignSkills,
          skills: { frontendDesign:true, impeccable:true, uiUxProMax:true, tasteSkill:true, designTaste:true },
          levels: { designVariance, motionIntensity, visualDensity },
          includeReferences: true,
          activeReference: null,
        }}
        onChange={() => {}}
        designRefCount={0}
        isInitialized={true}
        onInitialize={() => {}}
      />
    </div>
  )}
</div>
```

### 5h. Update token computation:
When `ctxDesignSkills` is true, add 800 to used tokens.

### 5i. Add design_skills to context map:
Add to `nodes`: `design_skills: { x: 140, y: 310 }`
Add to `accentHex`: `design_skills: '#ec4899'`

---

## Work Unit 6: DesignSkillsPanel.tsx (NEW)

**File:** `src/components/DesignSkillsPanel.tsx`

**Type:** New component — the only missing file from RESULT.md.

### Interface & Props (from UNCOVERED_GAPS.md):
```typescript
export interface DesignSkillConfig {
  enabled: boolean;
  skills: { frontendDesign: boolean; impeccable: boolean; uiUxProMax: boolean; tasteSkill: boolean; designTaste: boolean };
  levels: { designVariance: number; motionIntensity: number; visualDensity: number };
  includeReferences: boolean;
  activeReference: string | null;
}

interface Props {
  config: DesignSkillConfig;
  onChange: (config: DesignSkillConfig) => void;
  designRefCount: number;
  isInitialized: boolean;
  onInitialize: () => void;
}
```

### Renders:
- **Not initialized:** "Design skills files not yet initialized" + "Initialize Design Skills" button
- **Initialized:** 5 skill checkboxes (toggle pattern matching SystemToggleCard) + 3 range sliders (1-10, pink thumb, zinc track) + include-references checkbox

### Styling:
- Container: `bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3`
- Sub-headers: `text-[10px] text-zinc-500 uppercase tracking-wider font-medium`
- Slider container: `space-y-2 p-2 bg-zinc-900/30 rounded border border-zinc-800/30`
- Toggle buttons: same `w-8 h-4 rounded-full` pattern, pink-500/40 when on

---

## Build Verification Sequence

```
1. npm run build  (after Units 1+2 — file copies only, no TS change)
2. npm run build  (after Unit 3 — ContextConfig.ts)
3. npm run build  (after Unit 4 — ContextService.ts)
4. npm run build  (after Unit 5 — NewSessionDialog.tsx)
5. npm run build  (after Unit 6 — DesignSkillsPanel.tsx)
```

## Risks

| Risk | Mitigation |
|------|-----------|
| DesignSkillsPanel missing → build fails | Unit 6 is last, isolated failure |
| Exact edit match fails due to whitespace | Use Task tool with surgical precision |
| Slider state not passed to contextConfig | Map `levels` object directly in handleCreate |
