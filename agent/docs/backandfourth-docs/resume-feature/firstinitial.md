# RESULT.md — Resume Builder Module (MVP) Specification

> **Version:** 1.0
> **Date:** 2026-07-22
> **Author:** Specialist AI (Frontend Architect)
> **Status:** Pending Review

---

## Table of Contents

1. [Scope & Decisions](#1-scope--decisions)
2. [Component Architecture](#2-component-architecture)
3. [Page Implementations](#3-page-implementations)
4. [State Management](#4-state-management)
5. [IPC Integration](#5-ipc-integration)
6. [Database Schema](#6-database-schema)
7. [Tailwind Styles](#7-tailwind-styles)
8. [Animation Specs](#8-animation-specs)
9. [Mobile Adaptations](#9-mobile-adaptations)
10. [Testing Plan](#10-testing-plan)

---

## 1. Scope & Decisions

### MVP Scope

| IN | OUT (Phase 2) |
|----|---------------|
| `/resume` Hub page | API connections (ChatGPT/Claude OAuth) |
| `/resume/build` Builder (7-phase questionnaire + live preview) | `/resume/review` HR Review Gate page |
| `/resume/preview` Full-screen resume preview | `/resume/history` Version History page |
| `/resume/export` Export (PDF/Markdown, basic versions) | WebSocket/SSE real-time updates |
| Chat import (manual paste only) | Voice input |
| 4 AI engines (main process) | Mobile-specific optimizations |
| SQLite schema (all 9 tables) | |
| IPC handlers (all `resume:*`) | |

### Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Route structure | Flat routes in App.tsx |
| 2 | Sidebar placement | After "Learn", before "IDE Projects" |
| 3 | Page accent color | `indigo-500` (`--page-accent: rgb(99, 102, 241)`) |
| 4 | Backend | Electron IPC (`window.deskflowAPI.resume.*`) |
| 5 | Database | SQLite (adapted schema, TEXT for UUID/JSON) |
| 6 | AI engines | Main process calls OpenAI GPT-4o API |
| 7 | State management | Zustand (persist to localStorage, content to SQLite) |
| 8 | Liveliness Level | L2 (Responsive) — alive but focused |
| 9 | Component sourcing | shadcn/ui + Magic UI + Lucide via MCP |

---

## 2. Component Architecture

### Full Component Tree

```
App.tsx (existing)
├── /resume → ResumePage (Hub)
│   ├── ResumeHubHeader (score gauge + quick stats)
│   ├── ScoreGauge (circular animated score)
│   ├── QuickActionCard × 4 (Build, Import, Preview, Export)
│   ├── ActivityFeed (recent imports/builds)
│   └── VersionList (recent versions, max 5)
│
├── /resume/build → ResumeBuilderPage
│   ├── ResumeLayout (split pane: builder + preview)
│   │   ├── BuilderPanel (left, scrollable)
│   │   │   ├── PhaseNavigator (7 phase tabs)
│   │   │   ├── ProgressBar (phase progress, 7 segments)
│   │   │   ├── QuestionCard (current question)
│   │   │   ├── AnswerInput (dynamic: text, tags, metric, textarea)
│   │   │   ├── AiFeedbackBox (AI suggestion after each answer)
│   │   │   └── ChecklistSection (completion tracker)
│   │   └── PreviewPanel (right, sticky)
│   │       └── ResumePreview (live, inline styles)
│   └── BuilderFooter (prev/next, save, phase status)
│
├── /resume/preview → ResumePreviewPage
│   ├── PreviewToolbar (zoom, mode: styled/ats_raw/heatmap)
│   └── ResumePreview (full-screen, scaled)
│
├── /resume/import → ResumeImportPage
│   ├── ImportMethodSelector (paste, file upload)
│   ├── PasteTranscript (textarea for raw chat)
│   ├── FileUploader (drag-and-drop)
│   ├── ExtractButton (triggers AI extraction)
│   └── TakeawayReviewGrid (review extracted items)
│       └── TakeawayCard × N (individual takeaway with confirm/reject)
│
├── /resume/export → ResumeExportPage
│   ├── ExportSettings (format: PDF/Markdown/JSON, tailoring options)
│   ├── VersionManager (create/list versions)
│   ├── VersionCard × N (version with score, date, actions)
│   ├── ExportButton (generate + download)
│   └── HrReviewSummary (inline review results if available)
│
└── Shared (src/features/resume/components/)
    ├── ScoreGauge.tsx
    ├── QuestionCard.tsx
    ├── AnswerInput.tsx
    ├── AiFeedbackBox.tsx
    ├── ResumePreview.tsx
    ├── ProgressBar.tsx
    ├── ChecklistItem.tsx
    ├── MetricInput.tsx
    ├── TagInput.tsx
    ├── TakeawayCard.tsx
    ├── VersionCard.tsx
    ├── ExportSettings.tsx
    └── PhaseNavigator.tsx
```

### Component Props Interfaces

```typescript
// src/types/resume.ts

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  location: string;
  targetRole: string;
  careerLevel: 'junior' | 'mid' | 'senior' | 'staff' | 'principal';
  professionalSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeExperience {
  id: string;
  profileId: string;
  company: string;
  roleTitle: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  bullets: Bullet[];
  sortOrder: number;
}

export interface Bullet {
  text: string;
  metrics?: string;
  xyzCompliant: boolean;
}

export interface ResumeProject {
  id: string;
  profileId: string;
  projectName: string;
  description: string;
  techStack: string[];
  bullets: Bullet[];
  link: string;
  sortOrder: number;
}

export interface ResumeSkill {
  id: string;
  profileId: string;
  category: 'languages' | 'frameworks' | 'infrastructure' | 'databases' | 'ai_tools' | 'practices';
  skillName: string;
  proficiency: 'expert' | 'proficient' | 'familiar';
  yearsExperience: number;
}

export interface ResumeEducation {
  id: string;
  profileId: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  graduationDate: string;
  gpa: number;
  includeGpa: boolean;
  includeGraduationDate: boolean;
  sortOrder: number;
}

export interface Takeaway {
  id: string;
  userId: string;
  source: 'chatgpt' | 'claude' | 'cursor' | 'manual';
  sessionId: string;
  sessionDate: string;
  takeawayType: 'PROJECT' | 'SKILL' | 'PROBLEM_SOLVED' | 'OPTIMIZATION' | 'ARCHITECTURE_DECISION';
  title: string;
  xyzBulletDraft: string;
  techStack: string[];
  metricsEstimated: Record<string, any>;
  context: string;
  skillsDemonstrated: string[];
  resumeSection: 'EXPERIENCE' | 'PROJECTS' | 'SKILLS';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'pending' | 'confirmed' | 'rejected' | 'used';
}

export interface ResumeVersion {
  id: string;
  profileId: string;
  versionName: string;
  targetRole: string;
  targetCompany: string;
  content: ResumeContent;
  score: number;
  scoreBreakdown: Record<string, number>;
  hrReviewResult: HrReviewResult | null;
  isCurrent: boolean;
  createdAt: string;
}

export interface ResumeContent {
  profile: UserProfile;
  summary: string;
  experience: ResumeExperience[];
  projects: ResumeProject[];
  skills: SkillCategory[];
  education: ResumeEducation[];
}

export interface SkillCategory {
  category: string;
  items: string[];
}

export interface BuilderProgress {
  currentPhase: number;
  currentQuestionId: string;
  phaseStatus: Record<number, 'locked' | 'in_progress' | 'complete'>;
  answers: Record<string, any>;
  overallPercent: number;
}

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

export interface AiFeedback {
  quality: 'strong' | 'good' | 'needs_work' | 'weak';
  comment: string;
  suggestion: string;
  bulletDraft: string;
}

export interface ResumeScore {
  current: number;
  previous: number;
  breakdown: Record<string, number>;
}

export interface NextQuestionResponse {
  nextQuestion: Question;
  aiFeedback: AiFeedback;
  progress: {
    overallPercent: number;
    currentPhasePercent: number;
    phaseStatus: string;
  };
  checklistUpdates: { item: string; status: string }[];
  resumeScore: ResumeScore;
}

export interface HrReviewResult {
  overallScore: number;
  verdict: string;
  dimensionScores: Record<string, number>;
  fixList: FixItem[];
  redlineDraft: RedlineItem[];
}

export interface FixItem {
  dimension: string;
  issue: string;
  severity: 'critical' | 'major' | 'minor';
  suggestion: string;
}

export interface RedlineItem {
  original: string;
  suggested: string;
  reason: string;
}

// Component Props

export interface ScoreGaugeProps {
  score: number;
  previousScore?: number;
  size?: number; // default 120
  animated?: boolean;
}

export interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
}

export interface AnswerInputProps {
  inputType: Question['inputType'];
  value: any;
  onChange: (value: any) => void;
  validation?: Question['validation'];
  placeholder?: string;
  disabled?: boolean;
}

export interface AiFeedbackProps {
  feedback: AiFeedback;
  visible: boolean;
  onDismiss: () => void;
}

export interface ResumePreviewProps {
  content: ResumeContent;
  mode?: 'styled' | 'ats_raw' | 'heatmap';
  scale?: number;
  interactive?: boolean;
}

export interface ProgressBarProps {
  currentPhase: number;
  totalPhases: number;
  phaseStatus: Record<number, string>;
  overallPercent: number;
}

export interface PhaseNavigatorProps {
  currentPhase: number;
  phaseStatus: Record<number, string>;
  onPhaseClick: (phase: number) => void;
}

export interface ChecklistItemProps {
  label: string;
  status: 'pending' | 'in_progress' | 'complete';
  onClick?: () => void;
}

export interface TakeawayCardProps {
  takeaway: Takeaway;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string, updates: Partial<Takeaway>) => void;
}

export interface VersionCardProps {
  version: ResumeVersion;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string, format: string) => void;
}

export interface ExportSettingsProps {
  format: 'pdf' | 'markdown' | 'json';
  onFormatChange: (format: string) => void;
  targetRole: string;
  onTargetRoleChange: (role: string) => void;
  targetCompany: string;
  onTargetCompanyChange: (company: string) => void;
}
```

---

## 3. Page Implementations

### 3.1 ResumePage (Hub) — `/resume`

**Layout:** Pattern A (Inline Header) from frontend-design skill.

```
┌─────────────────────────────────────────────────┐
│  Resume Builder                    [New Resume]  │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Score    │  │ Quick    │  │ Activity │      │
│  │  Gauge    │  │ Actions  │  │ Feed     │      │
│  │  (ring)   │  │ (4 cards)│  │ (list)   │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  Recent Versions (max 5)                  │   │
│  │  [v1 - Senior SWE @ Google] [v2 - ...]   │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
└─────────────────────────────────────────────────┘
```

**State:**
- Fetches profile, score, versions, takeaways on mount via IPC
- Uses `useResumeStore` for all data
- Loading: skeleton placeholders matching card shapes
- Empty: "No resume yet. Start building your first one." + CTA button

**Components:**
- `ScoreGauge` — circular animated score (0-100), color changes: green >75, amber 50-75, red <50
- `QuickActionCard` × 4 — Build, Import, Preview, Export. Each routes to sub-page.
- `ActivityFeed` — recent imports and builds, max 10 items, timestamp + action type
- `VersionList` — recent versions with score badge, click to preview/export

### 3.2 ResumeBuilderPage — `/resume/build`

**Layout:** Split pane — left (builder, scrollable), right (preview, sticky).

```
┌──────────────────────────────────────────────────────────┐
│  Phase: [1 Foundation] [2 Exp] [3 Projects] [4 Skills].. │
│  ████████████████████░░░░░░░░░░░░  45%                   │
├─────────────────────────────┬────────────────────────────┤
│  Builder Panel (left)       │  Preview Panel (right)     │
│  ─────────────────          │  ──────────────────        │
│  Q4 of 12:                  │  ┌──────────────────┐     │
│  "What was the measurable   │  │  RESUME PREVIEW  │     │
│   outcome?"                 │  │  (live, inline)  │     │
│                             │  │                  │     │
│  [Answer input field]       │  │  John Doe        │     │
│                             │  │  Software Eng... │     │
│  💡 AI Feedback:            │  │                  │     │
│  "This answer is too vague. │  │  EXPERIENCE      │     │
│   Try: Reduced API..."      │  │  ...             │     │
│                             │  └──────────────────┘     │
│  Checklist:                 │                            │
│  ☑ Role & years             │                            │
│  ☑ Domain                   │                            │
│  ☐ Target role              │                            │
│  ☐ Headline                 │                            │
├─────────────────────────────┴────────────────────────────┤
│  [< Previous]  [Save Draft]  [Next Question >]           │
└──────────────────────────────────────────────────────────┘
```

**State:**
- `useResumeStore` — builderProgress, resumeContent, score, takeaways
- On mount: fetch progress from SQLite, restore phase/question
- On answer submit: call `resume:submitAnswer` → get next question + AI feedback + score update
- Preview updates in real-time as answers are submitted
- Auto-save: every answer triggers `resume:saveProgress` IPC call

**Key Logic:**
1. Phase 1-4: Simple questions (text, select, tags)
2. Phase 5-6: Strict metrics (requires numbers, percentages)
3. Phase 7: Assembly (AI compiles resume from all answers)
4. Adaptive: If imported takeaways exist, AI references them
5. Weak answers: AI asks follow-up, doesn't advance until quality passes

**AI Feedback Display:**
- Quality "strong" → green badge, no follow-up needed
- Quality "good" → blue badge, optional improvement
- Quality "needs_work" → amber badge, suggestion shown
- Quality "weak" → red badge, must improve before advancing

### 3.3 ResumePreviewPage — `/resume/preview`

**Layout:** Full-screen preview with toolbar.

```
┌─────────────────────────────────────────────────┐
│  Preview  [Styled] [ATS Raw] [Heatmap]  [Zoom]  │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │                                          │   │
│  │           RESUME PREVIEW                 │   │
│  │           (scaled, centered)             │   │
│  │                                          │   │
│  │           Name, Contact                  │   │
│  │           Summary                        │   │
│  │           Skills                         │   │
│  │           Experience                     │   │
│  │           Projects                       │   │
│  │           Education                      │   │
│  │                                          │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Modes:**
- **Styled** — Normal resume preview, white paper, formatted
- **ATS Raw** — Plain text extraction, no formatting (what ATS sees)
- **Heatmap** — Color-coded sections showing ATS compatibility (green=good, red=problem)

**State:**
- Fetches current version content from store
- Zoom: 50%-150%, default 65% (fits 8.5in page in viewport)
- Mode switch via tab bar

### 3.4 ResumeExportPage — `/resume/export`

**Layout:** Settings sidebar + version list + export button.

```
┌─────────────────────────────────────────────────┐
│  Export & Tailor                                 │
├──────────────┬──────────────────────────────────┤
│  Settings    │  Versions                        │
│  ────────    │  ────────                        │
│  Format:     │  ┌──────────────────────────┐   │
│  [PDF ▾]     │  │ v1 - Senior SWE @ Google  │   │
│              │  │ Score: 82 | 2 days ago    │   │
│  Target:     │  │ [Preview] [Export] [Delete]│   │
│  Role:       │  └──────────────────────────┘   │
│  [________]  │  ┌──────────────────────────┐   │
│              │  │ v2 - Staff Eng @ Meta     │   │
│  Company:    │  │ Score: 78 | 1 week ago    │   │
│  [________]  │  │ [Preview] [Export] [Delete]│   │
│              │  └──────────────────────────┘   │
│  ┌────────┐  │                                  │
│  │ Export │  │                                  │
│  └────────┘  │                                  │
└──────────────┴──────────────────────────────────┘
```

**State:**
- Format selection: PDF, Markdown, JSON
- Target role/company fields (for tailoring keywords)
- Version list from SQLite
- Export triggers: compile → generate file → download via Electron save dialog

---

## 4. State Management

### Zustand Store

```typescript
// src/stores/resumeStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  UserProfile, BuilderProgress, ResumeContent,
  Takeaway, ResumeVersion, ResumeScore, Question, AiFeedback
} from '../types/resume';

interface ResumeState {
  // Profile
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;

  // Builder
  builderProgress: BuilderProgress;
  updateBuilderProgress: (progress: Partial<BuilderProgress>) => void;
  currentQuestion: Question | null;
  setCurrentQuestion: (question: Question) => void;
  aiFeedback: AiFeedback | null;
  setAiFeedback: (feedback: AiFeedback | null) => void;

  // Resume Content
  resumeContent: ResumeContent;
  updateResumeContent: (content: Partial<ResumeContent>) => void;

  // Takeaways
  takeaways: Takeaway[];
  setTakeaways: (takeaways: Takeaway[]) => void;
  addTakeaway: (takeaway: Takeaway) => void;
  removeTakeaway: (id: string) => void;

  // Score
  score: ResumeScore;
  updateScore: (score: ResumeScore) => void;

  // Versions
  versions: ResumeVersion[];
  setVersions: (versions: ResumeVersion[]) => void;
  addVersion: (version: ResumeVersion) => void;
  removeVersion: (id: string) => void;

  // UI
  previewMode: 'styled' | 'ats_raw' | 'heatmap';
  setPreviewMode: (mode: 'styled' | 'ats_raw' | 'heatmap') => void;
  previewZoom: number;
  setPreviewZoom: (zoom: number) => void;
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;

  // Async Actions (IPC)
  fetchProfile: () => Promise<void>;
  saveProfile: (profile: UserProfile) => Promise<void>;
  fetchTakeaways: (filters?: any) => Promise<void>;
  submitAnswer: (questionId: string, answer: any, phase: number) => Promise<NextQuestionResponse>;
  compileResume: () => Promise<void>;
  fetchVersions: () => Promise<void>;
  saveVersion: (version: Partial<ResumeVersion>) => Promise<void>;
  exportResume: (versionId: string, format: string) => Promise<{ success: boolean; filePath?: string }>;
}

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      // Initial state
      profile: null,
      builderProgress: {
        currentPhase: 1,
        currentQuestionId: '',
        phaseStatus: { 1: 'in_progress', 2: 'locked', 3: 'locked', 4: 'locked', 5: 'locked', 6: 'locked', 7: 'locked' },
        answers: {},
        overallPercent: 0,
      },
      currentQuestion: null,
      aiFeedback: null,
      resumeContent: {
        profile: {} as UserProfile,
        summary: '',
        experience: [],
        projects: [],
        skills: [],
        education: [],
      },
      takeaways: [],
      score: { current: 0, previous: 0, breakdown: {} },
      versions: [],
      previewMode: 'styled',
      previewZoom: 65,
      isSaving: false,

      // Sync Actions
      setProfile: (profile) => set({ profile }),
      updateBuilderProgress: (progress) => set((state) => ({
        builderProgress: { ...state.builderProgress, ...progress }
      })),
      setCurrentQuestion: (question) => set({ currentQuestion: question }),
      setAiFeedback: (feedback) => set({ aiFeedback: feedback }),
      updateResumeContent: (content) => set((state) => ({
        resumeContent: { ...state.resumeContent, ...content }
      })),
      setTakeaways: (takeaways) => set({ takeaways }),
      addTakeaway: (takeaway) => set((state) => ({
        takeaways: [...state.takeaways, takeaway]
      })),
      removeTakeaway: (id) => set((state) => ({
        takeaways: state.takeaways.filter(t => t.id !== id)
      })),
      updateScore: (score) => set({ score }),
      setVersions: (versions) => set({ versions }),
      addVersion: (version) => set((state) => ({
        versions: [version, ...state.versions]
      })),
      removeVersion: (id) => set((state) => ({
        versions: state.versions.filter(v => v.id !== id)
      })),
      setPreviewMode: (mode) => set({ previewMode: mode }),
      setPreviewZoom: (zoom) => set({ previewZoom: zoom }),
      setIsSaving: (saving) => set({ isSaving: saving }),

      // Async Actions
      fetchProfile: async () => {
        try {
          const profile = await window.deskflowAPI.resume.getProfile();
          set({ profile });
        } catch (err) {
          console.error('[ResumeStore] Failed to fetch profile:', err);
        }
      },

      saveProfile: async (profile) => {
        set({ isSaving: true });
        try {
          await window.deskflowAPI.resume.saveProfile(profile);
          set({ profile, isSaving: false });
        } catch (err) {
          console.error('[ResumeStore] Failed to save profile:', err);
          set({ isSaving: false });
        }
      },

      fetchTakeaways: async (filters) => {
        try {
          const takeaways = await window.deskflowAPI.resume.getTakeaways(filters);
          set({ takeaways });
        } catch (err) {
          console.error('[ResumeStore] Failed to fetch takeaways:', err);
        }
      },

      submitAnswer: async (questionId, answer, phase) => {
        set({ isSaving: true });
        try {
          const result = await window.deskflowAPI.resume.submitAnswer(questionId, answer, phase);
          set({
            builderProgress: result.progress,
            currentQuestion: result.nextQuestion,
            aiFeedback: result.aiFeedback,
            score: result.resumeScore,
            isSaving: false,
          });
          return result;
        } catch (err) {
          console.error('[ResumeStore] Failed to submit answer:', err);
          set({ isSaving: false });
          throw err;
        }
      },

      compileResume: async () => {
        set({ isSaving: true });
        try {
          const content = await window.deskflowAPI.resume.compileResume(get().resumeContent);
          set({ resumeContent: content, isSaving: false });
        } catch (err) {
          console.error('[ResumeStore] Failed to compile:', err);
          set({ isSaving: false });
        }
      },

      fetchVersions: async () => {
        try {
          const profileId = get().profile?.id;
          if (!profileId) return;
          const versions = await window.deskflowAPI.resume.getVersions(profileId);
          set({ versions });
        } catch (err) {
          console.error('[ResumeStore] Failed to fetch versions:', err);
        }
      },

      saveVersion: async (version) => {
        set({ isSaving: true });
        try {
          const saved = await window.deskflowAPI.resume.saveVersion(version);
          set((state) => ({
            versions: [saved, ...state.versions.filter(v => v.id !== saved.id)],
            isSaving: false,
          }));
        } catch (err) {
          console.error('[ResumeStore] Failed to save version:', err);
          set({ isSaving: false });
        }
      },

      exportResume: async (versionId, format) => {
        set({ isSaving: true });
        try {
          const result = await window.deskflowAPI.resume.exportPdf(versionId, format);
          set({ isSaving: false });
          return result;
        } catch (err) {
          console.error('[ResumeStore] Failed to export:', err);
          set({ isSaving: false });
          return { success: false };
        }
      },
    }),
    {
      name: 'resume-builder-storage',
      // Only persist UI state, not content (content goes to SQLite)
      partialize: (state) => ({
        previewMode: state.previewMode,
        previewZoom: state.previewZoom,
      }),
    }
  )
);
```

---

## 5. IPC Integration

### Preload Bridge Additions

```typescript
// preload.ts — add to contextBridge.exposeInMainWorld('deskflowAPI', { ... })

resume: {
  // Profile
  getProfile: () => ipcRenderer.invoke('resume:getProfile'),
  saveProfile: (profile: any) => ipcRenderer.invoke('resume:saveProfile', profile),

  // Takeaways
  getTakeaways: (filters?: any) => ipcRenderer.invoke('resume:getTakeaways', filters),
  saveTakeaway: (takeaway: any) => ipcRenderer.invoke('resume:saveTakeaway', takeaway),
  updateTakeaway: (id: string, updates: any) => ipcRenderer.invoke('resume:updateTakeaway', id, updates),
  extractFromChat: (transcript: string, source: string) => ipcRenderer.invoke('resume:extractFromChat', transcript, source),

  // Builder
  nextQuestion: (state: any) => ipcRenderer.invoke('resume:nextQuestion', state),
  submitAnswer: (questionId: string, answer: any, phase: number) => ipcRenderer.invoke('resume:submitAnswer', questionId, answer, phase),
  saveProgress: (progress: any) => ipcRenderer.invoke('resume:saveProgress', progress),
  loadProgress: () => ipcRenderer.invoke('resume:loadProgress'),

  // Compile
  compileResume: (data: any) => ipcRenderer.invoke('resume:compileResume', data),

  // HR Review
  runHrReview: (resumeDraft: any, targetJd: string) => ipcRenderer.invoke('resume:runHrReview', resumeDraft, targetJd),

  // Versions
  getVersions: (profileId: string) => ipcRenderer.invoke('resume:getVersions', profileId),
  saveVersion: (version: any) => ipcRenderer.invoke('resume:saveVersion', version),
  deleteVersion: (id: string) => ipcRenderer.invoke('resume:deleteVersion', id),

  // Export
  exportPdf: (versionId: string, format: string) => ipcRenderer.invoke('resume:exportPdf', versionId, format),
}
```

### Error Handling Pattern

```typescript
// All IPC calls follow this pattern:

async function fetchProfile() {
  try {
    const profile = await window.deskflowAPI.resume.getProfile();
    if (!profile) {
      // Empty state — show "Create your profile" CTA
      return null;
    }
    return profile;
  } catch (err) {
    console.error('[Resume] getProfile failed:', err);
    // Show toast notification
    showToast({ type: 'error', message: 'Failed to load profile. Retrying...' });
    // Retry once
    try {
      return await window.deskflowAPI.resume.getProfile();
    } catch {
      showToast({ type: 'error', message: 'Profile load failed. Please check your database.' });
      return null;
    }
  }
}
```

### Loading States

Every IPC call sets `isSaving: true` before and `isSaving: false` after. Components check this to show:
- Button: `disabled` + spinner icon
- Form inputs: `opacity-50 cursor-wait`
- Page: skeleton placeholders during initial load

---

## 6. Database Schema

See `Round2_ProjectOwner_Response.md` Section Q5 for the complete SQLite schema.

**9 tables:**
1. `resume_profiles` — user contact info, target role, summary
2. `resume_experience` — work history with JSON bullets
3. `resume_projects` — project entries with JSON tech stack + bullets
4. `resume_skills` — categorized skills with proficiency
5. `resume_education` — degrees, GPA, dates
6. `resume_takeaways` — extracted from chat sessions
7. `resume_versions` — saved resume snapshots with scores
8. `resume_builder_progress` — questionnaire state + answers JSON
9. `resume_hr_reviews` — audit results per version

**JSON columns stored as TEXT:** `bullets`, `tech_stack`, `metrics_estimated`, `skills_demonstrated`, `phase_status`, `answers`, `content`, `score_breakdown`, `hr_review_result`, `dimension_scores`, `fix_list`, `redline_draft`

**Index strategy:** Indexes on `user_id`, `profile_id`, `status` for common queries.

---

## 7. Tailwind Styles

### Resume-Specific Tokens (extend `index.css`)

```css
/* Add to src/index.css */
@theme {
  --resume-success: #22c55e;
  --resume-warning: #f59e0b;
  --resume-danger: #ef4444;
  --resume-info: #3b82f6;
  --resume-score-high: #16a34a;
  --resume-score-mid: #ca8a04;
  --resume-score-low: #dc2626;
  --resume-preview-bg: #ffffff;
  --resume-preview-text: #1a1a2e;
  --resume-highlight: #fef3c7;
}
```

### Component Classes

```css
/* Score Gauge */
.score-gauge {
  @apply relative inline-flex items-center justify-center;
}
.score-gauge-ring {
  @apply rounded-full;
  stroke-dasharray: 339.292;
  stroke-linecap: round;
  transition: stroke-dashoffset 800ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* Question Card */
.question-card {
  @apply bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5 shadow-lg;
}

/* AI Feedback Box */
.ai-feedback {
  @apply bg-indigo-500/5 border-l-4 border-indigo-500 rounded-r-xl p-4;
}
.ai-feedback--strong { @apply border-emerald-500 bg-emerald-500/5; }
.ai-feedback--good { @apply border-blue-500 bg-blue-500/5; }
.ai-feedback--needs_work { @apply border-amber-500 bg-amber-500/5; }
.ai-feedback--weak { @apply border-red-500 bg-red-500/5; }

/* Score Badges */
.score-badge {
  @apply px-3 py-1 rounded-full text-sm font-semibold;
}
.score-badge--high {
  @apply bg-green-500/10 text-green-400;
}
.score-badge--mid {
  @apply bg-yellow-500/10 text-yellow-400;
}
.score-badge--low {
  @apply bg-red-500/10 text-red-400;
}

/* Resume Preview Paper */
.resume-paper {
  @apply bg-white text-slate-900 p-10 rounded-lg shadow-lg;
  font-family: 'Arial', 'Helvetica', sans-serif;
  font-size: 11pt;
  line-height: 1.4;
}

/* Phase Tab */
.phase-tab {
  @apply px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150;
}
.phase-tab--active {
  @apply bg-indigo-500/20 text-indigo-400 border border-indigo-500/30;
}
.phase-tab--complete {
  @apply bg-emerald-500/10 text-emerald-400 border border-emerald-500/20;
}
.phase-tab--locked {
  @apply bg-zinc-800/50 text-zinc-500 border border-zinc-700/30 cursor-not-allowed;
}

/* Takeaway Card */
.takeaway-card {
  @apply bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5;
}
.takeaway-card--pending {
  @apply border-amber-500/30;
}
.takeaway-card--confirmed {
  @apply border-emerald-500/30;
}

/* Version Card */
.version-card {
  @apply bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5;
  @apply hover:border-zinc-700/60 transition-colors duration-150 cursor-pointer;
}
.version-card--active {
  @apply border-indigo-500/40 bg-indigo-500/5;
}

/* Quick Action Card */
.quick-action-card {
  @apply bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5;
  @apply hover:border-indigo-500/30 transition-all duration-150 cursor-pointer;
}
.quick-action-card:hover {
  @apply -translate-y-0.5;
}

/* Progress Bar Segment */
.progress-segment {
  @apply h-1.5 rounded-full transition-all duration-300;
}
.progress-segment--complete {
  @apply bg-indigo-500;
}
.progress-segment--active {
  @apply bg-indigo-400 animate-pulse;
}
.progress-segment--locked {
  @apply bg-zinc-700;
}

/* Builder Split Pane */
.builder-split {
  @apply flex gap-5 h-full;
}
.builder-panel {
  @apply flex-1 overflow-y-auto;
}
.preview-panel {
  @apply w-[400px] shrink-0 sticky top-0;
}

/* Export Format Selector */
.format-option {
  @apply px-4 py-3 rounded-xl border border-zinc-700/50 text-sm font-medium;
  @apply hover:border-indigo-500/30 transition-colors duration-150 cursor-pointer;
}
.format-option--active {
  @apply border-indigo-500 bg-indigo-500/10 text-indigo-400;
}
```

---

## 8. Animation Specs

### Liveliness Level: L2 (Responsive)

All animations use `motion/react` (framer-motion) with DeskFlow tokens.

### Page Transitions

```typescript
// ResumePage → ResumeBuilderPage
const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
};
```

### Question Transitions (Builder)

```typescript
// QuestionCard enter/exit
const questionVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// Stagger for checklist items
const checklistContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const checklistItem = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0 },
};
```

### Score Gauge Animation

```typescript
// Number count-up using useSpring
const springValue = useSpring(0, { stiffness: 90, damping: 20 });
useEffect(() => {
  springValue.set(targetScore);
}, [targetScore]);

// Ring stroke-dashoffset animation
// CSS transition: stroke-dashoffset 800ms cubic-bezier(0.16, 1, 0.3, 1)
```

### AI Feedback Entry

```typescript
// AiFeedbackBox slide-in
const feedbackVariants = {
  hidden: { opacity: 0, y: 8, height: 0 },
  visible: { opacity: 1, y: 0, height: 'auto' },
  exit: { opacity: 0, y: -4, height: 0 },
};
// Transition: duration 250ms, ease-out
```

### Preview Morph

```typescript
// ResumePreview content update — subtle scale pulse
<motion.div
  key={JSON.stringify(resumeContent)}
  initial={{ opacity: 0.8, scale: 0.99 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.2 }}
>
```

### Hover States (Reactive)

```typescript
// QuickActionCard hover lift
<motion.button
  whileHover={{ y: -2, scale: 1.01 }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
/>

// VersionCard hover border glow
// CSS: hover:border-indigo-500/40 transition-colors duration-150
```

### Ambient (Single Accent — L2 allowance)

```css
/* Breathing score dot — one ambient element on Hub page */
@keyframes breathe {
  0%, 100% { opacity: 0.45; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.15); }
}
.score-dot {
  animation: breathe 2.4s ease-in-out infinite;
}
```

### Reduced Motion

```css
/* Global guard in index.css (already exists) */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```typescript
// In components
import { useReducedMotion } from 'motion/react';

function ScoreGauge({ score }) {
  const reduce = useReducedMotion();
  const springValue = useSpring(0, {
    stiffness: reduce ? 999 : 90,
    damping: reduce ? 999 : 20,
  });
  // ...
}
```

---

## 9. Mobile Adaptations

### Builder Page (Narrow Screens < 768px)

```
┌──────────────────────┐
│  Phase: [1] [2] [3]..│
│  ████████████░░░ 45%  │
├──────────────────────┤
│  Q4 of 12:           │
│  "What was the..."   │
│                      │
│  [Answer input]      │
│                      │
│  💡 AI Feedback:     │
│  "This answer..."    │
│                      │
│  Checklist:          │
│  ☑ Role & years      │
│  ☑ Domain            │
├──────────────────────┤
│  [< Prev] [Next >]   │
├──────────────────────┤
│  ┌──────────────────┐│
│  │  PREVIEW (tab)   ││
│  │  (tap to expand) ││
│  └──────────────────┘│
└──────────────────────┘
```

**Adaptations:**
1. **Stacked layout** — Preview collapses below builder (not side-by-side)
2. **Preview as tab** — "Preview" tab at bottom, taps to expand full-screen
3. **Phase navigator** — horizontal scroll with pills (not fixed tabs)
4. **Touch targets** — all buttons ≥ 44px height
5. **Input sizing** — text inputs full-width, textarea min 120px height

### Hub Page (Narrow)

```
┌──────────────────────┐
│  Resume Builder      │
├──────────────────────┤
│  ┌──────────────────┐│
│  │  Score: 62/100   ││
│  └──────────────────┘│
│                      │
│  [Build] [Import]    │
│  [Preview] [Export]  │
│                      │
│  Recent Activity     │
│  • Imported chat     │
│  • Built v1          │
└──────────────────────┘
```

**Adaptations:**
1. **Single column** — all cards stack vertically
2. **Quick actions** — 2×2 grid instead of 4 columns
3. **Score gauge** — smaller (80px instead of 120px)

### Breakpoint Classes

```tsx
<div className="builder-split flex gap-5">
  <div className="builder-panel flex-1 min-w-0">
    {/* Builder content */}
  </div>
  <div className="preview-panel w-[400px] shrink-0 sticky top-0
                  max-lg:w-full max-lg:sticky max-lg:bottom-0 max-lg:h-[200px]
                  max-lg:rounded-t-xl max-lg:border-t max-lg:border-zinc-800">
    {/* Preview content */}
  </div>
</div>
```

---

## 10. Testing Plan

### Component Rendering Tests

| Component | Test | Expected |
|-----------|------|----------|
| `ScoreGauge` | Render with score 82 | Green ring at 82%, number "82" displayed |
| `ScoreGauge` | Render with score 45 | Red ring at 45%, number "45" displayed |
| `QuestionCard` | Render phase 1, question 1 | "Foundation" label, question text visible |
| `AnswerInput` | type="text", value="" | Empty input with placeholder |
| `AiFeedback` | quality="strong" | Green border, feedback text visible |
| `AiFeedback` | visible=false | Not rendered (AnimatePresence exit) |
| `ResumePreview` | Empty content | "No resume data yet" empty state |
| `ProgressBar` | Phase 3, 45% | 2 segments complete, 1 active, 4 locked |
| `TakeawayCard` | status="pending" | Amber border, confirm/reject buttons |
| `VersionCard` | isActive=true | Indigo border, active styling |

### State Update Tests

| Scenario | Action | Expected State Change |
|----------|--------|----------------------|
| Submit answer | `submitAnswer("exp_2_3", "Reduced API latency by 42%", 2)` | `builderProgress.overallPercent` increases, `currentQuestion` updates, `score.current` increases |
| Import chat | `extractFromChat(transcript, "chatgpt")` | `takeaways` array grows, new items have `status: "pending"` |
| Save version | `saveVersion({ versionName: "v1" })` | `versions` array grows, version has `score` and `content` |
| Switch preview mode | `setPreviewMode("ats_raw")` | Preview renders plain text, no formatting |

### IPC Call Tests

| IPC Call | Mock Response | Component Behavior |
|----------|--------------|-------------------|
| `resume:getProfile` | `{ id: "1", fullName: "John Doe" }` | Hub shows profile name |
| `resume:getProfile` | `null` | Hub shows "Create your profile" CTA |
| `resume:submitAnswer` | `{ nextQuestion: {...}, aiFeedback: {...}, resumeScore: {...} }` | Builder advances, feedback shows, score updates |
| `resume:compileResume` | `{ summary: "...", experience: [...] }` | Preview updates with compiled content |
| `resume:exportPdf` | `{ success: true, filePath: "/downloads/JohnDoe.pdf" }` | Toast "Exported successfully", file saved |

### AI Response Parsing Tests

| AI Output | Parsing | Expected |
|-----------|---------|----------|
| Valid JSON with all fields | `JSON.parse()` | All fields populated, no errors |
| JSON missing `nextQuestion` | Validation check | Show error toast, stay on current question |
| JSON with `quality: "weak"` | Feedback display | Red badge, suggestion shown, "Improve" button |
| Malformed JSON | `try/catch` | Show "AI response error" toast, retry button |

### Integration Tests (End-to-End)

1. **Fresh start:** Open `/resume` → see empty hub → click "Build" → see phase 1 question
2. **Answer flow:** Type answer → submit → see AI feedback → advance → preview updates
3. **Import flow:** Paste chat → extract → see takeaways → confirm → use in builder
4. **Export flow:** Complete builder → compile → save version → export PDF → file downloads
5. **Resume flow:** Close app → reopen → progress restored from SQLite

### Design System Compliance Tests

| Rule | Check |
|------|-------|
| Card padding `p-5` | All `.question-card`, `.takeaway-card`, `.version-card` use `p-5` |
| Border radius `rounded-xl` max | No `rounded-2xl` or `rounded-3xl` anywhere |
| Font body Inter 13px | All UI text uses Inter/Geist at 13px base |
| Animation durations | Hover: 150ms, Modal: 250ms, Page: 400ms |
| Easing cubic-bezier(0.16,1,0.3,1) | All motion transitions use this easing |
| Glass morphism | Floating panels use `bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60` |
| Liveliness L2 | No ambient particles, no scroll choreography, one breathing dot allowed |
| Touch targets ≥ 44px | All buttons, inputs, interactive elements |
| Reduced motion | All animations respect `prefers-reduced-motion: reduce` |

---

## Appendix A: Phase Definitions

| Phase | Name | Questions | Focus |
|-------|------|-----------|-------|
| 1 | Foundation (The Hook) | 4 | Role, domain, target, headline |
| 2 | Experience Archaeology | 7 per role | Problem, challenge, action, outcome, tech, collaboration, impact |
| 3 | Project Excavation | 6 per project | Problem, type, contribution, decisions, outcome, links |
| 4 | Skills Inventory | 6 | Languages, frameworks, cloud, databases, AI tools, ratings |
| 5 | Impact Quantification | 4 | Defensibility, documentation, impressiveness, specificity |
| 6 | Objective Audit | 4 | Real impressiveness, staff-level review, honesty check, manager confirmation |
| 7 | Final Assembly | 6 | Summary, experience order, projects, skills, education, ATS check |

---

## Appendix B: MCP Component Sources

| Need | Source | Components |
|------|--------|------------|
| Button, Input, Textarea, Dialog, Tabs, Progress | shadcn/ui MCP | Standard UI blocks |
| Score gauge (animated ring) | Magic UI MCP | Animated circular progress |
| Icons (all) | Lucide MCP | FileText, Download, Check, Star, etc. |
| Timeline/Stepper (if needed) | 21st.dev MCP | Prompt-to-component |
| Animations | motion/react | AnimatePresence, useSpring, useReducedMotion |

**Re-skin rule:** After pulling from MCP, replace source colors with DeskFlow tokens (`--page-accent: indigo-500`), use `rounded-xl` max, `p-5` padding, Inter font, dark mode only.

---

*End of RESULT.md — pending Project Owner review.*
