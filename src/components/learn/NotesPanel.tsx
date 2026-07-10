import React, { useState, useEffect, useCallback } from 'react';
import { StickyNote, Pin, PinOff, Trash2, Search, Loader2 } from 'lucide-react';
import type { NoteEntry } from '../../shared/learn/types';

interface Props {
  getNotes: () => Promise<NoteEntry[]>;
  deleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
}

export function NotesPanel({ getNotes, deleteNote, togglePin }: Props) {
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setNotes(await getNotes());
    } catch { /* ignore */ }
    setLoading(false);
  }, [getNotes]);

  useEffect(() => { load(); }, [load]);

  const filtered = notes.filter(n =>
    !search || n.text.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleTogglePin = async (id: string) => {
    await togglePin(id);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <StickyNote className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-medium text-zinc-200">All Notes</span>
        <span className="text-[10px] text-zinc-600 ml-auto">{notes.length}</span>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-xs text-zinc-200 focus:border-emerald-500/50 focus:outline-none placeholder:text-zinc-600 transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-8">{search ? 'No matching notes' : 'No notes yet'}</p>
        ) : (
          sorted.map((note) => (
            <div
              key={note.id}
              className={`group p-3 rounded-xl transition ${
                note.pinned ? 'bg-emerald-500/8 border border-emerald-500/15' : 'bg-zinc-800/30 hover:bg-zinc-800/50'
              }`}
            >
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{note.text}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-zinc-600">{new Date(note.created_at).toLocaleDateString()}</span>
                {note.node_title && <span className="text-[10px] text-zinc-600">· {note.node_title}</span>}
                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleTogglePin(note.id)}
                    className="w-6 h-6 flex items-center justify-center rounded text-zinc-600 hover:text-emerald-400"
                  >
                    {note.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="w-6 h-6 flex items-center justify-center rounded text-zinc-600 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
