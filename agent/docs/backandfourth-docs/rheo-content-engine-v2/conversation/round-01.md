# Round 1 — RHEO Content Engine v2.0

**Date:** 2026-08-16

## State
- Specialist (external AI) started the brainstorm: streaming approach, first context gaps, Round 1 REQUESTs.
- opencode answered: streaming reality check + brainstorm view contract (spec §3.1–3.3 DDL, §4.2 UI, §5.1 prompt, §6 brainstorm IPC signatures).
- CONTEXT reply: `conversation/round-01-opencode-context.md` (relayed verbatim by CZ).

## Key Answers Given (Round 1)
1. **Streaming:** No true chunked token streaming exists renderer-side. `callOpenRouter` (src/main.ts:16163) buffers SSE internally, returns full content. `streamGoogleAiStudio` (src/main/ai/providers/googleAiStudio.ts) is the only real AsyncGenerator but is standalone (own key, outside router chain). `providerStream.ts` = fake streaming (single onToken call).
2. Brainstorm contract verbatim: brainstorm_sessions / brainstorm_messages / ideas DDL, UI layout, classification prompt, IPC signatures, UX constraints (no dropdowns, ✅/🔄 confirm, 5 hashtag cap, hook 3–6 words, face-zone rule, "No decisions after 10 PM" nudge, SQLite only, OpenRouter-only AI).

## Specialist Decisions (Round 1)
- Request/response core + optimistic states + streaming seam; Phase 2 real streaming.
- Canonical classification JSON envelope (see round-02 file).