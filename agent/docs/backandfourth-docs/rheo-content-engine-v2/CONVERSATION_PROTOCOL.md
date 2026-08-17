# Conversation Protocol — RHEO Content Engine v2.0

## 3-Party Roles

| Role | Who | Responsibility |
|------|-----|----------------|
| **CZ (Human)** | The user | Relay messages between the two AIs verbatim |
| **Project Owner (opencode)** | Coding agent in this codebase | Gathers context, answers REQUEST questions with CONTEXT responses |
| **Specialist (External AI)** | Claude / GPT-4 / Gemini | Designs the solution, asks REQUEST questions, produces RESULT.md |

## Communication Flow

```
External AI ←→ CZ (Human) ←→ opencode (Coding Agent)
```

## Rules

### Specialist AI (External)
1. Start with questions, not answers. Identify 3-5 context gaps first.
2. Use `REQUEST: [file path]` format for context requests.
3. Ask one thing at a time. Don't request 10 files at once.
4. Flag backend gaps immediately.
5. When converged, produce RESULT.md.

### Project Owner (opencode)
1. Embed source code in responses — the external AI has zero file access.
2. Fetch exactly what was requested.
3. Use `CONTEXT: [file path]\n[code]` format.
4. If a file doesn't exist, say so.
5. Track conversation state in `conversation/round-XX.md`.

### CZ (Human)
1. Copy-paste verbatim. Do not summarize or edit.
2. Paste INITIAL_PROMPT.md into external AI chat to start.
3. Paste each REQUEST from external AI → into opencode chat.
4. Paste each CONTEXT from opencode → into external AI chat.
5. When external AI produces RESULT.md → paste into opencode for implementation.

## Convergence Criteria

Stop when ANY of:
1. Specialist says "I have enough context to produce RESULT.md"
2. Specialist has asked for context 3 times and received it
3. Conversation has gone 5 rounds without new questions
4. User says "that's enough, produce the result"

## Anti-Patterns
1. Don't send file paths without code
2. Don't let the Specialist hallucinate APIs
3. Don't skip context gap analysis
4. Don't produce RESULT.md in Round 1
5. Don't lose conversation state
6. Don't let CZ edit AI messages
