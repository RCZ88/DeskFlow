# Lyceum Learn — System & Design Realignment Spec

> Hand this whole file to the coding agent. It is deliberately written as *intent + contract + exact code*, not “change these colors,” because “change the colors” is exactly the failure mode we're correcting.

**Honesty up front:** I'm working from `src_v2` (the snapshot you gave me) plus the feature code I generated earlier (`curriculum.ts`, `CurriculumShowcase.tsx`, etc.). I can't see the *current* state of your repo after your agent's edits, so line numbers may have drifted. Every fix below is anchored to a **symbol/string to search for**, not just a line number, so it survives drift. Where I assert a root cause, I quote the actual code I can see.

---

## 0. The core misread — “infrastructure, not contents”

You're right, and this is the root of most of the mess. The North Star / Unified Path page is a **system design**. It contains two very different kinds of things:

| **Infrastructure** (lift this) | **Contents** (do NOT hardcode this) |
|---|---|
| The L0–L5 mastery ladder as a *type* | The specific 13 AI-engineering parts |
| The assessment protocol (Demonstrated / Gaps / Verdict / Next step) | The specific checklist items under “Databases, Deep” |
| The prompt architecture (system prompt + per-topic user prompt + tutor persona) | The specific wording of Part 6 → Security |
| The progress model (per-node level, due-for-review) | Your personal progress numbers |
| The ToC / selection-highlight interaction | The example lesson text |
| Guardrails (objective assessor, cite sources, refuse to inflate) | — |

**What went wrong:** I took the *contents* — the concrete curriculum — and baked it into `curriculum.ts` as a static `CURRICULUM: CurriculumPart[]` array **with pre-filled `checklist: string[]`**. The app then renders that array as if it were *your data*. That is literally why:

- “There's a checklist already there, I haven't created anything” → it's seed data, not your data.
- “It shows eight of them” → it's rendering the static parts.
- “By default it should be empty” → correct. The curriculum is a **blueprint/template**, not seeded user state.

**The rule going forward:**

> The curriculum is a *reference blueprint the user can pull from*, never pre-filled progress. The app's default state for a new user is **empty**: no lessons, no completed checklist items, no progress. The North Star's *machinery* (levels, assessment, prompts, guardrails) is what we implement; its *contents* are at most an optional “starter catalog” the user explicitly opts into.

See §2.1 for the exact data-model change that enforces this.

---

## 1. Applying the North Star infrastructure (design + system, not color)

The editorial design language (clay/sage/amber/sky, Source Serif, `rounded-xl`, `backdrop-blur-xl`, spring motion) is the *skin*. The North Star is the *skeleton*. Three pages currently have neither correctly applied — they were only recolored (or not even):

### 1a. Welcome page
**Current state (confirmed in `LearnPage.tsx`, the `lessons.length === 0 && view === 'library'` block):** still fully indigo/violet — `--page-accent: '#6366f1'`, `border-indigo-500/20`, `bg-indigo-500/10`, `text-indigo-300`, `AnimatedGradientText colorFrom="#6366f1" colorTo="#a78bfa"`, `BorderBeam colorFrom="#6366f1"`. **It was never migrated at all.**

**Target:** the editorial welcome we designed — warm emblem (clay/amber), serif headline, `AnimatedGradientText` clay→amber, `BorderBeam colorFrom="#d96846" colorTo="#fbbf24"`, secondary cards using `hover:border-clay-400/30`. Structure stays; palette + type + accent change. See §6.3 for the exact swaps.

### 1b. Dashboard
The dashboard must adopt the North Star's **progress model as its information architecture**, not just its colors:
- Top row: mastery distribution across L0–L5 (use `MasteryRing` colors already defined).
- “Due for Review” and “Up to date” states in editorial cards (`bg-zinc-900/40 backdrop-blur-sm border-zinc-700/40 rounded-xl`).
- Per-part progress should be **derived from real lessons/nodes**, showing 0 until the user creates content — never the seeded curriculum.

### 1c. Curriculum
Re-conceive it as a **catalog/blueprint browser**, not a progress tracker:
- Each part is an editorial “book spine” card (we already have `.lyceum-part-card` styles).
- The checklist under a part is the **blueprint of what a lesson *could* cover** — rendered as muted, un-checkable suggestions until a real lesson exists for that part. Once a lesson exists, the checklist reflects *that lesson's* node coverage, not static data.
- Rarity stars / phase grouping are fine as *presentation*; they must not imply the user has done anything.

---

## 2. Bug triage — root cause → fix (all code-anchored)

### 2.1 Curriculum & checklist pre-populated by default  ⭐ (highest priority)
**Root cause:** `services/learn/curriculum.ts` exports `CURRICULUM` as a static array of 13 `CurriculumPart`s, each carrying a literal `checklist: string[]`. `CurriculumShowcase` renders it directly, and whatever wires it in passes the static list as if it were state.

