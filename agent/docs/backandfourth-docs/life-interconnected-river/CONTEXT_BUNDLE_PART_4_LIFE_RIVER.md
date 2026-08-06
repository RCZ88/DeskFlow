# CONTEXT BUNDLE PART 4 — River of Years (VERBATIM)

**This is the feature the redesign is anchored on.** Backend: SQLite `life_phases` + `life_timeline_meta` via 8 `lifePhase:*` IPC handlers (Part 5). UI: `src/components/life-river/*` + `src/lib/riverMath.ts` + `src/hooks/useLifePhases.ts`. It renders a time-flow river from birth → today, with color-coded phase arcs, milestone markers, and era-trend cards. **User requirement:** phase cards must be individually color-customizable with FULLY VISIBLE SOLID color bands — never a translucent dark overlay over card content.

---

## 4.1 `src/lib/riverMath.ts` (VERBATIM — ALL math + types)

```ts
export interface LifePhase {
  id: string;
  title: string;
  description?: string;
  category: string; // key from PHASE_CATEGORIES
  startMonth: number; // 1-12
  startYear: number;
  endMonth: number;
  endYear: number;
  color?: string; // custom override (hex)
  magnitude?: number; // 1-5 intensity
  reflection?: string;
  eraTrends?: EraTrends;
  impactNotes?: string;
  milestones?: string[]; // free text strings
  connections?: string[]; // ids of other phases
}

export interface EraTrends {
  world?: string;
  culture?: string;
  field?: string;
}

export const PHASE_CATEGORIES: Record<string, { label: string; color: string }> = {
  growth:    { label: 'Growth',    color: '#6fb38f' }, // sage
  career:    { label: 'Career',    color: '#5ab0c9' }, // sky
  love:      { label: 'Love',      color: '#e8866b' }, // clay
  challenge: { label: 'Challenge', color: '#f87171' }, // rose
  joy:       { label: 'Joy',       color: '#fbbf24' }, // amber
  rest:      { label: 'Rest',      color: '#a78bfa' }, // violet
  adventure: { label: 'Adventure', color: '#2dd4bf' }, // teal
  creation:  { label: 'Creation',  color: '#f472b6' }, // pink
};

export function categoryOf(phase: LifePhase): { label: string; color: string } {
  if (phase.color) return { label: PHASE_CATEGORIES[phase.category]?.label ?? phase.category, color: phase.color };
  return PHASE_CATEGORIES[phase.category] ?? { label: phase.category, color: '#71717a' };
}

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function timeToX(phase: LifePhase, width: number): { startX: number; endX: number; span: number } {
  const start = phase.startYear * 12 + (phase.startMonth - 1);
  const end = phase.endYear * 12 + (phase.endMonth - 1);
  const span = Math.max(end - start, 1);
  const now = new Date();
  const nowM = now.getFullYear() * 12 + now.getMonth();
  const birth = Math.min(start, nowM);
  const total = Math.max(nowM - birth, 1);
  const startX = ((start - birth) / total) * width;
  const endX = ((end - birth) / total) * width;
  return { startX, endX, span };
}

export function reachHeight(phase: LifePhase): number {
  const m = phase.magnitude ?? 3;
  return 20 + Math.min(m, 5) * 12;
}

export function rampFill(magnitude?: number): number {
  const m = magnitude ?? 3;
  return Math.min(m / 5, 1) * 0.85 + 0.08;
}

export const ZOOM_STOPS = [
  { label: 'Life', years: 80 },
  { label: 'Decade', years: 10 },
  { label: 'Year', years: 1 },
] as const;

export function magnitudeWords(m: number): string {
  if (m <= 1) return 'faint';
  if (m === 2) return 'gentle';
  if (m === 3) return 'steady';
  if (m === 4) return 'strong';
  return 'tidal';
}

export function phaseSpanLabel(phase: LifePhase): string {
  if (phase.startYear === phase.endYear && phase.startMonth === phase.endMonth) {
    return `${MONTHS[phase.startMonth - 1]} ${phase.startYear}`;
  }
  if (phase.startYear === phase.endYear) {
    return `${MONTHS[phase.startMonth - 1]} – ${MONTHS[phase.endMonth - 1]} ${phase.endYear}`;
  }
  return `${MONTHS[phase.startMonth - 1]} ${phase.startYear} – ${MONTHS[phase.endMonth - 1]} ${phase.endYear}`;
}

export function phaseAgeLabel(phase: LifePhase): string {
  const years = phase.endYear - phase.startYear;
  const months = phase.endMonth - phase.startMonth;
  const total = years * 12 + months;
  const y = Math.floor(total / 12);
  const m = total % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}

export function magnitudeGradient(magnitude: number): string {
  if (magnitude <= 2) return 'from-rose-500/40 to-rose-500/10';
  if (magnitude <= 4) return 'from-rose-500/60 to-rose-500/20';
  return 'from-rose-500/90 to-rose-500/40';
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function sortPhases(phases: LifePhase[]): LifePhase[] {
  return phases.slice().sort((a, b) => (a.startYear * 12 + a.startMonth) - (b.startYear * 12 + b.startMonth));
}
```

