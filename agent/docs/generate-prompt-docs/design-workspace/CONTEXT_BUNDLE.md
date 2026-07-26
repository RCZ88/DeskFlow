# CONTEXT_BUNDLE.md — Design Workspace Expansion + File-Level Backup

> Combined context for the Architect AI. Covers two features:
> 1. **Design Workspace expansion** — fill stub components, extend MCP library coverage, apply all design skills
> 2. **File-level backup/restore system** — per-project file snapshots inside the IDE workspace

---

## Raw Request (verbatim from user)

> "Design two major features using the generate-prompt skill workflow: (1) a per-project file-level backup/restore system inside the IDE workspace, and (2) the Design Workspace — a new workspace tab connecting 10+ premium UI libraries (21st.dev, Aceternity, Refero, Cult UI, Fragments UI, shadcn/ui MCP, AIDesigner, React Bits, Variant, Swishy.ai, Magic UI, Lucide, Iconify, Motion, Unsplash) via MCP servers into a unified UI with theme cohesion. The generate-prompt workflow produces an Architect AI prompt that yields a Fix Packet with exact file changes."

---

## A. Design Workspace — Current Implementation

### A1. Main Entry Point: DesignWorkspacePage.tsx

Full source at `src/pages/DesignWorkspacePage.tsx` (607 lines). Key elements:

**10-Library Definition Array** (lines 56-107):
```typescript
const DEFAULT_LIBRARIES: DesignLibraryDef[] = [
  { id: '21st-dev', label: '21st.dev', icon: Package, group: 'mcp', ... },
  { id: 'aceternity', label: 'Aceternity UI', icon: Grid, group: 'registry', ... },
  { id: 'refero', label: 'Refero', icon: Zap, group: 'mcp', ... },
  { id: 'cult-ui', label: 'Cult UI', icon: Paintbrush, group: 'registry', ... },
  { id: 'fragments-ui', label: 'Fragments UI', icon: LayoutPanelTop, group: 'mcp', ... },
  { id: 'shadcn-ui-mcp', label: 'shadcn/ui MCP', icon: Code2, group: 'mcp', ... },
  { id: 'aidesigner', label: 'AIDesigner', icon: Sparkles, group: 'mcp', ... },
  { id: 'reactbits', label: 'React Bits', icon: Rabbit, group: 'registry', ... },
  { id: 'swishy-motion', label: 'Swishy Motion', icon: Wind, group: 'motion', ... },
  { id: 'variant', label: 'Variant', icon: Image, group: 'web-tool', ... },
];
```

**DesignLibraryDef interface** (lines 14-24):
```typescript
export interface DesignLibraryDef {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: any;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  itemCount: number;
  accentColor: string;
  group: 'mcp' | 'registry' | 'web-tool' | 'motion';
}
```

**Source group sets** (lines 109-110):
```typescript
const REGISTRY_SOURCES = new Set(['aceternity', 'cult-ui', 'reactbits']);
const MCP_SOURCES = new Set(['21st-dev', 'refero', 'fragments-ui', 'shadcn-ui-mcp', 'aidesigner']);
```

**3 sub-tabs** (lines 510-568):
- `sources` — DesignLibrarySources grid + StyleDescription + ColorPicker
- `motion` — MotionExplorer (STUB)
- `registry` — CultUIRegistry

**State management** (lines 270-285): React state for taste knobs, selected refs, style description, colors, libraries, imported components, active browse/config library, active tab.

**Server start/stop** (lines 316-364): `handleStartServer` tries registry fetch first (aceternity), then MCP start for mcp sources. `handleStopServer` stops MCP servers.

**Context building** (lines 201-268): `buildFullContext` assembles an XML-like design context string from taste knobs, skills, references, colors, imported components, and enabled libraries.

### A2. DesignLibrarySources.tsx (189 lines)

Full source at `src/components/workspace/DesignLibrarySources.tsx`. Renders a grid of library cards, each showing status dot, item count, connect/disconnect button, and a 3-dot menu with Configure/Enable toggle.

### A3. LibraryConfigModal.tsx (404 lines)

