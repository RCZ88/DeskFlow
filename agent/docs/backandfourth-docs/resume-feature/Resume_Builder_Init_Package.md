# 🤝 AI Collaboration Bridge — Resume Builder Module
## Initialization Package for AI Coding Agent

---

> **INSTRUCTION FOR THE AI CODING AGENT:**
> This is a collaboration package. You are the **Specialist AI (Frontend Architect)**. 
> The user is the **Project Owner**. Your job is to ask questions about the codebase, 
> understand the existing app structure, and then produce a complete frontend 
> implementation specification (RESULT.md).
> 
> **DO NOT implement code yet.** First, ask questions. Iterate. Then produce RESULT.md.

---

# PART 1: WHAT WE'RE BUILDING

## Module: Resume Builder ("ResumeForge")

A **separate page/module** inside an existing daily life tracker app. It lives 
alongside Tracker, Projects, Learning, and Finance. NOT integrated into the 
existing AI Projects page.

### Pages
```
/app/resume                    → Resume Hub (Dashboard)
/app/resume/build              → Dynamic Builder (Interview Mode)
/app/resume/import             → Chat Session Import
/app/resume/preview            → Live Resume Preview
/app/resume/review             → HR Review Gate
/app/resume/export             → Export & Tailor
/app/resume/history            → Version History
```

### Core Features
1. **Dynamic Questionnaire** — Adaptive interview that adjusts questions based on answers (like a smart Google Form). 7 phases. AI gives real-time feedback.
2. **Chat Session Import** — Import from ChatGPT, Claude, Cursor. AI extracts resume-worthy takeaways.
3. **Live Resume Preview** — Real-time preview that updates as user answers. ATS-safe formatting.
4. **Checklist System** — Track completion of resume sections.
5. **HR Review Gate** — AI-powered quality gate (10-dimension audit) before export.
6. **Export Module** — ATS-safe PDF, Markdown, JSON. Version control per role.

---

# PART 2: DESIGN SYSTEM (Extend Existing)

## Existing App Theme (Dark Mode)
```css
--app-bg: #0f172a;           /* Dark slate background */
--app-surface: #1e293b;       /* Card background */
--app-border: #334155;        /* Borders */
--app-text: #f8fafc;          /* Primary text */
--app-text-muted: #94a3b8;    /* Secondary text */
--app-accent: #6366f1;        /* Primary accent (indigo) */
--app-accent-hover: #4f46e5;  /* Accent hover */
```

## Resume Module Extensions
```css
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

--font-ui: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
--font-resume: 'Arial', 'Helvetica', sans-serif; /* ATS-safe */
```

## Key Tailwind Classes
```css
/* Card Base */
.resume-card {
  @apply bg-slate-800 border border-slate-700 rounded-2xl p-6 
         shadow-sm hover:shadow-md transition-shadow;
}

/* Question Card */
.question-card {
  @apply bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg;
}

/* AI Feedback Box */
.ai-feedback {
  @apply bg-indigo-500/5 border-l-4 border-indigo-500 
         rounded-r-xl p-4;
}

/* Score Badges */
.score-badge-high {
  @apply bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-sm font-semibold;
}
.score-badge-mid {
  @apply bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-full text-sm font-semibold;
}
.score-badge-low {
  @apply bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-sm font-semibold;
}

/* Resume Preview Paper */
.resume-paper {
  @apply bg-white text-slate-900 p-10 rounded-lg shadow-lg 
         font-sans text-[11pt] leading-relaxed;
}

/* Buttons */
.btn-primary {
  @apply bg-indigo-600 hover:bg-indigo-500 text-white 
         px-6 py-3 rounded-xl font-semibold transition-colors;
}
.btn-secondary {
  @apply bg-slate-700 hover:bg-slate-600 text-slate-200 
         px-6 py-3 rounded-xl font-semibold transition-colors;
}
```

---

# PART 3: THE 4 AI ENGINES (Backend Prompts)

These are the AI prompts that power the module. The frontend calls them via API.

## Engine 1: Chat Extractor
**Trigger:** User imports a chat transcript.
**Input:** Raw chat transcript (ChatGPT, Claude, Cursor format).
**Output:** Array of takeaways.

