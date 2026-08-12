"""llm.py — LLM extraction with Ollama (v2 §3.3)."""
import json
import requests
from typing import Optional, Dict, Any
from ..contracts.shotplan import ShotPlan
from ..contracts.transcript import TranscriptInput

OLLAMA_URL = 'http://localhost:11434/api/generate'

SYSTEM_PROMPT = """You are a video editor. Given a timestamped transcript, select which segments to KEEP so the final video is between 90 and 180 seconds.

Rules:
- Keep the hook (first ~5s) no matter what.
- Prioritize segments that explain the CORE topic with depth.
- Cut: tangents, repetitions, filler, long pauses, off-topic detours.
- Every kept segment needs a one-line REASON (shown to user).
- Output ONLY JSON.

JSON Schema:
{
  "video_id": "string",
  "target_duration": number,
  "kept": [{"segment_id": int, "start": float, "end": float, "reason": "string", "role": "hook|core|detail|cta"}],
  "cut": [{"segment_id": int, "reason": "string"}]
}"""

REPAIR_PROMPT = """Your previous response failed validation. Return ONLY the corrected JSON in ONE ```json fence. No explanations.

Errors: {errors}

Previous output: {failed_output}

Return the complete corrected JSON now."""


def call_ollama(prompt: str, model: str = 'llama3.1', num_ctx: int = 16384) -> str:
    """Call Ollama API with JSON format enforcement."""
    resp = requests.post(OLLAMA_URL, json={
        'model': model,
        'system': SYSTEM_PROMPT,
        'prompt': prompt,
        'format': 'json',
        'stream': False,
        'options': {'num_ctx': num_ctx},
    }, timeout=300)
    resp.raise_for_status()
    return resp.json().get('response', '')


def extract_with_llm(transcript: TranscriptInput, model: str = 'llama3.1') -> Optional[ShotPlan]:
    """Extract shot plan using LLM with one repair pass."""
    prompt = json.dumps({
        'video_id': transcript.video_id,
        'segments': [
            {'id': s.id, 'start': s.timing.start_us / 1_000_000, 'end': s.timing.end_us / 1_000_000, 'text': s.text}
            for s in transcript.segments
        ]
    }, ensure_ascii=False)

    try:
        response = call_ollama(prompt, model)
        return _parse_response(response, transcript)
    except Exception as e:
        print(f'[LLM] First attempt failed: {e}')
        # Repair pass
        try:
            repair = REPAIR_PROMPT.format(errors=str(e), failed_output=response[:4000])
            response = call_ollama(repair, model)
            return _parse_response(response, transcript)
        except Exception as e2:
            print(f'[LLM] Repair failed: {e2}')
            return None


def _parse_response(response: str, transcript: TranscriptInput) -> Optional[ShotPlan]:
    """Parse LLM response into ShotPlan."""
    # Extract JSON from potential markdown fences
    text = response.strip()
    if '```json' in text:
        text = text.split('```json')[1].split('```')[0].strip()
    elif '```' in text:
        text = text.split('```')[1].split('```')[0].strip()

    data = json.loads(text)
    return ShotPlan.from_v1_dict(data)
