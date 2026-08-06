import { useCallback, useEffect, useRef, useState } from 'react';
import { Focus as FocusIcon, AlertTriangle } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { LoadingState } from '../../components/LoadingState';
import { AnimatedGradientText } from '../../components/ui/animated-gradient-text';
import { confetti } from '../../components/ui/confetti';
import { useFocusSession } from '../../hooks/useFocusSession';
import { useFocusGroups, type FocusGroup, type GroupDraft } from '../../hooks/useFocusGroups';
import { setActiveGroup } from '../../hooks/useActiveFocusGroup';
import { useToasts } from '../../hooks/useToasts';
import { FocusTimer } from './FocusTimer';
import { FocusStats } from './FocusStats';
import { FocusGroupProgress } from './FocusGroupProgress';
import { FocusGroupsPanel } from './FocusGroupsPanel';
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
  const { groups, loading, error: groupsError, save, remove, selectedId, setSelectedId, selected } = useFocusGroups();
  const { toasts, showToast, removeToast } = useToasts();
  const [mins, setMins] = useState(25);
  const [strict, setStrict] = useState<'distracting' | 'non_allowed'>('distracting');
  const [justCompleted, setJustCompleted] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const [mode, setMode] = useState<FocusMode>('timer');
  const [distractions, setDistractions] = useState<Array<{ name: string; type: 'app' | 'website'; timestamp: number }>>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FocusGroup | null>(null);
  const [usageMap, setUsageMap] = useState<Map<number, number[]>>(new Map());
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

  const refreshUsage = useCallback(async () => {
    const api = (window as any).deskflowAPI;
    if (!api?.focusGroup?.getUsage) return;
    try {
      const usageRows = await api.focusGroup.getUsage();
      const map = new Map<number, number[]>();
      if (Array.isArray(usageRows)) {
        for (const r of usageRows) {
          const gid = Number(r?.group_id);
          const sid = Number(r?.session_id);
          if (!gid || !sid) continue;
          const arr = map.get(gid) ?? [];
          arr.push(sid);
          map.set(gid, arr);
        }
      }
      setUsageMap(map);
    } catch (e) {
      console.error('[Focus] Failed to load group usage:', e);
    }
  }, []);

  useEffect(() => {
    void refreshUsage();
  }, [refreshUsage, groups]);

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
      void refreshUsage();
      const minsDone = Math.max(1, Math.round(pending.plannedSec / 60));
      if (bestPct >= 100) {
        confetti({ particleCount: 120, spread: 75, startVelocity: 42, colors: ['#ec4899', '#a855f7', '#fbbf24', '#34d399'] });
      }
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

  if (apiMissing || (loading && groups.length === 0)) {
    return (
      <div>
        <SectionHeader title={<AnimatedGradientText colorFrom="#ec4899" colorTo="#a855f7">Deep Focus</AnimatedGradientText>} icon={<FocusIcon className="w-4 h-4" />} />
        <LoadingState variant="skeleton" className="h-96" />
      </div>
    );
  }

  if (groupsError && groups.length === 0) {
    return (
      <div>
        <SectionHeader title={<AnimatedGradientText colorFrom="#ec4899" colorTo="#a855f7">Deep Focus</AnimatedGradientText>} icon={<FocusIcon className="w-5 h-5" />} />
        <div className="rounded-xl border border-rose-500/30 bg-zinc-900/95 p-5">
          <p className="text-[13px] font-semibold text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Failed to load Focus data.
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">{groupsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title={<AnimatedGradientText colorFrom="#ec4899" colorTo="#a855f7">Deep Focus</AnimatedGradientText>} icon={<FocusIcon className="w-5 h-5" />} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <FocusGroupsPanel
            groups={groups}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCreate={() => { setEditingGroup(null); setEditorOpen(true); }}
            onEdit={g => { setEditingGroup(g); setEditorOpen(true); }}
            onDelete={handleDeleteGroup}
          />
        </div>
        <div className="lg:col-span-1 space-y-4">
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
            activeGroup={selected}
            onStartWithGroup={handleStartWithGroup}
            onDurationDrag={sec => setMins(Math.round(sec / 60))}
          />
          <FocusStats stats={todayStats} streak={streak} />
        </div>
        <div className="lg:col-span-1 space-y-4">
          <FocusGroupProgress groups={groups} selectedId={selectedId} history={rows} usageMap={usageMap} />
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