## 4.2 `src/hooks/useLifePhases.ts` (VERBATIM)

```ts
import { useCallback, useEffect, useState } from 'react';
import type { LifePhase, EraTrends } from '../lib/riverMath';

interface LifeSummary {
  journeySummary: string;
  updatedAt: number;
}

export function useLifePhases() {
  const [phases, setPhases] = useState<LifePhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<LifeSummary | null>(null);
  const [summaryUpdatedAt, setSummaryUpdatedAt] = useState(0);

  const loadPhases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await window.deskflowAPI.lifePhaseGet();
      if (!res.ok) throw new Error(res.error ?? 'Failed to load phases');
      const sorted = (res.data ?? []).sort((a: LifePhase, b: LifePhase) => (a.startYear * 12 + a.startMonth) - (b.startYear * 12 + b.startMonth));
      setPhases(sorted);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load phases');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const res = await window.deskflowAPI.lifePhaseGetSummary();
      if (res.ok && res.data) setSummary(res.data);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    void loadPhases();
    void loadSummary();
  }, [loadPhases, loadSummary]);

  const savePhase = useCallback(async (phase: LifePhase) => {
    const res = await window.deskflowAPI.lifePhaseSave(phase);
    if (!res.ok) throw new Error(res.error ?? 'Failed to save phase');
    await loadPhases();
  }, [loadPhases]);

  const deletePhase = useCallback(async (id: string) => {
    const res = await window.deskflowAPI.lifePhaseDelete(id);
    if (!res.ok) throw new Error(res.error ?? 'Failed to delete phase');
    setPhases(prev => prev.filter(p => p.id !== id));
  }, []);

  const saveAllPhases = useCallback(async (list: LifePhase[]) => {
    const res = await window.deskflowAPI.lifePhaseSaveAll(list);
    if (!res.ok) throw new Error(res.error ?? 'Failed to save phases');
    await loadPhases();
  }, [loadPhases]);

  const aiReflect = useCallback(async (phaseId: string) => {
    const res = await window.deskflowAPI.lifePhaseAiReflect(phaseId);
    if (!res.ok) throw new Error(res.error ?? 'AI reflection failed');
    await loadPhases();
    return res.data;
  }, [loadPhases]);

  const aiEraTrends = useCallback(async (phaseId: string) => {
    const res = await window.deskflowAPI.lifePhaseAiEraTrends(phaseId);
    if (!res.ok) throw new Error(res.error ?? 'AI era trends failed');
    await loadPhases();
    return res.data;
  }, [loadPhases]);

  const aiSummarize = useCallback(async () => {
    const res = await window.deskflowAPI.lifePhaseAiSummarize();
    if (!res.ok) throw new Error(res.error ?? 'AI summary failed');
    setSummary(res.data);
    setSummaryUpdatedAt(Date.now());
    return res.data;
  }, []);

  return {
    phases, loading, error, summary, summaryUpdatedAt,
    loadPhases, loadSummary, savePhase, deletePhase, saveAllPhases,
    aiReflect, aiEraTrends, aiSummarize,
  };
}
```

