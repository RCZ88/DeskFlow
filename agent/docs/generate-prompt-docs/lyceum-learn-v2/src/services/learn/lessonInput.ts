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

export function toLdoc(raw: string): ToLdocResult {
  const text = stripOuterFence(raw);

  if (looksLikeJson(text)) {
    try {
      return { doc: JSON.parse(text) as LdocDocument, format: 'json' };
    } catch (err) {
      // Fall through to the Markdown compiler, which is far more forgiving.
      const detail = err instanceof Error ? err.message : String(err);
      throw new LessonMarkdownError(
        `Output looked like JSON but failed to parse (${detail}). Prefer emitting Lesson Markdown (.lmd) instead of raw JSON.`,
      );
    }
  }

  // Default + recommended path: compile Lesson Markdown.
  return { doc: parseLessonMarkdown(text), format: 'lmd' };
}
