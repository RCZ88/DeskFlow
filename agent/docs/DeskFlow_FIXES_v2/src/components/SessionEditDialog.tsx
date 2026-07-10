import { useState, useEffect, useRef } from 'react';

const CATEGORIES = [
  { value: 'bug-fix', label: 'Bug Fix' },
  { value: 'feature', label: 'Feature' },
  { value: 'refactor', label: 'Refactor' },
  { value: 'research', label: 'Research' },
  { value: 'review', label: 'Review' },
  { value: 'other', label: 'Other' },
];

const STATUSES = ['active', 'paused', 'completed', 'archived'];

interface SessionEditData {
  id: string;
  topic: string;
  agent: string;
  resume_id?: string;
  created_at: string;
  total_cost?: number;
  total_tokens?: number;
  category?: string;
  status?: string;
  product_area?: string;
  description?: string;
  auto_tags?: string;
  auto_named?: number;
}

interface SessionEditDialogProps {
  session: SessionEditData | null;
  onClose: () => void;
  onSave: (data: { sessionId: string; topic?: string; category?: string; productArea?: string; description?: string; status?: string; tags?: string[] }) => Promise<boolean>;
}

export function SessionEditDialog({ session, onClose, onSave }: SessionEditDialogProps) {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [productArea, setProductArea] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session) {
      setTopic(session.topic || '');
      setCategory(session.category || '');
      setStatus(session.status || '');
      setProductArea(session.product_area || '');
      setDescription(session.description || '');
      try { setTags(JSON.parse(session.auto_tags || '[]')); } catch { setTags([]); }
    }
  }, [session]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const removeTag = (t: string) => setTags(tags.filter(x => x !== t));

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    const updates: { sessionId: string; topic?: string; category?: string; productArea?: string; description?: string; status?: string; tags?: string[] } = {
      sessionId: session.id,
    };
    if (topic !== (session.topic || '')) updates.topic = topic;
    if (category !== (session.category || '')) updates.category = category;
    if (status !== (session.status || '')) updates.status = status;
    if (productArea !== (session.product_area || '')) updates.productArea = productArea;
    if (description !== (session.description || '')) updates.description = description;
    const origTags = (() => { try { return JSON.parse(session.auto_tags || '[]'); } catch { return []; } })();
    if (JSON.stringify(tags) !== JSON.stringify(origTags)) updates.tags = tags;
    await onSave(updates);
    setSaving(false);
    onClose();
  };

  if (!session) return null;

  const hasChanges =
    topic !== (session.topic || '') ||
    category !== (session.category || '') ||
    status !== (session.status || '') ||
    productArea !== (session.product_area || '') ||
    description !== (session.description || '');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900/95 backdrop-blur-xl rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-zinc-700/50 shadow-black/40" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative flex items-center justify-between px-5 py-4 border-b border-zinc-800/50">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.04] to-transparent pointer-events-none rounded-t-2xl" />
          <div className="flex items-center gap-2.5 relative">
            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_4px_rgba(6,182,212,0.5)]" />
            <h2 className="text-base font-bold text-white">Session Details</h2>
            {session.auto_named ? (
              <span className="text-[9px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-md border border-cyan-500/20">auto-named</span>
            ) : null}
          </div>
          <button onClick={onClose} className="relative p-1.5 hover:bg-zinc-800/80 rounded-md text-zinc-500 hover:text-zinc-200 transition-all duration-150 active:scale-90">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Row 1: Topic + Agent */}
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="block text-[11px] text-zinc-500 font-medium mb-1">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40 transition-all duration-150"
                placeholder="Session topic"
              />
            </div>
            <div className="text-right">
              <label className="block text-[11px] text-zinc-500 font-medium mb-1">Agent</label>
              <span className="inline-block px-3 py-2 text-sm font-medium text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 rounded-lg">{session.agent}</span>
            </div>
          </div>

          {/* Row 2: Resume ID (read-only) */}
          {session.resume_id && (
            <div>
              <label className="block text-[11px] text-zinc-500 font-medium mb-1">Resume ID</label>
              <div className="px-3 py-2 bg-zinc-900/40 border border-zinc-800/50 rounded-lg text-[11px] font-mono text-zinc-400 truncate">{session.resume_id}</div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-zinc-800/40 pt-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-3 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500" />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Metadata</span>
            </div>

            {/* Row 3: Category + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-zinc-500 font-medium mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40 transition-all duration-150"
                >
                  <option value="">Uncategorized</option>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 font-medium mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40 transition-all duration-150"
                >
                  <option value="">Unknown</option>
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 4: Product Area */}
            <div className="mt-3">
              <label className="block text-[11px] text-zinc-500 font-medium mb-1">Product Area</label>
              <input
                type="text"
                value={productArea}
                onChange={e => setProductArea(e.target.value)}
                className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40 transition-all duration-150"
                placeholder="e.g., Dashboard, Terminal, Settings"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] text-zinc-500 font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40 transition-all duration-150 h-20 resize-none"
              placeholder="Session description..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] text-zinc-500 font-medium mb-1">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
              {tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800/60 text-zinc-300 border border-zinc-700/40 rounded-md text-[10px] font-medium group">
                  {t}
                  <button onClick={() => removeTag(t)} className="text-zinc-500 hover:text-rose-400 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="flex-1 bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40 transition-all duration-150"
                placeholder="Type tag and press Enter..."
              />
              <button onClick={addTag} className="px-2.5 py-1.5 bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-200 rounded-lg border border-zinc-700/50 text-xs transition-all duration-150 active:scale-95">
                Add
              </button>
            </div>
          </div>

          {/* Stats (read-only) */}
          <div className="border-t border-zinc-800/40 pt-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-3 rounded-full bg-gradient-to-b from-zinc-400 to-zinc-600" />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Stats</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 bg-zinc-900/40 border border-zinc-800/50 rounded-lg">
                <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Created</div>
                <div className="text-xs text-zinc-300 font-medium">{session.created_at ? new Date(session.created_at).toLocaleDateString() : '-'}</div>
              </div>
              <div className="p-2.5 bg-zinc-900/40 border border-zinc-800/50 rounded-lg">
                <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Cost</div>
                <div className="text-xs text-emerald-400 font-medium">${session.total_cost?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="p-2.5 bg-zinc-900/40 border border-zinc-800/50 rounded-lg">
                <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Tokens</div>
                <div className="text-xs text-zinc-300 font-mono font-medium">{session.total_tokens?.toLocaleString() || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-zinc-800/50">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-200 rounded-lg text-sm font-medium border border-zinc-700/50 transition-all duration-150 active:scale-[0.98]">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
              saving || !hasChanges
                ? 'bg-zinc-700/40 text-zinc-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white hover:shadow-[0_0_12px_rgba(6,182,212,0.25)]'
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
