# RESULT — Learner Profile + Mastery Dashboard Integration (build handoff)

Build-ready spec for your coding agent. Anchored to the current tree (fresh `src.zip`). Do the work in this order: **A (dashboard integration) → B (profile infra) → C (onboarding/settings) → D (signals loop)**. A and B are independent; C depends on B; D depends on B.

> **Before you start — the stale-bundle trap.** As with the import fix, edits here are mostly **renderer** code. If the app runs a prebuilt bundle, renderer changes won't show until you rebuild the renderer. Add a temporary stamp to `LessonLibrary` header (`profile+mastery v1`) and confirm it renders before debugging logic. See DIAGNOSIS_stale_renderer.md.

## File inventory
| File | Change | Task |
|---|---|---|
| `src/shared/learn/types.ts` | MODIFY | B — add `LearnerProfile` + knob types + `DEFAULT_PROFILE` |
| `src/services/learn/learnerProfile.ts` | NEW | B — storage: load/save/updateKnob/getPartMastery |
| `src/services/learn/promptLibrary.ts` | MODIFY | B — `composeLearnerProfileBlock` + thread profile |
| `src/services/learn/profileSignals.ts` | NEW | D — EMA behavioral loop |
| `src/components/learn/useMasteryStats.ts` | NEW | A — pure stats hook |
| `src/components/learn/MasteryStrip.tsx` | NEW | A — integrated mastery header strip |
| `src/components/learn/LessonLibrary.tsx` | MODIFY | A — mount strip above shelves |
| `src/components/learn/LearnPage.tsx` | MODIFY | A — remove `dashboard` view, wire props, repurpose header button |
| `src/components/learn/LearnerSetup.tsx` | NEW | C — 8-question onboarding |
| `src/components/learn/LearnerProfilePanel.tsx` | NEW | C — settings panel w/ confidence bars |
| `src/services/learn/services/tutor.service.ts` | MODIFY | B — profile-aware persona |

**Do NOT touch:** `CurriculumShowcase.tsx` (stays a separate `showcase` view), `parseLessonMarkdown.ts`, `validator/*`. Preserve `coach-persona.md` as fallback.

---

# TASK A — Integrate the Mastery Dashboard into the Library

### A0. Delete the isolated view
In `LearnPage.tsx`:
- Remove `'dashboard'` from the `View` union (line ~ `type View = ...`).
- Delete the `{view === 'dashboard' && (<DashboardView .../>) }` branch (~522–523).
- Delete the `DashboardView` and its private `StatCard` functions (~827–912). Salvage the compute logic into the hook below.
- Header (~348–356): **repurpose** the `Dashboard` button. It becomes the **Profile / settings** entry point (Task C): change icon `BarChart3` → `SlidersHorizontal`, label `Dashboard` → `Profile`, `onClick={() => setShowProfilePanel(true)}`. (Mastery data no longer needs a nav target because it now lives on the library page.)

### A1. `useMasteryStats.ts` — one pure hook (no IPC, no new endpoints)
Computes everything the strip needs from the state LearnPage already holds (`progress` + `lessons`).

```ts
import { useMemo } from 'react';
import type { LessonSummary, NodeProgress, MasteryLevel } from '../../shared/learn/types';

export const LEVEL_ORDER: MasteryLevel[] = ['L0','L1','L2','L3','L4','L5'];

export interface DueItem { nodeId: string; dueAt: string; level: MasteryLevel; }
export interface MasteryStats {
  totalNodes: number;            // sum of lesson.nodeCount (curriculum size)
  trackedNodes: number;          // nodes with any progress row
  mastered: number;              // level === 'L5'
  proficientPlus: number;        // L4 + L5 (a friendlier “known” count)
  dueCount: number;
  dueItems: DueItem[];           // sorted soonest-first
  distribution: Record<MasteryLevel, number>;
  masteryPct: number;            // proficientPlus / max(totalNodes,1) * 100
}

export function useMasteryStats(
  progress: Record<string, NodeProgress>,
  lessons: LessonSummary[],
): MasteryStats {
  return useMemo(() => {
    const now = Date.now();
    const vals = Object.values(progress);
    const distribution = Object.fromEntries(LEVEL_ORDER.map(l => [l, 0])) as Record<MasteryLevel, number>;
    for (const p of vals) if (p.level in distribution) distribution[p.level]++;
    const dueItems = vals
      .filter(p => p.due_at && new Date(p.due_at).getTime() <= now)
      .map(p => ({ nodeId: p.node_id, dueAt: p.due_at!, level: p.level }))
      .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));
    const totalNodes = lessons.reduce((s, l) => s + (l.nodeCount ?? 0), 0);
    const mastered = distribution.L5;
    const proficientPlus = distribution.L4 + distribution.L5;
    return {
      totalNodes,
      trackedNodes: vals.length,
      mastered,
      proficientPlus,
      dueCount: dueItems.length,
      dueItems,
      distribution,
      masteryPct: totalNodes > 0 ? (proficientPlus / totalNodes) * 100 : 0,
    };
  }, [progress, lessons]);
}
```
> **Data-processing notes:** distribution counts come straight from `progress[*].level`; due filter is `due_at && new Date(due_at) <= now` (identical rule to the old DashboardView, but sorted + typed); `totalNodes` is curriculum size (lesson.nodeCount sum) while `trackedNodes` is how many have a progress row — the strip shows both so “0 / 214 mastered” reads correctly on a fresh install.

