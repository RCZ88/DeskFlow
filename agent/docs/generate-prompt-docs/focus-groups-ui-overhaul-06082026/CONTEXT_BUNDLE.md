# CONTEXT_BUNDLE.md — Focus Groups UI Overhaul (06082026)

> **Purpose:** Self-contained code context for the target AI. You have NO access to the
> DeskFlow codebase — everything you need is in this file. Read it fully before designing.
> All file paths are relative to the repo root (`C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker`).

---

## 1. What this task is about

The **Focus tab** inside the Activity page (`/activity?tab=focus`) is an icon tab that
lazy-loads `FocusSection.tsx` — a single embedded section, not a page. The user demands:

1. A **proper dedicated page/section** that shows Focus Groups as first-class content (not a button that opens a dialog).
2. The group editor's **app/site input must be a real picker connected to the tracked-apps data** (`get-known-apps` IPC → Settings data), NOT free-text tag entry.
3. A **complete visual redesign** of the entire Focus area (timer, groups, stats, history, insights).

---

## 2. Where the Focus UI lives today

| File | Role |
|------|------|
| `src/pages/ActivityPage.tsx` | Activity page with 4 tabs; `focus` tab lazily imports FocusSection |
| `src/features/focus/FocusSection.tsx` | The ENTIRE Focus tab content (composition root) |
| `src/features/focus/FocusTimer.tsx` | Session timer card (ring + presets + controls) |
| `src/features/focus/FocusGroupSelector.tsx` | Inline group list inside the timer card |
| `src/features/focus/FocusGroupEditor.tsx` | Create/edit group dialog (uses free-text `TagInput`) |
| `src/features/focus/FocusGroupProgress.tsx` | Per-group daily-goal cards |
| `src/features/focus/FocusStats.tsx` | Today stats + streak |
| `src/features/focus/FocusHistory.tsx` | Session history list |
| `src/features/focus/FocusInsights.tsx` | Weekly trend chart + best hour + avg length |
| `src/features/focus/FocusLeaderboard.tsx` | Ranked sessions |
| `src/features/focus/FocusDistractionLog.tsx` | Distraction feed |
| `src/features/focus/DragDurationBar.tsx` | Draggable duration slider |
| `src/features/focus/focusHelpers.ts` | Pure helpers (format, stats, streak, trend) |
| `src/features/focus/focusConfetti.ts` | Completion celebration |
| `src/hooks/useFocusGroups.ts` | Renderer hook + `FocusGroup`/`GroupDraft` types |
| `src/hooks/useFocusSession.ts` | Focus session state hook |
| `src/hooks/useActiveFocusGroup.ts` | Module-level active-group singleton |
| `src/hooks/useFocusGoals.ts` | Goal accrual via localStorage `focus-group-accrual` |
| `src/domains/focus/focusGroupManager.ts` | Backend CRUD for groups |
| `src/domains/focus/focusSchema.ts` | DB schema for focus tables |
| `src/main.ts` | IPC handlers (`focusGroup:*`, `get-known-apps`) |
| `src/preload.ts` | Bridge exposing `deskflowAPI.focusGroup` + `getKnownApps` |
| `src/pages/FocusPage.tsx` | **DEAD FILE — imported in App.tsx:41 but never routed** (do not touch unless repurposing) |

**Important:** There is a `FocusPage.tsx` imported at `src/App.tsx:41` that is NEVER
rendered (no `<FocusPage />`, no `/focus` route). It contains goal CRUD leftovers.
If a dedicated page is desired, it can either be built fresh or repurpose this file —
flag the decision in the design.

---

## 3. ActivityPage tab registration (verbatim)

### `src/pages/ActivityPage.tsx` (lines 1-65, 165-193)

```tsx
import { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Globe, Target, Activity, Focus as FocusIcon } from 'lucide-react';
import { LoadingState } from '../components/LoadingState';
import type { Period } from '../lib/dateRange';

const StatsPage = lazy(() => import('./StatsPage'));
const BrowserActivityPage = lazy(() => import('./BrowserActivityPage'));
const ProductivityPage = lazy(() => import('./ProductivityPage'));
const FocusTab = lazy(() => import('../features/focus/FocusSection').then(m => ({ default: m.FocusSection })));
```

```tsx
const TABS = [
  { key: 'apps', label: 'Applications', icon: Monitor, accent: '#6366f1' },
  { key: 'websites', label: 'Websites', icon: Globe, accent: '#3b82f6' },
  { key: 'productivity', label: 'Productivity', icon: Target, accent: '#10b981' },
  { key: 'focus', label: 'Focus', icon: FocusIcon, accent: '#ec4899' },
] as const;
```

Tab state initializer reads `?tab=` from the URL; active tab is written back to the URL.
Focus tab render block (lines 175-186):

```tsx
{activeTab === 'focus' && (
  <motion.div
    key="focus"
    initial={crossfadeInitial}
    animate={crossfadeAnimate}
    exit={crossfadeExit}
    transition={crossfadeTransition}
    className="p-5"
  >
    <FocusTab />
  </motion.div>
)}
```

---

## 4. FocusSection.tsx — the entire Focus tab (verbatim, full file)

`src/features/focus/FocusSection.tsx` (218 lines):

