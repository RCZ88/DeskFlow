# Design Prompt: Auto-Assign Session via Prompt Routing

## Raw Request (Verbatim)

> "okay i would like you to design engineer this not so complicated feature which is just to feed the prompt into the ai agent session and give a list of session. but we need to make sure that theres some kind of summary of the topic of the session in a form of text. so it ai needs to constantly update its session status stuff. also an idea is that i would want a cost token for the infrastructure considering the system prompts for the entire infrastructure."
>
> "you missed the main thing which is the auto assign session based on the prompt. so the user doesn't have to pick a session. it utilizes the summarization of sessions alongside a system prompt to do this."
>
> "so what are the features of these improvement stuff? also, does it already include an explanation on how it works?"
>
> "and auto rename sessions, and stuff, that could be included in the config page, since its a generalist per project oggle."
>
> "Also an idea is that i would want a cost token for the infrastructure considering the system prompts for the entire infrastructure. just use generate prompt skill"

## Problem Statement

Currently, users manually select a terminal/session when sending prompts to AI agents. This is friction — the user should just type what they want and the system auto-routes to the right session. Sessions also lack live AI-generated summaries that describe what they're working on, and there's no cost tracking for the routing/summarization infrastructure itself (separate from per-session token tracking).

## Context

Read `CONTEXT_BUNDLE.md` (this directory) as the source of truth. It contains:
- Full SessionConfig interface and session creation flow
- `summarize-session` and `summarize-with-llm` IPC handlers (already exist)
- Session storage schema (`terminal_sessions` table)
- Instruction input `@term` manual routing (current)
- Configs tab structure
- Preload bridges, IPC endpoints, existing metadata parsing
- Design tokens and conventions

## The Mandate

Design a comprehensive solution for **auto-assigning user prompts to the correct AI agent session** using AI-generated session summaries, with **infrastructure cost tracking** for the routing layer.

### Requirement Checklist

#### Engineering — Data Processing & Routing Pipeline

1. **Session Summary Engine:**
   - Design how each session's AI agent periodically (or on trigger) writes/updates a `summary` field that describes what the session is working on
   - The summary should be stored in the existing `terminal_sessions` table (use existing `topic` field or a new field like `ai_summary`)
   - Every N messages (configurable), or when the AI outputs a `## Session Status` block, parse and update the summary
   - The summary must be short (1-2 sentences) and capture the current goal/task, not the entire history

2. **Prompt Router (Auto-Assign):**
   - When a user types a prompt in the instruction input, route it through a decision layer FIRST before sending to any terminal
   - Gather all active sessions (status=active) + their current summaries
   - Call the `summarize-with-llm` IPC endpoint (OpenRouter, cheap model, 800 max tokens) with a routing system prompt that decides which session the prompt belongs to
   - Return format: `{ sessionId: string, confidence: number }` or `{ action: "create_new", suggestedName: string, suggestedSummary: string }`
   - If confidence is low (< 0.6), show a disambiguation UI asking the user to pick
   - If "create_new", auto-create a new session with that name, spawn/assign a terminal, and send the prompt there
   - The routing call must be FAST — this is an interactive operation, the user is waiting for their prompt

3. **Auto-Session Rename:**
   - After a session has been running for N messages (configurable, default 5), call summarize-with-llm to generate a descriptive name
   - Auto-update the session's topic and summary via `saveTerminalSession`
   - Don't overwrite if the user has manually named the session

4. **Infrastructure Cost Tracking:**
   - Track every routing call: tokens used, model used, timestamp
   - Track every summary generation call
   - Store in a new DB table or JSON file (e.g., `agent/context/routing-costs.json`)
   - Compute estimated USD cost per call (use rough pricing like $0.15/M input tokens for Claude Haiku or the OpenRouter model used)
   - Aggregate: today, this week, this month, total

#### Visual — Configs Tab & Session List Redesign

5. **Configs Tab Additions:**
   - **Auto-Assign Toggle**: ON/OFF switch for the routing feature
   - **Routing Model Selector**: dropdown to pick which model handles routing (cheapest option by default)
   - **Summary Frequency**: slider or select (every 5/10/20 messages, or on manual trigger only)
   - **Auto-Rename Toggle**: ON/OFF for automatic session renaming
   - **Renaming Threshold**: messages before auto-rename kicks in (3/5/10)
   - **Infrastructure Cost Card**:
     - Today's routing cost (number + currency)
     - This week's cost
     - Total all-time cost
     - Breakdown: routing calls vs summary generation calls
     - Uses existing glass-card + gradient pattern from the codebase

6. **Session List Enhancement:**
   - Each session in the sidebar list shows a **1-line summary** below the topic (truncated to ~80 chars, text-zinc-600, text-[10px])
   - Hover or expand shows full summary
   - Sessions with auto-assigned names show a subtle "auto" badge (text-[9px], text-cyan-600, bg-cyan-500/10)
   - Search/filter sessions by summary text (match against both topic and summary)

#### UX — Interaction Flow

7. **Instruction Input Flow (Auto-Assign ON):**
   - User types prompt in instruction input
   - While routing in progress: show "Routing..." spinner above send button (existing isSending pattern)
   - If routing succeeds with high confidence: prompt is sent to the matched session's terminal, no user interaction needed
   - If confidence is medium (< 0.7 but > 0.4): flash a subtle suggestion toast "Routing to [session name]" that can be cancelled within 3 seconds
   - If confidence is low (< 0.4) or no match: show a **disambiguation popup** with the top 3 candidate sessions (name + summary), a "Create New" option, and a "Cancel" option
   - If "create_new" is returned: session is auto-created, terminal is spawned, prompt is sent

8. **Summary Update Flow:**
   - After a terminal response is received, check if we should trigger summary update
   - If auto-update is due (message count threshold reached): call summarize-with-llm with the session's recent messages and the existing summary as context
   - Update the session's `topic` (if auto-rename is ON and user hasn't manually named it) and store full summary in `description` field
   - The summary update should be ASYNC — don't block the user's next prompt
   - The summary update should also parse any `## Session Status` blocks from the AI's output

9. **Cost Tracking Display Flow:**
   - Cost data refreshes when Configs tab is opened
   - Use existing `get-model-improvement-stats` pattern for IPC
   - Show running counters with the same compact style as model improvement stats
   - Add a "Reset" button for cost counters (with confirmation dialog)

### Constraints

1. **Must work with existing infrastructure** — the `summarize-session` and `summarize-with-llm` IPC handlers already exist; don't rewrite them
2. **Routing model call must be cheap** — use a low-cost model (Claude Haiku or similar), max 800 tokens, temperature 0.1 for deterministic routing
3. **No direct Node in renderer** — ALL operations go through preload bridges
4. **Existing design language** — follow the zinc/purple/emerald/cyan/orange scheme, JetBrains Mono for data, Inter for UI, 4-8px grid, fast motion
5. **Configs tab is orange** — maintains current tab color scheme
6. **All new IPC handlers must have corresponding preload bridges** — follow the existing pattern exactly
7. **Auto-assign is OPT-IN** — default OFF, user must toggle it on in Configs tab
8. **Don't break the existing @term manual routing** — auto-assign is an alternative path, not a replacement
9. **The routing call should include the user's prompt, not the full conversation** — only the current prompt text matters for routing decisions
10. **Summary updates are fire-and-forget** — don't block the instruction send flow
