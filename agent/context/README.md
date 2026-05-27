# Context System Schemas

This directory contains schema definitions for the layered context management system.

## Files

| File | Purpose |
|------|---------|
| `session-summaries.json` | Stored session summaries after each session ends |
| `deep-memory.json` | Cross-session patterns, preferences, project insights |
| `context-injections.json` | Per-session context injection records (DB-backed) |

## Schema Reference

See `agent/docs/research-impl/context-management-architecture-18052026/RESULT.md` for the complete schema definitions.

### SessionSummary
```typescript
interface SessionSummary {
  id: string;
  topic: string;
  agent: string;
  started_at: string;      // ISO timestamp
  ended_at: string;        // ISO timestamp
  duration_minutes: number;
  decisions: string[];      // max 5
  files_modified: string[];  // max 10
  problems_addressed: string[];
  skills_used: string[];
  summary: string;          // 1-2 sentences
  summary_tokens: number;
}
```

### DeepMemory
```typescript
interface DeepMemory {
  patterns: UserPattern[];
  preferences: UserPreference[];
  project_insights: ProjectInsight[];
  last_updated: string;
}
```