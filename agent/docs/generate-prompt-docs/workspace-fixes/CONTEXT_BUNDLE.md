# Context Bundle — Workspace Fixes (P01–P18)

> This bundle contains ACTUAL source code for every broken feature.
> Includes backend verification: IPC handlers, DB schemas, preload bridges, type definitions.
> The target AI must read this FIRST, then design fixes.

---

## Problem Register

See `ALL_WORKSPACE_PROBLEMS.md` for the full list of 18 problems (P01–P18).

---

## Backend Verification Table

| Feature | IPC Channel | Handler in main.ts? | Preload Bridge? | DB Schema? | Status |
|---------|-------------|---------------------|-----------------|------------|--------|
| Workspace Save | workspace:save | ✅ main.ts:11322 | ✅ preload.ts | ✅ workspace_state table | REAL |
| Workspace Load | workspace:load | ✅ main.ts:11384 | ✅ preload.ts | ✅ workspace_state table | REAL |
| Workspace List | workspace:list | ✅ main.ts:11434 | ✅ preload.ts | ✅ workspace_state table | REAL |
| Workspace Delete | workspace:delete | ✅ main.ts:11445 | ✅ preload.ts | ✅ workspace_state table | REAL |
| Workspace List All | workspace:list-all | ✅ main.ts:11456 | ✅ preload.ts | ✅ workspace_state + projects | REAL |
| Resource Stats | terminal:get-resource-stats | ✅ main.ts:9496 | ✅ preload.ts:309 | N/A (runtime) | REAL |
| System Stats | terminal:get-system-stats | ✅ main.ts:9501 | ✅ preload.ts:310 | N/A (os module) | REAL |
| Resource Stats Event | terminal:resource-stats | ✅ broadcast() | ✅ preload.ts:311 | N/A (event) | REAL |
| Conductor Start | conductor:start | ✅ main.ts:15579 | ✅ preload.ts:329 | N/A (in-memory) | REAL |
| Conductor Pause | conductor:pause | ✅ main.ts:15588 | ✅ preload.ts:330 | N/A | REAL |
| Conductor Resume | conductor:resume | ✅ main.ts:15594 | ✅ preload.ts:331 | N/A | REAL |
| Conductor Kill | conductor:kill | ✅ main.ts:15600 | ✅ preload.ts:332 | N/A | REAL |
| Conductor List | conductor:list-missions | ✅ main.ts:15636 | ✅ preload.ts:338 | N/A | REAL |
| Conductor Snapshot | conductor:get-snapshot | ✅ main.ts:15628 | ✅ preload.ts:337 | N/A | REAL |
| Get Skills | get-skills | ✅ main.ts:17599 | ✅ preload.ts | ✅ agent/skills/ dir | REAL |
| Get App Skills | get-app-skills | ✅ main.ts:17906 | ✅ preload.ts | ✅ agent/skills/ dir | REAL |
| Create Skill | create-skill | ✅ main.ts:17846 | ✅ preload.ts | ✅ writes .md file | REAL |
| Update Skill | update-skill | ✅ main.ts:17863 | ✅ preload.ts | ✅ writes .md file | REAL |
| Delete Skill | delete-skill | ✅ main.ts:17882 | ✅ preload.ts | ✅ deletes file | REAL |
| Save Skill | save-workspace-skill | ✅ main.ts:17996 | ✅ preload.ts | ✅ saved-skills.json | REAL |
| Unsave Skill | unsave-workspace-skill | ✅ main.ts:18010 | ✅ preload.ts | ✅ saved-skills.json | REAL |
| Seed Skills | seed-workspace-skills | ✅ main.ts:18024 | ✅ preload.ts | ✅ copies files | REAL |
| Project Backup Create | projectBackup:create | ✅ main.ts:15642 | ✅ preload.ts | ✅ zip files | REAL |
| Project Backup List | projectBackup:list | ✅ main.ts:15642 | ✅ preload.ts | ✅ manifests.json | REAL |
| Terminal Spawn | terminal:spawn | ✅ main.ts | ✅ preload.ts | N/A (PTY) | REAL |
| Agent Send | agent:send | ✅ main.ts | ✅ preload.ts | N/A (PTY write) | REAL |
| Save Terminal Session | save-terminal-session | ✅ main.ts | ✅ preload.ts | ✅ terminal_sessions | REAL |
| Get Terminal Sessions | get-terminal-sessions | ✅ main.ts | ✅ preload.ts | ✅ terminal_sessions | REAL |

