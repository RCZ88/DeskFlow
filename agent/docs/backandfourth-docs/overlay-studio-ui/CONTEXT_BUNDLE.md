# Context Bundle — Overlay Studio UI Redesign

## Project Overview
DeskFlow Electron app (React + Tailwind + Framer Motion). The Overlay Studio is a new page at `/studio` that handles video overlay generation: transcript → AI cut plan → scene visualization → export.

## Current State
- **Backend:** Python scripts in `python/` (phases 1–2.5 complete)
- **Frontend:** `src/pages/FeatureStudioPage.tsx` — single-file page with 6 views
- **Design system:** Glassmorphism dark theme, zinc-950 base, pink-500 accent, cyan-400 info

---

## FILE 1: src/pages/FeatureStudioPage.tsx (the main UI — 599 lines)

```tsx
import { useCallback, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Check, ChevronRight, Clipboard, ClipboardCheck, Download, FileJson, Film, Info, Layers, Loader2, Pause, Play, Plus, RefreshCcw, Sparkles, Upload, Wand2, X } from 'lucide-react'
import { PROMPT_CUT_PLANNER, PROMPT_SCENE_DSL } from '../lib/overlayPrompts'
import { extractJson, validateCutPlan, validateSceneDSL, allPassed, passedCount, generateRepairPrompt } from '../lib/overlayParser'

const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`

const SAMPLE_TRANSCRIPT = {
  video_id: 'sample_tutorial', duration: 320.5,
  segments: [
    { id: 0, start: 0.0, end: 5.2, text: 'Welcome to this tutorial. Today we are going to cover three important concepts.' },
    { id: 1, start: 5.5, end: 15.8, text: 'The first concept is the foundation. Without understanding this, everything else falls apart.' },
    { id: 2, start: 16.2, end: 28.0, text: 'Let me show you a comparison between the old approach and the new approach.' },
    { id: 3, start: 28.5, end: 42.0, text: 'Now let me explain how this works in practice. You can see the results here.' },
    { id: 4, start: 42.5, end: 58.0, text: 'The key metric to watch is the efficiency ratio. When this number goes up, performance improves.' },
    { id: 5, start: 58.5, end: 75.0, text: 'In summary, these three concepts form the basis of everything we will cover in this series.' },
  ]
}

// [FULL 599-LINE FILE CONTINUES — see src/pages/FeatureStudioPage.tsx]
// Key structures:
// - 6 views: dashboard, upload, transcript, bridge, cutplan, visualize
// - ToolCard component (icon, title, description, status, onClick)
// - ValidationChecklist component (checks array → pass/fail per rule)
// - Manual Bridge: 3-step wizard (prompt → paste → validate)
// - Multi-video support: video library sidebar
// - Pipeline status bar (Transcript → Cut Plan → Scenes → Export)
```

---

## FILE 2: src/types/overlayStudio.ts (data types)

```typescript
export type OverlayType = 'hook' | 'body' | 'caption' | 'bullet' | 'keyword'
export type AnimationIn = 'fade' | 'slide_up' | 'pop'
export type AnimationOut = 'fade' | 'slide_down'

export interface Overlay {
  id: string; start_time: number; end_time: number; type: OverlayType;
  text: string; emphasis_words: string[];
  animation: { in: AnimationIn; out: AnimationOut }
}

export interface DirectorCut {
  metadata: { style_profile: string; target_aspect: string; total_duration_sec: number }
  overlays: Overlay[]
}

export const OVERLAY_TYPE_CONFIG: Record<OverlayType, { label: string; color: string; maxWords: number }> = {
  hook: { label: 'Hook', color: '#fbbf24', maxWords: 8 },
  body: { label: 'Body', color: '#e2e8f0', maxWords: 12 },
  caption: { label: 'Caption', color: '#94a3b8', maxWords: 14 },
  bullet: { label: 'Bullet', color: '#22d3ee', maxWords: 10 },
  keyword: { label: 'Keyword', color: '#22d3ee', maxWords: 6 },
}

export const CANVAS_WIDTH = 270
export const CANVAS_HEIGHT = 480
export const FACE_CAM_ZONE = { x: 190, y: 380, w: 80, h: 100 }
```

---

## FILE 3: src/lib/overlayPrompts.ts (AI prompts)

```typescript
export const PROMPT_CUT_PLANNER = `You are a strict JSON-only API endpoint... [full 2000-char prompt for cut planning]`
export const PROMPT_SCENE_DSL = `You are a strict JSON-only API endpoint... [full 2000-char prompt for scene DSL]`
export function buildRepairPrompt(errors, failedOutput) { ... }
```

---

## FILE 4: src/lib/overlayParser.ts (validation pipeline)

```typescript
export function extractJson(raw: string): any { ... }  // 6-step JSON extraction
export function validateCutPlan(data, transcript): ValidationError[] { ... }
export function validateSceneDSL(data, transcript?): ValidationError[] { ... }
export function generateRepairPrompt(failedOutput, errors): string { ... }
export function allPassed(checks): boolean { ... }
export function passedCount(checks): { passed, total } { ... }
```

---

## FILE 5: python/clement/contracts/style.py (design tokens)

```python
class ColorPalette(BaseModel):
    background: str = '#0D1117'
    background_90: str = '#0D1117E6'
    surface_1: str = '#161B22'
    surface_2: str = '#21262D'
    stroke: str = '#000000'
    stroke_width: int = 3
    grid: str = '#30363D'
    text_primary: str = '#FFFFFF'
    text_secondary: str = '#C9D1D9'
    text_muted: str = '#8B949E'
    hook: str = '#FACC15'
    caption: str = '#22D3EE'
    keyword: str = '#FACC15'
    bullet: str = '#22D3EE'
    positive: str = '#34D399'
    negative: str = '#FB7185'
    info: str = '#60A5FA'
    warning: str = '#F59E0B'
    error: str = '#EF4444'

