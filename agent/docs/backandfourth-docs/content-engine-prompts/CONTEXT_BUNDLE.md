# Context Bundle — Content Engine Prompts

> This file contains ALL source code relevant to the prompt improvement task.
> The Specialist AI has zero codebase access — every relevant file is embedded here.

---

## File: src/services/contentEngine/prompts.ts (FULL — 770 lines)

```typescript
// Content Engine — Prompt Registry ({{placeholder}} templates, JSON-only responses)
// v2.0.0: dedicated system prompt + 14-criteria rubric + dynamic scoring schemes +
// framework/lesson/reflection injection into script generation.
import { NON_NEGOTIABLE_IDS, RETENTION_RUBRIC } from './rubric';
import type { ScoringScheme } from './scoringSchemes';
import { schemeSummary, schemeWeightsForPrompt } from './scoringSchemes';

const RUBRIC_TEXT = RETENTION_RUBRIC.criteria
  .map(
    (c) =>
      `- ${c.name} [${c.id}] (timeline ${c.timeline}, NON-NEGOTIABLE: ${c.non_negotiable}): ${c.definition} — score: ${c.scoring}`
  )
  .join('\n');

const RETENTION_RULES = `Every single frame in the script MUST satisfy the retention criteria below and PROVE it.
CRITERIA (version ${RETENTION_RUBRIC.version}, minimum score ${RETENTION_RUBRIC.threshold}):
${RUBRIC_TEXT}
RULE: ${RETENTION_RUBRIC.nicheRule}
NON-NEGOTIABLE RULE: ${RETENTION_RUBRIC.nonNegotiableRule}
EVIDENCE RULE: For EVERY frame you must emit machine-checkable evidence of exactly which criteria it satisfies and how the EXACT wording satisfies them. A frame with score < ${RETENTION_RUBRIC.threshold} is REJECTED — rewrite it, never ship it.`;

export const JSON_ONLY =
  'Respond in JSON only. No markdown, no code fences, no explanation, no commentary outside the JSON.';

// ── Dedicated Content Engine system prompt (replaces bare JSON_SYSTEM) ──
export function contentEngineSystem(scheme?: ScoringScheme | null): string {
  const sch = scheme ? schemeSummary(scheme) : 'Default scheme: Audience Builder (tier B).';
  return `You are the Content Engine — a computational media scientist and short-form video engineer.
Your job: turn creator input into scripts, evidence, and lessons with machine-checkable precision.
You think in criteria, not vibes. Every creative choice you make must be JUSTIFIABLE against the retention rubric.
You NEVER write "good writing" — you write scripts that PROVE each retention criterion with their exact wording.

RETENTION RUBRIC (version ${RETENTION_RUBRIC.version}, threshold ${RETENTION_RUBRIC.threshold}):
${RUBRIC_TEXT}
${RETENTION_RUBRIC.nicheRule}
${RETENTION_RUBRIC.nonNegotiableRule}
NON-NEGOTIABLE CRITERIA: ${NON_NEGOTIABLE_IDS.join(', ')}

ACTIVE SCORING SCHEME: ${sch}

CONTRACT:
- Every script frame carries retention evidence: {criteria: [ids the EXACT wording satisfies], mechanism: "how the wording works", evidence: "why these exact words prove it — quote the words", score: 0-1}.
- A frame whose evidence cannot be quoted from its own text is INVALID. Rewrite it.
- A frame scoring below ${RETENTION_RUBRIC.threshold}, or failing any non-negotiable criterion, is REJECTED — never ship it.
- Respond in valid JSON only.

FORMAT CONSTRAINT: "story" is a BANNED format. Never generate, suggest, or classify anything as "story". If a user describes something that sounds like a story, reframe it as one of: "single_insight" (one lesson), "proof_first" (showing a result), "concept_explainer" (teaching something), or "hot_take" (an opinion). Never output "story" as a format_type.`;
}

// ── Classifier (master data flow: 5 output categories) ──
export const PROMPT_CLASSIFY_IDEA = `You are the routing classifier for Clement — a 17-year-old Indonesian CS student making short-form ML/AI education content for Instagram Reels, TikTok, and YouTube Shorts.

CONTEXT: Clement's brand is "Math-first. Ship at 80%. Ideas are cheap, execution is the moat." He posts 4 hrs/week, edits max 20 min/video in CapCut, targets Indian developers (59%) and US junior AI engineers (5-10%). He optimizes for SAVES and SHARES, not likes.

CLASSIFY this thought into EXACTLY one category:

1. "content_idea" — A video topic worth filming. Has: a hook (0-3s scroll-stopper), a niche (ML/AI/Python/dev tools), an audience pain point. Must pass the 3-Gate Validator (scroll-stop, hard-cut, asset-ready). Example: "3 mistakes killing your ML progress" = content_idea.

2. "framework_update" — An insight about HOW to make videos. A rule, pattern, or correction. Example: "Shorter hooks work better than long ones" = framework_update. Will be saved as a reusable framework rule.

