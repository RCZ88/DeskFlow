"""rules_v2.py — Rule-based shot extraction (v2 §3.2)."""
import re
from typing import List, Tuple, Dict, Set
from ..contracts.shotplan import Shot, ShotDecision, ShotRole, ShotPlan, TimeRange
from ..contracts.transcript import TranscriptInput

# ── 13 intents from v2 §3.2 ──
INTENTS = [
    'hook', 'definition', 'comparison', 'list', 'process',
    'example', 'equation', 'metric', 'graph', 'chapter',
    'screenshot', 'recording', 'cta',
]

# Trigger table: regex → intent → priority score
TRIGGER_TABLE: List[Tuple[str, str, float]] = [
    (r'\b(hook|opener|opening|first thing|let.s start)\b', 'hook', 0.25),
    (r'\b(comparison|versus|vs\.?|compared to|in contrast)\b', 'comparison', 0.20),
    (r'\b(for example|for instance|such as|like|e\.g\.)\b', 'example', 0.20),
    (r'\b(key point|important|crucial|essential|main idea)\b', 'process', 0.15),
    (r'\b(in summary|to recap|in conclusion|wrap up|takeaway)\b', 'cta', 0.10),
    (r'\b(let me explain|here is how|the way it works|step by step)\b', 'process', 0.10),
    (r'\b(step \d|first|second|third|finally|next)\b', 'list', 0.08),
    (r'\b(definition|defined as|means that|refers to)\b', 'definition', 0.08),
    (r'\b(consider|imagine|suppose|what if)\b', 'example', 0.05),
    (r'\b(tangent|aside|by the way|unrelated|off topic)\b', 'body', -0.10),
    # v2 §3.2 additions: metric, graph, chapter, screenshot, recording
    (r'\b(\d+\.?\d*\s*(%|percent|times|units|Hz|ms|KB|MB|GB)\b)', 'metric', 0.12),
    (r'\b(trend|pattern|increase|decrease|correlation|regression)\b', 'graph', 0.12),
    (r'\b(chapter|section|part \d|moving on|next section)\b', 'chapter', 0.10),
    (r'\b(look at|you can see|screenshot|the image|this shows)\b', 'screenshot', 0.10),
    (r'\b(recording|watch|video|clip|footage)\b', 'recording', 0.08),
]

# 9 pattern regexes from v2 §3.2 (exact matches)
PATTERNS = {
    'dimension': r'\b(\d+)d\b',
    'contradiction': r'\b(not|never|no|however|but|although|despite)\b',
    'technical_term': r'\b[A-Z][A-Z0-9-]{2,10}\b',
    'camel_case': r'\b[a-z]+[A-Z][a-zA-Z]+\b',
    'snake_case': r'\b[a-z]+_[a-z]+\b',
    'acronym': r'\b[A-Z]{2,6}\b',
    'parenthetical': r'\([^)]{2,30}\)',
    'number_with_unit': r'\b\d+\.?\d*\s*(%|sec|s|ms|min|m|h|Hz|dB|KB|MB|GB|px|em|rem)\b',
    'url': r'https?://[^\s]+',
}