Full source at `src/components/workspace/LibraryConfigModal.tsx`. Shows 8 source configs (21st-dev, aceternity, refero, cult-ui, fragments-ui, shadcn-ui-mcp, aidesigner, reactbits). Missing: swishy-motion, variant.

Each config has: MCP command input, API key input (for 21st-dev/refero), registry URL (aceternity), auto-start toggle, Start/Stop/Refresh/Clear Cache buttons, status indicator.

### A4. ComponentBrowserModal.tsx (319 lines)

Full source at `src/components/workspace/ComponentBrowserModal.tsx`. Currently handles ONLY 3 libraries (21st-dev, aceternity, refero) with inline MCP calls. Has search, category tabs, expandable code preview, and Add button.

**Missing coverage**: fragments-ui, shadcn-ui-mcp, reactbits, cult-ui — these need fetchComponent hooks too.

### A5. CultUIRegistry.tsx (263 lines)

Full source at `src/components/workspace/CultUIRegistry.tsx`. Full implementation with 45 inline component definitions, search, category filter, expandable sections, install command copy, add-to-context button.

### A6. MotionExplorer.tsx — STUB (3 lines)

```typescript
export function MotionExplorer({ onAddMotionSnippet, onClose }: {
  onAddMotionSnippet: (snippet: { name: string; code: string }) => void;
  onClose?: () => void;
}) {
  return null;
}
```

This is a COMPLETE STUB — returns null. Needs a real motion exploration UI integrating Swishy Motion presets, Framer Motion curve browser, and kinetic typography codegen.

### A7. TasteKnobs.tsx (83 lines)

Three sliders (Design Variance, Motion Intensity, Visual Density, each 1-10). Aesthetic map that maps (low/mid/high, low/mid/high, low/mid/high) combos to named aesthetic labels. Defines the `TasteKnobValues` interface used globally.

### A8. ColorPicker.tsx (285 lines)

Full color scheme editor with hex input, role selector, label input, 6 preset color schemes (Galaxy Dark, Cyberpunk, Warm Earth, Ocean, Minimal Light, Sunset), JSON import, swatch display.

### A9. StyleReferences.tsx (113 lines)

Checkbox list of 8 design references (Claude, Linear, Vercel, Stripe, Supabase, Sentry, PostHog, Raycast) with preview panel that reads `agent/design-references/<name>/DESIGN.md`.

### A10. StyleDescription.tsx (117 lines)

Freeform textarea with preset buttons organized in 4 groups (Dark, Light, Vibrant, Minimal). Quick picks for common descriptions.

### A11. DesignComposeOutlet.tsx (139 lines)

Collapsible output panel showing the generated XML design context. Has Copy button, Send to Terminal button (requires active terminal), source attribution badges, "last sent" indicator.

### A12. Workspace Design System — `_ds/`

**controls.tsx** (80 lines):
```typescript
export const INPUT_CLS = 'w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 ...';
export const BTN_PRIMARY = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 ... bg-[color:var(--page-accent)] ...';
export const BTN_GHOST = '...';
export const filterChipCls = (active: boolean) => `...`;
export const accentVars = (hex: string): React.CSSProperties => ({ ['--page-accent' as string]: hex });
export const Pill: React.FC<{ label: string; cls: string; dot?: string; compact?: boolean }>;
export const ModalShell: React.FC<{ onClose; title; children; accent?; maxWidth? }>;
```

**primitives.tsx** (106 lines):
```typescript
export type WorkStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export const StatusPill: React.FC<{ status: WorkStatus; icon?; compact? }>;
export const Chip: React.FC<{ active?; onClick?; children; title? }>;
export const ProgressBar: React.FC<{ value: number; total: number }>;
export const Skeleton: React.FC<{ className? }>;
export const IconButton: React.FC<{ onClick?; title; children; danger?; className? }>;
export const EmptyState: React.FC<{ icon; title; hint? }>;
```

### A13. opencode.json — MCP Server Config

