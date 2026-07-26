# Architect Prompt — Design Workspace Expansion + File-Level Backup System

## Prompt Type
- **Type**: `design`
- **Output**: `full-prompt` with Fix Packet ZIP
- **Target AI**: Claude (Architect)
- **Detail Level**: 10 (maximum — include every file path, interface, and code snippet)

---

## Your Task

You are an Architect AI. Your job is to produce a **Fix Packet** — a ZIP file containing replacement source files — for TWO features in the DeskFlow Electron+React application:

1. **Design Workspace Expansion** — fill in all stub components, connect MCP servers, apply all design skills
2. **File-Level Backup/Restore System** — replace the placeholder Backup tab in IDEProjectsPage with a real file-snapshot UI

Output: a ZIP containing ONLY the changed files (no full project copy). Include a `FIX_PACKET.md` at the root describing every change file-by-file with line numbers and reasoning.

---

## Critical Rules

- **NEVER add explanatory comments** to code. Zero comments in output files.
- **Files use CRLF** line endings. Preserve them.
- **Implement EVERYTHING** in this spec. No skipping "minor" items (see §6 of AGENTS.md).
- **Prefer renderer-side fixes.** Read the full IPC handler before editing main.ts.
- **All localStorage access wrapped in try/catch.**
- **All available design skills apply** to every new/modified UI component: frontend-design, humancentred-UIUX, impeccable, motion-alive, ui-ux-pro-max, taste-skill, frontend-external-infra.
- **Cover all 4 states**: empty, loading, error, populated.
- **Anti-slop checklist**: no default fonts, no purple gradients, no same-radius-everything, no hero clichés.
- **Re-skin** any externally-sourced component to DeskFlow tokens (dark zinc, pink accent, Geist/JetBrains Mono, rounded-xl cards, backdrop-blur-xl).

---

## Feature 1: Design Workspace Expansion

### Existing Architecture

The Design Workspace lives at route `/design-workspace` (or as a workspace subtab under Studio → Design in `/terminal`). The main page is `src/pages/DesignWorkspacePage.tsx`.

**Current components and their state:**

| Component | File | Status |
|---|---|---|
| DesignWorkspacePage | `src/pages/DesignWorkspacePage.tsx` | Main page, 607 lines, full |
| DesignLibrarySources | `src/components/workspace/DesignLibrarySources.tsx` | Grid of library cards, 189 lines |
| LibraryConfigModal | `src/components/workspace/LibraryConfigModal.tsx` | 404 lines, missing swishy-motion + variant |
| ComponentBrowserModal | `src/components/workspace/ComponentBrowserModal.tsx` | 319 lines, only 3/10 libs supported |
| MotionExplorer | `src/components/workspace/MotionExplorer.tsx` | **STUB — returns null** |
| CultUIRegistry | `src/components/workspace/CultUIRegistry.tsx` | 263 lines, full |
| TasteKnobs | `src/components/workspace/TasteKnobs.tsx` | 83 lines, 3 sliders |
| ColorPicker | `src/components/workspace/ColorPicker.tsx` | 285 lines, full |
| StyleReferences | `src/components/workspace/StyleReferences.tsx` | 113 lines, 8 refs |
| StyleDescription | `src/components/workspace/StyleDescription.tsx` | 117 lines, presets |
| DesignComposeOutlet | `src/components/workspace/DesignComposeOutlet.tsx` | 139 lines, full |
| _ds/controls | `src/components/workspace/_ds/controls.tsx` | Design system atoms |
| _ds/primitives | `src/components/workspace/_ds/primitives.tsx` | StatusPill, Chip, ProgressBar, Skeleton, EmptyState, IconButton |

