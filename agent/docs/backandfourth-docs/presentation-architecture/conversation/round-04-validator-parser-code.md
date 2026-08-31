# CONTEXT: slideValidator.ts + htmlParser.ts — Complete Implementations

> Both files exactly as they exist on disk. No summarization.

---

## File 1: `src/services/presentation/slideValidator.ts` (118 lines)

```typescript
// Slide Validator — Validates PresentationSpec JSON against the schema
// Layers: schema, content fidelity, visual type, motion, enums

import type { ParsedSlide } from './htmlParser'

export interface ValidationIssue {
  layer: string
  rule: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface ValidationReport {
  slideIndex: number
  status: 'valid' | 'warning' | 'invalid'
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

const VALID_TYPES = ['hook', 'value', 'transition', 'call_to_action', 'visual_only']
const VALID_LAYOUTS = ['split-left', 'split-right', 'full-bleed', 'minimal']
const VALID_VISUALS = ['hero-number', 'code-block', 'diagram', 'chart', 'progress-ring', 'step-through', 'comparison', 'timeline', 'quote', 'icon-grid', 'data-table', 'interactive-demo', 'none']
const VALID_MOTION_ENTRY = ['blur-fade', 'slide-up', 'none']
const VALID_MOTION_EMPHASIS = ['glow-pulse', 'highlight-edge', 'count-up', 'none']
const VALID_MOTION_INTERACTION = ['step-through', 'hover-reveal', 'slider', 'none']
const VALID_THEME_IDS = ['vercel-dark', 'cyberpunk', 'minimalist-mono', 'warm-dark']

export function validateSlide(slide: ParsedSlide, index: number): ValidationReport {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  // Layer 1: Schema — required fields
  if (!slide.headline && slide.source === 'json') {
    errors.push({ layer: 'schema', rule: 'headline-required', message: 'headline is required', severity: 'error' })
  }
  if (!VALID_TYPES.includes(slide.frame)) {
    errors.push({ layer: 'schema', rule: 'type-enum', message: `invalid type "${slide.frame}"`, severity: 'error' })
  }
  if (!VALID_LAYOUTS.includes(slide.layout)) {
    errors.push({ layer: 'schema', rule: 'layout-enum', message: `invalid layout "${slide.layout}"`, severity: 'error' })
  }
  if (!VALID_VISUALS.includes(slide.visual.type)) {
    errors.push({ layer: 'schema', rule: 'visual-type-enum', message: `invalid visual type "${slide.visual.type}"`, severity: 'error' })
  }

  // Layer 2: Motion enums
  if (!VALID_MOTION_ENTRY.includes(slide.motion.entry)) {
    errors.push({ layer: 'motion', rule: 'entry-enum', message: `invalid motion.entry "${slide.motion.entry}"`, severity: 'error' })
  }
  if (!VALID_MOTION_EMPHASIS.includes(slide.motion.emphasis)) {
    errors.push({ layer: 'motion', rule: 'emphasis-enum', message: `invalid motion.emphasis "${slide.motion.emphasis}"`, severity: 'error' })
  }
  if (!VALID_MOTION_INTERACTION.includes(slide.motion.interaction)) {
    errors.push({ layer: 'motion', rule: 'interaction-enum', message: `invalid motion.interaction "${slide.motion.interaction}"`, severity: 'error' })
  }

  // Layer 3: Content fidelity
  if (slide.source === 'json') {
    if (slide.headline && slide.headline.length > 40) {
      warnings.push({ layer: 'content', rule: 'headline-length', message: `headline "${slide.headline}" exceeds 40 chars — consider shortening`, severity: 'warning' })
    }
    if (slide.frame === 'transition' && !slide.body) {
      // transition slides may have empty body — that's fine
    } else if (slide.source === 'json' && !slide.body && slide.frame !== 'hook') {
      warnings.push({ layer: 'content', rule: 'body-present', message: 'non-hook slide has no body text', severity: 'warning' })
    }
  }

  // Layer 4: Visual data structure
  if (slide.visual.type !== 'none' && !slide.visual.data) {
    errors.push({ layer: 'visual', rule: 'data-required', message: `visual type "${slide.visual.type}" requires data field`, severity: 'error' })
  }

  // Layer 5: Layout consistency
  if (slide.frame === 'hook' && slide.layout !== 'full-bleed' && slide.layout !== 'minimal') {
    warnings.push({ layer: 'layout', rule: 'hook-layout', message: `hook slide typically uses full-bleed or minimal, got "${slide.layout}"`, severity: 'warning' })
  }
  if (slide.frame === 'call_to_action' && slide.layout !== 'full-bleed' && slide.layout !== 'minimal') {
    warnings.push({ layer: 'layout', rule: 'cta-layout', message: `CTA slide typically uses full-bleed or minimal, got "${slide.layout}"`, severity: 'warning' })
  }

  // Layer 6: Anti-slop (for legacy HTML slides)
  if (slide.source === 'html') {
    warnings.push({ layer: 'legacy', rule: 'html-format', message: 'legacy HTML slide — consider regenerating with JSON output', severity: 'info' })
  }

  const status = errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'warning' : 'valid'
  return { slideIndex: index, status, errors, warnings }
}

export function validateThemeId(themeId: string): boolean {
  return VALID_THEME_IDS.includes(themeId)
}

export function validateSpec(spec: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!spec || typeof spec !== 'object') {
    return { valid: false, errors: ['Not a valid JSON object'] }
  }
  if (typeof spec.title !== 'string') errors.push('title is required and must be a string')
  if (typeof spec.slideCount !== 'number' || spec.slideCount < 1) errors.push('slideCount must be a positive integer')
  if (!VALID_THEME_IDS.includes(spec.themeId)) errors.push(`themeId must be one of: ${VALID_THEME_IDS.join(', ')}`)
  if (!Array.isArray(spec.slides)) errors.push('slides must be an array')
  if (spec.slides && spec.slides.length !== spec.slideCount) {
    errors.push(`slides.length (${spec.slides.length}) !== slideCount (${spec.slideCount})`)
  }

  // Check for additional properties on top-level
  const allowedTopLevel = ['title', 'slideCount', 'themeId', 'slides']
  for (const key of Object.keys(spec)) {
    if (!allowedTopLevel.includes(key)) {
      errors.push(`unexpected top-level field "${key}"`)
    }
  }

  return { valid: errors.length === 0, errors }
}
```

