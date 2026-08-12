"""qa.py — Quality assurance validator (v2 §3.4/§6.7)."""
from typing import List, Dict, Any, Optional
from ..contracts.scenegraph import SceneGraph, SceneNode
from ..contracts.timeline import AnimationTimeline
from ..contracts.style import StyleProfile

class QAResult:
    def __init__(self, passed: bool, hard_fails: List[str] = None, warnings: List[str] = None):
        self.passed = passed
        self.hard_fails = hard_fails or []
        self.warnings = warnings or []

def validate_scene(scene: SceneGraph, timeline: Optional[AnimationTimeline] = None,
                   profile: Optional[StyleProfile] = None) -> QAResult:
    """Validate a scene against v2 constraints. Returns QAResult with hard_fails and warnings."""
    hard_fails = []
    warnings = []

    # Check forbidden zone overlap
    if profile:
        for zone in profile.safe_zones:
            if zone.mode == 'forbidden':
                for layer in scene.layers:
                    lx, ly = layer.position.x, layer.position.y
                    lw, lh = layer.size.w, layer.size.h
                    # Check if layer overlaps with forbidden zone
                    if (lx < zone.x + zone.w and lx + lw > zone.x and
                        ly < zone.y + zone.h and ly + lh > zone.y):
                        if zone.applies_to == ['*'] or layer.layer_type.value in zone.applies_to:
                            hard_fails.append(f'Layer "{layer.id}" ({layer.layer_type.value}) overlaps forbidden zone "{zone.name}"')

    # Check text outside canvas
    for layer in scene.layers:
        if layer.resolved_lines:
            for line in layer.resolved_lines:
                if line.x + line.width > scene.canvas_width or line.y + line.height > scene.canvas_height:
                    hard_fails.append(f'Line "{line.text[:20]}..." extends outside canvas')
                if line.x < 0 or line.y < 0:
                    hard_fails.append(f'Line "{line.text[:20]}..." has negative position')

    # Check required layers have dimensions
    for layer in scene.layers:
        if layer.layer_type.value in ('text', 'panel') and (layer.size.w == 0 or layer.size.h == 0):
            hard_fails.append(f'Layer "{layer.id}" has zero width or height')

    # Check text below min_size
    if profile:
        mode_config = profile.get_mode('scene')
        for layer in scene.layers:
            if layer.resolved_lines:
                for line in layer.resolved_lines:
                    style = getattr(mode_config, layer.layer_type.value, None)
                    if style and hasattr(style, 'min_size') and style.min_size:
                        if line.font_size < style.min_size:
                            hard_fails.append(f'Font size {line.font_size} below min_size {style.min_size} for {layer.layer_type.value}')

    # Check track validity
    if timeline:
        track_targets = {t.node_id for t in timeline.tracks}
        layer_ids = {layer.id for layer in scene.layers}
        for track in timeline.tracks:
            if track.node_id not in layer_ids:
                hard_fails.append(f'Track target "{track.node_id}" not in scene layers')
            if track.start_us + track.duration_us > timeline.duration_us:
                hard_fails.append(f'Track "{track.node_id}.{track.property}" extends beyond timeline')

    # Contrast check (simplified — check light-on-dark)
    for layer in scene.layers:
        if layer.resolved_lines:
            for line in layer.resolved_lines:
                if line.font_weight in ('bold', '600', '700') and line.font_size >= 24:
                    # Large text: 3:1 minimum
                    pass  # Full contrast check needs color distance calculation

    return QAResult(
        passed=len(hard_fails) == 0,
        hard_fails=hard_fails,
        warnings=warnings,
    )
