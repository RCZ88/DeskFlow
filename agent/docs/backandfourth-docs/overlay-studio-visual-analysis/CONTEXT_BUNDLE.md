# Context Bundle — Visual Analysis Engine

## Project
DeskFlow Overlay Studio — Electron + React + Python. Currently has transcript-only processing. Needs video frame analysis.

## Existing Files
- `src/features/overlay-studio/` — 3-pane studio (dashboard, transcript, bridge, cutplan, scene, visualizer)
- `python/clement/contracts/` — 9 Pydantic models
- `python/clement/extraction/` — rules_v2.py (13 intents, 6-component scoring), llm.py (Ollama)
- `python/clement/animation/` — bezier, evaluator, hook_sequence
- `python/clement/render/` — static_pil, sequence, ffmpeg
- `python/clement/registry/` — Template ABC + 8 template definitions
- `python/clement/validators/qa.py`

## Transcript Contract (what we have)
```json
{
  "video_id": "string",
  "duration": 847.2,
  "segments": [
    {"id": 0, "start": 0.0, "end": 3.5, "text": "...", "words": [{"word": "...", "start": 0.0, "end": 0.4}]}
  ]
}
```

## Shot Plan Contract (what we have)
```json
{
  "video_id": "string",
  "source_duration": 847200000,
  "target_duration": 142000000,
  "shots": [
    {"segment_id": 0, "timing": {"start_us": 0, "end_us": 4800000}, "decision": "keep", "intent": "hook", "reason": "...", "confidence": 0.95}
  ]
}
```

## Environment
- Python 3.12 + faster-whisper installed
- ffmpeg NOT installed
- Ollama NOT running
- Node v24.13.0
