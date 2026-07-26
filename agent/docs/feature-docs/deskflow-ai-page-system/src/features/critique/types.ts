export interface CritiqueResult {
  schema_version: "1.0"
  image: ImageMeta
  ocr_text: OcrSpan[]
  palette: PaletteColor[]
  gradients: Gradient[]
  contrast_issues: ContrastIssue[]
  elements: Element[]
  spacing_issues: SpacingIssue[]
  alignment: AlignmentReport
  description: string
  critique: Critique
  scores: Scores
  verification: Verification
  meta: RunMeta
}

export interface ImageMeta {
  hash: string
  width: number
  height: number
  analyzed_at: string
}

export interface OcrSpan {
  text: string
  bbox: [number, number, number, number]
  confidence: number
}

export interface PaletteColor {
  hex: string
  rgb: [number, number, number]
  lab: [number, number, number]
  ratio: number
  role: "background" | "surface" | "text" | "accent" | "other"
}

export interface Gradient {
  bbox: [number, number, number, number]
  type: "linear" | "radial"
  stops: string[]
  angle_deg: number
  smoothness: number
}

export interface ContrastIssue {
  fg: string
  bg: string
  ratio: number
  required: number
  wcag_level: "AA" | "AAA"
  context: "text" | "large_text" | "ui"
  bbox: [number, number, number, number]
  severity: "low" | "med" | "high"
}

export interface Element {
  id: string
  label: string
  type: "button" | "text" | "image" | "card" | "input" | "icon" | "other"
  bbox: [number, number, number, number]
  source: "florence" | "ocr" | "cv"
  confidence: number
}

export interface SpacingIssue {
  kind: "overlap" | "too_close" | "misaligned" | "inconsistent_gap" | "edge_crowding"
  elements: string[]
  measured_px: number
  threshold_px: number
  axis: "x" | "y" | "both"
  severity: "low" | "med" | "high"
  note: string
}

export interface AlignmentReport {
  detected_grid_px: number | null
  columns: number | null
  off_grid_elements: string[]
}

export interface Critique {
  summary: string
  strengths: string[]
  issues: CritiqueIssue[]
}

export interface CritiqueIssue {
  category: "layout" | "color" | "contrast" | "spacing" | "typography" | "hierarchy"
  severity: "low" | "med" | "high"
  evidence: string
  suggestion: string
}

export interface Scores {
  layout: number
  color: number
  contrast: number
  spacing: number
  hierarchy: number
  overall: number
}

export interface Verification {
  claims_checked: number
  disagreements: Disagreement[]
}

export interface Disagreement {
  claim: string
  measured: string
  resolution: "trusted_math"
}

export interface RunMeta {
  passes_run: string[]
  models: Record<string, string>
  timings_ms: Record<string, number>
  cache_hits: string[]
}

export interface AnalyzeProgress {
  jobId: string
  pass: string
  pct: number
  partial: Partial<CritiqueResult> | null
}

export interface VisionHealth {
  status: string
  gpu: string | null
  vram_free_mb: number | null
  models: string[]
  version: string
}

export interface AnalyzeRequest {
  image_path: string
  passes?: string[]
  resolution?: { max_long_edge: number }
  tiling?: { enabled: boolean; tile: number; overlap: number }
  models?: { ground?: string; synth?: string }
  temps?: { facts?: number; prose?: number }
  rubric_version?: string
  use_cache?: boolean
}
