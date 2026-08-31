---
name: external-ai-bridge
description: Pattern for integrating external AI (ChatGPT/Claude) into app features via format-only prompts. The app generates a JSON schema instruction that the user pastes into their EXISTING AI conversation. The AI already has context from the conversation — the prompt just tells it the output format. The AI's JSON output gets pasted back and parsed into app data. Use when building any feature where the user wants their existing AI to fill in structured data, generate content, or make decisions that feed into the app.
---

# External AI Bridge

A pattern for connecting app features to the user's existing AI conversations (ChatGPT, Claude, etc.) without requiring the user to re-explain context.

## Core Principle

**The AI conversation already has all the context.** The app only provides:
1. A **format instruction** (JSON schema the AI must follow)
2. A **style directive** (optional: tone, visual style, frame mode)
3. A **series context** (optional: if the content belongs to a series)

The user pastes the format instruction into their existing conversation. The AI outputs structured JSON. The user copies it back. The app parses it.

## When to Use This Pattern

- User says "I want my AI to decide" or "let ChatGPT figure it out"
- The feature involves content generation (scripts, ideas, classifications)
- The user already has an ongoing conversation with context
- Manual input is too complicated — the AI should infer from conversation

## When NOT to Use

- The app needs real-time AI responses (use internal AI providers instead)
- The data is private and shouldn't leave the app
- The output format is too complex for a single paste-back

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  APP                                                │
│                                                     │
│  1. User clicks "Send to External AI"               │
│  2. App builds format-only prompt:                  │
│     - JSON schema (required fields)                 │
│     - Style directive (from templates)              │
│     - Frame mode (strict/flexible)                  │
│     - Series context (if applicable)                │
│  3. Prompt copied to clipboard                      │
│  4. ChatGPT/Claude opens in browser                 │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  EXTERNAL AI (ChatGPT/Claude)                 │  │
│  │                                               │  │
│  │  - User pastes format instruction             │  │
│  │  - AI already has conversation context        │  │
│  │  - AI outputs JSON in the specified format    │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  5. User copies AI output                           │
│  6. User pastes into app textarea                   │
│  7. App parses JSON → saves to DB                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Implementation Checklist

For any feature using this pattern:

### Backend (IPC Handlers)
- [ ] `content:external:build-{type}-prompt` — returns format-only prompt string
- [ ] `content:external:import-{type}` — parses pasted JSON, saves to DB
- [ ] Accept `templateIds[]` and `frameMode` params
- [ ] Inject style directive from selected templates
- [ ] Inject series context if episode belongs to a series
- [ ] Robust JSON extraction: strip ```json fences, regex-extract first `{...}` object

### Frontend (UI Components)
- [ ] "Send to External AI" button — calls build-prompt, copies to clipboard, opens ChatGPT
- [ ] Paste-back textarea — user pastes AI output
- [ ] "Import Response" button — calls import handler
- [ ] TemplateSelector — user picks style packages (tone, visual, depth, format)
- [ ] Frame mode toggle — strict (all fields mandatory) vs flexible (creative freedom)
- [ ] **PromptSectionToggle** — checkboxes for dynamic prompt sections (retention rules, visual dynamics, sound design, hook frameworks, SEO, scoring weights, framework rules, lessons, reflection). Each section can be toggled on/off. Backend conditionally includes only enabled sections in the prompt.

### Prompt Format Rules
- [ ] Start with "Based on our conversation above..." (leverages existing context)
- [ ] Include the EXACT JSON schema with all required fields
- [ ] Use `"string"` examples, not `"string"` placeholders
- [ ] End with "Return ONLY this JSON (no explanation, no markdown)"
- [ ] In strict mode: "Every field is mandatory. Do not skip any field."
- [ ] In flexible mode: "Include all fields but creative variation allowed."

### Import/Parsing Rules
- [ ] Strip ```json code fences
- [ ] Regex-extract first `{...}` object (AI may wrap JSON in explanation text)
- [ ] Validate required fields before saving
- [ ] Return meaningful error messages ("No JSON found", "Missing field X")
- [ ] Handle partial responses gracefully

## Prompt Templates

### Classify (Brainstorm)
```
Based on our conversation above, classify my latest thought. Return ONLY this JSON:

{
  "category": "content_idea" | "framework_update" | "system_improvement" | "analytics" | "general_thought",
  "reason": "one sentence why",
  "suggested_title": "title if content_idea, else null",
  "format_type": "listicle" | "story" | "commentary" | "question" | "vlog" | "other" | null,
  "niche_hint": "niche guess or null"
}
```

### Synthesize Ideas
```
Based on our conversation above, generate N content ideas. Return ONLY this JSON:

{
  "ideas": [
    {
      "title": "string",
      "hook": "exact hook line (0-5s)",
      "format_type": "listicle" | "story" | "commentary" | "question" | "vlog" | "other",
      "niche": "string",
      "series": "string or null",
      "priority": 1-5,
      "frames": ["3-8 frame plan lines as strings"],
      "gates": { "a": {"pass": true, "reason": "..."}, "b": {"pass": true, "reason": "..."}, "c": {"pass": true, "reason": "..."} },
      "retention": { "criteria": ["criterion ids"], "mechanism": "how it works", "evidence": "why it proves it", "score": 0.0-1.0 }
    }
  ]
}
```

