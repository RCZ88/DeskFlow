# CONVERSATION PROTOCOL — IDE Analytics Overhaul + DeskFlow VS Code Activity Extension

> Rules of engagement for all three parties. CZ relays messages **verbatim** — never summarize or edit.

## Parties

| Role | Who | Access |
|------|-----|--------|
| **Specialist (External AI)** | Claude / GPT-4 / Gemini etc. | ZERO repo access. Designs the solution. |
| **CZ (Human)** | Copy-pastes between both AIs, verbatim | Full access |
| **Project Owner (opencode)** | DeskFlow repo agent | Full repo access. Fetches context on request. |

## Communication Flow

```
External AI ←→ CZ (Human) ←→ opencode (Coding Agent)
```

## Specialist Rules

1. **Start with questions, not answers.** Round 1 = 3-5 context-gap questions only.
2. **Use REQUEST format:**
   ```
   REQUEST: src/pages/IDEProjectsPage.tsx (lines 1337-1520) — I need the full Overview tab JSX ("AI & Projects Row" + Recent Activity) to redesign it.
   ```
3. **Ask one thing at a time.** Don't request 10 files at once. Iterate.
4. **Flag backend gaps immediately.** The code-activity backend does NOT exist yet — you design it: new HTTP endpoints (port 54321), new tables (e.g. `code_activity` / `file_changes`), new IPC + preload methods if needed. Specify exact schemas/routes in RESULT.md.
5. **When converged, produce RESULT.md** following the standard specification format (design spec + file-by-file implementation plan + backend audit).
6. **Each message must be self-contained.** Never assume the Owner remembers your context.

## Project Owner Rules

1. **Embed ALL source code in INITIAL_PROMPT.md** (done — see CONTEXT_BUNDLE.md, 1341 lines, verbatim). External AI has zero file access.
2. **Fetch exactly what was requested.** Don't send extra files "just in case."
3. **Use CONTEXT format:**
   ```
   CONTEXT: src/pages/IDEProjectsPage.tsx (lines 1337-1520)
   [actual source code pasted here]
   ```
4. **Never hallucinate.** If the file doesn't exist or the request is unclear, say so.
5. **Read the FULL IPC handler before proposing any main.ts changes.** Prefer renderer-side fixes.
6. **DB is READ-ONLY for agents.** All writes happen through the app's own IPC/HTTP server when the user acts.
7. **After implementation, rebuild:** `npx vite build` → esbuild preload → `node scripts/rebuild-main.mjs`. Never break the `#df-fallback`/`did-fail-load` black-screen protection. Files are CRLF.

## CZ Rules

1. Relay messages **verbatim**. Any rephrasing loses technical precision.
2. Do not add commentary or fix typos — paste as-is.
3. Copy INITIAL_PROMPT.md into the external AI chat to start; paste RESULT.md back into opencode to implement.

## Round Tracking

Each round is recorded in `conversation/round-XX.md` with:
- Specialist questions (verbatim `REQUEST:` lines)
- Owner responses (verbatim `CONTEXT:` blocks / answers)
- Decisions reached
- Convergence status: [ongoing / ready for RESULT.md]

## Exit Condition

Converged when the Specialist says "I have enough context to produce RESULT.md" and produces it.

## Do NOT

- Don't produce RESULT.md in Round 1.
- Don't send file paths without code (Specialist side, always embed).
- Don't let the Specialist hallucinate APIs — flag and fetch.
- Don't skip the Context Gap Analysis (see CONTEXT_GAPS.md).
- Don't lose conversation state — every round is written down.
