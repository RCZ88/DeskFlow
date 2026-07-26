# Context Bundle — Learner Profile + Mastery Dashboard Redesign

## 1. Current Learn Page Architecture

### LearnPage.tsx (src/components/learn/LearnPage.tsx)

The Learn page has 6 views controlled by a `View` type:

```ts
type View = 'welcome' | 'showcase' | 'library' | 'reader' | 'dashboard' | 'import';
```

- **welcome** — Full-page editorial WelcomeEmptyState (no chrome)
- **showcase** — CurriculumShowcase (13 North Star parts grid)
- **library** — LessonLibrary (book card shelves grouped by part)
- **reader** — ReaderView (lesson content + tutor)
- **dashboard** — DashboardView (mastery stats, level distribution, due reviews) ← ISOLATED PAGE
- **import** — ImportView (file pick / paste JSON)

The header has navigation buttons for Home / Curriculum / Dashboard / How it works (lines 336-365).

**The problem:** The Dashboard is a separate view. You navigate to it via a header button, see stats, then go "Back to Library." It's disconnected from the main learning flow.

### DashboardView (LearnPage.tsx:831-908)

```tsx
function DashboardView({ progress, lessons, onRefresh }) {
  const totalNodes = lessons.reduce((sum, l) => sum + l.nodeCount, 0);
  const masteredNodes = Object.values(progress).filter((p: any) => p.level === 'L5').length;
  const dueNodes = Object.values(progress).filter((p: any) => {
    if (!p.due_at) return false;
    return new Date(p.due_at) <= new Date();
  }).length;

  const levelColors = {
    L0: '#5B6472', L1: '#5B8DEF', L2: '#23B5B5',
    L3: '#3CCB7F', L4: '#A78BFA', L5: '#F5C04E',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 3 stat cards: Total Nodes / Mastered (L5) / Due for Review */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Nodes" value={totalNodes} />
        <StatCard label="Mastered (L5)" value={masteredNodes} />
        <StatCard label="Due for Review" value={dueNodes} />
      </div>

      {/* Level Distribution — 6 MasteryRing components in a row */}
      <div className="p-5 rounded-xl border border-zinc-700/40 bg-zinc-900/40">
        <h3>Level Distribution</h3>
        <div className="flex items-end gap-2">
          {levelOrder.map((level) => (
            <MasteryRing level={level} size={28} strokeWidth={2.5} animated={false} />
            // + bar + label + count
          ))}
        </div>
      </div>

      {/* Due Reviews — list or "No reviews due" */}
      <div className="mt-6 p-5 rounded-xl border border-zinc-700/40 bg-zinc-900/40">
        <h3>Due Reviews</h3>
        {/* list of due nodes or empty state */}
      </div>
    </div>
  );
}
```

### LessonLibrary.tsx (src/components/learn/LessonLibrary.tsx)

Groups lessons into shelves by part number. Renders BookCard components in a grid.

```tsx
export function LessonLibrary({ lessons, loading, onOpen, onCompose, onImport, onWelcome }) {
  const shelves = new Map<number, LessonSummary[]>();
  for (const l of lessons) {
    const arr = shelves.get(l.part) ?? [];
    arr.push(l);
    shelves.set(l.part, arr);
  }
  // Renders: header + grid of BookCard components per shelf
}
```

### BookCard.tsx (src/components/learn/BookCard.tsx)

Cloth-bound book card with editorial design. Uses cloth colors from a palette keyed by part number:

```ts
const CLOTHS = [
  { cloth: '#c2553a', deep: '#a8432c', gilt: '#f3d9a4', ink: '#fbeee6' }, // clay
  { cloth: '#3f7d63', deep: '#2f6650', gilt: '#f3d9a4', ink: '#eaf5ef' }, // sage
  { cloth: '#b8842f', deep: '#9c6e20', gilt: '#fff4d6', ink: '#fdf3df' }, // amber
  { cloth: '#3c7d92', deep: '#2d6175', gilt: '#f3d9a4', ink: '#e6f3f8' }, // sky
  { cloth: '#6b4a8a', deep: '#553a70', gilt: '#f3d9a4', ink: '#efe8f6' }, // plum
];
```

Renders: cover with part label, title (serif), footer with node count + date, gilt status badge.

### MasteryRing.tsx (src/components/learn/MasteryRing.tsx)

SVG progress ring showing mastery level (L0-L5). Colors:

