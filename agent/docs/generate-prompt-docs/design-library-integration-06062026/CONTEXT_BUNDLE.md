# CONTEXT_BUNDLE — Design Library Integration Research

> **Purpose:** Self-contained reference for designing how to integrate Refero, Aceternity UI, and 21st.dev into the DeskFlow workspace theme infrastructure.
> **Target AI:** Lead Designer and Engineer
> **Date:** 2026-06-06

---

## 1. Project Overview

**DeskFlow** — Electron + React + TypeScript desktop app for tracking app usage, managing AI agent workspaces, and 3D visualization.

### Key Architecture
- **Electron main process** (`src/main.ts` → `dist-electron/main.cjs`) — all DB, IPC, terminal PTY, file system
- **Preload bridge** (`src/preload.ts` → `dist-electron/preload.cjs`) — typed `deskflowAPI` via contextBridge
- **Renderer** (Vite + React → `dist/`) — NO direct Node access, ONLY IPC via preload
- **Communication** — `ipcMain.handle` / `ipcRenderer.invoke` for request-response; `webContents.send` / `ipcRenderer.on` for events

### Tech Stack
| Technology | Version |
|------------|---------|
| Electron | ~34.3 |
| React | ^19.2.0 |
| TypeScript | ~5.9.3 |
| Vite | ^7.3.1 |
| Tailwind CSS | 4.2.1 (v4 ONLY) |
| Framer Motion | ^12.35.0 |
| Lucide React | ^0.577.0 |

### Build Commands
```bash
npm run dev              # Vite dev server (web only)
npm start                # Electron app
npm run build:renderer   # Build React to dist/
npm run build:electron   # Build Electron to dist-electron/
npm run build            # Both
```

---

## 2. Three Design Libraries to Integrate

### 2a. Refero (styles.refero.design)
- **What it is:** AI-readable design system marketplace with 2,000+ DESIGN.md files from leading product websites
- **Output format:** DESIGN.md files with Tailwind v4, CSS Variables, Design Tokens
- **Integration methods:**
  - **MCP Server** — Refero MCP connects to Cursor, Claude, Windsurf, etc.
  - **Website** — Browse styles at styles.refero.design
  - **API** — Unknown if public API exists
- **Content per style:** Tokens (Colors, Typography), Components (buttons, cards, navigation), Quick Start for Tailwind v4

### 2b. Aceternity UI (ui.aceternity.com)
- **What it is:** 200+ production-ready Tailwind CSS + Framer Motion components
- **Integration methods:**
  - **CLI:** `npx aceternity-ui init` + `npx aceternity-ui add [component]`
  - **MCP Server:** shadcn MCP Server for AI assistants (browse/search/install components via natural language)
  - **Registry:** Shadcn-compatible registry for component discovery
  - **Website:** ui.aceternity.com/components
- **Compatibility:** Works with shadcn, Tailwind v4, Framer Motion
- **Content:** Hero Sections, Logo Clouds, Feature Sections, Backgrounds, Bento Grids, templates

### 2c. 21st.dev
- **What it is:** React component library
- **Status:** Already integrated as MCP server (see §4)
- **Current usage:** Used in AiPage redesign for Stats Cards, DashboardMetricCard patterns

---

## 3. Current Design Workspace Infrastructure

### 3a. Workspace Sidebar — Design Tab

Located in `src/pages/TerminalPage.tsx` (lines 2463-2474):
```typescript
{ key: 'design', icon: Palette, label: 'Design', accent: 'pink' },
```

The Design tab renders `<DesignWorkspacePage>` component.

### 3b. DesignWorkspacePage (`src/pages/DesignWorkspacePage.tsx`)

