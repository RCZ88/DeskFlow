# Conversation Protocol — Life River Overhaul

## Communication Flow

```
External AI (Specialist) ←→ CZ (Human) ←→ opencode (Project Owner)
```

CZ relays messages **verbatim** between the two AIs.

## Specialist AI Rules

1. **Start with questions, not answers.** Before proposing a design, identify 3-5 specific context gaps.
2. **Use REQUEST format:**
   ```
   REQUEST: src/components/life-river/phase-form-dialog.tsx — I need to see the full Step 1 ("The Chapter") section to understand where voice input should be added.
   ```
3. **Ask one thing at a time.** Don't request 10 files at once. Iterate.
4. **Flag backend gaps immediately.** If you need a DB column or IPC channel that doesn't exist, say so.
5. **When converged, produce RESULT.md** following the standard specification format.

## Project Owner Rules

1. **Embed ALL source code in responses.** The external AI has zero file access.
2. **Fetch exactly what was requested.** Don't send extra files "just in case."
3. **Use CONTEXT format:**
   ```
   CONTEXT: src/components/life-river/phase-form-dialog.tsx (lines 830-850)
   [actual source code pasted here]
   ```
4. **If a file doesn't exist, say so.** Don't make up code.
5. **Track conversation state.** Write each round to `conversation/round-XX.md`.

## CZ (Relay) Rules

1. **Copy-paste verbatim.** Do not summarize, edit, or rephrase AI messages.
2. **Paste INITIAL_PROMPT.md** into the external AI chat to start.
3. **Paste each REQUEST** from external AI into opencode chat.
4. **Paste each CONTEXT** from opencode into external AI chat.
5. **When external AI produces RESULT.md**, paste it into opencode chat.

## Scope

- **IN:** PhaseFormDialog voice integration, draft system design, lens propagation, River mode UX for covenant/gold/memories, visualization interactivity, river size
- **OUT:** Changes to the Pages mode (CovenantPage, MemoriesPage, GoldPage standalone pages), database migration strategy (that's implementation detail)

## Expected Output

After convergence, produce:
1. **RESULT.md** — Complete design specification
2. **Implementation Plan** — File-by-file changes
3. **Backend Audit** — Any missing IPC/services/DB schemas flagged