### A2. `MasteryStrip.tsx` — the integrated UI (replaces the whole dashboard page)
A single compact, editorial strip that sits **directly under the library header, above the first shelf**. Three zones in one `rounded-2xl` cloth-tone card; collapses to two rows on narrow widths.

**Layout (left → right):**
1. **Progress dial + headline stat.** A single larger `MasteryRing`-style arc is overkill; instead reuse `MasteryRing` at `size={44} strokeWidth={4}` showing the learner's *modal* level (highest level with the most nodes), with a serif number beside it: `{proficientPlus} / {totalNodes}` and a `font-mono` uppercase caption `MASTERED`. 
2. **Level distribution** — a horizontal row of the 6 levels. For each: a scaled `MasteryRing` at `size={22} strokeWidth={2}` (pass `level={L}` and `target={L}` so the ring reads full for its own color), a thin proportional bar, the count, and the `Lx` label in `font-mono text-[10px]`. This is the inline replacement for the old “Level Distribution” takeover.
3. **Due reviews** — a right-aligned pill/badge: if `dueCount > 0`, an amber pill `{dueCount} due` (clickable → opens the due popover); else a sage check + `Up to date`.

**Due popover:** clicking the due pill opens a small `absolute` panel (not a route) listing `dueItems.slice(0,8)` with node id + `Due <date>`, styled like the book cards. Reuse existing `AnimatePresence`.

**Visual spec (match the editorial language, NOT zinc-900/40):**
```
Container:  rounded-2xl border border-white/10 bg-[#1c1917]/60 backdrop-blur-sm
            px-6 py-5 mb-10  (sits between <header> and the shelves)
            subtle top sheen: bg-gradient-to-b from-white/[0.03] to-transparent
Headline #: font-serif text-3xl text-glow
Captions:   font-mono text-[10px] uppercase tracking-[0.28em] text-clay-300
Divider:    h-8 w-px bg-white/10  (between the three zones)
Due pill:   rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1
            font-mono text-[11px] uppercase tracking-[0.16em] text-amber-300
Up-to-date: text-sage-400 with CheckCircle2 (w-4 h-4)
Bars:       backgroundColor = LEVEL_COLORS[level]; opacity count>0 ? 0.85 : 0.15
            height clamp(4px, pct*1.4, 40px); width flex-1; rounded-full
Ring scale: distribution rings size=22 strokeWidth=2 animated={false}
```
Use the existing `LEVEL_COLORS` map (L0 `#5B6472` … L5 `#F5C04E`) — import from MasteryRing or redeclare locally; do not invent new colors. Headings use `--font-serif`; captions/labels use `--font-mono` to match `LessonLibrary` and `CurriculumShowcase`.

**Empty state:** when `trackedNodes === 0`, show a one-line sage/among caption inside the strip: *“Your mastery map fills in as you study — open a volume to begin.”* Keep the distribution rings visible but at low opacity.

