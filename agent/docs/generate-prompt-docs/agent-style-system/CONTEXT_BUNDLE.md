# CONTEXT BUNDLE — Agent Style System Integration

## 1. Project Overview

DeskFlow is an Electron + React + better-sqlite3 desktop productivity tracker. The "Agent Style System" spec (`spec.md`) describes a **Design Co-Pilot** — a sidebar panel + command palette that bridges unstructured web data (aesthetic sites, typography galleries) with structured developer tools (MCP servers, NPM packages, CLI commands).

**Key insight:** DeskFlow already has a `DesignWorkspacePage` at `studio/design` subtab. The spec's features should EXTEND this existing page, not replace it. The spec adds: (1) a Moodboard tab for visual inspiration, (2) a Tokens tab for live color/font sync, (3) a Command Palette for terminal-heavy workflows, and (4) a custom MCP server backend.

---

## 2. Existing Architecture

### 2.1 Workspace Structure (TerminalPage)
- **Route:** `/terminal`
- **5-group sidebar:** Setup (orange) → Work (green) → Insights (purple) → Studio (indigo) → Context (amber)
- **Studio group subtabs:** `studio/skills` (Skills), `studio/design` (Design)
- The `DesignWorkspacePage` renders inside `studio/design`

### 2.2 DesignWorkspacePage (existing — 653 lines)
**File:** `src/pages/DesignWorkspacePage.tsx`

**Current tabs:** `sources` | `motion` | `registry`

**Current features:**
- **Taste Knobs** — design variance, motion intensity, visual density sliders
- **Style References** — pre-built reference cards (Claude, Linear, Vercel, Stripe, etc.)
- **Style Description** — free-text style notes
- **Color Picker** — role-based color entries (primary, secondary, accent, etc.)
- **Design Library Sources** — grid of 10 MCP/registry sources with connect/browse/configure
- **Global Search** — cross-library component search
- **Component Browser Modal** — browse components from a specific library
- **Library Config Modal** — enable/disable/configure library sources
- **Design Compose Outlet** — XML context preview + send to terminal + copy
- **Motion Explorer** — kinetic typography presets + easing curve browser
- **Cult UI Registry** — premium shadcn components

**Key data flow:**
1. User configures taste knobs, style refs, colors, imported components
2. `buildFullContext()` assembles XML string with all design context
3. `handleSend()` sends XML to active terminal via `agentSend()` IPC
4. Context saved to terminal binding via `saveTerminalBinding()` IPC

**IPC endpoints used:**
- `agentSend(terminalId, context, 'claude')` — send design context to terminal
- `saveTerminalBinding({terminalId, problemId, sessionContext, status})` — persist context
- `mcpStartServer(id)` / `mcpStopServer(id)` / `mcpServerStatus(id)` — MCP lifecycle
- `aceternityFetchRegistry()` — Aceternity registry fetch
- `readProjectFile(relativePath, projectPath)` — read design skill files
- `getDesignLibraryConfig()` / `setDesignLibraryConfig(cfg)` — library config persistence

### 2.3 Initialization Flow
- **IPC:** `tracker-mind-setup` with `{ step, projectId, agentName }`
- **Preload bridge:** `trackerMindSetup: (step, projectId?, agentName?) => ipcRenderer.invoke('tracker-mind-setup', { step, projectId, agentName })`
- **Purpose:** Creates AGENTS.md, INITIALIZE.md, PROBLEMS.md, REQUESTS.md, state.md on disk
- **Design system initialization is SEPARATE** — handled by the Design Workspace's library config, not by `tracker-mind-setup`

### 2.4 Design Tokens (index.css)
```css
@theme {
  --ws-surface: #09090b;
  --ws-surface-raised: #18181b;
  --ws-border: rgb(39 39 42 / 0.6);
  --ws-border-strong: rgb(63 63 70 / 0.6);
  --ws-accent: #06b6d4;
  --ws-radius-card: 0.5rem;
  --ws-dur: 150ms;
  --ws-ease: cubic-bezier(0.2, 0, 0, 1);
  --color-clay-300: #f0a892;
  --color-clay-400: #e8866b;
  --color-clay-500: #d96846;
  --color-sage-400: #6fb38f;
  --font-serif: "Source Serif 4", Georgia, serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
}
```

**Re-skin rules (from frontend-external-infra):**
- Colors → `--bg-primary`, `--accent-primary`, etc.
- Max `rounded-xl` (12px), `p-5` padding
- Dark mode only
- Fonts: Geist body, JetBrains Mono code
- Glass: `bg-zinc-900/80 backdrop-blur-xl`

### 2.5 Existing Component Inventory
```
src/components/workspace/
├── WorkspaceShell.tsx
├── TasteKnobs.tsx
├── SubTabBar.tsx
├── StyleReferences.tsx
├── StyleDescription.tsx
├── DesignLibrarySources.tsx
├── DesignComposeOutlet.tsx
├── ColorPicker.tsx
├── CultUIRegistry.tsx
├── MotionExplorer.tsx
├── EasingCurveBrowser.tsx
├── MotionPresets.tsx
├── GlobalSearch.tsx
├── ComponentBrowserModal.tsx
├── LibraryConfigModal.tsx
├── ConductorWorkspaceTab.tsx
├── PerformanceMetricsPanel.tsx
├── BackupTabPanel.tsx
├── BackupDiffViewer.tsx
├── WorkspaceDetailModal.tsx
└── TerminalMapView.tsx
```