```tsx
import { useEffect, useRef, useState } from 'react';
import { Focus as FocusIcon, Target, Clock, TrendingUp, Flame } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { LoadingState } from '../../components/LoadingState';
import { useFocusSession } from '../../hooks/useFocusSession';
import { useFocusGroups, type FocusGroup, type GroupDraft } from '../../hooks/useFocusGroups';
import { setActiveGroup } from '../../hooks/useActiveFocusGroup';
import { useToasts } from '../../hooks/useToasts';
import { FocusTimer } from './FocusTimer';
import { FocusStats } from './FocusStats';
import { FocusGroupProgress } from './FocusGroupProgress';
import { FocusHistory } from './FocusHistory';
import { FocusInsights } from './FocusInsights';
import { FocusLeaderboard } from './FocusLeaderboard';
import { FocusDistractionLog } from './FocusDistractionLog';
import { FocusGroupEditor } from './FocusGroupEditor';
import { computeTodayStats, computeStreak, type FocusHistoryRow } from './focusHelpers';

type FocusMode = 'timer' | 'stopwatch';

interface PendingGroupSession {
  groupId: number;
  sessionId: number;
  plannedSec: number;
}

export function FocusSection() {
  const { state, history, start, stop, startWithGroup } = useFocusSession();
  const { groups, save, remove, selectedId, setSelectedId } = useFocusGroups();
  const { toasts, showToast, removeToast } = useToasts();
  const [mins, setMins] = useState(25);
  const [strict, setStrict] = useState<'distracting' | 'non_allowed'>('distracting');
  const [justCompleted, setJustCompleted] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const [mode, setMode] = useState<FocusMode>('timer');
  const [distractions, setDistractions] = useState<Array<{ name: string; type: 'app' | 'website'; timestamp: number }>>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FocusGroup | null>(null);
  const pendingGroupRef = useRef<PendingGroupSession | null>(null);

  useEffect(() => {
    const hasApi = !!(window as any).deskflowAPI?.focus;
    setApiMissing(!hasApi);
  }, []);

  useEffect(() => {
    if (state?.active && distractions.length > 0) {
      const latest = distractions[distractions.length - 1];
      console.log('[Focus] Distraction detected:', latest);
    }
  }, [distractions, state?.active]);

  const rows = history as unknown as FocusHistoryRow[];
  const todayStats = computeTodayStats(rows);
  const streak = computeStreak(rows);

  const handleStart = () => start(mins * 60, strict);
  const handleStop = () => stop();

  const handleStartWithGroup = (groupId: number, durationSec: number, strictness: 'distracting' | 'non_allowed') => {
    startWithGroup(groupId, durationSec, strictness).then(res => {
      if (res?.success === false) {
        console.error('[Focus] startWithGroup failed:', res.error);
      } else if (res?.sessionId != null) {
        pendingGroupRef.current = { groupId, sessionId: Number(res.sessionId), plannedSec: durationSec };
        const group = groups.find(g => g.id === groupId);
        setActiveGroup({
          sessionId: Number(res.sessionId),
          groupId,
          allowedCategories: (group?.allowed_categories ?? []).map((c: string) => String(c)),
          startedAt: Date.now(),
        });
      }
    });
  };

  const onGroupSessionEnded = async (pending: PendingGroupSession) => {
    try {
      const group = groups.find(g => g.id === pending.groupId);
      if (!group) return;
      const api = (window as any).deskflowAPI;
      const allowed = (group.allowed_categories || []).map((c: string) => String(c).toLowerCase());
      const goalIds: string[] = [];
      let goalTitle = '';
      let bestPct = 0;
      try {
        const today = new Date().toISOString().slice(0, 10);
        const fetched = await api?.getGoals?.(today);
        const goals = fetched?.goals || (Array.isArray(fetched) ? fetched : []);
        for (const g of goals) {
          if (g?.target?.type !== 'time' || !g?.target?.matchCategory) continue;
          if (allowed.length > 0 && !allowed.includes(String(g.target.matchCategory).toLowerCase())) continue;
          goalIds.push(String(g.id));
          const target = Number(g.target?.targetSeconds) || 0;
          const pct = target > 0 ? Math.min(100, Math.round(((Number(g.progressSeconds) || 0) / target) * 100)) : 0;
          if (pct > bestPct) { bestPct = pct; goalTitle = g.title || ''; }
        }
      } catch {
        /* goal fetch is best-effort */
      }
      try {
        if (api?.focusGroup?.linkUsage) {
          await api.focusGroup.linkUsage({ sessionId: pending.sessionId, groupId: pending.groupId, goalIds });
        }
      } catch (e) {
        console.error('[Focus] linkUsage failed:', e);
      }
      const minsDone = Math.max(1, Math.round(pending.plannedSec / 60));
      showToast(
        goalTitle
          ? `${group.name} · ${minsDone} min · ${bestPct}% of '${goalTitle}' goal`
          : `${group.name} · ${minsDone} min · no matching goal`,
        'success',
      );
    } catch (e) {
      console.error('[Focus] Failed to summarize group session:', e);
    }
  };

  const handleSaveGroup = async (draft: GroupDraft): Promise<boolean> => {
    const id = await save(draft);
    return id != null;
  };

  const handleDeleteGroup = async (group: FocusGroup) => {
    const ok = await remove(group.id);
    if (ok && selectedId === group.id) setSelectedId(null);
  };

  useEffect(() => {
    if (!state) return;
    if (!state.active && history[0]?.outcome === 'completed') {
      setJustCompleted(true);
      const t = setTimeout(() => setJustCompleted(false), 4000);
      const pending = pendingGroupRef.current;
      if (pending) {
        pendingGroupRef.current = null;
        void onGroupSessionEnded(pending);
      }
      return () => clearTimeout(t);
    }
  }, [state, history]);

  if (apiMissing) {
    return (
      <div>
        <SectionHeader title="Deep Focus" icon={<FocusIcon className="w-4 h-4" />} />
        <LoadingState variant="skeleton" className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Deep Focus" icon={<FocusIcon className="w-5 h-5" />} />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <FocusTimer
            state={state}
            mins={mins}
            onMinsChange={setMins}
            strict={strict}
            onStrictChange={setStrict}
            onStart={handleStart}
            onStop={handleStop}
            justCompleted={justCompleted}
            mode={mode}
            onModeChange={setMode}
            groups={groups}
            selectedGroupId={selectedId}
            onGroupSelect={setSelectedId}
            onGroupCreate={() => { setEditingGroup(null); setEditorOpen(true); }}
            onGroupEdit={g => { setEditingGroup(g); setEditorOpen(true); }}
            onGroupDelete={handleDeleteGroup}
            onStartWithGroup={handleStartWithGroup}
            onDurationDrag={sec => setMins(Math.round(sec / 60))}
          />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <FocusGroupProgress groups={groups} selectedId={selectedId} history={rows} />
          <FocusStats stats={todayStats} streak={streak} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FocusLeaderboard history={rows} />
            <FocusDistractionLog distractions={distractions} isActive={!!state?.active} />
          </div>
          <FocusHistory history={rows} onStartFirstSession={handleStart} />
          <FocusInsights history={rows} />
        </div>
      </div>
      <FocusGroupEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        group={editingGroup}
        onSave={handleSaveGroup}
      />
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-2 max-w-sm">
          {toasts.map(t => (
            <button
              key={t.id}
              onClick={() => removeToast(t.id)}
              className={`flex items-start gap-2.5 text-left px-4 py-3 rounded-xl bg-[rgba(24,24,27,0.95)] backdrop-blur-xl border shadow-2xl transition-opacity hover:opacity-90 ${
                t.type === 'success'
                  ? 'border-emerald-500/40'
                  : t.type === 'error'
                    ? 'border-rose-500/40'
                    : 'border-zinc-800/60'
              }`}
            >
              <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${t.type === 'success' ? 'bg-emerald-400' : t.type === 'error' ? 'bg-rose-400' : 'bg-zinc-400'}`} />
              <span className="text-sm text-zinc-100">{t.message}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 5. FocusGroupEditor.tsx — the dialog the user hates (verbatim, full file)

`src/features/focus/FocusGroupEditor.tsx` (310 lines). **The `TagInput` component (lines 17-83) is the free-text input the user explicitly complained about** — it must be replaced with a picker connected to real tracked apps (`getKnownApps()`).

```tsx
import { useEffect, useRef, useState } from 'react';
import { Layers, AppWindow, Globe, Tag, Eye, EyeOff, Save, Target, Clock, Activity } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import type { GroupDraft, FocusGroup } from '../../hooks/useFocusGroups';

const PRESET_DURATIONS = [5, 10, 15, 25, 50, 90];

interface TagInputProps {
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
}

function TagInput({ label, icon, placeholder, values, onChange }: TagInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addValue = (raw: string) => {
    const v = raw.trim().replace(/,$/, '');
    if (!v) return;
    if (!values.some(x => x.toLowerCase() === v.toLowerCase())) {
      onChange([...values, v]);
    }
    setText('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addValue(text);
    } else if (e.key === 'Backspace' && !text && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1 mb-1.5">
        {icon}
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-zinc-800/40 border border-zinc-800/50 min-h-[38px] focus-within:border-pink-500/40">
        {values.map(v => (
          <span
            key={v}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-500/15 text-pink-300 text-[11px]"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter(x => x !== v))}
              className="text-pink-300/60 hover:text-pink-200"
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => text && addValue(text)}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-[12px] text-zinc-200 placeholder:text-zinc-600"
        />
      </div>
      <p className="text-[9px] text-zinc-600 mt-1">Press Enter or comma to add. Exact match — use lowercase names.</p>
    </div>
  );
}
```

Editor body (lines 92-310) — state + save + JSX:

```tsx
export function FocusGroupEditor({ open, onOpenChange, group, onSave }: FocusGroupEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [apps, setApps] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [strict, setStrict] = useState<'distracting' | 'non_allowed'>('distracting');
  const [durationMin, setDurationMin] = useState<number | null>(25);
  const [dailyGoalMin, setDailyGoalMin] = useState<number | null>(null);
  const [goalCategory, setGoalCategory] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(group?.name ?? '');
    setDescription(group?.description ?? '');
    setApps(group?.allowed_apps ?? []);
    setDomains(group?.allowed_domains ?? []);
    setCategories(group?.allowed_categories ?? []);
    setStrict(group?.strictness ?? 'distracting');
    setDurationMin(group?.default_duration != null ? Math.round(group.default_duration / 60) : 25);
    setDailyGoalMin(group?.daily_goal_sec != null ? Math.round(group.daily_goal_sec / 60) : null);
    setGoalCategory(group?.goal_category ?? '');
    setErr(null);
  }, [open, group]);

  const handleSave = async () => {
    if (!name.trim()) {
      setErr('Give the group a name first.');
      return;
    }
    setSaving(true);
    const ok = await onSave({
      id: group?.id,
      name: name.trim(),
      description: description.trim() || null,
      allowed_apps: apps,
      allowed_domains: domains,
      allowed_categories: categories,
      strictness: strict,
      default_duration: durationMin != null ? durationMin * 60 : null,
      daily_goal_sec: dailyGoalMin != null ? dailyGoalMin * 60 : null,
      goal_category: goalCategory || null,
    });
    setSaving(false);
    if (ok) onOpenChange(false);
    else setErr('Could not save group. Check the console for details.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-pink-400" />
            {group ? 'Edit focus group' : 'New focus group'}
          </DialogTitle>
          <DialogDescription>
            A named set of apps, sites and categories that define what a focus session is allowed to use.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 block">Name</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Development"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-800/50 outline-none text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-pink-500/40"
            />
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 block">Description</span>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional — what is this group for?"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-800/50 outline-none text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-pink-500/40"
            />
          </div>

          <TagInput
            label="Allowed apps"
            icon={<AppWindow className="w-3 h-3" />}
            placeholder="vscode, capcut…"
            values={apps}
            onChange={setApps}
          />

          <TagInput
            label="Allowed sites"
            icon={<Globe className="w-3 h-3" />}
            placeholder="github.com, notion.so…"
            values={domains}
            onChange={setDomains}
          />

          <TagInput
            label="Allowed categories"
            icon={<Tag className="w-3 h-3" />}
            placeholder="IDE, AI Tools…"
            values={categories}
            onChange={setCategories}
          />

          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1">
              {strict === 'non_allowed' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              Strictness
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setStrict('distracting')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                  strict === 'distracting'
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                    : 'bg-zinc-800/60 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800'
                }`}
              >
                Blocks distracting
              </button>
              <button
                type="button"
                onClick={() => setStrict('non_allowed')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                  strict === 'non_allowed'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-zinc-800/60 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800'
                }`}
              >
                Strict (only allowed)
              </button>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 block">Default duration</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_DURATIONS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDurationMin(m)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                    durationMin === m
                      ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                      : 'bg-zinc-800/60 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 block">Daily goal (minutes)</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={5}
                value={dailyGoalMin ?? ''}
                onChange={e => {
                  const v = e.target.value;
                  setDailyGoalMin(v === '' ? null : Math.max(0, Number(v)));
                }}
                placeholder="0 = no goal"
                className="w-24 px-3 py-1.5 rounded-lg bg-zinc-800/40 border border-zinc-800/50 outline-none text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-pink-500/40"
              />
              <span className="text-[11px] text-zinc-500">min/day target</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Goal category
            </span>
            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {categories.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setGoalCategory(goalCategory === c ? '' : c)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                      goalCategory === c
                        ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                        : 'bg-zinc-800/60 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-zinc-600">Add allowed categories above to set a goal category.</p>
            )}
          </div>

          {err && <p className="text-[11px] text-rose-400">{err}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : group ? 'Save changes' : 'Create group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 6. FocusTimer.tsx (verbatim, full file)

`src/features/focus/FocusTimer.tsx` (280 lines) — the session control card. Uses `AnimatedCircularProgressBar`, `Particles`, `NumberTicker`, `GlassCard`, `DragDurationBar`, `FocusGroupSelector` (embedded inline list).

```tsx
import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Target, Eye, EyeOff, Focus as FocusIcon, Timer, Clock } from 'lucide-react';
import { AnimatedCircularProgressBar } from '../../components/ui/animated-circular-progress-bar';
import { Particles } from '../../components/ui/particles';
import { NumberTicker } from '../../components/ui/number-ticker';
import { GlassCard } from '../../components/GlassCard';
import { Badge } from '../../components/ui/badge';
import type { FocusPublicState } from '../../hooks/useFocusSession';
import type { FocusGroup } from '../../hooks/useFocusGroups';
import { FocusGroupSelector } from './FocusGroupSelector';
import { DragDurationBar } from './DragDurationBar';
import { fmtClock } from './focusHelpers';

const PRESETS = [
  { label: '5m', sec: 5 * 60 },
  { label: '10m', sec: 10 * 60 },
  { label: '15m', sec: 15 * 60 },
  { label: '25m', sec: 25 * 60 },
  { label: '50m', sec: 50 * 60 },
  { label: '90m', sec: 90 * 60 },
];

type FocusMode = 'timer' | 'stopwatch';

interface FocusTimerProps {
  state: FocusPublicState | null | undefined;
  mins: number;
  onMinsChange: (mins: number) => void;
  strict: 'distracting' | 'non_allowed';
  onStrictChange: (s: 'distracting' | 'non_allowed') => void;
  onStart: () => void;
  onStop: () => void;
  justCompleted: boolean;
  mode?: FocusMode;
  onModeChange?: (mode: FocusMode) => void;
  stopwatchElapsed?: number;
  groups?: FocusGroup[];
  selectedGroupId?: number | null;
  onGroupSelect?: (id: number | null) => void;
  onGroupCreate?: () => void;
  onGroupEdit?: (g: FocusGroup) => void;
  onGroupDelete?: (g: FocusGroup) => void;
  onStartWithGroup?: (groupId: number, durationSec: number, strictness: 'distracting' | 'non_allowed') => void;
  onDurationDrag?: (sec: number) => void;
}

const tapScale = { scale: 0.95 };
const crossfade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
};