---

## File 2: `src/services/presentation/htmlParser.ts` (206 lines)

```typescript
// Presentation Parser — Extracts slides from AI output
// Supports: structured JSON (new) + legacy HTML sections (backward compat)

export interface ParsedSlide {
  index: number
  frame: string
  group: string
  headline: string
  subheadline?: string
  body?: string
  equation?: string
  badge?: string
  recap?: string[]
  visual: {
    type: string
    data: any
  }
  layout: string
  motion: {
    entry: string
    emphasis: string
    interaction: string
  }
  source: 'json' | 'html'
}

export interface ParseResult {
  slides: ParsedSlide[]
  title?: string
  themeId?: string
  format: 'json' | 'html'
  errors: string[]
}

// ─── JSON parsing (new architecture) ───

function parseJsonSpec(raw: string): ParseResult | null {
  try {
    const spec = JSON.parse(raw)
    if (!spec.slides || !Array.isArray(spec.slides)) return null
    if (typeof spec.slideCount !== 'number') return null

    const errors: string[] = []
    const slides: ParsedSlide[] = []

    for (let i = 0; i < spec.slides.length; i++) {
      const s = spec.slides[i]
      if (!s.type || !s.layout || !s.visual) {
        errors.push(`Slide ${i}: missing required fields (type, layout, visual)`)
        continue
      }

      const validTypes = ['hook', 'value', 'transition', 'call_to_action', 'visual_only']
      if (!validTypes.includes(s.type)) {
        errors.push(`Slide ${i}: invalid type "${s.type}"`)
      }

      const validLayouts = ['split-left', 'split-right', 'full-bleed', 'minimal']
      if (!validLayouts.includes(s.layout)) {
        errors.push(`Slide ${i}: invalid layout "${s.layout}"`)
      }

      const validVisuals = ['hero-number', 'code-block', 'diagram', 'chart', 'progress-ring', 'step-through', 'comparison', 'timeline', 'quote', 'icon-grid', 'data-table', 'interactive-demo', 'none']
      if (!validVisuals.includes(s.visual.type)) {
        errors.push(`Slide ${i}: invalid visual type "${s.visual.type}"`)
      }

      slides.push({
        index: s.index ?? i,
        frame: s.type,           // ← PROMPT'S "type" → RENDERER'S "frame"
        group: s.group || 'Content',
        headline: s.headline || '',
        subheadline: s.subheadline,
        body: s.body,
        equation: s.equation,
        badge: s.badge,
        recap: s.recap,
        visual: {
          type: s.visual.type || 'none',
          data: s.visual.data || {},
        },
        layout: s.layout || 'full-bleed',
        motion: {
          entry: s.motion?.entry || 'blur-fade',
          emphasis: s.motion?.emphasis || 'none',
          interaction: s.motion?.interaction || 'none',
        },
        source: 'json',
      })
    }

    return {
      slides,
      title: spec.title,
      themeId: spec.themeId,
      format: 'json',
      errors,
    }
  } catch {
    return null
  }
}

// ─── Legacy HTML parsing (backward compat) ───

function parseLegacyHtml(raw: string, expectedCount?: number): ParseResult {
  const slides: ParsedSlide[] = []
  const errors: string[] = []
  const trimmed = raw.trim()

  // Strategy 1: <section> elements
  if (trimmed.toLowerCase().includes('<!doctype html') || trimmed.toLowerCase().includes('<html') || trimmed.includes('<section')) {
    const sectionRegex = /<section\b[^>]*>([\s\S]*?)<\/section>/gi
    let match: RegExpExecArray | null
    while ((match = sectionRegex.exec(trimmed)) !== null) {
      const sectionContent = match[0].trim()
      if (sectionContent.length > 50) {
        slides.push({
          index: slides.length,
          frame: 'value',
          group: 'Content',
          headline: extractHeadlineFromHtml(sectionContent),
          body: extractTextFromHtml(sectionContent),
          visual: { type: 'none', data: {} },
          layout: 'full-bleed',
          motion: { entry: 'blur-fade', emphasis: 'none', interaction: 'none' },
          source: 'html',
        })
      }
    }
    if (slides.length > 0) return { slides, format: 'html', errors }
  }

  // Strategy 2: fenced code blocks
  const fenceRegex = /```(?:html)?\s*\n?([\s\S]*?)\n?\s*```/g
  let fenceMatch: RegExpExecArray | null
  while ((fenceMatch = fenceRegex.exec(raw)) !== null) {
    const html = fenceMatch[1].trim()
    if (html.length > 50) {
      slides.push({
        index: slides.length,
        frame: 'value',
        group: 'Content',
        headline: extractHeadlineFromHtml(html),
        body: extractTextFromHtml(html),
        visual: { type: 'none', data: {} },
        layout: 'full-bleed',
        motion: { entry: 'blur-fade', emphasis: 'none', interaction: 'none' },
        source: 'html',
      })
    }
  }
  if (slides.length > 0) return { slides, format: 'html', errors }

  // Strategy 3: treat as one slide
  if (trimmed.length > 50) {
    slides.push({
      index: 0,
      frame: 'value',
      group: 'Content',
      headline: extractHeadlineFromHtml(trimmed),
      body: extractTextFromHtml(trimmed),
      visual: { type: 'none', data: {} },
      layout: 'full-bleed',
      motion: { entry: 'blur-fade', emphasis: 'none', interaction: 'none' },
      source: 'html',
    })
  }

  if (expectedCount && slides.length !== expectedCount) {
    errors.push(`Expected ${expectedCount} slides, found ${slides.length}`)
  }

  return { slides, format: 'html', errors }
}

// ─── Helpers ───

function extractHeadlineFromHtml(html: string): string {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1Match) return h1Match[1].replace(/<[^>]+>/g, '').trim().slice(0, 60)
  const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
  if (h2Match) return h2Match[1].replace(/<[^>]+>/g, '').trim().slice(0, 60)
  return 'Untitled Slide'
}

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500)
}

// ─── Main export ───

export function parseSlides(raw: string, expectedCount?: number): ParseResult {
  // Try JSON first (new architecture)
  const jsonResult = parseJsonSpec(raw)
  if (jsonResult && jsonResult.slides.length > 0) return jsonResult

  // Fall back to legacy HTML parsing
  return parseLegacyHtml(raw, expectedCount)
}
```

