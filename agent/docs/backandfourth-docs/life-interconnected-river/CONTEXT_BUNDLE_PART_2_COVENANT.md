# CONTEXT BUNDLE PART 2 — Covenant sub-feature (VERBATIM)

**Data model:** 100% client-side. localStorage keys `deskflow.covenant.*.v1` (commitments, events, journal) + one boolean. No backend, no IPC. Colors clay/sage/amber/sky. Streak math with milestones [3,7,14,30,60,100,180,365].

---

## 2.1 `src/features/covenant/CovenantPage.tsx` (VERBATIM, 201 lines)

```tsx
import { useState, useMemo } from 'react';
import { HeartHandshake, Plus, Flame, CalendarCheck, Sparkles } from 'lucide-react';
import { WarmCard } from '../warmth/WarmCard';
import { useCovenant } from './useCovenant';
import CommitmentCard from './CommitmentCard';
import NewCommitmentModal from './NewCommitmentModal';
import ConstellationHero from './ConstellationHero';
import GraceResetMoment from './GraceResetMoment';
import MilestoneCelebration from './MilestoneCelebration';
import ReflectionPromptCard from './ReflectionPromptCard';
import ReflectionEcho from './ReflectionEcho';
import JournalDrawer from './JournalDrawer';
import type { CovenantEvent } from './types';

interface CovenantPageProps {
  embedded?: boolean;
}

export default function CovenantPage({ embedded }: CovenantPageProps) {
  const covenant = useCovenant();
  const [isModalOpen, setModalOpen] = useState(false);
  const [activeJournalId, setActiveJournalId] = useState<string | null>(null);
  const [dismissedCelebrations, setDismissedCelebrations] = useState<Record<string, boolean>>({});

  const stats = useMemo(() => covenant.statsById('today'), [covenant.statsById, covenant.state, covenant.events]);

  const milestones = useMemo(() => {
    const result: CovenantEvent[] = [];
    covenant.events.forEach(event => {
      if (event.type === 'milestone' && !dismissedCelebrations[event.id]) result.push(event);
    });
    return result;
  }, [covenant.events, dismissedCelebrations]);

  const activeCommitments = useMemo(
    () => covenant.commitments.filter(c => c.status !== 'archived'),
    [covenant.commitments]
  );

  const completedCount = useMemo(() => {
    const today = new Date().toDateString();
    return covenant.commitments.filter(c => c.completions.some(x => new Date(x).toDateString() === today)).length;
  }, [covenant.commitments]);

  if (covenant.state === 'loading') {
    return (
      <div className="grid place-items-center py-24 text-zinc-400 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
          Loading covenant...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ConstellationHero
        commitmentCount={covenant.commitments.length}
        streak={stats.streak}
        bestStreak={stats.bestStreak}
        completedToday={completedCount}
      />

      {milestones.length > 0 && (
        <MilestoneCelebration
          milestones={milestones}
          onDismiss={id => setDismissedCelebrations(prev => ({ ...prev, [id]: true }))}
        />
      )}

      <WarmCard ambient>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-300">Commitments</span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/70 hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        {activeCommitments.length === 0 ? (
          <button
            onClick={() => setModalOpen(true)}
            className="w-full py-8 text-center text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors border border-dashed border-zinc-800 rounded-xl"
          >
            <Sparkles className="w-5 h-5 mx-auto mb-2 opacity-60" />
            No commitments yet — start your first one
          </button>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeCommitments.map(commitment => (
              <CommitmentCard
                key={commitment.id}
                commitment={commitment}
                onToggleToday={() => covenant.toggleToday(commitment.id)}
                onOpenJournal={() => setActiveJournalId(commitment.id)}
                stats={stats}
                completed={completedCount}
              />
            ))}
          </div>
        )}
      </WarmCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ReflectionPromptCard onTodayReflection={() => setActiveJournalId('_today')} />
        <ReflectionEcho />
      </div>

      {covenant.journal.length > 0 && (
        <WarmCard>
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-300">Journal</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-auto">
            {covenant.journal
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map(entry => (
                <button
                  key={entry.id}
                  onClick={() => setActiveJournalId(entry.commitmentId)}
                  className="w-full text-left p-3 rounded-lg bg-zinc-800/40 hover:bg-zinc-800/70 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-zinc-500">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {entry.entryType === 'daily' ? 'Daily' : entry.entryType === 'milestone' ? 'Milestone' : 'Reflection'}
                    </span>
                  </div>
                  <p className="text-[13px] text-zinc-300 line-clamp-2">{entry.content}</p>
                </button>
              ))}
          </div>
        </WarmCard>
      )}

      {covenant.state === 'error' && (
        <p className="text-[11px] text-red-400/80 text-center">Covenant data failed to load.</p>
      )}

      <NewCommitmentModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={covenant.createCommitment}
      />

      {activeJournalId && (
        <JournalDrawer
          commitmentId={activeJournalId}
          commitmentTitle={covenant.commitments.find(c => c.id === activeJournalId)?.title ?? 'Today'}
          onClose={() => setActiveJournalId(null)}
          onSubmit={async (content, type) => {
            await covenant.addJournalEntry(activeJournalId, content, type);
            setActiveJournalId(null);
          }}
          hasJournal={covenant.journal.some(e => e.commitmentId === activeJournalId)}
        />
      )}
    </div>
  );
}
```

