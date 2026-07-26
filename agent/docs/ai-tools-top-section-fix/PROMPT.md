## Raw Request

"REMOVE THE SESSION BY AGENT. PLAN OUT EVERYTHING THAT NEEDS TO BE DISPLAYED ON THE TOP AND THE ORIENTATION PROPERLY. THE TOP SECTIONS CHARTS AND NUMBER CARDS ARE REPLACED WITH SOMETHING MORE RELEVANT AND LOOKS BETTER. THE CHART LOOKS UGLY. THE UPMOST TOP LOOKS THE MOST UGLY WHILE THE BOTTOM LOOKS BETTER. WE NEED TO FIX THOSE. IT SHOULD SHOW THE MODELS AND LIKE STUFF AND THE CHARTS NEEDS TO BE A BETTER DESIGN CHARTS. ALSO THE MODEL USAGE TIMELINE IS NOT PROCESSED AND DISPLAYED PROPERLY. MAKE SURE ALL THE DATA IS LOADED PROPERLY FROM ALL TOOLS AND THE CATEGORIZATION AND EVERYTHING. ALSO LIKE WE NEED A HEATMAP OF USAGE LIKE THE ONES ON THE GITHUB REPO PUSH HEATMAP."

## Context

Read `CONTEXT_BUNDLE.md` for the full codebase reference. It contains:
- All source code for the affected components
- All design skills (Human-Centric UX, Frontend Design, Impeccable, Motion, frontend-external-infra) embedded as reference
- MCP component sources (shadcn, Magic UI, Lucide) for real UI building blocks
- The backend data structures and IPC endpoints
- Design tokens and anti-slop checklist

## Mandate

You are the Lead Designer and Engineer. The user has a broken AI Tools dashboard top section. Your job is to:

### 1. Explore
- Trace the data from the IPC handler through to the component. Understand what `overview.aiUsage.byTool` contains: per-tool totals, daily breakdowns, model breakdowns, model daily breakdowns.
- Figure out what combinations of this data produce genuinely different insights.
- Explore what a usage heatmap (like GitHub's contribution heatmap) needs from the data layer — does the backend provide hourly/daily granularity? What fields are available per day?
- Read the embedded design skills in CONTEXT_BUNDLE.md — they define HOW to design, not just what to build.

### 2. Engineer
Design the complete top section. For EVERY element you place, you must provide **UI/UX reasoning**:
- **WHY** is this element here? What question does it answer for the user?
- **WHY** is it positioned above/below/left-of the other elements? What's the reading flow?
- **WHY** does this chart type fit this data better than alternatives?
- **WHY** does this element deserve above-the-fold real estate vs. being in the detailed section below?

Think about:
- **Information hierarchy**: What does the user see FIRST? What earns the most prominent position?
- **Orientation**: Left-to-right? Top-to-bottom? Grid? Which element gets the most visual weight and WHY?
- **No redundancy**: Every chart/card must show a UNIQUE dimension. If two things show the same breakdown, one must go.
- **Heatmap**: Design a GitHub-style contribution heatmap. Think about what metric to show, how to color cells, where it fits in the layout, and WHY it adds value that no other chart provides.
- **Data pipeline**: What aggregations are needed? Fix the deriveStats mismatches.

### 3. Think
- What does a developer actually need from an AI Tools dashboard at a glance vs. in detail?
- How does each element serve a specific user question?
- What's the cognitive load of the layout — can the user parse it in under 3 seconds?

### 4. Design
Produce the full visual solution. For every design decision, reference the embedded skills:
- Apply **Human-Centric UX** 6 pillars (clarity, progressive disclosure, visual hierarchy, state coverage, feedback, affordance)
- Follow **Frontend Design** conventions (glass cards, typography scale, spacing grid)
- Use **Impeccable** principles (8px grid, accent discipline, reduced-motion)
- Apply **Motion** L2 recipes (hover lift, list stagger, entry animations)
- Follow **frontend-external-infra** anti-slop checklist and re-skin rules

### 5. Fix
- Model Usage Timeline: trace why it fails when a tool has only 1 model, engineer the fix
- deriveStats: fix toolsModels (should count models not tools), fix sessionsByAgent (wrong data source)

## Constraints
- Must work within existing components (StatsDashboard receives `rawData: AnalyticsRawData`)
- Chart.js Line, Bar, Doughnut registered. Register more if needed for heatmap.
- Must handle empty/loading/error states
- Bottom section stays unchanged — only fix the top section
- Dark mode only, rounded-xl, glass layers, DeskFlow design tokens
