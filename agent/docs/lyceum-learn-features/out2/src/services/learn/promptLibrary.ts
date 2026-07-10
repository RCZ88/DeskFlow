// Prompt Library — composes the four prompt layers into the system prompt that
// drives lesson authoring (and the persona that drives the Tutor).
//
// The four layers, outermost to innermost:
//   1. FORMAT   — author-guide.md         : how to emit a valid .lmd document
//   2. STYLE    — master-prompt.md        : depth-to-mastery, visual-first pedagogy
//   3. PERSONA  — coach-persona.md        : who the learner is + objective assessment
//   4. SUBJECT  — topicPrompts.ts[part]   : exactly what this topic must cover
//   (+ GUARDRAILS — guardrails.md         : anti-goals, always appended)
//
// Keeping these as separate, editable resources is the point: the planning doc
// and the app share one prompt system, and any layer can be tuned in isolation.

import { getPart } from './curriculum';
import { getTopicPrompt } from './topicPrompts';

/** Reads a prompt resource by path relative to resources/learn, or null if missing. */
export type ResourceReader = (relPath: string) => string | null;

export interface LoadedPromptLibrary {
  format: string | null; // author-guide.md
  style: string | null; // prompts/master-prompt.md
  persona: string | null; // prompts/coach-persona.md
  guardrails: string | null; // prompts/guardrails.md
}

export function loadPromptLibrary(read: ResourceReader): LoadedPromptLibrary {
  return {
    format: read('author-guide.md'),
    style: read('prompts/master-prompt.md'),
    persona: read('prompts/coach-persona.md'),
    guardrails: read('prompts/guardrails.md'),
  };
}

function section(title: string, body: string | null): string {
  if (!body || !body.trim()) return '';
  return `\n\n===== ${title} =====\n${body.trim()}`;
}

export interface ComposeOptions {
  /** Curriculum part 0–12. When provided, the part's persona + subject are woven in. */
  part?: number;
  /** Include the assessor persona (who the learner is). Default true. */
  includePersona?: boolean;
}

/**
 * Compose the full SYSTEM prompt for authoring a lesson. Layers are ordered so
 * the format rules (which must win) come first and last-word guardrails close it.
 */
export function composeAuthorSystemPrompt(
  lib: LoadedPromptLibrary,
  opts: ComposeOptions = {},
): string {
  const includePersona = opts.includePersona !== false;
  let out = lib.format?.trim() || 'Author a valid .lmd lesson document.';
  out += section('TEACHING STYLE', lib.style);
  if (includePersona) out += section('WHO YOU ARE TEACHING', lib.persona);
  out += section('GUARDRAILS (anti-goals)', lib.guardrails);
  return out;
}

/**
 * Compose the USER prompt that asks for a specific curriculum part. Combines the
 * part's checklist (as required scope) with its per-topic instruction prompt.
 */
export function composeTopicUserPrompt(part: number): string {
  const meta = getPart(part);
  const topic = getTopicPrompt(part);
  if (!meta) {
    return topic || `Author a lesson for curriculum part ${part}.`;
  }

  const checklist = meta.checklist.map((c) => `- ${c}`).join('\n');
  const lines = [
    `Author a Lyceum lesson for Part ${meta.part}: ${meta.title}.`,
    ``,
    `Trailer — What: ${meta.trailer.what} Why: ${meta.trailer.why} Where: ${meta.trailer.where}`,
    ``,
    topic ? `Subject brief:\n${topic}` : '',
    ``,
    `Cover these concepts (each maps to one or more nodes; this is the required scope):`,
    checklist,
    ``,
    `Default mastery target for nodes in this lesson: ${meta.defaultMasteryTarget} (raise to L4 where the learner already has depth).`,
  ];
  return lines.filter((l) => l !== '').join('\n');
}

/**
 * The Tutor persona — reuse the same coach-persona + guardrails so the in-lesson
 * tutor speaks with the same voice and standards as the authoring/assessment AI.
 */
export function composeTutorPersona(lib: LoadedPromptLibrary): string {
  let out = 'You are the in-lesson tutor and assessor.';
  out += section('WHO YOU ARE TEACHING', lib.persona);
  out += section('GUARDRAILS (anti-goals)', lib.guardrails);
  return out;
}

export interface PromptListEntry {
  part: number;
  title: string;
  hasTopicPrompt: boolean;
}

/** For a settings/library UI that lists the available per-topic system prompts. */
export function listTopicPrompts(): PromptListEntry[] {
  const out: PromptListEntry[] = [];
  for (let p = 0; p <= 12; p++) {
    const meta = getPart(p);
    if (!meta) continue;
    out.push({ part: p, title: meta.title, hasTopicPrompt: !!getTopicPrompt(p) });
  }
  return out;
}
