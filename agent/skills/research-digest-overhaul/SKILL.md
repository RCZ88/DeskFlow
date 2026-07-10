---
id: research-digest-overhaul
name: research-digest-overhaul
description: "Overhaul the Research Digest system to be data-driven, credible, and visually rich. Current UI is plain-text keyword lists with too many dropdowns, no dates, no sources, no numerical data, no images — not convincing. Target is a terminal-style news digest with authority markers, metadata, and data-oriented presentation (like The Browser newsletter)."
version: 1.0.0
category: feature
tags: [digest, ui, research, data, credibility, news, cards, ai]
---

# Research Digest Overhaul — Data-Driven News-Style Presentation

## Problem

The current Research Digest (`DailyDigestBoard`) presents AI-generated summaries as plain text in collapsible keyword cards. This fails to deliver a convincing, credible, or engaging reading experience.

### Specific Issues

1. **Too text/keyword heavy** — topic name + plain text summary in collapsible cards, no interesting presentation
2. **Too many dropdowns** — every topic is behind a `Collapsible` toggle, requiring clicks to reveal content
3. **No credibility markers** — no publication dates, no source authority indicators, no confidence/accuracy scores
4. **No numerical/data elements** — no percentages, metrics, statistics, trend indicators, or growth rates
5. **No visual content** — no images, charts, or rich media; pure plain text
6. **Sources are buried** — sources exist but feel tacked-on with no dates, authority tier, or context
7. **Not convincing** — presentation lacks the feel of a real curated digest or terminal-first news feed
8. **No category/badge system** — no visual distinction between breaking news, analysis, trending topics, or updates

## Desired Outcome

### Data Format (TopicDigestItem type)

The backend AI prompt must be updated to generate **rich structured data** per topic:

```typescript
interface TopicDigestItem {
  topic: string
  headline?: string          // News-style headline
  summary: string            // 2-3 paragraph detailed summary with data
  date?: string              // ISO date or "recent"
  confidence?: number        // 0.0-1.0 credibility/confidence score
  source?: {
    name: string             // Publication/domain name
    url: string              // Source URL
    authority: "high" | "medium" | "low"
  }
  stats?: {
    label: string            // Metric name (e.g. "Adoption Rate")
    value: string | number   // Numerical value
    change?: number          // Percentage change
    trend?: "up" | "down" | "flat"
  }
  tags?: string[]            // Categories: breaking, analysis, trending, update, milestone
  mentions?: number          // How many sources covered this
  sources?: { title: string; url: string }[]  // Legacy sources array
}
```

### Prompt Updates

Two prompts need updating:

**1. Provider Chain path** (`src/main.ts:12860` — 2000 maxTokens):
- Request headline, detailed 2-3 paragraph summary, date, confidence score (0-1), source with authority tier, stats (label, value, change %, trend), tags, mentions count
- Instruct: "Include relevant numerical data (percentages, counts, dollar amounts, growth rates) when available"
- Instruct: "Never fabricate data. If unknown, set confidence to 0.2 and note uncertainty"
- Output: ONLY raw JSON array, no markdown, no code fences

**2. Legacy OpenRouter path** (`src/services/AIService.ts:135` — up to 200 tokens):
- Same schema but more compact instruction
- Keep required fields: topic, headline, summary, date
- Include confidence, source, stats, tags when relevant data available

### UI: News-Style Card Layout

Replace the current collapsible keyword cards with a **news-style card layout**:

```
┌────────────────────────────────────────────────┐
│  ⬆ TRENDING   Jul 3   ████████░░ 85%           │
│                                                 │
│  AI Coding Assistants Surge 42% in Enterprise   │
│                                                 │
│  Enterprise adoption reached 65% in Q2 2026,    │
│  up from 23% in Q2 2025 (+183% YoY)...          │
│                                                 │
│  📊 Adoption Rate: 65%     ▲ +42% YoY           │
│                                                 │
│  TechCrunch (high) · The Verge (medium)         │
│  4 sources                                      │
└────────────────────────────────────────────────┘
```

Key visual elements:
- **Headline-first** — bold, prominent headline (not just topic name)
- **Metadata bar** — date badge + confidence meter (visual progress bar) + tag pill
- **Stats block** — numerical data with label, value, trend arrow (▲ up / ▼ down / ― flat), percentage change
- **Source attribution** — source name with authority badge (high=green, medium=yellow, low=gray)
- **Tag pills** — color-coded category tags (breaking=red, trending=amber, analysis=violet, update=cyan)
- **No default collapse** — info is visible at-a-glance; use expand for extended details only

### State Handling

- **Loading**: 3 skeleton news-card shapes
- **Empty (ready to generate)**: "Ready to generate today's digest" with prominent CTA
- **Empty (no topics)**: "No topics configured" with "Add topics" CTA
- **Error**: error message with retry
- **Ready**: news-style card grid

## Files to Edit

### Backend (Data Generation)
- `src/components/ai/types.ts` — expand `TopicDigestItem` with new fields
- `src/main.ts` line ~12860 — update provider chain system prompt
- `src/services/AIService.ts` line ~135 — update legacy TOPIC_DIGEST_SYSTEM prompt

### Frontend (UI)
- `src/components/ai/digest/DailyDigestBoard.tsx` — full rewrite with news-style cards
- `src/components/ai/chat/renderers/DigestTopicCard.tsx` — update chat renderer to match
- `src/components/ai/chat/ParsedMessageRouter.tsx` — update if digest_item type changes

### Data Flow
- `src/preload.ts` lines 187-199 — update IPC bridge if type changes
- `src/pages/AiPage.tsx` — update consumer if needed

## Acceptance Criteria

1. Digest cards show headline, date, confidence meter, and stats at a glance — no clicking needed
2. Numerical data (percentages, counts, trends) is prominently displayed where available
3. Sources show authority level (high/medium/low) with visual indicators
4. Tags are color-coded by category
5. Empty/loading/error states are all handled gracefully
6. Chat renderer (`DigestTopicCard`) matches the new news-card style
7. Backward compatible — old cached data without new fields still renders without crashing
8. Provider chain path (2000 tokens) generates rich data; legacy path (200 tokens) generates compact but still structured data
