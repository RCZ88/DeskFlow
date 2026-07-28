// ============================================================================
// Design Presets — 7 Styles with exact CSS math, style options, and MCP routing
// Each style has hardcoded mathematical definitions and strict component rules.
// ============================================================================

export interface StyleOption {
  id: string
  label: string
  values: Record<string, string>
}

export interface DesignStyle {
  id: string
  name: string
  description: string
  category: 'dark' | 'light' | 'vibrant'
  baseTokens: Record<string, string>
  options: StyleOption[]
  allowedMCP: string[]
  forbiddenMCP: string[]
  aiRules: string[]
}

// ---- Style Definitions ----------------------------------------------------

export const UI_STYLES: DesignStyle[] = [
  // ── 1. FLAT DESIGN ──────────────────────────────────────────────────────
  {
    id: 'flat',
    name: 'Flat Design',
    description: '2D, bright, solid, zero depth. Clean and direct.',
    category: 'light',
    baseTokens: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f5f5f5',
      '--text-primary': '#333333',
      '--text-secondary': '#666666',
      '--accent-primary': '#2563eb',
      '--accent-secondary': '#10b981',
      '--radius-base': '0px',
      '--shadow-base': 'none',
      '--border-base': '2px solid #e5e7eb',
    },
    options: [
      {
        id: 'palette',
        label: 'Color Palette',
        values: {
          'Primary': '--accent-primary:#2563eb;--accent-secondary:#10b981;',
          'Miami Vice': '--accent-primary:#ec4899;--accent-secondary:#06b6d4;',
          'Monochrome': '--accent-primary:#374151;--accent-secondary:#6b7280;',
        },
      },
      {
        id: 'shape',
        label: 'Shape',
        values: {
          'Sharp': '--radius-base:0px;',
          'Soft': '--radius-base:4px;',
        },
      },
    ],
    allowedMCP: ['button', 'card', 'badge', 'separator', 'input', 'select'],
    forbiddenMCP: ['magic-card', 'border-beam', 'particles', 'shiny-button', 'blur-fade', 'aurora-text', 'animated-gradient-text'],
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
    category: 'light',
    baseTokens: {
      '--bg-primary': '#f0f0f0',
      '--bg-secondary': '#e0e0e0',
      '--text-primary': '#333333',
      '--text-secondary': '#666666',
      '--accent-primary': '#0066cc',
      '--accent-secondary': '#33a852',
      '--radius-base': '8px',
      '--shadow-base': 'inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.3)',
      '--border-base': '1px solid #c0c0c0',
    },
    options: [
      {
        id: 'texture',
        label: 'Texture',
        values: {
          'Brushed Metal': '--bg-secondary:linear-gradient(to bottom, #f0f0f0, #c0c0c0);--shadow-base:inset 0 1px 0 rgba(255,255,255,0.7), 0 3px 6px rgba(0,0,0,0.25);',
          'Leather': '--bg-secondary:#8b7355;--shadow-base:inset 0 2px 4px rgba(255,255,255,0.15), 0 4px 8px rgba(0,0,0,0.4);--text-primary:#f5f0e8;',
          'Paper': '--bg-secondary:#faf8f5;--shadow-base:inset 0 1px 2px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.12);--border-base:1px solid #d4c5a9;',
        },
      },
      {
        id: 'depth',
        label: 'Depth Level',
        values: {
          'Subtle': '--shadow-base:inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.2);',
          'Pronounced': '--shadow-base:inset 0 2px 4px rgba(255,255,255,0.5), 0 4px 12px rgba(0,0,0,0.35);',
        },
      },
    ],
    allowedMCP: ['tabs', 'slider', 'switch', 'progress', 'button', 'input', 'select'],
    forbiddenMCP: ['magic-card', 'border-beam', 'particles', 'aurora-text', 'animated-gradient-text', 'dot-pattern'],
    aiRules: [
      'ALL surfaces must have gradient backgrounds (never flat).',
      'Use inset shadows for pressed/recessed elements.',
      'Use outset shadows for elevated elements.',
      'Textures should feel tactile — leather, metal, paper grain.',
      'Borders should be subtle and blend with the gradient.',
    ],
  },

  // ── 3. NEUMORPHISM ──────────────────────────────────────────────────────
  {
    id: 'neumorphism',
    name: 'Neumorphism',
    description: 'Extruded plastic, monochromatic background, dual shadows.',
    category: 'dark',
    baseTokens: {
      '--bg-primary': '#e0e5ec',
      '--bg-secondary': '#e0e5ec',
      '--text-primary': '#31344b',
      '--text-secondary': '#6b7280',
      '--accent-primary': '#5f72af',
      '--accent-secondary': '#7c8db5',
      '--radius-base': '12px',
      '--shadow-base': '6px 6px 12px rgba(174, 174, 192, 0.4), -6px -6px 12px rgba(255, 255, 255, 0.9)',
      '--border-base': 'none',
    },
    options: [
      {
        id: 'surface',
        label: 'Surface Tone',
        values: {
          'Light': '--bg-primary:#e0e5ec;--bg-secondary:#e0e5ec;--shadow-base:6px 6px 12px rgba(174, 174, 192, 0.4), -6px -6px 12px rgba(255, 255, 255, 0.9);',
          'Dark': '--bg-primary:#2a2d35;--bg-secondary:#2a2d35;--shadow-base:6px 6px 12px rgba(0, 0, 0, 0.5), -6px -6px 12px rgba(255, 255, 255, 0.05);--text-primary:#ffffff;--text-secondary:#9ca3af;',
        },
      },
      {
        id: 'extrusion',
        label: 'Extrusion',
        values: {
          'Soft': '--shadow-base:4px 4px 8px rgba(174, 174, 192, 0.3), -4px -4px 8px rgba(255, 255, 255, 0.7);',
          'Pronounced': '--shadow-base:8px 8px 16px rgba(174, 174, 192, 0.5), -8px -8px 16px rgba(255, 255, 255, 1.0);',
        },
      },
    ],
    allowedMCP: ['input', 'switch', 'progress', 'button', 'badge'],
    forbiddenMCP: ['magic-card', 'border-beam', 'shiny-button', 'particles', 'dot-pattern', 'card'],
    aiRules: [
      'NEVER use standard borders. Elements rely solely on dual box-shadows for depth.',
      'Background colors of elements MUST exactly match the page background.',
      'Use inset shadows for pressed states, outset shadows for elevated states.',
      'The monochromatic look is sacred — no contrasting accent colors.',
    ],
  },

  // ── 4. GLASSMORPHISM ────────────────────────────────────────────────────
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Frosted glass panels with colorful backgrounds. Modern depth.',
    category: 'dark',
    baseTokens: {
      '--bg-primary': '#0f172a',
      '--bg-secondary': 'rgba(255, 255, 255, 0.08)',
      '--text-primary': '#f1f5f9',
      '--text-secondary': '#94a3b8',
      '--accent-primary': '#8b5cf6',
      '--accent-secondary': '#a78bfa',
      '--radius-base': '16px',
      '--shadow-base': '0 8px 32px rgba(0, 0, 0, 0.3)',
      '--border-base': '1px solid rgba(255, 255, 255, 0.15)',
      '--glass-blur': 'blur(16px)',
    },
    options: [
      {
        id: 'tint',
        label: 'Glass Tint',
        values: {
          'Light Glass': '--bg-secondary:rgba(255, 255, 255, 0.12);--border-base:1px solid rgba(255, 255, 255, 0.2);',
          'Dark Glass': '--bg-secondary:rgba(0, 0, 0, 0.25);--border-base:1px solid rgba(255, 255, 255, 0.08);',
        },
      },
      {
        id: 'blur',
        label: 'Blur Level',
        values: {
          'Standard': '--glass-blur:blur(8px);',
          'Heavy': '--glass-blur:blur(24px);',
        },
      },
    ],
    allowedMCP: ['particles', 'dialog', 'blur-fade', 'magic-card', 'button', 'input', 'select', 'scroll-area'],
    forbiddenMCP: ['dot-pattern', 'shiny-button'],
    aiRules: [
      'ALL cards and panels must use backdrop-filter: var(--glass-blur).',
      'Background must be a gradient or colorful — glass needs something behind it.',
      'Borders must be semi-transparent white (rgba(255,255,255,0.1-0.2)).',
      'Hover states increase opacity slightly.',
      'Never use solid opaque backgrounds for cards.',
    ],
  },

  // ── 5. DARK MODE (HIGH-CONTRAST) ────────────────────────────────────────
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    description: 'Pure OLED black, high-contrast text, battery-saving. Developer-focused.',
    category: 'dark',
    baseTokens: {
      '--bg-primary': '#000000',
      '--bg-secondary': '#0a0a0a',
      '--text-primary': '#ffffff',
      '--text-secondary': '#a1a1aa',
      '--accent-primary': '#22d3ee',
      '--accent-secondary': '#34d399',
      '--radius-base': '8px',
      '--shadow-base': 'none',
      '--border-base': '1px solid #1a1a1a',
    },
    options: [
      {
        id: 'contrast',
        label: 'Contrast Level',
        values: {
          'OLED': '--bg-primary:#000000;--bg-secondary:#0a0a0a;--border-base:1px solid #1a1a1a;',
          'Soft Dark': '--bg-primary:#0a0a0a;--bg-secondary:#141414;--border-base:1px solid #262626;',
        },
      },
      {
        id: 'accent',
        label: 'Accent Color',
        values: {
          'Cyber Green': '--accent-primary:#22c55e;--accent-secondary:#4ade80;',
          'Electric Blue': '--accent-primary:#3b82f6;--accent-secondary:#60a5fa;',
          'Neon Cyan': '--accent-primary:#22d3ee;--accent-secondary:#67e8f9;',
        },
      },
    ],
    allowedMCP: ['tooltip', 'number-ticker', 'scroll-area', 'button', 'input', 'select', 'switch', 'badge', 'separator'],
    forbiddenMCP: ['magic-card', 'border-beam', 'particles', 'aurora-text', 'animated-gradient-text', 'dot-pattern'],
    aiRules: [
      'Background MUST be pure black (#000000) or near-black (#0a0a0a).',
      'Text MUST be pure white (#ffffff) or near-white (#f1f5f9).',
      'Borders must be very subtle (#1a1a1a to #262626).',
      'No shadows, no blur, no glass — raw high-contrast only.',
      'Accent colors must be saturated and bright against the black.',
    ],
  },

  // ── 6. MINIMALISM ───────────────────────────────────────────────────────
  {
    id: 'minimalism',
    name: 'Minimalism',
    description: 'Maximum whitespace, strict typography, no borders. Pure clarity.',
    category: 'light',
    baseTokens: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#fafafa',
      '--text-primary': '#111827',
      '--text-secondary': '#6b7280',
      '--accent-primary': '#111827',
      '--accent-secondary': '#6b7280',
      '--radius-base': '0px',
      '--shadow-base': 'none',
      '--border-base': 'none',
    },
    options: [
      {
        id: 'whitespace',
        label: 'Whitespace',
        values: {
          'Generous': '--radius-base:0px;',
          'Extreme': '--radius-base:0px;--bg-secondary:#ffffff;',
        },
      },
      {
        id: 'typography',
        label: 'Typography',
        values: {
          'Sans': '--text-primary:#111827;',
          'Serif': '--text-primary:#1a1a1a;',
        },
      },
    ],
    allowedMCP: ['separator', 'accordion', 'button', 'input', 'select', 'badge'],
    forbiddenMCP: ['marquee', 'particles', 'magic-card', 'border-beam', 'shiny-button', 'dot-pattern', 'animated-gradient-text'],
    aiRules: [
      'NEVER use borders, shadows, or background colors on cards.',
      'Typography carries ALL hierarchy — weight and size, not color or decoration.',
      'Maximum whitespace between elements.',
      'No animations except 200ms transitions.',
      'One accent color used extremely sparingly.',
    ],
  },

  // ── 7. BRUTALISM ────────────────────────────────────────────────────────
  {
    id: 'brutalism',
    name: 'Brutalism',
    description: 'Raw, harsh, monospace, clashing colors. Unapologetic boldness.',
    category: 'dark',
    baseTokens: {
      '--bg-primary': '#1a1a1a',
      '--bg-secondary': '#2a2a2a',
      '--text-primary': '#ffffff',
      '--text-secondary': '#999999',
      '--accent-primary': '#ff4444',
      '--accent-secondary': '#ffff00',
      '--radius-base': '0px',
      '--shadow-base': 'none',
      '--border-base': '3px solid #ffffff',
    },
    options: [
      {
        id: 'border',
        label: 'Border Style',
        values: {
          'Thick White': '--border-base:3px solid #ffffff;',
          'Neon Cyan': '--border-base:3px solid #00ffff;--accent-primary:#00ffff;',
          'Thick Black': '--border-base:3px solid #000000;--bg-primary:#ffffff;--text-primary:#000000;',
        },
      },
      {
        id: 'font',
        label: 'Font',
        values: {
          'System Mono': '--text-primary:#ffffff;',
          'High Contrast': '--text-primary:#ffff00;--accent-primary:#ff00ff;',
        },
      },
    ],
    allowedMCP: ['button', 'terminal', 'badge', 'separator'],
    forbiddenMCP: ['magic-card', 'border-beam', 'particles', 'shiny-button', 'blur-fade', 'aurora-text', 'card', 'dialog'],
    aiRules: [
      'NO rounded corners — everything is sharp rectangles.',
      'Use 3px borders on ALL containers.',
      'Typography must be BOLD and MONOSPACE.',
      'No shadows, no blur, no glass — raw solid colors only.',
      'Contrast must be extreme — clashing colors are encouraged.',
    ],
  },
]

