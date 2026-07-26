# Design Skills System — Architecture

## Selection Analysis

| Tool | Type | Verdict | Rationale |
|------|------|---------|-----------|
| **frontend-design** (Anthropic) | SKILL.md | ✅ Include | Already in `agent/skills/frontend-design/`. Foundation. Enhance with more anti-pattern detail. |
| **impeccable** (pbakaus) | SKILL.md + CLI | ✅ Include | 7 domain reference files (typography, color, motion, spatial, interaction, responsive, UX writing). 23 shared commands. 27 anti-pattern rules. Multi-agent. The reference files can be integrated directly. |
| **ui-ux-pro-max** (nextlevelbuilder) | SKILL.md + Python | ✅ Include | 161 industry-specific reasoning rules — tells the agent which design style fits which product type. 67 UI styles. 161 color palettes. 57 font pairings. The reasoning rules are pure text and fit perfectly in a SKILL.md. |
| **taste-skill** (Leonxlnx) | SKILL.md | ✅ Include | 3 tunable knobs (DESIGN_VARIANCE, MOTION_INTENSITY, VISUAL_DENSITY). The knob concept is unique — lets users control design aggressiveness. Multiple aesthetic variants. |
| **awesome-design-md** (voltagent) | DESIGN.md files | ✅ Include refs | 73+ DESIGN.md files from production sites. Curate 5-10 that match DeskFlow's aesthetic (dark, glass, data-dense) as `agent/design-references/`. |
| **skillui/npxskillui** (amaancoderx) | CLI tool | ❌ Skip | It's a CLI (`npm install -g skillui`) that extracts design systems from URLs. Not a skill the agent loads at runtime. Useful as a development tool but not for agent context. |

## Architecture Overview

```
agent/
├── skills/
│   ├── frontend-design/SKILL.md          [EXISTING — enhance]
│   ├── impeccable/SKILL.md               [NEW — 7 refs + 23 commands + anti-patterns]
│   ├── ui-ux-pro-max/SKILL.md            [NEW — industry rules + style matching]
│   ├── taste-skill/SKILL.md              [NEW — tunable knobs]
│   └── design-taste/SKILL.md             [NEW — aggregated master with knob defaults]
│
├── design-references/                    [NEW — curated DESIGN.md files]
│   ├── README.md
│   ├── claude/DESIGN.md
│   ├── linear/DESIGN.md
│   ├── vercel/DESIGN.md
│   ├── stripe/DESIGN.md
│   └── supabase/DESIGN.md
│
└── ... (existing files)

src/
├── services/ContextService.ts           [MODIFY — add buildDesignSkillsContext()]
├── services/ContextConfig.ts            [MODIFY — add design_skills config schema]
└── components/NewSessionDialog.tsx      [MODIFY — add Design Skills toggle + sliders]
```

## Context Integration

### New builder in ContextService.ts

```typescript
async function buildDesignSkillsContext(
  projectPath: string,
  config: ContextConfig
): Promise<string> {
  // 1. Read design skill SKILL.md files from agent/skills/<name>/
  // 2. Include taste skill knobs as: `## Design Configuration\nDESIGN_VARIANCE: 5\n...`
  // 3. Include DESIGN.md references count
  // 4. Build a concise ~600 token block
  // 5. Truncate to budget (default 800 tokens)
}
```

### ContextConfig extension

```typescript
interface ContextConfig {
  systems: {
    // ... existing systems
    design_skills: {
      enabled: boolean;
      token_budget: number; // default 800
      levels: {
        design_variance: number;   // 1-10, default 5
        motion_intensity: number;  // 1-10, default 5
        visual_density: number;    // 1-10, default 5
      };
      include_references: boolean; // include DESIGN.md files?
    };
  };
}
```

### Setup Dialog Changes

Add a 7th toggle card to the context systems grid:
- **Design Skills** — Palette icon, pink-500, sparkles decorative
- Card subtitle: "Frontend design rules, styles, and taste settings"
- When enabled, show:
  - 4 skill checkboxes (pre-checked): frontend-design, impeccable, ui-ux-pro-max, taste-skill
  - 3 range sliders (1-10): Design Variance, Motion Intensity, Visual Density
  - 1 checkbox: "Include design references (DESIGN.md templates)"

## Skill File Contents

### impeccable/SKILL.md

**Frontmatter:**
- id: impeccable, name: Impeccable, category: design, version: 1.0.0

**Content:**
- 7 domain reference summaries (typography, color, spatial, motion, interaction, responsive, UX writing)
- 23 command definitions (craft, teach, document, extract, shape, critique, audit, polish, bolder, quieter, distill, harden, onboard, animate, colorize, typeset, layout, delight, overdrive, clarify, adapt, optimize, live)
- 27 anti-pattern rules organized by category (fonts, colors, cards, animations, layout)
- Activation criteria: "Activate when user asks for UI improvements, design reviews, or frontend polish"

### ui-ux-pro-max/SKILL.md

**Frontmatter:**
- id: ui-ux-pro-max, name: UI UX Pro Max, category: design, version: 1.0.0

**Content:**
- Industry-based design system generation rules (condensed from 161 rules to ~30 product categories)
- 67 style references with "best for" descriptions
- Color palette selection guidance
- Typography pairing framework
- Anti-pattern list per industry
- Pre-delivery checklist

### taste-skill/SKILL.md

**Frontmatter:**
- id: taste-skill, name: Taste Skill, category: design, version: 1.0.0

**Content:**
- 3 configurable knobs with descriptions
- Default values (read from level config)
- Aesthetic variants table (which combination produces which look)
- Anti-repetition rules (prevent same fonts/themes across generations)

### design-taste/SKILL.md (Master Aggregator)

**Frontmatter:**
- id: design-taste, name: Design Taste System, category: design, version: 1.0.0

**Content:**
- References all 4 sub-skills
- Declares the current taste configuration
- Provides a unified design vocabulary
- "When in doubt, use this skill to determine the appropriate design direction"

## DESIGN.md References

Curated from awesome-design-voltagent for dark-theme, data-heavy, developer-focused UIs:

| Reference | Why |
|-----------|-----|
| **Claude** | Warm terracotta, clean editorial — matches AI agent context |
| **Linear** | Ultra-minimal, purple accent — project management inspiration |
| **Vercel** | Black/white precision, Geist font — dashboard aesthetic |
| **Stripe** | Purple gradients, weight-300 elegance — financial data displays |
| **Supabase** | Dark emerald, code-first — developer tools look |
| **Sentry** | Dark dashboard, data-dense — error/info display patterns |
| **PostHog** | Playful dark, hedgehog branding — analytics charts |
| **Raycast** | Sleek dark chrome, vibrant accents — command palette UIs |
