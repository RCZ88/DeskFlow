# Context Brain System — Conversation Protocol

## 3-Party Roles

| Role | Who | Responsibility |
|------|-----|----------------|
| **CZ (Human)** | The user | Relay messages between the two AIs. Copy-paste output from one into the other. Does NOT edit AI messages. |
| **Project Owner (opencode)** | The coding agent running in this codebase | Knows the codebase. Gathers context. Writes artifacts to `agent/docs/`. Answers REQUEST questions with CONTEXT responses containing actual source code. |
| **Specialist (External AI)** | Claude / GPT-4 / Gemini / etc. | Does NOT have codebase access. Designs the solution. Asks REQUEST questions. Produces RESULT.md. |

## Communication Flow

```
External AI ←→ CZ (Human) ←→ opencode (Coding Agent)
```

CZ relays messages **verbatim** between the two AIs. Do not summarize or edit.

## Specialist AI Rules

1. **Start with questions, not answers.** Before proposing a design, identify 3-5 specific context gaps.
2. **Use REQUEST format:**
   ```
   REQUEST: src/main/ai/contextBrain.ts — I need to see the full addFact function to understand the bitemporal handling.
   ```
3. **Ask one thing at a time.** Don't request 10 files at once. Iterate.
4. **Flag backend gaps immediately.** If you need an IPC channel that doesn't exist, say so.
5. **When converged, produce RESULT.md** following the standard specification format.

## Project Owner AI Rules

1. **Embed ALL source code in INITIAL_PROMPT.md.** The external AI has zero file access — every relevant file must be pasted inline.
2. **Fetch exactly what was requested.** Don't send extra files "just in case."
3. **Use CONTEXT format:**
   ```
   CONTEXT: src/main/ai/contextBrain.ts (lines 25-50)
   [actual source code pasted here]
   ```
4. **If a file doesn't exist, say so.** Don't make up code.
5. **If the request is ambiguous, ask CZ to clarify with the Specialist.**
6. **Track the conversation state.** Write each round to `conversation/round-XX.md`.

## CZ (Human — relay) Rules

1. **Copy-paste verbatim.** Do not summarize, edit, or rephrase AI messages.
2. **Paste INITIAL_PROMPT.md** into the external AI chat to start.
3. **Paste each REQUEST** from external AI → into opencode chat.
4. **Paste each CONTEXT** from opencode → into external AI chat.
5. **When external AI produces RESULT.md**, paste it into opencode chat for implementation.

## Conversation State Tracker

```
Round 1:
- Specialist asked for: [X]
- We provided: [Y]
- Decisions made: [Z]

Round 2:
- Specialist asked for: [A]
- We provided: [B]
- Decisions made: [C]

Convergence status: [ongoing / ready for RESULT.md]
```

## When to Stop

Stop when ANY of these are true:
1. The Specialist says: "I have enough context to produce RESULT.md"
2. The Specialist has asked for context 3 times and received it each time
3. The conversation has gone 5 rounds without new questions
4. The user explicitly says "that's enough, produce the result"

## Artifacts to Produce

After running this collaboration, the following files should exist:

```
agent/docs/backandfourth-docs/context-brain-system/
├── CONTEXT_BUNDLE.md          # Gathered codebase context
├── INITIAL_PROMPT.md          # First message to Specialist
├── CONVERSATION_PROTOCOL.md   # This file
├── CONTEXT_GAPS.md            # Gap analysis table
├── conversation/
│   ├── round-01.md            # Specialist questions + Owner responses
│   └── ...
└── RESULT.md                  # Final converged specification
```
