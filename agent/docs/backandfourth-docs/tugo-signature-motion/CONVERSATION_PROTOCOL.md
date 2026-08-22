# Conversation Protocol — RHEO Signature Motion System

## Communication Flow

```
Specialist AI ←→ CZ (Human) ←→ opencode (Project Owner)
```

CZ relays messages **verbatim** between the two AIs. Do not summarize or edit.

---

## Specialist AI Rules (External — NO codebase access)

1. **Start with questions, not answers.** Before proposing a design, identify 3-5 specific context gaps.
2. **Use REQUEST format:**
   ```
   REQUEST: src/components/AppBackground.tsx — I need to see how the current background routing works to design the signature layer.
   ```
3. **Ask one thing at a time.** Don't request 10 files at once. Iterate.
4. **Flag backend gaps immediately.** If you need an IPC channel that doesn't exist, say so.
5. **When converged, produce RESULT.md** following the format below.

## Project Owner Rules (opencode — full codebase access)

1. **Fetch exactly what was requested.** Don't send extra files "just in case."
2. **Use CONTEXT format:**
   ```
   CONTEXT: src/components/AppBackground.tsx (lines 1-82)
   [actual source code pasted here]
   ```
3. **If a file doesn't exist, say so.** Don't make up code.
4. **If the request is ambiguous, ask CZ to clarify with the Specialist.**
5. **Track the conversation state.** Write each round to `conversation/round-XX.md`.

## CZ (Human — relay) Rules

1. **Copy-paste verbatim.** Do not summarize, edit, or rephrase AI messages.
2. **Paste INITIAL_PROMPT.md** into the external AI chat to start.
3. **Paste each REQUEST** from external AI → into opencode chat.
4. **Paste each CONTEXT** from opencode → into external AI chat.
5. **When external AI produces RESULT.md**, paste it into opencode chat for implementation.

---

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

---

## When to Stop

Stop when ANY of these are true:
1. The Specialist says: "I have enough context to produce RESULT.md"
2. The Specialist has asked for context 3 times and received it each time
3. The conversation has gone 5 rounds without new questions
4. The user explicitly says "that's enough, produce the result"

---

## Expected RESULT.md Format

```markdown
# RESULT.md — RHEO Signature Motion System

## 1. Design Decision
[One sentence: what is The Current for RHEO?]

## 2. State Model
[The minimal invariant state that persists across route changes]

## 3. Topology Per Page
[Table: Page → CurrentMode → What It Shows → How Topology Changes]

## 4. Architecture
[How <RheoCurrent /> mounts, persists, transitions between modes]

## 5. Primitives
[Pulse, Stream, Node, Edge, Branch, Orbit, Field, Contour, Signal, Mask — API]

## 6. Implementation Plan
[File-by-file changes with code snippets]

## 7. Performance Budget
[GPU/CPU limits, optimization strategy]

## 8. Reduced Motion Plan
[What happens when prefers-reduced-motion is enabled]

## 9. Integration with Existing System
[How this layers on top of AppBackground.tsx and LivingSubstrate]

## 10. Known Gaps
[What's not yet implemented, what needs further work]
```