**The 10-library definition array** (in DesignWorkspacePage.tsx):
```typescript
const DEFAULT_LIBRARIES = [
  { id: '21st-dev', label: '21st.dev', icon, group: 'mcp' },
  { id: 'aceternity', label: 'Aceternity UI', icon, group: 'registry' },
  { id: 'refero', label: 'Refero', icon, group: 'mcp' },
  { id: 'cult-ui', label: 'Cult UI', icon, group: 'registry' },
  { id: 'fragments-ui', label: 'Fragments UI', icon, group: 'mcp' },
  { id: 'shadcn-ui-mcp', label: 'shadcn/ui MCP', icon, group: 'mcp' },
  { id: 'aidesigner', label: 'AIDesigner', icon, group: 'mcp' },
  { id: 'reactbits', label: 'React Bits', icon, group: 'registry' },
  { id: 'swishy-motion', label: 'Swishy Motion', icon, group: 'motion' },
  { id: 'variant', label: 'Variant', icon, group: 'web-tool' },
];
```

**The MCP servers configured in opencode.json:**
| Name | Type | How |
|---|---|---|
| @21st-dev/magic | local | `node scripts/mcp-launcher.mjs 21st-dev` |
| shadcn | local | `npx shadcn@latest mcp` |
| magicui | local | `npx @magicuidesign/mcp@latest` |
| lucide | local | `npx lucide-icons-mcp` |
| unsplash | local | `node scripts/mcp-launcher.mjs unsplash` |
| reactbits | local | `npx reactbits-dev-mcp-server` |
| iconify | local | `npx better-icons-mcp` |
| fragments-ui | local | `npx @usefragments/mcp` |
| shadcn-ui-mcp | local | `npx @jpisnice/shadcn-ui-mcp-server` |
| refero-mcp | local | `npx @refero/mcp` (disabled) |
| aidesigner | url | `https://api.aidesigner.ai/api/v1/mcp` (disabled) |

### Required Changes

#### 1.1 MotionExplorer.tsx — Replace STUB with full implementation

Current file: `src/components/workspace/MotionExplorer.tsx` — 3 lines, returns null.

Replace with a rich motion exploration UI containing:

**a) Swishy Motion Presets Section**
Import the Swishy Motion presets. Create a visual card grid showing 12+ kinetic typography presets:
- Word Fade Cascade
- Character Reveal
- Glow Pulse
- Card Hover Lift
- Magnetic Button
- Stagger List
- Scale In
- Rotate In
- Stretch In
- Bounce In
- Shimmer Text
- Morphing Gradient

Each card shows: preset name, animation preview (micro-interaction), difficulty badge (easy/medium/advanced), "Copy Code" button, "Add to Context" button.

**b) Framer Motion Curve Browser**
An interactive SVG visualization area with preset easing curves. Show `cubic-bezier` previews as SVG paths. Include these easing presets:
- Linear (0, 0, 1, 1)
- Ease (0.25, 0.1, 0.25, 1)
- Ease In (0.42, 0, 1, 1)
- Ease Out (0, 0, 0.58, 1)
- Ease In Out (0.42, 0, 0.58, 1)
- Spring gentle
- Spring bouncy
- Anticipate
- Overshoot

Each preset shows: SVG bezier path, name, formula, selectable chip.

**c) Code Generator**
When a user selects a motion preset + easing curve + target element type, generate a ready-to-use Framer Motion `motion.div` code snippet.

**d) Props**
- `onAddMotionSnippet: (snippet: { name: string; code: string }) => void` — called when user clicks "Add to Context"
- `onClose?: () => void`

**e) Design states**
- Empty: first-visit onboarding message "Select a motion preset to preview"
- Loading: skeleton cards while presets load
- Error: toast if snippet generation fails
- Populated: full card grid with active selection state

#### 1.2 ComponentBrowserModal.tsx — Extend to all 10 libraries

Current: supports 21st-dev, aceternity, refero.

Add MCP-based component fetching for:
- **fragments-ui** → call `getComponent` tool via fragments-ui MCP
- **shadcn-ui-mcp** → call `search_components` tool via shadcn-ui-mcp MCP  
- **reactbits** → fetch from reactbits registry at `https://reactbits.dev/registry`
- **cult-ui** → use existing CultUIRegistry.tsx data (already has 45 inline definitions)

