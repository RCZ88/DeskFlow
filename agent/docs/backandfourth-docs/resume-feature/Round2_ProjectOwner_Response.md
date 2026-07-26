# Round 2 — Project Owner Response

> **Date:** 2026-07-22
> **From:** Project Owner (CZ)
> **To:** Specialist AI (Frontend Architect)
> **Re:** Resume Builder Module — Decisions & Context

---

Great analysis. Here are my answers to all 7 questions, plus additional context you need.

---

## Q1: Route Structure → **Option A: Flat Routes**

Use flat top-level routes matching your existing pattern. Add to `App.tsx`:

```tsx
<Route path="/resume" element={<ResumePage />} />
<Route path="/resume/build" element={<ResumeBuilderPage />} />
<Route path="/resume/import" element={<ResumeImportPage />} />
<Route path="/resume/preview" element={<ResumePreviewPage />} />
<Route path="/resume/review" element={<ResumeReviewPage />} />
<Route path="/resume/export" element={<ResumeExportPage />} />
<Route path="/resume/history" element={<ResumeHistoryPage />} />
```

Each page is its own file in `src/pages/`. The `/resume` hub page handles the dashboard/overview. The sub-pages are direct routes.

**Rationale:** Matches your existing pattern exactly. No nested routing complexity. Sidebar item "Resume" links to `/resume`, and the hub page has buttons that route to sub-pages.

---

## Q2: Sidebar Placement → **After "Learn", before "IDE Projects"**

New sidebar order:
```
Dashboard | Activity | AI Assistant | Learn | 📄 Resume | IDE Projects | External | Finance | Insights | Database | Life | Settings | Guide
```

**Rationale:** Resume is a "productivity/life" tool, closer to Learn than to IDE Projects. It feels natural in the left cluster.

---

## Q3: Page Accent Color → **Indigo-500**

Use `--page-accent: rgb(99, 102, 241)` (indigo-500) for Resume Builder.

**Rationale:** Indigo conveys professionalism, trust, and career growth. It distinguishes Resume from the existing pink (Dashboard), cyan (Activity), and violet (IDE). It also matches the "AI/tech" vibe without clashing.

---

## Q4: Backend IPC → **Option A: Electron IPC (`window.deskflowAPI`)**

Use the existing IPC bridge pattern. Create new handlers in `main.ts`:

```typescript
// Main process handlers (main.ts)
ipcMain.handle('resume:getProfile', async (event, userId) => { ... });
ipcMain.handle('resume:saveProfile', async (event, profile) => { ... });
ipcMain.handle('resume:getTakeaways', async (event, filters) => { ... });
ipcMain.handle('resume:saveTakeaway', async (event, takeaway) => { ... });
ipcMain.handle('resume:compileResume', async (event, data) => { ... });
ipcMain.handle('resume:runHrReview', async (event, resumeDraft, targetJd) => { ... });
ipcMain.handle('resume:exportPdf', async (event, versionId, format) => { ... });
ipcMain.handle('resume:getVersions', async (event, profileId) => { ... });
ipcMain.handle('resume:saveVersion', async (event, version) => { ... });
ipcMain.handle('resume:extractFromChat', async (event, transcript, source) => { ... });
ipcMain.handle('resume:nextQuestion', async (event, state) => { ... });
ipcMain.handle('resume:submitAnswer', async (event, questionId, answer, phase) => { ... });
```

**Rationale:** Matches your existing `window.deskflowAPI.*` pattern. The frontend calls these via the preload script. The main process handles DB access (SQLite) and AI API calls (OpenAI/Claude).

**Important:** The AI engines (Chat Extractor, Questionnaire AI, Resume Compiler, HR Reviewer) run in the **main process** as async handlers. They call the OpenAI/Claude API from there, NOT from the frontend. The frontend sends the input data, the main process sends it to the AI API, and returns the structured response.

---

## Q5: Database → **Option A: Adapt to SQLite**

Adapt the schema to SQLite. Here are the exact table definitions:

```sql
-- SQLite Schema for Resume Builder Module

CREATE TABLE IF NOT EXISTS resume_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  location TEXT,
  target_role TEXT,
  career_level TEXT,
  professional_summary TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resume_experience (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  company TEXT,
  role_title TEXT,
  location TEXT,
  start_date TEXT,
  end_date TEXT,
  is_current INTEGER DEFAULT 0,
  bullets TEXT, -- JSON string
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resume_projects (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  project_name TEXT,
  description TEXT,
  tech_stack TEXT, -- JSON string
  bullets TEXT, -- JSON string
  link TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resume_skills (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  category TEXT, -- 'languages', 'frameworks', 'infrastructure', 'databases', 'ai_tools', 'practices'
  skill_name TEXT,
  proficiency TEXT, -- 'expert', 'proficient', 'familiar'
  years_experience REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resume_education (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  institution TEXT,
  degree TEXT,
  field_of_study TEXT,
  graduation_date TEXT,
  gpa REAL,
  include_gpa INTEGER DEFAULT 0,
  include_graduation_date INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resume_takeaways (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source TEXT, -- 'chatgpt', 'claude', 'cursor', 'manual'
  session_id TEXT,
  session_date TEXT,
  takeaway_type TEXT, -- 'PROJECT', 'SKILL', 'PROBLEM_SOLVED', 'OPTIMIZATION', 'ARCHITECTURE_DECISION'
  title TEXT,
  xyz_bullet_draft TEXT,
  tech_stack TEXT, -- JSON string
  metrics_estimated TEXT, -- JSON string
  context TEXT,
  skills_demonstrated TEXT, -- JSON string
  resume_section TEXT, -- 'EXPERIENCE', 'PROJECTS', 'SKILLS'
  confidence TEXT, -- 'HIGH', 'MEDIUM', 'LOW'
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected', 'used'
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resume_versions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  version_name TEXT,
  target_role TEXT,
  target_company TEXT,
  content TEXT, -- JSON string (full resume snapshot)
  score INTEGER,
  score_breakdown TEXT, -- JSON string
  hr_review_result TEXT, -- JSON string
  is_current INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resume_builder_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  current_phase INTEGER DEFAULT 1,
  current_question_id TEXT,
  phase_status TEXT, -- JSON string
  answers TEXT, -- JSON string
  overall_percent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resume_hr_reviews (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  target_jd TEXT,
  overall_score INTEGER,
  verdict TEXT,
  dimension_scores TEXT, -- JSON string
  fix_list TEXT, -- JSON string
  redline_draft TEXT, -- JSON string
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_takeaways_user ON resume_takeaways(user_id);
CREATE INDEX IF NOT EXISTS idx_takeaways_status ON resume_takeaways(status);
CREATE INDEX IF NOT EXISTS idx_experience_profile ON resume_experience(profile_id);
CREATE INDEX IF NOT EXISTS idx_versions_profile ON resume_versions(profile_id);
CREATE INDEX IF NOT EXISTS idx_builder_progress_user ON resume_builder_progress(user_id);
```

**Key adaptations from PostgreSQL:**
- `UUID` → `TEXT` (store as string)
- `JSONB` → `TEXT` (store JSON as string, parse in code)
- `BOOLEAN` → `INTEGER` (0/1)
- `TIMESTAMP` → `TEXT` (ISO 8601 strings, use `datetime('now')`)
- `NOW()` → `datetime('now')`
- Foreign keys as `TEXT` references (SQLite enforces FKs if `PRAGMA foreign_keys = ON`)

---

## Q6: AI Engines → **Option A: Main Process Calls AI API**

The frontend sends data to main process via IPC. The main process calls the AI API (OpenAI GPT-4) and returns structured JSON.

**Why not Option C (mock)?** Because the user already has the system prompts designed and wants them working. Mocking defeats the purpose.

**API Key Management:** Store the OpenAI API key in the app's settings (encrypted in SQLite or OS keychain). The main process reads it from settings before making API calls.

**Engine Implementation Pattern:**

```typescript
// main.ts — AI Engine Handler Example

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: getApiKeyFromSettings() });

ipcMain.handle('resume:nextQuestion', async (event, state) => {
  const systemPrompt = loadPrompt('questionnaire-ai'); // Load from agent/skills/resume-builder/

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(state) }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  return JSON.parse(response.choices[0].message.content);
});
```

**Prompt Storage:** Store the 4 engine prompts as `.md` files in `agent/skills/resume-builder/prompts/`:
- `chat-extractor.md`
- `questionnaire-ai.md`
- `resume-compiler.md`
- `hr-reviewer.md`

