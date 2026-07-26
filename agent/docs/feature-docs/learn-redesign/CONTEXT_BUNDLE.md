# Learn Module Redesign — Context Bundle

## Project
DeskFlow Electron app — Lyceum "Learn" module. Dark glassmorphic UI. Tailwind CSS v4. React + Framer Motion.

---

## Scope
Redesign TWO surfaces:
1. **CreateLessonDialog** (`src/components/learn/CreateLessonDialog.tsx`) — 2-mode lesson creation dialog
2. **LearnPage welcome screen** (`src/components/learn/LearnPage.tsx`, lines ~274-328) — empty state shown when no lessons exist

---

## Design System Reference

### Colors (CSS vars)
```
--bg-primary:      #0a0a0a (zinc-950 base)
--bg-elevated:     #18181b (zinc-900)
--bg-glass:        rgba(24,24,27,0.80) + backdrop-blur
--accent-primary:   #ec4899 (pink-500)
--accent-secondary: #06b6d4 (cyan-400)
--text-primary:     #fafafa (zinc-50)
--text-secondary:  #a1a1aa (zinc-400)
--text-muted:      #52525b (zinc-600)
--border-subtle:    #27272a (zinc-800)
--border-active:    #3f3f46 (zinc-700)
--success:          #34d399 (emerald-400)
--error:           #f87171 (red-400)
--warning:         #fbbf24 (amber-400)
```

### Animation Tokens
```
fast:   150ms ease-out  (hover, toggle)
normal: 250ms ease-out  (modals, dropdowns)
slow:   400ms ease-out  (page transitions)
spring: for playful badges only
```

### Typography
```
Display:  32px/700   — hero numbers
H1:       18px/600   — page titles
H2:       15px/600   — section titles
Body+:    14px/400   — stat values
Body:     13px/400   — default
Meta:     12px/400   — timestamps, secondary
Badge:    11px/500   — status badges
Font:     Geist (sans) + JetBrains Mono (code)
```

### Border Radius
Max: `rounded-xl` (12px). Never `rounded-2xl` or larger.

### Card Padding
All cards: `p-5` (20px). Never `p-6` or `p-8`.

### Z-Index Scale
```
z-10: elevated cards
z-20: dropdowns, tooltips
z-30: modals, dialogs
z-40: toasts
z-50: overlays
```

---

## Current CreateLessonDialog Code

```tsx
// File: src/components/learn/CreateLessonDialog.tsx
// Current state: 458 lines
// Imports: React, motion/AnimatePresence (framer-motion), lucide-react icons, deskflowAPI via window

type Step = 'input' | 'prompt' | 'result';
type GenStatus = 'idle' | 'generating' | 'validating' | 'importing' | 'done' | 'error';
type InputMode = 'simple' | 'detailed';

// State:
const [step, setStep] = useState<Step>('input');
const [inputMode, setInputMode] = useState<InputMode>('simple');
const [userInput, setUserInput] = useState('');          // simple mode
const [description, setDescription] = useState('');       // detailed mode (was called 'topic')
const [contextDoc, setContextDoc] = useState('');
const [fileName, setFileName] = useState('');
const [numNodes, setNumNodes] = useState(5);            // detailed mode only
const [prompt, setPrompt] = useState('');
const [systemPrompt, setSystemPrompt] = useState('');
const [copied, setCopied] = useState(false);
const [genStatus, setGenStatus] = useState<GenStatus>('idle');
const [genError, setGenError] = useState('');
const [genResult, setGenResult] = useState<any>(null);
const [building, setBuilding] = useState(false);
const [validPrompt, setValidPrompt] = useState(false);

// IPC calls:
api.learnBuildPrompt({ userInput, contextDoc })  // simple mode
api.learnBuildPrompt({ topic, description, contextDoc, numNodes })  // detailed mode
api.learnGenerateLdoc({ prompt, systemPrompt })  // in-app generation

// Props:
open: boolean
onClose: () => void
onImported: () => void
```

### Current Dialog Structure
1. **Overlay**: `fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center`
2. **Dialog card**: `w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-zinc-700/60 bg-zinc-900/95 backdrop-blur-xl shadow-2xl`
3. **Header**: icon + title + close button, `px-6 py-4 border-b border-zinc-800`
4. **Step indicators**: 3 pills (Describe → Prompt → Result), `px-6 py-3 border-b border-zinc-800/50`
5. **Mode toggle** (input step only): Simple | Detailed segmented control, `px-6 py-3 border-b`
6. **Content area**: `flex-1 min-h-0 overflow-y-auto px-6 py-5`
7. **Footer**: Back/Cancel + primary action button, `px-6 py-4 border-t border-zinc-800`

### Current Issues
- Looks generic / "AI slop" — purple gradients everywhere, default Inter font feel
- Mode toggle uses 2 buttons with no visual distinction as active
- Simple mode textarea has no character limit guidance or visual interest
- The "Generate Prompt" CTA is a plain button with indigo-500 tint
- No micro-interactions on the mode toggle switch
- Empty reference material area looks unfinished
- The step indicators use plain pill shapes — no visual polish
- Footer button uses `rounded-xl` on a small button — slightly off proportion