def score_segment(segment_text: str, segment_start: float, segment_end: float,
                  transcript_duration: float, seen_intents: Set[str]) -> Tuple[float, str]:
    """Score a segment using the v2 §3.2 6-component formula.

    Returns (score, intent).
    """
    text_lower = segment_text.lower()

    # Component 1: intent_strength (0.25 weight) — which intent matches best
    best_intent = 'body'
    best_intent_score = 0.0
    for pattern, intent, raw_score in TRIGGER_TABLE:
        if re.search(pattern, text_lower):
            if raw_score > best_intent_score:
                best_intent_score = raw_score
                best_intent = intent
    intent_strength = min(best_intent_score / 0.25, 1.0)  # normalize to [0,1]

    # Component 2: position_weight (0.20 weight) — first 5s = high, last 5s = medium
    position_ratio = segment_start / max(transcript_duration, 1)
    if segment_start < 5.0:
        position_weight = 1.0  # hook position
    elif position_ratio < 0.2:
        position_weight = 0.8
    elif position_ratio > 0.85:
        position_weight = 0.6  # CTA zone
    else:
        position_weight = 0.4

    # Component 3: information_density (0.20 weight) — unique terms, sentence structure
    words = text_lower.split()
    unique_ratio = len(set(words)) / max(len(words), 1)
    sentence_count = max(1, text_lower.count('.') + text_lower.count('!') + text_lower.count('?'))
    info_density = min((unique_ratio * 0.6 + min(sentence_count / 3, 1.0) * 0.4), 1.0)

    # Component 4: novelty (0.15 weight) — first time this intent appears
    novelty = 1.0 if best_intent not in seen_intents else 0.3

    # Component 5: visualizability (0.10 weight) — does the text suggest a visual?
    visualizable_intents = {'comparison', 'graph', 'metric', 'equation', 'screenshot', 'recording', 'list', 'chapter'}
    visualizability = 1.0 if best_intent in visualizable_intents else 0.2

    # Component 6: source_confidence (0.10 weight) — transcript quality heuristic
    duration = segment_end - segment_start
    source_confidence = 0.8 if 1.5 <= duration <= 20.0 else 0.4

    # Final weighted score
    score = (
        0.25 * intent_strength
        + 0.20 * position_weight
        + 0.20 * info_density
        + 0.15 * novelty
        + 0.10 * visualizability
        + 0.10 * source_confidence
    )

    return score, best_intent


# Cooldown rules — v2 §3.2
COOLDOWNS = {
    'major': 3.0,       # seconds between major shots
    'hook': 10.0,       # seconds between hooks
    'keyword': 8.0,     # seconds between keywords
    'chapter': 12.0,    # seconds between chapters
}

DENSITY_LIMIT = 0.65  # max 65% of transcript covered by shots

# Conflict resolution priority chain — v2 §3.2
PRIORITY_CHAIN = ['hook', 'chapter', 'equation', 'graph', 'comparison', 'process',
                  'definition', 'screenshot', 'metric', 'keyword', 'body', 'cta']


def dedup_shots(shots: List[Shot], transcript: TranscriptInput) -> List[Shot]:
    """Remove duplicate shots based on text overlap (60% + Jaccard ≥ 0.7) or same intent+term."""
    kept = []
    seen_texts = []
    seen_intents = []
    for shot in shots:
        seg = next((s for s in transcript.segments if s.id == shot.segment_id), None)
        if not seg:
            continue
        text_words = set(seg.text.lower().split())
        is_dup = False
        for i, seen in enumerate(seen_texts):
            intersection = text_words & seen
            union = text_words | seen
            if len(union) > 0:
                jaccard = len(intersection) / len(union)
                overlap = len(intersection) / min(len(text_words), len(seen)) if min(len(text_words), len(seen)) > 0 else 0
                if overlap >= 0.6 and (jaccard >= 0.7 or shot.intent == seen_intents[i]):
                    is_dup = True
                    break
        if not is_dup:
            kept.append(shot)
            seen_texts.append(text_words)
            seen_intents.append(shot.intent)
    return kept


def merge_close_shots(shots: List[Shot], gap_threshold: float = 0.35) -> List[Shot]:
    """Merge shots with gaps ≤ threshold seconds. hook+CTA and chapter+caption never merge."""
    if not shots:
        return shots
    sorted_shots = sorted(shots, key=lambda s: s.timing.start_us)
    merged = [sorted_shots[0]]
    INCOMPATIBLE = {('hook', 'cta'), ('chapter', 'caption')}
    for shot in sorted_shots[1:]:
        prev = merged[-1]
        gap_us = shot.timing.start_us - prev.timing.end_us
        intents_pair = frozenset([prev.intent or '', shot.intent or ''])
        if gap_us <= gap_threshold * 1_000_000 and prev.decision == shot.decision and intents_pair not in INCOMPATIBLE:
            prev.timing = TimeRange(start_us=prev.timing.start_us, end_us=shot.timing.end_us)
        else:
            merged.append(shot)
    return merged


