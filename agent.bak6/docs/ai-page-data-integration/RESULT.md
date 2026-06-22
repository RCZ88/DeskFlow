# RESULT: AiPage Data Hub — Design & Implementation Spec

---

## Executive Summary

Transform AiPage from a single-purpose goals page into a **context-aware data hub** that surfaces the most relevant productivity, development, and AI-usage metrics alongside goals. The page keeps its three-section architecture (Focus → Plan → Reflect) but adds data-driven insight cards — not full dashboards (those stay in their dedicated pages), but summary snapshots that answer "what's going on right now?" Each card is lazy-loaded via a shared data hook with 60s cache TTL (matching the existing `analyticsCacheRef` pattern). A query bar at the top allows natural-language questions. Phase 1 adds 4 insight cards to the Focus and Reflect sections. Phase 2 adds per-card expand-to-full-detail and the query bar.

---

## Data Pipeline Architecture

### Loading Strategy — Hybrid Lazy

```
AiPage mount
  ├── loadCoreData() — always runs: goals, digest, context (existing)
  ├── loadInsightData() — runs 200ms after mount (via requestIdleCallback or setTimeout):
  │     ├── useAiPageData("appUsage")   → getDashboardAggregates({ period: 'today' })
  │     ├── useAiPageData("aiUsage")    → getAIUsageSummary('day')
  │     ├── useAiPageData("projects")   → getProjects()
  │     ├── useAiPageData("sessions")   → getTerminalSessions(undefined, 5)
  │     └── useAiPageData("external")   → getExternalSessions('today')
  └── onUserQuery() — lazy-loads specific data when user types a question
```

### Caching — aiPageCacheRef

A module-level `Map<string, { data: any; timestamp: number }>` with 60s TTL, identical to the existing `analyticsCacheRef` in IDEProjectsPage. Each key = IPC method name + JSON-stringified args. A `clearAiPageCache()` call is exposed and called on `context-changed` and `external-data-changed` events.

### Refresh Model

| Event | Action |
|-------|--------|
| `foreground-changed` | No refresh (live data not critical for AI page) |
| `external-data-changed` | Clear and re-fetch external/session data |
| `context-changed` | Clear and re-fetch problems/todos/context data |
| Page re-focus (visibility change) | Re-fetch if cache > 30s stale |
| Manual refresh button in header | Force clear all and re-fetch |

### Composite Endpoints

No new IPC endpoints needed for Phase 1 — all data is fetched via existing endpoints. A composite `getAiPageContext` endpoint would be nice for Phase 2 but is not required.

---

## Section-by-Section UI Proposal

### Phase 1 — Data Cards (implemented here)

Add insight cards to the existing Focus and Reflect sections:

**Section 01 FOCUS** — Extend the grid:
```
[Column 1: xl:col-span-8]     [Column 2: xl:col-span-4]
┌────────────────────┐         ┌────────────────────┐
│   DailyPlanCard    │         │ ContextSummaryCard │
│   (goals)          │         │ (existing)         │
└────────────────────┘         └────────────────────┘
┌────────────────────┐         ┌────────────────────┐
│   TodayOverviewCard│         │ AiUsageCard        │
│   (app stats)      │         │ (AI tokens/sess)   │
└────────────────────┘         └────────────────────┘
```

**TodayOverviewCard** (new component)
- **Data source:** `getDashboardAggregates({ period: 'today' })`
- **Shows:** Total tracked time, active sessions count, productive % (from tier data), idle gaps detected
- **Layout:** Compact KPI row (4 small metrics in a row) using the stats/KpiCard pattern
- **Skeleton:** 4 shimmer blocks while loading
- **Empty:** "Start tracking to see today's overview"
- **Error:** Silent (no error state for these — inline empty if fetch fails)

**AiUsageCard** (new component)
- **Data source:** `getAIUsageSummary('day')`
- **Shows:** Tokens used today, total cost, active agent sessions, tool distribution (simple text list)
- **Layout:** KPI row with 3-4 metrics + compact tool breakdown
- **Skeleton:** 4 shimmer blocks
- **Empty/Error:** "No AI activity today" or silent on error

**Section 03 REFLECT** — Extend the grid:
```
┌──────────────────────────────────────────┐
│   TopicDigestCard  (existing)            │
└──────────────────────────────────────────┘
┌────────────────────┐  ┌────────────────────┐
│   GoalHistoryCard  │  │   ProjectStatusCard│
│   (existing)       │  │   (new)            │
└────────────────────┘  └────────────────────┘
```

