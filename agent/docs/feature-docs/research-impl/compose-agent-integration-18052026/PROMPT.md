# Research Prompt: Compose Panel → AI Agent Integration

## Raw Request

```
again, the compose didnt insert into the ai agent properly, it just pushes it down.

using the @agent\skills\generate-prompt/ skill to research on how to insert and send and do every interaction properly with multiple idffernet coding agents like claude code, opencode, gemini cli, codex, etc
GENERATE THE PROMPT AND I WILL DO MY OWN RESEARCH WITH THE PROMPT
```

## Problem Statement

The Compose panel sends user instructions to AI coding agents (Claude Code, OpenCode, Gemini CLI, Codex, etc.) but the instructions are not being properly inserted into the agent's context. Additionally, when the compose panel opens, it pushes the terminal down instead of squashing it, causing the bottom part of the terminal (where the input area is) to disappear. The user wants a comprehensive research document covering how each major AI coding agent handles instruction injection, prompt sending, and terminal interaction.

## Engineering Task: Research the Data Processing Pipeline

Research and document for each supported AI agent:

1. **Claude Code**
   - How to inject instructions via terminal (stdin, file, environment variable)
   - How to send a prompt mid-session (without restart)
   - How to handle multi-turn conversation
   - Terminal integration methods (PTY, subprocess, IPC)
   - Any known undocumented flags or approaches
   - How Claude Code reads its system prompt / initial context
   - Claude Code CLI flags for non-interactive prompt injection

2. **OpenCode**
   - Available CLI flags for prompt injection
   - How to send instructions mid-session
   - Terminal integration approach
   - Session management (how does it track context)
   - Any IPC or socket-based communication methods

3. **Gemini CLI**
   - How to inject prompts
   - Session/state management
   - Terminal integration approach
   - CLI flags for non-interactive mode
   - How it reads and processes context files

4. **OpenAI Codex / Azure Codex**
   - CLI integration approach
   - How to send prompts mid-session
   - Terminal behavior
   - Session management

5. **Other agents** (Cursor AI, Copilot, etc.)
   - What integration methods exist
   - Terminal injection approach
   - Limitations and workarounds

## Design Task: Integration Architecture

For each agent, document:
- **Input method**: How does the agent accept text input (stdin, file, flag, IPC)?
- **Session continuity**: Can you send multiple prompts without restarting?
- **Context injection**: How to inject problems/requests/checklist context mid-session?
- **Exit/ACK signal**: How does the agent signal it's ready for more input?
- **Error handling**: What happens if the command fails or times out?

## UX Task: Interaction Flow

Document the user-facing interaction for each agent:
- How the compose panel triggers agent interaction
- How instructions are formatted before sending
- How the terminal responds
- Error and timeout handling
- How the user knows the agent received the instruction

## Constraints

- Research must cover at minimum: Claude Code, OpenCode, Gemini CLI, Codex
- Must include actual CLI flags, commands, or code snippets for each method
- Must identify which methods are documented vs. undocumented
- Must note security considerations for each approach
- Must document which methods work without restart

## Output Format

Create a structured research document saved to `agent/docs/research-impl/compose-agent-integration-18052026/RESEARCH.md` with:
- Per-agent sections with all discovered methods
- CLI command examples that can be copy-pasted and tested
- Pros/cons of each method
- Any undocumented approaches discovered through research