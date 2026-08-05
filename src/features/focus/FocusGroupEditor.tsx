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

interface FocusGroupEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: FocusGroup | null;
  onSave: (draft: GroupDraft) => Promise<boolean>;
}

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
