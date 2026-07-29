// ============================================================================
// AI Prompt Compiler — Generates design directive for agent system prompt
// ============================================================================

import { DesignStyle } from './designPresets'

export function compileDesignDirective(
  style: DesignStyle,
  custom: {
    fontFamily: string
    fontSize: number
    accent: string
    bg: string
    radius: number
    padding: number
    duration: number
    easing: string
    glass: boolean
  },
  liveTokens: Record<string, string>
): string {
  return `## Design Directive — ${style.name} (Customized)

You are operating under strict visual constraints. Do NOT deviate.

**Colors:**
- Background: ${liveTokens['--bg-primary'] || custom.bg}
- Surface: ${liveTokens['--bg-secondary'] || 'rgba(255,255,255,0.08)'}
- Border: ${liveTokens['--border-base'] || '1px solid #1a1a1a'}
- Accent: ${liveTokens['--accent-primary'] || custom.accent}
- Text: ${liveTokens['--text-primary'] || '#ffffff'}
- Text Muted: ${liveTokens['--text-muted'] || '#666666'}

**Typography:**
- Font Family: ${custom.fontFamily}
- Base Size: ${custom.fontSize}px
- Line Height: 1.5
- Font Weights: normal=400, medium=500, semibold=600

**Geometry:**
- Border Radius: ${custom.radius}px
- Card Padding: ${custom.padding}px
- Spacing Scale: xs=4px, sm=8px, md=12px, lg=16px, xl=24px

**Motion:**
- Duration: ${custom.duration}ms
- Easing: ${custom.easing}
- Glass Blur: ${custom.glass ? '16px' : '0px'}
- Animation Intensity: ${custom.duration > 300 ? 'moderate' : custom.duration > 100 ? 'subtle' : 'none'}

**MCP Components (whitelist):**
${style.allowedMCP.map(c => `- ${c}`).join('\n') || '- Use standard components'}

**MCP Components (blacklist):**
${style.forbiddenMCP.map(c => `- ${c}`).join('\n') || '- None'}

**Style Rules (MUST FOLLOW):**
${style.aiRules.map(r => `- ${r}`).join('\n')}

**Anti-Slop Checklist:**
- Do NOT use generic Tailwind colors. Use the exact hex values above.
- Do NOT guess shadows. Use the exact shadow value above.
- All icons from lucide-react only.
- Follow DeskFlow spacing scale: xs=4px, sm=8px, md=12px, lg=16px, xl=24px.
`
}
