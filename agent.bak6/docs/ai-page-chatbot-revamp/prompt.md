# AiPage Chatbot Revamp — Design Prompt

**Target AI:** Claude / GPT-4o
**Role:** Lead Designer and Engineer
**Detail Level:** 8/10
**Creativity:** 25/100

---

## Raw Request

> WHERES THE CHATBOT? ITS SUPPOSED TO BE THAT ITS TEH HART BOT THAT HANDLES THOSE PROJECTS AND USAGE AND STUCC. IT HSOULD BE ABLE TO OUTPUT A BEAUTIFUKPARSABLE RESPONSE. the data is used fo r the response. so tha tit kknows hwat dat to refer to adn stuff. it should also be able to navigate through the apps, look at tlike saved workspaces, t look at several sconfigs and be able to boot the mup. it should be a chat, and not a statistics, THIS IS AN AI PAGE , IT SHOULD NOT DIPLSAY STTATISTICS, IT SHOULD BE AI )ORIENTED, MEANING IT SHOULD SHOW THAT THE AI IS DOING THE WORK. maybe we can make the dailyt degesta nd goals in a seperate page, and let the ai page just be the hcat bot and navigator and stuff .the ones that is able to act on the app adn stuff. but we need to make sure that the thing is like stricted so tha tthe ai is unable to cause harm or like break stuff. and it hsould be able to manage and change add add certain stuff like the eexternal activity, the sleep., etc.
>
> (for now, focus on the news and goals part first. the chatbot with all of those features can be implemented later.)

---

## Problem Statement

The current AiPage (`/ai`) is a card-based statistics dashboard with 9 data cards organized into 3 sections (Focus/Plan/Reflect). It displays goals, KPIs, AI usage stats, topic digests, and project status. This duplicates what Insights, Dashboard, and other pages already do with raw data displays.

The user wants the AiPage to be genuinely AI-oriented — a conversational chat interface where the AI assistant:
1. Uses data from across the app to inform its responses
2. Presents information in **beautiful, parseable formats** (not raw numbers)
3. Can **act on the app** (CRUD goals, navigate pages, manage configs)
4. Outputs responses that feel like an AI working, not a dashboard

**Phase 1 scope** (this prompt): Design the chatbot with "news" (AI-driven data summaries/notifications) and "goals" (CRUD via conversation). The full chatbot with app navigation, workspace management, and cross-feature control is Phase 2.

---

## Mandate

Design a comprehensive solution that addresses:

### 1. Page Architecture Decision

**The open question:** Should "News" (AI-driven data summaries of notable events) and "Goals" (goal management) be:
- **(A)** Handled entirely within the AiPage chatbot conversation
- **(B)** Split to a separate page (e.g., `/news`) with the AiPage remaining pure chat
- **(C)** A hybrid: chat surfaces summaries, clicking them opens a lightweight detail panel

**Your task:** Give a **single, justified recommendation** (not options). Consider:
- What data already exists on other pages (Duplication vs. integration)
- Whether goal CRUD works naturally in chat or needs a dedicated UI
- Whether "news" summaries make sense as a separate browsable feed
- Navigation patterns: how the chatbot can direct users to other pages

### 2. Chatbot Architecture Design

Design the AiPage chatbot with these subsystems:

#### A. Data Pipeline
- How the chatbot fetches context: which IPC endpoints to call, when, and how to cache
- How it detects "news" (notable events worth surfacing — e.g., "You spent 3h in VS Code, that's 2x your normal")
- How it loads goals for conversational CRUD
- Use `CONTEXT_BUNDLE.md` sections 1-3 for all available IPC endpoints

#### B. Beautiful Parseable Response Format
Design a response format that is:
- **Visually beautiful** within a dark-terminal-like chat UI
- **Parseable** — structured enough that the frontend can render rich UI elements (tables, checkboxes, progress bars, cards) from the AI's response
- **Consistent** — every response follows a predictable schema

Consider a text-based structured format (similar to markdown but with explicit typed blocks) that allows the frontend to map blocks to rendered components:
```
[type: goal-progress]
[title: Today's Goals]
[items:
  - [x] Complete project proposal (work)
  - [ ] Review pull request (work)
  - [ ] Morning run (health)
]
[summary: 1/3 completed]
```

