# CONTEXT_BUNDLE.md — Lyceum Learn Hierarchy & Naming Expansion

> **Project:** DeskFlow / App Tracker (Electron + React + TypeScript + better-sqlite3)
> **Module:** Lyceum Learn (library, curriculum, lessons)
> **Date:** 2026-08-08
> **Purpose:** Self-contained code context so the target AI can design the new hierarchy without repo access.
> **Files are CRLF. Dark-mode-only UI. Tailwind v4.**

---

## 0. The Ask (user's raw requirements, captured this session)

The user wants the **best hierarchy and names** for the Learn library. Requirements:

1. **Library page ("the page where we show the books") must show the TOPIC name.**
2. **Group must sit HIGHER than Topic** — one group contains many topics (currently the opposite: part=Topic is the shelf, chapter=Group is nested inside it).
3. **Group names are user-customizable** → group is the top-level user-facing container.
4. **Expand beyond computer skills** — "branches of study" for other disciplines (not just CS).
5. **Prerequisite nesting**: e.g. learning-agent books have many prerequisite topics, each with subtopics, each subtopic having its own list of topics to learn.

Current hierarchy (to be re-designed): `Part (0-10, predefined, = "Topic") → Chapter (user-created, = "Group") → Lesson (.ldoc) → Node (section inside lesson)`, with a separate **Mastery axis L0-L5**.

---

## 1. Current Data Model (verbatim types)

### src/shared/learn/types.ts (lines 40-48) — LdocLesson
```ts
export interface LdocLesson {
  id: string;
  title: string;
  part: number;
  version: string;
  summary?: string;
  chapter?: string;
  authored_by?: 'human' | 'ai' | 'hybrid';
}
```

### src/shared/learn/types.ts (lines 242-253) — LessonSummary (what the library renders)
```ts
export interface LessonSummary {
  id: string;
  title: string;
  part: number;
  version: string;
  status: LessonStatus;
  nodeCount: number;
  chapter: string;
  original_prompt: string;
  created_at: string;
  updated_at: string;
}
```

### src/shared/learn/types.ts (lines 368-385) — LearnerProfile (localStorage)
```ts
export interface LearnerProfile {
  version: 1;
  density: Density;
  modalityBias: ModalityBias;
  exampleStance: ExampleStance;
  mathDepth: MathDepth;
  handsOn: 0 | 1 | 2 | 3;
  codeStagingDepth: CodeStaging;
  quizAppetite: QuizAppetite;
  chunkSize: ChunkSize;
  layerRevealDefault: MasteryLevel;
  tone: Tone;
  priorKnowledge: Partial<Record<number, MasteryLevel>>;
  knowledgeBase: KnowledgeEntry[];
  confidence: Record<string, number>;
  customChapters: string[];        // ← user-created group names live here (localStorage)
  updatedAt: string;
}
```
Default: `customChapters: []` (line 401).

### src/shared/learn/types.ts (lines 356-366) — KnowledgeEntry (partIds link entries to topics)
```ts
export interface KnowledgeEntry {
  id: string;
  statement: string;
  topic?: string;
  partIds?: number[];
  linkedLessons?: string[];
  keywords?: string[];
  level?: MasteryLevel;
  createdAt: string;
  updatedAt: string;
}
```

---

## 2. The Curriculum Blueprint (predefined "parts" = current Topic axis)

### src/services/learn/curriculum.ts (lines 9-20) — CurriculumPart interface
```ts
export interface CurriculumPart {
  part: number;
  slug: string;
  emoji: string;
  title: string;
  rarity: number;
  phase: 1 | 2 | 3;
  trailer: CurriculumTrailer;
  intro: string;
  defaultMasteryTarget: MasteryLevel;
  checklist: string[];
}
```

### All 13 parts (parts 0-12; NOTE: DB CHECK allows only 0-10 — see §3):
| part | slug | title |
|------|------|-------|
| 0 | what-ai-engineers-do | What AI Engineers Actually Do |
| 1 | (cs-systems) | CS & Systems Foundations |
| 2 | (sw-arch) | Software Design & Architecture |
| 3 | (perf) | Performance & Efficiency |
| 4 | (databases) | Databases, Deep |
| 5 | (security) | Security (app + data + AI) |
| 6 | (ml-math) | ML/DL Math & Theory |
| 7 | (pytorch) | PyTorch & DL Engineering |
| 8 | (applied-ai) | Applied AI / LLM Engineering |
| 9 | (mlops) | MLOps & Production ML |
| 10 | (meta-skills) | The Meta-Skills |
| 11 | (vision) | Vision & Multimodal AI |
| 12 | (training) | Training, Fine-Tuning & Adaptation |

