# Conversation Protocol — Presentation Architecture Refactor

## Communication Flow

```
External AI ←→ CZ (Human) ←→ opencode (Coding Agent)
```

CZ relays messages **verbatim** between the two AIs. Do not summarize or edit.

## Specialist AI (External — has NO codebase access) Rules

1. **Start with questions, not answers.** Before proposing a design, identify 3-5 specific context gaps.
2. **Use REQUEST format:**
   ```
   REQUEST: src/services/presentation/themeRegistry.ts — I need to see how themes are structured to design the JSON schema's style fields.
   ```
3. **Ask one thing at a time.** Don't request 10 files at once. Iterate.
4. **Flag backend gaps immediately.** If you need a DB column that doesn't exist, say so.
5. **When converged, produce RESULT.md** following the standard format.

## Project Owner AI (opencode — has full codebase access) Rules

1. **Fetch exactly what was requested.** Don't send extra files "just in case."
2. **Use CONTEXT format:**
   ```
   CONTEXT: src/services/presentation/themeRegistry.ts (lines 1-50)
   [actual source code pasted here]
   ```
3. **If a file doesn't exist, say so.** Don't make up code.
4. **Track the conversation state.** Write each round to `conversation/round-XX.md`.

## CZ (Human — relay) Rules

1. **Copy-paste verbatim.** Do not summarize, edit, or rephrase AI messages.
2. **Paste INITIAL_PROMPT.md** into the external AI chat to start.
3. **Paste each REQUEST** from external AI → into opencode chat.
4. **Paste each CONTEXT** from opencode → into external AI chat.
5. **When external AI produces RESULT.md**, paste it into opencode chat for implementation.

## When to Stop

Stop when ANY of these are true:
1. The Specialist says: "I have enough context to produce RESULT.md"
2. The Specialist has asked for context 3 times and received it each time
3. The conversation has gone 5 rounds without new questions
4. The user explicitly says "that's enough, produce the result"

## Expected RESULT.md Format

```markdown
# RESULT: Presentation Architecture Refactor

## Problem
[1-paragraph summary of the architectural mismatch]

## Solution
[1-paragraph summary of the new architecture]

## New System Prompt
[The redesigned PROMPT_GENERATE_SLIDE that outputs JSON instead of HTML]

## JSON Schema
[The exact contract: PresentationSpec, SlideSpec, VisualSpec, ContentSpec, StyleSpec]

## Parser Changes
[How htmlParser.ts changes to parse JSON instead of HTML sections]

## Renderer Changes
[How PresentationWorkspace.tsx changes to render from structured data]

## Migration Plan
[How to handle existing HTML-based presentations]

## File-by-File Changes
| File | Change | Lines Affected |
|------|--------|----------------|
| prompts.ts | Replace PROMPT_GENERATE_SLIDE | 42-101 |
| htmlParser.ts | Replace HTML parsing with JSON parsing | All |
| slideValidator.ts | Add JSON schema validation | All |
| PresentationWorkspace.tsx | Replace iframe with React components | 814-829 |
| promptComposer.ts | Update compilePrompt if needed | 466-523 |
```
