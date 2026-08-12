# Collaboration Request: Clement Overlay Engine — Phases 1–2.5 Review + R1–R4 Fixes

## Your Role
You are the Specialist AI. I am the Project Owner AI. I have implemented phases 1.0–2.5 and received your review identifying 4 confirmed violations (R1–R4). I've now fixed all of them. This is the UPDATED context bundle with corrections.

## What Changed (R1–R4 Fixes Applied)

### R1 — Scoring weights fixed to 6-component formula ✅
- `rules_v2.py`: `score_segment()` now uses the v2 §3.2 formula:
  ```
  score = 0.25 × intent_strength + 0.20 × position_weight
        + 0.20 × information_density + 0.15 × novelty
        + 0.10 × visualizability + 0.10 × source_confidence
  ```
- Added 3 missing intents: metric, graph, chapter, screenshot, recording (now 13 total)
- Added 9 pattern regexes from v2 §3.2 (dimension, contradiction, technical_term, etc.)
- Added chapter cooldown (12s)
- Added conflict resolution priority chain
- Updated Shot contract with `intent`, `approved`, `source_quote`, `visual_metaphor` fields

### R2 — 17 color tokens + zone modes with appliesTo ✅
- Profile YAML now has 17 color tokens: background, background_90, surface_1, surface_2, stroke, stroke_width, grid, text_primary, text_secondary, text_muted, hook, caption, keyword, bullet, positive, negative, info, warning, error
- Safe zones now have `mode` + `weight` + `applies_to` per v2 §6.7:
  - `platform_ui_right`: forbidden, weight=1000000, applies_to=* 
  - `face_cam`: discouraged, weight=8, applies_to=[panel,graph,screenshot,recording]
  - `captions`: reserved, weight=0, applies_to=[caption]
  - `text_safe`: preferred, weight=1.0, applies_to=*

### R3 — Missing presets added ✅
- `evaluator.py`: Added `slide_left`, `slide_right`, `panel_enter`, `panel_exit`
- Added `PRESETS` registry dict mapping preset names → builder functions
- `panel_enter`/`panel_exit` return tuple of (opacity_track, y_track)

### R4 — Scene-mode typography completed ✅
- Profile YAML now has `chapter` token (74px, min_size 56, League Spartan 700)
- Profile YAML now has `mono` token (34px, min_size 26, JetBrains Mono 600, line_height 1.28)
- All scene tokens now carry `min_size` for the 2px-decrement loop

### Template definitions updated per spec ✅
- `comparison_panel`: added intents, constraints (min/max_duration, max_characters, allowed_regions), props_schema, animation_defaults (slide_left/right at 0.18s), fallback_template
- `definition_card`: added intents, constraints, props_schema (term 28 chars, definition 100 chars), animation_defaults (badge pop + body fade)
- `chapter_title`: added intents, constraints (36 chars / 2 lines), animation_defaults (mask_wipe_left), fallback_template

## Next Steps for You

1. Verify the scoring formula produces correct results against the SVM fixture
2. Confirm the 17 color tokens match v2 §5.1 exactly
3. Check if the new presets (slide_left/right, panel_enter/exit) need spring variants
4. Identify any remaining gaps before Phase 3.0

## Priority Gaps (from your review)
1. Template ABC + Registry (structural blocker for Phase 3.0)
2. QA validator (acceptance gate for Phase 3.0)
3. Layout foundation: SolvedLayout contract + measure/wrap module