---

## 3. Spec Analysis — What's New vs What Exists

| Spec Feature | Exists? | Where | Gap |
|---|---|---|---|
| Design Sidebar (Tab 1: Moodboard) | NO | — | New component needed: `MoodboardTab.tsx` |
| Design Sidebar (Tab 2: Tokens) | PARTIAL | `ColorPicker.tsx`, `TasteKnobs.tsx` | Need live Realtime Colors URL parser + CSS variable sync |
| Design Sidebar (Tab 3: Motion & Components) | YES | `MotionExplorer.tsx`, `CultUIRegistry.tsx`, `DesignLibrarySources.tsx` | Already covers this |
| Command Palette (Cmd+K) | NO | — | New component: `CommandPalette.tsx` |
| Custom MCP Server (design-suite) | NO | — | New backend: `design-suite-mcp/` directory |
| CARI Scraper MCP tool | NO | — | Part of custom MCP server |
| FontsInUse Scraper MCP tool | NO | — | Part of custom MCP server |
| Realtime Colors URL parser | NO | — | New utility + MCP tool |
| CLI Wrappers (shadcn add) | PARTIAL | `handleStartServer` uses `mcpStartServer` | Need programmatic `npx shadcn add` wrapper |
| Boilerplate Templates (GSAP/Lenis/Vanta) | NO | — | New template store + MCP tool |

---

## 4. Key Questions for Engineering Prompts

### Frontend Q1: Moodboard Tab Design
- How should the visual grid display parsed images from CARI/Refero?
- What interactions on hover? (Inject Context button per spec)
- How to handle loading states for scraped images?
- Should moodboard persist per-project or be global?

### Frontend Q2: Command Palette
- Trigger: Cmd/Ctrl+K (standard pattern)
- What commands are available? (`> generate theme`, `> audit motion`, etc.)
- How does command output surface in the UI?
- Should it integrate with the existing terminal or have its own output panel?

### Frontend Q3: Tokens Tab — Realtime Colors Integration
- Realtime Colors stores themes in URL hashes (`?colors=050816...`)
- Need: generate URL from color entries, parse URL hash back to CSS vars
- "Sync to Project" action writes to `globals.css` or `tailwind.config.js`
- How to preview the color scheme live?

### Backend Q1: Custom MCP Server Architecture
- Standalone Node.js process or embedded in Electron main?
- How to communicate: stdio (standard MCP) or IPC bridge?
- How to handle Puppeteer/Playwright scraping in Electron context?

### Backend Q2: CARI/FontsInUse Scraping
- Anti-scraping measures? Rate limiting?
- How to cache scraped results?
- How to return multimodal context (images + text) to the agent?

### Integration Q1: Relationship with Existing Initialize Flow
- `tracker-mind-setup` creates project scaffolding files
- Design system initialization is separate (library config)
- Should there be a unified "initialize project including design system" flow?
- Or keep them separate (project init ≠ design system config)?

### Integration Q2: Relationship with Design Workspace
- The spec says "Sidebar Panel" but the existing Design Workspace IS the sidebar panel
- Should we ADD tabs to the existing DesignWorkspacePage?
- Or create a new parallel panel?
- Recommendation: Add "Moodboard" and "Tokens" as new tabs alongside existing `sources | motion | registry`

---

## 5. IPC Endpoints (existing, relevant)

```typescript
// Preload bridge
trackerMindSetup: (step, projectId?, agentName?) => ipcRenderer.invoke('tracker-mind-setup', { step, projectId, agentName })
agentSend: (terminalId, content, agentType) => ipcRenderer.invoke('agent-send', terminalId, content, agentType)
saveTerminalBinding: (binding) => ipcRenderer.invoke('save-terminal-binding', binding)
mcpStartServer: (id) => ipcRenderer.invoke('mcp-start-server', id)
mcpStopServer: (id) => ipcRenderer.invoke('mcp-stop-server', id)
mcpServerStatus: (id) => ipcRenderer.invoke('mcp-server-status', id)
aceternityFetchRegistry: () => ipcRenderer.invoke('aceternity-fetch-registry')
readProjectFile: (relativePath, projectPath?) => ipcRenderer.invoke('read-project-file', relativePath, projectPath)
getDesignLibraryConfig: () => ipcRenderer.invoke('get-design-library-config')
setDesignLibraryConfig: (config) => ipcRenderer.invoke('set-design-library-config', config)
```

---

## 6. Design System Constraints (from frontend-external-infra skill)

- **Dark mode only** — DeskFlow is always dark
- **Border radius:** Max `rounded-xl` (12px)
- **Card padding:** `p-5` (20px)
- **Fonts:** Body = Geist/Inter (13px), Mono = JetBrains Mono
- **Glass layer:** `bg-zinc-900/80 backdrop-blur-xl`
- **Animation:** Respect `prefers-reduced-motion`, use `--ws-dur` (150ms) and `--ws-ease`
- **Icons:** All from lucide-react, no emoji as UI icons
- **Anti-slop:** No purple/indigo gradients everywhere, no hero clichés, real empty/loading/error states
