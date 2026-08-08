# Conversation Protocol — Life Phases Overhaul

## 3-Party Roles

| Role | Who | Responsibility |
|------|-----|----------------|
| **CZ (Human)** | The user | Relay messages between the two AIs. Copy-paste output from one into the other. Does NOT edit AI messages. |
| **Project Owner (opencode)** | The coding agent running in this codebase | Knows the codebase. Gathers context. Writes artifacts to `agent/docs/`. Answers REQUEST questions with CONTEXT responses containing actual source code. |
| **Specialist (External AI)** | Claude / GPT-4 / Gemini / etc. | Does NOT have codebase access. Designs the solution. Asks REQUEST questions. Produces RESULT.md. |

## Communication Flow

```
Specialist AI ←→ CZ (Human) ←→ opencode (Coding Agent)
```

CZ relays messages **verbatim** between the two AIs. Do not summarize or edit.

## Message Formats

### Specialist → Owner (REQUEST)
```
REQUEST: src/components/life-river/phase-form-dialog.tsx — I need to see the current form fields and how they're organized.
```

### Owner → Specialist (CONTEXT)
```
CONTEXT: src/components/life-river/phase-form-dialog.tsx (lines 38-53)
```typescript
const EMPTY: Omit<LifePhase, 'id'> = {
  title: '',
  description: '',
  category: 'growth',
  startMonth: new Date().getMonth() + 1,
  startYear: new Date().getFullYear(),
  ...
}
```
```

### Specialist → Owner (DESIGN)
```
DESIGN: PhaseFormDialog — New Field Layout
[design specification with exact field types, interactions, animations]
```

### Specialist → Owner (RESULT)
```
RESULT.md — The complete converged specification
```

## Rules

### Specialist AI Rules
1. **Start with questions, not answers.** Before proposing a design, identify 3-5 specific context gaps.
2. **Ask one thing at a time.** Don't request 10 files at once. Iterate.
3. **Flag backend gaps immediately.** If you need an IPC channel that doesn't exist, say so.
4. **When converged, produce RESULT.md** following the exact format below.

### Project Owner AI Rules
1. **Fetch exactly what was requested.** Don't send extra files "just in case."
2. **Use CONTEXT format** with file path and line numbers.
3. **If a file doesn't exist, say so.** Don't make up code.
4. **Track the conversation state.** Write each round to `conversation/round-XX.md`.

### CZ (Human) Rules
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

## RESULT.md Format

```markdown
# RESULT.md — Life Phases Overhaul

## PhaseFormDialog Spec
[Every field, every interaction, every state]

## PhaseCard Spec
[Every section, every visual element, every animation]

## Timeline View Spec
[The horizontal scrollable timeline]

## AI Reflection Spec
[How the AI generates reflections]

## Connection Points
[How phases connect to goals, focus groups, memories, tracking data]

## Type Extensions
[Any new fields needed on LifePhase]

## Migration Spec
[SQL to add new columns to life_phases table]
```
