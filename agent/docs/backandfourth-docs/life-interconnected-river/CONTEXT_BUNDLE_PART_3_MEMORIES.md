# CONTEXT BUNDLE PART 3 — Memories sub-feature (VERBATIM)

**Data model:** 100% client-side. IndexedDB `deskflow-blob-store` holds blobs (photos/videos/voice notes); metadata rows are objects stored in the same store; object URLs are handed to React (`url` from `URL.createObjectURL`). No backend, no IPC. Colors sage #6fb38f.

---

## 3.1 `src/features/memories/MemoriesPage.tsx` (VERBATIM, 115 lines)

```tsx
import { useMemo, useState } from 'react';
import { LayoutGrid, Rows3, Film, CalendarHeart } from 'lucide-react';
import { WarmCard } from '../warmth/WarmCard';
import { useMemories } from './useMemories';
import { MemoryReel } from './MemoryReel';
import { OnThisDayCard } from './OnThisDayCard';
import { MemoryCollageGrid } from './MemoryCollageGrid';
import { MemoryTimeline } from './MemoryTimeline';
import { MemoryUploader } from './MemoryUploader';
import { RecapPlayer } from './RecapPlayer';

interface MemoriesPageProps {
  embedded?: boolean;
}

export default function MemoriesPage({ embedded }: MemoriesPageProps) {
  const memories = useMemories();
  const [view, setView] = useState<'collage' | 'timeline'>('collage');

  const onThisDay = useMemo(() => memories.onThisDay, [memories.onThisDay]);
  const groupedByMonth = useMemo(() => memories.groupedByMonth, [memories.groupedByMonth]);

  return (
    <div className="space-y-4">
      <RecapPlayer memories={memories.items} />

      <WarmCard ambient>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarHeart className="w-4 h-4 text-sage" />
            <span className="text-xs font-medium text-zinc-300">On this day</span>
          </div>
        </div>
        {onThisDay.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {onThisDay.map(memory => (
              <OnThisDayCard key={memory.meta.id} memory={memory} />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-zinc-500 py-3 text-center">
            No memories from this day in past years.
          </p>
        )}
      </WarmCard>

      <WarmCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-sage" />
            <span className="text-xs font-medium text-zinc-300">Memory Reel</span>
          </div>
        </div>
        <MemoryReel memories={memories.items} />
      </WarmCard>

      <WarmCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-sage" />
            <span className="text-xs font-medium text-zinc-300">All memories</span>
          </div>
          <div className="flex gap-1 bg-zinc-800/50 p-0.5 rounded-lg">
            {(['collage', 'timeline'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`px-2.5 py-1 rounded-md text-[11px] capitalize transition-colors ${
                  view === mode ? 'bg-zinc-700/80 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {mode === 'collage' ? <LayoutGrid className="w-3.5 h-3.5 inline mr-1" /> : <Rows3 className="w-3.5 h-3.5 inline mr-1" />}
                {mode}
              </button>
            ))}
          </div>
        </div>

        {memories.loading ? (
          <div className="grid place-items-center py-16 text-zinc-500 text-sm">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
          </div>
        ) : memories.items.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">
            <Film className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-[13px]">No memories yet — capture your first one.</p>
          </div>
        ) : view === 'collage' ? (
          <MemoryCollageGrid memories={memories.items} />
        ) : (
          <MemoryTimeline groupedByMonth={groupedByMonth} />
        )}
      </WarmCard>

      <MemoryUploader onUpload={memories.upload} />
    </div>
  );
}
```

## 3.2 `src/features/memories/types.ts` (VERBATIM)

```ts
export interface MemoryMeta {
  id: string;
  caption?: string;
  people?: string[];
  takenAt: number; // epoch ms
  createdAt: number; // upload time
  type: 'photo' | 'video' | 'audio';
}

export interface LoadedMemory {
  meta: MemoryMeta;
  url: string; // object URL
}

export interface MemoryGroup {
  key: string;
  label: string;
  memories: LoadedMemory[];
}
```

## 3.3 `src/features/memories/useMemories.ts` (VERBATIM)

```ts
import { useCallback, useEffect, useState } from 'react';
import type { LoadedMemory, MemoryMeta, MemoryGroup } from './types';
import { getStoredMemoryMeta, loadAllMemories, storeMemoryBlob } from './mediaStore';

type LoadState = 'loading' | 'ready' | 'error';

