# Lyceum — Learner Profile & Personalization Design

How we let a user “give their learning style” in a way that is actually effective — and honest about the science. This replaces the hard-coded persona (`resources/learn/prompts/coach-persona.md`, currently Clement's profile) with a per-user **Learner Profile** that drives lesson authoring, rendering, and the tutor.

---

## 0. The core decision (read this first)

**We do NOT build a “detect your learning style” quiz.** The idea that matching teaching to a self-reported style (visual/auditory/kinesthetic, VARK) improves learning — the “meshing hypothesis” — is a well-documented neuromyth. Across four meta-analyses the effect of matching is ~d = 0.04 (essentially zero), and it can actively harm via pigeonholing and false confidence.

- Pashler, McDaniel, Rohrer & Bjork (2008), *Learning Styles: Concepts and Evidence*.
- Kirschner & van Merriënboer (2013), *Learning styles are more toxic than we thought*.
- Yale Poorvu Center; Swansea University 2021 review; carlhendrick.substack summary of the 4 meta-analyses (d = 0.04).

**What the evidence says DOES move learning, and what we build around instead:**
1. **Prior knowledge** is the single biggest personalization lever (Bittermann et al. 2023 bibliometric review; Springer 2025 experimental study). Adapt difficulty and scaffolding per-topic.
2. **Cognitive-load management** — novices need guidance/worked examples; minimally-guided discovery hurts novices (AERO; Sweller CLT). Experts need *less* scaffolding (**expertise-reversal effect**).
3. **Revealed preferences beat stated ones** — actual choices reflect true preferences better than self-report, which is biased/unreliable (revealed-preference theory; cold-start recommender literature).
4. **Choice-based elicitation beats rating/Likert** for cold start — less effort, more satisfying (Graus & Willemsen, RecSys 2015).

**Therefore the design has three parts:**
- **(A) A short, concrete, choice-based onboarding** that sets *presentation & scaffolding defaults* — framed as “how you like it delivered,” not “how your brain learns.”
- **(B) A per-domain prior-knowledge calibration** — the real efficiency lever — lightly validated so it isn't pure self-report.
- **(C) A revealed-preference loop** that refines the profile from behavior over time. This is the real engine; onboarding only sets priors.

Crucially: we adapt **emphasis, difficulty, scaffolding, pacing, and sequencing** — never *exclude* a modality because someone “isn't a reader.” The L2+ visual requirement stays for everyone; a self-described “visual learner” still gets the math, just intuition-first with a diagram leading.

---

## 1. Why a QnA alone is not enough (your intuition, formalized)

You said it yourself: people can only offer “I'm visual, I don't like reading, I learn by doing.” That's real, but it's (a) low-dimensional, (b) about *comfort/motivation*, not learning efficiency, and (c) often wrong about themselves. A one-shot QnA therefore can't carry the personalization. The fix is not a longer quiz — it's a **short quiz for priors + a behavioral loop for truth.** The QnA seeds the system; usage corrects it.

---

## 2. The Learner Profile schema (what we actually store)

Every field is a **knob the app can act on** — in authoring, rendering, or tutoring. Add to `shared/learn/types.ts`, persisted per user.

```ts
export type Density = 'terse' | 'balanced' | 'thorough';
export type ModalityBias = 'diagram_first' | 'balanced' | 'text_ok';
export type ExampleStance = 'worked_first' | 'balanced' | 'discovery_first';
export type MathDepth = 'applied_only' | 'intuition_first' | 'derive_everything';
export type Level = 'L0'|'L1'|'L2'|'L3'|'L4'|'L5';

export interface LearnerProfile {
  version: 1;
  // --- presentation & motivation knobs (from onboarding, refined by behavior) ---
  density: Density;                 // how much prose before the point
  modalityBias: ModalityBias;       // WEIGHTING, never exclusion
  exampleStance: ExampleStance;     // worked examples vs figure-it-out
  mathDepth: MathDepth;             // how deep the derivations go
  handsOn: 0|1|2|3;                 // weight of the build-to-learn project (0=optional, 3=central)
  codeStagingDepth: 'framework_only'|'numpy_plus'|'scratch_first'; // Stage 1->2->3 emphasis
  quizAppetite: 'light'|'normal'|'heavy';   // how many checks per lesson
  chunkSize: 'micro'|'standard'|'deep';     // node length / session size
  layerRevealDefault: Level;        // auto-reveal ::: layer content up to this level
  tone: 'gentle'|'balanced'|'demanding';
  // --- the real lever: prior knowledge per curriculum part ---
  priorKnowledge: Partial<Record<number, Level>>; // part 0..12 -> starting mastery target
  // --- provenance so we know how much to trust each field ---
  confidence: Record<string, number>; // 0..1 per knob; onboarding starts ~0.3, behavior raises it
  updatedAt: string;
}
```

Sensible cold defaults (before onboarding): `balanced / balanced / balanced / intuition_first / handsOn:2 / numpy_plus / normal / standard / layerRevealDefault:'L3' / demanding`, `priorKnowledge:{}`, all confidences 0.3.

---

## 3. (A) Onboarding — the ~2-3 minute, choice-based calibration

Design rules: **show, don't ask abstractly**; **pick-one over rate-many**; **8 items max**; every answer maps to knob priors (low confidence, so behavior can override). No Likert “rate how visual you are 1-7.”

### Q1–Q3: Sample-based A/B (the anti-VARK trick)
Render the **same real concept** two ways and ask “Which would you rather learn from?” This elicits a revealed-style choice with near-zero effort. Rotate the axis each time:

- **Q1 — density/modality:** Card A = diagram-first + 3 tight sentences. Card B = a thorough prose walkthrough. → sets `density` + `modalityBias`.
- **Q2 — example stance:** Card A = a fully worked example you can copy and modify. Card B = “here's the goal, try it, then see the solution.” → sets `exampleStance` (and interacts with prior knowledge; see §5 expertise reversal).
- **Q3 — math depth:** Card A = the result + intuition + when to use it. Card B = the full derivation from first principles. → sets `mathDepth`.

> Implementation: reuse existing block renderers to draw the mini-cards from a fixed `.lmd` snippet pair, so the preview looks exactly like a real lesson.

### Q4–Q6: Concrete situational questions (single-select, with an “it depends” escape)
- **Q4 — “When you hit something new, what do you reach for FIRST?”** (a) a picture/diagram of how it fits together · (b) a worked example I can run · (c) the underlying math/why · (d) just let me try it and fail. → nudges `modalityBias` / `exampleStance` / `mathDepth` / `handsOn`.
- **Q5 — “How do you want each lesson to end?”** (a) a hands-on build I ship · (b) a few quiz questions · (c) a summary I can save · (d) all of it. → sets `handsOn` + `quizAppetite`.
- **Q6 — “Session size that fits your day?”** micro (10 min) / standard (25) / deep (60+). → sets `chunkSize` (microlearning improves adherence; Nature Sci Reports 2024).

### Q7: Tone
“How blunt should the coach be about your gaps?” gentle / balanced / demanding. (Clement = demanding; not everyone.)

### Q8: Prior-knowledge sweep (see §4) — fold in here so onboarding is one flow.

**Output:** all knobs set at confidence ~0.3–0.4. Show the user a one-screen “Here's how I'll teach you” summary they can eyeball and tweak (a settings panel exposing the same knobs) — gives control without forcing them to have opinions.

---

## 4. (B) Prior-knowledge calibration — the highest-value part

Per-topic prior knowledge, not a global style, is what the research says to personalize on. Two-tier so it's fast but not pure self-report:

1. **Self-place (fast):** for each of the 13 North Star parts, a 1-tap chip: “new · some · solid · could teach it.” Maps to L0/L2/L3/L4 → `priorKnowledge[part]`.
2. **Spot-validate (optional, cheap):** for any part they rate ≥ “solid,” fire **one** diagnostic question from that part's question bank. Pass → keep/raise; miss → quietly drop one level and flag for a placement check inside the first lesson. This catches the Dunning-Kruger self-rating error without a full test.

`priorKnowledge[part]` then sets the **`@mastery` target** passed to that part's authoring prompt (we already thread `defaultMasteryTarget` through `composeTopicUserPrompt`) and the scaffolding level (§5).

---

## 5. Mapping knobs → concrete authoring/rendering behavior

This is the payoff — every knob changes something the pipeline already supports.

| Knob | Effect on the lesson |
|---|---|
| `density=terse` | Fewer prose blocks; lead with diagram/example; prose moved into `::: layer` for on-demand expansion. |
| `modalityBias=diagram_first` | Author emits the mermaid/figure before prose; renderer expands diagrams by default. **Still keeps** math/prose — weighting, not removal. |
| `exampleStance=worked_first` | Worked example precedes the abstraction; `discovery_first` puts a “try it” prompt before the solution. **Auto-overridden by prior knowledge** (see below). |
| `mathDepth` | `applied_only` → result+usage; `intuition_first` → intuition then optional derivation in a `::: layer`; `derive_everything` → full `$$` derivations inline. |
| `handsOn` | Weight/size of the build-to-learn project node (0 = omit, 3 = it's the spine of the lesson). |
| `codeStagingDepth` | How far down the Stage 1 (scratch) → 2 (NumPy) → 3 (framework) ladder the code goes. |
| `quizAppetite` | 6–10 quizzes (heavy) vs 3–4 (light); drives question-bank size per node. |
| `chunkSize` | Node length + how many nodes per session; `micro` splits aggressively. |
| `layerRevealDefault` | Renderer auto-opens `::: layer LX` up to this level; deeper stays collapsed until mastery rises. |
| `tone` | Persona voice in authoring + tutor. |
| `priorKnowledge[part]` | Sets `@mastery` target AND scaffolding: **low prior → force worked-examples + more steps; high prior → discovery + terse (expertise-reversal).** This can override `exampleStance`. |

**The one hard rule (anti-meshing guardrail):** knobs change *emphasis, order, difficulty, scaffolding, and pacing*. They never delete a modality. A “visual, doesn't read” learner still gets the derivation — diagram-led, intuition-first, with the heavy math one tap away in a layer.

---

## 6. (C) The revealed-preference loop — the real engine

Onboarding sets weak priors; **behavior is the ground truth.** Instrument the reader and update knobs with a lightweight rule (exponential moving average per knob, or a small Bayesian update; both are fine at this scale — no ML infra needed).

**Signals → update:**
| Observed behavior | Update |
|---|---|
| Consistently expands `::: layer` math | raise `mathDepth`, raise `layerRevealDefault` |
| Skips/scrolls past long prose fast | raise toward `density=terse` |
| Re-reads / dwells on prose | lower toward `thorough` |
| Opens worked examples before trying | toward `worked_first` |
| Ignores worked examples, jumps to “try it” | toward `discovery_first` |
| Fails quizzes at target level | **lower difficulty + add scaffolding for that part** (prior-knowledge correction — highest value) |
| Aces quizzes / finishes fast | raise `@mastery` target, reduce scaffolding |
| Requests “explain differently / simpler” | nudge density + add an alternate representation next time |
| Abandons long sessions | lower `chunkSize` |

**Rules that keep it safe:**
- Each update is small; `confidence` rises with consistent signal, so onboarding answers get overwritten only by repeated behavior (not one click).
- **Interleave / vary anyway.** Don't collapse to a monotone. Periodically present the non-preferred representation — varied practice aids transfer, and it prevents the system from trapping the learner in a comfort rut (the meshing trap in disguise).
- All adaptation is **visible and reversible** in the settings panel: “We've shifted your lessons terser because you skip long text — undo?” Transparency > silent modeling.

---

## 7. Wiring into the existing codebase

1. **`shared/learn/types.ts`** — add `LearnerProfile` (§2). Persist per user (same store as progress).
2. **`services/learn/promptLibrary.ts`** — replace the static `persona` (from `coach-persona.md`) with `composeLearnerProfileBlock(profile)` that renders the knobs into the “WHO YOU ARE TEACHING / HOW TO TEACH THEM” section. Keep `coach-persona.md` only as the *default template* when no profile exists. `composeTopicUserPrompt(part)` reads `priorKnowledge[part]` for the `@mastery` target instead of a fixed default.
3. **Renderer (`components/learn/blocks/*`, `LessonView`)** — consume `layerRevealDefault` (auto-open layers up to level), `modalityBias`/`density` (initial expand/collapse + ordering hints).
4. **Tutor persona (`composeTutorPersona`)** — read `tone` + current per-topic mastery for scaffolding.
5. **Telemetry** — a tiny `profileSignals.ts` that records the §6 events and applies the EMA update; no new backend/IPC, runs client-side like the rest of learn.
6. **Onboarding UI** — a new `LearnerSetup` flow (reuse block renderers for the A/B sample cards) + a `LearnerProfilePanel` in settings exposing every knob.

---

## 8. Why this is the effective method (summary)

- It captures more than “I'm visual” by asking **concrete, choice-based** questions tied to real lesson renderings — low effort, higher signal than a Likert VARK quiz.
- It personalizes on **prior knowledge and cognitive load** (evidence-backed) rather than a debunked style label.
- It treats onboarding as **priors, not truth**, and lets **behavior correct the profile** — which is where the real preference signal lives.
- It **never boxes the learner in**: emphasis and difficulty adapt; modalities and rigor are never removed; variation is deliberately preserved.
- It plugs directly into the persona layer, `@mastery` targets, `::: layer` reveal, and quiz-bank knobs we already have.

## 9. Open questions to decide before build
- Do we gate onboarding (must complete) or let users skip to defaults and calibrate purely from behavior? (Recommend: skippable; behavior alone converges.)
- How aggressive should behavioral updates be? Start conservative (small EMA step, high confidence threshold) and tune.
- Where to store per-topic mastery so onboarding prior-knowledge and the North Star “My Progress” tracker stay in sync (single source of truth).
