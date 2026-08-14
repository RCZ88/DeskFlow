# Collaboration Request: Visual Analysis Engine for Overlay Studio

## Your Role
You are the Specialist AI. I am the Project Owner AI. I have the codebase; you know how to design and architect video analysis systems. We will collaborate through a structured back-and-forth to design and implement the visual analysis capabilities.

## The Idea
The Overlay Studio currently only processes transcript text. It has NO visual analysis of the actual video content. The user wants the system to understand WHAT is on screen — not just what is being said. This requires:

1. **Multimodal video understanding** — analyze video frames to answer questions like "what is happening here?", "where is the speaker?", "is there existing text on screen?"
2. **Object localization** — detect specific objects (person, face, laptop, product) and return their exact position in the frame
3. **Asset enrichment** — auto-analyze uploaded videos to produce gist, keywords, and visual digest
4. **Shot decomposition** — detect scene boundaries and segment the video into reusable shots
5. **Style-reference analysis** — extract editing characteristics from reference videos

## What We Have (existing codebase)

### Frontend (React + Tailwind + Electron)
- `src/features/overlay-studio/` — 3-pane studio layout with dashboard, transcript, bridge, cutplan, scene, visualizer views
- `src/types/overlayStudio.ts` — overlay types (hook/body/caption/bullet/keyword), safe zones, canvas dimensions
- `src/lib/overlayPrompts.ts` — AI prompts for cut planning and scene DSL
- `src/lib/overlayParser.ts` — JSON extraction, validation, repair prompts

### Backend (Python)
- `python/clement/contracts/` — 9 Pydantic models (transcript, shotplan, scenegraph, timeline, template, style, manifest, export, common)
- `python/clement/extraction/rules_v2.py` — 13-intent rule extraction with 6-component scoring
- `python/clement/extraction/llm.py` — Ollama integration (num_ctx=16384, format=json)
- `python/clement/animation/` — bezier.py (12 easings), evaluator.py (9 presets), hook_sequence.py
- `python/clement/render/` — static_pil.py, sequence.py, ffmpeg.py
- `python/clement/registry/` — Template ABC + Registry + 8 template definitions
- `python/clement/validators/qa.py` — scene validator
- `python/main.py` — CLI (ingest/extract/plan/validate/render/composite/export)

### What's Missing (the gaps)
- **No video frame analysis** — we only process transcript text
- **No object detection** — we can't find where people/objects are in frames
- **No shot boundary detection** — we can't segment video into shots
- **No asset enrichment** — no auto-analysis of uploaded videos
- **No style reference extraction** — no way to learn from reference videos
- **No face detection** — can't place overlays away from faces
- **No visual collision detection** — can't check if overlays cover important content

## Design Task
Design the visual analysis pipeline for the Overlay Studio:
1. How should video frames be analyzed? (VLM integration, frame sampling strategy)
2. How should object localization work? (SAM-3 integration, prompt-based detection)
3. How should asset enrichment be structured? (gist, keywords, visual digest)
4. How should shot decomposition work? (scene boundary detection, segment splitting)
5. How should style references be analyzed? (what characteristics to extract, how to store them)

## Constraints
- Must work with the existing Python backend (no new languages)
- Must be topic-agnostic (works for any video content)
- Must integrate with the existing Manual Bridge flow (when Ollama is available)
- Must degrade gracefully when visual analysis is unavailable
- Must be free/zero-cost where possible
- Must output structured data that the existing frontend can consume
