# CONTEXT_BUNDLE.md — Resume Builder Revamp

## User's Raw Request (Verbatim)

"it should be that the user is able to freely navigate between which steps that they want to do first. So, I mean, it will break the system in a sense that the preview is going to be bad or something like that. It needs to be warned, but I'm going to make sure to update the system so that we're able to have a feature where it's very dynamic and it's very free for the user to have their own way and steps and not everything needs to be methodically the same. Everyone can have their own steps on which to complete first and so on and so forth. So, if it's something that is complicated and stuff, I would like you to use the Generate Prompt Skill to tackle this and also the UI and everything. It's like really, really, really, really, really, really, really, really, really extra bad. So, what I would like you to do is to also use all those skills along with the Generate Prompt Skill to make sure that it's showing the resume properly and we can resize the display preview of the resume and there's also like proper showing of those stuff and like it needs to be that so that we can also voice input, right? So, I mean, aside from just a user text input, voice input inside of that, internally, locally in the application also be nice, that the user didn't have to use the external voice recording text, which to text feature on those to make your work properly so that long stuff, long inputs can be done very much easier than compared to typing it. And that's pretty much it. also not to mention like the detailed guides on like the instructions on how to answer stuff and what to include and not include and everything like that. how is the ai connection system how does it connect to the providers on the settings and where's the ability to adjust which provider are we using and everything like that."

---

## Current File Structure

```
src/
├── pages/
│   ├── ResumeBuilderPage.tsx    # Main builder page (207 lines)
│   ├── ResumePage.tsx           # Hub page
│   ├── ResumePreviewPage.tsx    # Full-screen preview
│   ├── ResumeImportPage.tsx     # Import + chat compilations
│   └── ResumeExportPage.tsx     # Export + versions
├── features/resume/components/
│   ├── ScoreGauge.tsx           # Uses AnimatedCircularProgressBar + NumberTicker
│   ├── QuestionCard.tsx         # Question display
│   ├── AnswerInput.tsx          # Dynamic input (text/textarea/metric/tags/slider)
│   ├── AiFeedbackBox.tsx        # AI feedback with Badge
│   ├── ResumePreview.tsx        # ATS-safe resume renderer (inline styles)
│   ├── ProgressBar.tsx          # Uses Progress component
│   ├── PhaseNavigator.tsx       # Phase tabs (currently sequential, locked)
│   ├── TakeawayCard.tsx         # Chat extraction card
│   ├── VersionCard.tsx          # Resume version card
│   ├── ExportSettings.tsx       # Format/target settings
│   ├── ChatCompilationCard.tsx  # Chat compilation history
│   ├── CertificationCard.tsx    # Certification scan card
│   ├── DocumentUploader.tsx     # Drag-and-drop upload
│   └── MobileScanModal.tsx      # Phone pairing modal
├── stores/resumeStore.ts        # Zustand store (all state + IPC calls)
├── types/resume.ts              # TypeScript interfaces (301 lines)
├── components/ui/               # 25 shadcn + Magic UI components
│   ├── button.tsx, input.tsx, badge.tsx, tabs.tsx, progress.tsx
│   ├── animated-circular-progress-bar.tsx, number-ticker.tsx
│   ├── blur-fade.tsx, skeleton.tsx, dialog.tsx, etc.
└── main.ts                      # IPC handlers (JSON file-based persistence)
```

---

## Key Code: ResumeBuilderPage.tsx (Current — 207 lines)

