import { useEffect, useState } from 'react';
import { Focus as FocusIcon } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { LoadingState } from '../../components/LoadingState';
import { useFocusSession } from '../../hooks/useFocusSession';
import { FocusTimer } from './FocusTimer';
import { FocusStats } from './FocusStats';
import { FocusHistory } from './FocusHistory';
import { FocusInsights } from './FocusInsights';
import { FocusLeaderboard } from './FocusLeaderboard';
import { FocusDistractionLog } from './FocusDistractionLog';
import { computeTodayStats, computeStreak, type FocusHistoryRow } from './focusHelpers';

type FocusMode = 'timer' | 'stopwatch';

export function FocusSection() {
  const { state, history, start, stop } = useFocusSession();
  const [mins, setMins] = useState(25);
  const [strict, setStrict] = useState<'distracting' | 'non_allowed'>('distracting');
  const [justCompleted, setJustCompleted] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const [mode, setMode] = useState<FocusMode>('timer');
  const [distractions, setDistractions] = useState<Array<{ name: string; type: 'app' | 'website'; timestamp: number }>>([]);

  useEffect(() => {
    const hasApi = !!(window as any).deskflowAPI?.focus;
    setApiMissing(!hasApi);
  }, []);

  useEffect(() => {
    if (!state) return;
    if (!state.active && history[0]?.outcome === 'completed') {
      setJustCompleted(true);
      const t = setTimeout(() => setJustCompleted(false), 4000);
      return () => clearTimeout(t);
    }
  }, [state, history]);

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

  if (apiMissing) {
    return (
      <div>
        <SectionHeader title="Deep Focus" icon={<FocusIcon className="w-4 h-4" />} />
        <LoadingState variant="skeleton" className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Deep Focus" icon={<FocusIcon className="w-4 h-4" />} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
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
          />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <FocusStats stats={todayStats} streak={streak} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FocusLeaderboard history={rows} />
            <FocusDistractionLog distractions={distractions} isActive={!!state?.active} />
          </div>
          <FocusHistory history={rows} onStartFirstSession={handleStart} />
          <FocusInsights history={rows} />
        </div>
      </div>
    </div>
  );
}
