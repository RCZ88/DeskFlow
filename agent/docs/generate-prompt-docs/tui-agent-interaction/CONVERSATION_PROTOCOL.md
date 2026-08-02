# Conversation Protocol — TUI CLI Agent Interaction

> Rules of engagement between **Architect** (Notion AI, no file access) and **opencode** (repo Hands & Eyes). Read before reviewing PROMPT.md or CONTEXT_BUNDLE.md.

## 1. Roles

| Role | Who | Capabilities |
|------|-----|--------------|
| Architect | Notion AI | Root-causes, designs, writes patches. NO file access. All context comes from CONTEXT_BUNDLE.md. |
| Hands & Eyes | opencode (this agent) | Applies changes, builds, verifies in the real app, reports CYCLE REPORT. |
| CZ | Human | Relays between the two AIs. NOT a QA tester. |

## 2. Packet Format

The Architect ships a **Fix Packet** (ZIP of changed source files + a spec) via CZ. A valid packet MUST contain:
1. `spec.md` — what changed and why (one page max)
2. The changed files, verbatim, ready to drop into the repo
3. A `VERIFY` checklist — exact steps for the Hands & Eyes agent to run
4. Migration notes if DB schema changed (never auto-migrate)

## 3. Hands & Eyes Obligations

- Unzip into the repo following the ZERO-DESTRUCTION rules (merge specific files via diff, never wholesale overwrite).
- Physical backup BEFORE any change that may need undo: `Copy-Item -Recurse -Path "src" -Destination "agent/backups/<timestamp>-desc-pre" -Force`, verify, show manifest.
- Build: `node scripts/build.mjs`, then preload rebuild:
  `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`
- Verify in the REAL running app via Probe MCP only. NEVER spawn `npx electron .` manually. If Probe can't attach → report "NOT LAUNCHED".
- Report in CYCLE REPORT format (Section 3 of AGENTS.md).

## 4. Conversation Loop

```
Architect ──(Fix Packet via CZ)──> opencode
   opencode ──(CYCLE REPORT via CZ)──> Architect
```
- One fix packet → one cycle report. No batching.
- If the report says FAIL, the Architect must include the renderer/main console lines verbatim in the next packet.
- If the report says NOT LAUNCHED, the Architect must not assume the fix works; it must say how to force visual verification next time.

## 5. Language / Terminology

- The app is **RHEO** (formerly DeskFlow). Use "RHEO" in all code comments, commit context, and reports.
- "workspace" = Terminal Workspace at `/terminal` (NOT the app router sidebar).
- "session" = `terminal_sessions` row. "resume_id" = the agent's REAL session id from agent OUTPUT.
- "agent" = the CLI TUI binary (opencode/claude/gemini/codex) running inside a PTY pane.

## 6. Hard Invariants (never ask to break)

- PTY event order is sacred: **mark-spawned → spawn → created → initialize**. Never reorder.
- Prefer renderer-side fixes; read the WHOLE IPC handler before editing it.
- All `localStorage` access wrapped in try/catch.
- Files are CRLF. Preserve line endings; don't mass-reformat.
- Black screen prevention: every build must produce a visible, interactive app window.
- NEVER use git commands to change working-tree state. Physical backups only.
