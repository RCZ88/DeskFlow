# Context Bundle — Presentation Overlay Cards

> Self-contained codebase reference for the Specialist AI. All source code embedded inline — the Specialist has zero file access.

---

## 1. Overlay Studio Entry Point

### `src/features/overlay-studio/OverlayStudioPage.tsx` (129 lines)

The mode toggle is a simple `useState<'studio' | 'engine'>`. The StudioPageInner component renders either StudioShell (video pipeline) or ContentEngineWorkspace (8-stage content pipeline). Adding a third mode means extending the union to `'studio' | 'engine' | 'presentation'` and rendering a new PresentationWorkspace component.

Key code pattern:
```tsx
function StudioPageInner() {
  const { dispatch } = useStudio()
  const [mode, setMode] = useState<'studio' | 'engine'>('studio')
  // ... load sessions from localStorage ...
  return (
    <div className="flex flex-col h-full" data-page="studio">
      <div className="flex items-center gap-2 px-4 py-2 border-b ...">
        {/* Mode toggle buttons */}
        <button onClick={() => setMode('studio')} ...>Overlay Studio</button>
        <button onClick={() => setMode('engine')} ...>Content Engine</button>
      </div>
      <div className="flex-1 min-h-0">
        {mode === 'engine' ? <ContentEngineWorkspace /> : <StudioShell />}
      </div>
    </div>
  )
}
```

---

## 2. Overlay Studio State Types

### `src/features/overlay-studio/state/studioTypes.ts`

```ts
export type StudioStage = 'dashboard' | 'source' | 'transcript' | 'visual-evidence' | 'bridge' | 'cut-plan' | 'scene-plan' | 'visualizer' | 'export'

export type SessionStatus = 'created' | 'transcribing' | 'transcript_ready' | 'cut_plan_pending' | 'cut_plan_ready' | 'cut_plan_approved' | 'scene_plan_pending' | 'scene_plan_ready' | 'export_ready' | 'error'

export interface StudioSession {
  id: string; name: string; sourceVideoPath: string; sourceVideoName: string
  durationSec?: number; transcript?: any; cutPlan?: any; scenePlan?: DirectorCut
  status: SessionStatus; missingSource: boolean
  createdAt: string; updatedAt: string
  digest?: VisualDigest; objects?: DetectedObject[]; faces?: FaceRegion[]
}

export interface ManualBridgeState {
  mode: 'cut-plan' | 'scene-dsl' | 'visual-digest'; step: 'prompt' | 'paste' | 'validate'
  prompt: string; rawResponse: string; parsedJson: unknown | null
  validationChecks: Array<{ rule: string; message: string; passed: boolean }>
  isParsing: boolean; lastError: string | null
}
``r

---

## 3. Design Tokens

### `src/types/overlayStudio.ts`

```ts
export const CLEMENT_PROFILE = {
  colors: {
    background: '#0D1117', background_alpha: 230, stroke_color: '#000000', stroke_width: 3,
    accent_hook: '#FACC15', accent_body: '#FFFFFF', accent_caption: '#22D3EE',
    accent_keyword: '#FACC15', accent_bullet: '#22D3EE', grid_color: '#30363D',
  },
  canvas: { width: 1080, height: 1920 },
  face_cam_safe_zone: { x_min: 760, y_min: 1520, w: 320, h: 400 },
  text_safe_zone: { x: [40, 1040], y: [40, 1320] },
}

export type OverlayType = 'hook' | 'body' | 'caption' | 'bullet' | 'keyword'

export const OVERLAY_TYPE_CONFIG: Record<OverlayType, { label: string; color: string; maxWords: number }> = {
  hook:    { label: 'Hook',    color: '#fbbf24', maxWords: 8 },
  body:    { label: 'Body',    color: '#e2e8f0', maxWords: 12 },
  caption: { label: 'Caption', color: '#94a3b8', maxWords: 14 },
  bullet:  { label: 'Bullet',  color: '#22d3ee', maxWords: 10 },
  keyword: { label: 'Keyword', color: '#22d3ee', maxWords: 6 },
}

export type RendererType = 'card' | 'mermaid' | 'equation' | 'chart' | 'board' | 'manim'

