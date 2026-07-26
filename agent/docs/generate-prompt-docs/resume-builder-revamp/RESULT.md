# 🤝 AI Collaboration Bridge — Resume Builder Revamp
## Round 3 Initialization Package

---

> **INSTRUCTION FOR THE AI CODING AGENT:**
> This is a **revamp/iteration** round. The Resume Builder module already exists 
> and is functional. You explored it in Round 1. The Project Owner now wants 
> **5 specific enhancements** based on real usage feedback.
> 
> **DO NOT rebuild from scratch.** Modify existing files. Preserve all 
> existing functionality. Add the 5 new features.

---

# PART 1: WHAT WE'RE REVAMPING

## Current State (You Already Know This)

The Resume Builder module exists with:
- `/resume` Hub page (ScoreGauge, ActivityFeed, VersionList)
- `/resume/build` Builder page (7-phase sequential questionnaire + live preview)
- `/resume/import` Import page (manual chat paste + takeaway review)
- `/resume/preview` Preview page (full-screen resume)
- `/resume/export` Export page (PDF/Markdown export)
- Zustand store (`resumeStore.ts`) with all state + IPC calls
- SQLite backend with JSON file-based persistence
- Electron IPC bridge (`window.deskflowAPI.resume.*`)
- 25+ shadcn/Magic UI components
- DeskFlow design system (glass morphism, zinc palette, indigo accent)

## The 5 New Features

### Feature 1: Non-Linear Phase Navigation
**Current:** Users MUST complete phases 1→2→3→...→7 in order. Locked phases are disabled.
**Desired:** Users can click ANY phase tab and jump freely. Warning toast if skipping ahead.

### Feature 2: Voice Input (Web Speech API)
**Current:** Only text/textarea/metric/tags/slider input types. Heavy typing for long answers.
**Desired:** Microphone button on text/textarea inputs. Local speech-to-text via Chromium's built-in `SpeechRecognition`. No external services.

### Feature 3: Resizable Preview Panel
**Current:** Preview is fixed 400px width, hardcoded 50% scale. Not adjustable.
**Desired:** Draggable divider between builder and preview. Width persisted to localStorage. Min 300px, max 60% viewport. Smooth drag with `requestAnimationFrame`.

### Feature 4: Detailed Answer Guides
**Current:** Questions show `text` + `whyItMatters` + `exampleAnswer`. No guidance on what to include/exclude.
**Desired:** Collapsible guide below each question: "Include" (green), "Exclude" (red), "Pro Tips" (amber). Helps users write stronger answers.

### Feature 5: AI Provider Settings
**Current:** AI calls hardcoded to OpenAI. No UI to configure provider, API key, or model.
**Desired:** Settings panel with provider selector (OpenAI, Anthropic, Local/Ollama), API key input, model dropdown, temperature slider, test connection button.

---

# PART 2: CURRENT CODE THAT MUST CHANGE

## File 1: PhaseNavigator.tsx (Remove Lock)

```tsx
// src/features/resume/components/PhaseNavigator.tsx
// CURRENT — blocks non-linear navigation:
<button
  onClick={() => status !== 'locked' && onPhaseClick(phase)}
  disabled={status === 'locked'}  // ← REMOVE THIS
  className={`... ${
    status === 'locked' ? 'cursor-not-allowed opacity-50' : ''  // ← REMOVE THIS
  }`}
>
```

**Changes needed:**
1. Remove `disabled` prop
2. Remove `cursor-not-allowed opacity-50` styling for locked phases
3. Replace with subtle styling: `bg-zinc-800/50 text-zinc-400 ring-1 ring-zinc-700/30`
4. Add completion dot: green (all answered), amber (partial), gray (none)
5. All phases clickable — `onPhaseClick` fires for any phase

## File 2: ResumeBuilderPage.tsx (Add Warning + Resizable)

```tsx
// src/pages/ResumeBuilderPage.tsx
// CURRENT — fixed 400px preview:
<div className="w-[400px] shrink-0 overflow-y-auto max-lg:hidden">
  <ResumePreview content={resumeContent} mode="styled" scale={50} />
</div>

// CURRENT — no voice input:
<AnswerInput inputType={currentQuestion.inputType} ... />
// AnswerInput only supports: text, textarea, metric, tags, slider

// CURRENT — no question guides:
<QuestionCard question={currentQuestion} />
// QuestionCard only renders: text, whyItMatters, exampleAnswer
```

