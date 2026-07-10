import { useEffect, useMemo, useRef, useState } from 'react';
import { GitBranch, Play, Pause, Square, ArrowUpCircle, FolderOpen } from 'lucide-react';
import OrgTreeGraph, { ConductorNodeVM, ConductorMessageVM } from '../components/conductor/OrgTreeGraph';
import ApprovalInbox, { EscalationItemVM } from '../components/conductor/ApprovalInbox';
import SwarmTrace, { SwarmTraceMessageVM } from '../components/conductor/SwarmTrace';

type AutonomyLevelVM = 'L2' | 'L3' | 'L4';

interface MissionSnapshot {
  id: string;
  repoRoot: string;
  objective: string;
  agentType: string;
  autonomyLevel: AutonomyLevelVM;
  status: 'running' | 'paused' | 'killed';
  userBranch: string;
  integrationBranch: string;
  nodes: ConductorNodeVM[];
  messages: ConductorMessageVM[];
  escalations: EscalationItemVM[];
  pendingChildren: unknown[];
  createdAt: number;
}

interface MissionSummary {
  id: string;
  repoRoot: string;
  objective: string;
  status: 'running' | 'paused' | 'killed';
  autonomyLevel: AutonomyLevelVM;
  nodeCount: number;
  activeCount: number;
  pendingEscalations: number;
  createdAt: number;
}

function getDeskflowAPI(): Record<string, any> {
  return (window as unknown as { deskflowAPI: Record<string, any> }).deskflowAPI;
}

const AUTONOMY_LABEL: Record<AutonomyLevelVM, string> = {
  L2: 'L2 — approve every step',
  L3: 'L3 — approve risky steps',
  L4: 'L4 — fully autonomous',
};

