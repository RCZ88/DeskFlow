# CONTEXT_BUNDLE.md — Content Retention Research (Short-Form Video Hooks)

> **Purpose:** Self-contained context for the target AI. You do NOT have repo access.
> Everything needed to design the retention system lives in this file.
> **Project:** RHEO / DeskFlow — Electron + React + TypeScript desktop app. The
> "Content Creation page" is **Overlay Studio** (`/studio` route, `src/features/overlay-studio/OverlayStudioPage.tsx`, exported as `FeatureStudioPage`).
> **Date:** 2026-08-17

---

## 1. THE USER'S RAW REQUIREMENTS (verbatim, do not lose these)

1. **Pattern Interrupt** — "change scenes, use a prop or shock value" — break the scroll pattern.
2. **Curiosity Gap** — "give some information that is not too much, that keeps people curious on what the next and result is." Example: instead of "scammers just hacked Google" → add **"and they may have access to your email"**.
3. **HOOK at the 3rd–4th second, NOT at the start** — "RETAINING THE VIEWERS ON TIMES WHERE THEY ACTUALLY DROP OFF."
4. **Attention Anchor** — example: **"Over 1 million users have already reported their account being hacked. Here's how to check if yours was."**
5. All 4 must be **adjusted according to the niche and the topic** being done.
6. The AI must do **FULL RESEARCH on what OTHER aspects to focus on** besides those 4.
7. **Every script bullet point must have evidence on how it meets those criteria** — and a design for **how to implement that in the system**.

---

## 2. CURRENT SYSTEM STATE (what exists today)

### 2.1 The content prompts that exist (src/lib/overlayPrompts.ts)

Only TWO prompts exist. **Neither contains Pattern Interrupt, Curiosity Gap, Attention Anchor, or hook timing rules.** The only hook-related rules are: "ALWAYS keep the first segment (the hook), role='hook'" and "A 'hook' scene (any renderer) must cover the first 5 seconds."

**PROMPT_CUT_PLANNER** — a strict JSON-only API prompt: takes a timestamped transcript, selects segments to KEEP (90–180s final cut), roles ∈ {hook, core, detail, cta}, every kept/cut segment gets a ≤12-word reason. Output schema: `{ video_id, target_duration, kept: [{segment_id, start, end, role, reason}], cut: [{segment_id, reason}] }`.

**PROMPT_SCENE_DSL** — a strict JSON-only API prompt: a motion-graphics director for 9:16 vertical tech-education video. Plans on-screen visuals from a transcript. Renderer menu: `card` (punchlines, max 8 words), `mermaid` (systems/hierarchies), `equation` (LaTeX), plus presumably chart/emoji-board/others. Rule: "a 'hook' scene must cover the first 5 seconds."

Both prompts end with strict self-check + forbidden-output sections (no text outside the JSON fence, no fields outside schema, no curly quotes).

### 2.2 How AI is called (provider chain)

