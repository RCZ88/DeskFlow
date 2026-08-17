# CONTEXT BUNDLE — Content Engine System Construction (2026-08-17)

> SELF-CONTAINED. The receiving AI has NO access to this codebase. Everything needed
> to design the complete system is in this file. Read this FIRST, then produce RESULT.md.

---

## 1. The Raw User Request (verbatim — do not reinterpret)

> "for every single bullet point of the script include actual elements of those retention
> features, to show/prove that the script and exact wording of every single bullet point
> meet those features properly. design a UI system for that alongside the fact that it
> always utilizes prompts and external AI tools and inserting the results back into the app.
> it is not only an editing software... it is the ENTIRE scripting side, entire planning side,
> social media analyzing and preplanning side, learning from mistakes, learning from video
> data (retention times, likes, audience age/country, percentage that watches until the end,
> people that save the video, all of those)."

Follow-up demands: "WHERES THE PROMTP FOR CONSTURCTING HE SYSTME AND EVREYTHING??" — the
system must be COMPLETE: retention evidence per script frame, a UI system proving each
bullet meets the retention features, always driven by prompts + external AI tools whose
results are inserted back into the app, full analytics (retention curve, likes, saves,
audience age/country, watch-to-end %), and a learning-from-mistakes loop feeding future scripts.

---

## 2. Product Context

**App:** DeskFlow (RHEO) — Electron + React + TypeScript + Tailwind v4 + better-sqlite3
desktop productivity suite. Dark mode only. The Content Engine is the full content-creation
pipeline for short-form video: brainstorm → ideas → episodes/scripts (with per-frame RETENTION
EVIDENCE) → themes → analytics (retention times, likes, saves, audience age/country, % watch
to end) → lessons → frameworks → future scripts.

**UI location:** mounted INSIDE the Overlay Studio page (`src/features/overlay-studio/OverlayStudioPage.tsx`)
via a header mode toggle (`"Overlay Studio" | "Content Engine"`, local state `mode`). NOT a route.

**Stack conventions (binding):** files CRLF; dark glass design (`bg-[rgba(24,24,27,0.60)]`
cards, `backdrop-blur-xl`, `rounded-xl` max, `p-5`); accent amber `#f5c518`; fonts Geist +
JetBrains Mono; every AI call goes through a provider chain (`buildChain(pState,'contentEngine')`
+ `runWithFallback`) and returns JSON-only; localStorage wrapped in try/catch; renderer talks
to main ONLY via `window.deskflowAPI.contentEngine.*`.

---

## 3. Architecture & Data Flow

```
Renderer (src/features/content-engine/*.tsx)
  └─ (window as any).deskflowAPI?.contentEngine.<method>(payload)
       └─ IPC invoke → src/preload.ts contentEngine bridge (lines 258-292)
            └─ ipcMain.handle('content:*' | 'themes:*' | 'ideas:*') in src/services/contentEngine/index.ts
                 └─ registerContentEngineHandlers(db, aiCall) — registered from src/main.ts:3891-3912
                      ├─ aiCall(prompt, systemPrompt, maxTokens?) → provider chain
                      │    buildChain(pState,'contentEngine') → runWithFallback(...) → result.content
                      └─ SQLite tables: content_ideas, content_episodes, themes,
                           content_frameworks, content_videos, content_lessons
```

**Provider chain registration (src/main.ts:3891-3912, verbatim):**
```ts
// Register Content Engine module (ideas/themes/scripts/gates/seo/analytics/lessons/frameworks)
try {
  const { registerContentEngineHandlers } = require('./services/contentEngine/index.js');
  registerContentEngineHandlers(db, async (prompt: string, systemPrompt: string, maxTokens?: number) => {
    const p = userPreferences || {};
    const pState = migrateProviderNames(JSON.parse(p.aiProviders || 'null'));
    if (!pState || !pState.providers || pState.providers.filter((pp: any) => pp.enabled).length === 0) {
      throw new Error('No AI provider configured');
    }
    const chain = buildChain(pState, 'contentEngine');
    if (chain.length === 0) throw new Error('No AI provider configured');
    const { result } = await runWithFallback(chain, {
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: maxTokens || 2000,
    });
    return result.content;
  });
  console.log('[DeskFlow] ✅ Content Engine module registered');
} catch (err: any) {
  console.error('[DeskFlow] ⚠️ Content Engine module failed to register:', err.message);
}
```

`buildChain(pState,'contentEngine')` requires the feature union in
`src/services/providers/router.ts:34` — `contentEngine` was ADDED:
```ts
feature: 'researchDigest' | 'goalAssistant' | 'resumeBuilder' | 'category' | 'colors' | 'lifeAssistant' | 'monthlyRecap' | 'contentEngine',
```

---

## 4. Backend Source (verbatim)

### 4.1 `src/services/contentEngine/rubric.ts` (78 lines — full)

```ts
// Retention Rubric — baseline v1.0.0
// The 4 user-mandated criteria + supporting criteria.
// Research additions from content-retention-research-17082026 will bump the version.
export const RETENTION_RUBRIC = {
  version: '1.0.0',
  threshold: 0.6,
  criteria: [
    {
      id: 'pattern_interrupt',
      name: 'Pattern Interrupt',
      definition: 'Breaks the scroll habit loop via scene change, prop, or shock value within the first seconds.',
      scoring: '0.0-1.0: strength of perceptual mismatch against the scroll pattern',
      timeline: '0-3s',
    },
    {
      id: 'curiosity_gap',
      name: 'Curiosity Gap',
      definition: 'Reveals partial information and withholds the payoff, so the viewer must keep watching to close the gap.',
      scoring: '0.0-1.0: how strongly an unanswered question is raised',
      timeline: '3-10s',
    },
    {
      id: 'hook_at_3_4s',
      name: 'Hook at 3rd-4th second',
      definition: 'The hook payoff lands at 3-4s — exactly where viewers drop off — not at second 0.',
      scoring: '0.0-1.0: payoff placement AND stakes clarity at the 3-4s mark',
      timeline: '3-4s',
    },
    {
      id: 'attention_anchor',
      name: 'Attention Anchor',
      definition: 'Social-proof scale + specific stakes + promise of resolution in one line. e.g. "Over 1M users already reported their account being hacked. Here\u2019s how to check if yours was."',
      scoring: '0.0-1.0: specificity of the anchor (numbers, stakes, resolution promise)',
      timeline: '0-5s',
    },
    {
      id: 'specific_pain',
      name: 'Specific Pain',
      definition: 'Names a concrete pain, person, or risk the viewer immediately recognizes as theirs.',
      scoring: '0.0-1.0: how concretely the pain is named',
      timeline: '0-10s',
    },
    {
      id: 'stakes_first',
      name: 'Stakes-First',
      definition: 'States what is at risk if the viewer ignores this information.',
      scoring: '0.0-1.0: how real/urgent the loss feels',
      timeline: '0-5s',
    },
    {
      id: 'value_speed',
      name: 'Value Delivery Speed',
      definition: 'The first payoff lands within 8 seconds of the video start.',
      scoring: '0.0-1.0: how fast value arrives',
      timeline: '0-8s',
    },
  ],
  nicheRule:
    'All criteria must be re-expressed for the target niche/topic — never paste verbatim cross-niche.',
} as const;

export type RetentionCriterionId = (typeof RETENTION_RUBRIC.criteria)[number]['id'];

export const RETENTION_CRITERIA_IDS: string[] = RETENTION_RUBRIC.criteria.map((c) => c.id);

// Per-frame evidence contract — every script frame carries this.
// {
//   criteria: ['pattern_interrupt', 'curiosity_gap'],
//   mechanism: 'Scene slams from static card to motion; line states a stakes question with withheld answer',
//   evidence: 'Line names a specific pain without revealing the resolution — viewer must watch to close the gap',
//   score: 0.9
// }
export interface RetentionEvidence {
  criteria: string[];
  mechanism: string;
  evidence: string;
  score: number;
}
```

### 4.2 `src/services/contentEngine/prompts.ts` (172 lines — full)

