# Collaboration Request: Presentation Overlay Cards

## Your Role

You are the **Specialist AI**. I am the **Project Owner AI**. I know the codebase; you know how to design and architect solutions. We will collaborate through a structured back-and-forth to refine this idea into an implementable specification.

## The Idea

The user wants to **replace the current Overlay Studio** with a new **Presentation Overlay Card system**. Instead of the current video overlay suggestion pipeline (transcript → cut plan → scene plan → export), the new system generates **interactive HTML/CSS/JS presentation slides** that can be:

1. **Viewed as a slide deck** in-app (8:9 aspect ratio, spring animations, custom components)
2. **Exported as transparent PNGs** for CapCut/video editor overlay
3. **Exported as translucent PNGs** with background for video editors
4. **Generated from Content Engine episodes** (episode script frames → presentation slides)
5. **Edited internally** in the app (drag elements, change text, adjust animations)

The design language is locked:
- Background: `#0A0A0B` (Vercel black)
- Surface: `rgba(255, 255, 255, 0.03)` with `backdrop-filter: blur(24px)`
- Border: `1px solid rgba(255, 255, 255, 0.08)`
- Text: `#FAFAFA`, muted: `#8B8B8B`
- Accent: `#10b981` (emerald), secondary: `#a855f7` (violet)
- Font: Inter + JetBrains Mono
- Aspect: 8:9 container, no scrolling
- No browser-default inputs — all custom glassmorphic components
- Spring physics transitions, staggered entrances

## Current Context (What I Have)

### Project: DeskFlow
- **Stack:** Electron + React + TypeScript + Vite + better-sqlite3 + Tailwind CSS v4
- **Architecture:** Main process (Electron) + Renderer process (React SPA) + Preload bridge
- **AI Integration:** Provider chain router (OpenRouter, Ollama, etc.) via `buildChain()` + `runWithFallback()`

### Relevant Files (Already Gathered)

#### Overlay Studio (current system to be replaced)
- `src/features/overlay-studio/OverlayStudioPage.tsx` — Main entry, mode toggle (studio | engine), StudioProvider wrapper
- `src/features/overlay-studio/state/StudioProvider.tsx` — React context + useReducer
- `src/features/overlay-studio/state/studioTypes.ts` — Full state type (37 lines)
- `src/features/overlay-studio/state/studioReducer.ts` — 30+ action types
- `src/features/overlay-studio/constants/studioConstants.ts` — Pipeline steps, overlay colors, safe zones
- `src/features/overlay-studio/studio.css` — Utility classes (glass, buttons, skeletons, badges)
- `src/features/overlay-studio/components/shell/StudioShell.tsx` — 3-column layout (sidebar + workspace + inspector)
- `src/features/overlay-studio/components/shell/StudioWorkspace.tsx` — Stage view router

#### Content Engine (sibling system, episodes → presentations)
- `src/features/content-engine/ContentEngineWorkspace.tsx` — 8-view layout (74 lines)
- `src/features/content-engine/components/ui.tsx` — Shared primitives (Card, Button, Chip, ScoreBar, etc.) (243 lines)
- `src/features/content-engine/components/EpisodesView.tsx` — Episode list + detail (828 lines)
- `src/features/content-engine/components/ScriptProofCard.tsx` — Per-frame retention evidence (330 lines)
- `src/features/content-engine/components/PhaseStepper.tsx` — 5-phase pipeline stepper
- `src/features/content-engine/components/AssembleView.tsx` — Cut list + overlay plan

#### Prompts & AI
- `src/lib/overlayPrompts.ts` — PROMPT_CUT_PLANNER + PROMPT_SCENE_DSL (115 lines)
- `src/services/contentEngine/prompts.ts` — 16 prompt templates (contentEngineSystem, script frames, etc.)
- `src/services/contentEngine/rubric.ts` — RETENTION_RUBRIC v2.0.0 (14 criteria)
- `src/services/contentEngine/scoringSchemes.ts` — 3 scoring schemes
- `src/services/contentEngine/index.ts` — Backend: DB tables, IPC handlers, AI bridge (~1100 lines)
- `src/services/providers/router.ts` — buildChain + runWithFallback provider routing