Helpers at lines 340-349: `getPart(part)` and `getPartBySlug(slug)` return the CurriculumPart.

**This blueprint is CS/AI-engineering only.** The user wants "branches of study" — other disciplines (language learning, music, etc.). The blueprint array is the natural place to grow a `branch` concept.

---

## 3. Database Schema (verbatim migrations)

### src/services/learn/db/migrations/001_learn.sql (lines 4-15) — learn_lessons
```sql
CREATE TABLE IF NOT EXISTS learn_lessons (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  part         INTEGER NOT NULL CHECK(part BETWEEN 0 AND 10),
  version      TEXT NOT NULL,
  summary      TEXT,
  authored_by  TEXT,
  doc_json     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
```
⚠️ **CHECK constraint is 0-10 but CURRICULUM_BLUEPRINT defines 0-12** — parts 11-12 cannot be inserted today. A new `branch`/`group` column + migration must widen this constraint (SQLite requires table rebuild or the migration must DROP CHECK via table recreate).

### src/services/learn/db/migrations/006_lesson_chapter_and_prompt.sql (full)
```sql
-- Add chapter grouping and original prompt storage to learn_lessons
ALTER TABLE learn_lessons ADD COLUMN chapter TEXT DEFAULT '';
```

### Related tables (001_learn.sql, full file lines 17-92):
```sql
CREATE TABLE IF NOT EXISTS learn_nodes (
  id             TEXT PRIMARY KEY,
  lesson_id      TEXT NOT NULL REFERENCES learn_lessons(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  mastery_target TEXT NOT NULL,
  content_hash   TEXT NOT NULL,
  ord            INTEGER NOT NULL,
  blocks_json    TEXT NOT NULL,
  grounding_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learn_node_prereqs (
  node_id    TEXT NOT NULL REFERENCES learn_nodes(id) ON DELETE CASCADE,
  prereq_id  TEXT NOT NULL,
  PRIMARY KEY (node_id, prereq_id)
);

CREATE TABLE IF NOT EXISTS learn_progress (
  node_id     TEXT PRIMARY KEY REFERENCES learn_nodes(id) ON DELETE CASCADE,
  level       TEXT NOT NULL DEFAULT 'L0',
  belief_json TEXT NOT NULL,
  stability   REAL NOT NULL DEFAULT 0,
  last_seen   TEXT,
  due_at      TEXT
);
```
Migration mechanism: files run in order at startup, guarded by PRAGMA user_version increments (see src/services/learn/db/repo.ts runMigration).

---

## 4. IPC Endpoints (backend is REAL — verified)

### src/services/learn/index.ts (lines 205-233) — list + get handlers
```ts
ipcMain.handle('learn:listLessons', (_event, { part }: { part?: number } = {}) => {
  return content.listLessons(part);
});

ipcMain.handle('learn:listChapters', (_event, { part }: { part?: number } = {}) => {
  try {
    let rows: any[];
    if (part != null) {
      rows = db.prepare("SELECT DISTINCT chapter FROM learn_lessons WHERE part = ? AND chapter != '' ORDER BY chapter").all(part);
    } else {
      rows = db.prepare("SELECT DISTINCT chapter, part FROM learn_lessons WHERE chapter != '' ORDER BY part, chapter").all();
    }
    return { ok: true, data: rows.map((r: any) => r.chapter) };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('learn:getGraph', (_event, { part }: { part?: number } = {}) => {
  return content.getGraph(part);
});
```

