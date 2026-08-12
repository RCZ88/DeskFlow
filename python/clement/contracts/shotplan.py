"""ShotPlan — AI-generated cut decisions (v2 §2.2)."""
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from .common import TimeRange, seconds_to_us

class ShotRole(str, Enum):
    hook = 'hook'
    core = 'core'
    detail = 'detail'
    cta = 'cta'

class ShotDecision(str, Enum):
    keep = 'keep'
    cut = 'cut'

class Shot(BaseModel):
    segment_id: int = Field(ge=0)
    timing: TimeRange
    decision: ShotDecision
    intent: Optional[str] = None  # v2 §3.2 intent name
    role: Optional[ShotRole] = None
    reason: str = ''
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    approved: bool = False
    source_quote: Optional[str] = None
    visual_metaphor: Optional[str] = None

class ShotPlan(BaseModel):
    video_id: str
    source_duration_us: int = Field(ge=0)
    target_duration_us: int = Field(ge=0)
    shots: List[Shot]

    def kept_shots(self) -> List[Shot]:
        return [s for s in self.shots if s.decision == ShotDecision.keep]

    def kept_duration_us(self) -> int:
        return sum(s.timing.duration_us() for s in self.kept_shots())

    def is_in_target_range(self) -> bool:
        d = self.kept_duration_us()
        return 90_000_000 <= d <= 180_000_000  # 90-180s in µs

    @classmethod
    def from_v1_dict(cls, data: dict) -> 'ShotPlan':
        shots = []
        for k in data.get('kept', []):
            shots.append(Shot(
                segment_id=k['segment_id'],
                timing=TimeRange(start_us=seconds_to_us(k['start']), end_us=seconds_to_us(k['end'])),
                decision=ShotDecision.keep,
                role=ShotRole(k.get('role', 'core')),
                reason=k.get('reason', ''),
                confidence=0.8,
            ))
        for c in data.get('cut', []):
            shots.append(Shot(
                segment_id=c['segment_id'],
                timing=TimeRange(start_us=0, end_us=0),
                decision=ShotDecision.cut,
                reason=c.get('reason', ''),
            ))
        return cls(
            video_id=data.get('video_id', 'unknown'),
            source_duration_us=seconds_to_us(data.get('source_duration', 0)),
            target_duration_us=seconds_to_us(data.get('target_duration', 0)),
            shots=shots,
        )