---

## LIVE PIPELINE

Based on the actual code, here is the call sequence from AI response → renderer/persistence:

### HTML Mode (paste import):
```
User pastes HTML → handlePasteImport()
  → api()?.import({ slideCount: 1, slides: [{ html: pasteHtml }] })
  → main.ts presentation:import handler
  → INSERT INTO presentations + INSERT INTO presentation_slides (html_content = raw pasteHtml)
  → handleOpen(id)
  → api()?.get(id)
  → PresentationWorkspace renders: JSON.parse(html_content) → fails → iframe srcDoc
```

### JSON Mode (paste import):
```
User pastes JSON → handlePasteImport()
  → api()?.import({ slideCount: 1, slides: [{ html: pasteJson }] })
  → main.ts presentation:import handler
  → INSERT INTO presentations + INSERT INTO presentation_slides (html_content = raw pasteJson)
  → handleOpen(id)
  → api()?.get(id)
  → PresentationWorkspace renders: JSON.parse(html_content) → SlideRenderer
```

### JSON Mode (auto-generate — BROKEN):
```
User clicks "Auto Generate" → handleAuto()
  → mkPrompt() → PROMPT_GENERATE_JSON + compilePrompt()
  → api()?.generate({ prompt, ... })
  → main.ts presentation:generate handler → STUB: returns { ok: false, error: 'Use auto-generate' }
  → MISSES: never calls AI, never stores slides, never returns presentation ID
```