### Step 2 (Prompt Preview) Issues
- Prompt `<pre>` block is plain monospace on a dark background
- Copy button is a basic toggle
- "Generate Here" card looks like an afterthought
- No visual hierarchy between the info callout and the prompt block

---

## Current LearnPage Welcome Screen Code

```tsx
// Lines 274-328 of src/components/learn/LearnPage.tsx
// Shown when: lessons.length === 0 && view === 'library'

// Current structure:
<div className="h-full flex flex-col items-center justify-center py-20 px-4">
  {/* Icon + heading */}
  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 border border-indigo-500/25 flex items-center justify-center mb-4">
    <BookOpen className="w-7 h-7 text-indigo-400" />
  </div>
  <h2 className="text-xl font-semibold text-zinc-100 mb-2">Welcome to Lyceum</h2>
  <p className="text-zinc-500 text-sm mb-8 text-center max-w-md">Learn any topic through structured, typed lessons...</p>

  {/* Primary CTA */}
  <button className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-medium...">
    <Wand2 className="w-4 h-4" /> Create New Lesson
  </button>

  {/* Secondary actions: 3 small buttons in a row */}
  <div className="flex items-center gap-2 w-full max-w-xs">
    <button>Try the example</button>
    <button>Import file</button>
    <button>Paste</button>
  </div>

  {/* Footer link */}
  <button className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300">
    <HelpCircle className="w-4 h-4" /> How it works
  </button>
</div>
```

### Current Issues
- Looks completely generic — any AI would produce exactly this layout
- The icon container uses `rounded-2xl` which exceeds the 12px radius limit
- No visual depth — flat buttons on a flat background
- The "Create New Lesson" button lacks visual prominence — it's just indigo-tinted
- The 3 secondary buttons have equal visual weight to the primary CTA
- No personality — the page should convey "this is a sophisticated learning tool"
- No ambient/decorative elements — completely static
- "How it works" link at the bottom feels tacked on

---

## IPC Endpoints

### learnBuildPrompt
```ts
// IPC: 'learn:buildPrompt'
// preload bridge: learnBuildPrompt(params)
// Simple mode params: { userInput: string; contextDoc?: string }
// Detailed mode params: { topic: string; description?: string; contextDoc?: string; numNodes?: number }
// Returns: { ok: boolean; prompt: string; systemPrompt: string; userPrompt: string; error?: string }
```

### learnGenerateLdoc
```ts
// IPC: 'learn:generateLdoc'
// preload bridge: learnGenerateLdoc({ prompt, systemPrompt })
// Returns: { ok: boolean; data?: { lessonId: string }; error?: string; validation?: ValidationResult }
```

---

## Required Behaviors

### CreateLessonDialog — Simple Mode
- Single textarea ("What do you want to learn?") — minimum 10 chars to enable Generate
- Optional reference material: paste OR file upload (no node count selector)
- On "Generate Prompt": IPC call → loading state → step 2 (prompt preview)
- Step 2 shows prompt in `<pre>`, Copy + Save buttons, "Generate Here" option
- Step 3 (result) shows success/error state

### CreateLessonDialog — Detailed Mode
- Topic textarea (required, min 3 chars)
- Optional reference material (paste OR file upload)
- Node count selector: 3, 4, 5, 6, 8 (5 is default, highlighted)
- On "Generate Prompt": IPC call → step 2
- Step 2 and 3 same as Simple Mode

### LearnPage Welcome Screen
- Always shown when `lessons.length === 0 && view === 'library'`
- Primary CTA: "Create New Lesson" → opens CreateLessonDialog
- Three secondary actions: Try example, Import file, Paste
- Footer: "How it works" link

---

## Anti-Slop Checklist (from frontend-external-infra skill)
- [ ] NOT default Inter/Geist-only pairing — verify correct Geist body + JetBrains Mono code
- [ ] NOT purple/indigo gradient-on-everything — use DeskFlow accent tokens deliberately
- [ ] Border radius: `rounded-xl` max (12px)
- [ ] Card padding: `p-5` (20px)
- [ ] Motion: respects `prefers-reduced-motion`
- [ ] Empty/loading/error states: exist and styled
- [ ] Icons: all from lucide-react, no emoji
- [ ] Accessibility: focus-visible rings use `--page-accent` pattern

---

## MCP Tool Recommendations (for the AI receiving this prompt)

Before coding, the receiving AI should consult these MCP tools:
1. **magicui** MCP — search for animated text, background effects, interactive card variants
2. **lucide** MCP — find the perfect icons for the mode toggle (AlignLeft, List, Wand2, BookOpen)
3. **reactbits** MCP — look for animated borders, text effects, hover interactions
4. **shadcn** MCP (if configured) — Dialog, Card, Textarea, Button, SegmentedControl components

The AI should pull actual component source code, not invent patterns from training data.
