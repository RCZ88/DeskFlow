# idiot Trigger Log — 2026-06-19

## What Happened
User asked for a design prompt for the Finance page overhaul. I created CONTEXT_BUNDLE.md and a prompt file, but:
1. Dumped files directly in `agent/docs/` instead of a proper folder (`agent/docs/finance-redesign/`)
2. CONTEXT_BUNDLE.md was not in the same folder as the prompt
3. Prompt didn't include the user's original request verbatim (just paraphrased)
4. Didn't tell the AI "make it DIFFERENT from current design" — no explicit instruction to be creative/different
5. Didn't include current design context so AI knows what NOT to repeat
6. Didn't use 21st.dev MCP to find inspiring finance dashboard components
7. Missed that the CONTEXT_BUNDLE should be co-located with the prompt in the folder

## Root Cause
- Didn't follow the generate-prompt SKILL.md properly — skipped the folder structure requirement
- Didn't read the full skill carefully enough before executing
- Forgot 21st.dev tools exist for design inspiration
- Assumed a single file was enough instead of a proper project folder

## Pattern to Follow
1. When using generate-prompt skill: create a dedicated folder `agent/docs/<topic>/` 
2. CONTEXT_BUNDLE.md goes INSIDE that folder alongside prompt.md
3. Always include user's verbatim request at the top of the prompt
4. Always include a "DIFFERENT from current" / "avoid current design" section
5. Always use 21st.dev MCP to find inspiring components before writing a design prompt
6. The CONTEXT_BUNDLE must be self-contained — the target AI reads ONLY that file to understand the codebase
