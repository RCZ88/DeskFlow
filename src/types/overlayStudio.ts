// Clement Overlay Studio — Design Tokens (§2 of spec)

export const CLEMENT_PROFILE = {
  colors: {
    background: '#0D1117',
    background_alpha: 230,
    stroke_color: '#000000',
    stroke_width: 3,
    accent_hook: '#FACC15',
    accent_body: '#FFFFFF',
    accent_caption: '#22D3EE',
    accent_keyword: '#FACC15',
    accent_bullet: '#22D3EE',
    grid_color: '#30363D',
  },
  canvas: { width: 1080, height: 1920 },
  face_cam_safe_zone: { x_min: 760, y_min: 1520, w: 320, h: 400 },
  text_safe_zone: { x: [40, 1040], y: [40, 1320] },
}

// Preview canvas dimensions (scaled down from 1080x1920 for UI)
export const CANVAS_WIDTH = 270
export const CANVAS_HEIGHT = 480
export const FACE_CAM_ZONE = { x: 190, y: 380, w: 80, h: 100 }

export type OverlayType = 'hook' | 'body' | 'caption' | 'bullet' | 'keyword'

export const OVERLAY_TYPE_CONFIG: Record<OverlayType, { label: string; color: string; maxWords: number }> = {
  hook:    { label: 'Hook',    color: '#fbbf24', maxWords: 8 },
  body:    { label: 'Body',    color: '#e2e8f0', maxWords: 12 },
  caption: { label: 'Caption', color: '#94a3b8', maxWords: 14 },
  bullet:  { label: 'Bullet',  color: '#22d3ee', maxWords: 10 },
  keyword: { label: 'Keyword', color: '#22d3ee', maxWords: 6 },
}

export type RendererType = 'card' | 'mermaid' | 'equation' | 'chart' | 'board' | 'manim'

export const RENDERER_CONFIG: Record<RendererType, { label: string; useFor: string; library: string; output: string }> = {
  card:     { label: 'Text Card',   useFor: 'Punchlines, one-line claims',       library: 'Pillow',           output: 'PNG' },
  mermaid:  { label: 'Diagram',     useFor: 'Systems, hierarchies, flows',       library: 'Mermaid.js',       output: 'SVG/PNG' },
  equation: { label: 'Equation',    useFor: 'Math formulas',                     library: 'KaTeX',            output: 'SVG' },
  chart:    { label: 'Chart',       useFor: 'Data, comparisons, boundaries',     library: 'matplotlib',       output: 'PNG' },
  board:    { label: 'Asset Board', useFor: 'Roles/actors with relations',       library: 'Pillow + Emoji',   output: 'PNG' },
  manim:    { label: 'Animation',   useFor: 'Animated math concept',             library: 'Manim Community',  output: 'MP4' },
}