```ts
const LEVEL_COLORS = {
  L0: '#5B6472', L1: '#5B8DEF', L2: '#23B5B5',
  L3: '#3CCB7F', L4: '#A78BFA', L5: '#F5C04E',
};
```

### CurriculumShowcase.tsx (src/components/learn/CurriculumShowcase.tsx)

Grid of PartCards for the 13 North Star curriculum parts. Each card shows:
- Emoji + rarity stars
- Title + trailer text
- MasteryRing + checklist progress
- Checklist items (first 4)
- Generate button / Open lesson button

Uses CSS classes from `lyceum-learn-features.css` (`.lyceum-showcase-*`).

## 2. Learner Profile Spec (LEARNER_PROFILE_DESIGN.md)

### The core decision
NO "learning style" quiz (VARK is a neuromyth, d = 0.04). Instead:
- **(A)** Short choice-based onboarding → sets presentation & scaffolding defaults
- **(B)** Per-domain prior-knowledge calibration → the real lever
- **(C)** Revealed-preference loop → refines from behavior

### LearnerProfile schema

```ts
export type Density = 'terse' | 'balanced' | 'thorough';
export type ModalityBias = 'diagram_first' | 'balanced' | 'text_ok';
export type ExampleStance = 'worked_first' | 'balanced' | 'discovery_first';
export type MathDepth = 'applied_only' | 'intuition_first' | 'derive_everything';
export type Level = 'L0'|'L1'|'L2'|'L3'|'L4'|'L5';

export interface LearnerProfile {
  version: 1;
  density: Density;
  modalityBias: ModalityBias;
  exampleStance: ExampleStance;
  mathDepth: MathDepth;
  handsOn: 0|1|2|3;
  codeStagingDepth: 'framework_only'|'numpy_plus'|'scratch_first';
  quizAppetite: 'light'|'normal'|'heavy';
  chunkSize: 'micro'|'standard'|'deep';
  layerRevealDefault: Level;
  tone: 'gentle'|'balanced'|'demanding';
  priorKnowledge: Partial<Record<number, Level>>;
  confidence: Record<string, number>;
  updatedAt: string;
}
```

Cold defaults: `balanced / balanced / balanced / intuition_first / 2 / numpy_plus / normal / standard / L3 / demanding`, `priorKnowledge:{}`, all confidences 0.3.

### Onboarding (8 questions)

- **Q1-Q3:** Sample-based A/B — render same concept two ways, ask "which would you rather learn from?" → sets density+modalityBias, exampleStance, mathDepth
- **Q4-Q6:** Situational single-select → sets handsOn+quizAppetite, chunkSize
- **Q7:** Tone (gentle/balanced/demanding)
- **Q8:** Prior-knowledge sweep — 13 chips (one per part), 4 options each: "new" (L0) / "some" (L2) / "solid" (L3) / "could teach it" (L4)

### Knob → authoring mapping

| Knob | Effect |
|---|---|
| density=terse | Fewer prose blocks; lead with diagram/example |
| modalityBias=diagram_first | Mermaid/figure before prose; expand diagrams by default |
| exampleStance=worked_first | Worked example precedes abstraction |
| mathDepth | applied_only → result+usage; intuition_first → intuition + optional derivation layer; derive_everything → full $$ inline |
| handsOn | Weight of build-to-learn project node |
| quizAppetite | 6-10 (heavy) vs 3-4 (light) quizzes |
| chunkSize | Node length / session size |
| layerRevealDefault | Auto-open ::: layer up to this level |
| tone | Persona voice |
| priorKnowledge[part] | Sets @mastery target AND scaffolding |

### Revealed-preference loop (signals → update)

| Behavior | Update |
|---|---|
| Expands ::: layer math | raise mathDepth, layerRevealDefault |
| Skips long prose fast | toward density=terse |
| Dwells on prose | toward thorough |
| Opens worked examples first | toward worked_first |
| Jumps to try-it | toward discovery_first |
| Fails quizzes | lower difficulty + add scaffolding |
| Aces quizzes | raise @mastery, reduce scaffolding |
| Abandons long sessions | lower chunkSize |

EMA update: small steps, confidence rises with consistent signal, all visible/reversible in settings.

## 3. Design Tokens (from index.css + lyceum-learn-features.css)