**ProjectStatusCard** (new component)
- **Data source:** `getProjects()`
- **Shows:** Active project count (non-deleted), most recent project name + language, quick "Open" hint
- **Layout:** Single compact card with project count stat + recent project row
- **Empty:** "Add a project in IDE Projects to see it here"
- **Error:** Silent

### Phase 2 — Query Bar + Expanded Detail

Add a query bar below the header:
```
[Ask me anything about your data...          ] [Search]
```

When user types a query like "How much AI did I use this week?":
1. Query is matched against a keyword→IPC mapping
2. Matching data is fetched on-demand (bypassing cache for fresh data)
3. Result is shown as a temporary answer card below the bar

Keyword mapping (for Phase 2):
| Keyword | IPC | Period |
|---------|-----|--------|
| "ai", "tokens", "cost" | `getAIUsageSummary(period)` | parsed from query |
| "projects", "repos" | `getProjects()` | n/a |
| "terminal", "sessions" | `getTerminalSessions(projectId, limit)` | parsed from query |
| "sleep", "external" | `getExternalSessions(period)` | parsed from query |
| "dora", "velocity" | `getDORAMetrics(projectId, period)` | parsed from query |
| "productivity", "tracked" | `getDashboardAggregates({ period })` | parsed from query |

The query bar is styled like the existing search inputs in the app (rounded, dark bg, subtle border).

---

## Extra Features (Ranked)

| # | Feature | Impact | Effort | Phase |
|---|---------|--------|--------|-------|
| 1 | **Today's Overview card** | High — answers "how's my day going?" | Low (1 card, 1 IPC) | 1 |
| 2 | **AI Usage card** | High — shows AI consumption at a glance | Low (1 card, 1 IPC) | 1 |
| 3 | **Project Status card** | Medium — links goals to projects | Low (1 card, 1 IPC) | 1 |
| 4 | **Query bar** | High — universal access to any data | Medium (parser + UI + IPC router) | 2 |
| 5 | **Terminal Sessions card** | Medium — recent session topics | Low (1 card, 1 IPC) | 2 |
| 6 | **External Activity card** | Low — already in ContextSummaryCard hints | Low | 2 |
| 7 | **Proactive notifications** | Medium — "idle 30min" alerts | High (requires timer + event system) | 3 |
| 8 | **Workspace health score** | Low — composite metric unclear utility | Medium | 3 |

---

## Backend Gaps

| Endpoint | Status | Notes |
|----------|--------|-------|
| `getDashboardAggregates({period:'today'})` | ✅ Exists | Returns `{totalDurationMs, sessionCount, ...}` |
| `getAIUsageSummary('day')` | ✅ Exists | Returns `{totalTokens, totalCost, activeSessions, byTool, byAgent}` |
| `getProjects()` | ✅ Exists | Returns full project array |
| `getTerminalSessions(undefined, 5)` | ✅ Exists | Returns recent sessions |
| `getExternalSessions('today')` | ✅ Exists | Returns today's external sessions |
| Composite `getAiPageContext` | ❌ Not needed for Phase 1 | Would batch-all data in one call — add in Phase 3 if perf is an issue |

No backend gaps for Phase 1. All data sources have real IPC endpoints with real handlers.

---

## Implementation Phases

### Phase 1 (THIS IMPLEMENTATION)

1. Create `src/hooks/useAiPageData.ts` — shared data hook with cache ref, handles loading/error states
2. Create `src/components/TodayOverviewCard.tsx` — today's app stats KPI card
3. Create `src/components/AiUsageCard.tsx` — AI token/cost/session card
4. Create `src/components/ProjectStatusCard.tsx` — active projects card
5. Modify `src/pages/AiPage.tsx` — add new cards to Focus + Reflect sections, wire data loading
6. Verify build passes

### Phase 2 (follow-up)
7. Add query bar component + keyword→IPC router
8. Add Terminal Sessions card
9. Add per-card "show detail" expand (navigate to dedicated pages)

### Phase 3 (future)
10. Composite `getAiPageContext` endpoint
11. Proactive notifications
12. Cross-domain insights

---

## Open Questions

1. Should the data cards be collapsible/suppressible by user preference?
2. Should the query bar be inside AiPage or a global overlay?
3. Should clicking a card navigate to its dedicated page (e.g., TodayOverview → Dashboard)?
4. Is the 60s cache TTL appropriate, or should insight data be fresher?
