"""Pydantic contracts for the Visual Analysis Engine."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional


class BoundingBox(BaseModel):
    x: float = Field(ge=0.0, le=1.0)
    y: float = Field(ge=0.0, le=1.0)
    w: float = Field(ge=0.0, le=1.0)
    h: float = Field(ge=0.0, le=1.0)


class FrameSampleRequest(BaseModel):
    frame_id: str
    timestamp_sec: float
    reason: str
    priority: int = 1


class FrameSamplePlan(BaseModel):
    video_id: str
    plan_id: str
    created_at: str
    mode: str  # fingerprint | evidence | localization
    target_width: int
    target_height: int
    jpeg_quality: int
    frames: list[FrameSampleRequest]


class FrameManifestItem(BaseModel):
    frame_id: str
    timestamp_sec: float
    path: str
    width: int
    height: int
    reason: str


class FrameManifest(BaseModel):
    video_id: str
    plan_id: str
    frame_count: int
    frames: list[FrameManifestItem]


class VisualDigest(BaseModel):
    gist: str = ""
    summary: str = ""
    keywords: list[str] = []
    topics: list[str] = []
    entities: list[str] = []
    setting: str | None = None
    actions: list[str] = []
    objects_visible: list[str] = []
    text_on_screen: list[str] = []
    visual_complexity: str = "medium"  # low | medium | high
    motion_level: str = "low"  # low | medium | high
    color_palette: list[str] = []
    confidence: float = 0.0
    source: str = "manual"


class ShotBoundary(BaseModel):
    id: str
    start_sec: float
    end_sec: float
    confidence: float
    reason: str
    source: str
    prev_frame_id: str | None = None
    next_frame_id: str | None = None


class ShotMap(BaseModel):
    video_id: str
    duration_sec: float
    shots: list[ShotBoundary]
    avg_shot_duration_sec: float = 0.0
    cut_rate_per_min: float = 0.0
    source: str = "heuristic"
    warnings: list[str] = []


class DetectedObject(BaseModel):
    id: str
    frame_id: str | None = None
    timestamp_sec: float
    end_timestamp_sec: float | None = None
    label: str
    confidence: float
    box: BoundingBox
    mask_path: str | None = None
    source: str = "manual"
    properties: dict = {}


class TextRegion(BaseModel):
    id: str
    frame_id: str | None = None
    timestamp_sec: float
    end_timestamp_sec: float | None = None
    box: BoundingBox
    text: str | None = None
    kind: str = "unknown"  # title | subtitle | slide | ui | label | unknown
    confidence: float = 0.0
    source: str = "manual"


class FaceRegion(BaseModel):
    id: str
    frame_id: str | None = None
    timestamp_sec: float
    end_timestamp_sec: float | None = None
    box: BoundingBox
    confidence: float = 0.0
    source: str = "manual"


class StyleProfile(BaseModel):
    id: str
    name: str
    source_video_id: str | None = None
    source_path: str | None = None
    duration_sec: float | None = None
    pacing: str = "medium"  # slow | medium | fast
    avg_shot_duration_sec: float | None = None
    cut_rate_per_min: float | None = None
    shot_duration_histogram: dict = {}
    motion_level: str = "medium"
    visual_complexity: str = "medium"
    color_palette: list[str] = []
    brightness: float | None = None
    contrast: float | None = None
    text_density: str = "low"  # none | low | medium | high
    caption_style: str | None = None
    hook_style: str | None = None
    overlay_density: str | None = None
    preferred_overlay_types: list[str] = []
    notes: str | None = None
    source: str = "manual"
    confidence: float = 0.0


class ProtectedRegion(BaseModel):
    id: str
    start_sec: float
    end_sec: float
    label: str
    box: BoundingBox
    strength: float = Field(ge=0.0, le=1.0)
    source: str = "manual"


class Collision(BaseModel):
    region_id: str
    label: str
    timestamp_sec: float
    overlap_area: float
    severity: str = "info"  # info | warning | error


class OverlayCollisionReport(BaseModel):
    overlay_id: str
    collisions: list[Collision]
    safe: bool = True
    score: float = 1.0


class VisualAnalysis(BaseModel):
    video_id: str
    status: str = "pending"
    created_at: str
    providers: list[str] = []
    frame_manifest_path: str | None = None
    digest: VisualDigest | None = None
    shots: list[ShotBoundary] = []
    objects: list[DetectedObject] = []
    text_regions: list[TextRegion] = []
    faces: list[FaceRegion] = []
    style: StyleProfile | None = None
    warnings: list[str] = []


class SegmentVisualEvidence(BaseModel):
    segment_id: int
    frame_ids: list[str] = []
    shot_ids: list[str] = []
    objects: list[str] = []
    text_visible: list[str] = []
    faces_present: bool = False
    visual_summary: str | None = None