**Fix (data-model split):**
1. Keep `CURRICULUM` as an immutable **blueprint** (rename the export to `CURRICULUM_BLUEPRINT` to make intent unmistakable).
2. Introduce a derived selector that computes the *user's* curriculum state from real data:
```ts
// services/learn/curriculumState.ts
import { CURRICULUM_BLUEPRINT, type CurriculumPart } from './curriculum';
import type { LessonSummary } from '../../shared/learn/types';

export interface PartState {
  part: CurriculumPart;
  lessons: LessonSummary[];          // real lessons mapped to this part
  hasContent: boolean;               // lessons.length > 0
  checklistCoverage: boolean[];      // derived from node coverage, NOT static
}

export function buildCurriculumState(lessons: LessonSummary[]): PartState[] {
  return CURRICULUM_BLUEPRINT.map((part) => {
    const mine = lessons.filter((l) => l.part === part.part);
    return {
      part,
      lessons: mine,
      hasContent: mine.length > 0,
      // Nothing is “done” until real nodes exist. Empty by default.
      checklistCoverage: part.checklist.map(() => false),
    };
  });
}
```
3. `CurriculumShowcase` renders **blueprint checklist items as greyed, non-interactive suggestions** when `!hasContent`. No checkmarks, no progress, no “completed” styling until a lesson exists.
4. The empty app state is genuinely empty: a new user sees the welcome + the *blueprint* catalog clearly labeled as “what you could learn,” never as “what you've done.”

### 2.2 “Welcome page redirects to the curriculum list”
**Root cause:** the welcome is gated *only* by `lessons.length === 0 && view === 'library'` (`LearnPage.tsx`). The moment any lesson (or a seeded curriculum item treated as a lesson) exists, the gate fails and it falls through to the library/curriculum view. There is no real `'welcome'` route — `type View = 'library' | 'reader' | 'dashboard' | 'import'`.

**Fix:**
- Add an explicit `'welcome'` to the `View` union and a persistent **Home** affordance so “go back to welcome” navigates to `setView('welcome')` deterministically, independent of `lessons.length`.
- Keep the auto-empty-state (show welcome when there are zero lessons) but stop *conflating* “no lessons” with “welcome route.” They're different concepts now.

### 2.3 “Generate lesson based on curriculum” just opens Create Lesson, does nothing
**Root cause:** `CurriculumShowcase` exposes `onGenerate: (part: CurriculumPart) => void`, but the handler wired into `LearnPage` almost certainly just calls `setShowCreateDialog(true)` and drops the `part`. So the dialog opens blank — no topic, no prompt, no scope. The curriculum context never reaches the generator.

**Fix (thread the context through):**
1. `CreateLessonDialog` gains an optional `seed?: LessonSeed` prop:
```ts
export interface LessonSeed {
  part: number;
  title: string;               // part.title
  scope: string[];             // part.checklist — the “things to learn”
  topicPrompt: string;         // from topicPrompts.ts getTopicPrompt(part)
}
```
2. In `LearnPage`, store `const [lessonSeed, setLessonSeed] = useState<LessonSeed|null>(null)` and wire:
```tsx
<CurriculumShowcase
  onGenerate={(part) => {
    setLessonSeed({
      part: part.part,
      title: part.title,
      scope: part.checklist,
      topicPrompt: getTopicPrompt(part.part),
    });
    setShowCreateDialog(true);
  }}
/>
<CreateLessonDialog seed={lessonSeed} open={showCreateDialog}
  onClose={() => { setShowCreateDialog(false); setLessonSeed(null); }} .../>
```
3. `CreateLessonDialog` uses `seed` to **prefill the title, prefill the scope, and (critically) prefill the generation prompt** via the composer in §4 so the “Generate Prompt” step is already populated with the segmentation contract. That's the difference between “opens a blank dialog” and “generates a lesson based on this curriculum part.”

### 2.4 Mermaid renders tiny ⭐
**Root cause (confirmed in `blocks/MermaidBlock.tsx`):** the SVG is injected with `containerRef.current.innerHTML = svg`. Mermaid emits an SVG with an inline `style="max-width: <diagramWidth>px"` and an explicit `height`. In a narrow flex/reader column that inline `max-width` pins the diagram to its intrinsic (small) width instead of filling the container — so it looks shrunk.

