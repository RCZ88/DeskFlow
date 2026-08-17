# RHEO Content Engine v2.0 — Feature Specification
## Brainstorm-to-Episode Pipeline & Content Equation Analytics

---

## 1. MISSION / USER STORY

As a content creator, I open a single chat interface in RHEO and "yap" freely about anything — ideas, observations, framework improvements, app bugs, analytics insights. The AI listens, categorizes, and routes each thought automatically to the correct bucket (Ideas, Framework Updates, System Improvements, Analytics Insights). I never have to decide "where does this go?" before I speak.

Later, I browse my accumulated ideas by series, compile them into episodes, generate script bullet points, track what was tried, and see performance analytics — all inside RHEO.

---

## 2. CORE FEATURES

### 2.1 Brainstorm Chat (The "Yap" Interface)
- **Single input, zero friction.** One chat box. No forms. No dropdowns.
- **Real-time AI categorization.** As the user types, the AI classifies the intent.
- **Auto-routing with confirmation.** The AI suggests where the thought belongs; user can confirm, redirect, or ignore.
- **Persistent sessions.** Brainstorms are saved as sessions. User can resume any previous session.

### 2.2 Auto-Categorization Engine
The AI classifies every message into one of these types:

| Type | Description | Destination |
|---|---|---|
| `content_idea` | A video concept, hook, visual idea, or topic | Idea Pool (tagged with suggested series) |
| `framework_update` | A change to the content framework, format rules, or workflow | Framework Registry (versioned) |
| `system_improvement` | App feature request, bug, UX idea | System Backlog (separate from content) |
| `analytics_insight` | Observation about performance, algorithm patterns, audience behavior | Analytics Insights (linked to episodes/series) |
| `general_thought` | Unstructured, not yet actionable | Unsorted Pool (review later) |

**Extraction fields per type:**
- `content_idea`: title, description, hook_angle, series_tag, visual_idea, audio_vibe, estimated_length, priority (1-5)
- `framework_update`: framework_name, change_type (add/modify/delete), detail, rationale
- `system_improvement`: title, description, priority, category (feature/bug/ux)
- `analytics_insight`: metric_mentioned, observation, hypothesis, related_episode_id (optional)

### 2.3 Series & Episode Management
- **Series:** A themed content arc (e.g., "SVM Math Series", "AI Guardrails", "Zero-Cost Dev Stack").
- **Episodes:** Individual videos within a series.
- **Idea Compilation:** Drag/select ideas from the pool into an episode. AI can suggest "These 3 ideas fit together as Episode 4."
- **Script Generation:** From compiled ideas, AI generates: hook options, core points, keywords, visual overlay plan, caption draft.
- **Status Pipeline:** `idea` → `scripting` → `filming` → `editing` → `published` → `analyzed`.

### 2.4 Content Equation Analytics
Track the "equation" that predicts performance:

```
Content Score = (Hook_Strength × 0.25) + (Visual_Asset_Quality × 0.20) + (Audio_Match × 0.15) + (Value_Delivery_Speed × 0.20) + (Format_Consistency × 0.20)
```

**Per-episode metrics to store:**
- views, avg_watch_time, skip_rate, likes, saves, shares, comments, followers_gained
- hook_text, audio_used, format_type, visual_asset_type, length_seconds
- Derived: save_rate, engagement_rate, follower_conversion_rate

**Insights to surface:**
- "Videos with visual assets get 6× views"
- "Full-face format has 2× AWT vs small face cam"
- "Episodes 10-11 = algorithm maturation point"
- Trend detection: "Your SVM series outperforms Guardrails by 3×"

### 2.5 Trial & Error Log
For every episode, track:
- What was tried (hook variant, audio, format, pacing)
- What the hypothesis was
- What the result was
- Learnings extracted

This creates a "Content Memory Bank" inside the app — the exact table from the context handoff, but queryable and auto-updating.

### 2.6 Framework Registry (Versioned)
Store all content frameworks:
- 3-Font Hierarchy (Anton/Spartan/Montserrat)
- Face Cam Zone rules
- Hook constraints (3-6 words, stakes-first)
- The 4-Stage Learning Framework (Python → NumPy → PyTorch → Hardware)
- The 4-Stage ML Learning Framework (Understand → Math → Code → Optimize)
- Any new frameworks brainstormed