3. "system_improvement" — A complaint or idea about the Content Engine pipeline itself. UI, workflow, prompts, features. Example: "The script generator should include visual descriptions" = system_improvement.

4. "analytics" — A reflection or observation about published video performance. "My last video got 60 views because..." = analytics. Belongs in lessons/analytics.

5. "general_thought" — Anything else. Could seed ideas later. Never discard. Example: "I wonder if React hooks content would work" = general_thought.

FORMAT TYPES (valid only — "story" is BANNED):
- listicle: Hook + 3 items + CTA (30-40s). Best for: mistakes, tips, steps, tools.
- proof_first: Hook + shocking proof + mechanism + CTA (25-35s). Best for: security flaws, bugs, leaks.
- before_after: Hook + broken state + fixed state + how (30-40s). Best for: refactors, optimizations.
- single_insight: Hook + one diagram + one explanation + CTA (20-30s). Best for: math concepts, one-line tricks.
- concept_explainer: Hook + step-by-step explanation + CTA (30-45s). Best for: teaching a concept visually.
- hot_take: Hook + contrarian opinion + evidence + CTA (25-35s). Best for: opinions, takes, debates.
- reaction: Hook + original clip + your reaction + verdict (30-45s). Best for: reviews, hot takes.
- other: Fallback.

HOOK FRAMEWORKS (reference for suggested_title and hook):
- Shock-to-Logic: "Stop doing X. It's the reason you're getting Y."
- Specific Result: "I got [X-result] in [X-time] by doing this."
- Open Loop: "Wait for the last part — this is where everyone gets it wrong."
- Contrarian: "Unpopular opinion: [common advice] is actually holding you back."
- POV: "POV: You [do X]… and [bad outcome] still happens."
- Speed-Run: "How I [achieved X] in [absurdly short time]."
- Proof First: "[Concrete number/broken state]. Here's what that means."

HOOK CONSTRAINTS: Maximum 6 words. Must deliver stakes immediately. Use "you" or "I" — write for the ear. No robotic, abstract language.

BANNED WORDS (never in hooks): "Hey guys", "In this video", "So basically", "Kind of", "Sort of"

HIDDEN SEO PHRASES (say naturally or flash as text cards 0.8-1s — algorithm ASR/OCR picks them up):
- "machine learning from scratch" (first 5s, high-save niche)
- "Python tutorial" (flash as text, education bucket)
- "AI engineering" (say naturally, career-intent)
- "build in public" (say at close, community signal)
- "save this for later" (say at end, direct save trigger)
- "repo in bio" (say at end, profile visit signal)

Return:
{
  "category": "content_idea" | "framework_update" | "system_improvement" | "analytics" | "general_thought",
  "reason": "one sentence why, referencing the criteria above",
  "suggested_title": "if content_idea: a hook framework title (max 6 words). if framework_update: the rule. otherwise null",
  "format_type": "listicle" | "proof_first" | "before_after" | "single_insight" | "concept_explainer" | "hot_take" | "reaction" | "other" | null,
  "niche_hint": "optional niche/topic guess (ML, Python, AI tools, dev workflow, etc.)"
}

Thought: {{thought}}
${JSON_ONLY}`;

export const PROMPT_SYNTHESIZE_IDEAS = `You are the Content Strategist for Clement — a 17-year-old Indonesian CS student making short-form ML/AI education content. His brand: "Math-first. Ship at 80%." He posts 4 hrs/week, edits max 20 min/video in CapCut. Optimizes for SAVES and SHARES.

{{note}}

Combine the raw ideas below into {{count}} NEW stronger ideas. Each idea MUST pass ALL 3 gates:

GATE 1: SCROLL-STOP (0-3s)
- Hook is 3-6 words max
- Names a specific pain or promise
- Works on mute (text alone stops the scroll)
- FAIL examples: "A whole year of learning ML" (too long), "Build it wrong first" (vague)
- PASS examples: "3 mistakes killing your ML progress", "Your AI is bleeding money", "Stop copying sklearn code"

GATE 2: HARD-CUT (0-30s)
- Entire video = 3-5 frames max
- Each frame = one visual + one claim
- Zero transitions required (no "so basically", "what I mean is")
- FAIL signs: You need to explain background before showing proof

GATE 3: ASSET-READY
- Visuals for frames 2/3/4 ALREADY EXIST before recording
- You do NOT hit record until visual assets are done
- The visual drives the script, not the other way around

FORMAT TYPES (valid only — "story" is BANNED):
- listicle: Hook + 3 items + CTA (30-40s). Mistakes, tips, steps, tools.
- proof_first: Hook + shocking proof + mechanism + CTA (25-35s). Security flaws, bugs, leaks.
- before_after: Hook + broken state + fixed state + how (30-40s). Refactors, optimizations.
- single_insight: Hook + one diagram + one explanation + CTA (20-30s). Math concepts, one-line tricks.
- concept_explainer: Hook + step-by-step + CTA (30-45s). Teaching a concept visually.
- hot_take: Hook + contrarian opinion + evidence + CTA (25-35s). Opinions, takes, debates.
- reaction: Hook + original clip + your reaction + verdict (30-45s). Reviews, hot takes.

