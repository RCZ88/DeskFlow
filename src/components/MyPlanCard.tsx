import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Edit3, Eye } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { MarkdownPreview } from './MarkdownPreview';
import { LoadingState } from './LoadingState';

interface MyPlanCardProps {
  onPlanningSaved?: () => void;
}

const DEFAULT_TEMPLATE = `# My Plan

## Today's Focus
- [ ] Plan your day

## Notes

`;

type SaveState = 'idle' | 'unsaved' | 'saving' | 'saved';

export function MyPlanCard({ onPlanningSaved }: MyPlanCardProps) {
  const [content, setContent] = useState('');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await window.deskflowAPI!.readPlanningMd();
        const c = r.content || DEFAULT_TEMPLATE;
        setContent(c);
        setDraft(c);
      } catch (err: any) {
        setError(err.message);
      }
      setLoading(false);
    })();
  }, []);

  const save = useCallback(async (text: string) => {
    setSaveState('saving');
    try {
      await window.deskflowAPI!.writePlanningMd(text);
      setContent(text);
      setSaveState('saved');
      flashRef.current = setTimeout(() => setSaveState('idle'), 600);
      onPlanningSaved?.();
    } catch {
      setSaveState('unsaved');
    }
  }, [onPlanningSaved]);

  function handleEdit(text: string) {
    setDraft(text);
    setSaveState('unsaved');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(text), 1000);
  }

  function toggleEdit() {
    if (editing) {
      save(draft);
    }
    setEditing(!editing);
  }

  const saveLabel = saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'unsaved' ? 'Unsaved changes' : '';

  return (
    <GlassCard accent="amber" className="relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/15">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">My Plan</h3>
        </div>
        <div className="flex items-center gap-2">
          {saveLabel && (
            <span className={`text-[10px] transition-colors duration-300 ${
              saveState === 'saved' ? 'text-emerald-400' : saveState === 'saving' ? 'text-amber-400' : 'text-zinc-500'
            }`}>{saveLabel}</span>
          )}
          <button
            onClick={toggleEdit}
            className="p-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 transition-colors"
            title={editing ? 'Preview' : 'Edit'}
          >
            {editing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-4">
          <LoadingState variant="spinner" />
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && editing && (
        <textarea
          value={draft}
          onChange={e => handleEdit(e.target.value)}
          className="w-full h-48 bg-zinc-950/50 border border-zinc-700/50 rounded-lg p-3 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500/40 resize-y transition-colors placeholder-zinc-600"
          placeholder="Write your plan in markdown..."
        />
      )}

      {!loading && !error && !editing && (
        <div className="max-h-48 overflow-y-auto">
          <MarkdownPreview content={content} />
        </div>
      )}
    </GlassCard>
  );
}
