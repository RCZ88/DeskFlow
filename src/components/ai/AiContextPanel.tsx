import { useState, useEffect, useCallback, useRef } from 'react';
import type { MouseEvent } from 'react';
import {
  Search, Trash2, RefreshCw, ChevronDown, ChevronRight, X,
  MessageSquare, Brain, BarChart3, Sparkles,
  Globe, Radio, Server, MonitorSmartphone,
} from 'lucide-react';

console.log('%c[AiContextPanel] v2.0 loaded', 'color: #22d3ee; font-weight: bold');

const PROVIDER_COLORS: Record<string, string> = {
  chatgpt: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  claude: 'text-orange-300 bg-orange-500/10 border-orange-500/20',
  perplexity: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
  you: 'text-purple-300 bg-purple-500/10 border-purple-500/20',
  gemini: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
  unknown: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/20',
};

function relTime(ms: number): string {
  const mins = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function absTime(ms: number): string {
  try { return new Date(ms).toLocaleString(); } catch { return ''; }
}

interface Capture {
  id: number; provider: string; messages: Array<{ role: string; content: string }>;
  url?: string; title?: string; source?: string; timestamp?: string; captured_at: number;
}
interface Stats { total: number; byProvider: Record<string, number>; newestMs: number | null; capturesByDay: Array<{ day: string; count: number }> }
interface BrainLinks { episodes: any[]; entities: any[]; facts: any[]; signals: any[] }
interface Topic { id?: string; type?: string; name?: string; aliases?: string[]; created_at?: string }

type StageDef = {
  icon: typeof Globe; title: string; desc: string;
  value?: (s: Stats | null, topicCount: number) => string;
};

const PIPELINE_STAGES: StageDef[] = [
  { icon: Globe, title: 'Browser capture', desc: 'Extension intercepts ChatGPT, Claude, Perplexity, You & Gemini traffic in the page', value: (s) => (s ? `${s.total} captures` : '…') },
  { icon: Radio, title: 'Relay', desc: 'Content script → background service worker batches every 5s' },
  { icon: Server, title: 'Desktop ingestion', desc: 'POST http://localhost:54321/ai-context → SQLite (ai_context_captures)' },
  { icon: MonitorSmartphone, title: 'App exposure', desc: 'IPC + this viewer, deduplicated by content hash', value: (s) => (s ? (s.newestMs ? relTime(s.newestMs) : 'no captures yet') : '…') },
  { icon: Brain, title: 'Memory', desc: 'Context Brain extracts episodes, entities, facts & signals every 60s', value: (_s, tc) => (tc ? `${tc} topics` : 'extraction pending') },
];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function build30DaySeries(capturesByDay: Array<{ day: string; count: number }> | undefined | null): Array<{ day: string; label: string; count: number }> {
  if (!Array.isArray(capturesByDay) || capturesByDay.length === 0) return [];
  const byDay: Record<string, number> = {};
  for (const d of capturesByDay) byDay[d.day] = (byDay[d.day] || 0) + d.count;
  const out: Array<{ day: string; label: string; count: number }> = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = dayKey(dt);
    out.push({ day: key, label: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: byDay[key] || 0 });
  }
  return out;
}

function lastDaysSum(capturesByDay: Array<{ day: string; count: number }> | undefined | null, days: number): number {
  if (!Array.isArray(capturesByDay)) return 0;
  const now = new Date();
  const cutoff = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)));
  return capturesByDay.filter(d => d.day >= cutoff).reduce((a, d) => a + d.count, 0);
}