**Full source (188 lines):**
```tsx
import { useState, useCallback, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { TasteKnobs, type TasteKnobValues } from '../components/workspace/TasteKnobs';
import { StyleReferences } from '../components/workspace/StyleReferences';
import { DesignComposeOutlet } from '../components/workspace/DesignComposeOutlet';
import { StyleDescription } from '../components/workspace/StyleDescription';
import { ColorPicker, type ColorEntry } from '../components/workspace/ColorPicker';

interface DesignWorkspacePageProps {
  projectPath?: string;
  activeTerminalId?: string | null;
}

const DEFAULT_TASTE: TasteKnobValues = {
  designVariance: 5,
  motionIntensity: 5,
  visualDensity: 5,
};

const SKILL_DIRS = ['frontend-design', 'impeccable', 'ui-ux-pro-max', 'taste-skill', 'design-taste'];
const REF_NAMES = ['Claude', 'Linear', 'Vercel', 'Stripe', 'Supabase', 'Sentry', 'PostHog', 'Raycast'];

async function readFileContent(relativePath: string, projectPath?: string): Promise<string | null> {
  try {
    const dapi = (window as any).deskflowAPI;
    const result = await dapi?.readProjectFile?.(relativePath, projectPath);
    if (result?.success && result.data) return result.data;
    return null;
  } catch {
    return null;
  }
}

function buildColorSchemeXml(colors: ColorEntry[]): string {
  if (colors.length === 0) return '';
  const lines: string[] = ['  <color_palette>'];
  for (const c of colors) {
    lines.push(`    <color role="${c.role}" hex="${c.color}" label="${c.label}" />`);
  }
  lines.push('  </color_palette>');
  return lines.join('\n');
}

async function buildFullContext(
  taste: TasteKnobValues,
  selectedRefs: string[],
  projectPath?: string,
  styleDescription?: string,
  colors?: ColorEntry[],
): Promise<string> {
  const parts: string[] = [];
  parts.push(`<design_taste>`);
  parts.push(`  design_variance="${taste.designVariance}"`);
  parts.push(`  motion_intensity="${taste.motionIntensity}"`);
  parts.push(`  visual_density="${taste.visualDensity}"`);
  parts.push(`</design_taste>`);
  parts.push('');
  if (styleDescription) {
    parts.push(`<style_notes>${styleDescription}</style_notes>`);
    parts.push('');
  }
  if (colors && colors.length > 0) {
    parts.push(buildColorSchemeXml(colors));
    parts.push('');
  }
  parts.push('<design_skills>');
  for (const dir of SKILL_DIRS) {
    const content = await readFileContent(`agent/skills/${dir}/SKILL.md`, projectPath);
    if (content) {
      const stripped = content.replace(/---[\s\S]*?---/, '').trim();
      parts.push(stripped.slice(0, 1500));
      parts.push('');
    }
  }
  parts.push('</design_skills>');
  parts.push('');
  const selectedNames = REF_NAMES.filter(r => selectedRefs.includes(r));
  if (selectedNames.length > 0) {
    parts.push('<design_references>');
    for (const name of selectedNames) {
      const content = await readFileContent(`agent/design-references/${name.toLowerCase()}/DESIGN.md`, projectPath);
      if (content) {
        parts.push(`<reference name="${name}">`);
        parts.push(stripped.slice(0, 2000));
        parts.push('</reference>');
        parts.push('');
      }
    }
    parts.push('</design_references>');
  }
  parts.push('[END DESIGN CONTEXT]');
  return parts.join('\n');
}

export default function DesignWorkspacePage({ projectPath, activeTerminalId }: DesignWorkspacePageProps) {
  const [taste, setTaste] = useState<TasteKnobValues>(DEFAULT_TASTE);
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
  const [styleDescription, setStyleDescription] = useState('');
  const [colors, setColors] = useState<ColorEntry[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>('Loading design context...');
  const [loadingContext, setLoadingContext] = useState(true);

  const refreshPreview = useCallback(async () => {
    setLoadingContext(true);
    const ctx = await buildFullContext(taste, selectedRefs, projectPath, styleDescription, colors);
    setPreview(ctx);
    setLoadingContext(false);
  }, [taste, selectedRefs, styleDescription, colors, projectPath]);

  const handleSend = async () => {
    if (!activeTerminalId) return;
    setIsSending(true);
    try {
      const ctx = await buildFullContext(taste, selectedRefs, projectPath, styleDescription, colors);
      const dapi = (window as any).deskflowAPI;
      await dapi?.terminalWrite?.(activeTerminalId, ctx + '\n');
      await dapi?.saveTerminalBinding?.({
        terminalId: activeTerminalId,
        problemId: null,
        sessionContext: JSON.stringify({...}),
        status: 'active',
      });
      setLastSent(new Date().toLocaleTimeString());
    } catch (e) { console.error(e); }
    setIsSending(false);
  };

  // ... render with TasteKnobs, StyleReferences, StyleDescription, ColorPicker, DesignComposeOutlet
}
```

