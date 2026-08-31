# PROMPT.md — Full Agentic System Design

## Raw Request

> "how is the communication, is it working properly, does it have the proper UI for it, how do you manage it, how do we initialize the communication between AI agents... and how we update the agents.md and stuff like that, system prompt... context awareness of working on the same files... able to look at the list of sessions and is able to group them... how does the context management work, and how does the brain connect to the AI and how does the AI live and stay using all the context management... how the vocabulary feature... I need to be using the most complex the most effective system ever for the context management... it needs to be efficient, it needs to be effective... we rely on some file in which the system is continuously checking or a better way is that it's going to call a function and when this function or something is called by the AI it's going to tell the waiting system to continue... the file format where it can store stuff and it can mark when something is done and a system can detect it... the communication means that it is done sending the message it is done with writing everything it needs to the other agent... there needs to be an ending system... a passing system where if the AI marks that as complete that means the communication needs to be completed... I need to update the conductor service with all these features not replace it... it needs to be growing not cutting off and replacing"

## Problem Statement

The existing ConductorService (682 lines) handles multi-agent orchestration with git worktree isolation, but is missing critical features:
1. No persistence — missions lost on restart
2. No "done communicating" detection beyond file polling
3. No UI for agent communication status
4. No session grouping
5. No brain→agent learning loop
6. No vocabulary integration
7. No context-aware file conflict prevention

## What Exists (from CONTEXT_BUNDLE.md)

- ConductorService: 6 roles, git worktrees, file-based communication (.conductor/*.json), merge queue, autonomy levels
- Agent state machine: 5 phases (launching/ready/busy/attention/error), prompt regex + TUI settle detection
- File locking: in-memory + DB, pre-acquire IPC exists but no callers
- actions.json: file bridge with atomic write, watcher auto-executes
- assemble-context: builds prompt from problems/requests/sessions/dictionary/vocabulary
- Build mutex: new, prevents simultaneous builds

## Engineering Tasks

### Task A: Agent Communication Protocol
Design a file-based communication system where:
- Agent A writes a message file (e.g. `.conductor/comms/{msgId}.json`) with: from, to, content, status
- Agent B reads the file when it becomes ready (detected by agent state machine)
- Agent B processes the message and writes a response file
- System detects completion when BOTH agents mark the exchange as done
- Messages persist across restarts (DB table, not just files)

Key design decisions:
- File format: JSON with id, from, to, content, status (pending/delivered/completed/failed), timestamp
- Completion detection: two-phase — writer marks "sent", reader marks "received", processor marks "completed"
- Queue: if target agent is busy, messages queue (not dropped)
- Persistence: DB table `agent_messages` with the same schema as the files

### Task B: Session Grouping
Design a system where:
- User creates named groups (e.g. "Week 3 Sprint", "AI Agents", "Bug Fixes")
- Sessions auto-assign to groups based on: agent type, project, subpage, or user rules
- Groups have: name, color, project_id
- Sessions have: group_id column
- UI: group chips in session list, drag-to-group, group filter

### Task C: Context Management Upgrade
Design efficient context injection that:
- Uses vocabulary resolver to map variants → canonical terms
- Uses user dictionary for term definitions
- Uses context brain for relevant memories
- Uses selection captures for visual context
- Stays within token budget (configurable, default 4000 tokens)
- Prioritizes: active problems > recent sessions > vocabulary > dictionary > brain memories

### Task D: Brain→Agent Learning Loop
Design a system where:
- Agent reflections (lessons learned) feed into context brain
- Context brain entities/facts get injected into future agent prompts
- Agent can query brain: "what do we know about X?"
- Brain improves over time as more sessions complete

### Task E: ConductorService Upgrade
Upgrade the existing ConductorService (NOT replace) with:
- DB persistence for missions (survive restarts)
- Build mutex integration (prevent simultaneous builds across missions)
- Agent communication protocol integration
- Session grouping awareness
- Real-time status updates to renderer via IPC events

### Task F: UI Design
Design the UI for:
- Agent communication panel (shows message queue, read/unread, status)
- Session groups manager (create/edit/delete groups, assign sessions)
- Context dashboard (shows what's injected, token usage, vocabulary mappings)
- Brain status (entities, facts, recent memories, learning rate)

## Constraints

- UPDATE ConductorService, do not replace it
- All DB tables go in main.ts migration block (~line 3803)
- All IPC handlers go in main.ts
- All preload bridges go in preload.ts
- Must build: `npx vite build` + `npx esbuild src/preload.ts` + `node scripts/rebuild-main.mjs`
- No new npm dependencies
- Must work with existing agent types: opencode, claude, gemini, codex, aider

## Output

Produce a single RESULT.md with:
1. DB schema for all new tables
2. IPC handlers (complete code)
3. Preload bridges (complete code)
4. ConductorService modifications (diff-style, show what changes)
5. assemble-context modifications
6. UI component specs (what to build, where it goes)
7. File-by-file change list with line numbers