### A3. Wire it in
- `LessonLibrary.tsx`: extend props with `stats: MasteryStats`, `onOpenDue?: () => void`, and render `<MasteryStrip stats={stats} onOpenNode={onOpen} />` right after the `</header>`'s `BlurFade`, before the `loading ? ... : shelves`. Keep the strip inside the same `max-w-6xl` column so it aligns with the shelves.
- `LearnPage.tsx` (`view === 'library'` branch ~479): compute `const stats = useMasteryStats(progress, lessons)` at the top of the component and pass `stats={stats}` to `<LessonLibrary/>`. `progress` is already loaded via `api.learnGetProgress()` (line ~142) — no new IPC.
- Optional nicety: show a tiny due badge on the header “Learn” title too, but the strip is the primary surface.

---

# TASK B — Learner Profile infrastructure

### B1. Types + default — `src/shared/learn/types.ts`
Append (schema verbatim from the design spec):
```ts
export type Density = 'terse' | 'balanced' | 'thorough';
export type ModalityBias = 'diagram_first' | 'balanced' | 'text_ok';
export type ExampleStance = 'worked_first' | 'balanced' | 'discovery_first';
export type MathDepth = 'applied_only' | 'intuition_first' | 'derive_everything';
export type CodeStaging = 'framework_only' | 'numpy_plus' | 'scratch_first';
export type QuizAppetite = 'light' | 'normal' | 'heavy';
export type ChunkSize = 'micro' | 'standard' | 'deep';
export type Tone = 'gentle' | 'balanced' | 'demanding';

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
  confidence: Record<string, number>;  // per-knob 0..1
  updatedAt: string;
}

export const PROFILE_KNOBS = [
  'density','modalityBias','exampleStance','mathDepth','handsOn',
  'codeStagingDepth','quizAppetite','chunkSize','layerRevealDefault','tone',
] as const;
export type ProfileKnob = typeof PROFILE_KNOBS[number];

export const DEFAULT_PROFILE: LearnerProfile = {
  version: 1,
  density: 'balanced', modalityBias: 'balanced', exampleStance: 'balanced',
  mathDepth: 'intuition_first', handsOn: 2, codeStagingDepth: 'numpy_plus',
  quizAppetite: 'normal', chunkSize: 'standard', layerRevealDefault: 'L3',
  tone: 'demanding', priorKnowledge: {},
  confidence: Object.fromEntries(PROFILE_KNOBS.map(k => [k, 0.3])) as Record<string, number>,
  updatedAt: new Date(0).toISOString(),
};
```

### B2. Storage — `src/services/learn/learnerProfile.ts` (localStorage, no DB)
```ts
import { DEFAULT_PROFILE, PROFILE_KNOBS } from '../../shared/learn/types';
import type { LearnerProfile, ProfileKnob, MasteryLevel } from '../../shared/learn/types';

const KEY = 'lyceum.learnerProfile.v1';

export function hasProfile(): boolean { return localStorage.getItem(KEY) != null; }

export function loadProfile(): LearnerProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    // forward-compatible merge: unknown/missing knobs fall back to defaults
    return {
      ...DEFAULT_PROFILE, ...parsed,
      confidence: { ...DEFAULT_PROFILE.confidence, ...(parsed.confidence ?? {}) },
      priorKnowledge: { ...(parsed.priorKnowledge ?? {}) },
      version: 1,
    };
  } catch { return { ...DEFAULT_PROFILE }; }
}

export function saveProfile(p: LearnerProfile): LearnerProfile {
  const next = { ...p, updatedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('lyceum:profile-changed', { detail: next }));
  return next;
}

export function updateKnob<K extends ProfileKnob>(
  knob: K, value: LearnerProfile[K], confidence?: number,
): LearnerProfile {
  const p = loadProfile();
  (p as any)[knob] = value;
  if (confidence != null) p.confidence[knob] = Math.max(0, Math.min(1, confidence));
  return saveProfile(p);
}

export function setPriorKnowledge(part: number, level: MasteryLevel): LearnerProfile {
  const p = loadProfile(); p.priorKnowledge[part] = level; return saveProfile(p);
}

export function getPartMastery(part: number): MasteryLevel | undefined {
  return loadProfile().priorKnowledge[part];
}

export function resetProfile(): void {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('lyceum:profile-changed', { detail: null }));
}
```
> The `lyceum:profile-changed` event lets the settings panel and any open reader re-read the profile live without prop drilling.

