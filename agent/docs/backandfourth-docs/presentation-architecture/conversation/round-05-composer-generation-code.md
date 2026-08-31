# CONTEXT: promptComposer.ts + Real AI Generation Path

> PART A: Complete promptComposer.ts (523 lines)
> PART B: Traced generation path from frontend → AI → response

---

## PART A: `src/services/presentation/promptComposer.ts` (523 lines — COMPLETE)

```typescript
// Prompt Composer — Converts content into structured slide plans
// Follows RESULT.md spec: content → PlannedSlide[] → compiled prompt

export interface PlannedSlide {
  index: number
  frame: 'hook' | 'value' | 'transition' | 'call_to_action' | 'visual_only'
  purpose: string
  headlineHint?: string
  layoutHint?: 'split-left' | 'split-right' | 'full-bleed' | 'minimal'
  visualHint?: string
  interactivityHint?: string
  group?: string
}

export interface SlidePlan {
  goal: string
  audience: string
  tone: string
  slides: PlannedSlide[]
  groups: { label: string; slideIndices: number[] }[]
}

export interface ContentInput {
  source: 'topic' | 'episode' | 'external-chat'
  topic?: string
  topicMode?: 'specific' | 'ai-decides'
  episodeTitle?: string
  episodeFrames?: any[]
  externalChat?: string
  slideCount: number
  mode: string
  customGroups?: { label: string; count: number }[]
}

export function buildSlidePlan(input: ContentInput): SlidePlan {
  const { source, slideCount, customGroups } = input
  if (customGroups && customGroups.length > 0) return buildCustomGroupPlan(input)
  if (source === 'episode' && input.episodeFrames) return buildEpisodePlan(input)
  if (source === 'external-chat' && input.externalChat) return buildChatPlan(input)
  return buildTopicPlan(input)
}

function buildTopicPlan(input: ContentInput): SlidePlan {
  const { topic, topicMode, slideCount, mode } = input
  const isCreative = topicMode === 'ai-decides'
  const slides: PlannedSlide[] = []

  slides.push({
    index: 0, frame: 'hook',
    purpose: 'Attention-grabbing headline that states the core topic',
    headlineHint: isCreative ? undefined : topic?.split(' ').slice(0, 4).join(' '),
    layoutHint: 'full-bleed', group: 'Opening',
  })

  const middleCount = slideCount - 2
  for (let i = 0; i < middleCount; i++) {
    const progress = (i + 1) / (middleCount + 1)
    let frame: PlannedSlide['frame'] = 'value'
    let purpose = ''
    let layoutHint: PlannedSlide['layoutHint'] = 'split-left'

    if (progress < 0.3) { purpose = `Introduce the first key concept of ${topic}`; layoutHint = 'split-left' }
    else if (progress < 0.6) { frame = 'value'; purpose = `Deep dive into a core mechanism or component`; layoutHint = i % 2 === 0 ? 'split-right' : 'split-left' }
    else if (progress < 0.85) { frame = 'visual_only'; purpose = `Visual demonstration — diagram, chart, or code example`; layoutHint = 'full-bleed' }
    else { frame = 'transition'; purpose = `Bridge to the conclusion`; layoutHint = 'minimal' }

    slides.push({
      index: i + 1, frame, purpose, layoutHint,
      visualHint: frame === 'visual_only' ? `Diagram or chart illustrating ${topic}` : undefined,
      interactivityHint: frame === 'value' && i % 3 === 0 ? 'step-through or hover-reveal' : undefined,
      group: i < middleCount * 0.4 ? 'Core Concepts' : i < middleCount * 0.8 ? 'Visual Examples' : 'Summary',
    })
  }

  slides.push({ index: slideCount - 1, frame: 'call_to_action', purpose: 'Key takeaway and call to action', layoutHint: 'full-bleed', group: 'Conclusion' })
  return buildGroups(slides, input)
}

function buildEpisodePlan(input: ContentInput): SlidePlan {
  const { episodeFrames, episodeTitle, slideCount } = input
  const slides: PlannedSlide[] = []
  if (episodeFrames && episodeFrames.length > 0) {
    const framesToUse = episodeFrames.slice(0, slideCount)
    for (let i = 0; i < framesToUse.length; i++) {
      const f = framesToUse[i]
      slides.push({
        index: i, frame: f.frame_type || 'value', purpose: f.text || '',
        headlineHint: f.text?.split(' ').slice(0, 5).join(' '),
        layoutHint: f.frame_type === 'hook' ? 'full-bleed' : f.frame_type === 'visual_only' ? 'full-bleed' : 'split-left',
        visualHint: f.visual,
        group: f.frame_type === 'hook' ? 'Opening' : f.frame_type === 'call_to_action' ? 'Conclusion' : 'Content',
      })
    }
  } else { return buildTopicPlan({ ...input, source: 'topic', topic: episodeTitle || 'Episode Content' }) }
  return buildGroups(slides, input)
}

function buildChatPlan(input: ContentInput): SlidePlan {
  const { externalChat, slideCount } = input
  const slides: PlannedSlide[] = []
  slides.push({ index: 0, frame: 'hook', purpose: 'Extract the main topic/question from the discussion and present it as a bold headline', layoutHint: 'full-bleed', group: 'Discussion Overview' })
  const middleCount = slideCount - 2
  for (let i = 0; i < middleCount; i++) {
    const progress = (i + 1) / (middleCount + 1)
    slides.push({
      index: i + 1, frame: progress < 0.7 ? 'value' : 'visual_only',
      purpose: progress < 0.7 ? `Extract a key insight or explanation from the discussion` : `Create a visual diagram summarizing a concept from the chat`,
      layoutHint: progress < 0.7 ? (i % 2 === 0 ? 'split-left' : 'split-right') : 'full-bleed',
      visualHint: progress >= 0.7 ? 'Diagram, chart, or visual summary of discussed concepts' : undefined,
      interactivityHint: i % 4 === 0 ? 'hover-reveal or step-through' : undefined,
      group: i < middleCount * 0.5 ? 'Key Insights' : 'Visual Summaries',
    })
  }
  slides.push({ index: slideCount - 1, frame: 'call_to_action', purpose: 'Synthesize the main takeaways from the discussion', layoutHint: 'full-bleed', group: 'Conclusion' })
  return buildGroups(slides, input)
}

function buildCustomGroupPlan(input: ContentInput): SlidePlan {
  const { customGroups, source, topic, episodeTitle } = input
  const slides: PlannedSlide[] = []
  let index = 0
  for (const group of customGroups!) {
    for (let i = 0; i < group.count; i++) {
      const isFirst = index === 0
      const isLast = index === (customGroups!.reduce((s, g) => s + g.count, 0) - 1)
      slides.push({ index, frame: isFirst ? 'hook' : isLast ? 'call_to_action' : 'value', purpose: `${group.label} — slide ${i + 1} of ${group.count}`, layoutHint: i % 2 === 0 ? 'split-left' : 'split-right', group: group.label })
      index++
    }
  }
  return { goal: topic || episodeTitle || 'Presentation', audience: 'General audience', tone: 'educational', slides, groups: customGroups!.map((g, i) => ({ label: g.label, slideIndices: Array.from({ length: g.count }, (_, j) => { let idx = 0; for (let k = 0; k < i; k++) idx += customGroups![k].count; return idx + j }) })) }
}

function buildGroups(slides: PlannedSlide[], input: ContentInput): SlidePlan {
  const groupMap = new Map<string, number[]>()
  for (const s of slides) { const g = s.group || 'Content'; if (!groupMap.has(g)) groupMap.set(g, []); groupMap.get(g)!.push(s.index) }
  return { goal: input.topic || input.episodeTitle || 'Presentation', audience: 'General audience', tone: input.mode === 'youtube_shorts' ? 'punchy' : input.mode === 'pitch' ? 'persuasive' : 'educational', slides, groups: Array.from(groupMap.entries()).map(([label, indices]) => ({ label, slideIndices: indices })) }
}

export interface ExtractedTopic { title: string; description: string; concepts: string[]; source: 'question' | 'explanation' | 'code' | 'example' | 'concept' }

export function extractChatTopics(chatText: string): ExtractedTopic[] {
  const topics: ExtractedTopic[] = []; const seen = new Set<string>()
  const lines = chatText.split('\n').map(l => l.trim()).filter(Boolean)
  // Pattern 1: questions
  for (const line of lines) { const qMatch = line.match(/^(?:[\w\s]*:\s*)?(?:how|what|why|when|where|which|can|could|should|is|are|do|does)\s+(.+)/i); if (qMatch && qMatch[1].length > 10 && qMatch[1].length < 200) { const key = qMatch[1].toLowerCase().slice(0, 50); if (!seen.has(key)) { seen.add(key); topics.push({ title: qMatch[1].slice(0, 80), description: qMatch[1], concepts: extractConceptsFromLine(qMatch[1]), source: 'question' }) } } }
  // Pattern 2: technical terms
  const techPattern = /\b(?:API|SDK|function|class|method|algorithm|protocol|framework|library|module|component|interface|pattern|architecture|system|engine|pipeline|database|server|client|render|compile|deploy|optimize|debug|test|refactor)\b/gi
  for (const line of lines) { const matches = line.match(techPattern); if (matches && line.length > 20 && line.length < 300) { const key = line.toLowerCase().slice(0, 60); if (!seen.has(key) && topics.length < 20) { seen.add(key); topics.push({ title: line.slice(0, 80), description: line, concepts: [...new Set(matches.map(m => m.toLowerCase()))], source: 'concept' }) } } }
  // Pattern 3: code references
  const codePattern = /`([^`]+)`/g; let codeMatch; const codeTerms = new Set<string>()
  while ((codeMatch = codePattern.exec(chatText)) !== null) { const term = codeMatch[1].trim(); if (term.length > 2 && term.length < 60) codeTerms.add(term) }
  if (codeTerms.size > 0) { topics.push({ title: 'Code & Implementation', description: `Key code concepts discussed: ${[...codeTerms].slice(0, 8).join(', ')}`, concepts: [...codeTerms].slice(0, 10), source: 'code' }) }
  // Pattern 4: examples
  for (const line of lines) { const exMatch = line.match(/(?:for example|such as|like|e\.g\.|including)\s+(.+)/i); if (exMatch && exMatch[1].length > 10 && exMatch[1].length < 200) { const key = exMatch[1].toLowerCase().slice(0, 50); if (!seen.has(key) && topics.length < 20) { seen.add(key); topics.push({ title: exMatch[1].slice(0, 80), description: exMatch[1], concepts: extractConceptsFromLine(exMatch[1]), source: 'example' }) } } }
  // Pattern 5: explanations
  for (const line of lines) { const expMatch = line.match(/^(.+?)\s+(?:is|means|refers to|involves|requires|uses)\s+(.+)/i); if (expMatch && expMatch[1].length > 3 && expMatch[2].length > 10) { const key = expMatch[1].toLowerCase().slice(0, 50); if (!seen.has(key) && topics.length < 20) { seen.add(key); topics.push({ title: expMatch[1].trim(), description: `${expMatch[1].trim()} — ${expMatch[2].trim()}`, concepts: extractConceptsFromLine(expMatch[1] + ' ' + expMatch[2]), source: 'explanation' }) } } }
  // Deduplicate
  const deduped: ExtractedTopic[] = []; const usedConcepts = new Set<string>()
  for (const topic of topics) { const overlap = topic.concepts.filter(c => usedConcepts.has(c)).length; if (overlap < topic.concepts.length * 0.5 || deduped.length < 3) { deduped.push(topic); topic.concepts.forEach(c => usedConcepts.add(c)) } }
  return deduped.slice(0, 10)
}

function extractConceptsFromLine(text: string): string[] {
  const words = text.split(/[\s,;:.!?]+/)
  const stopWords = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','can','shall','to','of','in','for','on','with','at','by','from','as','into','through','during','before','after','above','below','between','under','again','further','then','once','here','there','when','where','why','how','all','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','just','because','but','and','or','if','while','about','against','up','down','out','off','over','that','this','these','those','what','which','who','whom','it','its','i','me','my','we','our','you','your','he','him','his','she','her','they','them','their'])
  const concepts: string[] = []
  for (const w of words) { const clean = w.replace(/[^a-zA-Z0-9_\-]/g, '').toLowerCase(); if (clean.length > 2 && !stopWords.has(clean)) concepts.push(clean) }
  return [...new Set(concepts)].slice(0, 8)
}

export function compileExternalChatPrompt(topics: ExtractedTopic[], chatText: string, theme: any, mode: string, slideCount: number): string {
  const modeInfo = MODES[mode] || MODES.educational
  const topicList = topics.map((t, i) => `${i + 1}. **${t.title}**\n   ${t.description}\n   Key concepts: ${t.concepts.join(', ')}`).join('\n\n')
  const chatSummary = chatText.length > 800 ? chatText.slice(0, 400) + '\n...\n' + chatText.slice(-400) : chatText
  return `You are a Principal Frontend Architect & Motion Designer at Vercel/Framer. Generate ONE self-contained HTML file containing ALL presentation slides as a navigatable slideshow.\n\nTOPICS TO COVER:\n${topicList}\n\nSOURCE DISCUSSION:\n${chatSummary}\n\nGENERATION RULES:\n- Create exactly ${slideCount} slides covering the ${topics.length} topics above.\n- Style: ${modeInfo.label} — ${modeInfo.promptPreset}\n- All content MUST be derived from the SOURCE DISCUSSION.\n- Output ONLY valid raw HTML. No markdown fences.\n\nTHEME:\n:root {\n  --bg: ${theme.bg}; --surface: ${theme.surface}; --border: ${theme.border};\n  --fg: ${theme.fg}; --muted: ${theme.muted};\n  --accent: ${theme.accent}; --accent-2: ${theme.accent2}; --warning: ${theme.warning};\n  --accent-glow: ${theme.accentGlow};\n  --font-header: ${theme.fontHeader}; --font-body: ${theme.fontBody}; --font-mono: ${theme.fontMono};\n}\n\nOutput ONLY the raw HTML.`
}

export function compilePrompt(plan: SlidePlan, systemPrompt: string, theme: any, aspectRatio: '9:16' | '1:1' | '9:8' = '9:16'): string {
  const slideDescriptions = plan.slides.map(s => `Slide ${s.index + 1} [${s.frame}] — Group: "${s.group || 'Content'}"\n  Purpose: ${s.purpose}\n  ${s.headlineHint ? `Headline: "${s.headlineHint}"` : ''}\n  Layout: ${s.layoutHint || 'split-left'}\n  ${s.visualHint ? `Visual: ${s.visualHint}` : ''}\n  ${s.interactivityHint ? `Interactivity: ${s.interactivityHint}` : ''}`).join('\n\n')
  const groupSummary = plan.groups.map(g => `• "${g.label}" → Slides ${g.slideIndices.map(i => i + 1).join(', ')}`).join('\n')
  const themeBlock = theme ? `\n:root {\n  --bg: ${theme.bg || '#0A0A0B'}; --surface: ${theme.surface || 'rgba(255,255,255,0.03)'}; --border: ${theme.border || 'rgba(255,255,255,0.08)'};\n  --fg: ${theme.fg || '#FAFAFA'}; --muted: ${theme.muted || '#8B8B8B'};\n  --accent: ${theme.accent || '#10b981'}; --accent-2: ${theme.accent2 || '#a855f7'}; --warning: ${theme.warning || '#f59e0b'};\n  --accent-glow: ${theme.accentGlow || 'rgba(16,185,129,0.15)'};\n  --font-header: ${theme.fontHeader || 'Inter'}; --font-body: ${theme.fontBody || 'Inter'}; --font-mono: ${theme.fontMono || 'JetBrains Mono'};\n}` : ''
  const contentBlock = `Goal: ${plan.goal}\nAudience: ${plan.audience}\nTone: ${plan.tone}\n\nTARGET ASPECT RATIO: ${aspectRatio}\nCompose primarily for vertical short-form content. The selected ratio is a composition target, not a crop setting.\n\nTHEME — USE THESE EXACT COLORS:\n${themeBlock}\n\nCRITICAL CONTRAST RULES:\n- ALL text MUST be clearly visible against its background\n- Body text: use --fg color on --bg or --surface backgrounds\n- Headings: use --fg or --accent color, NEVER use --muted on dark backgrounds\n\nSLIDE PLAN (${plan.slides.length} slides):\n\n${slideDescriptions}\n\nCONTENT FIDELITY — NON-NEGOTIABLE:\nThe supplied slide-by-slide content is the authoritative source of truth.\nDo NOT invent, expand, reinterpret, replace, reorder, or omit the conceptual content.\nThe model's job is to DESIGN and IMPLEMENT the supplied content, not to AUTHOR it.\n\nGROUPS:\n${groupSummary}\n\nFollow the slide plan exactly. Each slide must match its frame type, purpose, and layout hint.`
  return systemPrompt.replace('{{CONTENT}}', contentBlock).replace('{{SLIDE_COUNT}}', String(plan.slides.length)).replace('{{MODE}}', `Structured — ${plan.slides.length} slides in ${plan.groups.length} groups`)
}
```

---

## PART B: Real AI Generation Implementation

### The actual `api()?.generate()` call path:

```
Frontend: api()?.generate({ prompt, slideCount, episodeId, topic, mode, theme })
  ↓
Preload: presentation.generate = (opts) => ipcRenderer.invoke('presentation:generate', opts)
  ↓
Main.ts line 1948: ipcMain.handle('presentation:generate', async () => ({ ok: false, error: 'Use auto-generate' }))
```

**The handler is a STUB.** It returns `{ ok: false, error: 'Use auto-generate' }` immediately.

### The REAL generation logic exists in `src/services/presentation/index.ts` (line 84-191):

```typescript
export function registerPresentationHandlers(db: Database.Database, aiCall: typeof _aiCall extends infer T ? T : never) {
  // ...
  ipcMain.handle('presentation:generate', async (_, { episodeId, topic, slideCount }: any) => {
    if (!_db || !_aiCall) return { ok: false, error: 'Presentation service not initialized' };
    // Step 1: Get frames from episode or generate from topic
    let frames = []
    if (episodeId) {
      const ep = _db.prepare('SELECT * FROM content_episodes WHERE id=?').get(episodeId)
      frames = JSON.parse(ep.script || '[]')
    } else if (topic) {
      const rawFrames = await _aiCall(frameGenPrompt, 'You are a script writer.', 4000)
      frames = JSON.parse(rawFrames.match(/\[[\s\S]*\]/)[0])
    }
    // Step 2: Create presentation record
    const presId = presUid()
    _db.prepare('INSERT INTO presentations ...').run(presId, ...)
    // Step 3: Generate each slide
    for (let i = 0; i < frames.length; i++) {
      const prompt = buildSlidePrompt(frame)  // from prompts.ts
      const rawHtml = await _aiCall(prompt, PROMPT_GENERATE_SLIDE, 4000)
      const html = extractHtml(rawHtml)        // strip markdown fences
      const check = validateHtml(html)          // check DOCTYPE, html, body, style
      if (!check.valid) {
        // RETRY ONCE
        const retryRaw = await _aiCall(retryPrompt, PROMPT_GENERATE_SLIDE, 4000)
        const retryHtml = extractHtml(retryRaw)
        // if retry fails, save error slide
      }
      // Step 4: Persist
      _db.prepare('INSERT INTO presentation_slides ...').run(slideId, presId, i, frame_type, html)
    }
    // Step 5: Update status
    _db.prepare("UPDATE presentations SET status = 'ready' ...").run(...)
    return { ok: true, data: { id: presId, title, slideCount } }
  })
}
```

**But `registerPresentationHandlers` is NEVER CALLED from main.ts.**

Grep confirms:
```
src/services/presentation/index.ts:84: export function registerPresentationHandlers(...)
src/services/presentation/index.ts:85: console.log('[Presentation] registerPresentationHandlers called')
```

No other file imports it. The function is exported but dead.

### What this means:

| Stage | Status |
|-------|--------|
| Frontend calls `api()?.generate()` | ✅ Works — preload bridge exists |
| IPC reaches main.ts handler | ✅ Works — stub handler registered at module top level |
| Stub returns error | ✅ That's what happens — `{ ok: false, error: 'Use auto-generate' }` |
| Real generation in `index.ts` | ❌ DEAD CODE — `registerPresentationHandlers` never imported/called |
| AI call (`_aiCall`) | ❌ NEVER REACHED — stub returns before any AI call |
| Response parsing (`extractHtml`) | ❌ NEVER REACHED |
| Validation (`validateHtml`) | ❌ NEVER REACHED |
| Retry on failure | ❌ NEVER REACHED |
| Persistence to DB | ❌ NEVER REACHED |
| Sequential per-slide generation | ❌ NEVER REACHED |
| Error handling for partial failure | ❌ NEVER REACHED |

### The `_aiCall` function signature:

In `index.ts`:
```typescript
let _aiCall: ((prompt: string, systemPrompt: string, maxTokens?: number) => Promise<string>) | null = null;
```

This is the function that would call the external AI provider. It's passed as a parameter to `registerPresentationHandlers`. But since that function is never called, `_aiCall` is never set, and no AI call ever happens.

### How `_aiCall` would work (if it were wired):

The `aiCall` parameter comes from the main process's AI provider chain. In this codebase, AI calls go through `buildChain(pState, featureId)` + `runWithFallback()` from `src/services/providers/router.ts`. The pattern is:

```typescript
const aiCall = async (prompt: string, systemPrompt: string, maxTokens?: number) => {
  const chain = buildChain(providerState, 'presentation')
  const result = await runWithFallback(chain, prompt, systemPrompt, maxTokens)
  return result.text
}
```

But this wiring was never connected to the presentation module.

---

## LIVE GENERATION PATH

```
Frontend: handleAuto()
  → mkPrompt() → compilePrompt(plan, PROMPT_GENERATE_SLIDE/JSON, tokens, ratio)
  → api()?.generate({ prompt, slideCount, topic, mode, theme })
  → preload: ipcRenderer.invoke('presentation:generate', opts)
  → main.ts:1948 stub → returns { ok: false, error: 'Use auto-generate' }
  → Frontend: toast('Generation failed')
  
  MISSES (nothing below this point executes):
  → MISSES: _aiCall(prompt, systemPrompt, 4000)
  → MISSES: extractHtml(rawResponse)
  → MISSES: validateHtml(html)
  → MISSES: retry on failure
  → MISSES: INSERT INTO presentation_slides
  → MISSES: UPDATE presentations SET status = 'ready'
```

**Bottom line: Auto-generate is completely non-functional. The only working path is paste-import (user copies HTML/JSON from external AI and pastes it).**