## 4.3 `src/components/life-river/river.tsx` (VERBATIM — the hub component)

```tsx
import { useRef, useState } from 'react';
import { ChevronDown, Sparkles, Plus } from 'lucide-react';
import type { LifePhase } from '../../lib/riverMath';
import { sortPhases, categoryOf } from '../../lib/riverMath';
import { useLifePhases } from '../../hooks/useLifePhases';
import { RiverCanvas } from './river-canvas';
import { EmptyRiver } from './empty-river';
import { PhaseDrawer } from './phase-drawer';
import { PhaseFormDialog } from './phase-form-dialog';

export function LifeRiver() {
  const { phases, loading, error, summary, loadPhases } = useLifePhases();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sorted = sortPhases(phases);
  const openPhase = sorted.find(p => p.id === openId) ?? null;

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-medium text-zinc-300">River of Years</span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/70 hover:text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add phase
        </button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-zinc-500 text-sm">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-[12px] text-red-400/90 text-center py-8">Failed to load life phases.</p>
      ) : sorted.length === 0 ? (
        <EmptyRiver onCreate={() => setShowForm(true)} />
      ) : (
        <>
          {summary?.journeySummary && (
            <div className="mb-3">
              <button
                onClick={() => setShowSummary(s => !s)}
                className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-amber-400/80 hover:text-amber-300"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showSummary ? 'rotate-180' : ''}`} />
                Journey summary
              </button>
              {showSummary && (
                <p className="mt-2 text-[13px] italic font-serif text-zinc-300 leading-relaxed">
                  {summary.journeySummary}
                </p>
              )}
            </div>
          )}

          <div ref={containerRef} className="overflow-x-auto">
            <RiverCanvas phases={sorted} onPhaseClick={setOpenId} />
          </div>
        </>
      )}

      {openPhase && (
        <PhaseDrawer
          phase={openPhase}
          phases={sorted}
          onClose={() => setOpenId(null)}
          onSave={async p => { await loadPhases(); setOpenId(p.id); }}
        />
      )}

      {showForm && (
        <PhaseFormDialog
          onClose={() => setShowForm(false)}
          onSave={async p => {
            await loadPhases();
            setShowForm(false);
            setOpenId(p.id);
          }}
        />
      )}
    </div>
  );
}
```

## 4.4 `src/components/life-river/river-canvas.tsx` (VERBATIM — the SVG river)

```tsx
import { useMemo } from 'react';
import type { LifePhase } from '../../lib/riverMath';
import { PHASE_CATEGORIES, categoryOf, timeToX, reachHeight, MONTHS, phaseSpanLabel } from '../../lib/riverMath';

const RIVER_H = 240;
const BASELINE = 180;
const TRIBUTARY_COLORS: Record<string, string> = {
  growth: '#6fb38f',
  career: '#5ab0c9',
  love: '#e8866b',
  challenge: '#f87171',
  joy: '#fbbf24',
  rest: '#a78bfa',
  adventure: '#2dd4bf',
  creation: '#f472b6',
};

interface RiverCanvasProps {
  phases: LifePhase[];
  onPhaseClick: (id: string) => void;
}

