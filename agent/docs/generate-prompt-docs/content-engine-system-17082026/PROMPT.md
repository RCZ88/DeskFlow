# PROMPT — Content Engine System Construction (2026-08-17)

> **TARGET AI:** You are the **Lead Designer AND Lead Engineer** of this system.
> **MANDATORY FIRST STEP:** Read `CONTEXT_BUNDLE.md` (same folder) IN FULL. You have NO access to the codebase — that file is your only window. It contains verbatim backend source, renderer types, preload bridge, UI layer, design tokens, known gaps, and a 33-channel IPC inventory.
> **OUTPUT:** ONE comprehensive design document → `RESULT.md` (structure mandated at the end). A single best complete solution — never options A/B/C, never "I can't decide".

---

## Raw Request (verbatim — do not reinterpret)

> "for every single bullet point of the script include actual elements of those retention
> features, to show/prove that the script and exact wording of every single bullet point
> meet those features properly. design a UI system for that alongside the fact that it
> always utilizes prompts and external AI tools and inserting the results back into the app.
> it is not only an editing software... it is the ENTIRE scripting side, entire planning side,
> social media analyzing and preplanning side, learning from mistakes, learning from video
> data (retention times, likes, audience age/country, percentage that watches until the end,
> people that save the video, all of those)."

Follow-up demand: "WHERES THE PROMTP FOR CONSTURCTING HE SYSTME AND EVREYTHING??" — the
system must be COMPLETE. Nothing may be "too minor" to include. Every directive above is
binding.

---

## Problem Statement

The Content Engine backend v1 is REAL and verified: 33 IPC channels with genuine handlers,
6 SQLite tables, provider-chain AI calls (`buildChain(pState,'contentEngine')` +
`runWithFallback`), JSON-only parsing contract, 10 prompt templates, retention rubric
v1.0.0 (7 criteria, threshold 0.6). A v1 UI shell (11 files) is mounted inside Overlay
Studio via a mode toggle. See CONTEXT_BUNDLE.md §3, §4, §6, §7, §10.

What the user demands is the COMPLETE system, of which the backend is the foundation:

1. **Per-bullet retention proof (gap §9.1):** every single bullet point of the script must
   visibly prove which retention features its exact wording satisfies — criteria chips,
   mechanism, evidence quoting the bullet's own words, score, accept/reject. The current
   proof UI is a shallow summary panel.
2. **A dedicated system prompt (gap §9.2):** `prompts.ts` reuses one generic `JSON_SYSTEM`;
   the Content Engine needs its own system prompt encoding the evidence contract.
3. **Prompt + external-AI-driven analytics (gap §9.3):** social media analyzing and
   preplanning — data (retention times, likes, audience age/country, % watch-to-end,
   saves) enters via prompts/external AI tools and the results are inserted back into the
   app, not hand-typed.
4. **Learning-from-mistakes loop (gap §9.4):** videos → lessons → frameworks exist but
   nothing automatically promotes validated lessons into future script prompts.
5. **Rubric-version-agnostic design (gap §9.5):** the research round will bump
   RETENTION_RUBRIC; the UI/logic must not hardcode criteria.

**Backend completeness (verified, §10):** all 33 channels are real — no stubs. Design
extends this surface; never proposes replacing it.

---

## The Mandate

Design a comprehensive solution for the COMPLETE Content Engine system as the Lead
Designer AND Lead Engineer — owning the entire solution from data-processing logic to
pixels. The user's list is the scope: "ENTIRE scripting side, entire planning side,
social media analyzing and preplanning side, learning from mistakes, learning from video
data (retention times, likes, audience age/country, percentage that watches until the
end, people that save the video, all of those)."

---

## Engineering Task — Data Processing Pipeline

Design the exact data flow for each pipeline stage. For EVERY new capability specify:
IPC channel name(s) (following the `content:*` naming), preload bridge method(s), service
function(s), DB schema (columns/tables, guarded-migration style), and the full prompt
template text. Follow the patterns visible in CONTEXT_BUNDLE.md §4, §5, §6.

1. **Script-frame generation & evidence enforcement.** Trace the current flow
   (`content:script:generate` → PROMPT_SCRIPT_FRAMES → frames[] with per-frame
   `retention:{criteria,mechanism,evidence,score}` → gate check). Design the full
   pipeline: input composition (title/goal/audience + ACTIVE framework + VALIDATED
   lessons + theme hooks auto-injected), the evidence contract (evidence MUST quote the
   exact wording/beat of the frame it proves — EVIDENCE RULE), score enforcement
   (score < 0.6 = REJECTED), auto-regeneration of weak frames, the
   `content:validate-script-evidence` re-verification pass, and gates
   (scroll_stop / hard_cut / asset_ready) with heuristic fallback. Specify exact
   math: score computation, threshold behavior, regeneration retry budget.
2. **Dedicated Content Engine system prompt.** Write the FULL system prompt text: role
   (short-form video retention engineer), the evidence contract, JSON-only output rules,
   rubric-version awareness (criteria IDs as data), anti-hallucination rule (evidence
   must be quotable from the frame), tone/structure rules for each template that consumes it.