## 2.2 `src/features/covenant/types.ts` (VERBATIM)

```ts
export interface Covenant {
  id: string;
  title: string;
  color: string;
  status: 'active' | 'paused' | 'archived';
  completions: string[]; // ISO date strings, one per completed day
  createdAt: number;
}

export interface CovenantEvent {
  id: string;
  covenantId: string;
  type: 'milestone' | 'grace-reset';
  message: string;
  at: number;
}

export interface JournalEntry {
  id: string;
  commitmentId: string;
  content: string;
  entryType: 'daily' | 'milestone' | 'reflection';
  createdAt: number;
}

export type CovenantStats = {
  streak: number;
  bestStreak: number;
  completed: number;
  total: number;
};
```

## 2.3 `src/features/covenant/useCovenant.ts` (VERBATIM)

```ts
import { useCallback, useEffect, useState, useMemo } from 'react';
import type { Covenant, CovenantEvent, JournalEntry, CovenantStats } from './types';
import { loadCovenants, saveCovenants, loadEvents, saveEvents, loadJournal, saveJournal } from './storage';
import { computeStreak } from './streak';

type LoadState = 'loading' | 'ready' | 'error';

export function useCovenant() {
  const [state, setState] = useState<LoadState>('loading');
  const [commitments, setCommitments] = useState<Covenant[]>([]);
  const [events, setEvents] = useState<CovenantEvent[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  useEffect(() => {
    try {
      setCommitments(loadCovenants());
      setEvents(loadEvents());
      setJournal(loadJournal());
      setState('ready');
    } catch (err) {
      console.error('Failed to load covenant data', err);
      setState('error');
    }
  }, []);

  const persist = useCallback(() => {
    saveCovenants(commitments);
    saveEvents(events);
    saveJournal(journal);
  }, [commitments, events, journal]);

  useEffect(() => { if (state === 'ready') persist(); }, [persist, state]);

  const toggleToday = useCallback((id: string) => {
    setCommitments(prev => prev.map(c => {
      if (c.id !== id) return c;
      const today = new Date().toDateString();
      const has = c.completions.some(x => new Date(x).toDateString() === today);
      if (has) {
        return { ...c, completions: c.completions.filter(x => new Date(x).toDateString() !== today) };
      }
      const next = { ...c, completions: [...c.completions, new Date().toISOString()] };
      const len = computeStreak(next.completions);
      if ([3, 7, 14, 30, 60, 100, 180, 365].includes(len)) {
        setEvents(ev => [...ev, {
          id: `${Date.now()}-ms`,
          covenantId: id,
          type: 'milestone',
          message: `${len}-day streak on ${c.title}!`,
          at: Date.now(),
        }]);
      }
      return next;
    }));
  }, []);

  const createCommitment = useCallback((title: string, color: string) => {
    setCommitments(prev => [...prev, { id: crypto.randomUUID(), title, color, status: 'active', completions: [], createdAt: Date.now() }]);
  }, []);

  const updateCommitment = useCallback((id: string, patch: Partial<Covenant>) => {
    setCommitments(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const deleteCommitment = useCallback((id: string) => {
    setCommitments(prev => prev.filter(c => c.id !== id));
  }, []);

  const archiveCommitment = useCallback((id: string) => {
    setCommitments(prev => prev.map(c => c.id === id ? { ...c, status: 'archived' } : c));
  }, []);

  const addJournalEntry = useCallback(async (commitmentId: string, content: string, entryType: JournalEntry['entryType']) => {
    setJournal(prev => [...prev, { id: crypto.randomUUID(), commitmentId, content, entryType, createdAt: Date.now() }]);
  }, []);

  const statsById = useCallback((_day: string) => {
    return useCovenantStats(commitments);
  }, [commitments]);

  const stats = useMemo(() => useCovenantStats(commitments), [commitments]);

  return {
    state,
    commitments,
    events,
    journal,
    toggleToday,
    createCommitment,
    updateCommitment,
    deleteCommitment,
    archiveCommitment,
    addJournalEntry,
    statsById,
    stats,
  };
}

function useCovenantStats(commitments: Covenant[]): CovenantStats {
  const active = commitments.filter(c => c.status !== 'archived');
  const allDates = active.flatMap(c => c.completions).map(d => new Date(d).toDateString());
  return {
    streak: computeStreak(active.map(c => c.completions).flat()),
    bestStreak: bestStreakOf(allDates),
    completed: active.reduce((sum, c) => sum + c.completions.length, 0),
    total: active.length,
  };
}

function bestStreakOf(dates: string[]): number {
  if (dates.length === 0) return 0;
  const unique = Array.from(new Set(dates)).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  let best = 1, current = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const cur = new Date(unique[i]);
    const diff = (cur.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) { current++; best = Math.max(best, current); }
    else current = 1;
  }
  return best;
}
```

