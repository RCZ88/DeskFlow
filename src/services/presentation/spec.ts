// Presentation Specification — Single source of truth
// Used by: prompt, parser, validator, renderer, persistence, tests

// ─── Enums ───

export type SlideType =
  | 'hook'
  | 'value'
  | 'transition'
  | 'call_to_action'
  | 'visual_only'

export type LayoutType =
  | 'split-left'
  | 'split-right'
  | 'full-bleed'
  | 'minimal'

export type VisualType =
  | 'hero-number'
  | 'code-block'
  | 'diagram'
  | 'chart'
  | 'progress-ring'
  | 'step-through'
  | 'comparison'
  | 'timeline'
  | 'quote'
  | 'icon-grid'
  | 'data-table'
  | 'interactive-demo'
  | 'none'

export type MotionEntry = 'blur-fade' | 'slide-up' | 'none'
export type MotionEmphasis = 'glow-pulse' | 'highlight-edge' | 'count-up' | 'none'
export type MotionInteraction = 'step-through' | 'hover-reveal' | 'slider' | 'none'

export type PresentationFormat = 'html' | 'json'
export type ThemeId = 'vercel-dark' | 'cyberpunk' | 'minimalist-mono' | 'warm-dark'
export type AspectRatio = '9:16' | '1:1' | '9:8'

// ─── Top-level spec ───

export interface PresentationSpec {
  title: string
  slideCount: number
  themeId: ThemeId
  specVersion: number
  slides: SlideSpec[]
}

// ─── Slide spec ───

export interface SlideSpec {
  index: number
  type: SlideType
  group: string
  headline: string
  subheadline?: string
  body?: string
  equation?: string
  badge?: string
  recap?: string[]
  layout: LayoutType
  visual: VisualSpec
  motion: MotionSpec
}

// ─── Visual spec (discriminated union) ───

export interface VisualSpec {
  type: VisualType
  data: VisualDataMap[VisualType]
}

export type VisualDataMap = {
  'hero-number': HeroNumberData
  'code-block': CodeBlockData
  'diagram': DiagramData
  'chart': ChartData
  'progress-ring': ProgressRingData
  'step-through': StepThroughData
  'comparison': ComparisonData
  'timeline': TimelineData
  'quote': QuoteData
  'icon-grid': IconGridData
  'data-table': DataTableData
  'interactive-demo': InteractiveDemoData
  'none': NoneVisualData
}

// ─── Visual data contracts ───

export interface HeroNumberData {
  value: number
  label: string
  suffix?: string
  prefix?: string
}

export interface CodeBlockData {
  code: string
  language: string
  highlightLines?: number[]
}

export interface DiagramData {
  nodes: Array<{
    id: string
    label: string
    x: number
    y: number
    kind?: string
    highlighted?: boolean
  }>
  edges: Array<{
    from: string
    to: string
    label?: string
    highlighted?: boolean
  }>
  direction?: 'forward' | 'backward' | 'bidirectional'
}

export interface ChartData {
  kind: 'bar' | 'line' | 'area'
  data: Array<{ label: string; value: number }>
  color?: string
}

export interface ProgressRingData {
  value: number
  max: number
  label: string
  suffix?: string
}

export interface StepThroughData {
  states: Array<{
    label: string
    description: string
    activeNodes?: string[]
  }>
}

export interface ComparisonData {
  left: { title: string; items: string[] }
  right: { title: string; items: string[] }
}

export interface TimelineData {
  events: Array<{
    time: string
    title: string
    description?: string
  }>
}

export interface QuoteData {
  text: string
  author: string
  role?: string
}

export interface IconGridData {
  items: Array<{
    icon: string
    label: string
    description?: string
  }>
}

export interface DataTableData {
  columns: string[]
  rows: string[][]
}

export interface InteractiveDemoData {
  description: string
  inputs: Array<{
    label: string
    type: 'slider' | 'toggle' | 'text'
  }>
  outputs: Array<{
    label: string
    formula?: string
  }>
}

