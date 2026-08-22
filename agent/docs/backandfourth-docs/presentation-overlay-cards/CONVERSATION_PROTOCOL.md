# Conversation Protocol — Presentation Overlay Cards

> Rules of engagement for the back-and-forth between Project Owner (opencode) and Specialist AI.

## 3-Party Roles

| Role | Who | Responsibility |
|------|-----|----------------|
| **CZ (Human)** | The user | Relay messages between the two AIs. Copy-paste output from one into the other. Does NOT edit AI messages. |
| **Project Owner (opencode)** | The coding agent | Knows the codebase. Gathers context. Writes artifacts to `agent/docs/`. Answers REQUEST questions with CONTEXT responses containing actual source code. |
| **Specialist (External AI)** | Claude / GPT-4 / Gemini / etc. | Does NOT have codebase access. Designs the slide system architecture. Asks REQUEST questions. Produces RESULT.md. |

## Communication Flow

```
External AI ←→ CZ (Human) ←→ opencode (Coding Agent)
```

CZ relays messages **verbatim** between the two AIs. Do not summarize or edit.

## Specialist AI Rules

1. **Start with questions, not answers.** Before proposing a design, identify 3-5 specific context gaps.
2. **Use REQUEST format:**
   ```
   REQUEST: src/services/SessionService.ts — I need to see how sessions are created to design the new flow.
   ```
3. **Ask one thing at a time.** Don't request 10 files at once. Iterate.
4. **Flag backend gaps immediately.** If you need an IPC channel that doesn't exist, say so.
5. **When converged, produce RESULT.md** following the standard specification format.

## Project Owner AI Rules

1. **Embed ALL source code in responses.** The external AI has zero file access — every relevant file must be pasted inline.
2. **Fetch exactly what was requested.** Don't send extra files "just in case."
3. **Use CONTEXT format:**
   ```
   CONTEXT: src/services/SessionService.ts (lines 45-89)
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

opencode maintains this in `conversation/round-XX.md`:

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

## When to Stop the Conversation

Stop when ANY of these are true:
1. The Specialist says: "I have enough context to produce RESULT.md"
2. The Specialist has asked for context 3 times and received it each time
3. The conversation has gone 5 rounds without new questions
4. The user explicitly says "that's enough, produce the result"

## Expected Final Output

After convergence, the Specialist produces:
1. **RESULT.md** — Complete design spec for the presentation overlay card system
2. **Implementation Plan** — File-by-file changes
3. **Backend Audit** — Any missing IPC/services/DB schemas flagged

## Scope Boundary

- **IN:** Presentation overlay card system — slide generation, rendering, export, internal editing, episode integration
- **OUT:** The existing Overlay Studio pipeline (video overlay suggestion) — that stays as-is
- **IN:** The Content Engine episode → presentation bridge
- **OUT:** The existing Content Engine 8-stage pipeline — that stays as-is
