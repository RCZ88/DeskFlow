# Round 3 — opencode CONTEXT Reply (to relay to Specialist verbatim)

---

**CONTEXT — Round 3 reply**

Final context pull. All requested sections verbatim from `agent/docs/RHEO_Content_Engine_v2_Spec.md`, followed by implementation notes from the codebase.

---

## 1. §3.4–3.11 DDL (verbatim from spec)

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

## 2. §4.3–4.7 UI definitions (verbatim from spec)

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

Also §4.1 Navigation Structure (for your sidebar/route decisions):
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

---

## 3. §5.2–5.4 Prompts (verbatim from spec)

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

## 4. §6 Non-Brainstorm IPC Handlers (verbatim from spec)

```typescript
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

## 5. Implementation notes (codebase facts — not in spec, must be respected)

1. **IPC envelope convention:** All existing handlers use the `{success, data?, error?}` shape via `ipcMain.handle` (see `focusGroup:*` in src/main.ts ~L5046, and `lifePhase:*`). The spec's raw return shapes should be wrapped in that envelope — renderer consumers check `res.success` before reading `res.data`.

2. **AI routing (CRITICAL for compileScript + insights + summaries):** all AI calls in main go through `runWithFallback`/`buildChain` from `src/services/providers/router.ts`. `buildChain` takes a **CLOSED feature union** — currently `'researchDigest' | 'goalAssistant' | 'resumeBuilder' | 'category' | 'colors'`. Any new AI feature (e.g. `'contentEngine'` or `'scriptCompile'`) MUST be added to that union, or the TS build fails. Provider chain = configured providers → OpenRouter fallback.

3. **`estimated_length` type fix (agreed Round 2):** spec §5.1 prompt says "short (<30s), medium (30-60s), long (60s+)" but table §3.3 is `INTEGER -- seconds`. Use `estimated_length_sec INTEGER` everywhere; instruct the LLM to output seconds (short≈15, medium≈45, long≈120 default mapping) and normalize renderer-side.

4. **JSON envelope for `brainstorm:sendMessage` response (agreed Round 2):** `{ classification, confidence (0–1), entities, suggestion }`. No extraction contract exists in the spec for `system_improvement` / `analytics_insight` — you'll define those in RESULT.md (spec only defines fields for content_idea + framework_update; general_thought = empty entities).

5. **DB creation pattern:** tables are created via guarded migration at main-process startup (`PRAGMA table_info` + CREATE IF MISSING — see `src/domains/focus/focusSchema.ts`). SQLite only; better-sqlite3.

6. **Seed data (§10, 5 frameworks)** populates `frameworks` on first run — same pattern as the `life_phases` starter-phase seed in main.ts.

7. **Streaming for brainstorm (agreed Round 3):** reuse `providerChatCall` + `onProviderChunk` (`{delta, done, full, error}`), buffer chunks in a ref, parse JSON on `d.done`, fallback parser strips ```json fences on hallucinated markdown. No backend streaming work needed.

That is the entire remaining spec. You now have 100% of the context — produce RESULT.md.