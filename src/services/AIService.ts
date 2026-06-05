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

  // Find first JSON object start
  const firstBrace = content.indexOf('{');
  const firstBracket = content.indexOf('[');
  if (firstBrace === -1 && firstBracket === -1) throw new Error('No JSON object or array found');

  let start: number;
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    start = firstBracket;
  } else {
    start = firstBrace;
  }

  // Walk through character by character tracking depth
  let depth = 0;
  let inString = false;
  let inSingleQuote = false;
  let end = -1;
  let lastJsonEnd = -1;

  for (let i = start; i < content.length; i++) {
    const ch = content[i];

    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (inSingleQuote) {
      if (ch === '\\') { i++; continue; }
      if (ch === '\'') inSingleQuote = false;
      continue;
    }

    if (ch === '"') { inString = true; continue; }
    if (ch === '\'') { inSingleQuote = true; continue; }

    if (ch === '{' || ch === '[') {
      depth++;
    }
    if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
      if (depth < 0) {
        depth = 0;
        continue;
      }
    }
  }

  // Handle truncated JSON: auto-close unclosed brackets/braces
  if (end === -1 && depth > 0) {
    end = content.length - 1;
  }

  if (end === -1) throw new Error('Unmatched JSON brace/bracket');

  let json = content.slice(start, end + 1);

  // Close unclosed brackets at end
  for (let i = 0; i < depth; i++) {
    json += ']';
  }

  // Replace single quotes with double quotes (only outside strings)
  let converted = '';
  let sq = false;
  let dq = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (dq) {
      if (ch === '\\') { converted += ch; i++; if (i < json.length) { converted += json[i]; } continue; }
      if (ch === '"') dq = false;
      converted += ch;
      continue;
    }
    if (sq) {
      if (ch === '\\') { converted += ch; i++; if (i < json.length) { converted += json[i]; } continue; }
      if (ch === '\'') { sq = false; converted += '"'; continue; }
      converted += ch;
      continue;
    }
    if (ch === '"') { dq = true; converted += ch; continue; }
    if (ch === '\'') { sq = true; converted += '"'; continue; }
    converted += ch;
  }
  json = converted;

  // Unquote bare keys: `{key:` -> `{"key":`
  json = json.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

  // Remove trailing commas before } or ]
  json = json.replace(/,\s*([}\]])/g, '$1');

  // Replace literal "..." placeholder with empty string
  json = json.replace(/\.\.\./g, '""');

  return json;
}

function parseAIJson<T = any>(raw: string): T {
  const cleaned = cleanAIJson(raw);
  return JSON.parse(cleaned) as T;
}

async function callOpenRouter(params: AICallParams): Promise<AICallResult> {
  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://deskflow.app',
      'X-Title': 'DeskFlow',
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...params.messages,
      ],
      max_tokens: params.maxTokens || 500,
      temperature: params.temperature ?? 0.4,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errText.slice(0, 200)}`);
  }
  const data = await response.json();
  return { content: data.choices?.[0]?.message?.content || '', usage: data.usage };
}

interface DailyBriefInput {
  totalHours: string;
  topApps: string;
  productivePct: string;
  productiveHours: string;
  distractingPct: string;
  sleepHours: string | null;
  sleepAvg: string | null;
  trendDescription: string;
}

const DAILY_BRIEF_PROMPT = `You are a sharp, honest productivity analyst. Output raw JSON only. No markdown. No code fences. No explanations. No text before or after. Start with { and end with }.

Required JSON schema:
{
  "signal": "2-3 word summary of the most notable signal",
  "observation": "One specific observation tied to a real app or category from the data. Name the app.",
  "suggestion": "One actionable suggestion — name a specific change, not generic advice",
  "trend": "improving" | "stable" | "declining",
  "metrics": [
    { "key": "metric name (e.g. 'Total Time')", "value": "metric value (e.g. '6.2h')", "trend": "up" | "down" | "flat" }
  ]
}

Example response:
{"signal":"Deep work streak","observation":"VS Code logged 5.2h yesterday — your highest coding block this week, with zero app switches between 2-4pm.","suggestion":"Protect that 2-4pm slot by muting notifications and closing Slack before you start.","trend":"improving","metrics":[{"key":"Total Time","value":"6.2h","trend":"up"},{"key":"Productivity","value":"83%","trend":"up"},{"key":"Distractions","value":"0.8h","trend":"down"}]}

