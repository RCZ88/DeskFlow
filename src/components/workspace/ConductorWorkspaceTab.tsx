import { useState, useEffect, useCallback } from 'react';
import { Bot, Play, Pause, Square, Activity, CheckCircle, XCircle, Clock, Sparkles, Shield, GitBranch, Coins, BarChart3, Settings, Plus, FolderOpen, Send, Loader2, ChevronDown, ChevronRight, AlertTriangle, AlertCircle } from 'lucide-react';
import { MissionWizard } from '../conductor/MissionWizard';
import { AgentProviderPanel } from '../conductor/AgentProviderPanel';
import { TemplateGallery } from '../conductor/TemplateGallery';
import { BudgetDashboard } from '../conductor/BudgetDashboard';
import { ConductorConfigPanel } from '../conductor/ConductorConfigPanel';
import OrgTreeGraph from '../conductor/OrgTreeGraph';

export function ConductorWorkspaceTab({ activeTab, projectId, repoPath, userBranch }: { activeTab: string; projectId?: string; repoPath?: string; userBranch?: string }) {
  const [missions, setMissions] = useState<any[]>([]);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 8000);
  }, []);

  const refreshMissions = useCallback(async () => {
    if (!(window as any).deskflowAPI?.conductorListMissions) return;
    try {
      const r = await (window as any).deskflowAPI.conductorListMissions();
      if (r?.success) setMissions(r.data || []);
      else showError(r?.error || 'Failed to load missions');
    } catch (e: any) { showError(e?.message || 'Failed to load missions'); }
  }, [showError]);

  useEffect(() => {
    refreshMissions();
    const unsub = (window as any).deskflowAPI?.onConductorSnapshot?.((s: any) => {
      setSnapshot(s);
      if (s?.id) {
        setMissions(prev => {
          const idx = prev.findIndex((m: any) => m.id === s.id);
          if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...s }; return next; }
          return [...prev, s];
        });
      }
    });
    return () => { if (unsub) unsub(); };
  }, [refreshMissions]);

  const loadSnapshot = useCallback(async (missionId: string) => {
    if (!(window as any).deskflowAPI?.conductorGetSnapshot) return;
    try {
      const r = await (window as any).deskflowAPI.conductorGetSnapshot(missionId);
      if (r?.success) setSnapshot(r.data);
    } catch (e: any) { showError(e?.message || 'Failed to load snapshot'); }
  }, [showError]);

  useEffect(() => {
    if (selectedMission) loadSnapshot(selectedMission.id);
  }, [selectedMission, loadSnapshot]);

  const handleLaunch = useCallback(async (config: any) => {
    try {
      const r = await (window as any).deskflowAPI?.conductorStart?.(config);
      if (r?.success) {
        setShowWizard(false);
        await refreshMissions();
      } else {
        showError(r?.error || 'Failed to start mission');
      }
    } catch (e: any) { showError(e?.message || 'Failed to start mission'); }
  }, [refreshMissions, showError]);

  const formatTime = (ts: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ─── Missions Tab ──────────────────────────────────────────────────────
  if (activeTab === 'missions') {
    return (
      <div className="flex flex-col gap-3 p-3 min-h-0 overflow-y-auto">
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-500/10 ring-1 ring-inset ring-red-500/20 p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-300 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Active Missions</h3>
          <button onClick={() => setShowWizard(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 text-[11px] font-medium hover:bg-rose-500/25">
            <Plus className="w-3 h-3" /> New Mission
          </button>
        </div>

        {missions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Bot className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No active missions</p>
            <button onClick={() => setShowWizard(true)} className="mt-3 text-[11px] text-rose-400 hover:text-rose-300 underline">Create your first mission</button>
          </div>
        )}

        {missions.map((m: any) => (
          <div key={m.id} className={`rounded-xl bg-zinc-900/50 ring-1 ring-inset p-3 transition-all ${selectedMission?.id === m.id ? 'ring-rose-500/40' : 'ring-zinc-800/70'}`}>
            <button
              onClick={() => setSelectedMission(selectedMission?.id === m.id ? null : m)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${m.status === 'running' ? 'bg-emerald-500 animate-pulse' : m.status === 'blocked' ? 'bg-amber-500' : m.status === 'killed' ? 'bg-red-500' : 'bg-zinc-500'}`} />
                  <span className="text-xs font-medium text-zinc-200">{m.name || m.objective || 'Untitled mission'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    m.status === 'running' ? 'bg-emerald-500/15 text-emerald-300' :
                    m.status === 'blocked' ? 'bg-amber-500/15 text-amber-300' :
                    m.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' :
                    m.status === 'killed' ? 'bg-red-500/15 text-red-300' :
                    'bg-zinc-700/50 text-zinc-400'
                  }`}>{m.status}</span>
                  {selectedMission?.id === m.id ? <ChevronDown className="w-3 h-3 text-zinc-500" /> : <ChevronRight className="w-3 h-3 text-zinc-500" />}
                </div>
              </div>
              {m.objective && <p className="text-[11px] text-zinc-400 mb-2 line-clamp-2">{m.objective}</p>}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full">
                  <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${m.progress_pct || m.progress?.pct || 0}%` }} />
                </div>
                <span className="text-[10px] text-zinc-500">{Math.round(m.progress_pct || m.progress?.pct || 0)}%</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                {m.autonomy_level && <span>Autonomy: L{m.autonomy_level}</span>}
                {m.created_at && <span>· {formatTime(m.created_at || m.createdAt)}</span>}
              </div>
            </button>

            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-zinc-800/40">
              {m.status === 'running' && (
                <button onClick={async () => { try { await (window as any).deskflowAPI?.conductorPause?.(m.id); refreshMissions(); } catch (e: any) { showError(e?.message); } }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 text-[10px] font-medium hover:bg-amber-500/25"><Pause className="w-3 h-3" /> Pause</button>
              )}
              {(m.status === 'blocked' || m.status === 'paused') && (
                <button onClick={async () => { try { await (window as any).deskflowAPI?.conductorResume?.(m.id); refreshMissions(); } catch (e: any) { showError(e?.message); } }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-[10px] font-medium hover:bg-emerald-500/25"><Play className="w-3 h-3" /> Resume</button>
              )}
              <button onClick={async () => { try { await (window as any).deskflowAPI?.conductorKill?.(m.id); refreshMissions(); } catch (e: any) { showError(e?.message); } }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/15 text-red-300 text-[10px] font-medium hover:bg-red-500/25"><Square className="w-3 h-3" /> Kill</button>
              {m.status === 'done' && (
                <button onClick={async () => { try { await (window as any).deskflowAPI?.conductorPromoteIntegration?.(m.id); refreshMissions(); } catch (e: any) { showError(e?.message); } }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-[10px] font-medium hover:bg-emerald-500/25 ml-auto"><GitBranch className="w-3 h-3" /> Promote</button>
              )}
            </div>

            {selectedMission?.id === m.id && snapshot && (
              <div className="mt-3 pt-3 border-t border-zinc-800/40">
                <OrgTreeGraph nodes={snapshot.nodes || []} recentMessages={snapshot.messages || []} />
              </div>
            )}
          </div>
        ))}

        {showWizard && (
          <MissionWizard
            projectId={projectId || ''}
            repoPath={repoPath || ''}
            userBranch={userBranch || 'main'}
            onLaunch={handleLaunch}
            onClose={() => setShowWizard(false)}
          />
        )}
      </div>
    );
  }

  // ─── Approvals Tab ─────────────────────────────────────────────────────
  if (activeTab === 'approvals') {
    const escalations = snapshot?.escalations || [];
    return (
      <div className="flex flex-col gap-3 p-3 min-h-0 overflow-y-auto">
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-500/10 ring-1 ring-inset ring-red-500/20 p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-300 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
          </div>
        )}
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Pending Approvals</h3>
        {escalations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <CheckCircle className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No pending approvals</p>
          </div>
        )}
        {escalations.map((esc: any) => (
          <div key={esc.id} className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-zinc-200">{esc.reason}</span>
            </div>
            <p className="text-[11px] text-zinc-400 mb-2">{esc.detail || esc.note || 'No details'}</p>
            <div className="flex items-center gap-2">
              <button onClick={async () => { try { await (window as any).deskflowAPI?.conductorResolveEscalation?.(esc.id, 'approved', ''); refreshMissions(); } catch (e: any) { showError(e?.message); } }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-[10px] font-medium hover:bg-emerald-500/25"><CheckCircle className="w-3 h-3" /> Approve</button>
              <button onClick={async () => { try { await (window as any).deskflowAPI?.conductorResolveEscalation?.(esc.id, 'rejected', ''); refreshMissions(); } catch (e: any) { showError(e?.message); } }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/15 text-red-300 text-[10px] font-medium hover:bg-red-500/25"><XCircle className="w-3 h-3" /> Reject</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── Trace Tab ─────────────────────────────────────────────────────────
  if (activeTab === 'trace') {
    const trace = snapshot?.messages || [];
    return (
      <div className="flex flex-col gap-2 p-3 min-h-0 overflow-y-auto">
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-500/10 ring-1 ring-inset ring-red-500/20 p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-300 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
          </div>
        )}
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Execution Trace</h3>
        {trace.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Activity className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No trace data</p>
            <p className="text-[10px] text-zinc-600 mt-1">Start a mission to see execution traces</p>
          </div>
        )}
        {trace.map((t: any, i: number) => (
          <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded-lg bg-zinc-950/50">
            <Clock className="w-3 h-3 mt-0.5 shrink-0 text-zinc-600" />
            <div className="flex-1 min-w-0">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                t.type === 'REPORT' ? 'bg-emerald-500/10 text-emerald-300' :
                t.type === 'ESCALATE' ? 'bg-amber-500/10 text-amber-300' :
                t.type === 'MERGE_CONFLICT' ? 'bg-red-500/10 text-red-300' :
                t.type === 'MERGE_OK' ? 'bg-blue-500/10 text-blue-300' :
                t.type === 'DIRECTIVE' ? 'bg-purple-500/10 text-purple-300' :
                'bg-zinc-800/60 text-zinc-400'
              }`}>{t.type}</span>
              <span className="text-[11px] text-zinc-400 ml-1.5">{t.summary}</span>
            </div>
            <span className="text-[10px] text-zinc-600 shrink-0">{formatTime(t.ts)}</span>
          </div>
        ))}
      </div>
    );
  }

  // ─── Budget Tab ────────────────────────────────────────────────────────
  if (activeTab === 'budget') {
    return <BudgetDashboard missionId={selectedMission?.id || ''} />;
  }

  // ─── Providers Tab ─────────────────────────────────────────────────────
  if (activeTab === 'providers') {
    return <AgentProviderPanel />;
  }

  // ─── Templates Tab ─────────────────────────────────────────────────────
  if (activeTab === 'templates') {
    return <TemplateGallery onSelect={() => { setShowWizard(true); }} onCreate={() => {}} />;
  }

  // ─── Settings Tab ──────────────────────────────────────────────────────
  if (activeTab === 'settings') {
    return <ConductorConfigPanel />;
  }

  return null;
}
