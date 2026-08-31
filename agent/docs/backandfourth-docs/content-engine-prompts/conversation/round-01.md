# Round 01 — Architect Confirms 5 Requirements + Requests Interfaces

**Date:** 2026-08-26
**Direction:** Architect → Project Owner

---

## Architect's Confirmation

I confirm the 5 requirements from the INITIAL_PROMPT.md:

1. Each prompt generates JSON for a short-form video creation pipeline.
2. The output must be actionable for a 17-year-old with $0 budget, 20 min max edit time, CapCut only.
3. Every prompt must include the creator context (age, location, audience, brand, budget, platforms).
4. "story" is a BANNED format type — it must never appear in any output.
5. The prompts must produce output that directly maps to UI components (ScriptProofCard, HookStackDisplay, etc.).

I have received and read all 4 files (CONTEXT_GAPS.md, CONVERSATION_PROTOCOL.md, INITIAL_PROMPT.md, CONTEXT_BUNDLE.md). I have the full prompt source code from CONTEXT_BUNDLE.md §4.2 and the backend assembly code from §4.4.

---

## Architect's REQUEST

> I need the TypeScript interfaces (or exact JSON shape expectations) for the outputs of the following prompts: PROMPT_THEME_GENERATOR, PROMPT_ANALYTICS_INSIGHT, PROMPT_LESSON_EXTRACTOR, PROMPT_HUMAN_REFLECTION, PROMPT_ANALYTICS_IMPORT, PROMPT_SCORE_CALIBRATION, PROMPT_PROCESS_SUMMARY, PROMPT_FRAMEWORK_UPDATE, and PROMPT_VARIABLE_CORRELATION.
>
> The CONTEXT_BUNDLE.md §5 provides interfaces for ScriptFrame, ContentEpisode, ContentVideo, etc., but lacks the shapes for these analytical and reflective outputs. I need these interfaces to ensure the improved prompts generate JSON that maps directly to the UI components without requiring me to guess the expected structure.

---

# Round 01 — Project Owner Responds with Interfaces

**Date:** 2026-08-26
**Direction:** Project Owner → Architect

---

## FULLY TYPED (4 prompts)

### PROMPT_LESSON_EXTRACTOR → `ContentLesson` (deskflow-api.d.ts:743)

```typescript
interface ContentLesson {
  id?: number
  video_id?: number | null
  episode_id?: number | null
  lesson: string
  evidence?: Array<{ metric: string; value: string; note?: string }>
  confidence?: number
  applies_to?: string | null
  status?: 'active' | 'applied' | 'dismissed' | 'confirmed'
}
```

**Consumer:** `LessonsView.tsx:14` — renders `lesson.lesson`, `lesson.applies_to`, `lesson.confidence`
**DB columns:** `id, video_id, episode_id, lesson TEXT NOT NULL, evidence JSON, confidence REAL DEFAULT 0.5, applies_to TEXT, status TEXT DEFAULT 'active', created_at`

### PROMPT_HUMAN_REFLECTION → `ReflectionAnalysis` (deskflow-api.d.ts:784)

```typescript
interface ReflectionAnalysis {
  characteristics: Array<{ name: string; value: string }>
  intuitions: string[]
  contradictions: Array<{ gut: string; data: string; resolution: string }>
  format_fit: { format: string; verdict: 'SUITS' | 'DOES NOT SUIT'; reasoning: string }
  extracted_pattern: string
  suggested_lesson: { lesson: string; applies_to: string; confidence: number }
}
```

**Consumer:** `ReflectionPanel.tsx:9` — renders all fields (characteristics as chips, intuitions as bullets, contradictions as cards, format_fit with verdict badge, extracted_pattern as quote, suggested_lesson with Save button)
**DB columns:** `video_reflections: id, episode_id, video_id, reflection_text, analysis JSON, created_at`

### PROMPT_ANALYTICS_IMPORT → `AnalyticsCandidate` (deskflow-api.d.ts:836)

