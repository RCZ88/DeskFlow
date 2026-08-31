# CONTEXT_BUNDLE.md — Architecture Map Prompt (Self-Contained)

> This file is SELF-CONTAINED. The external AI has NO file access. All code below
> is verbatim from the project. The AI must use ONLY this context to generate
> ARCHITECTURE.md.

## Project Overview

- **Stack:** React 19 + TypeScript + Electron + better-sqlite3 + Vite
- **State:** Zustand stores + React useState/useReducer
- **IPC:** Electron IPC (main process ↔ renderer via preload bridge)
- **DB:** SQLite at %APPDATA%/RHEO/deskflow-data.db
- **Package:** `deskflow-app` (Electron desktop app)

## File Structure

```
src/
├── App.tsx                    (3563 lines) — Router, sidebar, global state, top bar
├── main.ts                    (34259 lines) — Electron main process, ALL IPC handlers, DB
├── preload.ts                 (1773 lines) — IPC bridge (contextBridge.exposeInMainWorld)
├── pages/                     — Route-level page components
│   ├── DashboardPage.tsx      (2835 lines) — Home dashboard
│   ├── TerminalPage.tsx       (5044 lines) — Terminal workspace (5-group sidebar)
│   ├── FinancePage.tsx        — Finance tracking
│   ├── ActivityPage.tsx       — Unified apps/websites/productivity
│   ├── IDEProjectsPage.tsx    — IDE project management
│   ├── AiPage.tsx             — AI chat + context capture
│   ├── ExternalPage.tsx       — External activity tracking
│   ├── SettingsPage.tsx       — App settings
│   ├── LifePage.tsx           — Life phases, memories, gold, notes
│   ├── LearnPage.tsx          — Lyceum learning system
│   ├── InsightsPage.tsx       — Reports & analytics
│   ├── DatabasePage.tsx       — DB browser + architecture viz
│   ├── ResumePage.tsx         — Resume builder
│   └── ... (39 total page files)
├── components/                — Reusable UI components (125+ files)
│   ├── ui/                    — shadcn primitives (button, dialog, input, etc.)
│   ├── dashboard/             — Dashboard-specific cards
│   ├── finance/               — Finance modals and charts
│   ├── learn/                 — Learn OS blocks and views
│   ├── workspace/             — Terminal workspace components
│   └── ...
├── features/                  — Feature modules
│   ├── content-engine/        — Content creation pipeline
│   ├── focus/                 — Focus mode + groups
│   ├── warmth/                — Life page (gold, memories, context brain)
│   ├── selection-engine/      — Screen element selection
│   ├── resume/                — Resume builder
│   └── ...
├── services/                  — Backend services
│   ├── contentEngine/         — Content engine rubric, prompts, handlers
│   ├── providers/             — AI provider routing
│   └── ...
├── hooks/                     — Custom React hooks
├── stores/                    — Zustand stores
├── lib/                       — Utility functions
├── shared/                    — Shared types (renderer + main)
├── main/                      — Main-process modules
│   ├── ai/                    — Context brain, memory, embeddings
│   └── archMap/               — Architecture scanner
└── types/                     — TypeScript declarations
```

## Key Source: App.tsx Routes (verbatim)