### B3. Prompt wiring — `promptLibrary.ts`
Add `composeLearnerProfileBlock(profile)` and thread an optional profile through the three compose functions. **Keep `coach-persona.md` as fallback:** when no profile block is provided, behavior is unchanged.

```ts
import type { LearnerProfile, MasteryLevel } from '../../shared/learn/types';

export function composeLearnerProfileBlock(p: LearnerProfile): string {
  const L = (n: number) => `L${n}` as MasteryLevel;
  const lines: string[] = ['## Learner Profile (authoring directives — obey unless Guardrails conflict)'];

  // density
  lines.push({
    terse: '- DENSITY: Terse. Lead with the diagram or worked example; move supporting prose into `::: layer` blocks. Short paragraphs.',
    balanced: '- DENSITY: Balanced prose and visuals.',
    thorough: '- DENSITY: Thorough. Full explanations welcome; still chunk with headings.',
  }[p.density]);

  // modalityBias  (WEIGHTING, never exclusion — L2+ visual rule still applies)
  lines.push({
    diagram_first: '- MODALITY: Diagram-first. Emit a mermaid/figure BEFORE the prose for each concept. Never drop the math — place heavier derivations in a `::: layer`.',
    balanced: '- MODALITY: Balance figures and prose.',
    text_ok: '- MODALITY: Prose-forward is fine, but every L2+ node still needs at least one visual per the format rules.',
  }[p.modalityBias]);

  // exampleStance
  lines.push({
    worked_first: '- EXAMPLES: Worked-example-first. Show a fully worked, runnable example before the abstraction.',
    balanced: '- EXAMPLES: Mix worked examples and guided discovery.',
    discovery_first: '- EXAMPLES: Discovery-first. Pose a “try it” prompt before revealing the solution.',
  }[p.exampleStance]);

  // mathDepth
  lines.push({
    applied_only: '- MATH: Applied only. State results + when to use them; skip derivations.',
    intuition_first: '- MATH: Intuition first, then put full derivations in an optional `::: layer L4`.',
    derive_everything: '- MATH: Derive from first principles inline with `$$` blocks.',
  }[p.mathDepth]);

  // handsOn
  lines.push([
    '- BUILD: No required build project; keep exercises light.',
    '- BUILD: Include one small hands-on exercise.',
    '- BUILD: Center a build-to-learn project the learner ships.',
    '- BUILD: The build-to-learn project is the SPINE of the lesson; theory serves it.',
  ][p.handsOn]);

  // codeStagingDepth
  lines.push({
    framework_only: '- CODE: Framework-level only (e.g. PyTorch/NumPy high-level APIs).',
    numpy_plus: '- CODE: Show NumPy-level implementation, then the framework equivalent.',
    scratch_first: '- CODE: Build from scratch first (pure Python/loops), then NumPy, then framework.',
  }[p.codeStagingDepth]);

  // quizAppetite
  lines.push({
    light: '- CHECKS: 3–4 quiz items total.',
    normal: '- CHECKS: 5–6 quiz items across the lesson.',
    heavy: '- CHECKS: 6–10 quiz items; test each major node.',
  }[p.quizAppetite]);

  // chunkSize
  lines.push({
    micro: '- CHUNKING: Micro. Split aggressively into ~10-min nodes.',
    standard: '- CHUNKING: Standard node length.',
    deep: '- CHUNKING: Deep. Fewer, longer nodes are acceptable.',
  }[p.chunkSize]);

  // layerRevealDefault + tone
  lines.push(`- LAYERS: Author \`::: layer\` content up to ${p.layerRevealDefault}; deeper material stays collapsed until mastery rises.`);
  lines.push({
    gentle: '- TONE: Encouraging and patient.',
    balanced: '- TONE: Warm but direct.',
    demanding: '- TONE: Demanding senior-engineer voice; call out gaps bluntly.',
  }[p.tone]);

  lines.push('\nNOTE: These change EMPHASIS, DIFFICULTY, ORDER, SCAFFOLDING, and PACING only. Never remove a modality or the required rigor for the topic.');
  return lines.join('\n');
}
```

Thread it in (fallback-safe):
```ts
export function composeAuthorSystemPrompt(
  lib: PromptLibrary,
  opts?: { part?: number; profile?: LearnerProfile },
): string {
  // ...unchanged sections 1,1b,2...
  // 3. Persona — profile block REPLACES the static persona when present
  parts.push(`## Persona\n${opts?.profile ? composeLearnerProfileBlock(opts.profile) : lib.persona}`);
  // ...unchanged 4, 4b, 5...
}