```typescript
interface AnalyticsCandidate {
  platform: string
  views: number | null
  likes: number | null
  saves: number | null
  shares: number | null
  comments: number | null
  followers_gained: number | null
  completion_pct: number | null
  avg_watch_seconds: number | null
  published_at: string | null
  retention_curve: Array<{ t: number; pct: number }>
  audience: { ages: Array<{ range: string; pct: number }>; countries: Array<{ code: string; name: string; pct: number }> } | null
  dropoffs: Array<{ t: number; pct: number }>
}
```

**Consumer:** `AnalyticsImportModal.tsx:73` — 3-step modal (paste → review → done), renders all fields via DetectedField components, retention_curve via RetentionPreview mini chart
**DB columns (content_videos):** `id, episode_id, platform, url, title, views, likes, saves, shares, comments, completion_pct, retention_curve JSON, audience JSON, dropoffs JSON, published_at, fetched_at`

### PROMPT_SCORE_CALIBRATION → `CalibrationReport` (deskflow-api.d.ts:828)

```typescript
interface CalibrationReport {
  accuracy: number
  per_criterion: Array<{
    criterion: string
    predicted_avg: number
    actual_metric: string
    actual_value: number
    criterion_accuracy: number
    notes: string
  }>
  most_accurate: string
  least_accurate: string
  recommendations: string[]
}
```

**Consumer:** `CalibrationView.tsx:55` — renders accuracy as SVG ring chart, per_criterion as expandable rows, most/least accurate labels, recommendations as bullet list
**DB columns:** `score_calibrations: id, episode_id, scheme_id, accuracy REAL, per_criterion JSON, predictions JSON, actual JSON, recommendations JSON, created_at`

---

## GAPS (5 prompts — need new interfaces)

### PROMPT_THEME_GENERATOR — NO INTERFACE

The DB `themes` table has 20+ columns but no TS type. The prompt returns `audience` and `content_hooks` but only `name`, `description`, `accent_color` are persisted. The UI reads fields ad-hoc via `any`.

**Prompt output shape:**
```json
{
  "name": "string",
  "description": "2-3 sentences",
  "audience": { "age_range": "18-25", "pain_points": ["..."], "interests": ["..."] },
  "content_hooks": [
    { "hook": "exact hook line", "format_type": "...", "reason": "why this niche audience stops scrolling" }
  ],
  "suggested_accent_color": "#RRGGBB"
}
```

**Backend extraction (index.ts:1162-1180):** Only persists `name`, `description`, `accent_color`. The `audience` and `content_hooks` from the AI response are DISCARDED — never saved to DB.

**Consumer:** `ThemesView.tsx:7` — renders `themes[]`, checks `t.content_hooks.length`, reads `t.accent_color`, `t.name`, `t.description`

### PROMPT_ANALYTICS_INSIGHT — NO INTERFACE

The prompt returns `insights[]` (array of objects) but the UI reads `insight.insight` (a string) — field-name mismatch. The structured per-metric insights are never iterated.

**Prompt output shape:**
```json
{
  "insights": [
    {
      "metric": "retention_curve" | "completion_pct" | "saves" | "likes" | "audience" | "dropoff" | "other",
      "observation": "what the data shows — be specific with numbers",
      "interpretation": "why it likely happened (link to specific script frames or visual choices)",
      "action": "the EXACT change to make in the NEXT script — be concrete, not generic"
    }
  ],
  "verdict": "what worked and what failed in this video — 2-3 sentences max, referencing specific frames"
}
```

**Backend extraction (index.ts:1259-1283):** Returns `{ ok: true, insights: out.data.insights, verdict: out.data.verdict || '' }` — no persistence, ephemeral.

**Consumer:** `AnalyticsView.tsx:38` `VideoCard` — sets `insight` state as `any`, renders `insight.insight ?? insight.summary ?? JSON.stringify(insight)` as text and `insight.verdict` as badge. The component reads `insight.insight` (string) but prompt returns `insights[]` (array) — **BUG: structured insights never rendered**.

### PROMPT_PROCESS_SUMMARY — PARTIAL

The prompt returns `turning_point` and `growth_signal` but the UI ignores these fields, instead deriving equivalent information from the events timeline. Dead prompt fields.

