"""AnimationTimeline — keyframe tracks (v2 §2.5)."""
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from .common import TimeRange

class Easing(str, Enum):
    linear = 'linear'
    ease_in = 'ease_in'
    ease_out = 'ease_out'
    ease_in_out = 'ease_in_out'
    cubic_in = 'cubic_in'
    cubic_out = 'cubic_out'
    cubic_in_out = 'cubic_in_out'
    spring = 'spring'
    standard_enter = 'standard_enter'  # [0.22,1,0.36,1]
    standard_exit = 'standard_exit'    # [0.64,0,0.78,0]
    overshoot_soft = 'overshoot_soft'  # [0.34,1.36,0.64,1]
    sharp_reveal = 'sharp_reveal'      # [0.16,1,0.3,1]

class Keyframe(BaseModel):
    time_us: int = Field(ge=0)
    value: float
    easing: Easing = Easing.linear
    step_start: bool = False  # discrete property switches at ending keyframe

class Stagger(BaseModel):
    each: int = Field(default=50_000, ge=0, description='Microseconds between child starts')
    order: str = 'forward'  # forward | reverse | random
    seed: Optional[int] = None  # for random order determinism

class TrackClip(BaseModel):
    mode: str = 'both'  # both | before | after
    id: Optional[str] = None

class Track(BaseModel):
    node_id: str
    property: str  # e.g. 'opacity', 'x', 'y', 'scale', 'rotate'
    keyframes: List[Keyframe]
    stagger: Optional[Stagger] = None  # v2 §7.8 word/character stagger
    clip: Optional[TrackClip] = None
    fill_mode: str = 'both'  # both | before | after — what happens outside keyframe range

class AnimationTimeline(BaseModel):
    tracks: List[Track]
    duration_us: int = Field(ge=0)
    fps: int = 30

    def evaluate(self, node_id: str, prop: str, time_us: int) -> Optional[float]:
        """Evaluate a track at a specific time. Returns None if no track found."""
        for track in self.tracks:
            if track.node_id == node_id and track.property == prop:
                kfs = sorted(track.keyframes, key=lambda k: k.time_us)
                if not kfs:
                    return None
                if time_us <= kfs[0].time_us:
                    return kfs[0].value if track.fill_mode != 'after' else None
                if time_us >= kfs[-1].time_us:
                    return kfs[-1].value if track.fill_mode != 'before' else None
                for i in range(len(kfs) - 1):
                    if kfs[i].time_us <= time_us < kfs[i + 1].time_us:
                        if kfs[i + 1].step_start:
                            return kfs[i].value  # discrete: hold previous until next starts
                        t = (time_us - kfs[i].time_us) / (kfs[i + 1].time_us - kfs[i].time_us)
                        return kfs[i].value + t * (kfs[i + 1].value - kfs[i].value)
        return None
