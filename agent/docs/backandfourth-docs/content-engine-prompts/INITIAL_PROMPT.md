# Collaboration Request: Content Engine Prompt Improvement

## Your Role

You are the Specialist AI. I am the Project Owner AI. I know the codebase; you know how to design and architect solutions. We will collaborate through a structured back-and-forth to improve every prompt in the Content Engine.

## The Idea

The Content Engine has ~15 prompts that generate JSON for a short-form video creation pipeline. Several prompts are too short, lack creator context, or don't produce high-quality output. The user wants EVERY prompt improved so the AI produces comprehensive, actionable, production-ready output.

**The core problem:** Prompts like PROMPT_THEME_GENERATOR, PROMPT_VALIDATE_SCRIPT_EVIDENCE, PROMPT_HUMAN_REFLECTION, PROMPT_ANALYTICS_IMPORT, PROMPT_SCORE_CALIBRATION, PROMPT_PROCESS_SUMMARY, PROMPT_FRAMEWORK_UPDATE, PROMPT_VARIABLE_CORRELATION, and PROMPT_REGENERATE_LINE are either too bare (no creator context, no examples) or produce output that isn't specific enough to act on.

**The goal:** Every prompt should produce JSON that a 17-year-old Indonesian CS student can directly use to film a video — not generic advice, but specific, actionable output with concrete examples.

## Current Context (What I Have)

### Creator Profile (Clement)
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

### Retention Rubric v2.0.0 (14 criteria, threshold 0.6)
```
visual_hook [visual_hook] (timeline 0-0.5s, NON-NEGOTIABLE: true): A visual change in the first 0-0.5s breaks the scroll pattern before the viewer even hears the audio. — score: 0.0-1.0: perceptual mismatch strength of the opening frame vs the feed
verbal_hook [verbal_hook] (timeline 0.5-1.5s, NON-NEGOTIABLE: true): The spoken line within 0.5-1.5s names something the viewer immediately recognizes as theirs. — score: 0.0-1.0: how instantly the words grab attention
context_lock [context_lock] (timeline 1.5-3.0s, NON-NEGOTIABLE: true): By 1.5-3.0s the viewer knows exactly what this video is about and why it matters to them. — score: 0.0-1.0: clarity of topic + stakes within 3s
curiosity_gap [curiosity_gap] (timeline 3-10s, NON-NEGOTIABLE: true): Reveals partial information and withholds the payoff, so the viewer must keep watching to close the gap (Zeigarnik effect). — score: 0.0-1.0: how strongly an unanswered question is raised
pattern_interrupt [pattern_interrupt] (timeline 30-45s, NON-NEGOTIABLE: true): A scene change, prop, or shock value at 30-45s interrupts the viewing habit loop and re-locks attention. — score: 0.0-1.0: strength of perceptual mismatch against the established pattern
value_loop [value_loop] (timeline throughout, NON-NEGOTIABLE: true): Each segment delivers value in a loop: What (the claim), How (the mechanism), Why (the stakes) — so every 8-15s block pays off. — score: 0.0-1.0: completeness of What/How/Why within each value beat
three_cs [three_cs] (timeline throughout, NON-NEGOTIABLE: true): Lines are clear, short (under ~12 words), and sound like speech — never written paragraphs. — score: 0.0-1.0: average line length + jargon count + conversational tone
facial_expression [facial_expression] (timeline throughout, NON-NEGOTIABLE: false): Delivery uses exaggerated facial expressions mapped to the emotional beats of each line. — score: 0.0-1.0: presence and range of deliberate facial cues
pacing_pauses [pacing_pauses] (timeline throughout, NON-NEGOTIABLE: false): Delivery speed lands in 125-150 WPM with intentional pauses after key lines to let the point land. — score: 0.0-1.0: how close the line length sits to the WPM target + pause placement
acoustic_ducking [acoustic_ducking] (timeline editing, NON-NEGOTIABLE: false): Background music ducks -3dB to -6dB under the voice so the words are never buried. — score: 0.0-1.0: edit note presence + ducking range (-3 to -6 dB)
seamless_loop [seamless_loop] (timeline end, NON-NEGOTIABLE: false): The video ends where it began so a looped play does not feel like a restart. — score: 0.0-1.0: how well the last line/frame resolves into the first
hook_at_3_4s [hook_at_3_4s] (timeline 3-4s, NON-NEGOTIABLE: true): The hook PAYOFF lands at 3-4s — exactly where viewers drop off — never at second 0. — score: 0.0-1.0: payoff placement AND stakes clarity at the 3-4s mark
value_speed [value_speed] (timeline 0-8s, NON-NEGOTIABLE: true): The first payoff lands within 8 seconds of the video start (5-7s retention barrier). — score: 0.0-1.0: how fast value arrives
specific_pain [specific_pain] (timeline 0-10s, NON-NEGOTIABLE: true): Names a concrete pain, person, or risk the viewer immediately recognizes as theirs — with stakes stated first. — score: 0.0-1.0: how concretely the pain + stakes are named
```

