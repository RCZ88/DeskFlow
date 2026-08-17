# Context Bundle — RHEO Content Engine v2.0

## Project: DeskFlow (Electron + React + Vite + TypeScript)

---

## 1. DB Schema Pattern (src/domains/focus/focusSchema.ts)

```ts
import type Database from 'better-sqlite3';

export function ensureFocusSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS deep_focus_sessions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at    TEXT NOT NULL,
      ended_at      TEXT,
      planned_sec   INTEGER NOT NULL,
      actual_sec    INTEGER,
      outcome       TEXT NOT NULL DEFAULT 'active',
      strictness    TEXT NOT NULL DEFAULT 'distracting',
      broke_on_type TEXT,
      broke_on_name TEXT,
      return_count  INTEGER NOT NULL DEFAULT 0,
      allowed_json  TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_dfs_started ON deep_focus_sessions(started_at);

    CREATE TABLE IF NOT EXISTS focus_groups (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL,
      color           TEXT,
      daily_goal_sec  INTEGER,
      goal_category   TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS focus_group_apps (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id  INTEGER NOT NULL REFERENCES focus_groups(id) ON DELETE CASCADE,
      app_name  TEXT NOT NULL,
      UNIQUE(group_id, app_name)
    );

    CREATE TABLE IF NOT EXISTS focus_group_usage (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id   INTEGER NOT NULL REFERENCES focus_groups(id) ON DELETE CASCADE,
      session_id INTEGER REFERENCES deep_focus_sessions(id) ON DELETE SET NULL,
      date       TEXT NOT NULL,
      seconds    INTEGER NOT NULL DEFAULT 0,
      UNIQUE(group_id, date)
    );
  `);

  // Migration for existing DBs: add column if missing
  const cols = db.prepare('PRAGMA table_info(focus_groups)').all() as any[];
  if (cols.length > 0 && !cols.some(c => c.name === 'daily_goal_sec')) {
    try { db.exec('ALTER TABLE focus_groups ADD COLUMN daily_goal_sec INTEGER'); }
    catch { /* column already added */ }
  }
}
```

---

## 2. IPC Handler Pattern (src/main.ts lines 5046-5099)

```ts
electron_1.ipcMain.handle('focusGroup:save', (_e, g: any) => {
    if (!g || typeof g.name !== 'string' || !g.name.trim()) {
        return { success: false, error: 'Group name is required' };
    }
    try {
        const id = focusGroupManager.save({
            name: g.name.trim(),
            color: g.color || null,
            dailyGoalSec: g.dailyGoalSec || null,
            goalCategory: g.goalCategory || null,
            apps: Array.isArray(g.apps) ? g.apps : [],
        });
        return { success: true, id };
    } catch (err) {
        return { success: false, error: String(err) };
    }
});

electron_1.ipcMain.handle('focusGroup:getAll', () => {
    try {
        return { success: true, groups: focusGroupManager.getAll() };
    } catch (err) {
        return { success: false, error: String(err) };
    }
});

electron_1.ipcMain.handle('focusGroup:getUsage', (_e, params: { groupId: number; date?: string }) => {
    try {
        return { success: true, usage: focusGroupManager.getUsage(params.groupId, params.date) };
    } catch (err) {
        return { success: false, error: String(err) };
    }
});
```

---

## 3. Preload Bridge Pattern (src/preload.ts)

```ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('deskflowAPI', {
  // Simple getter
  getLogs: () => ipcRenderer.invoke('get-logs'),
  
  // With params
  getDashboardData: (params: { period: string; dateOffset?: number }) =>
    ipcRenderer.invoke('get-dashboard-data', params),
  
  // CRUD
  focusGroupSave: (group: any) => ipcRenderer.invoke('focusGroup:save', group),
  focusGroupGetAll: () => ipcRenderer.invoke('focusGroup:getAll'),
  
  // Event listener (main → renderer)
  onForegroundChange: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('foreground-changed', handler);
    return () => { ipcRenderer.removeListener('foreground-changed', handler); };
  },
});
```

---

## 4. AI Provider Pattern (src/services/providers/router.ts)

```ts
type FeaturePurpose = 'researchDigest' | 'goalAssistant' | 'resumeBuilder' | 'category' | 'colors' | 'lifeAssistant' | 'monthlyRecap';

export function buildChain(
  state: AiProvidersState,
  feature: FeaturePurpose,
): Array<{ provider: ResolvedProvider; model: string }> {
  const enabled = state.providers.filter(p => p.enabled);
  const assigned = state.routing[feature] ?? state.routing.default;
  const chain = [];
  const primaryCfg = enabled.find(p => p.id === assigned.providerId);
  if (primaryCfg) chain.push({ provider: resolve(primaryCfg), model: assigned.model });
  enabled.sort((a, b) => a.priority - b.priority)
    .filter(p => p.id !== assigned.providerId)
    .forEach(p => chain.push({ provider: resolve(p), model: p.models[0] ?? assigned.model }));
  return chain;
}

