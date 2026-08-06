# Conversation Protocol — Generalizable AI Agent Framework (Round 1)

> Rules of engagement for the 3-party relay. All parties follow this. CZ relays messages **verbatim** — do not summarize or edit.

## Parties

| Role | Who | Responsibility |
|---|---|---|
| **Architect (Specialist)** | External AI (Notion) | No repo access. Drives the discussion with questions. Produces RESULT.md. |
| **Project Owner (opencode)** | This agent | Full repo access. Serves verbatim file content on REQUEST. Tracks rounds. |
| **CZ (Human)** | The user | Copy-pastes verbatim between the two AIs. Never edits messages. |

## Flow

```
1. CZ pastes INITIAL_PROMPT.md into the Architect chat
2. Architect responds with REQUEST: <path> questions + initial extraction take
3. CZ pastes REQUEST → opencode
4. opencode answers with CONTEXT: <path> + verbatim content (writes round-XX.md)
5. CZ pastes CONTEXT → Architect
6. Repeat 2–5 until Architect says "enough context" or 3+ rounds without new questions
7. Architect produces RESULT.md (extraction verdicts + generalization design + proposed framework file tree + build order)
8. CZ pastes RESULT.md → opencode
9. opencode implements in a later cycle (repo location decided then)
```

## Architect rules
1. Start with questions, not answers — this is a DISCUSSION round.
2. Format: `REQUEST: <exact file path> — why you need it`
3. Ask one thing at a time (or a small coherent set).
4. Call the verdict per item: 🟢 extract / 🟡 generalize / 🔴 leave.
5. Do not produce RESULT.md in Round 1. Converge first.

## Project Owner (opencode) rules
1. Fetch exactly what was requested; paste verbatim with `CONTEXT:` header.
2. If a file doesn't exist, say so — never fabricate.
3. Track each round in `round-XX.md` (this folder).
4. If a request is ambiguous, ask CZ to clarify with the Architect.

## CZ rules
1. Paste INITIAL_PROMPT.md verbatim to start.
2. Relay REQUEST ↔ CONTEXT verbatim. No rephrasing.
3. When RESULT.md arrives, paste it verbatim into opencode.

## Stop conditions
- Architect: "I have enough context to produce RESULT.md"
- 3 REQUESTs answered without new questions
- 5 rounds without progress
- CZ says "that's enough, produce the result"

## Round tracker (maintained by opencode in this folder)

```
Round 1:
- Architect asked for: [X]
- We provided: [Y]
- Decisions: [Z]
Convergence status: ongoing
```

## Artifacts (this folder = `agent/docs/backandfourth-docs/framework-extraction/`)

```
INITIAL_PROMPT.md        # First message to the Architect
CONTEXT_BUNDLE.md        # Part A: core files EMBEDDED verbatim; Part B: inventory (fetch on REQUEST)
CONTEXT_GAPS.md          # Gap table
CONVERSATION_PROTOCOL.md # This file
conversation/round-01.md # Per-round records (Specialist questions + Owner responses)
RESULT.md                # Final converged extraction plan (Architect's output, saved verbatim)
```