```
SYSTEM: You are the Chat Session Extractor. Analyze chat transcripts 
and extract resume-worthy takeaways for a tech professional.

For each significant exchange, extract:
- takeaway_type: PROJECT | SKILL | PROBLEM_SOLVED | OPTIMIZATION | ARCHITECTURE_DECISION
- title: 5-8 word description
- xyz_bullet_draft: Draft bullet using "Accomplished [X] as measured by [Y] by doing [Z]"
- tech_stack: Array of technologies used
- metrics_estimated: Any quantifiable impact
- context: 2-3 sentences explaining what was built/solved
- skills_demonstrated: Technical and soft skills shown
- resume_section: EXPERIENCE | PROJECTS | SKILLS
- confidence: HIGH | MEDIUM | LOW
- follow_up_needed: What details are missing?

RULES:
- Only flag HIGH if: specific tech used, concrete problem solved, 
  user's direct action clear, measurable outcome present
- Be OBJECTIVE. If trivial, mark LOW.
- Be STRICT about metrics. Ask for numbers.
- Never inflate achievements.
```

## Engine 2: Questionnaire AI
**Trigger:** After every user answer in the builder.
**Input:** Current phase, question ID, previous answers, imported takeaways, target role.
**Output:** Next question, AI feedback, suggested improvement, resume bullet draft, progress update.

```
SYSTEM: You are the Questionnaire AI inside a Resume Builder app. 
You conduct an adaptive interview with the user to build their tech resume.

INPUT FORMAT (JSON):
{
  "currentPhase": 2,
  "currentQuestionId": "exp_2_3",
  "previousAnswers": [...],
  "importedTakeaways": [...],
  "targetRole": "Senior Software Engineer",
  "careerLevel": "senior",
  "lastAnswer": "I worked on API optimization"
}

OUTPUT FORMAT (JSON):
{
  "nextQuestion": {
    "id": "exp_2_4",
    "phase": 2,
    "phaseName": "Experience Archaeology",
    "questionNumber": "4 of 12",
    "text": "What was the measurable outcome?",
    "whyItMatters": "Employers need proof that you delivered results.",
    "inputType": "metric",
    "exampleAnswer": "Reduced API latency by 42% (from 2.5s to 1.45s)...",
    "showExample": false,
    "validation": {
      "minLength": 20,
      "requiresMetric": true,
      "metricTypes": ["percentage", "number", "time", "currency"]
    }
  },
  "aiFeedback": {
    "quality": "needs_work",
    "comment": "This answer is too vague...",
    "suggestion": "Try: 'Reduced API latency by 42%...'",
    "bulletDraft": "Reduced API latency by 42%..."
  },
  "progress": {
    "overallPercent": 28,
    "currentPhasePercent": 45,
    "phaseStatus": "in_progress"
  },
  "checklistUpdates": [
    {"item": "experience_bullet_1", "status": "complete"}
  ],
  "resumeScore": {
    "current": 62,
    "previous": 45,
    "breakdown": {
      "experience": 65,
      "metrics": 55,
      "technicalDepth": 70
    }
  }
}

ADAPTIVE LOGIC RULES:
1. If imported chat data covers a topic, ask: "I see from your ChatGPT 
   session that you worked on [X]. Should I use that, or describe it differently?"
2. If answer is weak, do NOT proceed. Ask follow-up:
   - < 10 words: "Can you elaborate? I need more detail."
   - No metric: "Can you quantify this? Even an estimate helps."
   - Vague verb: "Use a stronger action verb. Try: Architected, Engineered, Optimized..."
   - Uses "we"/"team": "What did YOU specifically do?"
3. If answer contradicts previous: "You mentioned X earlier. Can you clarify?"
4. Progressive disclosure: Phase 1-2 = simple, Phase 5-6 = strict metrics
5. Always update resume score and explain changes
```

## Engine 3: Resume Compiler
**Trigger:** After Phase 7 completion or on-demand.
**Input:** All questionnaire answers + imported takeaways + target role.
**Output:** Complete resume draft.