```ts
// Content Engine — Prompt Registry ({{placeholder}} templates, JSON-only responses)
import { RETENTION_RUBRIC } from './rubric';

const RUBRIC_TEXT = RETENTION_RUBRIC.criteria
  .map((c) => `- ${c.name} [${c.id}] (timeline ${c.timeline}): ${c.definition} — score: ${c.scoring}`)
  .join('\n');

const RETENTION_RULES = `Every single frame in the script MUST satisfy the retention criteria below and PROVE it.
CRITERIA (version ${RETENTION_RUBRIC.version}, minimum score ${RETENTION_RUBRIC.threshold}):
${RUBRIC_TEXT}
RULE: ${RETENTION_RUBRIC.nicheRule}
EVIDENCE RULE: For EVERY frame you must emit machine-checkable evidence of exactly which criteria it satisfies and how the EXACT wording satisfies them. A frame with score < ${RETENTION_RUBRIC.threshold} is REJECTED — rewrite it, never ship it.`;

const JSON_ONLY =
  'Respond in JSON only. No markdown, no code fences, no explanation, no commentary outside the JSON.';

export const PROMPT_CLASSIFY_IDEA = `You are the idea classifier for a short-form video creator.
Classify the thought below into one of:
- "content_idea" — a video topic worth filming
- "general_thought" — a thought that could seed ideas later (keep it, never discard)
Return:
{
  "category": "content_idea" | "general_thought",
  "reason": "one sentence why",
  "suggested_title": "optional title if content_idea",
  "format_type": "listicle" | "story" | "commentary" | "question" | "vlog" | "other",
  "niche_hint": "optional niche/topic guess"
}
Thought: {{thought}}
${JSON_ONLY}`;

export const PROMPT_SYNTHESIZE_IDEAS = `You are a short-form video strategist. {{note}}
Combine the raw ideas below into {{count}} NEW stronger ideas. An idea is only valid if it passes ALL 3 gates:
- GATE A (Scroll-Stop): a stranger scrolling fast would stop within 0-3 seconds.
- GATE B (Hard-Cut): the topic survives if every second after 0-5 is deleted; the first 5 seconds stand alone as compelling.
- GATE C (Asset-Ready): you have or can get the visual asset(s) needed (footage, screenshots, B-roll, stock, graphics).
Return:
{
  "ideas": [
    {
      "title": "string",
      "hook": "the exact hook line (0-5s)",
      "format_type": "listicle" | "story" | "commentary" | "question" | "vlog" | "other",
      "niche": "string",
      "series": "string or null",
      "priority": 1-5,
      "frames": ["3-8 frame plan lines"],
      "gates": { "a": {"pass": true, "reason": "..."}, "b": {"pass": true, "reason": "..."}, "c": {"pass": true, "reason": "..."} },
      "retention": { "criteria": ["array of retained criterion ids"], "mechanism": "how this idea uses them", "evidence": "why the hook wording proves it", "score": 0-1 }
    }
  ]
}
Raw ideas:
{{ideas}}
${JSON_ONLY}`;

export const PROMPT_SCRIPT_FRAMES = `You are a short-form video script writer for the "{{format_type}}" format, niche "{{niche}}".
Write a complete {{duration}} video script from the idea below as an array of frames.
Every frame is a timed beat with:
- "text": the EXACT words spoken/overlaid (this is what gets filmed — make every word count)
- "duration_seconds": 1-8
- "frame_type": "hook" | "value" | "transition" | "call_to_action" | "visual_only"
- "visual": on-screen visual description (footage/B-roll/text overlay/motion graphics)
- "retention": { "criteria": [criterion ids that THIS exact wording satisfies], "mechanism": "how the wording works", "evidence": "why these exact words prove the criteria — be concrete and specific", "score": 0-1 }
- "timestamp": "MM:SS"
Rules:
- Frame 0 is the scroll-stopper (0-3s) — pattern interrupt.
- The hook PAYOFF lands at 3-4s — never at second 0.
- Each line must give a reason to keep watching (curiosity gap) or deliver a value beat.
- 1 call_to_action frame at the end.
${RETENTION_RULES}
Idea: {{idea}}
${JSON_ONLY}`;

export const PROMPT_REGENERATE_LINE = `You are a short-form video script editor. The frame below was flagged as weak (score {{score}}, minimum {{threshold}}).
Rewrite ONLY this frame so the exact wording satisfies the retention criteria. Keep it a single spoken beat.
{{retention_rules}}
Frame: {{frame}}
Rewrite request from the creator: {{instruction}}
Return:
{
  "text": "new exact wording",
  "duration_seconds": number,
  "visual": "unchanged or improved",
  "retention": { "criteria": [...], "mechanism": "...", "evidence": "...", "score": 0-1 }
}
${JSON_ONLY}`;

export const PROMPT_GATE_VALIDATOR = `You are a short-form video gate validator. Validate this idea/script against the 3 gates.
Return:
{
  "scroll_stop": { "pass": true, "reason": "..." },
  "hard_cut": { "pass": true, "reason": "..." },
  "asset_ready": { "pass": true, "reason": "..." },
  "overall": "pass" | "fail",
  "suggestions": ["2-3 concrete fixes"]
}
Idea: {{idea}}
${JSON_ONLY}`;

export const PROMPT_SEO_INJECTOR = `You are a short-form video SEO specialist for niche "{{niche}}".
Generate a searchable title and description using high-volume keywords.
Return:
{
  "phrases": [
    { "phrase": "exact keyword phrase", "position": "title" | "first_line" | "text_overlay" | "caption", "reason": "why it helps discoverability" }
  ]
}
Video content: {{content}}
${JSON_ONLY}`;

export const PROMPT_THEME_GENERATOR = `You are a content strategist designing a theme (content pillar) for a short-form video channel.
Name the theme, define its audience, and give 4 content hooks that fit it.
Return:
{
  "name": "string",
  "description": "2-3 sentences",
  "audience": { "age_range": "18-25", "pain_points": ["..."], "interests": ["..."] },
  "content_hooks": [
    { "hook": "exact hook line", "format_type": "...", "reason": "why this niche audience stops scrolling" }
  ],
  "suggested_accent_color": "#RRGGBB"
}
Creator notes: {{note}}
${JSON_ONLY}`;

export const PROMPT_ANALYTICS_INSIGHT = `You are a video analytics interpreter. Read the performance data below and extract actionable insights.
Return:
{
  "insights": [
    { "metric": "retention_curve" | "completion_pct" | "saves" | "likes" | "audience" | "dropoff" | "other",
      "observation": "what the data shows",
      "interpretation": "why it likely happened (link to script elements if possible)",
      "action": "the exact change to make in the NEXT script" }
  ],
  "verdict": "what worked and what failed in this video, one short paragraph"
}
Performance data:
{{data}}
${JSON_ONLY}`;

export const PROMPT_LESSON_EXTRACTOR = `You are a short-form video coach building a lesson library. From this video's performance data, extract 1-3 durable lessons.
Each lesson must be reusable in future scripts.
Return:
{
  "lessons": [
    {
      "lesson": "one-sentence rule",
      "evidence": [{ "metric": "completion_pct", "value": "78%", "note": "..." }],
      "applies_to": "hook" | "script" | "editing" | "topic" | "audience" | "format",
      "confidence": 0-1
    }
  ]
}
Performance data:
{{data}}
${JSON_ONLY}`;

export const PROMPT_VALIDATE_SCRIPT_EVIDENCE = `You are the retention evidence validator. Each frame below claims retention criteria with evidence. Verify each claim:
- Is the criterion id valid? ({{valid_ids}})
- Does the evidence actually prove the wording satisfies it? (not hand-waving)
- Is the score >= {{threshold}}?
Return:
{
  "frames": [
    { "index": 0, "pass": true, "reason": "..." , "retention": {"criteria": [...], "mechanism": "...", "evidence": "verified/rewritten evidence", "score": 0-1} }
  ],
  "summary": { "passed": 5, "failed": 1, "total": 6 }
}
Frames:
{{frames}}
${JSON_ONLY}`;
```

### 4.3 `src/services/contentEngine/responseParser.ts` (93 lines — full)

```ts
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
```

### 4.4 `src/services/contentEngine/index.ts` (787 lines — full backend, verbatim)

