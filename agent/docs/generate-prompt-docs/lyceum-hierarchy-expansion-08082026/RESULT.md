# RESULT.md — Lyceum Learn: Hierarchy & Naming Expansion

> **Status:** Final Design Specification  
> **Target:** Lead Architect implementation  
> **Date:** 2026-08-09  
> **Decision:** ONE hierarchy. No options. No A/B.

---

## 1. Hierarchy & Naming

### 1.1 The Confusion, Resolved

| Old Name (DB) | Old UI Label | New UI Label | What It Actually Is |
|---------------|--------------|--------------|---------------------|
| `part` (int 0-12) | "Topic" / "Part" | **Topic** | Predefined curriculum area from blueprint |
| `chapter` (string) | "Chapter" / "Group" | **Group** | User-curated container, customizable name |
| — | — | **Branch** | Discipline / field of study (CS, Languages, Music, Math) |
| — | — | **Subtopic** | Optional nesting layer inside a Topic |
| `node` | "Node" | **Node** | Section inside a lesson (unchanged) |
| L0-L5 | "Mastery" | **Mastery** | Per-Topic proficiency axis (unchanged semantics) |

**Rule:** DB columns keep their old names (`part`, `chapter`) for migration safety. UI copy and TypeScript interfaces use the new canonical names. No more `Part` vs `Topic` vs `Chapter` ambiguity.

### 1.2 The Final Tree

```
Branch of Study          ← "Computer Science & AI" (predefined discipline)
  └── Group              ← "Core Fundamentals" (user-created, customizable)
        └── Topic        ← "Software Design & Architecture" (predefined curriculum area)
              └── Subtopic   ← "Design Patterns" (optional, from blueprint or freeform)
                    └── Lesson   ← "Observer Pattern.ldoc" (the book)
                          └── Node   ← "What is the Observer Pattern?" (section)
                          └── Node   ← "Implementing in TypeScript" (section)
                          └── Node   ← "Observer vs Mediator" (section)
```

### 1.3 Rationale

- **Branch** sits at the top because disciplines are mutually exclusive containers. A user studies CS *or* Languages *or* Music at a given moment. Branches have identity (emoji, color) like the old parts had.
- **Group** is the user's personal shelf. They curate it. It sits above Topic because the user explicitly said: "one group can contain many topics." A group like "Interview Prep" might pull topics from different parts of the curriculum.
- **Topic** is the curriculum's predefined axis. It provides structure and mastery tracking. It sits below Group because the curriculum defines *what* exists, but the user defines *how* they organize it.
- **Subtopic** is optional. It solves the "learning-agent books have prerequisite topics with subtopics" case without exploding the hierarchy depth. It is a string tag, not a full tree node.
- **Mastery** attaches to **Topic** (and optionally Subtopic for granularity). This keeps the existing L0-L5 system intact while scoping it correctly.

### 1.4 Branch Identity

Branches get the same visual treatment old parts had: emoji + color + title. The existing CS/AI blueprint becomes the first branch (`cs-ai`).

```ts
export const CURRICULUM_BRANCHES = [
  { id: 'cs-ai',     emoji: '🤖', title: 'Computer Science & AI',       color: 'clay',  ord: 0 },
  { id: 'languages', emoji: '🗣️', title: 'Language Learning',           color: 'sage',  ord: 1 },
  { id: 'music',     emoji: '🎵', title: 'Music Theory & Practice',     color: 'amber', ord: 2 },
  { id: 'math',      emoji: '∑',  title: 'Mathematics',                 color: 'sky',   ord: 3 },
] as const;
```

---

## 2. Data Model & Migration

### 2.1 New / Changed TypeScript Interfaces

#### `src/shared/learn/types.ts` — LdocLesson (lines 40-48)

```ts
export interface LdocLesson {
  id: string;
  title: string;
  part: number;           // ← maps to Topic (UI). Keep DB name.
  version: string;
  summary?: string;
  chapter?: string;       // ← maps to Group (UI). Keep DB name.
  branch_id?: string;     // ← NEW: Branch identifier
  subtopic?: string;      // ← NEW: Optional subtopic tag
  authored_by?: 'human' | 'ai' | 'hybrid';
}
```

#### `src/shared/learn/types.ts` — LessonSummary (lines 242-253)

```ts
export interface LessonSummary {
  id: string;
  title: string;
  part: number;           // ← Topic index
  version: string;
  status: LessonStatus;
  nodeCount: number;
  chapter: string;        // ← Group name
  branch_id: string;      // ← NEW
  subtopic: string;       // ← NEW
  original_prompt: string;
  created_at: string;
  updated_at: string;
}
```

