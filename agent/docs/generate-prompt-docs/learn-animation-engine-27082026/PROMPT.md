# PROMPT.md — Learn Animation Engine Implementation Specification

> **Prompt Type:** Engineering + Design
> **Target AI:** Claude / GPT-4 (must be capable of reading code and generating specs)
> **Output Format:** RESULT.md — complete implementation specification
> **Context Bundle:** CONTEXT_BUNDLE.md (must be read first)

---

## System Prompt

You are a **Lead Software Architect** designing an implementation specification for adding animated math/STEM visualizations to a desktop learning application. You have full access to the codebase context in CONTEXT_BUNDLE.md.

Your job is to produce a **RESULT.md** — a detailed, file-level implementation specification that an engineer can follow step-by-step to build the feature. Every change must reference exact file paths, line numbers, and code patterns from the context bundle.

You are NOT generating code. You are generating a **blueprint** — what to change, where, why, and in what order.

---

## User Prompt

### Context

We're adding animated math/STEM visualizations as lesson assets in the Lyceum Learn OS. The selected tool stack is:

1. **Elucim** (`@elucim/core` + `@elucim/dsl`) — Primary: AI-driven 2D math animations, browser-rendered, React-native. JSON/YAML DSL for AI agents, math primitives (Axes, FunctionPlot, Vector, VectorField, Matrix, Graph, LaTeX), timeline/state machine animation, visual editor. License: MIT.
2. **Three.js** (existing in project) — Real-time 3D interactive scenes via @react-three/fiber
3. **Manim + 3brown1blue** (pip) — Pre-rendered video assets for complex 3D animations. Python, outputs MP4. 3brown1blue is a Claude Code skill that generates 3Blue1Brown-style videos. License: MIT.
4. **KaTeX** (existing in project) — Inline math text rendering

### What Exists

The lesson system stores content as LDOC documents (JSON blobs in SQLite). Each lesson has nodes, each node has ordered blocks. There are 28+ block types (prose, math, mermaid, code, image, video, quiz, chart, illustration, etc.).

The AI generates lessons in `.lmd` (Lesson Markdown) format. A parser converts `:::directive` blocks into typed LdocBlock objects. The system prompt tells the AI what block types are available.

There is already an illustration system (AI-generated images stored on disk, referenced by path in block metadata).

### What Needs To Be Built

Design a complete specification for:

#### A. New Block Types (2)

1. **`animation`** block — stores Elucim DSL JSON, renders as interactive animated math visualization in the lesson
2. **`video_asset`** block — stores Manim Python source + rendered MP4 path, renders as `<video>` with controls

#### B. Scene Router

A decision layer (could be prompt-based or code-based) that decides which tool to use:
- Lesson description → route to Elucim (2D math), Manim (complex 3D video), Three.js (interactive 3D), or KaTeX (inline)

#### C. Elucim Integration

- npm packages: `@elucim/core`, `@elucim/dsl`
- React component: `<AnimationBlock>` that takes ElucimDocument JSON and renders it
- Validation: use `lintMotion()` and `evaluateSceneForAgent()` from @elucim/dsl
- Use agent presets where applicable (createCalculusDerivativeScenePreset, etc.)

#### D. Manim Integration

- Python subprocess: spawn `manim render` from Electron main process
- Asset storage: `%APPDATA%/RHEO/lyceum/animations/<lessonId>/`
- Video embedding: `<video>` tag with poster frame
- Thumbnail generation: ffmpeg or manim flag for first frame

#### E. Prompt Modifications

Update the lesson generation system prompt to:
- List `animation` and `video_asset` as available block types
- Include .lmd examples for both
- Guide the AI on when to use each tool

#### F. .lmd Parser Extensions

Add `:::animation` and `:::video_asset` directives to the parser (parseLessonMarkdown.ts)

#### G. New IPC Handlers

- `learn:renderAnimation` — validate + render Elucim scene
- `learn:renderVideoAsset` — spawn Manim subprocess + return video path

#### H. New React Components

- `AnimationBlock.tsx` — Elucim renderer
- `VideoAssetBlock.tsx` — Manim video player

### Constraints

- Follow existing code patterns exactly (block interface pattern, IPC handler pattern, parser directive pattern)
- All new blocks must work with the existing BlockRenderer dispatch
- Animation data must persist in `doc_json` (LDOC blob) — no separate tables
- Video assets must be stored on disk with paths in block metadata
- Must compile with the per-file esbuild pattern (NOT --bundle)
- Must work in Electron (browser-native for Elucim, Python subprocess for Manim)
- Must be type-safe (update deskflow-api.d.ts)
- Must handle errors gracefully (render failures, missing Python, etc.)

### Output Format

Return RESULT.md with this structure:

```markdown
# Learn Animation Engine — Implementation Specification

## Overview
[2-3 paragraph summary of what's being built]

## Phase 1: Types & Schema
[Exact changes to types.ts — new BlockType entries, new interfaces]

## Phase 2: Parser Extensions
[Exact changes to parseLessonMarkdown.ts — new ::directive handling]

## Phase 3: Elucim Integration
[npm install, React component, validation, agent presets]

## Phase 4: Manim Integration
[Python subprocess, asset storage, video rendering]

## Phase 5: Block Components
[AnimationBlock.tsx, VideoAssetBlock.tsx — full component specs]

## Phase 6: IPC Handlers
[New handlers in index.ts, bridges in preload.ts]

## Phase 7: Prompt Updates
[Changes to promptLibrary.ts and prompt files]

## Phase 8: Type Declarations
[Updates to deskflow-api.d.ts]

## Implementation Order
[Dependency graph — what must be built first]

## Verification Steps
[How to verify each phase works]
```

### For Each Change, Specify

1. **File path** — exact file to modify
2. **What to add/change** — specific code or section
3. **Line numbers** — where in the existing file
4. **Why** — rationale for the change
5. **Dependencies** — what must exist before this change
6. **Verification** — how to test it works

### Critical Rules

- Do NOT propose removing any existing functionality
- Do NOT propose new database tables — everything goes in doc_json
- Do NOT propose new npm packages beyond @elucim/core, @elucim/dsl, and manim/3brown1blue (pip)
- Do reference the existing illustration system as a pattern to follow
- Do handle the case where Manim/Python is not installed (graceful fallback)
- Do handle the case where Elucim render fails (error state in block)
