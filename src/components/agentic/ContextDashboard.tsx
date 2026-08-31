import { useCallback, useEffect, useState } from 'react';
import { LayoutDashboard, MessageSquare, Brain, Users, Target, Activity } from 'lucide-react';

interface Mission { id: string; objective: string; status: string; created_at?: string; }
interface AgentMsg { id: string; status: string; }
interface BrainMem { id: string; }

export function ContextDashboard() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [messages, setMessages] = useState<AgentMsg[]>([]);
  const [memories, setMemories] = useState<BrainMem[]>([]);
  const [sessions, setSessions] = useState<number>(0);
  const [groups, setGroups] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const api: any = (window as any).deskflowAPI;

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      if (api.mission?.list) {
        const r = await api.mission.list();
        setMissions(Array.isArray(r?.missions) ? r.missions : []);
      }
      if (api.agent?.getMessages) {
        const r = await api.agent.getMessages({});
        setMessages(Array.isArray(r?.messages) ? r.messages : []);
      }
      if (api.brain?.listMemories) {
        const r = await api.brain.listMemories({ limit: 200 });
        setMemories(Array.isArray(r?.memories) ? r.memories : []);
      }
      if (api.sessionGroup?.list) {
        const r = await api.sessionGroup.list();
        setGroups(Array.isArray(r?.groups) ? r.groups.length : 0);
      }
    } catch {
      // non-fatal dashboard
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const cards = [
    { label: 'Missions', value: missions.length, Icon: Target, color: 'text-amber-400' },
    { label: 'Agent Messages', value: messages.length, Icon: MessageSquare, color: 'text-sky-400' },
    { label: 'Brain Memories', value: memories.length, Icon: Brain, color: 'text-violet-400' },
    { label: 'Session Groups', value: groups, Icon: Users, color: 'text-teal-400' },
  ];

  const msgByStatus = messages.reduce((acc: Record<string, number>, m: AgentMsg) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={16} className="text-indigo-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Context Overview</h3>
        </div>
        {loading && <Activity size={14} className="text-zinc-500 animate-pulse" />}
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 flex items-center gap-3">
            <c.Icon size={18} className={c.color} />
            <div>
              <div className="text-2xl font-semibold text-zinc-100">{c.value}</div>
              <div className="text-[11px] text-zinc-500">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4">
        <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">Message status</div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(msgByStatus).length === 0 && <span className="text-xs text-zinc-600">No messages</span>}
          {Object.entries(msgByStatus).map(([k, v]) => (
            <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">{k}: {v}</span>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">Recent missions</div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {missions.length === 0 && <div className="text-xs text-zinc-600">No missions</div>}
          {missions.slice(0, 6).map((m) => (
            <div key={m.id} className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 truncate max-w-[200px]">{m.objective || m.id}</span>
              <span className="text-[10px] text-zinc-500">{m.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ContextDashboard;
