# Conversation Protocol — RHEO Landing Page

## Three-Party Roles

| Role | Who | Responsibility |
|------|-----|----------------|
| **CZ (Human)** | The user | Relay messages between the two AIs. Copy-paste output from one into the other. Does NOT edit AI messages. Provides decisions, taste, and direction. |
| **Project Owner (opencode)** | The coding agent running in this codebase | Knows the codebase. Gathers context. Writes artifacts to `agent/docs/`. Answers REQUEST questions with CONTEXT responses containing actual source code. |
| **Specialist (External AI)** | Claude / GPT-4 / Gemini / etc. | Does NOT have codebase access. Designs the landing page. Asks REQUEST questions. Produces RESULT.md. Drives the creative direction. |

## Communication Flow

```
External AI ←→ CZ (Human) ←→ opencode (Coding Agent)
```

CZ relays messages **verbatim** between the two AIs. Do not summarize or edit.

## Turn Sequence

1. CZ tells opencode: "collaborate with [external AI] on the RHEO landing page"
2. opencode writes INITIAL_PROMPT.md (with full context embedded — external AI has no file access)
3. CZ copies INITIAL_PROMPT.md content → pastes into external AI chat
4. External AI responds with its first question or design direction
5. CZ copies response → pastes into opencode chat
6. opencode answers with CONTEXT (actual source code, component examples, etc.)
7. CZ copies CONTEXT → pastes into external AI chat
8. Repeat 4-7 until converged
9. External AI produces RESULT.md
10. CZ copies RESULT.md → pastes into opencode chat
11. opencode implements (in a future session)

## Message Formats

### Specialist AI (External) → asks questions
```
REQUEST: [specific file, component, clarification, or design question]
```

### Project Owner (opencode) → answers
```
CONTEXT: [what this answers]
[actual source code, component examples, or answers]
```

### CZ → relays
```
[verbatim copy of the message — no editing, no summarizing]
```

## Phase Order (Design Conversation)

This is a **design conversation**, not a bug fix. The phases should be:

1. **Identity** — What does RHEO feel like? What's the voice?
2. **Audience** — Who is this landing page for? Developers? Power users? Everyone?
3. **Story** — What's the narrative arc of scrolling down the page?
4. **Sections** — What sections exist, in what order, doing what?
5. **Visual direction** — Which motion mechanics, which MCP components, which colors?
6. **Copy** — Headlines, subtitles, CTAs, feature descriptions
7. **Spec** — RESULT.md with everything above, ready to implement

## Stopping Rules

Stop the conversation when ANY of these are true:
1. The Specialist says: "I have enough context to produce RESULT.md"
2. The Specialist has asked for context 5 times and received it each time
3. The conversation has gone 7 rounds without new questions
4. CZ explicitly says "that's enough, produce the result"

## Anti-Patterns

1. **Don't jump to layouts before identity.** The landing page's feel must come first.
2. **Don't let the Specialist hallucinate RHEO's features.** If unsure, ask.
3. **Don't skip the "store" concept refinement.** CZ wants this idea explored, not ignored.
4. **Don't produce RESULT.md in Round 1.** First output should be questions and directions.
5. **Don't let CZ edit AI messages.** Relay must be verbatim.
6. **Don't assume the Specialist remembers context.** Each message must be self-contained.
7. **Don't rush to code.** This is 90% planning.

## Artifact Locations

```
agent/docs/landing-page-brief/
├── CONTEXT_BUNDLE.md          # What the external AI receives (app features, mechanics, tokens)
├── INITIAL_PROMPT.md          # First message to the external AI (this conversation starter)
├── CONVERSATION_PROTOCOL.md   # These rules (how we communicate)
├── CONTEXT_GAPS.md            # What we don't know yet
└── conversation/
    ├── round-01.md            # First exchange
    ├── round-02.md
    └── ...
└── RESULT.md                  # Final converged specification
```