## 2.4 `src/features/covenant/storage.ts` (VERBATIM)

```ts
import type { Covenant, CovenantEvent, JournalEntry } from './types';

const KEYS = {
  covenants: 'deskflow.covenant.commitments.v1',
  events: 'deskflow.covenant.events.v1',
  journal: 'deskflow.covenant.journal.v1',
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore quota errors */ }
}

export function loadCovenants(): Covenant[] { return read<Covenant[]>(KEYS.covenants, []); }
export function saveCovenants(c: Covenant[]) { write(KEYS.covenants, c); }
export function loadEvents(): CovenantEvent[] { return read<CovenantEvent[]>(KEYS.events, []); }
export function saveEvents(e: CovenantEvent[]) { write(KEYS.events, e); }
export function loadJournal(): JournalEntry[] { return read<JournalEntry[]>(KEYS.journal, []); }
export function saveJournal(j: JournalEntry[]) { write(KEYS.journal, j); }
```

## 2.5 `src/features/covenant/streak.ts` (VERBATIM)

```ts
export const MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365] as const;

export function computeStreak(completionDates: string[]): number {
  const unique = Array.from(new Set(completionDates.map(d => new Date(d).toDateString()))).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );
  if (unique.length === 0) return 0;
  const today = new Date();
  const last = new Date(unique[unique.length - 1]);
  const daysGap = Math.floor((today.getTime() - last.getTime()) / 86400000);
  if (daysGap > 1) return 0;
  let streak = daysGap === 1 ? 1 : 0;
  for (let i = unique.length - 1; i >= 0; i--) {
    const cur = new Date(unique[i]);
    const next = new Date(unique[i + 1] ?? cur.getTime() + 86400000);
    const diff = (next.getTime() - cur.getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export function nextMilestone(currentStreak: number): number {
  return MILESTONES.find(m => m > currentStreak) ?? 365;
}
```

## 2.6 `src/features/covenant/covenantColors.ts` (VERBATIM)

```ts
export const WARM_COLORS = ['#e8866b', '#6fb38f', '#fbbf24', '#5ab0c9'] as const;
export type WarmColor = typeof WARM_COLORS[number];
```
