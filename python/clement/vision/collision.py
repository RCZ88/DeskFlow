"""collision.py — Overlay collision detection against protected regions."""
from typing import List
from .contracts import BoundingBox, ProtectedRegion, DetectedObject, FaceRegion, TextRegion

# Strength defaults for different object types
STRENGTH_DEFAULTS = {
    'face': 0.95,
    'existing_text': 0.90,
    'product': 0.85,
    'screen_ui': 0.80,
    'person': 0.65,
    'logo': 0.55,
}

def build_protected_regions(
    faces: List[FaceRegion],
    text_regions: List[TextRegion],
    objects: List[DetectedObject],
) -> List[ProtectedRegion]:
    """Build protected regions from detected elements."""
    regions = []
    for face in faces:
        regions.append(ProtectedRegion(
            id=f'prot_{face.id}', start_sec=face.timestamp_sec,
            end_sec=face.end_timestamp_sec or (face.timestamp_sec + 5.0),
            label='face', box=face.box, strength=0.95, source='face_detection',
        ))
    for text in text_regions:
        regions.append(ProtectedRegion(
            id=f'prot_{text.id}', start_sec=text.timestamp_sec,
            end_sec=text.end_timestamp_sec or (text.timestamp_sec + 5.0),
            label='existing_text', box=text.box, strength=0.90, source=text.source,
        ))
    for obj in objects:
        if obj.label in STRENGTH_DEFAULTS and obj.properties.get('avoid_overlay', True):
            regions.append(ProtectedRegion(
                id=f'prot_{obj.id}', start_sec=obj.timestamp_sec,
                end_sec=obj.end_timestamp_sec or (obj.timestamp_sec + 5.0),
                label=obj.label, box=obj.box, strength=STRENGTH_DEFAULTS[obj.label],
                source=obj.source,
            ))
    return regions


def compute_overlap_area(a: BoundingBox, b: BoundingBox) -> float:
    """Compute overlap area between two normalized bounding boxes (0.0-1.0)."""
    x_overlap = max(0, min(a.x + a.w, b.x + b.w) - max(a.x, b.x))
    y_overlap = max(0, min(a.y + a.h, b.y + b.h) - max(a.y, b.y))
    return x_overlap * y_overlap


def check_overlay_collision(
    overlay_box: BoundingBox,
    overlay_start: float,
    overlay_end: float,
    protected_regions: List[ProtectedRegion],
) -> List[dict]:
    """Check if an overlay collides with any protected regions."""
    collisions = []
    for region in protected_regions:
        # Check time overlap
        time_overlap = max(0, min(overlay_end, region.end_sec) - max(overlay_start, region.start_sec))
        if time_overlap <= 0:
            continue
        # Check spatial overlap
        overlap_area = compute_overlap_area(overlay_box, region.box)
        if overlap_area > 0.005:  # 0.5% minimum
            severity = 'error' if region.strength > 0.8 else ('warning' if region.strength > 0.5 else 'info')
            collisions.append({
                'region_id': region.id,
                'label': region.label,
                'timestamp_sec': region.start_sec,
                'overlap_area': round(overlap_area, 4),
                'severity': severity,
            })
    return collisions
