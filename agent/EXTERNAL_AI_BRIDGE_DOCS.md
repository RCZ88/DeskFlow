# External AI Bridge — Implementation Documentation

## Date: 2026-08-28

## What Was Built

Universal External AI Bridge pattern applied across ALL AI features in the app.
Every AI feature with form fields now has a small "AI" button next to each field.
Clicking it sends the field context to an external AI (ChatGPT/Claude) via the
browser extension, which injects the prompt into the AI chat. The AI fills in the
field based on its conversation context, and the user pastes the response back.

## Architecture

```
Desktop App (form field with AI button)
  → User clicks AI button
  → System builds field-specific prompt (JSON schema + field context)
  → extensionQueueCommand sends to browser extension
  → Extension injects prompt into AI chat input on ChatGPT/Claude/etc.
  → AI responds with filled JSON
  → Extension detects response → captures it
  → User pastes back → system parses JSON → fills field
```

## Files Changed

### New Files
- `src/features/content-engine/components/ExternalAIBridgeField.tsx` — Per-field AI button component
- `src/features/content-engine/components/ExternalAIBridge.tsx` — Full bridge component with PromptSectionToggle
- `src/features/content-engine/components/PromptSectionToggle.tsx` — Dynamic section toggle UI
- `src/features/content-engine/components/BulkAIFill.tsx` — BULK fill: select multiple fields, AI fills all at once

### Modified Files (with backups)

#### Learn/Lyceum
- `src/components/learn/KnowledgeIntakePanel.tsx` — Per-field AI buttons on topic, transcript (3 modes)
- `src/components/learn/LearnerProfilePanel.tsx` — Per-field AI buttons on statement, topic, keywords
- `src/components/learn/LessonDetailModal.tsx` — Per-field AI buttons on title, summary
- `src/components/learn/CreateLessonDialog.tsx` — **BulkAIFill** on lesson form: select which of 5 fields (learning goal, knowledge, size, focus, depth) to fill

#### Content Engine
- `src/features/content-engine/components/EpisodesView.tsx` — **BulkAIFill** on episode title + per-field button
- `src/features/content-engine/components/SeriesView.tsx` — **BulkAIFill** on ALL 6 series fields (name, description, niche, tone, visualStyle, pacing)
- `src/features/content-engine/components/PromptBuilder.tsx` — Uses extensionQueueCommand

#### Goals/Warmth
- `src/features/warmth/gold/GoldPage.tsx` — Per-field AI buttons on goal title, description, journal

#### AI Canvas
- `src/components/ai/canvas/cards/DailyPlannerCard.tsx` — Per-field AI button on goal title

#### Backend
- `src/main.ts` — HTTP endpoints `/ai-prompts`, `/ai-prompts/build`, `/ai-prompts/import` + prompt builders

#### Browser Extension
- `browser-extension/background.js` — CONTENT_ENGINE_INJECT command type
- `browser-extension/focusOverlay.js` — INJECT_PROMPT handler + DF_TOGGLE_PANEL relay
- `browser-extension/ai-context-content.js` — CE response detection (JSON signatures)
- `browser-extension/overlay.js` — CE/L/AI toolbar buttons + prompt selector panel
- `browser-extension/popup.html` — Cleaned up

## How It Works

### For Any Form Field
1. Small "AI" button appears next to the field label
2. Click → builds a prompt with the field's JSON schema + all other field values as context
3. Sends to external AI via extension injection
4. AI fills in the field → user pastes back → system parses JSON → updates field

### Prompt Format (from external-ai-bridge skill)
- Starts with "Based on our conversation above..."
- Includes EXACT JSON schema with all required fields
- Uses `"string"` examples, not placeholders
- Ends with "Return ONLY this JSON (no explanation, no markdown)"
- Strict mode: "Every field is mandatory"
- Flexible mode: "Include all fields but creative variation allowed"

### Parsing Guardrails (from external-ai-bridge skill)
- Strip ```json code fences
- Regex-extract first `{...}` object
- Validate required fields before saving
- Meaningful error messages ("No JSON found", "Missing field X")

## Extension Overlay Features

The browser extension overlay (on AI chat websites) now has:
- **C** — Capture this chat
- **B** — Send to Brain (knowledge graph)
- **T** — Copy full transcript
- **CE** — Content Engine prompts (9 types)
- **L** — Learn/Lyceum prompts (5 types)
- **AI** — AI tool prompts (6 types)

Clicking CE/L/AI opens a prompt selector panel. Selecting a prompt builds it
via the `/ai-prompts/build` endpoint and injects it into the chat input.

## Prompt Types Connected

### Content Engine (9)
classify, synthesize, script, gates, seo, analytics, lessons, reflection, frameworks

### Learn (5)
create-lesson, create-quiz, create-flashcards, summarize, refine-lesson

### AI Tools (6)
brainstorm, research-digest, resume-builder, goal-assistant, category, monthly-recap

## Backup Location
`agent/backups/-external-ai-bridge/` — all 17 files backed up before changes
