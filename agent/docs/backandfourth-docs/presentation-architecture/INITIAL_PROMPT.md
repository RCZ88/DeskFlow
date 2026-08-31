# Collaboration Request: Presentation Studio — Architecture Refactor

## Your Role

You are the Specialist AI. I am the Project Owner AI. I know the codebase; you know how to design and architect solutions. We will collaborate through a structured back-and-forth to refactor the Presentation Studio's generation architecture.

## The Problem

The Presentation Studio generates slides via an external AI (ChatGPT/Claude). The current prompt tells the AI to generate **a standalone HTML slideshow application** — complete with its own navigation (`show(i)`, prev/next buttons, arrow keys, slide counter). But the app's parser **splits that HTML into individual slides** and throws away the AI's navigation. The app then **re-implements navigation from scratch**.

This means:
- The AI builds a complete slideshow app that gets dismantled
- The AI's navigation code is dead inside each iframe
- The app duplicates all navigation logic
- The parser is fragile (regex on HTML sections)
- There's no structured contract between AI output and app rendering

## What I Want

The AI should output **structured slide data** (JSON) that the app renders. The app owns ALL navigation, transitions, viewport, and playback. The AI only describes WHAT each slide contains, not HOW the browser renders the slideshow.

## Current Architecture (what exists today)

### The Prompt (`src/services/presentation/prompts.ts`)
The system prompt `PROMPT_GENERATE_SLIDE` tells the AI:
- "You generate ONE self-contained HTML file containing ALL presentation slides as a navigatable slideshow"
- "navigation is JS-driven (prev/next buttons, arrow keys, slide counter)"
- "show(i) toggles .active, updates counter"
- Output: raw HTML with `<section class="slide">` per slide

### The Parser (`src/services/presentation/htmlParser.ts`)
- Regex splits on `<section>` tags
- Grabs `<head>` and `<script>` once
- Wraps each section in its own complete HTML document
- Force-adds `class="active"` to current section
- The AI's `show(i)` navigation JS is included but DEAD

### The Validator (`src/services/presentation/slideValidator.ts`)
- 7 validation layers: structural, layout, theme, micro-interactions, anti-slop, security, runtime
- Checks for DOCTYPE, html/head/body/style/script tags
- Checks responsive width, no fixed canvas, no scrolling
- Checks required CSS variables, animations, anti-slop rules

### The Renderer (`src/features/presentation/PresentationWorkspace.tsx`)
- Shows ONE slide at a time via `<iframe srcDoc={slide.html_content}>`
- App owns: prev/next buttons, keyboard arrows, slide dots, counter, aspect ratio toggle, code view
- Each slide is a complete HTML document in an isolated iframe

### The Backend (`src/main.ts`)
- `presentations` table: id, title, status, slide_count, archived_at, timestamps
- `presentation_slides` table: id, presentation_id, index_order, frame_type, html_content
- IPC: list, get, import, delete, archive, unarchive, update-slide

### The Prompt Composer (`src/services/presentation/promptComposer.ts`)
- Builds a `SlidePlan` from content input (topic/episode/chat)
- Each slide has: index, frame type, purpose, headline hint, layout hint, visual hint
- `compilePrompt()` injects the plan + theme + aspect ratio into the system prompt

## The Desired Architecture

```
AI outputs: JSON presentation spec
    ↓
App validates JSON schema
    ↓
App stores structured data per slide
    ↓
App renders slides via React components
    ↓
App owns: navigation, transitions, viewport, playback
```

The AI should output something like:

```json
{
  "presentation": {
    "title": "Neural Network Backpropagation",
    "slideCount": 6,
    "slides": [
      {
        "index": 0,
        "type": "hook",
        "headline": "The Gradient Flows Backward",
        "subheadline": "Why backprop reverses the forward pass",
        "visual": {
          "type": "diagram",
          "description": "Neural network with arrows showing backward gradient flow",
          "data": { "nodes": ["input", "hidden1", "hidden2", "output"], "direction": "backward" }
        },
        "content": {
          "body": "In forward propagation, data flows input → output. In backpropagation, gradients flow output → input, adjusting weights at each layer.",
          "equation": "∂L/∂w = ∂L/∂a · ∂a/∂z · ∂z/∂w"
        },
        "style": {
          "layout": "full-bleed",
          "animation": "blurInUp"
        }
      }
    ]
  }
}
```

## Context Gaps

| Context Needed | Status | Location | How to Obtain |
|----------------|--------|----------|---------------|
| Full system prompt text | ✅ Have | prompts.ts lines 42-101 | Embedded in CONTEXT_BUNDLE |
| Parser implementation | ✅ Have | htmlParser.ts | Embedded in CONTEXT_BUNDLE |
| Validator rules | ✅ Have | slideValidator.ts | Embedded in CONTEXT_BUNDLE |
| Renderer (iframe approach) | ✅ Have | PresentationWorkspace.tsx | Embedded in CONTEXT_BUNDLE |
| Backend IPC handlers | ✅ Have | main.ts | Embedded in CONTEXT_BUNDLE |
| DB schema | ✅ Have | main.ts CREATE TABLE | Embedded in CONTEXT_BUNDLE |
| Prompt composer (plan builder) | ✅ Have | promptComposer.ts | Embedded in CONTEXT_BUNDLE |
| Existing visual primitive map | ✅ Have | In prompt text | Embedded in CONTEXT_BUNDLE |
| How themes are applied | ✅ Have | themeRegistry.ts | Can fetch if needed |
| External AI response format expectations | ❌ Missing | Need to define | Specialist should design |

## Scope

- **IN:** Refactoring the prompt output format from raw HTML to structured JSON, updating the parser to handle JSON, updating the renderer to render from structured data, keeping the visual quality the same
- **OUT:** Changing the theme system, changing the backend DB schema (unless needed for structured data), changing the archive/delete features, changing the content engine

## Conversation Protocol

**How we communicate:**

1. **You ask specific questions.** Format: `REQUEST: [specific file, schema, or clarification]`
2. **I fetch and respond.** Format: `CONTEXT: [file path]\n[actual source code]`
3. **You refine your understanding.** Ask follow-ups or propose a design.
4. **When ready, you produce RESULT.md.** Format follows our standard specification.

**Rules:**
- Do NOT assume context you don't have. Ask for it.
- Do NOT design for features whose backend doesn't exist. Flag them.
- Do NOT produce a monolithic answer. Iterate with me.
- When you need to see code, ask for the EXACT file path.

## Expected Output

After our conversation converges, produce:
1. **RESULT.md** — The complete architecture refactor specification
2. **New system prompt** — The redesigned PROMPT_GENERATE_SLIDE that outputs JSON
3. **JSON schema** — The exact contract between AI output and app rendering
4. **Parser update** — How to parse the JSON instead of HTML sections
5. **Renderer update** — How React components render from structured data
6. **Migration plan** — How to transition from HTML to JSON without breaking existing presentations

## First Question

What visual primitives does the app currently support (diagrams, charts, code blocks, etc.), and should the JSON schema include a `visual.type` enum that maps to these? Or should the AI output raw HTML/CSS for the visual portion while the app handles layout/navigation?
