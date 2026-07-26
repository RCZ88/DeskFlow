## Raw Request

> "how can we ensure that the stuff like checking the current model used and changing the model, exporting a chat, and other / features of an ai cli agent can be done. because most of these uses not only typing but also mouse usage of clicking in to the ui and stuff and like sometimes several stuff of like combination between up arrow and typing and stuff. is there a workaround to let the system infrastructure be able to 'see' whats going on and like go from there to think. or do we need to look at the backend of the cli and trick or do some magic from there?"

## Context

**DeskFlow** is an Electron app that embeds an xterm.js terminal (via node-pty) for launching and interacting with AI CLI agents (OpenCode, Claude Code). Currently:

- Agents are launched by typing their command into a PTY shell: `claude` or `opencode`
- Agent state is detected by matching PTY output against regex signatures (`AGENT_SIGNATURES: opencode=/>\s*$/, claude=/claude[\s>]|\?\s*$/i`)
- Once launched, **the system is blind** — it only knows `spawning | waiting | ready | timeout` agent status
- The system prompt can influence agent behavior, but there is no bidirectional IPC between DeskFlow and the agent
- Chat export, model switching, and slash commands happen **inside the terminal** and are invisible to DeskFlow
- DeskFlow already passively syncs token usage from agent storage files (OpenCode SQLite DB, Claude Code JSONL) via `AIAgentPlugin` system

## The Mandate

Design a comprehensive solution for DeskFlow to gain **bidirectional visibility** into AI CLI agent state. The system should be able to detect, query, and (where safe) influence agent behavior without relying on fragile terminal output parsing or screen capture.

## Requirements

### 1. Agent State Visibility
- Detect **which model** the agent is currently using (e.g., opencode's current model, claude-code's API model)
- Detect **agent configuration** (e.g., custom instructions, temperature, max tokens)
- Report **agent status** beyond the current 4-state model (e.g., "generating", "waiting for input", "has uncommitted changes", "running command")
- Show **real-time token usage** and cost

### 2. Chat & History Management
- **Export chat** from a running or completed session
- **Browse chat history** (messages, decisions, command outputs)
- **Replay/scroll back** through session history
- **Search** across all agent conversations