export function composeTopicUserPrompt(part: number, profile?: LearnerProfile): string {
  // ...existing body...
  // If profile has a prior-knowledge level for this part, override the target line:
  //   const target = profile?.priorKnowledge?.[part] ?? curriculum.defaultMasteryTarget;
  //   push: `Calibrate to the learner's current level for this part: ${target}. Author to move them ONE level beyond it.`
}

export function composeTutorPersona(lib: PromptLibrary, profile?: LearnerProfile): string {
  const persona = profile ? composeLearnerProfileBlock(profile) : lib.persona;
  return [persona, lib.guardrails].filter(Boolean).join('\n\n---\n\n');
}
```

### B4. Tutor integration — `tutor.service.ts`
Where the tutor builds its system prompt via `composeTutorPersona(lib)`, pass the profile as `personaMd` when it exists. Since the profile lives in renderer localStorage and the tutor runs in main, pass the composed block **from the renderer** through the existing `learn:askTutor` payload (add an optional `personaMd?: string` field to that IPC payload — this is not a *new* endpoint, just an added optional arg). In `askTutor`, if `personaMd` is present, use it instead of `lib.persona`. Fallback to `coach-persona.md` when absent.

> If you prefer zero IPC-shape change: read the profile JSON from a known localStorage-mirrored file is NOT available in main; the optional-arg approach above is the clean path and does not add an endpoint.

---

# TASK C — Onboarding + Settings panel

### C1. Trigger logic
- On Learn mount: `if (!hasProfile()) setShowSetup(true)` — first visit shows onboarding once. It is **skippable** (a `Skip for now` link) which writes `DEFAULT_PROFILE` (so it won't nag again) but leaves confidences at 0.3 so the behavioral loop can still adapt.
- Re-openable anytime from the repurposed header **Profile** button → opens `LearnerProfilePanel`, which has a `Re-run setup` action.

### C2. `LearnerSetup.tsx` — 8 questions, choice-based
A modal/overlay (reuse the onboarding overlay styling). One question per step, progress dots, `Back`/`Skip`. On finish, assemble a `LearnerProfile` and `saveProfile()` with per-knob confidence **0.35** (0.42 for Q8 prior-knowledge chips the user actively set).

**Q1–Q3 — A/B sample cards.** Render two real `.lmd` snippets side-by-side using the existing `BlockRenderer` (import from `components/learn/blocks/BlockRenderer`). Each card is a real mini-lesson of the SAME concept, differing on one axis. Selecting a card sets the knob:
- **Q1 (density + modality):** Card A = 1 mermaid + 3 tight sentences → `density:'terse', modalityBias:'diagram_first'`. Card B = prose walkthrough, no diagram → `density:'thorough', modalityBias:'text_ok'`.
- **Q2 (example stance):** Card A = worked, runnable code example → `exampleStance:'worked_first'`. Card B = “here's the goal, try it” prompt then solution → `discovery_first`.
- **Q3 (math depth):** Card A = result + intuition + “when to use” → `mathDepth:'applied_only'` (or `intuition_first` if they also want the why). Card B = full `$$` derivation → `derive_everything`.

Store the snippet pairs as constants in `LearnerSetup.tsx` (short, hard-coded `.lmd` strings compiled via the same path BlockRenderer expects). Keep them tiny to avoid the visual-rule validator (these are previews, not imported lessons).

**Q4–Q6 — situational single-select** (radio cards):
- **Q4** “When you hit something new, what do you reach for FIRST?” → (a) a diagram `modalityBias+`, (b) a worked example `exampleStance:'worked_first'`, (c) the math `mathDepth:'derive_everything'`, (d) let me try it `handsOn:3, exampleStance:'discovery_first'`.
- **Q5** “How should each lesson END?” → (a) a build I ship `handsOn:3`, (b) a few quiz Qs `quizAppetite:'heavy'`, (c) a summary `quizAppetite:'light'`, (d) all of it `handsOn:2, quizAppetite:'normal'`.
- **Q6** “Session size that fits your day?” → micro/standard/deep → `chunkSize`.

**Q7 — tone:** gentle / balanced / demanding → `tone`.

**Q8 — prior-knowledge sweep:** render 13 chips (one per curriculum part; pull `CURRICULUM_BLUEPRINT` for emoji+title). Each chip cycles/selects 4 options: **new**(L0) / **some**(L2) / **solid**(L3) / **could teach it**(L4) → writes `priorKnowledge[part]`. Confidence 0.42 for any the user sets.

### C3. `LearnerProfilePanel.tsx` — settings
A right-side drawer (or modal) opened by the header **Profile** button. For each of the 10 knobs: a labeled segmented control showing the current value + a thin **confidence bar** (`width = confidence*100%`, clay fill on `bg-white/10` track) with a caption like `set by you` (≥0.5) or `learning from your behavior` (<0.5). Include the 13 prior-knowledge chips. Actions: `Re-run setup`, `Reset to defaults` (calls `resetProfile()`). Every change calls `updateKnob(..., confidence: 0.6)` (manual edits are high-confidence). Listen to `lyceum:profile-changed` to stay in sync with the behavioral loop.

---

# TASK D — Revealed-preference loop (`profileSignals.ts`)

Behavior is the ground truth; onboarding only sets priors. Signals nudge knobs via a small EMA so one click never flips a setting.

```ts
import { loadProfile, saveProfile } from './learnerProfile';
import type { LearnerProfile, ProfileKnob } from '../../shared/learn/types';

