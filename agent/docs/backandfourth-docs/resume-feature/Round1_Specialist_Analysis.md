# Round 1 — Specialist AI (Frontend Architect) Analysis

> **Date:** 2026-07-22
> **From:** Specialist AI (Frontend Architect)
> **To:** Project Owner (CZ)
> **Re:** Resume Builder Init Package — Codebase Exploration Findings

---

## What I Explored

I read the following files to understand the existing app structure:

| File | What I Found |
|------|-------------|
| `src/App.tsx` (3119 lines) | React Router with 12 flat top-level routes, sidebar navigation, framer-motion animations, glass morphism design |
| `src/index.css` (21 lines) | Tailwind v4 CSS-first config, `--ws-*` workspace tokens, custom fonts (Inter, JetBrains Mono, Source Serif 4) |
| `src/pages/` (21 page files) | DashboardPage, FinancePage, IDEProjectsPage, TerminalPage, SettingsPage, etc. |
| `src/features/` (31 feature files) | warmth/LifePage, memories/, focus/, covenant/, critique/ — feature modules with lazy loading |
| `agent/skills/frontend-design/SKILL.md` | DeskFlow design system: colors, spacing, typography, page patterns, component patterns |
| `agent/skills/humancentred-UIUX/SKILL.md` | 6 UX pillars, state coverage rules, anti-slop checklist |
| `agent/skills/impeccable/SKILL.md` | Typography, color, motion, spatial, interaction design rules |
| `agent/skills/motion-alive/SKILL.md` | 3 Liveliness Levels, motion taxonomy, recipes |
| `agent/skills/frontend-external-infra/SKILL.md` | MCP servers (shadcn, Magic UI, Lucide, 21st.dev), source routing, re-skin rules |

---

## Codebase Architecture Findings

### 1. Routing Structure
- **Pattern:** Flat top-level routes in `App.tsx` (line 2674)
- **Current sidebar items** (line 2306-2319):
  ```
  Dashboard (/) | Activity (/activity) | AI Assistant (/ai) | Learn (/learn)
  IDE Projects (/ide) | External (/external) | Finance (/finance) | Insights (/reports)
  Database (/database) | Life (/life) | Settings (/settings) | Guide (/guide)
  ```
- **No nested routing** — each page is a direct `<Route path="/xyz" element={<XyzPage />} />`
- **Exception:** Terminal page (`/terminal`) handles internal subtabs via state, not routes

### 2. Design System
| Token | Value |
|-------|-------|
| Background | zinc-950 (base), zinc-900 (elevated), zinc-900/50 (glass) |
| Primary accent | pink-500 (`--page-accent` per page) |
| Secondary | cyan-400, emerald-400 (success), amber-400 (warning) |
| Text | zinc-100 (primary), zinc-400 (secondary), zinc-600 (disabled) |
| Border | zinc-800 (subtle), zinc-700 (active) |
| Card padding | `p-5` (20px) — NEVER p-6 or p-8 |
| Border radius | `rounded-xl` (12px) max — NEVER rounded-2xl or rounded-3xl |
| Font body | Inter / Geist, 13px, weight 400-600 |
| Font mono | JetBrains Mono |
| Animation fast | 150ms (hover, toggle) |
| Animation normal | 250ms (modals, dropdowns) |
| Animation slow | 400ms (page transitions) |
| Easing | cubic-bezier(0.16, 1, 0.3, 1) — ease-out |
| Glass | `bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5` |

### 3. Module Patterns
- **Pages** live in `src/pages/` — one file per route
- **Features** live in `src/features/` — lazy-loaded, self-contained (e.g., `features/warmth/LifePage.tsx`)
- **Components** live in `src/components/` — shared across pages
- **No Zustand/Redux** — state managed via React useState/useMemo at App level, passed as props
- **IPC bridge** — `window.deskflowAPI` for all Electron<->Renderer communication
- **SQLite** — better-sqlite3 for persistence

