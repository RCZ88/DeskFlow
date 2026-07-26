# CONTEXT_BUNDLE.md — Lyceum Learn Feature

> **Purpose:** Provide complete context for an external AI to improve the visualization of the Lyceum/Learn feature.
> **Feature:** An AI-powered learning platform within DeskFlow (Electron + React + SQLite) that generates, imports, and manages grounded lessons with mastery tracking, AI tutoring, and interactive assessments.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│  Renderer (React)                                            │
│  LearnPage.tsx → views: welcome | showcase | library | reader │
│  └─ CurriculumShowcase  (curriculum grid with part cards)     │
│  └─ LessonLibrary      (book-shelf grid of lessons)          │
│  └─ ReaderView         (node content + outline + tutor)      │
│  └─ CurriculumGraph    (DAG visualization of prerequisites)  │
│  └─ MasteryRing / MasteryStrip  (progress visualizations)    │
│  └─ TutorPanel         (AI chat with streaming)              │
│  └─ 19 block types via BlockRenderer                        │
├──────────────────────────────────────────────────────────────┤
│  Preload Bridge (window.deskflowAPI.learn*)                  │
│  ~30 IPC endpoints (see Section 6)                           │
├──────────────────────────────────────────────────────────────┤
│  Main Process (Electron)                                     │
│  src/services/learn/index.ts — registers all IPC handlers    │
│  src/services/learn/services/* — business logic              │
│  src/services/learn/db/repo.ts — typed SQL queries           │
├──────────────────────────────────────────────────────────────┤
│  SQLite Database (13 tables, 3 migrations)                   │
│  learn_lessons, learn_nodes, learn_progress, learn_evidence, │
│  learn_notes, learn_conversations, learn_permissions, etc.    │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. File Inventory

### Components (src/components/learn/)
| File | Lines | Purpose |
|------|-------|---------|
| `LearnPage.tsx` | 669 | Root orchestrator — manages views, state, IPC calls |
| `CurriculumShowcase.tsx` | 204 | Curriculum grid with phase filters and part cards |
| `CurriculumGraph.tsx` | 248 | D3-style DAG visualization of node prerequisites |
| `MasteryRing.tsx` | 101 | SVG circular progress ring for mastery level |
| `MasteryStrip.tsx` | 151 | Horizontal mastery distribution bar with due reviews |
| `ReaderView.tsx` | 302 | Lesson reader with outline, content, tutor panel |
| `TutorPanel.tsx` | 459 | AI tutor chat with V1/V2 streaming |
| `LessonLibrary.tsx` | 109 | Book-shelf grid of lessons grouped by part |
| `WelcomeEmptyState.tsx` | 177 | Landing page with hero book and quick actions |
| `LearnerSetup.tsx` | 265 | 8-step onboarding wizard |
| `LearnerProfilePanel.tsx` | 153 | Profile knob editor sidebar |
| `ImportView.tsx` | 140 | File import with validation |
| `CreateLessonDialog.tsx` | 674 | AI lesson generation dialog |
| `AssessmentCard.tsx` | 235 | Interactive quiz card (MCQ, numeric, open) |
| `BookCard.tsx` | 116 | Lesson card with cover, title, status |
| `TableOfContents.tsx` | 100 | Sidebar TOC with mastery indicators |
| `ChecklistProgress.tsx` | 66 | Checklist completion bar |
| `NotesPanel.tsx` | 95 | Notes CRUD panel |
| `SelectionActions.tsx` | 203 | Text selection floating toolbar |
| `WidgetHost.tsx` | 276 | Sandboxed iframe for interactive widgets |
| `OnboardingPanel.tsx` | 120 | Getting-started tips panel |
| `CitationChip.tsx` | 36 | Source citation chip |
| `PermissionSettings.tsx` | 95 | AI resource permission settings |
| `ProposalCard.tsx` | 53 | AI lesson edit proposal card |
| `ValidationReport.tsx` | 84 | Import validation display |

### Block Components (src/components/learn/blocks/)
19 block types rendered via `BlockRenderer.tsx`:
- `ProseBlock`, `MathBlock`, `MermaidBlock`, `CodeBlock`, `ImageBlock`, `VideoBlock`
- `QuizBlock`, `CalloutBlock`, `LayerBlock`, `ChartBlock`, `TableBlock`
- `FlowBlock`, `FinChartBlock`, `SvgBlock`, `TutorBlock`
- `ProposalBlock`, `ConversationBlock`, `NotesBlock`, `ZoomPan`

### Services (src/services/learn/)
| File | Lines | Purpose |
|------|-------|---------|
| `index.ts` | 383 | IPC handler registration (~30 endpoints) |
| `curriculum.ts` | 350 | 11-part AI Engineering curriculum blueprint |
| `curriculumState.ts` | 21 | Matches lessons to curriculum parts |
| `learnerProfile.ts` | 132 | Profile dual-write (localStorage + SQLite) |
| `promptLibrary.ts` | 353 | Prompt composition for tutor & authoring |
| `topicPrompts.ts` | 155 | Per-topic coaching notes |
| `profileSignals.ts` | 49 | Behavioral signal → profile knob nudging |
| `highlightAnchor.ts` | 102 | Text highlight persistence |
| `lessonInput.ts` | 108 | .lmd/.ldoc normalizer |
| `parseLessonMarkdown.ts` | 479 | .lmd compiler |

### Business Logic Services (src/services/learn/services/)
| File | Lines | Purpose |
|------|-------|---------|
| `content.service.ts` | 125 | Lesson/node CRUD, graph query |
| `import.service.ts` | 203 | Parse → validate → store → embed |
| `progress.service.ts` | 170 | Beta-Bernoulli mastery + SM-2 stability |
| `tutor.service.ts` | 231 | AI tutor V1 (answer → self-check → assess) |
| `tutorV2.service.ts` | 206 | Tutor V2 (streaming + proposals + conversations) |
| `grounding.service.ts` | 122 | Packet retrieval for tutor context |
| `note.service.ts` | 74 | Notes CRUD |
| `conversation.service.ts` | 65 | Threaded conversations |
| `permission.service.ts` | 78 | Resource permissions |
| `dashboard.service.ts` | 40 | Tutor dashboard aggregation |

---

## 3. Shared Types (src/shared/learn/types.ts)

### Core Data Types

```typescript
export type MasteryLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export type BlockType = 'prose' | 'math' | 'mermaid' | 'code' | 'image' | 'video' | 'widget' | 'quiz' | 'callout' | 'layer' | 'chart' | 'table' | 'flow' | 'finchart' | 'svg' | 'tutor' | 'proposal' | 'conversation' | 'notes';
export type QuizFormat = 'mcq' | 'numeric' | 'open';
export type LessonStatus = 'draft' | 'valid' | 'published';

export interface LdocDocument {
  doc: 'ldoc/1.0';
  lesson: LdocLesson;
  nodes: LdocNode[];
}

export interface LdocLesson {
  id: string;
  title: string;
  part: number;
  version: string;
  summary?: string;
  authored_by?: 'human' | 'ai' | 'hybrid';
}

export interface LdocNode {
  id: string;
  title: string;
  mastery_target: MasteryLevel;
  prereq?: string[];
  content_hash?: string;
  blocks: LdocBlock[];
  grounding: LdocGrounding;
}

export interface LdocGrounding {
  must_know: { claim: string; source_id: string }[];
  canonical_answers?: Record<string, string>;
  misconceptions?: { wrong: string; correct: string }[];
  scope: { includes: string; excludes?: string[] };
  rubric_ref?: string;
  escalate_if?: string[];
  sources: { id: string; url: string; title: string; kind?: string; license?: string; retrieved?: string }[];
}
```

### Progress & Mastery Types

```typescript
export interface NodeProgress {
  node_id: string;
  level: MasteryLevel;
  stability: number;
  last_seen?: string;
  due_at?: string;
  belief: Record<string, { alpha: number; beta: number }>;
}

export interface ProgressMap {
  [nodeId: string]: NodeProgress;
}

export interface TutorAnswer {
  answer_md: string;
  used_source_ids: string[];
  used_fact_ids: string[];
  citations: { id: string; url: string; title: string }[];
  scope: string;
  assessment: { target_level: MasteryLevel; outcome: EvidenceOutcome; rationale: string; suggested_next: string };
  escalated: boolean;
  confidence: number;
}
```

### Learner Profile Types

```typescript
export type Density = 'terse' | 'balanced' | 'thorough';
export type ModalityBias = 'diagram_first' | 'balanced' | 'text_ok';
export type ExampleStance = 'worked_first' | 'balanced' | 'discovery_first';
export type MathDepth = 'applied_only' | 'intuition_first' | 'derive_everything';
export type ChunkSize = 'micro' | 'standard' | 'deep';

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
  confidence: Record<string, number>;
  updatedAt: string;
}
```

### Dashboard Types

```typescript
export interface TutorDashboardData {
  total_answers: number;
  total_questions: number;
  avg_confidence: number;
  recent_notes: NoteEntry[];
  open_proposals: ProposalCard[];
  active_conversations: number;
  streak_days: number;
  top_nodes: { node_id: string; title: string; count: number }[];
}
```

---

## 4. Database Schema (3 migrations, 13 tables)

### Migration 001 — Core Schema (learn/db/migrations/001_learn.sql)

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

CREATE TABLE IF NOT EXISTS learn_progress (
  node_id     TEXT PRIMARY KEY REFERENCES learn_nodes(id) ON DELETE CASCADE,
  level       TEXT NOT NULL DEFAULT 'L0',
  belief_json TEXT NOT NULL,
  stability   REAL NOT NULL DEFAULT 0,
  last_seen   TEXT,
  due_at      TEXT
);

CREATE TABLE IF NOT EXISTS learn_evidence (
  id           INTEGER PRIMARY KEY,
  node_id      TEXT NOT NULL REFERENCES learn_nodes(id) ON DELETE CASCADE,
  ts           TEXT NOT NULL,
  source       TEXT NOT NULL,
  target_level TEXT NOT NULL,
  outcome      TEXT NOT NULL,
  detail_json  TEXT
);
```

### Migration 002 — Learner Profile

```sql
CREATE TABLE IF NOT EXISTS learn_profile (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### Migration 003 — Tutor V2 (learn/db/migrations/003_learn_tutor_v2.sql)

```sql
CREATE TABLE IF NOT EXISTS learn_notes (
  id        TEXT PRIMARY KEY,
  node_id   TEXT NOT NULL REFERENCES learn_nodes(id) ON DELETE CASCADE,
  ts        TEXT NOT NULL,
  text      TEXT NOT NULL,
  tags_json TEXT,
  pinned    INTEGER NOT NULL DEFAULT 0,
  block_ref TEXT
);

CREATE TABLE IF NOT EXISTS learn_actions (
  id         INTEGER PRIMARY KEY,
  node_id    TEXT NOT NULL REFERENCES learn_nodes(id) ON DELETE CASCADE,
  block_id   TEXT,
  role       TEXT NOT NULL,
  ts         TEXT NOT NULL,
  text       TEXT NOT NULL,
  meta_json  TEXT
);

CREATE TABLE IF NOT EXISTS learn_conversations (
  id         TEXT PRIMARY KEY,
  node_id    TEXT NOT NULL REFERENCES learn_nodes(id) ON DELETE CASCADE,
  block_id   TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learn_permissions (
  key       TEXT PRIMARY KEY,
  resource  TEXT NOT NULL,
  grant     TEXT NOT NULL DEFAULT 'ask',
  rationale TEXT
);
```

---

## 5. IPC Endpoints (30+ channels)

Registered in `src/services/learn/index.ts`, bridged via `src/preload.ts` lines 1036-1062.

| IPC Channel | Preload Method | Purpose |
|-------------|---------------|---------|
| `learn:importLdoc` | `learnImportLdoc` | Import .lmd/.ldoc lesson |
| `learn:validate` | `learnValidate` | Validate lesson document |
| `learn:listLessons` | `learnListLessons` | List all lessons (optionally by part) |
| `learn:getLesson` | `learnGetLesson` | Get lesson with all nodes |
| `learn:getNode` | `learnGetNode` | Get single node |
| `learn:getGraph` | `learnGetGraph` | Get prerequisite DAG |
| `learn:askTutor` | `learnAskTutor` | V1 tutor question |
| `learn:tutorStream` | (event: `learn:tutorToken`) | V2 streaming tutor |
| `learn:submitQuiz` | `learnSubmitQuiz` | Submit quiz answer |
| `learn:getProgress` | `learnGetProgress` | Get node mastery progress |
| `learn:getDueReviews` | `learnGetDueReviews` | Get nodes due for review |
| `learn:createProposal` | — | Create AI lesson edit proposal |
| `learn:decideProposal` | — | Approve/reject proposal |
| `learn:startConversation` | — | Start threaded conversation |
| `learn:addMessage` | — | Add message to conversation |
| `learn:getConversation` | — | Get conversation history |
| `learn:resolveConversation` | — | Mark conversation resolved |
| `learn:addNote` | — | Add note to node |
| `learn:getNotes` | — | Get notes for node |
| `learn:getAllNotes` | — | Get all notes |
| `learn:deleteNote` | — | Delete note |
| `learn:toggleNotePin` | — | Pin/unpin note |
| `learn:getPermissions` | — | Get permissions |
| `learn:setPermission` | — | Set permission |
| `learn:getTutorDashboard` | — | Get dashboard stats |
| `learn:buildPrompt` | `learnBuildPrompt` | Build authoring prompt |
| `learn:generateLdoc` | `learnGenerateLdoc` | AI-generate + import lesson |
| `learn:getProfile` | `learnGetProfile` | Get profile from DB |
| `learn:setProfile` | `learnSetProfile` | Set profile in DB |
| `learn:get-worked-example` | `learnGetWorkedExample` | Load bundled example |
| `learn:get-schema` | `learnGetSchema` | Load .ldoc JSON schema |

### Result/Error Wrapper Pattern

```typescript
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
```

Every IPC handler returns this pattern. Example:
```typescript
// In LearnPage.tsx:
const result = await api.learnListLessons();
if (result.ok) {
  setLessons(result.data);
} else {
  setError(result.error);
}
```

---

## 6. Key Component Source Code

### LearnPage.tsx — View Router (lines 40-46, 382-399)

```typescript
type View = 'welcome' | 'showcase' | 'library' | 'reader' | 'import';

export function LearnPage() {
  const [view, setView] = useState<View>('welcome');
  // ... state declarations ...

  // Welcome landing — full editorial page, no chrome
  if (view === 'welcome') {
    return (
      <>
        <WelcomeEmptyState
          onCompose={() => setShowCreateDialog(true)}
          onTryExample={handleImportExample}
          onImport={() => setView('import')}
          onPaste={() => { setView('import'); setImportMode('paste'); }}
          onBrowse={() => setView('library')}
        />
        <OnboardingPanel open={showOnboarding} onClose={() => setShowOnboarding(false)} />
        <LearnerSetup open={showSetup} onClose={() => setShowSetup(false)} />
        <LearnerProfilePanel open={showProfilePanel} onClose={() => setShowProfilePanel(false)} onRerunSetup={() => { setShowProfilePanel(false); setShowSetup(true); }} />
        <CreateLessonDialog seed={lessonSeed} open={showCreateDialog} onClose={() => { setShowCreateDialog(false); setLessonSeed(null); }} onImported={() => { loadLessons(); setView('library'); }} />
      </>
    );
  }
  // ... main layout with header + content area ...
}
```

### CurriculumShowcase.tsx — Part Card (lines 31-118)

```typescript
function PartCard({ part, lessons, checklist, checklistProgress, onGenerate, onOpenLesson, onToggleChecklist }) {
  const hasLesson = lessons.length > 0;
  return (
    <div className="lyceum-showcase-card">
      <div className="lyceum-showcase-card-header">
        <span className="lyceum-showcase-emoji">{part.emoji}</span>
        <div className="lyceum-showcase-card-meta">
          <span className="lyceum-showcase-rarity">{rarityStars(part.rarity)}</span>
        </div>
      </div>
      <h3 className="lyceum-showcase-card-title">{part.title}</h3>
      <p className="lyceum-showcase-card-trailer">{part.trailer.what}</p>
      <p className="lyceum-showcase-card-why">{part.trailer.why}</p>
      {/* Checklist progress ring + items + footer with Generate/Read button */}
    </div>
  );
}
```

### MasteryRing.tsx — SVG Progress Ring (lines 23-101)

```typescript
export function MasteryRing({ level, target, size = 32, strokeWidth = 3, animated = true }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const levelIndex = LEVEL_ORDER.indexOf(level);
  const targetIndex = target ? LEVEL_ORDER.indexOf(target) : 5;
  const fillPercent = targetIndex > 0 ? levelIndex / targetIndex : 0;
  // ... animation logic ...
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={targetColor + '20'} strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          className={animated ? 'transition-all duration-1000 ease-out' : ''} />
      </svg>
      <span className="absolute text-[10px] font-bold leading-none" style={{ color }}>{level.replace('L', '')}</span>
    </div>
  );
}
```

### CurriculumGraph.tsx — DAG Layout (lines 32-88)

```typescript
function layoutDag(nodes: LayoutNode[]): LayoutNode[] {
  // Topological sort → layer assignment → position calculation
  // Nodes: 160x32px rectangles, 220px horizontal spacing, 100px vertical spacing
  // Edges: SVG lines with color highlight on selection
  // Colors per mastery level: L0=#5B6472, L1=#5B8DEF, L2=#23B5B5, L3=#3CCB7F, L4=#A78BFA, L5=#F5C04E
}
```

### TutorPanel.tsx — AI Chat (lines 44-459)

```typescript
export function TutorPanel({ open, onToggle, nodeId, question, onQuestionChange, answer, loading, onAsk }: Props) {
  // V2 streaming via learn:tutorToken events
  // States: idle → streaming → grounded | out-of-scope | error
  // Markdown rendering via renderAnswerHtml() with DOMPurify
  // Suggestion chips, conversation history, confidence bar
}
```

### WelcomeEmptyState.tsx — Hero Landing (lines 54-171)

```typescript
export function WelcomeEmptyState(props: WelcomeEmptyStateProps) {
  return (
    <div className="lyceum-welcome relative flex min-h-full w-full items-center justify-center overflow-hidden px-6 py-16">
      {/* Warm ambient glow */}
      <div className="lyceum-welcome-glow pointer-events-none absolute inset-0" />
      {/* Two-column: Left = invitation text + CTA, Right = floating book hero */}
      <div className="relative mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        {/* BlurFade animated text + Compose button */}
        {/* Floating 3D book with BorderBeam effect */}
      </div>
      {/* Bottom quick actions grid */}
    </div>
  );
}
```

---

## 7. Mastery System (ProgressService)

### Beta-Bernoulli Model with SM-2 Stability

```typescript
// src/services/learn/services/progress.service.ts
const LEVELS: MasteryLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
const PROMOTION_THRESHOLD = 0.8;
const CORROBORATION_MIN = 2;
const DECAY_GAMMA = 0.98; // per day