### 3. Slash Command Awareness
- Detect when a user sends a slash command to the agent (e.g., `/model`, `/compact`, `/cost`)
- Know the **result** of a slash command (e.g., did the model change? what's the new cost?)
- Optionally **inject or suggest** slash commands programmatically

### 4. Model Switching
- Allow the user to **see and change the model** from DeskFlow UI (outside the terminal)
- Support per-session model selection and per-project defaults
- Show available models for the current agent

## Technical Approaches to Evaluate

### Approach A: Backend Storage Reads (Passive)
Read the agent's own storage directly from the DeskFlow main process:
- **OpenCode**: SQLite DB at `~/.local/share/opencode/opencode.db` — contains models, sessions, messages, config
- **Claude Code**: JSONL files at `~/.claude/projects/*.jsonl` — contains session data, messages, usage stats
- **Gemini CLI**: `~/.gemini/history/`, `~/.gemini/tmp/` — chat history and state files
- **Other agents**: Cursor (VS Code DB), Codex (`~/.codex/`), Qwen (`~/.qwen/`), Aider (`~/.oobo/`)

**Already partially implemented** via `AIAgentPlugin` system (syncs token usage). Could be extended for:
- Polling agent DB for current model/state
- Real-time file watchers on storage directories
- Detecting state changes via DB query patterns

**Questions:**
- How frequently can we poll without perf impact?
- Which tools support writes (model switching) vs reads only?
- Do agents lock their DB files? Can we read while they're running?

### Approach B: PTY Data Stream Interception (Active)
Parse the data flowing between the agent and the terminal in real-time:
- Intercept PTY output in `terminalManager` data handlers before forwarding to renderer
- Parse for structured patterns: model names, cost summaries, status changes
- Detect slash commands being typed by user or agent responses

**Already partially supported:**
- All PTY data flows through `terminalManager.getDataHandler()` in main.ts
- Agent readiness already detected via `AGENT_SIGNATURES` regex on PTY output
- Terminal messages are already persisted to `terminal_messages` DB table

**Questions:**
- Can we reliably parse agent responses for structured data (model, cost, status)?
- Would we need agent-specific parsers for each CLI tool's output format?
- Can we distinguish user input from agent output in the PTY stream?
- How much overhead does real-time parsing add?

### Approach C: IPC via System Prompt Injection (Cooperative)
Leverage the system prompt (already sent on terminal init) to instruct the agent to emit structured metadata:
- Ask agent to output machine-parseable metadata blocks (JSON/YAML frontmatter)
- Ask agent to report model changes, cost updates, and status transitions
- Use existing `Session Metadata Requirements` pattern (Title, Description, Status, Product Area, Category)
- Extend the metadata contract to include: `Model`, `Cost`, `Tokens`, `SlashCommand`, `SlashResult`

**Already partially implemented:**
- System prompt already includes session metadata requirements
- `parseSessionMetadata()` already extracts metadata from terminal messages
- `parseMessageContent()` already extracts decisions, action items, status changes

**Questions:**
- How reliable is asking the agent to self-report? What if the user's agent ignores the prompt?
- Can we validate agent-reported data against backend storage reads?
- What's the fallback when agent doesn't comply?

### Approach D: Plugin/MCP Bridge (Advanced)
Create a plugin or MCP (Model Context Protocol) server that DeskFlow runs alongside the agent:
- DeskFlow provides an MCP server that the agent can query for context
- Agent can call DeskFlow MCP tools: `get_current_model()`, `export_chat()`, `switch_model()`
- DeskFlow can inject messages via agent-specific plugins
- Uses the existing Agent SDK pattern (OpenCode supports plugins, Claude Code has hooks)

**Questions:**
- Which agents support plugin/hook systems?
- Can we make this agent-agnostic?
- What's the development cost vs benefit?

### Approach E: Hybrid (Recommended)
Combine multiple approaches for maximum coverage:
- **Primary visibility**: Backend storage reads (Approach A) for reliable state queries
- **Real-time awareness**: PTY data parsing (Approach B) for live command detection
- **Enrichment**: System prompt injection (Approach C) to encourage structured output
- **Future**: MCP bridge (Approach D) for bidirectional control

## What's Actually Valuable (Prioritization)

Not all features are equally useful. Rank these by value-to-implementation-cost ratio:

| Feature | Value | Cost | Notes |
|---------|-------|------|-------|
| Current model display | High | Low | Read from agent storage; show in terminal tab/sidebar |
| Chat export | High | Low-Medium | Read stored messages from agent DB + DeskFlow's terminal_messages |
| Session cost tracking | High | Already done | Already implemented via AIAgentPlugin sync |
| Real-time token usage | Medium | Medium | Poll agent storage or parse PTY output |
| Model switching from UI | Medium | High | Requires writing to agent config or injecting commands |
| Slash command detection | Low-Medium | Medium | PTY parsing is fragile; needs per-agent patterns |
| Chat history search | Medium | Medium | Index terminal_messages DB with full-text search |
| Agent status enrichment | Medium | Low | Extend PTY parser with more output patterns |

## Constraints

- **No screen capture/OCR** — Terminal output is text, not pixels. OCR adds latency, cost, and fragility.
- **No mouse event capture** — Slash commands are typed, not clicked. Mouse interactions happen inside xterm.js and are not useful signals.
- **Must work across agent restart** — State must survive terminal close/reopen
- **Must not break existing agent launch flow** — The `type agent_name` + system prompt pattern works; don't change it
- **Must handle agent-agnostic operation** — Support opencode, claude, gemini, and future agents with minimum per-agent code
- **Avoid fragile parsing** — Terminal output format changes between agent versions
- **Prefer storage reads over output parsing** — Agent DB/JSON files have reliable structured data

## Output Requirements

Design a comprehensive solution covering:

1. **Architecture** — How the component fits into the existing IPC/main/renderer architecture
2. **Data flow** — How state flows from agent storage → main process → renderer
3. **Implementation plan** — Concrete steps, files to modify, new IPC handlers needed
4. **Storage schema** — For any new DeskFlow tables or files
5. **UI mockups** — Where in the existing UI (terminal tab, sidebar, header) to show agent state
6. **Fallback behavior** — What happens when agent storage is inaccessible
7. **Security considerations** — Reading agent storage files, privilege requirements
