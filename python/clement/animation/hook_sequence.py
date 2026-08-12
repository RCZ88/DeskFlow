"""hook_sequence.py — Sequential hook text animation (v2 §7.7).

"MATH / IS / BORING." — re-center after each word reveal.
Solve final layout BEFORE generating motion.
"""
from typing import List, Tuple
from ..contracts.timeline import Track, Keyframe, Easing

def build_hook_sequence(text: str, node_id: str, start_us: int,
                        word_gap_us: int = 200_000, char_us: int = 50_000,
                        canvas_w: int = 1080, canvas_h: int = 1920,
                        font_size: int = 96) -> List[Track]:
    """Build a sequential word-reveal animation with re-centering.

    "MATH / IS / BORING." reveals one word at a time, each centered.
    """
    words = text.split()
    tracks = []
    total_us = 0

    # Measure each word's width (approximate: font_size * 0.6 per char)
    word_widths = [(w, len(w) * font_size * 0.6) for w in words]

    # Pre-calculate positions: each word centered alone, then all centered
    positions = []
    for i, (word, width) in enumerate(word_widths):
        x = (canvas_w - width) / 2
        y = (canvas_h - font_size) / 2
        positions.append((x, y))

    # All words together centered at the end
    total_width = sum(w for _, w in word_widths) + (len(words) - 1) * font_size * 0.3
    final_x = (canvas_w - total_width) / 2

    # Build tracks for each word
    time = start_us
    for i, (word, width) in enumerate(word_widths):
        node = f'{node_id}_word_{i}'

        # Opacity track: reveal each word
        tracks.append(Track(
            node_id=node,
            property='opacity',
            keyframes=[
                Keyframe(time_us=time, value=0.0, easing=Easing.linear),
                Keyframe(time_us=time + char_us * len(word), value=1.0, easing=Easing.ease_out),
            ]
        ))

        # X position track: slide to center
        tracks.append(Track(
            node_id=node,
            property='x',
            keyframes=[
                Keyframe(time_us=time, value=positions[i][0] + 50, easing=Easing.cubic_out),
                Keyframe(time_us=time + char_us * len(word), value=positions[i][0], easing=Easing.ease_out),
            ]
        ))

        total_us = time + char_us * len(word) + word_gap_us
        time = total_us

    return tracks