export type LearnSignal =
  | 'layer_expanded' | 'prose_scrolled_fast' | 'prose_dwelled'
  | 'worked_example_opened' | 'try_it_jumped'
  | 'quiz_failed' | 'quiz_aced' | 'session_abandoned';

// EMA step: new = old*(1-a) + target*a, applied on an ordinal scale per knob.
const ALPHA = 0.18;

// Map each knob to an ordered scale so we can nudge up/down.
const SCALES: Partial<Record<ProfileKnob, string[]>> = {
  density: ['thorough','balanced','terse'],
  mathDepth: ['applied_only','intuition_first','derive_everything'],
  exampleStance: ['discovery_first','balanced','worked_first'],
  layerRevealDefault: ['L0','L1','L2','L3','L4','L5'],
  chunkSize: ['deep','standard','micro'],
};

function nudge(p: LearnerProfile, knob: ProfileKnob, dir: -1 | 1) {
  const scale = SCALES[knob]; if (!scale) return;
  const cur = scale.indexOf((p as any)[knob]);
  const target = Math.max(0, Math.min(scale.length - 1, cur + dir));
  const next = Math.round(cur * (1 - ALPHA) + target * ALPHA + dir * 0.01);
  const idx = Math.max(0, Math.min(scale.length - 1, next));
  (p as any)[knob] = scale[idx];
  // confidence grows toward 0.9 as behavior corroborates
  p.confidence[knob] = Math.min(0.9, (p.confidence[knob] ?? 0.3) + 0.05);
}