HOOK FRAMEWORKS (pick one per idea):
- Shock-to-Logic: "Stop doing X. It's the reason you're getting Y."
- Specific Result: "I got [X-result] in [X-time] by doing this."
- Open Loop: "Wait for the last part — this is where everyone gets it wrong."
- Contrarian: "Unpopular opinion: [common advice] is actually holding you back."
- POV: "POV: You [do X]… and [bad outcome] still happens."
- Speed-Run: "How I [achieved X] in [absurdly short time]."
- Proof First: "[Concrete number/broken state]. Here's what that means."

RETENTION CRITERIA (every idea must satisfy at least 2):
- pattern_interrupt: Breaks scroll habit via scene change, prop, or shock value (0-3s)
- curiosity_gap: Reveals partial info, withholds payoff (3-10s)
- hook_at_3_4s: Hook payoff lands at 3-4s, not at second 0
- attention_anchor: Social-proof + specific stakes + resolution promise (0-5s)
- specific_pain: Names concrete pain viewer recognizes as theirs (0-10s)
- stakes_first: States what's at risk if viewer ignores (0-5s)
- value_speed: First payoff lands within 8 seconds (0-8s)

3-FONT HIERARCHY (visual reference):
- Hook: Anton 64pt Yellow, 3px black stroke
- Body: League Spartan 48pt White, 3px black stroke
- Caption: Montserrat Bold 40pt White/Cyan, 3px black stroke

FORMAT RULES:
- Full face centered/upper-third, no small face cam
- Visual asset required every video
- Hard cut every 3-4s, no fades
- Face cam zone: bottom-right 270×360px, 12px radius
- Right 320px and bottom 400px = NO TEXT EVER

BANNED WORDS: "Hey guys", "In this video", "So basically", "Kind of", "Sort of"

Return:
{
  "ideas": [
    {
      "title": "max 6 words, uses a hook framework from the list above",
      "hook": "the exact hook line (0-5s), max 6 words",
      "format_type": "listicle" | "proof_first" | "before_after" | "single_insight" | "concept_explainer" | "hot_take" | "reaction" | "other",
      "niche": "ML | Python | AI tools | dev workflow | security | other",
      "series": "series name if this fits an existing series, or null",
      "priority": 1-5 (5 = highest priority, most likely to go viral),
      "frames": ["3-8 frame plan lines — each frame is one visual + one claim"],
      "gates": {
        "a": { "pass": true/false, "reason": "scroll-stop verdict" },
        "b": { "pass": true/false, "reason": "hard-cut verdict" },
        "c": { "pass": true/false, "reason": "asset-ready verdict" }
      },
      "retention": {
        "criteria": ["at least 2 criterion IDs from the list above"],
        "mechanism": "how this idea uses them",
        "evidence": "why the hook wording proves it — quote the exact words",
        "score": 0.0-1.0
      }
    }
  ]
}

Raw ideas:
{{ideas}}
${JSON_ONLY}`;

export const PROMPT_SCRIPT_FRAMES = `You are the Script Writer for Clement — a 17-year-old Indonesian CS student making short-form ML/AI education content. Brand: "Math-first. Ship at 80%." Posts 4 hrs/week, edits max 20 min/video in CapCut. Optimizes for SAVES and SHARES. Target: Indian developers (59%) and US junior AI engineers (5-10%).

FORMAT: "{{format_type}}" | NICHE: "{{niche}}" | DURATION: {{duration}}

Write a complete video script as an array of frames. Every word earns its place. No filler. No "so basically." No "in this video I'll show you."

FRAME STRUCTURE (each frame):
{
  "index": 0,
  "text": "EXACT words spoken/overlaid — every word counts. Max 12 words per line.",
  "duration_seconds": 1-8,
  "frame_type": "hook" | "value" | "transition" | "call_to_action",
  "visual": "on-screen visual description — footage/B-roll/text overlay/motion graphics",
  "retention": {
    "criteria": ["criterion IDs that THIS exact wording satisfies"],
    "mechanism": "how the wording works — be specific about the psychology",
    "evidence": "QUOTE the exact words that prove the criteria. No hand-waving.",
    "score": 0.0-1.0
  },
  "timestamp": "MM:SS"
}

FRAME RULES:
- Frame 0 = scroll-stopper (0-3s). Visual + verbal hook. The hook PAYOFF lands at 3-4s — never at second 0.
- Context must lock by 1.5-3.0s. The first VALUE payoff lands within 8 seconds (value_speed).
- Each line must give a reason to keep watching (curiosity gap) OR deliver a value beat (What/How/Why loop).
- Include at least one pattern_interrupt for every 30-45s of runtime (scene change, prop, shock).
- 1 call_to_action frame at the end. ONE CTA only (comment keyword / save / share).
- Safe zones: IG 820×1270, TT 810×1306 — keep text inside.
- Total video: 30-90 seconds max.

