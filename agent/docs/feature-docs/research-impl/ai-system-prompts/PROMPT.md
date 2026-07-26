## Raw Request

> "Expected ',' or '}' after property value in JSON at position 1354 (line 28 column 6) this goes to show the BAD SYSTEM PROMPT that doesnt allow the ai to be outputing it properly to be parsed proeprly. again, it needs to be parsable and NOT just show the raw output of the model."

## Context

See `CONTEXT_BUNDLE.md` for the full current implementation — 4 prompts, parsing code, user prompt structures, target models, maxTokens/temperature settings.

## The Mandate

Redesign the 4 system prompts in `src/services/AIService.ts` so that all 3 JSON-returning generators (weekly review, topic digest, anomaly check) produce output that is **always cleanly parseable on first attempt**. The one plain-text generator (daily brief) must never output markdown, JSON, or prefixed text.

## Requirements

### Prompt Design
1. Each JSON prompt must explicitly forbid markdown code fences, trailing commas, placeholder text (`...`), and extra text before/after the JSON
2. Each JSON prompt must show a **concrete example** with realistic values (real app names, real times, real URLs) — NOT abstract descriptions like "2-3 sentence observation"
3. The daily brief prompt must output ONLY raw sentences — no labels, no bullet points, no JSON, no headings, no "Brief:" prefix
4. The topic digest `sources` field should be optional — the AI can return `[]` instead of fabricating links
5. The anomaly prompt must explicitly show both the empty-anomaly case and the anomaly-present case

### Temperature & Tokens
1. JSON-returning generators should use `temperature: 0` to eliminate output variability
2. `maxTokens` should remain at 400 for weekly/topic/anomaly, 200 for daily brief

### Parser Safety Net
1. The `cleanAIJson` parser must handle: markdown code fences, trailing commas before `]`/`}`, truncated JSON (unclosed braces auto-closed), single quotes as string delimiters, unquoted object keys, `...` placeholder replacement
2. All `parseAIJson` callers must have graceful fallbacks that return degraded states (empty array, `wentWell: raw`, `hasAnomaly: false`) — never crash

### Output Format
- **Weekly Review**: `{"wentWell": string, "watchFor": string, "focusSuggestion": string}`
- **Topic Digest**: `[{"topic": string, "summary": string, "sources"?: [{title: string, url: string}]}]`
- **Anomaly Check**: `{"hasAnomaly": boolean, "anomalies": [{severity: "low"|"medium"|"high", detail: string}]}`
- **Daily Brief**: plain text string, no structure

## Constraints
- All changes in `src/services/AIService.ts` only — no files added/removed
- Must work across `google/gemini-2.0-flash-001`, `google/gemma-4-31b-it:free`, and any OpenRouter model
- No external dependencies
- The parser is a safety net — prompts should be strict enough it rarely triggers