**ALL BACKENDS ARE REAL.** No mocks. No stubs. Every IPC channel has a working handler.

---

## DB Schemas

### workspace_state table
```sql
CREATE TABLE IF NOT EXISTS workspace_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'default',
  scope TEXT DEFAULT 'project',
  sidebar_width INTEGER DEFAULT 400,
  active_tab TEXT DEFAULT 'presets',
  terminal_tabs TEXT DEFAULT '[]',
  state_json TEXT DEFAULT '{}',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, name)
);
```

### terminal_sessions table
```sql
CREATE TABLE IF NOT EXISTS terminal_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  agent TEXT DEFAULT 'claude',
  resume_id TEXT,
  terminal_id TEXT,
  topic TEXT,
  working_directory TEXT,
  total_tokens INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0,
  category TEXT,
  status TEXT DEFAULT 'active',
  product_area TEXT,
  description TEXT,
  auto_tags TEXT DEFAULT '[]',
  category_confirmed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Source Code — All Key Files

### 1. WorkspaceShell.tsx (scroll container)
```tsx
// src/components/workspace/WorkspaceShell.tsx — FULL FILE (44 lines)
import { SubTabBar, SubTabDef } from './SubTabBar';
import { usePersistentSubTab } from '../../hooks/usePersistentSubTab';

const ACCENT_TRUNK: Record<string, string> = {
  green: 'bg-green-500/30', emerald: 'bg-emerald-500/30', teal: 'bg-teal-500/30',
  cyan: 'bg-cyan-500/30', blue: 'bg-blue-500/30', indigo: 'bg-indigo-500/30',
  violet: 'bg-violet-500/30', purple: 'bg-purple-500/30', pink: 'bg-pink-500/30',
  rose: 'bg-rose-500/30', amber: 'bg-amber-500/30', yellow: 'bg-yellow-500/30',
  orange: 'bg-orange-500/30',
};

export function WorkspaceShell({ tabs, storageKey, render, onTabChange, accent }: {
  tabs: SubTabDef[];
  storageKey: string;
  render: (active: string) => React.ReactNode;
  onTabChange?: (key: string) => void;
  accent?: string;
}) {
  const [active, setActive] = usePersistentSubTab(storageKey, tabs[0].key);
  const handleChange = (key: string) => { setActive(key); onTabChange?.(key); };
  const trunkColor = accent ? ACCENT_TRUNK[accent] : 'bg-zinc-700';
  return (
    <div className="flex flex-1 min-h-0">
      <div className="relative w-[18px] flex items-center justify-center shrink-0">
        <div className={`w-0.5 h-full ${trunkColor}`} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <SubTabBar tabs={tabs} active={active} onChange={handleChange} accent={accent} />
        <div className="flex-1 overflow-y-auto min-h-0">{render(active)}</div>
      </div>
    </div>
  );
}
```

### 2. SubTabBar.tsx
```tsx
// src/components/workspace/SubTabBar.tsx — FULL FILE
import { LucideIcon } from 'lucide-react';

export interface SubTabDef {
  key: string;
  icon: LucideIcon;
  label: string;
}

const ACCENT_ACTIVE: Record<string, string> = {
  green: 'bg-green-500/15 text-green-300 ring-green-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  orange: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  purple: 'bg-purple-500/15 text-purple-300 ring-purple-500/30',
  indigo: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30',
  amber: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
};