**Fix (normalize after injection):**
```tsx
const { svg } = await mermaid.default.render(`mermaid-${block.id}`, block.src);
if (mounted && containerRef.current) {
  containerRef.current.innerHTML = svg;
  const svgEl = containerRef.current.querySelector('svg');
  if (svgEl) {
    svgEl.removeAttribute('height');            // let it scale
    svgEl.style.maxWidth = '100%';              // kill mermaid's pixel cap
    svgEl.style.width = '100%';
    svgEl.style.height = 'auto';
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }
  setLoading(false);
}
```
Also set responsive defaults in `initialize`:
```ts
mermaid.default.initialize({
  startOnLoad: false, theme: 'dark', securityLevel: 'loose',
  flowchart: { useMaxWidth: true, htmlLabels: true },
  sequence: { useMaxWidth: true },
});
```
Give the wrapper a sensible min-height so it doesn't jump: `className="... min-h-[220px]"`. Editorial skin: swap the spinner `border-t-indigo-400` → `border-t-clay-400`.

### 2.5 “Shows eight, but only four range each”
This is the same static-data problem as §2.1 — you're seeing the blueprint parts and their fixed checklist lengths, not real coverage. Once §2.1 lands (blueprint vs. derived state) this reads correctly: parts are catalog entries; the “range” is just the blueprint's suggested scope, clearly labeled and empty until you build lessons.

### 2.6 Memory-hierarchy example “not working”
Most likely the same mermaid sizing issue (§2.4) plus the example being one of the seed items. After §2.4 the diagram will render full-width. If the example still fails to *load*, it's an import/validation issue — have the agent open the example `.ldoc`, run it through `validator/validate.ts`, and paste the first error; I'll debug from that specific message rather than guessing.

---

## 3. The big engineering piece — L0–L5 auto-segmentation engine

> “When the user inputs one whole strum of text, how does the generated prompt make the receiving AI split it into sections, decide how many, and separate them properly?”

This is a **prompt-contract + schema + validation** problem. Three layers:

### 3.1 The contract (what we tell the receiving AI)
The prompt we generate must not say “write a lesson.” It must hand the AI a **segmentation job with an explicit decision procedure**:

1. **Read the whole input as raw source material.**
2. **Identify atomic “knowledge units.”** A unit = one idea that can be independently assessed. Rule of thumb we give it: *if two claims can be understood and tested separately, they are two units.*
3. **Cluster units into nodes.** Each node is one coherent sub-topic. Give it target sizing guidance: *aim for 3–7 nodes for a typical topic; never fewer than 2; split any node whose prose would exceed ~400 words or whose quiz would need >2 distinct concepts.*
4. **Assign each node a `mastery_target` on L0–L5** using the North Star ladder definition (embed the ladder in the prompt): L0 recall → L1 explain → L2 apply → L3 analyze → L4 evaluate/design → L5 teach/transfer. The AI picks the target based on the cognitive demand of the unit, not arbitrarily.
5. **Order nodes by prerequisite.** Emit `prereq` edges so the reader/graph can sequence them.
6. **Emit strict `ldoc/1.0` JSON** matching `shared/learn/types.ts` — and nothing else.

### 3.2 The decision rule for “how many sections”
Don't hardcode a count. Give the AI a **deterministic heuristic** so two runs are stable:
> Count distinct assessable concepts in the source. Group tightly-coupled concepts (those that must be understood together) into one node. The node count = number of groups, clamped to [2, 9]. If the source is thin (<1 assessable concept per intended node), produce fewer nodes rather than padding.

This makes the AI *the one that decides*, but along an explicit rubric, so output is predictable and reviewable.

### 3.3 The prompt skeleton (generated by `CreateLessonDialog` → `composeTopicUserPrompt`)
```
SYSTEM: <composeAuthorSystemPrompt(): objective author, L0–L5 ladder,
         grounding rules, “output ONLY valid ldoc/1.0 JSON”, guardrails>

USER:
  # Task
  Segment the SOURCE below into an ldoc/1.0 lesson.

  # Curriculum context (if seeded)
  Part {n}: {title}
  Intended scope (each becomes ≥1 node unless absent from source):
    - {checklist[0]}
    - {checklist[1]} ...

  # Segmentation procedure  (§3.1 steps, verbatim)
  # Node-count rule         (§3.2 heuristic, verbatim)
  # Mastery ladder          (L0–L5 definitions)
  # Output schema           (compact ldoc/1.0 field list + one worked example node)
  # Hard constraints:
    - Output a single JSON object. No prose, no markdown fences.
    - Every node needs: id, title, mastery_target, blocks[], grounding.
    - Every claim in grounding.must_know needs a source_id present in grounding.sources.
    - If you cannot ground a claim, omit it rather than invent a citation.

  # SOURCE
  <the user's raw strum of text>
```