export function RiverCanvas({ phases, onPhaseClick }: RiverCanvasProps) {
  const { width, lanes } = useMemo(() => {
    const width = Math.max(phases.length * 160, 600);
    const lanes: LifePhase[][] = [];
    const laneEnds: number[] = [];
    const placed = phases.slice().sort((a, b) => (a.startYear * 12 + a.startMonth) - (b.startYear * 12 + b.startMonth));
    placed.forEach(phase => {
      const { startX, endX } = timeToX(phase, width);
      let lane = 0;
      while (laneEnds[lane] !== undefined && laneEnds[lane] > startX) lane++;
      lanes[lane] = lanes[lane] ?? [];
      lanes[lane].push(phase);
      laneEnds[lane] = endX;
    });
    return { width, lanes };
  }, [phases]);

  const now = new Date();
  const nowM = now.getFullYear() * 12 + now.getMonth();
  const nowX = useMemo(() => {
    if (phases.length === 0) return 0;
    const first = phases[0];
    const birth = first.startYear * 12 + (first.startMonth - 1);
    return ((nowM - birth) / Math.max(nowM - birth, 1)) * width;
  }, [phases, nowM, width]);

  const yOfLane = (lane: number) => BASELINE - lane * 40;

  return (
    <svg width={width} height={RIVER_H} className="block" viewBox={`0 0 ${width} ${RIVER_H}`}>
      <defs>
        <linearGradient id="riverWater" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      <rect y={BASELINE} width={width} height={RIVER_H - BASELINE} fill="url(#riverWater)" rx={4} />
      <line x1={0} y1={BASELINE} x2={width} y2={BASELINE} stroke="#38bdf8" strokeOpacity={0.5} strokeWidth={1.5} />

      {phases.map(phase => {
        const { startX, endX } = timeToX(phase, width);
        const lane = lanes.findIndex(l => l.includes(phase));
        const y = yOfLane(lane);
        const h = reachHeight(phase);
        const cat = categoryOf(phase);
        const color = cat.color;
        return (
          <g key={phase.id} onClick={() => onPhaseClick(phase.id)} className="cursor-pointer">
            <path
              d={`M ${startX} ${y + h} C ${startX + 20} ${y}, ${endX - 20} ${y}, ${endX} ${y + h}`}
              stroke={color}
              strokeWidth={h * 0.85}
              fill="none"
              strokeOpacity={0.9}
              strokeLinecap="round"
            />
            {phase.milestones?.map((m, i) => (
              <circle
                key={i}
                cx={startX + ((endX - startX) * (i + 1)) / (phase.milestones!.length + 1)}
                cy={y + h / 2}
                r={3}
                fill="#fff"
                stroke={color}
                strokeWidth={1.5}
              />
            ))}
            <text x={(startX + endX) / 2} y={y - 6} textAnchor="middle" fill="#d4d4d8" fontSize={11} fontWeight={500}>
              {phase.title}
            </text>
            <text x={(startX + endX) / 2} y={y + 10} textAnchor="middle" fill="#71717a" fontSize={9}>
              {phaseSpanLabel(phase)}
            </text>
          </g>
        );
      })}

      <line x1={nowX} y1={0} x2={nowX} y2={RIVER_H} stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 4" />
      <text x={nowX + 6} y={18} fill="#fbbf24" fontSize={10}>Now</text>
    </svg>
  );
}
```

## 4.5 `src/components/life-river/phase-drawer.tsx` (VERBATIM — color picker + details)

```tsx
import { useState } from 'react';
import { X, Trash2, Sparkles, Pencil, ArrowRight } from 'lucide-react';
import type { LifePhase, EraTrends } from '../../lib/riverMath';
import { categoryOf, phaseSpanLabel, phaseAgeLabel, magnitudeWords, PHASE_CATEGORIES } from '../../lib/riverMath';
import { useLifePhases } from '../../hooks/useLifePhases';
import { ReflectionFlow } from './reflection-flow';
import { EraTrendsCard } from './era-trends-card';

const COLOR_CHOICES = [
  '#e8866b', '#6fb38f', '#fbbf24', '#5ab0c9', '#f87171',
  '#a78bfa', '#2dd4bf', '#f472b6', '#71717a', '#38bdf8',
];