### Tailwind @theme tokens
```css
--color-clay-300: #f0a892;
--color-clay-400: #e8866b;
--color-clay-500: #d96846;
--color-clay-600: #c2553a;
--color-sage-400: #6fb38f;
--color-amber-400: #fbbf24;
--color-sky-400: #5ab0c9;
--color-glow: #f7f3ee;
--font-serif: "Source Serif 4", Georgia, serif;
--font-mono: "JetBrains Mono", "Fira Code", monospace;
```

### CSS custom properties
```css
--bg-primary: #09090b;
--bg-secondary: #18181b;
--bg-tertiary: #27272a;
--text-primary: #f4f4f5;
--text-secondary: #a1a1aa;
--text-muted: #52525b;
--accent-primary: #d97706;  /* amber — Lyceum override */
--border-subtle: #27272a;
--border-default: #3f3f46;
```

### Showcase card CSS (lyceum-learn-features.css)
```css
.lyceum-showcase-card {
  border: 1px solid var(--border, #292524);
  border-radius: 10px;
  background: var(--bg-secondary, #1c1917);
  padding: 16px;
  transition: border-color 0.2s, background 0.2s;
}
.lyceum-showcase-card:hover {
  border-color: var(--accent-primary, #d97706);
  background: color-mix(in srgb, var(--accent-primary, #d97706) 4%, var(--bg-secondary, #1c1917));
}
```

## 4. Existing IPC Endpoints

| Endpoint | Payload | Returns |
|---|---|---|
| `learn:listLessons` | `{ part? }` | `LessonSummary[]` |
| `learn:getLesson` | `{ lessonId }` | `LessonWithNodes` |
| `learn:getProgress` | `{ nodeId? }` | `ProgressMap` |
| `learn:getDueReviews` | — | `NodeRef[]` |
| `learn:importLdoc` | `{ json }` | `ImportResult` |
| `learn:validate` | `{ json }` | `ValidationReport` |
| `learn:pick-file` | — | `{ canceled, content, filePath }` |
| `learn:get-worked-example` | — | `{ found, content }` |
| `learn:askTutor` | `{ nodeId, blockId?, question }` | `TutorAnswer` |
| `learn:submitQuiz` | `{ nodeId, blockId, response }` | quiz result |
| `learn:buildPrompt` | `{ userInput?, topic?, ... }` | `{ prompt, systemPrompt, userPrompt }` |
| `learn:generateLdoc` | `{ prompt, systemPrompt }` | `ImportResult` |

## 5. Curriculum Structure

13 parts, each with: part number, slug, emoji, title, rarity (1-5), phase (1/2/3), trailer (what/why/where), intro, defaultMasteryTarget, checklist[].

```ts
export interface CurriculumPart {
  part: number;
  slug: string;
  emoji: string;
  title: string;
  rarity: number;
  phase: 1 | 2 | 3;
  trailer: { what: string; why: string; where: string };
  intro: string;
  defaultMasteryTarget: MasteryLevel;
  checklist: string[];
}
```

## 6. Progress Data Shape

```ts
export interface NodeProgress {
  node_id: string;
  level: MasteryLevel;       // current mastery level
  stability: number;         // spaced repetition stability
  last_seen?: string;        // ISO date
  due_at?: string;           // ISO date — when review is due
  belief: Record<string, { alpha: number; beta: number }>;
}
```

Progress is stored in the DB and accessed via `learn:getProgress` IPC. The renderer holds `progress: Record<string, NodeProgress>` in state.

## 7. Files That Will Change

| File | Change Type | Purpose |
|---|---|---|
| `src/shared/learn/types.ts` | MODIFY | Add LearnerProfile types + DEFAULT_PROFILE |
| `src/services/learn/learnerProfile.ts` | NEW | loadProfile / saveProfile / updateKnob / getPartMastery |
| `src/services/learn/promptLibrary.ts` | MODIFY | composeLearnerProfileBlock, thread profile through compose functions |
| `src/components/learn/LearnPage.tsx` | MODIFY | Remove dashboard view, integrate mastery into library, wire profile state |
| `src/components/learn/LessonLibrary.tsx` | MODIFY | Add mastery summary strip |
| `src/components/learn/LearnerSetup.tsx` | NEW | 8-question onboarding flow |
| `src/components/learn/LearnerProfilePanel.tsx` | NEW | Settings panel for all knobs |
| `src/services/learn/profileSignals.ts` | NEW | EMA signal recording |
| `src/services/learn/services/tutor.service.ts` | MODIFY | Profile-aware persona |