```tsx
// src/pages/ResumeBuilderPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, ChevronRight, Loader2 } from 'lucide-react';
import { useResumeStore } from '../stores/resumeStore';
import { PhaseNavigator } from '../features/resume/components/PhaseNavigator';
import { ProgressBar } from '../features/resume/components/ProgressBar';
import { QuestionCard } from '../features/resume/components/QuestionCard';
import { AnswerInput } from '../features/resume/components/AnswerInput';
import { AiFeedbackBox } from '../features/resume/components/AiFeedbackBox';
import { ResumePreview } from '../features/resume/components/ResumePreview';
import { Button } from '../components/ui/button';
import { NumberTicker } from '../components/ui/number-ticker';
import { Skeleton } from '../components/ui/skeleton';

export default function ResumeBuilderPage() {
  const navigate = useNavigate();
  const {
    builderProgress, currentQuestion, aiFeedback, resumeContent, score,
    updateBuilderProgress, setCurrentQuestion, setAiFeedback, submitAnswer,
    isSaving, isLoading, setIsLoading,
  } = useResumeStore();

  const [answer, setAnswer] = useState<any>('');
  const [showFeedback, setShowFeedback] = useState(false);

  const totalQuestionsPerPhase = [4, 7, 6, 6, 4, 4, 6];
  const totalQ = totalQuestionsPerPhase.reduce((a, b) => a + b, 0);
  const currentQNum = totalQuestionsPerPhase.slice(0, builderProgress.currentPhase - 1).reduce((a, b) => a + b, 0) + 1;

  useEffect(() => {
    if (!currentQuestion) {
      loadFirstQuestion();
    }
  }, []);

  const loadFirstQuestion = async () => {
    try {
      setIsLoading(true);
      const result = await (window as any).deskflowAPI?.resume?.nextQuestion({
        currentPhase: builderProgress.currentPhase,
        currentQuestionId: builderProgress.currentQuestionId,
        previousAnswers: builderProgress.answers,
        targetRole: '',
        careerLevel: 'mid',
      });
      if (result?.nextQuestion) {
        setCurrentQuestion(result.nextQuestion);
        setAiFeedback(result.aiFeedback);
      }
    } catch (e) {
      console.error('[Builder] Failed to load question:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!answer || !currentQuestion) return;
    try {
      const result = await submitAnswer(currentQuestion.id, answer, builderProgress.currentPhase);
      setAnswer('');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 5000);
    } catch (e) {
      console.error('[Builder] Submit failed:', e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ '--page-accent': 'rgb(99, 102, 241)' } as any}>
      {/* Top Bar — Phase Navigator + Progress */}
      <div className="shrink-0 border-b border-zinc-800 px-5 py-3 bg-zinc-900/50 backdrop-blur-xl">
        <PhaseNavigator
          currentPhase={builderProgress.currentPhase}
          phaseStatus={builderProgress.phaseStatus}
          onPhaseClick={(p) => updateBuilderProgress({ currentPhase: p })}
        />
        <ProgressBar ... />
      </div>

      {/* Split Pane — Builder (left) + Preview (right, fixed 400px) */}
      <div className="flex-1 flex gap-5 p-5 min-h-0">
        <div className="flex-1 overflow-y-auto space-y-4 min-w-0">
          <QuestionCard ... />
          <AnswerInput ... />
          <AiFeedbackBox ... />
          <Button onClick={handleSubmit}>Submit Answer</Button>
          <ChecklistSection ... />
        </div>
        <div className="w-[400px] shrink-0 overflow-y-auto max-lg:hidden">
          <ResumePreview content={resumeContent} mode="styled" scale={50} />
        </div>
      </div>
    </div>
  );
}
```

**PROBLEMS:**
1. PhaseNavigator has `disabled={status === 'locked'}` — prevents non-linear navigation
2. No voice input — only text/textarea/metric/tags/slider
3. Preview is fixed 400px width — not resizable
4. No detailed guides per question — no "what to include/exclude"
5. No AI provider settings — hardcoded to single provider
6. Preview scale is hardcoded to 50% — not adjustable in builder

---

## Key Code: PhaseNavigator.tsx (Current)