Rules:
- Lead with the most notable signal (big win, sharp drop, unusual pattern)
- Every claim must trace to the data. Name real times and apps from the user's data.
- Use second person. Direct. No cheerleading. No filler.
- observation and suggestion under 70 words each
- signal must be 2-3 words
- metrics array: 2-4 metrics, each with a trend
- NEVER use markdown code fences or backticks. NEVER add trailing commas. NEVER use placeholder text like "..." or "insert text here".`;

interface WeeklyReviewInput {
  weekStart: string;
  weekEnd: string;
  totalProductiveHours: string;
  topApps: string;
  avgFocusScore: string;
  bestDay: string;
  worstDay: string;
  distractionPct: string;
  goalProgress: string;
}

const WEEKLY_REVIEW_SYSTEM = `You are a strategic productivity coach reviewing a week of data.

Output raw JSON only. No markdown. No code fences. No explanations. No text before or after. Start with { and end with }.

Example of the exact JSON shape required:
{"wentWell":"Your coding streak held — VS Code logged 18h, up 3h from last week, and you cleared the API migration on Thursday. Best day was Wednesday with a 6h focus block.","watchFor":"Discord crept up to 4h (double last week), mostly mid-afternoon slumps between 2-4pm. Chrome social browsing also added 2h on Friday.","focusSuggestion":"Try a 25-min deep work sprint right after lunch (1pm) to reclaim that 2-4pm slot. If Discord pulls you, set a 5-min timer instead of open-ended browsing."}

Rules:
- Every claim must trace to the data. Name real times and apps from the user's data.
- Use second person. Direct. No cheerleading. No filler.
- Each field under 70 words.
- NEVER use markdown code fences or backticks. NEVER add trailing commas. NEVER use placeholder text like "..." or "insert text here".`;

interface TopicDigestInput {
  topics: string[];
  today: string;
}

const TOPIC_DIGEST_SYSTEM = `You are a research brief writer. For each topic, produce a dense 2-3 sentence intelligence summary.

Output raw JSON only. No markdown. No code fences. No explanations. No text before or after. Start with [ and end with ].

Example of the exact JSON shape required:
[{"topic":"Artificial Intelligence","summary":"DeepMind published a new sparse MoE architecture achieving 40% better inference efficiency on long-context tasks. OpenAI released GPT-4.1 with a 1M token context window, now available via API.","sources":[{"title":"DeepMind Sparse MoE Paper","url":"https://arxiv.org/abs/2404.12345"},{"title":"OpenAI GPT-4.1 Announcement","url":"https://openai.com/blog/gpt-4-1"}]},{"topic":"Rust Programming","summary":"Rust 1.80 stabilized async closures and added native LTO support for faster binaries. The Rust Foundation released its annual survey showing 80% adoption growth year-over-year.","sources":[]}]

Rules:
- "topic" must match the original topic name exactly — do not modify or abbreviate
- Prioritize what changed recently over generic descriptions
- If the topic is broad, pick the single most consequential recent development
- If you don't know specifics, set summary to "No major recent developments reported" — do not fabricate
- Under 55 words per summary. Factual. No marketing language.
- "sources" is OPTIONAL — include only if you have real sources. If you cannot cite a real source, use an empty array [].
- NEVER use markdown code fences or backticks. NEVER add trailing commas. NEVER use placeholder text like "..." or "insert text here".`;

interface AnomalyInput {
  todayTotalSec: number;
  todayProductiveSec: number;
  todayTopApps: string;
  weekAvgTotalSec: number;
  weekAvgProductiveSec: number;
  weekAvgDistractingPct: string;
  thirtyDayAvgTotalSec: number;
  discordTimeSec: number | null;
  gamesTimeSec: number | null;
}

const ANOMALY_SYSTEM = `You are an activity pattern analyst. Detect statistically meaningful deviations in today's activity vs the user's 7-day and 30-day baselines.

Output raw JSON only. No markdown. No code fences. No explanations. No text before or after. Start with { and end with }.

Examples:

No anomaly detected:
{"hasAnomaly":false,"anomalies":[]}

Anomalies found:
{"hasAnomaly":true,"anomalies":[{"severity":"high","detail":"Discord usage hit 2.5h today — 5x your 30min 7-day average. This is the most Discord time in a single day this month."},{"severity":"medium","detail":"Total tracked time dropped to 3h vs 7.2h 7-day average (58% below baseline). Possible day off or context switch."}]}