### Generate Script
```
Based on our conversation above, write the script as a JSON array of frames. Return ONLY this JSON:

{
  "frames": [
    {
      "text": "exact words spoken/overlaid",
      "duration_seconds": 1-8,
      "frame_type": "hook" | "value" | "transition" | "call_to_action" | "visual_only",
      "visual": "on-screen visual description",
      "retention": {
        "criteria": ["criterion ids"],
        "mechanism": "how the wording works",
        "evidence": "why these exact words prove it",
        "score": 0.0-1.0
      }
    }
  ]
}
```

## Style Directives

Style directives are injected into the prompt based on selected templates:

| Template | Injected As |
|----------|-------------|
| Punchy Short | `TONE: Conversational, punchy, zero filler...` |
| Storyteller | `TONE: Narrative, warm, emotionally engaged...` |
| Data Nerd | `TONE: Analytical, precise, authority-building...` |
| Cinematic | `VISUAL: Every frame has a full shot description...` |
| Deep Dive | `EVIDENCE: Full evidence chain: criterion → wording → mechanism...` |

## Series Context

When an episode belongs to a series, the prompt includes:

```
SERIES RULES: SERIES: "Tech Tips" | TONE: conversational, witty | VISUAL: clean, minimal | PACING: fast cuts | DURATION: 30s | MODE: strict
```

## Frame Modes

- **Strict**: "Every field is mandatory. Do not skip any field. No creative deviation from the schema."
- **Flexible**: "Include all fields but creative variation in content is encouraged."

## Anti-Patterns

- **DON'T** include the user's thought/topic in the prompt — the AI conversation already has it
- **DON'T** ask the user to fill in any fields — the AI decides everything
- **DON'T** use markdown code blocks in the prompt — the AI might wrap its output in them
- **DON'T** require the user to format the JSON manually — paste raw AI output
- **DON'T** fail silently on parse errors — show the user what went wrong

## Unified Frontend Framework (v2 — current)

The bridge UI is now a single reusable framework in `src/components/ai-bridge/`. Every
feature uses these so the field UI, prompt display, and parsing are identical everywhere.

| File | Role |
|------|------|
| `FieldAIButton.tsx` | Per-field "AI" button. Builds a format-only field prompt, shows a **live** prompt preview (dynamic vs static regions tagged), copies/sends to external AI, and parses the paste-back into the one field. Category-aware injection. |
| `BridgeField.tsx` | Uniform labeled input (`text`/`textarea`) + `FieldAIButton`. The Google-form-like field primitive. |
| `BridgeForm.tsx` | Renders a SCHEMA of `BridgeField`s + one **live whole-form prompt** preview + "Fill whole form from AI" + bulk paste-back import. Use for any multi-field form (Series, Episode planning, etc.). |
| `LivePromptPreview.tsx` | The live prompt viewer. Tags each region as **dynamic** (field-driven, color-coded) or **static** (constant rules). Updates as inputs/sections change. |
| `parse.ts` | `parseBridgeResponse(raw, fieldKeys)` — robust JSON extraction (strips ```json fences, regex-extracts first `{...}`/`[...]`), maps onto requested keys, falls back to raw text for single-key prompts. Used by ALL features. |
| `prompt.ts` | `buildFieldPrompt` / `buildFormPrompt` (format-only schema builders), `BridgeCategory` routing (+ `INJECTION_BY_CATEGORY`), section-color palette. |

**Invariants:**
- The prompt shown to the user is **live and field-driven**: it changes as the user types,
  and the preview marks which blocks are dynamic (user input) vs static (fixed rules).
- `category` selects the injection command. Only `content-engine` uses the extension's
  `CONTENT_ENGINE_INJECT` today; learn/goals/finance/resume fall back to clipboard + open-chat.
- Parsing is centralized in `parse.ts` — never re-implement JSON extraction per feature.

### Where it's wired (as of 2026-08-29)
- **Content Creation:** `SeriesView.tsx` (New Series → `BridgeForm`), `EpisodesView.tsx` (New Episode title → `BridgeField`).
- **Finance:** `QuickAddModal.tsx` (description + note fields → `FieldAIButton`).
- **Learn / Lyceum:** `KnowledgeIntakePanel`, `LearnerProfilePanel`, `LearnerSetup`, `LessonDetailModal`, `ResourceInput`, `ImportView` → `FieldAIButton`.
- **Goals / GoldPage** and **ResumeImportPage** → `FieldAIButton`.

## Related Skills

- **agent-forge**: For generating full agentic systems (multiple agents, scheduling, etc.)
- **frontend-external-infra**: For UI components (TemplateSelector, paste-back cards)