```tsx
// src/App.tsx lines 2995-3075
<Routes key={location.pathname}>
  <Route path="/" element={<DashboardPage appColors={appColors} categoryOverrides={categoryOverrides} timerBehavior={timerBehavior} selectedPeriod={selectedPeriod} onSelectedPeriodChange={setSelectedPeriod} dateOffset={dateOffset} onDateOffsetChange={setDateOffset} trackingBrowser={trackingBrowser} trackingBrowsers={trackingBrowsers} trackerAppMode={trackerAppMode} tierAssignments={tierAssignments || DEFAULT_TIER_ASSIGNMENTS} timerState={timerState} onTimerStateChange={setTimerState} activityFeed={activityFeed} onActivityFeedChange={handleActivityFeedChange} externalActivities={externalActivities} externalWeeklyStats={externalWeeklyStats} />} />
  <Route path="/activity" element={<ActivityPage appStats={appStats} logs={filteredLogs} allLogs={allLogs} browserLogs={browserLogs} selectedPeriod={selectedPeriod} dateOffset={dateOffset} onDateOffsetChange={setDateOffset} timeMode={timeMode} tierAssignments={tierAssignments || DEFAULT_TIER_ASSIGNMENTS} liveActivityLogs={liveActivityLogs} domainKeywordRules={domainKeywordRules} externalActivities={externalActivities} externalActivityTiers={externalActivityTiers} />} />
  <Route path="/stats" element={<Navigate to="/activity?tab=apps" replace />} />
  <Route path="/productivity" element={<Navigate to="/activity?tab=productivity" replace />} />
  <Route path="/browser" element={<Navigate to="/activity?tab=websites" replace />} />
  <Route path="/ide" element={<IDEProjectsPage selectedPeriod={selectedPeriod} dateOffset={dateOffset} />} />
  <Route path="/external" element={<ExternalPage selectedPeriod={selectedPeriod} dateOffset={dateOffset} onDateOffsetChange={setDateOffset} />} />
  <Route path="/ai" element={<AiPage />} />
  <Route path="/studio" element={<FeatureStudioPage />} />
  <Route path="/finance" element={<FinancePage />} />
  <Route path="/resume" element={<ResumePage />} />
  <Route path="/resume/build" element={<ResumeBuilderPage />} />
  <Route path="/resume/preview" element={<ResumePreviewPage />} />
  <Route path="/resume/import" element={<ResumeImportPage />} />
  <Route path="/resume/export" element={<ResumeExportPage />} />
  <Route path="/dashboard" element={<Navigate to="/" replace />} />
  <Route path="/guide" element={<GuidePage />} />
  <Route path="/life" element={<ErrorBoundary><Suspense fallback={...}><LifePage /></Suspense></ErrorBoundary>} />
  <Route path="/learn" element={<ErrorBoundary><Suspense fallback={...}><LearnPage /></Suspense></ErrorBoundary>} />
  <Route path="/terminal" element={<TerminalPage />} />
  <Route path="/reports" element={<InsightsPage ... />} />
  <Route path="/database" element={<DatabasePage />} />
  <Route path="/settings" element={<SettingsPage ... />} />
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

## Key Source: DashboardPage.tsx imports (verbatim)

```tsx
// src/pages/DashboardPage.tsx lines 1-48
import { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { PageShell } from '../components/PageShell';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useNavigate } from 'react-router-dom';
import { CurrentCanvas } from '../components/CurrentCanvas';
import { renderStream } from '../lib/renderers/stream';
import { startPhaseClock } from '../lib/currentPhase';
import { HeroBand } from './dashboard/HeroBand';
import { SummaryStrip } from './dashboard/SummaryStrip';
import { PinnedActivities } from './dashboard/PinnedActivities';
import { QuickFocusCard } from '../components/focus/QuickFocusCard';
import { ScheduleCard } from './dashboard/ScheduleCard';
import { StatusBand } from './dashboard/StatusBand';
import { GoalsCard } from '../components/dashboard/GoalsCard';
import { DeadlinesCard } from '../components/dashboard/DeadlinesCard';
import { LongestFocusCard } from '../components/dashboard/LongestFocusCard';
import { useDashboardData } from '../components/dashboard/useDashboardData';
import { InsightStrip } from './dashboard/InsightStrip';
import { MomentumHero } from '../components/dashboard/MomentumHero';
import { TierBreakdownStrip } from './dashboard/TierBreakdownStrip';
import { SectionHeader } from '../components/SectionHeader';
import { GlassCard } from '../components/GlassCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { DayDetailPopup } from '../components/DayDetailPopup';
import OrbitSystem from '../components/OrbitSystem';
import { useHomeSummary } from '../hooks/useHomeSummary';
import { useDeepFocus } from '../hooks/useDeepFocus';
import { Bar, Line } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'motion/react';
import { BlurFade } from '../components/ui/blur-fade';
import { Particles } from '../components/ui/particles';
import { BookOpen, Dumbbell, Activity, Utensils, Coffee, Bus, Book, Timer, Zap, Sun, Focus, Clock, X, Edit3, Check, Plus, Minus, TrendingUp, Target, RefreshCw, Clock3, ChevronLeft, ChevronRight, Maximize2, Minimize2, BarChart3, Bot, Sparkles, ArrowRight } from 'lucide-react';
import { maxOf, maxBy } from '../utils/safeMath';
import { getDateRange } from '../lib/dateRange';
import type { Period } from '../lib/dateRange';
import { awaitApi } from '../lib/awaitApi';
import { TimerResetOverlay } from '../components/dashboard/TimerResetOverlay';
```

## Key Source: Preload bridge pattern (verbatim)

```ts
// src/preload.ts lines 1-80
import { contextBridge, ipcRenderer } from 'electron';