**Prompt output shape:**
```json
{
  "title": "short evocative title for this journey",
  "narrative": "3-5 sentences narrating the journey with real event details",
  "turning_point": "the single moment that changed the outcome (or 'none' if linear)",
  "growth_signal": "one measurable improvement this video shows vs a typical process"
}
```

**Backend extraction (index.ts:1606-1619):** Returns `{ ok: true, summary: res.data, events }` — entire parsed JSON passed through as `summary`.

**Consumer:** `ProcessSummaryCard.tsx:7` — typed as `{ title: string; narrative: string }`. Renders `summary.title` and `summary.narrative`. The `turning_point` and `growth_signal` fields are IGNORED — the component derives turning point from `events` array (finding `event_type === 'pivot'`) and growth signal from last `lesson_extracted` event.

### PROMPT_FRAMEWORK_UPDATE — REASONING IGNORED

The prompt returns `reasoning` but the backend ignores it. Only `rule` and `target_framework` are extracted.

**Prompt output shape:**
```json
{
  "rule": { "id": "short slug", "rule": "one imperative sentence, actionable in script writing" },
  "target_framework": "the framework this belongs to, or 'Learned Rules' if none matches",
  "reasoning": "one sentence linking the rule to the lesson"
}
```

**Backend extraction (index.ts:1353-1387):** Extracts `res.data.rule` and `res.data.target_framework`. The `reasoning` field is DISCARDED.

**Consumer:** `FrameworksView.tsx:5` — renders `frameworks[]` from `frameworksList()`. Each `FrameworkCard` shows `fw.name`, `fw.version`, `fw.is_builtin`, `fw.description`, `fw.rules` as numbered list. The `reasoning` is never surfaced.

### PROMPT_VARIABLE_CORRELATION — NO PROJECT-LEVEL INTERFACE

The component defines a local `Correlation` type. `best_performer` is `{ title, why }` (object) but the UI treats it as a string — would render `[object Object]`.

**Prompt output shape:**
```json
{
  "correlations": [
    { "variable": "variable name", "insight": "what the data shows", "impact": "high|medium|low", "direction": "positive|negative" }
  ],
  "best_performer": { "title": "video title", "why": "what made it work" },
  "worst_performer": { "title": "video title", "why": "what held it back" },
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]
}
```

**Backend extraction (index.ts:1804-1833):** Returns `{ ok: true, ...res.data }` — spreads entire parsed JSON. No persistence.

**Consumer:** `LearnView.tsx:23` — defines local types:
```typescript
type Correlation = { variable: string; insight: string; impact: string; direction: 'positive' | 'negative' }
type Recommendation = string
```
Renders `correlations[].variable`, `correlations[].insight`, `correlations[].direction` (TrendingUp/TrendingDown icon), `correlations[].impact` (badge). Also renders `bestPerformer` and `worstPerformer` as plain text — **BUG: these are objects, would render `[object Object]`**.

---

## Summary Table

| Prompt | Has TS Interface? | Interface Name | Consumer Component | Bug? |
|--------|-------------------|----------------|-------------------|------|
| PROMPT_THEME_GENERATOR | **NO** | — | ThemesView.tsx | audience/content_hooks discarded |
| PROMPT_ANALYTICS_INSIGHT | **NO** | — | AnalyticsView.tsx | **insights[] never rendered (field mismatch)** |
| PROMPT_LESSON_EXTRACTOR | YES | ContentLesson | LessonsView.tsx | No |
| PROMPT_HUMAN_REFLECTION | YES | ReflectionAnalysis | ReflectionPanel.tsx | No |
| PROMPT_ANALYTICS_IMPORT | YES | AnalyticsCandidate | AnalyticsImportModal.tsx | No |
| PROMPT_SCORE_CALIBRATION | YES | CalibrationReport | CalibrationView.tsx | No |
| PROMPT_PROCESS_SUMMARY | **PARTIAL** | inline `{ title, narrative }` | ProcessSummaryCard.tsx | turning_point/growth_signal dead |
| PROMPT_FRAMEWORK_UPDATE | YES | ContentFramework | FrameworksView.tsx | reasoning discarded |
| PROMPT_VARIABLE_CORRELATION | **NO** (local type) | Correlation (local) | LearnView.tsx | **best_performer renders [object Object]** |
