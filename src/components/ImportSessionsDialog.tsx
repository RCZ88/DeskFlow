import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Check, Loader2, RefreshCw, Terminal, Calendar, User, FileText } from 'lucide-react';

interface OpencodeSession {
  id: string;
  agent: string;
  started: string;
  topic: string;
}

const CLR = {
  overlay: 'fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]',
  panel: 'fixed top-[10%] left-1/2 -translate-x-1/2 w-[600px] max-h-[75vh] bg-zinc-900/95 border border-zinc-700/50 rounded-xl flex flex-col z-[101]',
  header: 'flex items-center justify-between px-5 py-4 border-b border-zinc-800/70',
  title: 'text-sm font-semibold text-zinc-200 flex items-center gap-2',
  close: 'p-1 rounded-lg hover:bg-zinc-800/80 text-zinc-500 hover:text-zinc-300 transition-colors',
  body: 'flex-1 overflow-y-auto px-5 py-3 space-y-1',
  row: 'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors border border-transparent',
  rowSelected: 'bg-cyan-500/10 border-cyan-500/20',
  rowUnselected: 'hover:bg-zinc-800/40',
  checkbox: 'w-4 h-4 rounded border-2 border-zinc-600 flex items-center justify-center shrink-0 transition-colors',
  checkboxChecked: 'bg-cyan-500 border-cyan-500',
  footer: 'flex items-center justify-between px-5 py-3 border-t border-zinc-800/70 bg-zinc-900/50',
  scanBtn: 'px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors',
  importBtn: 'px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed',
  cancelBtn: 'px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded-lg transition-colors',
  empty: 'text-center py-12 text-zinc-600 text-xs',
  error: 'text-center py-4 text-rose-400 text-xs',
  badge: 'px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider',
};

function parseOpencodeSessions(output: string): OpencodeSession[] {
  const lines = output.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const sessions: OpencodeSession[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const idMatch = line.match(/^([a-zA-Z0-9_\-]{8,})\s+/);
    if (!idMatch) continue;

    const id = idMatch[1];
    const rest = line.slice(idMatch[0].length).trim();
    const dateMatch = rest.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s*$/);
    const started = dateMatch ? dateMatch[1] : '';
    const topic = dateMatch ? rest.slice(0, dateMatch.index).trim() : rest;

    sessions.push({ id, agent: 'opencode', started, topic });
  }

  return sessions;
}

export default function ImportSessionsDialog({ onClose, onImport, projectId }: {
  onClose: () => void;
  onImport: (sessions: OpencodeSession[]) => void;
  projectId?: string;
}) {
  const [sessions, setSessions] = useState<OpencodeSession[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastClickedIdx, setLastClickedIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await window.deskflowAPI?.executeCommand?.('opencode session list');
      if (result?.error) {
        setError(`opencode CLI error: ${result.error}`);
        return;
      }
      if (!result?.stdout?.trim()) {
        setError('No output from opencode session list. Is opencode installed?');
        return;
      }
      const parsed = parseOpencodeSessions(result.stdout);
      if (parsed.length === 0) {
        setError('No sessions found. Output:\n' + result.stdout.slice(0, 300));
        return;
      }
      setSessions(parsed);
    } catch (e: any) {
      setError(`Failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { scan(); }, [scan]);

  const toggleIdx = (idx: number, shift: boolean) => {
    const ids = sessions.map(s => s.id);
    if (shift && lastClickedIdx !== null) {
      const start = Math.min(lastClickedIdx, idx);
      const end = Math.max(lastClickedIdx, idx);
      const range = ids.slice(start, end + 1);
      const allInRangeSelected = range.every(id => selected.has(id));
      setSelected(prev => {
        const next = new Set(prev);
        for (const id of range) {
          if (allInRangeSelected) next.delete(id);
          else next.add(id);
        }
        return next;
      });
    } else {
      const id = ids[idx];
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
    setLastClickedIdx(idx);
  };

  const handleImport = () => {
    const toImport = sessions.filter(s => selected.has(s.id));
    if (toImport.length === 0) return;
    onImport(toImport);
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  return (
    <>
      <div className={CLR.overlay} onClick={onClose} />
      <div className={CLR.panel}>
        <div className={CLR.header}>
          <span className={CLR.title}>
            <Terminal className="w-4 h-4 text-cyan-400" />
            Import opencode Sessions
          </span>
          <button onClick={onClose} className={CLR.close}><X className="w-4 h-4" /></button>
        </div>

        <div className={CLR.body} ref={listRef}>
          {loading ? (
            <div className={CLR.empty}>
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-500" />
              Scanning opencode sessions...
            </div>
          ) : error ? (
            <div>
              <p className={CLR.error}>{error}</p>
              <div className="flex justify-center gap-2 mt-3">
                <button onClick={scan} className={CLR.scanBtn}>
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            </div>
          ) : sessions.length === 0 ? (
            <div className={CLR.empty}>
              <Terminal className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
              <p>No opencode sessions found</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] text-zinc-500">{sessions.length} sessions</span>
                <button onClick={() => {
                  if (selected.size === sessions.length) setSelected(new Set());
                  else setSelected(new Set(sessions.map(s => s.id)));
                }} className="text-[10px] text-cyan-500 hover:text-cyan-400 transition-colors">
                  {selected.size === sessions.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              {sessions.map((s, i) => {
                const isSelected = selected.has(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={(e) => toggleIdx(i, e.shiftKey)}
                    className={`${CLR.row} ${isSelected ? CLR.rowSelected : CLR.rowUnselected}`}
                  >
                    <div className={`${CLR.checkbox} ${isSelected ? CLR.checkboxChecked : ''}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-zinc-200 font-medium truncate">{s.topic || 'Untitled'}</span>
                        <span className={`${CLR.badge} bg-zinc-800 text-zinc-400`}>{s.agent}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(s.started)}
                        </span>
                        <span className="font-mono truncate">{s.id.slice(0, 12)}...</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className={CLR.footer}>
          <div className="text-[10px] text-zinc-500">
            {selected.size > 0 ? `${selected.size} selected` : 'Click + Shift-click for range'}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className={CLR.cancelBtn}>Cancel</button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className={CLR.importBtn}
            >
              <Check className="w-3.5 h-3.5" />
              Import {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
