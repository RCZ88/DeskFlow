# Conversation Protocol — DSL Engine Decision

## Communication Flow
```
Specialist AI (external) ←→ CZ (Human) ←→ Project Owner (opencode)
```

CZ relays messages **verbatim** between the two AIs. Do not summarize or edit.

## Specialist AI Rules
1. **Start with questions, not answers.** Before recommending, identify 3-5 specific context gaps.
2. **Use REQUEST format:** `REQUEST: I need to see how existing IPC handlers validate parameters to understand the security pattern.`
3. **Ask one thing at a time.** Don't request 10 things at once. Iterate.
4. **When converged, produce a decision.** Final output should be a clear recommendation with rationale.

## Project Owner Rules
1. **Fetch exactly what was requested.** Don't send extra files "just in case."
2. **Use CONTEXT format:** `CONTEXT: src/main.ts (lines 450-480) [source code]`
3. **If a file doesn't exist, say so.** Don't make up code.

## CZ Rules
1. **Copy-paste verbatim.** Do not summarize, edit, or rephrase.
2. **Paste INITIAL_PROMPT.md** into the external AI chat to start.
3. **Paste each REQUEST** from external AI → into opencode chat.
4. **Paste each CONTEXT** from opencode → into external AI chat.

## Decision Criteria
The final recommendation must address:
1. Security — can the approach guarantee no eval/injection?
2. Error quality — can it produce schema-aware error messages?
3. Maintainability — can a new developer understand and modify the grammar?
4. Bundle size — how much does it add to the Electron app?
5. Constraints — does it violate the "no new packages" rule?
