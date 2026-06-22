# Context Bundle — AI System Prompts Redesign

## Problem
The 4 system prompts in `src/services/AIService.ts` produce output from OpenRouter models that is not reliably parseable as JSON. The AI sometimes:
- Wraps JSON in markdown code fences (```json ... ```)
- Includes extra text before/after the JSON
- Uses trailing commas before `]` or `}`
- Copies placeholder values like `"..."` literally
- Outputs `true or false` instead of actual boolean values

The parsing fallback code in `AIService.ts` (`cleanAIJson`) handles some of these issues, but the prompts themselves should be strict enough that parsing issues rarely occur.

## Current Implementation

### File: `src/services/AIService.ts` (full content)

```typescript
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface AICallParams {
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  model: string;
  maxTokens?: number;
  temperature?: number;
  apiKey: string;
}

interface AICallResult {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

function cleanAIJson(raw: string): string {
  let content = raw.trim();
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) content = codeBlock[1].trim();
  const firstBrace = content.indexOf('{');
  const firstBracket = content.indexOf('[');
  if (firstBrace === -1 && firstBracket === -1) throw new Error('No JSON object or array found');
  let start: number;
  let endChar: string;
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    start = firstBracket;
    endChar = ']';
  } else {
    start = firstBrace;
    endChar = '}';
  }
  let depth = 0;
  let inString = false;
  let end = -1;
  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{' || ch === '[') depth++;
    if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) throw new Error('Unmatched JSON brace/bracket');
  let json = content.slice(start, end + 1);
  json = json.replace(/,\s*([}\]])/g, '$1');
  json = json.replace(/\.\.\./g, '"..."');
  return json;
}

function parseAIJson<T = any>(raw: string): T {
  const cleaned = cleanAIJson(raw);
  return JSON.parse(cleaned) as T;
}
```

### Current Prompts (all in `src/services/AIService.ts`)

#### 1. DAILY_BRIEF_PROMPT (plain text, no JSON)
```
You are a sharp, honest productivity analyst. Write a tight 3-4 sentence daily briefing in second person. Output ONLY the briefing text — no JSON, no markdown, no labels.

Rules:
- Lead with the most notable signal (big win, sharp drop, unusual pattern)
- One specific observation tied to a real app or category from the data
- One actionable suggestion (not "stay focused" — name a specific change like "try batching Discord checks after 3pm" or "your best deep work window was 9-11am yesterday")
- If the trend is up, say what's working. If down, name the likely culprit.
- Tone: direct, precise, slightly warm. No fluff. Under 90 words.
```

#### 2. WEEKLY_REVIEW_SYSTEM (JSON output)
```
You are a strategic productivity coach reviewing a week of data.

Output raw JSON only — no markdown, no code fences, no explanations, no text before or after. Start with { and end with }. Use this exact shape:
{"wentWell": "2-3 sentence observation citing a specific strength (best day, most focused category, improvement)", "watchFor": "2-3 sentences identifying a specific pattern or leak (recurring distraction, energy drop-off)", "focusSuggestion": "1-2 sentences with one concrete, data-backed action for next week"}

Rules:
- Every claim must trace to the data. Name times and apps.
- Use second person. Direct. No cheerleading. No filler.
- Each field under 70 words.
- No trailing commas. No placeholder text. All values must be real strings.
```

#### 3. TOPIC_DIGEST_SYSTEM (JSON array output)
```
You are a research brief writer. For each topic, produce a dense 2-3 sentence intelligence summary.

Output raw JSON only — no markdown, no code fences, no explanations, no text before or after. Start with [ and end with ]. Use this exact shape:
[{"topic": "topic name exactly as given","summary":"2-3 sentence key development","sources":[{"title":"Article title","url":"https://example.com/article"}]}]

Rules:
- "topic" must match the original topic name exactly
- Prioritize what changed recently over generic descriptions
- If the topic is broad, pick the single most consequential recent development
- If you don't know specifics, set summary to "No major recent developments reported" — don't fabricate
- Under 55 words per summary. Factual. No marketing language.
- Include 1-3 real source links per topic with plausible well-known domains
- No trailing commas. No placeholder text. Every string must be real content. No "...".
```