// ---- Utilities ------------------------------------------------------------

export function getStyleById(id: string): DesignStyle | undefined {
  return UI_STYLES.find(s => s.id === id)
}

export function getStyleCategories(): string[] {
  return [...new Set(UI_STYLES.map(s => s.category))]
}

// Merge base tokens with selected option tokens
export function resolveTokens(style: DesignStyle, activeOptions: Record<string, string>): Record<string, string> {
  const tokens = { ...style.baseTokens }
  Object.entries(activeOptions).forEach(([optId, valId]) => {
    const opt = style.options.find(o => o.id === optId)
    const cssStr = opt?.values[valId]
    if (cssStr) {
      cssStr.split(';').forEach(css => {
        const colonIdx = css.indexOf(':')
        if (colonIdx > 0) {
          const k = css.substring(0, colonIdx).trim()
          const v = css.substring(colonIdx + 1).trim()
          if (k && v) tokens[k] = v
        }
      })
    }
  })
  return tokens
}

// Apply resolved tokens to a DOM element
export function applyTokensToElement(el: HTMLElement, tokens: Record<string, string>) {
  Object.entries(tokens).forEach(([key, value]) => {
    el.style.setProperty(key, value)
  })
}

// Generate design directive string for AI prompt injection
export function compileDesignDirective(style: DesignStyle, activeOptions: Record<string, string>): string {
  const tokens = resolveTokens(style, activeOptions)

  return `## Design Directive — ${style.name} (Layer 9: Design System)

You are operating under strict visual constraints. You MUST follow this design preset exactly. Do NOT deviate.

**1. Global CSS Variables (DO NOT GUESS COLORS):**
- Background: ${tokens['--bg-primary'] || '#000000'}
- Surface: ${tokens['--bg-secondary'] || '#0a0a0a'}
- Text: ${tokens['--text-primary'] || '#ffffff'}
- Accent: ${tokens['--accent-primary'] || '#22d3ee'}
- Radius: ${tokens['--radius-base'] || '0px'}
- Border: ${tokens['--border-base'] || 'none'}
- Shadow: ${tokens['--shadow-base'] || 'none'}
${tokens['--glass-blur'] ? `- Glass Blur: ${tokens['--glass-blur']}` : ''}

**2. MCP Component Routing (CRITICAL):**
You are FORBIDDEN from using the following components. If you use them, the build will fail:
${style.forbiddenMCP.map(c => `- ${c}`).join('\n')}

You may ONLY use components from this whitelist if components are needed:
${style.allowedMCP.map(c => `- ${c}`).join('\n')}

**3. Style Rules (MUST FOLLOW):**
${style.aiRules.map(rule => `- ${rule}`).join('\n')}

**4. Anti-Slop Checklist:**
- Do NOT use generic Tailwind colors (e.g., bg-blue-500). Use var(--accent-primary).
- Do NOT guess shadows. Use var(--shadow-base).
- Ensure all icons are sourced from lucide-react.
- Follow DeskFlow's spacing scale: xs=4px, sm=8px, md=12px, lg=16px, xl=24px.
- Typography: Geist (body), JetBrains Mono (code). Base size 13px.
`
}
