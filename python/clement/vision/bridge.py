"""bridge.py — Manual Visual Bridge prompt generation and validation."""
import json
from typing import Optional, List, Dict
from .contracts import VisualDigest

VISUAL_BRIDGE_PROMPT = """You are a visual analysis engine.

Analyze the attached video frames and transcript metadata.

Return only valid JSON.
Do not include markdown.
Do not include comments.

Use this schema:
{
  "gist": "1-2 sentence description of what is visible",
  "summary": "detailed visual description of the video content",
  "keywords": ["string"],
  "topics": ["string"],
  "entities": ["string"],
  "setting": "string describing the environment",
  "actions": ["string describing visible actions"],
  "objects_visible": ["string labels of objects in frame"],
  "text_on_screen": ["string labels of visible text"],
  "visual_complexity": "low | medium | high",
  "motion_level": "low | medium | high",
  "frames": [
    {
      "frame_id": "string matching the frame ID from the contact sheet",
      "timestamp_sec": 0.0,
      "caption": "string describing what is visible in this frame",
      "objects": ["string labels"],
      "text_visible": ["string labels"],
      "composition": "string describing camera angle and framing",
      "motion": "string describing movement or lack thereof"
    }
  ]
}

RULES:
- Every frame_id must match an ID from the provided contact sheet.
- Do not invent frames that were not provided.
- Set visual_complexity based on how many distinct elements are visible.
- Set motion_level based on apparent movement between frames.
- Be specific about object positions when possible.
- List all readable text on screen in text_on_screen.
"""

def build_visual_bridge_prompt(
    video_id: str,
    transcript_summary: str = '',
    frame_descriptions: Optional[List[Dict]] = None,
) -> str:
    """Build the Manual Visual Bridge prompt for external VLM."""
    prompt = VISUAL_BRIDGE_PROMPT
    if transcript_summary:
        prompt += f'\n\nTRANSCRIPT CONTEXT:\n{transcript_summary}'
    if frame_descriptions:
        prompt += '\n\nFRAME METADATA:\n'
        for fd in frame_descriptions:
            prompt += f'  Frame {fd.get("frame_id", "?")}: timestamp={fd.get("timestamp_sec", 0)}s, reason={fd.get("reason", "unknown")}\n'
    return prompt


def validate_visual_digest_response(data: dict) -> dict:
    """Validate a pasted visual digest response. Returns {valid, errors, digest}."""
    errors = []
    if not isinstance(data, dict):
        return {'valid': False, 'errors': ['Response is not a JSON object'], 'digest': None}

    required_fields = ['gist', 'summary', 'keywords', 'objects_visible']
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f'Missing required field: {field}')

    if 'visual_complexity' in data and data['visual_complexity'] not in ('low', 'medium', 'high'):
        errors.append(f'Invalid visual_complexity: {data["visual_complexity"]}')

    if 'motion_level' in data and data['motion_level'] not in ('low', 'medium', 'high'):
        errors.append(f'Invalid motion_level: {data["motion_level"]}')

    if 'frames' in data and isinstance(data['frames'], list):
        for i, frame in enumerate(data['frames']):
            if 'frame_id' not in frame:
                errors.append(f'Frame {i}: missing frame_id')
            if 'caption' not in frame:
                errors.append(f'Frame {i}: missing caption')

    if errors:
        return {'valid': False, 'errors': errors, 'digest': None}

    digest = VisualDigest(
        gist=data.get('gist', ''),
        summary=data.get('summary', ''),
        keywords=data.get('keywords', []),
        topics=data.get('topics', []),
        entities=data.get('entities', []),
        setting=data.get('setting'),
        actions=data.get('actions', []),
        objects_visible=data.get('objects_visible', []),
        text_on_screen=data.get('text_on_screen', []),
        visual_complexity=data.get('visual_complexity', 'medium'),
        motion_level=data.get('motion_level', 'medium'),
        color_palette=data.get('color_palette', []),
        confidence=0.7,
        source='manual-visual-bridge',
    )
    return {'valid': True, 'errors': [], 'digest': digest}


def generate_repair_prompt(errors: List[str], failed_output: str) -> str:
    """Generate a repair prompt for failed visual digest validation."""
    return f"""Your previous visual analysis response failed validation.

VALIDATION ERRORS:
{chr(10).join(f'- {e}' for e in errors)}

YOUR PREVIOUS OUTPUT:
{failed_output[:3000]}

Return the complete corrected JSON now. Follow the schema exactly. Do not include markdown or explanations."""