console.log('[PRELOAD] v3.0 executing — ipcRenderer:', typeof ipcRenderer, 'contextBridge:', typeof contextBridge);

ipcRenderer.on('external-data-changed', () => {
  window.dispatchEvent(new CustomEvent('external-data-changed'));
});

contextBridge.exposeInMainWorld('deskflowAPI', {
  onForegroundChange: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('foreground-changed', handler);
    return () => { ipcRenderer.removeListener('foreground-changed', handler); };
  },
  getLogs: () => ipcRenderer.invoke('get-logs'),
  updateAppLog: (id: number, data: { timestamp?: string; duration_ms?: number; title?: string }) =>
    ipcRenderer.invoke('update-app-log', id, data),
  deleteAppLog: (id: number) => ipcRenderer.invoke('delete-app-log', id),
  getDashboardAggregates: (request: { period: string; dateOffset?: number; weekOffset?: number }) =>
    ipcRenderer.invoke('get-dashboard-aggregates', request),
  getAppStats: (request: { period: string; dateOffset?: number }) =>
    ipcRenderer.invoke('get-app-stats', request),
  getDomainStats: (request: { period: string; dateOffset?: number }) =>
    ipcRenderer.invoke('get-domain-stats', request),
  getDashboardData: (params: { period: string; dateOffset?: number }) => ipcRenderer.invoke('get-dashboard-data', params),
  getPageStats: (params: { page: string; period: string; dateOffset?: number }) => ipcRenderer.invoke('get-page-stats', params),
  backfillAggregations: () => ipcRenderer.invoke('backfill-aggregations'),
  getLogsByPeriod: (params: { period: 'today' | 'week' | 'month' | 'all'; dateOffset?: number }) => ipcRenderer.invoke('get-logs-by-period', params),
  getStats: () => ipcRenderer.invoke('get-stats'),
  getDailyStats: (period: 'week' | 'month' | 'all') => ipcRenderer.invoke('get-daily-stats', period),
  toggleTracking: () => ipcRenderer.invoke('toggle-tracking'),
  setTracking: (enabled: boolean) => ipcRenderer.invoke('set-tracking', enabled),
  restartTracking: () => ipcRenderer.invoke('restart-tracking'),
  // ... 500+ more bridge methods
});
```

## Key Source: main.ts IPC handler pattern (verbatim)

```ts
// src/main.ts — IPC handler pattern
electron_1.ipcMain.handle('save-terminal-session', async (_event, session: any) => {
    const id = session.id || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const existing = db.prepare('SELECT created_at FROM terminal_sessions WHERE id = ?').get(id);
    if (existing) {
        db.prepare(`UPDATE terminal_sessions SET topic = ?, agent = ?, ... WHERE id = ?`).run(...);
    } else {
        db.prepare(`INSERT INTO terminal_sessions (id, project_id, agent, topic, ...) VALUES (?, ?, ?, ?, ...)`).run(...);
    }
    return { success: true, id, resumeId };
});

electron_1.ipcMain.handle('get-context-systems', async (_event, projectPath?: string) => {
    const systems = [
        build('llm_wiki', 'LLM Wiki', () => { /* scan agent/*.md */ }),
        build('obsidian_skills', 'Obsidian Skills', () => { /* scan agent/skills/ */ }),
        build('graphify', 'Graphify', () => { /* scan graphify-out/graph.json */ }),
        // ... 7 systems total
    ];
    return { success: true, data: systems };
});

electron_1.ipcMain.handle('assemble-context', async (_event, data) => {
    const parts = [];
    // 1. Active problems from DB
    // 2. Active requests from DB
    // 3. Recent sessions from DB
    // 4. Backup protocol
    // 5. User context profile
    // 6. Context brain retrieval
    // 7. User dictionary injection
    const context = parts.join('\n\n---\n\n');
    return { success: true, context, tokensUsed: Math.ceil(totalChars / 4) };
});
```

## Key Source: Architecture Scanner (verbatim)

```ts
// src/main/archMap/scanner.ts — The scanner that parses the codebase
export interface ArchNode {
  id: string;
  type: 'page' | 'component' | 'feature' | 'service' | 'hook' | 'store' | 'util' | 'ipc';
  name: string;
  filePath: string;
  lineCount: number;
  route?: string;
  imports: string[];
  exports: string[];
  features: string[];
  ipcHandlers: string[];
  ipcCalls: string[];
  childComponents: string[];
}

