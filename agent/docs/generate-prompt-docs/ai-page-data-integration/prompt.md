# AiPage Data Integration — Exploration Prompt

---

## Raw Request

> "Could we make the AI page actually useful? It's basically just a goals page. It should connect to ALL the data the app has — projects, IDE stats, terminal analytics, app usage, patterns, settings, the whole thing. Generate a prompt for an AI to explore ideas for making the AI page more useful."

---

## Context

You are designing the next evolution of the **AI Assistant page** in DeskFlow, a desktop productivity + development tracking app built with Electron + React + Vite + Tailwind CSS v4.

The AI page lives at `/ai` and currently only shows goal/planning data. **The rest of the app has ~200+ IPC endpoints across 6+ pages that the AI page never touches.** The app tracks everything — app usage, browser activity, IDE projects, terminal sessions, AI agent analytics, DORA metrics, external activities, sleep, patterns, settings, skills, problems, requests — but the AI page is blind to all of it.

**Your mission:** Explore what the AI page COULD become if it had access to ALL app data. Don't implement — ideate. Propose architecture, features, UI layouts, data pipelines, and interaction models.

Read `CONTEXT_BUNDLE.md` first — it contains the full IPC inventory, data shapes, current AiPage code, design tokens, and architecture notes.

---

## The Mandate

Propose a comprehensive vision for transforming AiPage from a goals-only page into a **central data hub and AI assistant** that can answer questions, surface insights, and guide the user across every dimension the app tracks.

### Part A — Data Pipeline Architecture

Propose how data should flow into the AI page:

1. **How should data be loaded?** All-at-once on mount? Lazy-load per section? On-demand query-based?
2. **Should there be a shared data service/layer?** Or should each section fetch independently like current pages?
3. **Caching strategy** — given 200+ endpoints and some expensive aggregations, how should data be cached?
4. **Data refresh** — which events (`foreground-changed`, `context-changed`, `external-data-changed`, etc.) should trigger re-fetches? How stale is acceptable?
5. **IPC grouping** — which endpoints logically group together? Is there a case for composite endpoints (e.g., `getAiPageContext` that returns everything)?
6. **Backend gaps** — does any data source need new composite endpoints? What would they look like?

### Part B — Feature & UI Vision

Propose what the AI page should LOOK LIKE and what it should DO:

1. **Section/layout architecture** — what sections exist? How are they organized? (tabs? scrollable sections? dashboard-style grid?)
2. Each section should answer specific user questions — what are the questions and how does the data answer them?
3. **What data belongs in the AI page vs. what stays in its dedicated page?** (e.g., should it show full DORA metrics or just a summary card that links to IDE Projects?)
4. **Query/chat interface** — should there be a natural language query bar where users type questions and the AI fetches data to answer?
5. **Mode/persona** — should sections change based on the current mode (morning/in-progress/review) like today? Or should there be a "focus mode" concept?
6. **Visual hierarchy** — how does this avoid being an overwhelming wall of data? How does it surface the MOST relevant info first?

### Part C — Data Sources to Integrate

For each data source below, propose:
- **What to show** (specific metric, chart, or insight)
- **When to show it** (always visible, on-demand, context-triggered)
- **How to query/aggregate it** (what period, what filter)
- **Where it belongs** (which section, card, or view)

**Data sources to consider:**
1. **Goals & Planning** (already there — but could be enhanced with completion trends, velocity, category breakdown over time)
2. **App Usage** (total tracked time, top apps, categories, idle gaps, productive vs. distracting balance)
3. **IDE Projects** (active projects, languages, commit activity, open state)
4. **AI Agent Analytics** (token usage, costs, sessions per agent, tool usage, sync status)
5. **Terminal Sessions** (recent sessions, agents used, topics, costs, summaries)
6. **DORA Metrics** (deployment frequency, lead time, MTTR, change failure rate — per project)
7. **External Activities** (hobbies, reading, exercise — time spent, consistency, trends)
8. **Sleep Data** (sleep schedule, quality, consistency)
9. **Patterns & Insights** (typical day hourly breakdown, best days, usage gaps, typical activity at specific times)
10. **Tracker Mind** (open problems, open requests, todo items, session bindings)
11. **Settings & Config** (tracking status, browser tracking, AI providers, preferences — flag when something's misconfigured)
12. **Skills Inventory** (available skills, workspace skills, saved skills)
13. **Prompt Templates** (available templates, recent prompts)
14. **Git Status** (uncommitted changes, working diff, sync status — for active projects)

### Part D — Extra Features

Beyond data display, what ELSE could the AI page offer?

1. **Natural language queries** — "How productive was I yesterday?" → fetches app stats, compares to goals
2. **Proactive notifications** — "You've been idle for 30 minutes" or "Your terminal agent usage is up 200% this week"
3. **Cross-domain insights** — "You work best after exercise on Tuesday mornings" (correlating external activity + app usage)
4. **Workspace health score** — aggregated metric combining DORA, commit velocity, problem resolution rate, goal completion
5. **Goal suggestions from patterns** — "You tend to be most productive between 9-11am — here's a suggestion for tomorrow"
6. **One-click actions** — "Open VS Code" (from project), "Sync AI usage", "Resume terminal session"
7. **Data export / share** — export AI page state as markdown report for planning.md
8. **What else?**

---

## Constraints

1. **No breaking existing pages** — the AI page should INTEGRATE data, not replace other pages. Dashboard, IDE Projects, Terminal, Settings, External, etc. continue to work as-is.
2. **Performance budget** — data loading should not degrade app startup time or cause jank. The AI page loads lazily via React Router (it's its own route).
3. **`window.deskflowAPI` is guaranteed** — AiPage is behind a `deskflowAvailable` guard, so the non-null assertion (`!`) is safe.
4. **Electron security model** — all IPC goes through `contextBridge`-exposed `preload.ts`. No direct Node.js access in renderer.
5. **No external state management** — the app has no Redux/Zustand. Data fetching is per-page useEffects. You may propose a simple shared cache or context, but keep it minimal.
6. **Existing code structure** — current AiPage is 412 lines with a flat component structure. Propose additions that respect this scale or refactor with clear boundaries.
7. **Tailwind CSS v4** — styling uses `@import "tailwindcss"` (NOT v3 `@tailwind` directives). Colors use the zinc/gray/emerald/amber/pink palette.

---

## Output Format

Produce a structured exploration document with:

1. **Executive Summary** (1 paragraph — the big vision)
2. **Data Pipeline Recommendation** (architecture diagram in text, loading strategy, caching, refresh model)
3. **Section-by-Section UI Proposal** (for each section: data sources, layout, interaction, query surface)
4. **Natural Language Query Design** (how queries are parsed, matched to data, answered)
5. **Extra Features** (ranked by impact vs. effort)
6. **Backend Gaps** (what composite endpoints or data shapes need to be created)
7. **Implementation Phases** (ordered roadmap from MVP to full vision)
8. **Open Questions** (what needs user input before building)

Be specific. Reference exact IPC endpoint names from the context bundle. Propose data shapes for any new composite endpoints. Sketch layouts in text/ASCII if it helps. This is an exploration — think big but ground every idea in real existing data.
