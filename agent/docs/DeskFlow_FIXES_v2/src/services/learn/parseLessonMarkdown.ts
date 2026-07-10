// Lyceum Learn — Lesson Markdown (.lmd) -> .ldoc compiler
//
// WHY THIS EXISTS
// --------------
// Asking an LLM to emit a large, strict JSON object whose string values contain
// code (backticks, newlines, quotes) is the single most failure-prone way to get
// structured content out of a model. The errors you saw -
//   Unexpected token '`', "```python ..." is not valid JSON
//   Expected ',' or '}' after property value in JSON at position ...
// are the model leaking a code fence / trailing comma INTO the JSON string. No
// amount of "sanitise harder" fixes the open-ended class of these bugs.
//
// THE FIX: invert the format. The model writes Lesson Markdown (.lmd) - which it
// is extremely good at, code fences and all - and THIS compiler turns it into the
// exact LdocDocument shape deterministically. A ```python fence and a trailing
// comma are now impossible by construction, because the model never writes JSON.
//
// The output is validated by the existing validateFull() and imported unchanged.

import type {
  LdocDocument,
  LdocLesson,
  LdocNode,
  LdocBlock,
  LdocGrounding,
  MasteryLevel,
  QuizFormat,
} from '../../shared/learn/types';

export class LessonMarkdownError extends Error {
  constructor(message: string, public line?: number) {
    super(line != null ? `Line ${line}: ${message}` : message);
    this.name = 'LessonMarkdownError';
  }
}

const MASTERY: ReadonlySet<string> = new Set(['L0', 'L1', 'L2', 'L3', 'L4', 'L5']);
// Must match validateFull()'s visual rule exactly: mermaid/image/widget/math.
const VISUAL_TYPES: ReadonlySet<string> = new Set(['mermaid', 'image', 'widget', 'math']);

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '') || 'node';
}

function asMastery(v: string, line?: number): MasteryLevel {
  const up = v.trim().toUpperCase();
  if (!MASTERY.has(up)) {
    throw new LessonMarkdownError(`"${v}" is not a mastery level (use L0-L5)`, line);
  }
  return up as MasteryLevel;
}

// ── Lightweight line cursor ────────────────────────────────────────────────

interface Line {
  raw: string;
  text: string; // trimmed
  no: number; // 1-based
}

function toLines(src: string): Line[] {
  return src.replace(/\r\n?/g, '\n').split('\n').map((raw, i) => ({ raw, text: raw.trim(), no: i + 1 }));
}

// ── Frontmatter ────────────────────────────────────────────────────────────

interface Frontmatter {
  title: string;
  id?: string;
  part?: number;
  version?: string;
  summary?: string;
  authored_by?: 'human' | 'ai' | 'hybrid';
  rest: Line[]; // lines after the frontmatter block
}

function parseFrontmatter(lines: Line[]): Frontmatter {
  let i = 0;
  while (i < lines.length && lines[i].text === '') i++;
  if (i >= lines.length || lines[i].text !== '---') {
    throw new LessonMarkdownError('Lesson must start with a "---" frontmatter block containing at least a title.');
  }
  i++; // consume opening ---
  const fm: Record<string, string> = {};
  while (i < lines.length && lines[i].text !== '---') {
    const m = lines[i].text.match(/^([A-Za-z_]+)\s*:\s*(.*)$/);
    if (m) fm[m[1].toLowerCase()] = m[2].trim();
    i++;
  }
  if (i >= lines.length) throw new LessonMarkdownError('Frontmatter block is not closed with "---".');
  i++; // consume closing ---

  if (!fm.title) throw new LessonMarkdownError('Frontmatter is missing required "title".');
  const ab = (fm.authored_by || '').toLowerCase();
  return {
    title: fm.title,
    id: fm.id ? slug(fm.id) : undefined,
    part: fm.part != null && fm.part !== '' ? Number(fm.part) : undefined,
    version: fm.version || undefined,
    summary: fm.summary || undefined,
    authored_by: ab === 'human' || ab === 'ai' || ab === 'hybrid' ? ab : undefined,
    rest: lines.slice(i),
  };
}

