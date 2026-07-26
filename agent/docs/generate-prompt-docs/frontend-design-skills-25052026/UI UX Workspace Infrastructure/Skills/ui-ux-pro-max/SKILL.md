---
id: ui-ux-pro-max
name: UI UX Pro Max
version: 1.0.0
category: design
tags: [design-system, industry-rules, color-palettes, typography-pairings, style-guide]
---

# UI UX Pro Max Skill

## Philosophy

Different products demand different design languages. A developer tool should not look like a consumer app. This skill provides industry-specific design reasoning — matching visual style to product type, audience, and context.

## Industry Design Rules (Condensed)

### Developer Tools (DeskFlow, IDEs, CLIs)
- **Aesthetic**: Dark chrome, monospace dominance, high information density, command palette patterns
- **Color**: Deep slate/zinc base, ONE vibrant accent (pink/cyan/emerald), syntax-highlighted code blocks
- **Typography**: Geist or Inter for UI, JetBrains Mono for code. 13-14px base, tight line height (1.4)
- **Spacing**: 4-8px grid. Minimal padding inside data cells, generous between sections.
- **Motion**: Fast (100-150ms), linear or ease-out. No bounces in serious tools.
- **Patterns**: Tree views, split panes, tab bars, status bars, command palettes, inline editing
- **Anti-pattern**: Rounded corners > 8px on terminal/code elements. Shadows on code blocks.

### Project Management (Linear, Asana, Trello)
- **Aesthetic**: Ultra-clean, white/light gray, subtle color coding by status
- **Color**: Neutral base with status colors (gray=backlog, blue=in-progress, green=done, red=blocked)
- **Typography**: Clean sans-serif (Inter, SF Pro), generous line height (1.6), larger headings
- **Spacing**: 16-24px grid. Breathing room between cards.
- **Motion**: Smooth (250-350ms), ease-in-out. Kanban drag animations.
- **Patterns**: Board views, timeline/Gantt, swimlanes, assignee avatars, progress bars

### Financial Dashboards (Stripe, Brex, Banking)
- **Aesthetic**: Precision, trust, data authority. Grid-aligned numbers, tabular data.
- **Color**: White/light base, green for positive, red for negative, blue for actions
- **Typography**: Tabular nums (`font-variant-numeric: tabular-nums`), consistent decimal alignment
- **Spacing**: Tight data tables, generous page margins
- **Motion**: Minimal. Numbers count up/down. Subtle cell highlights on update.
- **Patterns**: Data tables, line charts, sparklines, KPI cards, date range pickers
- **Anti-pattern**: Decorative illustrations that reduce data density. Rounded numbers.

### AI/ML Interfaces (ChatGPT, Claude, Perplexity)
- **Aesthetic**: Conversational, warm, trustworthy. Human-like but clearly AI.
- **Color**: Warm off-white or soft dark. Terracotta/warm accents. Avoid cold blues.
- **Typography**: Readable serif or humanist sans for responses. Monospace for code.
- **Spacing**: Generous paragraph spacing. Clear message bubble separation.
- **Motion**: Typing indicators, fade-in for messages, smooth scroll.
- **Patterns**: Chat bubbles, thinking indicators, source citations, follow-up prompts

### Analytics (PostHog, Mixpanel, Amplitude)
- **Aesthetic**: Playful but professional. Chart-forward.
- **Color**: Brand color + 8-10 chart colors. Dark mode essential.
- **Typography**: Clean sans for labels, monospace for values.
- **Spacing**: Chart-first layout. Controls above, legend inline.
- **Motion**: Chart animations (morphing bars, path drawing). Tooltip follow-cursor.
- **Patterns**: Funnels, retention curves, event streams, cohort tables

## Style Reference Library (67 Styles — Selected)

