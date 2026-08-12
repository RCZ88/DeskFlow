import { useEffect, useState } from 'react';
import { Layers, AppWindow, Globe, Tag, Save, AlertTriangle, Loader2 } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [knownApps, setKnownApps] = useState<KnownApp[]>([]);
  const [knownSites, setKnownSites] = useState<KnownApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(group?.name ?? '');
    setDescription(group?.description ?? '');
    setApps(group?.allowed_apps ?? []);
    setDomains(group?.allowed_domains ?? []);
    setCategories(group?.allowed_categories ?? []);
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
    if (api?.getKnownSites) {
      api.getKnownSites()
        .then((rows: KnownApp[]) => {
          if (!cancelled) setKnownSites(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {
          if (!cancelled) setKnownSites([]);
        });
    }
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
              <FocusAppPicker
                knownApps={knownApps.filter(a => !a.is_browser_tracking)}
                selected={apps}
                onChange={setApps}
              />
            )}
          </div>

          <div>
            {fieldLabel(<Globe className="w-3 h-3" />, 'Allowed sites')}
            <FocusAppPicker
              knownApps={knownSites}
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
              knownApps={
                [...new Set(knownApps.map(a => a.category).filter(Boolean))]
                  .sort()
                  .map(c => ({ app: c, category: '', last_used: '' }))
              }
              selected={categories}
              onChange={setCategories}
              placeholder="Type or pick a category…"
              emptyText="No tracked categories yet — type one to add"
              addLabel="custom category"
            />
          </div>

          {apps.length === 0 && domains.length === 0 && categories.length === 0 && (
            <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              Nothing allowed yet. Strict mode will block everything not listed.
            </p>
          )}

          <p className="text-[10px] text-zinc-600 leading-relaxed">
            Strictness and duration are picked when you start a session — daily goals are set in the Focus goals card.
          </p>

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