### 3c. Workspace Components

#### TasteKnobs (`src/components/workspace/TasteKnobs.tsx`)
- 3 sliders: Design Variance (1-10), Motion Intensity (1-10), Visual Density (1-10)
- Aesthetic matrix mapping combinations to named styles:
  - `1,1,1` → Corporate Minimalism — IBM
  - `1,1,7` → Bloomberg Terminal — dense, no fluff
  - `1,7,1` → Apple Marketing — sparse, cinematic
  - `1,7,7` → Cyberpunk HUD — dense data, extreme motion
  - `7,1,1` → Brutalist Web — bold, static, airy
  - `7,1,7` → Neo-Brutalist Dashboard — bold, dense, static
  - `7,7,1` → Experimental Art — sparse, chaotic
  - `7,7,7` → Maximalist Chaos — everything, everywhere
  - `5,5,5` → Balanced SaaS — Stripe, Notion, Linear

#### StyleReferences (`src/components/workspace/StyleReferences.tsx`)
- 8 checkboxes: Claude, Linear, Vercel, Stripe, Supabase, Sentry, PostHog, Raycast
- Each has a `path` pointing to `agent/design-references/{name}/DESIGN.md`
- Preview button opens file content in a modal
- Loads via `deskflowAPI.readProjectFile()` IPC bridge

#### ColorPicker (`src/components/workspace/ColorPicker.tsx`)
- Add/remove colors with hex input, role select (11 roles), label
- ColorEntry interface: `{ id, color, role, label }`
- 11 color roles: primary, accent, background, surface, text, muted, success, warning, error, border, custom

#### StyleDescription (`src/components/workspace/StyleDescription.tsx`)
- Free-text textarea for describing design style
- 4 example buttons: "Dark theme with pink accent on zinc background", etc.

#### DesignComposeOutlet (`src/components/workspace/DesignComposeOutlet.tsx`)
- Collapsible preview of generated design context (XML format)
- Send to terminal button (writes to active terminal via IPC)
- Copy button
- Terminal missing warning

### 3d. 5 Design Skills (SKILL.md files)

| Skill | Focus |
|-------|-------|
| `frontend-design` | Glassmorphic dark theme, component API (GlassCard 3 variants, TabBar, SectionHeader, etc.), 8 anti-patterns, DeskFlow-specific conventions |
| `design-taste` | Master aggregator referencing all 4 sub-skills, decision tree, design reference index |
| `taste-skill` | 3 tunable knobs (variance 1-10, motion 1-10, density 1-10), aesthetic variant matrix, anti-repetition rules |
| `impeccable` | 7 domains (typography, color, spatial, motion, interaction, responsive, UX writing), 23 commands, 27 anti-patterns |
| `ui-ux-pro-max` | Industry-specific design rules (dev tools, project mgmt, financial, AI/ML, analytics), style reference library, color palette guide |

### 3e. Design Context XML Output Format

The Design tab generates XML-structured context sent to AI agents:
```xml
<design_taste>
  design_variance="5"
  motion_intensity="5"
  visual_density="5"
</design_taste>

<style_notes>Dark theme with pink accent on zinc background</style_notes>

<color_palette>
  <color role="primary" hex="#ec4899" label="Pink" />
  <color role="background" hex="#18181b" label="Zinc" />
</color_palette>

<design_skills>
  [frontend-design SKILL.md content truncated to 1500 chars]
  [taste-skill SKILL.md content truncated to 1500 chars]
  ...
</design_skills>

<design_references>
  <reference name="Linear">
    [Linear DESIGN.md content truncated to 2000 chars]
  </reference>
</design_references>
[END DESIGN CONTEXT]
```

---

## 4. Current MCP Configuration

### opencode.json (`opencode.json`)
```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ".opencode\\plugins\\graphify.js"
  ],
  "mcp": {
    "@21st-dev/magic": {
      "type": "local",
      "command": ["npx", "-y", "@21st-dev/magic@latest"],
      "environment": {
        "API_KEY": "ca1bf4b10075eb2c0c21f381a168d90db640ddb990b6c0c0d9fc06523c952f4f"
      }
    }
  }
}
```

