# Clement Overlay Studio — Complete Context (Persistent)

> This file stores EVERYTHING about the Clement Overlay Studio feature.
> Read this at the start of any session that touches this feature.
> Last updated: 2026-08-12

---

## 1. Product Vision

A local, zero-cost video intelligence studio that takes a long talking-head video (10–18 min), transcribes it with accurate timestamps, lets an AI propose which segments to keep (compressing to 90–180s), then generates on-screen visualizations (cards, diagrams, math, emoji boards — NOT just text) for the kept segments.

**Guiding philosophy:** The AI decides WHAT to show. The engine decides HOW it looks. The human approves. Never auto-export a final video without approval.

**Zero cost:** No paid APIs. Everything local (faster-whisper for transcription, Ollama for LLM, free renderers). Manual Bridge mode for users without Ollama (copy prompt → paste into any web AI → paste response back).

---

## 2. The Pipeline (3 Features)

```
FEATURE 1                    FEATURE 2                    FEATURE 3
Transcribe                   Cut Plan                     Visualize
──────────                   ────────                     ─────────
video.mp4                    transcript.json              kept segments
   │ ffmpeg → 16kHz wav         │ Ollama (num_ctx↑)         │ Ollama → Scene DSL
   │ faster-whisper             │ cut_plan.json             │ renderer registry
   ▼                            ▼                            ▼
transcript.json              Timeline UI (approve cuts)   cards/ + diagrams/ +
(word+segment timestamps)    ffmpeg lossless cut          timeline.json + manifest.md
```

Every boundary passes **JSON**. The AI is a pure function: JSON in → JSON out.

---

## 3. Data Contracts

### transcript.json (Feature 1 output)
```json
{
  "video_id": "string",
  "duration": 847.2,
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 3.5,
      "text": "People think SVM is just a line.",
      "words": [
        {"word": "People", "start": 0.0, "end": 0.4},
        {"word": "think", "start": 0.4, "end": 0.7}
      ]
    }
  ]
}
```
Constraint: all timestamps in seconds, rounded to 3 decimals. `segments[].words` must be present.

### cut_plan.json (Feature 2 output)
```json
{
  "video_id": "string",
  "source_duration": 847.2,
  "target_duration": 142.0,
  "kept": [
    {"segment_id": 0, "start": 0.0, "end": 4.8, "role": "hook",
     "reason": "Strong opening claim"}
  ],
  "cut": [
    {"segment_id": 3, "reason": "Repeated the previous point"}
  ]
}
```
`role` enum: `hook | core | detail | cta`. Duration must be 90–180s.

### scene_dsl.json (Feature 3 output)
```json
{
  "video_id": "string",
  "scenes": [
    {
      "scene_id": "sc_01",
      "start_time": 12.0,
      "end_time": 18.0,
      "renderer": "card|mermaid|equation|chart|board|manim",
      "title": "string, max 5 words",
      "source": "string — renderer-specific content",
      "emphasis_words": ["optional"],
      "animation": {"in": "fade|slide_up|pop", "out": "fade|slide_down"}
    }
  ]
}
```
Rules: max 1 scene per 3s, hook in first 5s, max 2 card scenes, no overlapping times.

### Director Cut (overlay cards — original spec)
```json
{
  "metadata": {
    "style_profile": "clement_dark_tech",
    "target_aspect": "9:16",
    "total_duration_sec": number
  },
  "overlays": [
    {
      "id": "uuid",
      "start_time": number,
      "end_time": number,
      "type": "hook|body|caption|bullet|keyword",
      "text": "string",
      "emphasis_words": ["string"],
      "animation": {"in": "fade|slide_up|pop", "out": "fade|slide_down"}
    }
  ]
}
```
Word limits: hook=8, body=12, caption=14, bullet=10, keyword=6. Never overlap. Hook only in first 5s.

---

## 4. Design Tokens (clement_dark_tech)

```yaml
colors:
  background: "#0D1117"
  background_alpha: 230
  stroke_color: "#000000"
  stroke_width: 3
  accent_hook: "#FACC15"      # yellow
  accent_body: "#FFFFFF"      # white
  accent_caption: "#22D3EE"   # cyan
  accent_keyword: "#FACC15"
  accent_bullet: "#22D3EE"
  grid_color: "#30363D"
canvas:                 # 9:16
  width: 1080
  height: 1920
face_cam_safe_zone:     # NEVER place overlays here
  x_min: 760            # right 320px
  y_min: 1520           # bottom 400px
text_safe_zone:
  x: [40, 1040]
  y: [40, 1320]
```