// Evidence updates belief state for target level AND all levels below
// Level promotion requires: mean(belief) >= 0.8 AND evidence count >= 2
// Stability: demonstrated doubles stability, wrong halves it
// Due date: now + stability * 24h
```

### MasteryStats Hook

```typescript
// src/components/learn/useMasteryStats.ts
export const LEVEL_COLORS: Record<MasteryLevel, string> = {
  L0: '#5B6472', L1: '#5B8DEF', L2: '#23B5B5',
  L3: '#3CCB7F', L4: '#A78BFA', L5: '#F5C04E',
};

export interface MasteryStats {
  totalNodes: number;
  trackedNodes: number;
  mastered: number;       // L5 count
  proficientPlus: number; // L4 + L5 count
  dueCount: number;
  dueItems: DueItem[];
  distribution: Record<MasteryLevel, number>;
  masteryPct: number;     // proficientPlus / totalNodes * 100
}
```

---

## 8. Curriculum Blueprint (11 Parts)

Defined in `src/services/learn/curriculum.ts`. Each part has:
- `part` (0-12), `slug`, `emoji`, `title`, `rarity` (1-5 stars)
- `phase` (1=Core Engineering, 2=AI/ML Depth, 3=Mastery & Meta)
- `trailer` (what/why/where), `intro`, `defaultMasteryTarget`, `checklist[]`

| Part | Title | Phase | Rarity |
|------|-------|-------|--------|
| 0 | What AI Engineers Actually Do | 1 | ★★★ |
| 1 | CS & Systems Foundations | 1 | ★★★★ |
| 2 | Software Design & Architecture | 1 | ★★★★ |
| 3 | Performance & Efficiency | 2 | ★★★★★ |
| 4 | Databases, Deep | 1 | ★★★★ |
| 5 | Security (app + data + AI) | 1 | ★★★★★ |
| 6 | ML/DL Math & Theory | 2 | ★★★★ |
| 7 | PyTorch & DL Engineering | 1 | ★★★★★ |
| 8 | Applied AI / LLM Engineering | 2 | ★★★★ |
| 9 | MLOps & Production ML | 2 | ★★★★ |
| 10 | The Meta-Skills | 3 | ★★★★★ |
| 11 | Vision & Multimodal AI | 2 | ★★★★★ |
| 12 | Training, Fine-Tuning & Adaptation | 3 | ★★★★★ |

---

## 9. Design Tokens & CSS

### Color Palette (from lyceum-learn-features.css)

```css
/* Warm editorial theme — clay/sage/amber */
--bg-primary: /* dark background */;
--bg-secondary: #1c1917;
--border: #292524;
--text-primary: #f5f5f4;
--text-secondary: #a8a29e;
--text-muted: #57534e;
--accent-primary: #d97706;  /* amber */
```

### Mastery Level Colors

```typescript
const LEVEL_COLORS = {
  L0: '#5B6472',  // slate (untested)
  L1: '#5B8DEF',  // blue (novice)
  L2: '#23B5B5',  // teal (beginner)
  L3: '#3CCB7F',  // green (competent)
  L4: '#A78BFA',  // purple (proficient)
  L5: '#F5C04E',  // gold (mastered)
};
```

### CSS Class Patterns

```css
/* Showcase cards */
.lyceum-showcase-card { border: 1px solid var(--border); border-radius: 12px; background: var(--bg-secondary); }
.lyceum-showcase-card:hover { border-color: var(--accent-primary); transform: translateY(-1px); }