export function useMemories() {
  const [state, setState] = useState<LoadState>('loading');
  const [items, setItems] = useState<LoadedMemory[]>([]);

  const refresh = useCallback(async () => {
    try {
      setState('loading');
      const metas = await getStoredMemoryMeta();
      const loaded = await loadAllMemories(metas);
      setItems(loaded);
      setState('ready');
    } catch (err) {
      console.error('Failed to load memories', err);
      setState('error');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const upload = useCallback(async (files: File[]) => {
    const metas: MemoryMeta[] = [];
    for (const file of files) {
      const meta = await storeMemoryBlob(file);
      metas.push(meta);
    }
    await refresh();
    return metas;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const { deleteStoredMemory } = await import('./mediaStore');
    await deleteStoredMemory(id);
    setItems(prev => prev.filter(m => m.meta.id !== id));
  }, []);

  const updateMeta = useCallback(async (id: string, patch: Partial<MemoryMeta>) => {
    const { updateMemoryMeta } = await import('./mediaStore');
    await updateMemoryMeta(id, patch);
    setItems(prev => prev.map(m => m.meta.id === id ? { ...m, meta: { ...m.meta, ...patch } } : m));
  }, []);

  const onThisDay = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getMonth() + 1}-${now.getDate()}`;
    return items.filter(m => {
      const d = new Date(m.meta.takenAt);
      const key = `${d.getMonth() + 1}-${d.getDate()}`;
      return key === todayKey;
    });
  }, [items]);

  const groupedByMonth = useMemo<MemoryGroup[]>(() => {
    const map = new Map<string, LoadedMemory[]>();
    items.slice().sort((a, b) => b.meta.takenAt - a.meta.takenAt).forEach(m => {
      const d = new Date(m.meta.takenAt);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return Array.from(map.entries()).map(([key, memories]) => ({ key, label, memories }));
  }, [items]);

  return {
    state,
    loading: state === 'loading',
    items,
    upload,
    remove,
    updateMeta,
    onThisDay,
    groupedByMonth,
    refresh,
  };
}
```

## 3.4 `src/features/memories/mediaStore.ts` (VERBATIM)

```ts
import type { LoadedMemory, MemoryMeta } from './types';

const DB_NAME = 'deskflow-blob-store';
const META_STORE = 'memories';
const BLOB_STORE = 'blobs';
const VOICE_STORE = 'voiceNotes';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(VOICE_STORE)) db.createObjectStore(VOICE_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getStoredMemoryMeta(): Promise<MemoryMeta[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const req = tx.objectStore(META_STORE).getAll();
    req.onsuccess = () => resolve(req.result as MemoryMeta[]);
    req.onerror = () => reject(req.error);
  });
}

export async function storeMemoryBlob(file: File): Promise<MemoryMeta> {
  const db = await openDB();
  const meta: MemoryMeta = {
    id: crypto.randomUUID(),
    type: file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'photo',
    takenAt: Date.now(),
    createdAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([BLOB_STORE, META_STORE], 'readwrite');
    tx.objectStore(BLOB_STORE).put({ id: meta.id, blob: file });
    tx.objectStore(META_STORE).put(meta);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return meta;
}

export async function loadAllMemories(metas: MemoryMeta[]): Promise<LoadedMemory[]> {
  const db = await openDB();
  const out: LoadedMemory[] = [];
  for (const meta of metas) {
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE, 'readonly');
      const req = tx.objectStore(BLOB_STORE).get(meta.id);
      req.onsuccess = () => resolve(req.result?.blob);
      req.onerror = () => reject(req.error);
    });
    if (blob) out.push({ meta, url: URL.createObjectURL(blob) });
  }
  return out.sort((a, b) => b.meta.takenAt - a.meta.takenAt);
}

export async function deleteStoredMemory(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([BLOB_STORE, META_STORE], 'readwrite');
    tx.objectStore(BLOB_STORE).delete(id);
    tx.objectStore(META_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateMemoryMeta(id: string, patch: Partial<MemoryMeta>): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);
    const get = store.get(id);
    get.onsuccess = () => {
      store.put({ ...get.result, ...patch });
      resolve();
    };
    get.onerror = () => reject(get.error);
  });
}
```

## 3.5 `src/features/warmth/localBlobStore.ts` (VERBATIM — shared IndexedDB helper)

```ts
const DB_NAME = 'deskflow-blob-store';

export async function openLocalDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
```

## 3.6 `src/features/memories/MemoryCard.tsx` (VERBATIM)

```tsx
import { Pencil, Trash2, X } from 'lucide-react';
import type { LoadedMemory } from './types';

interface MemoryCardProps {
  memory: LoadedMemory;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function MemoryCard({ memory, onDelete, onEdit }: MemoryCardProps) {
  return (
    <div className="group relative rounded-xl overflow-hidden border border-zinc-800/60 bg-zinc-900/60">
      {memory.meta.type === 'photo' ? (
        <img src={memory.url} alt={memory.meta.caption ?? 'Memory'} className="w-full h-full object-cover aspect-square" />
      ) : memory.meta.type === 'video' ? (
        <video src={memory.url} className="w-full h-full object-cover aspect-square" muted playsInline />
      ) : (
        <div className="grid place-items-center h-full aspect-square bg-zinc-800/60">
          <span className="text-3xl">🎵</span>
        </div>
      )}

      {onDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="absolute top-1.5 right-1.5 w-6 h-6 grid place-items-center rounded-md bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      )}
    </div>
  );
}
```

## 3.7 `src/features/memories/MemoryCollageGrid.tsx` (VERBATIM)

```tsx
import { useState } from 'react';
import type { LoadedMemory } from './types';
import { MemoryCard } from './MemoryCard';
import { MemoryReveal } from './MemoryReveal';
import { useMemories } from './useMemories';

interface MemoryCollageGridProps {
  memories: LoadedMemory[];
}

export function MemoryCollageGrid({ memories }: MemoryCollageGridProps) {
  const { remove } = useMemories();
  const [revealed, setRevealed] = useState<LoadedMemory | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        {memories.map(m => (
          <button key={m.meta.id} onClick={() => setRevealed(m)} className="text-left">
            <MemoryCard memory={m} onDelete={() => void remove(m.meta.id)} />
          </button>
        ))}
      </div>
      {revealed && <MemoryReveal memory={revealed} onClose={() => setRevealed(null)} />}
    </>
  );
}
```

## 3.8 `src/features/memories/MemoryTimeline.tsx` (VERBATIM)

```tsx
import { useMemo } from 'react';
import type { LoadedMemory, MemoryGroup } from './types';
import { MemoryCard } from './MemoryCard';
import { MemoryReveal } from './MemoryReveal';
import { useState } from 'react';
import { useMemories } from './useMemories';

interface MemoryTimelineProps {
  groupedByMonth: MemoryGroup[];
}

export function MemoryTimeline({ groupedByMonth }: MemoryTimelineProps) {
  const [revealed, setRevealed] = useState<LoadedMemory | null>(null);
  const { remove } = useMemories();

  return (
    <>
      <div className="space-y-4 max-h-[480px] overflow-auto">
        {groupedByMonth.map(group => (
          <div key={group.key}>
            <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">{group.label}</div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {group.memories.map(m => (
                <button key={m.meta.id} onClick={() => setRevealed(m)} className="text-left">
                  <MemoryCard memory={m} onDelete={() => void remove(m.meta.id)} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {revealed && <MemoryReveal memory={revealed} onClose={() => setRevealed(null)} />}
    </>
  );
}
```

## 3.9 `src/features/memories/MemoryReel.tsx` (VERBATIM)

```tsx
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LoadedMemory } from './types';
import { MemoryCard } from './MemoryCard';
import { MemoryReveal } from './MemoryReveal';
import { useMemories } from './useMemories';

interface MemoryReelProps {
  memories: LoadedMemory[];
}

export function MemoryReel({ memories }: MemoryReelProps) {
  const [revealed, setRevealed] = useState<LoadedMemory | null>(null);
  const { remove } = useMemories();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  return (
    <>
      <div className="relative">
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-none snap-x">
          {memories.map(m => (
            <button
              key={m.meta.id}
              onClick={() => setRevealed(m)}
              className="snap-start shrink-0 w-40 text-left"
            >
              <MemoryCard memory={m} onDelete={() => void remove(m.meta.id)} />
            </button>
          ))}
        </div>
        <button
          onClick={() => scrollBy(-1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full bg-black/60 hover:bg-black/80 text-white"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => scrollBy(1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full bg-black/60 hover:bg-black/80 text-white"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {revealed && <MemoryReveal memory={revealed} onClose={() => setRevealed(null)} />}
    </>
  );
}
```

## 3.10 `src/features/memories/OnThisDayCard.tsx` (VERBATIM)

```tsx
import type { LoadedMemory } from './types';

interface OnThisDayCardProps {
  memory: LoadedMemory;
  onClick?: () => void;
}

export function OnThisDayCard({ memory, onClick }: OnThisDayCardProps) {
  const date = new Date(memory.meta.takenAt);
  const year = date.getFullYear();

  return (
    <button
      onClick={onClick}
      className="group relative rounded-xl overflow-hidden border border-zinc-800/60 aspect-square bg-zinc-900/60"
    >
      {memory.meta.type === 'photo' ? (
        <img src={memory.url} alt={memory.meta.caption ?? 'Memory'} className="w-full h-full object-cover" />
      ) : memory.meta.type === 'video' ? (
        <video src={memory.url} className="w-full h-full object-cover" muted playsInline />
      ) : (
        <div className="grid place-items-center h-full bg-zinc-800/60"><span className="text-3xl">🎵</span></div>
      )}
      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
        <span className="text-[11px] font-medium text-white">{year}</span>
      </div>
    </button>
  );
}
```

## 3.11 `src/features/memories/MemoryReveal.tsx` (VERBATIM — full-screen lightbox with caption/people editing)

```tsx
import { useEffect, useState } from 'react';
import { X, Pencil, Check, Trash2, Users } from 'lucide-react';
import type { LoadedMemory } from './types';
import { useMemories } from './useMemories';

interface MemoryRevealProps {
  memory: LoadedMemory;
  onClose: () => void;
}

export function MemoryReveal({ memory, onClose }: MemoryRevealProps) {
  const { updateMeta, remove } = useMemories();
  const [caption, setCaption] = useState(memory.meta.caption ?? '');
  const [peopleText, setPeopleText] = useState(memory.meta.people?.join(', ') ?? '');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    await updateMeta(memory.meta.id, {
      caption: caption.trim() || undefined,
      people: peopleText.split(',').map(p => p.trim()).filter(Boolean),
    });
    setEditing(false);
  };

  const handleDelete = async () => {
    await remove(memory.meta.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative max-w-3xl w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative">
          {memory.meta.type === 'photo' ? (
            <img src={memory.url} alt={memory.meta.caption ?? 'Memory'} className="w-full max-h-[60vh] object-contain" />
          ) : memory.meta.type === 'video' ? (
            <video src={memory.url} controls autoPlay className="w-full max-h-[60vh] object-contain" />
          ) : (
            <div className="grid place-items-center h-64 bg-zinc-800/60"><span className="text-6xl">🎵</span></div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full bg-black/60 hover:bg-black/80 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="text-[11px] text-zinc-500">
              {new Date(memory.meta.takenAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
            <div className="flex gap-1.5">
              {editing ? (
                <button onClick={() => void save()} className="w-7 h-7 grid place-items-center rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                  <Check className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button onClick={() => setEditing(true)} className="w-7 h-7 grid place-items-center rounded-md bg-zinc-800 text-zinc-400 hover:text-white">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => void handleDelete()} className="w-7 h-7 grid place-items-center rounded-md bg-zinc-800 text-zinc-400 hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {editing ? (
            <div className="space-y-2">
              <input
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Caption..."
                className="w-full bg-zinc-800/70 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 outline-none focus:border-zinc-500"
              />
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <input
                  value={peopleText}
                  onChange={e => setPeopleText(e.target.value)}
                  placeholder="People (comma separated)"
                  className="w-full bg-zinc-800/70 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 outline-none focus:border-zinc-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[15px] text-zinc-200">{memory.meta.caption ?? 'Untitled memory'}</p>
              {memory.meta.people && memory.meta.people.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {memory.meta.people.map(p => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{p}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

## 3.12 Leaf components (summaries — full source on REQUEST)

- **RecapPlayer.tsx** — "This year in memories" auto-play strip: most-recent photos + yearly stats; plays a short slideshow with year badge.
- **MemoryUploader.tsx** — drag/drop + file input (multi, photo/video/audio), calls `onUpload(files)` → `memories.upload`.
- **PersonChip.tsx** — small pill chip `(name, onRemove)` for people tags.
- **videoThumbnail.ts** — helper extracting a video frame to a canvas/object URL for thumbnail display.