Rules:
- Thresholds: flag at >35% deviation for total time or productive time. Flag at >20min above baseline for Discord or games.
- "high" = >50% deviation or new unhealthy behavior not seen in past 30 days
- "medium" = 35-50% deviation
- "low" = borderline (25-35%) but worth noting
- Detail must include: magnitude (e.g. "2x your usual", "3h above baseline", "58% below"), the baseline value, and the current value
- If nothing crosses threshold, return {"hasAnomaly":false,"anomalies":[]} with empty array
- Max 3 anomalies. No false positives. If uncertain, prefer no anomaly.
- NEVER use markdown code fences or backticks. NEVER add trailing commas. NEVER use placeholder text.`;

const PATTERN_ANALYSIS_SYSTEM = `You are a sharp productivity pattern analyst. You'll receive compressed daily summaries of the user's tracked time over the last 30 days.

Output raw JSON only. No markdown. No code fences. No explanations. No text before or after. Start with { and end with }.

Required JSON schema:
{
  "score": 0-100,
  "assessment": "1-sentence overall assessment of the user's pattern health",
  "patterns": [
    {
      "name": "Short pattern name (3-5 words)",
      "description": "1-2 sentence description citing specific data (app name, time, day)",
      "impact": "positive" | "neutral" | "negative",
      "frequency": "How often (e.g. 'Daily', '3x/week', 'Every Tuesday afternoon')",
      "recommendation": "Optional. One actionable suggestion. Omit if not applicable."
    }
  ]
}

Example response:
{"score":72,"assessment":"You have strong coding consistency but a recurring post-lunch social media loop is costing you 3.5h per week.","patterns":[{"name":"Tuesday Peak Focus","description":"Every Tuesday between 2-5pm you log your most productive coding block averaging 2.8h uninterrupted.","impact":"positive","frequency":"Weekly","recommendation":"Schedule your hardest coding tasks for Tuesday afternoons."},{"name":"Post-Lunch Distraction Loop","description":"After lunch (12:30-1:30pm) you open social media for '5 min' but stay 25-40min on 4 out of 5 weekdays.","impact":"negative","frequency":"4x/week","recommendation":"Set a 5-min timer when opening social media. When it rings, close the tab immediately."},{"name":"Sleep-Productivity Link","description":"Days following 7+ hours of sleep show 23% higher productive time vs days with under 6 hours.","impact":"positive","frequency":"Daily","recommendation":"Aim for 7h minimum sleep before days with important deadlines."}]}

Rules:
- Identify non-obvious patterns they would never spot manually
- Look for: time-of-day productivity clusters, recurring distraction loops, weekly rhythms, sleep-productivity correlation, transition blockers
- score 0-100: <40 needs intervention, 40-69 mixed, 70+ good
- 3-5 patterns in the array
- Every claim must trace to real data
- Under 60 words per description
- NEVER use markdown code fences or backticks. NEVER add trailing commas. NEVER use placeholder text.`;

const SLEEP_ANALYSIS_SYSTEM = `You are a sleep and energy optimization analyst. You'll receive sleep records and corresponding next-day productivity data.

Output raw JSON only. No markdown. No code fences. No explanations. No text before or after. Start with { and end with }.

Required JSON schema:
{
  "score": 0-100,
  "correlation": "1-sentence explaining how sleep affects the user's productivity",
  "optimalBedtime": "Optional. The ideal bedtime range (e.g. '10:30pm - 11:30pm')",
  "insomnia": "1-sentence describing any insomnia patterns or 'No insomnia patterns detected'",
  "suggestions": [
    {
      "icon": "moon" | "sun" | "clock" | "brain" | "activity",
      "title": "Short suggestion title (2-4 words)",
      "detail": "1-2 sentence actionable recommendation with data"
    }
  ]
}

Example response:
{"score":78,"correlation":"Days following 7-8h of sleep average 34% more productive time than days with under 6h.","optimalBedtime":"10:30pm - 11:30pm","insomnia":"You have 3 instances of late-night activity (after 2am) followed by sub-5h sleep, suggesting occasional insomnia or late work sessions.","suggestions":[{"icon":"moon","title":"Target 7-8h Sleep","detail":"Your best productivity days follow 7-8h of sleep. You average 6.4h — closing this gap by 1h could gain 1.5h of productive time."},{"icon":"clock","title":"Consistent Bedtime","detail":"Your bedtime varies by 90min on weeknights. A consistent 11pm bedtime could improve sleep quality and next-day focus."},{"icon":"sun","title":"Morning Light Exposure","detail":"On days you wake before 7am, your morning productivity is 28% higher. Try opening curtains within 10min of waking."}]}

