"""Overlay collision detection against protected visual regions."""
from __future__ import annotations
import uuid
from .contracts import BoundingBox, ProtectedRegion, Collision, OverlayCollisionReport


def _overlap_area(a: BoundingBox, b: BoundingBox) -> float:
    """Compute overlap area between two normalized bounding boxes (0..1)."""
    x_overlap = max(0, min(a.x + a.w, b.x + b.w) - max(a.x, b.x))
    y_overlap = max(0, min(a.y + a.h, b.y + b.h) - max(a.y, b.y))
    return x_overlap * y_overlap


def check_collision(
    overlay_id: str,
    overlay_box: BoundingBox,
    overlay_start: float,
    overlay_end: float,
    protected: list[ProtectedRegion],
) -> OverlayCollisionReport:
    """Check if an overlay collides with any protected region."""
    collisions: list[Collision] = []

    for region in protected:
        # Time overlap check
        time_overlap = max(0, min(overlay_end, region.end_sec) - max(overlay_start, region.start_sec))
        if time_overlap <= 0:
            continue

        area = _overlap_area(overlay_box, region.box)
        if area > 0.01:  # >1% overlap
            severity = "info"
            if area > 0.3 and region.strength > 0.8:
                severity = "error"
            elif area > 0.1 and region.strength > 0.6:
                severity = "warning"

            collisions.append(Collision(
                region_id=region.id,
                label=region.label,
                timestamp_sec=overlay_start,
                overlap_area=round(area, 4),
                severity=severity,
            ))

    safe = len([c for c in collisions if c.severity in ("warning", "error")]) == 0
    score = 1.0 - sum(c.overlap_area * (1.0 if c.severity == "info" else 2.0) for c in collisions)
    score = max(0.0, min(1.0, score))

    return OverlayCollisionReport(
        overlay_id=overlay_id,
        collisions=collisions,
        safe=safe,
        score=round(score, 3),
    )


def build_protected_from_objects(objects: list[dict], default_strength: float = 0.85) -> list[ProtectedRegion]:
    """Convert detected objects into protected regions."""
    STRENGTH_MAP = {
        "face": 0.95,
        "person": 0.65,
        "hand": 0.60,
        "product": 0.85,
        "laptop": 0.80,
        "screen": 0.80,
        "whiteboard": 0.75,
        "text": 0.90,
        "logo": 0.55,
        "ui": 0.80,
    }
    regions = []
    for obj in objects:
        label = obj.get("label", "other")
        regions.append(ProtectedRegion(
            id=obj.get("id", f"prot_{uuid.uuid4().hex[:6]}"),
            start_sec=obj.get("timestamp_sec", 0),
            end_sec=obj.get("end_timestamp_sec") or obj.get("timestamp_sec", 0) + 3.0,
            label=label,
            box=BoundingBox(**obj.get("box", {"x": 0, "y": 0, "w": 0.1, "h": 0.1})),
            strength=STRENGTH_MAP.get(label, default_strength),
            source=obj.get("source", "manual"),
        ))
    return regions