### 4. Per-Page Accent Colors
| Page | Accent |
|------|--------|
| Dashboard | pink-500 |
| Stats/Activity | cyan-400 |
| IDE Projects | violet-500 |
| External | amber-400 |
| Database | violet-400 |
| Settings | cyan-400 |
| **Resume (proposed)** | **TBD — suggest indigo-500 or blue-500** |

---

## Questions for Project Owner

### Q1: Route Structure
The Init Package proposes nested routes (`/app/resume/build`, `/app/resume/import`, etc.). Your app uses flat routing. Which approach?

- **Option A:** Flat routes — `/resume`, `/resume/build`, `/resume/import` as top-level routes in App.tsx. Resume gets its own sidebar item. Matches existing pattern.
- **Option B:** Single `/resume` route with internal tab/state navigation (like Terminal workspace). Cleaner sidebar but more internal state.

### Q2: Sidebar Placement
Where should Resume live in the sidebar? Current order:
```
Dashboard | Activity | AI Assistant | Learn | IDE Projects | External | Finance | Insights | Database | Life | Settings | Guide
```
Suggested: After "Learn" or before "Finance"? Or a new section?

### Q3: Page Accent Color
Each page has a `--page-accent` color. For Resume Builder, I suggest:
- **indigo-500** (matches "professional/career" vibe) or
- **blue-500** (trust/stability)

Which do you prefer?

### Q4: Backend IPC
The Init Package specifies REST API endpoints (`/api/resume/profile`, etc.). Your app uses Electron IPC (`window.deskflowAPI.*`). Should I:
- **Option A:** Create new IPC handlers in `main.ts` (e.g., `resume:getProfile`, `resume:saveProfile`, `resume:compile`) — matches existing pattern
- **Option B:** Use a local HTTP server inside Electron — matches the Init Package's API spec

### Q5: Database
The Init Package proposes PostgreSQL tables (`UUID`, `JSONB`, `NOW()`). Your app uses SQLite via better-sqlite3. Should I:
- **Option A:** Adapt the schema to SQLite (TEXT for UUID, TEXT for JSON, datetime as TEXT/INTEGER) — matches existing pattern
- **Option B:** Use PostgreSQL as the Init Package specifies

### Q6: AI Engines
The Init Package describes 4 AI engines (Chat Extractor, Questionnaire AI, Resume Compiler, HR Reviewer) that call external AI APIs. How should these work?
- **Option A:** Frontend sends text to main process → main process calls AI API (OpenAI/Claude) → returns result
- **Option B:** Frontend calls AI API directly (requires API key management)
- **Option C:** Mock/simulate AI responses for MVP, wire up real AI later

### Q7: Scope Confirmation
The Init Package is massive (7 pages, 40+ components, 9 DB tables, 4 AI engines). For the first iteration, should I:
- **Option A:** Build the full spec (all 7 pages, all components, all DB tables)
- **Option B:** Build a minimal viable version (Hub + Builder + Preview + Export, skip Import/Review/History)
- **Option C:** Build just the Builder page (questionnaire + live preview) as proof of concept

---

## Decisions Made So Far

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Design skills loaded | frontend-external-infra, frontend-design, humancentred-UIUX, impeccable, motion-alive | Skill Router MANDATORY for DESIGN category |
| MCP servers available | shadcn, Magic UI, Lucide, 21st.dev, motion-dev, unsplash, reactbits, iconify | Will use for component sourcing |
| Liveliness Level | **L2 (Responsive)** suggested | Resume builder is a productivity tool — needs to feel alive but focused. Not L3 (too cinematic for a form wizard). Not L1 (too flat for a multi-step interactive tool). |

---

## Next Steps

1. Wait for Project Owner responses to Q1-Q7
2. Produce **RESULT.md** with full component architecture, state management, API integration, DB schema, Tailwind styles, animation specs, mobile adaptations, and testing plan
3. Then hand off to the implementation phase

---

*End of Round 1 analysis.*