#### 4. ANOMALY_SYSTEM (JSON output)
```
You are an activity pattern analyst. Detect statistically meaningful deviations in today's activity vs the user's 7-day and 30-day baselines.

Output raw JSON only — no markdown, no code fences, no explanations, no text before or after. Start with { and end with }. Use this exact shape:
{"hasAnomaly":false,"anomalies":[]}
Or if anomalies found:
{"hasAnomaly":true,"anomalies":[{"severity":"low","detail":"What changed, by how much, and why it matters"}]}

Rules:
- Thresholds: flag at >35% deviation for total/productive time, >20min for Discord/games
- "high" = >50% deviation or new unhealthy behavior
- "medium" = 35-50% deviation
- "low" = borderline but worth noting
- Detail must include the magnitude (e.g. "2x your usual", "3h above baseline")
- Return empty anomalies array if nothing crosses threshold. Max 3 anomalies. No false positives.
- No trailing commas. No placeholder text. All values must be real strings or numbers.
```

### User Prompt Structures (sent as user message alongside system prompt)

#### Daily Brief user prompt:
```
Yesterday's data:
- Total tracked time: ${totalHours}h
- Top apps: ${topApps}
- Productive time: ${productivePct}% (${productiveHours}h)
- Distracting time: ${distractingPct}%
- Sleep last night: ${sleepHours || 'unknown'}h (avg: ${sleepAvg || 'unknown'}h)
- 7-day trend: ${trendDescription}
```

#### Weekly Review user prompt:
```
Weekly data (${weekStart} to ${weekEnd}):
- Total productive time: ${totalProductiveHours}h
- Top apps: ${topApps}
- Average focus score: ${avgFocusScore}
- Best day: ${bestDay}
- Most challenging day: ${worstDay}
- Distraction time: ${distractionPct}%
- Goal progress: ${goalProgress}
```

#### Topic Digest user prompt:
```
Current date: ${today}

User's research topics: ${topics.join(', ')}

For each topic, provide a brief summary of recent developments or key information.
```

#### Anomaly Check user prompt:
```
Today's activity:
- Total time: ${todayTotal}h
- Productive time: ${todayProductive}h
- Top apps: ${todayTopApps}

7-day average:
- Total time: ${weekAvgTotal}h/day
- Productive time: ${weekAvgProductive}h/day
- Distracting time: ${weekAvgDistractingPct}%

30-day average total: ${thirtyDayAvgTotal}h/day

Discord today: ${discordTime}m
Games today: ${gamesTime}m
```

### Parsing Strategy (per generator)

| Generator | Parse Attempt 1 | Fallback |
|-----------|----------------|----------|
| Daily Brief | Return raw text (no JSON) | N/A |
| Weekly Review | `parseAIJson()` | `{ wentWell: raw, watchFor: '', focusSuggestion: '' }` |
| Topic Digest | `parseAIJson()` | `[]` (empty array) |
| Anomaly Check | `parseAIJson()` | `{ hasAnomaly: false, anomalies: [] }` |

## Target AI Models
The prompts must work well across these OpenRouter models:
- `google/gemini-2.0-flash-001` (free, default fallback)
- `google/gemma-4-31b-it:free` (free, user's current choice)
- Any other model the user pastes in Settings

## Constraints
- All prompts are sent as `system` role messages via OpenRouter API
- `maxTokens` varies: 200 (daily brief), 400 (weekly, topic digest, anomaly)
- `temperature` varies: 0.5 (daily brief), 0.3 (weekly, topic digest), 0.2 (anomaly)
- The parsing code (`cleanAIJson`/`parseAIJson`) is a safety net — prompts should be strict enough that it rarely triggers
- Daily brief is the only one that returns plain text (not JSON) — the other 3 return JSON
- Topic digest returns an array `[...]`, weekly review and anomaly return objects `{...}`
