# CONTEXT_BUNDLE.md — Learn Animation Engine Implementation

## Raw Request (verbatim)

User wants animated math/STEM visualizations as lesson assets in the Lyceum Learn OS. The selected tool stack is:

1. **Elucim** (`@elucim/core` + `@elucim/dsl`) — Primary: AI-driven 2D math animations, browser-rendered, React-native
2. **Three.js** (existing) — Real-time 3D interactive scenes
3. **Manim + 3brown1blue** (pip) — Pre-rendered video assets for complex 3D
4. **KaTeX** (existing) — Inline math text

Design a complete implementation specification for adding animated math visualizations to lesson nodes.

---

## What Exists Today

### Lesson Document Format (LDOC)

Lessons are stored as JSON blobs (`doc_json` column in `learn_lessons` table). Each lesson has nodes, each node has blocks.

```typescript
// src/shared/learn/types.ts
interface LdocDocument {
  doc: 'ldoc/1.0';
  lesson: LdocLesson;
  nodes: LdocNode[];
}

interface LdocNode {
  id: string;
  title: string;
  mastery_target: MasteryLevel;
  prereq?: string[];
  blocks: LdocBlock[];      // ← animation blocks go here
  grounding: LdocGrounding;
}
```

### Existing Block Types (src/shared/learn/types.ts:24-27)

```typescript
type BlockType =
  | 'prose' | 'math' | 'mermaid' | 'code' | 'image' | 'video'
  | 'widget' | 'quiz' | 'callout' | 'layer' | 'chart' | 'table'
  | 'flow' | 'finchart' | 'svg' | 'html' | 'figure' | 'tutor'
  | 'proposal' | 'conversation' | 'notes'
  | 'viz_heatmap' | 'viz_graph' | 'viz_timeline' | 'viz_concept_map'
  | 'flashcard' | 'flashcard_occlusion' | 'layer_reveal' | 'whiteboard'
  | 'illustration'
  | 'annotated-code' | 'annotated-math';
```

### Block Interface Pattern (example: ImageBlock)

```typescript
// src/shared/learn/types.ts:125-133
interface ImageBlock extends BaseBlock {
  type: 'image';
  url: string;
  alt: string;
  source: string;
  license: string;
  caption?: string;
  fallback_url?: string;
}
```

### BlockRenderer Dispatch (src/components/learn/blocks/BlockRenderer.tsx:63-129)

```typescript
// Switch statement dispatches block.type → component
case 'image': return <ImageBlock {...props} />;
case 'video': return <VideoBlock {...props} />;
case 'chart': return <ChartBlock {...props} />;
// ... etc
```

### BlockRenderer Props Interface

```typescript
// src/components/learn/blocks/BlockRenderer.tsx:37-52
interface BlockRendererProps {
  block: LdocBlock;
  onAsk?: (blockId: string, question: string) => void;
  onQuizSubmit?: (nodeId: string, blockId: string, response: string) => void;
  currentLevel?: string;
  nodeId?: string;
  // ... more callbacks
}
```

### DB Schema (learn_lessons table)

```sql
-- src/services/learn/db/migrations/001_learn.sql (rebuilt in 008)
CREATE TABLE learn_lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  part INTEGER NOT NULL,
  version TEXT NOT NULL,
  doc_json TEXT NOT NULL,        -- ← full LDOC JSON blob
  status TEXT DEFAULT 'draft',
  chapter TEXT DEFAULT '',
  branch_id TEXT DEFAULT 'cs-ai',
  -- ... timestamps
);
```

### Visual Asset System (Already Exists)

```typescript
// src/services/learn/services/imageGen.service.ts
// AI image generation with OpenAI/Stability/Replicate providers
// Stores to: %APPDATA%/RHEO/lyceum/illustrations/<lessonId>/

// IllustrationBlock type (src/shared/learn/types.ts:564-574)
interface IllustrationBlockType extends BaseBlock {
  type: 'illustration';
  meta: {
    prompt: string;
    concept?: string;
    image_path?: string;
    generated: boolean;
    annotations?: string[];
    error?: string;
  };
}
```

### Lesson Generation Pipeline

```
User topic → learn:buildPrompt IPC → External AI → .lmd output → learn:generateLdoc IPC → importLdoc()
```

The `learn:buildPrompt` IPC (src/services/learn/index.ts:370-551) composes a system prompt that tells the AI what block types to output. The AI generates `.lmd` (Lesson Markdown) which gets parsed by `parseLessonMarkdown.ts` (857 lines) into LDOC blocks.

### .lmd Parser Directive Syntax

The parser handles `:::kind` directives:

```markdown
:::chart
{"$schema":"https://vega-lite.github.io/schema/vega-lite/v5.json","data":{"values":[...]}}
:::

:::quiz
{question, options, answer_key}
:::

:::annotated-code python
def hello():
    print("world")
:::targets
::: hello_msg The print statement outputs to stdout
:::
:::
```

### Prompt Library (src/services/learn/promptLibrary.ts)

The system prompt is assembled in 8 layers:
1. Format (author-guide.md)
2. Style (master-prompt.md)
3. Visual Grounding (visual-grounding.md)
4. Pedagogy (pedagogy.md)
5. Persona (from LearnerProfile)
6. Topic Brief
7. Mastery Ladder
8. Guardrails

The AI generates blocks in `.lmd` format. The parser converts them to LdocBlock objects.

### Preload Bridge (84 learn-related IPC methods)

```typescript
// src/preload.ts:1373-1516
window.deskflowAPI.learnGenerateLdoc(args: { prompt, systemPrompt })
window.deskflowAPI.learnBuildPrompt(args: { userInput, topic, ... })
window.deskflowAPI.learnUpdateLessonDoc(args: { lessonId, docJson })
window.deskflowAPI.learnGenerateIllustration(args: { lessonId, nodeId, prompt, concept })
// ... 80+ more
```

