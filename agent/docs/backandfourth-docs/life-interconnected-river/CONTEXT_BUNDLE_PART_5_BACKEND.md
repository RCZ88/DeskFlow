# CONTEXT BUNDLE PART 5 — Backend (DB schema + IPC + preload) & Gold page host

**Source of truth:** `src/main.ts` (Electron main process, better-sqlite3). Renderer talks ONLY via `window.deskflowAPI.*` (preload bridge). All handlers return `{ ok: boolean, data?, error? }`.

---

## 5.1 DB schema — `src/main.ts` (VERBATIM, guarded migration ~L2778-2830)

```ts
// === Life phases (River of Years) ===
db.exec(`
  CREATE TABLE IF NOT EXISTS life_phases (
    id TEXT PRIMARY KEY,
    version INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'growth',
    start_month INTEGER NOT NULL DEFAULT 1,
    start_year INTEGER NOT NULL DEFAULT 2020,
    end_month INTEGER NOT NULL DEFAULT 12,
    end_year INTEGER NOT NULL DEFAULT 2020,
    magnitude INTEGER NOT NULL DEFAULT 3,
    color TEXT,
    reflection TEXT,
    era_trends TEXT,
    impact_notes TEXT,
    milestones TEXT,
    connections TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS life_timeline_meta (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const lifePhaseColumns = (db as any).prepare("PRAGMA table_info(life_phases)").all().map((c: any) => c.name);
if (!lifePhaseColumns.includes('version')) {
  db.exec('ALTER TABLE life_phases ADD COLUMN version INTEGER NOT NULL DEFAULT 1');
}
if (!lifePhaseColumns.includes('impact_notes')) {
  db.exec('ALTER TABLE life_phases ADD COLUMN impact_notes TEXT');
}
if (!lifePhaseColumns.includes('milestones')) {
  db.exec('ALTER TABLE life_phases ADD COLUMN milestones TEXT');
}
if (!lifePhaseColumns.includes('connections')) {
  db.exec('ALTER TABLE life_phases ADD COLUMN connections TEXT');
}

// Seed a starter phase once:
const phaseCount = (db as any).prepare('SELECT COUNT(*) as c FROM life_phases').get().c;
if (phaseCount === 0) {
  db.exec(`
    INSERT INTO life_phases (id, title, description, category, start_month, start_year, end_month, end_year, magnitude, color, created_at, updated_at)
    VALUES ('1_start_university', 'University', 'The leap into independence — first taste of freedom, deadlines, and self-discovery.',
            'growth', 8, 2019, 5, 2023, 4, NULL, datetime('now'), datetime('now'))
  `);
}
```

## 5.2 Row mapping + upsert (VERBATIM, ~L16630-16710)

```ts
function mapLifePhaseRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    category: row.category ?? 'growth',
    startMonth: row.start_month,
    startYear: row.start_year,
    endMonth: row.end_month,
    endYear: row.end_year,
    magnitude: row.magnitude ?? 3,
    color: row.color ?? undefined,
    reflection: row.reflection ?? '',
    eraTrends: safeJsonParse(row.era_trends, undefined),
    impactNotes: row.impact_notes ?? '',
    milestones: safeJsonParse(row.milestones, undefined),
    connections: safeJsonParse(row.connections, undefined),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function upsertLifePhase(db: any, p: any): boolean {
  if (!p?.id || !p?.title) return false;
  const existing = db.prepare('SELECT id FROM life_phases WHERE id = ?').get(p.id);
  const payload = {
    id: p.id,
    title: p.title,
    description: p.description ?? null,
    category: p.category ?? 'growth',
    start_month: p.startMonth ?? 1,
    start_year: p.startYear ?? new Date().getFullYear(),
    end_month: p.endMonth ?? 12,
    end_year: p.endYear ?? new Date().getFullYear(),
    magnitude: p.magnitude ?? 3,
    color: p.color ?? null,
    reflection: p.reflection ?? null,
    era_trends: p.eraTrends ? JSON.stringify(p.eraTrends) : null,
    impact_notes: p.impactNotes ?? null,
    milestones: p.milestones ? JSON.stringify(p.milestones) : null,
    connections: p.connections ? JSON.stringify(p.connections) : null,
    updated_at: new Date().toISOString(),
  };
  if (existing) {
    db.prepare(`UPDATE life_phases SET
        title=@title, description=@description, category=@category,
        start_month=@start_month, start_year=@start_year, end_month=@end_month, end_year=@end_year,
        magnitude=@magnitude, color=@color, reflection=@reflection, era_trends=@era_trends,
        impact_notes=@impact_notes, milestones=@milestones, connections=@connections, updated_at=@updated_at
      WHERE id=@id`).run(payload);
  } else {
    db.prepare(`INSERT INTO life_phases (id, title, description, category, start_month, start_year, end_month, end_year, magnitude, color, reflection, era_trends, impact_notes, milestones, connections, updated_at, created_at)
      VALUES (@id, @title, @description, @category, @start_month, @start_year, @end_month, @end_year, @magnitude, @color, @reflection, @era_trends, @impact_notes, @milestones, @connections, @updated_at, @updated_at)`).run(payload);
  }
  return true;
}
```

## 5.3 IPC handlers (VERBATIM, ~L16660-16860)

```ts
ipcMain.handle('lifePhase:get', () => {
  try {
    const rows = db.prepare('SELECT * FROM life_phases ORDER BY start_year, start_month').all();
    return { ok: true, data: rows.map(mapLifePhaseRow) };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
});

ipcMain.handle('lifePhase:getSummary', () => {
  try {
    const row = db.prepare("SELECT value, updated_at FROM life_timeline_meta WHERE key = 'journey_summary'").get();
    if (!row) return { ok: true, data: null };
    return { ok: true, data: { journeySummary: row.value, updatedAt: new Date(row.updated_at).getTime() } };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
});

ipcMain.handle('lifePhase:save', (_e, phase: any) => {
  try {
    if (!phase?.id || !phase?.title) return { ok: false, error: 'Phase needs id + title' };
    const ok = upsertLifePhase(db, phase);
    return ok ? { ok: true, data: { id: phase.id } } : { ok: false, error: 'Save failed' };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
});

ipcMain.handle('lifePhase:delete', (_e, id: string) => {
  try {
    db.prepare('DELETE FROM life_phases WHERE id = ?').run(id);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
});

ipcMain.handle('lifePhase:saveAll', (_e, phases: any[]) => {
  try {
    const tx = db.transaction((list: any[]) => {
      list.forEach(p => upsertLifePhase(db, p));
    });
    tx(Array.isArray(phases) ? phases : []);
    return { ok: true, data: { count: (phases ?? []).length } };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
});

ipcMain.handle('lifePhase:aiReflect', async (_e, phaseId: string) => {
  try {
    const row = db.prepare('SELECT * FROM life_phases WHERE id = ?').get(phaseId);
    if (!row) return { ok: false, error: 'Phase not found' };
    const phase = mapLifePhaseRow(row);
    const prompt = `Write a short, warm, personal reflection (2-4 sentences) about this life phase: ${phase.title} (${phase.startYear}-${phase.endYear}). Category: ${phase.category}. Context: ${phase.description || 'no description'}. Focus on growth and what mattered. Return plain text only.`;
    const text = await callLLM(prompt); // internal helper, may return a fallback string on failure
    const reflection = text?.trim() || 'A season that shaped who you are.';
    db.prepare('UPDATE life_phases SET reflection = ?, updated_at = datetime(\'now\') WHERE id = ?').run(reflection, phaseId);
    return { ok: true, data: { reflection } };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
});

ipcMain.handle('lifePhase:aiEraTrends', async (_e, phaseId: string) => {
  try {
    const row = db.prepare('SELECT * FROM life_phases WHERE id = ?').get(phaseId);
    if (!row) return { ok: false, error: 'Phase not found' };
    const phase = mapLifePhaseRow(row);
    const prompt = `List what was happening in the world, culture/media, and one field (tech, arts, science...) during ${phase.startYear}-${phase.endYear}. Return JSON like: {"world":"...","culture":"...","field":"..."} — short phrases, plain text.`;
    const text = await callLLM(prompt);
    let trends: any = {};
    try { trends = JSON.parse(text || '{}'); } catch { /* fallback */ }
    db.prepare('UPDATE life_phases SET era_trends = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(trends), phaseId);
    return { ok: true, data: { eraTrends: trends } };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
});

ipcMain.handle('lifePhase:aiSummarize', async (_e) => {
  try {
    const rows = db.prepare('SELECT * FROM life_phases ORDER BY start_year, start_month').all().map(mapLifePhaseRow);
    if (rows.length === 0) return { ok: true, data: { journeySummary: '', updatedAt: Date.now() } };
    const digest = rows.map(p => `${p.title} (${p.startYear}-${p.endYear}, ${p.category})${p.description ? ': ' + p.description : ''}`).join('\n');
    const prompt = `Write a warm, poetic 2-4 sentence "journey summary" of a life based on these phases:\n${digest}\nReturn plain text only.`;
    const text = await callLLM(prompt);
    const summary = text?.trim() || rows.map(p => p.title).join(' → ');
    db.prepare("INSERT INTO life_timeline_meta (key, value, updated_at) VALUES ('journey_summary', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").run(summary);
    return { ok: true, data: { journeySummary: summary, updatedAt: Date.now() } };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
});
```

## 5.4 Preload bridge — `src/preload.ts` (VERBATIM, ~L928-935)

```ts
lifePhaseGet: () => ipcRenderer.invoke('lifePhase:get'),
lifePhaseGetSummary: () => ipcRenderer.invoke('lifePhase:getSummary'),
lifePhaseSave: (phase: any) => ipcRenderer.invoke('lifePhase:save', phase),
lifePhaseDelete: (id: string) => ipcRenderer.invoke('lifePhase:delete', id),
lifePhaseSaveAll: (phases: any[]) => ipcRenderer.invoke('lifePhase:saveAll', phases),
lifePhaseAiReflect: (phaseId: string) => ipcRenderer.invoke('lifePhase:aiReflect', phaseId),
lifePhaseAiEraTrends: (phaseId: string) => ipcRenderer.invoke('lifePhase:aiEraTrends', phaseId),
lifePhaseAiSummarize: () => ipcRenderer.invoke('lifePhase:aiSummarize'),
```

## 5.5 Gold page host — `src/features/warmth/gold/GoldPage.tsx` (STRUCTURE, 1303 lines; full source on REQUEST)

```tsx
// Sections in render order (embedded mode):
// 1. GoldHeader         — title, date, streak badge (BorderBeam), quick stats
// 2. DayRing            — today's progress ring (AnimatedCircularProgressBar) + day ledger of daily goals
// 3. WeekBoard          — weekly-ish goals grid (isWeeklyish = isHabit || cadence==='weekly' || period==='weekly')
// 4. DeadlineRadar      — goals with deadlines, days-remaining countdown
// 5. TheVault           — long-term goal CRUD: header + button, add/edit form
//    (title/category/priority/deadline/description), two-step delete confirm (3s arm),
//    ProgressRing from ltg.progress (backend-computed from progress_seconds/target_seconds, capped 100)
// 6. BellBoard          — goal activity/reminders feed
// 7. ReflectionCard     — daily/weekly reflection prompt (WarmCard, serif italic)
// 8. WeekReview         — weekly review summary
// 9. GoalCard           — generic goal card (progress bar, streak, edit/complete)
// 10. <LifeRiver />     — EMBEDDED at the BOTTOM of GoldPage (L1300), full-width
```

```tsx
// Actual embedding (GoldPage.tsx ~L1298-1302):
import { LifeRiver } from '../../../components/life-river/river';
// ...
// inside the embedded branch:
<div className="space-y-4">
  {/* ...header, rings, boards... */}
  <LifeRiver />
</div>
```

> **IMPORTANT FOR THE REDESIGN:** LifeRiver currently sits at the bottom of the Gold tab. The redesign
> wants it promoted/interconnected — see PROMPT.md for the full user requirement.

## 5.6 Routing — `src/App.tsx` (VERBATIM excerpts)

```tsx
// L69 (imports, lazy):
const LifePage = lazy(() => import('./features/warmth/LifePage'));

// L83 (sidebar def):
{ path: '/life', label: 'Life', icon: HeartHandshake }

// L2895 (router):
<Route path="/life" element={<LifePage />} />
```

## 5.7 Known renderer facts

- `safeJsonParse` exists in main.ts (returns fallback on parse failure) — used for era_trends/milestones/connections columns.
- `callLLM` is an internal main-process helper (used by lifePhase:aiReflect/aiEraTrends/aiSummarize; falls back gracefully).
- `deskflow-data.db` lives at `%APPDATA%/DeskFlow/deskflow-data.db`.
- DB access rule: READ-ONLY for the Specialist — all writes happen through the app's own IPC when the user acts.