Rules:
- Find correlations between sleep patterns and productive output
- Look for: optimal sleep duration range, bedtime timing impact, recovery patterns, weekend vs weekday debt
- Score 0-100: <40 needs intervention, 40-69 mixed, 70+ good
- 2-4 suggestions in the array
- Every claim must cite the data (hours, times, productivity %)
- NEVER use markdown code fences or backticks. NEVER add trailing commas. NEVER use placeholder text.`;

// === Exported response types ===

export interface ParsedDailyBrief {
  signal: string;
  observation: string;
  suggestion: string;
  trend: 'improving' | 'stable' | 'declining';
  metrics: Array<{
    key: string;
    value: string;
    trend: 'up' | 'down' | 'flat';
  }>;
}

export interface ParsedPatternResponse {
  score: number;
  assessment: string;
  patterns: Array<{
    name: string;
    description: string;
    impact: 'positive' | 'neutral' | 'negative';
    frequency: string;
    recommendation?: string;
  }>;
}

export interface ParsedSleepResponse {
  score: number;
  correlation: string;
  optimalBedtime?: string;
  insomnia: string;
  suggestions: Array<{
    icon: string;
    title: string;
    detail: string;
  }>;
}

// === Fallback parsers ===

export function fallbackParseDailyBrief(raw: string): ParsedDailyBrief {
  const signal = raw.match(/signal[:\s]+(.+?)[.\n]/i)?.[1]?.trim() || 'Daily Brief';
  const observation = raw.match(/observation[:\s]+(.+?)[.\n]/i)?.[1]?.trim() || raw;
  const suggestion = raw.match(/suggestion[:\s]+(.+?)[.\n]/i)?.[1]?.trim() || '';
  const trendMatch = raw.match(/trend[:\s]+(improving|stable|declining)/i);
  const trend: 'improving' | 'stable' | 'declining' = trendMatch?.[1]?.toLowerCase() as any || 'stable';

  const metrics: ParsedDailyBrief['metrics'] = [];
  const metricRegex = /(?:^|\n)[-•*]\s*(.+?):\s*(.+?)(?:\s+\((up|down|flat)\))?/gi;
  let m;
  while ((m = metricRegex.exec(raw)) !== null) {
    metrics.push({ key: m[1].trim(), value: m[2].trim(), trend: (m[3]?.toLowerCase() as any) || 'flat' });
  }
  if (metrics.length === 0 && raw.length > 0) {
    const metricTrend: 'up' | 'down' | 'flat' = trend === 'improving' ? 'up' : trend === 'declining' ? 'down' : 'flat';
    metrics.push({ key: 'Status', value: trend === 'improving' ? 'Positive' : trend === 'declining' ? 'Needs attention' : 'Stable', trend: metricTrend });
  }

  return { signal, observation, suggestion, trend, metrics };
}

export function fallbackParsePatternAnalysis(raw: string): ParsedPatternResponse {
  const scoreMatch = raw.match(/score[:\s]+(\d+)/i);
  const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : 50;

  const assessment = raw.match(/assessment[:\s]+(.+?)(?:\n|$)/i)?.[1]?.trim()
    || raw.split('\n')[0]?.replace(/^[-•*\d.]+/, '').trim()
    || 'Pattern analysis completed.';

  const patterns: ParsedPatternResponse['patterns'] = [];
  const bullets = raw.split('\n').filter(l => /^[-•*\d.]/.test(l.trim()));
  for (const line of bullets) {
    const clean = line.replace(/^[-•*\d.]+\s*/, '').trim();
    if (!clean) continue;
    const impact: 'positive' | 'neutral' | 'negative' =
      /\b(positive|good|great|beneficial|improve)\b/i.test(clean) ? 'positive' :
      /\b(negative|bad|harmful|distract|waste|concern)\b/i.test(clean) ? 'negative' : 'neutral';
    patterns.push({
      name: clean.split(/[.:]/)[0]?.trim()?.slice(0, 40) || 'Pattern',
      description: clean.slice(0, 120) || clean,
      impact,
      frequency: 'Varies',
      recommendation: clean.length > 120 ? clean.slice(120, 200) : undefined,
    });
  }

  if (patterns.length === 0) {
    patterns.push({ name: 'Analysis Result', description: raw.slice(0, 200), impact: 'neutral', frequency: 'Once' });
  }

  return { score, assessment, patterns };
}

export function fallbackParseSleepAnalysis(raw: string): ParsedSleepResponse {
  const scoreMatch = raw.match(/score[:\s]+(\d+)/i);
  const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : 50;

  const correlation = raw.match(/correlation[:\s]+(.+?)(?:\n|$)/i)?.[1]?.trim()
    || raw.match(/sleep.*productivity/i) ? 'Sleep affects your next-day productivity.' : 'Analysis completed.';

  const optimalBedtime = raw.match(/bedtime[:\s]+(.+?)(?:\n|$)/i)?.[1]?.trim() || undefined;

  const insomnia = raw.match(/insomnia[:\s]+(.+?)(?:\n|$)/i)?.[1]?.trim()
    || 'No insomnia patterns detected.';

  const suggestions: ParsedSleepResponse['suggestions'] = [];
  const bullets = raw.split('\n').filter(l => /^[-•*\d.]/.test(l.trim()));
  for (const line of bullets) {
    const clean = line.replace(/^[-•*\d.]+\s*/, '').trim();
    if (!clean) continue;
    const icon =
      /moon|sleep|night/i.test(clean) ? 'moon' :
      /sun|morning|light/i.test(clean) ? 'sun' :
      /clock|time|bedtime/i.test(clean) ? 'clock' :
      /brain|focus|mental/i.test(clean) ? 'brain' : 'activity';
    suggestions.push({
      icon,
      title: clean.split(/[.:]/)[0]?.trim()?.slice(0, 30) || 'Suggestion',
      detail: clean.slice(0, 150) || clean,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({ icon: 'moon', title: 'Sleep Analysis', detail: raw.slice(0, 200) });
  }

  return { score, correlation, optimalBedtime, insomnia, suggestions };
}

export class AIService {
  static async generateDailyBrief(apiKey: string, data: DailyBriefInput, model?: string): Promise<{ content: ParsedDailyBrief | string; usage?: any }> {
    const userPrompt = `Yesterday's data:
