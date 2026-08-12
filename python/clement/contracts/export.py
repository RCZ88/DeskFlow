"""ExportBundle — final output package (v2 §2.8)."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ExportBundle(BaseModel):
    version: str = '2.0'
    video_id: str
    timeline_path: str = 'timeline.json'
    manifest_path: str = 'manifest.md'
    cards_dir: str = 'cards/'
    assets_dir: str = 'assets/'
    composite_path: Optional[str] = None
    alpha_path: Optional[str] = None
    capcut_dir: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
