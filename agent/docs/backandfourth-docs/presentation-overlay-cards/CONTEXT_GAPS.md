# Context Gaps — Presentation Overlay Cards

> Gap analysis for the presentation overlay card system. What we have, what's missing, and how to obtain it.

## Gap Analysis Table

| # | Context Needed | Status | Location | How to Obtain |
|---|----------------|--------|----------|---------------|
| 1 | Overlay Studio architecture & pipeline flow | ✅ Have | `src/features/overlay-studio/` (OverlayStudioPage.tsx, StudioShell, StudioWorkspace, studioTypes.ts, studioReducer.ts, studioConstants.ts) | Already in bundle |
| 2 | Content Engine workspace architecture (8-view layout) | ✅ Have | `src/features/content-engine/ContentEngineWorkspace.tsx` + all views | Already in bundle |
| 3 | Existing prompt system (PROMPT_CUT_PLANNER, PROMPT_SCENE_DSL) | ✅ Have | `src/lib/overlayPrompts.ts` (115 lines) | Already in bundle |
| 4 | Design tokens (colors, canvas, safe zones, overlay types) | ✅ Have | `src/types/overlayStudio.ts` (45 lines) | Already in bundle |
| 5 | Studio CSS utility classes (glass, buttons, skeletons, badges) | ✅ Have | `src/features/overlay-studio/studio.css` (51 lines) | Already in bundle |
| 6 | Content Engine UI primitives (Card, Button, Chip, ScoreBar, etc.) | ✅ Have | `src/features/content-engine/components/ui.tsx` (243 lines) | Already in bundle |
| 7 | Content Engine prompt templates (16 prompts, rubric v2.0.0) | ✅ Have | `src/services/contentEngine/prompts.ts` + rubric.ts + scoringSchemes.ts | Already in bundle |
| 8 | AI call chain (provider routing, buildChain, runWithFallback) | ✅ Have | `src/services/providers/router.ts` + `src/services/contentEngine/index.ts` | Already in bundle |
| 9 | IPC bridge pattern (preload + deskflow-api.d.ts types) | ✅ Have | `src/preload.ts` + `src/types/deskflow-api.d.ts` | Already in bundle |
| 10 | Database migration pattern (CREATE TABLE + guarded ALTER) | ✅ Have | `src/services/contentEngine/index.ts` ensureTables() | Already in bundle |
| 11 | **Slide rendering engine (iframe srcdoc sandbox)** | ❌ Missing | Does not exist yet | Must be designed — SPECIALIST INPUT NEEDED |
| 12 | **Presentation prompt (slide generation AI system prompt)** | ❌ Missing | Does not exist yet | Must be designed — SPECIALIST INPUT NEEDED |
| 13 | **Slide-to-image export (transparent PNG / translucent)** | ❌ Missing | Does not exist yet | Must be designed — SPECIALIST INPUT NEEDED |
| 14 | **Interactive components within slides (custom sliders, dropdowns)** | ❌ Missing | Does not exist yet | Must be designed — SPECIALIST INPUT NEEDED |
| 15 | **MCP component inventory for slides** | ⚠️ Partial | MagicCard/NeonGradientCard/GlareHover/Slider/Select/CodeBlock installed; AnimatedBeam/Particles/TextAnimate/NumberTicker/Confetti/Meteors available via MCP but not installed | SPECIALIST: which MCP components to pull? |
| 16 | **Export pipeline (PNG/HTML/JSON)** | ❌ Missing | Does not exist yet | Must be designed — SPECIALIST INPUT NEEDED |
| 17 | **CapCut/video editor integration (translucent overlay export)** | ❌ Missing | Does not exist yet | Must be designed — SPECIALIST INPUT NEEDED |
| 18 | **Presentation session storage (DB table)** | ❌ Missing | Does not exist yet | Follow existing pattern: content_ideas/content_episodes CREATE TABLE |
| 19 | **Episode → Presentation bridge (generate slides from script frames)** | ❌ Missing | Does not exist yet | Must be designed — SPECIALIST INPUT NEEDED |
| 20 | **Slide thumbnail/preview system** | ❌ Missing | Does not exist yet | Must be designed — SPECIALIST INPUT NEEDED |

## Open Questions for Specialist AI

1. **Slide rendering approach**: Should we render slides as complete HTML documents inside `<iframe srcdoc>`, or as React components rendered directly? iframe gives full CSS/JS isolation but limits interactivity with the parent app. React components give tighter integration but risk CSS bleed.

2. **Export transparency**: For CapCut overlay export, should we use:
   - `html2canvas` / `dom-to-image` for screenshot-based PNG export?
   - SVG-based rendering for vector export?
   - Canvas-based rendering with alpha channel?
   Each has tradeoffs for quality, transparency support, and interactivity preservation.

3. **Slide generation prompt**: The user provided a "Pro Max Educational Slide Generator" system prompt spec. Should the AI generate:
   - A single HTML file per slide (most isolated, easiest to export)?
   - A structured JSON slide deck that gets rendered by a custom renderer?
   - Both (JSON for editing, HTML for export)?

4. **Interactive components**: The user's spec mentions custom sliders, dropdowns, and buttons within slides. Should these be:
   - Pure CSS/HTML (most portable, no JS dependencies)?
   - React components rendered inside an iframe (requires React CDN in the iframe)?
   - Web Components (custom elements, encapsulated)?

5. **MCP component selection**: Given the available MCP inventory (AnimatedBeam, Particles, TextAnimate, NumberTicker, BentoGrid, Confetti, Meteors, BorderBeam, GlareHover, MagicCard), which should we pull into the presentation system? The user wants "Pro Max" quality — which animations justify the complexity?

6. **Internal editing**: The user mentioned "internal editing on the app" — should slides be editable in-place (drag elements, resize, change text), or is the AI-generated output final (regenerate if you want changes)?
