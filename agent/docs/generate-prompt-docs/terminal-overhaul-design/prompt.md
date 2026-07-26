# Terminal & Session UX Overhaul — Design Brief

## Raw Request (verbatim)

```
Uncaught ReferenceError: computedProjectPath is not defined
    at xK (TerminalPage.tsx:3433:18)

Okay, in a situation that a lot of problems. That's so many problems. First of all, why is all my sessions gone? In a second of all, that's fine because none of my sessions does have anything on it. But the problem is that if you're trying to start a session whether it's on a new tab or it makes anything terminal or isn't in a new terminal, it doesn't work properly. And in an existing terminal, it doesn't do anything to that existing terminal. It doesn't send anything, it doesn't start the code, it doesn't start the agents, the other that doesn't start anything. On a new terminal in the other hand, it doesn't work because you just send the system problem immediately without actually having chances for the open code to start or whatever the agent is to start. Right? So that's two problems. And for creating a new session, let me see. Creating a new session, there's a lot of things that are like, for example, the session name, it's kind of hard to know what session name it is because the user won't be able to decide what the session name is. Because the AI should be able to edit and stuff like that. Initialize with default, customize file. What is this? There's like custom initialization file. It's not that bad, but it's useless because what do you want this to do? So like the session conditions of much prompt for a specific session, it's kind of hard to think of when you just started to create a decision. Maybe it should be that the AI should be able to see for themselves and update for themselves according to what has been done on that thing. And I just collect on a problem, or like a request. And it has this error over here.

There are a few other problems. First of all, there is the problem section. I just created a new session and as I said previously, it just sends those random things without actually starting the session first. It isn't actually wait for the session to open up or creating a new session to open up. It just sends the there, like a lot of problems going on here. It says seven hours ago and the characters in here is just messed up. I have no idea what these characters are. These characters are like invalid characters. And then there's no progress whatsoever. There's no showing up anything that is going on whether it's completed or not. The issue be that these problems are combined in the terminal page so that you can show which session is a little belong to or in other ways it should be that. Maybe it is like there should be some categorization and not just because you're going to have a lot of problems. You're going to have so many problems that you won't be able to manage all of them. So it probably is a bit like it's just some stuff that is temporary, but like you need to design how you can categorize with the group with a session or the terminal or the saved state or whatever the saved thing is called because where is the saved page? Where's the saved session page? Why can't you save it? Where can I load a? Yeah, there's no way for me to load a session. If I were safe, the key word here is checkpoint and there's no way for me to load. Oh, it's on the workspace. Okay, that's okay. So say, say something. Yeah, it doesn't it doesn't show on the workspace, the safe workspace. It doesn't show here. And then there's also the redundancy of the two save button. One button is on the safe workspace and one button is on the top. So it's kind of confusing on which one to use. Maybe we should just remove the ones on the sidebar and use the ones on the topbar and make sure that if you save on the topbar, it adds to the same workspace. You guys currently doesn't do that. And the project from make sure that the AI is able to edit those as well because doing it yourself might be too lazy for some might be too high for some person people to do so. And also there's again, I tried to load the app again and it shows off the other weird stuff seven hours ago in Claude. I've never sent anything in Claude and there's I don't know where it loads this from. It just opens it randomly and it just sends everything without me asking it and without me sending anything and it shows seven hours but it just appears just now and doesn't make any sense that it shows seven hours ago because I have this this feature is not even implemented seven hours ago and seven hours ago I'm not even awake or doing anything yet. So this is truly clearly a misunderstanding and a mislogic happening in the workspace. There's a lot of so much problems here. A lot of this stuff you're not working at all. I've already seen a checklist with Jason and stuff like that. I mean, where's the ones for the creating the prompt? Create prompt, create prompt skill and can we make sure that the skills you can click on them and when you click on them, you can sort of like create a custom like UI for each one of those. Each skill can have their custom UI for example for the generate generate prompt which they as generate prompt for an external use. I can be that the user gives a prompt and then like the UI will show the prompt that they a I generated and there's space for the user to input the finished output result of the prompt and it should be inserted into the thing. So how would you integrate it in the compose with the composed prompt and how would you implement it for different sort of skills and how would you generalize those so that the user can customize it and there's a UI for customizing what it does and what the stuff and stuff like that or the possible combinations of things that can be added into the skill that you type and stuff like that. And I would like you to also use the I generate prompt skill for this because this is kind of complicated. There's a lot of things to consider and design so I would like it to use the generate skill prompt to draw this.
```

---

## Role
You are the Lead Architect and UX Engineer for DeskFlow. Your task is to design a comprehensive solution for the terminal page's initialization timing, session management, problem categorization, skill UI system, and workspace save/load UX. This is a multi-domain overhaul — you own the full data flow, component architecture, and interaction design.

## Problem Statement

The terminal page has accumulated significant UX debt across five interconnected areas. Users cannot reliably start AI sessions, problems show garbage data, saved workspaces are invisible, sessions have no categorization, and skills all open the same generic UI. Each problem individually is manageable — together they make the app unusable.

## Context: Data Flow & Architecture

### How the Terminal Page Works
- `TerminalPage.tsx` (~4800 lines) is the main file — contains all sidebar tabs, terminal management, session lifecycle
- Terminals are node-pty processes managed by `terminalManager` in `main.ts`
- Sessions are stored in `terminal_sessions` DB table with fields: id, agent, topic, terminal_id, category, status, product_area
- Messages go to `terminal_messages` table: session_id, role (user/assistant), content
- Problems come from `agent/problems.json` (JSON source of truth, synced with PROBLEMS.md)
- Requests from `agent/requests.json`
- Checklists from `agent/checklists.json`
- Terminal bindings in `terminal_bindings` DB table: terminal_id, active_problem_id, active_request_id, agent_type

