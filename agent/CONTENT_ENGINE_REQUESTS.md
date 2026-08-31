# CONTENT ENGINE — Implementation Requests

## Open Questions (from spec Part 8)

1. **Which phase should be the default view when opening an episode?**
   - RECOMMENDED: Phase 1 (GREEN LIGHT) — validation first
   - ALTERNATIVE: Phase 2 (BLUEPRINT) — script is the main work surface

2. **Should the PhaseStepper allow clicking future phases?**
   - RECOMMENDED: Yes, all phases clickable, future phases show read-only preview
   - ALTERNATIVE: Lock future phases until current is complete

3. **SegmentTimeline colors:**
   - hook: #f5c518 (amber)
   - value: #00d4ff (cyan)
   - transition: #8b5cf6 (violet)
   - cta: #10b981 (emerald)
   - filler: #52525b (zinc-700)

4. **CuriosityGapBridge editable or read-only?**
   - RECOMMENDED: Read-only (generated from frame retention evidence data)

5. **Keyword phrases editable after AI generation?**
   - RECOMMENDED: No — read-only display, re-generate via External AI if needed

---

## Implementation Requests (ordered by priority)

### Request 1: ScriptProofCard Accept/Reject/Regenerate
**File:** `src/features/content-engine/components/ScriptProofCard.tsx`
**What:** Add accept ✅ / reject ✗ / regenerate ↻ buttons per frame. Rejected frames get rose border, strikethrough text, rejection reason field, regenerate input.
**Spec:** §2.3B
**Status:** NOT IMPLEMENTED

### Request 2: HookStackDisplay Component
**File:** NEW: `src/features/content-engine/components/HookStackDisplay.tsx`
**What:** Display hook stack section: visual trigger, on-screen text, verbal promise, hook framework badge, context lock, quick win.
**Spec:** §2.3A
**Status:** NOT IMPLEMENTED

### Request 3: CuriosityGapBridge Component
**File:** NEW: `src/features/content-engine/components/CuriosityGapBridge.tsx`
**What:** Bridge element between frame cards showing curiosity gap text + criterion + score.
**Spec:** §2.3C
**Status:** NOT IMPLEMENTED

### Request 4: KeywordSEOPanel Component
**File:** NEW: `src/features/content-engine/components/KeywordSEOPanel.tsx`
**What:** Display hidden SEO phrases table + algorithm poison warnings.
**Spec:** §2.3E
**Status:** NOT IMPLEMENTED

### Request 5: Frame Rejected Visual
**File:** `src/features/content-engine/components/ScriptProofCard.tsx`
**What:** When frame.score < 0.6: rose border, strikethrough on text, rejection reason, regenerate prompt visible.
**Spec:** §2.3B
**Status:** NOT IMPLEMENTED

### Request 6: Wire Phase 2 into EpisodesView Script Tab
**File:** `src/features/content-engine/components/EpisodesView.tsx`
**What:** Compose HookStackDisplay, CuriosityGapBridge (between frames), KeywordSEOPanel into the script tab.
**Spec:** §2.3
**Status:** NOT IMPLEMENTED

### Request 7: Brainstorm End-to-End Flow
**File:** `src/features/content-engine/components/BrainstormView.tsx`
**What:** Add session summary at top (call brainstormSummary), confirm/reclassify buttons after classify, routing on confirm (content_idea→ideas, framework→frameworks, analytics→lessons).
**Spec:** §3
**Status:** PARTIAL — classify works, but no summary, no confirm, no routing

### Request 8: Caption + Pinned Comment Display
**File:** `src/features/content-engine/components/EpisodesView.tsx`
**What:** Show generated caption (5-line structure) and pinned comment with keyword trigger in script tab.
**Spec:** §2.3F
**Status:** NOT IMPLEMENTED

### Request 9: EpisodeScoreSummary Per-Criterion Breakdown
**File:** `src/features/content-engine/components/EpisodeScoreSummary.tsx`
**What:** Verify and fix per-criterion horizontal bars with score values.
**Spec:** §2.3D
**Status:** EXISTS but may need visual fixes

### Request 10: 4-State Coverage
**Files:** Multiple
**What:** Add empty (dashed border + message), loading (spinner), error (rose + retry) states to: ScriptProofCard, RetentionPanel, SvgRetentionChart, GreenLightPanel, SegmentTimeline, FramePreviewCard, CaptureView, AssembleView, LearnView.
**Spec:** HumanCentricUX §Pillar4
**Status:** MOSTLY MISSING

---

## Design Tokens (binding)

```
Background: #0a0a0f
Surface/Card: bg-[rgba(24,24,27,0.60)] + backdrop-blur-xl
Border: border-white/[0.06]
Radius: rounded-xl max
Padding: p-5
Accent (Content Engine): #f5c518 (amber)
Text primary: zinc-100
Text body: zinc-300
Text caption: zinc-500 (10px uppercase tracking-wide)
Score bar: rose <0.6 | amber ≤0.8 | emerald >0.8
Status colors:
  - emerald-400: published/active/used/pass
  - amber #f5c518: scripted/approved/warning
  - violet-400: gated
  - cyan #00d4ff: refined/filming/applied
  - zinc: draft/raw/dismissed
Focus ring: focus:border-[#f5c518]/50
Fonts: Geist + JetBrains Mono
Icons: lucide-react ONLY
```

---

## Build Order

| Step | Task | New/Modified Files |
|------|------|--------------------|
| 1 | ScriptProofCard accept/reject/regenerate | ScriptProofCard.tsx |
| 2 | HookStackDisplay | NEW: HookStackDisplay.tsx |
| 3 | CuriosityGapBridge | NEW: CuriosityGapBridge.tsx |
| 4 | KeywordSEOPanel | NEW: KeywordSEOPanel.tsx |
| 5 | Frame rejected visual | ScriptProofCard.tsx |
| 6 | Wire Phase 2 into EpisodesView | EpisodesView.tsx |
| 7 | Brainstorm end-to-end | BrainstormView.tsx |
| 8 | Caption display | EpisodesView.tsx |
| 9 | Score breakdown verify | EpisodeScoreSummary.tsx |
| 10 | 4-state coverage | Multiple files |
| 11 | Vite rebuild + copy to dist | dist-tmp/ → dist/ |