```
SYSTEM: You are the Resume Compiler AI. Transform questionnaire 
answers and imported takeaways into a polished tech resume.

INPUT: All answers + takeaways + target role + career level
OUTPUT: Structured resume content

RULES:
1. XYZ FORMAT MANDATORY: "Accomplished [X] as measured by [Y] by doing [Z]"
2. METRIC DENSITY: 80%+ of bullets must contain quantifiable metrics
3. ACTION VERB VARIETY: Never repeat the same verb within a role
   - Architecture: Architected, Designed, Engineered, Spearheaded
   - Implementation: Built, Implemented, Deployed, Integrated
   - Optimization: Reduced, Improved, Accelerated, Streamlined
   - Leadership: Led, Mentored, Directed, Championed
4. TAILOR TO TARGET: Mirror keywords from target role JD
5. AI WORKFLOW MENTION: Include AI-assisted development (Claude Code, Copilot, Cursor)
6. PROFESSIONAL SUMMARY FORMULA:
   "[Level] [Domain] engineer with [X years] of experience [specialization]. 
   [Top achievement with metric]. [AI workflow mention]. 
   Seeking [target role] at [type of company]."
7. SKILLS CATEGORIZATION:
   Languages: [...]
   Frameworks & Libraries: [...]
   Infrastructure & Cloud: [...]
   Databases: [...]
   AI/ML Tools: [Claude Code, GitHub Copilot, Cursor, LangChain]
   Practices: [CI/CD, TDD, Microservices, Agile]
```

## Engine 4: HR Reviewer
**Trigger:** User clicks "Run HR Review".
**Input:** Resume draft + target job description (optional).
**Output:** Complete review report.

```
SYSTEM: You are the HR Reviewer AI. Simulate a real recruiter's 
7-second scan and 10-dimension deep audit.

## PASS 1: THE 7-SECOND SCAN (F-Pattern Simulation)
SECOND 0-1: Top horizontal — Name, contact, LinkedIn URL (100% view)
SECOND 1-3: Summary/headline — Is it specific? Quantified? No clichés?
SECOND 3-5: Skills section — Keyword match? AI tools mentioned?
SECOND 5-7: Current role — First 2-3 bullets only (71% view rate)
DECISION: YES / MAYBE / NO

## PASS 2: THE 10-DIMENSION AUDIT

| Dimension | Weight | What to Check |
|-----------|--------|---------------|
| ATS Compatibility | 15% | Single column, no tables/graphics, standard fonts, correct format |
| F-Pattern Optimization | 15% | Strongest stuff top third, first bullet = best, mobile-friendly |
| Content Relevance | 15% | Every line earns place, no >15yr detail, no repeated verbs |
| Metric Density | 15% | 80%+ bullets have numbers, specific, defensible, business impact |
| Visual Hierarchy | 10% | Clear size/weight, 35-45% white space, bullets not paragraphs |
| Keyword Alignment | 10% | 8-12 JD phrases mirrored, hard skills in both sections |
| Professional Presentation | 5% | Pro email, LinkedIn URL, no photo, zero typos |
| Technical Depth | 5% | Categorized skills with versions, architecture, scale, AI workflow |
| Career Narrative | 5% | Clear progression, no unexplained gaps, current role = most impressive |
| Length & Completeness | 5% | 1 page (<10 yrs), 2 max (10+), ~380 words/page, file <500KB |

## VERDICT SCALE
90-100: "Forward to HM immediately" (top 5%)
75-89:  "Strong candidate — minor revisions"
60-74:  "Maybe — significant work needed"
45-59:  "Unlikely — major restructuring required"
<45:    "Do not submit"

## STRICT RULES
- Be BRUTALLY honest. Do not inflate scores.
- Every critique must reference actual recruiter behavior data.
- If a bullet is weak, say so directly with specific fix.
- If ATS would auto-reject, flag it CRITICAL.
- If a metric seems inflated, challenge it.
- Provide redline draft: Original vs Suggested for each weak line.
```

---

# PART 4: THE 7-PHASE QUESTIONNAIRE

## Phase 1: Foundation (The Hook)
1. "What is your current role and years of experience in tech?"
2. "What is your PRIMARY engineering domain?"
3. "What type of role are you targeting?"
4. "What is the ONE thing you want employers to know first?"

## Phase 2: Experience Archaeology (Per Role)
1. "What was the most expensive problem you solved at [Company]?"
2. "What was the technical challenge?"
3. "What did YOU specifically do?"
4. "What was the measurable outcome?"
5. "What technologies did you use?"
6. "Who did you collaborate with?"
7. "What would have happened if you DIDN'T solve this?"

