# Round 01 — Specialist Requests + Project Owner Responses

> Date: 2026-08-21
> Specialist asked for: ScriptFrame types, AssembleView source, router.ts + IPC pattern
> We provided: All three contexts below

---

## REQUEST 1: Content Engine Script Frames

**Specialist asked for:** The exact TypeScript interfaces for script frames — the shape of data that will become a slide.

**We provided:**

```ts
// src/types/deskflow-api.d.ts
export interface RetentionEvidence {
  criteria: string[];     // e.g. ["visual_hook", "curiosity_gap", "context_lock"]
  mechanism: string;      // HOW the wording satisfies each criterion
  evidence: string;       // QUOTABLE SUBSTRING from frame text that proves the claim
  score: number;          // 0.0–1.0 weighted score
}

export interface ScriptFrame {
  index: number;          // position in the script (0-based)
  text: string;           // EXACT words spoken/overlaid — what gets filmed
  duration_seconds: number; // 1–8 seconds per frame
  frame_type: 'hook' | 'value' | 'transition' | 'call_to_action' | 'visual_only';
  visual: string;         // on-screen visual description (footage/B-roll/text overlay/motion graphics)
  retention: RetentionEvidence;
  timestamp: string;      // "MM:SS"
  rejected?: boolean;
  rejection_reasons?: string[];
}
```

**Key insight for presentation mapping:** Each ScriptFrame maps to one slide:
- `text` → slide headline/body
- `visual` → slide visual description (diagram, chart, code block, etc.)
- `frame_type` → slide layout (hook=hero, value=content, call_to_action=CTA, visual_only=diagram-only)
- `duration_seconds` → slide timing
- `retention.criteria` → which retention mechanisms the slide satisfies
- `retention.score` → slide quality indicator

---

## REQUEST 2: AssembleView Episode Bridge

**Specialist asked for:** How episodes currently map to the overlay pipeline.

**We provided:** Full source of `AssembleView.tsx` (217 lines).

Key data types:
```ts
type CutEntry = { index: number; start_s: number; end_s: number; duration_s: number; text: string; seg_type: string; source_seg_id?: string }
type OverlayEntry = { start_s: number; end_s: number; text: string; position: string; style?: string; font_size?: string }
```

Key finding: The handoff to Overlay Studio is currently a MODE SWITCH only — `onPhaseChange?.('studio')` — no actual data transfer. The Overlay Studio re-fetches or doesn't receive the data.

**Decisions made:**
- The presentation bridge would follow a similar pattern but actually transfer data via IPC
- `presentation:generate` IPC would receive episode script frames and produce slides

---

## REQUEST 3: AI Provider Chain & IPC Bridge

**Specialist asked for:** buildChain/runWithFallback functions and an example IPC handler.

**We provided:**

`router.ts` — the feature union is:
```ts
feature: 'researchDigest' | 'goalAssistant' | 'resumeBuilder' | 'category' | 'colors' | 'lifeAssistant' | 'monthlyRecap' | 'contentEngine'
```
Adding `'presentation'` requires extending this union + adding routing config in main.ts.

`contentEngine/index.ts` — the `content:script:generate` handler pattern:
1. Fetch episode + idea from DB
2. Compose input (framework rules, lessons, reflection patterns)
3. Call AI via `aiCall(prompt, systemPrompt, maxTokens)` which wraps `buildChain` + `runWithFallback`
4. Parse JSON response via `parseAiJson`
5. Process, save to DB, return result

**Decisions made:**
- New feature ID `'presentation'` goes in the router union
- New file `src/services/presentation/index.ts` with `registerPresentationHandlers(db, aiCall)`
- Wired from main.ts with `require('./services/presentation').registerPresentationHandlers(db, aiCall)`

---

## Convergence Status

Ongoing — Specialist has context for all 3 requests. Awaiting follow-up questions or design proposal.
