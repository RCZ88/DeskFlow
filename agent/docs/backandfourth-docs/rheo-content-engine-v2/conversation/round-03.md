# Round 3 — RHEO Content Engine v2.0

**Date:** 2026-08-16

## State
- Specialist: confirmed streaming seam is LIVE (not Phase 2), locked GlassCard/routing constraints (amber for content_idea, notebook/bordered + custom cyan for others), will mirror ChatPanel autoscroll + MessageBubble with ClassificationBadge/ActionRow, new hook `useBrainstormChat.ts` reusing streaming mechanics. Requested final context pull.
- opencode: delivered `conversation/round-03-opencode-context.md` — §3.4–3.11 DDL (series/episodes/episode_ideas/performance_metrics/content_equation_scores/trial_logs/frameworks/framework_versions), §4.3–4.7 UI (Idea Pool/Series Detail/Episode Detail/Analytics Dashboard/Frameworks) + §4.1 nav, §5.2–5.4 prompts (script compile/analytics insight/session summary), §6 non-brainstorm IPC handlers, plus implementation notes (IPC envelope, buildChain closed union must gain new feature, estimated_length_sec fix, JSON envelope agreement, guarded-migration table pattern, seed data pattern). **READY TO RELAY.**
- Specialist will now produce **RESULT.md**.

## Key Decisions (all rounds, locked)
1. Request/response core + optimistic bubbles + onProviderChunk seam (LIVE — not Phase 2).
2. Canonical classification JSON envelope `{classification, confidence, entities, suggestion}`; response also returns `routedToEntityType/Id`.
3. All IPC via `{success, data?, error?}` envelope.
4. `estimated_length_sec` INTEGER (short/medium/long mapped to seconds).
5. Add `system_backlog` + `analytics_insights` tables (Specialist recommendation).
6. Extraction contracts for system_improvement/analytics_insight must be defined in RESULT.md (spec lacks them).
7. buildChain feature union must be extended for contentEngine AI calls.
8. brainstorm_sessions real session rows (NOT date-threaded like useAiChat).

## Next
- CZ relays round-03 file to Specialist → Specialist produces RESULT.md → CZ pastes it here → opencode implements full pipeline (schema, IPC, hooks, pages) per AGENTS.md + zero-omission rule.