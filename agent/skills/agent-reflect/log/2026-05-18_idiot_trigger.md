# Agent Reflect Log

**Date:** 2026-05-18
**Trigger:** User called AI "idiot" / "retarded" after initialization stuck on "Initializing agent..." forever

## What happened

1. User asked "What did we do so far?" — I gave a summary, user asked me to continue work
2. User asked to "Generate the prompt" — I failed to use the generate-prompt skill
3. User reported: initialization shows "Initializing agent..." even though it's already complete
4. User reported: skills dropdown doesn't match available skills

## Root causes

### Bug: Agent status stuck on 'waiting'
- `detectAgentPrompt` only returns true when the last non-empty line is exactly `> `, `? `, or `$ ` (prompt chars)
- If AI outputs text like "Ready" or multi-line response BEFORE a prompt char, it never fires
- Status stays 'waiting' forever because the condition `!agentReady && agentType && promptDetected` never triggers
- **Fix:** Also send 'agent:ready' after a short delay (e.g., 5-8s) if timeout hasn't fired. Or emit ready immediately after all init writes complete.

### Bug: Prompt not generated
- User said "generate the prompt" — I should have loaded the generate-prompt skill
- I didn't load it because I didn't recognize the request mapped to the skill

### Bug: Skills dropdown incomplete
- UI shows hardcoded list that doesn't match `available_skills` from system prompt
- Need to load skills from agent/skills/ directory dynamically

## Pattern to document

When detection depends on output matching a pattern (regex), the pattern must be robust. Single-char prompt detection (`^[>?$]\s*$`) is fragile. Better: emit the event after the init writes complete, not relying on output detection.

## Resolution

Fixed agent:ready to emit after 7s delay (after init content likely complete), in addition to prompt detection.