export interface ArchEdge {
  from: string;
  to: string;
  type: 'import' | 'ipc' | 'state' | 'render' | 'route';
  label?: string;
}

const ROUTE_MAP: Record<string, string> = {
  '/': 'DashboardPage',
  '/activity': 'ActivityPage',
  '/ide': 'IDEProjectsPage',
  '/external': 'ExternalPage',
  '/ai': 'AiPage',
  '/studio': 'FeatureStudioPage',
  '/finance': 'FinancePage',
  '/resume': 'ResumePage',
  '/life': 'LifePage',
  '/learn': 'LearnPage',
  '/terminal': 'TerminalPage',
  '/reports': 'InsightsPage',
  '/database': 'DatabasePage',
  '/settings': 'SettingsPage',
};

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+(?:{[^}]+}|[\w*]+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) imports.push(match[1]);
  return imports;
}

function extractIpcHandlers(content: string): string[] {
  const handlers: string[] = [];
  const handlerRegex = /ipcMain\.handle\(['"]([^'"]+)['"]/g;
  let match;
  while ((match = handlerRegex.exec(content)) !== null) handlers.push(match[1]);
  return handlers;
}

function extractFeatures(content: string): string[] {
  const features: string[] = [];
  if (/useState|useReducer|zustand/.test(content)) features.push('state-management');
  if (/useEffect|setInterval/.test(content)) features.push('lifecycle');
  if (/onClick|onSubmit|onChange/.test(content)) features.push('event-handlers');
  if (/fetch\(|ipcRenderer|window\.deskflowAPI/.test(content)) features.push('data-fetching');
  if (/useCallback|useMemo/.test(content)) features.push('performance');
  if (/AnimatePresence|motion\./.test(content)) features.push('animation');
  if (/\.prepare\(|\.run\(|\.get\(|\.all\(/.test(content)) features.push('database');
  if (/dialog|Dialog|modal|Modal/.test(content)) features.push('modal');
  if (/chart|Chart|recharts/.test(content)) features.push('visualization');
  return features;
}

export function generateArchMap(srcRoot: string): ArchMap {
  const nodes: ArchNode[] = [];
  // Recursively scan src/ for .tsx/.ts files
  // For each file: extract imports, exports, features, IPC handlers/calls, JSX components
  // Build edges from import/IPC/render relationships
  return { nodes, edges, stats };
}
```

## IPC Channel Inventory (partial — main.ts has 300+ handlers)

| Domain | Channels | Handler Location |
|--------|----------|-----------------|
| Terminal | `save-terminal-session`, `get-terminal-sessions`, `spawn-terminal`, `agent:send`, `agent:get-phase` | main.ts:14077-13395 |
| Context | `get-context-systems`, `assemble-context`, `context-system-status`, `context-system-verify` | main.ts:15935-16160 |
| Finance | `finance:get-wallets`, `finance:get-transactions`, `finance:get-subscription-intelligence` | main.ts:25000+ |
| Learn | `learn:*` (30+ channels) | src/services/learn/ |
| AI | `ai:chat`, `ai-context:list`, `brain:search` | main.ts:7000-16000 |
| Focus | `focusGroup:save`, `focusGroup:getUsage`, `focusGoal:get/save` | src/domains/focus/ |
| Content Engine | `content:ideas:*`, `content:episodes:*`, `content:script:*` | src/services/contentEngine/ |
| Life | `lifePhase:get`, `lifePhase:save`, `lifePhase:aiReflect` | main.ts |
| User Dictionary | `user-dictionary:list/add/update/delete/export/import` | main.ts:16120+ |
| Architecture Map | `arch-map:generate`, `arch-map:get-node`, `arch-map:search` | main.ts:16060+ |

## What to Generate

Produce `ARCHITECTURE.md` with:

1. **App Stats** — total files, lines, components, features, IPC handlers
2. **Route Map** — table of route → page component → file → line count
3. **Per-Page Architecture** — for each page:
   - File path and line count
   - All imports (categorized: UI component, hook, service, lib, feature)
   - State variables (name, hook type, line number, purpose)
   - Effects (line number, what it does)
   - IPC calls (channel name, line number)
   - Features detected (state, animation, DB, etc.)
   - Child components rendered (component name, line number)
4. **IPC Handler Map** — channel → main.ts line → purpose → caller component
5. **Feature Matrix** — feature → files that have it → line references
6. **Connection Graph** — import/render/IPC edges as text diagram

Every entry MUST include file:line references. No guessing.
