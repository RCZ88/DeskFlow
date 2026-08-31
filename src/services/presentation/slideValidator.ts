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