// ── Node splitting (fence/directive aware) ─────────────────────────────────
// A node starts at a top-level "# Heading". We must NOT treat "#" lines inside
// code fences, math blocks, or ::: directives as headings (that bug - Python
// comments like "# VULNERABLE" being read as nodes - is exactly what a naive
// splitter gets wrong).

interface RawNode {
  title: string;
  startLine: number;
  body: Line[];
}

function splitNodes(lines: Line[]): RawNode[] {
  const nodes: RawNode[] = [];
  let current: RawNode | null = null;
  let fence: string | null = null; // active code fence marker (``` or ~~~ run)
  let inMath = false;
  let directiveDepth = 0;

  for (const ln of lines) {
    const fenceMatch = ln.text.match(/^(`{3,}|~{3,})/);
    if (fence) {
      if (fenceMatch && ln.text.startsWith(fence)) fence = null;
      current?.body.push(ln);
      continue;
    }
    if (fenceMatch) {
      fence = fenceMatch[1];
      current?.body.push(ln);
      continue;
    }
    if (ln.text === '$$') {
      inMath = !inMath;
      current?.body.push(ln);
      continue;
    }
    if (inMath) { current?.body.push(ln); continue; }
    if (/^:::/.test(ln.text)) {
      if (/^:::\s*$/.test(ln.text)) directiveDepth = Math.max(0, directiveDepth - 1);
      else directiveDepth++;
      current?.body.push(ln);
      continue;
    }
    if (directiveDepth === 0) {
      const h = ln.text.match(/^#\s+(.+)$/);
      if (h) {
        if (current) nodes.push(current);
        current = { title: h[1].trim(), startLine: ln.no, body: [] };
        continue;
      }
    }
    current?.body.push(ln);
  }
  if (current) nodes.push(current);
  if (nodes.length === 0) {
    throw new LessonMarkdownError('No nodes found. Each concept must start with a top-level "# Heading".');
  }
  return nodes;
}

// ── Block parsing within a node body ───────────────────────────────────────

function parseBlocks(body: Line[], nodeId: string): { blocks: LdocBlock[]; grounding?: LdocGrounding } {
  const blocks: LdocBlock[] = [];
  let grounding: LdocGrounding | undefined;
  let bn = 0;
  const id = () => `${nodeId}-b${++bn}`;
  let prose: string[] = [];

  const flushProse = () => {
    const md = prose.join('\n').trim();
    if (md) blocks.push({ id: id(), type: 'prose', md });
    prose = [];
  };

  for (let i = 0; i < body.length; i++) {
    const ln = body[i];

    // node attributes
    const at = ln.text.match(/^@(mastery|prereq)\s+(.*)$/);
    if (at) { (body as any).__attrs = (body as any).__attrs || {}; (body as any).__attrs[at[1]] = at[2].trim(); continue; }

    // fenced code / mermaid (preserve interior verbatim - backticks safe)
    const fence = ln.text.match(/^(`{3,}|~{3,})\s*([A-Za-z0-9_+-]*)\s*$/);
    if (fence) {
      flushProse();
      const marker = fence[1];
      const lang = (fence[2] || '').toLowerCase();
      const buf: string[] = [];
      i++;
      while (i < body.length && !body[i].text.startsWith(marker)) { buf.push(body[i].raw); i++; }
      const code = buf.join('\n');
      if (lang === 'mermaid') blocks.push({ id: id(), type: 'mermaid', src: code });
      else blocks.push({ id: id(), type: 'code', lang: lang || 'text', src: code, runnable: false });
      continue;
    }

    // math $$ ... $$
    if (ln.text === '$$') {
      flushProse();
      const buf: string[] = [];
      i++;
      while (i < body.length && body[i].text !== '$$') { buf.push(body[i].raw); i++; }
      blocks.push({ id: id(), type: 'math', tex: buf.join('\n').trim() });
      continue;
    }

    // standalone image  ![alt](url)
    const img = ln.text.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (img) {
      flushProse();
      blocks.push({ id: id(), type: 'image', url: img[2], alt: img[1], source: '', license: '' });
      continue;
    }

    // directive blocks ::: kind ...
    const dir = ln.text.match(/^:::\s+(\w+)\s*(.*)$/);
    if (dir) {
      flushProse();
      const kind = dir[1].toLowerCase();
      const args = dir[2].trim();
      const inner: Line[] = [];
      let depth = 1;
      i++;
      while (i < body.length && depth > 0) {
        if (/^:::\s+\w/.test(body[i].text)) depth++;
        else if (/^:::\s*$/.test(body[i].text)) { depth--; if (depth === 0) break; }
        inner.push(body[i]);
        i++;
      }
      if (kind === 'grounding') grounding = parseGrounding(inner);
      else if (kind === 'callout') blocks.push({ id: id(), type: 'callout', tone: args || 'info', md: inner.map((l) => l.raw).join('\n').trim() });
      else if (kind === 'quiz') blocks.push(parseQuiz(inner, args, id(), ln.no));
      else if (kind === 'layer') {
        const [revealRaw, modeRaw] = args.split(/\s+/);
        const sub = parseBlocks(inner, `${nodeId}-l${bn}`);
        blocks.push({
          id: id(),
          type: 'layer',
          reveal_at: asMastery(revealRaw || 'L4', ln.no),
          mode: modeRaw === 'remedial' ? 'remedial' : 'deeper',
          blocks: sub.blocks,
        });
      } else {
        // unknown directive -> keep as prose so nothing is silently lost
        prose.push(inner.map((l) => l.raw).join('\n'));
      }
      continue;
    }

    prose.push(ln.raw);
  }
  flushProse();
  return { blocks, grounding };
}