3. **Analytics ingestion & insight pipeline.** Design how "social media analyzing and
   preplanning" happens via prompts + external AI tools with results inserted back:
   paste/import of platform exports (CSV/JSON/text) → AI normalization → rows in
   `content_videos`; retention-curve normalization to 0–100% buckets; exact aggregation
   formulas (views, likes, saves, shares, comments, completion %, avg retention —
   extend `aggregateVideos`); AI insight generation (`content:analytics:insight`) with
   verdicts linking metrics → next-script actions; audience age/country + dropoffs
   storage and rendering shapes.
4. **Learning-from-mistakes loop.** Design: lesson extraction (`content:lessons:extract`)
   input composition (published video + its analytics + verdicts), confidence scoring
   (what evidence raises/lowers it), auto-promotion (validated lessons + active framework
   injected into future `PROMPT_SCRIPT_FRAMES` calls), framework versioning/rollback
   (`content:frameworks:*`), and the exact prompt-text injection format.
5. **Backend additions audit.** Enumerate every new IPC/service/DB/prompt item the above
   requires in a table, each mapped to the pattern it extends. Backend gaps are NOT
   allowed to become stubs — every one must be fully specified.

---

## Design Task — High-Fidelity Visual Specs

Design the complete UI system. Component tree, per-component specs (exact hex codes from
CONTEXT_BUNDLE.md §8, spacing, typography, states), every view covering ALL 4 states
(empty / loading / error / populated). The centerpiece is the per-bullet proof UI:

1. **Script proof view (per bullet):** bullet text rendered EXACTLY as written; retention
   criteria chips (driven by `RETENTION_CRITERIA_IDS` — never hardcoded), mechanism line,
   evidence block that quotes the bullet's own wording, ScoreBar (rose <0.6 REJECTED /
   amber ≤0.8 / emerald >0.8), Accept/Reject controls, regenerate-weak-line action, and a
   per-episode retention curve (`SvgRetentionChart`, frame markers at each bullet's
   position). Design how a rejected bullet is visually distinct (never ambiguous).
2. **Script workspace:** frame list with overall episode score, gates panel
   (scroll_stop / hard_cut / asset_ready with AI verdict + override), SEO injection
   preview, publish flow.
3. **Analytics dashboard:** headline stats (NumberTicker), retention curve, views/likes/
   saves/shares/comments, % watch-to-end, audience age/country, dropoffs; AI insight
   cards with verdicts; prompt-driven import entry point ("paste platform export").
4. **Learning loop views:** lessons list (confidence bars, applied status, evidence),
   frameworks viewer (versioned, rollback), and an indicator showing which lessons/
   framework were injected into the last script generation.
5. **Planning views:** brainstorm, ideas funnel (raw→refined→approved→used), themes —
   polish to the same token standard; no AI slop.

Every component: name, props, states, tokens, spacing. Typography: Geist + JetBrains Mono,
10px uppercase tracking-wide labels, zinc-100/300/500 hierarchy. Dark only.

---

## UX Task — Interaction Flow

Specify the interaction flows end-to-end:

1. **Script journey:** new episode → generate script (loading state with visible AI
   progress) → review proof per bullet (accept / reject / regenerate) → re-verify
   evidence → gate check → publish.
2. **Post-publish journey:** import analytics (paste/upload → AI parse → confirm →
   saved) → insights with verdicts → lesson extraction → framework update → NEXT script
   generation visibly inherits lessons + framework.
3. Every AI call: explicit generating→done→error states, no silent failures; toast
   feedback (ToastHost pattern); progressive disclosure (details expandable);
   keyboard + focus + hover states; destructive actions need the 2-step confirm pattern
   (ConfirmIconButton).
4. Empty/loading/error states for EVERY view (EmptyState dashed-border, LoadingBlock,
   ErrorState with Retry — §7 primitives). Human-comprehension is a hard requirement:
   a human must always know what the AI did, why, and what to do next.

---

## Constraints (hard limits — do not violate)

1. Read CONTEXT_BUNDLE.md fully first. Every design element must map to code in it.
2. All 33 existing IPC channels are REAL and stay. New channels follow the §6 preload
   bridge pattern + §5 d.ts types. DB changes use guarded migrations (§4.4 patterns).
3. AI calls: JSON-only via the responseParser contract (§4.3); provider chain feature id
   `contentEngine`; maxTokens default 2000; every prompt template full text included.
4. NO new npm dependencies. Installed set only: react, tailwind v4, lucide-react,
   framer-motion, recharts.
5. Threshold 0.6 is THE gate. ScoreBar colors fixed (rose/amber/emerald).
6. Design tokens §8 binding: dark only, `bg-[rgba(24,24,27,0.60)]` glass, `rounded-xl`
   max, `p-5`, amber `#f5c518`, focus `#f5c518/50`. NO BorderBeam overlays on content
   cards (broken mask-composite in this Chromium build).
7. localStorage always in try/catch. Files CRLF. Renderer→main ONLY via
   `window.deskflowAPI.contentEngine.*`.
