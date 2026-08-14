"""sampling.py — Frame sampling plan builder."""
from typing import List
from .contracts import FrameSamplePlan, FrameSampleRequest

def build_frame_plan(
    video_id: str,
    duration_sec: float,
    segment_starts: List[float],
    mode: str = 'evidence',
) -> FrameSamplePlan:
    """Build a frame sampling plan based on duration and transcript segments."""
    plan_id = f'{video_id}_plan_{mode}'
    frames: List[FrameSampleRequest] = []

    if mode == 'fingerprint':
        # Tier 1: dense sampling for shot detection
        interval = 1.0 if duration_sec < 60 else (2.0 if duration_sec < 600 else 5.0)
        max_frames = 120
        t = 0.0
        while t < duration_sec and len(frames) < max_frames:
            frames.append(FrameSampleRequest(
                frame_id=f'fp_{len(frames):05d}', timestamp_sec=round(t, 3),
                reason='fingerprint', priority=1
            ))
            t += interval
        return FrameSamplePlan(
            video_id=video_id, plan_id=plan_id, mode='fingerprint',
            target_width=160, target_height=90, jpeg_quality=60, frames=frames
        )

    if mode == 'evidence':
        # Tier 2: evidence frames for visual analysis
        max_frames = 24
        # Always include first and last frame
        frames.append(FrameSampleRequest(frame_id='ev_00000', timestamp_sec=0.0, reason='first_frame', priority=1))
        if duration_sec > 5:
            frames.append(FrameSampleRequest(frame_id=f'ev_last', timestamp_sec=round(duration_sec - 0.5, 3), reason='last_frame', priority=1))
        # Add transcript segment starts
        for i, start in enumerate(segment_starts[:max_frames - 2]):
            frames.append(FrameSampleRequest(
                frame_id=f'ev_seg{i:03d}', timestamp_sec=start,
                reason='transcript_segment_start', priority=2
            ))
        # Uniform distribution to fill remaining budget
        if len(frames) < max_frames:
            step = duration_sec / max_frames
            for i in range(len(frames), max_frames):
                t = i * step
                frames.append(FrameSampleRequest(
                    frame_id=f'ev_uni{i:03d}', timestamp_sec=round(t, 3),
                    reason='uniform', priority=3
                ))
        frames.sort(key=lambda f: f.timestamp_sec)
        return FrameSamplePlan(
            video_id=video_id, plan_id=plan_id, mode='evidence',
            target_width=640, target_height=360, jpeg_quality=75, frames=frames[:max_frames]
        )

    # Default: localization pass
    max_frames = 12
    for i, start in enumerate(segment_starts[:max_frames]):
        frames.append(FrameSampleRequest(
            frame_id=f'loc_seg{i:03d}', timestamp_sec=start,
            reason='high_importance_segment', priority=1
        ))
    return FrameSamplePlan(
        video_id=video_id, plan_id=plan_id, mode='localization',
        target_width=1080, target_height=1920, jpeg_quality=85, frames=frames
    )
