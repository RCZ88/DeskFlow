import { useCallback, useEffect, useState } from 'react';
import { FolderPlus, Users, X } from 'lucide-react';

interface SessionGroup {
  id: number;
  name: string;
  color: string;
  project_id: string | null;
  created_at?: string;
}

interface TerminalSession {
  id: string;
  name?: string;
  title?: string;
  group_id?: number | null;
}

const PALETTE = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#60a5fa'];

export function SessionGroupPanel() {
  const [groups, setGroups] = useState<SessionGroup[]>([]);
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [creating, setCreating] = useState(false);

  const api: any = (window as any).deskflowAPI;

  const load = useCallback(async () => {
    if (!api?.sessionGroup) return;
    setLoading(true);
    setError(null);
    try {
      const gRes = await api.sessionGroup.list();
      setGroups(Array.isArray(gRes?.groups) ? gRes.groups : []);
      // sessions come from a different source; best-effort load if available
      if (api.terminal?.listSessions) {
        const sRes = await api.terminal.listSessions();
        setSessions(Array.isArray(sRes?.sessions) ? sRes.sessions : []);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async () => {
    if (!name.trim() || !api?.sessionGroup?.create) return;
    setCreating(true);
    try {
      await api.sessionGroup.create({ name: name.trim(), color });
      setName('');
      load();
    } finally {
      setCreating(false);
    }
  }, [api, name, color, load]);

  const remove = useCallback(async (id: number) => {
    if (!api?.sessionGroup?.delete) return;
    await api.sessionGroup.delete(id);
    load();
  }, [api, load]);

  const assign = useCallback(async (sessionId: string, groupId: number | null) => {
    if (!api?.sessionGroup?.assign) return;
    await api.sessionGroup.assign({ sessionId, groupId });
    load();
  }, [api, load]);

  const counts = (gid: number) => sessions.filter((s) => s.group_id === gid).length;

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
        <Users size={16} className="text-teal-400" />
        <h3 className="text-sm font-semibold text-zinc-100">Session Groups</h3>
        <span className="text-xs text-zinc-500">{groups.length}</span>
      </div>

      <div className="p-3 space-y-2 border-b border-zinc-800">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !creating) create(); }}
            placeholder="New group name…"
            className="flex-1 rounded-lg bg-zinc-800/60 px-2 py-1 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-teal-500"
          />
          <div className="flex gap-1 items-center">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ background: c }}
                className={`w-4 h-4 rounded-full ${color === c ? 'ring-2 ring-white/70' : ''}`}
              />
            ))}
          </div>
          <button
            onClick={create}
            disabled={creating || !name.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40 hover:bg-teal-500"
          >
            <FolderPlus size={12} /> {creating ? '…' : 'Create'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-[100px]">
        {loading && <div className="text-xs text-zinc-500 p-3">Loading…</div>}
        {error && <div className="text-xs text-rose-400 p-3">{error}</div>}
        {!loading && !error && groups.length === 0 && (
          <div className="text-xs text-zinc-600 p-3 text-center">No groups yet. Create one to organize terminal sessions.</div>
        )}
        {groups.map((g) => (
          <div key={g.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: g.color }} />
                <span className="text-sm text-zinc-100">{g.name}</span>
                <span className="text-[10px] text-zinc-500">{counts(g.id)} sessions</span>
              </div>
              <button onClick={() => remove(g.id)} className="text-zinc-500 hover:text-rose-400">
                <X size={14} />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {sessions.filter((s) => s.group_id === g.id).map((s) => (
                <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 truncate max-w-[120px]">
                  {s.name || s.title || s.id.slice(0, 8)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SessionGroupPanel;
