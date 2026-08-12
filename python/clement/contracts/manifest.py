"""RenderManifest — output tracking (v2 §2.8)."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class RendererInfo(BaseModel):
    name: str = 'pil'
    version: str = '1.0.0'
    platform: str = 'python'

class RenderedAsset(BaseModel):
    path: str
    width: int
    height: int
    format: str = 'png'
    sha256: Optional[str] = None
    frame_count: int = 1
    alpha: bool = False  # True if asset has alpha channel
    static: bool = False  # True = single frame for entire duration

class RenderManifest(BaseModel):
    version: str = '2.0'
    video_id: str
    source_hash: Optional[str] = None  # SHA256 of input transcript/scene graph
    total_frames: int = 0
    fps: int = 30
    renderer: RendererInfo = RendererInfo()
    assets: List[RenderedAsset] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    profile_id: str = 'clement_dark_tech_v2'
    render_hash: Optional[str] = None  # SHA256 of deterministic output
