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
        frame: s.type,
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

// ─── Legacy HTML parsing (backward compat — IMPORT ONLY) ───
// This parses OLD multi-<section> "deck" HTML that a user pastes/imports.
// It is NOT part of the canonical generation path: the canonical generator
// (src/services/presentation/index.ts generatePresentation) stores each slide's
// raw HTML independently via validateHtmlArtifact/extractHtmlFromResponse and never
// parses multi-section decks. Do NOT extend this to define the canonical
// single-slide format. Canonical = one invocation → one standalone slide artifact.

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
  // NOTE: canonical HTML generation stores each slide independently and does NOT
  // parse multi-section decks. This function exists for backward-compatible IMPORT
  // of legacy deck HTML only (see parseLegacyHtml).
  // Try JSON first (new architecture)
  const jsonResult = parseJsonSpec(raw)
  if (jsonResult && jsonResult.slides.length > 0) return jsonResult

  // Fall back to legacy HTML parsing
  return parseLegacyHtml(raw, expectedCount)
}
