"""Common types shared across all contracts."""
from pydantic import BaseModel, Field
from typing import Optional, List
import re

ID_PATTERN = re.compile(r'^[a-z][a-z0-9_-]{1,63}$')

def validate_id(v: str) -> str:
    if not ID_PATTERN.match(v):
        raise ValueError(f'Invalid ID: {v!r} — must match ^[a-z][a-z0-9_-]{{1,63}}$')
    return v

class TimeRange(BaseModel):
    start_us: int = Field(ge=0, description='Start time in microseconds')
    end_us: int = Field(ge=0, description='End time in microseconds')

    def duration_us(self) -> int:
        return self.end_us - self.start_us

    def duration_s(self) -> float:
        return self.duration_us / 1_000_000

def seconds_to_us(s: float) -> int:
    return int(s * 1_000_000)

def us_to_seconds(us: int) -> float:
    return us / 1_000_000