export const RENDERER_CONFIG: Record<RendererType, { label: string; useFor: string; library: string; output: string }> = {
  card:     { label: 'Text Card',   useFor: 'Punchlines, one-line claims',       library: 'Pillow',           output: 'PNG' },
  mermaid:  { label: 'Diagram',     useFor: 'Systems, hierarchies, flows',       library: 'Mermaid.js',       output: 'SVG/PNG' },
  equation: { label: 'Equation',    useFor: 'Math formulas',                     library: 'KaTeX',            output: 'SVG' },
  chart:    { label: 'Chart',       useFor: 'Data, comparisons, boundaries',     library: 'matplotlib',       output: 'PNG' },
  board:    { label: 'Asset Board', useFor: 'Roles/actors with relations',       library: 'Pillow + Emoji',   output: 'PNG' },
  manim:    { label: 'Animation',   useFor: 'Animated math concept',             library: 'Manim Community',  output: 'MP4' },
}
``r

---

## 4. Existing Prompts

### `src/lib/overlayPrompts.ts` — PROMPT_SCENE_DSL (the visual planning prompt)

The AI receives a timestamped transcript and plans on-screen visuals using a renderer menu (card/mermaid/equation/chart/board/manim). Output is structured JSON with scene_id, start_time, end_time, renderer, title, source, emphasis_words, animation.

This is the CLOSEST existing pattern to what the presentation system needs — but it outputs a JSON DSL, not rendered HTML. The new system would need a similar prompt that outputs full HTML/CSS/JS slide content instead.

### `src/services/contentEngine/prompts.ts` — 16 prompts

Key prompt: `PROMPT_SCRIPT_FRAMES` — generates frame-by-frame scripts with retention evidence. Each frame has: index, duration, frame type (hook/value/transition/call_to_action/visual_only), spoken text, on-screen visual description, retention criteria scores.

This is relevant because the presentation system could consume these script frames as input — each frame becomes a slide.

---

## 5. Content Engine UI Primitives

### `src/features/content-engine/components/ui.tsx`

Shared components already available:
- `Card` — glass card (`bg-[rgba(24,24,27,0.60)] backdrop-blur-xl border border-white/[0.06] rounded-xl p-5`)
- `SectionHeader` — label + title + action
- `Chip` — inline badge (`border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 text-[10px]`)
- `Spinner` — loading indicator (amber color)
- `LoadingBlock` — centered loading state
- `EmptyState` — dashed border with icon + title + hint + action
- `ErrorState` — rose-colored error with retry
- `AmberButton` — primary CTA (`bg-[#f5c518] text-black`)
- `GhostButton` — secondary (`border-white/[0.06] bg-white/[0.04]`)
- `ConfirmIconButton` — two-step delete confirm
- `ScoreBar` — progress bar (red/amber/green by score)
- `StatusChip` — colored status badge
- `TextInput` / `TextArea` / `SelectInput` — form inputs with amber focus
- `FieldLabel` — uppercase label

---

## 6. Studio CSS Utilities

### `src/features/overlay-studio/studio.css`

```css
.studio-glass { @apply bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl; }
.studio-btn-primary { @apply bg-[#ec4899] text-zinc-950 font-semibold hover:bg-[#db2777]; }
.studio-btn-secondary { @apply border border-zinc-700/50 bg-zinc-800/50 text-zinc-300; }
.studio-btn-ghost { @apply text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50; }
.studio-skeleton { @apply animate-pulse rounded-lg bg-zinc-800/50; }
.studio-stagger-item { @apply opacity-0 translate-y-2; animation: studio-stagger-in 0.2s ease-out forwards; }
.studio-badge { @apply text-[11px] px-2 py-0.5 rounded-full font-medium; }
.studio-heading { @apply text-[15px] font-semibold text-zinc-200; }
``r

---

## 7. AI Call Chain Pattern

### How AI prompts are called (from `src/services/contentEngine/index.ts`)

```ts
// Registration pattern:
registerContentEngineHandlers(db, aiCall)

// AI call pattern inside handlers:
const response = await aiCall({
  prompt: buildScriptInput(episode, scheme, framework, lessons, reflection),
  systemPrompt: contentEngineSystem(scheme, rubric),
  temperature: 0.7,
  maxTokens: 4000,
})
const parsed = parseAiJson(response) // extracts JSON from markdown fence
``r

### Provider routing (from `src/services/providers/router.ts`)

```ts
const chain = buildChain(providerState, 'contentEngine')
const { result, usedProviderId } = await runWithFallback(prompt, { chain, temperature, maxTokens })
``r

Feature IDs in the union: `'researchDigest' | 'goalAssistant' | 'resumeBuilder' | 'category' | 'colors' | 'contentEngine'`

A new feature ID like `'presentation'` would need to be added to the router union.

---

## 8. Database Migration Pattern

### `ensureTables()` pattern (from `src/services/contentEngine/index.ts`)

```ts
db.exec(`
  CREATE TABLE IF NOT EXISTS content_ideas (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'raw',
    category TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`)

