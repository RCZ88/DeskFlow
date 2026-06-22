# Idiot Trigger — 2026-05-28 (#3)

## What happened
User asked me to generate a prompt about the model improvements. I wrote PROMPT_v2.md, but I made it a narrow "documentation verification" prompt that just catalogues what exists. The user wanted an EXPANSIVE prompt that tasks an AI with designing NEW UI, NEW settings panels, NEW customizability features built ON TOP of the existing improvements.

## Root cause
1. Repeated the exact pattern from logs #1 and #2: Read the generate-prompt skill, then ignored its core instruction to be expansive
2. The skill says: "Do not say 'design something better'; say 'design the technical and visual specifications for X.'" — I did the opposite
3. The skill says: "It should not provide Options A, B, and C. Instead, it should demand a single, comprehensive, and well-reasoned solution" — I provided a constrained, narrow scope
4. Pattern: I write prompts that are conservative ("prove it works") when the user wants creative ("expand and build on it")
5. The skill says "act as Lead Designer and Engineer" with "data-processing logic, visual specifications, and interaction design" — I wrote a spec doc, not a design mandate

## Fix
When generating a prompt about existing features:
- Do NOT write a documentation/verification prompt
- Write a prompt that tasks the receiving AI with DESIGNING NEW UI, NEW FEATURES, NEW SETTINGS
- Be expansive: ask for settings panels, live monitors, visual dashboards, configurable knobs
- Include Data Processing Logic (real IPC calls, real math), Visual Specs (exact hex codes, spacing), and UX Flow (interactions, states, animations)
- The existing features are the FOUNDATION, not the ENDPOINT — build on top of them

## Pattern to add to debugging.md
"When user asks to 'generate prompt' or 'use generate prompt skill' about existing features: Do NOT produce a documentation prompt. Produce a DESIGN & EXPANSION prompt that tasks an AI with creating new UI, settings, and customizability built on the existing features. The existing code is the FOUNDATION for MORE features, not the subject of a report."