class SafeZone(BaseModel):
    x: int; y: int; w: int; h: int
    mode: str = 'forbidden'  # forbidden | discouraged | reserved | preferred
    weight: float = 1.0
    applies_to: List[str] = ['*']
```

---

## FILE 6: python/config/profiles/clement_dark_tech_v2.yaml (full profile)

```yaml
id: clement_dark_tech_v2
version: '2.0'
modes:
  card:
    hook: {family: Anton-Bold.ttf, size: 64, max_chars_per_line: 8, max_lines: 2}
    body: {family: LeagueSpartan-Regular.ttf, size: 48}
    caption: {family: Montserrat-Regular.ttf, size: 40}
    keyword: {family: Montserrat-Bold.ttf, size: 44, color: '#22D3EE'}
  scene:
    hook: {family: Anton-Bold.ttf, size: 96, min_size: 68}
    body: {family: LeagueSpartan-Regular.ttf, size: 58, min_size: 42}
    caption: {family: Montserrat-Regular.ttf, size: 46, min_size: 38}
    keyword: {family: Montserrat-Bold.ttf, size: 60, min_size: 44, color: '#22D3EE'}
    chapter: {family: LeagueSpartan-Regular.ttf, size: 74, min_size: 56, weight: 700}
    mono: {family: JetBrainsMono-Bold.ttf, size: 34, min_size: 26, weight: 600, color: '#22D3EE'}
colors:
  background: '#0D1117'
  surface_1: '#161B22'
  text_primary: '#FFFFFF'
  hook: '#FACC15'
  caption: '#22D3EE'
safe_zones:
  - {name: text_safe, x: 40, y: 40, w: 1000, h: 1280, mode: preferred, applies_to: ['*']}
  - {name: face_cam, x: 760, y: 1120, w: 320, h: 400, mode: discouraged, weight: 8, applies_to: ['panel','graph','screenshot','recording']}
  - {name: captions, x: 80, y: 1420, w: 920, h: 300, mode: reserved, weight: 0, applies_to: ['caption']}
  - {name: platform_ui_right, x: 930, y: 250, w: 150, h: 1370, mode: forbidden, weight: 1000000, applies_to: ['*']}
```

---

## FILE 7: python/clement/extraction/rules_v2.py (extraction engine)

```python
# 13 intents from v2 §3.2
INTENTS = ['hook', 'definition', 'comparison', 'list', 'process', 'example',
           'equation', 'metric', 'graph', 'chapter', 'screenshot', 'recording', 'cta']

# 6-component scoring formula
score = 0.25 × intent_strength + 0.20 × position_weight + 0.20 × info_density
      + 0.15 × novelty + 0.10 × visualizability + 0.10 × source_confidence

# Dedup: overlap ≥ 60% AND (Jaccard ≥ 0.7 OR same intent)
# Merge: gap ≤ 0.35s, hook+CTA and chapter+caption never merge
# Cooldowns: major/3s, hook/10s, keyword/8s, chapter/12s
# Density cap: 65% of transcript
```

---

## FILE 8: python/clement/animation/evaluator.py (animation presets)

```python
PRESETS = {
    'fade_in': build_fade_in, 'fade_out': build_fade_out,
    'slide_up': build_slide_up, 'slide_left': build_slide_left,
    'slide_right': build_slide_right, 'pop': build_pop,
    'panel_enter': build_panel_enter, 'panel_exit': build_panel_exit,
    'mask_wipe_left': build_mask_wipe_left,
}
# panel_enter/exit return tuple of (opacity_track, y_track)
# mask_wipe_left animates clip_x from 0 to 1
```

---

## FILE 9: python/clement/registry/registry.py (Template ABC)

```python
class TemplatePlugin(ABC):
    definition: TemplateDefinition
    @abstractmethod
    def validate_props(self, props: TemplateProps) -> ValidationResult: ...
    @abstractmethod
    def build_scene_graph(self, props, ctx) -> SceneGraph: ...
    @abstractmethod
    def build_animation(self, scene, ctx) -> AnimationTimeline: ...

class TemplateRegistry:
    def register(self, plugin): ...
    def get(self, template_id): ...
    def list_for_intent(self, intent): ...
    def choose(self, shot_intent, text_length, duration_s): ...
    def load_definitions(self, templates_dir): ...
```

---

## FILE 10: python/main.py (CLI)

```python
# Subcommands: ingest → extract → plan → validate → render → composite → export
# Each stage writes immutable artifacts under build/
# Usage: python main.py ingest --input video.json --output transcript.json
```

---

## Design Tokens (from src/index.css)

```
--bg-primary: #09090b
--bg-glass: rgba(24, 24, 27, 0.80)
--border-glass: rgba(63, 63, 70, 0.50)
--accent-primary: #ec4899 (pink)
--accent-secondary: #22d3ee (cyan)
--text-primary: #f4f4f5
--text-secondary: #a1a1aa
--text-muted: #52525b
--ease-out: cubic-bezier(0.16, 1, 0.3, 1)
```

## Environment Status
- Python 3.12 ✅, faster-whisper ✅, ffmpeg ❌, Ollama ❌, mermaid-cli ❌
- Manual Bridge is the only working path (no external dependencies needed)
