"""StyleProfile — brand tokens + safe zones (v2 §2.6)."""
from pydantic import BaseModel, Field
from typing import Dict, List, Optional

class TextStyle(BaseModel):
    family: str = 'Anton'
    size: int = 48
    min_size: Optional[int] = None
    max_chars_per_line: int = 12
    max_lines: int = 3
    line_height: float = 1.0
    weight: str = 'bold'
    color: str = '#FFFFFF'
    stroke_color: str = '#000000'
    stroke_width: int = 3

class SafeZone(BaseModel):
    x: int
    y: int
    w: int
    h: int
    mode: str = 'forbidden'  # forbidden | discouraged | reserved | preferred
    weight: float = 1.0
    applies_to: List[str] = Field(default_factory=lambda: ['*'])

class ColorPalette(BaseModel):
    background: str = '#0D1117'
    background_90: str = '#0D1117E6'
    surface_1: str = '#161B22'
    surface_2: str = '#21262D'
    stroke: str = '#000000'
    stroke_width: int = 3
    grid: str = '#30363D'
    text_primary: str = '#FFFFFF'
    text_secondary: str = '#C9D1D9'
    text_muted: str = '#8B949E'
    hook: str = '#FACC15'
    caption: str = '#22D3EE'
    keyword: str = '#FACC15'
    bullet: str = '#22D3EE'
    positive: str = '#34D399'
    negative: str = '#FB7185'
    info: str = '#60A5FA'
    warning: str = '#F59E0B'
    error: str = '#EF4444'
    # Legacy v1 aliases (kept for backward compat)
    body: str = '#FFFFFF'
    muted: str = '#94A3B8'

class ModeConfig(BaseModel):
    hook: TextStyle = TextStyle(family='Anton', size=64, max_chars_per_line=8, max_lines=2)
    body: TextStyle = TextStyle(family='LeagueSpartan', size=48)
    caption: TextStyle = TextStyle(family='Montserrat', size=40)
    keyword: TextStyle = TextStyle(family='Montserrat', size=44, color='#22D3EE')
    chapter: TextStyle = TextStyle(family='LeagueSpartan', size=48, weight='bold')
    mono: TextStyle = TextStyle(family='JetBrainsMono', size=34, weight='bold')

class StyleProfile(BaseModel):
    id: str = 'clement_dark_tech_v2'
    modes: Dict[str, ModeConfig] = Field(default_factory=lambda: {'card': ModeConfig(), 'scene': ModeConfig(
        hook=TextStyle(family='Anton', size=96, min_size=68, max_chars_per_line=10, max_lines=3, line_height=0.94),
        body=TextStyle(family='LeagueSpartan', size=58, min_size=42),
        caption=TextStyle(family='Montserrat', size=46, min_size=38),
        keyword=TextStyle(family='Montserrat', size=60, min_size=44, color='#22D3EE'),
        chapter=TextStyle(family='LeagueSpartan', size=74, min_size=56, weight='bold', max_chars_per_line=12, max_lines=2),
        mono=TextStyle(family='JetBrainsMono', size=34, min_size=26, weight='600', max_chars_per_line=20, max_lines=6, line_height=1.28, color='#22D3EE'),
    )})
    colors: ColorPalette = ColorPalette()
    safe_zones: List[SafeZone] = Field(default_factory=lambda: [
        SafeZone(x=40, y=40, w=1000, h=1280, mode='preferred', applies_to=['*']),
        SafeZone(x=760, y=1120, w=320, h=400, mode='discouraged', weight=8, applies_to=['panel', 'graph', 'screenshot', 'recording']),
        SafeZone(x=80, y=1420, w=920, h=300, mode='reserved', weight=0, applies_to=['caption']),
        SafeZone(x=930, y=250, w=150, h=1370, mode='forbidden', weight=1000000, applies_to=['*']),
    ])
    canvas_width: int = 1080
    canvas_height: int = 1920
    stroke_width: int = 3

    def get_mode(self, mode: str = 'card') -> ModeConfig:
        return self.modes.get(mode, self.modes['card'])
