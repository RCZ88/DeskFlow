# Conversation Protocol — AI Collaboration Bridge (v2)

## Actual Roles (3-Party Setup)

| Role | Who | Responsibility |
|------|-----|----------------|
| **CZ (Human)** | You | Relay messages between the two AIs. You paste output from one into the other. |
| **Project Owner (opencode)** | Me (coding agent) | Knows the codebase. Gathers context. Writes files to `agent/docs/`. Answers REQUEST questions with CONTEXT responses. |
| **Specialist (External AI)** | Claude / GPT-4 / Gemini | Does NOT have codebase access. Debugs the problem. Asks REQUEST questions. Produces RESULT.md. |

## Flow

```
1. CZ tells opencode: "collaborate with [external AI] on [bug]"
2. opencode writes INITIAL_PROMPT.md (with full source code embedded)
3. CZ copies INITIAL_PROMPT.md content → pastes into external AI chat
4. External AI responds with REQUEST questions
5. CZ copies REQUEST → pastes into opencode chat
6. opencode answers with CONTEXT (actual source code)
7. CZ copies CONTEXT → pastes into external AI chat
8. Repeat 4-7 until external AI produces RESULT.md
9. CZ copies RESULT.md → pastes into opencode chat
10. opencode implements the fix
```

## Message Format Rules

### External AI → CZ → opencode (requests)
```
REQUEST: src/components/SomeComponent.tsx — I need to see how X renders.
```

### opencode → CZ → External AI (responses)
```
CONTEXT: src/components/SomeComponent.tsx (lines 45-89)
[actual source code pasted here]
```

### If file doesn't exist
```
CONTEXT: src/components/SomeComponent.tsx — FILE DOES NOT EXIST. Actual location: src/components/OtherName.tsx.
```

## Rules
1. **External AI asks one thing at a time.** Max 2 files per request.
2. **opencode provides exactly what was asked.** No extra files.
3. **CZ relays verbatim.** Don't summarize or edit the AIs' messages.
4. **No hallucinated APIs.** If something doesn't exist, say so.
5. **Track decisions each round.** opencode maintains running summary in `conversation/round-XX.md`.

## Stop Conditions
1. External AI says "I have enough to produce RESULT.md"
2. 3 rounds of context exchange completed
3. 5 rounds with no new questions
4. CZ says "enough, produce the result"

## File Locations
All artifacts go to: `agent/docs/backandfourth-docs/<idea-slug>/`
- `INITIAL_PROMPT.md` — First message (with embedded source code)
- `CONTEXT_BUNDLE.md` — Full codebase context
- `CONTEXT_GAPS.md` — What's missing
- `conversation/round-XX.md` — Each round's exchange
- `RESULT.md` — Final fix specification from external AI

## State Tracker (opencode maintains this)

```
Round 1:
- External AI asked for: [X]
- We provided: [Y]
- Decisions made: [Z]

Round 2:
- ...

Convergence status: [ongoing / ready for RESULT.md]
```
