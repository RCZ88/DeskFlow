"""static_pil.py — StyleProfile-driven card renderer (Phase 1.0 refactor)."""
from PIL import Image, ImageDraw, ImageFont
from typing import Optional, Dict, Any
import os

def render_card(text: str, card_type: str, style: 'StyleProfile',
                mode: str = 'card', emphasis_words: Optional[list] = None,
                width: int = 1080, height: int = 400) -> Image.Image:
    """Render a text card using StyleProfile tokens (no hardcoded values)."""
    mode_config = style.get_mode(mode)
    tokens = {
        'hook': mode_config.hook,
        'body': mode_config.body,
        'caption': mode_config.caption,
        'keyword': mode_config.keyword,
    }.get(card_type, mode_config.body)

    font_size = tokens.size
    color = tokens.color
    stroke_color = tokens.stroke_color
    stroke_width = tokens.stroke_width

    # Create image
    bg_color = style.colors.background
    img = Image.new('RGBA', (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # Load font
    try:
        font = ImageFont.truetype(tokens.family, font_size)
    except (OSError, IOError):
        font = ImageFont.load_default()

    # Word wrap
    words = text.split()
    lines = []
    current_line = []
    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] - bbox[0] > width - 80:  # 40px margin each side
            if current_line:
                lines.append(' '.join(current_line))
            current_line = [word]
        else:
            current_line.append(word)
    if current_line:
        lines.append(' '.join(current_line))
    lines = lines[:tokens.max_lines]

    # Draw text with stroke (from profile, not hardcoded)
    stroke_w = tokens.stroke_width if tokens.stroke_width else style.stroke_width
    stroke_c = tokens.stroke_color if tokens.stroke_color else style.colors.stroke
    y = (height - len(lines) * (font_size + 8)) // 2
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        x = (width - (bbox[2] - bbox[0])) // 2
        # 8-direction stroke loop
        for dx in range(-stroke_w, stroke_w + 1):
            for dy in range(-stroke_w, stroke_w + 1):
                if dx * dx + dy * dy <= stroke_w * stroke_w:
                    draw.text((x + dx, y + dy), line, fill=stroke_c, font=font)
        draw.text((x, y), line, fill=color, font=font)
        y += font_size + 8

    return img
