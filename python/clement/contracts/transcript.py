"""TranscriptInput — normalized transcript contract (v2 §2.1)."""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from .common import TimeRange, seconds_to_us

class WordTiming(BaseModel):
    word: str
    start_us: int = Field(ge=0)
    end_us: int = Field(ge=0)

class TranscriptSegment(BaseModel):
    id: int = Field(ge=0)
    text: str
    timing: TimeRange
    words: List[WordTiming] = Field(default_factory=list)

    @classmethod
    def from_v1(cls, seg_id: int, text: str, start_s: float, end_s: float,
                words: list | None = None) -> 'TranscriptSegment':
        return cls(
            id=seg_id,
            text=text,
            timing=TimeRange(start_us=seconds_to_us(start_s), end_us=seconds_to_us(end_s)),
            words=[WordTiming(
                word=w['word'],
                start_us=seconds_to_us(w['start']),
                end_us=seconds_to_us(w['end']),
            ) for w in (words or [])]
        )

class TranscriptInput(BaseModel):
    video_id: str
    duration_us: int = Field(ge=0)
    segments: List[TranscriptSegment]
    source_format: str = 'json'

    @classmethod
    def from_v1_dict(cls, data: dict) -> 'TranscriptInput':
        segments = []
        for s in data.get('segments', []):
            words = s.get('words', [])
            segments.append(TranscriptSegment.from_v1(
                seg_id=s['id'], text=s['text'],
                start_s=s['start'], end_s=s['end'], words=words
            ))
        return cls(
            video_id=data.get('video_id', 'unknown'),
            duration_us=seconds_to_us(data.get('duration', 0)),
            segments=segments,
        )
