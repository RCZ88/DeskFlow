"""Heuristic shot boundary detection from frame fingerprints.

No ffmpeg, no OpenCV required. Uses PIL + basic math.
"""
from __future__ import annotations
import uuid
from .contracts import ShotBoundary, ShotMap, FrameManifest


def _histogram_similarity(img_a_path: str, img_b_path: str) -> float:
    """Compare two images via color histogram correlation (0..1). Returns 1=similar."""
    try:
        from PIL import Image
        import math

        def _hist(path: str) -> list[float]:
            img = Image.open(path).convert("RGB").resize((32, 32))
            pixels = list(img.getdata())
            r = [p[0] / 255.0 for p in pixels]
            g = [p[1] / 255.0 for p in pixels]
            b = [p[2] / 255.0 for p in pixels]
            # Simple color moments
            return [
                sum(r) / len(r), sum(g) / len(g), sum(b) / len(b),
                sum(x**2 for x in r) / len(r), sum(x**2 for x in g) / len(g), sum(x**2 for x in b) / len(b),
            ]

        h_a = _hist(img_a_path)
        h_b = _hist(img_b_path)
        dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(h_a, h_b)))
        # Normalize: dist of ~1.0 means very different, 0 means identical
        return max(0.0, 1.0 - min(dist, 1.0))
    except Exception:
        return 0.5  # Unknown similarity


def detect_shots(
    manifest: FrameManifest,
    threshold: float = 0.35,
    min_shot_sec: float = 1.0,
) -> ShotMap:
    """Detect shot boundaries from a frame manifest using histogram deltas.

    Args:
        manifest: Frame manifest with paths.
        threshold: Similarity below this triggers a boundary (lower = more sensitive).
        min_shot_sec: Minimum shot duration in seconds.

    Returns:
        ShotMap with detected boundaries.
    """
    shots: list[ShotBoundary] = []
    frames = sorted(manifest.frames, key=lambda f: f.timestamp_sec)

    if len(frames) < 2:
        if frames:
            shots.append(ShotBoundary(
                id=f"shot_{uuid.uuid4().hex[:6]}",
                start_sec=frames[0].timestamp_sec,
                end_sec=frames[0].timestamp_sec + 5.0,
                confidence=0.3,
                reason="single_frame",
                source="heuristic",
            ))
        return ShotMap(
            video_id=manifest.video_id,
            duration_sec=frames[-1].timestamp_sec if frames else 0,
            shots=shots,
            source="heuristic",
            warnings=["Only one frame available — shot detection is approximate."],
        )

    # Walk consecutive frames
    boundary_times: list[float] = [frames[0].timestamp_sec]
    for i in range(1, len(frames)):
        sim = _histogram_similarity(frames[i - 1].path, frames[i].path)
        if sim < threshold:
            boundary_times.append(frames[i].timestamp_sec)

    boundary_times.append(frames[-1].timestamp_sec)

    # Build shots from boundaries
    for i in range(len(boundary_times) - 1):
        start = boundary_times[i]
        end = boundary_times[i + 1]
        if end - start < min_shot_sec and i < len(boundary_times) - 2:
            continue  # Skip tiny shots (merge with next)
        shots.append(ShotBoundary(
            id=f"shot_{i:04d}",
            start_sec=start,
            end_sec=end,
            confidence=0.6,
            reason="visual_delta",
            source="heuristic",
        ))

    total = sum(s.end_sec - s.start_sec for s in shots)
    avg = total / len(shots) if shots else 0
    rate = (len(shots) / (total / 60)) if total > 0 else 0

    return ShotMap(
        video_id=manifest.video_id,
        duration_sec=frames[-1].timestamp_sec,
        shots=shots,
        avg_shot_duration_sec=round(avg, 2),
        cut_rate_per_min=round(rate, 1),
        source="heuristic",
        warnings=["Heuristic shot detection is approximate without ffmpeg/OpenCV."] if not shots else [],
    )