---

## 5. Renderer Registry

| renderer | use for | free library | output |
|---|---|---|---|
| card | punchlines, one-line claims | Pillow | PNG |
| mermaid | hierarchies, AI systems, flows | Mermaid.js (mermaid-cli) | SVG/PNG |
| equation | math formulas | KaTeX/MathJax server-side | SVG |
| chart | data, decision boundaries | matplotlib | PNG |
| board | emoji + arrows + labels | Pillow + Twemoji/Noto emoji | PNG |
| manim | animated math explainer clips | Manim Community | MP4 |

Each renderer is a module with signature: `render(scene, profile, output_dir) → AssetPath`
Adding a new renderer = new file + register it. No core changes.

---

## 6. Master Prompts

### Cut Planner Prompt
Location: `src/lib/overlayPrompts.ts` → `PROMPT_CUT_PLANNER`
- Forces JSON-only output via "You are a strict JSON-only API endpoint" framing
- Single-fence rule stated 3× (task, forbidden, self-check)
- Full schema + worked example
- Self-check list catches errors before output

### Scene DSL Prompt
Location: `src/lib/overlayPrompts.ts` → `PROMPT_SCENE_DSL`
- Forces non-text renderers ("must NOT default to plain text cards")
- Renderer menu with exact source formats
- Critical JSON-escaping rules for multi-line strings (Mermaid source)
- Max 2 card scenes rule

### Repair Prompt
Location: `src/lib/overlayPrompts.ts` → `buildRepairPrompt(errors, failedOutput)`
- Auto-generated from validation failures
- Lists exact errors + failed output
- Forces corrected JSON only

---

## 7. Parse Pipeline

Location: `src/lib/overlayParser.ts`

Pipeline order:
1. Trim whitespace
2. Try direct JSON.parse
3. Extract from ```json fenced blocks
4. Find span from first { to last }
5. Repair pass: remove trailing commas, replace curly quotes, remove comments
6. JSON.parse
7. Schema validation (cut_plan or scene_dsl)
8. Semantic validation (IDs exist, duration in range, no overlaps, no ID in both kept/cut)

Validation returns `ValidationError[]` with rule/message/passed per check.
`allPassed(checks)` → boolean. `passedCount(checks)` → {passed, total}.

---

## 8. Manual Bridge Mode (AI Bridge)

For users without Ollama. Human copies prompt → pastes into any web AI → pastes response back.

### 3-Step Wizard
1. **Step 1:** Rendered prompt in read-only box + Copy button + char count + links to chat.openai.com, claude.ai, gemini.google.com
2. **Step 2:** Paste area for AI response
3. **Step 3:** Validation checklist (✅/❌ per rule) + Continue button (unlocks when all green)

### On failure:
- Red items show exact error
- "Generate Fix Prompt" button builds repair message
- Failed response kept (nothing lost)

### Provider Selector
Two cards: `⚡ Ollama (automatic)` and `📋 Manual Bridge (any web AI)`
Show status dot for Ollama (detected/not detected).
If Ollama not detected, Manual becomes highlighted default.

---

## 9. UI Layout (4-Pane Studio)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ● video_file.mp4     14:07 → 2:22 target    [▶ Preview]           │
├──────────────────────┬──────────────────────────────────────────────┤
│  TRANSCRIPT           │  AI CUT PLAN / VISUAL OUTPUT                │
│  (timestamped rows)   │  (kept/cut list OR scene previews)         │
│                       │  Running total: 2:22 / 3:00 ✅              │
├──────────────────────┴──────────────────────────────────────────────┤
│  WAVEFORM TIMELINE                                                  │
│  ▉▉KEEP▉▉░░░░░cut░░░░░▉▉▉KEEP▉▉▉░░cut░░▉KEEP▉▉                     │
│  0:00      2:00      4:00      6:00      8:00     14:07            │
├─────────────────────────────────────────────────────────────────────┤
│         [ Approve & Cut ]      [ Send to Visualization → ]          │
└─────────────────────────────────────────────────────────────────────┘
```

Key UX rules:
- Every AI decision shows a REASON (human approves, never blind automation)
- Running total badge turns green when inside 90–180s target
- Transcript lines and timeline blocks linked both ways (click ↔ highlight)
- Approve & Cut runs FFmpeg. Send to Visualization passes kept transcript to Feature 3.

---

## 10. Feature Tabs in App

Route: `/studio` (sidebar: Sparkles icon, "Overlay Studio")