#### `src/shared/learn/types.ts` — LearnerProfile (lines 368-385)

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
  // Mastery axis: keyed by topic slug (branch-agnostic). Legacy numeric key migrated on load.
  priorKnowledge: Partial<Record<string, MasteryLevel>>;
  knowledgeBase: KnowledgeEntry[];
  confidence: Record<string, number>;
  customChapters: string[];   // ← Group names. Keep internal name; UI calls them Groups.
  updatedAt: string;
}
```

**Migration note for `priorKnowledge`:** On profile load, if keys are numeric strings (`"6"`), convert to slugs using the CS branch blueprint: `"6"` → `"ml-math"`. Store result under string keys. This is a one-time localStorage migration in `loadProfile()`.

#### `src/services/learn/curriculum.ts` — CurriculumTopic (renamed from CurriculumPart)

```ts
export interface CurriculumTopic {
  part: number;           // Sort key within branch
  slug: string;           // Globally unique ID (e.g., "pytorch", "spanish-verbs")
  emoji: string;
  title: string;
  rarity: number;
  phase: 1 | 2 | 3;
  trailer: CurriculumTrailer;
  intro: string;
  defaultMasteryTarget: MasteryLevel;
  checklist: string[];
  branchId: string;       // ← NEW: ties topic to a branch
  parentSlug?: string;    // ← NEW: for nested subtopic topics (optional)
  prereqSlugs?: string[]; // ← NEW: prerequisite topic slugs (optional)
}
```

The old `CURRICULUM_BLUEPRINT` array becomes `CURRICULUM_TOPICS: CurriculumTopic[]` and includes `branchId: 'cs-ai'` for all existing entries. New branches append their own topics.

Helpers renamed:
```ts
export function getTopic(part: number, branchId?: string): CurriculumTopic | undefined;
export function getTopicBySlug(slug: string): CurriculumTopic | undefined;
export function getTopicsByBranch(branchId: string): CurriculumTopic[];
export function getTopicChildren(parentSlug: string): CurriculumTopic[];
```

### 2.2 Database Migration — `007_branch_and_hierarchy.sql`

```sql
-- Migration 007: Add branches, widen part constraint, add subtopic, fix parts 11-12
-- PRAGMA user_version bumped to 7 in repo.ts

-- 1. Branches catalog (predefined disciplines)
CREATE TABLE IF NOT EXISTS learn_branches (
  id          TEXT PRIMARY KEY,
  emoji       TEXT NOT NULL DEFAULT '📚',
  title       TEXT NOT NULL,
  description TEXT,
  color       TEXT DEFAULT 'clay',
  ord         INTEGER NOT NULL DEFAULT 0
);

-- 2. Seed the default branch so existing lessons have a home
INSERT OR IGNORE INTO learn_branches (id, emoji, title, description, color, ord)
VALUES ('cs-ai', '🤖', 'Computer Science & AI', 'Engineering, ML, and systems', 'clay', 0);

-- 3. Widen learn_lessons: add branch_id, subtopic; remove CHECK(part BETWEEN 0 AND 10)
--    SQLite has no DROP CONSTRAINT — table recreation required.
ALTER TABLE learn_lessons RENAME TO learn_lessons_old;

CREATE TABLE learn_lessons (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  part         INTEGER NOT NULL,          -- widened: no CHECK constraint
  version      TEXT NOT NULL,
  summary      TEXT,
  authored_by  TEXT,
  doc_json     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft',
  branch_id    TEXT NOT NULL DEFAULT 'cs-ai',
  subtopic     TEXT DEFAULT '',
  chapter      TEXT DEFAULT '',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  FOREIGN KEY (branch_id) REFERENCES learn_branches(id)
);

INSERT INTO learn_lessons (
  id, title, part, version, summary, authored_by,
  doc_json, status, branch_id, subtopic, chapter,
  created_at, updated_at
)
SELECT
  id, title, part, version, summary, authored_by,
  doc_json, status, 'cs-ai', '', IFNULL(chapter, ''),
  created_at, updated_at
FROM learn_lessons_old;

DROP TABLE learn_lessons_old;