Non-negotiable criteria: visual_hook, verbal_hook, context_lock, curiosity_gap, pattern_interrupt, value_loop, three_cs, hook_at_3_4s, value_speed, specific_pain

### Scoring Schemes
- **Signal Builder (tier A)**: Early channel (sub 1K). Every hook criterion matters most. Short videos (30-60s).
- **Audience Builder (tier B)**: Growing channel (1K-100K). Value delivery and retention curves dominate. 60-120s.
- **Media Operator (tier C)**: Established channel (100K+). Production craft and editing precision matter. 90-180s.

### Format Types (valid — "story" is BANNED)
- listicle: Hook + 3 items + CTA (30-40s). Mistakes, tips, steps, tools.
- proof_first: Hook + shocking proof + mechanism + CTA (25-35s). Security flaws, bugs, leaks.
- before_after: Hook + broken state + fixed state + how (30-40s). Refactors, optimizations.
- single_insight: Hook + one diagram + one explanation + CTA (20-30s). Math concepts, one-line tricks.
- concept_explainer: Hook + step-by-step + CTA (30-45s). Teaching a concept visually.
- hot_take: Hook + contrarian opinion + evidence + CTA (25-35s). Opinions, takes, debates.
- reaction: Hook + original clip + your reaction + verdict (30-45s). Reviews, hot takes.

### Hook Frameworks
- Shock-to-Logic: "Stop doing X. It's the reason you're getting Y."
- Specific Result: "I got [X-result] in [X-time] by doing this."
- Open Loop: "Wait for the last part — this is where everyone gets it wrong."
- Contrarian: "Unpopular opinion: [common advice] is actually holding you back."
- POV: "POV: You [do X]… and [bad outcome] still happens."
- Speed-Run: "How I [achieved X] in [absurdly short time]."
- Proof First: "[Concrete number/broken state]. Here's what that means."

### 3-Gate Validator (Non-Negotiable)
- GATE 1 SCROLL-STOP (0-3s): Hook is 3-6 words max. Names a specific pain or promise. Works on mute.
- GATE 2 HARD-CUT (0-30s): Entire video = 3-5 frames max. Each frame = one visual + one claim. Zero transitions required.
- GATE 3 ASSET-READY: Visuals for frames 2/3/4 ALREADY EXIST before recording.

### 3-Font Hierarchy
- Hook: Anton 64pt Yellow, 3px black stroke
- Body: League Spartan 48pt White, 3px black stroke
- Caption: Montserrat Bold 40pt White/Cyan, 3px black stroke

### Hidden SEO Phrases
- "machine learning from scratch" (first 5s, high-save niche)
- "Python tutorial" (flash as text, education bucket)
- "AI engineering" (say naturally, career-intent)
- "build in public" (say at close, community signal)
- "save this for later" (say at end, direct save trigger)
- "repo in bio" (say at end, profile visit signal)

### Algorithm Poison (NEVER say)
- "Hey guys", "In this video", "So basically", "Kind of", "Sort of"

### Content Equation
Content Score = (Hook_Strength × 0.25) + (Visual_Asset_Quality × 0.20) + (Audio_Match × 0.15) + (Value_Delivery_Speed × 0.20) + (Format_Consistency × 0.20)

### Visual Dynamics (3-Layer Rule)
- Layer 1: Main content (screen recording, code, diagram)
- Layer 2: Face cam (small, bottom-right 270×360px, 12px radius)
- Layer 3: Text overlay / annotation / animation

### Scene Switching Patterns
- Pattern A (A/B Cut): Face (3s) → Screen (5s) → Face (2s) → Screen (4s)
- Pattern B (Zoom Cascade): Wide (2s) → Medium (3s) → Close (2s) → Wide (2s)
- Pattern C (Split Screen): Left = "Wrong way" (red), Right = "Right way" (green)

### Sound Design
- Transitions: Whoosh (scene changes), Click (text appearing), Pop (badges), Ding (success)
- Music: Duck to 20% when speaking, ramp to 100% during pauses
- Tempo: 120-140 BPM for fast tutorials, 90-110 BPM for explanations

---

## THE PROMPTS TO IMPROVE