export function AiContextPanel({ open }: { open: boolean }) {
  const api = window.deskflowAPI;
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [brainTab, setBrainTab] = useState<Record<number, 'conversation' | 'brain'>>({});
  const [brainLinks, setBrainLinks] = useState<Record<number, BrainLinks>>({});
  const [clearArmed, setClearArmed] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState<Record<number, boolean>>({});
  const [liveSince, setLiveSince] = useState<number | null>(null);
  const [showHow, setShowHow] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const deleteTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const liveHandlerRef = useRef<(() => void) | null>(null);
  const liveSubscribedRef = useRef(false);

  const fetchStats = useCallback(async () => {
    if (!api?.aiContextStats) return;
    try { const s = await api.aiContextStats(); if (s) setStats(s); } catch {}
  }, [api]);

  const fetchTopics = useCallback(async () => {
    if (!api?.aiContextTopics) return;
    try { const t = await api.aiContextTopics(); if (t?.topics) setTopics(t.topics); } catch {}
  }, [api]);

  const fetchCaptures = useCallback(async () => {
    if (!api?.aiContextList) return;
    setLoading(true);
    try {
      const res = await api.aiContextList({ provider: providerFilter || undefined, search: search || undefined, limit, offset });
      setCaptures(res?.captures || []);
      setTotal(res?.total || 0);
    } catch { setCaptures([]); setTotal(0); }
    finally { setLoading(false); }
  }, [api, providerFilter, search, offset]);

  const loadBrainLinks = useCallback(async (captureId: number) => {
    if (!api?.aiContextGetBrainLinks || brainLinks[captureId]) return;
    try { const links = await api.aiContextGetBrainLinks(captureId); setBrainLinks(prev => ({ ...prev, [captureId]: links })); } catch {}
  }, [api, brainLinks]);

  const refreshAll = useCallback(() => { fetchStats(); fetchCaptures(); fetchTopics(); }, [fetchStats, fetchCaptures, fetchTopics]);

  useEffect(() => { if (open) refreshAll(); }, [open, refreshAll]);
  useEffect(() => { if (!open) return; const iv = setInterval(fetchStats, 6000); return () => clearInterval(iv); }, [open, fetchStats]);

  useEffect(() => {
    if (!open || !api?.onAiContextCaptured) return;
    liveHandlerRef.current = () => { setLiveSince(Date.now()); refreshAll(); };
    if (!liveSubscribedRef.current) {
      liveSubscribedRef.current = true;
      api.onAiContextCaptured(() => liveHandlerRef.current?.());
    }
  }, [open, api, refreshAll]);

  useEffect(() => {
    if (liveSince === null) return;
    const t = setTimeout(() => setLiveSince(null), 30000);
    return () => clearTimeout(t);
  }, [liveSince]);

  useEffect(() => {
    if (!open || expandedId === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpandedId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, expandedId]);

  useEffect(() => () => {
    for (const t of Object.values(deleteTimersRef.current)) clearTimeout(t);
  }, []);

  const doDelete = useCallback(async (id: number) => {
    if (!api?.aiContextDelete) return;
    await api.aiContextDelete(id);
    fetchCaptures();
    fetchStats();
  }, [api, fetchCaptures, fetchStats]);

  const onDeleteClick = (e: MouseEvent<HTMLButtonElement>, id: number) => {
    e.stopPropagation();
    if (deleteArmed[id]) {
      if (deleteTimersRef.current[id]) { clearTimeout(deleteTimersRef.current[id]); delete deleteTimersRef.current[id]; }
      setDeleteArmed(prev => { const next = { ...prev }; delete next[id]; return next; });
      doDelete(id);
    } else {
      setDeleteArmed(prev => ({ ...prev, [id]: true }));
      deleteTimersRef.current[id] = setTimeout(() => {
        setDeleteArmed(prev => { const next = { ...prev }; delete next[id]; return next; });
        delete deleteTimersRef.current[id];
      }, 2500);
    }
  };

  const doClear = useCallback(async () => {
    if (!clearArmed) { setClearArmed(true); setTimeout(() => setClearArmed(false), 3000); return; }
    if (!api?.aiContextClear) return;
    await api.aiContextClear(providerFilter || undefined);
    setClearArmed(false);
    fetchCaptures();
    fetchStats();
  }, [api, clearArmed, providerFilter, fetchCaptures, fetchStats]);

  if (!open) return null;

  const providers = stats ? Object.entries(stats.byProvider).sort((a, b) => b[1] - a[1]) : [];
  const series = stats ? build30DaySeries(stats.capturesByDay) : [];
  const maxDayCount = series.length ? Math.max(...series.map(s => s.count)) : 0;
  const isLive = liveSince !== null && Date.now() - liveSince < 30000;

  return (
    <div className="border-t border-zinc-800/60 bg-zinc-950/40 px-4 py-3 space-y-3 text-xs">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-medium text-zinc-200">AI Context Captures</span>
        <span className="text-[10px] text-zinc-500">{total} conversations</span>
        {isLive && (
          <span className="flex items-center gap-1 text-[9px] text-emerald-400" title="New capture received">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> live
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={refreshAll}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-zinc-300 bg-zinc-800/40 border border-zinc-700/30 hover:bg-zinc-700/40 transition-colors">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={doClear}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-colors ${clearArmed ? 'text-white bg-rose-600 border-rose-500' : 'text-rose-300 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20'}`}>
            <Trash2 className="w-3 h-3" /> {clearArmed ? 'Confirm?' : 'Clear'}
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="border border-zinc-800/40 rounded-lg">
        <button onClick={() => setShowHow(s => !s)}
          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors">
          <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${showHow ? '' : '-rotate-90'}`} />
          How it works
          <span className="ml-auto text-zinc-600">capture → relay → ingest → view → memory</span>
        </button>
        {showHow && (
          <div className="px-2.5 pb-2 space-y-1.5 border-t border-zinc-800/30">
            {PIPELINE_STAGES.map((stage, i) => (
              <div key={stage.title} className="flex items-center gap-2 pt-1.5">
                <stage.icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-zinc-300">{i + 1}. {stage.title}</p>
                  <p className="text-[9px] text-zinc-600 truncate">{stage.desc}</p>
                </div>
                {stage.value && (
                  <span className="ml-auto text-[9px] font-mono text-zinc-500 shrink-0">{stage.value(stats, topics.length)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-lg p-2">
            <p className="text-[10px] uppercase text-zinc-500">Total</p>
            <p className="text-lg font-bold text-cyan-300 font-mono">{stats.total}</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-lg p-2">
            <p className="text-[10px] uppercase text-zinc-500">Providers</p>
            <p className="text-lg font-bold text-zinc-100 font-mono">{providers.length}</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-lg p-2">
            <p className="text-[10px] uppercase text-zinc-500">Latest</p>
            <p className="text-lg font-bold text-zinc-100 font-mono" title={stats.newestMs ? absTime(stats.newestMs) : undefined}>{stats.newestMs ? relTime(stats.newestMs) : '—'}</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-lg p-2">
            <p className="text-[10px] uppercase text-zinc-500">This week</p>
            <p className="text-lg font-bold text-zinc-100 font-mono">{lastDaysSum(stats.capturesByDay, 7)}</p>
          </div>
        </div>
      )}

      {/* 30-day timeline */}
      {stats && (
        <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase text-zinc-500 flex items-center gap-1">
              <BarChart3 className="w-3 h-3 text-cyan-400" /> Last 30 days
            </p>
            <p className="text-[9px] font-mono text-zinc-600">max {maxDayCount} · {series.reduce((a, s) => a + s.count, 0)} total</p>
          </div>
          {series.length === 0 ? (
            <p className="text-[10px] text-zinc-600 py-3 text-center">No activity yet</p>
          ) : (
            <div className="flex items-end gap-px h-12">
              {series.map(s => (
                <div key={s.day} title={`${s.label} — ${s.count}`}
                  className="flex-1 min-w-0 bg-cyan-400/70 hover:bg-cyan-300 transition-colors rounded-t"
                  style={{ height: s.count === 0 ? 2 : Math.max(4, Math.round((s.count / maxDayCount) * 44)) }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Most discussed topics */}
      <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-lg p-2">
        <p className="text-[10px] uppercase text-zinc-500 mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-violet-400" /> Most discussed topics
        </p>
        {topics.length === 0 ? (
          <p className="text-[10px] text-zinc-600">Topics will appear after Context Brain extraction runs.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {topics.slice(0, 15).map(t => (
              <span key={t.id || t.name || t.type} className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                {t.name || t.id}
                {t.type && <span className="text-[9px] text-violet-300/50 ml-1">{t.type}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Provider chips + search */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => { setProviderFilter(null); setOffset(0); }}
          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${!providerFilter ? 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20' : 'text-zinc-500 bg-zinc-900/30 border-zinc-800/40 hover:text-zinc-300'}`}>
          All ({total})
        </button>
        {providers.map(([p, count]) => (
          <button key={p} onClick={() => { setProviderFilter(p); setOffset(0); }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${providerFilter === p ? PROVIDER_COLORS[p] || '' : 'text-zinc-500 bg-zinc-900/30 border-zinc-800/40 hover:text-zinc-300'}`}>
            {p} ({count})
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 bg-zinc-900/50 border border-zinc-800/50 rounded px-2 py-0.5 w-44">
          <Search className="w-3 h-3 text-zinc-500" />
          <input value={searchDraft} onChange={e => setSearchDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchDraft); setOffset(0); } }}
            placeholder="Search conversations…"
            className="bg-transparent text-[10px] text-zinc-200 outline-none w-full placeholder:text-zinc-600" />
          {searchDraft && <button onClick={() => { setSearchDraft(''); setSearch(''); setOffset(0); }} className="text-zinc-500 hover:text-zinc-300"><X className="w-3 h-3" /></button>}
        </div>
      </div>

      {/* Conversation list */}
      <div className="border border-zinc-800/40 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
        {loading && captures.length === 0 ? (
          <div className="p-1.5 space-y-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-2 animate-pulse">
                <div className="w-3 h-3 bg-zinc-800 rounded" />
                <div className="h-3 w-14 bg-zinc-800 rounded" />
                <div className="h-3 w-9 bg-zinc-800/70 rounded" />
                <div className="h-3 flex-1 max-w-[140px] bg-zinc-800/50 rounded" />
                <div className="ml-auto h-3 w-10 bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        ) : captures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-zinc-500 gap-1.5">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] text-zinc-400 text-center px-4">No AI conversations captured yet — visit ChatGPT, Claude, or Perplexity with the DeskFlow extension active</span>
            <span className="text-[9px] text-zinc-600 text-center px-4">Make sure the DeskFlow browser extension is enabled and has been reloaded after the latest update.</span>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/30">
            {captures.map(cap => {
              const isOpen = expandedId === cap.id;
              const tab = brainTab[cap.id] || 'conversation';
              return (
                <div key={cap.id}>
                  <div className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/15 transition-colors">
                    <button onClick={() => {
                      setExpandedId(isOpen ? null : cap.id);
                      if (!isOpen) loadBrainLinks(cap.id);
                    }} className="flex items-center gap-1.5 flex-1 text-left">
                      {isOpen ? <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />}
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono border ${PROVIDER_COLORS[cap.provider] || PROVIDER_COLORS.unknown}`}>{cap.provider}</span>
                      <span className="text-[10px] text-zinc-400">{cap.messages.length} msgs</span>
                      {cap.title && <span className="text-[10px] text-zinc-500 truncate max-w-[140px]">{cap.title}</span>}
                      <span className="ml-auto text-[9px] text-zinc-600 font-mono shrink-0" title={absTime(cap.captured_at)}>{relTime(cap.captured_at)}</span>
                    </button>
                    <button onClick={(e) => onDeleteClick(e, cap.id)}
                      className={`shrink-0 flex items-center gap-1 px-1 py-0.5 rounded text-[9px] border transition-colors ${deleteArmed[cap.id] ? 'text-rose-300 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20' : 'text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 border-transparent'}`}
                      title={deleteArmed[cap.id] ? 'Click again to confirm delete' : 'Delete capture'}>
                      <Trash2 className="w-3 h-3" /> {deleteArmed[cap.id] ? 'Confirm?' : ''}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="px-3 pb-2 pl-6 space-y-2">
                      {/* Tabs */}
                      <div className="flex items-center gap-1 border-b border-zinc-800/30 pb-1">
                        <button onClick={() => setBrainTab(prev => ({ ...prev, [cap.id]: 'conversation' }))}
                          className={`px-2 py-0.5 rounded text-[10px] transition-colors ${tab === 'conversation' ? 'text-cyan-300 bg-cyan-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}>
                          <MessageSquare className="w-3 h-3 inline mr-1" />Conversation
                        </button>
                        <button onClick={() => { setBrainTab(prev => ({ ...prev, [cap.id]: 'brain' })); loadBrainLinks(cap.id); }}
                          className={`px-2 py-0.5 rounded text-[10px] transition-colors ${tab === 'brain' ? 'text-violet-300 bg-violet-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}>
                          <Brain className="w-3 h-3 inline mr-1" />Brain
                        </button>
                      </div>
                      {tab === 'conversation' ? (
                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                          {cap.messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[10px] leading-relaxed ${msg.role === 'user' ? 'bg-zinc-700/60 text-zinc-100' : 'bg-zinc-800/60 text-zinc-200'}`}>
                                <span className="text-[8px] uppercase tracking-wider text-zinc-500 block mb-0.5">{msg.role}</span>
                                <span className="whitespace-pre-wrap break-words">{msg.content.slice(0, 2000)}{msg.content.length > 2000 ? '…' : ''}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2 text-[10px]">
                          {brainLinks[cap.id] ? (
                            <>
                              {brainLinks[cap.id].entities.length > 0 && (
                                <div>
                                  <p className="text-zinc-500 uppercase tracking-wider mb-1">Entities</p>
                                  <div className="flex flex-wrap gap-1">
                                    {brainLinks[cap.id].entities.map((e: any) => (
                                      <span key={e.id} className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">{e.name}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {brainLinks[cap.id].facts.length > 0 && (
                                <div>
                                  <p className="text-zinc-500 uppercase tracking-wider mb-1">Facts</p>
                                  <div className="space-y-0.5">
                                    {brainLinks[cap.id].facts.map((f: any, i: number) => (
                                      <div key={f.id ?? i} className="flex items-baseline gap-1.5 py-0.5">
                                        <span className="text-amber-300/90">{f.predicate}</span>
                                        {f.object_literal && <span className="text-zinc-500">→</span>}
                                        {f.object_literal && <span className="text-zinc-300">{f.object_literal}</span>}
                                        {typeof f.confidence === 'number' && f.confidence != null && (
                                          <span className="ml-auto text-[9px] font-mono text-zinc-500 shrink-0">{Math.round(f.confidence * 100)}%</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {brainLinks[cap.id].signals.length > 0 && (
                                <div>
                                  <p className="text-zinc-500 uppercase tracking-wider mb-1">Signals</p>
                                  {brainLinks[cap.id].signals.map((s: any) => (
                                    <div key={s.id} className="text-zinc-400 py-0.5 border-b border-zinc-800/20 last:border-0">
                                      <span className="text-cyan-300">{s.signal_type}</span> {s.content?.slice(0, 120)}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {brainLinks[cap.id].episodes.length > 0 && (
                                <div>
                                  <p className="text-zinc-500 uppercase tracking-wider mb-1">Episodes</p>
                                  {brainLinks[cap.id].episodes.map((ep: any) => (
                                    <div key={ep.id} className="text-zinc-400 py-0.5">
                                      <span className="text-zinc-300">{ep.source}</span> — {ep.content?.slice(0, 100)}…
                                    </div>
                                  ))}
                                </div>
                              )}
                              {brainLinks[cap.id].entities.length === 0 && brainLinks[cap.id].facts.length === 0 && brainLinks[cap.id].signals.length === 0 && (
                                <p className="text-zinc-600 italic">No brain data yet — extraction runs every 60s</p>
                              )}
                            </>
                          ) : (
                            <p className="text-zinc-600">Loading brain data…</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}
              className="px-2 py-0.5 rounded border border-zinc-800/40 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800/40 disabled:opacity-40 transition-colors">← Prev</button>
            <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total}
              className="px-2 py-0.5 rounded border border-zinc-800/40 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800/40 disabled:opacity-40 transition-colors">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}