When the AI detects a `framework_update`, it creates a new version. User can diff versions and rollback.

---

## 3. DATA MODELS (SQLite / better-sqlite3)

### 3.1 brainstorm_sessions
```sql
CREATE TABLE brainstorm_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT DEFAULT 'Untitled Session',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'archived')),
  summary TEXT -- AI-generated summary of the session
);
```

### 3.2 brainstorm_messages
```sql
CREATE TABLE brainstorm_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  ai_classification TEXT, -- content_idea | framework_update | system_improvement | analytics_insight | general_thought
  extracted_entities JSON, -- structured extraction
  user_confirmed_classification BOOLEAN DEFAULT NULL, -- NULL = pending, TRUE = confirmed, FALSE = rejected
  routed_to_entity_type TEXT, -- idea | framework | system_backlog | analytics | null
  routed_to_entity_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES brainstorm_sessions(id)
);
```

### 3.3 ideas
```sql
CREATE TABLE ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  hook_angle TEXT,
  series_tag TEXT,
  visual_idea TEXT,
  audio_vibe TEXT,
  estimated_length INTEGER, -- seconds
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status TEXT DEFAULT 'raw' CHECK (status IN ('raw', 'refined', 'approved', 'rejected', 'used')),
  source_session_id INTEGER,
  source_message_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_session_id) REFERENCES brainstorm_sessions(id),
  FOREIGN KEY (source_message_id) REFERENCES brainstorm_messages(id)
);
```

### 3.4 series
```sql
CREATE TABLE series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('planned', 'active', 'paused', 'completed')),
  target_episode_count INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.5 episodes
```sql
CREATE TABLE episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'idea' CHECK (status IN ('idea', 'scripting', 'filming', 'editing', 'published', 'analyzed')),
  hook_text TEXT,
  script_bullet_points JSON,
  visual_overlay_plan JSON,
  caption_draft TEXT,
  final_video_path TEXT,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (series_id) REFERENCES series(id)
);
```

### 3.6 episode_ideas (junction)
```sql
CREATE TABLE episode_ideas (
  episode_id INTEGER NOT NULL,
  idea_id INTEGER NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (episode_id, idea_id),
  FOREIGN KEY (episode_id) REFERENCES episodes(id),
  FOREIGN KEY (idea_id) REFERENCES ideas(id)
);
```

### 3.7 performance_metrics
```sql
CREATE TABLE performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id INTEGER NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'twitter')),
  views INTEGER DEFAULT 0,
  avg_watch_time REAL DEFAULT 0, -- seconds
  skip_rate REAL DEFAULT 0, -- percentage 0-100
  likes INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  followers_gained INTEGER DEFAULT 0,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (episode_id) REFERENCES episodes(id)
);
```

### 3.8 content_equation_scores
```sql
CREATE TABLE content_equation_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id INTEGER NOT NULL,
  hook_strength REAL DEFAULT 0, -- 0-10
  visual_asset_quality REAL DEFAULT 0,
  audio_match REAL DEFAULT 0,
  value_delivery_speed REAL DEFAULT 0,
  format_consistency REAL DEFAULT 0,
  overall_score REAL GENERATED ALWAYS AS (
    (hook_strength * 0.25) + (visual_asset_quality * 0.20) + (audio_match * 0.15) + (value_delivery_speed * 0.20) + (format_consistency * 0.20)
  ) STORED,
  FOREIGN KEY (episode_id) REFERENCES episodes(id)
);
```

### 3.9 trial_logs
```sql
CREATE TABLE trial_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id INTEGER,
  experiment TEXT NOT NULL,
  hypothesis TEXT,
  result TEXT,
  learning TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (episode_id) REFERENCES episodes(id)
);
```

### 3.10 frameworks
```sql
CREATE TABLE frameworks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  rules JSON NOT NULL, -- array of rule objects
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.11 framework_versions
```sql
CREATE TABLE framework_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  framework_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  rules JSON NOT NULL,
  change_summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (framework_id) REFERENCES frameworks(id)
);
```