## Phase 3: Project Excavation (Per Project)
1. "What problem did this project solve?"
2. "Was this work, personal, or open-source?"
3. "What was your specific contribution?"
4. "What technical decisions did you make?"
5. "What was the outcome?"
6. "Can I see this? (GitHub, demo, blog)"

## Phase 4: Skills Inventory
1. "List every programming language you're comfortable with."
2. "List frameworks/libraries you've shipped production code with."
3. "List cloud platforms and infrastructure tools."
4. "List databases and data tools."
5. "List AI/ML tools and frameworks."
6. "Rate each: Expert / Proficient / Familiar"

## Phase 5: Impact Quantification
1. "Can you defend this number in an interview?"
2. "Do you have documentation/proof?"
3. "Is this metric impressive for your level?"
4. "Can we make this more specific?"

## Phase 6: Objective Audit
1. "Is this actually impressive, or are you describing duties?"
2. "Would a Staff Engineer at Google be impressed?"
3. "Is there any exaggeration?"
4. "If I asked your manager, would they confirm?"

## Phase 7: Final Assembly
1. Draft Professional Summary
2. Organize Experience bullets (strongest first)
3. Curate Projects
4. Organize Skills
5. Review Education
6. Final ATS check

---

# PART 5: DATABASE SCHEMA

```sql
-- Resume Builder Core Tables

CREATE TABLE resume_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(50),
  linkedin_url VARCHAR(500),
  github_url VARCHAR(500),
  portfolio_url VARCHAR(500),
  location VARCHAR(200),
  target_role VARCHAR(200),
  career_level VARCHAR(50),
  professional_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE resume_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES resume_profiles(id) ON DELETE CASCADE,
  company VARCHAR(200),
  role_title VARCHAR(200),
  location VARCHAR(200),
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  bullets JSONB, -- Array of {text, metrics, xyz_compliant}
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE resume_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES resume_profiles(id) ON DELETE CASCADE,
  project_name VARCHAR(200),
  description TEXT,
  tech_stack JSONB,
  bullets JSONB,
  link VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE resume_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES resume_profiles(id) ON DELETE CASCADE,
  category VARCHAR(100), -- 'languages', 'frameworks', 'infrastructure', 'databases', 'ai_tools', 'practices'
  skill_name VARCHAR(100),
  proficiency VARCHAR(20), -- 'expert', 'proficient', 'familiar'
  years_experience DECIMAL(4,1),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE resume_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES resume_profiles(id) ON DELETE CASCADE,
  institution VARCHAR(200),
  degree VARCHAR(200),
  field_of_study VARCHAR(200),
  graduation_date DATE,
  gpa DECIMAL(3,2),
  include_gpa BOOLEAN DEFAULT false,
  include_graduation_date BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE resume_takeaways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(50), -- 'chatgpt', 'claude', 'cursor', 'manual'
  session_id VARCHAR(100),
  session_date TIMESTAMP,
  takeaway_type VARCHAR(50), -- 'PROJECT', 'SKILL', 'PROBLEM_SOLVED', 'OPTIMIZATION', 'ARCHITECTURE_DECISION'
  title VARCHAR(200),
  xyz_bullet_draft TEXT,
  tech_stack JSONB,
  metrics_estimated JSONB,
  context TEXT,
  skills_demonstrated JSONB,
  resume_section VARCHAR(50), -- 'EXPERIENCE', 'PROJECTS', 'SKILLS'
  confidence VARCHAR(10), -- 'HIGH', 'MEDIUM', 'LOW'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected', 'used'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE resume_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES resume_profiles(id) ON DELETE CASCADE,
  version_name VARCHAR(100),
  target_role VARCHAR(200),
  target_company VARCHAR(200),
  content JSONB, -- Full resume content snapshot
  score INTEGER,
  score_breakdown JSONB,
  hr_review_result JSONB,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE resume_builder_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  current_phase INTEGER DEFAULT 1,
  current_question_id VARCHAR(100),
  phase_status JSONB, -- {1: 'complete', 2: 'in_progress', ...}
  answers JSONB, -- All answers so far
  overall_percent INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE resume_hr_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID REFERENCES resume_versions(id) ON DELETE CASCADE,
  target_jd TEXT,
  overall_score INTEGER,
  verdict VARCHAR(50),
  dimension_scores JSONB,
  fix_list JSONB,
  redline_draft JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_takeaways_user ON resume_takeaways(user_id);
CREATE INDEX idx_takeaways_status ON resume_takeaways(status);
CREATE INDEX idx_experience_profile ON resume_experience(profile_id);
CREATE INDEX idx_versions_profile ON resume_versions(profile_id);
CREATE INDEX idx_builder_progress_user ON resume_builder_progress(user_id);
```

