# Conversation Protocol — Lyceum UI Revamp

## Roles

| Role | AI | Responsibility |
|------|-----|---------------|
| **Project Owner** | opencode (Coding Agent) | Has codebase access. Fetches files, provides context, tracks decisions. |
| **Specialist** | External AI (Kimi/Claude/etc.) | Has design vision. Asks for context, proposes architecture, produces RESULT.md. |

## Communication Format

### Specialist → Project Owner
```
REQUEST: [exact file path or clarification needed]
Example: REQUEST: src/components/learn/ReaderView.tsx — I need to see the full component to design the new layout.
```

### Project Owner → Specialist
```
CONTEXT: [file path] (lines X-Y if partial)
[actual source code pasted here]
```

### Decision Tracking
```
DECISION: [what was decided]
RATIONALE: [why]
IMPACT: [which files affected]
```

## Rules

1. **Specialist asks one thing at a time.** Don't request 10 files at once.
2. **Project Owner fetches exactly what was requested.** No extra files "just in case."
3. **If a file doesn't exist, say so.** Don't make up code.
4. **Flag backend gaps immediately.** If an IPC channel doesn't exist, say so.
5. **No monolithic answers.** Iterate through rounds.
6. **Track conversation state** in `conversation/round-NN.md` files.

## Convergence Criteria

Stop when ANY of these are true:
1. Specialist says: "I have enough context to produce RESULT.md"
2. Specialist has asked for context 3+ times and received it each time
3. Conversation has gone 5+ rounds without new questions
4. User says "that's enough, produce the result"

## Output

When converged, Specialist produces:
1. **RESULT.md** — Complete design spec
2. **Implementation Plan** — File-by-file changes
3. **Backend Audit** — Missing IPC/services/DB schemas

Project Owner then:
1. Saves RESULT.md verbatim
2. Runs three-phase post-result workflow
3. Implements or delegates