| Tab | What it does |
|---|---|
| Transcribe | Upload video → ffmpeg extract audio → faster-whisper → transcript.json → display segments with timestamps |
| Cut Plan | Transcript + AI cut plan → timeline with keep/cut → approve → ffmpeg lossless cut |
| Visualize | Kept segments → AI scene DSL → renderer preview (card/mermaid/equation/chart/board/manim) → export |
| Manual Bridge | Provider selector → 3-step wizard (prompt/paste/validate) → pipeline continues |

---

## 11. Backend Architecture (Python — separate from Electron app)

### Dependencies
- `faster-whisper` — ASR with word timestamps
- `stable-ts` (optional) — re-align word boundaries
- `requests` — Ollama API calls
- `Pillow` — card/board rendering
- `matplotlib` — chart rendering
- `mermaid-cli` (Node) — diagram rendering
- `manim` (optional) — math animation

### Ollama API call
```json
{
  "model": "llama3.1",
  "format": "json",
  "options": { "num_ctx": 16384 },
  "prompt": "<transcript json>"
}
```
Critical: set `num_ctx` to 16384 (default 2048 truncates long transcripts).

### FFmpeg commands
Extract audio: `ffmpeg -y -i video.mp4 -ar 16000 -ac 1 -c:a pcm_s16le output.wav`
Lossless cut: `ffmpeg -y -ss <start> -to <end> -i video.mp4 -c copy part.mp4`
Concat: `ffmpeg -y -f concat -safe 0 -i concat.txt -c copy kept.mp4`

---

## 12. Implementation Status

### Built (in this repo)
- [x] `src/types/overlayStudio.ts` — design tokens, overlay types, safe zones, renderer config
- [x] `src/lib/overlayPrompts.ts` — 3 master prompts (Cut Planner, Scene DSL, Repair)
- [x] `src/lib/overlayParser.ts` — full parse pipeline (extract → clean → validate → repair)
- [x] `src/main.ts` — `feature-studio:compile` IPC handler with Director system prompt
- [x] `src/preload.ts` — `featureStudioCompile(script)` wrapper
- [x] `src/types/deskflow-api.d.ts` — typed IPC call

### NOT built yet
- [ ] Feature Studio page rewrite (4-tab layout: Transcribe / Cut Plan / Visualize / Manual Bridge)
- [ ] Transcript upload + display UI
- [ ] Cut Plan timeline with keep/cut blocks
- [ ] Scene DSL renderer preview
- [ ] Manual Bridge 3-step wizard
- [ ] Provider selector (Ollama vs Manual)
- [ ] Validation checklist UI
- [ ] Python backend scripts (transcriber.py, cut_planner.py, video_cutter.py)
- [ ] Renderer registry (card/mermaid/equation/chart/board/manim)
- [ ] Timeline.json + manifest.md export
- [ ] CapCut XML export

---

## 13. Key Decisions

1. **AI never draws. AI writes a parseable Scene DSL.** Deterministic renderers turn DSL into assets.
2. **JSON at every boundary.** transcript.json → cut_plan.json → scene_dsl.json → timeline.json + manifest.md.
3. **Manual Bridge is first-class.** Users without Ollama copy prompt → paste into ChatGPT/Claude/Gemini → paste back → app validates + repairs.
4. **Repair loop on failure.** App generates a repair prompt from validation errors; user sends it back to the same AI. Converges in 1–2 rounds.
5. **clement_dark_tech profile is injectable.** Every renderer receives the same tokens (colors, fonts, safe zones). No hardcoded values in renderers.
6. **num_ctx = 16384.** Ollama default (2048) truncates 10–18 min transcripts. Always set explicitly.
7. **faster-whisper + stable-ts.** Whisper alone drifts ±0.5s; stable-ts corrects word boundaries for accurate cutting.
8. **Lossless FFmpeg cuts.** `-c copy` for speed; `-c:v libx264 -preset fast` only when frame-exact cuts needed.

---

## 14. File Locations

| File | Purpose |
|---|---|
| `src/types/overlayStudio.ts` | Design tokens, overlay types, safe zones, renderer config |
| `src/lib/overlayPrompts.ts` | Cut Planner + Scene DSL + Repair prompts |
| `src/lib/overlayParser.ts` | Parse pipeline (extract → clean → validate → repair) |
| `src/pages/FeatureStudioPage.tsx` | Main page (NEEDS REWRITE for 4-tab layout) |
| `src/main.ts` (line ~17059) | `feature-studio:compile` IPC handler |
| `src/preload.ts` | `featureStudioCompile(script)` |
| `src/types/deskflow-api.d.ts` | Typed IPC declaration |