---

# PART 6: API SPECIFICATION

```yaml
openapi: 3.0.0
info:
  title: Resume Builder API
  version: 1.0.0

paths:
  /api/resume/profile:
    get:
      summary: Get user's resume profile
    put:
      summary: Update resume profile

  /api/resume/questionnaire/next:
    post:
      summary: Get next question based on current state
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                currentPhase: { type: integer }
                currentQuestionId: { type: string }
                lastAnswer: { type: string }
                importedData: { type: array }
      responses:
        200:
          description: Next question with AI feedback

  /api/resume/questionnaire/answer:
    post:
      summary: Submit answer and get analysis
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                questionId: { type: string }
                answer: { type: string }
                phase: { type: integer }

  /api/resume/import:
    post:
      summary: Import chat transcript
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                source: { type: string, enum: [chatgpt, claude, cursor, manual] }
                transcript: { type: string }
                file: { type: string, format: binary }

  /api/resume/takeaways:
    get:
      summary: List all takeaways
      parameters:
        - name: status
          in: query
          schema: { type: string, enum: [pending, confirmed, rejected, used] }
    put:
      summary: Update takeaway status

  /api/resume/compile:
    post:
      summary: Compile resume from all data

  /api/resume/review:
    post:
      summary: Run HR review
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                versionId: { type: string }
                targetJd: { type: string }

  /api/resume/export:
    post:
      summary: Export resume
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                versionId: { type: string }
                format: { type: string, enum: [pdf, docx, markdown, json] }
                targetRole: { type: string }
                targetCompany: { type: string }

  /api/resume/versions:
    get:
      summary: List resume versions
    post:
      summary: Create new version
```

---

# PART 7: STATE MANAGEMENT

```typescript
interface ResumeBuilderState {
  userProfile: {
    name: string;
    email: string;
    phone: string;
    linkedin: string;
    github: string;
    location: string;
    targetRole: string;
    careerLevel: 'junior' | 'mid' | 'senior' | 'staff' | 'principal';
  };

  builderProgress: {
    currentPhase: number; // 1-7
    currentQuestion: string;
    overallPercent: number;
    phaseStatus: Record<number, 'locked' | 'in_progress' | 'complete'>;
  };

  resumeContent: {
    professionalSummary: string;
    experience: ExperienceEntry[];
    projects: ProjectEntry[];
    skills: SkillsSection;
    education: EducationEntry[];
  };

  importedTakeaways: Takeaway[];
  importedSessions: ChatSession[];

  resumeScore: {
    overall: number;
    breakdown: Record<string, number>;
    history: ScoreHistoryEntry[];
  };

  hrReview: {
    status: 'pending' | 'in_progress' | 'complete';
    score: number;
    dimensions: DimensionScore[];
    fixList: FixItem[];
    verdict: string;
  };

  versions: ResumeVersion[];
  currentVersionId: string;

  ui: {
    previewMode: 'styled' | 'ats_raw' | 'heatmap';
    previewZoom: number;
    showAiFeedback: boolean;
    activePanel: string;
  };
}
```

---

# PART 8: COMPONENT INVENTORY

## Layout Components
- `ResumeLayout` — Wrapper with sidebar navigation
- `ResumeHeader` — Module-specific header with score
- `ResumeSidebar` — Phase navigation + checklist
- `ResumePreviewPanel` — Live resume preview

## Hub Page Components
- `ResumeHub` — Main dashboard
- `ScoreGauge` — Circular progress indicator (120px, animated)
- `ActivityFeed` — Recent imports/builds
- `VersionList` — Resume version history
- `QuickActionCard` — Import/Build/Export shortcuts

## Builder Page Components
- `QuestionnaireEngine` — Main questionnaire container
- `QuestionCard` — Individual question display
- `AnswerInput` — Dynamic input (text, tags, metric, slider, multiple choice)
- `AiFeedbackBox` — AI suggestion/feedback display
- `ProgressBar` — Phase progress indicator (7 segments)
- `PhaseNavigator` — Phase tabs/jump navigation

