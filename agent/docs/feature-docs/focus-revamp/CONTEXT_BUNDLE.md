# Context Bundle — Focus Subpage Revamp

## Architecture Overview

DeskFlow is an Electron + React + better-sqlite3 desktop productivity tracker. The Focus feature provides timed deep-work sessions with soft-blocking of distracting apps/sites.

### Routing Hierarchy
```
ActivityPage (src/pages/ActivityPage.tsx)
  └── 3 tabs: Applications | Websites | Productivity
        └── ProductivityTab renders <ProductivityPage /> (src/pages/ProductivityPage.tsx, 1621 lines)
```

Currently `/focus` is a standalone route. The plan is to make Focus a **subpage within the Productivity tab** of ActivityPage.

### Current Focus Implementation Files
- `src/pages/FocusPage.tsx` — standalone page (250 lines)
- `src/hooks/useFocusSession.ts` — React hook (48 lines)
- `src/domains/focus/focusSchema.ts` — DB schema (30 lines)
- `src/domains/focus/focusManager.ts` — backend session manager
- `src/types/deskflow-api.d.ts` — IPC type definitions
- `src/preload.ts` lines 1032-1045 — IPC bridge (focus.start, focus.end, focus.getState, focus.history, focus.onState, focus.onEnded)

## DB Schema (focusSchema.ts)
```sql
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

CREATE TABLE IF NOT EXISTS deep_focus_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL REFERENCES deep_focus_sessions(id) ON DELETE CASCADE,
  ts          TEXT NOT NULL,
  kind        TEXT NOT NULL,
  target_type TEXT,
  target_name TEXT
);
```

## IPC Endpoints (preload.ts)
```typescript
focus: {
  start: (cfg: any) => ipcRenderer.invoke('focus:start', cfg),
  end: (outcome?: string) => ipcRenderer.invoke('focus:end', outcome),
  getState: () => ipcRenderer.invoke('focus:get-state'),
  history: (opts?: { limit?: number }) => ipcRenderer.invoke('focus:history', opts),
  onState: (h: (s: any) => void) => { ipcRenderer.on('focus:state', h); return () => { ipcRenderer.removeListener('focus:state', h); }; },
  onEnded: (h: () => void) => { ipcRenderer.on('focus:ended', h); return () => { ipcRenderer.removeListener('focus:ended', h); }; },
}
```

## Hook: useFocusSession.ts
```typescript
import { useEffect, useState, useCallback } from 'react';

export interface FocusPublicState {
  active: boolean;
  endsAt: number | null;
  remainingSec: number;
  strictness: string;
  paused: boolean;
}

function getApi() {
  return (window as any).deskflowAPI?.focus as any;
}

export function useFocusSession() {
  const [state, setState] = useState<FocusPublicState | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const refreshHistory = useCallback(async () => {
    const api = getApi();
    if (!api) return;
    setHistory(await api.history({ limit: 50 }));
  }, []);

  useEffect(() => {
    const api = getApi();
    if (!api) return;
    api.getState().then(setState);
    const offS = api.onState(setState);
    const offE = api.onEnded(() => { api.getState().then(setState); refreshHistory(); });
    refreshHistory();
    return () => { offS?.(); offE?.(); };
  }, [refreshHistory]);

  const start = useCallback((durationSec: number, strictness: 'distracting' | 'non_allowed' = 'distracting') => {
    const api = getApi();
    if (!api) return Promise.resolve();
    return api.start({ durationSec, strictness }).then(setState);
  }, []);

  const stop = useCallback(() => {
    const api = getApi();
    if (!api) return Promise.resolve();
    return api.end('aborted').then(() => api.getState().then(setState));
  }, []);

  return { state, history, start, stop, refreshHistory };
}
```

## Current FocusPage.tsx (250 lines)
```tsx
// Key sections:
// 1. Header: "Deep Focus" with active session indicator
// 2. Session controls card: preset buttons (5m/10m/15m/25m/50m/90m), strict toggle, start button
// 3. Today's focus stats: completed time, total sessions, completion rate
// 4. Session history table: date, duration, planned, strictness, returns, outcome
// Uses: PageShell, GlassCard, framer-motion AnimatePresence, useFocusSession hook
// Uses: Focus, Play, Square, Clock, CheckCircle2, XCircle, AlertTriangle, Target, TrendingUp, List, Zap icons
```

## ActivityPage Tab System (lines 28-32)
```typescript
const TABS = [
  { key: 'apps', label: 'Applications', icon: Monitor, accent: '#6366f1' },
  { key: 'websites', label: 'Websites', icon: Globe, accent: '#3b82f6' },
  { key: 'productivity', label: 'Productivity', icon: Target, accent: '#10b981' },
] as const;
```

## ProductivityPage Structure (1621 lines)
- Computes productivity score from app/browser logs
- Renders: score hero, tier breakdown pie chart, weekly trend line chart, daily bar chart, category breakdown
- Uses: GlassCard, SectionHeader, NumberTicker, DotPattern, Badge, chartjs

## Design Tokens (from index.css / GlassCard)
```css
/* Glass layers */
.bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50  /* default */
.bg-zinc-900/80 backdrop-blur-xl                            /* glass-heavy */

/* Accents */
pink:   bg-pink-500/60 border-pink-500/20   /* focus sessions */
amber:  bg-amber-500/60 border-amber-500/20  /* warnings */
emerald: bg-emerald-500/60 border-emerald-500/20  /* success */

/* Radius: rounded-xl max
/* Padding: p-4 (GlassCard default), p-5 for larger sections
/* Fonts: Geist/Inter body (13px), JetBrains Mono monospace
/* Headings: font-semibold, weight-based hierarchy
```

## Available MCP Components
### Magic UI (247 total)
- `animated-circular-progress-bar` — circular gauge with percentage
- `particles` — ambient particle effects
- `animated-beam` — connection lines
- `number-ticker` — animated number counting
- `blur-fade` — text fade animations
- `border-beam` — animated border glow
- `meteors` — falling meteor effects
- `grid-pattern` — animated background grid
- `marquee` — scrolling text
- `confetti` — celebration effect

### Lucide Icons
- `Focus` — deep work icon
- `Target` — goal icon
- `Play`, `Square`, `Clock`, `Timer` — session controls
- `CheckCircle2`, `XCircle`, `AlertTriangle` — outcomes
- `TrendingUp`, `BarChart3`, `Zap` — stats
- `Brain`, `Sparkles`, `Flame` — productivity
- `ChevronDown`, `ChevronRight` — disclosure
- `Eye`, `EyeOff` — visibility toggles

### DeskFlow Custom Components
- `GlassCard` (variant: default, compact, subtle, notebook, bordered, elevated, interactive)
- `SectionHeader`
- `NumberTicker` (animated counting)
- `DotPattern` (background)
- `Badge`
- `LoadingState`
