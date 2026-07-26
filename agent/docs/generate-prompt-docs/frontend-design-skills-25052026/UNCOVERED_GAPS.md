# GAP: Missing DesignSkillsPanel Component

## Context

This is a follow-up to the main Design Skills System prompt. The main RESULT.md is complete except for one missing file.

## What's Missing

The file `src/components/DesignSkillsPanel.tsx` was NOT generated. It is imported by `NewSessionDialog.tsx` (line 4):

```tsx
import DesignSkillsPanel, { DesignSkillConfig } from './DesignSkillsPanel';
```

Without this component, the dialog won't compile.

## Interface It Must Satisfy

From `NewSessionDialog.tsx`, the usage is:

```tsx
export interface DesignSkillConfig {
  enabled: boolean;
  skills: {
    frontendDesign: boolean;
    impeccable: boolean;
    uiUxProMax: boolean;
    tasteSkill: boolean;
    designTaste: boolean;
  };
  levels: {
    designVariance: number;    // 1-10 slider
    motionIntensity: number;   // 1-10 slider
    visualDensity: number;     // 1-10 slider
  };
  includeReferences: boolean;
  activeReference: string | null;
}
```

Usage in dialog (lines 328-332):
```tsx
<DesignSkillsPanel
  config={designSkillsConfig}
  onChange={setDesignSkillsConfig}
  designRefCount={designRefCount}
  isInitialized={designSkillsInitialized}
  onInitialize={handleInitializeDesignSkills}
/>
```

## What the Component Should Render

A dark-themed panel (zinc palette, matching existing DeskFlow components) containing:

### 1. Not-Initialized State
When `isInitialized` is false:
- Message: "Design skills files not yet initialized"
- Button: "Initialize Design Skills" that calls `onInitialize()`
- The `onInitialize` callback triggers `trackerMindSetup` which copies skill files

### 2. Initialized State
When `isInitialized` is true:

**Sub-skill checkboxes** (5 toggles, pre-checked):
- Frontend Design (core skill, can't be disabled if master is on)
- Impeccable (design rules, commands, anti-patterns)
- UI UX Pro Max (industry rules, color palettes)
- Taste Skill (configurable knobs)
- Design Taste System (master aggregator)

Each checkbox shows a short description below the label. Use the `SystemToggleCard` pattern: small toggle button (w-8 h-4 rounded-full) with accent color.

**Three range sliders** (1-10), labeled:
- Design Variance (1=Conservative, 10=Experimental)
- Motion Intensity (1=Static, 10=Cinematic)
- Visual Density (1=Airy, 10=Maximal)

Dark slider styling: zinc track, pink-500 filled portion, pink-400 thumb. Labels above in text-[10px] uppercase tracking-wider.

**Checkbox**: "Include Design References (DESIGN.md templates)" with count showing `designRefCount` references available.

### 3. Design Tokens to Use

Use the DeskFlow dark theme styling:
- Panel background: `bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4`
- Sub-headers: `text-[10px] text-zinc-500 uppercase tracking-wider font-medium`
- Checkbox rows: `flex items-center justify-between p-2 rounded hover:bg-zinc-800/50`
- Slider container: `space-y-3 p-3 bg-zinc-900/30 rounded border border-zinc-800/30`
- Slider input: styled range input (zinc track, pink fill)
- Toggle buttons: same pattern as `SystemToggleCard` (w-8 h-4 rounded-full, pink-500/40 when on)

### 4. Props

```tsx
interface Props {
  config: DesignSkillConfig;
  onChange: (config: DesignSkillConfig) => void;
  designRefCount: number;
  isInitialized: boolean;
  onInitialize: () => void;
}
```

## Component Output

Generate the complete file as `src/components/DesignSkillsPanel.tsx`. It must be self-contained (all styles inline via Tailwind v4 classes) and use React 19 patterns (functional component, hooks).

## Deliverable

The full `src/components/DesignSkillsPanel.tsx` file content, matching the existing DeskFlow codebase patterns.
