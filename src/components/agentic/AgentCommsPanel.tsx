import { useCallback, useEffect, useMemo, useState } from 'react';
import { Send, RefreshCw, CheckCircle2, Clock, Circle, XCircle, Inbox } from 'lucide-react';

type MsgStatus = 'pending' | 'delivered' | 'completed' | 'failed';
type MsgType = 'TASK' | 'REPORT' | 'ESCALATE' | 'DIRECTIVE' | 'MERGE_OK' | 'MERGE_CONFLICT' | 'INFO';

interface AgentMessage {
  id: string;
  mission_id: string | null;
  from_node_id: string;
  to_node_id: string;
  type: MsgType;
  summary: string;
  payload: any;
  status: MsgStatus;
  created_at: number;
}

const STATUS_META: Record<MsgStatus, { color: string; Icon: any; label: string }> = {
  pending: { color: 'text-zinc-400 bg-zinc-500/10', Icon: Clock, label: 'Pending' },
  delivered: { color: 'text-sky-400 bg-sky-500/10', Icon: Circle, label: 'Delivered' },
  completed: { color: 'text-emerald-400 bg-emerald-500/10', Icon: CheckCircle2, label: 'Completed' },
  failed: { color: 'text-rose-400 bg-rose-500/10', Icon: XCircle, label: 'Failed' },
};

const TYPE_COLORS: Record<MsgType, string> = {
  TASK: 'text-indigo-300',
  REPORT: 'text-emerald-300',
  ESCALATE: 'text-rose-300',
  DIRECTIVE: 'text-amber-300',
  MERGE_OK: 'text-teal-300',
  MERGE_CONFLICT: 'text-orange-300',
  INFO: 'text-zinc-300',
};

export function AgentCommsPanel() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // compose box
  const [from, setFrom] = useState('boss');
  const [to, setTo] = useState('director');
  const [type, setType] = useState<MsgType>('DIRECTIVE');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const api: any = (window as any).deskflowAPI;

  const load = useCallback(async () => {
    if (!api?.agent?.getMessages) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.agent.getMessages({});
      setMessages(Array.isArray(res?.messages) ? res.messages : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
    if (api?.agent?.onMessageUpdated) {
      const off = api.agent.onMessageUpdated(() => load());
      return off;
    }
  }, [api, load]);

  const markCompleted = useCallback(async (id: string) => {
    if (!api?.agent?.updateMessageStatus) return;
    await api.agent.updateMessageStatus({ id, status: 'completed' });
    load();
  }, [api, load]);

  const send = useCallback(async () => {
    if (!content.trim() || !api?.agent?.sendMessage) return;
    setSending(true);
    try {
      await api.agent.sendMessage({
        from_agent: from,
        to_agent: to,
        message_type: type,
        content: content.trim(),
      });
      setContent('');
      load();
    } finally {
      setSending(false);
    }
  }, [api, from, to, type, content, load]);

  const list = useMemo(() => [...messages].sort((a, b) => (b.created_at || 0) - (a.created_at || 0)), [messages]);

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Inbox size={16} className="text-sky-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Agent Comms</h3>
          <span className="text-xs text-zinc-500">{messages.length}</span>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-[120px]">
        {loading && <div className="text-xs text-zinc-500 p-3">Loading…</div>}
        {error && <div className="text-xs text-rose-400 p-3">{error}</div>}
        {!loading && !error && list.length === 0 && (
          <div className="text-xs text-zinc-600 p-3 text-center">No agent messages yet. Send one below.</div>
        )}
        {list.map((m) => {
          const meta = STATUS_META[m.status] || STATUS_META.pending;
          const SIcon = meta.Icon;
          return (
            <div key={m.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${TYPE_COLORS[m.type] || 'text-zinc-300'} bg-zinc-800/60`}>{m.type}</span>
                  <span className="text-xs text-zinc-400 truncate">{m.from_node_id} → {m.to_node_id}</span>
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${meta.color}`}>
                  <SIcon size={10} /> {meta.label}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-zinc-200 break-words">{m.summary}</p>
              {m.payload && typeof m.payload === 'object' && (
                <pre className="mt-1 text-[10px] text-zinc-500 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(m.payload).slice(0, 200)}</pre>
              )}
              {m.status !== 'completed' && m.status !== 'failed' && (
                <button
                  onClick={() => markCompleted(m.id)}
                  className="mt-2 text-[11px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                >
                  <CheckCircle2 size={11} /> Mark completed
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-zinc-800 p-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="from"
            className="rounded-lg bg-zinc-800/60 px-2 py-1 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-sky-500"
          />
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="to"
            className="rounded-lg bg-zinc-800/60 px-2 py-1 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-sky-500"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MsgType)}
            className="rounded-lg bg-zinc-800/60 px-2 py-1 text-xs text-zinc-200 outline-none"
          >
            {(['TASK', 'REPORT', 'ESCALATE', 'DIRECTIVE', 'MERGE_OK', 'MERGE_CONFLICT', 'INFO'] as MsgType[]).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !sending) send(); }}
            placeholder="Message content…"
            className="flex-1 rounded-lg bg-zinc-800/60 px-2 py-1 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            onClick={send}
            disabled={sending || !content.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40 hover:bg-sky-500 transition-colors"
          >
            <Send size={12} /> {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AgentCommsPanel;
