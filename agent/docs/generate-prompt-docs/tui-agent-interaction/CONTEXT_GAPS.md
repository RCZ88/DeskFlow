# Context Gaps — Questions the Architect Must Resolve

> Open questions that block a correct design. The Hands & Eyes agent could not answer these from the code alone; the Architect must resolve them (via CZ + real-world knowledge of the CLI agents) BEFORE writing the Fix Packet. Mark each `[RESOLVED]` as the packet ships.

## G1. What does opencode actually output on startup?

The bundle states (Section 6) opencode does NOT print its session ID to stdout during normal operation, yet the whole redesign depends on `parseSessionIdFromOutput`. Resolve:
- Does `opencode` accept a flag/command that prints the current session ID? (e.g. `opencode --session-id`, an internal slash command, or reading `~/.local/share/opencode/opencode.db` from within the session)
- Is there a deterministic startup banner line we can parse? If NOT, the session-ID-from-output requirement fails and we need the PID-correlated DB read as PRIMARY (main.ts:11594 currently path-matches — upgrade it to PID/time-correlate with the node-pty child).

**Status:** [ ] OPEN

## G2. Which agents are true TUIs vs plain readline?

`AGENT_CONFIGS.bracketedPaste` is currently `true` for ALL four agents. Resolve per-agent `inputMode`:
- opencode: full TUI (readline with nav/autocomplete) — likely `readline` mode, prompt `opencode> `
- claude: TUI or readline? (claude-code historically uses a terminal UI; recent versions may accept piped stdin)
- gemini: `gemini-cli` — TUI?
- codex: `codex` — TUI with its own prompt style (`codex> `?)
If the Architect cannot verify each binary's behavior, the packet must ship a per-agent input strategy that the Hands & Eyes agent can instrument and report back on.

**Status:** [ ] OPEN

## G3. What is the desired latency budget for "session ID shown in UI within 5s"?

PROMPT.md acceptance criterion #1 says the real session ID must appear within 5 seconds. If opencode prints no banner, the ONLY way to hit 5s is the DB read (row is created at process spawn). Resolve whether 5s is hard, or whether "after first user prompt" is acceptable when parsing output.

**Status:** [ ] OPEN

## G4. Does `agent:send` need to change its return value / timing?

Current `agent:send` (main.ts:11505) queues writes when phase is launching/busy. If we add a "confirm the agent accepted the prompt" step, does the IPC return a promise that resolves on acceptance, or fire-and-forget with a separate `agent:status` event? PROMPT.md introduces `agent:status` — the Architect must specify the exact event payload shape so preload + renderer match.

**Status:** [ ] OPEN

## G5. Where does the input pipeline's state live across renderer reloads?

`AgentState` lives in main (per terminalId). If the window reloads (dev), renderer listeners re-register but main state persists. The new `onAgentSessionIdCaptured`/`onAgentStatus` listeners must be re-attached on TerminalPage mount. Confirm the renderer re-subscribes in a `useEffect` keyed on terminalId (pattern already used for `onAgentReady`), or the Architect wants a "current state snapshot" IPC to sync on mount.

**Status:** [ ] OPEN

## G6. Verification method for the new output parser

The parser (`src/main/agentOutput.ts`) is pure logic but sits inside the Electron main bundle. How should the Hands & Eyes agent unit-verify it without launching the app? Options: (a) a `node scripts/verify-parser.mjs` harness that feeds recorded opencode output files; (b) Probe MCP reading console after a real session. The Architect must pick one and put it in the VERIFY checklist — the parser must not ship unverified.

**Status:** [ ] OPEN