Architecture for each:
- Each library gets a `fetchComponents(searchQuery)` and `getComponentDetail(componentId)` function
- Results populate the same searchable, categorizable, previewable grid
- Code preview panel works the same way for all libraries
- "Add to Context" button calls `onAddToContext` prop with the component info

**Also add**: Magic UI, Lucide, Iconify, Unsplash as browseable-but-not-installable sources:
- Magic UI → show component cards, "View on magicui.design" link
- Lucide → icon search with preview, "Copy icon name" button
- Iconify → icon search across 200k+ icons, "Copy icon name" button
- Unsplash → photo search with thumbnail preview, "Copy URL" button

#### 1.3 LibraryConfigModal.tsx — Add swishy-motion + variant configs

Current: lists 8 sources. Add 2 more entries:
- **swishy-motion**: label "Swishy Motion", group "motion", MCP command `node scripts/mcp-launcher.mjs swishy-motion`, API key field, auto-start toggle
- **variant**: label "Variant", group "web-tool", URL field `https://variant.com`, auto-start toggle, "Open in Browser" button

#### 1.4 DesignLibrarySources.tsx — Add Magic UI, Lucide, Iconify, Unsplash cards

The current grid shows only the 10 libraries. These 4 additional MCP sources (Magic UI, Lucide, Iconify, Unsplash) should appear as additional browseable library cards with:
- status indicator showing whether the MCP server is connected
- "Browse" button that opens ComponentBrowserModal scoped to that library
- Visual indication of what they offer (component search, icon search, photo search)

#### 1.5 DesignWorkspacePage.tsx — Misc enhancements

- **Skill preview panel**: Show which skills are loaded and active in the compose outlet
- **"Start All Servers" button**: One-click to connect all MCP servers simultaneously
- **Library status polling**: Real-time status updates from MCP servers (already partially wired)
- **Search bar**: Global search across all connected libraries
- **Responsive grid**: Cards wrap to 2 cols on narrower screens

#### 1.6 Apply all design skills to every component

Every component and page must implement:
- **Human-Centred UX**: loading/empty/error/populated states, clear feedback, progressive disclosure
- **Motion**: subtle hover transitions, micro-interactions, smooth page transitions (L2 liveliness as baseline, L3 for hero areas)
- **Anti-slop checks**: no repeated patterns across components, each has distinct visual identity
- **Impeccable**: 7 design dimensions verified per component
- **Frontend-external-infra**: source-routing for real component inventory, re-skin rules applied, anti-slop checklist passed

---

## Feature 2: File-Level Backup/Restore System

### Current State

The IDE page at `/ide` (src/pages/IDEProjectsPage.tsx) has a backup tab registered as tab key `'backup'` with an `Archive` icon. The backup tab content is currently a placeholder:

```typescript
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
      <EmptyState ... />
    </GlassCard>
  </motion.div>
)}
```

### What Already Exists (DO NOT Recreate)

A **database backup system** already exists at:
- `src/main/backup/BackupService.ts` — full implementation with create, list, restore, export
- `src/main.ts` — IPC handlers `backup:create`, `backup:list`, `backup:restore`, `backup:exportJSON`, `backup:exportCSV`
- `src/preload.ts` — bridge for all backup IPC

Existing project-level IPC already wired:
- `preload.ts:443` — `readProjectFile(relativePath, projectPath?)`
- `preload.ts:444` — `writeProjectFile(relativePath, content, projectPath?)`
- `preload.ts:249` — `restoreProject(projectId)`

These are for the **DB backup**. The FILE-level backup is a new system — it backs up project source files, not the database.

### What to Build

#### 2.1 New IPC Handlers in main.ts

Add these new IPC handlers for file-level backup:

- **`project-backup:create`** — Given `{ projectId, projectPath, label? }`, snapshot the project directory:
  1. Read `projectPath` from selected project
  2. Create zip archive of the project directory (excluding `node_modules`, `.git`, `dist`, `target`, `build`, `__pycache__`, `.next`)
  3. Store zip in `backupDir/project-backups/{projectId}/{timestamp}_{label}.zip`
  4. Record manifest entry in DB: `{ id, projectId, label, timestamp, fileCount, totalSize, compressionRatio }`
  5. Return `{ success: true, data: { id, label, timestamp, fileCount } }`

