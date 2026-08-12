"""evaluator.py — Frame-exact animation evaluator (v2 §7.5)."""
from typing import Dict, Any, Optional
from ..contracts.timeline import AnimationTimeline, Track, Keyframe, Easing
from .bezier import evaluate_easing, interpolate

def evaluate_track(track: Track, time_us: int, fps: int = 30) -> float:
    """Evaluate a single track at a specific time (µs)."""
    kfs = sorted(track.keyframes, key=lambda k: k.time_us)
    if not kfs:
        return 0.0
    if time_us <= kfs[0].time_us:
        return kfs[0].value
    if time_us >= kfs[-1].time_us:
        return kfs[-1].value

    for i in range(len(kfs) - 1):
        if kfs[i].time_us <= time_us < kfs[i + 1].time_us:
            local_t = (time_us - kfs[i].time_us) / max(kfs[i + 1].time_us - kfs[i].time_us, 1)
            eased_t = evaluate_easing(kfs[i].easing.value, local_t)
            return interpolate(kfs[i].value, kfs[i + 1].value, eased_t)

    return kfs[-1].value


def evaluate_frame(timeline: AnimationTimeline, time_us: int) -> Dict[str, Dict[str, float]]:
    """Evaluate all tracks at a given time. Returns {node_id: {property: value}}."""
    result: Dict[str, Dict[str, float]] = {}
    for track in timeline.tracks:
        if track.node_id not in result:
            result[track.node_id] = {}
        result[track.node_id][track.property] = evaluate_track(track, time_us, timeline.fps)
    return result


def build_fade_in(node_id: str, start_us: int, duration_us: int) -> dict:
    """Create a fade-in animation for a node."""
    return {
        'node_id': node_id,
        'property': 'opacity',
        'keyframes': [
            {'time_us': start_us, 'value': 0.0, 'easing': 'linear'},
            {'time_us': start_us + duration_us, 'value': 1.0, 'easing': 'ease_out'},
        ]
    }


def build_fade_out(node_id: str, start_us: int, duration_us: int) -> dict:
    """Create a fade-out animation for a node."""
    return {
        'node_id': node_id,
        'property': 'opacity',
        'keyframes': [
            {'time_us': start_us, 'value': 1.0, 'easing': 'ease_in'},
            {'time_us': start_us + duration_us, 'value': 0.0, 'easing': 'linear'},
        ]
    }


def build_slide_up(node_id: str, start_us: int, duration_us: int,
                   from_y: int = 80, to_y: int = 0) -> dict:
    """Create a slide-up animation."""
    return {
        'node_id': node_id,
        'property': 'y',
        'keyframes': [
            {'time_us': start_us, 'value': float(from_y), 'easing': 'cubic_out'},
            {'time_us': start_us + duration_us, 'value': float(to_y), 'easing': 'ease_out'},
        ]
    }


def build_pop(node_id: str, start_us: int, duration_us: int) -> dict:
    """Create a pop animation (scale from 0 to 1.1 to 1.0)."""
    return {
        'node_id': node_id,
        'property': 'scale',
        'keyframes': [
            {'time_us': start_us, 'value': 0.0, 'easing': 'cubic_out'},
            {'time_us': start_us + int(duration_us * 0.7), 'value': 1.1, 'easing': 'ease_out'},
            {'time_us': start_us + duration_us, 'value': 1.0, 'easing': 'spring'},
        ]
    }


def build_slide_left(node_id: str, start_us: int, duration_us: int,
                     from_x: int = -80, to_x: int = 0) -> dict:
    """Create a slide-in from left animation."""
    return {
        'node_id': node_id,
        'property': 'x',
        'keyframes': [
            {'time_us': start_us, 'value': float(from_x), 'easing': 'cubic_out'},
            {'time_us': start_us + duration_us, 'value': float(to_x), 'easing': 'ease_out'},
        ]
    }


def build_slide_right(node_id: str, start_us: int, duration_us: int,
                      from_x: int = 80, to_x: int = 0) -> dict:
    """Create a slide-in from right animation."""
    return {
        'node_id': node_id,
        'property': 'x',
        'keyframes': [
            {'time_us': start_us, 'value': float(from_x), 'easing': 'cubic_out'},
            {'time_us': start_us + duration_us, 'value': float(to_x), 'easing': 'ease_out'},
        ]
    }


def build_panel_enter(node_id: str, start_us: int, duration_us: int) -> dict:
    """Create a panel enter animation (fade + slight slide up)."""
    opacity_track = {
        'node_id': node_id,
        'property': 'opacity',
        'keyframes': [
            {'time_us': start_us, 'value': 0.0, 'easing': 'linear'},
            {'time_us': start_us + duration_us, 'value': 1.0, 'easing': 'ease_out'},
        ]
    }
    y_track = {
        'node_id': node_id,
        'property': 'y',
        'keyframes': [
            {'time_us': start_us, 'value': 12.0, 'easing': 'cubic_out'},
            {'time_us': start_us + duration_us, 'value': 0.0, 'easing': 'ease_out'},
        ]
    }
    return opacity_track, y_track


def build_panel_exit(node_id: str, start_us: int, duration_us: int) -> dict:
    """Create a panel exit animation (fade out + slight slide down)."""
    opacity_track = {
        'node_id': node_id,
        'property': 'opacity',
        'keyframes': [
            {'time_us': start_us, 'value': 1.0, 'easing': 'linear'},
            {'time_us': start_us + duration_us, 'value': 0.0, 'easing': 'ease_in'},
        ]
    }
    y_track = {
        'node_id': node_id,
        'property': 'y',
        'keyframes': [
            {'time_us': start_us, 'value': 0.0, 'easing': 'ease_in'},
            {'time_us': start_us + duration_us, 'value': 12.0, 'easing': 'ease_in'},
        ]
    }
    return opacity_track, y_track


def build_mask_wipe_left(node_id: str, start_us: int, duration_us: int) -> dict:
    """Create a mask wipe from left animation (for chapter titles)."""
    return {
        'node_id': node_id,
        'property': 'clip_x',
        'keyframes': [
            {'time_us': start_us, 'value': 0.0, 'easing': 'cubic_out'},
            {'time_us': start_us + duration_us, 'value': 1.0, 'easing': 'ease_out'},
        ]
    }


# Preset registry — v2 §7.6
PRESETS = {
    'fade_in': build_fade_in,
    'fade_out': build_fade_out,
    'slide_up': build_slide_up,
    'slide_left': build_slide_left,
    'slide_right': build_slide_right,
    'pop': build_pop,
    'panel_enter': build_panel_enter,
    'panel_exit': build_panel_exit,
    'mask_wipe_left': build_mask_wipe_left,
}
