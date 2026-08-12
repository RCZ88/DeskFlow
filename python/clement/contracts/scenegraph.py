"""SceneGraph — visual layout tree (v2 §2.3)."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from .common import TimeRange

class LayerType(str, Enum):
    text = 'text'
    panel = 'panel'
    shape = 'shape'
    vector = 'vector'
    image = 'image'
    video = 'video'

class Position(BaseModel):
    x: int = 0
    y: int = 0

class Size(BaseModel):
    w: int = 0
    h: int = 0

class ResolvedLine(BaseModel):
    text: str
    x: int
    y: int
    width: int
    height: int
    baseline: int = 0  # v2 §8.5 baseline offset
    font_family: str
    font_size: int
    font_weight: str = 'normal'
    grapheme_ranges: List[Dict[str, Any]] = Field(default_factory=list)  # v2 §8.5 per-grapheme ranges

class SceneNode(BaseModel):
    id: str
    layer_type: LayerType
    timing: TimeRange
    position: Position = Position()
    size: Size = Size()
    z_index: int = 0
    opacity: float = 1.0
    text: Optional[str] = None
    resolved_lines: List[ResolvedLine] = Field(default_factory=list)
    svg_content: Optional[str] = None
    children: List['SceneNode'] = Field(default_factory=list)
    clip_path: Optional[str] = None  # v2 §2.4 SVG clip path
    mask_id: Optional[str] = None  # v2 §2.4 mask reference
    asset_id: Optional[str] = None  # v2 §2.4 external asset reference
    meta: Dict[str, Any] = Field(default_factory=dict)

class SceneGraph(BaseModel):
    scene_id: str
    timing: TimeRange
    layers: List[SceneNode]
    canvas_width: int = 1080
    canvas_height: int = 1920
