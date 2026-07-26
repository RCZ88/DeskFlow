# CONTEXT_BUNDLE — DeskFlow Workspace Architecture

> Generated 2026-07-11 for the Git Safety Layer design task.
> Comprehensive reference for an AI agent to understand the workspace system before designing changes.

---

## 1. DeskFlow Application Overview

**Stack:** Electron 32 + React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + better-sqlite3

**Entry points:**
- `src/main.ts` — Electron main process (~21K lines): window management, database, IPC handlers, PTY management, backup services
- `src/preload.ts` — contextBridge (~1077 lines): exposes `window.deskflowAPI` to renderer
- `src/App.tsx` — React root: router, AI provider, theme
- `src/index.html` — Vite entry point with black-screen fallback overlay
- `src/pages/TerminalPage.tsx` — The Terminal Workspace (~5817 lines)

**Build:**
- `npx vite build` → `dist/index.html` + `dist/assets/index.js`
- `npx esbuild src/preload.ts ...` → `dist-electron/preload.cjs`
- `node scripts/rebuild-main.mjs` → `dist-electron/main.cjs`

---

## 2. Terminal Workspace (`/terminal`)

**File:** `src/pages/TerminalPage.tsx` (~5817 lines)

The workspace is a multi-pane terminal + sidebar system at route `/terminal`. It has:

### 2a. Group Navigation (5 groups)

Defined at line ~3449:
```typescript
{ key: 'setup',    icon: Settings,   label: 'Setup',    accent: 'orange' },
{ key: 'work',     icon: Monitor,    label: 'Work',     accent: 'green' },
{ key: 'insights', icon: PieChart,   label: 'Insights', accent: 'purple' },
{ key: 'studio',   icon: Sparkles,   label: 'Studio',   accent: 'indigo' },
{ key: 'context',  icon: Settings2,  label: 'Context',  accent: 'amber' },
```

### 2b. Sub-tabs per group

**Setup (orange):** Presets, Configs, Backup
**Work (green):** Sessions, Swarm, Map, Files, Workspaces, Run
**Insights (purple):** Analytics, Prompts, Issues, Bugs
**Studio (indigo):** Skills, Design
**Context (amber):** Context, Maintenance, Page Context

Each subtab corresponds to a `subpage` key like `'work/sessions'`, `'setup/backup'`, etc. Mapped in `SUBPAGE_LABELS` object (lines 128-143).

### 2c. Accent Color System

Groups have accent colors applied via CSS variables:
```typescript
const GROUP_ACCENT_HEX: Record<string, string> = {
    green: '#34d399', emerald: '#34d399', ... orange: '#fb923c', ...
};
```

Each tab root sets `--page-accent` as a CSS variable. The design system primitives in `_ds/` reference `var(--page-accent)` for accent-aware styling.

### 2d. Workspace Shell

The outer component is `WorkspaceShell` (line ~3440) which renders:
- Left sidebar nav bar (5 group buttons)
- Content area with current group's subtab bar + panel content
- Terminal layout (xterm instances)

Subtab rendering is done via a `switch` on `subpage` key. For example:
```typescript
case 'work/sessions': return <GroupPanel accent="green"><SessionListPanel ... /></GroupPanel>;
case 'setup/backup':  return <GroupPanel accent="orange"><BackupPanel /></GroupPanel>;
```

---

## 3. Design System — `_ds/primitives`

**Location:** `src/components/workspace/_ds/`

Three files:

### 3a. `primitives.tsx` — Building blocks
- `StatusPill` — colored status badge (pending/in_progress/completed/failed)
- `Chip` — accent-aware filter/tag chip, uses `var(--page-accent)`
- `ProgressBar` — animated progress bar
- `Skeleton` — loading placeholder
- `IconButton` — 28x28 icon button with hover/active states
- `EmptyState` — centered icon + title + hint

### 3b. `controls.tsx` — Form controls
- `INPUT_CLS` — consistent input styling
- `BTN_PRIMARY` / `BTN_GHOST` — button styles, accent-aware
- `filterChipCls(active)` — filter chip factory
- `ModalShell` — consistent modal overlay
- `Pill` — generic status pill with dot

### 3c. `motion.ts` — Animation tokens
```typescript
EASE_OUT = [0.16, 1, 0.3, 1]
DUR = { fast: 0.15, normal: 0.25, slow: 0.4 }
SPRING_SOFT / SPRING_SNAPPY
listContainer / riseItem / expandPanel / popItem / tabPanel
```

---

## 4. IPC Layer

### 4a. Preload (`src/preload.ts`)

`window.deskflowAPI` exposed via `contextBridge.exposeInMainWorld`. Key namespaces:

- **`projectBackup`** (lines 1067-1076): `create`, `list`, `get`, `delete`, `restore`, `diff`, `schedule`
  - Channels use `projectBackup:*` (camelCase, matching CJS service)
- **Git/DORA** (lines 298-305): `syncCommits`, `syncGitHubCommits`, `getDORAMetrics`, `getCommitHistory`, `getContributorStats`, `getGitDiff`
- **Terminal:** `spawnTerminal`, `writeTerminal`, `resizeTerminal`, `killTerminal`, etc.
- **General:** `executeCommand`, `pickFolder`, `saveFile`, etc.

### 4b. IPC Channel Architecture

Preload sends via `ipcRenderer.invoke('channel', ...args)`.
Main process receives via `ipcMain.handle('channel', handler)`.