---

## 4. UI SPECIFICATIONS

### 4.1 Navigation Structure
```
RHEO
├── Workspace (existing)
├── Content Engine (NEW)
│   ├── Brainstorm (chat interface)
│   ├── Idea Pool (kanban/list view)
│   ├── Series (grid of series cards)
│   │   └── Series Detail (episodes list + analytics)
│   ├── Episode Detail (script + metrics + trial log)
│   ├── Frameworks (versioned rules)
│   └── Analytics Dashboard (content equation trends)
└── Settings
```

### 4.2 Brainstorm Chat UI
- **Layout:** Full-width chat, sidebar shows session list.
- **Input:** Single textarea at bottom. No category dropdown. Just type and send.
- **AI Response Bubble:** Shows classification badge (e.g., "💡 Content Idea detected"). User clicks ✅ to confirm or 🔄 to reclassify.
- **Auto-suggest:** If the AI detects a series match, it shows: "Add to 'SVM Series'?"
- **Session Summary:** At the top of each session, an AI-generated 1-line summary of what was discussed.

### 4.3 Idea Pool UI
- **Views:** Kanban (by status: raw → refined → approved → used) or List (sortable by priority, date, series).
- **Cards:** Title, series tag (colored badge), priority dots (1-5), hook angle preview.
- **Actions:** Edit, Delete, Move to Episode, Mark as Used.
- **Filter:** By series, by status, by priority, by keyword search.

### 4.4 Series Detail UI
- **Header:** Series title, progress bar (episodes completed / target), average performance score.
- **Episodes List:** Vertical timeline. Each episode card shows status badge, hook text, thumbnail placeholder, and quick metrics (views, AWT, saves).
- **Actions:** Add Episode, Compile Ideas into New Episode, View Series Analytics.

### 4.5 Episode Detail UI
- **Tabs:**
  1. **Script:** Compiled ideas → script bullet points (editable). Hook options. Keywords. Visual overlay plan.
  2. **Assets:** Placeholder for video file, thumbnail, caption draft.
  3. **Metrics:** Performance data table + charts (views over time, AWT, save rate).
  4. **Trials:** Experiment log. Add new trial with hypothesis/result/learning.
  5. **AI Compile:** Button "Regenerate Script from Ideas" — sends all linked ideas to AI, returns structured script.

### 4.6 Analytics Dashboard UI
- **Content Equation Score:** Radar chart showing 5 dimensions per episode.
- **Trend Lines:** Views, AWT, skip rate, follower growth over time.
- **Insights Cards:** AI-generated observations (e.g., "Videos with visual assets outperform screen recordings by 6×").
- **Series Comparison:** Bar chart comparing average performance across series.

### 4.7 Frameworks UI
- **List View:** All frameworks with version number and active status.
- **Detail View:** Rules displayed as cards. Diff view between versions.
- **Update Flow:** When a brainstorm message triggers a framework update, show a "Pending Updates" banner. User reviews and merges.

---

## 5. AI INTEGRATION SPEC

### 5.1 Brainstorm Classification Prompt
```
You are the Content Router for RHEO. Analyze the user's message and classify it.

Classifications:
- content_idea: A video concept, hook, topic, or visual idea
- framework_update: A change to content rules, format, workflow, or strategy
- system_improvement: A feature request, bug, or UX idea for the RHEO app itself
- analytics_insight: An observation about performance, audience, or algorithm behavior
- general_thought: Unstructured, not yet actionable

For content_idea, extract:
- title: concise name
- description: what the video is about
- hook_angle: the scroll-stopping claim
- series_tag: which series this belongs to (suggest new if none match)
- visual_idea: what to show on screen
- audio_vibe: energy level or sound type
- estimated_length: short (<30s), medium (30-60s), long (60s+)
- priority: 1-5

For framework_update, extract:
- framework_name: which framework to update
- change_type: add | modify | delete
- detail: the exact rule change
- rationale: why this change matters

Respond in JSON only. No markdown. No explanation.
```