### src/services/learn/index.ts (lines 690-718) — updateLessonMeta (supports part + chapter)
```ts
ipcMain.handle('learn:updateLessonMeta', async (_event, args: { lessonId: string; title?: string; part?: number; summary?: string; chapter?: string }) => {
  try {
    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];
    if (args.title !== undefined) { updates.push('title = ?'); params.push(args.title); }
    if (args.part !== undefined) { updates.push('part = ?'); params.push(args.part); }
    if (args.summary !== undefined) { updates.push('summary = ?'); params.push(args.summary); }
    if (args.chapter !== undefined) { updates.push('chapter = ?'); params.push(args.chapter); }
    params.push(args.lessonId);
    db.prepare(`UPDATE learn_lessons SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Also update title in doc_json if changed
    if (args.title !== undefined) {
      const row = db.prepare('SELECT doc_json FROM learn_lessons WHERE id = ?').get(args.lessonId) as any;
      if (row) {
        const doc = JSON.parse(row.doc_json);
        if (doc.lesson) doc.lesson.title = args.title;
        if (args.part !== undefined) doc.lesson.part = args.part;
        if (args.summary !== undefined) doc.lesson.summary = args.summary;
        if (args.chapter !== undefined) doc.lesson.chapter = args.chapter;
        db.prepare('UPDATE learn_lessons SET doc_json = ? WHERE id = ?').run(JSON.stringify(doc), args.lessonId);
      }
    }

    return { ok: true, data: null };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
});
```

### Result wrapper pattern (every handler): `{ ok: true, data } | { ok: false, error }`.

### Preload bridge (src/preload.ts):
```ts
// line ~1186
learnListChapters: (params?: { part?: number }) => ipcRenderer.invoke('learn:listChapters', params || {}),
// line ~1291
learnUpdateLessonMeta: (args: { lessonId: string; title?: string; part?: number; summary?: string; chapter?: string }) => ipcRenderer.invoke('learn:updateLessonMeta', args),
```
Renderer calls `api.learnListLessons({})` → `{ ok, data: LessonSummary[] }`.

---

## 5. Custom Groups (user-created chapter names) — localStorage

### src/services/learn/learnerProfile.ts (lines 168-196) — full functions
```ts
// ── Custom chapter groups (user-managed list of groups for lesson organization) ──

export function loadCustomChapters(): string[] {
  return loadProfile().customChapters ?? [];
}

export function addCustomChapter(name: string): LearnerProfile {
  const p = loadProfile();
  const clean = name.trim();
  if (!clean) return p;
  const cur = loadCustomChapters();
  if (cur.includes(clean)) return p;
  p.customChapters = [...cur, clean];
  return saveProfile(p);
}

export function renameCustomChapter(oldName: string, nextName: string): LearnerProfile {
  const p = loadProfile();
  const clean = nextName.trim();
  if (!clean) return p;
  p.customChapters = (p.customChapters ?? []).map((c) => (c === oldName ? clean : c));
  return saveProfile(p);
}

export function removeCustomChapter(name: string): LearnerProfile {
  const p = loadProfile();
  p.customChapters = (p.customChapters ?? []).filter((c) => c !== name);
  return saveProfile(p);
}
```
`saveProfile` persists to localStorage key (`learnerProfile`), dispatches `CustomEvent('lyceum:profile-changed')`, wrapped in try/catch. All localStorage access MUST be try/catch (project invariant).

---

## 6. LessonLibrary.tsx (the "library / books" page) — FULL source

### src/components/learn/LessonLibrary.tsx (full, 248 lines)
```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileUp, Sparkles, BookMarked, LayoutGrid, Rows3, FolderCog } from 'lucide-react';
import type { LessonSummary, TutorDashboardData } from '../../shared/learn/types';
import { BookCard } from './BookCard';
import { BookSpine } from './BookSpine';
import { BlurFade } from '../ui/blur-fade';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { MasteryStrip } from './MasteryStrip';
import { TutorDashboardSection } from './TutorDashboardSection';
import { CollapsibleAnalytics } from './CollapsibleAnalytics';
import { ProgressDashboard } from './ProgressDashboard';
import type { MasteryStats } from './useMasteryStats';
import { CURRICULUM_BLUEPRINT } from '../../services/learn/curriculum';

export interface LessonLibraryProps {
  lessons: LessonSummary[];
  loading?: boolean;
  onOpen: (id: string) => void;
  onInfo?: (id: string) => void;
  onCompose: () => void;
  onImport: () => void;
  onWelcome?: () => void;
  stats?: MasteryStats;
  onOpenProfile?: () => void;
  getDashboard?: () => Promise<TutorDashboardData>;
  onNavigateToNode?: (nodeId: string) => void;
  onManageGroups?: () => void;
}