export default function ConductorPage() {
  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<MissionSnapshot | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [repoRoot, setRepoRoot] = useState('');
  const [objective, setObjective] = useState('');
  const [agentType, setAgentType] = useState('claude');
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevelVM>('L3');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const selectedMissionIdRef = useRef<string | null>(null);
  useEffect(() => { selectedMissionIdRef.current = selectedMissionId; }, [selectedMissionId]);

  function refreshMissions() {
    const api = getDeskflowAPI();
    api.conductorListMissions().then((res: any) => {
      if (res && res.success) setMissions(res.data || []);
    }).catch(() => { });
  }

  useEffect(() => {
    refreshMissions();
    const api = getDeskflowAPI();
    const offSnapshot = api.onConductorSnapshot((snap: MissionSnapshot) => {
      if (!snap) return;
      if (selectedMissionIdRef.current === snap.id) setSnapshot(snap);
      refreshMissions();
    });
    return () => { if (typeof offSnapshot === 'function') offSnapshot(); };
  }, []);

  useEffect(() => {
    if (!selectedMissionId) { setSnapshot(null); return; }
    const api = getDeskflowAPI();
    api.conductorGetSnapshot(selectedMissionId).then((res: any) => {
      if (res && res.success) setSnapshot(res.data);
    }).catch(() => { });
  }, [selectedMissionId]);

  async function handlePickFolder() {
    const api = getDeskflowAPI();
    const result = await api.pickFolder();
    const folder = typeof result === 'string' ? result : (result && result.path) || '';
    if (folder) setRepoRoot(folder);
  }

  async function handleStart() {
    if (!repoRoot.trim() || !objective.trim()) return;
    setStarting(true);
    setStartError(null);
    const api = getDeskflowAPI();
    try {
      const res = await api.conductorStart({ repoRoot: repoRoot.trim(), objective: objective.trim(), agentType, autonomyLevel });
      if (res && res.success) {
        setSelectedMissionId(res.data.id);
        setSnapshot(res.data);
        setObjective('');
        refreshMissions();
      } else {
        setStartError((res && res.error) || 'Failed to start mission.');
      }
    } catch (e: any) {
      setStartError(e?.message || 'Failed to start mission.');
    } finally {
      setStarting(false);
    }
  }

  function callMissionAction(name: string) {
    if (!selectedMissionId) return;
    const api = getDeskflowAPI();
    api[name](selectedMissionId).then((res: any) => {
      if (res && res.success) setSnapshot(res.data);
    }).catch(() => { });
  }

  function handleAutonomyChange(level: AutonomyLevelVM) {
    if (!selectedMissionId) return;
    const api = getDeskflowAPI();
    api.conductorSetAutonomy(selectedMissionId, level).then((res: any) => {
      if (res && res.success) setSnapshot(res.data);
    }).catch(() => { });
  }

  function handleResolveEscalation(escalationId: string, decision: 'approved' | 'rejected', note?: string) {
    if (!selectedMissionId) return;
    const api = getDeskflowAPI();
    api.conductorResolveEscalation(selectedMissionId, escalationId, decision, note).then((res: any) => {
      if (res && res.success) setSnapshot(res.data);
    }).catch(() => { });
  }

  const selectedNode = useMemo(() => {
    if (!snapshot || !selectedNodeId) return null;
    return snapshot.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [snapshot, selectedNodeId]);

  return (
    <div className="flex h-full min-h-0">
      <div className="w-72 border-r border-zinc-800 flex flex-col min-h-0">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <GitBranch className="w-4 h-4 text-[color:var(--page-accent)]" />
            Conductor
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Autonomous multi-agent missions</div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
          {missions.length === 0 && (
            <div className="text-[11px] text-zinc-500 italic px-1">No missions yet.</div>
          )}
          {missions.map((m) => {
            const active = m.id === selectedMissionId;
            return (
              <button
                key={m.id}
                onClick={() => { setSelectedMissionId(m.id); setSelectedNodeId(null); }}
                className={`text-left rounded-lg border px-3 py-2 text-[11.5px] transition-colors ${active ? 'border-[color:var(--page-accent)] bg-zinc-900' : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900'}`}
              >
                <div className="font-medium text-zinc-200 truncate">{m.objective}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-2">
                  <span>{m.status}</span>
                  <span>·</span>
                  <span>{m.activeCount}/{m.nodeCount} active</span>
                  {m.pendingEscalations > 0 && <span className="text-amber-400">{m.pendingEscalations} pending</span>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-3 border-t border-zinc-800 flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">New mission</div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={repoRoot}
              placeholder="Repo folder..."
              className="flex-1 min-w-0 rounded-md bg-zinc-950 border border-zinc-700 px-2 py-1.5 text-[11px] text-zinc-200 placeholder-zinc-600"
            />
            <button onClick={handlePickFolder} className="rounded-md bg-zinc-800 p-1.5 text-zinc-300 ring-1 ring-inset ring-zinc-700">
              <FolderOpen size={14} />
            </button>
          </div>
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Mission objective..."
            rows={3}
            className="rounded-md bg-zinc-950 border border-zinc-700 px-2 py-1.5 text-[11px] text-zinc-200 placeholder-zinc-600 resize-none"
          />
          <select
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
            className="rounded-md bg-zinc-950 border border-zinc-700 px-2 py-1.5 text-[11px] text-zinc-200"
          >
            <option value="claude">Claude</option>
            <option value="codex">Codex</option>
            <option value="opencode">opencode</option>
          </select>
          <select
            value={autonomyLevel}
            onChange={(e) => setAutonomyLevel(e.target.value as AutonomyLevelVM)}
            className="rounded-md bg-zinc-950 border border-zinc-700 px-2 py-1.5 text-[11px] text-zinc-200"
          >
            <option value="L2">{AUTONOMY_LABEL.L2}</option>
            <option value="L3">{AUTONOMY_LABEL.L3}</option>
            <option value="L4">{AUTONOMY_LABEL.L4}</option>
          </select>
          {startError && <div className="text-[10.5px] text-red-400">{startError}</div>}
          <button
            onClick={handleStart}
            disabled={starting || !repoRoot.trim() || !objective.trim()}
            className="rounded-md bg-[color:var(--page-accent)] px-3 py-1.5 text-[11.5px] font-medium text-zinc-950 disabled:opacity-40"
          >
            {starting ? 'Starting\u2026' : 'Start mission'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {!snapshot && (
          <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
            Select or start a mission to see the swarm.
          </div>
        )}
        {snapshot && (
          <>
            <div className="p-3 border-b border-zinc-800 flex items-center gap-2 flex-wrap">
              <div className="text-[12px] text-zinc-300 font-medium truncate max-w-[360px]">{snapshot.objective}</div>
              <span className="text-[10.5px] text-zinc-500">{snapshot.repoRoot}</span>
              <div className="ml-auto flex items-center gap-1.5">
                <select
                  value={snapshot.autonomyLevel}
                  onChange={(e) => handleAutonomyChange(e.target.value as AutonomyLevelVM)}
                  className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1 text-[10.5px] text-zinc-300"
                >
                  <option value="L2">L2</option>
                  <option value="L3">L3</option>
                  <option value="L4">L4</option>
                </select>
                {snapshot.status === 'running' ? (
                  <button onClick={() => callMissionAction('conductorPause')} className="rounded-md bg-zinc-800 p-1.5 text-zinc-300 ring-1 ring-inset ring-zinc-700" title="Pause">
                    <Pause size={13} />
                  </button>
                ) : (
                  <button onClick={() => callMissionAction('conductorResume')} className="rounded-md bg-zinc-800 p-1.5 text-zinc-300 ring-1 ring-inset ring-zinc-700" title="Resume">
                    <Play size={13} />
                  </button>
                )}
                <button onClick={() => callMissionAction('conductorKill')} className="rounded-md bg-zinc-800 p-1.5 text-red-400 ring-1 ring-inset ring-zinc-700" title="Kill">
                  <Square size={13} />
                </button>
                <button onClick={() => callMissionAction('conductorPromoteIntegration')} className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1.5 text-[10.5px] text-zinc-300 ring-1 ring-inset ring-zinc-700" title="Merge integration branch into your branch">
                  <ArrowUpCircle size={13} /> Promote
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex">
              <div className="flex-1 min-h-0 overflow-hidden border-r border-zinc-800">
                <OrgTreeGraph
                  nodes={snapshot.nodes}
                  recentMessages={snapshot.messages}
                  selectedId={selectedNodeId}
                  onSelect={setSelectedNodeId}
                />
              </div>
              <div className="w-80 min-h-0 flex flex-col">
                <div className="p-3 border-b border-zinc-800 max-h-[45%] overflow-y-auto">
                  <ApprovalInbox escalations={snapshot.escalations} onResolve={handleResolveEscalation} />
                </div>
                <div className="flex-1 min-h-0 p-3">
                  <SwarmTrace messages={snapshot.messages as unknown as SwarmTraceMessageVM[]} onSelectActor={setSelectedNodeId} />
                </div>
              </div>
            </div>

            {selectedNode && (
              <div className="border-t border-zinc-800 p-3 text-[11px] text-zinc-400 flex items-center gap-3 flex-wrap">
                <span className="font-medium text-zinc-200">{selectedNode.role}</span>
                <span>{selectedNode.objective}</span>
                <span className="ml-auto text-zinc-500">status: {selectedNode.status} · retries: {selectedNode.retries}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