### Key Components (all in `TerminalPage.tsx`)
- `ProblemsTab` — problem list, filter by status, CRUD
- `RequestsTab` — request list, filter by status, CRUD
- `InstructionPanel` — compose prompt with linked problems/requests/skills
- `SkillsTab` — grid of skills, "Use" button opens InstructionPanel
- `PromptDesignDialog` — recently added, special UI for generate-prompt skill
- `PromptHistoryTab` — recently added, sidebar showing prompt history
- `NewSessionDialog` — dialog to create/initialize a session
- `TerminalsTab` — shows running terminals + sessions list

### IPC Handlers (main.ts)
- `get-prompt-history` — queries messages with JOINs to sessions and bindings
- `initializeTerminal` — writes system prompt + init content to terminal PTY
- `register-terminal` / `update-terminal-binding` — manage terminal bindings
- `save-terminal-session` — upserts session records
- `get-terminal-sessions` — list sessions

## The Mandate

Design a single, comprehensive solution for ALL five problem areas below. Do NOT offer options. Deliver ONE complete architecture with component specs, data flow, and interaction design.

---

## Problem Area 1: Terminal Initialization Timing

### Current Behavior
When "Open Terminal" is clicked or a new session is created, the app immediately writes the system prompt + init content to the terminal PTY. It does NOT wait for the AI agent (opencode, claude, etc.) to actually start inside the terminal. This means:
- The prompt is sent to an empty shell before the agent boots
- The agent never sees the prompt because it was sent before the agent existed
- On existing terminals, writing has no visible effect because the agent may be mid-response

### Requirements
- The system must detect when the agent inside the terminal is ready to receive input
- Messages must be queued until the agent signals readiness
- The user must see a "waiting for agent..." indicator
- Must work for all agent types (opencode, claude, aider, codex)

---

## Problem Area 2: Session Management UX

### Current Behavior
- Session names are set at creation time with no AI input
- No way to view or load saved session checkpoints
- "Save" button on sidebar and "Save Workspace" on topbar are redundant and inconsistent
- Saving on topbar doesn't add to the sidebar's workspace list
- No visual indication which session is active or what state it's in

### Requirements
- Sessions should be auto-named by the AI after first message exchange
- A clear session timeline showing all checkpoints
- Unify save buttons: one save action per session, visible in the session detail
- Saved workspaces must appear in the workspace list immediately
- Session state visualization (active/paused/completed) in sidebar

---

## Problem Area 3: Problem Categorization & Display

### Current Behavior
- Problems are shown as a flat list with no grouping
- Problems can show incorrect timestamps ("7 hours ago" for just-created items)
- Problem data can display garbled/invalid characters
- No relationship between problems and sessions/terminals in the UI
- No progress tracking per problem

### Requirements
- Problems must be groupable by session, terminal, or status
- Timestamps must be accurate — use the actual `created_at` from the data source
- Sanitize display text (handle invalid characters gracefully)
- Show which session/terminal a problem belongs to
- Progress bar or step completion per problem

---

## Problem Area 4: Skill UI System

### Current Behavior
- All skills open the same InstructionPanel when "Use" is clicked
- The `generate-prompt` skill was recently given a custom dialog (PromptDesignDialog), hardcoded
- No generalization — every new skill with a custom UI requires code changes
- Users cannot customize skill UIs

### Requirements
- Skills must be able to declare a custom UI type in their frontmatter (e.g., `ui: prompt-designer`, `ui: code-review`, `ui: default`)
- A skill registry maps `ui` types to React components
- The default UI is InstructionPanel (backward compatible)
- Custom UIs receive skill context (content, description, linked problems/requests)
- The generate-prompt skill's custom dialog becomes the reference implementation
- Future skills can add custom UIs by registering a new component + mapping

---

## Problem Area 5: Workspace Save/Load

### Current Behavior
- `savedConfigs` state exists and `loadSavedConfigs` loads data, but the list is NOT rendered in the sidebar
- "Save Workspace" dialog exists and works, but saved configs are invisible
- Two save buttons with different behaviors: sidebar "Save Checkpoint" and topbar "Save Workspace"
- No way to load a session checkpoint

### Requirements
- Render the saved workspace list in the Configs tab (I already added the JSX placeholder — needs final wiring)
- One canonical save button (topbar) that saves to the same workspace list
- Session checkpoints visible in session detail
- Clear naming convention so users know what each save represents

---

## Constraint Checklist

### Data Processing
- All timestamps must come from DB `created_at` fields, not computed offsets
- Terminal messages and sessions must share a reliable join key
- Problem display must sanitize against invalid UTF-8/control characters

### Visual Specs
- Dark theme (zinc-800/900, zinc-700 borders, cyan/teal accents)
- Glassmorphism cards with backdrop blur for modals
- Consistent 10px/11px/12px font sizing for metadata
- Badge-style status indicators (matching existing CategoryBadge/StatusDot)
- Expandable sections with chevron icons

### Interaction Flow
- Click on a problem → expand to show full detail + linked session + progress
- Click session in sidebar → focus that terminal + show session detail
- Hover on save button → tooltip showing what will be saved
- Agent ready detection → visual waiting state → auto-send queued messages

### Existing Patterns (DO NOT break)
- `@import "tailwindcss"` in index.css (v4 syntax — do not change to v3)
- All component props pass through `deskflowAPI` bridge
- Dialog pattern: `fixed inset-0 bg-black/60 backdrop-blur-sm` with backdrop click to close
- Tab pattern: icon buttons with green/cyan active state and bottom border