The main process reads these files at runtime.

---

## Q7: Scope → **Option B: MVP (Hub + Builder + Preview + Export)**

Build a **minimal viable version** first:

**IN (MVP):**
1. ✅ `/resume` Hub page (dashboard with score, quick actions, activity feed)
2. ✅ `/resume/build` Builder page (7-phase questionnaire + live preview)
3. ✅ `/resume/preview` Preview page (full-screen resume preview)
4. ✅ `/resume/export` Export page (PDF/Markdown export, basic version control)
5. ✅ Chat import (manual paste only — no API connections yet)
6. ✅ 4 AI engines (all prompts implemented in main process)
7. ✅ SQLite schema (all tables)
8. ✅ IPC handlers (all resume:* handlers)

**OUT (Phase 2):**
- ❌ API connections (ChatGPT/Claude OAuth) — manual paste for now
- ❌ `/resume/review` HR Review Gate page — integrate into Builder as a "Review" step
- ❌ `/resume/history` Version History page — basic version list in Export page
- ❌ WebSocket/SSE real-time updates — polling or IPC callbacks for now
- ❌ Voice input — text only for now
- ❌ Mobile-specific adaptations — responsive but not mobile-optimized

**Rationale:** The core value is the Builder (questionnaire + live preview + AI feedback). Get that working end-to-end first. The other pages are important but can be layered on. The AI engines are the differentiator — they must work in MVP.

---

## Additional Context You Need

### A. Existing State Management Pattern

Your app uses React `useState`/`useMemo` at the App level, passed as props. **For Resume Builder, use Zustand.**

Why? Resume Builder has complex cross-page state (builder progress, resume content, imported takeaways, scores, versions). Prop drilling across 4+ pages would be unmaintainable. Zustand is lightweight, works with your React setup, and persists to SQLite via middleware.

```typescript
// src/stores/resumeStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useResumeStore = create(
  persist(
    (set, get) => ({
      // State
      profile: null,
      builderProgress: { currentPhase: 1, currentQuestionId: null, overallPercent: 0 },
      resumeContent: { summary: '', experience: [], projects: [], skills: [], education: [] },
      takeaways: [],
      score: { overall: 0, breakdown: {} },
      versions: [],

      // Actions
      setProfile: (profile) => set({ profile }),
      updateBuilderProgress: (progress) => set({ builderProgress: progress }),
      addTakeaway: (takeaway) => set((state) => ({ takeaways: [...state.takeaways, takeaway] })),
      updateScore: (score) => set({ score }),

      // Async actions (call IPC)
      fetchProfile: async () => {
        const profile = await window.deskflowAPI.invoke('resume:getProfile');
        set({ profile });
      },
      submitAnswer: async (questionId, answer, phase) => {
        const result = await window.deskflowAPI.invoke('resume:submitAnswer', questionId, answer, phase);
        set({ builderProgress: result.progress, resumeContent: result.resumeContent });
        return result;
      },
    }),
    {
      name: 'resume-builder-storage',
      // Only persist UI state, not content (content goes to SQLite)
      partialize: (state) => ({ builderProgress: state.builderProgress }),
    }
  )
);
```

### B. IPC Bridge Pattern

Your existing `window.deskflowAPI` is exposed via `preload.ts`. Add resume handlers:

```typescript
// preload.ts (add to existing contextBridge.exposeInMainWorld)
resume: {
  getProfile: () => ipcRenderer.invoke('resume:getProfile'),
  saveProfile: (profile) => ipcRenderer.invoke('resume:saveProfile', profile),
  getTakeaways: (filters) => ipcRenderer.invoke('resume:getTakeaways', filters),
  saveTakeaway: (takeaway) => ipcRenderer.invoke('resume:saveTakeaway', takeaway),
  extractFromChat: (transcript, source) => ipcRenderer.invoke('resume:extractFromChat', transcript, source),
  nextQuestion: (state) => ipcRenderer.invoke('resume:nextQuestion', state),
  submitAnswer: (questionId, answer, phase) => ipcRenderer.invoke('resume:submitAnswer', questionId, answer, phase),
  compileResume: (data) => ipcRenderer.invoke('resume:compileResume', data),
  runHrReview: (resumeDraft, targetJd) => ipcRenderer.invoke('resume:runHrReview', resumeDraft, targetJd),
  exportPdf: (versionId, format) => ipcRenderer.invoke('resume:exportPdf', versionId, format),
  getVersions: (profileId) => ipcRenderer.invoke('resume:getVersions', profileId),
  saveVersion: (version) => ipcRenderer.invoke('resume:saveVersion', version),
}
```

