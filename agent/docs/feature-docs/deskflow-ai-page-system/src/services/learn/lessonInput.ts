// Single entry point that turns whatever the model (or a human) produced into a
// validated-ready LdocDocument. This is what learn:generateLdoc should call
// instead of JSON.parse-ing the model output directly.
//
// Accepts, in order of preference:
//   1. Lesson Markdown (.lmd)  -> compiled deterministically (RECOMMENDED)
//   2. A raw .ldoc JSON object -> parsed as a fallback
//
// Both paths return a plain object you can hand straight to validateFull() and
// ImportService.importLdoc().

import type { LdocDocument } from '../../shared/learn/types';
import { parseLessonMarkdown, LessonMarkdownError } from './parseLessonMarkdown';

/** Strip a single leading/trailing Markdown code fence the model may have wrapped everything in. */
function stripOuterFence(text: string): string {
  const t = text.trim();
  const fenced = t.match(/^`{3,}[A-Za-z0-9_+-]*\n([\s\S]*?)\n`{3,}$/);
  return fenced ? fenced[1].trim() : t;
}

/** Heuristic: does this look like a JSON document rather than .lmd? */
function looksLikeJson(text: string): boolean {
  const t = text.trim();
  return t.startsWith('{') && t.includes('"doc"') && t.includes('"nodes"');
}

export interface ToLdocResult {
  doc: LdocDocument;
  format: 'lmd' | 'json';
}

/** Normalize common fence language aliases to their canonical names. */
const FENCE_ALIASES: Record<string, string> = {
  js: 'javascript',
  py: 'python',
  ts: 'typescript',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  html: 'html',
  css: 'css',
  json: 'json',
  yml: 'yaml',
};

/**
 * Forgiving pre-parser that repairs common model output issues before the main parse (§3.4).
 * Returns the repaired text and a list of repairs made.
 */
export function forgivingPreparser(text: string): { text: string; repairs: string[] } {
  const repairs: string[] = [];
  let result = text;

  // 1. Close unclosed $$ math fences (odd count → append closing fence)
  const dollarMatches = result.match(/\$\$/g);
  if (dollarMatches && dollarMatches.length % 2 !== 0) {
    result += '\n$$';
    repairs.push('Closed unclosed $$ math fence');
  }

  // 2. Normalize common fence language aliases
  result = result.replace(
    /^(`{3,})\s*(js|py|ts|rb|sh|shell|yml)\b/gm,
    (_, fence: string, lang: string) => {
      const canonical = FENCE_ALIASES[lang];
      if (canonical) {
        repairs.push(`Normalized fence language "${lang}" → "${canonical}"`);
        return `${fence}${canonical}`;
      }
      return _;
    },
  );

  // 3. Close unclosed ::: directive blocks at end of document
  // Track directive depth across the whole document; if unbalanced, append close
  let depth = 0;
  let lastOpenLine = -1;
  const dirLines = result.split('\n');
  for (let i = 0; i < dirLines.length; i++) {
    const trimmed = dirLines[i].trim();
    if (/^:::\s*\w/.test(trimmed)) depth++;
    else if (/^:::\s*$/.test(trimmed)) depth = Math.max(0, depth - 1);
  }
  if (depth > 0) {
    result += '\n:::';
    repairs.push(`Closed ${depth} unclosed ::: directive block(s)`);
  }

  return { text: result, repairs };
}

export function toLdoc(raw: string): ToLdocResult {
  const text = stripOuterFence(raw);

  if (looksLikeJson(text)) {
    try {
      return { doc: JSON.parse(text) as LdocDocument, format: 'json' };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new LessonMarkdownError(
        `Output looked like JSON but failed to parse (${detail}). Prefer emitting Lesson Markdown (.lmd) instead of raw JSON.`,
      );
    }
  }

  return { doc: parseLessonMarkdown(text), format: 'lmd' };
}