// ── Quiz ───────────────────────────────────────────────────────────────────

function parseQuiz(inner: Line[], args: string, blockId: string, line: number): LdocBlock {
  const parts = args.split(/\s+/).filter(Boolean);
  const format = (parts[0] || 'mcq').toLowerCase() as QuizFormat;
  const level = asMastery(parts[1] || 'L2', line);
  let q = '';
  const options: string[] = [];
  let answerIndex = -1;
  let numericAnswer: number | undefined;
  const rubric: Record<string, string> = {};
  let explain = '';

  for (const ln of inner) {
    const opt = ln.text.match(/^-\s*\[([ xX])\]\s*(.+)$/);
    if (opt) {
      if (opt[1].toLowerCase() === 'x') answerIndex = options.length;
      options.push(opt[2].trim());
      continue;
    }
    const ans = ln.text.match(/^answer\s*:\s*(.+)$/i);
    if (ans) { numericAnswer = Number(ans[1].trim()); continue; }
    const exp = ln.text.match(/^explain\s*:\s*(.+)$/i);
    if (exp) { explain = exp[1].trim(); continue; }
    const rub = ln.text.match(/^rubric\s*:\s*(.+)$/i);
    if (rub) { rubric.criteria = rub[1].trim(); continue; }
    if (ln.text && !q) q = ln.text;
    else if (ln.text) q += ' ' + ln.text;
  }
  if (!q) throw new LessonMarkdownError('A quiz needs a question line.', line);

  const block: any = { id: blockId, type: 'quiz', format, q, level };
  if (format === 'mcq') {
    if (options.length < 2) throw new LessonMarkdownError('An mcq quiz needs at least two "- [ ]" options.', line);
    if (answerIndex < 0) throw new LessonMarkdownError('Mark the correct mcq option with "- [x]".', line);
    block.options = options;
    block.answer_key = answerIndex; // zero-based index
  } else if (format === 'numeric') {
    if (numericAnswer == null || Number.isNaN(numericAnswer)) throw new LessonMarkdownError('A numeric quiz needs "answer: <number>".', line);
    block.answer_key = numericAnswer;
  } else {
    block.rubric = Object.keys(rubric).length ? rubric : { criteria: 'A good answer addresses the question accurately and completely.' };
  }
  if (explain) (block as any).explain = explain;
  return block as LdocBlock;
}

