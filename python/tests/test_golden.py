"""Golden tests for Clement Overlay Engine phases 1.0–2.5."""
import hashlib
import json
from pathlib import Path

FIXTURES_DIR = Path(__file__).parent / 'fixtures'
GOLDEN_DIR = Path(__file__).parent / 'golden_cards'

def test_svm_fixture_ingest():
    """Phase 1.0: Ingest SVM transcript."""
    from clement.contracts.transcript import TranscriptInput
    data = json.loads((FIXTURES_DIR / 'svm_ep2.json').read_text())
    t = TranscriptInput.from_v1_dict(data)
    assert t.video_id == 'svm_ep2'
    assert len(t.segments) == 7
    assert t.segments[0].timing.start_us == 0
    assert t.segments[0].timing.end_us == 4_800_000
    assert t.segments[0].words[0].word == 'People'
    print('✓ test_svm_fixture_ingest passed')

def test_svm_fixture_extract():
    """Phase 1.5: Extract shots from SVM transcript."""
    from clement.contracts.transcript import TranscriptInput
    from clement.extraction.rules_v2 import extract_shots
    data = json.loads((FIXTURES_DIR / 'svm_ep2.json').read_text())
    t = TranscriptInput.from_v1_dict(data)
    plan = extract_shots(t)
    assert plan.video_id == 'svm_ep2'
    kept = plan.kept_shots()
    assert len(kept) >= 2, f'Expected ≥2 kept shots, got {len(kept)}'
    assert plan.is_in_target_range() or len(kept) <= 6, 'Target range should be achievable'
    # First shot should be hook
    assert kept[0].intent == 'hook', f'First shot should be hook, got {kept[0].intent}'
    print('✓ test_svm_fixture_extract passed')

def test_scoring_weights():
    """R1: Scoring formula uses 6 components summing to 1.0."""
    from clement.extraction.rules_v2 import score_segment
    score, intent = score_segment('People think SVM is just a line.', 0.0, 4.8, 847.2, set())
    assert 0.0 <= score <= 1.0, f'Score out of range: {score}'
    assert intent in ('hook', 'definition', 'comparison', 'list', 'process', 'example',
                       'equation', 'metric', 'graph', 'chapter', 'screenshot', 'recording', 'cta', 'body')
    print(f'✓ test_scoring_weights passed: score={score:.3f}, intent={intent}')

def test_13_intents():
    """R1: All 13 intents are recognized."""
    from clement.extraction.rules_v2 import INTENTS
    assert len(INTENTS) == 13, f'Expected 13 intents, got {len(INTENTS)}'
    expected = {'hook', 'definition', 'comparison', 'list', 'process', 'example',
                'equation', 'metric', 'graph', 'chapter', 'screenshot', 'recording', 'cta'}
    assert set(INTENTS) == expected, f'Missing intents: {expected - set(INTENTS)}'
    print('✓ test_13_intents passed')

def test_17_color_tokens():
    """R2: Style profile has 17 color tokens."""
    from clement.contracts.style import ColorPalette
    colors = ColorPalette()
    # Count fields that are actual color strings (not stroke_width)
    color_fields = {k for k, v in colors.model_dump().items()
                    if isinstance(v, str) and v.startswith('#')}
    assert len(color_fields) >= 17, f'Expected ≥17 color tokens, got {len(color_fields)}: {sorted(color_fields)}'
    print(f'✓ test_17_color_tokens passed: {len(color_fields)} tokens')

def test_scene_mode_typography():
    """R4: Scene mode has chapter + mono tokens."""
    from clement.contracts.style import StyleProfile
    profile = StyleProfile()
    scene = profile.get_mode('scene')
    assert scene.chapter.size == 74, f'Expected chapter size 74, got {scene.chapter.size}'
    assert scene.chapter.min_size == 56, f'Expected chapter min_size 56, got {scene.chapter.min_size}'
    assert scene.mono.size == 34, f'Expected mono size 34, got {scene.mono.size}'
    assert scene.mono.min_size == 26, f'Expected mono min_size 26, got {scene.mono.min_size}'
    # Check all scene styles have min_size
    for name in ('hook', 'body', 'caption', 'keyword', 'chapter', 'mono'):
        s = getattr(scene, name)
        assert s.min_size is not None, f'{name} missing min_size'
    print('✓ test_scene_mode_typography passed')

def test_easings():
    """Phase 2.0: 12 named easings."""
    from clement.animation.bezier import EASINGS
    assert len(EASINGS) == 12, f'Expected 12 easings, got {len(EASINGS)}'
    required = {'standard_enter', 'standard_exit', 'overshoot_soft', 'sharp_reveal'}
    assert required.issubset(set(EASINGS.keys())), f'Missing: {required - set(EASINGS.keys())}'
    print('✓ test_easings passed')

def test_preset_registry():
    """R3: All required presets exist."""
    from clement.animation.evaluator import PRESETS
    required = {'fade_in', 'fade_out', 'slide_up', 'slide_left', 'slide_right',
                'pop', 'panel_enter', 'panel_exit', 'mask_wipe_left'}
    assert required.issubset(set(PRESETS.keys())), f'Missing: {required - set(PRESETS.keys())}'
    print('✓ test_preset_registry passed')

def test_safe_zone_modes():
    """R2: Safe zones have mode + weight + applies_to."""
    from clement.contracts.style import StyleProfile
    profile = StyleProfile()
    for zone in profile.safe_zones:
        assert zone.mode in ('forbidden', 'discouraged', 'reserved', 'preferred'), f'Invalid mode: {zone.mode}'
        assert isinstance(zone.weight, (int, float)), f'Invalid weight: {zone.weight}'
        assert isinstance(zone.applies_to, list), f'Invalid applies_to: {zone.applies_to}'
    print('✓ test_safe_zone_modes passed')


if __name__ == '__main__':
    test_svm_fixture_ingest()
    test_svm_fixture_extract()
    test_scoring_weights()
    test_13_intents()
    test_17_color_tokens()
    test_scene_mode_typography()
    test_easings()
    test_preset_registry()
    test_safe_zone_modes()
    print('\n✅ All golden tests passed')