- All AI calls go through `buildChain(feature)` → `runWithFallback(chain, req)` (src/services/providers/router.ts) → `callProvider` (src/services/providers/callProvider.ts).
- Features include: `researchDigest | goalAssistant | resumeBuilder | category | colors | lifeAssistant | monthlyRecap` — a new feature id must be added to this union for the retention pipeline.
- Provider templates (src/services/providers/templates.ts): `openrouter`, `cloudflare`, `ollama` (local http://localhost:11434), `github`, `google` (Gemini), `custom` (OpenAI-compatible). Users pick provider + API key in the Settings page; chain = assigned primary + automatic fallbacks among enabled providers.
- Every call is a standard OpenAI-compatible chat completions POST (or template-specific), timeout 120s default, 5-min cap. Responses are plain text — **the app must parse JSON itself** (current prompts demand "ONE valid JSON object inside ONE ```json code fence").

### 2.3 The v3.0 Content Engine spec (in flight, NOT yet built)

The app is being upgraded with a full Content Engine. Relevant pieces:

**3-Gate Content Format Validator** (run BEFORE filming; the single most important rule):
```
GATE 1 — Scroll-Stop:  Hook is 3–6 words AND names a specific pain?
GATE 2 — Hard-Cut:     Entire video = 3–5 frames, ZERO transitions needed?
GATE 3 — Asset-Ready:  Visuals for frames 2/3/4 ALREADY exist before record?
If ANY gate fails → DO NOT FILM. Pivot format or kill the idea.
```

**Content Equation (scoring model):**
```
Content Score = (Hook_Strength × .25) + (Visual_Asset_Quality × .20)
             + (Audio_Match × .15) + (Value_Delivery_Speed × .20)
             + (Format_Consistency × .20)
```

**Format Taxonomy** (works at 0 audience): Listicle (3 mistakes/3 tools) ✅, Proof-first demo ✅, Contrarian call ("Stop doing X") ✅. BANNED until audience exists: Framework explanation (becomes a TED talk), Long tutorial. Core principle: *"No audience privilege. Every video must be a self-contained punch. Ideas are cheap; format translation is the hard part."*

**Frame-based scripts** (new output format — one frame = one visual + one line):
```json
{ "frames": [
  {"time": "0:00-0:03", "visual": "Hook text card", "line": "3 mistakes killing your ML progress"},
  {"time": "0:03-0:11", "visual": "notebook + red X", "line": "You copied. You didn't build."}
]}
```

**Content frameworks to encode** (stored in a `frameworks` table): 3-Font Hierarchy (Hook = Anton 64pt Yellow 3px stroke · Body = League Spartan 48pt White · Caption = Montserrat Bold 40pt White/Cyan), Hook Constraints (max 6 words, stakes-first, "you"/"I", written for the ear, no abstract language), Format Rules (full-face upper-third, visual asset required, hard cut every 3–4s, face-cam bottom-right 270×360, right 320px + bottom 400px = NO TEXT zone), 4-Stage ML Learning (Python → NumPy → PyTorch → CUDA), 3 AM Rule (no strategy decisions after 10 PM).

**Hidden SEO keyword injector** (planned): phrases like "machine learning from scratch," "Python tutorial," "save this for later," "repo in bio," "build in public" into first-3s audio (ASR) + flash-text (OCR); avoid poison: "hey guys," "in this video," "so basically," "kind of."

**UI design tokens (Clement Dark Tech):** Background `#0a0a0f` · Surface `#14141b` · Primary (hooks) `#f5c518` · Secondary (code) `#00d4ff` · Text primary `#ffffff` · Text secondary `#a0a0b0` · Border `#2a2a35` · Radius 8px cards / 12px media · Font Inter.

**Planned prompt registry (PromptBuilder pipeline):** all prompts live as `{{placeholders}}` templates in one `/prompts` dir; every response must be JSON-only, schema-validated, max 2 retries then friendly error. Minimum set: `classification`, `synthesis`, `script_frames`, `gate_validator`, `seo_injector`, `theme_generator`, `analytics_insight`, `session_summary`.

### 2.4 Target video format (hard facts)

- 9:16 vertical (short-form, TikTok/Shorts/Reels).
- Duration target: 90–180 seconds (cut planner) but hook structure assumes retention at 0–3s is the cliff.
- Overlay system: hook/body/caption/bullet/keyword overlay types, safe zones (right 320px + bottom 400px = no text), hard cut every 3–4s.
- Content niches the user works: ML education ("machine learning from scratch," 4-Stage ML Learning), tech/security content (the Google-hack examples), Python tutorials, build-in-public.

---

## 3. WHAT THE RESEARCH MUST PRODUCE (summary of PROMPT.md)

1. **Full research** on retention psychology for 0–15s short-form video **beyond** the 4 given techniques — with concrete, cited techniques and the specific mechanic + example line for each.
2. **Evidence criteria system**: how EVERY script bullet/frame line proves it satisfies one or more retention criteria — including a machine-checkable schema (e.g., `evidence: [{criterion, mechanism, proof}]` per frame).
3. **Implementation design**: exact JSON schemas, prompt templates (with `{{placeholders}}`), and how the app's provider chain + frame-based output + Content Equation integrate the retention score.

See PROMPT.md for the full mandate.