### 3.4 Why this also fixes your recurring “invalid JSON” pain
We already inverted authoring to Markdown-→-compile for humans. For the *AI* path, add a **repair + validate loop** so a single malformed field doesn't nuke the import:
1. Strip accidental ``` fences before parsing (you hit this exact bug — ```python leaking in).
2. `JSON.parse` → on failure, run one “fix the JSON only, change nothing else” repair pass.
3. Run `validator/validate.ts`. Surface node-level errors in `ValidationReport` (already built) instead of a single opaque “Import failed.”
4. Only nodes that pass validation are committed; failed nodes are shown for one-click retry.

This belongs in `services/learn/services/import.service.ts` (renderer-triggered, no new IPC).

---

## 4. Things you didn't mention (but should decide on)

1. **Part-mapping for free-form topics.** If the user pastes text with no curriculum part, the segmenter still needs a “part”. Add an AI step: *classify the source into the closest blueprint part, or `part: 0` (uncategorized).* Keeps the dashboard/curriculum coherent.
2. **Idempotent re-import.** If a user regenerates a lesson for the same part, do we version, replace, or duplicate? Recommend: version (`lesson.version++`), keep progress attached to stable `node.id`s via `content_hash` so mastery isn't lost on re-generation.
3. **Assessment wiring.** The North Star assessment block (`Demonstrated / Gaps / Verdict / Next step`) should be the *actual* format `tutor.service.ts` returns in `TutorAnswer.assessment` — confirm the tutor prompt emits exactly that shape so the UI (`AssessmentCard`) isn't parsing freeform text.
4. **Empty-state everywhere.** Dashboard, curriculum, reader all need real empty states (“no lessons yet → create one”) so nothing ever renders seeded/fake data. This is the systemic version of the §2.1 fix.
5. **Progress persistence & “due for review.”** Confirm `progress.service.ts` spacing/review scheduling is driven by real answer outcomes (`EvidenceOutcome`), not seeded values.
6. **One accent source of truth.** Kill the hardcoded `#6366f1 / #a78bfa` literals scattered in `LearnPage`/`MermaidBlock` and drive every accent from the `@theme` clay/sage/amber tokens, so “only changed the colors” can't happen again — there's one place to change.
7. **Motion consistency.** The welcome uses `BlurFade`/`BorderBeam`/`ShinyButton`; the dialogs use `framer-motion` springs. Pick one motion vocabulary for the module so transitions feel like one product.

---

## 5. Suggested execution order (for the agent)
1. §2.1 blueprint-vs-derived state (unblocks the “why is this here” confusion).
2. §2.2 explicit `'welcome'` route + Home affordance.
3. §2.3 thread curriculum seed → CreateLessonDialog → prompt.
4. §2.4 mermaid normalization (small, high-impact).
5. §3 segmentation prompt contract + import repair/validate loop.
6. §1 / §6 editorial redesign of welcome → dashboard → curriculum (structure + palette, not palette only).
7. §4 the systemic decisions.

---

## 6. Ready-to-apply code anchors

**6.1 Mermaid** — file `src/components/learn/blocks/MermaidBlock.tsx`: apply §2.4 (the post-render normalization block + `initialize` options + `min-h-[220px]` + clay spinner).

**6.2 Curriculum data** — file `src/services/learn/curriculum.ts`: rename `CURRICULUM` → `CURRICULUM_BLUEPRINT`; add `src/services/learn/curriculumState.ts` (§2.1). Update `CurriculumShowcase` imports + render blueprint checklist as non-interactive until `hasContent`.

**6.3 Welcome palette** — file `LearnPage.tsx`, the `lessons.length === 0 && view === 'library'` block:
- `--page-accent: '#6366f1'` → `'#d96846'`
- `border-indigo-500/20 bg-indigo-500/10` → `border-clay-400/25 bg-clay-500/10`
- `text-indigo-300` (BookOpen) → `text-clay-300`; `border-violet-400/30 text-violet-300` → `border-amber-300/30 text-amber-300`
- `AnimatedGradientText colorFrom="#6366f1" colorTo="#a78bfa"` → `colorFrom="#d96846" colorTo="#fbbf24"`
- `BorderBeam colorFrom="#6366f1" colorTo="#a78bfa"` → `colorFrom="#d96846" colorTo="#fbbf24"`
- secondary card `hover:border-indigo-500/30` → `hover:border-clay-400/30`
- headline font: ensure `font-serif` (Source Serif 4) per editorial spec.

**6.4 Welcome route** — `LearnPage.tsx`: extend `type View` with `'welcome'`; add Home nav; decouple from `lessons.length`.

**6.5 Generate wiring** — `LearnPage.tsx` + `CreateLessonDialog.tsx`: §2.3 seed plumbing.

**6.6 Segmentation prompt** — `services/learn/promptLibrary.ts` (`composeAuthorSystemPrompt`, `composeTopicUserPrompt`): embed §3.1–§3.3. Import repair/validate loop → `import.service.ts`.
