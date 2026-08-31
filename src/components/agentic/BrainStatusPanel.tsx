import { useCallback, useEffect, useState } from 'react';
import { Brain, Plus, Search, Sparkles, Trash2 } from 'lucide-react';

type Category = 'code' | 'user' | 'project' | 'feedback' | 'decision' | 'reference' | 'architecture';

interface BrainMemory {
  id: string;
  session_id: string | null;
  entity: string;
  fact: string;
  confidence: number;
  created_at: number;
}

const CATEGORIES: Category[] = ['code', 'user', 'project', 'feedback', 'decision', 'reference', 'architecture'];

export function BrainStatusPanel() {
  const [memories, setMemories] = useState<BrainMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | ''>('');

  // add form
  const [addCat, setAddCat] = useState<Category>('code');
  const [addText, setAddText] = useState('');
  const [adding, setAdding] = useState(false);

  const api: any = (window as any).deskflowAPI;

  const load = useCallback(async () => {
    if (!api?.brain?.listMemories) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.brain.listMemories({ category: category || undefined, limit: 100 });
      setMemories(Array.isArray(res?.memories) ? res.memories : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  }, [api, category]);

  useEffect(() => { load(); }, [load]);

  const search = useCallback(async () => {
    if (!api?.brain?.searchMemories || !query.trim()) return load();
    setLoading(true);
    setError(null);
    try {
      const res = await api.brain.searchMemories({ query: query.trim(), category: category || undefined });
      setMemories(Array.isArray(res?.memories) ? res.memories : []);
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setLoading(false);
    }
  }, [api, query, category, load]);

  const add = useCallback(async () => {
    if (!addText.trim() || !api?.brain?.addMemory) return;
    setAdding(true);
    try {
      await api.brain.addMemory({ category: addCat, content: addText.trim(), importance: 5 });
      setAddText('');
      load();
    } finally {
      setAdding(false);
    }
  }, [api, addCat, addText, load]);

  const byCat = category ? memories : memories;

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Context Brain</h3>
          <span className="text-xs text-zinc-500">{memories.length}</span>
        </div>
        <Sparkles size={14} className="text-violet-400/70" />
      </div>

      <div className="p-3 space-y-2 border-b border-zinc-800">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
            placeholder="Search memories…"
            className="flex-1 rounded-lg bg-zinc-800/60 px-2 py-1 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button onClick={search} className="rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700">Search</button>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setCategory('')}
            className={`text-[10px] px-2 py-0.5 rounded-full ${category === '' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
          >all</button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`text-[10px] px-2 py-0.5 rounded-full ${category === c ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
            >{c}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-[100px]">
        {loading && <div className="text-xs text-zinc-500 p-3">Loading…</div>}
        {error && <div className="text-xs text-rose-400 p-3">{error}</div>}
        {!loading && !error && byCat.length === 0 && (
          <div className="text-xs text-zinc-600 p-3 text-center">No memories. Add one below to teach the brain.</div>
        )}
        {byCat.map((m) => (
          <div key={m.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-violet-400/80">{m.entity}</span>
              <span className="text-[10px] text-zinc-500">conf {(m.confidence * 100).toFixed(0)}%</span>
            </div>
            <p className="mt-1 text-sm text-zinc-200 break-words">{m.fact}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-800 p-3 space-y-2">
        <div className="flex gap-2">
          <select
            value={addCat}
            onChange={(e) => setAddCat(e.target.value as Category)}
            className="rounded-lg bg-zinc-800/60 px-2 py-1 text-xs text-zinc-200 outline-none"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !adding) add(); }}
            placeholder="Add a fact to the brain…"
            className="flex-1 rounded-lg bg-zinc-800/60 px-2 py-1 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button
            onClick={add}
            disabled={adding || !addText.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40 hover:bg-violet-500"
          >
            <Plus size={12} /> {adding ? '…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BrainStatusPanel;
