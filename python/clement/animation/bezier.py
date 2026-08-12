"""bezier.py — Cubic bezier evaluation (v2 §7.4)."""
import math
from typing import List, Tuple

# Named easing curves — v2 §7.4 exact control points
EASINGS = {
    'linear':         ((0, 0), (1, 1)),
    'ease_in':        ((0.42, 0), (1, 1)),
    'ease_out':       ((0, 0), (0.58, 1)),
    'ease_in_out':    ((0.42, 0), (0.58, 1)),
    'cubic_in':       ((0.32, 0), (0.68, 0)),
    'cubic_out':      ((0.32, 1), (0.68, 1)),
    'cubic_in_out':   ((0.65, 0), (0.35, 1)),
    'spring':         ((0.175, 0.885), (0.32, 1.275)),
    # v2 §7.4 specific named curves
    'standard_enter': ((0.22, 1), (0.36, 1)),
    'standard_exit':  ((0.64, 0), (0.78, 0)),
    'overshoot_soft': ((0.34, 1.36), (0.64, 1)),
    'sharp_reveal':   ((0.16, 1), (0.3, 1)),
}

def cubic_bezier(t: float, p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """Evaluate cubic bezier curve at parameter t ∈ [0,1]."""
    # Newton-Raphson (8 iterations) with bisection fallback
    cx = 3 * p1[0]
    bx = 3 * (p2[0] - p1[0]) - cx
    ax = 1 - cx - bx
    cy = 3 * p1[1]
    by = 3 * (p2[1] - p1[1]) - cy
    ay = 1 - cy - by

    def solve_x(t):
        return ((ax * t + bx) * t + cx) * t

    def solve_y(t):
        return ((ay * t + by) * t + cy) * t

    # Newton-Raphson to find t given x
    x = t
    for _ in range(8):
        err = solve_x(x) - t
        if abs(err) < 1e-6:
            break
        dx = (3 * ax * x + 2 * bx) * x + cx
        if abs(dx) < 1e-6:
            break
        x -= err / dx

    # Bisection fallback
    if abs(solve_x(x) - t) > 1e-4:
        lo, hi = 0.0, 1.0
        x = t
        for _ in range(16):
            mid = (lo + hi) / 2
            if abs(solve_x(mid) - t) < 1e-6:
                x = mid
                break
            if solve_x(mid) < t:
                lo = mid
            else:
                hi = mid
            x = mid

    x = max(0.0, min(1.0, x))
    return solve_y(x)


def evaluate_easing(name: str, t: float) -> float:
    """Evaluate a named easing at t ∈ [0,1]."""
    if name not in EASINGS:
        name = 'linear'
    p1, p2 = EASINGS[name]
    return cubic_bezier(t, p1, p2)


def interpolate(a: float, b: float, t: float) -> float:
    """Linear interpolation between a and b at t."""
    return a + (b - a) * t


# Spring presets — v2 §7.6 (compiled to samples at project fps)
SPRING_PRESETS = {
    'spring_soft':     {'amplitude': 1.0, 'frequency': 120, 'damping': 18},
    'spring_pop':      {'amplitude': 0.8, 'frequency': 220, 'damping': 16},
    'spring_no_bounce':{'amplitude': 1.0, 'frequency': 170, 'damping': 28},
}

def spring_samples(amplitude: float = 1.0, frequency: float = 3.0, damping: float = 0.5,
                   duration_s: float = 0.5, fps: int = 30) -> List[float]:
    """Generate spring animation samples."""
    samples = []
    n_frames = int(duration_s * fps)
    for i in range(n_frames):
        t = i / max(n_frames - 1, 1)
        phase = t * frequency * 2 * math.pi
        decay = math.exp(-damping * t * 10)
        samples.append(1.0 + amplitude * math.sin(phase) * decay)
    return samples