export async function runWithFallback(
  chain: ReturnType<typeof buildChain>,
  req: Omit<CanonicalRequest, 'model'>,
  externalSignal?: AbortSignal,
): Promise<{ result: CanonicalResponse; usedProviderId: string }> {
  for (const [i, link] of chain.entries()) {
    try {
      const result = await callWithTokenTiers(link.provider, { ...req, model: link.model }, externalSignal);
      return { result, usedProviderId: link.provider.config.id };
    } catch (err) { /* log and try next */ }
  }
  throw new Error('All providers exhausted');
}
```

**Usage in main.ts:**
```ts
const { buildChain, runWithFallback } = require("./services/providers/router");

ipcMain.handle('get-topic-digest', async (_event, opts?) => {
    const p = userPreferences || {};
    const pState = p.aiProviders ? JSON.parse(p.aiProviders) : null;
    const chain = buildChain(pState, 'researchDigest');
    const { result: r } = await runWithFallback(chain, {
        systemPrompt,
        messages: [{ role: 'user', content: userMsg }],
        maxTokens: 2000,
        temperature: 0.4,
    });
    return { success: true, topics: JSON.parse(r.content) };
});
```

---

## 5. Page Component Pattern (src/pages/StatsPage.tsx)

```tsx
import { useState, useMemo } from 'react';
import { PageShell } from '../components/PageShell';
import { GlassCard } from '../components/GlassCard';
import { SectionHeader } from '../components/SectionHeader';
import { BarChart3 } from 'lucide-react';

interface StatsPageProps {
  embedded?: boolean;
  appStats: AppStat[];
  logs: unknown[];
  selectedPeriod?: Period;
}

export default function StatsPage({ embedded, appStats, logs, ... }: StatsPageProps) {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  
  const sortedApps = useMemo(() => {
    return [...appStats].sort((a, b) => b.total_ms - a.total_ms);
  }, [appStats]);

  return (
    <PageShell page="stats">
      <SectionHeader title="Stats" icon={<BarChart3 />} />
      
      <GlassCard>
        <div className="space-y-3">
          {sortedApps.map(app => (
            <div key={app.name} onClick={() => setSelectedApp(app.name)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors">
              <span className="text-sm text-zinc-200">{app.name}</span>
              <span className="text-xs text-zinc-500">{app.total_ms}s</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </PageShell>
  );
}
```

---

## 6. Design Tokens (src/index.css)

```css
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));

@theme {
    --color-background: #09090b;
    --color-foreground: #fafafa;
    --color-card: #18181b;
    --color-card-foreground: #fafafa;
    --color-primary: #fbbf24;
    --color-primary-foreground: #09090b;
    --color-secondary: #27272a;
    --color-secondary-foreground: #fafafa;
    --color-muted: #27272a;
    --color-muted-foreground: #a1a1aa;
    --color-accent: #27272a;
    --color-accent-foreground: #fafafa;
    --color-destructive: #ef4444;
    --color-border: #27272a;
    --color-input: #27272a;
    --color-ring: #fbbf24;
    --ws-surface: #09090b;
    --ws-surface-raised: #18181b;
    --ws-border: rgb(39 39 42 / 0.6);
    --ws-border-strong: rgb(63 63 70 / 0.6);
    --ws-accent: #06b6d4;
    --ws-radius-card: 0.5rem;
    --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --font-mono: "JetBrains Mono", "Fira Code", monospace;
    --font-display: "Space Grotesk", "Inter", sans-serif;
}
```

**GlassCard base:**
```
bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-xl p-4
```

**Color palette:**
- Background stack: `#09090b` → `#18181b` → `#27272a` → `#a1a1aa` → `#fafafa`
- Primary accent: `#fbbf24` (amber)
- Secondary accent: `#06b6d4` (cyan)
- Category colors: IDE=#6366f1, AI=#8b5cf6, Browser=#3b82f6, Entertainment=#ec4899, Communication=#14b8a6, Design=#a855f7, Productivity=#10b981, Tools=#f59e0b

---

## 7. Spec Reference

The full specification is at `agent/docs/RHEO_Content_Engine_v2_Spec.md` (567 lines). It contains:
- Complete SQL schema for all 11 tables
- All 30+ IPC handler signatures
- All 4 AI prompt templates
- All 7 UI view descriptions
- Content Equation formula
- Design tokens
- Implementation phases
- Success criteria