```tsx
// src/features/resume/components/PhaseNavigator.tsx
export function PhaseNavigator({ currentPhase, phaseStatus, onPhaseClick }: PhaseNavigatorProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
      {Array.from({ length: 7 }, (_, i) => {
        const phase = i + 1;
        const status = phaseStatus[phase] || 'locked';
        const isActive = phase === currentPhase;
        return (
          <button
            key={phase}
            onClick={() => status !== 'locked' && onPhaseClick(phase)}
            disabled={status === 'locked'}  // ← BLOCKS non-linear nav
            className={`... ${
              status === 'locked' ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            <Icon className="w-3 h-3" />
            <span>{PHASE_NAMES[phase]?.split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
```

---

## Key Code: AnswerInput.tsx (Current — 124 lines)

```tsx
// src/features/resume/components/AnswerInput.tsx
// Supports: text, textarea, metric, tags, slider
// MISSING: voice input mode
export function AnswerInput({ inputType, value, onChange, validation, placeholder, disabled }: AnswerInputProps) {
  // ... text input
  // ... textarea
  // ... metric input
  // ... tags input
  // ... slider
  // NO voice input capability
}
```

---

## Key Code: ResumePreview.tsx (Current — 137 lines)

```tsx
// src/features/resume/components/ResumePreview.tsx
// Renders resume with inline styles (ATS-safe)
// PROBLEM: scale is hardcoded to 50% in builder, not adjustable
// PROBLEM: no drag-to-resize capability
export function ResumePreview({ content, mode = 'styled', scale = 65 }: ResumePreviewProps) {
  return (
    <div style={{
      transform: `scale(${scale / 100})`,
      transformOrigin: 'top left',
      width: '8.5in',
      minHeight: '11in',
    }}>
      {/* Name, Contact, Summary, Skills, Experience, Projects, Education */}
    </div>
  );
}
```

---

## Key Code: resumeStore.ts (Current — Zustand store)

```typescript
// src/stores/resumeStore.ts
interface ResumeState {
  profile: UserProfile | null;
  builderProgress: BuilderProgress;
  currentQuestion: Question | null;
  aiFeedback: AiFeedback | null;
  resumeContent: ResumeContent;
  takeaways: Takeaway[];
  chatCompilations: ChatCompilation[];
  certScans: CertificationScan[];
  documentUploads: DocumentUpload[];
  score: ResumeScore;
  versions: ResumeVersion[];
  reports: ResumeReports | null;
  previewMode: PreviewMode;
  previewZoom: number;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  // ... 25+ actions
}
```

---

## Key Code: Question type (from types/resume.ts)

```typescript
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
  validation: {
    minLength?: number;
    requiresMetric?: boolean;
    metricTypes?: string[];
  };
}
```

**MISSING fields for guides:**
- `guideInclude: string[]` — what to include in answer
- `guideExclude: string[]` — what NOT to include
- `guideTips: string[]` — pro tips for better answers

---

## Available UI Components (from src/components/ui/)

| Component | Source | Use for |
|-----------|--------|---------|
| button.tsx | shadcn | All buttons (variant: default/outline/ghost/destructive) |
| input.tsx | shadcn | Text inputs |
| badge.tsx | shadcn | Status badges, labels |
| tabs.tsx | shadcn | Tab navigation |
| progress.tsx | shadcn | Progress bars |
| skeleton.tsx | shadcn | Loading placeholders |
| dialog.tsx | shadcn | Modals |
| animated-circular-progress-bar.tsx | Magic UI | Score gauge with spring animation |
| number-ticker.tsx | Magic UI | Animated number count-up |
| blur-fade.tsx | Magic UI | Entrance animations with blur |
| particles.tsx | Magic UI | Background particle effects |
| border-beam.tsx | Magic UI | Animated border effects |

---

## Design System Tokens

```
Background:     zinc-950 (base), zinc-900 (elevated), zinc-900/80 (glass)
Primary:        indigo-500 (--page-accent for Resume)
Text:           zinc-100 (primary), zinc-400 (secondary), zinc-500 (muted)
Border:         zinc-800/60 (subtle), zinc-700/60 (active)
Card padding:   p-5 (20px) — NEVER p-6 or p-8
Border radius:  rounded-xl (12px) max
Font body:      Inter/Geist, 13px, weight 400-600
Font mono:      JetBrains Mono
Animation:      150ms fast, 250ms normal, 400ms slow
Easing:         cubic-bezier(0.16, 1, 0.3, 1)
Glass:          bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5
```

---

## IPC Endpoints (all exist, all functional)

```typescript
// Preload bridge (src/preload.ts)
resume: {
  getProfile, saveProfile,
  getTakeaways, saveTakeaway, updateTakeaway, deleteTakeaway,
  extractFromChat, getChatCompilations, deleteChatCompilation,
  nextQuestion, submitAnswer, saveProgress, loadProgress,
  compileResume, runHrReview,
  getVersions, saveVersion, deleteVersion, exportPdf,
  getCertScans, saveCertScan, updateCertScan,
  uploadDocument, getDocuments, deleteDocument,
  getReports,
}
```

---

## AI Provider Architecture (MISSING — needs implementation)

Currently, AI calls go through main.ts which uses a hardcoded OpenAI client. There is NO settings UI for:
- Selecting AI provider (OpenAI, Anthropic, local models)
- Setting API keys
- Choosing models
- Adjusting temperature/params

The main.ts has a basic OpenAI setup:
```typescript
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: getApiKeyFromSettings() });
```

This needs to be refactored into a configurable provider system with a settings UI.

---

## Backend Status

| Feature | IPC Channel | Handler Exists? | Returns Real Data? | Status |
|---------|-------------|-----------------|-------------------|--------|
| Get Profile | resume:getProfile | ✅ main.ts | ✅ JSON file | ✅ Real |
| Save Profile | resume:saveProfile | ✅ main.ts | ✅ JSON file | ✅ Real |
| Get Takeaways | resume:getTakeaways | ✅ main.ts | ✅ JSON file | ✅ Real |
| Extract Chat | resume:extractFromChat | ✅ main.ts | ✅ Basic extraction | ✅ Real |
| Get Compilations | resume:getChatCompilations | ✅ main.ts | ✅ JSON file | ✅ Real |
| Next Question | resume:nextQuestion | ✅ main.ts | ✅ Hardcoded phases | ✅ Real |
| Submit Answer | resume:submitAnswer | ✅ main.ts | ✅ Advances phase | ✅ Real |
| Get Versions | resume:getVersions | ✅ main.ts | ✅ JSON file | ✅ Real |
| Save Version | resume:saveVersion | ✅ main.ts | ✅ JSON file | ✅ Real |
| Get Reports | resume:getReports | ✅ main.ts | ✅ Computed from progress | ✅ Real |
| AI Provider Settings | n/a | ❌ | ❌ | ❌ Missing |

---

## What Needs to Change

### 1. Non-Linear Phase Navigation
- Remove `disabled={status === 'locked'}` from PhaseNavigator
- Allow clicking ANY phase
- Add warning dialog when jumping to incomplete phase: "This phase has incomplete answers. The preview may show partial data."
- Track which phase is "active" separately from which phase is "complete"

### 2. Voice Input (Web Speech API)
- Add `voice` input type to AnswerInput
- Use `window.SpeechRecognition` (built into Chromium/Electron)
- Show microphone button, recording indicator, transcript preview
- Append voice transcript to existing text (don't replace)
- Support continuous recording for long answers

### 3. Resizable Preview Panel
- Add draggable divider between builder and preview panels
- Store preferred width in localStorage
- Minimum width: 300px, Maximum width: 60% of viewport
- Smooth resize with mouse drag

### 4. Detailed Guides Per Question
- Add `guideInclude`, `guideExclude`, `guideTips` fields to Question type
- Display as collapsible section below question
- Show example bullet points for each question
- Include ATS tips (what recruiters look for)

### 5. AI Provider Settings
- Add settings panel in Resume page or global Settings
- Support multiple providers: OpenAI, Anthropic, local
- Store API keys encrypted in SQLite
- Allow model selection per provider
- Show connection status indicator