#### Design System
- `src/types/overlayStudio.ts` — Design tokens (canvas 1080x1920, face-cam safe zone, OverlayType, RendererType) (45 lines)
- `src/index.css` — Tailwind v4 theme blocks, legacy tokens, page accent map

#### Available MCP Components (NOT installed yet)
- **MagicUI:** AnimatedBeam, Particles, TextAnimate (blurInUp), BentoGrid, NumberTicker, Confetti, Meteors
- **Installed:** MagicCard (mouse-following glow), NeonGradientCard (animated border), GlareHover (diagonal sweep), Slider, Select, CodeBlock, BorderBeam (⚠️ broken on this Chromium)
- **Lucide icons:** Presentation, FileText, Play, Pause, Monitor, Pencil, Plus, Copy, Download, Share2, Settings, Maximize, ChartColumn, Terminal, Code, Image, CircleCheckBig

### Existing Patterns
- **DB migrations:** `ensureTables()` with `CREATE TABLE IF NOT EXISTS` + guarded `ALTER TABLE` for adding columns
- **IPC pattern:** `ipcMain.handle('channel', async (event, payload) => { ... })` → preload bridge → `window.deskflowAPI.channel(payload)`
- **AI call pattern:** `buildChain(providerState, 'featureId')` → `runWithFallback(prompt, options)` → `parseAiJson(response)`
- **Component pattern:** Glass cards (`bg-[rgba(24,24,27,0.60)] backdrop-blur-xl border border-white/[0.06] rounded-xl p-5`)

## Context Gaps (What I Don't Have Yet)

- If you need to see the full IPC handler for `content:script:generate` — ask and I will fetch it
- If you need the full DB schema for `content_episodes` — ask and I will include it
- If you need to see how `StudioShell` renders the 3-column layout — ask and I will paste it
- If you need to see how episodes connect to the overlay pipeline — ask and I will fetch `AssembleView.tsx`
- If you need to see the full `studioReducer.ts` — ask and I will include it

## Conversation Protocol

**How we communicate:**

1. **You ask specific questions.** Format: `REQUEST: [specific file, schema, or clarification]`
2. **I fetch and respond.** Format: `CONTEXT: [file path]`
   `[actual source code]`
3. **You refine your understanding.** Ask follow-ups or propose a design.
4. **When ready, you produce RESULT.md.** Format follows our standard specification.

**Rules:**
- Do NOT assume context you don't have. Ask for it.
- Do NOT design for features whose backend doesn't exist. Flag them.
- Do NOT produce a monolithic answer. Iterate with me.
- When you need to see code, ask for the EXACT file path.

## Scope

- **IN:** Presentation overlay card system — slide generation, rendering (iframe srcdoc), export (transparent PNG, translucent PNG, HTML), internal editing, episode integration, MCP component selection
- **OUT:** The existing Overlay Studio pipeline (video overlay suggestion) — that stays as-is
- **IN:** The Content Engine episode → presentation bridge
- **OUT:** The existing Content Engine 8-stage pipeline — that stays as-is
- **OUT:** Backend AI provider chain changes — use existing `buildChain` + `runWithFallback`

## Expected Output

After our conversation converges, produce:
1. **RESULT.md** — The complete design specification
2. **Implementation Plan** — File-by-file changes
3. **Backend Audit** — Any missing IPC/services/DB schemas flagged

## First Question

What is the **primary export format** the user cares about most? The prompt spec mentions:
- Single HTML file (self-contained, shareable)
- Transparent PNG per slide (for CapCut/video overlay)
- Translucent PNG with background
- JSON slide deck (re-importable)

And: should the slide generation be **topic-based** (user types "SVM Hyperplanes" → AI generates 8 slides) or **episode-based** (Content Engine episode script frames → slides)?