interface PhaseDrawerProps {
  phase: LifePhase;
  phases: LifePhase[];
  onClose: () => void;
  onSave: (phase: LifePhase) => void;
}

export function PhaseDrawer({ phase, phases, onClose, onSave }: PhaseDrawerProps) {
  const { aiReflect, aiEraTrends, deletePhase } = useLifePhases();
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [trendsOpen, setTrendsOpen] = useState(false);
  const [reflection, setReflection] = useState(phase.reflection ?? '');
  const [eraTrends, setEraTrends] = useState<EraTrends>(phase.eraTrends ?? {});
  const [current, setCurrent] = useState<LifePhase>(phase);

  const cat = categoryOf(current);
  const color = current.color ?? cat.color;

  const saveReflection = async () => {
    await onSave({ ...current, reflection });
    setReflectionOpen(false);
  };

  const saveTrends = async () => {
    await onSave({ ...current, eraTrends });
    setTrendsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md bg-zinc-900 border-l border-zinc-800 h-full overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-sm font-medium text-zinc-200">{current.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {confirmDelete ? (
              <>
                <button onClick={() => void deletePhase(current.id).then(onClose)} className="text-[11px] px-2 py-1 rounded-md bg-red-500/20 text-red-400">Confirm</button>
                <button onClick={() => setConfirmDelete(false)} className="text-[11px] px-2 py-1 rounded-md bg-zinc-800 text-zinc-400">Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="w-7 h-7 grid place-items-center rounded-md text-zinc-500 hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-md text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
              {phaseSpanLabel(current)} · {phaseAgeLabel(current)}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
              {cat.label} · {magnitudeWords(current.magnitude ?? 3)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowColorPicker(s => !s)}
              className="flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-lg bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/70"
            >
              <span className="w-3 h-3 rounded-full" style={{ background: color }} />
              Color
            </button>
            {showColorPicker && (
              <div className="flex gap-1.5 flex-wrap">
                {COLOR_CHOICES.map(c => (
                  <button
                    key={c}
                    onClick={() => { setCurrent({ ...current, color: c }); setShowColorPicker(false); }}
                    className={`w-5 h-5 rounded-full ${current.color === c ? 'ring-2 ring-white/70' : ''}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            )}
          </div>

          {current.description && <p className="text-[13px] text-zinc-400 leading-relaxed">{current.description}</p>}

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setReflectionOpen(true)} className="flex items-center justify-between text-[11px] px-3 py-2 rounded-lg bg-zinc-800/40 text-zinc-300 hover:bg-zinc-700/40">
              <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Reflection</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button onClick={() => setTrendsOpen(true)} className="flex items-center justify-between text-[11px] px-3 py-2 rounded-lg bg-zinc-800/40 text-zinc-300 hover:bg-zinc-700/40">
              <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Era trends</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {current.milestones && current.milestones.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1.5">Milestones</div>
              <div className="space-y-1">
                {current.milestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] text-zinc-400">
                    <span className="w-1 h-1 rounded-full" style={{ background: color }} />
                    {m}
                  </div>
                ))}
              </div>
            </div>
          )}

          {current.connections && current.connections.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1.5">Connected phases</div>
              <div className="flex flex-wrap gap-1.5">
                {current.connections.map(id => {
                  const p = phases.find(x => x.id === id);
                  return p ? (
                    <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{p.title}</span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          <button onClick={() => onSave(current)} disabled={saving} className="w-full py-2 rounded-lg text-[12px] font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export { ReflectionFlow, EraTrendsCard };
```

## 4.6 `src/components/life-river/phase-form-dialog.tsx` (VERBATIM — new-phase dialog)

```tsx
import { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { LifePhase } from '../../lib/riverMath';
import { PHASE_CATEGORIES, uid } from '../../lib/riverMath';
import { useLifePhases } from '../../hooks/useLifePhases';

interface PhaseFormDialogProps {
  onClose: () => void;
  onSave: (phase: LifePhase) => void;
}

export const EMPTY_PHASE: Omit<LifePhase, 'id'> = {
  title: '',
  description: '',
  category: 'growth',
  startMonth: 1,
  startYear: new Date().getFullYear() - 1,
  endMonth: 12,
  endYear: new Date().getFullYear() - 1,
  magnitude: 3,
};

export function PhaseFormDialog({ onClose, onSave }: PhaseFormDialogProps) {
  const { savePhase } = useLifePhases();
  const [form, setForm] = useState<Omit<LifePhase, 'id'>>(EMPTY_PHASE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    try {
      setSaving(true);
      const phase: LifePhase = { ...form, id: uid() };
      await savePhase(phase);
      onSave(phase);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-zinc-200">New phase</span>
          <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-md text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Phase title (e.g. College years)"
            className="w-full bg-zinc-800/70 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 outline-none focus:border-amber-500/50"
          />
          <textarea
            value={form.description ?? ''}
            onChange={e => set('description', e.target.value)}
            placeholder="What happened in this phase?"
            rows={3}
            className="w-full bg-zinc-800/70 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 outline-none focus:border-amber-500/50 resize-none"
          />

          <div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1.5">Category</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(PHASE_CATEGORIES).map(([key, cat]) => (
                <button
                  key={key}
                  onClick={() => set('category', key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${
                    form.category === key ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  style={form.category === key ? { background: `${cat.color}33`, border: `1px solid ${cat.color}66` } : { background: 'transparent', border: '1px solid transparent' }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Start</label>
              <input type="number" min={1} max={12} value={form.startMonth} onChange={e => set('startMonth', Number(e.target.value))} className="w-full bg-zinc-800/70 border border-zinc-700 rounded-md px-2 py-1.5 text-[12px] text-zinc-200" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Year</label>
              <input type="number" value={form.startYear} onChange={e => set('startYear', Number(e.target.value))} className="w-full bg-zinc-800/70 border border-zinc-700 rounded-md px-2 py-1.5 text-[12px] text-zinc-200" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">End</label>
              <input type="number" min={1} max={12} value={form.endMonth} onChange={e => set('endMonth', Number(e.target.value))} className="w-full bg-zinc-800/70 border border-zinc-700 rounded-md px-2 py-1.5 text-[12px] text-zinc-200" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Year</label>
              <input type="number" value={form.endYear} onChange={e => set('endYear', Number(e.target.value))} className="w-full bg-zinc-800/70 border border-zinc-700 rounded-md px-2 py-1.5 text-[12px] text-zinc-200" />
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1.5">Magnitude ({form.magnitude ?? 3}/5)</div>
            <input
              type="range" min={1} max={5} value={form.magnitude ?? 3}
              onChange={e => set('magnitude', Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          {error && <p className="text-[11px] text-red-400">{error}</p>}

          <button
            onClick={() => void submit()}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Create phase'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## 4.7 `src/components/life-river/reflection-flow.tsx` (VERBATIM — AI reflection Q&A flow)

```tsx
import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import type { LifePhase } from '../../lib/riverMath';
import { useLifePhases } from '../../hooks/useLifePhases';

const QUESTIONS = [
  'What did you build or learn here?',
  'Who mattered during this phase?',
  'What would you tell your past self?',
];

interface ReflectionFlowProps {
  phase: LifePhase;
  onClose: () => void;
  onComplete: (reflection: string) => void;
}

export function ReflectionFlow({ phase, onClose, onComplete }: ReflectionFlowProps) {
  const { aiReflect } = useLifePhases();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = async () => {
    if (!answer.trim()) return;
    const nextAnswers = [...answers, answer.trim()];
    setAnswers(nextAnswers);
    setAnswer('');
    if (step < QUESTIONS.length - 1) { setStep(step + 1); return; }
    setBusy(true);
    setError(null);
    try {
      const joined = nextAnswers.join('\n');
      const result = await aiReflect(phase.id);
      onComplete((result?.reflection as string) ?? joined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI reflection failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[210] grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-200">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Reflection
          </span>
          <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-md text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>

        {busy ? (
          <div className="py-8 text-center text-zinc-400 text-sm">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin mx-auto mb-2" />
            Reflecting on this phase...
          </div>
        ) : (
          <>
            <div className="flex gap-1 mb-3">
              {QUESTIONS.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-amber-400/70' : 'bg-zinc-800'}`} />
              ))}
            </div>
            <p className="text-[13px] text-zinc-300 mb-2">{QUESTIONS[step]}</p>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              rows={3}
              autoFocus
              className="w-full bg-zinc-800/70 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 outline-none focus:border-amber-500/50 resize-none"
            />
            {error && <p className="text-[11px] text-red-400 mt-2">{error}</p>}
            <button
              onClick={() => void next()}
              disabled={!answer.trim() || busy}
              className="mt-3 w-full py-2 rounded-lg text-[12px] font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-40"
            >
              {step < QUESTIONS.length - 1 ? 'Next' : 'Generate reflection'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

## 4.8 `src/components/life-river/era-trends-card.tsx` (VERBATIM)

```tsx
import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import type { LifePhase, EraTrends } from '../../lib/riverMath';
import { useLifePhases } from '../../hooks/useLifePhases';

const FIELDS: { key: keyof EraTrends; label: string }[] = [
  { key: 'world', label: 'World events' },
  { key: 'culture', label: 'Culture & media' },
  { key: 'field', label: 'Your field' },
];

interface EraTrendsCardProps {
  phase: LifePhase;
  onClose: () => void;
  onComplete: (trends: EraTrends) => void;
}

export function EraTrendsCard({ phase, onClose, onComplete }: EraTrendsCardProps) {
  const { aiEraTrends } = useLifePhases();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await aiEraTrends(phase.id);
      onComplete((result?.eraTrends as EraTrends) ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI era trends failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[210] grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-200">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Era trends
          </span>
          <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-md text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>

        <p className="text-[12px] text-zinc-400 mb-3">
          What was happening in the world during {phase.title}?
        </p>

        {busy ? (
          <div className="py-8 text-center text-zinc-400 text-sm">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin mx-auto mb-2" />
            Researching the era...
          </div>
        ) : (
          <button onClick={() => void generate()} className="w-full py-2 rounded-lg text-[12px] font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30">
            Generate era trends
          </button>
        )}

        {error && <p className="text-[11px] text-red-400 mt-2">{error}</p>}
      </div>
    </div>
  );
}
```

## 4.9 `src/components/life-river/empty-river.tsx` (VERBATIM)

```tsx
import { Sparkles } from 'lucide-react';

interface EmptyRiverProps {
  onCreate: () => void;
}

export const EXAMPLE_PLAN = [
  { title: 'Childhood', category: 'growth' },
  { title: 'College', category: 'creation' },
  { title: 'First job', category: 'career' },
  { title: 'Adventure abroad', category: 'adventure' },
];

export function EmptyRiver({ onCreate }: EmptyRiverProps) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 grid place-items-center mb-3">
        <Sparkles className="w-5 h-5 text-amber-400" />
      </div>
      <p className="text-[13px] text-zinc-300 mb-1">Map your life as a river</p>
      <p className="text-[12px] text-zinc-500 mb-4">Add phases — school, work, love, adventure — and see your whole story flow.</p>
      <button onClick={onCreate} className="px-4 py-2 rounded-lg text-[12px] font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors">
        Add your first phase
      </button>
      <div className="mt-5 flex flex-wrap justify-center gap-1.5">
        {EXAMPLE_PLAN.map((p, i) => (
          <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-zinc-800/70 text-zinc-500">{p.title}</span>
        ))}
      </div>
    </div>
  );
}
```