### What EXISTS vs what's MISSING:

| Step | Status |
|------|--------|
| Parser: JSON detection | ✅ Works — `parseJsonSpec` checks `spec.slides` array + `spec.slideCount` |
| Parser: `type` → `frame` mapping | ✅ Works — line 70: `frame: s.type` |
| Parser: HTML fallback | ✅ Works — 3 strategies (section/fence/raw) |
| Validator: `validateSpec` | ✅ Works — checks title, slideCount, themeId, slides array, additionalProperties |
| Validator: `validateSlide` | ✅ Works — checks enums, required fields, visual data, layout consistency |
| Validator: called in pipeline | ❌ MISSING — `validateSpec` and `validateSlide` are exported but NEVER called from PresentationWorkspace or handlePasteImport |
| Renderer: SlideRenderer receives ParsedSlide | ⚠️ PARTIAL — PresentationWorkspace passes `spec.slides[currentSlide]` which is raw JSON, not ParsedSlide type |
| Renderer: `type` field access | ⚠️ MISMATCH — parser outputs `frame`, renderer expects `frame`, but prompt tells AI to output `type`. Parser maps `type→frame` at line 70. |
| Renderer: motion wired | ❌ MISSING — motion field exists in SlideData but `useMotionClasses` was just added (not yet in codebase) |
| Renderer: responsive | ❌ MISSING — no media queries, no breakpoint logic |
| Persistence: JSON stored as string | ✅ Works — `html_content` column stores raw JSON string |
| Persistence: title/themeId/slideCount | ⚠️ PARTIAL — `title` and `themeId` extracted by parser but NOT passed to renderer or stored separately |