The 21st.dev MCP is already configured and provides:
- UI component search and generation
- Logo search
- Component inspiration/refinement

**NOTE:** This MCP server is configured in opencode.json (the AI coding tool's config), NOT in the Electron app itself. The renderer has no direct access to this.

---

## 5. Preload Bridge (IPC Endpoints)

### File reading (used by Design tab)
```typescript
// src/preload.ts
readProjectFile: (relativePath: string, projectPath?: string) =>
  ipcRenderer.invoke('read-project-file', relativePath, projectPath),

// Handler in main.ts:
ipcMain.handle('read-project-file', async (event, relativePath: string, projectPath?: string) => {
  const root = projectPath || app.getAppPath();
  const fullPath = path.join(root, relativePath);
  try {
    const data = await fs.promises.readFile(fullPath, 'utf-8');
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});
```

### Terminal write (used by Design tab to send context)
```typescript
// src/preload.ts
terminalWrite: (terminalId: string, data: string) =>
  ipcRenderer.invoke('terminal:write-old-format', terminalId, data),

saveTerminalBinding: (binding: TerminalBinding) =>
  ipcRenderer.invoke('save-terminal-binding', binding),
```

---

## 6. Design Tokens (src/index.css)

```css
@import "tailwindcss";

@theme {
  /* Workspace sidebar tokens */
  --color-ws-surface: #09090b;
  --color-ws-surface-raised: rgba(24, 24, 27, 0.8);
  --color-ws-border: rgba(39, 39, 42, 0.6);
  --color-ws-accent: #22d3ee;
  --color-ws-text: #e4e4e7;
  --color-ws-text-muted: #71717a;
  --ws-radius-card: 0.75rem;
  --ws-dur: 200ms;
  --ws-ease: ease-out;
}
```

---

## 7. Stitch Design System Integration

The project has existing Stitch integration for design prompts:
- `agent/docs/stitch-prompts/INSIGHTS_PAGE.md`
- `agent/docs/stitch-prompts/EXTERNAL_PAGE.md`
- `agent/docs/stitch-prompts/DASHBOARD_REDESIGN.md`

Stitch provides: `create_design_system`, `update_design_system`, `create_design_system_from_design_md`, `list_design_systems`, `generate_screen_from_text`, `edit_screens`, `generate_variants`, `apply_design_system`, `list_projects`, `get_project`, `list_screens`, `get_screen`

---

## 8. Workspace Guidebook / Reference

The workspace has several guide/reference documents:
- `agent/TERMINAL_SIDEBAR_REFERENCE.md` — Terminal sidebar features reference
- `agent/INITIALIZE.md` — Dynamic initialization checklist
- `agent/AGENTS.md` — AI agent workspace instructions (the file the user is reading)
- `agent/FEATURE_TRACKER.md` — Complete inventory of pages and features
- `agent/data.md` — IPC endpoints and DB schema reference

---

## 9. Data Flow: Current Design Context Pipeline

```
User adjusts TasteKnobs → buildFullContext() called
  ↓
readFileContent() reads SKILL.md files via IPC
  ↓
readFileContent() reads DESIGN.md references via IPC
  ↓
XML context assembled in renderer
  ↓
User clicks "Send" → terminalWrite IPC → AI agent receives design context
  ↓
Agent uses context + skills to inform design decisions
```

---

## 10. Key Architectural Constraints

1. **Renderer has NO direct Node access** — All file/process operations go through IPC
2. **No `require()` in renderer** — Only `window.deskflowAPI` preload methods
3. **Tailwind v4 ONLY** — Never v3 directives
4. **MCP servers are in opencode.json** — NOT in the Electron app; the renderer cannot directly invoke MCP tools
5. **The Electron app uses ipcMain/ipcRenderer** — For any new backend capability, new IPC handlers + preload bridges are needed
6. **Design context is currently XML-based** — Sent to AI agents via terminal write
7. **Skill DSL** — Skills defined in YAML frontmatter with 10 widget types, dynamic form generation