### C. Component Sourcing (MCP Servers)

Use your existing MCP servers for components:
- **shadcn/ui** — Base components (Button, Card, Input, Textarea, Dialog, Tabs, Progress, Slider)
- **Magic UI** — Animated components (ScoreGauge, progress rings)
- **Lucide** — Icons (all iconography)
- **21st.dev** — Advanced components if needed (timeline, stepper)

**Do NOT build custom components** where shadcn/Magic UI equivalents exist. The Resume Builder should feel native to your app because it uses the same component library.

### D. Resume Preview Engine

The live preview is a **React component that renders a simulated resume page** using inline styles (not Tailwind) to mimic actual resume formatting:

```tsx
// src/components/resume/ResumePreview.tsx
export function ResumePreview({ content, mode = 'styled' }) {
  return (
    <div 
      className="bg-white text-slate-900 p-10 rounded-lg shadow-lg overflow-auto"
      style={{ 
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11pt',
        lineHeight: 1.4,
        width: '8.5in',
        minHeight: '11in',
        transform: 'scale(0.65)',
        transformOrigin: 'top left',
      }}
    >
      {/* Name */}
      <h1 style={{ fontSize: '20pt', fontWeight: 'bold', marginBottom: '4px' }}>
        {content.profile.fullName}
      </h1>

      {/* Contact */}
      <p style={{ fontSize: '10pt', color: '#333', marginBottom: '12px' }}>
        {content.profile.location} | {content.profile.phone} | {content.profile.email} | {content.profile.linkedin}
      </p>

      {/* Summary */}
      <h2 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px', marginTop: '12px' }}>
        PROFESSIONAL SUMMARY
      </h2>
      <p>{content.summary}</p>

      {/* Skills */}
      <h2 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px', marginTop: '12px' }}>
        TECHNICAL SKILLS
      </h2>
      {content.skills.map(cat => (
        <p key={cat.category}><strong>{cat.category}:</strong> {cat.items.join(', ')}</p>
      ))}

      {/* Experience */}
      <h2 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px', marginTop: '12px' }}>
        PROFESSIONAL EXPERIENCE
      </h2>
      {content.experience.map(job => (
        <div key={job.id} style={{ marginBottom: '8px' }}>
          <p style={{ fontWeight: 'bold' }}>{job.roleTitle} | {job.company} | {job.location} | {job.dates}</p>
          <ul style={{ paddingLeft: '20px', marginTop: '2px' }}>
            {job.bullets.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
        </div>
      ))}

      {/* Projects */}
      {/* Education */}
    </div>
  );
}
```

**Important:** The preview uses **inline styles** (not Tailwind) because it must simulate actual resume formatting that an ATS would see. The container uses Tailwind for positioning, but the inner content uses raw CSS.

### E. PDF Export

Use `puppeteer-core` or `html-pdf-node` in the main process:

```typescript
// main.ts — PDF Export Handler
import puppeteer from 'puppeteer-core';

ipcMain.handle('resume:exportPdf', async (event, versionId, format) => {
  const version = db.prepare('SELECT * FROM resume_versions WHERE id = ?').get(versionId);
  const content = JSON.parse(version.content);

  // Generate HTML from content
  const html = generateResumeHtml(content); // Use same logic as preview

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
  });

  await browser.close();

  // Save to user's downloads or return buffer
  const filePath = path.join(app.getPath('downloads'), `${content.profile.fullName}.Resume.pdf`);
  fs.writeFileSync(filePath, pdfBuffer);

  return { success: true, filePath };
});
```

For MVP, `html-pdf-node` is lighter than full Puppeteer if you don't need Chromium.

### F. Design System Compliance

Your app has strict design rules from the skills you loaded. Resume Builder MUST follow:

| Rule | Application |
|------|-------------|
| Card padding `p-5` (20px) | All cards in Resume Builder |
| Border radius `rounded-xl` (12px) max | No `rounded-2xl` or `rounded-3xl` |
| Font body: Inter/Geist, 13px, weight 400-600 | All UI text |
| Animation fast: 150ms (hover, toggle) | Buttons, cards |
| Animation normal: 250ms (modals, dropdowns) | Dialogs, panels |
| Animation slow: 400ms (page transitions) | Page route changes |
| Easing: cubic-bezier(0.16, 1, 0.3, 1) | All transitions |
| Glass: `bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5` | Floating panels, modals |
| Liveliness Level L2 (Responsive) | Resume Builder is productivity tool — alive but focused |

**The Resume Preview is the ONLY exception** — it uses Arial 11pt, single column, white background, because it simulates an actual resume document.

### G. File Structure

```
src/
├── pages/
│   ├── ResumePage.tsx           # /resume (Hub)
│   ├── ResumeBuilderPage.tsx    # /resume/build
│   ├── ResumeImportPage.tsx     # /resume/import
│   ├── ResumePreviewPage.tsx    # /resume/preview
│   ├── ResumeExportPage.tsx     # /resume/export
│   └── ResumeReviewPage.tsx     # /resume/review (Phase 2)
├── features/
│   └── resume/
│       ├── components/
│       │   ├── ScoreGauge.tsx
│       │   ├── QuestionCard.tsx
│       │   ├── AnswerInput.tsx
│       │   ├── AiFeedbackBox.tsx
│       │   ├── ResumePreview.tsx
│       │   ├── ChecklistItem.tsx
│       │   ├── MetricInput.tsx
│       │   ├── TagInput.tsx
│       │   ├── TakeawayCard.tsx
│       │   ├── VersionCard.tsx
│       │   ├── ExportSettings.tsx
│       │   └── ProgressBar.tsx
│       ├── hooks/
│       │   ├── useResumeBuilder.ts
│       │   ├── useChatExtractor.ts
│       │   ├── useHrReview.ts
│       │   └── useResumeExport.ts
│       └── utils/
│           ├── resumeFormatter.ts
│           ├── atsChecker.ts
│           └── pdfGenerator.ts
├── stores/
│   └── resumeStore.ts           # Zustand store
├── components/
│   └── resume/
│       └── [shared components if any]
└── types/
    └── resume.ts                # TypeScript interfaces

agent/skills/resume-builder/
├── prompts/
│   ├── chat-extractor.md
│   ├── questionnaire-ai.md
│   ├── resume-compiler.md
│   └── hr-reviewer.md
└── SKILL.md                     # Skill definition
```

---

## Decisions Summary Table

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Route Structure | Flat routes in App.tsx | Matches existing pattern |
| 2 | Sidebar Placement | After "Learn", before "IDE Projects" | Natural grouping |
| 3 | Accent Color | Indigo-500 | Professional, distinct |
| 4 | Backend IPC | Electron IPC (`window.deskflowAPI`) | Matches existing pattern |
| 5 | Database | SQLite (adapted schema) | Matches existing pattern |
| 6 | AI Engines | Main process calls OpenAI API | Secure, matches pattern |
| 7 | Scope | MVP: Hub + Builder + Preview + Export | Core value first |

---

## What I Need From You Now

Produce **RESULT.md** with:

1. **Component Architecture** — Full React component tree with props interfaces for ALL MVP components
2. **Page Implementations** — Each of the 4 MVP pages (Hub, Builder, Preview, Export) with layout, state, and logic
3. **State Management** — Complete Zustand store design with all slices and actions
4. **IPC Integration** — How frontend components call IPC handlers, with error handling and loading states
5. **Database Schema** — Confirm the SQLite schema above or propose modifications
6. **Tailwind Styles** — Complete class definitions for all custom components (complying with your design system rules)
7. **Animation Specs** — Transitions between questions, score updates, preview morphs, page transitions
8. **Mobile Adaptations** — How Builder page works on narrow screens (preview below or hidden)
9. **Testing Plan** — What to test: component rendering, state updates, IPC calls, AI response parsing

**DO NOT write implementation code yet.** Just the specification. I'll review and approve before you start coding.

---

*End of Round 2 response.*