function LibrarySkeletons({ spine }: { spine?: boolean }) {
  if (spine) {
    return (
      <div className="flex gap-2 items-end overflow-x-auto pb-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="w-12 rounded-md" style={{ height: 220 }} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-[248px] w-full rounded-r-md rounded-l-sm" />
          <Skeleton className="mx-auto h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

type ViewMode = 'covers' | 'spines';

export function LessonLibrary({ lessons, loading, onOpen, onInfo, onCompose, onImport, onWelcome, stats, onOpenProfile, getDashboard, onNavigateToNode, onManageGroups }: LessonLibraryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('covers');

  // Group lessons into shelves by part so the library reads like a curriculum.
  const shelves = new Map<number, LessonSummary[]>();
  for (const l of lessons) {
    const arr = shelves.get(l.part) ?? [];
    arr.push(l);
    shelves.set(l.part, arr);
  }
  const orderedParts = Array.from(shelves.keys()).sort((a, b) => a - b);

  return (
    <div className="lyceum-library mx-auto w-full max-w-6xl px-6 py-10" data-page="learn">
      <BlurFade inView>
        <header className="mb-9 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-clay-300">Lyceum</p>
            <h1 className="mt-1 font-serif text-4xl font-semibold text-glow">Your Library</h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              {lessons.length} {lessons.length === 1 ? 'volume' : 'volumes'} on the shelf. Every lesson is
              grounded, versioned, and ready to study.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setViewMode('covers')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'covers'
                    ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Cover grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('spines')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'spines'
                    ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Spine view"
              >
                <Rows3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {onWelcome && (
              <button
                onClick={onWelcome}
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500 underline-offset-4 transition-colors hover:text-glow hover:underline"
              >
                &larr; Welcome
              </button>
            )}
            <Button variant="secondary" onClick={onImport}>
              <FileUp className="mr-2 h-4 w-4" />
              Import
            </Button>
            {onManageGroups && (
              <button
                onClick={onManageGroups}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/50 bg-zinc-800/40 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:bg-zinc-700/50 hover:border-zinc-600/60"
                title="Manage chapter groups"
              >
                <FolderCog className="h-4 w-4" />
                Groups
              </button>
            )}
            <button
              onClick={onCompose}
              className="inline-flex items-center gap-2 rounded-xl border border-clay-400/40 bg-clay-500/15 px-5 py-2.5 font-serif text-sm font-semibold text-glow transition-all hover:bg-clay-500/25 hover:shadow-[0_0_20px_rgba(194,85,58,0.25)]"
            >
              <Plus className="h-4 w-4" />
              Compose lesson
            </button>
          </div>
        </header>
      </BlurFade>

      {stats && <MasteryStrip stats={stats} onOpenNode={onOpen} onOpenProfile={onOpenProfile} />}

      {/* Inline analytics — collapsed by default, expands when user has streak */}
      {lessons.length > 0 && (
        <CollapsibleAnalytics streakDays={0}>
          <ProgressDashboard embedded />
        </CollapsibleAnalytics>
      )}

      {getDashboard && lessons.length > 0 && (
        <div className="mb-8">
          <TutorDashboardSection
            getDashboard={getDashboard}
            onNavigateToNode={onNavigateToNode}
          />
        </div>
      )}

      {loading ? (
        <LibrarySkeletons spine={viewMode === 'spines'} />
      ) : viewMode === 'spines' ? (
        // ── Spine View ──
        <div className="space-y-12">
          {orderedParts.map((part) => {
            const partLessons = shelves.get(part)!;
            const partInfo = CURRICULUM_BLUEPRINT.find(p => p.part === part);
            return (
              <section key={part}>
                <div className="mb-4 flex items-center gap-3">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-400">
                    {partInfo?.emoji || '📖'} Topic {String(part).padStart(2, '0')} — {partInfo?.title || `Topic ${part}`}
                  </h2>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                <div className="flex gap-2 items-end overflow-x-auto pb-4 ws-scroll">
                  {partLessons.map((lesson, i) => (
                    <BookSpine
                      key={lesson.id}
                      lesson={lesson}
                      index={i}
                      onOpen={onOpen}
                      onInfo={onInfo}
                    />
                  ))}
                </div>

                {/* wooden shelf rail */}
                <div className="lyceum-shelf-rail mt-1 h-2 w-full rounded-full" />
              </section>
            );
          })}
        </div>
      ) : (
        // ── Cover Grid View ──
        <div className="space-y-12">
          {orderedParts.map((part) => {
            const partLessons = shelves.get(part)!;
            const chapters = new Map<string, LessonSummary[]>();
            for (const l of partLessons) {
              const ch = l.chapter || '';
              const arr = chapters.get(ch) || [];
              arr.push(l);
              chapters.set(ch, arr);
            }
            const orderedChapters = Array.from(chapters.keys()).sort((a, b) => {
              if (!a) return 1;
              if (!b) return -1;
              return a.localeCompare(b);
            });

            return (
              <section key={part}>
                <div className="mb-4 flex items-center gap-3">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-400">
                    Topic {String(part).padStart(2, '0')}
                  </h2>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                {orderedChapters.map((chapter) => (
                  <div key={chapter || '__ungrouped__'} className="mb-6 last:mb-0">
                    {chapter && (
                      <div className="mb-3 flex items-center gap-2 ml-1">
                        <BookMarked className="h-3 w-3 text-zinc-500" />
                        <h3 className="text-xs font-medium text-zinc-500">{chapter}</h3>
                        <span className="h-px flex-1 bg-white/5" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
                      {chapters.get(chapter)!.map((lesson, i) => (
                        <BookCard key={lesson.id} lesson={lesson} index={i} onOpen={onOpen} onInfo={onInfo} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* wooden shelf rail */}
                <div className="lyceum-shelf-rail mt-3 h-2 w-full rounded-full" />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
```
**KEY OBSERVATION (bug):** Cover view header (line ~217) renders `Topic {part}` WITHOUT the blueprint title; spine view (line ~171) DOES render `emoji + Topic NN — title`. The user's "library should show the TOPIC name" complaint points here.

---

## 7. ChapterGroupsModal.tsx (Group manager) — FULL source

### src/components/learn/ChapterGroupsModal.tsx (full, 273 lines)
```tsx
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookMarked, Check, Edit2, FolderCog, Loader2, Plus, Trash2, X } from 'lucide-react';
import type { LessonSummary } from '../../shared/learn/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  loadCustomChapters,
  addCustomChapter,
  renameCustomChapter,
  removeCustomChapter,
} from '../../services/learn/learnerProfile';

interface ChapterGroupsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ChapterGroup {
  name: string;
  lessonCount: number;
  isCustom: boolean;
}

export function ChapterGroupsModal({ open, onClose }: ChapterGroupsModalProps) {
  const [groups, setGroups] = useState<ChapterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const custom = loadCustomChapters();
      const [existingRes, lessonsRes] = await Promise.all([
        api.learnListChapters?.({}) ?? { ok: true, data: [] },
        api.learnListLessons?.({}) ?? { ok: true, data: [] },
      ]);
      const existingChapters: string[] = existingRes.ok ? (existingRes.data ?? []) : [];
      const lessons: LessonSummary[] = lessonsRes.ok ? (lessonsRes.data ?? []) : [];

      const chapterCounts = new Map<string, number>();
      for (const l of lessons) {
        const ch = l.chapter?.trim();
        if (ch) chapterCounts.set(ch, (chapterCounts.get(ch) ?? 0) + 1);
      }

      const seen = new Set<string>();
      const all: ChapterGroup[] = [];

      for (const c of custom) {
        if (!seen.has(c)) {
          seen.add(c);
          all.push({ name: c, lessonCount: chapterCounts.get(c) ?? 0, isCustom: true });
        }
      }
      for (const c of existingChapters) {
        if (!seen.has(c)) {
          seen.add(c);
          all.push({ name: c, lessonCount: chapterCounts.get(c) ?? 0, isCustom: false });
        }
      }

      setGroups(all);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    addCustomChapter(name);
    setNewName('');
    load();
    setAdding(false);
  };

  const handleRename = async (oldName: string) => {
    const name = editName.trim();
    if (!name || name === oldName) {
      setEditing(null);
      return;
    }
    renameCustomChapter(oldName, name);
    setEditing(null);
    load();
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Remove group "${name}"? Lessons keep their chapter label.`)) return;
    setDeleting(name);
    removeCustomChapter(name);
    setDeleting(null);
    load();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editing) handleRename(editing);
      else handleAdd();
    } else if (e.key === 'Escape') {
      setEditing(null);
      setNewName('');
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 8 }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0.06 }}
          className="relative w-full max-w-md max-h-[70vh] flex flex-col rounded-xl border border-zinc-800/50 bg-zinc-900/80 backdrop-blur-xl shadow-2xl shadow-black/40"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Manage chapter groups"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-clay-500/10 border border-clay-500/20 flex items-center justify-center shrink-0">
                <FolderCog className="w-4 h-4 text-clay-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100 leading-tight">Manage Chapter Groups</h2>
                <p className="text-xs text-zinc-500 mt-0.5 leading-none">Curate your own group list for lesson organization</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
            {/* Add new group */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Create new group</label>
              <div className="flex gap-1.5">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. OS Memory Management"
                  className="flex-1"
                  disabled={adding}
                />
                <Button
                  onClick={handleAdd}
                  disabled={adding || !newName.trim()}
                  className="shrink-0"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-zinc-600 mt-1">Groups appear in the chapter selector when creating lessons</p>
            </div>

            {/* Groups list */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-12">
                <BookMarked className="w-10 h-10 mx-auto text-zinc-700 mb-2" />
                <p className="text-sm text-zinc-500">No groups yet</p>
                <p className="text-xs text-zinc-600 mt-1">Create your first group above to start organizing lessons</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => (
                  <div
                    key={g.name}
                    className="flex items-center justify-between p-3 rounded-lg border transition-all
                      bg-zinc-800/40 border-zinc-700/40 hover:border-zinc-600/60"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <BookMarked className={`w-3.5 h-3.5 shrink-0 ${g.isCustom ? 'text-clay-400' : 'text-zinc-500'}`} />
                      <span className="text-sm text-zinc-200 truncate">{g.name}</span>
                      {g.lessonCount > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-zinc-800/60">
                          {g.lessonCount} lesson{g.lessonCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {!g.isCustom && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] text-zinc-500 bg-zinc-800/40">AI</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {g.isCustom && !editing && (
                        <button
                          onClick={() => { setEditName(g.name); setEditing(g.name); }}
                          className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                          aria-label={`Rename ${g.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {editing === g.name ? (
                        <>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={() => handleRename(g.name)}
                            autoFocus
                            className="w-40"
                          />
                          <button
                            onClick={() => handleRename(g.name)}
                            className="p-1.5 rounded text-sage-400 hover:text-sage-300 hover:bg-sage-500/10 transition-colors"
                            aria-label="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : g.isCustom && (
                        <button
                          onClick={() => handleDelete(g.name)}
                          disabled={deleting === g.name}
                          className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          aria-label={`Delete ${g.name}`}
                        >
                          {deleting === g.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end px-6 py-3 border-t border-zinc-800/80 shrink-0 gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 border border-zinc-700/50 transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```
**NOTE:** `renameCustomChapter`/`removeCustomChapter` only touch the localStorage list — they do NOT update `learn_lessons.chapter` for lessons (lesson labels persist on the lesson row; the modal says "Lessons keep their chapter label").

---

## 8. HierarchyGuide.tsx (current visual hierarchy) — FULL source

### src/components/learn/HierarchyGuide.tsx (full, 163 lines)
```tsx
import React from 'react';
import { Layers, BookOpen, FileText, Target, ChevronRight, Sparkles, Users, Brain } from 'lucide-react';

/**
 * Visual hierarchy guide for the Learn module.
 * Shows Topic → Group → Lesson → Node with real examples and connecting lines.
 */

const MASTERY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  L0: { bg: 'bg-zinc-700/50', text: 'text-zinc-400', label: 'Beginner' },
  L1: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Aware' },
  L2: { bg: 'bg-teal-500/15', text: 'text-teal-400', label: 'Apprentice' },
  L3: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Practitioner' },
  L4: { bg: 'bg-violet-500/15', text: 'text-violet-400', label: 'Proficient' },
  L5: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Expert' },
};

function TreeLine({ color = 'border-zinc-700/40' }: { color?: string }) {
  return <div className={`absolute left-5 top-0 bottom-0 w-px ${color}`} />;
}

function TreeDot({ color = 'bg-clay-500' }: { color?: string }) {
  return <div className={`absolute left-[18px] top-3 w-2 h-2 rounded-full ${color} ring-2 ring-zinc-900 z-10`} />;
}

function TopicCard() {
  return (
    <div className="relative">
      <TreeDot color="bg-clay-500" />
      <div className="ml-10 rounded-xl border border-clay-500/20 bg-clay-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4 text-clay-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-clay-400">Topic</span>
          <span className="text-[10px] text-zinc-600">— Predefined subject area</span>
        </div>
        <div className="font-serif text-lg font-semibold text-zinc-100">Software Design & Architecture</div>
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] text-emerald-400 font-medium">
            <Target className="w-2.5 h-2.5" /> Practitioner
          </span>
          <span className="text-[10px] text-zinc-600">You're at practitioner level for this topic</span>
        </div>
      </div>
    </div>
  );
}

function GroupCard() {
  return (
    <div className="relative">
      <TreeDot color="bg-sage-500" />
      <div className="ml-10 rounded-xl border border-sage-500/20 bg-sage-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-sage-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-sage-400">Group</span>
          <span className="text-[10px] text-zinc-600">— Your custom category</span>
        </div>
        <div className="font-serif text-base font-semibold text-zinc-100">Design Patterns</div>
        <div className="text-xs text-zinc-500 mt-1">You created this group to organize related lessons</div>
      </div>
    </div>
  );
}

function LessonCard() {
  return (
    <div className="relative">
      <TreeDot color="bg-amber-500" />
      <div className="ml-10 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-amber-400">Lesson</span>
          <span className="text-[10px] text-zinc-600">— One .ldoc file</span>
        </div>
        <div className="font-serif text-base font-semibold text-zinc-100">Observer Pattern</div>
        <div className="text-xs text-zinc-500 mt-1">A self-contained learning unit with multiple sections inside</div>
      </div>
    </div>
  );
}

function NodeCard({ title, mastery, example }: { title: string; mastery: string; example: string }) {
  const mc = MASTERY_COLORS[mastery] || MASTERY_COLORS.L0;
  return (
    <div className="relative">
      <TreeDot color="bg-violet-500" />
      <div className="ml-10 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-violet-400">Node</span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium ${mc.bg} ${mc.text}`}>
            {mc.label}
          </span>
        </div>
        <div className="text-sm font-medium text-zinc-100">{title}</div>
        <div className="text-[11px] text-zinc-500 mt-0.5">{example}</div>
      </div>
    </div>
  );
}

export function HierarchyGuide({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-1">
      {showHeader && (
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-clay-400" />
          <span className="text-sm font-medium text-zinc-200">How Lyceum is organized</span>
        </div>
      )}

      <div className="relative space-y-4">
        <TreeLine />
        <TopicCard />

        <div className="pl-10 relative">
          <TreeLine />
          <GroupCard />
        </div>

        <div className="pl-20 relative">
          <TreeLine />
          <LessonCard />
        </div>

        <div className="pl-32 relative space-y-3">
          <NodeCard
            title="What is the Observer Pattern?"
            mastery="L2"
            example="Define the pattern, show when to use it, and compare to pub/sub"
          />
          <NodeCard
            title="Implementing Observer in TypeScript"
            mastery="L3"
            example="Step-by-step code walkthrough with real examples"
          />
          <NodeCard
            title="Observer vs Mediator vs Pub/Sub"
            mastery="L4"
            example="When to use which pattern, trade-offs, and anti-patterns"
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3 text-[11px]">
        <div className="flex items-start gap-2">
          <Brain className="w-3.5 h-3.5 text-clay-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-zinc-300 font-medium">Mastery</span>
            <span className="text-zinc-600"> — Your level per Topic updates based on quiz results and tutor interactions</span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 text-sage-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-zinc-300 font-medium">Groups</span>
            <span className="text-zinc-600"> — You create these to organize lessons. Topics are predefined.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```
⚠️ **This guide hardcodes the CURRENT (wrong) order: Topic → Group → Lesson → Node.** The redesign will likely INVERT Group above Topic and add a Branch level — this component (wired into LearnHome + OnboardingPanel step 1) must be updated to match.

---

## 9. Where these components are wired (LearnPage.tsx)

```tsx
// LearnPage.tsx:77
const [showGroupsModal, setShowGroupsModal] = useState(false);

// LearnPage.tsx:470-485 (LessonLibrary usage)
<LessonLibrary
  lessons={lessons}
  loading={loading}
  onOpen={openLesson}
  onInfo={...}
  onCompose={...}
  onImport={...}
  onWelcome={...}
  stats={stats}
  onOpenProfile={...}
  getDashboard={...}
  onNavigateToNode={...}
  onManageGroups={() => setShowGroupsModal(true)}
/>

// LearnPage.tsx:682
<ChapterGroupsModal open={showGroupsModal} onClose={() => setShowGroupsModal(false)} />
```

LearnerSetup Q8 (prior knowledge per part) uses `loadUserLessons()` → `{ titles, parts }` and labels chips `lessonTitles[part] ?? Part {part}` (LearnerSetup.tsx:281-344) — also affected by any part→topic rename.

---

## 10. Design Tokens (Lyceum) — from src/index.css @theme

```css
--color-clay-300: #f0a892;
--color-clay-400: #e8866b;
--color-clay-500: #d96846;
--color-clay-600: #c2553a;
--color-sage-400: #6fb38f;
--color-amber-400: #fbbf24;
--color-sky-400: #5ab0c9;
--color-glow: #f7f3ee;
--font-serif: "Source Serif 4", Georgia, serif;   /* headings / book titles */
--font-sans: "Inter", ...;                          /* body */
--font-mono: "JetBrains Mono", ...;                 /* labels / tracking */
--font-display: "Space Grotesk", ...;
```
- Books feel: `lyceum-shelf-rail` (wooden shelf rail), `BookCard`, `BookSpine`, `BookOpening` components in src/components/learn/.
- Card language: `rounded-xl` max, glass `bg-zinc-900/80 backdrop-blur-xl`, `font-mono text-[11px] uppercase tracking-[0.2-0.32em]` for section labels.

---

## 11. MCP Component Inventory (real, installed/available)

| Component | Source | Use for |
|-----------|--------|---------|
| tabs, accordion, dialog, input, select, button, badge, skeleton, tooltip | shadcn (installed) | UI primitives |
| file-tree (Tree/Folder/File, expandable, sorted, indicator lines) | Magic UI registry | branch → group → topic tree navigation |
| animated-beam, border-beam, magic-card, number-ticker, particles, shimmer-button, terminal | Magic UI (available) | effects on cards/hero |
| Layers, BookOpen, FileText, Target, Users, Brain, BookMarked, FolderCog, LayoutGrid, Rows3, Sparkles, Plus, Edit2, Trash2, Check, X, ChevronRight, GraduationCap, LibraryBig, FolderTree, Boxes, GitBranch | lucide-react (installed) | icons for hierarchy levels |
| 135+ animated components | React Bits | optional flavor |
| 200k+ icons | Iconify | fallback |

**Re-skin rules:** replace source colors with tokens above; max `rounded-xl`; `p-5`; dark-only; Geist/JetBrains Mono/Inter; glass layer pattern. Do NOT use default purple gradients.

---

## 12. Hard Invariants / Gotchas

1. **Build:** renderer = `npx vite build` (emptyOutDir: true, hashed assets); preload = `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`; main = `node scripts/rebuild-main.mjs`; learn service files are compiled PER-FILE (see MEMORY) — after touching src/services/learn/*.ts, recompile each with esbuild NO --bundle.
2. **DB CHECK(part BETWEEN 0 AND 10)** blocks parts 11-12 (blueprint has 12 parts) — any new branch/group column migration must handle this (SQLite table-recreate or drop CHECK).
3. **localStorage access MUST be try/catch** (LearnerProfile save/load).
4. **Result wrapper** `{ ok, data } | { ok, error }` on every IPC handler; renderer always checks `res.ok`.
5. **HierarchyGuide must not regress to a text list** (user demanded the visual tree — memory 2026-08-08).
6. **Files are CRLF** — preserve line endings, no mass reformat.
7. PTY event order, black-screen checklist etc. are unrelated to this module but never break the build.