/* Library shelves */
.lyceum-shelf-rail { background: linear-gradient(to right, rgba(255,255,255,0.04), rgba(255,255,255,0.08), rgba(255,255,255,0.04)); }

/* Welcome hero */
.lyceum-welcome-glow { background: radial-gradient(ellipse at 50% 30%, rgba(194,85,58,0.08) 0%, transparent 70%); }
.lyceum-book-cloth { background: linear-gradient(150deg, #c2553a 0%, #8f3a25 100%); }

/* Phase tabs */
.lyceum-showcase-phase-tab { border: 1px solid var(--border); border-radius: 9999px; background: var(--bg-secondary); }
.lyceum-showcase-phase-tab.active { border-color: var(--phase-accent); background: color-mix(in srgb, var(--phase-accent) 10%, transparent); }
```

### Animation Patterns

```typescript
// src/components/learn/motion.ts
// Framer Motion presets for layer reveals, page transitions
// BlurFade component for staggered entrance animations
// BorderBeam for hero book effect
```

---

## 10. Visualization Components — Current State

### What Exists for Visualization

1. **MasteryRing** — SVG circular progress ring (L0-L5). Used in CurriculumShowcase, ReaderView, MasteryStrip, mobile outline. Small (20-44px), animated stroke-dashoffset.

2. **MasteryStrip** — Horizontal bar showing mastery distribution. Displays L0-L5 counts with mini MasteryRings and vertical bars. Includes due-reviews popover.

3. **CurriculumGraph** — SVG DAG of node prerequisites. Manual layout algorithm (layered positioning). Nodes colored by mastery level. Zoom/pan via Ctrl+scroll. 160x32px node rectangles.

4. **CurriculumShowcase** — Grid of PartCards with emoji, rarity stars, checklist progress ring, checklist items, and Generate/Read buttons. Phase filter tabs.

5. **BookCard** — Lesson card with cover image, title, part badge, status indicator.

6. **TutorDashboardSection** — Stats: total Q&A, recent notes, top nodes, active conversations.

### What's Missing / Weak

- **No aggregate progress visualization** across all lessons (only per-node)
- **No time-series charts** for study activity / mastery over time
- **No heatmap or calendar** for study consistency
- **No comparison views** (before/after, vs target)
- **CurriculumGraph** uses manual layout — no force-directed or proper DAG algorithm
- **MasteryStrip** is compact but not very visual — just small bars
- **No animated transitions** between mastery levels
- **No 3D or rich visualizations** — all flat SVG
- **No data charts** for learning analytics (time spent, quiz scores over time, etc.)

---

## 11. Registration Points

- **Route:** `App.tsx` line 2688 — `<Route path="/learn" element={<LearnPage />} />`
- **Sidebar:** `App.tsx` line 2280 — `{ icon: GraduationCap, label: 'Learn', path: '/learn' }`
- **Main process:** `src/main.ts` lines 3177-3194 — `registerLearnHandlers(db, callAi, streamAi)`

---

## 12. End-to-End IPC Wiring Example

### Import Flow: Renderer → Preload → Main → Service → DB

```typescript
// 1. Renderer calls preload bridge
const result = await api.learnImportLdoc({ source: importText });

// 2. Preload bridge (src/preload.ts ~line 1040)
learnImportLdoc: (args: { source: string }) => ipcRenderer.invoke('learn:importLdoc', args),

// 3. Main process handler (src/services/learn/index.ts)
ipcMain.handle('learn:importLdoc', async (_event, args) => {
  const result = importService.importRaw(args.source);
  return result;
});

// 4. Service (src/services/learn/services/import.service.ts)
importRaw(raw: string): Result<ImportResult> {
  const parsed = lessonInput.normalize(raw);
  const validation = validateFull(parsed);
  if (!validation.ok) return { ok: false, error: validation.errors.map(e => e.message).join('; ') };
  const hash = crypto.createHash('sha256').update(JSON.stringify(parsed)).digest('hex');
  repo.insertLesson(this.db, { ...parsed.lesson, doc_json: JSON.stringify(parsed), content_hash: hash });
  // ... insert nodes, chunks, etc.
  return { ok: true, data: { lessonId: parsed.lesson.id, nodes: parsed.nodes.map(n => ({ id: n.id, title: n.title })), warnings: validation.warnings, validation } };
}

// 5. DB (src/services/learn/db/repo.ts)
export function insertLesson(db: Database, lesson: { id, title, part, version, doc_json, status, created_at, updated_at }) {
  return db.prepare(`INSERT INTO learn_lessons (id, title, part, version, doc_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    lesson.id, lesson.title, lesson.part, lesson.version, lesson.doc_json, lesson.status, lesson.created_at, lesson.updated_at
  );
}
```

---

## 13. Design System Context

- **Fonts:** Geist (sans), JetBrains Mono (mono), serif for editorial headers
- **Dark mode only** — zinc/stone palette with clay/amber accents
- **Glass layers:** `bg-zinc-900/80 backdrop-blur-xl`
- **Border radius:** max `rounded-xl` (12px)
- **Padding:** `p-5` standard
- **Animations:** Framer Motion for page transitions, AnimatePresence for mount/unmount
- **Components:** shadcn/ui base (Button, Skeleton, Dialog), custom learn-specific components
- **MCP available:** shadcn, Magic UI (Animated Beam, Border Beam, Number Ticker), Lucide icons, React Bits

---

*End of context bundle. The target AI should use this as its sole reference for codebase structure, data shapes, and architecture when designing visualization improvements.*