- Total tracked time: ${data.totalHours}h
- Top apps: ${data.topApps}
- Productive time: ${data.productivePct}% (${data.productiveHours}h)
- Distracting time: ${data.distractingPct}%
- Sleep last night: ${data.sleepHours || 'unknown'}h (avg: ${data.sleepAvg || 'unknown'}h)
- 7-day trend: ${data.trendDescription}`;

    const result = await callOpenRouter({
      systemPrompt: DAILY_BRIEF_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      model: model || 'google/gemini-2.0-flash-001',
      maxTokens: 300,
      temperature: 0.5,
      apiKey,
    });
    const raw = result.content.trim();
    let parsed: ParsedDailyBrief;
    try {
      parsed = parseAIJson<ParsedDailyBrief>(raw);
    } catch {
      parsed = fallbackParseDailyBrief(raw);
    }
    return { content: parsed, usage: result.usage };
  }

  static async generateWeeklyReview(apiKey: string, data: WeeklyReviewInput, model?: string): Promise<{ content: any; usage?: any }> {
    const userPrompt = `Weekly data (${data.weekStart} to ${data.weekEnd}):
- Total productive time: ${data.totalProductiveHours}h
- Top apps: ${data.topApps}
- Average focus score: ${data.avgFocusScore}
- Best day: ${data.bestDay}
- Most challenging day: ${data.worstDay}
- Distraction time: ${data.distractionPct}%
- Goal progress: ${data.goalProgress}`;

    const result = await callOpenRouter({
      systemPrompt: WEEKLY_REVIEW_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
      model: model || 'google/gemini-2.0-flash-001',
      maxTokens: 400,
      temperature: 0,
      apiKey,
    });
    let parsed: any;
    try {
      parsed = parseAIJson(result.content);
    } catch {
      parsed = { wentWell: result.content, watchFor: '', focusSuggestion: '' };
    }
    return { content: parsed, usage: result.usage };
  }

  static async generateTopicDigest(apiKey: string, data: TopicDigestInput, model?: string): Promise<{ content: any[]; usage?: any }> {
    if (data.topics.length === 0) return { content: [] };
    const userPrompt = `Current date: ${data.today}
    
User's research topics: ${data.topics.join(', ')}

