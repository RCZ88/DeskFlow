"""shot_detect.py — Heuristic shot boundary detection from frame signatures."""
from typing import List
from .contracts import ShotBoundary, ShotMap
from .fingerprints import compute_delta

BOUNDARY_THRESHOLD = 0.15
MIN_SHOT_DURATION = 0.5

def detect_shots(
    video_id: str,
    duration_sec: float,
    signatures: list,
    source: str = 'heuristic',
) -> ShotMap:
    """Detect shot boundaries from frame signatures using delta thresholds."""
    shots: List[ShotBoundary] = []
    if len(signatures) < 2:
        shots.append(ShotBoundary(
            id='shot_001', start_sec=0.0, end_sec=duration_sec,
            confidence=1.0, reason='single_shot', source='heuristic',
            prev_frame_id=signatures[0].frame_id if signatures else None,
        ))
        return ShotMap(
            video_id=video_id, duration_sec=duration_sec, shots=shots,
            avg_shot_duration_sec=duration_sec, cut_rate_per_min=0.0,
            source=source, warnings=['Only one frame available — single shot assumed']
        )

    # Find boundaries where delta exceeds threshold
    boundaries = [0.0]
    for i in range(1, len(signatures)):
        delta = compute_delta(signatures[i - 1], signatures[i])
        if delta > BOUNDARY_THRESHOLD:
            boundaries.append(signatures[i].timestamp_sec)

    boundaries.append(duration_sec)

    # Create shots from boundaries
    for i in range(len(boundaries) - 1):
        start = boundaries[i]
        end = boundaries[i + 1]
        if end - start < MIN_SHOT_DURATION:
            continue  # Merge tiny shots
        sig_idx = min(i, len(signatures) - 1)
        shots.append(ShotBoundary(
            id=f'shot_{i + 1:03d}',
            start_sec=round(start, 3),
            end_sec=round(end, 3),
            confidence=0.7,
            reason='visual_delta',
            source=source,
            prev_frame_id=signatures[sig_idx].frame_id if sig_idx < len(signatures) else None,
            next_frame_id=signatures[sig_idx + 1].frame_id if sig_idx + 1 < len(signatures) else None,
        ))

    # If no boundaries found, use transcript segments as fallback
    if len(shots) <= 1:
        shots = [ShotBoundary(
            id='shot_fallback', start_sec=0.0, end_sec=duration_sec,
            confidence=0.3, reason='transcript_fallback', source='transcript',
        )]

    total_cut_sec = sum(s.end_sec - s.start_sec for s in shots[:-1]) if len(shots) > 1 else 0
    cut_rate = (len(shots) - 1) / max(duration_sec / 60, 0.01)

    return ShotMap(
        video_id=video_id, duration_sec=duration_sec, shots=shots,
        avg_shot_duration_sec=round(duration_sec / max(len(shots), 1), 2),
        cut_rate_per_min=round(cut_rate, 2),
        source=source,
        warnings=['Shot detection is heuristic — frame sampling density affects accuracy'] if source == 'heuristic' else [],
    )