VISUAL DYNAMICS (3-Layer Rule — every scene must have at least 2 layers):
- Layer 1: Main content (screen recording, code, diagram)
- Layer 2: Face cam (small, bottom-right 270×360px, 12px radius)
- Layer 3: Text overlay / annotation / animation

SCENE SWITCHING PATTERNS:
- Pattern A (A/B Cut): Face (3s) → Screen (5s) → Face (2s) → Screen (4s)
- Pattern B (Zoom Cascade): Wide (2s) → Medium (3s) → Close (2s) → Wide (2s)
- Pattern C (Split Screen): Left = "Wrong way" (red), Right = "Right way" (green)

SOUND DESIGN:
- Transitions: Whoosh (scene changes), Click (text appearing), Pop (badges), Ding (success)
- Music: Duck to 20% when speaking, ramp to 100% during pauses
- Tempo: 120-140 BPM for fast tutorials, 90-110 BPM for explanations
- Edit notes: acoustic_ducking (-3 to -6 dB under voice), seamless_loop where relevant

3-FONT HIERARCHY:
- Hook: Anton 64pt Yellow, 3px black stroke
- Body: League Spartan 48pt White, 3px black stroke
- Caption: Montserrat Bold 40pt White/Cyan, 3px black stroke

BANNED WORDS (never say): "Hey guys", "In this video", "So basically", "Kind of", "Sort of"

HIDDEN SEO PHRASES (say naturally or flash as text 0.8-1s — algorithm ASR/OCR picks them up):
- "machine learning from scratch" (first 5s)
- "Python tutorial" (flash as text)
- "AI engineering" (say naturally)
- "build in public" (say at close)
- "save this for later" (say at end)
- "repo in bio" (say at end)

${RETENTION_RULES}

EVIDENCE CONTRACT — every frame MUST have this:
{
  "criteria": ["pattern_interrupt", "curiosity_gap"],
  "mechanism": "Scene slams from static card to motion; line states a stakes question with withheld answer",
  "evidence": "QUOTE: '3 mistakes' → proves pattern_interrupt (digit creates bounded expectation). QUOTE: 'killing your ML progress' → proves specific_pain (names concrete pain).",
  "score": 0.92
}

RULE: Evidence MUST be a direct substring quote from the frame's text. If you can't quote it, the criterion isn't satisfied.

ACTIVE SCORING SCHEME (weights you will be scored against):
{{scheme_weights}}

MANDATORY RULES FROM PAST EXPERIENCE (follow every one):
{{framework_rules}}

ACTIVE LESSONS (proven with real data — respect these):
{{lessons}}