**Changes needed:**
1. Replace fixed-width preview with `ResizablePanel` component
2. Integrate `VoiceInput` into `AnswerInput` for text/textarea types
3. Render `QuestionGuide` below `QuestionCard`
4. Add warning toast when user jumps to a phase with incomplete prior phases
5. Track "active phase" separately from "completed phases"

## File 3: AnswerInput.tsx (Add Voice)

```tsx
// src/features/resume/components/AnswerInput.tsx
// CURRENT input types: text | textarea | metric | tags | slider | select
// MISSING: voice input capability
```

**Changes needed:**
1. Add `voice` as a new input capability (not a new type — voice augments text/textarea)
2. Show mic button inside text/textarea inputs
3. Use `window.SpeechRecognition` (with `webkitSpeechRecognition` fallback)
4. Configuration: `{ continuous: true, interimResults: true, lang: 'en-US' }`
5. Append transcribed text to existing value (don't replace)
6. Show real-time transcript preview while recording
7. Auto-stop after 30 seconds of silence
8. If not available, hide button gracefully

## File 4: Question type (Extend Interface)

```typescript
// src/types/resume.ts
// CURRENT Question interface:
export interface Question {
  id: string;
  phase: number;
  phaseName: string;
  questionNumber: string;
  text: string;
  whyItMatters: string;
  inputType: 'text' | 'textarea' | 'metric' | 'tags' | 'slider' | 'select';
  exampleAnswer: string;
  showExample: boolean;
  validation: { minLength?: number; requiresMetric?: boolean; metricTypes?: string[] };
}

// MISSING fields:
// guideInclude?: string[];
// guideExclude?: string[];
// guideTips?: string[];
```

**Changes needed:**
1. Add `guideInclude`, `guideExclude`, `guideTips` optional fields to `Question` interface
2. Backend (`main.ts`) must populate these fields in the question objects
3. The AI prompt for `questionnaire-ai.md` must be updated to generate these guides

## File 5: ResumePreview.tsx (Add Scale Control)

```tsx
// src/features/resume/components/ResumePreview.tsx
// CURRENT: scale is a prop, controlled by parent
// In builder: hardcoded to 50%
// In preview page: hardcoded to 65%
```

**Changes needed:**
1. Add zoom controls (buttons: 50%, 65%, 75%, 100%, 125%)
2. In builder, show zoom controls in preview panel header
3. In preview page, show zoom controls in toolbar

## File 6: main.ts (Add AI Provider Config)

```typescript
// src/main.ts
// CURRENT: Hardcoded OpenAI client
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: getApiKeyFromSettings() });

// MISSING: Configurable provider system
```

**Changes needed:**
1. Create `AiProviderConfig` interface: `{ provider, apiKey, model, temperature, baseUrl? }`
2. Add IPC handlers: `resume:getAiSettings`, `resume:saveAiSettings`, `resume:testAiConnection`
3. Refactor all AI calls to use configurable provider
4. Support: OpenAI, Anthropic, local/Ollama
5. Store settings in SQLite (new table: `ai_settings` or in existing settings)

---

# PART 3: NEW COMPONENTS TO CREATE

## Component 1: ResizablePanel

```typescript
// src/features/resume/components/ResizablePanel.tsx
interface ResizablePanelProps {
  defaultWidth: number;      // e.g., 400
  minWidth: number;          // e.g., 300
  maxWidth: number | string; // e.g., '60vw' or 800
  direction: 'horizontal' | 'vertical';
  onResize?: (width: number) => void;
  storageKey?: string;       // e.g., 'resume-preview-width'
  children: React.ReactNode;
}
```

**Behavior:**
- Drag handle: 4px wide bar with grip icon
- Hover: `bg-zinc-700`, active drag: `bg-indigo-500`
- Cursor: `col-resize`
- Smooth resize with `requestAnimationFrame`
- Store final width to localStorage on drag end
- Restore from localStorage on mount
- On mobile (< 768px): collapses to toggleable overlay

## Component 2: VoiceInput

```typescript
// src/features/resume/components/VoiceInput.tsx
interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  lang?: string; // default 'en-US'
}
```

**Behavior:**
- Mic button inside text input (right side)
- Idle: `Mic` icon, `text-zinc-500 hover:text-zinc-300`
- Recording: `MicOff` icon, `text-red-400`, pulsing `animate-pulse`
- Click to start/stop recording
- Append transcript to existing value (don't replace)
- Show "Listening..." label + transcript preview while recording
- Auto-stop after 30 seconds of silence
- If `SpeechRecognition` not available: hide button, no error
- Support continuous recording for long answers

## Component 3: QuestionGuide

```typescript
// src/features/resume/components/QuestionGuide.tsx
interface QuestionGuideProps {
  include?: string[];
  exclude?: string[];
  tips?: string[];
  defaultExpanded?: boolean;
}
```

**Behavior:**
- Collapsible section below question card
- Include items: `CheckCircle` icon, `text-emerald-400`
- Exclude items: `XCircle` icon, `text-red-400`
- Tips: `Lightbulb` icon, `text-amber-400`
- Default expanded for first-time users, collapsed after
- Small text (11px), muted background
- Smooth expand/collapse animation (250ms)

## Component 4: AiSettings

```typescript
// src/features/resume/components/AiSettings.tsx
interface AiSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AiProviderConfig) => void;
}

interface AiProviderConfig {
  provider: 'openai' | 'anthropic' | 'ollama';
  apiKey: string;
  model: string;
  temperature: number;
  baseUrl?: string; // for local/Ollama
}
```

**Behavior:**
- Modal dialog (using existing `dialog.tsx`)
- Provider selector: clickable cards with provider name
- API key input: masked with eye toggle (show/hide)
- Model selector: dropdown populated per provider
- Temperature slider: 0-1 range, step 0.1
- Test connection button: sends simple prompt, shows success/failure
- Connection status: green dot (connected), red dot (failed), gray dot (not tested)
- Save button: stores to SQLite via IPC

---

# PART 4: DESIGN SPECS

## Phase Navigator Update

```
All phases clickable (no disabled state)

Locked phase (not started):
  bg: bg-zinc-800/50
  text: text-zinc-400
  ring: ring-1 ring-zinc-700/30
  hover: hover:bg-zinc-800 hover:text-zinc-300

Active phase:
  bg: bg-indigo-500/20
  text: text-indigo-400
  ring: ring-1 ring-indigo-500/30

Completed phase:
  bg: bg-emerald-500/10
  text: text-emerald-400
  ring: ring-1 ring-emerald-500/30

Completion dot (small circle, 6px):
  All answered: bg-emerald-400
  Partial: bg-amber-400
  None: bg-zinc-600
```

## Voice Input Button

```
Position: Absolute right side of input field, inside padding
Size: 32px x 32px

Idle:
  Icon: Mic (lucide)
  Color: text-zinc-500
  Hover: text-zinc-300 bg-zinc-800 rounded-full

Recording:
  Icon: MicOff (lucide)
  Color: text-red-400
  Animation: animate-pulse
  Background: bg-red-500/10 rounded-full
  Label: "Listening..." (small, red, below button)

Disabled (not supported):
  Hidden completely
```

## Resizable Divider

```
Width: 4px
Background: bg-zinc-700
Hover: bg-zinc-500
Active drag: bg-indigo-500
Cursor: col-resize

Grip icon: GripVertical (lucide), centered, 16px
  Color: text-zinc-500
  Hover: text-zinc-300

Transition: none during drag (instant), 150ms on hover
```

## Question Guide

```
Container: bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 mt-3

Header (clickable to expand/collapse):
  Text: "Answer Guide" + ChevronDown/ChevronUp
  Font: 12px, font-semibold, text-zinc-300

Include section:
  Icon: CheckCircle, text-emerald-400, 14px
  Text: text-emerald-400/90, 11px
  Items: bulleted list

Exclude section:
  Icon: XCircle, text-red-400, 14px
  Text: text-red-400/90, 11px
  Items: bulleted list

Tips section:
  Icon: Lightbulb, text-amber-400, 14px
  Text: text-amber-400/90, 11px
  Items: bulleted list

Animation: height transition 250ms, ease-out
```

## AI Settings Modal

```
Dialog: standard dialog.tsx pattern
  Size: max-w-md
  Header: "AI Provider Settings"

Provider cards (grid, 3 columns):
  Card: bg-zinc-800 border border-zinc-700 rounded-xl p-4 cursor-pointer
  Selected: ring-2 ring-indigo-500 bg-indigo-500/10
  Hover: hover:bg-zinc-700

API key input:
  Type: password (masked)
  Toggle: Eye/EyeOff icon to show/hide
  Placeholder: "sk-..." or "Enter API key"

Model selector:
  Dropdown: select component or custom dropdown
  Options populated based on provider

Temperature slider:
  Range: 0 to 1, step 0.1
  Label: "Creativity: {value}"
  Low (0): "Precise", High (1): "Creative"

Test button:
  Text: "Test Connection"
  Loading: Spinner icon
  Success: "Connected ✓" green
  Failure: "Failed ✗" red

Save button:
  Primary button, disabled until valid
```

---

# PART 5: BACKEND CHANGES

## New IPC Handlers

```typescript
// Add to preload.ts
resume: {
  // ... existing handlers ...
  getAiSettings: () => ipcRenderer.invoke('resume:getAiSettings'),
  saveAiSettings: (settings) => ipcRenderer.invoke('resume:saveAiSettings', settings),
  testAiConnection: (settings) => ipcRenderer.invoke('resume:testAiConnection', settings),
}

// Add to main.ts
ipcMain.handle('resume:getAiSettings', async () => {
  const settings = db.prepare('SELECT * FROM ai_settings WHERE id = 1').get();
  return settings || defaultAiSettings;
});

ipcMain.handle('resume:saveAiSettings', async (event, settings) => {
  db.prepare(`
    INSERT INTO ai_settings (id, provider, api_key, model, temperature, base_url, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      provider = excluded.provider,
      api_key = excluded.api_key,
      model = excluded.model,
      temperature = excluded.temperature,
      base_url = excluded.base_url,
      updated_at = excluded.updated_at
  `).run(settings.provider, settings.apiKey, settings.model, settings.temperature, settings.baseUrl);
  return { success: true };
});

ipcMain.handle('resume:testAiConnection', async (event, settings) => {
  try {
    const client = createAiClient(settings);
    const response = await client.chat.completions.create({
      model: settings.model,
      messages: [{ role: 'user', content: 'Say "Connection successful" and nothing else.' }],
      max_tokens: 10,
    });
    return { success: true, message: response.choices[0].message.content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

## New Database Table

```sql
CREATE TABLE IF NOT EXISTS ai_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  provider TEXT DEFAULT 'openai',
  api_key TEXT,
  model TEXT DEFAULT 'gpt-4o',
  temperature REAL DEFAULT 0.3,
  base_url TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

## Refactor AI Calls

```typescript
// main.ts — Refactor all AI engine calls to use configurable provider

function createAiClient(settings: AiProviderConfig) {
  switch (settings.provider) {
    case 'openai':
      return new OpenAI({ apiKey: settings.apiKey });
    case 'anthropic':
      return new Anthropic({ apiKey: settings.apiKey });
    case 'ollama':
      return new OpenAI({ 
        apiKey: 'ollama', 
        baseURL: settings.baseUrl || 'http://localhost:11434/v1' 
      });
    default:
      throw new Error(`Unknown provider: ${settings.provider}`);
  }
}

async function callAiEngine(engineName: string, input: any) {
  const settings = await getAiSettings();
  const client = createAiClient(settings);
  const prompt = loadPrompt(engineName); // from agent/skills/resume-builder/prompts/

  const response = await client.chat.completions.create({
    model: settings.model,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: JSON.stringify(input) }
    ],
    response_format: { type: 'json_object' },
    temperature: settings.temperature,
  });

  return JSON.parse(response.choices[0].message.content);
}

// Then all handlers use callAiEngine:
ipcMain.handle('resume:nextQuestion', async (event, state) => {
  return callAiEngine('questionnaire-ai', state);
});

ipcMain.handle('resume:extractFromChat', async (event, transcript, source) => {
  return callAiEngine('chat-extractor', { transcript, source });
});

ipcMain.handle('resume:compileResume', async (event, data) => {
  return callAiEngine('resume-compiler', data);
});

ipcMain.handle('resume:runHrReview', async (event, resumeDraft, targetJd) => {
  return callAiEngine('hr-reviewer', { resumeDraft, targetJd });
});
```

---

# PART 6: UX INTERACTION FLOWS

## Flow 1: Non-Linear Navigation
1. User on Phase 1 (Foundation), clicks Phase 4 (Skills) tab
2. Phase 4 becomes active, loads first question
3. Toast appears: "You're jumping ahead. The preview may show partial data until you complete earlier phases."
4. User answers Phase 4 questions normally
5. Phase 4 status changes to "in_progress"
6. User can click back to Phase 1 anytime
7. Preview updates with whatever data exists (may be partial)

## Flow 2: Voice Input
1. User sees microphone icon inside textarea
2. Clicks mic → icon turns red, pulses, "Listening..." appears
3. User speaks → text appears in real-time in textarea
4. User clicks mic again → recording stops, final text appended
5. User can continue typing after voice input
6. If SpeechRecognition not available → mic button hidden, no error

## Flow 3: Resizable Preview
1. User sees divider between builder and preview panels
2. Hovers divider → cursor changes to `col-resize`, handle highlights
3. Drags left/right → preview panel resizes smoothly
4. Reaches min (300px) or max (60% viewport) → stops resizing
5. Releases mouse → width saved to localStorage (`resume-preview-width`)
6. Next visit → restores preferred width
7. On mobile (< 768px): preview collapses to toggleable overlay

## Flow 4: Question Guide
1. Question card renders with guide section below
2. Guide shows "Include", "Exclude", "Tips" with colored icons
3. User can click header to collapse/expand
4. First question: expanded by default
5. Subsequent questions: collapsed by default (remember preference in localStorage)

## Flow 5: AI Settings
1. User clicks "AI Settings" button on Resume hub or in builder
2. Modal opens with current settings
3. User selects provider, enters API key, chooses model
4. Clicks "Test Connection" → shows loading → success/failure
5. Clicks "Save" → stores to SQLite, closes modal
6. All subsequent AI calls use new settings

---

# PART 7: CONSTRAINTS

1. **Preserve existing functionality** — Chat import, export, versions, reports must all still work
2. **Use existing UI components** — Button, Input, Badge, Dialog, Tabs, Progress, Skeleton from `src/components/ui/`
3. **Follow DeskFlow design system** — Glass morphism, `rounded-xl`, `p-5`, indigo accent, zinc palette
4. **Support reduced motion** — `prefers-reduced-motion` media query
5. **Work in Electron (Chromium)** — Web Speech API is available
6. **No breaking changes to IPC** — Add new handlers, don't modify existing ones' signatures
7. **SQLite only** — No PostgreSQL, no new dependencies unless necessary
8. **TypeScript strict** — All new code must be typed

---

# PART 8: FILE CHANGE LIST

## Modify These Files:
1. `src/features/resume/components/PhaseNavigator.tsx` — Remove lock, add completion dots
2. `src/pages/ResumeBuilderPage.tsx` — Add ResizablePanel, VoiceInput, QuestionGuide, warning toast
3. `src/features/resume/components/AnswerInput.tsx` — Integrate VoiceInput for text/textarea
4. `src/features/resume/components/ResumePreview.tsx` — Add zoom controls
5. `src/types/resume.ts` — Extend Question interface with guide fields
6. `src/stores/resumeStore.ts` — Add AI settings state/actions
7. `src/preload.ts` — Add new IPC handlers
8. `src/main.ts` — Add AI settings handlers, refactor AI calls
9. `src/pages/ResumePage.tsx` — Add AI Settings button/modal

## Create These Files:
1. `src/features/resume/components/ResizablePanel.tsx` — NEW
2. `src/features/resume/components/VoiceInput.tsx` — NEW
3. `src/features/resume/components/QuestionGuide.tsx` — NEW
4. `src/features/resume/components/AiSettings.tsx` — NEW

## Update These Prompts:
1. `agent/skills/resume-builder/prompts/questionnaire-ai.md` — Add guide generation

---

# PART 9: CONVERSATION PROTOCOL

## Your Rules (Specialist AI):
1. **Ask about specific files** if you need to see current implementation details
2. **One change at a time** — Don't try to implement all 5 features in one go
3. **Preserve existing code** — Only modify what's necessary
4. **Flag any file that doesn't exist** — Don't assume paths
5. **When converged, produce RESULT.md** with implementation plan

## State Tracker:
```
Round 3 (Revamp):
- Feature 1: Non-Linear Navigation — [TBD]
- Feature 2: Voice Input — [TBD]
- Feature 3: Resizable Preview — [TBD]
- Feature 4: Answer Guides — [TBD]
- Feature 5: AI Provider Settings — [TBD]
```

## What I Need From You:
1. **Component Architecture** — How the 4 new components fit into existing tree
2. **State Management Updates** — What changes to Zustand store
3. **IPC Handler Specs** — Exact signatures for new handlers
4. **Implementation Order** — Which feature to build first (suggest: Phase Navigator → Voice → Resizable → Guides → AI Settings)
5. **Edge Cases** — What happens when user jumps phases, voice fails, preview is too narrow, etc.

**Start by asking me any specific files you need to see, or propose your implementation plan.**

---

*End of Round 3 Initialization Package.*
