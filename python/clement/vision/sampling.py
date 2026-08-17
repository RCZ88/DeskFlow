"""Frame sampling plan builder — no ffmpeg required.

Uses video duration + transcript segments to build a sampling plan
for each tier: fingerprint, evidence, localization.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from .contracts import FrameSamplePlan, FrameSampleRequest


def _tier_params(mode: str, duration_sec: float) -> tuple[int, int, int, int, float]:
    """Return (max_frames, width, height, jpeg_quality, interval_sec) for a tier."""
    if mode == "fingerprint":
        if duration_sec < 60:
            interval = 1.0
        elif duration_sec < 600:
            interval = 2.0
        else:
            interval = 5.0
        return 300, 160, 90, 60, interval
    elif mode == "evidence":
        return 24, 640, 360, 75, 5.0
    elif mode == "localization":
        return 16, 1080, 1920, 85, 10.0
    return 12, 320, 180, 70, 5.0


def build_sample_plan(
    video_id: str,
    mode: str,
    duration_sec: float,
    segments: list[dict] | None = None,
) -> FrameSamplePlan:
    """Build a frame sampling plan for a given video."""
    max_frames, width, height, quality, interval = _tier_params(mode, duration_sec)

    frames: list[FrameSampleRequest] = []

    # First frame always
    frames.append(FrameSampleRequest(
        frame_id=f"f_{0:05d}",
        timestamp_sec=0.0,
        reason="first_frame",
        priority=1,
    ))

    # Transcript segment starts
    if segments:
        for seg in segments:
            ts = float(seg.get("start", 0))
            fid = seg.get("id", len(frames))
            frames.append(FrameSampleRequest(
                frame_id=f"f_{fid:05d}",
                timestamp_sec=ts,
                reason="transcript_segment_start",
                priority=2,
            ))

    # Fill remaining with uniform distribution
    if duration_sec > 0:
        t = 0.0
        while t < duration_sec and len(frames) < max_frames:
            already = any(abs(f.timestamp_sec - t) < 0.5 for f in frames)
            if not already:
                frames.append(FrameSampleRequest(
                    frame_id=f"f_{len(frames):05d}",
                    timestamp_sec=round(t, 2),
                    reason="uniform_sample",
                    priority=3,
                ))
            t += interval

    # Last frame
    if duration_sec > 0:
        already = any(abs(f.timestamp_sec - duration_sec) < 1.0 for f in frames)
        if not already:
            frames.append(FrameSampleRequest(
                frame_id=f"f_{len(frames):05d}",
                timestamp_sec=round(duration_sec, 2),
                reason="last_frame",
                priority=1,
            ))

    return FrameSamplePlan(
        video_id=video_id,
        plan_id=f"plan_{uuid.uuid4().hex[:8]}",
        created_at=datetime.now(timezone.utc).isoformat(),
        mode=mode,
        target_width=width,
        target_height=height,
        jpeg_quality=quality,
        frames=frames[:max_frames],
    )
