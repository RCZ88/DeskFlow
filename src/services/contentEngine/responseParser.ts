// ResponseParser — JSON-only contract enforcement with retry.
// AI output -> JSON -> schema check -> retry (max 2) with corrective prompt -> friendly error.
export interface ParseOptions {
  required?: string[]; // top-level keys that must exist
  arrayAt?: string; // if set, the parsed object must have this key as an array (non-empty unless allowEmpty)
  allowEmpty?: boolean;
  maxRetries?: number;
}

export function extractJson(raw: string): string {
  let s = raw.trim();
  // strip code fences
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  // find first { ... } or [ ... ] block if surrounded by prose
  const start = s.search(/[[{]/);
  if (start > 0) s = s.slice(start);
  // cut trailing prose after the LAST closing bracket
  let depth = 0;
  let end = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{' || s[i] === '[') depth++;
    else if (s[i] === '}' || s[i] === ']') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end > 0) s = s.slice(0, end);
  return s;
}

export function parseJsonLoose(raw: string): any {
  const s = extractJson(raw);
  try {
    return JSON.parse(s);
  } catch {
    // repair pass: strip trailing commas, unescape quotes, fix stray newlines inside strings
    let repaired = s.replace(/,\s*([}\]])/g, '$1');
    repaired = repaired.replace(/[\u0000-\u001f]/g, (m) => {
      if (m === '\n' || m === '\r') return ' ';
      return m;
    });
    return JSON.parse(repaired);
  }
}

export function validateShape(obj: any, opts: ParseOptions): string | null {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return 'response is not a JSON object';
  }
  for (const key of opts.required || []) {
    if (!(key in obj)) return `missing required key "${key}"`;
  }
  if (opts.arrayAt) {
    const arr = obj[opts.arrayAt];
    if (!Array.isArray(arr)) return `key "${opts.arrayAt}" must be an array`;
    if (arr.length === 0 && !opts.allowEmpty) return `key "${opts.arrayAt}" is empty`;
  }
  return null;
}

export interface ParseResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  attempts: number;
}

// aiCall: (prompt: string, systemPrompt: string) => Promise<string>
export async function parseAiJson<T>(
  raw: string,
  opts: ParseOptions,
  aiCall: (prompt: string, systemPrompt: string) => Promise<string>,
  systemPrompt = 'You are a precise JSON generator. You ALWAYS respond with valid JSON only.'
): Promise<ParseResult<T>> {
  let lastError = '';
  const max = opts.maxRetries ?? 2;
  for (let attempt = 1; attempt <= max; attempt++) {
    const input = attempt === 1 ? raw : raw + `\n\nYour previous output was rejected: ${lastError}\nRespond again in valid JSON only.`;
    try {
      const out = await aiCall(input, systemPrompt);
      const obj = parseJsonLoose(out);
      const err = validateShape(obj, opts);
      if (!err) return { ok: true, data: obj as T, attempts: attempt };
      lastError = err;
    } catch (e: any) {
      lastError = e?.message || String(e);
    }
  }
  return { ok: false, error: lastError, attempts: max };
}
