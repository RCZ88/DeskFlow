// ═══════════════════════════════════════════════════════════════════
// Presentation System — Master Prompt & Theme Engine
// MCP: blur-fade, magic-card, number-ticker, animated-gradient-text
// Visual Grounding: integrated widgets, leader lines, JS interactivity
// ═══════════════════════════════════════════════════════════════════

export interface SlideTheme {
  name: string; bg: string; surface: string; border: string; fg: string; muted: string
  accent: string; accent2: string; warning: string; accentGlow: string
  fontHeader: string; fontBody: string; fontMono: string
}

export const THEMES: Record<string, SlideTheme> = {
  'vercel-dark': {
    name: 'Vercel Dark', bg: '#0A0A0B', surface: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)',
    fg: '#FAFAFA', muted: '#8B8B8B', accent: '#10b981', accent2: '#a855f7',
    warning: '#f59e0b', accentGlow: 'rgba(16,185,129,0.15)',
    fontHeader: 'Inter', fontBody: 'Inter', fontMono: 'JetBrains Mono',
  },
  'cyberpunk': {
    name: 'Cyberpunk', bg: '#0d0221', surface: 'rgba(255,0,255,0.04)', border: 'rgba(255,0,255,0.12)',
    fg: '#f0e6ff', muted: '#7a6b8a', accent: '#ff2a6d', accent2: '#05d9e8',
    warning: '#ff6ac1', accentGlow: 'rgba(255,42,109,0.2)',
    fontHeader: 'Space Grotesk', fontBody: 'Inter', fontMono: 'JetBrains Mono',
  },
  'minimalist-mono': {
    name: 'Minimalist Mono', bg: '#111111', surface: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.06)',
    fg: '#E5E5E5', muted: '#666666', accent: '#FFFFFF', accent2: '#999999',
    warning: '#CCCCCC', accentGlow: 'rgba(255,255,255,0.08)',
    fontHeader: 'Space Grotesk', fontBody: 'Inter', fontMono: 'JetBrains Mono',
  },
  'warm-dark': {
    name: 'Warm Dark', bg: '#1a1410', surface: 'rgba(255,200,150,0.04)', border: 'rgba(255,200,150,0.08)',
    fg: '#f5e6d3', muted: '#8a7a6a', accent: '#f59e0b', accent2: '#ef4444',
    warning: '#fb923c', accentGlow: 'rgba(245,158,11,0.15)',
    fontHeader: 'Space Grotesk', fontBody: 'Inter', fontMono: 'JetBrains Mono',
  },
}