// Guarded ALTER for adding columns:
const columns = db.prepare("PRAGMA table_info(content_ideas)").all().map(c => c.name)
if (!columns.includes('new_column')) {
  db.exec(`ALTER TABLE content_ideas ADD COLUMN new_column TEXT DEFAULT ''`)
}
``r

---

## 9. IPC Bridge Pattern

### Preload bridge (from `src/preload.ts`)

```ts
// Content Engine bridge pattern:
contentEngine: {
  ideasList: () => ipcRenderer.invoke('content:ideas:list'),
  ideaSave: (payload) => ipcRenderer.invoke('content:ideas:save', payload),
  scriptGenerate: (payload) => ipcRenderer.invoke('content:script:generate', payload),
  // ... 33 methods total
}
``r

### DeskflowAPI types (from `src/types/deskflow-api.d.ts`)

```ts
interface DeskflowAPI {
  contentEngine: {
    ideasList: () => Promise<{ ok: boolean; data?: any[]; error?: string }>
    ideaSave: (payload: any) => Promise<{ ok: boolean; error?: string }>
    scriptGenerate: (payload: any) => Promise<{ ok: boolean; data?: any; error?: string }>
    // ...
  }
  // New presentation API would be:
  // presentation: { generate, export, list, get, update, delete }
}
``r

---

## 10. Available MCP Components (NOT installed yet)

| Component | Source | Use Case | Install? |
|-----------|--------|----------|----------|
| MagicCard | Already installed | Mouse-following gradient border | Yes — use as card wrapper |
| NeonGradientCard | Already installed | Animated glow border | Yes — hero/stat cards |
| GlareHover | Already installed | Diagonal glare sweep | Yes — hover states |
| AnimatedBeam | Magic UI MCP | SVG light beam connecting elements | TBD — flow diagrams |
| Particles | Magic UI MCP | Canvas floating dots | TBD — ambient backgrounds |
| TextAnimate | Magic UI MCP | blurInUp/slideUp by word/character | TBD — text entrances |
| NumberTicker | Magic UI MCP | Spring-animated counters | TBD — stat reveals |
| BentoGrid | Magic UI MCP | Feature showcase layout | TBD — multi-card slides |
| Confetti | Magic UI MCP | Celebration bursts | TBD — milestone slides |
| Meteors | Magic UI MCP | Shooting stars | TBD — dramatic reveals |
| BorderBeam | Already installed (⚠️ broken on this Chromium) | Animated border beam | No — broken mask-composite |
| Slider | Already installed | Custom range input | Yes — interactive controls |
| Select | Already installed | Glass dropdown | Yes — interactive controls |
| CodeBlock | Already installed (Learn system) | Syntax-highlighted code | Yes — code demo slides |

---

## 11. Lucide Icons for Presentation System

```tsx
import {
  Presentation, FileText, Play, Pause, Monitor,
  Pencil, Plus, Copy, Download, Share2, Settings,
  Maximize, ChartColumn, Terminal, Code, Image,
  CircleCheckBig, ChevronLeft, ChevronRight, Trash2,
} from 'lucide-react'
``r

---

## 12. The User's Locked Design Language

From the user's prompt spec:

``r
--bg: #0A0A0B
--surface: rgba(255, 255, 255, 0.03)
--border: rgba(255, 255, 255, 0.08)
--fg: #FAFAFA
--muted: #8B8B8B
--accent: #10b981 (Emerald)
--accent-2: #a855f7 (Violet)
--warning: #f59e0b (Amber)
``r

Typography: Inter for text, JetBrains Mono for code/math. Letter-spacing -0.02em on headers.

Aspect ratio: 8:9 container (max-width: 1080px, max-height: 960px, overflow: hidden).

No default browser UI — all custom components with glassmorphism.

Spring physics: `transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)`

Staggered entrance: CSS animation-delay incrementing by 50ms per element.

Micro-interactions: buttons scale to 0.98 on click, hover states brighten borders.

---

## 13. Context Gaps Summary

| Gap | Specialist Input Needed |
|-----|------------------------|
| Slide rendering engine | iframe srcdoc vs React components? |
| Export transparency | html2canvas vs SVG vs Canvas? |
| Prompt structure | Single HTML per slide vs JSON deck? |
| Interactive components | Pure CSS/HTML vs React-in-iframe vs Web Components? |
| MCP component selection | Which animations justify complexity? |
| Internal editing | Drag-and-drop in-place vs regenerate-only? |
| Episode integration | How do script frames map to slides? |
| DB schema | What fields does a presentation session need? |