Below are ALL prompts in the Content Engine. For each one, I've noted what's wrong.

### 1. PROMPT_THEME_GENERATOR (TOO BARE)
```javascript
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
```

**Problem:** No creator context. No format type guidance. No hook framework reference. No gate validation. Output is generic.

### 2. PROMPT_VALIDATE_SCRIPT_EVIDENCE (TOO BARE)
```javascript
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
```

**Problem:** No creator context. No examples of good vs bad evidence. No guidance on how to rewrite failing frames.

### 3. PROMPT_HUMAN_REFLECTION (TOO BARE)
```javascript
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
```

**Problem:** No creator context. "story" still appears in format_fit options (BANNED). No examples of good reflections. No guidance on what makes a useful pattern extraction.

### 4. PROMPT_ANALYTICS_IMPORT (TOO BARE)
```javascript
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
```

**Problem:** No examples of raw text input. No guidance on how to handle messy OCR output. No validation rules.

### 5. PROMPT_SCORE_CALIBRATION (TOO BARE)
```javascript
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
```

**Problem:** No creator context. No guidance on what "accuracy" means for each criterion. No examples.

### 6. PROMPT_PROCESS_SUMMARY (TOO BARE)
```javascript
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
```

**Problem:** No creator context. No examples of what a good narrative looks like. No guidance on what "growth signal" means.

### 7. PROMPT_FRAMEWORK_UPDATE (TOO BARE)
```javascript
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
```

**Problem:** No creator context. No examples of good framework rules. No guidance on what makes a rule "actionable in script writing."

### 8. PROMPT_VARIABLE_CORRELATION (TOO BARE)
```javascript
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
```

**Problem:** No creator context. No examples of what "variables" means (hook length? format? posting time?). No guidance on what makes a recommendation actionable.

### 9. PROMPT_REGENERATE_LINE (TOO BARE)
```javascript
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
```

**Problem:** No creator context. No examples of good rewrites. No guidance on what makes a rewrite better than the original.

### 10. PROMPT_REGENERATE_LINE also has {{retention_rules}} but no example of what good evidence looks like.

---

## Context Gaps (What I Don't Have Yet)

1. **Example outputs for each prompt** — I don't have sample JSON outputs that show what "good" looks like for each prompt. If you need to see examples of good vs bad output, ask and I will fetch them.

2. **The actual IPC handlers** — I haven't included the backend code that calls these prompts. If you need to see how the prompts are assembled with template variables, ask and I will fetch `src/services/contentEngine/index.ts`.

3. **The UI components** — I haven't included the frontend code that displays the prompt output. If you need to see how the JSON is rendered, ask and I will fetch the relevant components.

4. **Real performance data** — I don't have examples of actual video analytics that would be fed into the analytics/lesson/reflection prompts. If you need to see what real data looks like, ask and I will fetch sample data.

## Conversation Protocol

**How we communicate:**

1. **You ask specific questions.** Format: `REQUEST: [specific file, schema, or clarification]`
2. **I fetch and respond.** Format: `CONTEXT: [file path]\n[actual source code]`
3. **You refine your understanding.** Ask follow-ups or propose a design.
4. **When ready, you produce RESULT.md.** Format follows our standard specification.

**Rules:**
- Do NOT assume context you don't have. Ask for it.
- Do NOT design for prompts whose backend doesn't exist. Flag them.
- Do NOT produce a monolithic answer. Iterate with me.
- When you need to see code, ask for the EXACT file path.

## Scope
- IN: All 10 prompts listed above. Improvements to creator context, examples, output format, actionability.
- OUT: New prompts (not requested). Changes to the rubric or scoring schemes. UI changes.

## Expected Output
After our conversation converges, produce:
1. **RESULT.md** — The complete improved version of every prompt
2. **Implementation Plan** — Which prompts change, what template variables are added/removed
3. **Backend Audit** — Any IPC handler changes needed to support new template variables

## First Question

Before I send you the full prompt source code, I need to confirm: **Do you understand the purpose of improving these prompts?** Specifically:

1. Each prompt generates JSON for a short-form video creation pipeline
2. The output must be actionable for a 17-year-old with $0 budget, 20 min max edit time, CapCut only
3. Every prompt must include the creator context (age, location, audience, brand, budget, platforms)
4. "story" is a BANNED format type — never appear in any output
5. The prompts must produce output that directly maps to UI components (ScriptProofCard, HookStackDisplay, etc.)

**Do you confirm you understand these 5 requirements?** If yes, I will send you the full prompt source code in the next message. If anything is unclear, ask now.