-- 4. Indexes for the new query patterns
CREATE INDEX IF NOT EXISTS idx_lessons_branch ON learn_lessons(branch_id);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON learn_lessons(chapter);
CREATE INDEX IF NOT EXISTS idx_lessons_subtopic ON learn_lessons(subtopic);
CREATE INDEX IF NOT EXISTS idx_lessons_branch_part ON learn_lessons(branch_id, part);
```

### 2.3 Sync Story: Groups (localStorage vs DB)

**Decision:** Keep groups in **localStorage** (`customChapters: string[]`) as the "catalog of group names." Keep `chapter` on `learn_lessons` rows as the "assignment."

Why not promote groups to a DB table?
- Groups are user-curated names, not relational entities. They have no metadata beyond a name.
- The existing `ChapterGroupsModal` already manages them perfectly in localStorage.
- A DB table would require sync logic, foreign keys, and cascading renames. Overkill.
- The modal already says: "Lessons keep their chapter label" — this behavior is correct.

**The only change:** rename the UI copy from "Chapter" / "Group" confusion to consistently **"Group"** everywhere.

---

## 3. IPC Changes

### 3.1 Modified Handlers

#### `learn:listLessons`

**Current signature:** `(_event, { part }?: { part?: number })`

**New signature:**
```ts
ipcMain.handle('learn:listLessons', (_event, {
  branchId,
  part,
  chapter,
  subtopic,
}: {
  branchId?: string;
  part?: number;
  chapter?: string;
  subtopic?: string;
} = {}) => {
  return content.listLessons({ branchId, part, chapter, subtopic });
});
```

**Behavior:** Filter lessons by any combination of branch + topic (part) + group (chapter) + subtopic. If `branchId` omitted, default to `'cs-ai'` for backward compatibility until the UI passes it explicitly.

#### `learn:listChapters` → `learn:listGroups`

**Current:** Returns distinct `chapter` strings, optionally filtered by `part`.

**New:**
```ts
ipcMain.handle('learn:listGroups', (_event, {
  branchId,
  part,
}: {
  branchId?: string;
  part?: number;
} = {}) => {
  try {
    let sql = `SELECT DISTINCT chapter FROM learn_lessons WHERE chapter != ''`;
    const params: any[] = [];
    if (branchId) { sql += ` AND branch_id = ?`; params.push(branchId); }
    if (part != null) { sql += ` AND part = ?`; params.push(part); }
    sql += ` ORDER BY chapter`;
    const rows = db.prepare(sql).all(...params);
    return { ok: true, data: rows.map((r: any) => r.chapter) };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
});
```

**Bridge rename in preload.ts:**
```ts
learnListGroups: (params?: { branchId?: string; part?: number }) =>
  ipcRenderer.invoke('learn:listGroups', params || {}),
```

Keep `learnListChapters` as a deprecated alias pointing to `learnListGroups` for one release cycle, then remove.

#### `learn:updateLessonMeta`

**Current args:** `{ lessonId, title?, part?, summary?, chapter? }`

**New args:**
```ts
{
  lessonId: string;
  title?: string;
  part?: number;        // Topic
  summary?: string;
  chapter?: string;     // Group
  branchId?: string;    // Branch
  subtopic?: string;    // Subtopic
}
```

**Handler body:** Add `branch_id` and `subtopic` to the dynamic UPDATE builder, and sync both into `doc_json.lesson` just like `part`/`chapter`/`summary` are synced today.

### 3.2 New Handlers

#### `learn:listBranches`

```ts
ipcMain.handle('learn:listBranches', () => {
  try {
    const rows = db.prepare(
      `SELECT id, emoji, title, description, color, ord FROM learn_branches ORDER BY ord`
    ).all();
    return { ok: true, data: rows };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
});
```

**Preload:**
```ts
learnListBranches: () => ipcRenderer.invoke('learn:listBranches'),
```

#### `learn:getTopicsByBranch`

```ts
ipcMain.handle('learn:getTopicsByBranch', (_event, { branchId }: { branchId: string }) => {
  try {
    const topics = CURRICULUM_TOPICS.filter(t => t.branchId === branchId).sort((a, b) => a.part - b.part);
    return { ok: true, data: topics };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
});
```

**Preload:**
```ts
learnGetTopicsByBranch: (args: { branchId: string }) =>
  ipcRenderer.invoke('learn:getTopicsByBranch', args),
```

### 3.3 IPC Payload Summary

| Channel | Direction | Payload | Returns |
|---------|-----------|---------|---------|
| `learn:listLessons` | ← | `{ branchId?, part?, chapter?, subtopic? }` | `{ ok, data: LessonSummary[] }` |
| `learn:listGroups` | ← | `{ branchId?, part? }` | `{ ok, data: string[] }` |
| `learn:listBranches` | ← | — | `{ ok, data: Branch[] }` |
| `learn:getTopicsByBranch` | ← | `{ branchId }` | `{ ok, data: CurriculumTopic[] }` |
| `learn:getGraph` | ← | `{ branchId?, part? }` | `{ ok, data: Graph }` |
| `learn:updateLessonMeta` | ← | `{ lessonId, title?, part?, summary?, chapter?, branchId?, subtopic? }` | `{ ok, data: null }` |

---

## 4. Library UI Spec

### 4.1 High-Level Structure

```tsx
<LessonLibrary>
  {/* 1. Branch Navigation Bar */}
  <BranchTabs />

  {/* 2. Mastery Strip (unchanged position) */}
  <MasteryStrip />

  {/* 3. Analytics (unchanged) */}
  <CollapsibleAnalytics />

  {/* 4. Tutor Dashboard (unchanged) */}
  <TutorDashboardSection />

  {/* 5. Shelves: Group → Topic → Lessons */}
  <LibraryShelves />
</LessonLibrary>
```

### 4.2 Branch Navigation Bar

A horizontal, scrollable tab bar at the top of the library. Each branch is a pill button with emoji + title.

```tsx
<div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 ws-scroll">
  {branches.map((branch) => {
    const active = branch.id === activeBranchId;
    return (
      <button
        key={branch.id}
        onClick={() => setActiveBranchId(branch.id)}
        className={`
          flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all shrink-0
          font-serif text-sm font-medium
          ${active
            ? `bg-${branch.color}-500/15 border-${branch.color}-500/30 text-glow shadow-[0_0_16px_rgba(0,0,0,0.3)]`
            : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600/50'
          }
        `}
      >
        <span className="text-base leading-none">{branch.emoji}</span>
        <span>{branch.title}</span>
        {lessonCounts[branch.id] > 0 && (
          <span className={`
            ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono
            ${active ? `bg-${branch.color}-500/20 text-${branch.color}-300` : 'bg-zinc-800 text-zinc-500'}
          `}>
            {lessonCounts[branch.id]}
          </span>
        )}
      </button>
    );
  })}

  {/* Add Branch placeholder (future: opens branch creation) */}
  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-zinc-700/50 text-zinc-600 hover:text-zinc-400 hover:border-zinc-600/40 transition-all shrink-0 font-serif text-sm">
    <Plus className="w-3.5 h-3.5" />
    <span>Explore</span>
  </button>
</div>
```

**Tokens:**
- Container: `flex items-center gap-2 overflow-x-auto pb-4 mb-8 ws-scroll`
- Active pill: `bg-{color}-500/15 border-{color}-500/30 text-glow` (clay/sage/amber/sky)
- Inactive pill: `bg-zinc-800/40 border-zinc-700/40 text-zinc-400`
- Count badge: `text-[10px] font-mono rounded-md`
- Font: `font-serif text-sm font-medium` for branch titles

### 4.3 Shelf Grouping Logic (Cover Grid & Spine)

**Current (broken):** `Map<part, lessons>` → chapters inside each part.  
**New:** Filter by `branchId` → `Map<chapter, Map<part, lessons>>` → topics inside each group.

```tsx
// Filter to active branch
const branchLessons = lessons.filter(l => l.branch_id === activeBranchId);

// Group by Group (chapter) → then by Topic (part)
const groups = new Map<string, Map<number, LessonSummary[]>>();
for (const l of branchLessons) {
  const g = l.chapter?.trim() || 'Ungrouped';
  if (!groups.has(g)) groups.set(g, new Map());
  const topics = groups.get(g)!;
  const arr = topics.get(l.part) ?? [];
  arr.push(l);
  topics.set(l.part, arr);
}

// Sort groups: custom groups first (in localStorage order), then alphabetically
const custom = new Set(loadCustomChapters());
const orderedGroups = Array.from(groups.keys()).sort((a, b) => {
  const aCustom = custom.has(a);
  const bCustom = custom.has(b);
  if (aCustom && !bCustom) return -1;
  if (!aCustom && bCustom) return 1;
  return a.localeCompare(b);
});
```

### 4.4 Cover Grid View — Shelf JSX

```tsx
<div className="space-y-14">
  {orderedGroups.map((group) => {
    const topics = groups.get(group)!;
    const orderedParts = Array.from(topics.keys()).sort((a, b) => a - b);
    const isCustom = custom.has(group);

    return (
      <section key={group} className="relative">
        {/* GROUP HEADER */}
        <div className="mb-5 flex items-center gap-3">
          <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center border
            ${isCustom
              ? 'bg-sage-500/10 border-sage-500/20'
              : 'bg-zinc-800/60 border-zinc-700/40'
            }
          `}>
            {isCustom ? (
              <Users className="w-4 h-4 text-sage-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <h2 className="font-serif text-xl font-semibold text-zinc-100">
            {group}
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-zinc-800/60 text-[10px] font-mono text-zinc-500 border border-zinc-700/30">
            {orderedParts.length} topic{orderedParts.length !== 1 ? 's' : ''}
          </span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        {/* TOPICS INSIDE GROUP */}
        <div className="space-y-8">
          {orderedParts.map((part) => {
            const partLessons = topics.get(part)!;
            const topicInfo = getTopic(part, activeBranchId);
            const subtopics = new Map<string, LessonSummary[]>();
            for (const l of partLessons) {
              const st = l.subtopic?.trim() || '';
              const arr = subtopics.get(st) ?? [];
              arr.push(l);
              subtopics.set(st, arr);
            }
            const orderedSubtopics = Array.from(subtopics.keys()).sort((a, b) => {
              if (!a) return 1;
              if (!b) return -1;
              return a.localeCompare(b);
            });

            return (
              <div key={part} className="relative">
                {/* TOPIC HEADER — ALWAYS SHOWS REAL NAME */}
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-base">{topicInfo?.emoji || '📖'}</span>
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-400">
                    {topicInfo?.title || `Topic ${String(part).padStart(2, '0')}`}
                  </h3>
                  <span className="h-px flex-1 bg-white/5" />
                </div>

                {/* SUBTOPIC GROUPING (optional) */}
                {orderedSubtopics.map((subtopic) => (
                  <div key={subtopic || '__none__'} className="mb-5 last:mb-0">
                    {subtopic && (
                      <div className="mb-2 flex items-center gap-2 ml-1">
                        <GitBranch className="w-3 h-3 text-zinc-600" />
                        <span className="text-[11px] font-medium text-zinc-500">{subtopic}</span>
                        <span className="h-px flex-1 bg-white/[0.03]" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
                      {subtopics.get(subtopic)!.map((lesson, i) => (
                        <BookCard key={lesson.id} lesson={lesson} index={i} onOpen={onOpen} onInfo={onInfo} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Wooden shelf rail */}
        <div className="lyceum-shelf-rail mt-4 h-2 w-full rounded-full" />
      </section>
    );
  })}
</div>
```

**Key fixes:**
- Group header uses `Users` icon for custom groups, `Sparkles` for AI-populated.
- Topic header ALWAYS shows `topicInfo?.title` (fixes the cover-view bug where only `Topic 02` rendered).
- Subtopic divider uses `GitBranch` icon + `text-zinc-500` label.
- Shelf rail stays at the bottom of each Group (not each Topic).

### 4.5 Spine View — Shelf JSX

```tsx
<div className="space-y-14">
  {orderedGroups.map((group) => {
    const topics = groups.get(group)!;
    const orderedParts = Array.from(topics.keys()).sort((a, b) => a - b);

    return (
      <section key={group}>
        {/* GROUP HEADER */}
        <div className="mb-4 flex items-center gap-3">
          <Users className="h-4 w-4 text-sage-400" />
          <h2 className="font-serif text-lg font-semibold text-zinc-200">{group}</h2>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        {/* TOPIC ROWS */}
        <div className="space-y-8">
          {orderedParts.map((part) => {
            const partLessons = topics.get(part)!;
            const topicInfo = getTopic(part, activeBranchId);

            return (
              <div key={part}>
                {/* TOPIC HEADER — ALWAYS SHOWS REAL NAME */}
                <div className="mb-3 flex items-center gap-3">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-400">
                    {topicInfo?.emoji || '📖'} {topicInfo?.title || `Topic ${String(part).padStart(2, '0')}`}
                  </h3>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                <div className="flex gap-2 items-end overflow-x-auto pb-4 ws-scroll">
                  {partLessons.map((lesson, i) => (
                    <BookSpine key={lesson.id} lesson={lesson} index={i} onOpen={onOpen} onInfo={onInfo} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="lyceum-shelf-rail mt-1 h-2 w-full rounded-full" />
      </section>
    );
  })}
</div>
```

### 4.6 Empty / Loading / Error States

| State | Trigger | Visual |
|-------|---------|--------|
| **Loading** | `loading === true` | Existing `LibrarySkeletons` — no change needed. |
| **Empty Branch** | Branch has zero lessons | Centered illustration: `LibraryBig` icon at `w-16 h-16 text-zinc-700`. Text: `font-serif text-zinc-400 text-lg` "No volumes in this branch yet." Sub: `text-zinc-600 text-sm` "Compose your first lesson to get started." + `<Button onClick={onCompose}>Compose lesson</Button>` |
| **Empty Group** | Group exists but has no topics | Omit the group from rendering entirely (don't show empty shelves). |
| **Topic with no lessons** | Should not happen due to grouping logic, but if it does: render topic header + `text-zinc-600 text-xs` "No lessons in this topic yet." |
| **Error** | IPC returns `ok: false` | Inline banner: `rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-sm` with retry button. |

### 4.7 Branch Empty State JSX

```tsx
{!loading && branchLessons.length === 0 && (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <LibraryBig className="w-16 h-16 text-zinc-700 mb-4" />
    <p className="font-serif text-lg text-zinc-400 mb-1">
      No volumes in this branch yet
    </p>
    <p className="text-sm text-zinc-600 mb-6 max-w-xs">
      Every lesson is a book on your shelf. Compose or import your first one.
    </p>
    <button
      onClick={onCompose}
      className="inline-flex items-center gap-2 rounded-xl border border-clay-400/40 bg-clay-500/15 px-5 py-2.5 font-serif text-sm font-semibold text-glow transition-all hover:bg-clay-500/25"
    >
      <Plus className="h-4 w-4" />
      Compose lesson
    </button>
  </div>
)}
```

---

## 5. Naming Sweep

### 5.1 File-by-File Changes

| File | Line | Old String / Pattern | New String / Pattern |
|------|------|----------------------|----------------------|
| `LessonLibrary.tsx` | ~171 | `Topic {String(part).padStart(2, '0')} — {partInfo?.title}` | `{partInfo?.emoji \|\| '📖'} {partInfo?.title \|\| \`Topic ${String(part).padStart(2, '0')}\`}` |
| `LessonLibrary.tsx` | ~217 | `Topic {String(part).padStart(2, '0')}` | `{partInfo?.emoji \|\| '📖'} {partInfo?.title \|\| \`Topic ${String(part).padStart(2, '0')}\`}` |
| `LessonLibrary.tsx` | ~140 | `onManageGroups` prop / `Groups` button label | Keep prop name; label already says "Groups" — ✅ |
| `LessonLibrary.tsx` | shelves logic | Group by `part` then `chapter` | Group by `chapter` then `part` (see §4.3) |
| `HierarchyGuide.tsx` | all | `TopicCard` → shows Topic at top | Restructure: `BranchCard` → `GroupCard` → `TopicCard` → `SubtopicCard` → `LessonCard` → `NodeCard` |
| `HierarchyGuide.tsx` | labels | `Topic — Predefined subject area` | Keep (Topic is still predefined) |
| `HierarchyGuide.tsx` | labels | `Group — Your custom category` | Keep, but move above Topic in tree |
| `HierarchyGuide.tsx` | tree indent | `pl-10` for Group under Topic | `pl-10` for Topic under Group; `pl-20` for Lesson under Topic |
| `ChapterGroupsModal.tsx` | title | `Manage Chapter Groups` | `Manage Groups` |
| `ChapterGroupsModal.tsx` | subtitle | `Curate your own group list...` | `Curate your own groups for organizing lessons` |
| `ChapterGroupsModal.tsx` | label | `Create new group` | Keep (already correct) |
| `ChapterGroupsModal.tsx` | placeholder | `e.g. OS Memory Management` | `e.g. Interview Prep — System Design` |
| `ChapterGroupsModal.tsx` | helper | `Groups appear in the chapter selector...` | `Groups appear when composing or editing lessons` |
| `ChapterGroupsModal.tsx` | empty state | `No groups yet` | Keep |
| `ChapterGroupsModal.tsx` | component name | `ChapterGroupsModal` | `GroupManagerModal` (rename file + imports) |
| `learnerProfile.ts` | fn names | `loadCustomChapters` | `loadCustomGroups` |
| `learnerProfile.ts` | fn names | `addCustomChapter` | `addCustomGroup` |
| `learnerProfile.ts` | fn names | `renameCustomChapter` | `renameCustomGroup` |
| `learnerProfile.ts` | fn names | `removeCustomChapter` | `removeCustomGroup` |
| `learnerProfile.ts` | localStorage key | `customChapters` | Keep internal key for migration safety; add comment: `// Group names (UI label: Groups)` |
| `curriculum.ts` | interface | `CurriculumPart` | `CurriculumTopic` |
| `curriculum.ts` | array | `CURRICULUM_BLUEPRINT` | `CURRICULUM_TOPICS` |
| `curriculum.ts` | helpers | `getPart`, `getPartBySlug` | `getTopic`, `getTopicBySlug` |
| `curriculum.ts` | fields | — | Add `branchId: 'cs-ai'` to all 13 existing entries |
| `LearnerSetup.tsx` | Q8 chips | `lessonTitles[part] ?? Part {part}` | `topicInfo?.title ?? Topic ${part}` |
| `LearnerSetup.tsx` | label | `Part {part}` fallback | `Topic` + title from blueprint |
| `useMasteryStats.ts` | labels | Any "Part" reference | "Topic" |
| `MasteryStrip.tsx` | labels | Any "Part" reference | "Topic" |
| `ProgressDashboard.tsx` | labels | Any "Part" reference | "Topic" |
| `CreateLessonDialog.tsx` | selector | `Chapter` / `Select chapter` | `Group` / `Select group` |
| `CreateLessonDialog.tsx` | selector | — | Add `Branch` selector (dropdown of branches) |
| `CreateLessonDialog.tsx` | selector | — | Add `Topic` selector (dropdown of topics in selected branch) |
| `CreateLessonDialog.tsx` | input | — | Add `Subtopic` input (optional, freeform or dropdown) |
| `LessonDetailModal.tsx` | badge | `Topic {part}` | `{topicInfo?.emoji} {topicInfo?.title}` |
| `types.ts` | `LdocLesson` | `chapter?: string` | Add comment: `// Group name (UI)` |
| `types.ts` | `LessonSummary` | `chapter: string` | Add comment: `// Group name (UI)` |
| `services/learn/index.ts` | handler | `learn:listChapters` | `learn:listGroups` (keep alias for compat) |
| `preload.ts` | bridge | `learnListChapters` | `learnListGroups` (keep alias for compat) |

### 5.2 Icon Mapping (New Hierarchy)

| Level | Icon | Color Token |
|-------|------|-------------|
| Branch | `LibraryBig` | Branch color (clay/sage/amber/sky) |
| Group | `Users` / `FolderCog` | `sage-400` |
| Topic | `Layers` / `Sparkles` | `clay-400` |
| Subtopic | `GitBranch` | `zinc-500` |
| Lesson | `BookOpen` | `amber-400` |
| Node | `FileText` | `violet-400` |
| Mastery | `Target` | Level-dependent (L0-L5 colors) |

---

## 6. Subtopic Nesting

### 6.1 The User's Example

> "Learning-agent books have many prerequisite topics, and inside each topic there are more subtopics, and each subtopic has its own list of topics to learn."

This describes **two kinds of nesting**:
1. **Topic prerequisites:** "Learning Agents" requires "Reinforcement Learning" and "Game Theory" first.
2. **Topic-internal nesting:** "Reinforcement Learning" contains subtopics "Value-Based Methods" and "Policy-Based Methods", each with their own lessons.

### 6.2 Schema Design

**Prerequisites** are handled at the **Topic level** via `prereqSlugs` in the blueprint:

```ts
// curriculum.ts
{
  part: 80,
  slug: 'learning-agents',
  title: 'Learning Agents & Multi-Agent Systems',
  branchId: 'cs-ai',
  prereqSlugs: ['rl-basics', 'game-theory', 'pytorch'],
  // ...
}
```

The UI renders prerequisite topics as a "Required before this topic" strip in the lesson opener or topic header.

**Internal nesting** is handled by the **Subtopic** string column + optional `parentSlug` in the blueprint:

```ts
// curriculum.ts
{
  part: 61,
  slug: 'rl-value-based',
  title: 'Value-Based Methods',
  branchId: 'cs-ai',
  parentSlug: 'rl-basics',   // Renders indented under "Reinforcement Learning"
  // ...
},
{
  part: 62,
  slug: 'rl-policy-based',
  title: 'Policy-Based Methods',
  branchId: 'cs-ai',
  parentSlug: 'rl-basics',
  // ...
}
```

### 6.3 UI Representation

In the library, subtopics appear as **dividers within a Topic shelf**:

```tsx
{subtopic && (
  <div className="mb-2 flex items-center gap-2 ml-1">
    <GitBranch className="w-3 h-3 text-zinc-600" />
    <span className="text-[11px] font-medium text-zinc-500">{subtopic}</span>
    <span className="h-px flex-1 bg-white/[0.03]" />
  </div>
)}
```

Lessons without a subtopic render directly under the Topic header (no divider).

In `HierarchyGuide.tsx`, the tree gains a `SubtopicCard` between Topic and Lesson:

```tsx
function SubtopicCard({ title }: { title: string }) {
  return (
    <div className="relative">
      <TreeDot color="bg-zinc-500" />
      <div className="ml-10 rounded-lg border border-zinc-600/20 bg-zinc-800/30 p-3">
        <div className="flex items-center gap-2 mb-1">
          <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">Subtopic</span>
        </div>
        <div className="text-sm font-medium text-zinc-300">{title}</div>
      </div>
    </div>
  );
}
```

### 6.4 Prerequisite Graph

The existing `learn_node_prereqs` table handles **node-level** prerequisites ("You must complete Node A before Node B"). The new `prereqSlugs` field on `CurriculumTopic` handles **topic-level** prerequisites ("You should understand RL before Learning Agents").

Topic-level prerequisites are **advisory**, not enforced. The UI shows them as:
- A "Prerequisites" row in the Topic header
- Dimmer topic shelves that are locked until prerequisite topics reach L2+ mastery
- A tooltip: "Study Reinforcement Learning (L2) before starting this topic"

---

## 7. Backend Audit Table

| Feature | IPC Channel | Handler Exists? | Service Method | DB Schema | Status |
|---------|-------------|-----------------|----------------|-----------|--------|
| List lessons (filtered) | `learn:listLessons` | ✅ Yes | `content.listLessons` | `learn_lessons` | **MODIFY** — add `branchId`, `subtopic` filters |
| List groups | `learn:listGroups` | ✅ Yes (as `listChapters`) | Inline SQL | `learn_lessons.chapter` | **RENAME** + add `branchId` filter |
| List branches | `learn:listBranches` | ❌ No | Inline SQL | `learn_branches` (new) | **NEW** |
| Get topics by branch | `learn:getTopicsByBranch` | ❌ No | `CURRICULUM_TOPICS.filter` | Constant array | **NEW** |
| Get graph | `learn:getGraph` | ✅ Yes | `content.getGraph` | `learn_lessons` + `learn_nodes` | **MODIFY** — add `branchId` filter |
| Update lesson meta | `learn:updateLessonMeta` | ✅ Yes | Inline SQL + doc_json sync | `learn_lessons` | **MODIFY** — add `branchId`, `subtopic` |
| Load custom groups | — (localStorage) | ✅ Yes | `loadCustomChapters` | `localStorage` | **RENAME** functions only |
| Save custom group | — (localStorage) | ✅ Yes | `addCustomChapter` | `localStorage` | **RENAME** functions only |
| Rename custom group | — (localStorage) | ✅ Yes | `renameCustomChapter` | `localStorage` | **RENAME** functions only |
| Remove custom group | — (localStorage) | ✅ Yes | `removeCustomChapter` | `localStorage` | **RENAME** functions only |
| List nodes | `learn:listNodes` | ✅ Yes | `content.listNodes` | `learn_nodes` | ✅ No change |
| Get node | `learn:getNode` | ✅ Yes | `content.getNode` | `learn_nodes` | ✅ No change |
| Save progress | `learn:saveProgress` | ✅ Yes | `content.saveProgress` | `learn_progress` | ✅ No change |
| Get progress | `learn:getProgress` | ✅ Yes | `content.getProgress` | `learn_progress` | ✅ No change |
| Import lesson | `learn:importLesson` | ✅ Yes | `content.importLesson` | `learn_lessons` | **MODIFY** — ensure `branchId` defaults to active branch |
| Compose lesson | `learn:composeLesson` | ✅ Yes | `content.composeLesson` | `learn_lessons` | **MODIFY** — accept `branchId`, `chapter`, `subtopic` |

---

## 8. Implementation Order

### Phase 1: Foundation (Schema + Types) — **Build Gate: compiles**
1. Write `007_branch_and_hierarchy.sql` migration.
2. Update `src/shared/learn/types.ts`:
   - Add `branch_id`, `subtopic` to `LdocLesson` and `LessonSummary`.
   - Change `LearnerProfile.priorKnowledge` to `Record<string, MasteryLevel>`.
   - Add `priorKnowledge` migration logic in `loadProfile()`.
3. Update `src/services/learn/curriculum.ts`:
   - Rename `CurriculumPart` → `CurriculumTopic`.
   - Rename `CURRICULUM_BLUEPRINT` → `CURRICULUM_TOPICS`.
   - Add `branchId: 'cs-ai'` to all 13 entries.
   - Rename helpers: `getPart` → `getTopic`, `getPartBySlug` → `getTopicBySlug`.
   - Add `getTopicsByBranch`, `getTopicChildren`.
   - Add `CURRICULUM_BRANCHES` constant.
4. Run migration test: start app, verify `learn_branches` exists, verify old lessons have `branch_id='cs-ai'`.

### Phase 2: Backend (IPC + Service) — **Build Gate: IPC tests pass**
5. Add `learn:listBranches` handler in `src/services/learn/index.ts`.
6. Add `learn:getTopicsByBranch` handler.
7. Modify `learn:listLessons` to accept `branchId`, `chapter`, `subtopic` filters.
8. Rename `learn:listChapters` → `learn:listGroups` (keep alias).
9. Modify `learn:updateLessonMeta` to handle `branchId` and `subtopic`.
10. Update `src/preload.ts` with new bridge methods.
11. Recompile learn service files (per-file esbuild, NO --bundle).

### Phase 3: Library UI — **Build Gate: visual regression check**
12. Rewrite `LessonLibrary.tsx` grouping logic: `chapter` → `part` (Group → Topic).
13. Add `BranchTabs` component to top of library.
14. Fix cover-view topic title bug (line ~217).
15. Add subtopic dividers in cover grid.
16. Update spine view with new grouping + topic titles.
17. Add branch empty state.
18. Update `LessonLibraryProps` to include `activeBranchId` if needed.

### Phase 4: Supporting Components — **Build Gate: onboarding flow works**
19. Rewrite `HierarchyGuide.tsx` with new tree: Branch → Group → Topic → Subtopic → Lesson → Node.
20. Rename `ChapterGroupsModal.tsx` → `GroupManagerModal.tsx`, update all copy.
21. Update `LearnerSetup.tsx` Q8 chips to use topic titles instead of `Part N`.
22. Update `CreateLessonDialog.tsx`:
    - Add Branch selector.
    - Add Topic selector (populated from `getTopicsByBranch`).
    - Rename Chapter selector → Group selector.
    - Add Subtopic input.
23. Sweep `MasteryStrip`, `ProgressDashboard`, `LessonDetailModal` for "Part" → "Topic".

### Phase 5: Subtopics + Polish — **Build Gate: full e2e**
24. Add `parentSlug` and `prereqSlugs` to 2-3 CS topics as a demo (e.g., Learning Agents).
25. Render prerequisite strip in topic headers.
26. Test build chain: `vite build` + `esbuild preload` + `rebuild-main` + per-file learn compile.
27. Verify dark mode, glass, rounded-xl, CRLF line endings.

### Phase 6: Cleanup — **Build Gate: no deprecation warnings**
28. Remove `learn:listChapters` alias (after one release cycle).
29. Remove `learnListChapters` from preload.
30. Verify all `console.warn` about deprecated names are gone.

---

## Appendix A: Quick Reference — Old vs New Names

| Context | Old | New |
|---------|-----|-----|
| Top-level discipline | — | **Branch** |
| User container | Chapter / Group | **Group** |
| Predefined curriculum area | Part / Topic | **Topic** |
| Optional nested tag | — | **Subtopic** |
| Learning unit | Lesson | **Lesson** (unchanged) |
| Section inside lesson | Node | **Node** (unchanged) |
| Proficiency axis | Mastery | **Mastery** (unchanged) |
| DB column: part | `part` | `part` (keep) |
| DB column: group | `chapter` | `chapter` (keep) |
| DB column: branch | — | `branch_id` |
| DB column: subtopic | — | `subtopic` |

## Appendix B: Blueprint Snippet (CS Branch)

```ts
export const CURRICULUM_TOPICS: CurriculumTopic[] = [
  {
    part: 0,
    slug: 'what-ai-engineers-do',
    emoji: '🎯',
    title: 'What AI Engineers Actually Do',
    rarity: 1,
    phase: 1,
    trailer: { /* ... */ },
    intro: '...',
    defaultMasteryTarget: 'L2',
    checklist: ['...'],
    branchId: 'cs-ai',
  },
  // ... parts 1-12 all get branchId: 'cs-ai'
  {
    part: 80,
    slug: 'learning-agents',
    emoji: '🤖',
    title: 'Learning Agents & Multi-Agent Systems',
    rarity: 3,
    phase: 3,
    branchId: 'cs-ai',
    prereqSlugs: ['rl-basics', 'game-theory', 'pytorch'],
  },
  {
    part: 81,
    slug: 'rl-basics',
    emoji: '🎲',
    title: 'Reinforcement Learning Basics',
    rarity: 2,
    phase: 2,
    branchId: 'cs-ai',
  },
  {
    part: 82,
    slug: 'rl-value-based',
    emoji: '💎',
    title: 'Value-Based Methods',
    rarity: 3,
    phase: 2,
    branchId: 'cs-ai',
    parentSlug: 'rl-basics',
  },
];
```

---

*End of specification. This design resolves the Part/Topic/Chapter/Group/Node confusion permanently, inverts the hierarchy so Group sits above Topic, introduces Branches of Study, fixes the library topic-name bug, and provides a concrete path for subtopic nesting and prerequisite graphs.*
