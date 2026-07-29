// ============================================================================
// Design Presets — 7 Styles with strict MCP routing
// Each style has hardcoded tokens, allowed/forbidden components, and AI rules.
// ============================================================================

export interface DesignStyle {
  id: string
  name: string
  description: string
  tokens: Record<string, string>
  allowedMCP: string[]
  forbiddenMCP: string[]
  aiRules: string[]
}

export const UI_STYLES: DesignStyle[] = [
  // ── 1. FLAT DESIGN ──────────────────────────────────────────────────────
  {
    id: 'flat',
    name: 'Flat Design',
    description: '2D, bright, solid, zero depth. Clean and direct.',
    tokens: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f5f5f5',
      '--text-primary': '#333333',
      '--text-muted': '#666666',
      '--accent-primary': '#2563eb',
      '--border-base': '2px solid #e5e7eb',
      '--radius-base': '0px',
      '--shadow-base': 'none',
      '--blur-base': '0px',
    },
    allowedMCP: ['button', 'card', 'badge', 'separator', 'input', 'select'],
    forbiddenMCP: ['magic-card', 'border-beam', 'particles', 'shiny-button', 'blur-fade', 'aurora-text'],
    aiRules: [
      'NEVER use shadows, gradients, or backdrop-blur.',
      'All elements must have solid backgrounds only.',
      'Borders must be visible and consistent (2px solid).',
      'No animations except basic 150ms transitions.',
      'Use flat color blocks for visual hierarchy.',
    ],
  },

  // ── 2. SKEUOMORPHISM ────────────────────────────────────────────────────
  {
    id: 'skeuomorphism',
    name: 'Skeuomorphism',
    description: 'Real-world textures, physical depth, gradients. Tactile feel.',
    tokens: {
      '--bg-primary': '#f0f0f0',
      '--bg-secondary': '#e0e0e0',
      '--text-primary': '#333333',
      '--text-muted': '#666666',
      '--accent-primary': '#0066cc',
      '--border-base': '1px solid #c0c0c0',
      '--radius-base': '8px',
      '--shadow-base': 'inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.3)',
      '--blur-base': '0px',
    },
    allowedMCP: ['tabs', 'slider', 'switch', 'progress', 'button', 'input', 'select'],
    forbiddenMCP: ['magic-card', 'border-beam', 'particles', 'aurora-text'],
    aiRules: [
      'ALL surfaces must have gradient backgrounds (never flat).',
      'Use inset shadows for pressed/recessed elements.',
      'Use outset shadows for elevated elements.',
      'Textures should feel tactile — leather, metal, paper grain.',
    ],
  },

  // ── 3. NEUMORPHISM ──────────────────────────────────────────────────────
  {
    id: 'neumorphism',
    name: 'Neumorphism',
    description: 'Extruded plastic, monochromatic background, dual shadows.',
    tokens: {
      '--bg-primary': '#e0e5ec',
      '--bg-secondary': '#e0e5ec',
      '--text-primary': '#31344b',
      '--text-muted': '#6b7280',
      '--accent-primary': '#5f72af',
      '--border-base': 'none',
      '--radius-base': '12px',
      '--shadow-base': '6px 6px 12px rgba(174, 174, 192, 0.4), -6px -6px 12px rgba(255, 255, 255, 0.9)',
      '--blur-base': '0px',
    },
    allowedMCP: ['input', 'switch', 'progress', 'button', 'badge'],
    forbiddenMCP: ['magic-card', 'border-beam', 'shiny-button', 'particles', 'card'],
    aiRules: [
      'NEVER use standard borders. Elements rely solely on dual box-shadows for depth.',
      'Background colors of elements MUST exactly match the page background.',
      'Use inset shadows for pressed states, outset shadows for elevated states.',
    ],
  },

  // ── 4. GLASSMORPHISM ────────────────────────────────────────────────────
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Frosted glass panels with colorful backgrounds. Modern depth.',
    tokens: {
      '--bg-primary': '#1e1b4b',
      '--bg-secondary': 'rgba(255, 255, 255, 0.08)',
      '--text-primary': '#f1f5f9',
      '--text-muted': 'rgba(255, 255, 255, 0.6)',
      '--accent-primary': '#8b5cf6',
      '--border-base': '1px solid rgba(255, 255, 255, 0.15)',
      '--radius-base': '16px',
      '--shadow-base': '0 8px 32px rgba(0, 0, 0, 0.3)',
      '--blur-base': '16px',
    },
    allowedMCP: ['particles', 'dialog', 'blur-fade', 'magic-card', 'button', 'input', 'select', 'scroll-area'],
    forbiddenMCP: ['dot-pattern', 'shiny-button'],
    aiRules: [
      'ALL cards and panels must use backdrop-filter: blur(var(--blur-base)).',
      'Background must be a gradient or colorful — glass needs something behind it.',
      'Borders must be semi-transparent white (rgba(255,255,255,0.1-0.2)).',
      'Never use solid opaque backgrounds for cards.',
    ],
  },

  // ── 5. DARK MODE (HIGH-CONTRAST) ────────────────────────────────────────
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    description: 'Pure OLED black, high-contrast text, battery-saving. Developer-focused.',
    tokens: {
      '--bg-primary': '#000000',
      '--bg-secondary': '#0a0a0a',
      '--text-primary': '#ffffff',
      '--text-muted': '#a1a1aa',
      '--accent-primary': '#22d3ee',
      '--border-base': '1px solid #1a1a1a',
      '--radius-base': '8px',
      '--shadow-base': 'none',
      '--blur-base': '0px',
    },
    allowedMCP: ['tooltip', 'number-ticker', 'scroll-area', 'button', 'input', 'select', 'switch', 'badge', 'separator'],
    forbiddenMCP: ['magic-card', 'border-beam', 'particles', 'aurora-text', 'animated-gradient-text'],
    aiRules: [
      'Background MUST be pure black (#000000) or near-black (#0a0a0a).',
      'Text MUST be pure white (#ffffff) or near-white (#f1f5f9).',
      'Borders must be very subtle (#1a1a1a to #262626).',
      'No shadows, no blur, no glass — raw high-contrast only.',
    ],
  },

  // ── 6. MINIMALISM ───────────────────────────────────────────────────────
  {
    id: 'minimalism',
    name: 'Minimalism',
    description: 'Maximum whitespace, strict typography, no borders. Pure clarity.',
    tokens: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#fafafa',
      '--text-primary': '#111827',
      '--text-muted': '#6b7280',
      '--accent-primary': '#111827',
      '--border-base': 'none',
      '--radius-base': '0px',
      '--shadow-base': 'none',
      '--blur-base': '0px',
    },
    allowedMCP: ['separator', 'accordion', 'button', 'input', 'select', 'badge'],
    forbiddenMCP: ['marquee', 'particles', 'magic-card', 'border-beam', 'shiny-button', 'dot-pattern'],
    aiRules: [
      'NEVER use borders, shadows, or background colors on cards.',
      'Typography carries ALL hierarchy — weight and size, not color or decoration.',
      'Maximum whitespace between elements.',
      'One accent color used extremely sparingly.',
    ],
  },

  // ── 7. BRUTALISM ────────────────────────────────────────────────────────
  {
    id: 'brutalism',
    name: 'Brutalism',
    description: 'Raw, harsh, monospace, clashing colors. Unapologetic boldness.',
    tokens: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#ffffff',
      '--text-primary': '#000000',
      '--text-muted': '#666666',
      '--accent-primary': '#ff0000',
      '--border-base': '3px solid #000000',
      '--radius-base': '0px',
      '--shadow-base': '6px 6px 0px #000000',
      '--blur-base': '0px',
    },
    allowedMCP: ['button', 'input', 'terminal', 'badge', 'separator'],
    forbiddenMCP: ['magic-card', 'border-beam', 'particles', 'shiny-button', 'blur-fade', 'card', 'dialog'],
    aiRules: [
      'NO rounded corners — everything is sharp rectangles.',
      'Use 3px borders on ALL containers.',
      'Typography must be BOLD and MONOSPACE.',
      'No shadows with blur — only hard offset shadows.',
      'Contrast must be extreme — clashing colors are encouraged.',
    ],
  },
]

// ---- Font & Easing Options ------------------------------------------------

export const FONT_OPTIONS = [
  { label: 'Inter (Sans)', value: "'Inter', sans-serif" },
  { label: 'Geist (Sans)', value: "'Geist', sans-serif" },
  { label: 'SF Pro (Sans)', value: "'SF Pro Display', system-ui, sans-serif" },
  { label: 'JetBrains Mono (Code)', value: "'JetBrains Mono', monospace" },
]

export const EASING_OPTIONS = [
  { label: 'Linear', value: 'linear' },
  { label: 'Ease-Out', value: 'cubic-bezier(0.0, 0.0, 0.2, 1)' },
  { label: 'Ease-In-Out', value: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  { label: 'Spring', value: 'cubic-bezier(0.5, 1.5, 0.5, 1)' },
]

// ---- Utilities ------------------------------------------------------------

export function getStyleById(id: string): DesignStyle | undefined {
  return UI_STYLES.find(s => s.id === id)
}
