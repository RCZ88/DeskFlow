// Deck parser — splits a single generated HTML deck document into N independent
// slide artifacts. The generation contract (PROMPT_GENERATE_DECK) requires:
//   - exactly ONE <!DOCTYPE html>, one <head>, one <style> (SHARED CSS), one <body>
//   - each slide wrapped in <article data-slide="N"> (N starts at 1, increments by 1)
//
// This is the canonical HTML generation path. It is NOT the legacy multi-<section>
// parser in htmlParser.ts (which exists only for backward-compatible import of old
// deck HTML). The deck generator stores each extracted slide independently, so this
// parser never needs to handle multi-section decks in the active path.

export interface ParsedDeckSlide {
  /** 0-based index, derived from data-slide (so index === dataSlide - 1) */
  index: number
  /** 1-based slide number from the data-slide attribute */
  dataSlide: number
  /** The inner HTML of the article (slide-only markup; excludes the <article> wrapper) */
  html: string
}

export interface ParseDeckResult {
  /** Shared CSS extracted from the single <head><style> (may be empty) */
  sharedStyle: string
  /** Whether the document had exactly one <!DOCTYPE>/<head>/<style>/<body> */
  wellFormed: boolean
  slides: ParsedDeckSlide[]
  /** Non-fatal issues (e.g. missing data-slide attribute, count mismatch) */
  errors: string[]
}

const ARTICLE_RE = /<article\b([^>]*)\bdata-slide=["'](\d+)["'][^>]*>([\s\S]*?)<\/article>/gi

// Match a <style> that is a direct child of <head> OR the first <style> in the doc.
function extractSharedStyle(raw: string): string {
  // Prefer a <style> inside <head>
  const headMatch = raw.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const scope = headMatch ? headMatch[1] : raw
  const styleMatch = scope.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
  return styleMatch ? styleMatch[1].trim() : ''
}

function countOccurrences(haystack: string, needle: RegExp): number {
  const re = new RegExp(needle.source, needle.flags.includes('g') ? needle.flags : needle.flags + 'g')
  const matches = haystack.match(re)
  return matches ? matches.length : 0
}

export function parseDeckHtml(raw: string): ParseDeckResult {
  const errors: string[] = []
  const trimmed = (raw || '').trim()

  if (!trimmed) {
    return { sharedStyle: '', wellFormed: false, slides: [], errors: ['Empty deck HTML'] }
  }

  const doctypeCount = countOccurrences(trimmed, /<!doctype\s+html/i)
  const headCount = countOccurrences(trimmed, /<head\b/i)
  const bodyCount = countOccurrences(trimmed, /<body\b/i)
  const styleCount = countOccurrences(trimmed, /<style\b/i)

  const wellFormed = doctypeCount === 1 && headCount === 1 && bodyCount === 1 && styleCount >= 1
  if (!wellFormed) {
    if (doctypeCount !== 1) errors.push(`expected exactly one <!DOCTYPE html> (found ${doctypeCount})`)
    if (headCount !== 1) errors.push(`expected exactly one <head> (found ${headCount})`)
    if (bodyCount !== 1) errors.push(`expected exactly one <body> (found ${bodyCount})`)
    if (styleCount < 1) errors.push(`expected at least one <style> for shared CSS (found ${styleCount})`)
  }

  const sharedStyle = extractSharedStyle(trimmed)

  const slides: ParsedDeckSlide[] = []
  let m: RegExpExecArray | null
  ARTICLE_RE.lastIndex = 0
  while ((m = ARTICLE_RE.exec(trimmed)) !== null) {
    const dataSlide = parseInt(m[2], 10)
    const inner = m[3].trim()
    if (!inner) {
      errors.push(`<article data-slide="${dataSlide}"> is empty`)
      continue
    }
    slides.push({ index: dataSlide - 1, dataSlide, html: inner })
  }

  if (slides.length === 0) {
    errors.push('No <article data-slide="N"> blocks found')
  } else {
    // Validate 1..N contiguous numbering
    const seen = new Set<number>()
    for (const s of slides) {
      if (seen.has(s.dataSlide)) errors.push(`duplicate data-slide="${s.dataSlide}"`)
      seen.add(s.dataSlide)
    }
    const max = Math.max(...slides.map(s => s.dataSlide))
    const expected = Array.from({ length: max }, (_, i) => i + 1)
    for (const n of expected) {
      if (!seen.has(n)) errors.push(`missing <article data-slide="${n}">`)
    }
    // stable sort by data-slide
    slides.sort((a, b) => a.dataSlide - b.dataSlide)
  }

  return { sharedStyle, wellFormed, slides, errors }
}

// Recompose a standalone HTML document for one slide (used by the host renderer).
export function recomposeSlideHtml(sharedStyle: string, slideHtml: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Slide</title><style>${sharedStyle}</style></head><body>${slideHtml}</body></html>`
}