export interface NoneVisualData {}

// ─── Motion spec ───

export interface MotionSpec {
  entry: MotionEntry
  emphasis: MotionEmphasis
  interaction: MotionInteraction
}

// ─── Slide plan (input to generation) ───

export interface PlannedSlide {
  index: number
  frame: SlideType
  group: string
  purpose: string
  headlineHint?: string
  sourceHeadline?: string
  sourceOnScreenText?: string
  sourceBody?: string
  sourceEquation?: string
  sourceScript?: string
  sourceVisual?: string
  layoutHint?: LayoutType
  visualHint?: string
  interactivityHint?: string
}

export interface SlidePlan {
  goal: string
  audience: string
  tone: string
  slides: PlannedSlide[]
  groups: { label: string; slideIndices: number[] }[]
  mode: 'source-locked' | 'topic-authoring'
}

// ─── Persistence types ───

export interface PresentationRow {
  id: string
  episode_id?: number
  topic?: string
  title: string
  status: 'draft' | 'generating' | 'ready' | 'failed'
  slide_count: number
  format_mode?: PresentationFormat | 'mixed'
  spec_version?: number
  error_message?: string
  created_at: string
  updated_at: string
  archived_at?: string
}

export interface PresentationSlideRow {
  id: string
  presentation_id: string
  index_order: number
  frame_type: string
  format: PresentationFormat
  spec_version: number
  html_content: string
  created_at: string
  updated_at?: string
}

// ─── Generation request ───

export interface PresentationGenerateRequest {
  prompt: string
  outputFormat: PresentationFormat
  slideCount: number
  episodeId?: number
  topic?: string
  mode: string
  themeId: ThemeId
  aspectRatio: AspectRatio
  // 'hybrid' (default): one deck call → parse → N stored slides, with
  // per-slide regeneration fallback for failed slots. 'per-slide': the legacy
  // one-call-per-slide path (used as the large-deck fallback automatically).
  generationStrategy?: 'hybrid' | 'per-slide'
  // For 'per-slide' strategy the caller already pre-filled {{CURRENT_SLIDE}}
  // in `prompt`. For 'hybrid', `prompt` is the DECK prompt (no slide token).
}

export interface RegenerateSlideRequest {
  presentationId: string
  slideId: string
  index: number // 0-based
  count: number // total slides in deck
  prompt: string // deck prompt payload (will have {{CURRENT_SLIDE}} filled)
  outputFormat: PresentationFormat
  mode: string
  themeId: ThemeId
  aspectRatio: AspectRatio
}

// ─── Validation ───

export interface ValidationIssue {
  layer: string
  rule: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface ValidationReport {
  valid: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

// ─── Export ───

export interface ExportSlideRequest {
  slideId: string
  format?: 'png'
  aspectRatio: AspectRatio
  transparent?: boolean
}

// ─── Constants ───

export const VALID_SLIDE_TYPES: SlideType[] = ['hook', 'value', 'transition', 'call_to_action', 'visual_only']
export const VALID_LAYOUTS: LayoutType[] = ['split-left', 'split-right', 'full-bleed', 'minimal']
export const VALID_VISUALS: VisualType[] = ['hero-number', 'code-block', 'diagram', 'chart', 'progress-ring', 'step-through', 'comparison', 'timeline', 'quote', 'icon-grid', 'data-table', 'interactive-demo', 'none']
export const VALID_MOTION_ENTRY: MotionEntry[] = ['blur-fade', 'slide-up', 'none']
export const VALID_MOTION_EMPHASIS: MotionEmphasis[] = ['glow-pulse', 'highlight-edge', 'count-up', 'none']
export const VALID_MOTION_INTERACTION: MotionInteraction[] = ['step-through', 'hover-reveal', 'slider', 'none']
export const VALID_THEME_IDS: ThemeId[] = ['vercel-dark', 'cyberpunk', 'minimalist-mono', 'warm-dark']
export const SPEC_VERSION = 1
