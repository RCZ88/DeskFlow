# Prompt: Fix Terminal Agent Prompting — Reliable PTY Stdin Delivery

## Raw Request

"terminal agent prompting is broken — text goes to shell instead of agent. the agent:ready detection regex /^[>?$]\s*$/ doesn't match actual CLI output. no launch verification. agentType mismatch. make it work properly."

## Context

Read `agent/docs/terminal-prompt-fix/CONTEXT_BUNDLE.md` as your source of truth for architecture, IPC endpoints, data structures, and exact source code.

The app spawns terminals via node-pty and writes text (system prompt, user instructions) to the PTY's stdin. The text should reach the AI agent CLI (opencode/claude), but instead it reaches the shell (PowerShell) because:

1. **No launch verification** — The app writes `${agent}\r\n` without checking if the binary exists on PATH. If it doesn't exist, PowerShell errors out and consumes all subsequent writes as shell commands.

2. **Regex mismatch** — `detectAgentPrompt` uses `/^[>?$]\s*$/` which only matches a bare prompt character alone on a line. Agent CLIs like `opencode` output `opencode> ` (name + prompt), which the regex rejects.

3. **ANSI escape pollution** — The `dataBuffer` accumulates raw ANSI escape sequences from terminal output. These can appear before or after the prompt text, causing the regex to fail even when the character is present.

4. **agentType optional** — `spawnTerminal` takes `agentType` as an optional 3rd parameter. If omitted, `agent:ready` detection is completely disabled (`!agentReady && agentType && promptDetected` is false).

5. **Multiple simultaneous writes** — `initializeTerminal` writes 3-4 messages back-to-back with only 300ms gaps. The agent receives them all at once (queued in PTY buffer) but may not process them as intended.

6. **agent name mismatch** — `NewSessionDialog` defaults to `'opencode'`, but `handleCreateNewSession` hardcodes `'claude'`.

## The Mandate

Design a comprehensive solution for reliable terminal agent prompting. The solution must ensure that text written to the PTY's stdin always reaches the agent CLI, never the shell, regardless of timing, agent type, or startup duration.

### Part A: Agent Launch Verification

Design a mechanism to verify the agent CLI exists and can launch before attempting to write the launch command. Consider:

- Checking `where.exe <agent>` (Windows) or `which <agent>` before spawning
- Graceful fallback: if the configured agent isn't on PATH, show an error in the terminal UI with installation instructions
- Supporting a configurable agent name list (try multiple names in order)
- Emitting a structured error event (not just text output) so the renderer knows the agent failed to launch

### Part B: Agent Ready Detection

Redesign the `agent:ready` detection to be reliable across different agent CLIs. Considerations:

1. **Regex widening**: The detection must match at least these prompt formats:
   - `> ` (bare prompt)
   - `opencode> `, `claude> `, `ai> ` (name + prompt)
   - `$ ` (shell prompt in bash/zsh)
   - `user@host:~$ ` (full shell prompt) — should NOT trigger agent:ready since this is a shell, not an agent

2. **ANSI stripping**: Strip ANSI escape sequences from `dataBuffer` before checking the regex. Otherwise, `\x1b[1;32m> \x1b[0m` won't match `> `.

3. **Configurable regex per agent type**: Different agents may have different prompt formats. Allow the regex to be configured per `agentType` (e.g., `'opencode'` → `/^opencode>\s/`, `'claude'` → `/^>\s/`).

4. **Handshake alternative**: Instead of relying on output regex, consider a handshake protocol where the app sends a unique token to the PTY, and the agent:ready fires when the token appears echoed in the output. This works with ANY agent CLI regardless of prompt format.

### Part C: Write Sequencing

Redesign how messages are written to the PTY after the agent is ready. The current approach writes multiple messages with only 300ms delays, which is fragile.

1. **Batch strategy**: Write ALL init content as a single message (system prompt + init content + thought instruction concatenated), so the agent processes it as one input.

2. **Wait for each prompt**: After writing each message, wait for `agent:ready` again before writing the next message. This guarantees the agent has finished processing before receiving more input. But note: `agent:ready` only fires on the FIRST detection — subsequent prompt detections don't re-fire the event.

3. **Write all at once with separator**: Write everything as one big message: `systemPrompt\n\n---\n\ninitContent\n\n---\n\nthoughtInstruction`. Let the agent parse the sections.

### Part D: Fix agentType Consistency

Ensure all code paths pass `agentType` consistently:

1. `spawnTerminal(id, cwd, agentType)` must ALWAYS pass a truthy `agentType` — make the 3rd parameter required (not optional)
2. `handleCreateNewSession` must use the agent name from NewSessionDialog's config, not hardcode `'claude'`
3. The `agent:ready` detection should be DEFAULT ON — don't skip it when `agentType` is falsy, just use a default regex

### Part E: Error Recovery

When `agent:ready` doesn't fire within the timeout (currently 15s in `initializeTerminal`, 30s in `startAgentTimeout`):

1. Read the last 500 characters of PTY output and check for error patterns (e.g., "'claude' is not recognized")
2. If the agent binary IS found but the output shows a shell prompt (`PS C:\>`, `$ `), the agent failed to start for some other reason
3. Emit a descriptive `agent:init-error` event with the error text instead of silently timing out
4. Show the error in the terminal UI with a helpful message
5. Provide a "Retry" button that re-sends the launch command

## Output Format

Provide a single comprehensive solution. Do NOT offer Options A/B/C. Design the best version.

For each part (A-E), provide:

1. **Design specification**: What the mechanism is, how it works, when it triggers
2. **Implementation details**: Exact code changes needed per file — which functions to modify, which new functions to add, which IPC channels to create/remove
3. **Data flow diagram**: Show how data moves through the system for both success and failure paths
4. **Error states**: Every failure mode and how the system responds to it

## Constraints

- Must work with both `opencode` and `claude` CLI agents (and any future agent)
- Must not change the PTY spawn mechanism (node-pty via `terminalManager`)
- Must preserve all existing IPC channels (add new ones if needed, don't break existing ones)
- Build must pass after implementation (`npm run build`)
- The solution must handle the case where the agent is already running (e.g., user clicks "Send" in InstructionPanel for an already-initialized terminal)
- The solution must work on Windows (PowerShell) as the primary platform