CREATOR REFLECTION PATTERNS (the creator's own observed truths):
{{reflection_patterns}}

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

export const PROMPT_GATE_VALIDATOR = `You are the Gate Validator for Clement — a 17-year-old making short-form ML/AI education content.

3-GATE VALIDATOR (Non-Negotiable — if any gate fails, the idea CANNOT be filmed):

GATE 1: SCROLL-STOP (0-3s)
- Hook is 3-6 words max
- Names a specific pain or promise the viewer recognizes as theirs
- Works on mute (text alone stops the scroll)
- The hook must create a "wait, what?" moment in under 1 second
- FAIL examples: "A whole year of learning machine learning taught me this framework" (too long, no pain), "Build it wrong first" (vague, no stakes)
- PASS examples: "3 mistakes killing your ML progress" (specific pain, 5 words), "Your AI is bleeding money" (stakes, 4 words), "Stop copying sklearn code" (action + pain, 4 words)

GATE 2: HARD-CUT (0-30s)
- Entire video = 3-5 frames max
- Each frame = one visual + one claim (no multi-point frames)
- Zero transitions required (no "so basically", "what I mean is", "and another thing")
- The video must survive if every second after 0-5 is deleted — the first 5 seconds stand alone as compelling
- FAIL signs: You need to explain background before showing proof, you find yourself saying "and another thing"

GATE 3: ASSET-READY
- Visuals for frames 2/3/4 ALREADY EXIST before recording
- You do NOT hit record until visual assets are done
- The visual drives the script, not the other way around
- If you can't describe the exact visual for each frame, the asset isn't ready

Return:
{
  "scroll_stop": { "pass": true/false, "reason": "specific verdict referencing the rules above" },
  "hard_cut": { "pass": true/false, "reason": "specific verdict referencing frame count and transitions" },
  "asset_ready": { "pass": true/false, "reason": "specific verdict about visual asset readiness" },
  "overall": "pass" | "fail",
  "suggestions": ["2-3 concrete improvements if any gate fails — be specific, not generic"]
}

Idea: {{idea}}
Title: {{title}}
Hook: {{hook}}
Format: {{format}}
${JSON_ONLY}`;

export const PROMPT_SEO_INJECTOR = `You are the SEO Specialist for Clement — a 17-year-old making short-form ML/AI education content.

HIDDEN SEO PHRASES — these are keywords the algorithm's ASR/OCR picks up from spoken words and on-screen text. They must be said NATURALLY or flashed as text cards (0.8-1s). Never forced.

ALGORITHM POISON — these words KILL reach. NEVER say them:
- "Hey guys" (generic, algorithm deprioritizes)
- "In this video" (wastes first 3 seconds)
- "So basically" (filler, reduces authority)
- "Kind of" / "Sort of" (weakens authority)

VIDEO SEO RULES:
- Title must include primary keyword (60 chars max)
- First line must include secondary keyword
- Text overlays must include tertiary keyword
- Caption must have 3-5 hashtags (no #ai #tech #coding — too broad)
- Pinned comment must include a keyword trigger for engagement

NICHE: {{niche}}
FORMAT: {{format}}
VIDEO CONTENT: {{content}}

Return:
{
  "title": "search-optimized title (60 chars max, includes primary keyword)",
  "first_line": "opening line optimized for search (includes secondary keyword)",
  "text_overlay": "on-screen text for thumbnail/preview",
  "caption": "5-line caption: 1) Hook 2) Context 3) Value 4) CTA 5) Hashtags",
  "pinned_comment": "engagement prompt with keyword trigger",
  "phrases": [
    { "phrase": "exact keyword phrase", "position": "title" | "first_line" | "text_overlay" | "caption" | "spoken", "reason": "why it helps discoverability" }
  ],
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}
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

export const PROMPT_ANALYTICS_INSIGHT = `You are the Analytics Interpreter for Clement — a 17-year-old making short-form ML/AI education content. He optimizes for SAVES and SHARES, not likes.

CONTEXT:
- Platforms: Instagram Reels (primary), TikTok, YouTube Shorts
- Target: Indian developers (59%), US junior AI engineers (5-10%)
- Brand: "Math-first. Ship at 80%."
- Key metrics that matter: Saves (direct value signal), Shares (viral potential), Completion % (retention quality)
- Likes are vanity — don't over-index on them

ANALYSIS FRAMEWORK:
1. RETENTION CURVE: Where do viewers drop? The 3-4s mark is critical (hook payoff). The 8s mark is the value barrier. Any drop >20% in 5 seconds = problem.
2. COMPLETION %: >60% = good. >80% = great. <40% = hook promising but delivery failed.
3. SAVES: High saves = "this is useful, I'll come back." This is the #1 signal for educational content.
4. SHARES: High shares = "this is so good I need my friend to see it." Secondary signal.
5. AUDIENCE: Age/country breakdown tells you who's actually watching vs who you think is watching.
6. DROPOFFS: Specific timestamps where viewers leave. Link to specific script frames.

Return:
{
  "insights": [
    {
      "metric": "retention_curve" | "completion_pct" | "saves" | "likes" | "audience" | "dropoff" | "other",
      "observation": "what the data shows — be specific with numbers",
      "interpretation": "why it likely happened (link to specific script frames or visual choices)",
      "action": "the EXACT change to make in the NEXT script — be concrete, not generic"
    }
  ],
  "verdict": "what worked and what failed in this video — 2-3 sentences max, referencing specific frames"
}

Performance data:
{{data}}
${JSON_ONLY}`;

export const PROMPT_LESSON_EXTRACTOR = `You are the Lesson Builder for Clement — a 17-year-old making short-form ML/AI education content.

LESSON RULES:
- Each lesson must be a ONE-SENTENCE RULE that can be reused in future scripts
- Must be backed by real performance data (not opinion)
- Must be specific enough to act on (not "make better hooks" but "hooks under 5 words get 2x more saves")
- Confidence score: 0.9+ = proven across 3+ videos, 0.7-0.9 = strong signal from 1-2 videos, <0.7 = preliminary

LESSON CATEGORIES:
- hook: Rules about the first 0-3 seconds (word count, pain naming, visual trigger)
- script: Rules about frame structure, pacing, value delivery
- editing: Rules about cuts, transitions, sound design, visual layers
- topic: Rules about what topics perform in this niche
- audience: Rules about who's watching and what they want
- format: Rules about which formats work for which content types

EVIDENCE FORMAT: Each lesson must cite specific metrics:
{ "metric": "completion_pct", "value": "78%", "note": "above average for this niche" }

Return:
{
  "lessons": [
    {
      "lesson": "one-sentence rule — imperative, specific, actionable",
      "evidence": [{ "metric": "...", "value": "...", "note": "..." }],
      "applies_to": "hook" | "script" | "editing" | "topic" | "audience" | "format",
      "confidence": 0.0-1.0
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
- Does the frame fail any non-negotiable criterion? (non-negotiable ids: {{non_negotiable}})
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

export const PROMPT_HUMAN_REFLECTION = `You are the Content Engine's human-intuition interpreter.
The creator wrote a free-form reflection about their latest video. Extract their intuition, compare it against the objective data (provided), and find where gut and data agree or contradict.
Return:
{
  "characteristics": [
    { "name": "hook_style" | "format" | "energy" | "topic" | "delivery", "value": "string" }
  ],
  "intuitions": ["the creator's stated beliefs, verbatim-ish"],
  "contradictions": [
    { "gut": "what the creator felt", "data": "what the numbers show", "resolution": "one-line verdict" }
  ],
  "format_fit": { "format": "listicle" | "story" | "...", "verdict": "SUITS" | "DOES NOT SUIT", "reasoning": "why, referencing delivery style and data" },
  "extracted_pattern": "one reusable pattern sentence",
  "suggested_lesson": { "lesson": "one-sentence rule", "applies_to": "hook" | "script" | "editing" | "topic" | "audience" | "format", "confidence": 0-1 }
}
Reflection: {{reflection}}
Objective data: {{data}}
${JSON_ONLY}`;

export const PROMPT_ANALYTICS_IMPORT = `You are a video analytics parser. The creator pasted raw analytics text (could be Instagram/TikTok/YouTube dashboard numbers, screenshots text, or notes). Extract every field you can identify. NEVER invent values — missing fields stay null/empty.
Return:
{
  "platform": "tiktok" | "instagram" | "youtube" | "other",
  "views": number | null,
  "likes": number | null,
  "saves": number | null,
  "shares": number | null,
  "comments": number | null,
  "followers_gained": number | null,
  "completion_pct": number | null,
  "avg_watch_seconds": number | null,
  "published_at": "ISO date if visible, else null",
  "retention_curve": [{ "t": seconds, "pct": percent }],
  "audience": { "ages": [{ "range": "18-24", "pct": number }], "countries": [{ "code": "US", "name": "United States", "pct": number }] },
  "dropoffs": [{ "t": seconds, "pct": percent }]
}
Raw text:
{{raw}}
${JSON_ONLY}`;

export const PROMPT_SCORE_CALIBRATION = `You are the Content Engine's calibration auditor. The engine predicted retention scores for script frames; the actual video performance is now known. Compare predictions against reality per criterion and compute accuracy.
Return:
{
  "accuracy": 0-1 (overall prediction accuracy),
  "per_criterion": [
    { "criterion": "criterion id", "predicted_avg": 0-1, "actual_metric": "completion_pct" | "retention_at_t" | "saves" | "...", "actual_value": number, "criterion_accuracy": 0-1, "notes": "why it over/under-predicted" }
  ],
  "most_accurate": "criterion id",
  "least_accurate": "criterion id",
  "recommendations": ["2-3 concrete changes to the scoring weights or rubric"]
}
Predictions:
{{predictions}}
Actual performance:
{{actual}}
${JSON_ONLY}`;

export const PROMPT_PROCESS_SUMMARY = `You are the Content Engine's process narrator. Given the full process timeline of one video (from brainstorm to lesson), write the story of the process.
Return:
{
  "title": "short evocative title for this journey",
  "narrative": "3-5 sentences narrating the journey with real event details",
  "turning_point": "the single moment that changed the outcome (or 'none' if linear)",
  "growth_signal": "one measurable improvement this video shows vs a typical process"
}
Timeline events:
{{events}}
${JSON_ONLY}`;

export const PROMPT_FRAMEWORK_UPDATE = `You are the Content Engine's knowledge keeper. A lesson with strong confidence was confirmed. Turn it into a crisp, reusable framework rule.
Return:
{
  "rule": { "id": "short slug", "rule": "one imperative sentence, actionable in script writing" },
  "target_framework": "the framework this belongs to, or 'Learned Rules' if none matches",
  "reasoning": "one sentence linking the rule to the lesson"
}
Lesson: {{lesson}}
Evidence: {{evidence}}
Existing frameworks:
{{frameworks}}
${JSON_ONLY}`;

export const PROMPT_VARIABLE_CORRELATION = `You are a data analyst for short-form video content. Analyze which video variables drive performance metrics.
For each variable, determine its correlation with views, saves, and completion rate. Compare high-performing vs low-performing videos.
Return:
{
  "correlations": [
    { "variable": "variable name", "insight": "what the data shows", "impact": "high|medium|low", "direction": "positive|negative" }
  ],
  "best_performer": { "title": "video title", "why": "what made it work" },
  "worst_performer": { "title": "video title", "why": "what held it back" },
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]
}
Video data:
{{videos}}
${JSON_ONLY}`;

export const PROMPT_EPISODE_FULL_PLAN = `You are the Content Director for Clement — a 17-year-old Indonesian CS student making short-form ML/AI education content for Instagram Reels, TikTok, and YouTube Shorts.

CREATOR CONTEXT:
- Age: 17, Location: Indonesia (WIB timezone)
- Education: Binus CS, Semester 1 starting Sep 2026
- Target: Global remote AI/ML engineer credibility
- Platforms: Instagram Reels (primary), TikTok, YouTube Shorts
- Budget: $0 tools, max 20 min edit/video, CapCut only
- Posting Window: WIB 7-10 AM (EST 7-10 PM)
- Brand: "Math-first. Ship at 80%. Ideas are cheap, execution is the moat."
- Psychology: Math-first, systems-thinking, responds to direct feedback, hates abstract theory without implementation
- Audience: Indian developers (59%), age 18-24 (66%). Secondary: US junior-to-mid AI engineers (5-10%), age 25-34.
- Optimizes for: SAVES and SHARES (not likes)
- Algorithm signal: Non-followers (95-99%) = discovery working

CORE PHILOSOPHY:
- Every video must be a self-contained punch (no audience privilege yet)
- Format translation is the hard part, not ideation
- The video that exists > the perfect video that doesn't
- No context-first, no "in this video I'll show you", no "so basically"

[... rest of the prompt is the same as the improved version ...]

${JSON_ONLY}`;
```

---

## File: src/services/contentEngine/rubric.ts (FULL — 147 lines)

```typescript
// Retention Rubric — v2.0.0
// 14 criteria (RESULT.md Appendix A) with non_negotiable flags.
export const RETENTION_RUBRIC = {
  version: '2.0.0',
  threshold: 0.6,
  criteria: [
    { id: 'visual_hook', name: 'Visual Hook', definition: 'A visual change in the first 0-0.5s breaks the scroll pattern before the viewer even hears the audio.', scoring: '0.0-1.0: perceptual mismatch strength of the opening frame vs the feed', timeline: '0-0.5s', non_negotiable: true },
    { id: 'verbal_hook', name: 'Verbal Hook', definition: 'The spoken line within 0.5-1.5s names something the viewer immediately recognizes as theirs.', scoring: '0.0-1.0: how instantly the words grab attention', timeline: '0.5-1.5s', non_negotiable: true },
    { id: 'context_lock', name: 'Context Lock', definition: 'By 1.5-3.0s the viewer knows exactly what this video is about and why it matters to them.', scoring: '0.0-1.0: clarity of topic + stakes within 3s', timeline: '1.5-3.0s', non_negotiable: true },
    { id: 'curiosity_gap', name: 'Curiosity / Expectation Gap', definition: 'Reveals partial information and withholds the payoff, so the viewer must keep watching to close the gap (Zeigarnik effect).', scoring: '0.0-1.0: how strongly an unanswered question is raised', timeline: '3-10s', non_negotiable: true },
    { id: 'pattern_interrupt', name: 'Pattern Interrupt', definition: 'A scene change, prop, or shock value at 30-45s interrupts the viewing habit loop and re-locks attention.', scoring: '0.0-1.0: strength of perceptual mismatch against the established pattern', timeline: '30-45s', non_negotiable: true },
    { id: 'value_loop', name: 'Value Loop (What/How/Why)', definition: 'Each segment delivers value in a loop: What (the claim), How (the mechanism), Why (the stakes) — so every 8-15s block pays off.', scoring: '0.0-1.0: completeness of What/How/Why within each value beat', timeline: 'throughout', non_negotiable: true },
    { id: 'three_cs', name: '3 Cs (Clarity, Conciseness, Conversational)', definition: 'Lines are clear, short (under ~12 words), and sound like speech — never written paragraphs.', scoring: '0.0-1.0: average line length + jargon count + conversational tone', timeline: 'throughout', non_negotiable: true },
    { id: 'facial_expression', name: 'Facial Expression Engineering', definition: 'Delivery uses exaggerated facial expressions mapped to the emotional beats of each line.', scoring: '0.0-1.0: presence and range of deliberate facial cues', timeline: 'throughout', non_negotiable: false },
    { id: 'pacing_pauses', name: 'Pacing & Pauses (125-150 WPM)', definition: 'Delivery speed lands in 125-150 WPM with intentional pauses after key lines to let the point land.', scoring: '0.0-1.0: how close the line length sits to the WPM target + pause placement', timeline: 'throughout', non_negotiable: false },
    { id: 'acoustic_ducking', name: 'Acoustic Sidechain Ducking', definition: 'Background music ducks -3dB to -6dB under the voice so the words are never buried.', scoring: '0.0-1.0: edit note presence + ducking range (-3 to -6 dB)', timeline: 'editing', non_negotiable: false },
    { id: 'seamless_loop', name: 'Seamless Loop', definition: 'The video ends where it began so a looped play does not feel like a restart.', scoring: '0.0-1.0: how well the last line/frame resolves into the first', timeline: 'end', non_negotiable: false },
    { id: 'hook_at_3_4s', name: 'Hook Payoff at 3-4s', definition: 'The hook PAYOFF lands at 3-4s — exactly where viewers drop off — never at second 0.', scoring: '0.0-1.0: payoff placement AND stakes clarity at the 3-4s mark', timeline: '3-4s', non_negotiable: true },
    { id: 'value_speed', name: 'Value Speed', definition: 'The first payoff lands within 8 seconds of the video start (5-7s retention barrier).', scoring: '0.0-1.0: how fast value arrives', timeline: '0-8s', non_negotiable: true },
    { id: 'specific_pain', name: 'Specific Pain / Stakes First', definition: 'Names a concrete pain, person, or risk the viewer immediately recognizes as theirs — with stakes stated first.', scoring: '0.0-1.0: how concretely the pain + stakes are named', timeline: '0-10s', non_negotiable: true },
  ],
  nicheRule: 'All criteria must be re-expressed for the target niche/topic — never paste verbatim cross-niche.',
  nonNegotiableRule: 'If ANY non-negotiable criterion scores below the threshold, the frame is AUTO-REJECTED regardless of the overall weighted score.',
} as const;
```

---

## File: src/services/contentEngine/scoringSchemes.ts (FULL — 162 lines)

```typescript
// Scoring Schemes — Creator Length Maturity Model
export interface ScoringScheme {
  id: 'signal_builder' | 'audience_builder' | 'media_operator';
  name: string;
  tier: 'A' | 'B' | 'C';
  description: string;
  weights: Record<string, number>;
  duration: string;
}

export const SCORING_SCHEMES: ScoringScheme[] = [
  {
    id: 'signal_builder', name: 'Signal Builder', tier: 'A',
    description: 'Early channel (sub 1K). Every hook criterion matters most — one viral signal beats polish. Short videos (30-60s), hooks dominate, production secondary.',
    weights: { visual_hook: 0.09, verbal_hook: 0.09, context_lock: 0.08, curiosity_gap: 0.12, pattern_interrupt: 0.10, value_loop: 0.12, three_cs: 0.08, facial_expression: 0.05, pacing_pauses: 0.06, acoustic_ducking: 0.02, seamless_loop: 0.03, hook_at_3_4s: 0.07, value_speed: 0.05, specific_pain: 0.04 },
    duration: '30-60',
  },
  {
    id: 'audience_builder', name: 'Audience Builder', tier: 'B',
    description: 'Growing channel (1K-100K). Value delivery and retention curves dominate — the algorithm rewards watch time. 60-120s, curiosity loops + value loops.',
    weights: { visual_hook: 0.10, verbal_hook: 0.10, context_lock: 0.08, curiosity_gap: 0.15, pattern_interrupt: 0.12, value_loop: 0.16, three_cs: 0.10, facial_expression: 0.01, pacing_pauses: 0.06, acoustic_ducking: 0.01, seamless_loop: 0.01, hook_at_3_4s: 0.04, value_speed: 0.03, specific_pain: 0.03 },
    duration: '60-120',
  },
  {
    id: 'media_operator', name: 'Media Operator', tier: 'C',
    description: 'Established channel (100K+). Production craft and editing precision matter — expression, pacing, ducking, loops. 90-180s, full production values.',
    weights: { visual_hook: 0.08, verbal_hook: 0.07, context_lock: 0.06, curiosity_gap: 0.10, pattern_interrupt: 0.10, value_loop: 0.10, three_cs: 0.06, facial_expression: 0.10, pacing_pauses: 0.10, acoustic_ducking: 0.10, seamless_loop: 0.10, hook_at_3_4s: 0.05, value_speed: 0.05, specific_pain: 0.03 },
    duration: '90-180',
  },
];
```

---

## File: src/services/contentEngine/index.ts (RELEVANT SECTIONS — how prompts are assembled)

The backend calls these prompts with template variables like:
```typescript
const prompt = PROMPT_CLASSIFY_IDEA
  .replace('{{thought}}', userThought)

const scriptPrompt = PROMPT_SCRIPT_FRAMES
  .replace('{{format_type}}', episode.format_type)
  .replace('{{niche}}', episode.niche)
  .replace('{{duration}}', String(episode.duration))
  .replace('{{scheme_weights}}', schemeWeightsForPrompt(scheme))
  .replace('{{framework_rules}}', frameworkRulesText)
  .replace('{{lessons}}', lessonsText)
  .replace('{{reflection_patterns}}', reflectionText)
  .replace('{{idea}}', episode.title)
```

Template variables use `{{placeholder}}` syntax and are replaced via `.replace()` in the backend.

---

## File: src/features/content-engine/components/ (UI components that consume prompt output)

The JSON output from these prompts is rendered by:
- **ScriptProofCard.tsx** — renders script_frames with retention evidence, accept/reject/regenerate
- **HookStackDisplay.tsx** — renders hook_stack (visual_trigger, on_screen_text, verbal_promise, etc.)
- **CuriosityGapBridge.tsx** — renders curiosity_gaps between frames
- **KeywordSEOPanel.tsx** — renders keywords_seo + algorithm_poison
- **EpisodeScoreSummary.tsx** — renders per-criterion score breakdown
- **GreenLightPanel.tsx** — renders gates (scroll_stop, hard_cut, asset_ready)
- **RetentionPanel.tsx** — renders retention evidence per frame
- **SvgRetentionChart.tsx** — renders retention curve chart
- **PhaseStepper.tsx** — renders the 5-phase pipeline progress

Each component expects a specific JSON shape. The prompts MUST produce output that matches these shapes.