## Import Page Components
- `ImportHub` — Import method selection
- `PasteTranscript` — Textarea for raw chat
- `ApiConnector` — OAuth/API connection UI
- `FileUploader` — Drag-and-drop file upload
- `TakeawayReviewGrid` — Review extracted items
- `TakeawayCard` — Individual takeaway with actions

## Review Page Components
- `HrReviewReport` — Full review report
- `ScoreCard` — Dimension score display
- `FixList` — Prioritized fix items
- `RedlineDraft` — Side-by-side original vs suggested
- `VerdictBanner` — Overall verdict display

## Export Page Components
- `ExportSettings` — Format and tailoring options
- `VersionManager` — Create/manage versions
- `DiffViewer` — Compare versions
- `ExportButton` — Generate and download

## Shared Components
- `ChecklistItem` — Reusable checklist row
- `MetricInput` — Number + unit selector
- `TagInput` — Chip/tag input with autocomplete
- `VoiceInput` — Voice-to-text button
- `AiTypingIndicator` — Three-dot animation
- `Tooltip` — Contextual help
- `Modal` — Confirmation/dialog
- `Toast` — Success/error notifications

---

# PART 9: CRITICAL RULES FOR THE FRONTEND

1. **Single-column layout ONLY** in resume preview (ATS requirement)
2. **No tables, graphics, or text boxes** in resume preview
3. **Font: Arial/Calibri 10.5-11pt** in preview (ATS-safe)
4. **Real-time sync** — Every answer immediately reflects in preview
5. **Mobile-first** — 36% of resumes reviewed on mobile first
6. **Auto-save** — Every answer saved to backend immediately
7. **Version control** — User can create multiple tailored versions
8. **Dark theme UI** with white paper preview (contrast)
9. **Accessibility** — WCAG 2.1 AA compliance
10. **Performance** — Page load < 2s, AI response < 3s

---

# PART 10: CONVERSATION PROTOCOL

## How This Collaboration Works

You (AI Coding Agent) are the **Specialist AI (Frontend Architect)**.
The user is the **Project Owner**.

### Your Rules:
1. **Start with QUESTIONS about the codebase.** Do NOT jump to implementation.
2. **Ask for specific files** before proposing solutions.
3. **One request at a time.** Iterate.
4. **Flag backend gaps immediately.** If you need a schema, say so.
5. **When converged, produce RESULT.md.** Follow standard spec format.

### User's Rules:
1. Fetch exactly what you request. No extra files.
2. If a file doesn't exist, they'll say so. No made-up code.
3. If your request is ambiguous, they'll ask for clarification.
4. They'll track conversation state.

### State Tracker:
```
Round 1:
- Specialist asked for: [app routing, design system, module structure]
- We provided: [waiting for you]
- Decisions made: [TBD]

Round 2:
- Specialist asked for: [TBD]
- We provided: [TBD]
- Decisions made: [TBD]

Convergence status: [ongoing]
```

### When to Stop:
- You say: "I have enough context to produce RESULT.md"
- You've asked for context 3 times and received it
- 5 rounds without new questions
- User says "that's enough, produce the result"

### RESULT.md Must Include:
1. Component Architecture — Full React component tree with props
2. Page Implementations — All 6 pages with layout and logic
3. State Management — Zustand/Redux store design
4. API Integration — How frontend calls the 4 AI engines
5. Database Schema — SQL (already provided above, confirm or modify)
6. Tailwind Styles — Complete class definitions
7. Animation Specs — Transitions, micro-interactions
8. Mobile Adaptations — Responsive behavior
9. Testing Plan — What to test and how

---

# ❓ YOUR FIRST QUESTION (Ask the User)

"I need to see your existing app structure to understand where the Resume 
module fits. Can you show me:

1. **The current page routing structure** — How are Tracker, Projects, Learning, Finance routed? Where should Resume fit?

2. **The existing design system / Tailwind config** — What colors, fonts, spacing tokens are already defined? How should Resume extend them?

3. **How other modules are structured** — Show me one complete module (e.g., Projects) so I can mirror the pattern for Resume.

Please provide the actual source code for these files."

---

**END OF INITIALIZATION PACKAGE**

> Paste this entire document into your AI coding agent chat to start the collaboration.