export const PROMPT_GENERATE_SLIDE = `You are a Senior Frontend Engineer & Motion Designer. You generate high-fidelity interactive HTML/CSS/JS presentation slides. Output: ONE complete valid HTML file.

=== THEME ENGINE ===
Map the provided theme to CSS variables: --bg, --surface, --border, --fg, --muted, --accent, --accent-2, --warning, --accent-glow, --font-header, --font-body, --font-mono.

=== SPATIAL CONSTRAINTS (NON-NEGOTIABLE) ===
1. <body>: width:1080px; height:960px; overflow:hidden; margin:0; background:var(--bg); color:var(--fg); font-family:var(--font-body);
2. NO SCROLLING. Fit everything in 1080x960 via Grid/Flexbox.
3. Typography: Headlines 3.5rem+ weight 800 letter-spacing -0.04em var(--font-header). Sub 1.5rem weight 600. Body 1rem weight 400 line-height 1.6. Code 0.875rem var(--font-mono). Labels 0.75rem uppercase letter-spacing 0.1em var(--muted).
4. 8px grid. Cards: p-8 border-radius-24px. Sections: my-24 to my-48.

=== GLASSMORPHISM ===
.glass-card{background:var(--surface);backdrop-filter:blur(24px);border:1px solid var(--border);border-radius:24px;padding:32px;box-shadow:0 20px 40px rgba(0,0,0,.4);position:relative;overflow:hidden}

=== VANILLA JS MICRO-INTERACTIONS (ALL MANDATORY) ===

1. BLUR-FADE (MagicUI blur-fade): Every element stagger-animates in.
@keyframes blurInUp{from{opacity:0;transform:translateY(20px);filter:blur(10px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}
.stagger{animation:blurInUp .6s cubic-bezier(.16,1,.3,1) both}
.stagger-1{animation-delay:.04s}.stagger-2{.08s}.stagger-3{.12s}.stagger-4{.16s}.stagger-5{.20s}.stagger-6{.24s}.stagger-7{.28s}.stagger-8{.32s}

2. MOUSE GLOW (MagicUI magic-card): Radial gradient follows cursor inside cards.
HTML:<div class="glow-card"><div class="glow"></div><div class="content">...</div></div>
CSS:.glow{position:absolute;width:300px;height:300px;background:radial-gradient(circle,var(--accent) 0%,transparent 70%);opacity:0;filter:blur(40px);pointer-events:none;transform:translate(-50%,-50%);transition:opacity .3s}
JS:card.onmouseenter=()=>glow.style.opacity='.08';card.onmouseleave=()=>glow.style.opacity='0';card.onmousemove=e=>{const r=card.getBoundingClientRect();glow.style.left=(e.clientX-r.left)+'px';glow.style.top=(e.clientY-r.top)+'px'}

3. NUMBER TICKER (MagicUI number-ticker): Animated count-up with cubic ease-out.
function animateNumber(el,target,dur=1200){const s=performance.now();(function u(n){const p=Math.min((n-s)/dur,1);el.textContent=Math.round(target*(1-Math.pow(1-p,3))).toLocaleString();if(p<1)requestAnimationFrame(u)})(s)}
Usage:<span class="ticker" data-target="99">0</span> then document.querySelectorAll('.ticker').forEach(el=>animateNumber(el,+el.dataset.target))

4. GRADIENT TEXT (MagicUI animated-gradient-text): Shimmer on headlines.
.gradient-text{background:linear-gradient(90deg,var(--accent),var(--accent-2),var(--accent));background-size:300% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:gradShift 4s ease-in-out infinite}
@keyframes gradShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}

5. CUSTOM SLIDER: NEVER use <input type="range">. Div-based glassmorphic.
.slider-track{width:100%;height:4px;background:rgba(255,255,255,.1);border-radius:999px;position:relative;cursor:pointer}
.slider-fill{height:100%;background:var(--accent);border-radius:999px;transition:width .15s}
.slider-thumb{width:16px;height:16px;background:var(--accent);border-radius:50%;position:absolute;top:50%;transform:translate(-50%,-50%);box-shadow:0 0 12px var(--accent);cursor:grab;transition:transform .2s,box-shadow .2s}
.slider-thumb:hover{transform:translate(-50%,-50%) scale(1.3);box-shadow:0 0 24px var(--accent)}

6. CUSTOM DROPDOWN: NEVER use <select>. Div-based glassmorphic.
.dropdown-trigger{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:12px;cursor:pointer}
.dropdown-menu{position:absolute;top:100%;left:0;right:0;margin-top:4px;background:rgba(15,15,20,.95);backdrop-filter:blur(24px);border:1px solid var(--border);border-radius:12px;overflow:hidden;z-index:100;opacity:0;transform:translateY(-8px);pointer-events:none;transition:all .2s cubic-bezier(.16,1,.3,1)}
.dropdown-menu.open{opacity:1;transform:translateY(0);pointer-events:auto}
.dropdown-item{padding:10px 16px;cursor:pointer;transition:background .15s;font-size:14px}
.dropdown-item:hover{background:rgba(255,255,255,.05)}
.dropdown-item.selected{background:var(--accent);color:#000}

7. SPRING EASING: cubic-bezier(0.16,1,0.3,1) for ALL transitions.
8. MICRO: Buttons scale .98 on click. Hover brightens borders. Cards lift -2px on hover.

=== VISUAL GROUNDING: INTEGRATED WIDGETS ===

DEFAULT: Build ONE self-contained widget with diagram + inline callouts + drawn leader lines in the same coordinate space. NOT a text block pointing at a separate diagram.

Pattern: <div class="viz"><svg viewBox="..."><!-- diagram + leader lines + arrow markers --></svg><!-- formula/callouts in same div --><script>// interactivity</script></div>

Leader lines: SVG <path> or <line> with marker-end arrow. Both endpoints MUST be in the same SVG. Callout text sits AT the arrowhead, inside the diagram coordinate space.

WHEN TO ADD JS INTERACTIVITY (only if one is true):
- Reader controls step-through (algorithm trace, pipeline stages)
- Changing input visibly changes output (slider-driven recompute)
- Hover reveals hidden relationships (part-to-explanation)
- Synchronized comparison (before/after linked hover)

INTERACTIVITY PATTERNS:
a. Step-through: N states + "Next" button, each click highlights different node + swaps caption
b. Before/after diff: Two panels, slider swaps state
c. Parameter recompute: Slider bound to JS function that redraws derived value
d. Synchronized hover: Two panels, hovering A highlights counterpart in B
e. Interactive matrix: Hover output cell highlights contributing input cells

=== LAYOUT ASYMMETRY ===
Avoid centered layouts. Use: grid-template-columns: 1.5fr 1fr or 1fr 1.5fr. Overlapping elements with negative margins. Offset cards at different heights.

=== INPUT DATA ===
ScriptFrame: frame_type (hook/value/transition/call_to_action/visual_only), text (spoken words), visual (what to render), timestamp ("MM:SS").
- hook: Massive centered typography, gradient-text, blurInUp. Bold claim. 1-2 words headline.
- value: Split layout 1.5fr 1fr. Text left, visual right. Dense. Integrated widget with leader lines.
- transition: Minimal text, visual bridge. Muted.
- call_to_action: Bold CTA, accent color, button-like.
- visual_only: Full bleed SVG/diagram. Minimal overlay. Interactive if it helps understanding.

=== OUTPUT ===
ONLY valid HTML starting with <!DOCTYPE html>. All CSS in <style>. All JS in <script>. No external deps except Google Fonts CDN. No markdown fences. Must work in iframe srcdoc.`;

export function buildSlidePrompt(frame: any, theme?: string): string {
  const themeName = theme || 'vercel-dark'
  const themeObj = THEMES[themeName] || THEMES['vercel-dark']
  return `Generate a presentation slide using the "${themeName}" theme.

THEME: ${JSON.stringify(themeObj)}

frame_type: ${frame.frame_type}
text: "${frame.text}"
visual: "${frame.visual}"
timestamp: ${frame.timestamp}

frame_type '${frame.frame_type}' determines layout. Include ALL micro-interactions. For 'value' type: build an integrated widget with diagram + leader lines + inline callouts in same SVG coordinate space. Add JS interactivity if it helps understanding (step-through, hover-reveal, slider-recompute). Output ONLY valid HTML.`
}