| Style | Best For | Key Traits |
|-------|----------|------------|
| **Dark Glass** | Dev tools, dashboards | Backdrop blur, zinc base, single accent |
| **Neo-Brutalist** | Landing pages, portfolios | Thick borders, high contrast, system fonts |
| **Swiss Grid** | Data-heavy apps | Strict grid, asymmetric layouts, Helvetica |
| **Material You** | Consumer Android apps | Dynamic color, rounded shapes, elevation |
| **Cupertino** | iOS/macOS apps | Blur, translucency, SF Pro, minimal chrome |
| **Terminal Chic** | CLI tools, hackers | Monospace, ANSI colors, ASCII art, minimal |
| **Editorial** | Blogs, documentation | Serif headings, generous whitespace, warm tones |
| **Cyberpunk** | Gaming, creative tools | Neon accents, dark base, glitch effects |
| **Bauhaus** | Design tools, creative | Primary colors, geometric shapes, grid systems |
| **Minimalist** | SaaS, productivity | White space, single accent, hidden chrome |

## Color Palette Selection Guide

### For Dark Developer Tools (DeskFlow)
```
Base:       #09090b (zinc-950) / #18181b (zinc-900)
Surface:    #27272a (zinc-800) / #3f3f46 (zinc-700)
Accent:     #ec4899 (pink-500) / #22d3ee (cyan-400)
Success:    #34d399 (emerald-400)
Warning:    #fbbf24 (amber-400)
Error:      #f87171 (red-400)
Text:       #fafafa (zinc-50) / #a1a1aa (zinc-400)
Muted:      #52525b (zinc-600) / #3f3f46 (zinc-700)
```

### Palette Rules
1. Dark theme: Base should be 5-10% lighter than pure black for depth
2. Accent saturation: 60-80% for primary, 40-60% for secondary
3. Semantic colors: Keep consistent across ALL views (green=good, red=bad, amber=warn)
4. Glass surfaces: 50-70% opacity of surface color + backdrop blur

## Typography Pairing Framework

### DeskFlow Pairing
```
UI / Headings:   Geist (or Inter) — 400, 500, 600
Code / Terminal: JetBrains Mono — 400, 500
Data / Numbers:  JetBrains Mono (tabular-nums) — 400
Accent / Brand:  Geist (medium, slightly wider tracking)
```

### Pairing Rules
1. Maximum contrast ratio between heading and body fonts (serif+sans, or sans+mono)
2. NEVER pair two fonts from the same category (two serifs, two geometric sans)
3. Code font MUST have: ligatures, tabular nums, clear distinction between 0/O and 1/l/I
4. UI font MUST have: extensive weight range (100-900), good hinting at 13px

## Anti-Patterns by Industry

### Developer Tools
- Using consumer-grade rounded corners (> 12px) on serious tools
- Excessive whitespace that reduces data density
- Decorative gradients on functional elements
- Missing keyboard shortcuts or command palette

### Financial
- Rounded currency values (always show cents/decimals)
- Inconsistent decimal alignment in tables
- Using red/green as ONLY indicators (colorblind users)
- Missing data refresh timestamps

### AI/ML
- Cold, clinical color schemes (avoid pure white + blue)
- Missing confidence indicators or uncertainty visualization
- Overly technical language in user-facing copy
- No feedback loop for AI responses (thumbs up/down)

## Pre-Delivery Checklist

Before shipping any UI component:
- [ ] Contrast ratios verified (4.5:1 minimum)
- [ ] Touch targets ≥ 44×44px
- [ ] Reduced motion fallback implemented
- [ ] Empty state designed (not just "No data")
- [ ] Loading state designed (not just spinner)
- [ ] Error state designed (clear message + recovery action)
- [ ] Dark mode tested (if applicable)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader labels present (aria-label, aria-describedby)
- [ ] Z-index hierarchy respected (no modal under dropdown)

## Activation Criteria

**Activate when:**
- User asks "what style should I use for [product type]?"
- Generating a new page or feature and need design direction
- User mentions their product category (SaaS, dev tool, finance, etc.)
- Choosing color palettes or typography for a project
- Reviewing existing UI against industry standards

**Do NOT activate when:**
- User has already specified exact design requirements
- Working on internal-only debugging views
- User explicitly requests a specific style by name
