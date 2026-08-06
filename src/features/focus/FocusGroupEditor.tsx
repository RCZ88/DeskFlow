import { useEffect, useState } from 'react';
import { Layers, AppWindow, Globe, Tag, Eye, EyeOff, Save, Activity, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { FocusAppPicker, type KnownApp } from './FocusAppPicker';
import type { GroupDraft, FocusGroup } from '../../hooks/useFocusGroups';

const PRESET_DURATIONS = [5, 10, 15, 25, 50, 90];

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
  const [knownApps, setKnownApps] = useState<KnownApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAppsLoading(true);
    setAppsError(null);
    const api = (window as any).deskflowAPI;
    (api?.getKnownApps ? api.getKnownApps() : Promise.resolve([]))
      .then((rows: KnownApp[]) => {
        if (!cancelled) setKnownApps(Array.isArray(rows) ? rows : []);
      })
      .catch((e: any) => {
        if (!cancelled) setAppsError(String(e?.message ?? e) || 'Could not fetch tracked apps');
      })
      .finally(() => {
        if (!cancelled) setAppsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

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

  const fieldLabel = (icon: React.ReactNode, label: string) => (
    <span className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1 mb-1.5">
      {icon}
      {label}
    </span>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border border-zinc-800/60 max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-pink-400" />
            {group ? 'Edit focus group' : 'New focus group'}
          </DialogTitle>
          <DialogDescription>
            A named set of apps, sites and categories that define what a focus session is allowed to use.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto min-h-0 ws-scroll pr-1">
          <div>
            {fieldLabel(null, 'Name')}
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Development"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-800/50 outline-none text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-pink-500/40"
            />
          </div>

          <div>
            {fieldLabel(null, 'Description')}
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional — what is this group for?"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-800/50 outline-none text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-pink-500/40"
            />
          </div>

          <div>
            {fieldLabel(<AppWindow className="w-3 h-3" />, 'Allowed apps')}
            {appsLoading ? (
              <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-800/50 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-pink-400 animate-spin" />
                <span className="text-[11px] text-zinc-500">Loading tracked apps…</span>
              </div>
            ) : appsError ? (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <p className="text-[11px] text-rose-300">{appsError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setAppsLoading(true);
                    setAppsError(null);
                    const api = (window as any).deskflowAPI;
                    (api?.getKnownApps ? api.getKnownApps() : Promise.resolve([]))
                      .then((rows: KnownApp[]) => setKnownApps(Array.isArray(rows) ? rows : []))
                      .catch((e: any) => setAppsError(String(e?.message ?? e) || 'Could not fetch tracked apps'))
                      .finally(() => setAppsLoading(false));
                  }}
                  className="text-[11px] text-pink-300 hover:text-pink-200 mt-1.5 underline"
                >
                  Retry
                </button>
              </div>
            ) : (
              <FocusAppPicker knownApps={knownApps} selected={apps} onChange={setApps} />
            )}
          </div>

          <div>
            {fieldLabel(<Globe className="w-3 h-3" />, 'Allowed sites')}
            <FocusAppPicker
              knownApps={[]}
              selected={domains}
              onChange={setDomains}
              placeholder="Type to add sites…"
              emptyText="Type a site domain, e.g. github.com"
              addLabel="custom site"
            />
          </div>

          <div>
            {fieldLabel(<Tag className="w-3 h-3" />, 'Allowed categories')}
            <FocusAppPicker
              knownApps={[]}
              selected={categories}
              onChange={setCategories}
              placeholder="Type to add categories…"
              emptyText="Type a category, e.g. IDE, AI Tools"
              addLabel="custom category"
            />
          </div>

          {apps.length === 0 && domains.length === 0 && (
            <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              No apps specified. Strict mode will block all apps.
            </p>
          )}

          <div>
            {fieldLabel(strict === 'non_allowed' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />, 'Strictness')}
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
            {fieldLabel(null, 'Default duration')}
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
            {fieldLabel(null, 'Daily goal (minutes)')}
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
            {fieldLabel(<Activity className="w-3 h-3" />, 'Goal category')}
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

        <DialogFooter className="shrink-0">
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
