# Research Prompt: Context Management Architecture for AI Coding Agents

## Raw Request

```
LLM wiki + Obsidian skills + Graphify + PARA + QMD + automations. I'd like to implement something new, something I can implement in the context.

Previously, I implemented the previous projects. It's really just about maintaining the context, right? How we can stop the problem engineering and stuff and so forth.

And the problem with the current data items that it's sort of maintaining context protocol is like not to do this instead. After a few chats in the same system, the AI agent would already predict what we're saying, we're saying what we were doing and stuff and so forth. And so that we need to improve the context throughout the chat. And we need to somehow store those history of chats in some way.

But first of all, it's not too heavy. There's not too much going on. In a sense that if there's too much going on and if we insert everything in the system from the whole history that means it's very inefficient. You're not going to insert every single history with all its details. So we're going to design how we can do that.

And second of all, we're going to actually be sure that it is working with our system, just to graphify AI and, for example, the obsidian scale and stuff like that. Because we've already mentioned previously the bunch of integration that we have. And the thing is that we haven't really configured anything. In the creation of a session or the creation of a project, there's now really a way for us to configure any of those things.

So it's obsidian scale. LLM wiki. There's power IQMD and automations and graphify and stuff like that. I will give the stuff over here.

Also, I do think that we need to rephrase the name of initialize because it's not necessarily only used in the start of the project, there might be sometimes where we want to adjust the system from who want to adjust what is used, what is included in the system from what Markdown file is included in there. And so maybe we can just rename it from initialize to setup so that the user is able to constantly track and make some changes on like things that are related.

And now that we have the context idea going on and not yet implemented, I would like to that it's also in the part of the setup pop-up thing and I need to use the during prompt because we need to do a research on how we can do the context and what are the few other things that we can do inside the context and make sure that it fits to the list of tools we have which is the LLM Wiki, the obsidian skills, the graphify, the para, p-r-b-a-r-a, and then q-m-d, there's also the automations and stuff like that that you need to be researching on and how you integrate it together and make a super something and you can visualize those contexts in a way, like for example, like graphify, right, the skill graphify you can view the connection between us, maybe you can create an internal in the app, in the app, what is it called, in the app visualization of the thing, right.
```

## Problem Statement

After a few chats with the AI agent, the agent predicts what the user is saying before they finish — suggesting the context isn't properly maintained across sessions. The user needs a layered context management system that stores chat history efficiently (not everything, just what matters) and integrates all existing knowledge systems (LLM Wiki, Obsidian Skills, Graphify, PARA, QMD, Automations) into a unified, configurable "Setup" dialog. The current "Initialize" dialog only covers QMD and Graphify — it's incomplete.

## Engineering Task: Design the Data Processing Pipeline

Research and design:

1. **Layered context summarization system**
   - Short-term: Full last N messages (configurable, e.g., 5-20)
   - Medium-term: Session summaries (every 10 messages → 1-sentence summary), stored per session
   - Long-term: Project-level context from LLM Wiki files (state.md, context.md, PROBLEMS.md, etc.)
   - Deep memory: Cross-session patterns (what problems does the user work on most? what patterns recur?)
   - How to determine what to include vs. exclude (efficiency constraint: not everything)

2. **System integration architecture**
   - How LLM Wiki (agent/*.md) feeds into context: which files, what depth
   - How Obsidian Skills (agent/skills/*/SKILL.md) are selected and included
   - How Graphify (graphify-out/) provides architecture overview without full graph dump
   - How PARA (CZVault/) provides project organization context
   - How QMD templates are referenced without embedding full content
   - How Automations (agent/automations/) can trigger context updates
   - Dependencies between systems: Graphify → PARA sync, Skills → LLM Wiki, etc.

3. **Context injection protocol**
   - When to inject (session start, mid-session on topic change, manual trigger)
   - How much to inject per trigger (avoid token overflow)
   - How to handle mid-chat topic switches (drop irrelevant context, add new)

4. **Storage design**
   - Where to store session summaries (JSON in agent/ directory)
   - Where to store deep memory patterns
   - Schema design for cross-session context
   - Auto-cleanup of stale context (keep last N sessions summarized, delete older raw data)

## Design Task: High-Fidelity Visual Specs

Design:

1. **Setup dialog redesign** — All system toggles with status indicators:
   - LLM Wiki toggle + file count + status indicator
   - Obsidian Skills toggle + skill count + category filter
   - Graphify toggle + node/edge count + last build time
   - PARA toggle + sync status + last sync time
   - QMD toggle + template count + preview button
   - Automations toggle + automation count + run status

2. **Context Map visualization** — Shows how systems connect:
   - Nodes represent systems (LLM Wiki, Skills, Graphify, PARA, QMD, Automations)
   - Edges show dependencies (Graphify→PARA, Skills→LLM Wiki, etc.)
   - Interactive: click node to toggle enable/disable
   - Shows: file counts, last sync, active/inactive state
   - Visual style: glass morphism matching app theme, animated connection lines

3. **Session context panel** — Shows what's currently loaded:
   - Current session summary (last N messages)
   - Active context windows (which files are injected)
   - Token budget indicator (how much context space used)
   - Manual flush/summarize button

4. **Context history browser** — View past sessions:
   - List of past sessions with summaries
   - Click to expand full conversation (for last 3 sessions, older show only summary)
   - Search across session history

## UX Task: Interaction Flow

Document:

1. **Setup flow** — How user configures systems per project:
   - Open Setup → See all systems with toggles + status
   - Toggle each system on/off
   - "Advanced" mode: per-system configuration (e.g., which specific skills, which LLM Wiki files)
   - Save → Project now has these context settings

2. **Session start flow** — How context loads:
   - User clicks "Start Session" with Setup config
   - System loads LLM Wiki files, skills, graphify summary, etc.
   - Brief "Context loaded" toast showing what was injected
   - Agent starts with full context

3. **Mid-session context updates** — How context evolves:
   - Every N messages, system summarizes and drops old context
   - User can manually trigger "Update context" to refresh
   - Topic change detection → swap relevant context

4. **Context management during chat** — How to avoid stale context:
   - Token budget tracking → auto-summarize when approaching limit
   - Topic drift detection → "Switching topics, updating context?"
   - Explicit "Forgetting" command → clear specific context areas

## Constraints

- Must work with existing codebase: SkillsService reads agent/skills/, Graphify generates graphify-out/, PARA is in CZVault/
- Must be configurable per project (different projects may want different systems)
- Must be efficient — do NOT load everything, load only what's selected
- Must visualize in-app (no external tools required to see system connections)
- Must integrate into Setup dialog (renamed from Initialize)
- Must handle mid-session context updates without disrupting conversation

## Output Format

Create a structured research document saved to `agent/docs/research-impl/context-management-architecture-18052026/RESEARCH.md` with:
- Architecture diagram (text-based) showing the layered context system
- Data schemas for session summaries, context history, and deep memory
- Setup dialog redesign mockup (text-based)
- Context Map visualization spec
- Per-system integration approach with code snippets
- Implementation order (what to build first, what depends on what)