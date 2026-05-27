# FRONTEND DESIGN WORKSPACE + COMPOSE REDESIGN — Design Prompt

## Goal

Create a **plugin/workspace architecture** where skills are not just SKILL.md files but can provide dedicated UIs, sidebar entries, and custom interactions. The first-class implementation target is the **Frontend Design Workspace** (managing styles, references, taste knobs, design previews), followed by a generalized compose system.

## Core Concept

```
Sidebar
├── Terminal          (existing)
├── Sessions          (existing)
├── Design Workspace  ★ NEW — first-class skill workspace
│   ├── Taste Knobs (variance, intensity, density sliders)
│   ├── Style Manager (active DESIGN.md references)
│   ├── Live Preview (sample component with current settings)
│   └── Compose (integrated — assemble prompt with design context)
├── [Other Plugin Workspaces] ★ FUTURE — per-skill UIs
└── Compose Hub       ★ NEW — universal prompt assembler
```

Each skill that wants a dedicated UI registers as a **workspace plugin**:
- It gets a sidebar entry
- It provides its own React component(s)
- It exposes a `composeContext()` method to populate the Compose Hub
- It has access to the global skill context (problems, requests, checklists)

---

## Part 1: Design Workspace (Primary)

### Location
- New sidebar entry: "Design" with palette icon
- Opens in the main content area (same routing as Terminal/Dashboard/External)

### Workspace Layout

```
┌──────────────────────────────────────────────────────────┐
│  Design Workspace                          [Compose ▸]  │
├────────────────┬─────────────────────────────────────────┤
│                │                                         │
│  SKILLS PANEL  │           MAIN AREA                     │
│                │                                         │
│  ☑ frontend-   │  ┌── TASTE KNOBS ──────────────────┐   │
│     design      │  │ Variance  [=========○======] 7  │   │
│  ☑ impeccable   │  │ Intensity [====○===========] 4  │   │
│  ☑ ui-ux-pro-   │  │ Density   [===========○====] 6  │   │
│     max         │  │ ────────────────────────────── │   │
│  ☑ taste-skill  │  │ Aesthetic: Experimental +     │   │
│  ☑ design-taste │  │ Cinematic + Balanced →        │   │
│  ☐ (custom)     │  │ "Interactive Dashboard"       │   │
│                │  └──────────────────────────────────┘   │
│  [Manage       │                                         │
│   References ▸]│  ┌── STYLE REFERENCES ──────────────┐   │
│                │  │ ☑ Linear (ultra-minimal, purple) │   │
│                │  │ ☑ Vercel (B&W precision)         │   │
│                │  │ ☐ Claude (warm terracotta)       │   │
│                │  │ ☐ Stripe (purple gradients)      │   │
│                │  │ ────────────────────────────── │   │
│                │  │ Active: 2/8 references           │   │
│                │  │ Token budget: ██████░░ 600/800  │   │
│                │  └──────────────────────────────────┘   │
│                │                                         │
│                │  ┌── COMPOSE OUTLET ────────────────┐   │
│                │  │ [Send to Terminal ▸]              │   │
│                │  │ Preview: "Using Linear style +   │   │
│                │  │ impeccable anti-patterns with    │   │
│                │  │ variance 7..."                    │   │
│                │  └──────────────────────────────────┘   │
└────────────────┴─────────────────────────────────────────┘
```

### Features

**Skills Panel (left sidebar):**
- Checkbox list of all design-related skills
- Shows skill status (enabled/disabled)
- Token usage per skill
- "Manage References" expandable section

**Taste Knobs (top main area):**
- 3 sliders: Design Variance, Motion Intensity, Visual Density (1-10)
- Real-time aesthetic label (e.g., "Experimental + Cinematic + Balanced")
- Presets dropdown: "Dense Dev", "Marketing Splash", "Minimal Clean", custom
- Visual indicator of the current aesthetic archetype

**Style References (middle main area):**
- Curated list of DESIGN.md files (Linear, Vercel, Claude, Stripe, etc.)
- Per-reference toggle
- Combined token budget bar (shows how much context space is used)
- Quick-view button to read a reference file

