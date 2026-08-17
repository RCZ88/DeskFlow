# PROMPT.md — Content Retention Research: Beyond Pattern Interrupt, Curiosity Gap, Hook Timing & Attention Anchor

> **Target AI:** Claude (or equivalent senior content-strategy + systems engineer)
> **Role:** Lead Content Retention Researcher + Systems Designer
> **Input:** Read `CONTEXT_BUNDLE.md` FIRST — it contains the full project context (verbatim user requirements, current prompt system, provider chain, v3.0 engine spec, design tokens).
> **Output:** A single comprehensive design document (RESULT.md) — research + evidence system + implementation. Do NOT offer options; deliver one complete, well-reasoned design.

---

## Raw Request (verbatim — do not paraphrase)

> HAVE WE INCLUDE THE FOLLOWING IN THE SSYTEM AND THE SYSTEM PROMPT AND LIKE THE FILES THAT WE HAVE N THE MARKDOWN RELATED TO: 1. Pattern Interrupt 2. Curiosity gap 3. HOOKS at the 3rd-4th second and not at the start, RETAINING THE VIEWERS ON TIMES WHERE THEY ACTUALLY DROP OF. pattern interupt can be change scneces use a prop or shock vlaue, curios gap is where you give some infromation that is not too much that KEEP PEOPLE CURIOUS ON WHAT THE NEXT AND RESULT IS. exapl,e instead of just cscammers just hacked google, we add "and they may have access to your email". third is the attention anchor, add this "over 1 milllion users have already reported their account being hacked. heres how to check if yours was to". but knowing hat it needs to be adjust ed accoridng to the fuckign niche and the fuckign otopic that we're doing.
> andi would like you to generate a promtp using @agent/skills/generate-prompt\ forcing hte ai to doa full on research on what other aspects to focus other then those
> making sure that the script bullet opoints have evidence on how they meet those criterias and hwo we cna impleent that in our system

---

## 1. Mandate

Design the **Retention Engineering System** for the RHEO short-form (9:16) video content engine: (a) a research-backed catalog of retention mechanics for the 0–15s window, (b) a machine-checkable **evidence criteria** system where every script frame/bullet proves which retention criteria it satisfies and how, and (c) the exact implementation design (JSON schemas + prompt templates + integration with the existing provider chain, frame-based script output, and Content Equation).

The four user-mandated techniques are **baseline, non-negotiable inputs** — do not argue with them. Your job is to deepen, formalize, and **expand beyond them** with full research.

## 2. Baseline techniques (encode these exactly as the user defined them)

1. **Pattern Interrupt** — scene change, prop, or shock value that breaks the scroll habit loop (the swiping thumb). Mechanic: perceptual mismatch within the first seconds.
2. **Curiosity Gap** — reveal *some* information but withhold the payoff. Example: "scammers hacked Google" → "and they may have access to your email." (Raise a question the viewer cannot answer without watching.)
3. **Hook at 3rd–4th second** — NOT second 0. Viewers drop off at 3–4s; the hook must land precisely where retention actually decays. Design what occupies 0–3s (the interrupt) vs 3–4s (the hook payoff).
4. **Attention Anchor** — social-proof scale + specific fear/stakes + promise of resolution. Example: "Over 1 million users have already reported their account being hacked. Here's how to check if yours was."
5. **Niche adaptation rule** — every technique must be re-expressed per niche/topic (ML education, security, Python tutorials, build-in-public). Provide a mechanism for niche-aware parameterization, not hardcoded examples.

## 3. Full research mandate (the core ask — go BEYOND the baseline)

Research and catalog **at least 10 additional** evidence-backed retention mechanics for the 0–15s short-form video window. For EACH one, deliver:

- **Name** and the psychological mechanism it exploits (e.g., Zeigarnik effect, loss aversion, social proof, specificity/vividness, verbatim effect, information gap theory, threat framing, novelty/looping, dopamine reward prediction error, etc.)
- **The concrete mechanic in a 9:16 video** — what actually happens on screen/audio
- **A worked example line for the ML-education niche** and **one for the security niche** (proving niche adaptability)
- **Where it sits in the timeline** (0–1s, 1–3s, 3–4s hook window, 4–10s, 10s+)
- **Measurable signal** — how you'd know it's working (retention curve slope, completion, saves, comments)
- **Risks/poison** (what kills it: overselling, bait-and-switch, noise, algorithm poison phrases)

