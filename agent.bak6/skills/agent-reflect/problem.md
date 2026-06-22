# Durable Debugging Rules

Rules extracted from real bugs to prevent repeat mistakes.

## 1. Tailwind v4 CSS — NEVER use v3 directives

This project uses `tailwindcss` v4 (`4.2.1`). `src/index.css` MUST use `@import "tailwindcss";`. NEVER change it to v3 directives (`@tailwind base; @tailwind components; @tailwind utilities;`) — v3 directives silently break v4 (CSS builds successfully but most utility classes are missing).

## 2. Package pinning — NEVER run `npm install tailwindcss@latest`

`tailwindcss: "4.2.1"` and `@tailwindcss/vite: "4.2.1"` are pinned exact. Running `@latest` may downgrade to v3. Do NOT add `autoprefixer` or `postcss` — they are v3 dependencies. `electron.vite.config.ts` already handles everything.

## 3. Jest config — `testEnvironment: "jsdom"` NOT "node"

This project uses `jsdom` (not "node") because components render DOM. Keep test environment set to "jsdom".

## 4. Do NOT use git checkout/restore/reset/stash

Git revert commands destroy work. If something broke, fix the code manually. Never run:
- `git checkout -- <file>`
- `git checkout HEAD -- <file>`
- `git restore <file>`
- `git reset --hard`
- `git stash`

## 5. Identifiers colliding with DOM globals

If a JSX variable has a name like `name`, `title`, `description`, `list`, `items` — check if it shadows a DOM global or HTML attribute. Use more specific names like `sessionName`, `dialogTitle`, etc.

## 6. CSS calc with Tailwind

Don't use Tailwind arbitrary values inside `calc()` that mix percentages and fixed units unless verified to work. Prefer `flex` or `grid` for layout over manual width calcs.

## 7. Empty states in components

Every data-fetching component needs:
- Loading skeleton (not just "Loading...")
- Error state with retry button
- Empty state with helpful message
- Normal data state

## 8. IPC handler naming consistency

IPC channel names in `main.ts` and `preload.ts` must match exactly. Use `kebab-case` for channel names. Always verify both sides when adding new IPC.

## 9. Form state reset

When using dialogs/forms with `defaultValue` props, reset state properly on open. `setName('')` unconditionally discards the `defaultName` prop — check if a default exists before resetting.

## 10. Console errors = reject

If there are console errors or unhandled rejections, the change is not done. Fix all console errors before considering a task complete.

## 11. Raw Request in prompts = verbatim user messages

When generating prompts (via generate-prompt skill), the Raw Request block MUST contain the user's exact words — every message, in order, unedited. Do NOT condense, rephrase, summarize, or reformat. You are the transcriptionist, not the author. Breaking this rule will cause the user to call you an idiot (and they'll be right).

## 12. NEVER run `git clean -fdx`

`git clean -fdx` deletes ALL untracked files — including `.ts` source files that exist only in the working directory (not committed). These are NEVER recoverable from git. On this project:
- The original `src/services/*.ts` files were deleted — only recreated by hand from bundled CJS output fragments
- `src/main.ts` was overwritten with a pre-compiled CJS backup that had uncommitted changes — the real source is lost
- Build artifacts, documentation, and backups were also deleted

**What to do instead:**
- If you need to clean build artifacts, use the project's `npm run clean` or manually delete the specific `dist/` / `dist-electron/` directories
- If untracked files are in the way, move them to a temp directory first
- **Never use any `git clean` variant** — flags like `-f`, `-fd`, `-fdx`, `-ffd`, `-ffdx` are all destructive

## 13. CYCLE REPORT format for ALL status responses

For ANY status query ("what did we do", "where are we", "progress", etc.), the response MUST be the EXACT format below (from user's final clarification):

```
---
CYCLE: <n>
BUILD: OK/FAIL | main.cjs <timestamp> | preload.cjs <timestamp>
GATE A  window.deskflowAPI: <object with N keys | undefined>
FEATURE: <name>
  STEPS: <what you clicked/ran>
  EXPECTED: <from packet>
  ACTUAL: <what happened>
  RENDERER CONSOLE: <relevant lines | none>
  MAIN CONSOLE: <relevant lines | none>
  VERDICT: PASS / FAIL / PARTIAL
REPRO (if FAIL): <exact steps>
ARTIFACTS: <paths to screenshots/logs>
---
```

One `---` block per cycle/feature. No preamble, no narrative, no extra sections. This has been documented in reflection logs 3+ times (2026-06-21) because it keeps being violated.

## 14. NEVER invent service/provider names

Every name, URL, and label for external services must be verified against real documentation. "CloudFlayer", "Invilier", "Olamah" are all wrong — Cloudflare, Ollama (and Invilier doesn't exist). Before adding any external service reference:
1. Search for the actual service name and API docs
2. Verify the URL pattern against their official docs
3. Confirm the service actually exists (a provider with zero search results = doesn't exist)
