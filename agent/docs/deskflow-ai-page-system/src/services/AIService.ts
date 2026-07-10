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
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    start = firstBracket;
  } else {
    start = firstBrace;
  }

  let depth = 0;
  let inString = false;
  let inSingleQuote = false;
  let end = -1;

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

    if (ch === '{' || ch === '[') { depth++; }
    if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) { end = i; break; }
      if (depth < 0) { depth = 0; continue; }
    }
  }

  if (end === -1 && depth > 0) { end = content.length - 1; }
  if (end === -1) throw new Error('Unmatched JSON brace/bracket');

  let json = content.slice(start, end + 1);
  for (let i = 0; i < depth; i++) { json += ']'; }

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

  json = json.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  json = json.replace(/,\s*([}\]])/g, '$1');
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

interface TopicDigestInput {
  topics: string[];
  today: string;
}

const TOPIC_DIGEST_SYSTEM = `Output raw JSON array only. Each item: {"topic":"exact name","summary":"2-3 sentence recent development (under 55 words)","sources":[]}. If unknown, summary="No major recent developments reported". Never fabricate. Never use markdown or code fences.`;

export class AIService {
  static async generateTopicDigest(apiKey: string, data: TopicDigestInput, model?: string, maxTokens?: number): Promise<{ content: any[]; usage?: any }> {
    if (data.topics.length === 0) return { content: [] };
    const shortTopics = data.topics.map(t => t.length > 45 ? t.slice(0, 42) + '...' : t);
    const userPrompt = `Topics: ${shortTopics.join('; ')}`;

    const result = await callOpenRouter({
      systemPrompt: TOPIC_DIGEST_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
      model: model || 'google/gemini-2.0-flash-001',
      maxTokens: maxTokens ?? 200,
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
}