Research sources to ground this: hook/retention frameworks from short-form growth analysis, behavioral psychology (Loewenstein's information gap, Kahneman's system-1 processing, Cialdini's principles), and platform behavior data (viewer drop-off curves at 0–5s). Cite what you can; where data is proprietary, mark it as "practitioner consensus" vs "empirical."

## 4. The Evidence Criteria System (the hard requirement)

Design a system where **every script bullet/frame line carries machine-checkable evidence of which retention criteria it satisfies and how**.

Requirements:

1. **Per-frame evidence schema** — extend the frame-based script format:
   ```json
   {
     "frames": [
       {
         "time": "0:00-0:03",
         "visual": "...",
         "line": "...",
         "retention": {
           "criteria": ["pattern_interrupt", "curiosity_gap"],
           "mechanism": "Scene slams from static card to motion; line states a stakes question with withheld answer",
           "evidence": "Line names a specific pain ('your email is exposed') without revealing the resolution — viewer must watch to close the gap",
           "score": 0.9
         }
       }
     ]
   }
   ```
2. **The retention rubric** — a fixed set of criteria IDs (baseline 4 + your researched additions), each with a definition and a scoring rule (0–1). The rubric is versioned and lives in the app as data, not prose.
3. **The validator** — rules for how an LLM (via the existing provider chain) scores a frame against the rubric, and how the app fails a frame with NO evidence (e.g., `retention.score < 0.6` or empty `evidence` → frame rejected, script regenerated with retry messaging).
4. **The score contract** — how the per-frame retention score feeds the existing **Content Equation** (Hook_Strength × .25 etc.) without breaking it (define the exact merge).

## 5. Implementation design (exact artifacts)

Deliver EXACTLY these artifacts:

1. **`retention_rubric.json`** — the versioned criteria catalog (id, name, mechanism, scoring rule, niche-adaptation template).
2. **Prompt template: `retention_script_frames`** — full `{{placeholder}}` template that replaces the current frame-script prompt; must produce the per-frame evidence schema; JSON-only, no markdown, ends with "Respond in JSON only."
3. **Prompt template: `retention_evidence_validator`** — validates/repairs a generated script's evidence (schema + score thresholds + retry instruction).
4. **Prompt template: `retention_niche_adapter`** — takes a niche + the 4 baseline techniques + rubric, returns the niche-specific expression of each (so techniques are never pasted verbatim across niches).
5. **Hook timing spec** — the exact 0–3s / 3–4s / 4–10s / 10s+ beat structure as a machine-parseable timeline, with what MUST occupy each window (interrupt → hook → curiosity loop → payoff → CTA).
6. **IPC + data design** — table/column additions (e.g., `episodes.retention_*`, `script_frames.retention JSON`), the new feature id for the provider chain union, and the new IPC channels (e.g., `content:generateScript(episodeId, niche)` → frames with evidence; `content:validateRetention(episodeId)` → per-frame pass/fail).
7. **UI spec** — how the Overlay Studio's script/visualize views surface the evidence (per-frame retention badges, score bars, "no evidence" warnings), styled to the design tokens in the context bundle (bg #0a0a0f, primary #f5c518, secondary #00d4ff, 8px/12px radii, Inter).
8. **Retry/fallback policy** — parse-fail → resend with "Your last output was invalid JSON" (max 2 retries) → friendly error; frames failing evidence never silently dropped — they surface as explicit regeneration items.

## 6. Constraints

- Output is **one design document** (RESULT.md), complete enough to implement directly. No options menu, no "A/B/C".
- All prompts are **JSON-only** (end every prompt with: "Respond in JSON only. No markdown. No explanation.").
- Must integrate with the existing **provider chain** (`buildChain`/`runWithFallback`/`callProvider` — see context bundle 2.2) — no new networking architecture.
- Must not break the **3-Gate Validator** (scroll-stop / hard-cut / asset-ready) — define how evidence scoring relates to Gate 1 (scroll-stop).
- Frame lines are **short-form spoken text** (write for the ear, max 6 words for hooks per existing framework).
- Niche adaptation is a **hard requirement** — every technique ships with its niche-parameterization, never hardcoded one-niche examples.
- Research must be **honest about evidence strength**: label each technique empirical / practitioner-consensus / hypothesis.

## 7. Output format

Deliver `RESULT.md` with sections:

1. Retention research catalog (10+ mechanics beyond baseline, each with mechanism, mechanic, 2 niche examples, timeline slot, signal, risks)
2. The 4 baseline techniques formalized (exact definitions, timeline slots, niche templates)
3. Evidence Criteria System design (rubric, per-frame schema, validator rules, Content Equation merge)
4. Prompt templates (verbatim, `{{placeholder}}` style)
5. Data/IPC/UI implementation spec
6. Phase plan (research → rubric → prompts → backend → UI) with build order
7. Success criteria checklist

Be exhaustive on sections 3–5. The recurring failure in this project was *format translation* — great ideas shipped in un-filmable formats. Every artifact above must force ideas through evidence-checkable retention criteria before filming.
