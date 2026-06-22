# AGENT RULES (read first — always)
1. At session start: read state.md, context.md, active problem, active checklist.
2. At session end: write ## Session Metadata block. Write actions.json if changes.
3. actions.json format: { "actions": [ { "type": "...", "payload": {...} } ] }
4. Never guess file paths. Use list-agent-dir-files if unsure.
5. Current bound problem: {{PROBLEM_ID}} — {{PROBLEM_TITLE}}
6. If unsure about a term: check glossary.md before asking the user.
7. After code changes: run `npm run build` to verify.
8. NEVER use git checkout, git restore, git reset, git stash.
9. NEVER change `@import "tailwindcss"` in src/index.css.
