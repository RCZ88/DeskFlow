# PROMPT — Structured AI Prompts + Parsing + Grid Layout for AiPage

## Persona
You are a senior full-stack engineer (TypeScript/React/Electron). You design complete, implementable solutions. You produce specs so precise that another AI can implement them without asking follow-up questions. You never produce vague "consider this" suggestions — every statement is either a concrete code path or a file diff.

## Task
Redesign the **AiPage** (`src/pages/AiPage.tsx`) and **AIService** (`src/services/AIService.ts`) so that:

### 1. Prompts Return Structured JSON (not plain text)
Rewrite these 3 prompt templates so the AI returns parseable JSON:

**A. Daily Brief** (currently at AIService line 167, `DAILY_BRIEF_PROMPT`)
  → Return JSON: `{ signal: string (2-3 words), observation: string (1 sentence), suggestion: string (1 sentence), trend: 'improving' | 'stable' | 'declining', metrics: { key: string, value: string, trend: 'up' | 'down' | 'flat' }[] }`

**B. Pattern Analysis** (currently at AIService line 331, inline in `analyzePatterns()`)
  → Return JSON: `{ score: number (0-100), assessment: string, patterns: { name: string, description: string, impact: 'positive' | 'neutral' | 'negative', frequency: string, recommendation?: string }[] }`

**C. Sleep Analysis** (currently at AIService line 353, inline in `analyzeSleep()`)
  → Return JSON: `{ score: number (0-100), correlation: string, optimalBedtime?: string, insomnia: string, suggestions: { icon: string, title: string, detail: string }[] }`

### 2. Parsing Engine
- Reuse existing `cleanAIJson()` and `parseAIJson()` from AIService.ts
- Add a **fallback parse layer**: if JSON.parse fails, use regex to extract structured data from plain text (e.g., `score: 85` → {score: 85})
- Each of the 3 rewritten methods should return the parsed typed object, not a raw string

### 3. Persistence (survive reload)
- After fetching + parsing, save to `localStorage` under keys: `ai_patterns`, `ai_sleep`, `ai_daily_brief`
- On component mount, load from localStorage first (show immediately), then fetch fresh data in background
- User can manually regenerate each section independently; regeneration overwrites localStorage
- Anomalies are transient (refetch on mount = fine, no caching)
- Chat history already persists in state (fine as-is)

### 4. Grid Layout (replace flat vertical stack)
Current: `<div className="space-y-8">` with all 7 sections stacked.
Target: Responsive grid with section-level visual hierarchy:
```
Desktop (lg+):     3 columns — Daily Brief spans full width | Patterns + Sleep side by side | Weekly + Digest + Chat + Anomalies in flexible rows
Tablet (md):       2 columns
Mobile (sm):       1 column (stack)
```
Each section in a `GlassCard` with its accent color top border. Sections can have independent heights (no equal-height constraints).

### 5. Styled Sub-Components (not raw text)
Replace `ContentList` (which just `split('\n')` → bullet text) with proper structured rendering:

**PatternCard** — for pattern analysis results:
- Score bar at top (0-100, color-coded: red < 40, amber < 70, green >= 70)
- Assessment text below
- List of patterns, each with: name badge, impact icon (positive/negative/neutral), description, frequency tag, collapsible recommendation

**SleepCard** — for sleep analysis results:
- Score bar same as above
- Correlation text line
- Optimal bedtime display (with clock icon)
- Suggestion cards in a 2-column grid, each with: icon, title, detail text

**BriefCard** (rewrite existing AiBriefCard) — for daily brief:
- Signal badge (trend-colored pill)
- Observation + suggestion as distinct paragraphs
- Metrics row with inline trend indicators (up/down arrows)

### 6. TypeScript Types
Add these missing IPC method types to the `Window` interface in `App.tsx` (around line 249):
```typescript
analyzePatterns(): Promise<{ success: boolean; content: string | ParsedPatternResponse; error?: string }>;
analyzeSleep(): Promise<{ success: boolean; content: string | ParsedSleepResponse; error?: string }>;
dataChatQuery(params: { query: string; history: Message[] }): Promise<{ success: boolean; content: string; error?: string }>;
```

## Context
Read `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\agent\docs\ai-page-redesign\CONTEXT_BUNDLE.md` for full code context including:
- AIService.ts prompt locations and current text
- AiPage.tsx current component structure and state variables
- All IPC handlers and data flow
- Existing GlassCard, AiBriefCard, WeeklyReviewCard, TopicDigestCard, LoadingState components
- DB schema and caching strategy
- Galaxy dark theme design tokens
- 21st.dev Stats Cards and DashboardMetricCard patterns

## Output Format
Write your full response to **`C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\agent\docs\ai-page-redesign\RESULT.md`**.

Structure RESULT.md as follows:

```markdown
# RESULT — AiPage Redesign

## 1. Prompt Rewrites

### Daily Brief (`AIService.ts` line 167)
[Full prompt text that returns JSON with the exact schema above]

### Pattern Analysis (`AIService.ts` line 331)
[Full prompt text that returns JSON]

### Sleep Analysis (`AIService.ts` line 353)
[Full prompt text that returns JSON]
```

## 2. Parsing Layer
[Exact code for the fallback parse functions for each of the 3 response types]

## 3. Persistence Strategy
[Exact code: localStorage read/write helpers + refresh logic]

## 4. AiPage Layout
[Exact grid layout with numbered sections showing which component goes where, responsive breakpoints]

## 5. Sub-Component Specs
[Exact code for PatternCard, SleepCard, updated BriefCard — full component source or precise pseudocode with every class, prop, and style]

## 6. TypeScript Changes
[Precise diff for App.tsx Window interface]

## 7. Integration
[How AiPage.tsx wires everything together: imports, state, effect for local caching + background fetch]

## Constraints
- Tailwind v4 only — `@import "tailwindcss"` in index.css, never v3 directives
- Card padding p-5 (20px), border radius rounded-xl max
- No box-shadow, no animated layout properties (only transform + opacity)
- Animation easing: `cubic-bezier(0.16, 1, 0.3, 1)`, durations: 150ms/250ms/400ms
- No new npm packages — only React, framer-motion, lucide-react
- GlassCard: `rounded-xl p-5 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60`
- Colors: zinc-950 bg, zinc-100 text, zinc-400 secondary, zinc-800/60 borders
