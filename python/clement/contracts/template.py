"""TemplateDefinition — visual template registry entry (v2 §2.5)."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from .common import TimeRange

class TemplateProps(BaseModel):
    text: Optional[str] = None
    emphasis_words: List[str] = Field(default_factory=list)
    source: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    meta: Dict[str, Any] = Field(default_factory=dict)

class TemplateDefinition(BaseModel):
    id: str
    version: str = '1.0.0'
    renderer: str = 'card'
    label: str = ''
    description: str = ''
    limits: Dict[str, Any] = Field(default_factory=dict)
    fallback_chain: List[str] = Field(default_factory=list)
    z_index_band: int = 80
    supports_animation: bool = True
    capability_weights: Dict[str, float] = Field(default_factory=dict)