**IMPORTANT CHANNEL NOTE:** The TypeScript `ProjectBackupService.ts` registers on `project-backup:*` (hyphenated) while the CJS version at `src/services/ProjectBackupService.cjs` registers on `projectBackup:*` (camelCase matching preload). Currently `main.ts` loads the CJS version.

### 4c. Existing Git-Related IPC Handlers (in `main.ts`)

| Channel | Line | What it does |
|---------|------|-------------|
| `sync-commits` | ~12317 | Runs `git log` + `git show --numstat`, inserts into `commits` table |
| `sync-github-commits` | ~12398 | GitHub API → commits table |
| `get-git-diff` | ~12673 | Runs `git diff --cached` or `git diff`, returns text |

Also: `SKIP_DIRS` includes `.git` (line ~7440), `versionControl: ['git', 'hg', 'svn']` for IDE detection.

---

## 5. Backup/Restore System

### 5a. Project File Backups (`ProjectBackupService`)

**Location:** `src/services/ProjectBackupService.cjs` (CJS, actively loaded)
**Parallel TS version:** `src/main/backup/ProjectBackupService.ts` (not loaded — has hyphenated channel mismatch)

**Operations:**
- `create` — ZIPs project dir (excluding node_modules, .git) via `archiver`
- `list` — reads backup manifests from `%APPDATA%/DeskFlow/backups/<projectId>/`
- `restore` — copies ZIP content back, pre-restore snapshot at `.bak_<timestamp>`
- `diff` — compares current files vs backup ZIP entries
- `schedule` — auto-backup via interval timer
- `delete` — removes backup ZIP + manifest

**Storage:** `%APPDATA%/DeskFlow/backups/<projectId>/<timestamp>-<label>.zip` + `manifest.json`

### 5b. Backup UI

- **`BackupTabPanel.tsx`** (`src/components/workspace/BackupTabPanel.tsx`) — Full backup management UI (list, create, search, restore, diff, delete, auto-schedule). Mounted in **IDEProjectsPage** under the 'backup' tab.
- **`BackupDiffViewer.tsx`** (`src/components/workspace/BackupDiffViewer.tsx`) — Shows added/modified/deleted/unchanged file lists.
- **`BackupPanel.tsx`** (`src/components/BackupPanel.tsx`) — Database backup/restore (SQLite). Mounted in **TerminalPage** under Setup → Backup tab.
- **No `BackupRestoreFlow` component exists** — restore is handled inline in BackupTabPanel via modal confirmation.

### 5c. Type Definitions

```typescript
// src/types/deskflow-api.d.ts
interface ProjectBackupManifest {
  id: string; projectId: string; label: string; timestamp: string;
  fileCount: number; totalSize: number; compressionRatio: number; autoBackup: boolean;
}
interface ProjectBackupDiff {
  added: string[]; deleted: string[]; modified: string[];
  unchanged: string[]; totalChanged: number;
}
```

---

## 6. Key File Inventory

| File | Purpose | Size |
|------|---------|------|
| `src/main.ts` | Electron main process, DB, IPC, PTY | ~21K lines |
| `src/preload.ts` | contextBridge, IPC thin wrappers | 1077 lines |
| `src/App.tsx` | React root, router, providers | ~500 lines |
| `src/pages/TerminalPage.tsx` | Terminal Workspace (sidebar + panes + tabs) | 5817 lines |
| `src/pages/IDEProjectsPage.tsx` | IDE projects, backup tab | ~3900 lines |
| `src/components/workspace/BackupTabPanel.tsx` | Project backup UI | 631 lines |
| `src/components/workspace/BackupDiffViewer.tsx` | Diff viewer | 100 lines |
| `src/components/BackupPanel.tsx` | DB backup UI | 228 lines |
| `src/services/ProjectBackupService.cjs` | CJS backup service (active) | 248 lines |
| `src/main/backup/ProjectBackupService.ts` | TS backup service (unused) | 349 lines |
| `src/components/workspace/_ds/primitives.tsx` | DS primitives | 106 lines |
| `src/components/workspace/_ds/controls.tsx` | DS controls | 80 lines |
| `src/components/workspace/_ds/motion.ts` | DS motion tokens | 51 lines |
| `agent/data.md` | IPC endpoints + DB schema docs | 214 lines |
| `agent/dictionary.md` | Terminology resolution | ~200 lines |

---

## 7. File System Protection Patterns (existing)

The codebase already has some file-system safety patterns to study:

1. **ProjectBackupService pre-restore snapshot:** Before restore, copies project directory to `.bak_<timestamp>` (excluding node_modules/.git). This is a "snapshot before destructive write" pattern.

2. **SKIP_DIRS in file scanning:** `node_modules`, `.git`, `dist`, `build`, `out`, `target`, `.next`, `__pycache__`, `.cache` are excluded from project scanning.

3. **Database backup before restore:** `BackupPanel.tsx` creates a SQLite backup before restoring from a previous backup.

4. **AGENTS.md ABSOLUTE ZERO-DESTRUCTION RULE:** The project's own AI agent config has explicit rules against `git checkout -- .`, `git reset --hard`, `git clean -fd`, etc. This shows awareness of destructive operation risk.

---

## 8. Build & Infrastructure

- Vite config at `vite.config.ts` — uses `emptyOutDir: true`
- Preload build: `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`
- Main rebuild: `node scripts/rebuild-main.mjs`
- All `dist/` and `dist-electron/` files are gitignored
- `node_modules` is massive — must be excluded from any ZIP/snapshot operations
