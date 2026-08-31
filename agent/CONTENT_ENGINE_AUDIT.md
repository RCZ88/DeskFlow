# CONTENT ENGINE AUDIT REPORT
**Date:** 2026-08-26
**Auditor:** opencode
**Target:** Content Engine UI layer (backend untouched)

---

## A. Backend Status (86 IPC handlers, all verified)

| IPC Channel | Handler? | Bridge? | UI Calls? |
|-------------|----------|---------|-----------|
| content:ideas:list | ✅ | ✅ | ✅ |
| content:ideas:save | ✅ | ✅ | ✅ |
| content:ideas:delete | ✅ | ✅ | ✅ |
| ideas:synthesize | ✅ | ✅ | ✅ |
| content:episodes:list | ✅ | ✅ | ✅ |
| content:episodes:get | ✅ | ✅ | ✅ |
| content:episodes:save | ✅ | ✅ | ✅ |
| content:episodes:delete | ✅ | ✅ | ✅ |
| content:script:generate | ✅ | ✅ | ✅ |
| content:script:regenerate-line | ✅ | ✅ | ✅ |
| content:validate-script-evidence | ✅ | ✅ | ✅ |
| content:validate-gates | ✅ | ✅ | ⚠️ (GreenLightPanel shows gates but doesn't call validate) |
| content:gate-override | ✅ | ✅ | ✅ |
| content:inject-seo | ✅ | ✅ | ⚠️ (SEO tab button exists, output display incomplete) |
| content:brainstorm:classify | ✅ | ✅ | ✅ |
| content:brainstorm:summary | ✅ | ✅ | ❌ (NOT called by any UI) |
| content:brainstorms:list | ✅ | ✅ | ✅ |
| content:brainstorms:save | ✅ | ✅ | ✅ |
| content:brainstorms:delete | ✅ | ✅ | ✅ |
| content:series:list | ✅ | ✅ | ✅ |
| content:series:get | ✅ | ✅ | ✅ |
| content:series:save | ✅ | ✅ | ✅ |
| content:series:delete | ✅ | ✅ | ✅ |
| content:series:add-episode | ✅ | ✅ | ✅ |
| content:series:remove-episode | ✅ | ✅ | ✅ |
| content:series:reorder | ✅ | ✅ | ❌ (no reorder UI) |
| content:external:build-classify-prompt | ✅ | ✅ | ✅ |
| content:external:build-synthesize-prompt | ✅ | ✅ | ✅ |
| content:external:build-script-prompt | ✅ | ✅ | ✅ |
| content:external:build-seo-prompt | ✅ | ✅ | ✅ |
| content:external:build-gates-prompt | ✅ | ✅ | ✅ |
| content:external:build-analytics-prompt | ✅ | ✅ | ✅ |
| content:external:build-lessons-prompt | ✅ | ✅ | ✅ |
| content:external:build-reflection-prompt | ✅ | ✅ | ✅ |
| content:external:build-frameworks-prompt | ✅ | ✅ | ✅ |
| content:external:import-classify | ✅ | ✅ | ✅ |
| content:external:import-synthesize | ✅ | ✅ | ✅ |
| content:external:import-script | ✅ | ✅ | ✅ |
| content:external:import-seo | ✅ | ✅ | ✅ |
| content:external:import-gates | ✅ | ✅ | ✅ |
| content:external:import-analytics | ✅ | ✅ | ✅ |
| content:external:import-lessons | ✅ | ✅ | ✅ |
| content:external:import-reflection | ✅ | ✅ | ✅ |
| content:external:import-frameworks | ✅ | ✅ | ✅ |
| themes:create | ✅ | ✅ | ✅ |
| themes:generate | ✅ | ✅ | ✅ |
| themes:get-all | ✅ | ✅ | ✅ |
| themes:apply | ✅ | ✅ | ✅ |
| themes:delete | ✅ | ✅ | ✅ |
| content:analytics:get | ✅ | ✅ | ✅ |
| content:analytics:upsert-video | ✅ | ✅ | ✅ |
| content:analytics:delete-video | ✅ | ✅ | ✅ |
| content:analytics:insight | ✅ | ✅ | ✅ |
| content:analytics:parse-raw | ✅ | ✅ | ✅ |
| content:analytics:correlate | ✅ | ✅ | ⚠️ (LearnView exists but may not call correlate) |
| content:lessons:list | ✅ | ✅ | ✅ |
| content:lessons:save | ✅ | ✅ | ✅ |
| content:lessons:delete | ✅ | ✅ | ✅ |
| content:lessons:extract | ✅ | ✅ | ❌ (no extract button in UI) |
| content:lessons:confirm | ✅ | ✅ | ✅ |
| content:frameworks:list | ✅ | ✅ | ✅ |
| content:frameworks:save | ✅ | ✅ | ✅ |
| content:frameworks:rollback | ✅ | ✅ | ✅ |
| content:reflection:save | ✅ | ✅ | ✅ |
| content:reflection:get | ✅ | ✅ | ✅ |
| content:reflection:analyze | ✅ | ✅ | ✅ |
| content:characteristics:get | ✅ | ✅ | ✅ |
| content:characteristics:save | ✅ | ✅ | ✅ |
| content:scoring:schemes | ✅ | ✅ | ✅ |
| content:scoring:current | ✅ | ✅ | ✅ |
| content:scoring:calibrate | ✅ | ✅ | ✅ |
| content:process:timeline | ✅ | ✅ | ✅ |
| content:process:log | ✅ | ✅ | ✅ |
| content:process:summary | ✅ | ✅ | ✅ |
| content:process:gallery | ✅ | ✅ | ✅ |
| content:takes:list | ✅ | ✅ | ✅ |
| content:takes:save | ✅ | ✅ | ✅ |
| content:takes:delete | ✅ | ✅ | ✅ |
| content:takes:import | ✅ | ✅ | ✅ |
| content:takes:transcribe | ✅ | ✅ | ✅ |
| content:takes:save-segments | ✅ | ✅ | ✅ |
| content:takes:segments | ✅ | ✅ | ✅ |
| content:takes:select | ✅ | ✅ | ✅ |
| content:takes:evaluate | ✅ | ✅ | ✅ |
| content:edit:cutlist | ✅ | ✅ | ✅ |
| content:edit:overlay-plan | ✅ | ✅ | ✅ |

**Summary:** 86/86 handlers ✅ | 86/86 bridges ✅ | 5 UI gaps

---

## B. UI Component Status

| Component | File? | Renders? | Connected? | 4 States? |
|-----------|-------|----------|------------|-----------|
| ContentEngineWorkspace | ✅ | ✅ | ✅ | ❌ |
| BrainstormView | ✅ | ✅ | ✅ | ⚠️ |
| IdeasView | ✅ | ✅ | ✅ | ✅ |
| EpisodesView | ✅ | ✅ | ✅ | ✅ |
| ScriptProofCard | ✅ | ✅ | ✅ | ❌ |
| RetentionPanel | ✅ | ✅ | ✅ | ❌ |
| SvgRetentionChart | ✅ | ✅ | ✅ | ❌ |
| ThemesView | ✅ | ✅ | ✅ | ✅ |
| AnalyticsView | ✅ | ✅ | ✅ | ✅ |
| LessonsView | ✅ | ✅ | ✅ | ✅ |
| FrameworksView | ✅ | ✅ | ✅ | ✅ |
| PhaseStepper | ✅ | ✅ | ✅ | N/A |
| GreenLightPanel | ✅ | ✅ | ⚠️ | ❌ |
| CaptureView | ✅ | ✅ | ✅ | ⚠️ |
| AssembleView | ✅ | ✅ | ✅ | ⚠️ |
| LearnView | ✅ | ✅ | ✅ | ⚠️ |
| SegmentTimeline | ✅ | ✅ | ✅ | ❌ |
| FramePreviewCard | ✅ | ✅ | ✅ | ❌ |
| PipelineView | ✅ | ✅ | ✅ | ✅ |
| PlaybookView | ✅ | ✅ | ✅ | ✅ |
| TemplateSelector | ✅ | ✅ | ✅ | N/A |
| SeriesView | ✅ | ✅ | ✅ | ✅ |
| **HookStackDisplay** | ❌ | — | — | — |
| **CuriosityGapBridge** | ❌ | — | — | — |
| **KeywordSEOPanel** | ❌ | — | — | — |
| **CaptionDisplay** | ❌ | — | — | — |

**Summary:** 22/26 exist | 3 MISSING components | 10 lack 4-state coverage

---

## C. Feature Gaps (13 items)

| # | Gap | Spec Reference | Impact |
|---|-----|---------------|--------|
| 1 | HookStackDisplay component missing | §2.3A | HIGH — visual trigger, verbal promise, hook framework, context lock, quick win not shown |
| 2 | CuriosityGapBridge component missing | §2.3C | HIGH — no bridge connectors between frames |
| 3 | KeywordSEOPanel component missing | §2.3E | HIGH — hidden SEO phrases + poison words not displayed |
| 4 | ScriptProofCard has no accept/reject/regenerate | §2.3B | CRITICAL — no way to accept or reject individual frames |
| 5 | Brainstorm has no session summary | §3 | MEDIUM — summary not shown at top |
| 6 | Brainstorm has no confirm/reclassify buttons | §3 | HIGH — can't confirm classification or reclassify |
| 7 | Brainstorm doesn't route on confirm | §3 | HIGH — content_idea→ideas, framework→frameworks, analytics→lessons |
| 8 | Episode detail doesn't compose Phase 2 elements | §2.3 | HIGH — HookStack, bridges, keyword panel not in script tab |
| 9 | No caption + pinned comment display | §2.3F | MEDIUM — caption/pinned comment not shown |
| 10 | Frame rejected visual missing | §2.3B | HIGH — no rose border, strikethrough, rejection reason |
| 11 | No curiosity gap bridges between frames | §2.3C | HIGH — frames render as flat list |
| 12 | EpisodeScoreSummary may lack per-criterion bars | §2.3D | MEDIUM — need to verify breakdown display |
| 13 | Most sub-components lack empty/loading/error states | HumanCentricUX | MEDIUM — violates UX skill pillar 4 |

---

## D. Broken Connections (4 items)

| # | Connection | Backend | Bridge | UI |
|---|-----------|---------|--------|----|
| 1 | `content:brainstorm:summary` | ✅ | ✅ | ❌ NOT called |
| 2 | `content:validate-gates` | ✅ | ✅ | ⚠️ GreenLightPanel shows gates but doesn't call validate |
| 3 | `content:inject-seo` | ✅ | ✅ | ⚠️ SEO tab has button, output display incomplete |
| 4 | `content:lessons:extract` | ✅ | ✅ | ❌ No extract button in LessonsView |

---

## E. Priority Fix List

| Priority | Task | Component | Effort |
|----------|------|-----------|--------|
| 1 | Add accept/reject/regenerate to ScriptProofCard | ScriptProofCard.tsx | HIGH |
| 2 | Create HookStackDisplay component | NEW: HookStackDisplay.tsx | MEDIUM |
| 3 | Create CuriosityGapBridge component | NEW: CuriosityGapBridge.tsx | LOW |
| 4 | Create KeywordSEOPanel component | NEW: KeywordSEOPanel.tsx | MEDIUM |
| 5 | Add frame rejected visual (rose, strikethrough, reason) | ScriptProofCard.tsx | MEDIUM |
| 6 | Wire HookStack + bridges + keyword panel into EpisodesView script tab | EpisodesView.tsx | MEDIUM |
| 7 | Add session summary + confirm/reclassify + routing to BrainstormView | BrainstormView.tsx | HIGH |
| 8 | Add caption + pinned comment display | EpisodesView.tsx | LOW |
| 9 | Verify EpisodeScoreSummary per-criterion breakdown | EpisodeScoreSummary.tsx | LOW |
| 10 | Add empty/loading/error states to sub-components | Multiple files | MEDIUM |

---

## F. Answers to Spec Questions (Part 8)

1. **Default phase on episode open:** Phase 1 (GREEN LIGHT) — validation first
2. **PhaseStepper locking:** All phases clickable, future phases show read-only preview
3. **SegmentTimeline colors:** hook=#f5c518, value=#00d4ff, transition=#8b5cf6, cta=#10b981, filler=#52525b
4. **CuriosityGapBridge editable:** Read-only (generated from frame data, not user-editable)
5. **Keyword phrases editable:** No — read-only display from backend data