### 5.2 Script Compilation Prompt
```
You are a Content Director. The user has selected these ideas for an episode:
[IDEAS_JSON]

Generate:
1. Three hook options (3-6 words each, high stakes)
2. Core points to say (bullet points, not full script)
3. Keywords to use naturally
4. Visual overlay plan (what appears when, what font/size)
5. Caption draft (Instagram caption, 5 hashtags max)
6. Estimated length

Follow the user's active frameworks:
[ACTIVE_FRAMEWORKS_JSON]

Respond in JSON only.
```

### 5.3 Analytics Insight Prompt
```
You are a Content Analyst. Here is the performance data for the user's recent episodes:
[METRICS_JSON]

Identify:
1. Top 3 patterns (what consistently works)
2. Top 3 anomalies (what broke expectations)
3. One actionable recommendation for the next episode
4. Content Equation score breakdown per episode

Be specific. Reference exact numbers. No vague advice.
```

### 5.4 Session Summary Prompt
```
Summarize this brainstorm session in one sentence. Capture the main theme or breakthrough idea. Max 15 words.
```

---

## 6. API / SERVICE LAYER (Electron Main Process)

Implement these IPC handlers:

```typescript
// Brainstorm
brainstorm:createSession(title?: string) -> { sessionId, title, createdAt }
brainstorm:sendMessage(sessionId, content) -> { messageId, aiClassification, extractedEntities, suggestion }
brainstorm:confirmClassification(messageId, confirmedType, routedTo?) -> void
brainstorm:getSessions() -> Session[]
brainstorm:getSessionMessages(sessionId) -> Message[]
brainstorm:generateSummary(sessionId) -> string

// Ideas
ideas:getAll(filters?) -> Idea[]
ideas:updateStatus(ideaId, status) -> void
ideas:updatePriority(ideaId, priority) -> void
ideas:delete(ideaId) -> void
ideas:search(query) -> Idea[]

// Series
series:create(title, description, targetCount?) -> Series
series:getAll() -> Series[]
series:getById(seriesId) -> Series & Episodes[]
series:updateStatus(seriesId, status) -> void

// Episodes
episodes:create(seriesId, title, ideaIds[]) -> Episode
episodes:getById(episodeId) -> Episode & Ideas[] & Metrics & Trials[]
episodes:updateStatus(episodeId, status) -> void
episodes:updateScript(episodeId, scriptData) -> void
episodes:compileScript(episodeId) -> ScriptResult // calls AI
episodes:linkIdea(episodeId, ideaId) -> void
episodes:unlinkIdea(episodeId, ideaId) -> void

// Metrics
metrics:record(episodeId, platform, data) -> void
metrics:getByEpisode(episodeId) -> Metrics[]
metrics:getSeriesAnalytics(seriesId) -> AggregatedMetrics
metrics:getContentEquation(episodeId) -> ScoreBreakdown

// Trials
trials:create(episodeId, experiment, hypothesis, result, learning) -> Trial
trials:getByEpisode(episodeId) -> Trial[]

// Frameworks
frameworks:getAll() -> Framework[]
frameworks:getById(frameworkId) -> Framework & Versions[]
frameworks:create(name, description, rules) -> Framework
frameworks:update(frameworkId, rules, changeSummary) -> Framework // auto-increments version
frameworks:rollback(frameworkId, version) -> Framework
frameworks:getActive() -> Framework[]
```

---

## 7. IMPLEMENTATION PHASES

### Phase 1: Brainstorm Core (Week 1)
- [ ] Database schema (all tables)
- [ ] Brainstorm chat UI (React, full-width, session sidebar)
- [ ] AI classification integration (OpenRouter, single prompt)
- [ ] Auto-routing with confirmation flow
- [ ] Session persistence

### Phase 2: Idea Pool & Series (Week 2)
- [ ] Idea Pool kanban/list view
- [ ] Series creation and management
- [ ] Episode creation from ideas
- [ ] Basic status pipeline

### Phase 3: Script & AI Compilation (Week 3)
- [ ] Episode detail UI with tabs
- [ ] Script compilation AI prompt
- [ ] Visual overlay plan generation
- [ ] Caption draft generation

### Phase 4: Analytics & Content Equation (Week 4)
- [ ] Performance metrics input UI
- [ ] Content Equation score calculation
- [ ] Analytics dashboard (charts)
- [ ] AI insight generation