- **`project-backup:list`** — Given `{ projectId }`, return all backup manifests for that project, ordered by newest first.

- **`project-backup:restore`** — Given `{ projectId, backupId }`:
  1. Find the backup manifest
  2. Create a pre-restore snapshot (in case user wants to undo)
  3. Extract zip over the project directory (backup first with `.bak` extension)
  4. Return `{ success: true, data: { restoredCount } }`

- **`project-backup:delete`** — Given `{ backupId }`, remove the backup archive and manifest.

- **`project-backup:schedule`** — Given `{ projectId, intervalMinutes }`, start periodic auto-backup (similar pattern to the DB scheduler in BackupService.ts).

- **`project-backup:diff`** — Given `{ projectId, backupId }`, return a diff summary: which files changed, added, deleted between current workspace state and the backup snapshot. (Simple implementation: compare file listing + modification dates; a deep diff is future work).

#### 2.2 New Preload Bridge

In `src/preload.ts`, add to the `deskflowAPI` object:
```typescript
projectBackup: {
  create: (projectId: string, projectPath: string, label?: string) => 
    ipcRenderer.invoke('project-backup:create', { projectId, projectPath, label }),
  list: (projectId: string) => 
    ipcRenderer.invoke('project-backup:list', { projectId }),
  restore: (projectId: string, backupId: string) => 
    ipcRenderer.invoke('project-backup:restore', { projectId, backupId }),
  delete: (backupId: string) => 
    ipcRenderer.invoke('project-backup:delete', { backupId }),
  schedule: (projectId: string, intervalMinutes: number) =>
    ipcRenderer.invoke('project-backup:schedule', { projectId, intervalMinutes }),
  diff: (projectId: string, backupId: string) =>
    ipcRenderer.invoke('project-backup:diff', { projectId, backupId }),
}
```

#### 2.3 IDE Backup Tab UI — Replace Placeholder

Replace the EmptyState placeholder with a full backup management UI:

**Layout**: Two-panel design:
- Left panel (40%): backup list + schedule controls
- Right panel (60%): backup detail + restore

**Left Panel — Backup List**:
- "Create Backup" button (prominent, primary pink)
- Auto-backup toggle with interval dropdown (15min / 30min / 1hr / 4hr / Off)
- Searchable/filterable backup list with entries showing:
  - Checkbox for multi-select
  - Backup label
  - Timestamp (relative: "2 hours ago" + absolute tooltip)
  - File count badge
  - Size badge
  - "Diff" action button
  - "Delete" action button (with confirmation dialog)
- Bulk actions bar (appears when items checked): "Delete Selected (N)", "Export Selected"

**Right Panel — Backup Detail**:
- Opens when a backup entry is clicked
- Shows:
  - Label (editable inline)
  - Full timestamp
  - File count + total size + compression ratio
  - File list with tree view (expandable folders)
  - Each file shows: path, size, modification time
  - "Restore" button (large, amber/warning color, with confirmation dialog)
  - "Download" button (export zip)
  - "Compare" button (opens diff view)

**Diff View**:
- Toggle/expandable panel showing:
  - Files added (green text, plus icon)
  - Files modified (amber text, edit icon)  
  - Files deleted (red text, minus icon)
  - Files unchanged (dim, hidden by default)
- Count badges for each category

**Auto-Backup Status Bar**:
- Small bar at top: "Auto-backup: ON — every 30 min" or "Auto-backup: OFF"
- Shows last auto-backup time
- "Backup Now" quick action button

**Empty State**:
- When no backups exist: illustration + "No backups yet" + "Create your first backup before your next AI coding session" + prominent "Create Backup" button
- When project is not selected: "Select a project from the Projects tab to view backups"

**Loading State**:
- Skeleton cards for backup list while loading
- Spinner on backup creation/restore

**Error State**:
- Inline error banner if backup creation fails (with retry button)
- Toast notifications for success/error