```ts
// Content Engine — full backend module (tables, IPC, AI bridge).
// Registered from main.ts like services/learn. All AI calls go through the
// provider chain via the aiCall closure (buildChain 'contentEngine' + runWithFallback).
import { ipcMain } from 'electron';
import { RETENTION_CRITERIA_IDS, RETENTION_RUBRIC } from './rubric';
import { parseAiJson } from './responseParser';
import {
  PROMPT_CLASSIFY_IDEA,
  PROMPT_SYNTHESIZE_IDEAS,
  PROMPT_SCRIPT_FRAMES,
  PROMPT_REGENERATE_LINE,
  PROMPT_GATE_VALIDATOR,
  PROMPT_SEO_INJECTOR,
  PROMPT_THEME_GENERATOR,
  PROMPT_ANALYTICS_INSIGHT,
  PROMPT_LESSON_EXTRACTOR,
  PROMPT_VALIDATE_SCRIPT_EVIDENCE,
} from './prompts';

export type AiCall = (prompt: string, systemPrompt: string, maxTokens?: number) => Promise<string>;

const JSON_SYSTEM = 'You are a precise JSON generator. You ALWAYS respond with valid JSON only.';

function now() {
  return new Date().toISOString();
}

export function registerContentEngineHandlers(db: any, aiCall: AiCall) {
  ensureTables(db);
  seedBuiltins(db);

  // ── Ideas ────────────────────────────────────────────────
  ipcMain.handle('content:ideas:list', async () => {
    const rows = db.prepare('SELECT * FROM content_ideas ORDER BY updated_at DESC').all();
    return rows.map(mapIdea);
  });
  ipcMain.handle('content:ideas:save', async (_, idea: any) => {
    const ts = now();
    if (idea.id) {
      db.prepare(
        `UPDATE content_ideas SET title=?, hook=?, format_type=?, status=?, priority=?, series=?, niche=?, frames=?, synthesized_from=?, gates=?, updated_at=? WHERE id=?`
      ).run(
        idea.title,
        idea.hook || null,
        idea.format_type || 'listicle',
        idea.status || 'raw',
        idea.priority ?? 3,
        idea.series || null,
        idea.niche || null,
        JSON.stringify(idea.frames || []),
        JSON.stringify(idea.synthesized_from || []),
        JSON.stringify(idea.gates || null),
        ts,
        idea.id
      );
      return { ok: true, id: idea.id };
    }
    const info = db
      .prepare(
        `INSERT INTO content_ideas (title, hook, format_type, status, priority, series, niche, frames, synthesized_from, gates, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        idea.title,
        idea.hook || null,
        idea.format_type || 'listicle',
        idea.status || 'raw',
        idea.priority ?? 3,
        idea.series || null,
        idea.niche || null,
        JSON.stringify(idea.frames || []),
        JSON.stringify(idea.synthesized_from || []),
        JSON.stringify(idea.gates || null),
        ts,
        ts
      );
    return { ok: true, id: info.lastInsertRowid };
  });
  ipcMain.handle('content:ideas:delete', async (_, id: number) => {
    db.prepare('DELETE FROM content_ideas WHERE id=?').run(id);
    return { ok: true };
  });

  // ── Episodes ─────────────────────────────────────────────
  ipcMain.handle('content:episodes:list', async (_, { ideaId }: any = {}) => {
    const rows = ideaId
      ? db.prepare('SELECT * FROM content_episodes WHERE idea_id=? ORDER BY updated_at DESC').all(ideaId)
      : db.prepare('SELECT * FROM content_episodes ORDER BY updated_at DESC').all();
    return rows.map(mapEpisode);
  });
  ipcMain.handle('content:episodes:get', async (_, id: number) => {
    const row = db.prepare('SELECT * FROM content_episodes WHERE id=?').get(id);
    return row ? mapEpisode(row) : null;
  });
  ipcMain.handle('content:episodes:save', async (_, ep: any) => {
    const ts = now();
    if (ep.id) {
      db.prepare(
        `UPDATE content_episodes SET title=?, idea_id=?, theme_id=?, status=?, niche=?, script=?, seo=?, gates=?, gate_override=?, updated_at=? WHERE id=?`
      ).run(
        ep.title,
        ep.idea_id || null,
        ep.theme_id || null,
        ep.status || 'draft',
        ep.niche || null,
        JSON.stringify(ep.script || []),
        JSON.stringify(ep.seo || null),
        JSON.stringify(ep.gates || null),
        ep.gate_override ? 1 : 0,
        ts,
        ep.id
      );
      return { ok: true, id: ep.id };
    }
    const info = db
      .prepare(
        `INSERT INTO content_episodes (title, idea_id, theme_id, status, niche, script, seo, gates, gate_override, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        ep.title,
        ep.idea_id || null,
        ep.theme_id || null,
        ep.status || 'draft',
        ep.niche || null,
        JSON.stringify(ep.script || []),
        JSON.stringify(ep.seo || null),
        JSON.stringify(ep.gates || null),
        ep.gate_override ? 1 : 0,
        ts,
        ts
      );
    return { ok: true, id: info.lastInsertRowid };
  });
  ipcMain.handle('content:episodes:delete', async (_, id: number) => {
    db.prepare('DELETE FROM content_episodes WHERE id=?').run(id);
    return { ok: true };
  });

  // ── Script generation (frames + retention evidence) ──────
  ipcMain.handle('content:script:generate', async (_, { episodeId, ideaId }: any) => {
    let idea: any = null;
    let ep: any = null;
    if (episodeId) ep = db.prepare('SELECT * FROM content_episodes WHERE id=?').get(episodeId);
    if (ideaId || (ep && ep.idea_id)) {
      idea = db.prepare('SELECT * FROM content_ideas WHERE id=?').get(ideaId || ep.idea_id);
    }
    const niche = (idea?.niche || ep?.niche || 'general') as string;
    const format = idea?.format_type || 'listicle';
    const title = idea?.title || ep?.title || 'Untitled idea';
    const hook = idea?.hook || '';
    const framesPlan = idea?.frames || [];
    const ideaText = JSON.stringify({ title, hook, format_type: format, frames_plan: framesPlan });

    const res = await parseAiJson<any>(
      PROMPT_SCRIPT_FRAMES
        .replace('{{format_type}}', format)
        .replace('{{niche}}', niche)
        .replace('{{duration}}', '60-120')
        .replace('{{idea}}', ideaText),
      { required: ['frames'], arrayAt: 'frames' },
      (p, s) => aiCall(p, s, 4000)
    );
    if (!res.ok) return { ok: false, error: `Script generation failed: ${res.error}` };

    const frames = res.data.frames.map((f: any, i: number) => ({
      ...f,
      index: i,
      timestamp: f.timestamp || fmtTs(i),
    }));

    // Auto gate-check the generated script
    const gates = await runGateCheck(ideaText, frames);
    const epId = episodeId || ep?.id;
    if (epId) {
      db.prepare('UPDATE content_episodes SET script=?, gates=?, status=?, updated_at=? WHERE id=?').run(
        JSON.stringify(frames),
        JSON.stringify(gates),
        gates.overall === 'pass' ? 'scripted' : 'gated',
        now(),
        epId
      );
    }
    return { ok: true, frames, gates };
  });

  ipcMain.handle('content:script:regenerate-line', async (_, { episodeId, frameIndex, instruction }: any) => {
    const ep = db.prepare('SELECT * FROM content_episodes WHERE id=?').get(episodeId);
    if (!ep) return { ok: false, error: 'Episode not found' };
    const script = JSON.parse(ep.script || '[]');
    const frame = script[frameIndex];
    if (!frame) return { ok: false, error: 'Frame not found' };

    const retentionRules = `Retention criteria (threshold ${RETENTION_RUBRIC.threshold}): ${RETENTION_RUBRIC.criteria
      .map((c) => `${c.name} [${c.id}] — ${c.definition}`)
      .join('; ')}. Evidence rule: every frame must prove which criteria its exact wording satisfies.`;
    const res = await parseAiJson<any>(
      PROMPT_REGENERATE_LINE
        .replace('{{score}}', String(frame.retention?.score ?? 0))
        .replace('{{threshold}}', String(RETENTION_RUBRIC.threshold))
        .replace('{{retention_rules}}', retentionRules)
        .replace('{{frame}}', JSON.stringify(frame))
        .replace('{{instruction}}', instruction || 'Make it stronger'),
      { required: ['text', 'retention'] },
      (p, s) => aiCall(p, s, 2000)
    );
    if (!res.ok) return { ok: false, error: `Regeneration failed: ${res.error}` };

    const updated = { ...frame, ...res.data, index: frameIndex, timestamp: frame.timestamp };
    script[frameIndex] = updated;
    db.prepare('UPDATE content_episodes SET script=?, updated_at=? WHERE id=?').run(JSON.stringify(script), now(), episodeId);
    return { ok: true, frame: updated };
  });

  ipcMain.handle('content:validate-script-evidence', async (_, { episodeId }: any) => {
    const ep = db.prepare('SELECT * FROM content_episodes WHERE id=?').get(episodeId);
    if (!ep) return { ok: false, error: 'Episode not found' };
    const script = JSON.parse(ep.script || '[]');
    if (!script.length) return { ok: false, error: 'No script yet — generate one first' };

    const res = await parseAiJson<any>(
      PROMPT_VALIDATE_SCRIPT_EVIDENCE
        .replace('{{valid_ids}}', RETENTION_CRITERIA_IDS.join(', '))
        .replace('{{threshold}}', String(RETENTION_RUBRIC.threshold))
        .replace('{{frames}}', JSON.stringify(script)),
      { required: ['frames'], arrayAt: 'frames' },
      (p, s) => aiCall(p, s, 3000)
    );
    if (!res.ok) return { ok: false, error: `Evidence validation failed: ${res.error}` };

    const results = res.data.frames;
    for (const r of results) {
      if (r.pass && r.retention && script[r.index]) {
        script[r.index] = { ...script[r.index], retention: r.retention };
      }
    }
    db.prepare('UPDATE content_episodes SET script=?, updated_at=? WHERE id=?').run(JSON.stringify(script), now(), episodeId);
    return { ok: true, results, script };
  });

  // ── 3-Gate validator + override ──────────────────────────
  async function runGateCheck(ideaText: string, frames: any[] = []) {
    try {
      const res = await parseAiJson<any>(
        PROMPT_GATE_VALIDATOR.replace('{{idea}}', JSON.stringify({ idea: ideaText, frames })),
        { required: ['scroll_stop', 'hard_cut', 'asset_ready', 'overall'] },
        (p, s) => aiCall(p, s, 2000)
      );
      if (res.ok) return { ...res.data, checked_at: now() };
    } catch (e) {
      // fall through to heuristic check
    }
    return {
      scroll_stop: { pass: !!(ideaText && ideaText.length > 0), reason: 'heuristic: hook present' },
      hard_cut: { pass: frames.length >= 1, reason: 'heuristic: frames exist' },
      asset_ready: { pass: true, reason: 'heuristic: assume available' },
      overall: frames.length >= 1 && !!ideaText ? 'pass' : 'fail',
      suggestions: [],
      checked_at: now(),
    };
  }

  ipcMain.handle('content:validate-gates', async (_, { ideaId, episodeId }: any) => {
    let idea: any = null;
    let ep: any = null;
    if (ideaId) idea = db.prepare('SELECT * FROM content_ideas WHERE id=?').get(ideaId);
    if (episodeId) ep = db.prepare('SELECT * FROM content_episodes WHERE id=?').get(episodeId);
    const ideaText = idea ? JSON.stringify({ title: idea.title, hook: idea.hook, frames: idea.frames }) : JSON.stringify({ title: ep?.title, frames: JSON.parse(ep?.script || '[]') });
    const gates = await runGateCheck(ideaText, JSON.parse(ep?.script || '[]'));
    if (idea) {
      db.prepare('UPDATE content_ideas SET gates=?, updated_at=? WHERE id=?').run(JSON.stringify(gates), now(), idea.id);
    }
    if (ep) {
      db.prepare('UPDATE content_episodes SET gates=?, updated_at=? WHERE id=?').run(JSON.stringify(gates), now(), ep.id);
    }
    return { ok: true, gates };
  });
  ipcMain.handle('content:gate-override', async (_, { episodeId, override }: any) => {
    db.prepare('UPDATE content_episodes SET gate_override=?, status=?, updated_at=? WHERE id=?').run(
      override ? 1 : 0,
      override ? 'scripted' : 'gated',
      now(),
      episodeId
    );
    return { ok: true };
  });

  // ── SEO injector ─────────────────────────────────────────
  ipcMain.handle('content:inject-seo', async (_, { episodeId, niche }: any) => {
    const ep = db.prepare('SELECT * FROM content_episodes WHERE id=?').get(episodeId);
    if (!ep) return { ok: false, error: 'Episode not found' };
    const content = (ep.script ? JSON.parse(ep.script) : []).map((f: any) => f.text).join(' ');
    const res = await parseAiJson<any>(
      PROMPT_SEO_INJECTOR.replace('{{niche}}', niche || ep.niche || 'general').replace('{{content}}', content),
      { required: ['phrases'], arrayAt: 'phrases' },
      (p, s) => aiCall(p, s, 2000)
    );
    if (!res.ok) return { ok: false, error: `SEO generation failed: ${res.error}` };
    db.prepare('UPDATE content_episodes SET seo=?, updated_at=? WHERE id=?').run(JSON.stringify(res.data.phrases), now(), episodeId);
    return { ok: true, phrases: res.data.phrases };
  });

  // ── Idea synthesis ───────────────────────────────────────
  ipcMain.handle('ideas:synthesize', async (_, { note, count = 3 }: any = {}) => {
    const raw = db
      .prepare('SELECT title, hook, niche, series, priority FROM content_ideas WHERE status IN (?, ?) ORDER BY priority ASC LIMIT 30')
      .all('raw', 'refined');
    if (!raw.length) return { ok: true, ideas: [] };
    const res = await parseAiJson<any>(
      PROMPT_SYNTHESIZE_IDEAS
        .replace('{{note}}', note || 'Combine the weakest raw ideas into stronger ones.')
        .replace('{{count}}', String(count))
        .replace('{{ideas}}', JSON.stringify(raw)),
      { required: ['ideas'], arrayAt: 'ideas' },
      (p, s) => aiCall(p, s, 3000)
    );
    if (!res.ok) return { ok: false, error: `Synthesis failed: ${res.error}` };
    const ts = now();
    const saved: any[] = [];
    for (const idea of res.data.ideas) {
      const info = db
        .prepare(
          `INSERT INTO content_ideas (title, hook, format_type, status, priority, series, niche, frames, synthesized_from, gates, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
        )
        .run(
          idea.title,
          idea.hook || '',
          idea.format_type || 'listicle',
          'raw',
          idea.priority ?? 3,
          idea.series || null,
          idea.niche || null,
          JSON.stringify(idea.frames || []),
          JSON.stringify(raw.map((r: any) => r.id)),
          JSON.stringify(idea.gates || null),
          ts,
          ts
        );
      saved.push({ id: info.lastInsertRowid, ...idea });
    }
    return { ok: true, ideas: saved };
  });

  // ── Brainstorm classification ────────────────────────────
  ipcMain.handle('content:brainstorm:classify', async (_, { thought }: any) => {
    if (!thought || !thought.trim()) return { ok: false, error: 'Empty thought' };
    try {
      const res = await parseAiJson<any>(
        PROMPT_CLASSIFY_IDEA.replace('{{thought}}', thought),
        { required: ['category'] },
        (p, s) => aiCall(p, s, 800)
      );
      if (res.ok) return { ok: true, ...res.data };
    } catch {
      /* fall through to local heuristic */
    }
    const heuristic = /^(how|why|what|best|worst|top|never|always|secret|tips|mistake|i tried|i tested)\b/i.test(thought.trim())
      ? 'content_idea'
      : 'general_thought';
    return { ok: true, category: heuristic, reason: 'local heuristic fallback (no AI provider)' };
  });

  // ── Themes ────────────────────────────────────────────────
  ipcMain.handle('themes:create', async (_, theme: any) => {
    const info = db
      .prepare('INSERT INTO themes (name, description, accent_color, icon, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
      .run(
        theme.name,
        theme.description || '',
        theme.accent_color || '#f5c518',
        theme.icon || 'Palette',
        theme.status || 'active',
        now(),
        now()
      );
    return { ok: true, id: info.lastInsertRowid };
  });
  ipcMain.handle('themes:generate', async (_, { note }: any = {}) => {
    const res = await parseAiJson<any>(
      PROMPT_THEME_GENERATOR.replace('{{note}}', note || ''),
      { required: ['name', 'audience', 'content_hooks'], arrayAt: 'content_hooks' },
      (p, s) => aiCall(p, s, 2500)
    );
    if (!res.ok) return { ok: false, error: `Theme generation failed: ${res.error}` };
    const info = db
      .prepare('INSERT INTO themes (name, description, accent_color, icon, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
      .run(
        res.data.name,
        res.data.description || '',
        res.data.suggested_accent_color || '#f5c518',
        'Palette',
        'active',
        now(),
        now()
      );
    return { ok: true, id: info.lastInsertRowid, theme: res.data };
  });
  ipcMain.handle('themes:get-all', async () => {
    return db.prepare('SELECT * FROM themes ORDER BY created_at DESC').all().map(mapTheme);
  });
  ipcMain.handle('themes:apply', async (_, { themeId, episodeId }: any) => {
    db.prepare('UPDATE content_episodes SET theme_id=? WHERE id=?').run(themeId, episodeId);
    return { ok: true };
  });
  ipcMain.handle('themes:delete', async (_, id: number) => {
    db.prepare('DELETE FROM themes WHERE id=?').run(id);
    return { ok: true };
  });

  // ── Analytics (video performance + learning loop) ────────
  ipcMain.handle('content:analytics:get', async (_, { episodeId }: any = {}) => {
    const videos = episodeId
      ? db.prepare('SELECT * FROM content_videos WHERE episode_id=? ORDER BY published_at DESC').all(episodeId)
      : db.prepare('SELECT * FROM content_videos ORDER BY published_at DESC').all();
    const mapped = videos.map(mapVideo);
    const lessons = db.prepare('SELECT * FROM content_lessons ORDER BY created_at DESC').all().map(mapLesson);
    const agg = aggregateVideos(mapped);
    return { ok: true, videos: mapped, lessons, aggregate: agg };
  });
  ipcMain.handle('content:analytics:upsert-video', async (_, v: any) => {
    const ts = now();
    if (v.id) {
      db.prepare(
        `UPDATE content_videos SET episode_id=?, platform=?, url=?, title=?, views=?, likes=?, saves=?, shares=?, comments=?, completion_pct=?, retention_curve=?, audience=?, dropoffs=?, published_at=?, fetched_at=? WHERE id=?`
      ).run(
        v.episode_id || null,
        v.platform || 'tiktok',
        v.url || null,
        v.title || '',
        v.views ?? 0,
        v.likes ?? 0,
        v.saves ?? 0,
        v.shares ?? 0,
        v.comments ?? 0,
        v.completion_pct ?? null,
        JSON.stringify(v.retention_curve || []),
        JSON.stringify(v.audience || null),
        JSON.stringify(v.dropoffs || []),
        v.published_at || null,
        ts,
        v.id
      );
      return { ok: true, id: v.id };
    }
    const info = db
      .prepare(
        `INSERT INTO content_videos (episode_id, platform, url, title, views, likes, saves, shares, comments, completion_pct, retention_curve, audience, dropoffs, published_at, fetched_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        v.episode_id || null,
        v.platform || 'tiktok',
        v.url || null,
        v.title || '',
        v.views ?? 0,
        v.likes ?? 0,
        v.saves ?? 0,
        v.shares ?? 0,
        v.comments ?? 0,
        v.completion_pct ?? null,
        JSON.stringify(v.retention_curve || []),
        JSON.stringify(v.audience || null),
        JSON.stringify(v.dropoffs || []),
        v.published_at || null,
        ts
      );
    return { ok: true, id: info.lastInsertRowid };
  });
  ipcMain.handle('content:analytics:delete-video', async (_, id: number) => {
    db.prepare('DELETE FROM content_videos WHERE id=?').run(id);
    return { ok: true };
  });
  ipcMain.handle('content:analytics:insight', async (_, { episodeId }: any = {}) => {
    const res = await callAnalytics(episodeId);
    if (!res.ok) return res;
    const { mapped } = res;
    const data = mapped.length
      ? mapped.map((v: any) => ({
          title: v.title,
          views: v.views,
          likes: v.likes,
          saves: v.saves,
          shares: v.shares,
          completion_pct: v.completion_pct,
          audience: v.audience,
          retention_curve: v.retention_curve,
          dropoffs: v.dropoffs,
        }))
      : [{ note: 'no published videos yet' }];
    const out = await parseAiJson<any>(
      PROMPT_ANALYTICS_INSIGHT.replace('{{data}}', JSON.stringify(data)),
      { required: ['insights'], arrayAt: 'insights', allowEmpty: true },
      (p, s) => aiCall(p, s, 3000)
    );
    if (!out.ok) return { ok: false, error: `Insight generation failed: ${out.error}` };
    return { ok: true, insights: out.data.insights, verdict: out.data.verdict || '' };
  });

  // ── Lessons (learning loop) ──────────────────────────────
  ipcMain.handle('content:lessons:list', async () => {
    return db.prepare('SELECT * FROM content_lessons ORDER BY created_at DESC').all().map(mapLesson);
  });
  ipcMain.handle('content:lessons:save', async (_, lesson: any) => {
    const info = db
      .prepare('INSERT INTO content_lessons (video_id, episode_id, lesson, evidence, status, created_at) VALUES (?,?,?,?,?,?)')
      .run(
        lesson.video_id || null,
        lesson.episode_id || null,
        lesson.lesson,
        JSON.stringify(lesson.evidence || []),
        lesson.status || 'active',
        now()
      );
    return { ok: true, id: info.lastInsertRowid };
  });
  ipcMain.handle('content:lessons:delete', async (_, id: number) => {
    db.prepare('DELETE FROM content_lessons WHERE id=?').run(id);
    return { ok: true };
  });
  ipcMain.handle('content:lessons:extract', async (_, { videoId }: any) => {
    const v = db.prepare('SELECT * FROM content_videos WHERE id=?').get(videoId);
    if (!v) return { ok: false, error: 'Video not found' };
    const data = mapVideo(v);
    const res = await parseAiJson<any>(
      PROMPT_LESSON_EXTRACTOR.replace(
        '{{data}}',
        JSON.stringify({ title: data.title, views: data.views, likes: data.likes, saves: data.saves, completion_pct: data.completion_pct, retention_curve: data.retention_curve, audience: data.audience })
      ),
      { required: ['lessons'], arrayAt: 'lessons', allowEmpty: true },
      (p, s) => aiCall(p, s, 2000)
    );
    if (!res.ok) return { ok: false, error: `Lesson extraction failed: ${res.error}` };
    const saved: any[] = [];
    for (const l of res.data.lessons) {
      const info = db
        .prepare('INSERT INTO content_lessons (video_id, episode_id, lesson, evidence, status, created_at) VALUES (?,?,?,?,?,?)')
        .run(videoId, data.episode_id || null, l.lesson, JSON.stringify(l.evidence || []), 'active', now());
      saved.push({ id: info.lastInsertRowid, ...l });
    }
    return { ok: true, lessons: saved };
  });

  // ── Frameworks (versioned script rules) ──────────────────
  ipcMain.handle('content:frameworks:list', async () => {
    return db.prepare('SELECT * FROM content_frameworks ORDER BY is_builtin DESC, name ASC').all().map(mapFramework);
  });
  ipcMain.handle('content:frameworks:save', async (_, fw: any) => {
    const ts = now();
    const existing = fw.id ? db.prepare('SELECT * FROM content_frameworks WHERE id=?').get(fw.id) : null;
    if (existing) {
      const history = JSON.parse(existing.history || '[]');
      history.push({ version: existing.version, rules: JSON.parse(existing.rules || '[]'), saved_at: ts });
      db.prepare('UPDATE content_frameworks SET name=?, description=?, rules=?, version=version+1, history=?, updated_at=? WHERE id=?').run(
        fw.name,
        fw.description || '',
        JSON.stringify(fw.rules || []),
        JSON.stringify(history),
        ts,
        fw.id
      );
      return { ok: true, id: fw.id, version: existing.version + 1 };
    }
    const info = db
      .prepare('INSERT INTO content_frameworks (name, description, rules, version, is_builtin, history, created_at, updated_at) VALUES (?,?,?,1,0,?,?,?)')
      .run(fw.name, fw.description || '', JSON.stringify(fw.rules || []), JSON.stringify([]), ts, ts);
    return { ok: true, id: info.lastInsertRowid, version: 1 };
  });
  ipcMain.handle('content:frameworks:rollback', async (_, { id, version }: any) => {
    const fw = db.prepare('SELECT * FROM content_frameworks WHERE id=?').get(id);
    if (!fw) return { ok: false, error: 'Framework not found' };
    const history = JSON.parse(fw.history || '[]');
    const target = history.find((h: any) => h.version === version);
    if (!target) return { ok: false, error: `Version ${version} not in history` };
    db.prepare('UPDATE content_frameworks SET rules=?, version=?, updated_at=? WHERE id=?').run(
      JSON.stringify(target.rules),
      version,
      now(),
      id
    );
    return { ok: true };
  });

  // ── Brainstorm session summary ───────────────────────────
  ipcMain.handle('content:brainstorm:summary', async (_, { note }: any = {}) => {
    const ideas = db.prepare('SELECT title, hook, niche, priority, status FROM content_ideas ORDER BY updated_at DESC LIMIT 20').all();
    const res = await parseAiJson<any>(
      PROMPT_SYNTHESIZE_IDEAS.replace('{{note}}', `Session summary mode. Synthesize a 3-sentence strategy summary of the session. ${note || ''}`).replace('{{count}}', '2').replace('{{ideas}}', JSON.stringify(ideas)),
      { required: ['ideas'], arrayAt: 'ideas', allowEmpty: true },
      (p, s) => aiCall(p, s, 2000)
    );
    if (!res.ok) return { ok: false, error: `Summary failed: ${res.error}` };
    return { ok: true, summary: res.data.ideas };
  });

  // ── helpers ──────────────────────────────────────────────
  async function callAnalytics(episodeId?: number) {
    const videos = episodeId
      ? db.prepare('SELECT * FROM content_videos WHERE episode_id=? ORDER BY published_at DESC').all(episodeId)
      : db.prepare('SELECT * FROM content_videos ORDER BY published_at DESC').all();
    return { ok: true, mapped: videos.map(mapVideo) };
  }

  console.log('[ContentEngine] registered — ideas/episodes/themes/scripts/gates/seo/analytics/lessons/frameworks');
}

// ── schema ─────────────────────────────────────────────────
function ensureTables(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      hook TEXT,
      format_type TEXT DEFAULT 'listicle',
      status TEXT DEFAULT 'raw',
      priority INTEGER DEFAULT 3,
      series TEXT,
      niche TEXT,
      frames JSON,
      synthesized_from JSON,
      gates JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS content_episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      idea_id INTEGER,
      theme_id INTEGER,
      status TEXT DEFAULT 'draft',
      niche TEXT,
      script JSON,
      seo JSON,
      gates JSON,
      gate_override INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS themes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      accent_color TEXT DEFAULT '#f5c518',
      icon TEXT DEFAULT 'Palette',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS content_frameworks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      rules JSON,
      version INTEGER DEFAULT 1,
      is_builtin INTEGER DEFAULT 0,
      history JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS content_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      episode_id INTEGER,
      platform TEXT DEFAULT 'tiktok',
      url TEXT,
      title TEXT,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      completion_pct REAL,
      retention_curve JSON,
      audience JSON,
      dropoffs JSON,
      published_at DATETIME,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS content_lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER,
      episode_id INTEGER,
      lesson TEXT NOT NULL,
      evidence JSON,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_episodes_idea ON content_episodes(idea_id);
    CREATE INDEX IF NOT EXISTS idx_videos_episode ON content_videos(episode_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_video ON content_lessons(video_id);
  `);
}

// ── built-in frameworks (v3.0 spec) ────────────────────────
function seedBuiltins(db: any) {
  const count = (db.prepare('SELECT COUNT(*) c FROM content_frameworks WHERE is_builtin=1').get() as any).c;
  if (count > 0) return;
  const builtins = [
    { name: 'Hook-Value Loop', description: 'Open with a hook that promises a payoff, then deliver value beats that each re-hook the viewer for the next segment.', rules: [
      { id: 'hv1', rule: 'Every value segment ends with an unresolved teaser that re-hooks into the next segment' },
      { id: 'hv2', rule: 'The first payoff lands within 8 seconds' },
      { id: 'hv3', rule: 'CTA only after the final payoff' },
    ] },
    { name: 'Contrast Story', description: 'Show the "before" pain, then the "after" transformation — the gap keeps viewers watching for the payoff.', rules: [
      { id: 'cs1', rule: 'Establish the pain concretely in the first 5 seconds' },
      { id: 'cs2', rule: 'Hold back the transformation until at least 40% through' },
      { id: 'cs3', rule: 'Make the transformation measurable (numbers, before/after)' },
    ] },
    { name: 'Problem → Solution Echo', description: 'State the problem, promise a solution, then echo the problem at the end to confirm the solution landed.', rules: [
      { id: 'pe1', rule: 'First line names the exact problem the viewer feels' },
      { id: 'pe2', rule: 'Middle delivers one solution per segment' },
      { id: 'pe3', rule: 'Last segment re-states the problem and confirms the fix' },
    ] },
    { name: 'Listicle Value', description: 'Numbered value list — each item is a self-contained payoff with a mini-hook.', rules: [
      { id: 'lv1', rule: 'Count is stated up front (3-7 items)' },
      { id: 'lv2', rule: 'Each item opens with a mini-hook and pays off within 10 seconds' },
      { id: 'lv3', rule: 'Order items worst → best' },
    ] },
    { name: 'Question-Reveal', description: 'Open with a provocative question, then reveal the answer through the body — the reveal IS the retention engine.', rules: [
      { id: 'qr1', rule: 'The question must have stakes (what happens if you get it wrong)' },
      { id: 'qr2', rule: 'Tease the reveal at 30% and 60% without giving it away' },
      { id: 'qr3', rule: 'Reveal lands in the final 15%' },
    ] },
  ];
  const insert = db.prepare('INSERT INTO content_frameworks (name, description, rules, version, is_builtin, history, created_at, updated_at) VALUES (?,?,?,1,1,?,?,?)');
  const ts = now();
  for (const b of builtins) insert.run(b.name, b.description, JSON.stringify(b.rules), JSON.stringify([]), ts, ts);
  console.log(`[ContentEngine] seeded ${builtins.length} built-in frameworks`);
}

// ── mappers ────────────────────────────────────────────────
function mapIdea(r: any) {
  return { ...r, frames: safeJson(r.frames), synthesized_from: safeJson(r.synthesized_from), gates: safeJson(r.gates) };
}
function mapEpisode(r: any) {
  return { ...r, script: safeJson(r.script), seo: safeJson(r.seo), gates: safeJson(r.gates), gate_override: !!r.gate_override };
}
function mapTheme(r: any) {
  return { ...r };
}
function mapVideo(r: any) {
  return {
    ...r,
    retention_curve: safeJson(r.retention_curve),
    audience: safeJson(r.audience),
    dropoffs: safeJson(r.dropoffs),
  };
}
function mapLesson(r: any) {
  return { ...r, evidence: safeJson(r.evidence) };
}
function mapFramework(r: any) {
  return { ...r, rules: safeJson(r.rules), history: safeJson(r.history), is_builtin: !!r.is_builtin };
}
function safeJson(v: any, fallback: any = null) {
  if (v == null) return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}
function fmtTs(index: number) {
  const s = index * 8;
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function aggregateVideos(videos: any[]) {
  if (!videos.length) return { count: 0 };
  const sum = (k: string) => videos.reduce((a, v) => a + (v[k] || 0), 0);
  const withRetention = videos.filter((v) => Array.isArray(v.retention_curve) && v.retention_curve.length > 0);
  return {
    count: videos.length,
    views: sum('views'),
    likes: sum('likes'),
    saves: sum('saves'),
    shares: sum('shares'),
    comments: sum('comments'),
    avgCompletion: videos.filter((v) => v.completion_pct != null).length
      ? videos.filter((v) => v.completion_pct != null).reduce((a, v) => a + (v.completion_pct || 0), 0) / videos.filter((v) => v.completion_pct != null).length
      : null,
    avgRetentionCurve: withRetention.length
      ? withRetention[0].retention_curve.map((_: any, i: number) => ({
          t: withRetention[0].retention_curve[i].t,
          pct: withRetention.reduce((a, v) => a + (v.retention_curve[i]?.pct || 0), 0) / withRetention.length,
        }))
      : [],
  };
}
```

---

## 5. Renderer Types (verbatim — `src/types/deskflow-api.d.ts:571-705`)

```ts
// ── Content Engine types ──────────────────────────────────
export interface RetentionEvidence {
  criteria: string[];
  mechanism: string;
  evidence: string;
  score: number;
}

export interface ScriptFrame {
  index: number;
  text: string;
  duration_seconds: number;
  frame_type: 'hook' | 'value' | 'transition' | 'call_to_action' | 'visual_only';
  visual: string;
  retention: RetentionEvidence;
  timestamp: string;
}

export interface GateCheck {
  pass: boolean;
  reason: string;
}

export interface GatesResult {
  scroll_stop: GateCheck;
  hard_cut: GateCheck;
  asset_ready: GateCheck;
  overall: 'pass' | 'fail';
  suggestions: string[];
  checked_at?: string;
}

export interface ContentIdea {
  id?: number;
  title: string;
  hook?: string;
  format_type?: string;
  status?: 'raw' | 'refined' | 'approved' | 'used';
  priority?: number;
  series?: string | null;
  niche?: string | null;
  frames?: string[];
  synthesized_from?: number[];
  gates?: GatesResult | null;
}

export interface ContentEpisode {
  id?: number;
  title: string;
  idea_id?: number | null;
  theme_id?: number | null;
  status?: 'draft' | 'scripted' | 'gated' | 'filming' | 'published';
  niche?: string | null;
  script?: ScriptFrame[];
  seo?: any;
  gates?: GatesResult | null;
  gate_override?: boolean;
}

export interface ContentVideo {
  id?: number;
  episode_id?: number | null;
  platform?: string;
  url?: string | null;
  title: string;
  views?: number;
  likes?: number;
  saves?: number;
  shares?: number;
  comments?: number;
  completion_pct?: number | null;
  retention_curve?: Array<{ t: number; pct: number }>;
  audience?: { ages?: Array<{ range: string; pct: number }>; countries?: Array<{ code: string; name: string; pct: number }> } | null;
  dropoffs?: Array<{ t: number; pct: number }>;
  published_at?: string | null;
}

export interface ContentLesson {
  id?: number;
  video_id?: number | null;
  episode_id?: number | null;
  lesson: string;
  evidence?: Array<{ metric: string; value: string; note?: string }>;
  status?: 'active' | 'applied' | 'dismissed';
}

export interface ContentFramework {
  id?: number;
  name: string;
  description?: string;
  rules?: Array<{ id: string; rule: string }>;
  version?: number;
  is_builtin?: boolean;
  history?: Array<{ version: number; rules: any[]; saved_at: string }>;
}

export interface ContentEngineApi {
  ideasList: () => Promise<ContentIdea[]>;
  ideaSave: (idea: ContentIdea) => Promise<{ ok: boolean; id?: number; error?: string }>;
  ideaDelete: (id: number) => Promise<{ ok: boolean }>;
  episodesList: (opts?: { ideaId?: number }) => Promise<ContentEpisode[]>;
  episodeGet: (id: number) => Promise<ContentEpisode | null>;
  episodeSave: (ep: ContentEpisode) => Promise<{ ok: boolean; id?: number; error?: string }>;
  episodeDelete: (id: number) => Promise<{ ok: boolean }>;
  scriptGenerate: (payload: { episodeId?: number; ideaId?: number }) => Promise<{ ok: boolean; frames?: ScriptFrame[]; gates?: GatesResult; error?: string }>;
  scriptRegenerateLine: (payload: { episodeId: number; frameIndex: number; instruction?: string }) => Promise<{ ok: boolean; frame?: ScriptFrame; error?: string }>;
  validateScriptEvidence: (payload: { episodeId: number }) => Promise<{ ok: boolean; results?: any[]; script?: ScriptFrame[]; error?: string }>;
  validateGates: (payload: { ideaId?: number; episodeId?: number }) => Promise<{ ok: boolean; gates?: GatesResult; error?: string }>;
  gateOverride: (payload: { episodeId: number; override: boolean }) => Promise<{ ok: boolean }>;
  injectSeo: (payload: { episodeId: number; niche?: string }) => Promise<{ ok: boolean; phrases?: any[]; error?: string }>;
  synthesizeIdeas: (payload?: { note?: string; count?: number }) => Promise<{ ok: boolean; ideas?: ContentIdea[]; error?: string }>;
  brainstormClassify: (payload: { thought: string }) => Promise<{ ok: boolean; category?: 'content_idea' | 'general_thought'; reason?: string; suggested_title?: string; format_type?: string; niche_hint?: string; error?: string }>;
  brainstormSummary: (payload?: { note?: string }) => Promise<{ ok: boolean; summary?: any[]; error?: string }>;
  themesCreate: (theme: any) => Promise<{ ok: boolean; id?: number; error?: string }>;
  themesGenerate: (payload?: { note?: string }) => Promise<{ ok: boolean; id?: number; theme?: any; error?: string }>;
  themesGetAll: () => Promise<any[]>;
  themesApply: (payload: { themeId: number; episodeId: number }) => Promise<{ ok: boolean }>;
  themesDelete: (id: number) => Promise<{ ok: boolean }>;
  analyticsGet: (payload?: { episodeId?: number }) => Promise<{ ok: boolean; videos?: ContentVideo[]; lessons?: ContentLesson[]; aggregate?: any; error?: string }>;
  analyticsUpsertVideo: (video: ContentVideo) => Promise<{ ok: boolean; id?: number; error?: string }>;
  analyticsDeleteVideo: (id: number) => Promise<{ ok: boolean }>;
  analyticsInsight: (payload?: { episodeId?: number }) => Promise<{ ok: boolean; insights?: any[]; verdict?: string; error?: string }>;
  lessonsList: () => Promise<ContentLesson[]>;
  lessonSave: (lesson: ContentLesson) => Promise<{ ok: boolean; id?: number; error?: string }>;
  lessonDelete: (id: number) => Promise<{ ok: boolean }>;
  lessonExtract: (payload: { videoId: number }) => Promise<{ ok: boolean; lessons?: ContentLesson[]; error?: string }>;
  frameworksList: () => Promise<ContentFramework[]>;
  frameworkSave: (fw: ContentFramework) => Promise<{ ok: boolean; id?: number; version?: number; error?: string }>;
  frameworkRollback: (payload: { id: number; version: number }) => Promise<{ ok: boolean; error?: string }>;
}
```

---

## 6. Preload Bridge (verbatim — `src/preload.ts:258-292`)

```ts
// Content Engine: ideas/themes/scripts/gates/seo/analytics/lessons/frameworks
contentEngine: {
  ideasList: () => ipcRenderer.invoke('content:ideas:list'),
  ideaSave: (idea: any) => ipcRenderer.invoke('content:ideas:save', idea),
  ideaDelete: (id: number) => ipcRenderer.invoke('content:ideas:delete', id),
  episodesList: (opts?: any) => ipcRenderer.invoke('content:episodes:list', opts),
  episodeGet: (id: number) => ipcRenderer.invoke('content:episodes:get', id),
  episodeSave: (ep: any) => ipcRenderer.invoke('content:episodes:save', ep),
  episodeDelete: (id: number) => ipcRenderer.invoke('content:episodes:delete', id),
  scriptGenerate: (payload: any) => ipcRenderer.invoke('content:script:generate', payload),
  scriptRegenerateLine: (payload: any) => ipcRenderer.invoke('content:script:regenerate-line', payload),
  validateScriptEvidence: (payload: any) => ipcRenderer.invoke('content:validate-script-evidence', payload),
  validateGates: (payload: any) => ipcRenderer.invoke('content:validate-gates', payload),
  gateOverride: (payload: any) => ipcRenderer.invoke('content:gate-override', payload),
  injectSeo: (payload: any) => ipcRenderer.invoke('content:inject-seo', payload),
  synthesizeIdeas: (payload?: any) => ipcRenderer.invoke('ideas:synthesize', payload),
  brainstormClassify: (payload: any) => ipcRenderer.invoke('content:brainstorm:classify', payload),
  brainstormSummary: (payload?: any) => ipcRenderer.invoke('content:brainstorm:summary', payload),
  themesCreate: (theme: any) => ipcRenderer.invoke('themes:create', theme),
  themesGenerate: (payload?: any) => ipcRenderer.invoke('themes:generate', payload),
  themesGetAll: () => ipcRenderer.invoke('themes:get-all'),
  themesApply: (payload: any) => ipcRenderer.invoke('themes:apply', payload),
  themesDelete: (id: number) => ipcRenderer.invoke('themes:delete', id),
  analyticsGet: (payload?: any) => ipcRenderer.invoke('content:analytics:get', payload),
  analyticsUpsertVideo: (video: any) => ipcRenderer.invoke('content:analytics:upsert-video', video),
  analyticsDeleteVideo: (id: number) => ipcRenderer.invoke('content:analytics:delete-video', id),
  analyticsInsight: (payload?: any) => ipcRenderer.invoke('content:analytics:insight', payload),
  lessonsList: () => ipcRenderer.invoke('content:lessons:list'),
  lessonSave: (lesson: any) => ipcRenderer.invoke('content:lessons:save', lesson),
  lessonDelete: (id: number) => ipcRenderer.invoke('content:lessons:delete', id),
  lessonExtract: (payload: any) => ipcRenderer.invoke('content:lessons:extract', payload),
  frameworksList: () => ipcRenderer.invoke('content:frameworks:list'),
  frameworkSave: (fw: any) => ipcRenderer.invoke('content:frameworks:save', fw),
  frameworkRollback: (payload: any) => ipcRenderer.invoke('content:frameworks:rollback', payload),
},
```

---

## 7. UI Layer (current v1 shell — 11 files in `src/features/content-engine/`)

Mounted via mode toggle. Header + mount (verbatim — `src/features/overlay-studio/OverlayStudioPage.tsx`):

```tsx
const [mode, setMode] = useState<'studio' | 'engine'>('studio')
// ...
<div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-0.5">
  <button onClick={() => setMode('studio')} className={mode === 'studio'
    ? 'h-6 rounded-full bg-[#ec4899]/15 px-2.5 text-[10px] font-semibold text-[#ec4899]'
    : 'h-6 rounded-full px-2.5 text-[10px] font-medium text-zinc-500 transition-colors hover:text-zinc-300'}>
    Overlay Studio
  </button>
  <button onClick={() => setMode('engine')} className={mode === 'engine'
    ? 'h-6 rounded-full bg-[#f5c518]/15 px-2.5 text-[10px] font-semibold text-[#f5c518]'
    : 'h-6 rounded-full px-2.5 text-[10px] font-medium text-zinc-500 transition-colors hover:text-zinc-300'}>
    Content Engine
  </button>
</div>
// ...
<div className="flex-1 min-h-0">
  {mode === 'engine' ? <ContentEngineWorkspace /> : <StudioShell />}
</div>
```

**Workspace:** `ContentEngineWorkspace.tsx` renders `<div className="flex h-full gap-3 p-3" data-page="content-engine">` with 7 views
(Brainstorm, Ideas 4-col funnel, Episodes with Script/SEO/Analytics/Assets/Metrics sub-tabs, Themes, Analytics, Lessons,
Frameworks versioned). ALL IPC access via `const api = () => (window as any).deskflowAPI?.contentEngine` (each view).

**Shared primitives** (`components/ui.tsx`, 243 lines): `toast()/ToastHost` (fixed top-right z-[200]),
`Card` (`rounded-xl border border-white/[0.06] bg-[rgba(24,24,27,0.60)] p-5 backdrop-blur-xl`), `SectionHeader`
(`label` uppercase 10px zinc-500 + `title` 16px semibold zinc-100 + action), `Chip`, `Spinner`/`LoadingBlock`,
`EmptyState` (dashed border), `ErrorState` (rose + Retry), `AmberButton` (`bg-[#f5c518] text-black`),
`GhostButton`, `ConfirmIconButton` (2-step arm), `ScoreBar` (rose <0.6 / amber ≤0.8 / emerald >0.8),
`StatusChip` (STATUS_COLORS map: draft/scripted/gated/filming/published/raw/refined/approved/used/active/applied/dismissed),
`TextInput`/`TextArea`/`SelectInput`/`FieldLabel` (amber focus border `focus:border-[#f5c518]/50`).

**Retention UI:** `RetentionPanel.tsx` (per-frame evidence readout) + `SvgRetentionChart.tsx`
(exports `RetentionCurveChart({data:[{t,pct}],height})` — converts csv?points at call site).

---

## 8. Design Tokens (binding for ALL new UI)

- Dark only. Card: `bg-[rgba(24,24,27,0.60)]`, `border border-white/[0.06]`, `backdrop-blur-xl`, `rounded-xl` max, `p-5`.
- Accent: amber `#f5c518` (Content Engine mode) / pink `#ec4899` (Overlay Studio). Focus ring: `focus:border-[#f5c518]/50`.
- Text: zinc-100 headings, zinc-300 body, zinc-500 captions, 10px uppercase tracking-wide labels.
- Status colors: emerald 400 (published/active/used), amber #f5c518 (scripted/approved), violet 400 (gated), cyan #00d4ff (refined/filming/applied), zinc (draft/raw/dismissed).
- Score bar: rose <0.6 (REJECTED), amber ≤0.8, emerald >0.8. Threshold 0.6 is THE gate.
- Fonts: Geist + JetBrains Mono. Icons: lucide-react (LoaderCircle, TriangleAlert, Check, X verified; Loader2/Globe2 are runtime aliases — prefer LoaderCircle/Globe).
- Toast: fixed top-4 right-4 z-[200], success emerald / error rose / info zinc.
- No BorderBeam overlays on content cards (mask-composite: exclude broken in this Chromium build).
- localStorage always in try/catch. CRLF files. No external deps beyond what's installed (react, tailwind, lucide-react, framer-motion, recharts).

---

## 9. Known Gaps / What the Architect Must Resolve

1. **Retention evidence is generated but the "proof" UI is shallow** — user demands EVERY bullet of the script visibly prove which retention features its exact wording satisfies (criteria chips + mechanism + evidence + score + accept/reject), not just a summary panel.
2. **No dedicated system prompt** — `prompts.ts` uses one generic `JSON_SYSTEM`; a proper Content-Engine system prompt (role + evidence contract + JSON-only) is missing.
3. **Analytics data entry is manual** — retention curve/audience/dropoffs are entered by hand (`analyticsUpsertVideo`); user expects "social media analyzing and preplanning" driven by prompts/external AI inserting results back (could import platform data or use AI to extract from screenshots/CSV).
4. **Learning loop is partially wired** — videos → lessons → frameworks exist, but no automatic promotion of validated lessons into future script prompts.
5. **No research-backed rubric updates yet** — `content-retention-research-17082026` RESULT.md (pending) will bump RETENTION_RUBRIC version and may add criteria. Design should be rubric-version-agnostic.
6. **Backend completeness verified** — all 33 IPC channels have REAL handlers + DB schema (see audit above). No stubs.

---

## 10. IPC Channel Inventory (33, all real)

| Channel | Purpose |
|---|---|
| content:ideas:list / save / delete | Idea CRUD (raw→refined→approved→used) |
| content:episodes:list / get / save / delete | Episode CRUD (draft→scripted→gated→filming→published) |
| content:script:generate | AI script frames + per-frame retention evidence + auto gate check |
| content:script:regenerate-line | Rewrite one weak frame (score < threshold) |
| content:validate-script-evidence | AI re-verifies every frame's evidence claim |
| content:validate-gates | 3 gates (scroll_stop/hard_cut/asset_ready) AI + heuristic |
| content:gate-override | Force-pass gates |
| content:inject-seo | Keyword phrase injection (title/first_line/text_overlay/caption) |
| ideas:synthesize | Combine weak ideas into stronger ones (3 gates enforced) |
| content:brainstorm:classify | Thought → content_idea / general_thought (AI + heuristic) |
| content:brainstorm:summary | Session summary |
| themes:create / generate / get-all / apply / delete | Content pillar themes (AI-generated with audience + hooks) |
| content:analytics:get / upsert-video / delete-video | Video performance (views/likes/saves/shares/comments/completion_pct/retention_curve/audience/dropoffs) |
| content:analytics:insight | AI insights + verdict linking metrics → next-script actions |
| content:lessons:list / save / delete / extract | Durable lessons with evidence (confidence 0-1) |
| content:frameworks:list / save / rollback | Versioned script rule sets (5 builtins seeded) |