Or any other format you think works better. Specify exact format, rendering rules, and how the frontend parses it.

#### C. Message Thread Architecture
- Chat message list component structure
- Scroll behavior (auto-scroll on new messages, manual scroll overrides)
- Message persistence (should messages survive page reload?)
- Input area design (text input, suggestions, quick actions)

#### D. App Control Layer (Phase 1: Goals CRUD)
- How the chatbot interprets "create goal 'Review PR' for today" from text
- How it validates, confirms, and executes goal mutations via IPC
- Error handling for failed saves
- Confirmation flow before destructive actions (delete goal)

### 3. Safety & Restriction System

Design a permissions/safety layer:
- What actions the AI can take autonomously (read data, suggest)
- What actions require user confirmation (create goal, edit, delete)
- What actions should be blocked entirely
- How to prevent prompt injection / command injection through the chat input
- How to handle the `executeCommand` IPC (currently unrestricted shell execution)

Give specific rules like:
> "Goal deletion requires two-step confirmation: AI asks 'Delete goal X?', user types 'yes', AI executes."

### 4. UI/UX Specification

Design the complete chat interface with pixel-level specs:

#### Chat Header
- Mode indicator (amber morning / emerald in-progress / pink review)
- Current date display
- Chat status indicator (AI thinking / ready / error)

#### Chat Messages Area
- AI message bubbles: styling, token accent colors, parsing rules for each response type
- User message bubbles: styling
- Empty state: what the AI says when no conversation exists yet
- Typing indicator: animated dots or streaming effect

#### Input Area
- Text input with placeholder text
- Send button design
- Suggested quick actions / commands that appear based on context
- Character limit? Multi-line support?

#### Special Response Types (Visual Design)
Design the visual treatment for each response type:
| Type | When | Visual |
|------|------|--------|
| goal-list | AI shows today's goals | Checkbox list with progress |
| goal-create | AI confirms goal created | Success badge + goal preview |
| goal-delete | AI confirms goal removed | Warning badge + goal name |
| news-item | AI surfaces notable event | Accent border card with icon + summary |
| data-summary | AI answers "how was my day?" | Metric display with trend indicators |
| error | Something failed | Red-toned error card with retry action |
| navigation | AI suggests going to another page | Clickable page link with icon + path |

### 5. Migration Plan

Design a staged migration from current AiPage → new chatbot:
1. **Stage 1 (now):** Keep current cards, add chat component alongside
2. **Stage 2 (next):** Move cards to their new homes (or remove), chat becomes primary
3. **Stage 3 (future):** Full app-control features

---

## Constraints

1. **No new IPC endpoints** — Only use existing endpoints listed in `CONTEXT_BUNDLE.md` sections 2-3
2. **No backend changes** — All solution must be purely frontend (React + IPC calls)
3. **Tailwind CSS v4 only** — `@import "tailwindcss"` syntax, no v3 directives
4. **Dark theme only** — Galaxy dark palette (zinc/pink/emerald/amber)
5. **No external chat packages** — Build chat UI from scratch using existing patterns (see section 5 of CONTEXT_BUNDLE.md)
6. **Goal CRUD must work via chat** — No custom goal input forms for the chat version
7. **Must coexist with current card layout during migration** — Phased approach

## Output Format

Return a single `RESULT.md` with:

```
# RESULT.md — AiPage Chatbot Revamp

## Architecture Decision: [A/B/C with justification]

## Phase 1: Chatbot Design
### Data Pipeline
### Response Format Specification
### Message Thread Architecture
### Goal CRUD Flow
### Safety Rules

## UI/UX Specification
### Chat Header
### Message Bubbles (by type)
### Input Area
### Empty & Loading States
### Special Response Type Visuals

## Migration Plan
### Stage 1 (coexistence)
### Stage 2 (chat primary)
### Stage 3 (future)

## Implementation Files
### src/pages/AiPage.tsx — Changes
### src/components/AiChat/ — New components
```

Be **specific** with exact Tailwind classes, component hierarchies, and data flow. Include a **complete mock session** showing 3-5 user messages and AI responses with the response format applied.