// ── Grounding ──────────────────────────────────────────────────────────────

function parseGrounding(inner: Line[]): LdocGrounding {
  const must_know: { claim: string; source_id: string }[] = [];
  const sources: { id: string; url: string; title: string }[] = [];
  const misconceptions: { wrong: string; correct: string }[] = [];
  let includes = '';
  let excludes: string[] = [];

  for (const ln of inner) {
    const inc = ln.text.match(/^includes?\s*:\s*(.+)$/i);
    if (inc) { includes = inc[1].trim(); continue; }
    const exc = ln.text.match(/^excludes?\s*:\s*(.+)$/i);
    if (exc) { excludes = exc[1].split(';').map((s) => s.trim()).filter(Boolean); continue; }
    const know = ln.text.match(/^know\s*:\s*(.+?)\s*\[([^\]]+)\]\s*$/i);
    if (know) { must_know.push({ claim: know[1].trim(), source_id: know[2].trim() }); continue; }
    const src = ln.text.match(/^source\s*:\s*([^|]+)\|([^|]+)\|(.+)$/i);
    if (src) { sources.push({ id: src[1].trim(), title: src[2].trim(), url: src[3].trim() }); continue; }
    const mis = ln.text.match(/^misconception\s*:\s*([^|]+)\|(.+)$/i);
    if (mis) { misconceptions.push({ wrong: mis[1].trim(), correct: mis[2].trim() }); continue; }
  }

  const g: LdocGrounding = {
    must_know,
    scope: { includes, excludes: excludes.length ? excludes : undefined },
    sources,
  };
  if (misconceptions.length) g.misconceptions = misconceptions;
  return g;
}

// ── Public API ─────────────────────────────────────────────────────────────

export function parseLessonMarkdown(source: string): LdocDocument {
  const lines = toLines(source);
  const fm = parseFrontmatter(lines);
  const rawNodes = splitNodes(fm.rest);

  const usedIds = new Set<string>();
  const nodes: LdocNode[] = rawNodes.map((rn) => {
    let nodeId = slug(rn.title);
    while (usedIds.has(nodeId)) nodeId = `${nodeId}-x`;
    usedIds.add(nodeId);

    const { blocks, grounding } = parseBlocks(rn.body, nodeId);
    const attrs: Record<string, string> = (rn.body as any).__attrs || {};
    const mastery = asMastery(attrs.mastery || 'L2', rn.startLine);
    const prereq = attrs.prereq ? attrs.prereq.split(/\s+/).map(slug).filter(Boolean) : undefined;

    if (!grounding) {
      throw new LessonMarkdownError(`Node "${rn.title}" is missing its "::: grounding" block (required).`, rn.startLine);
    }
    if (grounding.must_know.length === 0) throw new LessonMarkdownError(`Node "${rn.title}" grounding needs at least one "know: ... [src]" fact.`, rn.startLine);
    if (!grounding.scope.includes) throw new LessonMarkdownError(`Node "${rn.title}" grounding needs an "includes:" scope line.`, rn.startLine);
    if (grounding.sources.length === 0) throw new LessonMarkdownError(`Node "${rn.title}" grounding needs at least one "source: id | Title | url" line.`, rn.startLine);

    const node: LdocNode = { id: nodeId, title: rn.title, mastery_target: mastery, blocks, grounding };
    if (prereq && prereq.length) node.prereq = prereq;

    // Rule: L2+ nodes need at least one visual block.
    if (mastery !== 'L0' && mastery !== 'L1' && !blocks.some((b) => VISUAL_TYPES.has(b.type))) {
      throw new LessonMarkdownError(`Node "${rn.title}" targets ${mastery} and needs at least one visual block (mermaid, image, math, or widget).`, rn.startLine);
    }
    return node;
  });

  const lesson: LdocLesson = {
    id: fm.id || slug(fm.title),
    title: fm.title,
    part: fm.part ?? 0,
    version: fm.version || '1.0.0',
    summary: fm.summary,
    authored_by: fm.authored_by || 'ai',
  };

  return { doc: 'ldoc/1.0', lesson, nodes };
}