### Existing IPC Handler Pattern

```typescript
// src/services/learn/index.ts
ipcMain.handle('learn:generateLdoc', async (_event, args) => {
  const result = await callAi(args.prompt, args.systemPrompt, 8000);
  const parsed = toLdoc(result);
  const validation = validateFull(parsed, publishedIds);
  if (!validation.ok) return { ok: false, error: 'Validation failed', validation };
  const imported = await importer.importLdoc(parsed);
  return { ok: true, data: imported };
});
```

### Compile Pattern (CRITICAL)

```bash
# After editing src/services/learn/*.ts, recompile per-file:
npx esbuild "src/services/learn/index.ts" --outfile="dist-electron/services/learn/index.js" --format=cjs --platform=node --target=node22

# After editing src/services/learn/services/*.ts:
npx esbuild "src/services/learn/services/imageGen.service.ts" --outfile="dist-electron/services/learn/services/imageGen.service.js" --format=cjs --platform=node --target=node22

# NEVER use --bundle for these files
# rebuild-main.mjs does NOT rebuild them
```

### Asset Storage Pattern

```typescript
// Image assets stored at:
%APPDATA%/RHEO/lyceum/illustrations/<lessonId>/<filename>

// Referenced in blocks as:
{ type: 'illustration', meta: { image_path: 'C:\\Users\\...\\lyceum\\illustrations\\lesson-1\\img.png' } }
```

---

## What Needs To Be Designed

### 1. New Block Types

Design two new LdocBlock types:

**AnimationBlock** — for Elucim scenes (browser-rendered, interactive)
- Stores Elucim DSL JSON
- Supports timelines, state machines, math primitives
- Renders inline in lesson via React component

**VideoAssetBlock** — for Manim pre-rendered videos
- Stores Python source code (for re-rendering) + video file path
- Renders as `<video>` element with controls
- Supports thumbnail/poster frame

### 2. Scene Router

A decision layer that takes a lesson description or AI output and routes to the correct tool:
- Simple 2D math → Elucim DSL JSON
- Complex 3D animation → Manim Python code → rendered MP4
- Real-time 3D interaction → Three.js scene graph
- Inline equation → KaTeX string

### 3. Elucim Integration

- npm install `@elucim/core` + `@elucim/dsl`
- React component that renders ElucimDocument
- Validation layer (lintMotion, evaluateSceneForAgent)
- Agent helper presets (createCalculusDerivativeScenePreset, etc.)

### 4. Manim Integration

- Python subprocess handler (spawn manim render)
- Video asset storage (%APPDATA%/RHEO/lyceum/animations/)
- Thumbnail generation (ffmpeg poster frame)
- 3brown1blue skill integration for AI code generation

### 5. Prompt Modifications

Update the lesson generation prompt to include:
- New block types in the available block list
- Instructions for when to use animation vs static vs video
- Example .lmd snippets for animation blocks

### 6. New IPC Handlers

- `learn:renderAnimation` — renders Elucim DSL to SVG/Canvas
- `learn:renderVideoAsset` — spawns Manim subprocess, returns video path
- `learn:getAnimationPreview` — returns first frame for thumbnails

### 7. LDOC Parser Extensions

Add `:::animation` and `:::video_asset` directive handling to `parseLessonMarkdown.ts`

---

## Python Environment (User's Machine)

The user has Python 3.12 via Anaconda (miniconda3). Manim is installed in the `base` conda environment.

### Installed Packages
| Package | Version | Installed Via |
|---------|---------|---------------|
| manim | 0.21.0 | pip (base conda env) |
| python | 3.12.10 | miniconda3 |
| ffmpeg | (needs verification) | system or conda |

### 3brown1blue (NOT yet installed)
```bash
pip install 3brown1blue
```

### Full Python Setup (for reference)
```bash
# Manim (already installed)
pip install manim

# 3brown1blue AI skill (NOT installed yet)
pip install 3brown1blue

# ffmpeg (needed for Manim video rendering + poster generation)
# Check if installed:
ffmpeg -version
# If not:
conda install -c conda-forge ffmpeg
# OR on Windows: winget install ffmpeg

# Verify everything works:
python -m manim --version
python -c "from manim import *; print('Manim OK')"
ffmpeg -version
```

### Runtime Detection (in app)
The app must probe at runtime whether Python/Manim/ffmpeg are available:
```typescript
// animation.service.ts
manimAvailable() → { ok: boolean, python?: string, ffmpeg?: boolean }
```
If unavailable, the app degrades gracefully — `video_asset` blocks show source code fallback, and the AI prompt suppresses `video_asset` block suggestions.

---

## Key Files To Modify

| File | Change |
|------|--------|
| `src/shared/learn/types.ts` | Add AnimationBlock, VideoAssetBlock to BlockType union and interfaces |
| `src/components/learn/blocks/BlockRenderer.tsx` | Add case for new block types |
| `src/services/learn/parseLessonMarkdown.ts` | Add `:::animation` and `:::video_asset` directive parsing |
| `src/services/learn/index.ts` | Add new IPC handlers |
| `src/services/learn/promptLibrary.ts` | Update system prompt to include animation blocks |
| `src/preload.ts` | Add new IPC bridge methods |
| `src/types/deskflow-api.d.ts` | Add type declarations for new methods |

## Key Files To Create

| File | Purpose |
|------|---------|
| `src/components/learn/blocks/AnimationBlock.tsx` | Elucim renderer component |
| `src/components/learn/blocks/VideoAssetBlock.tsx` | Manim video player component |
| `src/services/learn/services/animation.service.ts` | Manim subprocess + Elucim rendering logic |