### Phase 5: Frameworks & Trials (Week 5)
- [ ] Framework registry UI
- [ ] Versioning system
- [ ] Trial log UI
- [ ] Framework update detection from brainstorm

---

## 8. DESIGN TOKENS (Match Existing RHEO)

Use the existing "Clement Dark Tech" color grade:
- Background: `#0a0a0f` (near-black)
- Surface: `#14141b` (card backgrounds)
- Primary: `#f5c518` (yellow, for hooks/highlights)
- Secondary: `#00d4ff` (cyan, for code/metrics)
- Text Primary: `#ffffff`
- Text Secondary: `#a0a0b0`
- Border: `#2a2a35`
- Font: Inter or existing system font
- Border Radius: 8px (cards), 12px (face cam style — reuse for media previews)

---

## 9. CRITICAL CONSTRAINTS

1. **Single chat input.** No category dropdowns in the brainstorm interface. The AI decides; user confirms.
2. **Confirmation required.** Auto-routing must show a ✅/🔄 option. Never silently delete user thoughts.
3. **5 hashtags max.** Enforce this in the caption generation prompt and UI validation.
4. **Hook 3-6 words.** Enforce in script compilation prompt. Reject longer hooks.
5. **Face zone respect.** If the app ever shows video previews, respect the "right 320px, bottom 400px = no text" rule from the visual design system.
6. **No decisions after 10 PM.** Add a UI nudge if the user is active after 10 PM local time: "Sleep > Strategy. Come back tomorrow."
7. **SQLite only.** No new backend. Use existing better-sqlite3 setup.
8. **OpenRouter for AI.** All AI calls go through existing OpenRouter integration.

---

## 10. SEED DATA

On first run, populate the `frameworks` table with the user's existing rules:

```json
[
  {
    "name": "3-Font Hierarchy",
    "rules": [
      {"rule": "Hook font = Anton, 64pt, Yellow, 3px black stroke"},
      {"rule": "Body font = League Spartan, 48pt, White, 3px black stroke"},
      {"rule": "Caption font = Montserrat Bold, 40pt, White/Cyan, 3px black stroke"}
    ]
  },
  {
    "name": "Hook Constraints",
    "rules": [
      {"rule": "Maximum 6 words"},
      {"rule": "Must deliver stakes immediately"},
      {"rule": "Use 'you' or 'I' — write for the ear"},
      {"rule": "No robotic, abstract language"}
    ]
  },
  {
    "name": "Format Rules",
    "rules": [
      {"rule": "Full face centered/upper-third, no small face cam"},
      {"rule": "Visual asset required every video (plot, diagram, graphic)"},
      {"rule": "Hard cut every 3-4s, no fades"},
      {"rule": "Face cam zone: bottom-right 270x360px, 12px radius, 24px margin"},
      {"rule": "Right 320px and bottom 400px = NO TEXT EVER"}
    ]
  },
  {
    "name": "4-Stage ML Learning",
    "rules": [
      {"rule": "Stage 1: Pure Python — build from scratch, no libraries"},
      {"rule": "Stage 2: NumPy — vectorize, replace loops with arrays"},
      {"rule": "Stage 3: PyTorch — use libraries with understanding"},
      {"rule": "Stage 4: Hardware — CUDA/GPU optimization"}
    ]
  },
  {
    "name": "3 AM Rule",
    "rules": [
      {"rule": "No strategic decisions after 10 PM"},
      {"rule": "AI must enforce sleep over strategy debates at night"}
    ]
  }
]
```

---

## 11. SUCCESS CRITERIA

- [ ] User can open Brainstorm, type "I have an idea for SVM ep 3 about building from scratch first", and the AI classifies it as `content_idea`, suggests series "SVM Math Series", and adds it to the Idea Pool.
- [ ] User can drag 3 ideas into a new Episode, click "Compile Script", and get hook options + bullet points.
- [ ] User can input performance metrics for a published episode and see a Content Equation radar chart.
- [ ] User can view the Frameworks page, see version history, and rollback if needed.
- [ ] The entire flow works offline (SQLite local) with AI calls via OpenRouter.