For each topic, provide a brief summary of recent developments or key information.`;

    const result = await callOpenRouter({
      systemPrompt: TOPIC_DIGEST_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
      model: model || 'google/gemini-2.0-flash-001',
      maxTokens: 200,
      temperature: 0,
      apiKey,
    });
    let parsed: any[];
    try {
      parsed = parseAIJson(result.content);
    } catch {
      parsed = [];
    }
    return { content: Array.isArray(parsed) ? parsed : [], usage: result.usage };
  }

  static async analyzePatterns(apiKey: string, data: { dailySummary: string }, model?: string): Promise<{ content: ParsedPatternResponse | string; usage?: any }> {
    const result = await callOpenRouter({
      systemPrompt: PATTERN_ANALYSIS_SYSTEM,
      messages: [{ role: 'user', content: `Here are the last 30 days of activity data:\n\n${data.dailySummary}` }],
      model: model || 'google/gemini-2.0-flash-001',
      maxTokens: 500,
      temperature: 0.3,
      apiKey,
    });
    const raw = result.content.trim();
    let parsed: ParsedPatternResponse;
    try {
      parsed = parseAIJson<ParsedPatternResponse>(raw);
    } catch {
      parsed = fallbackParsePatternAnalysis(raw);
    }
    return { content: parsed, usage: result.usage };
  }

  static async analyzeSleep(apiKey: string, data: { sleepSummary: string; productivitySummary: string }, model?: string): Promise<{ content: ParsedSleepResponse | string; usage?: any }> {
    const result = await callOpenRouter({
      systemPrompt: SLEEP_ANALYSIS_SYSTEM,
      messages: [{ role: 'user', content: `Sleep data (last 30 days):\n${data.sleepSummary}\n\nNext-day productivity:\n${data.productivitySummary}` }],
      model: model || 'google/gemini-2.0-flash-001',
      maxTokens: 400,
      temperature: 0.3,
      apiKey,
    });
    const raw = result.content.trim();
    let parsed: ParsedSleepResponse;
    try {
      parsed = parseAIJson<ParsedSleepResponse>(raw);
    } catch {
      parsed = fallbackParseSleepAnalysis(raw);
    }
    return { content: parsed, usage: result.usage };
  }

  static async dataChatQuery(apiKey: string, data: { query: string; context: string; history: Array<{ role: string; content: string }> }, model?: string): Promise<{ content: string; usage?: any }> {
    const result = await callOpenRouter({
      systemPrompt: `You are a helpful productivity data assistant. You have access to the user's tracked time data context.

Answer questions about their activity, productivity, sleep, and app usage patterns. Be:
1. Precise — cite specific numbers when possible
2. Conversational — natural language, not bullet points
3. Honest — if the data doesn't contain the answer, say so
4. Concise — 2-4 sentences unless they ask for more detail

The context includes recent daily stats and trends. Use it to answer their questions. If they ask about something outside the context, say what you can based on the data provided.`,
      messages: [
        { role: 'user', content: `Here is the user's current tracking context:\n\n${data.context}` },
        ...data.history,
        { role: 'user', content: data.query },
      ],
      model: model || 'google/gemini-2.0-flash-001',
      maxTokens: 500,
      temperature: 0.4,
      apiKey,
    });
    return { content: result.content.trim(), usage: result.usage };
  }

  static async checkAnomalies(apiKey: string, data: AnomalyInput, model?: string): Promise<{ content: any; usage?: any }> {
    const userPrompt = `Today's activity:
- Total time: ${Math.round(data.todayTotalSec / 3600 * 10) / 10}h
- Productive time: ${Math.round(data.todayProductiveSec / 3600 * 10) / 10}h
- Top apps: ${data.todayTopApps}

7-day average:
- Total time: ${Math.round(data.weekAvgTotalSec / 3600 * 10) / 10}h/day
- Productive time: ${Math.round(data.weekAvgProductiveSec / 3600 * 10) / 10}h/day
- Distracting time: ${data.weekAvgDistractingPct}%

30-day average total: ${Math.round(data.thirtyDayAvgTotalSec / 3600 * 10) / 10}h/day

${data.discordTimeSec ? `Discord today: ${Math.round(data.discordTimeSec / 60)}m` : ''}
${data.gamesTimeSec ? `Games today: ${Math.round(data.gamesTimeSec / 60)}m` : ''}`;

    const result = await callOpenRouter({
      systemPrompt: ANOMALY_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
      model: model || 'google/gemini-2.0-flash-001',
      maxTokens: 400,
      temperature: 0,
      apiKey,
    });
    let parsed: any;
    try {
      parsed = parseAIJson(result.content);
    } catch {
      parsed = { hasAnomaly: false, anomalies: [] };
    }
    return { content: parsed, usage: result.usage };
  }
}
