import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Clock, CheckCircle2, Monitor, Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, SelectItem } from '../ui/select';
import type { GoalCategory, GoalTarget, GoalPeriod } from '../dashboard/types';

export interface CriteriaForm {
  title: string;
  description: string;
  category: GoalCategory;
  period: GoalPeriod;
  targetType: GoalTarget['type'];
  targetHours: number;
  targetMinutes: number;
  matchCategory: string;
  detectionEnabled: boolean;
  detectionMode: 'positive' | 'avoidance';
  detectionKeywords: string;
  detectionMinMinutes: number;
  parentId: string;
  links: { label: string; url: string }[];
}

interface CriteriaBuilderProps {
  value: CriteriaForm;
  onChange: (form: CriteriaForm) => void;
  onSave: () => void;
  onCancel: () => void;
  longTermGoals: { id: string; title: string }[];
  isEditing?: boolean;
}

const CATEGORIES: { value: GoalCategory; label: string; color: string }[] = [
  { value: 'work', label: 'Work', color: 'text-pink-400' },
  { value: 'personal', label: 'Personal', color: 'text-violet-400' },
  { value: 'health', label: 'Health', color: 'text-emerald-400' },
  { value: 'learning', label: 'Learning', color: 'text-cyan-400' },
  { value: 'finance', label: 'Finance', color: 'text-amber-400' },
  { value: 'relationships', label: 'Relationships', color: 'text-rose-400' },
];

const APP_CATEGORIES = [
  { value: 'IDE', label: 'IDE / Code Editor' },
  { value: 'AI Tools', label: 'AI Tools' },
  { value: 'Browser', label: 'Browser' },
  { value: 'Productivity', label: 'Productivity' },
  { value: 'Communication', label: 'Communication' },
  { value: 'Design', label: 'Design' },
  { value: 'Entertainment', label: 'Entertainment' },
  { value: 'Education', label: 'Education' },
];

export function CriteriaBuilder({ value, onChange, onSave, onCancel, longTermGoals, isEditing }: CriteriaBuilderProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (patch: Partial<CriteriaForm>) => onChange({ ...value, ...patch });

  const targetSeconds = value.targetType === 'time'
    ? (value.targetHours * 3600) + (value.targetMinutes * 60)
    : undefined;

  return (
    <div className="space-y-3">
      <Input
        value={value.title}
        onChange={e => update({ title: e.target.value })}
        onKeyDown={e => e.key === 'Enter' && value.title.trim() && onSave()}
        placeholder="What do you want to achieve?"
        autoFocus
        className="bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-violet-500/50 text-[13px] h-9"
      />

      <Input
        value={value.description}
        onChange={e => update({ description: e.target.value })}
        placeholder="Add details (optional)"
        className="bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-violet-500/50 text-[13px] h-9"
      />

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={value.category} onValueChange={v => update({ category: v as GoalCategory })} className="w-[110px]">
          {CATEGORIES.map(c => (
            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
          ))}
        </Select>

        <Select value={value.period} onValueChange={v => update({ period: v as GoalPeriod })} className="w-[100px]">
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
        </Select>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={value.targetType} onValueChange={v => update({ targetType: v as GoalTarget['type'] })} className="w-[140px]">
          <SelectItem value="completion">Complete it</SelectItem>
          <SelectItem value="time">Spend time</SelectItem>
        </Select>

        {value.targetType === 'time' && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1.5"
          >
            <Clock size={13} className="text-zinc-500" />
            <Input
              type="number" min={0} max={23}
              value={value.targetHours}
              onChange={e => update({ targetHours: parseInt(e.target.value) || 0 })}
              className="w-14 bg-zinc-900/80 border-zinc-700/50 text-[13px] h-8 text-center"
            />
            <span className="text-[11px] text-zinc-500">h</span>
            <Input
              type="number" min={0} max={59}
              value={value.targetMinutes}
              onChange={e => update({ targetMinutes: parseInt(e.target.value) || 0 })}
              className="w-14 bg-zinc-900/80 border-zinc-700/50 text-[13px] h-8 text-center"
            />
            <span className="text-[11px] text-zinc-500">m</span>
            {targetSeconds && (
              <span className="text-[10px] text-zinc-600 ml-1">
                = {Math.floor(targetSeconds / 3600)}h {Math.floor((targetSeconds % 3600) / 60)}m
              </span>
            )}
          </motion.div>
        )}
      </div>

      {value.targetType === 'time' && (
        <div>
          <label className="text-[11px] text-zinc-500 mb-1 block">Track time spent in category:</label>
          <Select value={value.matchCategory || ''} onValueChange={v => update({ matchCategory: v })} className="w-full">
            <SelectItem value="">Any app (total tracked time)</SelectItem>
            {APP_CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </Select>
          <p className="text-[10px] text-zinc-600 mt-1">Auto-track progress from foreground app usage.</p>
        </div>
      )}

      {longTermGoals.length > 0 && (
        <Select value={value.parentId} onValueChange={v => update({ parentId: v })} className="w-full">
          <SelectItem value="">Link to long-term goal (optional)</SelectItem>
          {longTermGoals.map(ltg => (
            <SelectItem key={ltg.id} value={ltg.id}>{ltg.title}</SelectItem>
          ))}
        </Select>
      )}

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
      >
        {showAdvanced ? '−' : '+'} Advanced: Detection & Criteria
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-3 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/40"
          >
            <div className="flex items-center gap-2">
              <Monitor size={13} className="text-zinc-500" />
              <label className="flex items-center gap-2 text-[12px] text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.detectionEnabled}
                  onChange={e => update({ detectionEnabled: e.target.checked })}
                  className="rounded border-zinc-600 bg-zinc-800 text-violet-500"
                />
                Auto-detect completion from app usage
              </label>
            </div>

            {value.detectionEnabled && (
              <>
                <div className="flex gap-2">
                  {(['positive', 'avoidance'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => update({ detectionMode: m })}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                        value.detectionMode === m
                          ? m === 'positive'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-zinc-900/60 text-zinc-500 border-zinc-700/50'
                      }`}
                    >
                      {m === 'positive' ? 'Positive (accumulate)' : 'Avoidance (flag)'}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-[11px] text-zinc-500 mb-1 block">
                    <Search size={11} className="inline mr-1" />
                    App/window title keywords (comma-separated):
                  </label>
                  <Input
                    value={value.detectionKeywords}
                    onChange={e => update({ detectionKeywords: e.target.value })}
                    placeholder="e.g. VS Code, Duolingo, Figma"
                    className="bg-zinc-900/80 border-zinc-700/50 text-[13px] h-8"
                  />
                </div>

                {value.detectionMode === 'positive' && (
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    Mark complete after
                    <Input
                      type="number" min={1}
                      value={value.detectionMinMinutes}
                      onChange={e => update({ detectionMinMinutes: parseInt(e.target.value) || 1 })}
                      className="w-14 bg-zinc-900/80 border-zinc-700/50 text-[13px] h-7 text-center"
                    />
                    minutes detected
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={!value.title.trim()}
          className="px-4 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-[12px] font-medium transition-colors"
        >
          <CheckCircle2 size={12} className="inline mr-1" />
          {isEditing ? 'Save Changes' : 'Add Goal'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 text-[12px] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
