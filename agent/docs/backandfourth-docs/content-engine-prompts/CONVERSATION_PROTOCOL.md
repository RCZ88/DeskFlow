# Conversation Protocol — Content Engine Prompts

## Communication Flow

```
Specialist AI (External) ←→ CZ (Human) ←→ opencode (Coding Agent)
```

CZ relays messages **verbatim** between the two AIs. Do not summarize or edit.

## Specialist AI Rules (External — has NO codebase access)

1. **Start with questions, not answers.** Before proposing improvements, identify what's unclear.
2. **Use REQUEST format:**
   ```
   REQUEST: [specific question about a prompt, its output shape, or its context]
   ```
3. **Ask one thing at a time.** Don't request 10 clarifications at once.
4. **Flag backend gaps immediately.** If a prompt needs a new template variable that the backend doesn't support, say so.
5. **When converged, produce RESULT.md** with the complete improved version of every prompt.

## Project Owner Rules (opencode — has full codebase access)

1. **Answer with actual source code.** Don't describe — paste the real code.
2. **Use CONTEXT format:**
   ```
   CONTEXT: [file path]
   [actual source code pasted here]
   ```
3. **If a file doesn't exist, say so.** Don't make up code.
4. **Track conversation state.** Write each round to `conversation/round-XX.md`.

## CZ Rules (Human — relay)

1. **Copy-paste verbatim.** Do not summarize, edit, or rephrase AI messages.
2. **Paste INITIAL_PROMPT.md** into the external AI chat to start.
3. **Paste each REQUEST** from external AI → into opencode chat.
4. **Paste each CONTEXT** from opencode → into external AI chat.
5. **When external AI produces RESULT.md**, paste it into opencode chat for implementation.

## First Question (from INITIAL_PROMPT.md)

Before sending the full prompt source code, the Specialist must confirm they understand:

1. Each prompt generates JSON for a short-form video creation pipeline
2. The output must be actionable for a 17-year-old with $0 budget, 20 min max edit time, CapCut only
3. Every prompt must include the creator context (age, location, audience, brand, budget, platforms)
4. "story" is a BANNED format type — never appear in any output
5. The prompts must produce output that directly maps to UI components (ScriptProofCard, HookStackDisplay, etc.)

**Once confirmed, the Project Owner sends the full prompt source code from CONTEXT_BUNDLE.md.**

## Convergence Criteria

Stop the conversation when:
1. The Specialist says: "I have enough context to produce RESULT.md"
2. The Specialist has asked for context 3 times and received it each time
3. The conversation has gone 5 rounds without new questions
4. CZ says "that's enough, produce the result"

## Expected Output

After convergence, the Specialist produces:
1. **RESULT.md** — Complete improved version of ALL prompts with creator context, examples, and actionability
2. **Implementation Plan** — Which prompts change, what template variables are added/removed
3. **Backend Audit** — Any IPC handler changes needed to support new template variables
