"""digest.py — Visual digest construction from provider outputs."""
from typing import Optional, List
from .contracts import VisualDigest

def build_digest(
    gist: str = '',
    summary: str = '',
    keywords: Optional[List[str]] = None,
    topics: Optional[List[str]] = None,
    entities: Optional[List[str]] = None,
    setting: Optional[str] = None,
    actions: Optional[List[str]] = None,
    objects_visible: Optional[List[str]] = None,
    text_on_screen: Optional[List[str]] = None,
    visual_complexity: str = 'medium',
    motion_level: str = 'low',
    color_palette: Optional[List[str]] = None,
    confidence: float = 0.0,
    source: str = 'heuristic',
) -> VisualDigest:
    """Build a VisualDigest from provider outputs."""
    return VisualDigest(
        gist=gist, summary=summary,
        keywords=keywords or [], topics=topics or [], entities=entities or [],
        setting=setting, actions=actions or [],
        objects_visible=objects_visible or [], text_on_screen=text_on_screen or [],
        visual_complexity=visual_complexity, motion_level=motion_level,
        color_palette=color_palette or [], confidence=confidence, source=source,
    )


def build_heuristic_digest(
    frame_signatures: list,
    transcript_text: str = '',
) -> VisualDigest:
    """Build a basic digest from frame signatures and transcript without VLM."""
    avg_brightness = sum(s.avg_brightness for s in frame_signatures) / max(len(frame_signatures), 1)
    avg_edge = sum(s.edge_density for s in frame_signatures) / max(len(frame_signatures), 1)

    complexity = 'high' if avg_edge > 0.15 else ('medium' if avg_edge > 0.05 else 'low')

    # Extract simple keywords from transcript
    words = transcript_text.lower().split()
    word_freq = {}
    for w in words:
        if len(w) > 4:
            word_freq[w] = word_freq.get(w, 0) + 1
    keywords = sorted(word_freq.keys(), key=lambda w: word_freq[w], reverse=True)[:10]

    # Extract dominant colors from first frame
    palette = []
    if frame_signatures:
        sig = frame_signatures[0]
        palette = [
            f'#{int(sig.color_moments.get("mean_r", 128)):02x}{int(sig.color_moments.get("mean_g", 128)):02x}{int(sig.color_moments.get("mean_b", 128)):02x}'
        ]

    return VisualDigest(
        gist=f'Video with average brightness {avg_brightness:.0f}/255, visual complexity: {complexity}',
        summary=f'Heuristic analysis: {len(frame_signatures)} frames sampled, {len(keywords)} keywords extracted.',
        keywords=keywords,
        topics=[],
        entities=[],
        visual_complexity=complexity,
        motion_level='low',
        color_palette=palette,
        confidence=0.3,
        source='heuristic',
    )