export function recordSignal(sig: LearnSignal, ctx?: { part?: number }) {
  const p = loadProfile();
  switch (sig) {
    case 'layer_expanded':        nudge(p,'mathDepth',1); nudge(p,'layerRevealDefault',1); break;
    case 'prose_scrolled_fast':   nudge(p,'density',1); break;      // toward terse
    case 'prose_dwelled':         nudge(p,'density',-1); break;     // toward thorough
    case 'worked_example_opened': nudge(p,'exampleStance',1); break;// toward worked_first
    case 'try_it_jumped':         nudge(p,'exampleStance',-1); break;// toward discovery_first
    case 'quiz_aced':             if (ctx?.part!=null) bumpPrior(p,ctx.part,+1); nudge(p,'exampleStance',-1); break;
    case 'quiz_failed':           if (ctx?.part!=null) bumpPrior(p,ctx.part,-1); nudge(p,'exampleStance',1); break;
    case 'session_abandoned':     nudge(p,'chunkSize',1); break;    // toward micro
  }
  saveProfile(p);  // emits lyceum:profile-changed → panel + reader update
}
```

**Where signals fire (renderer listeners, no new deps):**
| Signal | Listener |
|---|---|
| `layer_expanded` | `::: layer` toggle onClick in the Layer block component |
| `prose_scrolled_fast` / `prose_dwelled` | IntersectionObserver + timer on Prose blocks in ReaderView (fast = left viewport < 1.5s; dwell = > 8s) |
| `worked_example_opened` | Code/worked-example block expand |
| `try_it_jumped` | “Reveal solution” skipped / jumped in a discovery block |
| `quiz_failed` / `quiz_aced` | `learn:submitQuiz` result handler (pass `ctx.part` from current lesson) |
| `session_abandoned` | Reader unmount before reaching last node |

**Reversibility:** every update flows through `saveProfile` and shows in `LearnerProfilePanel` with its confidence bar. Because manual edits write confidence 0.6 and each signal only adds ~0.05, a user's explicit choice dominates until behavior *repeatedly* contradicts it. Add a per-knob “why did this change?” tooltip sourced from the last signal (optional). A `Reset to defaults` fully clears it.

**Anti-monotony guardrail:** the loop only shifts emphasis/difficulty/pacing knobs — it never touches the “never exclude a modality” rule baked into `composeLearnerProfileBlock`. Periodically (e.g. every 5th lesson) ignore the profile's terse/diagram bias for one node to preserve varied practice.

---

# Knob → prompt mapping: full sample output
For a profile `{ density:'terse', modalityBias:'diagram_first', exampleStance:'worked_first', mathDepth:'intuition_first', handsOn:3, codeStagingDepth:'scratch_first', quizAppetite:'heavy', chunkSize:'micro', layerRevealDefault:'L4', tone:'demanding' }`, `composeLearnerProfileBlock` emits:

```
## Learner Profile (authoring directives — obey unless Guardrails conflict)
- DENSITY: Terse. Lead with the diagram or worked example; move supporting prose into `::: layer` blocks. Short paragraphs.
- MODALITY: Diagram-first. Emit a mermaid/figure BEFORE the prose for each concept. Never drop the math — place heavier derivations in a `::: layer`.
- EXAMPLES: Worked-example-first. Show a fully worked, runnable example before the abstraction.
- MATH: Intuition first, then put full derivations in an optional `::: layer L4`.
- BUILD: The build-to-learn project is the SPINE of the lesson; theory serves it.
- CODE: Build from scratch first (pure Python/loops), then NumPy, then framework.
- CHECKS: 6–10 quiz items; test each major node.
- CHUNKING: Micro. Split aggressively into ~10-min nodes.
- LAYERS: Author `::: layer` content up to L4; deeper material stays collapsed until mastery rises.
- TONE: Demanding senior-engineer voice; call out gaps bluntly.

NOTE: These change EMPHASIS, DIFFICULTY, ORDER, SCAFFOLDING, and PACING only. Never remove a modality or the required rigor for the topic.
```
This block is injected as the `## Persona` section of `composeAuthorSystemPrompt`, replacing `coach-persona.md`. When no profile exists, the static persona is used unchanged.

---

# Acceptance criteria
1. **No `dashboard` view remains**; `grep -n "'dashboard'" src/components/learn/LearnPage.tsx` → none. App still compiles.
2. Library page shows the **MasteryStrip** above the shelves with correct counts (verify total = sum of nodeCount; due = `due_at <= now`; distribution sums to `trackedNodes`).
3. Strip uses clay/amber/sage + serif/mono — **no `bg-zinc-900/40` cards**.
4. Curriculum (`showcase`) view unchanged.
5. First visit opens `LearnerSetup`; completing it persists a profile to `localStorage['lyceum.learnerProfile.v1']`; skipping writes defaults.
6. Header **Profile** button opens `LearnerProfilePanel`; editing a knob updates storage and the confidence bar.
7. With a profile present, generating a lesson injects the Learner Profile block (log the composed system prompt once to confirm); with none, `coach-persona.md` is used.
8. A quiz fail/ace and a layer expand visibly move the corresponding knob's confidence in the panel (behavioral loop live).
9. No new npm deps; no new IPC endpoints (only the optional `personaMd?` arg on `learn:askTutor`).

# Guardrails
- Renderer-heavy — confirm the new bundle is live (build stamp) before debugging logic.
- Preserve the `...`-style motion-prop placeholders in existing JSX; only add new ones as named const objects to avoid brace corruption.
- `MasteryRing` is imported and reused, never reimplemented; pass `animated={false}` for the tiny distribution rings to avoid 6 concurrent animations.
- Keep `coach-persona.md` on disk as the documented fallback.
