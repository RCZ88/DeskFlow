"""Vision contracts — Pydantic models for visual analysis pipeline."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class BoundingBox(BaseModel):
    x: float  # 0.0-1.0 normalized
    y: float
    w: float
    h: float

class FrameSampleRequest(BaseModel):
    frame_id: str
    timestamp_sec: float
    reason: str
    priority: int = 1

class FrameSamplePlan(BaseModel):
    video_id: str
    plan_id: str
    mode: str  # fingerprint | evidence | localization | full
    target_width: int = 640
    target_height: int = 360
    jpeg_quality: int = 75
    frames: List[FrameSampleRequest]

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
    frames: List[FrameManifestItem]

class FrameSignature(BaseModel):
    frame_id: str
    timestamp_sec: float
    avg_brightness: float
    rgb_histogram: List[float]  # 32 bins
    color_moments: Dict[str, float]  # mean_r, mean_g, mean_b, std_r, std_g, std_b
    edge_density: float = 0.0

class DetectedObject(BaseModel):
    id: str
    frame_id: Optional[str] = None
    timestamp_sec: float
    end_timestamp_sec: Optional[float] = None
    label: str  # face, person, product, laptop, screen, text, logo, other
    confidence: float
    box: BoundingBox
    mask_path: Optional[str] = None
    source: str  # manual | vlm | sam3
    properties: Dict[str, bool] = Field(default_factory=lambda: {'avoid_overlay': True})

class FaceRegion(BaseModel):
    id: str
    frame_id: Optional[str] = None
    timestamp_sec: float
    end_timestamp_sec: Optional[float] = None
    box: BoundingBox
    confidence: float
    source: str

class TextRegion(BaseModel):
    id: str
    frame_id: Optional[str] = None
    timestamp_sec: float
    end_timestamp_sec: Optional[float] = None
    box: BoundingBox
    text: Optional[str] = None
    kind: str  # title | subtitle | slide | ui | label | unknown
    confidence: float
    source: str

class VisualDigest(BaseModel):
    gist: str = ''
    summary: str = ''
    keywords: List[str] = []
    topics: List[str] = []
    entities: List[str] = []
    setting: Optional[str] = None
    actions: List[str] = []
    objects_visible: List[str] = []
    text_on_screen: List[str] = []
    visual_complexity: str = 'medium'  # low | medium | high
    motion_level: str = 'low'  # low | medium | high
    color_palette: List[str] = []
    confidence: float = 0.0
    source: str = 'heuristic'

class ShotBoundary(BaseModel):
    id: str
    start_sec: float
    end_sec: float
    confidence: float
    reason: str
    source: str
    prev_frame_id: Optional[str] = None
    next_frame_id: Optional[str] = None

class ShotMap(BaseModel):
    video_id: str
    duration_sec: float
    shots: List[ShotBoundary]
    avg_shot_duration_sec: float
    cut_rate_per_min: float
    source: str
    warnings: List[str] = []

class StyleProfile(BaseModel):
    id: str
    name: str
    source_video_id: Optional[str] = None
    pacing: str = 'medium'
    avg_shot_duration_sec: Optional[float] = None
    cut_rate_per_min: Optional[float] = None
    motion_level: str = 'medium'
    visual_complexity: str = 'medium'
    color_palette: List[str] = []
    text_density: str = 'low'
    caption_style: Optional[str] = None
    hook_style: Optional[str] = None
    overlay_density: Optional[str] = None
    preferred_overlay_types: List[str] = []
    source: str = 'heuristic'
    confidence: float = 0.0

class ProtectedRegion(BaseModel):
    id: str
    start_sec: float
    end_sec: float
    label: str
    box: BoundingBox
    strength: float = 0.5
    source: str = 'manual'

class VisualAnalysis(BaseModel):
    video_id: str
    status: str  # pending | capturing | analyzing | partial | ready | failed | unavailable
    providers: List[str] = []
    frame_manifest_path: Optional[str] = None
    digest: Optional[VisualDigest] = None
    shots: List[ShotBoundary] = []
    objects: List[DetectedObject] = []
    text_regions: List[TextRegion] = []
    faces: List[FaceRegion] = []
    style: Optional[StyleProfile] = None
    warnings: List[str] = []
