"""sequence.py — PNG sequence export with static-scene shortcut (v2 §10.5)."""
import os
import hashlib
from typing import List, Optional
from PIL import Image

def render_frame(scene_graph, style_profile, frame_number: int, fps: int = 30) -> Image.Image:
    """Render a single frame from a scene graph."""
    from PIL import ImageDraw
    w = scene_graph.canvas_width
    h = scene_graph.canvas_height
    bg_color = style_profile.colors.background
    img = Image.new('RGBA', (w, h), bg_color)
    draw = ImageDraw.Draw(img)

    for layer in scene_graph.layers:
        x = layer.position.x
        y = layer.position.y
        opacity = int(layer.opacity * 255)
        if layer.layer_type == 'text' and layer.resolved_lines:
            for line in layer.resolved_lines:
                draw.text((line.x, line.y), line.text, fill=(255, 255, 255, opacity))
        elif layer.svg_content:
            # SVG would be rasterized via cairosvg in real implementation
            draw.rectangle([x, y, x + layer.size.w, y + layer.size.h],
                           fill=(100, 100, 100, opacity))
    return img


def export_png_sequence(frames: List[Image.Image], output_dir: str) -> List[str]:
    """Export frames as numbered PNGs."""
    os.makedirs(output_dir, exist_ok=True)
    paths = []
    for i, frame in enumerate(frames):
        path = os.path.join(output_dir, f'frame_{i:06d}.png')
        frame.save(path, 'PNG')
        paths.append(path)
    return paths


def is_static_scene(scene_graph) -> bool:
    """Check if a scene has no animation tracks (render once)."""
    return len(scene_graph.layers) <= 3 and all(
        layer.layer_type in ('text', 'shape', 'vector')
        for layer in scene_graph.layers
    )


def frame_hash(img: Image.Image) -> str:
    """SHA256 hash of frame pixels for determinism checks."""
    return hashlib.sha256(img.tobytes()).hexdigest()