**Compose Outlet (bottom main area):**
- "Send to Terminal" button that builds a design context prompt
- Prompt preview showing assembled content
- Option to also include problems/requests/checklist context
- Token budget indicator

### Integration Points

| Feature | Connects To | How |
|---------|------------|-----|
| Taste Knobs | `assembleContext()` in ContextService | Level values passed in `design_skills.levels` |
| Skill toggles | SkillsService | Enables/disables design skill inclusion |
| References | DESIGN.md files | Lists available, includes paths in context |
| Compose Outlet | InstructionPanel (Compose Hub) | Pre-populates design context when sending |

---

## Part 2: Plugin/Workspace Architecture

### How a Skill Becomes a Workspace

```typescript
interface SkillPlugin {
  id: string;                    // matches SKILL.md frontmatter id
  name: string;                  // display name
  category: string;              // 'design' | 'debug' | 'research' | etc
  sidebarEntry?: {               // if provided, gets sidebar item
    label: string;
    icon: string;                // lucide icon name
    route: string;               // e.g. '/workspace/design'
    order: number;               // position in sidebar
  };
  workspace?: {                  // React component(s)
    component: React.ComponentType<SkillWorkspaceProps>;
    minWidth?: number;           // min panel width
  };
  composeContext: () => Promise<string>;  // returns context snippet for Compose Hub
}
```

### Registration

- Skills declare `sidebarEntry` and `workspace` in their frontmatter or a `plugin.json`
- A `WorkspaceRegistry` service scans `agent/skills/*/` for workspace-enabled skills
- The sidebar dynamically renders entries from registered workspace plugins
- The router gets dynamic routes: `/workspace/:skillId`

### Workspace Props

```typescript
interface SkillWorkspaceProps {
  skill: SkillPlugin;
  projectPath?: string;
  projectId?: string;
  // Shared services
  onCompose: (context: string) => void;  // send to Compose Hub
  onError: (error: Error) => void;
}
```

### Currently identifiable workspace candidates

| Skill | Workspace Potential | Priority |
|-------|-------------------|----------|
| frontend-design | ✅ Full workspace (styles, preview, references) | P0 |
| impeccable | ✅ Design rules viewer + anti-pattern browser | P1 |
| ui-ux-pro-max | ✅ Industry selector + style matcher | P1 |
| taste-skill | ✅ Knob controls (integrated into design workspace) | P0 |

---

## Part 3: Compose Hub (Universal Prompt Assembler)

### Concept
The Compose Hub replaces the old "Compose" tab. It's a dedicated page/section where you assemble context from any source (workspaces, problems, requests, checklists, agent files).

### Layout

```
┌─────────────────────────────────────────────┐
│  Compose Hub  ──── Context Sources ──────── │
├─────────────────────────────────────────────┤
│                                             │
│  ☑ Design Workspace  [taste knobs + refs]   │
│     ↳ "Linear style, variance 7..."         │
│                                             │
│  ☐ Problems          3 selected ▸           │
│  ☐ Requests          2 selected ▸           │
│  ☐ Checklists        1 selected ▸           │
│                                             │
│  ─────────────────────────────────────      │
│                                             │
│  Skill: [frontend-design] + [impeccable] ▾  │
│  multi-select chips                          │
│                                             │
│  Custom Instructions:                        │
│  ┌─────────────────────────────────────┐    │
│  │  Make it look like Linear but with  │    │
│  │  warmer colors for the dashboard    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Prompt Preview (assembled):               │
│  ┌─────────────────────────────────────┐    │
│  │ ## Design Context                   │    │
│  │ Variance: 7, Density: 6...          │    │
│  │ ## Problems                         │    │
│  │ PROB-1: Chart perf...               │    │
│  │ ## Instructions                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [Cancel]            [Send to Terminal ▸]   │
└─────────────────────────────────────────────┘
```

### Features

- **Source selector:** Checkbox list of all context sources (workspaces, problems, requests, checklists)
- **Multi-skill chips:** Select multiple skills, ordered by priority
- **Instruction textarea:** Free-form additional instructions
- **Prompt preview:** Real-time assembled markdown
- **Workspace context inline:** Shows what each workspace contributes (expandable)

---