export function SubTabBar({ tabs, active, onChange, accent }: {
  tabs: SubTabDef[];
  active: string;
  onChange: (key: string) => void;
  accent?: string;
}) {
  return (
    <div className="flex gap-1 px-2 py-1.5 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
              isActive
                ? (accent && ACCENT_ACTIVE[accent]) || 'bg-zinc-700/60 text-zinc-200 ring-1 ring-zinc-600/50'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <Icon className="w-3 h-3" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
```

### 3. usePersistentSubTab.ts
```tsx
// src/hooks/usePersistentSubTab.ts — FULL FILE
import { useState, useCallback } from 'react';

export function usePersistentSubTab(storageKey: string, defaultTab: string): [string, (key: string) => void] {
  const storage full name = `workspace-subtab-${storageKey}`;
  const [active, setActiveState] = useState<string>(() => {
    try {
      return localStorage.getItem(storageFullName) || defaultTab;
    } catch {
      return defaultTab;
    }
  });
  
  const setActive = useCallback((key: string) => {
    setActiveState(key);
    try {
      localStorage.setItem(storageFullName, key);
    } catch {}
  }, [storageFullName]);
  
  return [active, setActive];
}
```

### 4. GroupPanel (inside TerminalPage.tsx)
```tsx
// src/pages/TerminalPage.tsx lines 511-520
function GroupPanel({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full" style={accentStyle(accent)}>
      <span className={`w-0.5 shrink-0 ${ACCENT_STRIP[accent]} opacity-60`} />
      <div className="flex-1 px-3 py-3 min-w-0 flex flex-col">
        {children}
      </div>
    </div>
  );
}
```

### 5. Sidebar structure (TerminalPage.tsx)
```tsx
// src/pages/TerminalPage.tsx lines 3160-3240
{/* Sidebar */}
{sidebarOpen && (
  <div className="relative shrink-0 bg-zinc-950 ws-sidebar-edge flex flex-col" style={{ width: sidebarWidth }}>
    {/* Resize Handle */}
    <div role="separator" onMouseDown={startResize} className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10" />
    
    {/* Sidebar Header */}
    <header className="flex items-center justify-between px-3 h-9 border-b border-zinc-800/60">
      <span className="text-[11px] font-semibold uppercase text-zinc-400">Terminal</span>
      <div className="flex items-center gap-1">
        <button onClick={async () => { await handleSaveWorkspace(); }} title={`Workspace: ${workspaceName}`}>
          <Save className="w-3 h-3" /> <span>{workspaceName}</span>
          {hasUnsavedChanges && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
        </button>
        <button onClick={() => setShowFeaturesDialog(true)}><Info className="w-3.5 h-3.5" /></button>
        <button onClick={() => setShowGeneralistDialog(true)}><BookOpen className="w-3.5 h-3.5" /></button>
        <button onClick={() => setSidebarOpen(false)}><PanelLeftClose className="w-3.5 h-3.5" /></button>
      </div>
    </header>
    
    {/* Group Tab Bar */}
    <nav className="flex gap-px px-2 pt-1.5">
      {[
        { key: 'setup', icon: Settings, label: 'Setup', accent: 'orange' },
        { key: 'work', icon: Monitor, label: 'Work', accent: 'green' },
        { key: 'insights', icon: PieChart, label: 'Insights', accent: 'purple' },
        { key: 'studio', icon: Sparkles, label: 'Studio', accent: 'indigo' },
        { key: 'context', icon: Settings2, label: 'Context', accent: 'amber' },
      ].map((g) => (
        <button key={g.key} onClick={() => setActiveGroup(g.key)}
          className={`px-4 h-8 rounded-t-lg text-[11px] font-semibold ${activeGroup === g.key ? 'bg-zinc-800/80 text-zinc-100' : 'text-zinc-500'}`}>
          <Icon className="w-3.5 h-3.5" /> {g.label}
        </button>
      ))}
    </nav>
    
    {/* Accent strip */}
    <div className={`h-[3px] ${ACCENT_STRIP[activeGroup]} opacity-60`} />
    
    {/* Content */}
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {activeGroup === 'setup' && <WorkspaceShell accent="orange" tabs={[{ key: 'presets', icon: Zap, label: 'Presets' }, { key: 'configs', icon: Settings, label: 'Configs' }]} storageKey="setup" render={...} />}
      {activeGroup === 'work' && <WorkspaceShell accent="green" tabs={[{ key: 'sessions', icon: TerminalIcon, label: 'Sessions' }, { key: 'map', icon: Map, label: 'Map' }, { key: 'files', icon: Folder, label: 'Files' }, { key: 'workspaces', icon: Save, label: 'Workspaces' }]} storageKey="work" render={...} />}
      {activeGroup === 'insights' && <WorkspaceShell accent="purple" tabs={[{ key: 'analytics', icon: PieChart, label: 'Analytics' }, { key: 'history', icon: MessageSquare, label: 'Prompts' }, { key: 'issues', icon: ListChecks, label: 'Issues' }, { key: 'bugs', icon: Bug, label: 'Bugs' }, { key: 'performance', icon: Activity, label: 'Performance' }]} storageKey="insights" render={...} />}
      {activeGroup === 'studio' && <WorkspaceShell accent="indigo" tabs={[{ key: 'skills', icon: Sparkles, label: 'Skills' }, { key: 'design', icon: Palette, label: 'Design' }]} storageKey="studio" render={...} />}
      {activeGroup === 'context' && <WorkspaceShell accent="amber" tabs={[{ key: 'context', icon: FileText, label: 'Context' }, { key: 'maintenance', icon: Wrench, label: 'Maintenance' }, { key: 'page', icon: FileText, label: 'Page Context' }]} storageKey="context" render={...} />}
    </div>
  </div>
)}
```

### 6. Main Terminal Area + InstructionPanel (overlay)
```tsx
// src/pages/TerminalPage.tsx lines 2620-2770
<div style={accentStyle('cyan')} className="flex-1 flex flex-col bg-zinc-950 relative">
  {/* Toolbar */}
  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/60">
    <div className="flex items-center gap-3">
      <Monitor className="w-4 h-4 text-green-500" />
      <span className="text-sm font-semibold text-white">Terminal</span>
      {/* Project selector, status indicator */}
    </div>
    <div className="flex items-center gap-1">
      <ToolbarButton onClick={() => setShowInstructionPanel(true)}>Compose</ToolbarButton>
      <ToolbarButton onClick={() => setShowInstructionInput(true)}>Quick</ToolbarButton>
      <ToolbarButton icon={Save} onClick={handleSaveCheckpoint}>Save</ToolbarButton>
    </div>
  </div>
  
  {/* Instruction Panel — ABSOLUTE OVERLAY */}
  {showInstructionPanel && activeTerminalId && (
    <div className="absolute inset-x-0 top-0 z-40 max-h-[70vh] overflow-y-auto shadow-2xl shadow-black/50">
      <InstructionPanel
        problems={allProblems} requests={allRequests}
        onSend={handleInstructionPanelSend}
        onClose={() => setShowInstructionPanel(false)}
        isSending={isSending}
        projectPath={propProjectPath}
        systemPromptLayers={systemPromptLayers}
        defaultSkills={composeSkills}
      />
    </div>
  )}
  
  {/* Quick Instruction Input Bar */}
  {showInstructionInput && activeTerminalId && (
    <div className="px-4 py-2 bg-zinc-950/90 border-b border-zinc-800/60">
      {/* Quoted references, session selector, input field */}
    </div>
  )}
  
  {/* Terminal render area */}
  {terminalLayout && (
    <TerminalLayout layout={terminalLayout} ... />
  )}
</div>
```

### 7. Workspace Save handler
```tsx
// src/pages/TerminalPage.tsx lines 1863-1908
const handleSaveWorkspace = useCallback(async (name?: string) => {
  const wsProjectId = propProjectId || selectedProject;
  if (!wsProjectId || !window.deskflowAPI?.saveWorkspace) return;
  const saveName = name || workspaceName || 'default';
  const terminalInfo = Object.fromEntries(
    Object.entries(terminalTabs).map(([id, info]) => [id, { name: info.name, agent: info.agent, modelTier: info.modelTier }])
  );
  const result = await window.deskflowAPI.saveWorkspace({
    projectId: wsProjectId, name: saveName, scope: 'project',
    sidebarWidth, activeTab: activeGroup,
    terminalTabs: Object.keys(terminalTabs),
    layout: terminalLayout, activeTerminalId,
    presets, terminalInfo,
    configs: { modelReinjectThreshold, modelDefaultTier, modelDebugMode, ... },
    analyticsPeriod, sessionCategoryFilter,
    mapListRatio: Number(localStorage.getItem(`mapListRatio:${wsProjectId}`)) || 50,
  });
  if (result?.success) {
    setWorkspaceName(saveName);
    showError(`Workspace "${saveName}" saved`, 'info');
  } else {
    showError(result?.error || 'Failed to save workspace', 'error');
  }
}, [propProjectId, selectedProject, workspaceName, sidebarWidth, activeGroup, terminalTabs, terminalLayout, activeTerminalId, presets, analyticsPeriod, sessionCategoryFilter, modelReinjectThreshold, modelDefaultTier, modelDebugMode]);
```

### 8. Workspace Load handler
```tsx
// src/pages/TerminalPage.tsx lines 1915-1990
const handleLoadWorkspace = useCallback(async (name?: string) => {
  const wsProjectId = propProjectId || selectedProject;
  if (!wsProjectId || !window.deskflowAPI?.loadWorkspace) return;
  const result = await window.deskflowAPI.loadWorkspace({ scope: 'project', projectId: wsProjectId, name });
  if (result?.success && result.data) {
    setWorkspaceName(result.data.name || 'default');
    if (result.data.sidebarWidth) setSidebarWidth(result.data.sidebarWidth);
    if (result.data.activeTab) setActiveGroup(result.data.activeTab);
    if (result.data.presets?.length > 0) setPresets(result.data.presets);
    // Restore configs
    if (result.data.configs) {
      const c = result.data.configs;
      if (c.modelReinjectThreshold !== undefined) setModelReinjectThreshold(c.modelReinjectThreshold);
      if (c.modelDefaultTier) setModelDefaultTier(c.modelDefaultTier);
      // ... more config restores
    }
    // Restore analytics period
    if (result.data.analyticsPeriod) setAnalyticsPeriod(result.data.analyticsPeriod);
    // Restore layout
    if (result.data.layout) setTerminalLayout(result.data.layout);
    // Reconstruct terminals
    const savedTabs = result.data.terminalTabs || [];
    const terminalInfo = result.data.terminalInfo || {};
    if (savedTabs.length > 0 && !userCreatedTerminalRef.current) {
      const proj = projects.find(p => p.id === wsProjectId);
      const cwd = proj?.path || '';
      for (const terminalId of savedTabs) {
        if (!terminalTabsRef.current[terminalId]) {
          const info = terminalInfo[terminalId];
          window.dispatchEvent(new CustomEvent('create-terminal', {
            detail: { terminalId, cwd, agent: info?.agent, sessionName: info?.name, restoring: true }
          }));
        }
      }
    }
    if (result.data.activeTerminalId) setActiveTerminalId(result.data.activeTerminalId);
  }
}, [propProjectId, selectedProject, effectiveProjectId, projects]);
```

### 9. create-terminal event handler
```tsx
// src/pages/TerminalPage.tsx lines 2092-2107
const handleCreateTerminal = async (e: CustomEvent) => {
  const d = e.detail as { terminalId: string; cwd?: string; agent?: string; sessionName?: string; restoring?: boolean };
  userCreatedTerminalRef.current = true;
  window.dispatchEvent(new CustomEvent('terminal:mark-spawned', { detail: { terminalId: d.terminalId } }));
  await spawnTerminal(d.terminalId, d.cwd || propProjectPath, d.agent);
  window.dispatchEvent(new CustomEvent('terminal-created', { detail: { terminalId: d.terminalId, agent: d.agent } }));
  if (d.agent && d.agent.length > 0 && !d.restoring) {
    await initializeTerminal(d.terminalId, d.agent, undefined, undefined, undefined, d.cwd || propProjectPath);
  }
};
```

### 10. handleCreateNewSession
```tsx
// src/pages/TerminalPage.tsx lines 1392-1488
const handleCreateNewSession = useCallback(async (name?, summary?, prompt?) => {
  const newTerminalId = generateTerminalId();
  const cwd = proj?.path || '';
  // CREATE UI
  setTerminalTabs(prev => ({ ...prev, [newTerminalId]: { name: name || 'New Session', agent: newSessionAgent, modelTier: 'mid' } }));
  setActiveTerminalId(newTerminalId);
  const updatedLayout = insertIntoLayout(terminalLayout, newTerminalId);
  setTerminalLayout(updatedLayout);
  // SPAWN PTY
  await window.deskflowAPI.spawnTerminal(newTerminalId, cwd, newSessionAgent);
  // INITIALIZE AGENT
  await registerTerminal(newTerminalId);
  await initializeTerminal(newTerminalId, newSessionAgent, undefined, undefined, undefined, cwd);
  // WRITE USER PROMPT
  if (prompt && prompt.trim()) {
    await window.deskflowAPI.agentSend(newTerminalId, prompt, newSessionAgent);
  }
  // SAVE SESSION
  await window.deskflowAPI.saveTerminalSession({ id: sessionId, projectId, agent, terminalId, topic, ... });
}, [...]);
```

### 11. handleInstructionPanelSend
```tsx
// src/pages/TerminalPage.tsx lines 1211-1359
const handleInstructionPanelSend = useCallback(async (config) => {
  // 1. Resolve target terminal
  let resolvedTargetId = activeTerminalId || '';
  // 2. Build topic
  let topic = instructionText || 'Quick instruction';
  // 3. Save session
  await window.deskflowAPI.saveTerminalSession({ id: sessionId, ... });
  // 4. Send prompt to agent
  await window.deskflowAPI.agentSend(resolvedTargetId, config.prompt, config.agent || 'claude');
  // 5. Update terminal binding
  await window.deskflowAPI.updateTerminalBinding({ terminalId, updates: { active_problem_id, session_context } });
  // 6. Background capture opencode session ID
  // 7. Feedback
  showError(toastMsg, 'info');
}, [...]);
```

### 12. PerformanceMetricsPanel (rewritten)
```tsx
// src/components/workspace/PerformanceMetricsPanel.tsx
// Fetches real system stats via IPC + subscribes to terminal:resource-stats
// Shows: System memory, CPU cores, uptime, per-terminal CPU/mem/lag
// Uses: getSystemStats() IPC + onResourceStats() event listener
// Polls every 3 seconds
// Full component: ~300 lines with SystemStats, TerminalResource interfaces
```

### 13. Resource stats IPC (main.ts)
```ts
// src/main.ts — terminal:get-resource-stats
electron_1.ipcMain.handle('terminal:get-resource-stats', async () => {
  await __sampleTerminalStats();
  return { success: true };
});

// src/main.ts — terminal:get-system-stats
electron_1.ipcMain.handle('terminal:get-system-stats', async () => {
  const os = require('os');
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const cpus = os.cpus();
  return {
    success: true,
    data: {
      totalMemMB: Math.round(totalMem / 1024 / 1024),
      freeMemMB: Math.round(freeMem / 1024 / 1024),
      usedMemMB: Math.round((totalMem - freeMem) / 1024 / 1024),
      memPct: Math.round(((totalMem - freeMem) / totalMem) * 100) / 100,
      cpuCount: cpus.length,
      cpuModel: cpus[0]?.model || 'Unknown',
      uptime: Math.floor(os.uptime()),
      platform: process.platform,
      arch: process.arch,
    }
  };
});
```

### 14. Preload bridges
```ts
// src/preload.ts lines 309-340
getResourceStats: () => ipcRenderer.invoke('terminal:get-resource-stats'),
getSystemStats: () => ipcRenderer.invoke('terminal:get-system-stats'),
onResourceStats: (callback) => {
  const handler = (_event, stats) => callback(stats);
  ipcRenderer.on('terminal:resource-stats', handler);
  return () => ipcRenderer.removeListener('terminal:resource-stats', handler);
},
// Conductor IPC
conductorStart: (opts) => ipcRenderer.invoke('conductor:start', opts),
conductorPause: (id) => ipcRenderer.invoke('conductor:pause', id),
conductorResume: (id) => ipcRenderer.invoke('conductor:resume', id),
conductorKill: (id) => ipcRenderer.invoke('conductor:kill', id),
conductorSetAutonomy: (id, level) => ipcRenderer.invoke('conductor:set-autonomy', id, level),
conductorSendDirective: (id, text) => ipcRenderer.invoke('conductor:send-directive', id, text),
conductorResolveEscalation: (id, escId, decision, note) => ipcRenderer.invoke('conductor:resolve-escalation', id, escId, decision, note),
conductorPromoteIntegration: (id) => ipcRenderer.invoke('conductor:promote', id),
conductorGetSnapshot: (id) => ipcRenderer.invoke('conductor:get-snapshot', id),
conductorListMissions: () => ipcRenderer.invoke('conductor:list-missions'),
onConductorSnapshot: (callback) => {
  const handler = (_event, snapshot) => callback(snapshot);
  ipcRenderer.on('conductor:snapshot', handler);
  return () => ipcRenderer.removeListener('conductor:snapshot', handler);
},
onConductorMessage: (callback) => {
  const handler = (_event, msg) => callback(msg);
  ipcRenderer.on('conductor:message', handler);
  return () => ipcRenderer.removeListener('conductor:message', handler);
},
```

### 15. SkillsTab (actual location)
```tsx
// src/components/SkillsTab.tsx — NOT in workspace/ dir
// Loads skills via: window.deskflowAPI.getSkills({ projectPath })
// Also loads: window.deskflowAPI.getAppSkills()
// Also loads: window.deskflowAPI.getSavedSkills()
// Has tabs: project / saved / browse
// Search, filter, sync, create, delete functionality
```

### 16. Type definitions
```ts
// src/types/deskflow-api.d.ts
interface ProjectBackupManifest {
  id: string; projectId: string; label: string; timestamp: string;
  fileCount: number; totalSize: number; compressionRatio: number; autoBackup: boolean;
}
interface ProjectBackupDiff {
  added: string[]; deleted: string[]; modified: string[]; unchanged: string[]; totalChanged: number;
}
// DeskflowAPI interface: 398 lines covering ALL IPC channels
// workspace: saveWorkspace, loadWorkspace, listWorkspaces, listAllWorkspaces, deleteWorkspace
// terminal: spawnTerminal, writeTerminal, resizeTerminal, killTerminal, getResourceStats, getSystemStats
// conductor: conductorStart, conductorPause, conductorResume, conductorKill, conductorListMissions, etc.
// skills: getSkills, getAppSkills, createSkill, updateSkill, deleteSkill, saveSkill, etc.
// backup: projectBackup.create, projectBackup.list, projectBackup.restore, projectBackup.diff, etc.
```

---

## Design Tokens

```css
/* Background */
bg-zinc-950 (page), bg-zinc-900/50 (cards), bg-zinc-900/80 (glass)

/* Border */
ring-1 ring-inset ring-zinc-800/70

/* Text */
text-zinc-100 (primary), text-zinc-400 (secondary), text-zinc-500 (muted)

/* Accent */
--page-accent CSS variable per group
orange (Setup), green (Work), purple (Insights), indigo (Studio), amber (Context)

/* Font */
Geist (body), JetBrains Mono (code)

/* Rounded */
rounded-xl (max), rounded-lg (standard), rounded-full (pills)

/* Spacing */
px-3 py-3 (card padding), px-4 py-2 (toolbar), gap-3 (item spacing)
```

---

## IPC Convention

```ts
// Preload bridge
channelName: (args) => ipcRenderer.invoke('channel-name', args)

// Main process handler
electron_1.ipcMain.handle('channel-name', async (_event, args) => {
  // ... logic ...
  return { success: true, data: result };
  // or
  return { success: false, error: 'message' };
});

// Event subscription
onEventName: (callback) => {
  const handler = (_event, data) => callback(data);
  ipcRenderer.on('event-name', handler);
  return () => ipcRenderer.removeListener('event-name', handler);
}
```

---

## State Management

```tsx
// React hooks
const [activeGroup, setActiveGroup] = useState<GroupKey>('work');
const [terminalTabs, setTerminalTabs] = useState<Record<string, TabInfo>>({});
const [terminalLayout, setTerminalLayout] = useState<PaneNode | null>(null);
const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

// Persistent state via localStorage
const [workspaceName, setWorkspaceName] = useState(() => {
  try { return localStorage.getItem('workspace-name') || 'default'; } catch { return 'default'; }
});

// Custom event system
window.dispatchEvent(new CustomEvent('create-terminal', { detail: { terminalId, cwd, agent } }));
window.addEventListener('create-terminal', handler);
```
