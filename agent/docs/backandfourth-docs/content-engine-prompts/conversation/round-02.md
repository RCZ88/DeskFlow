# Round 02 — Project Owner Responds: Option B for All + Schema Details

**Date:** 2026-08-26
**Direction:** Project Owner → Architect

---

## Decision: Option B for all 5 bugs

Keep prompts structured, fix backend/UI. Here's why per bug:

### Bug 1: PROMPT_ANALYTICS_INSIGHT → Option B (fix UI)
- **Keep prompt:** `insights[]` array with `metric`, `observation`, `interpretation`, `action`
- **Fix UI:** `AnalyticsView.tsx` `VideoCard` currently reads `insight.insight` (string) — change to iterate `insight.insights[]` and render each as a card with metric badge, observation, interpretation, action
- **Persistence:** Ephemeral (not persisted). The insights are generated per-video and displayed in the modal. No DB table needed.
- **Backend change:** None — already returns `{ ok: true, insights: out.data.insights, verdict: out.data.verdict }`

### Bug 2: PROMPT_VARIABLE_CORRELATION → Option B (fix UI)
- **Keep prompt:** `best_performer: { title, why }` and `worst_performer: { title, why }`
- **Fix UI:** `LearnView.tsx` currently renders `bestPerformer` as plain text — change to render `bestPerformer.title` as bold and `bestPerformer.why` as supporting text
- **Persistence:** Ephemeral (not persisted)
- **Backend change:** None — already spreads `...res.data` into response

### Bug 3: PROMPT_THEME_GENERATOR → Option B (fix backend + UI)
- **Keep prompt:** Returns `name`, `description`, `audience`, `content_hooks`, `suggested_accent_color`
- **Fix backend:** Add `audience JSON` and `content_hooks JSON` columns to `themes` table. Update `themesGenerate` INSERT to include them.
- **Fix UI:** `ThemesView.tsx` already reads `t.content_hooks.length` — just needs the data to actually exist

### Bug 4: PROMPT_PROCESS_SUMMARY → Option B (fix UI)
- **Keep prompt:** Returns `title`, `narrative`, `turning_point`, `growth_signal`
- **Fix UI:** `ProcessSummaryCard.tsx` currently ignores `turning_point` and `growth_signal` — add rendering for these fields
- **Persistence:** Already persisted as `summary` JSON blob (entire parsed response is stored)
- **Backend change:** None — already passes through entire `res.data`

### Bug 5: PROMPT_FRAMEWORK_UPDATE → Option B (fix backend + UI)
- **Keep prompt:** Returns `rule`, `target_framework`, `reasoning`
- **Fix backend:** Store `reasoning` inside the rule JSON object in `content_frameworks.rules`. Change rule shape from `{ id, rule }` to `{ id, rule, reasoning }`.
- **Fix UI:** `FrameworksView.tsx` `ruleText()` function — add optional reasoning display below the rule text
- **No new table needed** — reasoning lives inside the existing `rules` JSON column

---

## Answers to Additional Context Questions

### Q1: DB schema for `themes` — what columns to add?

**Current `themes` table:** 21 columns (id, name, description, accent_color, icon, status, font_display, font_body, font_accent, color_bg, color_text, color_accent, color_accent2, color_accent3, headline_case, headline_size, category, use_case, is_builtin, created_at, updated_at)

**Add 2 columns:**
```sql
ALTER TABLE themes ADD COLUMN audience JSON;
ALTER TABLE themes ADD COLUMN content_hooks JSON;
```

**Update `themesGenerate` INSERT** (main.ts ~line 1169) from:
```sql
INSERT INTO themes (name, description, accent_color, icon, status, created_at, updated_at)
VALUES (?,?,?,?,?,?,?)
```
To:
```sql
INSERT INTO themes (name, description, accent_color, audience, content_hooks, icon, status, created_at, updated_at)
VALUES (?,?,?,?,?,?,?,?,?)
```

And pass `JSON.stringify(res.data.audience)` and `JSON.stringify(res.data.content_hooks)` as the new parameters.

### Q2: Where to persist `reasoning` for framework rules?

**Inside the existing `rules` JSON column** in `content_frameworks`. No new table.

Current rule shape in the JSON array:
```json
{ "id": "lr_1724000000000", "rule": "Every value segment ends with an unresolved teaser" }
```

New rule shape:
```json
{ "id": "lr_1724000000000", "rule": "Every value segment ends with an unresolved teaser", "reasoning": "This was confirmed by 3 videos with >70% completion where the teaser appeared at frame 3" }
```

**Backend change in `promoteLessonToFramework`** (main.ts ~line 1370):
```typescript
// Current:
rules.push({ id: rule.id || `lr_${Date.now()}`, rule: rule.rule });

// New:
rules.push({ id: rule.id || `lr_${Date.now()}`, rule: rule.rule, reasoning: rule.reasoning || null });
```

**UI change in `FrameworksView.tsx` `ruleText()`** (line 7-11):
```typescript
// Current:
const ruleText = (r: any) => typeof r === 'string' ? r : r.rule ?? ''

// New:
const ruleText = (r: any) => typeof r === 'string' ? r : r.rule ?? ''
const ruleReasoning = (r: any) => typeof r === 'string' ? null : r.reasoning ?? null
```

And render `ruleReasoning(r)` as italicized supporting text below the rule.

### Q3: Should PROMPT_ANALYTICS_INSIGHT insights be persisted?

**No — ephemeral.** The insights are generated per-video and displayed in the analytics modal. They're derived from the performance data, so they can always be regenerated. No DB table needed.

The existing flow is:
1. User clicks "Analyze" on a video
2. Backend calls AI with `PROMPT_ANALYTICS_INSIGHT`
3. AI returns `{ insights: [...], verdict: "..." }`
4. Backend returns to renderer (no persistence)
5. Renderer displays in `AnalyticsView.tsx` `VideoCard`

This stays the same — just fix the UI to render `insights[]` instead of `insight.insight`.

---

## Migration Safety

All 3 schema changes use `ALTER TABLE ADD COLUMN` with guarded migrations (same pattern as existing migrations in main.ts ~line 2069-2101). The guarded pattern checks if the column exists before altering:

```typescript
const hasAudience = db.prepare("PRAGMA table_info(themes)").all().some((c: any) => c.name === 'audience');
if (!hasAudience) {
  db.exec('ALTER TABLE themes ADD COLUMN audience JSON');
}
```

This is safe for existing databases — the ALTER is idempotent.

---

## Summary of Changes

| Bug | Prompt | Backend | UI | DB |
|-----|--------|---------|-----|-----|
| 1. Analytics Insight | Keep structured | No change | Fix VideoCard to iterate insights[] | No change |
| 2. Variable Correlation | Keep structured | No change | Fix LearnView to render objects | No change |
| 3. Theme Generator | Keep structured | Fix themesGenerate INSERT | No change (already reads content_hooks) | Add audience JSON, content_hooks JSON |
| 4. Process Summary | Keep structured | No change | Fix ProcessSummaryCard to render turning_point + growth_signal | No change |
| 5. Framework Update | Keep structured | Fix rule shape to include reasoning | Fix ruleText() to show reasoning | No new table (reasoning in rules JSON) |

**Total: 2 DB migrations, 3 backend edits, 3 UI fixes, 0 prompt changes.**
