import { useEffect, useMemo, useState } from 'react';
import { Target, Pencil, Eye, EyeOff, Save } from 'lucide-react';
import { AnimatedCircularProgressBar } from '../../components/ui/animated-circular-progress-bar';
import { NumberTicker } from '../../components/ui/number-ticker';
import { DotPattern } from '../../components/ui/dot-pattern';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import type { FocusHistoryRow } from './focusHelpers';
import { fmtDuration } from './focusHelpers';

export interface FocusGoalConfig {
  lenient_goal_sec: number;
  strict_goal_sec: number;
  updated_at: string | null;
}

function computeModeDaily(
  history: FocusHistoryRow[],
  strictness: 'distracting' | 'non_allowed',
  goalSec: number,
): { currentSec: number; pct: number } {
  if (!goalSec || goalSec <= 0) return { currentSec: 0, pct: 0 };
  const today = new Date().toDateString();
  const currentSec = history
    .filter(
      h =>
        h.outcome === 'completed' &&
        h.strictness === strictness &&
        new Date(h.started_at).toDateString() === today,
    )
    .reduce((sum, h) => sum + (h.actual_sec || 0), 0);
  return { currentSec, pct: Math.min(100, Math.round((currentSec / goalSec) * 100)) };
}

function ModeCard({
  label,
  icon,
  color,
  goalSec,
  currentSec,
  pct,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  goalSec: number;
  currentSec: number;
  pct: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl p-4 bg-zinc-900/95 border border-zinc-800/60">
      <DotPattern className="text-white" opacity={0.04} gap={18} />
      <div
        className="absolute top-0 left-4 right-4 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <div className="relative flex items-center gap-1.5 mb-3">
        {icon}
        <span className="text-[12px] font-semibold text-zinc-200">{label}</span>
      </div>

      <div className="relative flex items-center gap-4">
        <AnimatedCircularProgressBar
          value={pct}
          size={88}
          strokeWidth={7}
          gaugePrimaryColor={color}
          gaugeSecondaryColor="rgba(255,255,255,0.06)"
          linear
          linearDurationMs={800}
        >
          <div className="flex flex-col items-center">
            <NumberTicker value={pct} suffix="%" className="text-lg font-mono text-white" />
            <span className="text-[8px] text-zinc-500 uppercase tracking-wider mt-0.5">today</span>
          </div>
        </AnimatedCircularProgressBar>

        <div className="space-y-1.5 min-w-0">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-zinc-500">Goal / day</p>
            <p className="text-sm font-bold tabular-nums font-mono text-white truncate">
              {fmtDuration(goalSec)}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-zinc-500">Completed</p>
            <p className="text-sm font-bold tabular-nums font-mono" style={{ color }}>
              {fmtDuration(currentSec)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: FocusGoalConfig;
  onSave: (cfg: { lenient_goal_sec: number; strict_goal_sec: number }) => Promise<boolean>;
}

function GoalsDialog({ open, onOpenChange, config, onSave }: GoalsDialogProps) {
  const [lenientMin, setLenientMin] = useState('');
  const [strictMin, setStrictMin] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLenientMin(config.lenient_goal_sec > 0 ? String(Math.round(config.lenient_goal_sec / 60)) : '');
    setStrictMin(config.strict_goal_sec > 0 ? String(Math.round(config.strict_goal_sec / 60)) : '');
    setErr(null);
  }, [open, config]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave({
      lenient_goal_sec: (Math.max(0, Number(lenientMin)) || 0) * 60,
      strict_goal_sec: (Math.max(0, Number(strictMin)) || 0) * 60,
    });
    setSaving(false);
    if (ok) onOpenChange(false);
    else setErr('Could not save goals. Check the console for details.');
  };

  const numInput = (value: string, setValue: (v: string) => void, token: 'lenient' | 'strict') => (
    <input
      type="number"
      min={0}
      step={5}
      value={value}
      onChange={e => setValue(e.target.value)}
      placeholder="0 = no goal"
      className={`w-24 px-3 py-1.5 rounded-lg bg-zinc-800/40 border border-zinc-800/50 outline-none text-[13px] text-zinc-200 placeholder:text-zinc-600 ${
        token === 'strict' ? 'focus:border-amber-500/40' : 'focus:border-pink-500/40'
      }`}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-zinc-950 border border-zinc-800/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-4 h-4 text-pink-400" />
            Daily focus goals
          </DialogTitle>
          <DialogDescription>
            Set a daily time target for each mode. Only completed sessions count.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[12px] text-zinc-300">
              <EyeOff className="w-3.5 h-3.5 text-pink-400" />
              Lenient
            </span>
            <div className="flex items-center gap-2">
              {numInput(lenientMin, setLenientMin, 'lenient')}
              <span className="text-[11px] text-zinc-500">min/day</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[12px] text-zinc-300">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              Strict
            </span>
            <div className="flex items-center gap-2">
              {numInput(strictMin, setStrictMin, 'strict')}
              <span className="text-[11px] text-zinc-500">min/day</span>
            </div>
          </div>
          {err && <p className="text-[11px] text-rose-400">{err}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save goals'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FocusGoals({ history }: { history: FocusHistoryRow[] }) {
  const [config, setConfig] = useState<FocusGoalConfig>({ lenient_goal_sec: 0, strict_goal_sec: 0, updated_at: null });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const api = (window as any).deskflowAPI;
    if (!api?.focusGoal?.get) return;
    api
      .focusGoal.get()
      .then((cfg: any) => {
        if (cfg?.lenient_goal_sec != null) {
          setConfig({
            lenient_goal_sec: Number(cfg.lenient_goal_sec) || 0,
            strict_goal_sec: Number(cfg.strict_goal_sec) || 0,
            updated_at: cfg.updated_at ?? null,
          });
        }
      })
      .catch((e: any) => console.error('[Focus] Failed to load goal config:', e));
  }, []);

  const lenient = useMemo(
    () => computeModeDaily(history, 'distracting', config.lenient_goal_sec),
    [history, config.lenient_goal_sec],
  );
  const strict = useMemo(
    () => computeModeDaily(history, 'non_allowed', config.strict_goal_sec),
    [history, config.strict_goal_sec],
  );

  const hasGoals = config.lenient_goal_sec > 0 || config.strict_goal_sec > 0;

  const handleSave = async (cfg: { lenient_goal_sec: number; strict_goal_sec: number }): Promise<boolean> => {
    const api = (window as any).deskflowAPI;
    if (!api?.focusGoal?.save) return false;
    try {
      const res = await api.focusGoal.save(cfg);
      if (res?.lenient_goal_sec != null && res?.strict_goal_sec != null) {
        setConfig({ lenient_goal_sec: Number(res.lenient_goal_sec), strict_goal_sec: Number(res.strict_goal_sec), updated_at: res.updated_at ?? null });
        return true;
      }
      return false;
    } catch (e: any) {
      console.error('[Focus] Failed to save goal config:', e);
      return false;
    }
  };

  return (
    <GlassCard className="bg-zinc-900/95 border-zinc-800/60">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <Target className="w-4 h-4 text-pink-400" />
          Focus goals
        </h3>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-zinc-800/60 text-zinc-400 hover:text-pink-300 hover:bg-zinc-800 border border-zinc-800/50 transition-colors"
        >
          <Pencil className="w-2.5 h-2.5" />
          Set goals
        </button>
      </div>

      {!hasGoals ? (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 flex items-center gap-2 px-3 py-2.5">
          <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] text-emerald-300">Set daily focus-time goals per mode — e.g. 20 min in strict, 1 hour in lenient.</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ModeCard
              label="Lenient"
              icon={<EyeOff className="w-3 h-3 text-pink-400" />}
              color="#ec4899"
              goalSec={config.lenient_goal_sec}
              currentSec={lenient.currentSec}
              pct={lenient.pct}
            />
            <ModeCard
              label="Strict"
              icon={<Eye className="w-3 h-3 text-amber-400" />}
              color="#f59e0b"
              goalSec={config.strict_goal_sec}
              currentSec={strict.currentSec}
              pct={strict.pct}
            />
          </div>
          <p className="text-[9px] text-zinc-600 mt-2">Completed sessions only · resets daily</p>
        </>
      )}

      <GoalsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        config={config}
        onSave={handleSave}
      />
    </GlassCard>
  );
}