```json
{
  "mcp": {
    "@21st-dev/magic": { "type": "local", "command": ["node", "scripts/mcp-launcher.mjs", "21st-dev"], "enabled": true },
    "probe": { "type": "local", "command": ["node", "C:/Users/cleme/Documents/COMPUTAH_SAYENCE/probe/dist/index.js"], "enabled": true },
    "notion": { "type": "local", "command": ["npx", "-y", "@suekou/mcp-notion-server"], "enabled": true },
    "shadcn": { "type": "local", "command": ["npx", "-y", "shadcn@latest", "mcp"], "enabled": true },
    "magicui": { "type": "local", "command": ["npx", "-y", "@magicuidesign/mcp@latest"], "enabled": true },
    "lucide": { "type": "local", "command": ["npx", "-y", "lucide-icons-mcp"], "enabled": true },
    "unsplash": { "type": "local", "command": ["node", "scripts/mcp-launcher.mjs", "unsplash"], "enabled": true },
    "reactbits": { "type": "local", "command": ["npx", "-y", "reactbits-dev-mcp-server"], "enabled": true },
    "iconify": { "type": "local", "command": ["npx", "-y", "better-icons-mcp"], "enabled": true },
    "fragments-ui": { "type": "local", "command": ["npx", "-y", "@usefragments/mcp"], "enabled": true },
    "shadcn-ui-mcp": { "type": "local", "command": ["npx", "-y", "@jpisnice/shadcn-ui-mcp-server"], "enabled": true },
    "refero-mcp": { "type": "local", "command": ["npx", "-y", "@refero/mcp"], "enabled": false },
    "aidesigner": { "type": "url", "url": "https://api.aidesigner.ai/api/v1/mcp", "enabled": false }
  }
}
```

---

## B. File-Level Backup System — Current State

### B1. DB Backup is FULLY IMPLEMENTED

The database backup system at `src/main/backup/BackupService.ts` (307 lines) provides:
- `openDatabaseSafely()` — path guard + WAL checkpoint + integrity check
- `createBackup(db, trigger)` — verified rotating backups with gzip + manifest
- `exportJSON(db)` / `exportCSV(db, tables)` — portable exports
- `restoreFromBackup(name)` — safe atomic restore with pre-restore snapshot
- `startBackupScheduler(db)` / `backupOnQuit(db)` — lifecycle wiring

**IPC handlers** in `src/main.ts` (lines 4215-4237):
- `backup:create` → `createBackup(db, 'manual')`
- `backup:list` → `listBackups()`
- `backup:restore` → creates pre-restore backup, then `restoreFromBackup(name)`
- `backup:exportJSON` → `exportJSON(db)`
- `backup:exportCSV` → `exportCSV(db, tables)`

**Preload bridge** in `src/preload.ts` (lines 940-945):
```typescript
backup: {
  create: () => ipcRenderer.invoke('backup:create'),
  list: () => ipcRenderer.invoke('backup:list'),
  restore: (name: string) => ipcRenderer.invoke('backup:restore', name),
  exportJSON: () => ipcRenderer.invoke('backup:exportJSON'),
  exportCSV: (tables: string[]) => ipcRenderer.invoke('backup:exportCSV', tables),
}
```

### B2. IDE Backup Tab — PLACEHOLDER

In `src/pages/IDEProjectsPage.tsx` (lines 3833-3856):
```typescript
{/* Backup Tab (replaces Trash) */}
{activeTab === 'backup' && (
  <motion.div data-section="ide.backup" ...>
    <GlassCard>
      <div className="flex items-center gap-3 mb-4">
        <Archive className="w-6 h-6 text-zinc-400" />
        <div>
          <h2 className="text-xl font-semibold text-white">Backup</h2>
          <p className="text-sm text-zinc-400">Backup snapshots for AI coding changes — coming soon</p>
        </div>
      </div>
      <EmptyState icon={<Archive />} title="Backup system not yet active"
        description="Create a backup before your next AI coding session to enable file-level restore" />
    </GlassCard>
  </motion.div>
)}
```

The backup tab is registered as a tab key at line 322:
```typescript
type TabKey = 'overview' | 'projects' | 'ai' | 'git' | 'environment' | 'analytics' | 'backup';
```

And visible as a sidebar tab (line 337):
```typescript
{ key: 'backup', label: 'Backup', icon: Archive },
```

