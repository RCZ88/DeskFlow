# Collaboration Request: Overlay Studio UI Redesign

## Raw Request
"okay what about my request of the ui and stuff? do you not consult using the back and fourth skill and stuff properly? ... Why is the UI so really bad? I know it's not the main goal to improve the UI and everything. All I can see right now is start a video with a transcript. Where's the other UI? Where are all the tools? Where are all the video editing and stuff like that? We don't have to have the best display. But at least, it is clear. When one of the features it has, it can show me and I can actually use it. I can see it. We need those. ... Why is it that all of the Python files are basically related to SVM in just SVM transcript? No, it's not just for SVM, it's just for any general video, any general video, whatever the topic is. ... I think we're discussing about the wrong thing here, making a general system, where I couldn't put any topic, anything that I would like. Any video and you can turn it and evaluate it properly. I have a skill where the content creation skill is able to do those stuff. Being able to incorporate those skills into the problem, how we can construct your lies and conceptualize this, and all to make it a reality is very much needed."

## Problem Statement
The Overlay Studio has a working Python backend (phases 1–2.5 complete) and a functional but visually poor React frontend. The UI feels like a prototype — no clear visual hierarchy, no video preview, no timeline scrubber, no visual preview of overlays on the 9:16 canvas. The user cannot see or use the features properly. The system must work for ANY video topic, not just SVM tutorials.

## Context Bundle
See `CONTEXT_BUNDLE.md` in this directory for the full codebase context including:
- Current FeatureStudioPage.tsx (599 lines, 6 views)
- Python backend structure (9 contracts, extraction, animation, render, registry, validators, CLI)
- Design tokens (zinc glass theme, pink/cyan accents)
- Environment status (Python + faster-whisper available, ffmpeg/Ollama missing)

## Engineering Task
Design the complete data flow for the Overlay Studio UI:
1. How does transcript data flow from upload → display → AI processing → result?
2. How does the cut plan flow from AI response → timeline visualization → user approval?
3. How does the scene DSL flow from AI response → visual preview → export?
4. How should the 9:16 canvas preview render overlay cards in real-time?
5. How should the timeline scrubber work (playhead, segment highlighting, play/pause)?

## Design Task
Design high-fidelity visual specs for the Overlay Studio:
1. **Dashboard view** — What should the user see first? Tool cards, pipeline status, video library.
2. **Transcript view** — How should segments be displayed? Timestamp chips, text, keep/cut indicators.
3. **Timeline** — How should the timeline look? Multi-track? Waveform? Segment blocks with colors?
4. **9:16 Canvas Preview** — How should overlays render on the preview? Safe zones? Animation preview?
5. **Manual Bridge** — How should the 3-step wizard look? Prompt display, paste area, validation checklist.
6. **Cut Plan view** — How should kept/cut segments be visualized? Side-by-side? Inline?
7. **Scene Visualizer** — How should generated scenes be displayed? Grid? Cards with renderer badges?

Use the design tokens from CONTEXT_BUNDLE.md (zinc glass, pink accent, cyan info, 8px grid, rounded-xl).

## UX Task
Design the interaction flow for the complete pipeline:
1. First-time user: What do they see? How do they get started?
2. Multi-video workflow: How do they manage multiple videos?
3. AI generation flow: How does the Manual Bridge wizard guide them?
4. Cut plan editing: How do they approve/reject/edit individual segments?
5. Scene preview: How do they preview animations on the 9:16 canvas?
6. Export flow: What export options are available? How do they download?

## Constraints
- Must work with the existing Python backend (no new backend needed)
- Must use the existing design tokens (zinc glass theme)
- Must support Manual Bridge mode (no Ollama required)
- Must be topic-agnostic (any video, any content)
- Must show all pipeline tools clearly
- Must have empty/loading/error states for every data view
- Must follow Human-Centric UX rules (44px targets, focus rings, transitions)