8. Rubric-version-agnostic: criteria lists are data (`RETENTION_CRITERIA_IDS`), never
   hardcoded UI rows; the research round will bump RETENTION_RUBRIC — design survives that.
9. RESULT.md must be implementable by an agent WITH repo access: exact file paths,
   function names, component names, prompt texts, SQL. No vagueness.
10. Single comprehensive solution. No A/B/C menus. No "could also" hedging.

---

## MANDATORY: MCP Inventory + Skills List (frontend system)

### A. Design skills the implementer MUST apply (in this order)

1. **Frontend Design** — DeskFlow-specific component patterns, tokens, spacing, typography, glass cards
2. **Human-Centric UX** — empty/loading/error states, progressive disclosure, visual hierarchy, feedback
3. **Impeccable** — 7 design dimensions (typography, color, spatial, motion, interaction, responsive, UX writing), 27 anti-patterns
4. **Motion — Bring the UI Alive** — Liveliness Levels (L1 Composed / L2 Responsive / L3 Expressive), motion taxonomy, recipes
5. **UI UX Pro Max** — industry-specific design rules (dev tools, AI/ML, financial), style library
6. **Design Taste System** — master aggregator, design variance knobs, anti-repetition rules
7. **frontend-external-infra** — source routing, re-skin rules, anti-slop checklist

### B. Real MCP component inventory (actual names — use these, not invented ones)

| Component | Source | Use for |
|-----------|--------|---------|
| card, dialog, sheet, tabs, accordion, collapsible, separator, popover, dropdown-menu, tooltip | shadcn/ui v4 | Base UI structure |
| input, textarea, select, native-select, field, label, checkbox, radio-group, switch, slider, kbd | shadcn/ui v4 | Forms & inputs |
| chart (recharts), table, progress, skeleton, empty, spinner, badge, button, button-group, avatar | shadcn/ui v4 | Data display & feedback |
| sonner, alert, alert-dialog, scroll-area, breadcrumb, calendar, command, combobox, hover-card, menubar, pagination, resizable, toggle, toggle-group, carousel, message, message-scroller | shadcn/ui v4 | Composites |
| number-ticker | Magic UI | Animated stat counters (views/likes/saves/completion %) |
| animated-circular-progress-bar | Magic UI | Episode/lesson confidence gauges |
| particles | Magic UI | Subtle background depth (pointer-events-none) |
| shimmer-button | Magic UI | Primary AI actions (generate/import) — re-skin to amber |
| animated-beam | Magic UI | Optional pipeline connections (sparingly) |
| marquee | Magic UI | Display-only decorative rows (never over interactive content) |
| LoaderCircle, TriangleAlert, Check, X, Plus, RefreshCw, Sparkles, Wand2, TrendingUp, Save, Trash2, Download, Upload, LineChart, BarChart3, PieChart, Target, BookOpen, Repeat, BadgeCheck, Video, FileText, Layers, Lightbulb, Brain, CircleDot | lucide-react (installed) | Icons (LoaderCircle/Globe preferred; Loader2/Globe2 are runtime aliases only) |
| 135+ animated components (TextAnimations, Particles, HoverEffects, Backgrounds, Buttons) | React Bits | Motion variations |
| 200k+ icons across 200+ sets | Iconify | Icon fallback |
| multiline_chart, area_chart, donut_small, bar_chart, leaderboard, query_stats, monitoring, data_exploration, rubric, score, show_chart | Material Symbols (google-design) | Chart/analytics icon language reference |

### C. Anti-Slop Checklist (binding after ANY sourced component)

1. Re-skin to DeskFlow tokens (colors → §8 values; no library default colors)
2. Max `rounded-xl`, `p-5` padding
3. Dark mode only
4. Geist + JetBrains Mono fonts
5. Glass layer (`bg-[rgba(24,24,27,0.60)]` + `backdrop-blur-xl`)
6. No purple-gradient heroes, no default-UI looks, no invented icons — icons from lucide-react only
7. Every view has its 4 states; every AI action shows progress; no silent failures

---

## Output Format — RESULT.md (mandatory structure)

Produce ONE `RESULT.md` with these sections, in order:

1. **Executive Summary** — what the complete system is, one paragraph.
2. **System Architecture** — data-flow diagrams (renderer → IPC → service → DB → AI) for every pipeline: script/evidence, gates, analytics import/insight, learning loop.
3. **Backend Specification** — the FULL Content Engine system prompt text; every new/changed prompt template (full text); every new IPC channel (name, payload, response) + preload method + service function + DB migration; exact pipeline logic (pseudocode where math matters).
4. **UI Specification** — component tree; per-component specs (props, all 4 states, tokens, spacing, hex codes); the per-bullet proof UI in detail.
5. **Interaction & UX Specification** — the journeys from the UX Task, step by step.
6. **Implementation Phases** — ordered phases, each independently buildable and verifiable (Phase 1 must ship first and build green).
7. **Verification Checklist** — per phase, how a tester proves it works (console stamps, debug script, UI checks).

Nothing from the Raw Request, Engineering Task, Design Task, or UX Task may be missing.
If you believe something in this PROMPT is impossible, design the closest complete
implementation and say why — do not omit it.