export function FocusTimer({ state, mins, onMinsChange, strict, onStrictChange, onStart, onStop, justCompleted, mode = 'timer', onModeChange, stopwatchElapsed = 0, groups = [], selectedGroupId = null, onGroupSelect, onGroupCreate, onGroupEdit, onGroupDelete, onStartWithGroup, onDurationDrag }: FocusTimerProps) {
  const active = !!state?.active;
  const plannedSec = mins * 60;

  // Client-side countdown for smooth timer display between server pushes
  const [localRemaining, setLocalRemaining] = useState(state?.remainingSec ?? 0);
  const lastServerUpdateRef = useRef<number>(Date.now());

  // Sync from server state when it arrives
  useEffect(() => {
    if (state?.active && typeof state.remainingSec === 'number') {
      setLocalRemaining(state.remainingSec);
      lastServerUpdateRef.current = Date.now();
    } else if (!state?.active) {
      setLocalRemaining(plannedSec);
    }
  }, [state?.active, state?.remainingSec, state?.endsAt, plannedSec]);

  // Tick down every second when active (timer mode only)
  useEffect(() => {
    if (!active || mode === 'stopwatch') return;
    const interval = setInterval(() => {
      setLocalRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [active, mode]);

  const remainingSec = active ? localRemaining : plannedSec;
  const progressPct = active ? Math.max(0, Math.min(100, (remainingSec / plannedSec) * 100)) : 0;

  const statusLabel = active ? 'Active' : justCompleted ? 'Completed' : 'Idle';
  const statusVariant = active ? 'default' : justCompleted ? 'default' : 'secondary';

  const ringPrimary = active ? '#ec4899' : justCompleted ? '#34d399' : 'rgba(236,72,153,0.35)';

  const clockFormatter = useMemo(() => (v: number) => fmtClock(v), []);

  const [stopwatchSec, setStopwatchSec] = useState(0);
  
  useEffect(() => {
    if (active && mode === 'stopwatch') {
      const interval = setInterval(() => {
        setStopwatchSec(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (!active) {
      setStopwatchSec(0);
    }
  }, [active, mode]);

  return (
    <GlassCard accent="pink" className="relative overflow-hidden h-full">
      {active && <Particles className="opacity-60" quantity={22} color="#ec4899" opacity={0.18} />}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <FocusIcon className="w-4 h-4 text-pink-400" />
            Session control
          </h3>
          <Badge variant={statusVariant as 'default' | 'secondary'}>{statusLabel}</Badge>
        </div>

        <AnimatedCircularProgressBar
          value={active ? (mode === 'stopwatch' ? Math.min(100, (stopwatchSec / 3600) * 100) : progressPct) : 100}
          size={168}
          strokeWidth={10}
          gaugePrimaryColor={ringPrimary}
          gaugeSecondaryColor="rgba(255,255,255,0.06)"
          linear={active}
          linearDurationMs={1000}
        >
          <div className="flex flex-col items-center">
            <NumberTicker
              value={mode === 'stopwatch' ? stopwatchSec : remainingSec}
              duration={active ? 600 : 200}
              formatter={clockFormatter}
              className="text-6xl font-bold tabular-nums font-mono text-white"
            />
            <span className="text-[11px] text-zinc-400 uppercase tracking-wider mt-2">
              {active ? (mode === 'stopwatch' ? 'elapsed' : 'remaining') : `${mins} min session`}
            </span>
          </div>
        </AnimatedCircularProgressBar>

        <AnimatePresence mode="wait">
          {active ? (
            <motion.div
              key="active-controls"
              initial={crossfade.initial}
              animate={crossfade.animate}
              exit={crossfade.exit}
              transition={crossfade.transition}
              className="w-full"
            >
              <p className="text-center text-[11px] text-zinc-500 mb-3">
                {state!.strictness === 'non_allowed' ? 'Strict mode -- only productive apps allowed' : 'Blocking distracting apps and sites'}
              </p>
              <motion.button
                whileTap={tapScale}
                onClick={onStop}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-colors text-sm font-semibold"
              >
                <Square className="w-4 h-4" />
                End session
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="idle-controls"
              initial={crossfade.initial}
              animate={crossfade.animate}
              exit={crossfade.exit}
              transition={crossfade.transition}
              className="w-full"
            >
              <div className="w-full">
                {onGroupSelect && onGroupCreate && (
                  <FocusGroupSelector
                    groups={groups}
                    selectedId={selectedGroupId}
                    onSelect={onGroupSelect}
                    onCreate={onGroupCreate}
                    onEdit={onGroupEdit ?? (() => {})}
                    onDelete={onGroupDelete ?? (() => {})}
                  />
                )}
              </div>

              <div className="flex gap-2 mb-3">
                <motion.button
                  whileTap={tapScale}
                  onClick={() => onModeChange?.('timer')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
                    mode === 'timer'
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                      : 'bg-zinc-800/60 text-zinc-400 border border-zinc-800/40 hover:bg-zinc-800'
                  }`}
                >
                  <Timer className="w-3 h-3" />
                  Timer
                </motion.button>
                <motion.button
                  whileTap={tapScale}
                  onClick={() => onModeChange?.('stopwatch')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
                    mode === 'stopwatch'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-zinc-800/60 text-zinc-400 border border-zinc-800/40 hover:bg-zinc-800'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Challenge
                </motion.button>
              </div>

              {mode === 'timer' && (
                <>
                  {onDurationDrag && (
                    <DragDurationBar valueSec={mins * 60} onChange={onDurationDrag} />
                  )}
                  <div className="grid grid-cols-6 gap-2 mb-3">
                  {PRESETS.map(p => (
                    <motion.button
                      key={p.sec}
                      whileTap={tapScale}
                      onClick={() => onMinsChange(p.sec / 60)}
                      className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
                        mins === p.sec / 60
                          ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                          : 'bg-zinc-800/60 text-zinc-400 border border-zinc-800/40 hover:bg-zinc-800'
                      }`}
                    >
                      <Target className="w-3 h-3 opacity-70" />
                      {p.label}
                    </motion.button>
                  ))}
                  </div>
                </>
              )}

              <button
                onClick={() => onStrictChange(strict === 'non_allowed' ? 'distracting' : 'non_allowed')}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-800/40 mb-3 text-left"
              >
                <span className="flex items-center gap-2 text-[12px] text-zinc-300">
                  {strict === 'non_allowed' ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-500" />}
                  Strict mode
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${strict === 'non_allowed' ? 'bg-amber-500/15 text-amber-300' : 'bg-zinc-800 text-zinc-500'}`}>
                  {strict === 'non_allowed' ? 'Blocks distracting + neutral' : 'Blocks distracting only'}
                </span>
              </button>
              {strict === 'non_allowed' && (
                <p className="text-[10px] text-amber-400/60 leading-relaxed text-center mb-3 px-2">
                  Only productive apps allowed. Non-productive apps and sites will trigger a focus reminder overlay.
                  Requires tracking set to "Track as Normal" in Settings for full enforcement.
                </p>
              )}

              <motion.button
                whileTap={tapScale}
                onClick={() => {
                  if (mode !== 'stopwatch' && selectedGroupId != null && onStartWithGroup) onStartWithGroup(selectedGroupId, mins * 60, strict);
                  else onStart();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors"
              >
                <Play className="w-4 h-4" />
                {mode === 'stopwatch'
                  ? 'Start challenge'
                  : selectedGroupId != null
                    ? `Start ${groups.find(g => g.id === selectedGroupId)?.name ?? 'group'} focus`
                    : `Start ${mins}-min focus`}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-zinc-600 leading-relaxed text-center">
          Soft-block overlay -- not enforcement. Your choice is always logged.
        </p>
      </div>
    </GlassCard>
  );
}
```

---

## 7. FocusGroupSelector.tsx (verbatim, full file)

`src/features/focus/FocusGroupSelector.tsx` (115 lines) — inline list inside the timer card:

```tsx
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layers, Plus, Pencil, Trash2, Target, Clock } from 'lucide-react';
import type { FocusGroup } from '../../hooks/useFocusGroups';
import { fmtDuration } from './focusHelpers';

const tapScale = { scale: 0.95 };

interface FocusGroupSelectorProps {
  groups: FocusGroup[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onCreate: () => void;
  onEdit: (group: FocusGroup) => void;
  onDelete: (group: FocusGroup) => void;
}

export function FocusGroupSelector({ groups, selectedId, onSelect, onCreate, onEdit, onDelete }: FocusGroupSelectorProps) {
  const selected = useMemo(() => groups.find(g => g.id === selectedId) ?? null, [groups, selectedId]);

  if (groups.length === 0) {
    return (
      <div className="mb-4">
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-zinc-700/70 text-zinc-400 hover:text-pink-300 hover:border-pink-500/40 hover:bg-pink-500/5 transition-colors text-[12px] font-semibold"
        >
          <Plus className="w-4 h-4" />
          Create a focus group
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Focus groups
        </span>
        <button
          onClick={onCreate}
          className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {groups.map(g => {
          const active = g.id === selectedId;
          const goalSec = g.daily_goal_sec;
          return (
            <motion.button
              key={g.id}
              whileTap={tapScale}
              onClick={() => onSelect(active ? null : g.id)}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all border ${
                active
                  ? 'bg-pink-500/15 text-pink-200 border-pink-500/30 shadow-lg shadow-pink-500/10'
                  : 'bg-zinc-900/60 text-zinc-300 border-zinc-800/50 hover:bg-zinc-900 hover:border-zinc-700/50'
              }`}
              title={g.description ?? undefined}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-pink-400 animate-pulse' : 'bg-zinc-600'}`} />
                  <span className="text-[12px] font-semibold truncate">{g.name}</span>
                  {goalSec && (
                    <span className="text-[9px] text-zinc-500 flex items-center gap-0.5">
                      <Target className="w-2.5 h-2.5" />
                      {fmtDuration(goalSec)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 truncate">
                  {g.allowed_apps.length > 0 ? `${g.allowed_apps.length} apps · ` : ''}
                  {g.allowed_domains.length > 0 ? `${g.allowed_domains.length} sites · ` : ''}
                  {g.allowed_categories.length > 0 ? `${g.allowed_categories.length} categories` : 'All productive'}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); onEdit(g); }}
                  className="p-1.5 rounded-md text-zinc-500 hover:text-pink-300 hover:bg-zinc-800 transition-colors"
                  title="Edit group"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(g); }}
                  className="p-1.5 rounded-md text-zinc-500 hover:text-rose-300 hover:bg-zinc-800 transition-colors"
                  title="Delete group"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.button>
          );
        })}
      </div>
      {selected && (
        <div className="mt-3 px-4 py-3 rounded-xl bg-zinc-900/40 border border-zinc-800/40">
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {selected.description || 'No description set.'}
            {selected.default_duration != null && (
              <span className="text-pink-400/70 ml-2">Default: {Math.round(selected.default_duration / 60)}m</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## 8. FocusGroupProgress.tsx (verbatim, full file)

`src/features/focus/FocusGroupProgress.tsx` (104 lines):

```tsx
import { useMemo } from 'react';
import { Target, Clock, Zap } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Badge } from '../../components/ui/badge';
import type { FocusGroup } from '../../hooks/useFocusGroups';
import { fmtDuration } from './focusHelpers';

interface FocusGroupProgressProps {
  groups: FocusGroup[];
  selectedId: number | null;
}

function GroupProgressCard({ group }: { group: FocusGroup }) {
  const goalSec = group.daily_goal_sec;

  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 hover:border-zinc-700/60 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
          <span className="text-[13px] font-semibold text-zinc-200">{group.name}</span>
        </div>
        {group.goal_category && (
          <Badge variant="secondary" className="text-[10px]">{group.goal_category}</Badge>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-3.5 h-3.5 text-zinc-500" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Default duration</p>
          <p className="text-sm font-bold tabular-nums font-mono text-white">
            {group.default_duration != null ? fmtDuration(group.default_duration) : 'Not set'}
          </p>
        </div>
      </div>

      {goalSec && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
              <Target className="w-3 h-3" />
              Daily goal
            </span>
            <span className="text-[11px] font-mono tabular-nums text-pink-300">
              {fmtDuration(goalSec)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-600">
            Progress tracking will appear here once group sessions are attributed to groups in the history.
          </p>
        </div>
      )}

      {!goalSec && (
        <p className="text-[10px] text-zinc-600 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          No daily goal set — set one in the group editor
        </p>
      )}
    </div>
  );
}

export function FocusGroupProgress({ groups, selectedId }: FocusGroupProgressProps) {
  const selected = useMemo(() => groups.find(g => g.id === selectedId) ?? null, [groups, selectedId]);

  if (groups.length === 0) return null;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <Target className="w-4 h-4 text-pink-400" />
          Focus groups
        </h3>
        <span className="text-[10px] text-zinc-500">{groups.length} group{groups.length !== 1 ? 's' : ''}</span>
      </div>

      {selected && (
        <div className="mb-3 p-3 rounded-lg bg-pink-500/5 border border-pink-500/20">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-pink-300">Active: {selected.name}</span>
          </div>
          <p className="text-[10px] text-zinc-500">
            {selected.allowed_categories.length > 0
              ? `${selected.allowed_categories.length} categories tracked`
              : 'All productive categories'}
            {selected.daily_goal_sec
              ? ` · Goal: ${fmtDuration(selected.daily_goal_sec)}/day`
              : ''}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {groups.map(g => (
          <GroupProgressCard key={g.id} group={g} />
        ))}
      </div>
    </GlassCard>
  );
}
```

**NOTE:** The `history` prop is accepted but UNUSED (line 65) — daily-goal progress is NOT actually computed from session history today. The progress card shows a placeholder line: "Progress tracking will appear here once group sessions are attributed to groups in the history." This is a real product gap the redesign must solve.

---

## 9. focusHelpers.ts (verbatim, full file)

`src/features/focus/focusHelpers.ts` (119 lines) — pure helpers:

```ts
export interface FocusHistoryRow {
  id: number;
  started_at: string;
  ended_at?: string | null;
  planned_sec: number;
  actual_sec?: number | null;
  outcome: 'active' | 'completed' | 'failed' | 'aborted';
  strictness: 'distracting' | 'non_allowed';
  broke_on_type?: string | null;
  broke_on_name?: string | null;
  return_count?: number;
}

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${rem}s`;
  return `${rem}s`;
}

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

export function todaysSessions(history: FocusHistoryRow[]): FocusHistoryRow[] {
  const today = new Date().toDateString();
  return history.filter(h => dayKey(h.started_at) === today);
}

export interface TodayStats {
  focusSec: number;
  sessionCount: number;
  completedCount: number;
  completionRate: number;
}

export function computeTodayStats(history: FocusHistoryRow[]): TodayStats {
  const today = todaysSessions(history);
  const completed = today.filter(h => h.outcome === 'completed');
  const focusSec = completed.reduce((sum, h) => sum + (h.actual_sec || 0), 0);
  const completionRate = today.length > 0 ? Math.round((completed.length / today.length) * 100) : 0;
  return { focusSec, sessionCount: today.length, completedCount: completed.length, completionRate };
}

export function computeStreak(history: FocusHistoryRow[]): number {
  const completedDays = new Set(
    history.filter(h => h.outcome === 'completed').map(h => dayKey(h.started_at)),
  );
  if (completedDays.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  if (!completedDays.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (let guard = 0; guard < 3650; guard++) {
    if (completedDays.has(cursor.toDateString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export interface DayTrendPoint {
  label: string;
  date: string;
  focusSec: number;
}

export function computeWeeklyTrend(history: FocusHistoryRow[]): DayTrendPoint[] {
  const days: DayTrendPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const focusSec = history
      .filter(h => h.outcome === 'completed' && dayKey(h.started_at) === key)
      .reduce((sum, h) => sum + (h.actual_sec || 0), 0);
    days.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), date: key, focusSec });
  }
  return days;
}

export function computeBestHour(history: FocusHistoryRow[]): { hour: number; label: string } | null {
  const completed = history.filter(h => h.outcome === 'completed');
  if (completed.length === 0) return null;
  const byHour = new Map<number, number>();
  for (const h of completed) {
    const hour = new Date(h.started_at).getHours();
    byHour.set(hour, (byHour.get(hour) || 0) + (h.actual_sec || 0));
  }
  let bestHour = 0;
  let bestSec = -1;
  for (const [hour, sec] of byHour) {
    if (sec > bestSec) { bestSec = sec; bestHour = hour; }
  }
  const suffix = bestHour >= 12 ? 'PM' : 'AM';
  const hour12 = bestHour === 0 ? 12 : bestHour > 12 ? bestHour - 12 : bestHour;
  return { hour: bestHour, label: `${hour12}:00 ${suffix}` };
}

export function computeAvgSessionLength(history: FocusHistoryRow[]): number {
  const completed = history.filter(h => h.outcome === 'completed' && h.actual_sec);
  if (completed.length === 0) return 0;
  return completed.reduce((sum, h) => sum + (h.actual_sec || 0), 0) / completed.length;
}
```

---

## 10. Renderer types + hook: useFocusGroups.ts (verbatim, full file)

`src/hooks/useFocusGroups.ts` (135 lines):

```ts
import { useCallback, useEffect, useState } from 'react';

export interface FocusGroup {
  id: number;
  name: string;
  description: string | null;
  allowed_apps: string[];
  allowed_domains: string[];
  allowed_categories: string[];
  strictness: 'distracting' | 'non_allowed';
  default_duration: number | null;
  daily_goal_sec: number | null;
  goal_category: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupDraft {
  id?: number;
  name: string;
  description?: string | null;
  allowed_apps?: string[];
  allowed_domains?: string[];
  allowed_categories?: string[];
  strictness?: 'distracting' | 'non_allowed';
  default_duration?: number | null;
  daily_goal_sec?: number | null;
  goal_category?: string | null;
}

function getApi() {
  return (window as any).deskflowAPI?.focusGroup as any;
}

// Shared module-level selection — survives component remounts and is visible
// to every consumer (FocusSection, DailyPlannerCard, ...) at once.
let sharedSelectedId: number | null = null;
const selectionListeners = new Set<() => void>();

function setSharedSelectedId(id: number | null) {
  sharedSelectedId = id;
  selectionListeners.forEach(l => l());
}

export function useFocusGroups() {
  const [groups, setGroups] = useState<FocusGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedIdState] = useState<number | null>(sharedSelectedId);

  useEffect(() => {
    const l = () => setSelectedIdState(sharedSelectedId);
    selectionListeners.add(l);
    return () => { selectionListeners.delete(l); };
  }, []);

  const setSelectedId = useCallback((id: number | null) => {
    setSharedSelectedId(id);
    setSelectedIdState(id);
  }, []);

  const refresh = useCallback(async () => {
    const api = getApi();
    if (!api) {
      setLoading(false);
      return;
    }
    try {
      const rows = await api.list();
      setGroups(Array.isArray(rows) ? rows : []);
      setError(null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (draft: GroupDraft): Promise<number | null> => {
      const api = getApi();
      if (!api) return null;
      try {
        const res = await api.save(draft);
        if (res?.success === false) {
          setError(res.error || 'Failed to save group');
          return null;
        }
        await refresh();
        return res?.id ?? null;
      } catch (e: any) {
        setError(String(e?.message ?? e));
        return null;
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: number): Promise<boolean> => {
      const api = getApi();
      if (!api) return false;
      try {
        const res = await api.remove(id);
        await refresh();
        return res?.success !== false;
      } catch (e: any) {
        setError(String(e?.message ?? e));
        return false;
      }
    },
    [refresh],
  );

  const startWith = useCallback(
    async (id: number, durationSec?: number, strictness?: 'distracting' | 'non_allowed'): Promise<any> => {
      const api = getApi();
      if (!api) return { success: false, error: 'API unavailable' };
      try {
        return (await api.startWith(id, durationSec, strictness)) ?? { success: false };
      } catch (e: any) {
        return { success: false, error: String(e?.message ?? e) };
      }
    },
    [],
  );

  const selected = groups.find(g => g.id === selectedId) ?? null;

  return { groups, loading, error, refresh, save, remove, startWith, selected, selectedId, setSelectedId };
}
```

---

## 11. Backend — focusGroupManager.ts (verbatim, full file)

`src/domains/focus/focusGroupManager.ts` (166 lines):

```ts
import type Database from 'better-sqlite3';
import { Tier, FocusConfig } from './focusManager';

export interface FocusGroup {
  id: number;
  name: string;
  description: string | null;
  allowed_apps: string[];
  allowed_domains: string[];
  allowed_categories: string[];
  strictness: 'distracting' | 'non_allowed';
  default_duration: number | null;
  created_at: string;
  updated_at: string;
}

export interface GroupAllowed {
  apps: string[];
  domains: string[];
  tiers: Tier[];
}

function parseList(v: string | null): string[] {
  try {
    const p = JSON.parse(v ?? '[]');
    return Array.isArray(p) ? p.map(String) : [];
  } catch {
    return [];
  }
}

export class FocusGroupManager {
  constructor(private db: Database.Database) {}

  list(): FocusGroup[] {
    const rows = this.db
      .prepare(
        `SELECT id, name, description, allowed_apps, allowed_domains, allowed_categories, strictness, default_duration, created_at, updated_at
         FROM focus_groups ORDER BY name ASC`,
      )
      .all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      allowed_apps: parseList(r.allowed_apps),
      allowed_domains: parseList(r.allowed_domains),
      allowed_categories: parseList(r.allowed_categories),
      strictness: r.strictness ?? 'distracting',
      default_duration: r.default_duration ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  get(id: number): FocusGroup | null {
    const r = this.db
      .prepare(
        `SELECT id, name, description, allowed_apps, allowed_domains, allowed_categories, strictness, default_duration, created_at, updated_at
         FROM focus_groups WHERE id = ?`,
      )
      .get(id) as any | undefined;
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      allowed_apps: parseList(r.allowed_apps),
      allowed_domains: parseList(r.allowed_domains),
      allowed_categories: parseList(r.allowed_categories),
      strictness: r.strictness ?? 'distracting',
      default_duration: r.default_duration ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  save(g: {
    id?: number; name: string; description?: string | null;
    allowed_apps?: string[]; allowed_domains?: string[]; allowed_categories?: string[];
    strictness?: 'distracting' | 'non_allowed'; default_duration?: number | null;
  }): number {
    const now = new Date().toISOString();
    if (g.id) {
      this.db
        .prepare(
          `UPDATE focus_groups SET name = ?, description = ?, allowed_apps = ?, allowed_domains = ?,
           allowed_categories = ?, strictness = ?, default_duration = ?, updated_at = ? WHERE id = ?`,
        )
        .run(
          g.name, g.description ?? null,
          JSON.stringify(g.allowed_apps ?? []),
          JSON.stringify(g.allowed_domains ?? []),
          JSON.stringify(g.allowed_categories ?? []),
          g.strictness ?? 'distracting', g.default_duration ?? null,
          now, g.id,
        );
      return g.id;
    }
    const info = this.db
      .prepare(
        `INSERT INTO focus_groups (name, description, allowed_apps, allowed_domains, allowed_categories, strictness, default_duration, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        g.name, g.description ?? null,
        JSON.stringify(g.allowed_apps ?? []),
        JSON.stringify(g.allowed_domains ?? []),
        JSON.stringify(g.allowed_categories ?? []),
        g.strictness ?? 'distracting', g.default_duration ?? null,
        now, now,
      );
    return Number(info.lastInsertRowid);
  }

  remove(id: number): boolean {
    const r = this.db.prepare('DELETE FROM focus_groups WHERE id = ?').run(id);
    return r.changes > 0;
  }

  recordUsage(groupId: number, sessionId: number) {
    try {
      this.db
        .prepare(`INSERT OR IGNORE INTO focus_group_usage (group_id, session_id) VALUES (?, ?)`)
        .run(groupId, sessionId);
    } catch {
      /* group may not exist; ignore */
    }
  }

  linkUsage(groupId: number, sessionId: number, goalIds: string[]) {
    const json = JSON.stringify(Array.isArray(goalIds) ? goalIds.map(String) : []);
    try {
      this.db
        .prepare(`INSERT OR IGNORE INTO focus_group_usage (group_id, session_id, goal_ids) VALUES (?, ?, ?)`)
        .run(groupId, sessionId, json);
      this.db
        .prepare(`UPDATE focus_group_usage SET goal_ids = ? WHERE group_id = ? AND session_id = ?`)
        .run(json, groupId, sessionId);
    } catch {
      /* ignore — table may not exist in very old DBs */
    }
  }

  toAllowed(g: FocusGroup): GroupAllowed {
    return {
      apps: g.allowed_apps ?? [],
      domains: g.allowed_domains ?? [],
      tiers: (g.allowed_categories ?? []).length > 0 ? (g.allowed_categories as Tier[]) : ['productive', 'neutral'],
    };
  }

  toConfig(id: number, durationSec?: number, strictness?: 'distracting' | 'non_allowed'): FocusConfig | null {
    const g = this.get(id);
    if (!g) return null;
    const a = this.toAllowed(g);
    return {
      durationSec: durationSec ?? (g.default_duration ?? 25 * 60),
      strictness: strictness ?? g.strictness,
      allowed: {
        ...a,
        categories: g.allowed_categories ?? [],
      },
    };
  }
}
```

---

## 12. ⚠️ BACKEND GAP — daily_goal_sec / goal_category are NOT persisted

The renderer `FocusGroup`/`GroupDraft` types (Section 10) declare `daily_goal_sec: number | null` and `goal_category: string | null`, and `FocusGroupEditor` sends them — **but the backend drops them silently**:

1. **`focusSchema.ts`** — `focus_groups` table has NO `daily_goal_sec` and NO `goal_category` columns (Section 13 below, verbatim).
2. **`focusGroupManager.save()`** — its argument type only includes `default_duration` and the UPDATE/INSERT statements never reference the goal fields.
3. **`main.ts` `focusGroup:save` handler** (lines 4728-4745) — whitelists exactly 7 fields; `daily_goal_sec` and `goal_category` are filtered out before reaching the manager:

```ts
electron_1.ipcMain.handle('focusGroup:save', (_e, g: any) => {
    if (!g || typeof g.name !== 'string' || !g.name.trim()) {
        return { success: false, error: 'Group name is required' };
    }
    try {
        const id = focusGroupManager.save({
            id: g.id, name: g.name.trim(), description: g.description ?? null,
            allowed_apps: Array.isArray(g.allowed_apps) ? g.allowed_apps : [],
            allowed_domains: Array.isArray(g.allowed_domains) ? g.allowed_domains : [],
            allowed_categories: Array.isArray(g.allowed_categories) ? g.allowed_categories : [],
            strictness: g.strictness === 'non_allowed' ? 'non_allowed' : 'distracting',
            default_duration: typeof g.default_duration === 'number' ? g.default_duration : null,
        });
        return { success: true, id };
    } catch (err) {
        return { success: false, error: String(err) };
    }
});
```

**=> Any UI that displays or edits daily goals / goal category must be paired with a backend fix:** ALTER TABLE migration (add `daily_goal_sec INTEGER`, `goal_category TEXT` to `focus_groups`), manager SELECT/INSERT/UPDATE support, and the IPC handler passing the fields through. This must be part of the design (Rule 5: backend must be verified/flagged).

---

## 13. DB schema — focusSchema.ts (verbatim, full file)

`src/domains/focus/focusSchema.ts` (63 lines):

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

    CREATE TABLE IF NOT EXISTS deep_focus_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  INTEGER NOT NULL REFERENCES deep_focus_sessions(id) ON DELETE CASCADE,
      ts          TEXT NOT NULL,
      kind        TEXT NOT NULL,
      target_type TEXT,
      target_name TEXT
  );

    CREATE TABLE IF NOT EXISTS focus_groups (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL,
      description     TEXT,
      allowed_apps    TEXT NOT NULL DEFAULT '[]',
      allowed_domains TEXT NOT NULL DEFAULT '[]',
      allowed_categories TEXT NOT NULL DEFAULT '[]',
      strictness      TEXT NOT NULL DEFAULT 'distracting',
      default_duration INTEGER,
      created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_fg_name ON focus_groups(name);

    CREATE TABLE IF NOT EXISTS focus_group_usage (
      group_id   INTEGER NOT NULL REFERENCES focus_groups(id) ON DELETE CASCADE,
      session_id INTEGER NOT NULL REFERENCES deep_focus_sessions(id) ON DELETE CASCADE,
      goal_ids   TEXT,
      used_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (group_id, session_id)
    );
  `);

  // Migration for existing DBs: add goal_ids column if missing
  const usageCols = db.prepare('PRAGMA table_info(focus_group_usage)').all() as any[];
  if (usageCols.length > 0 && !usageCols.some(c => c.name === 'goal_ids')) {
    try {
      db.exec('ALTER TABLE focus_group_usage ADD COLUMN goal_ids TEXT');
    } catch {
      /* column already added */
    }
  }
}
```

**Migration pattern:** the `PRAGMA table_info(...)` + `ALTER TABLE ... ADD COLUMN` pattern above (lines 53-61) is the established safe-migration convention. Follow it for the new columns.

---

## 14. IPC surface (verbatim)

### preload bridge — `src/preload.ts` lines 1362-1369

```ts
focusGroup: {
  list: () => ipcRenderer.invoke('focusGroup:list'),
  get: (id: number) => ipcRenderer.invoke('focusGroup:get', id),
  save: (g: any) => ipcRenderer.invoke('focusGroup:save', g),
  remove: (id: number) => ipcRenderer.invoke('focusGroup:remove', id),
  startWith: (id: number, durationSec?: number, strictness?: string) => ipcRenderer.invoke('focusGroup:startWith', id, durationSec, strictness),
  linkUsage: (args: { sessionId: number; groupId: number; goalIds: string[] }) => ipcRenderer.invoke('focusGroup:linkUsage', args),
},
```

### preload — `getKnownApps` at `src/preload.ts` line 1285

```ts
getKnownApps: () => ipcRenderer.invoke('get-known-apps'),
```

### main.ts handlers — `focusGroup:*` at lines 4724-4779 (full block, see Section 12 for save; list/get/remove/startWith/linkUsage):

```ts
electron_1.ipcMain.handle('focusGroup:list', () => focusGroupManager.list());
electron_1.ipcMain.handle('focusGroup:get', (_e, id: number) => focusGroupManager.get(Number(id)));
// ... save (Section 12) ...
electron_1.ipcMain.handle('focusGroup:remove', (_e, id: number) => {
    try { return { success: focusGroupManager.remove(Number(id)) }; }
    catch (err) { return { success: false, error: String(err) }; }
});
electron_1.ipcMain.handle('focusGroup:startWith', (_e, id: number, durationSec?: number, strictness?: string) => {
    try {
        const cfg = focusGroupManager.toConfig(
            Number(id),
            typeof durationSec === 'number' ? durationSec : undefined,
            strictness === 'non_allowed' || strictness === 'distracting' ? strictness : undefined,
        );
        if (!cfg) return { success: false, error: 'Focus group not found' };
        const state = focusManager ? focusManager.start(cfg) : null;
        if (!state) return { success: false, error: 'Focus engine unavailable' };
        // record usage against the created session
        const sessionId = focusManager?.getActiveSessionId?.() ?? null;
        if (sessionId != null) focusGroupManager.recordUsage(Number(id), sessionId);
        return { success: true, state, sessionId };
    } catch (err) {
        return { success: false, error: String(err) };
    }
});
electron_1.ipcMain.handle('focusGroup:linkUsage', (_e, args: { sessionId?: number; groupId?: number; goalIds?: string[] }) => {
    try {
        const sessionId = Number(args?.sessionId);
        const groupId = Number(args?.groupId);
        if (!sessionId || !groupId) return { success: false, error: 'sessionId and groupId required' };
        focusGroupManager.linkUsage(groupId, sessionId, Array.isArray(args?.goalIds) ? args.goalIds.map(String) : []);
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
});
```

### ⭐ THE SETTINGS CONNECTION — `get-known-apps` handler at `src/main.ts` lines 18845-18857

This returns the REAL tracked apps from the `logs` table — **this is what the group editor's app picker must be connected to** (instead of free-text entry):

```ts
electron_1.ipcMain.handle('get-known-apps', () => {
    if (useJson) return [];
    try {
        return db.prepare(`
            SELECT DISTINCT l.app, l.category, MAX(l.timestamp) as last_used
            FROM logs l WHERE l.duration_ms > 0
            GROUP BY l.app ORDER BY last_used DESC
        `).all();
    } catch (err) {
        console.error('[DeskFlow] Failed to get known apps:', err);
        return [];
    }
});
```

**Payload shape:** `Array<{ app: string; category: string; last_used: string }>` — `category` is the assigned tier (`productive` / `neutral` / `distracting`). Callable from renderer as `window.deskflowAPI.getKnownApps()`.

### d.ts type — `src/types/deskflow-api.d.ts` lines 357-365

```ts
// Focus Groups (named allowed-app sets for Deep Focus sessions)
focusGroup: {
  list: () => Promise<any[]>;
  get: (id: number) => Promise<any>;
  save: (g: any) => Promise<{ success: boolean; id?: number; error?: string }>;
  remove: (id: number) => Promise<{ success: boolean; error?: string }>;
  startWith: (id: number, durationSec?: number, strictness?: string) => Promise<any>;
  linkUsage: (args: { sessionId: number; groupId: number; goalIds: string[] }) => Promise<{ success: boolean; error?: string }>;
};
```

---

## 15. End-to-end IPC wiring example (canonical pattern)

For `focusGroup:startWith` — the full chain:

1. **Renderer** (`FocusSection.tsx:60-75`): `startWithGroup(groupId, durationSec, strictness)` → `useFocusGroups.startWith` → `window.deskflowAPI.focusGroup.startWith(id, durationSec, strictness)`
2. **Preload** (`preload.ts:1367`): `startWith: (id, durationSec, strictness) => ipcRenderer.invoke('focusGroup:startWith', id, durationSec, strictness)`
3. **Main** (`main.ts:4750-4767`): validates id/strictness → `focusGroupManager.toConfig(...)` → `focusManager.start(cfg)` → `recordUsage(id, sessionId)` → returns `{ success: true, state, sessionId }`
4. **DB**: `focus_group_usage` row + `deep_focus_sessions` row created.

Conventions: `{ success: boolean, ... } | { success: false, error: string }` result envelope; `Number()` coercion on ids; try/catch returning `{ success: false, error }`.

---

## 16. Design tokens & shared components

### `src/components/GlassCard.tsx` (verbatim, full file)

```tsx
type Accent = 'pink' | 'amber' | 'emerald' | 'none';

const accentConfig: Record<string, { rail: string; border: string; bg: string; edge: string }> = {
  pink:  { rail: 'bg-pink-500/60',     border: 'border-l-pink-500/20 hover:border-l-pink-500/30',   bg: 'bg-pink-500/[0.02]',  edge: 'border-pink-500/30' },
  amber: { rail: 'bg-amber-500/60',    border: 'border-l-amber-500/20 hover:border-l-amber-500/30', bg: 'bg-amber-500/[0.02]', edge: 'border-amber-500/30' },
  emerald: { rail: 'bg-emerald-500/60',border: 'border-l-emerald-500/20 hover:border-l-emerald-500/30', bg: 'bg-emerald-500/[0.02]', edge: 'border-emerald-500/30' },
};

interface GlassCardProps {
  variant?: 'default' | 'compact' | 'subtle' | 'notebook' | 'bordered' | 'elevated' | 'interactive';
  accent?: Accent;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantStyles: Record<string, string> = {
  default:   'bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50',
  compact:   'bg-zinc-900/50 backdrop-blur-md border border-zinc-800/40 p-3',
  subtle:    'bg-zinc-900/30 border border-zinc-800/30',
  notebook:  'bg-zinc-950/70 backdrop-blur-lg border-l-2',
  bordered:  'bg-transparent border-[1.5px]',
  elevated:  'bg-zinc-800/70 backdrop-blur-2xl border border-zinc-600/40',
  interactive: 'bg-zinc-900/60 backdrop-blur-xl border cursor-pointer hover:-translate-y-0.5 transition-all duration-200',
};

export function GlassCard({ variant = 'default', accent = 'none', className = '', children, onClick }: GlassCardProps) {
  const ac = accent !== 'none' ? accentConfig[accent] : null;
  const borderStyle = ac && (variant === 'notebook' || variant === 'bordered' || variant === 'interactive' || variant === 'elevated')
    ? ac.edge
    : '';
  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl p-4 transition-colors duration-200 overflow-hidden ${variantStyles[variant]} ${ac ? `${ac.border}` : ''} ${borderStyle} ${className}`}
    >
      {ac && variant !== 'notebook' && variant !== 'bordered' && (
        <>
          <div className={`absolute top-0 left-0 bottom-0 w-0.5 ${ac.rail}`} />
          <div className={`absolute inset-0 opacity-[0.03] pointer-events-none ${ac.bg}`} />
        </>
      )}
      <div className="relative z-0 flex flex-col min-h-0 flex-1">
        {children}
      </div>
    </div>
  );
}
```

### Design system summary (confirmed conventions)

- **Dark-only** UI. Base background zinc-950; cards `bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50`; radius **max `rounded-xl`** (12px); card padding `p-4`/`p-5`.
- **Fonts:** display/headings Space Grotesk (chart-card headings, hero numerals); body Inter; mono JetBrains Mono (`font-mono tabular-nums` for timers/numbers).
- **Focus accent color:** pink `#ec4899` (tab accent, ring primary, active chips). Secondary: emerald `#10b981` (start/success), amber `#f59e0b` (strict mode), rose `#f43f5e` (stop/danger).
- **Buttons:** small rounded-lg, selected = `bg-<color>-500/20 text-<color>-300 border border-<color>-500/30`; unselected = `bg-zinc-800/60 text-zinc-400 border border-zinc-800/40 hover:bg-zinc-800`.
- **Labels:** `text-[10px] uppercase tracking-wider text-zinc-500` (section labels).
- **MCP components already in use:** `AnimatedCircularProgressBar` (`src/components/ui/animated-circular-progress-bar.tsx`), `Particles` (`src/components/ui/particles.tsx`), `NumberTicker` (`src/components/ui/number-ticker.tsx`) — all installed.
- **Dialog:** shadcn Dialog; content `sm:max-w-md bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/60` (opaque-ish — dialogs must be opaque, not transparent glass, per project rule).
- **Motion:** framer-motion; crossfade `{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }`; `whileTap={{ scale: 0.95 }}`.
- **Empty states:** dashed-border CTA cards; `LoadingState variant="skeleton"`.
- **Sections:** `SectionHeader` (title + icon).

---

## 17. MCP component inventory (REAL — queried live)

| Component | Source | Use for |
|-----------|--------|---------|
| `dialog`, `button`, `badge`, `input`, `switch`, `tooltip` | shadcn (installed in repo) | Existing UI primitives |
| `animated-circular-progress-bar` | Magic UI (installed) | Timer ring — already used |
| `particles` | Magic UI (installed) | Ambient background on active timer |
| `number-ticker` | Magic UI (installed) | Animated numerals |
| `scroll-progress` | Magic UI | Page-level progress indicator |
| `progressive-blur` | Magic UI | Scroll edge fade |
| `orbiting-circles` | Magic UI | Decorative orbit |
| `spinning-text` | Magic UI | Decorative animated text |
| AnimatedContent, FadeContent, GlareHover, Magnet, StarBorder, Aurora, Beams, DotGrid, Particles, Orb, LetterGlitch, GridMotion | React Bits (135+ components) | Motion/background effects |
| `Layers, Plus, Pencil, Trash2, Target, Clock, AppWindow, Globe, Tag, Eye, EyeOff, Save, Activity, Play, Square, Timer, Flame, TrendingUp, Search, Check, X` | Lucide (installed) | Icons |
| **NO combobox/command/select-search component exists in the @react-bits registry** (queried "combobox select search command dialog" → 0 results) | — | **Custom picker must be specified in the design** (searchable multi-select chip grid) |

**Anti-slop rules (frontend-external-infra skill):** re-skin every sourced component to DeskFlow tokens; max `rounded-xl`; `p-5`; dark-only; Inter/Geist + JetBrains Mono; glass layer `bg-zinc-900/80 backdrop-blur-xl`.

---

## 18. Architecture / data-flow notes

- **Renderer → preload → main → SQLite.** All focus data flows through `window.deskflowAPI.focusGroup.*` IPC. `getKnownApps()` is the bridge to tracked-app data from the logs table.
- **`focus_group_usage`** is the attribution table: `(group_id, session_id, goal_ids)` — session_id FK to `deep_focus_sessions`. Today, daily-goal progress is NOT computed from it anywhere; `FocusGroupProgress` shows a placeholder.
- **`useActiveFocusGroup`** is a module-level singleton storing `{ sessionId, groupId, allowedCategories, startedAt }` for goal accrual (used by GoalStore/`useFocusGoals` with localStorage key `focus-group-accrual`).
- **Selection state** is a module-level singleton in `useFocusGroups.ts` (`sharedSelectedId`) shared across consumers.
- **Dead file:** `src/pages/FocusPage.tsx` imported at `src/App.tsx:41` but never routed — goals CRUD leftovers; safe to repurpose or ignore.
- **Build:** `node scripts/build.mjs` (renderer vite + preload esbuild + main). Vite build does NOT type-check. `dist-electron/preload.cjs` rebuild: `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`.
- **DB path:** `%APPDATA%/DeskFlow/deskflow-data.db` (better-sqlite3).