### B3. Existing Project File IPC

Project file operations already exist at:
- `preload.ts:443` — `readProjectFile: (relativePath, projectPath?) => ipcRenderer.invoke('read-project-file', relativePath, projectPath)`
- `preload.ts:444` — `writeProjectFile: (relativePath, content, projectPath?) => ipcRenderer.invoke('write-project-file', relativePath, content, projectPath)`
- `preload.ts:249` — `restoreProject: (projectId) => ipcRenderer.invoke('restore-project', projectId)`

---

## C. Available Frontend Design Skills

The system has these design skills available (paths under `agent/skills/`):
1. **frontend-design** — DeskFlow-specific component patterns, tokens, spacing
2. **humancentred-UIUX** — empty/loading/error states, progressive disclosure, feedback
3. **impeccable** — 7 design dimensions, 27 anti-patterns
4. **motion-alive** — Liveliness Levels (L1/L2/L3), motion taxonomy
5. **ui-ux-pro-max** — industry-specific design rules
6. **taste-skill / design-taste** — design variance knobs, anti-repetition
7. **frontend-external-infra** — source routing, re-skin rules, anti-slop checklist

All skills are loaded at runtime by `buildFullContext()` in DesignWorkspacePage.tsx.

---

## D. Design Tokens & Visual Identity

- **Theme**: Dark zinc, pink/rose accent
- **Cards**: `bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5`
- **Glass layer**: `bg-zinc-900/80 backdrop-blur-xl`
- **Fonts**: Geist (UI) + JetBrains Mono (code)
- **Accent color**: Pink-400/500/600 (`#f472b6`, `#ec4899`, `#db2777`)
- **Tab accent**: Active tab uses `bg-pink-950/20 border-pink-300`
- **Modal**: `bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/60 rounded-xl`
- **Sub-tab bar**: Rounded-full chip pills with accent colors

---

## E. Architecture Notes

### Data Flow for Design Workspace
1. User adjusts taste knobs / selects references / adds components via modals
2. `buildFullContext()` reads skill files + reference files from project path
3. Context XML is displayed in DesignComposeOutlet
4. User clicks "Send Design Context to Terminal" → writes context to active terminal via `agentSend()` IPC
5. User can also copy context manually

### Data Flow for Backup
1. DB backup is already automatic: on startup, every 30 min, on quit
2. IPC handlers exist for manual backup, list, restore, export
3. Backup tab in IDE exists as a placeholder — needs the actual UI

### IPC Pattern (example: backup:list)
```
preload.ts → ipcRenderer.invoke('backup:list')
main.ts → ipcMain.handle('backup:list', () => listBackups())
BackupService.ts → exports listBackups() → reads backup dir JSON manifests
```

### Result/Error Wrapper
All IPC handlers use the pattern `{ success: boolean, data?: T, error?: string }`.

---

## F. Gaps & Required Work

### Design Workspace Gaps
1. **MotionExplorer.tsx** is a STUB — needs real implementation with Swishy Motion presets, Framer Motion curve browser, kinetic typography codegen
2. **ComponentBrowserModal.tsx** only handles 3 of 10 libraries — needs connection for fragments-ui, shadcn-ui-mcp, reactbits, cult-ui
3. **LibraryConfigModal.tsx** lists 8 sources but NOT swishy-motion or variant
4. **No Magic UI, Lucide, Iconify, Unsplash integration** — these MCP servers exist in opencode.json but have no UI in Design Workspace
5. **DesignLibrarySources.tsx** shows empty state when no libraries enabled — needs better guidance
6. **No skill preview** — user can select references but can't see what skills are being used

### Backup System Gaps
1. **IDE backup tab is a placeholder** — needs full file-level backup/restore UI
2. **No file-level backup system exists** — only DB backup. Need per-project file snapshot (copy project files, zip, store)
3. **No schedule/auto-backup for project files** — only for DB
4. **No restore UI** — no way to browse/restore file-level snapshots
5. **No visual diff** between current project and last backup
6. **No "backup before AI session" flow** — the placeholder mentions this but no implementation