## Part 4: Implementation Order

| Phase | Scope | Details |
|-------|-------|---------|
| **1** | SkillPlugin interface + WorkspaceRegistry | Define types, registry service, scan for plugins |
| **2** | Design Workspace shell | Sidebar entry, route, empty workspace with sections |
| **3** | Taste Knobs UI | 3 sliders, presets, aesthetic label, save to context config |
| **4** | Style References UI | Browse DESIGN.md, toggle, token budget bar |
| **5** | Design Compose Outlet | "Send to Terminal" builds context from current settings |
| **6** | Compose Hub page | Universal assembler, multi-source, multi-skill, preview |
| **7** | Terminal compose tab → Compose Hub | Migrate InstructionPanel to Hub model |
| **8** | Problems/Requests/Checklists integration | Wire into Compose Hub as context sources |
| **9** | Legacy cleanup | Remove old Skills/Compose/Checklists/Problems/Requests subtabs |

---

## Part 5: Data Flow

```
[Design Workspace UI]
  │ Taste Knobs → ContextConfig.design_skills.levels
  │ Skill toggles → ContextConfig.design_skills.skills[]
  │ Reference toggles → ContextConfig.design_skills.include_references
  │
  ▼
[WorkspaceRegistry]  ← scans agent/skills/*/plugin.json
  │
  ▼
[Compose Hub]
  │
  ├── (from Design Workspace) design context snippet
  ├── (from Problems) active problems
  ├── (from Requests) active requests
  ├── (from Checklists) related checklist progress
  ├── selected skills (multi) → SKILL.md excerpts
  └── + custom instructions
  │
  ▼
[assembleContext()]
  │
  ▼
[Send to Terminal] → IPC → AI agent session
```

---

## Part 6: Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/types/SkillPlugin.ts` | SkillPlugin interface, WorkspaceRegistry types |
| `src/services/WorkspaceRegistry.ts` | Scan, register, resolve workspace plugins |
| `src/pages/DesignWorkspacePage.tsx` | Design workspace shell with sections |
| `src/components/workspace/TasteKnobs.tsx` | 3 sliders + presets + aesthetic label |
| `src/components/workspace/StyleReferences.tsx` | DESIGN.md browser + toggles |
| `src/components/workspace/DesignComposeOutlet.tsx` | Compose from design context |
| `src/pages/ComposeHubPage.tsx` | Universal prompt assembler |
| `src/components/workspace/ComposeSourceSelector.tsx` | Multi-source checklist |

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Add routes: `/workspace/design`, `/compose-hub` |
| `src/components/Sidebar.tsx` | Add dynamic workspace entries from registry |
| `src/services/ContextService.ts` | Workspace-aware `buildDesignSkillsContext()` |
| `src/services/ContextConfig.ts` | Enhanced `design_skills` schema |
| `src/pages/TerminalPage.tsx` | Simplify: remove old Skills/Compose/Problems/Requests subtabs |
| `src/preload.ts` | New IPC bridges for workspace data |

### IPC Endpoints (New)

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `get-workspace-skills` | IPC → Renderer | List workspace-enabled skills |
| `get-design-references` | IPC → Renderer | Enumerate DESIGN.md files |
| `get-design-reference-content` | IPC → Renderer | Read specific DESIGN.md |
| `save-design-config` | Renderer → IPC | Persist knob/ref settings |

---

## Constraints

- **No new npm packages** — use React Context or existing state management
- **Tailwind v4 only** — `@import "tailwindcss"` syntax, no `@apply` or `@tailwind`
- **No git revert/reset/restore** — manually fix any issues
- **Backward compatibility** — existing IPC endpoints must keep working
- **Build must succeed** — always verify with `npm run build`
- **Minimal diff per phase** — do NOT implement all phases in one shot
- **Sidebar must work** — dynamic entries must not break existing navigation

---

## How to Use This Prompt

1. Start with **Phase 1** (SkillPlugin interface + WorkspaceRegistry)
2. Implement **Phase 2** (Design Workspace shell — gets it visible in sidebar)
3. Iterate through remaining phases
4. After each phase: `npm run build`, verify, commit if asked
5. Only move to next phase when user confirms current phase works