**Confirmation Dialogs**:
- Restore: "Restore will overwrite your current project files. A snapshot will be saved first. Continue?"
- Delete: "Delete this backup? This cannot be undone."
- Bulk delete: "Delete N selected backups?"

#### 2.4 IDEProjectsPage.tsx — Tab integration

The backup tab already exists in tab key enum and sidebar. The change is only replacing the content area (the section guarded by `activeTab === 'backup'`).

#### 2.5 Type Definition

In `src/types/deskflow-api.d.ts`, add type definitions:
```typescript
export interface ProjectBackupManifest {
  id: string;
  projectId: string;
  label: string;
  timestamp: string; // ISO 8601
  fileCount: number;
  totalSize: number; // bytes
  compressionRatio: number;
  autoBackup: boolean;
}
export interface ProjectBackupDiff {
  added: string[];
  modified: string[];
  deleted: string[];
  unchanged: string[];
}
```

#### 2.6 Design Skills Application

The backup UI must apply ALL design skills:
- **Human-centred**: Clear confirmation for destructive actions, progress indicator during backup/restore, success/error toasts, empty/loading/error/populated states
- **Motion**: Subtle fade-in animations for backup list, progress animation during backup creation, expand/collapse transitions for tree view
- **Impeccable**: Consistent spacing, proper typography scale, color hierarchy (destructive in amber/red, success in green)
- **Frontend-external-infra**: Use shadcn Dialog for confirmation modals, Lucide icons (Archive, Clock, Download, Upload, Trash2, RotateCcw, FileText, FolderTree)

---

## Output Format

Produce a **Fix Packet ZIP** containing:

1. **`FIX_PACKET.md`** — Master document with:
   - Summary of all changes
   - File-by-file changelog with:
     - File path
     - Lines changed (added/modified/removed)
     - Purpose of change
     - Dependencies on other changes
   - Build instructions (already known: vite build → esbuild preload → rebuild-main → npx electron .)
   - Verification steps

2. **Changed source files** — ONLY the files that need modification, preserving CRLF line endings:
   - `src/components/workspace/MotionExplorer.tsx`
   - `src/components/workspace/ComponentBrowserModal.tsx`
   - `src/components/workspace/LibraryConfigModal.tsx`
   - `src/components/workspace/DesignLibrarySources.tsx`
   - `src/pages/DesignWorkspacePage.tsx`
   - `src/pages/IDEProjectsPage.tsx` (backup tab section)
   - `src/main.ts` (new IPC handlers)
   - `src/preload.ts` (new bridge)
   - `src/types/deskflow-api.d.ts` (new types)

3. **New files** (create with CRLF line endings):
   - `src/main/backup/ProjectBackupService.ts` (file-level backup logic)
   - `src/components/workspace/BackupTabPanel.tsx` (IDE backup tab UI)
   - `src/components/workspace/BackupDiffViewer.tsx` (diff panel)
   - `src/components/workspace/MotionPresets.tsx` (Swishy presets data)
   - `src/components/workspace/EasingCurveBrowser.tsx` (easing curve SVG UI)

---

## Build & Verify Instructions

After applying the Fix Packet, the Hands & Eyes agent will:
1. Build renderer: `npx vite build` (must exit 0)
2. Build preload: `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`
3. Rebuild main: `node scripts/rebuild-main.mjs`
4. Launch: `npx electron .`
5. Verify in real UI:
   - Navigate to Design Workspace → Motion sub-tab shows content, not blank
   - Component browser shows all 10 libraries
   - Library config has all entries
   - Navigate to IDE → Backup tab shows full UI
   - Create backup → list shows entry → restore works
6. Verify no black screen (use dist/index.html inline fallback protection)

---

## Invariants to Never Break

- Never remove or modify the `#df-fallback` div or inline `<script>` in `index.html`
- Never remove `emptyOutDir: true` from `vite.config.ts`
- Never remove `did-fail-load` retry logic from main.ts
- Wrap ALL `localStorage` access in try/catch
- Files are CRLF — preserve line endings, don't mass-reformat
- Build must succeed with zero errors every time