def apply_cooldowns(shots: List[Shot]) -> List[Shot]:
    """Apply cooldown spacing rules (v2 §3.2)."""
    sorted_shots = sorted(shots, key=lambda s: s.timing.start_us)
    filtered = []
    last_major = -float('inf')
    last_hook = -float('inf')
    last_keyword = -float('inf')
    last_chapter = -float('inf')

    for shot in sorted_shots:
        start_s = shot.timing.start_us / 1_000_000
        intent = shot.intent or ''
        role = shot.role.value if shot.role else 'detail'

        if intent in ('hook', 'core', 'detail') and (start_s - last_major) < COOLDOWNS['major']:
            continue
        if intent == 'hook' and (start_s - last_hook) < COOLDOWNS['hook']:
            continue
        if intent == 'chapter' and (start_s - last_chapter) < COOLDOWNS['chapter']:
            continue
        if shot.decision == ShotDecision.keep:
            if intent in ('hook', 'core', 'detail', 'comparison', 'definition', 'process'):
                last_major = start_s
            if intent == 'hook':
                last_hook = start_s
            if intent == 'keyword':
                last_keyword = start_s
            if intent == 'chapter':
                last_chapter = start_s
            filtered.append(shot)

    return filtered


def extract_shots(transcript: TranscriptInput) -> ShotPlan:
    """Full extraction pipeline: score → dedup → merge → cooldown → density cap."""
    candidates = []
    seen_intents = set()

    for seg in transcript.segments:
        score, intent = score_segment(
            seg.text, seg.timing.start_us / 1_000_000, seg.timing.end_us / 1_000_000,
            transcript.duration_us / 1_000_000, seen_intents
        )
        if score >= 0.15:  # v2 §3.2 minimum threshold
            candidates.append(Shot(
                segment_id=seg.id,
                timing=seg.timing,
                decision=ShotDecision.keep,
                intent=intent,
                reason=f'Scored {score:.2f} — {intent}',
                confidence=min(score / 0.5, 1.0),
            ))
            seen_intents.add(intent)
        else:
            candidates.append(Shot(
                segment_id=seg.id,
                timing=seg.timing,
                decision=ShotDecision.cut,
                reason=f'Low score {score:.2f}',
            ))

    # Dedup, merge, cooldown
    keep_shots = [s for s in candidates if s.decision == ShotDecision.keep]
    keep_shots = dedup_shots(keep_shots, transcript)
    keep_shots = merge_close_shots(keep_shots)
    keep_shots = apply_cooldowns(keep_shots)

    # Density cap
    total_us = transcript.duration_us
    kept_us = sum(s.timing.duration_us() for s in keep_shots)
    if total_us > 0 and kept_us / total_us > DENSITY_LIMIT:
        # Trim lowest-confidence shots
        keep_shots.sort(key=lambda s: s.confidence)
        while keep_shots and sum(s.timing.duration_us() for s in keep_shots) / total_us > DENSITY_LIMIT:
            keep_shots.pop(0)

    # Rebuild full shot list
    kept_ids = {s.segment_id for s in keep_shots}
    all_shots = []
    for seg in transcript.segments:
        if seg.id in kept_ids:
            all_shots.append(next(s for s in keep_shots if s.segment_id == seg.id))
        else:
            all_shots.append(Shot(
                segment_id=seg.id,
                timing=seg.timing,
                decision=ShotDecision.cut,
                reason='Not selected',
            ))

    all_shots.sort(key=lambda s: s.segment_id)
    return ShotPlan(
        video_id=transcript.video_id,
        source_duration_us=transcript.duration_us,
        target_duration_us=sum(s.timing.duration_us() for s in keep_shots),
        shots=all_shots,
    )
