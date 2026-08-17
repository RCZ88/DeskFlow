# Conversation Protocol — Reaction-Diffusion Life Design

## Communication Flow

```
External AI (Specialist) <──> CZ (Human relay) <──> opencode (Project Owner)
```

CZ relays messages **verbatim** between the two AIs. No editing, no summarizing.

## Specialist AI Rules (External — NO codebase access)

1. **Start with questions, not answers.** Before proposing a design, identify 3-5 specific context gaps (e.g., exact GLSL shaders, RingCanvas internals, AppBackground z-structure).
2. **Use REQUEST format:**
   ```
   REQUEST: glsl/simulationFrag.glsl + displayFrag.glsl — I need the actual shader source to decide how to re-map colors to the app's amber-on-black tokens.
   ```
3. **Ask one thing at a time.** Don't request 10 files at once. Iterate.
4. **Flag backend gaps immediately.** If you need an IPC channel, DB column, or shared component that doesn't exist, say so.
5. **The FIRST response must be QUESTIONS, not a design.** Per the skill: "Don't produce RESULT.md in Round 1."
6. **When converged, produce RESULT.md** following the standard spec format:
   - Surface-by-surface placement decision (background / stage backdrop / card texture / hero)
   - Rendering architecture (R3F Canvas vs raw WebGL2; ping-pong targets; buffer resolution strategy)
   - Palette mapping to app tokens (amber #fbbf24, success #34d399, info #38bdf8, sky #56b3f0 on #09090b)
   - Performance budget (paused on tab hidden, `prefers-reduced-motion` respect, internal buffer ≤ canvas resolution, sim passes/frame)
   - Integration points: exact component + insertion line/JSX hooks
   - File-by-file implementation plan
   - Empty/loading/error states (webgl unavailable fallback = static gradient / existing radial glow)

## Project Owner Rules (opencode)

1. **Embed ALL source code in every response.** The external AI has zero file access.
2. **Fetch exactly what was requested.** Don't send extra files "just in case."
3. **Use CONTEXT format:**
   ```
   CONTEXT: <file path> (lines X-Y)
   [actual source code pasted here]
   ```
4. **If a file doesn't exist, say so.** Don't make up code.
5. **If the request is ambiguous, ask CZ to clarify with the Specialist.**
6. **Track the conversation state.** Write each round to `conversation/round-XX.md` with:
   - Specialist asked for: [X]
   - We provided: [Y]
   - Decisions made: [Z]

## CZ (Relay) Rules

1. **Copy-paste verbatim.** Do not summarize, edit, or rephrase AI messages.
2. **Paste INITIAL_PROMPT.md** into the external AI chat to start.
3. **Paste each REQUEST** from external AI → into opencode chat.
4. **Paste each CONTEXT** from opencode → into external AI chat.
5. **When external AI produces RESULT.md**, paste it into opencode chat for implementation.

## Stop Conditions

Stop when ANY are true:
1. Specialist says: "I have enough context to produce RESULT.md"
2. Specialist has asked for context 3 times and received it each time
3. 5 rounds without new questions
4. CZ says "that's enough, produce the result"

## Post-Result Workflow (Project Owner)

1. Save RESULT.md verbatim into this folder.
2. Implement it per the spec — every directive, no triage.
3. Build gates: `npx vite build` (renderer) → preload esbuild → `node scripts/rebuild-main.mjs` → dist checks.
4. Runtime verification: Probe MCP if available, else report NOT LAUNCHED.
5. Report back in CYCLE REPORT format.